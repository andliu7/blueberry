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

import type { CardId, Rating } from "../types";
import { RATINGS } from "../types";
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
