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

import type { ChargeEntry, ChestSource, DailyGoalTier, NodeKind, SpendSink } from "./journal.js";

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

/**
 * A completed flashcard review run (the same run DIAMONDS_CARD_RUN pays, under
 * the same CARD_RUN_MIN_GRADED and CARD_RUNS_PAID_PER_DAY rules). Owner
 * 2026-10-20: every lesson, quiz, practice run and review clear awards XP, and
 * a card run was the one review that paid none. 5 is the replay rate, the
 * lowest XP row: proposed, owner to confirm.
 */
export const XP_CARD_RUN = 5;

/**
 * STAGES: Bloom's level badge and "N XP to the next stage!" (owner, Wave 2,
 * 2026-10-20). There was no XP level logic before this, so the curve is this
 * file's, documented in ECONOMY.md and flagged for the owner: stage 1 starts at
 * 0, and moving from stage s to s + 1 takes XP_STAGE_STEP * s more XP. So the
 * stages open at 0, 50, 150, 300, 500, 750, ... (25 * s * (s - 1)). A regular
 * day (about 30 XP with the goal bonus) clears stage 1 in two days, and each
 * stage after takes a little longer. No top stage: XP never stops.
 */
export const XP_STAGE_STEP = 50;

export interface XpStage {
  /** 1 based. */
  readonly stage: number;
  /** Total XP at which this stage opened. */
  readonly startXp: number;
  /** Total XP at which the next stage opens. */
  readonly nextXp: number;
  /** XP still needed: what the HUD says as "N XP to the next stage!". Always >= 1. */
  readonly toNext: number;
}

/** The stage a lifetime XP total sits in. Negative or non-finite totals read as 0. */
export function stageFor(totalXp: number): XpStage {
  const total = Number.isFinite(totalXp) && totalXp > 0 ? totalXp : 0;
  let stage = 1;
  let startXp = 0;
  while (total >= startXp + XP_STAGE_STEP * stage) {
    startXp += XP_STAGE_STEP * stage;
    stage += 1;
  }
  const nextXp = startXp + XP_STAGE_STEP * stage;
  return { stage, startXp, nextXp, toNext: nextXp - total };
}

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

/**
 * A passed CHALLENGE on a node already cleared: a second, harder run of the
 * same content (BeatRunner: no second pass, a miss ends the run). It pays on
 * every pass, like a review drill, and nothing on a fail.
 *
 * PRICED FROM THE REVIEW DRILL ROW, AND THAT IS A PROPOSAL, NOT AN OWNER
 * DECISION. ECONOMY.md has no Challenge row. The closest documented row is
 * "Review drill cleared, 12 XP and 5 diamonds, the one repeatable earner":
 * both are re-practice of cleared work, and both must pay more than a plain
 * replay (5 XP, 0 diamonds) or the harder run is a worse deal than the easy
 * one. The difference that keeps it from being a farm is the entry: a review
 * drill is free, a Challenge spends the node's own charge on `node_started`,
 * so at most about six fit in a full meter. The owner sets the real numbers.
 */
export const XP_CHALLENGE_PASSED = XP_NODE_FIRST_CLEAR.review;
export const DIAMONDS_CHALLENGE_PASSED = DIAMONDS_REVIEW_CLEARED;

/**
 * A completed FLASHCARD REVIEW RUN pays the review drill rate. OWNER DECISION,
 * 2026-10-01: "flashcard review runs pay 5 diamonds per completed run (the
 * drill-review rate)". It paid no XP until owner 2026-10-20 ("every review
 * clear awards XP"); it now also pays XP_CARD_RUN.
 *
 * WHAT COUNTS AS COMPLETED is this file's call, flagged to the owner:
 *   - the run reached its summary (the client journals nothing before), and
 *   - at least CARD_RUN_MIN_GRADED distinct cards were graded in it, so
 *     opening a run and grading one card on the way out pays nothing;
 *   - at most CARD_RUNS_PAID_PER_DAY runs pay per local day, because a deck
 *     can be re-run on demand (DeckScreen's Review), and a five card deck
 *     run back to back would otherwise be a faucet. Fifteen a day sits
 *     under one first clear plus its spine bonus (15), so cards never
 *     out-earn the pathway.
 */
export const DIAMONDS_CARD_RUN = DIAMONDS_REVIEW_CLEARED;
export const CARD_RUN_MIN_GRADED = 5;
export const CARD_RUNS_PAID_PER_DAY = 3;
/**
 * A TREASURE CHEST on the pathway, opened. Each chest sits at the end of a
 * section and opens once its checkpoint is cleared; it pays this, once per
 * chest id, and nothing else: no XP (so it never fills the daily goal on its
 * own), and it unlocks no node (so it never moves mastery or sets off a rank
 * award, which is what made a chest journalled as a lesson clear pay +135).
 *
 * A PROPOSAL, NOT AN OWNER DECISION. ECONOMY.md has no chest row. 15 is one
 * lesson's first clear plus its spine bonus, so a chest feels like a reward
 * without out-earning the lessons that earned it. The owner sets the number.
 */
export const DIAMONDS_CHEST = 15;

/* -------------------------------------------------------------- CHESTS ---- */

export interface ChestReward {
  readonly diamonds: number;
  readonly xp: number;
}

/**
 * What a saved chest pays when it is opened, by where it came from. Owner
 * 2026-10-20: chests are EARNED and SAVED, rewards are FIXED (a random-XP
 * chest is held until XP is stored server side), and the onboarding gift pays
 * a fixed diamonds + XP amount.
 *
 * The AMOUNTS are this file's proposal, flagged for the owner:
 *   section_final    15, DIAMONDS_CHEST, so a pathway chest pays exactly what
 *                    it always has, and an old journal derives unchanged
 *   daily_quest       5, the "five diamonds fly one by one" chest moment (C1)
 *   daily_gift        5, the same small chest, once a local day
 *   onboarding_gift  50 diamonds + 20 XP, once ever
 *
 * Chest XP counts toward the XP total (and so the stage) but NOT toward the
 * day's goal: opening a gift is not studying, and a chest that met the daily
 * goal would keep a streak alive for opening the app.
 */
export const CHEST_REWARD: Readonly<Record<ChestSource, ChestReward>> = Object.freeze({
  section_final: Object.freeze({ diamonds: DIAMONDS_CHEST, xp: 0 }),
  daily_quest: Object.freeze({ diamonds: 5, xp: 0 }),
  daily_gift: Object.freeze({ diamonds: 5, xp: 0 }),
  onboarding_gift: Object.freeze({ diamonds: 50, xp: 20 }),
});

/** The chest id a daily gift gets, one per local day. */
export function dailyGiftChestId(date: string): string {
  return `daily-gift:${date}`;
}
/** The one onboarding gift chest. */
export const ONBOARDING_GIFT_CHEST_ID = "onboarding-gift";
/** The chest id a completed daily quest gets. */
export function questChestId(date: string, questId: string): string {
  return `quest:${date}:${questId}`;
}
/**
 * Chest id prefixes the derivation mints. A `chest_opened` for one of these
 * pays only if that chest was earned first; any other id is a pathway chest
 * and keeps the pre-2026-10-20 rule (DIAMONDS_CHEST once per id).
 */
export const DERIVED_CHEST_PREFIXES: readonly string[] = Object.freeze(["daily-gift:", ONBOARDING_GIFT_CHEST_ID, "quest:"]);

/* -------------------------------------------------------- DAILY QUESTS ---- */

/** What a quest counts. Every measure is derived from the journal. */
export type QuestMeasure = "lessons" | "train_minutes" | "reviews" | "flawless" | "card_runs" | "xp";

export interface QuestDef {
  readonly id: string;
  readonly title: string;
  readonly measure: QuestMeasure;
  readonly target: number;
}

/**
 * Three quests per local day (owner 2026-10-20): two recurring and one from
 * QUEST_ROTATION. Completing one earns a chest (CHEST_REWARD.daily_quest) and
 * CHARGE_DAILY_QUEST. No XP doubler: that is held.
 *
 * "Train for 30 minutes" is a PROXY. The journal records no time spent (no
 * event carries a duration, and a lesson's attempts are stamped at its clear),
 * so each training activity counts QUEST_MINUTES_PER_ACTIVITY minutes: a
 * lesson or review clear, a quiz pass, a paid Challenge, or a flashcard run of
 * at least CARD_RUN_MIN_GRADED cards. Six activities is the 30 minutes. Swap
 * in real time once the journal carries it.
 */
export const QUEST_MINUTES_PER_ACTIVITY = 5;
export const RECURRING_QUESTS: readonly QuestDef[] = Object.freeze([
  Object.freeze({ id: "lessons", title: "Finish 3 lessons or quizzes", measure: "lessons", target: 3 } as const),
  Object.freeze({ id: "train", title: "Train for 30 minutes", measure: "train_minutes", target: 30 } as const),
]);
/** The rotating third quest, picked by local date: QUEST_ROTATION[day number mod length]. */
export const QUEST_ROTATION: readonly QuestDef[] = Object.freeze([
  Object.freeze({ id: "review", title: "Clear a review drill", measure: "reviews", target: 1 } as const),
  Object.freeze({ id: "flawless", title: "Finish a lesson with no misses", measure: "flawless", target: 1 } as const),
  Object.freeze({ id: "cards", title: "Finish a flashcard review", measure: "card_runs", target: 1 } as const),
  Object.freeze({ id: "xp", title: "Earn 40 XP", measure: "xp", target: 40 } as const),
]);
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

/*
 * Charge is "Energy" on screen. Every number in this block was set by the
 * owner on 2026-10-20, replacing the 2026-08-27 table (cap 30, concept 5,
 * reaction and branch 8, quiz 10, +1 per 30 min, flawless +3). The intent, in
 * the owner's words: a full tank covers a ~5 lesson section and runs out just
 * before its final, and the free plan must still give real value. 5 lessons at
 * 3 is 15 of 20, leaving 5, one short of a final's 6.
 */

/** Full meter. Owner 2026-10-20 (was 30). */
export const CHARGE_CAP = 20;

/**
 * Charged on ENTRY, never per question. docs/ECONOMY.md, Charge, rule 1:
 * "If there was enough to begin, there is enough to finish."
 *
 * Owner 2026-10-20 (was concept 5, reaction 8, branch 8, quiz 10): a regular
 * lesson costs 3, whatever its kind, and a quiz 6, the section final price.
 */
export const CHARGE_COST: Readonly<Record<NodeKind, number>> = Object.freeze({
  concept: 3,
  reaction: 3,
  branch: 3,
  quiz: 6,
  review: 0,
  tutorial: 0,
  intro: 0,
});

/**
 * Owner 2026-10-20: a CHALLENGE run and a SECTION FINAL (a section's closing
 * quiz or the unit checkpoint) cost 6 on entry. The app journals both as a
 * "concept" node (BeatRunner banks every beat clear that way), so the price
 * rides on `node_started.entry` rather than on the node kind.
 */
export const CHARGE_ENTRY_COST: Readonly<Record<ChargeEntry, number>> = Object.freeze({
  challenge: 6,
  final: 6,
});

/** Refunded in full on a `quiz_passed`. Follows the quiz price, so 6 since 2026-10-20. */
export const CHARGE_QUIZ_REFUND = CHARGE_COST.quiz;
/**
 * +10 per 30 min, capped at CHARGE_CAP. Owner 2026-10-20 (was +1 per 30 min).
 * Empty to full in an hour.
 */
export const CHARGE_REGEN_MINUTES = 30;
export const CHARGE_REGEN_PER_INTERVAL = 10;
/**
 * A flawless LESSON (no misses) pays back 2. Owner 2026-10-20 (was 3, on any
 * kind). Only the kinds in CHARGE_FLAWLESS_KINDS: a review drill earns its own
 * CHARGE_REVIEW_CLEARED instead, and a free kind (tutorial, intro) paying
 * charge back on a flawless replay would be a faucet with no entry price.
 * A paid replay costs 3 to enter and returns 2, so this cannot be farmed.
 */
export const CHARGE_FLAWLESS_BONUS = 2;
export const CHARGE_FLAWLESS_KINDS: readonly NodeKind[] = Object.freeze(["concept", "reaction", "branch"]);
/** A review drill cleared earns 3, on every clear. Owner 2026-10-20. */
export const CHARGE_REVIEW_CLEARED = 3;
/** Each daily quest completed earns 5. Owner 2026-10-20. */
export const CHARGE_DAILY_QUEST = 5;
/** Combo mini game, random reward on a correct streak. */
export const CHARGE_COMBO_MIN = 2;
export const CHARGE_COMBO_MAX = 6;

/** The price of entering `kind`, or the entry price when the run is a Challenge or a section final. */
export function chargeEntryCost(kind: NodeKind, entry?: ChargeEntry): number {
  return entry === undefined ? CHARGE_COST[kind] : CHARGE_ENTRY_COST[entry];
}

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
