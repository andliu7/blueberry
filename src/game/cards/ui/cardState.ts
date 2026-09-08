/**
 * Where a card is in the scheduler, as one word a surface can draw. Read this
 * header before trusting anything in this file.
 *
 * THE COMMITTED IMAGE IS blueberry_spec-card-states in docs/reference/
 * design-goals: "a card's edge and badge say where it is in the scheduler",
 * and it names five states: new, learning, due, mastered, suspended. This
 * file derives that word from ReviewState; the components (DeckTray's fanned
 * cards, CardFace in a review) own the edge and badge pixels, and cards.css
 * owns their colours, so the vocabulary is decided exactly once.
 *
 * THE DERIVATIONS, one line each, and every one reads scheduler state rather
 * than restating scheduler policy:
 *
 *   suspended  the student paused it (types.ts's flag). Wins over everything,
 *              because a paused card's schedule is not being consulted.
 *   new        never rated (no state, or lastRating null). Wins over due:
 *              a brand new card IS due immediately, and telling the student
 *              "due" about a card they have never met would erase the sheet's
 *              own distinction.
 *   learning   in the learning steps, scheduler.ts's isLearning.
 *   due        graduated and dueAt has passed.
 *   mastered   graduated, not yet due again, and the interval has reached
 *              mastery.ts's MATURE_INTERVAL_DAYS, Anki's own mature line.
 *   young      graduated, not due, not yet mature. The sheet does not draw
 *              this one, so its treatment is NEUTRAL: no edge, no badge. It
 *              exists as a word so the five named states never have to lie
 *              about a card that is simply between reviews.
 *
 * Precedence is the order above. A mastered card whose dueAt has passed says
 * "due", because the badge answers "what should I do with this card now",
 * and the honest answer to that is review it.
 *
 * THE CLOCK IS A PARAMETER, per the gauntlet log's wall-clock rule: "due" is
 * a function of the hour, so `now` arrives as an argument, is read once per
 * render by the surfaces, and a test can ask about any evening it likes.
 *
 * Pure: no storage, no React, no clock reads.
 */

import { isLearning } from "../scheduler";
import type { ReviewState } from "../types";
import { isDue, isSuspended } from "../types";
import { MATURE_INTERVAL_DAYS } from "./mastery";

export type CardSchedulerState =
  | "new"
  | "learning"
  | "due"
  | "young"
  | "mastered"
  | "suspended";

/** The badge's word, in the coach voice. "Paused" over "suspended": the
    student did it and can undo it, and "suspended" reads like a sanction. */
export const CARD_STATE_LABELS: Readonly<Record<CardSchedulerState, string>> =
  Object.freeze({
    new: "New",
    learning: "Learning",
    due: "Due",
    young: "Scheduled",
    mastered: "Mastered",
    suspended: "Paused",
  });

/** One card's place in the scheduler. See the header for the precedence. */
export function cardSchedulerState(
  state: ReviewState | undefined,
  now: Date,
): CardSchedulerState {
  if (isSuspended(state)) return "suspended";
  if (state === undefined || state.lastRating === null) return "new";
  if (isLearning(state)) return "learning";
  if (isDue(state, now)) return "due";
  if (state.interval >= MATURE_INTERVAL_DAYS) return "mastered";
  return "young";
}
