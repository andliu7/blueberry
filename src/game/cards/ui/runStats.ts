/**
 * What a review run adds on top of session.ts: the streak, the "called it"
 * tally, the grade split, and the swipe rule. Read this before trusting it.
 *
 * WHY A STREAK, AND WHICH ONE. Quizlet Learn's "12 in a row" is the one piece
 * of game feel in its study loop (blueberry screens 43 and 45 in the mobbin
 * set), and it works because it counts something the student did. Ours
 * counts consecutive RIGHT CALLS, in the order they were made. It used to
 * count Good and Easy grades, and the round 2 critic watched a run of six
 * wrong calls, each graded Good, end on "7 Best streak" with a "6 in a row"
 * chip on the way: a grade is the student's own report, a call is checked.
 * A wrong call or "I don't know" ends it quietly and nothing is taken away:
 * the number simply starts again, per DESIGN-TOKENS' rule that a retention
 * surface never animates a number falling. A card with nothing to call
 * neither extends nor ends it.
 *
 * THE SUGGESTED GRADE IS A SUGGESTION. A correct prediction lights Good, a
 * wrong one lights Again, and the student can still press anything. The
 * scheduler runs on honest self reports; a prediction that was a lucky guess
 * deserves Hard, and only the student knows that.
 *
 * Pure: no React, no clock.
 */

import { CARD_RUN_MIN_GRADED, CARD_RUNS_PAID_PER_DAY, DIAMONDS_CARD_RUN } from "@blueberry/economy";
import type { Card, CardId, DeckSnapshot, Rating } from "../types";
import { isLearning } from "../scheduler";
import { isDue, RATINGS } from "../types";
import { summaryHeadline, type RatingRecord, type SessionSummary } from "./session";

export interface PredictionRecord {
  readonly cardId: CardId;
  readonly correct: boolean;
}

export interface RunStats {
  /** Consecutive right calls ending at the latest call. */
  readonly streak: number;
  readonly bestStreak: number;
  /** Cards called, and how many of them the latest call got right. */
  readonly predicted: number;
  readonly called: number;
  /** Presses per grade, every press counted (a card graded twice counts twice). */
  readonly split: Readonly<Record<Rating, number>>;
}

/**
 * `calls` is every call in the order made, a card called again after Again
 * included: the streak reads that order. The tally reads only each card's
 * latest call, so a card called twice counts once, as the card it is.
 */
export function runStats(
  ratings: readonly RatingRecord[],
  calls: readonly PredictionRecord[],
): RunStats {
  const split: Record<Rating, number> = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const record of ratings) split[record.rating] += 1;
  let streak = 0;
  let bestStreak = 0;
  for (const call of calls) {
    streak = call.correct ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  const latest = new Map<CardId, boolean>();
  for (const call of calls) latest.set(call.cardId, call.correct);
  return {
    streak,
    bestStreak,
    predicted: latest.size,
    called: [...latest.values()].filter(Boolean).length,
    split,
  };
}

/** The grade a prediction points at. Null when nothing was predicted. */
export function suggestedRating(correct: boolean | null): Rating | null {
  if (correct === null) return null;
  return correct ? "good" : "again";
}

/** "Called it 3 of 4". Null when no prediction was made, so nothing renders. */
export function calledLine(stats: RunStats): string | null {
  if (stats.predicted === 0) return null;
  return `Called it ${stats.called} of ${stats.predicted}`;
}

/**
 * The summary's headline, which now hears the calls. Round 1 headlined a run
 * with a wrong call graded Good as "Straight through, no repeats", because the
 * headline only read the grades; the prediction fed a small tile and nothing
 * else. A missed call (a wrong pick, or "I don't know") now leads, since it is
 * the most specific thing the run learned. A run with no misses falls back to
 * session.ts's grade-based sentence, unchanged.
 */
export function runHeadline(summary: SessionSummary, stats: RunStats): string {
  const missed = stats.predicted - stats.called;
  if (missed === 1) return "One call to learn from";
  if (missed > 1) return `${missed} calls to learn from`;
  if (stats.predicted > 0 && summary.cameBack === 0 && summary.reviewed > 0) return "Every call right, straight through";
  return summaryHeadline(summary);
}

/**
 * The swipe rule. Right is Good and left is Again, the two grades a student
 * reaches for most; Hard and Easy stay on the buttons, which are always
 * visible and are the accessible path. The threshold is a fraction of the
 * card's width with a floor, so a small wobble while scrolling never grades.
 */
export const SWIPE_MIN_PX = 80;
export const SWIPE_FRACTION = 0.28;

export function swipeRating(dx: number, width: number): Rating | null {
  const threshold = Math.max(SWIPE_MIN_PX, width * SWIPE_FRACTION);
  if (dx >= threshold) return "good";
  if (dx <= -threshold) return "again";
  return null;
}

/** Keys 1 to 4 grade, in the order the buttons are shown. */
export function ratingForKey(key: string): Rating | null {
  if (key.length !== 1) return null;
  const index = Number.parseInt(key, 10);
  if (!Number.isInteger(index) || index < 1 || index > RATINGS.length) return null;
  return RATINGS[index - 1] ?? null;
}

/* ------------------------------------------------------------------ */
/* What the reward counts (round 5)                                     */
/* ------------------------------------------------------------------ */

/**
 * The run's cards that were due when it started: never rated (a new card is
 * due on arrival) or past their due time. Read ONCE, at the start, because the
 * run's own grades move dueAt and a card graded mid run is not "not due".
 * The owner's rule is "can't be farmed": "Review all" on cards graded a minute
 * ago is the farm, so only these count toward the reward's minimum.
 */
export function dueAtRunStart(cards: readonly Card[], snapshot: DeckSnapshot, now: Date): ReadonlySet<CardId> {
  const due = new Set<CardId>();
  for (const card of cards) {
    const state = snapshot.review[card.id];
    if (state === undefined || isDue(state, now)) due.add(card.id);
  }
  return due;
}

/**
 * The sources whose cards the app wrote: a lesson beat, a game mistake, a
 * registry reaction. The student cannot mint more of them by typing, so a
 * first look at one is real study. A composed or imported card is the
 * student's own text, and five of them cost a minute (round 4 critic).
 */
const BUILT_IN_SOURCES: ReadonlySet<Card["source"]["kind"]> = new Set(["lesson", "mistake", "reaction"]);

/**
 * The cards whose grade counts toward the reward's minimum, read once at the
 * start like dueAtRunStart, of which it is a subset. Round 6 rule:
 *   (a) a GRADUATED card that was due: a real spaced review;
 *   (b) the first review of a built-in card (BUILT_IN_SOURCES).
 * Never a composed or imported card's first review (the junk card farm), and
 * never a learning or relearning step (the self lapse farm: Again on cards
 * that were not due, then a run ten minutes later). Owner may revise.
 */
export function creditableAtRunStart(cards: readonly Card[], snapshot: DeckSnapshot, now: Date): ReadonlySet<CardId> {
  const due = dueAtRunStart(cards, snapshot, now);
  const out = new Set<CardId>();
  for (const card of cards) {
    if (!due.has(card.id)) continue;
    const state = snapshot.review[card.id];
    const firstReview = state === undefined || state.lastRating === null;
    if (firstReview ? BUILT_IN_SOURCES.has(card.source.kind) : !isLearning(state)) out.add(card.id);
  }
  return out;
}

/** Distinct finished cards that were due at the start: the number the economy is told. */
export function dueGraded(finished: readonly CardId[], dueAtStart: ReadonlySet<CardId>): number {
  return new Set(finished.filter((cardId) => dueAtStart.has(cardId))).size;
}

/**
 * The line under a zero Diamonds tile, or null when the run paid. A run with
 * enough due cards that paid nothing was stopped by the daily cap, and the
 * line says so: the rule restated after a six card run read as a bug.
 */
export function rewardLine(dueCount: number, credited: number): string | null {
  if (credited > 0) return null;
  if (dueCount >= CARD_RUN_MIN_GRADED) {
    return `Today's ${CARD_RUNS_PAID_PER_DAY} paid runs are done. Diamonds again tomorrow.`;
  }
  return (
    `A run of ${CARD_RUN_MIN_GRADED} or more cards earns ${DIAMONDS_CARD_RUN} diamonds, up to ` +
    `${CARD_RUNS_PAID_PER_DAY} runs a day. Only cards that were due count, and new cards only from built-in decks.`
  );
}
