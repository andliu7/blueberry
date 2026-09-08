/**
 * What the Charge sheet says, as data. No React, no DOM, no colours.
 *
 * The same split hudModel.ts uses, for the same reason: every word on this
 * surface is a function of the economy snapshot and the node being entered, so
 * keeping it here means the copy can be read in one place and asserted in a
 * test, and ChargeGate.tsx is left with only drawing.
 *
 * FOUR STATES, and they are the three the piece was asked for plus the free one
 * that has to exist or the sheet would lie:
 *
 *   ready   The node costs charge and the student has it. The cost is shown
 *           BEFORE anything is spent, which is the whole point of the sheet.
 *   free    The node costs nothing, ever. docs/ECONOMY.md: review is 0 because
 *           "never gate what repairs decay", tutorial and intro are 0 because
 *           CLAUDE.md says what sells the product is never gated. A sheet that
 *           showed a cost of 0 with a meter beside it would be theatre; this
 *           state says free and draws the meter untouched.
 *   empty   The node costs more than there is.
 *   exam    Inside the exam window. Charge is off and the METER IS REPLACED
 *           rather than drawn full, because a full meter is still a meter and
 *           the claim being made is that there is no meter this fortnight.
 *
 * NOT A NUMBER IN HERE IS TYPED TWICE. Every cost comes from
 * `chargeCostFor(kind, snapshot)` in @blueberry/economy, which reads
 * CHARGE_COST in rules.ts and returns 0 inside the exam window; the cap comes
 * off the snapshot; the top-up price is SINK_COST.charge_topup. If a price in
 * docs/ECONOMY.md changes, this file changes with it without being edited.
 *
 * THE ONE SENTENCE THIS SURFACE EXISTS TO CARRY. docs/ECONOMY.md's Charge rule
 * 2 is "Mistakes cost nothing. Charge paces volume. It never prices being
 * wrong", and the Supersession section calls it load bearing. A student looking
 * at a limiter assumes the opposite, because every limiter they have met prices
 * mistakes, so the sheet says it out loud in every state where a cost is on
 * screen. `promise` is that sentence and it is never empty in those states.
 *
 * NOT THROUGH t(). Same rule as hudModel.ts: these state what the economy did,
 * and a mistranslated "wrong answers cost nothing" is a promise broken in
 * another language.
 */

import {
  CHARGE_REGEN_MINUTES,
  SINK_COST,
  chargeCostFor,
  type EconomySnapshot,
  type NodeKind,
} from "@blueberry/economy";

export type ChargeGateState = "ready" | "free" | "empty" | "exam";

/** The node the sheet is standing in front of. The shell supplies all four fields. */
export interface ChargeGateNode {
  /** The id the journal will carry, so the spend and the clear name one node. */
  readonly id: string;
  readonly kind: NodeKind;
  readonly title: string;
  /** Where Start goes once the charge is committed. */
  readonly href: string;
}

/** The refill picture, in the empty state. Null everywhere else. */
export interface RefillReadout {
  /**
   * How far the next point has come, 0 to 1.
   *
   * READ, NEVER ACCUMULATED. docs/ECONOMY.md, Anti-abuse: "Charge regeneration
   * is computed from server time on read, never accumulated by a client tick."
   * `nextRegenAt` is derived from the journal's own timestamps, so this is one
   * subtraction against the clock reading the caller handed in. The sheet
   * re-derives on a timer; it never decrements anything.
   */
  readonly nextFraction: number;
  /** "14 min", or "under a minute" inside the last one. */
  readonly nextIn: string;
  /** "6:40 PM" in the student's own zone, or null when the clock is unreadable. */
  readonly fullAt: string | null;
}

/** The 60 diamond top-up, priced from SINK_COST. Null outside the empty state. */
export interface TopUpReadout {
  readonly cost: number;
  readonly balance: number;
  readonly affordable: boolean;
  /** The button's own words. Carries the price, because a price hidden until the tap is a trap. */
  readonly label: string;
  /** Under the button: what it buys, or what is missing. */
  readonly note: string;
}

export interface ChargeGateModel {
  readonly state: ChargeGateState;
  readonly node: ChargeGateNode;
  /** "Reaction node", "Review drill". The small pill above the headline. */
  readonly kindLabel: string;
  /** What entering costs right now. 0 in `free` and `exam`. */
  readonly cost: number;
  readonly cap: number;
  /** Charge before the press. */
  readonly before: number;
  /** Charge after it. Equal to `before` wherever the cost is 0. */
  readonly after: number;
  /** Days until the exam, 0 on the day itself. Null outside the window. */
  readonly examDaysLeft: number | null;
  readonly headline: string;
  readonly line: string;
  /**
   * The rule about mistakes. Empty string only in the exam window, where the
   * whole state already says there is no cost of any kind to be wrong about.
   */
  readonly promise: string;
  /** Unit quizzes are refunded in full on a pass, so the sheet says so before entry. */
  readonly refund: boolean;
  readonly primaryLabel: string;
  readonly dismissLabel: string;
  readonly refill: RefillReadout | null;
  readonly topUp: TopUpReadout | null;
  /** The dialog's accessible name. Says the state, not the glyph. */
  readonly label: string;
}

/** What each node kind is called on screen. The student's word, not the enum's. */
const KIND_LABEL: Readonly<Record<NodeKind, string>> = Object.freeze({
  concept: "Concept node",
  reaction: "Reaction node",
  branch: "Side quest",
  quiz: "Unit quiz",
  review: "Review drill",
  tutorial: "Tutorial",
  intro: "Intro lesson",
});

/**
 * The same word in the plural, because the empty state's line opens with it.
 *
 * Not `${kindLabel.toLowerCase()}s`. That produced "unit quizs cost 10", which
 * is the kind of thing an English plural rule invented at a template does, and
 * it opened a sentence in lower case besides. Seven nouns is a table.
 */
const KIND_PLURAL: Readonly<Record<NodeKind, string>> = Object.freeze({
  concept: "Concept nodes",
  reaction: "Reaction nodes",
  branch: "Side quests",
  quiz: "Unit quizzes",
  review: "Review drills",
  tutorial: "Tutorials",
  intro: "Intro lessons",
});

/**
 * The free state's headline: the RULE, in the kind's own words.
 *
 * Every state's headline is a rule rather than a name, so the four read as one
 * surface. The node's own title is drawn above it either way; see ChargeGate's
 * `.charge-title`.
 */
const FREE_HEADLINE: Readonly<Record<NodeKind, string>> = Object.freeze({
  // These four are never reached: their costs are non zero, so they never
  // resolve to `free` outside the exam window, which has its own copy. The map
  // is total so a future price change cannot silently produce an empty line.
  concept: "Free to start",
  reaction: "Free to start",
  branch: "Free to start",
  quiz: "Free to start",
  review: "Review drills are always free",
  tutorial: "The tutorial is always free",
  intro: "Intro lessons are always free",
});

/** Why this kind is free, in the kind's own terms. Generic copy reads as boilerplate. */
const FREE_REASON: Readonly<Record<NodeKind, string>> = Object.freeze({
  concept: "This one costs no charge.",
  reaction: "This one costs no charge.",
  branch: "This one costs no charge.",
  quiz: "This one costs no charge.",
  review: "Nothing that repairs your memory is ever gated.",
  tutorial: "So is every intro lesson. What gets you started is never behind a meter.",
  intro: "So is the tutorial. What gets you started is never behind a meter.",
});

/** docs/ECONOMY.md, Charge rule 2. The one sentence this surface exists to carry. */
const MISTAKES_PROMISE = "Wrong answers cost nothing. Take as many tries as you need.";

/**
 * The same rule, said where a student is most likely to suspect otherwise: they
 * have just run out, and the obvious explanation is that being wrong drained
 * it. It did not.
 */
const MISTAKES_PROMISE_EMPTY = "None of it went on wrong answers. Being wrong has never cost you charge.";

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** "in 9 days", "tomorrow", "today". Reads as a date rather than a count. */
function whenExam(daysLeft: number): string {
  if (daysLeft <= 0) return "today";
  if (daysLeft === 1) return "tomorrow";
  return `in ${daysLeft} days`;
}

/**
 * "Exam in 9 days. No limits until then."
 *
 * docs/ECONOMY.md writes this sentence out, so it is reproduced rather than
 * paraphrased. Today and tomorrow take "until it's done" instead, because "no
 * limits until then" pointing at this afternoon reads as a countdown, and a
 * countdown is the one thing the exam window exists to remove.
 */
function examHeadline(daysLeft: number): string {
  if (daysLeft <= 1) return `Exam ${whenExam(daysLeft)}. No limits until it is done.`;
  return `Exam ${whenExam(daysLeft)}. No limits until then.`;
}

/** "14 min", "1 min", "under a minute". Never a bare number of seconds. */
export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "any moment";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes <= 1) return "under a minute";
  if (minutes < 90) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} h`;
}

/**
 * "6:40 PM" in the student's own zone.
 *
 * The zone comes off the snapshot, which took it from the journal, so a student
 * who flew somewhere reads the clock they are actually looking at. An unknown
 * zone falls back to the runtime's rather than throwing: a wrong hour is a bad
 * label, a crash on a sheet is a student who cannot leave it.
 */
export function formatClock(iso: string | null, tz: string): string | null {
  if (iso === null) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(ms));
  } catch {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(ms));
  }
}

function refillReadout(snapshot: EconomySnapshot): RefillReadout {
  const { nextRegenAt, fullAt } = snapshot.charge;
  const nowMs = Date.parse(snapshot.now);
  const nextMs = nextRegenAt === null ? Number.NaN : Date.parse(nextRegenAt);
  const remainingMs = nextMs - nowMs;
  return {
    nextFraction: Number.isFinite(remainingMs) ? clamp01(1 - remainingMs / (CHARGE_REGEN_MINUTES * 60_000)) : 0,
    nextIn: formatCountdown(remainingMs),
    fullAt: formatClock(fullAt, snapshot.tz),
  };
}

function topUpReadout(snapshot: EconomySnapshot): TopUpReadout {
  const cost = SINK_COST.charge_topup;
  const balance = snapshot.diamonds.balance;
  const affordable = balance >= cost;
  return {
    cost,
    balance,
    affordable,
    label: `Fill the meter · ${cost}`,
    // Not "you can't afford it". The shortfall is a fact and the sentence that
    // carries it also says where diamonds come from, because a student who has
    // just been stopped twice needs a route rather than a verdict.
    note: affordable
      ? `Takes you back to ${snapshot.charge.cap}. You have ${balance} diamonds.`
      : `You have ${balance} diamonds. Clearing nodes and flawless runs earn the rest.`,
  };
}

/**
 * The whole sheet, from one snapshot and one node. Pure: same inputs in, same
 * words out, which is what lets the wrong-answer test compare two models for
 * equality rather than squinting at a screenshot.
 */
export function chargeGateModel(snapshot: EconomySnapshot, node: ChargeGateNode): ChargeGateModel {
  const cap = snapshot.charge.cap;
  const before = snapshot.charge.current;
  const cost = chargeCostFor(node.kind, snapshot);
  const kindLabel = KIND_LABEL[node.kind];
  const examDaysLeft = snapshot.charge.examWindow ? (snapshot.charge.examDaysLeft ?? 0) : null;

  const base = {
    node,
    kindLabel,
    cost,
    cap,
    before,
    examDaysLeft,
    refund: node.kind === "quiz",
    dismissLabel: "Not now",
  } as const;

  if (snapshot.charge.examWindow) {
    return {
      ...base,
      state: "exam",
      after: before,
      headline: examHeadline(examDaysLeft ?? 0),
      line: "Charge is switched off until your exam. Take on as much as you want.",
      promise: "",
      primaryLabel: "Start",
      refill: null,
      topUp: null,
      label: `${node.title}. ${examHeadline(examDaysLeft ?? 0)}`,
    };
  }

  if (cost === 0) {
    return {
      ...base,
      state: "free",
      after: before,
      headline: FREE_HEADLINE[node.kind],
      line: FREE_REASON[node.kind],
      promise: MISTAKES_PROMISE,
      primaryLabel: "Start",
      refill: null,
      topUp: null,
      label: `${node.title}. Free to start.`,
    };
  }

  if (before < cost) {
    const refill = refillReadout(snapshot);
    const full = refill.fullAt === null ? "" : `, full by ${refill.fullAt}`;
    return {
      ...base,
      state: "empty",
      after: before,
      // A rule, not a verdict. The bar's equivalent sentence at this moment is
      // about what the student lost; this one is about what is already coming
      // back, which is the honest description of a limiter that regenerates and
      // is the reason docs/ECONOMY.md permits the mechanic at all.
      headline: "Charge refills on its own",
      line: `${KIND_PLURAL[node.kind]} cost ${cost}, and you have ${before}. Next point in ${refill.nextIn}${full}.`,
      promise: MISTAKES_PROMISE_EMPTY,
      primaryLabel: "Review drills are always free",
      refill,
      topUp: topUpReadout(snapshot),
      label: `Not enough charge for ${node.title}. Next point in ${refill.nextIn}.`,
    };
  }

  const after = before - cost;
  return {
    ...base,
    state: "ready",
    after,
    // THE HEADLINE IS THE PRICE, not the node's name.
    //
    // The node's name is what the student just pressed, so they already know it
    // and it is drawn above as `.charge-title`. What they do not know, and what
    // this sheet exists to say before anything is spent, is what it costs. The
    // other three states put a rule in this slot too, so all four read as one
    // surface rather than as a title card that sometimes turns into a notice.
    headline: `${cost} charge to start`,
    // Drawn above as the outlined pips, written here as the arithmetic. The
    // count is the one thing a row of pips cannot say on its own: a student
    // looking at a meter cannot tell which end of it is about to go.
    line: base.refund
      ? `All ${cost} come back when you pass, so a clean run costs nothing.`
      : `You will have ${after} left, and it refills on its own.`,
    promise: MISTAKES_PROMISE,
    primaryLabel: "Start",
    refill: null,
    topUp: null,
    label: `${node.title}. ${cost} charge to start, ${after} left after.`,
  };
}
