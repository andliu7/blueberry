/**
 * Mastery, as the deck surfaces draw it. Read this header before trusting
 * anything in this file.
 *
 * WHAT MASTERY IS HERE, and what it is not. The server side Elo-like rating in
 * CLAUDE.md is ability, computed from the attempt history, and nothing on a
 * client draws it from local state. THIS number is retention: how far out the
 * scheduler trusts each card, folded to a 0..1 fraction so a deck tile can
 * draw a thin green bar. It is derived
 * entirely from ReviewState.interval, which is the scheduler's own output, so
 * the bar can never disagree with the schedule it summarises.
 *
 * THE RAMP, in words. A card nobody has rated is 0. A card still in the
 * learning steps (interval under one day, scheduler.ts's own definition) has
 * been met but not yet retained. From graduation the fraction grows linearly
 * with the interval until MATURE_INTERVAL_DAYS, Anki's own threshold for a
 * "mature" card, where it pegs at 1. Linear rather than logarithmic because
 * this is drawn at 4 to 6 pixels tall; no eye can read a curve
 * there, and the honest statement is "how close to mature".
 *
 * Every function takes state, never a clock: mastery is a property of the
 * schedule, not of the hour, so the wall-clock rule in the gauntlet log does
 * not reach this file at all.
 *
 * Pure. No storage, no React, no clock.
 */

import { GRADUATING_INTERVAL_DAYS } from "../scheduler";
import type { DeckSnapshot, DeckId, ReviewState } from "../types";
import { cardsIn } from "../types";

/**
 * Anki's own definition of a mature card: an interval of 21 days or more.
 * A dial of this surface, not of the scheduler: changing it moves where the
 * bar reads full, never when any card comes back.
 */
export const MATURE_INTERVAL_DAYS = 21;

/** The learning steps register as this much: met, not yet retained. */
export const LEARNING_MASTERY = 0.15;

/** One card's retention fraction, 0..1. Undefined state means never rated. */
export function cardMastery(state: ReviewState | undefined): number {
  if (state === undefined || state.lastRating === null) return 0;
  if (state.interval < GRADUATING_INTERVAL_DAYS) return LEARNING_MASTERY;
  return Math.min(1, state.interval / MATURE_INTERVAL_DAYS);
}

/**
 * A deck's fraction: the mean over its cards, unrated cards included at 0,
 * because a deck of forty cards where five are mature is not an 100 percent
 * deck. An empty deck is 0 rather than NaN.
 */
export function deckMastery(snapshot: DeckSnapshot, deckId: DeckId): number {
  const cards = cardsIn(snapshot, deckId);
  if (cards.length === 0) return 0;
  let sum = 0;
  for (const card of cards) sum += cardMastery(snapshot.review[card.id]);
  return sum / cards.length;
}
