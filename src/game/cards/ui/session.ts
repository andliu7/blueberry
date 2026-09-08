/**
 * The review session, as a pure reducer. Read this header before trusting
 * anything in this file.
 *
 * A session is: show a card front, the student tries to answer it in their
 * head, they tap to reveal the back, and they press one of Again, Hard, Good,
 * Easy. That loop is four pieces of state and it is written here as a reducer
 * rather than as a handful of useStates inside the component, for the reason
 * packages/interaction gives for its own store: a reducer can be replayed in a
 * test, and a pile of useStates can only be replayed by a browser.
 *
 * THE ONE POLICY THIS FILE OWNS, and the boundary is worth being exact about.
 * Pressing Again puts the card back into THIS session's queue. That is a
 * session decision: it is about the next ninety seconds, not about the next
 * ninety days. What Again does to the card's interval and ease belongs to
 * scheduler.ts and nothing here computes it. The two are separate because they
 * answer different questions, and a file that answered both would end up being
 * edited for one reason and breaking the other.
 *
 * A card comes back AT MOST ONCE per session. Unbounded requeueing is what
 * Anki does and it is right for a desktop session with no promised length, but
 * this screen shows "3 of 20" and a queue that grows while the student works
 * makes that number a lie. The second showing is the last one; the scheduler
 * will bring a card the student is struggling with back tomorrow, which is the
 * part of the borrow that actually does the teaching.
 *
 * Pure: no clock, no storage, no React. `rateCurrent` reports what happened
 * and the caller passes it on to DeckSource.rate, which is the seam that talks
 * to the scheduler.
 */

import type { Card, CardId, Rating } from "../types";

export interface RatingRecord {
  readonly cardId: CardId;
  readonly rating: Rating;
}

export interface ReviewSessionState {
  /** Every card in the session, by id, so the view can look one up. */
  readonly cards: Readonly<Record<CardId, Card>>;
  /** Remaining cards. The current one is at index 0. */
  readonly queue: readonly CardId[];
  /** True once the student has asked to see the back. */
  readonly revealed: boolean;
  /** Distinct cards that have received their final rating. */
  readonly finished: readonly CardId[];
  /** Cards that have already come back once, so they never come back twice. */
  readonly requeued: readonly CardId[];
  /** Every press, in order. Append only, the same shape as attempt history. */
  readonly ratings: readonly RatingRecord[];
  /** How many distinct cards this session promised at the start. */
  readonly total: number;
}

/**
 * Build a session from the cards the picker chose.
 *
 * Duplicates are dropped here as well as in buildSession, because this is a
 * public entry point and a session that shows one card twice cannot report an
 * honest count. Doing it in both places costs one Set and removes a class of
 * bug that only appears when someone calls this directly.
 */
export function startSession(cards: readonly Card[]): ReviewSessionState {
  const byId: Record<CardId, Card> = {};
  const queue: CardId[] = [];
  for (const card of cards) {
    if (byId[card.id] !== undefined) continue;
    byId[card.id] = card;
    queue.push(card.id);
  }
  return {
    cards: byId,
    queue,
    revealed: false,
    finished: [],
    requeued: [],
    ratings: [],
    total: queue.length,
  };
}

export function currentCardId(state: ReviewSessionState): CardId | null {
  return state.queue[0] ?? null;
}

export function currentCard(state: ReviewSessionState): Card | null {
  const id = currentCardId(state);
  return id === null ? null : (state.cards[id] ?? null);
}

export function isFinished(state: ReviewSessionState): boolean {
  return state.queue.length === 0;
}

/** Tap to reveal. Idempotent, because a double tap should not skip a card. */
export function reveal(state: ReviewSessionState): ReviewSessionState {
  return state.revealed ? state : { ...state, revealed: true };
}

/**
 * What a rating did, handed back so the view can say it out loud.
 *
 * `cameBack` is the only thing the view could not work out for itself, and it
 * is worth showing: "back at the end" reads as the app being on the student's
 * side, where the card silently reappearing eleven cards later reads as a bug.
 */
export interface RatingOutcome {
  readonly state: ReviewSessionState;
  readonly cardId: CardId;
  readonly rating: Rating;
  readonly cameBack: boolean;
}

/**
 * Rate the card on screen.
 *
 * Rating without revealing is allowed and deliberate: a student who knows a
 * card cold should be able to press Easy without looking at the back, and
 * blocking that would train them to tap through a reveal they did not need.
 */
export function rateCurrent(state: ReviewSessionState, rating: Rating): RatingOutcome | null {
  const cardId = currentCardId(state);
  if (cardId === null) return null;

  const rest = state.queue.slice(1);
  const comesBack = rating === "again" && !state.requeued.includes(cardId);

  const next: ReviewSessionState = {
    ...state,
    queue: comesBack ? [...rest, cardId] : rest,
    revealed: false,
    finished: comesBack ? state.finished : [...state.finished, cardId],
    requeued: comesBack ? [...state.requeued, cardId] : state.requeued,
    ratings: [...state.ratings, { cardId, rating }],
  };

  return { state: next, cardId, rating, cameBack: comesBack };
}

/* ------------------------------------------------------------------ */
/* What the session reports                                             */
/* ------------------------------------------------------------------ */

export interface SessionSummary {
  /** Distinct cards finished. The number the celebration shows large. */
  readonly reviewed: number;
  readonly total: number;
  /** Cards the student pressed Again on at least once. */
  readonly cameBack: number;
  /** Cards whose LAST rating was good or easy. */
  readonly solid: number;
  readonly diamonds: number;
}

/**
 * Diamonds for a review, and this is a DISPLAY number.
 *
 * CLAUDE.md's non negotiables put the currency server side: balances and
 * spends live in Postgres behind RLS, and a client that can write its own
 * balance has a free store. Phase 6 computes this from the append only attempt
 * history. Until then the surface still has to put a number on the button,
 * because the reference's start button carries its reward and a button that
 * promises nothing is a button nobody presses. So the rule is stated here,
 * once, in a function the server can later disagree with harmlessly.
 *
 * One per card, capped, because a hundred card cram should not out-earn a
 * week of lessons. Nothing is deducted for a card that came back: the borrow
 * from CLAUDE.md is to reward returning and never to punish leaving, and
 * charging a student for pressing Again teaches them to lie to the scheduler,
 * which breaks the one system the whole flashcard surface exists to feed.
 */
export const REVIEW_DIAMONDS_PER_CARD = 1;
export const REVIEW_DIAMONDS_CAP = 20;

export function reviewDiamonds(reviewed: number): number {
  return Math.min(reviewed * REVIEW_DIAMONDS_PER_CARD, REVIEW_DIAMONDS_CAP);
}

export function sessionSummary(state: ReviewSessionState): SessionSummary {
  const lastRating = new Map<CardId, Rating>();
  for (const record of state.ratings) lastRating.set(record.cardId, record.rating);

  let solid = 0;
  for (const cardId of state.finished) {
    const rating = lastRating.get(cardId);
    if (rating === "good" || rating === "easy") solid += 1;
  }

  return {
    reviewed: state.finished.length,
    total: state.total,
    cameBack: state.requeued.length,
    solid,
    diamonds: reviewDiamonds(state.finished.length),
  };
}

/**
 * The headline over a finished session, in the coach voice.
 *
 * Specific to what the student actually did, per CLAUDE.md: generic praise
 * reads as hollow. A clean run and a run with six repeats are different runs
 * and get different sentences, and neither of them scolds.
 */
export function summaryHeadline(summary: SessionSummary): string {
  if (summary.reviewed === 0) return "Nothing reviewed yet";
  if (summary.cameBack === 0) return "Straight through, no repeats";
  if (summary.cameBack === 1) return "One card needed a second look";
  return `${summary.cameBack} cards needed a second look`;
}

/** The line under it. Names the work, then points at the next thing. */
export function summaryLine(summary: SessionSummary): string {
  const cards = summary.reviewed === 1 ? "1 card" : `${summary.reviewed} cards`;
  if (summary.cameBack === 0) return `${cards} reviewed. Those intervals just got longer.`;
  return `${cards} reviewed. The ones you repeated come back sooner, which is the point.`;
}

/** Progress for the bar at the top: finished over promised, clamped to [0,1]. */
export function sessionProgress(state: ReviewSessionState): number {
  if (state.total === 0) return 1;
  return Math.min(state.finished.length / state.total, 1);
}

/** "3 of 20", the reference's counter. One based, because it names the card. */
export function sessionCounter(state: ReviewSessionState): string {
  const position = Math.min(state.finished.length + 1, state.total);
  return `${position} of ${state.total}`;
}
