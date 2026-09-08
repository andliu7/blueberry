/**
 * What the header HUD says, as data. No React, no DOM, no colours.
 *
 * docs/ECONOMY.md: "Each number on screen answers exactly one question a
 * student is actually asking." Four of the five systems are in the header (XP,
 * Diamonds, Charge, Streak); Mastery is deliberately absent, because that file
 * says "Never show Mastery inside a node" and the header is on screen inside
 * every node.
 *
 * Four systems, THREE buttons. Round two moved the daily goal out of the status
 * row and onto the header's bottom edge, so the model still carries four
 * readouts and the header renders three of them as controls. HUD_ITEM_IDS is
 * the readouts; HUD_BUTTON_IDS is the buttons; they are deliberately different
 * lists and the second one says why.
 *
 * WHY THIS IS A SEPARATE FILE. Everything the HUD decides is a function of the
 * snapshot: which flame is lit, what the ring is a fraction of, and every word
 * of the coach copy. Keeping that here means it is testable without a DOM, and
 * Hud.tsx is left with only drawing. The same split the pathway's derivePathway
 * and the placement quiz's reducer already use.
 *
 * THE COPY IS PART OF THE MODEL, on purpose. CLAUDE.md's voice rule (a coach on
 * the student's side, specific rather than generic, never scolding) is a
 * property of the sentence, and a sentence assembled inline in JSX cannot be
 * read in one place or asserted in a test. Note what is NOT here: no "you
 * should have", no rhetorical question, and nothing that prices a mistake.
 * Charge's line says the opposite out loud, because ECONOMY.md's rule 2 is the
 * whole ethical argument for the mechanic and a student has to be told it.
 *
 * NOT THROUGH t(). Same rule as the chemistry strings in i18n.ts: these state
 * what the economy did, and a mistranslated "wrong answers cost nothing" is a
 * promise broken in another language.
 */

import { CHARGE_REGEN_MINUTES, type DailyGoalTier, type EconomySnapshot } from "@blueberry/economy";

export type HudItemId = "xp" | "diamonds" | "streak" | "charge";

export const HUD_ITEM_IDS: readonly HudItemId[] = Object.freeze(["xp", "diamonds", "streak", "charge"]);

/**
 * The ids that get a BUTTON in the header, which is deliberately not the same
 * list as the readouts above.
 *
 * Round one put four equal readouts, a language code and a theme toggle in one
 * row, and the blind critic's single biggest finding was that nothing in it had
 * primacy: seven chips at one size, one weight and one saturation. So the row
 * is three items now, one of them dominant, and the daily goal moved out of the
 * row entirely and became the header's own bottom edge: a full width meter
 * where the divider used to be. That is the bar's in-lesson header pattern
 * (close, a progress bar across the whole width, one resource chip) rather than
 * its path header's four equal chips, and it costs the row no horizontal space
 * at all, which is what buys the dominant chip its size at 390px.
 *
 * XP is therefore still on screen, still a DRAWN fraction, and still opens a
 * coach mark: the streak button owns it, because "hit today's goal" and "keep
 * the streak" are one sentence in docs/ECONOMY.md and two chips for one
 * sentence is what the round one header was doing wrong.
 */
export type HudButtonId = "diamonds" | "streak" | "charge";

export const HUD_BUTTON_IDS: readonly HudButtonId[] = Object.freeze(["diamonds", "streak", "charge"]);

/** What every item carries: the header glyph's number, its label, and its coach mark. */
export interface HudReadout {
  readonly id: HudItemId;
  /** The number as it appears in the header, already formatted. */
  readonly value: string;
  /** The header button's accessible name. It says the whole state, not the glyph. */
  readonly label: string;
  /** The small line above the popover's headline: which of the five systems this is. */
  readonly eyebrow: string;
  readonly headline: string;
  /** One line of coach copy. See the header for the rules it is written under. */
  readonly line: string;
}

export interface XpReadout extends HudReadout {
  readonly id: "xp";
  /** 0 to 1, the ring's arc. Clamped, so an overshoot past the goal reads as full. */
  readonly fraction: number;
  readonly met: boolean;
  readonly today: number;
  readonly goalXp: number;
}

export interface DiamondReadout extends HudReadout {
  readonly id: "diamonds";
  readonly balance: number;
}

/**
 * One square in the coach mark's week strip.
 *
 * The strip is why the streak coach mark is a MOMENT and not a definition: the
 * bar's own limiter primer draws its resource as a row of units with one
 * visibly spent, and a row of seven days with five of them lit says "five days"
 * far faster than the sentence "5 day streak" does. It is derived, not stored:
 * a run of `current` days ends today when today counted and yesterday when it
 * has not, which is everything the snapshot knows and everything the strip
 * claims.
 */
export interface StreakDay {
  /** The narrow weekday initial, in the snapshot's own zone. */
  readonly letter: string;
  readonly counted: boolean;
  readonly today: boolean;
}

export interface StreakReadout extends HudReadout {
  readonly id: "streak";
  readonly days: number;
  /** Today's goal is met, so the day is counted. The flame is lit only for this. */
  readonly lit: boolean;
  /** Unmet and past the evening hour. Copy changes; the flame does not. */
  readonly atRisk: boolean;
  /** Seven days ending today, oldest first. The coach mark's unit row. */
  readonly week: readonly StreakDay[];
}

export interface ChargeReadout extends HudReadout {
  readonly id: "charge";
  /** 0 to 1, the meter and Bloom's halo. 1 in the exam window. */
  readonly fraction: number;
  readonly current: number;
  readonly cap: number;
  readonly examWindow: boolean;
  /** Days until the exam, 0 on the day itself. Null outside the window. */
  readonly daysLeft: number | null;
  /** The caption under the meter in the exam window, "9d". Empty otherwise. */
  readonly daysLabel: string;
  /**
   * How far along the NEXT point is, 0 to 1. Zero at the cap and in the exam
   * window, where no point is on its way.
   *
   * This is the beat the bar cannot show. Its primer draws a spent heart and
   * stops; ours draws the pip that is refilling, because the honest thing about
   * this limiter is that it comes back on its own and the student is looking at
   * the proof. `nextRegenAt` is already derived, so this is a read of the wall
   * clock against it and never a second opinion about the economy.
   */
  readonly nextFraction: number;
}

export interface HudModel {
  readonly xp: XpReadout;
  readonly diamonds: DiamondReadout;
  readonly streak: StreakReadout;
  readonly charge: ChargeReadout;
}

/** docs/ECONOMY.md, Daily goals. The tier is the student's own bar, so it is named. */
const TIER_LABEL: Readonly<Record<DailyGoalTier, string>> = Object.freeze({
  casual: "Casual",
  regular: "Regular",
  serious: "Serious",
  exam: "Exam mode",
});

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** "1 day" and "2 days", written once so no sentence below has to remember. */
function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "today", "tomorrow", "in 9 days". The exam window's copy reads as a date, not a count. */
function whenExam(daysLeft: number): string {
  if (daysLeft <= 0) return "today";
  if (daysLeft === 1) return "tomorrow";
  return `in ${daysLeft} days`;
}

function xpReadout(snapshot: EconomySnapshot): XpReadout {
  const { today, goalXp, goalMet, goalTier } = snapshot.xp;
  const remaining = Math.max(0, goalXp - today);
  return {
    id: "xp",
    value: String(today),
    label: goalMet
      ? `Daily goal met, ${today} XP today`
      : `Daily goal, ${today} of ${goalXp} XP today`,
    eyebrow: `${TIER_LABEL[goalTier]} goal`,
    headline: goalMet ? "Daily goal met" : `${today} of ${goalXp} XP today`,
    line: goalMet
      ? "Today counts toward your streak. Anything past here is bonus."
      : `${remaining} more XP and today counts toward your streak.`,
    fraction: goalXp <= 0 ? 1 : clamp01(today / goalXp),
    met: goalMet,
    today,
    goalXp,
  };
}

function diamondReadout(snapshot: EconomySnapshot): DiamondReadout {
  const balance = snapshot.diamonds.balance;
  return {
    id: "diamonds",
    value: String(balance),
    label: `${plural(balance, "diamond", "diamonds")}`,
    eyebrow: "Diamonds",
    headline: plural(balance, "diamond", "diamonds"),
    // ECONOMY.md, rule 2: "Nothing buys correctness." Said plainly, because a
    // student who thinks the currency might buy an answer distrusts the grade.
    line: "Earned by clearing nodes, flawless runs and streak milestones. They buy costumes and freezes, never answers.",
    balance,
  };
}

const DAY_MS = 86_400_000;

/**
 * Seven days ending today, with the current run marked.
 *
 * The zone comes off the snapshot, so a student who studies at 1am sees their
 * own Monday and not UTC's Tuesday. An unknown zone falls back to the runtime's
 * rather than throwing, because a letter under a square is a label and a header
 * that crashes over one is a worse bug than a wrong initial.
 */
function weekStrip(snapshot: EconomySnapshot): readonly StreakDay[] {
  const { current, todayCounted } = snapshot.streak;
  const nowMs = Date.parse(snapshot.now);
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: snapshot.tz });
  } catch {
    format = new Intl.DateTimeFormat("en-US", { weekday: "narrow" });
  }
  // The run ends today when today counted, else it ended yesterday.
  const endsAt = todayCounted ? 0 : 1;
  const days: StreakDay[] = [];
  for (let back = 6; back >= 0; back -= 1) {
    days.push({
      letter: Number.isFinite(nowMs) ? format.format(new Date(nowMs - back * DAY_MS)) : "",
      counted: current > 0 && back >= endsAt && back <= endsAt + current - 1,
      today: back === 0,
    });
  }
  return days;
}

function streakReadout(snapshot: EconomySnapshot): StreakReadout {
  const { current, todayCounted, atRisk } = snapshot.streak;
  const week = weekStrip(snapshot);
  if (current === 0 && !todayCounted) {
    return {
      id: "streak",
      value: "0",
      label: "Streak, no days yet",
      eyebrow: "Streak",
      headline: "No streak yet",
      line: "Hit today's daily goal and day one is yours.",
      days: 0,
      lit: false,
      atRisk,
      week,
    };
  }
  const headline = `${current} day streak`;
  return {
    id: "streak",
    value: String(current),
    label: todayCounted
      ? `Streak, ${plural(current, "day", "days")}, today counted`
      : `Streak, ${plural(current, "day", "days")}, today not counted yet`,
    eyebrow: "Streak",
    headline,
    // ECONOMY.md, Rest days: "the release valve". A student who is told about it
    // before they need it does not spend the evening afraid of the number.
    line: todayCounted
      ? "Today is counted. Hitting your daily goal is what keeps it lit."
      : atRisk
        ? "Hit your goal today to keep it. A free rest day covers you once a week."
        : "Today is not counted yet. Hitting your daily goal is what lights it.",
    days: current,
    lit: todayCounted,
    atRisk,
    week,
  };
}

/** How far the next point has come, read off `nextRegenAt` against the clock. */
function nextChargeFraction(snapshot: EconomySnapshot): number {
  const { nextRegenAt } = snapshot.charge;
  if (nextRegenAt === null) return 0;
  const remainingMs = Date.parse(nextRegenAt) - Date.parse(snapshot.now);
  if (!Number.isFinite(remainingMs)) return 0;
  return clamp01(1 - remainingMs / (CHARGE_REGEN_MINUTES * 60_000));
}

function chargeReadout(snapshot: EconomySnapshot): ChargeReadout {
  const { current, cap, examWindow, examDaysLeft } = snapshot.charge;
  if (examWindow) {
    const daysLeft = examDaysLeft ?? 0;
    return {
      id: "charge",
      // The one glyph nobody has to be taught. The number it replaces is the
      // meter, and inside the window there is no meter to read.
      value: "∞",
      label: `Charge, no limits, exam ${whenExam(daysLeft)}`,
      eyebrow: "Charge",
      headline: `No limits, exam ${whenExam(daysLeft)}`,
      // ECONOMY.md: "This is the whole ethical argument for the mechanic in one
      // gesture."
      line: "Charge is switched off until your exam. Take on as much as you want.",
      fraction: 1,
      current: cap,
      cap,
      examWindow: true,
      daysLeft,
      daysLabel: daysLeft <= 0 ? "today" : `${daysLeft}d`,
      nextFraction: 0,
    };
  }
  return {
    id: "charge",
    value: String(current),
    label: `Charge, ${current} of ${cap}`,
    eyebrow: "Charge",
    // NOT "17 of 30 charge". The blind critic's finding was that the coach mark
    // read as a settings tooltip: a small caps CHARGE directly above a headline
    // that said the word charge again, then a labelled fraction and a flat
    // button. The bar's equivalent says "Each mistake costs 1 heart!", which is
    // a RULE and an event, and it wins on that alone. This is the same sentence
    // shape carrying the opposite rule, which is the one docs/ECONOMY.md calls
    // "the whole ethical argument for the mechanic". The count is not written
    // here because the pip row above it draws it, thirty units with seventeen
    // lit and the next one filling.
    headline: "Mistakes never cost charge",
    // The second sentence is mandated by ECONOMY.md's Charge rules and is the
    // difference between this meter and the one it is a correction of.
    line: "Charge refills a point every 30 minutes. Starting a node costs some. Getting things wrong never does.",
    fraction: cap <= 0 ? 0 : clamp01(current / cap),
    current,
    cap,
    examWindow: false,
    daysLeft: examDaysLeft,
    daysLabel: "",
    nextFraction: nextChargeFraction(snapshot),
  };
}

/** The whole header, from one snapshot. Pure: same snapshot in, same words out. */
export function hudModel(snapshot: EconomySnapshot): HudModel {
  return {
    xp: xpReadout(snapshot),
    diamonds: diamondReadout(snapshot),
    streak: streakReadout(snapshot),
    charge: chargeReadout(snapshot),
  };
}

/** The four readouts in header order, for a caller that walks them. */
export function hudReadouts(model: HudModel): readonly HudReadout[] {
  return [model.xp, model.diamonds, model.streak, model.charge];
}
