/**
 * Every number in docs/ECONOMY.md, as named frozen constants.
 *
 * This file is the executable half of that document. If a number here disagrees
 * with that document, the document wins and this file is the bug. Nothing here
 * is tuned to make a test pass; the tests assert these values against the tables
 * they came from.
 *
 * Two rows are load bearing beyond their size, and both are called out in
 * ECONOMY.md's Supersession section as things that must not be quietly stripped:
 *
 *   CHARGE_COST.review, .tutorial and .intro are 0. "Never gate what repairs
 *   decay", and CLAUDE.md: what sells the product is never gated.
 *
 *   A wrong answer costs 0 of everything. There is deliberately no constant for
 *   it, because a constant is a thing a future edit can set to 1. The absence of
 *   any wrong answer term in derive.ts is the enforcement, and
 *   test/wrong-answers-are-free.test.ts is the proof.
 */

import type { DailyGoalTier, NodeKind, SpendSink } from "./journal.js";

/* ------------------------------------------------------------------ XP ---- */

/**
 * XP for a node's FIRST clear, by node kind. docs/ECONOMY.md, XP table.
 *
 * Two entries are decisions the table does not spell out, recorded here rather
 * than buried in derive.ts:
 *
 *   quiz is 0 because a unit quiz pays through `quiz_passed` (XP_QUIZ_PASSED).
 *   Paying a `node_cleared` of kind "quiz" as well would pay the same pass twice.
 *
 *   tutorial and intro are priced as concept nodes. They cost no charge, which
 *   is a separate question from whether the work counts as effort. It does.
 *
 *   review is the one repeatable earner, so it is paid on EVERY clear rather
 *   than only the first. See XP_REPLAY, which review clears never fall back to.
 */
export const XP_NODE_FIRST_CLEAR: Readonly<Record<NodeKind, number>> = Object.freeze({
  concept: 10,
  reaction: 15,
  branch: 20,
  quiz: 0,
  review: 12,
  tutorial: 10,
  intro: 10,
});

/** No wrong arrow on any step. First clear only, never on a replay. */
export const XP_FLAWLESS_BONUS = 5;
/** Per step past the first, in one sitting. Multi step endurance is the exam skill. */
export const XP_SEQUENCE_PER_EXTRA_STEP = 3;
export const XP_QUIZ_PASSED = 30;
/** The largest single award. It should feel like it. */
export const XP_QUIZ_FLAWLESS_BONUS = 20;
/** The delight loop, deliberately under a node clear. */
export const XP_RESONANCE = 8;
/** Once per local day, on top of whatever earned it. */
export const XP_DAILY_GOAL_MET = 10;
/** A replay of an already cleared node. Deliberately low: see the flat rate constraint. */
export const XP_REPLAY = 5;

/** docs/ECONOMY.md, Daily goals. Exam mode is offered only inside the exam window. */
export const DAILY_GOAL_XP: Readonly<Record<DailyGoalTier, number>> = Object.freeze({
  casual: 10,
  regular: 20,
  serious: 35,
  exam: 60,
});

/** What a student who never opened the goal picker is held to. */
export const DEFAULT_DAILY_GOAL: DailyGoalTier = "regular";

/* ------------------------------------------------------------ DIAMONDS ---- */

/** Node first clear, spine or branch. Once per node forever, so grinding earns nothing. */
export const DIAMONDS_NODE_FIRST_CLEAR = 10;
/** The spine is the course; the map's classification does the weighting. */
export const DIAMONDS_SPINE_BONUS = 5;
export const DIAMONDS_SEQUENCE_PER_EXTRA_STEP = 5;
/** Visible before starting, never shamed after. */
export const DIAMONDS_FLAWLESS = 5;
/** Hunting supplements, never replaces. */
export const DIAMONDS_RESONANCE = 8;
/** The big celebratory moment, full bleed. */
export const DIAMONDS_UNIT_CLEARED = 50;
/** Boss, multistep synthesis. Gated on five units. The endgame paycheck. */
export const DIAMONDS_BOSS = 200;
/** Retention pays, lightly and repeatably. */
export const DIAMONDS_REVIEW_CLEARED = 5;
/** At 7, 14, 30, 60, 100, 180, 365. */
export const DIAMONDS_STREAK_MILESTONE = 75;

/**
 * Sink prices. docs/ECONOMY.md, Sinks.
 *
 * A spend event carries its own cost, because a costume is 100 to 300 depending
 * on the costume and the catalogue is not this package's business. This table is
 * the canonical price for the fixed price sinks and the FLOOR for costumes; see
 * COSTUME_COST_RANGE.
 */
export const SINK_COST: Readonly<Record<SpendSink, number>> = Object.freeze({
  costume: 100,
  pathway_theme: 250,
  canvas_skin: 150,
  cloud_clear: 75,
  pen_colour: 50,
  streak_freeze: 75,
  streak_repair: 150,
  charge_topup: 60,
});

/** Berry outfits and moods: 100 to 300. Pure identity. */
export const COSTUME_COST_RANGE = Object.freeze({ min: 100, max: 300 });

/* -------------------------------------------------------------- CHARGE ---- */

/** Full meter. */
export const CHARGE_CAP = 30;

/**
 * Charged on ENTRY, never per question. docs/ECONOMY.md, Charge, rule 1:
 * "If there was enough to begin, there is enough to finish."
 */
export const CHARGE_COST: Readonly<Record<NodeKind, number>> = Object.freeze({
  concept: 5,
  reaction: 8,
  branch: 8,
  quiz: 10,
  review: 0,
  tutorial: 0,
  intro: 0,
});

/** Refunded in full on a pass. */
export const CHARGE_QUIZ_REFUND = CHARGE_COST.quiz;
/** +1 per 30 min. Empty to full in 15h, so a night always resets it. */
export const CHARGE_REGEN_MINUTES = 30;
export const CHARGE_REGEN_PER_INTERVAL = 1;
/** The better you get, the less it binds. Inverts Duolingo's incentive. */
export const CHARGE_FLAWLESS_BONUS = 3;
/** Combo mini game, random reward on a correct streak. */
export const CHARGE_COMBO_MIN = 2;
export const CHARGE_COMBO_MAX = 6;

/** The kinds that are always free to enter, at any charge level. */
export const CHARGE_FREE_NODE_KINDS: readonly NodeKind[] = Object.freeze(["review", "tutorial", "intro"]);

/**
 * The two weeks before the exam date collected at onboarding, through the exam
 * date itself. Charge switches off completely and says so. This is the whole
 * ethical argument for the mechanic in one gesture.
 */
export const EXAM_WINDOW_DAYS = 14;

/* -------------------------------------------------------------- STREAK ---- */

export const STREAK_FREEZE_COST = SINK_COST.streak_freeze;
/** Hold up to 2. Consumed automatically before the streak breaks. */
export const STREAK_FREEZE_MAX_HELD = 2;
export const STREAK_REPAIR_COST = SINK_COST.streak_repair;
/** 48h window after a break. */
export const STREAK_REPAIR_WINDOW_HOURS = 48;
/** Capped at once a calendar month. */
export const STREAK_REPAIR_PER_MONTH = 1;
/** One per ISO week, auto applied, announced after the fact. The release valve. */
export const REST_DAYS_PER_WEEK = 1;
export const STREAK_MILESTONES: readonly number[] = Object.freeze([7, 14, 30, 60, 100, 180, 365]);
/** Local hour after which an unmet goal starts reading as at risk. */
export const STREAK_AT_RISK_HOUR = 18;

/* ------------------------------------------------------------- MASTERY ---- */

export interface MasteryRank {
  readonly name: string;
  /** Lowest mastery score that holds this rank. */
  readonly at: number;
  /** Diamonds paid the first time the rank is reached. Never paid twice. */
  readonly diamonds: number;
  /** What the rank claims the student can do. Lead with this, not the number. */
  readonly claim: string;
}

/** docs/ECONOMY.md, Mastery table. Ordered low to high; the order is relied on. */
export const MASTERY_RANKS: readonly MasteryRank[] = Object.freeze([
  Object.freeze({ name: "Reader", at: 0, diamonds: 0, claim: "Name the structure, spot the reactive site" }),
  Object.freeze({ name: "Arrow Pusher", at: 16, diamonds: 125, claim: "Move electrons the right way for the right reason" }),
  Object.freeze({ name: "Mechanist", at: 31, diamonds: 125, claim: "Predict a product from an unseen mechanism" }),
  Object.freeze({ name: "Synthesist", at: 51, diamonds: 125, claim: "Plan a two or three step route forward" }),
  Object.freeze({ name: "Retrosynthesist", at: 71, diamonds: 125, claim: "Work backwards from a cold target" }),
  Object.freeze({ name: "Exam Ready", at: 86, diamonds: 250, claim: "Handle a full mixed exam under time" }),
]);

/**
 * "Cap the visible dip at 2 points a day regardless of what the model says. The
 * model may be harsh. The display may not be."
 */
export const MASTERY_VISIBLE_DIP_CAP = 2;

/** Strength decays from 1.0 on a clear with this half life, in days. */
export const MASTERY_HALF_LIFE_START_DAYS = 7;
/** Each successful review or later correct attempt doubles the half life. */
export const MASTERY_HALF_LIFE_FACTOR = 2;
/**
 * A ceiling on the doubling, in days. Not in ECONOMY.md: doubling without one
 * reaches "never decays again" after nine reviews, which would make Mastery a
 * ratchet and quietly delete the decay the Supersession section says ships. A
 * year is the longest interval a course length product can honestly claim.
 */
export const MASTERY_HALF_LIFE_MAX_DAYS = 365;
/** Below this strength a cleared node is "cracking" and asks for a review. */
export const MASTERY_CRACKING_THRESHOLD = 0.5;
/**
 * Weight used for a node that was started but never cleared, so its difficulty
 * was never journalled. The middle of the 1 to 5 scale.
 */
export const MASTERY_DEFAULT_DIFFICULTY = 3;

/**
 * The smallest denominator the mastery score is ever divided by. It applies to
 * every denominator, named course or fallback, and the reason is below.
 *
 * ECONOMY.md: Mastery is "0 to 100 per course" and "a single node should move
 * it a point at most." The honest denominator is the whole course, which
 * `deriveEconomy` takes as an explicit `universe` option. Without one the
 * derivation can only see the nodes the journal unlocked, and a journal whose
 * first event is a clear then reads as one of one: 100 percent, Exam Ready,
 * 750 diamonds for one lesson.
 *
 * The arithmetic. Strength is 1.0 the instant a node is cleared, so a fresh
 * single clear scores 100 * difficulty / max(course difficulty, floor).
 * Reader ends at 15 and Arrow Pusher starts at 16, so a single clear must stay
 * at or below 15 whatever its difficulty, and the hardest node is 5:
 *
 *   default difficulty 3:  100 * 3 / 40 =  7.5   Reader
 *   hardest difficulty 5:  100 * 5 / 40 = 12.5   Reader
 *   the bound for 5:       500 / 15 = 33.3, so any floor above 34 is enough
 *
 * 40 is chosen above that bound because it is also a plausible small course:
 * about 13 nodes at the default difficulty, a unit's worth.
 *
 * WHY IT FLOORS A NAMED COURSE TOO, which is not where this started. The floor
 * was first written to guard only the fallback, on the assumption that a real
 * course is comfortably wider than it. That assumption is false today: the
 * curriculum homes 3 topics in General Chemistry I, 2 in General Chemistry II
 * and 9 in Organic Chemistry I, so naming the course put the same bug back with
 * a different denominator. One finished lesson of General Chemistry I was
 * 100 * 3 / 9, which is 33: rank Mechanist, "predict a product from an unseen
 * mechanism", and 250 diamonds of rank money for one lesson of a course the
 * product has barely authored.
 *
 * The consequence is deliberate and it is the honest one: a course smaller than
 * this cannot reach the top ranks, because clearing every node of a three topic
 * stub does not back the claim Exam Ready makes. ECONOMY.md says of exactly this
 * kind of claim, "Do not make the claim until the data supports it." When those
 * courses are authored out past the floor, this stops binding on them by itself
 * and nothing here has to change.
 */
export const MASTERY_MIN_UNIVERSE_DIFFICULTY = 40;

/** Rank for a score, by the thresholds above. Never returns undefined: Reader is 0. */
export function rankFor(score: number): MasteryRank {
  let found = MASTERY_RANKS[0] as MasteryRank;
  for (const rank of MASTERY_RANKS) {
    if (score >= rank.at) found = rank;
  }
  return found;
}

/** The rank above the given one, or null at the top of the ladder. */
export function nextRankAfter(rank: MasteryRank): MasteryRank | null {
  const index = MASTERY_RANKS.indexOf(rank);
  if (index < 0 || index + 1 >= MASTERY_RANKS.length) return null;
  return MASTERY_RANKS[index + 1] as MasteryRank;
}
