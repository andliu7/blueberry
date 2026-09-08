/**
 * What the streak screen says, as data. No React, no DOM, no colours.
 *
 * Same split as `hudModel.ts` and for the same reason: every sentence and every
 * square on that screen is a function of the journal and the receipt, and a
 * sentence assembled inline in JSX cannot be read in one place or asserted in a
 * test. StreakScreen.tsx is left with drawing.
 *
 * THE ONE RULE THIS FILE IS WRITTEN UNDER. docs/ECONOMY.md, Anti-abuse: "The
 * client animates what the server concluded." So nothing here decides whether a
 * day counted, whether a rest day was spent, or how long the run is. Every one
 * of those is READ back out of `deriveEconomy`, and the seven day strip is seven
 * questions put to the engine rather than one answer worked out here.
 *
 * HOW THE STRIP IS DERIVED, because it is the only non obvious thing in the file.
 * `EconomySnapshot` says what the streak is TODAY; it does not carry a per day
 * history, and inventing one from `current` (walk back N days and light them)
 * is exactly the local math the rule above forbids: it draws a rest day as a
 * counted day, because a rest day bridges a gap without adding to the count.
 * So for each of the six days before today the journal is TRUNCATED to the end
 * of that day and re-derived. `todayCounted` on that snapshot is that day's own
 * answer, from the engine, on the same rules the server will run.
 *
 * A missed day that the streak SURVIVED is then arithmetic on two engine
 * answers rather than a rule restated here. In the derivation, a past day only
 * moves `current` by its own count, so:
 *
 *     currentAfter(d) = current(d + 1) - (counted(d + 1) ? 1 : 0)
 *
 * and a day that did not count but left `currentAfter` above zero is a day
 * something covered. Which protection covered it follows the engine's own
 * priority order (derive.ts: the free weekly rest day first, then a held
 * freeze), applied to the saved days in each ISO week, with the week seeded
 * from the oldest snapshot's `restDayThisWeek` so a rest day spent before the
 * window opened is still known about.
 *
 * SEVEN DERIVATIONS IS THE PRICE, and it is the right one to pay: this screen
 * is reached once a day, the alternative is a second implementation of the
 * streak rules living in the client, and a second implementation is the thing
 * that eventually disagrees with the server.
 *
 * THE COPY IS PART OF THE MODEL, on purpose, and it is written under CLAUDE.md's
 * voice rule and ECONOMY.md's mitigation set. Note what is NOT here: no "you
 * will lose", no "do not break it", no countdown, nothing that prices a missed
 * day. The bar's own streak screen says "skipping a day resets it!" and that
 * sentence is the one thing on it this file is not allowed to copy.
 */

import {
  deriveEconomy,
  endOfLocalDayMs,
  localDate,
  addDays,
  isoWeekKey,
  STREAK_FREEZE_COST,
  STREAK_FREEZE_MAX_HELD,
  STREAK_MILESTONES,
  type EconomyEvent,
  type EconomySnapshot,
  type Receipt,
  type StreakSave,
} from "@blueberry/economy";

/** How many days the strip draws. A week, ending today. */
export const STRIP_DAYS = 7;

/**
 * What one square is.
 *
 * `rest` and `freeze` are drawn as their own glyphs and never as a gap, which
 * is ECONOMY.md's rest day requirement made visual: a day the app covered is a
 * day something HAPPENED, and drawing it as an empty hole tells the student
 * they broke something when they did not.
 */
export type StreakDayKind = "counted" | "rest" | "freeze" | "missed" | "pending";

export interface StreakDayCell {
  /** Local calendar date, YYYY-MM-DD, in the snapshot's own zone. */
  readonly date: string;
  /** The narrow weekday initial, for under the square. */
  readonly letter: string;
  /** The full weekday name, for the announcement sentence. */
  readonly weekday: string;
  readonly kind: StreakDayKind;
  readonly today: boolean;
}

export interface StreakSaveInfo {
  readonly kind: StreakSave;
  readonly weekday: string;
  readonly date: string;
}

export interface StreakMilestoneInfo {
  readonly day: number;
  /** The diamonds the receipt actually paid for it. Read, never assumed. */
  readonly diamonds: number;
  readonly line: string;
}

export interface StreakFreezeInfo {
  readonly held: number;
  readonly max: number;
  readonly cost: number;
  readonly affordable: boolean;
  readonly full: boolean;
  readonly line: string;
}

export interface StreakExamInfo {
  readonly daysLeft: number;
  readonly line: string;
}

export interface StreakScreenModel {
  /** The one big number. Straight off the receipt, never counted up from the strip. */
  readonly days: number;
  /** The words under the number. Always "day streak", singular included: it is a name, not a count. */
  readonly unit: string;
  /** The screen's accessible name, the whole state in one sentence. */
  readonly label: string;
  readonly week: readonly StreakDayCell[];
  /** Set when a rest day or a freeze bridged the gap before today. */
  readonly saved: StreakSaveInfo | null;
  /** The sentence under the strip. Announced after the fact when something saved it. */
  readonly line: string;
  readonly milestone: StreakMilestoneInfo | null;
  readonly freezes: StreakFreezeInfo;
  readonly exam: StreakExamInfo | null;
}

export interface StreakModelInput {
  readonly journal: readonly EconomyEvent[];
  /** The snapshot as of `now`. Today's own column is read off this one. */
  readonly snapshot: EconomySnapshot;
  /** The receipt for the clear that made today count. */
  readonly receipt: Receipt;
  /** The instant the screen opened, held fixed so the model does not drift mid animation. */
  readonly now: string;
}

/* ------------------------------------------------------------- the words -- */

/**
 * The weekday name of a calendar date.
 *
 * Formatted in UTC on purpose: `date` is ALREADY the student's local calendar
 * date, computed by the engine in their zone, so running it through a zone a
 * second time would shift it. Noon keeps it clear of either boundary.
 */
function weekdayNames(date: string): { readonly letter: string; readonly weekday: string } {
  const ms = Date.parse(`${date}T12:00:00Z`);
  if (!Number.isFinite(ms)) return { letter: "", weekday: "" };
  const at = new Date(ms);
  try {
    return {
      letter: new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" }).format(at),
      weekday: new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(at),
    };
  } catch {
    return { letter: "", weekday: "" };
  }
}

/** "Exam in 9 days", and the two ends of it that a count reads badly at. */
function examWhen(daysLeft: number): string {
  if (daysLeft <= 0) return "Exam today";
  if (daysLeft === 1) return "Exam tomorrow";
  return `Exam in ${daysLeft} days`;
}

/**
 * The sentence under the strip.
 *
 * ECONOMY.md gives the rest day one verbatim, and it is verbatim here because
 * it is the whole mitigation in one line: it is ANNOUNCED AFTER THE FACT, it
 * names the day rather than the rule, and it ends on the number being safe.
 */
function lineFor(days: number, saved: StreakSaveInfo | null, exam: StreakExamInfo | null): string {
  if (saved !== null && saved.kind === "rest_day") {
    return `${saved.weekday} was a rest day. Streak safe at ${days}.`;
  }
  if (saved !== null) {
    return `${saved.weekday} was covered by a freeze. Streak safe at ${days}.`;
  }
  if (exam !== null) {
    return "While your exam is close, opening the app is enough to keep the day.";
  }
  if (days === 1) {
    return "Day one. Meet your daily goal tomorrow and it becomes two.";
  }
  return "Every day you meet your goal adds one. A free rest day each week is already yours.";
}

/**
 * The milestone band's line. Short, forward looking, and it never repeats the
 * day: the hero above it already is the day, and the same number twice on one
 * screen is the hierarchy fault the reward moment's round 2 ruling was written
 * about. What it adds is that this day was scarce, and where the next one is.
 */
function milestoneLine(day: number): string {
  const next = STREAK_MILESTONES.find((candidate) => candidate > day);
  if (next === undefined) return `Rare air. There is no milestone above this one, and you have all ${STREAK_MILESTONES.length}.`;
  return `Rare air. The next milestone is ${next}.`;
}

/**
 * The freeze row's line. ECONOMY.md: held quietly, spent automatically, and the
 * student finds out afterwards. Kept to one short sentence on purpose: this row
 * is inventory, and inventory that outtalks the celebration above it is how a
 * moment turns into a dashboard.
 */
function freezeLine(held: number, max: number): string {
  if (held >= max) return "Both ready. Each covers a day you miss, on its own.";
  if (held === 0) return "A freeze covers a day you miss, on its own.";
  return `${held} held. Each covers a day you miss, on its own.`;
}

/* ------------------------------------------------------------- the strip -- */

/** The journal as it stood at the end of a local day, and the instant to derive it at. */
function snapshotAtEndOf(journal: readonly EconomyEvent[], date: string, tz: string): EconomySnapshot {
  const cutoff = endOfLocalDayMs(date, tz);
  const upTo = journal.filter((event) => {
    const ms = Date.parse(event.at);
    return Number.isFinite(ms) && ms <= cutoff;
  });
  return deriveEconomy(upTo, new Date(cutoff).toISOString());
}

/**
 * Seven days ending today, each one the engine's own answer about that day.
 *
 * The classification of a saved day follows derive.ts's order exactly: the free
 * weekly rest day is spent before any held freeze, and there is one per ISO
 * week. `seedRest` carries a rest day already spent in the oldest day's week
 * before the window opened, so a strip that opens mid week does not hand out a
 * second one.
 */
function weekCells(input: StreakModelInput): readonly StreakDayCell[] {
  const { journal, snapshot, now } = input;
  const tz = snapshot.tz;
  const nowMs = Date.parse(now);
  const today = Number.isFinite(nowMs) ? localDate(nowMs, tz) : snapshot.now.slice(0, 10);
  const dates: string[] = [];
  for (let back = STRIP_DAYS - 1; back >= 0; back -= 1) dates.push(addDays(today, -back));

  // Today's column is the snapshot the caller already holds; the six before it
  // are re-derived off a truncated journal. Nothing is recomputed by hand.
  const snaps = dates.map((date, index) =>
    index === dates.length - 1 ? snapshot : snapshotAtEndOf(journal, date, tz),
  );
  const counted = snaps.map((snap) => snap.streak.todayCounted);

  const restUsedInWeek = new Set<string>();
  const seedRest = snaps[0]?.streak.restDayThisWeek ?? null;
  if (seedRest !== null) restUsedInWeek.add(isoWeekKey(seedRest));

  const cells: StreakDayCell[] = [];
  for (let index = 0; index < dates.length; index += 1) {
    const date = dates[index] as string;
    const names = weekdayNames(date);
    const isToday = index === dates.length - 1;
    let kind: StreakDayKind;
    if (counted[index] === true) {
      kind = "counted";
    } else if (isToday) {
      // Today is not over. derive.ts refuses to spend a protection on it and so
      // does this: an unmet goal at nine in the morning is not a missed day.
      kind = "pending";
    } else {
      const nextSnap = snaps[index + 1] as EconomySnapshot;
      const currentAfter = nextSnap.streak.current - (counted[index + 1] === true ? 1 : 0);
      if (currentAfter > 0) {
        const week = isoWeekKey(date);
        if (restUsedInWeek.has(week)) {
          kind = "freeze";
        } else {
          restUsedInWeek.add(week);
          kind = "rest";
        }
      } else {
        kind = "missed";
      }
    }
    cells.push({ date, letter: names.letter, weekday: names.weekday, kind, today: isToday });
  }
  return cells;
}

/* -------------------------------------------------------------- the model - */

/**
 * The whole screen, from a journal, a snapshot and a receipt. Pure: same three
 * in, same words out, which is what makes every sentence on it testable.
 */
export function streakScreenModel(input: StreakModelInput): StreakScreenModel {
  const { snapshot, receipt } = input;
  const days = receipt.streak.current;
  const week = weekCells(input);

  // The receipt names WHAT saved the run; the strip names WHICH day it saved,
  // and the two have to agree or one of them is guessing. The saved day is the
  // most recent covered square, which is by construction the gap the receipt is
  // talking about: derive.ts sets `savedBy` from the bridge before the most
  // recent counted day, and that is today.
  const savedKind = receipt.streak.savedBy ?? null;
  const covered = [...week].reverse().find((cell) => cell.kind === "rest" || cell.kind === "freeze") ?? null;
  const saved: StreakSaveInfo | null =
    savedKind === null || covered === null ? null : { kind: savedKind, weekday: covered.weekday, date: covered.date };

  const examWindow = snapshot.charge.examWindow;
  const exam: StreakExamInfo | null = examWindow
    ? {
        daysLeft: snapshot.charge.examDaysLeft ?? 0,
        line: `${examWhen(snapshot.charge.examDaysLeft ?? 0)}. Opening the app keeps your streak.`,
      }
    : null;

  const milestoneDay = receipt.streak.milestone;
  const milestone: StreakMilestoneInfo | null =
    milestoneDay === undefined
      ? null
      : {
          day: milestoneDay,
          // Read off the receipt line the engine wrote, never off the constant:
          // a milestone that paid nothing must not claim it paid something.
          diamonds: receipt.diamonds
            .filter((line) => line.label === `${milestoneDay} day streak`)
            .reduce((total, line) => total + line.amount, 0),
          line: milestoneLine(milestoneDay),
        };

  const held = snapshot.streak.freezes;
  const freezes: StreakFreezeInfo = {
    held,
    max: STREAK_FREEZE_MAX_HELD,
    cost: STREAK_FREEZE_COST,
    affordable: snapshot.diamonds.balance >= STREAK_FREEZE_COST,
    full: held >= STREAK_FREEZE_MAX_HELD,
    line: freezeLine(held, STREAK_FREEZE_MAX_HELD),
  };

  return {
    days,
    unit: "day streak",
    label: `Streak, ${days} ${days === 1 ? "day" : "days"}, ${
      snapshot.streak.todayCounted ? "today counted" : "today not counted yet"
    }`,
    week,
    saved,
    line: lineFor(days, saved, exam),
    milestone,
    freezes,
    exam,
  };
}
