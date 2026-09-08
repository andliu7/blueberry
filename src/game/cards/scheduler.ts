/**
 * The spaced repetition scheduler. This is the Anki borrow, and CLAUDE.md is
 * specific about which half we take: "take the scheduler, leave the interface."
 * Retention is what a DAT or MCAT student is actually buying, so this file is
 * the piece that makes the product a retention tool rather than a quiz app.
 *
 * SM-2 LITE, and lite is deliberate. Real SM-2 carries a quality score from 0
 * to 5, a separate repetition counter, and a lapse table. A student pressing
 * one of four buttons cannot supply six levels of self assessment honestly, so
 * the four buttons ARE the model: again, hard, good, easy. Two numbers per
 * card carry the whole state, `interval` in DAYS and `ease` as the multiplier
 * that expands it, which is the shape ReviewState in types.ts already declares.
 *
 * THE FOUR BUTTONS, in one line each:
 *
 *   again  the card comes back inside the same session, ten minutes out, and
 *          re-enters the learning queue. It does not multiply anything.
 *   hard   the interval grows by HARD_FACTOR, about 1.2. Growth SLOWS. It
 *          never resets, because a card you half remembered is not a card you
 *          never saw, and throwing away three weeks of interval for a slow
 *          recall is the single most demoralising thing Anki does.
 *   good   the default path: the interval grows by the card's own ease, 2.5 at
 *          the start.
 *   easy   about 3.5 at the starting ease (ease times EASY_BONUS), which gets
 *          a card the student clearly owns out of the way.
 *
 * LEARNING AGAINST GRADUATED, and how the state tells them apart. A brand new
 * card and a card just rated `again` are in LEARNING: they are measured in
 * minutes and they are not a real interval yet. Rather than adding a field to
 * ReviewState (another builder owns that file, and a derived flag is one more
 * thing that can disagree with itself), learning is DERIVED: interval below
 * one day means learning. `good` on a learning card graduates it to one day,
 * `easy` graduates it to four, which is Anki's own graduating pair.
 *
 * TIME IS A PARAMETER, NEVER A CLOCK READ. Every function here takes `now`.
 * That is what makes "does a card rated hard three times still grow" a test
 * rather than an argument, and it is why the tests in test/scheduler.test.ts
 * can ask about next February without waiting.
 *
 * WHAT IS NOT HERE. Storage, React, and any decision about which card to show
 * next. This file answers exactly one question: given a card's current state
 * and a button, when should it come back. store.ts persists the answer.
 *
 * A worked line, so the arithmetic is readable without running it. A new card
 * rated good every time: 1, 3, 8, 20, 50, 125, 313, then the 365 day ceiling.
 * The same card rated hard at day 3 goes to 4 rather than 8, and keeps going.
 */

import type { CardId, Rating, ReviewState } from "./types";

/* ------------------------------------------------------------------ */
/* The dials                                                            */
/* ------------------------------------------------------------------ */

/**
 * Exported because a test that hardcodes 2.5 is a test that breaks when a
 * professor-facing settings layer moves it, and because the review screen
 * wants to show "about 3 days" on the button before it is pressed.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Anki's starting ease, and the reason `good` reads as "about 2.5". */
export const STARTING_EASE = 2.5;

/**
 * The floor exists so a card the student keeps failing cannot drive its own
 * multiplier below one and start SHRINKING its interval every review.
 */
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.5;

/** What each button does to the ease, for NEXT time. See `rateCard`. */
export const EASE_DELTA: Readonly<Record<Rating, number>> = Object.freeze({
  again: -0.2,
  hard: -0.15,
  good: 0,
  easy: 0.15,
});

/** "Inside the same session" made a number. */
export const AGAIN_MINUTES = 10;
export const AGAIN_INTERVAL_DAYS = AGAIN_MINUTES / (24 * 60);

/** Below this is learning; at or above it is a real interval. */
export const GRADUATING_INTERVAL_DAYS = 1;
export const EASY_GRADUATING_INTERVAL_DAYS = 4;

/** Hard is a fixed slow growth, not an ease multiple. Same as Anki. */
export const HARD_FACTOR = 1.2;

/** Easy multiplies the ease, so easy at the starting ease is about 3.5. */
export const EASY_BONUS = 1.4;

/**
 * A year. Past this the interval is a statement about a student who will have
 * sat the exam, and an eight year interval is not a schedule, it is a leak.
 */
export const MAX_INTERVAL_DAYS = 365;

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

export function clampEase(ease: number): number {
  if (!Number.isFinite(ease)) return STARTING_EASE;
  return Math.min(MAX_EASE, Math.max(MIN_EASE, ease));
}

/**
 * Learning is derived, not stored. A card measured in minutes is still being
 * met; a card measured in days is being retained.
 */
export function isLearning(state: ReviewState): boolean {
  return state.interval < GRADUATING_INTERVAL_DAYS;
}

/**
 * The multiplier a graduated card grows by. `again` never reaches here: it
 * does not multiply anything, it resets to the learning step, so the type
 * excludes it rather than a comment promising it.
 */
export function growthFactor(rating: Exclude<Rating, "again">, ease: number): number {
  switch (rating) {
    case "hard":
      return HARD_FACTOR;
    case "good":
      return clampEase(ease);
    case "easy":
      return clampEase(ease) * EASY_BONUS;
  }
}

/* ------------------------------------------------------------------ */
/* The schedule                                                         */
/* ------------------------------------------------------------------ */

/**
 * A card nobody has rated. Interval zero and due immediately, so a card saved
 * from a mistake is in today's queue rather than tomorrow's: the moment a
 * student wants to drill it is the moment they got it wrong.
 */
export function startCard(cardId: CardId, now: Date): ReviewState {
  return {
    cardId,
    interval: 0,
    ease: STARTING_EASE,
    dueAt: new Date(now.getTime()).toISOString(),
    lastRating: null,
  };
}

/**
 * The interval in days that `rating` produces from `state`. Split out from
 * `rateCard` because the review screen shows it on the button ("Good, 8 days")
 * before anything is committed, and because a pure number is the easiest thing
 * in this file to test.
 *
 * The ease used for the multiplication is the ease the card was ALREADY
 * carrying. The rating's own adjustment lands on the ease for the review after
 * this one. That ordering is a choice: it means `good` on a fresh card is
 * exactly 2.5 and `easy` is exactly 3.5, which is what the buttons promise,
 * rather than 2.5 and 3.71.
 */
export function nextInterval(state: ReviewState, rating: Rating): number {
  if (rating === "again") return AGAIN_INTERVAL_DAYS;

  if (isLearning(state)) {
    switch (rating) {
      case "hard":
        // Still learning: another short step, slightly longer than the last.
        // The floor matters because a brand new card has interval zero, and
        // zero times anything is a card that never leaves the queue.
        return Math.max(state.interval * HARD_FACTOR, AGAIN_INTERVAL_DAYS);
      case "good":
        return GRADUATING_INTERVAL_DAYS;
      case "easy":
        return EASY_GRADUATING_INTERVAL_DAYS;
    }
  }

  const grown = state.interval * growthFactor(rating, state.ease);
  // Whole days from here on, because "due today" is a day-shaped question and
  // 8.4 days is a false precision. The +1 floor guarantees a graduated card
  // always moves forward: without it, `hard` on a one day interval rounds 1.2
  // back to 1 and the card is stuck on a daily loop forever.
  const forward = Math.max(Math.round(grown), Math.round(state.interval) + 1);
  return Math.min(forward, MAX_INTERVAL_DAYS);
}

/**
 * Apply a button press. Returns a fresh state; nothing is mutated, so a
 * snapshot handed to a rendering surface cannot change underneath it.
 */
export function rateCard(state: ReviewState, rating: Rating, now: Date): ReviewState {
  const interval = nextInterval(state, rating);
  return {
    cardId: state.cardId,
    interval,
    ease: clampEase(state.ease + EASE_DELTA[rating]),
    dueAt: new Date(now.getTime() + interval * DAY_MS).toISOString(),
    lastRating: rating,
  };
}

/* ------------------------------------------------------------------ */
/* The one number the homepage asks for                                 */
/* ------------------------------------------------------------------ */

/**
 * The last millisecond of the LOCAL day containing `now`. Local rather than
 * UTC because a student in Chicago finishing at 11pm should see today's count,
 * not tomorrow's.
 */
export function endOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

/**
 * How many cards are due today. This is the badge on the deck icon and the
 * line on the homepage.
 *
 * It counts everything due by the END of today, not everything due by this
 * instant. `dueCount` in types.ts answers the second question and is the right
 * read for "what is in the queue right now". This one answers "how much is
 * there to do today", which is what a number on a homepage means: a card
 * scheduled for 9pm should already be in the count at breakfast, or the number
 * grows while the student is looking at it.
 */
export function dueTodayCount(states: readonly ReviewState[], now: Date): number {
  const cutoff = endOfLocalDay(now).getTime();
  let count = 0;
  for (const state of states) {
    const due = Date.parse(state.dueAt);
    if (Number.isFinite(due) && due <= cutoff) count += 1;
  }
  return count;
}
