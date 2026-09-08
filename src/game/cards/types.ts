/**
 * Cards and decks, as the SURFACES see them. Read this header before trusting
 * anything in this file.
 *
 * THE BORROW, from CLAUDE.md: take Anki's scheduler, leave Anki's interface.
 * Retention is what a DAT or MCAT student is actually buying, and the AAMC
 * questionnaire data in docs/LEARNING-SCIENCE.md is the evidence: flashcard use
 * up from 67.4 to 71.4 percent between 2020 and 2024, free online flashcard
 * programs from 37.3 to 50.2 percent. So the intervals are the borrow. The
 * grid of blue boxes is not.
 *
 * Cards come from three places and the difference matters enough to be in the
 * type: a card generated from a lesson question, a card offered after a
 * mistake, and a card imported from a deck the student already owns. The owner
 * has an existing DAT Anki deck, so `import` is a first class origin rather
 * than a migration script, and an imported card keeps its external id so a
 * second import updates rather than duplicates.
 *
 * WHAT IS NOT HERE, on purpose. No scheduler: intervals, ease adjustment and
 * the initial state of a new card are policy, they live in scheduler.ts, and
 * another builder owns them. This file carries the SHAPES that policy reads and
 * writes, plus reads that are not policy (`isDue` compares two timestamps; it
 * does not decide what the timestamp should have been).
 *
 * A NAMING NOTE, because two things want the same word. `CardSource` is where a
 * card CAME FROM. `DeckSource` is the seam interface the surfaces read through.
 * They are different ideas and the collision is worth one sentence here rather
 * than a debugging session later.
 *
 * THE SEAM, and it is the same seam as app/progress.ts. The local
 * implementation that sits behind `DeckSource` keeps a per device copy in
 * localStorage, and that copy is a RENDERING CACHE and an OFFLINE DRAFT, never
 * an entitlement. Nothing paid is gated on it. Phase 6 swaps in a Supabase
 * backed source that reconciles this draft against the append only attempt
 * history, and a student who edits localStorage has edited a cache. This
 * module is the CONTRACT only: types and pure functions, no storage, no React,
 * no side effects. The store itself is an external store (subscribe plus
 * getSnapshot), the same shape as app/progress.ts, so a surface reads it with
 * useSyncExternalStore and nothing here imports React.
 */

import type { BeatCauseId, BeatId, LessonId } from "../beats/types";

/**
 * Plain string aliases, for the reason packages/curriculum/src/ids.ts gives.
 *
 * THE INVARIANT: a CardId is stable forever once the card has been reviewed.
 * A ReviewState points at it, and a card whose id changes has an interval
 * history that now belongs to nothing. Fixing a typo on the front keeps the id.
 * Asking a different question is a new card.
 */
export type CardId = string;
export type DeckId = string;

/* ------------------------------------------------------------------ */
/* Where a card came from                                               */
/* ------------------------------------------------------------------ */

/**
 * The origin union. Tagged by `kind`, so each origin carries exactly the fields
 * it can honestly supply: a lesson card knows its beat, a mistake card knows
 * the cause that produced it, an imported card knows the file it came in on and
 * nothing about our lessons at all.
 */
export type CardSource =
  | {
      readonly kind: "lesson";
      readonly lessonId: LessonId;
      readonly beatId: BeatId;
    }
  | {
      readonly kind: "mistake";
      readonly beatId: BeatId;
      /** The named cause the attempt resolved to. This is what the card drills. */
      readonly cause: BeatCauseId;
      /** ISO 8601, when the mistake happened. */
      readonly at: string;
    }
  | {
      /** Written by the student in the composer. Their own words, never graded. */
      readonly kind: "composed";
      /** ISO 8601, when they saved it. */
      readonly at: string;
    }
  | {
      readonly kind: "import";
      /** The deck name as the file gave it, kept so the student recognises it. */
      readonly deckName: string;
      /**
       * The id the source system used, when it had one. An Anki note id lands
       * here, and it is what makes a second import an update rather than a
       * duplicate. Absent for a source that carries no stable id.
       */
      readonly externalId?: string;
      /** ISO 8601. */
      readonly importedAt: string;
    };

export type CardSourceKind = CardSource["kind"];

export const CARD_SOURCE_KINDS: readonly CardSourceKind[] = Object.freeze([
  "lesson",
  "mistake",
  "composed",
  "import",
]);

/* ------------------------------------------------------------------ */
/* Cards and decks                                                      */
/* ------------------------------------------------------------------ */

/**
 * `why` is the third field and it is the one that makes this ours rather than a
 * flashcard clone. Front asks, back answers, why TEACHES: the reason the answer
 * is the answer, in the coach voice, so a card reviewed cold six weeks later
 * still explains itself. A card generated from a beat inherits the beat's
 * authored explanation; a card from a mistake inherits its cause's copy.
 */
export interface Card {
  readonly id: CardId;
  readonly front: string;
  readonly back: string;
  readonly why: string;
  /** Free tags for filtering and for the import path, which brings its own. */
  readonly tags: readonly string[];
  readonly source: CardSource;
  /**
   * The three sides of a reaction card, when the card was composed as one.
   * Optional so every existing card, import and generated deck stays valid;
   * front, back and why are always populated too, so a surface that does not
   * know about sides still renders the card whole. The composer is the only
   * writer. See ui/composer.ts for the mapping.
   */
  readonly sides?: ReactionSides;
}

/**
 * A reaction card's three sides, per the design goals: Setup (what you start
 * with, and the question), Conditions (reagents, solvent, heat or light), and
 * Product (what forms). Plain strings, because these are a student's own
 * words: nothing here is graded, so nothing here goes near chem-core.
 */
export interface ReactionSides {
  readonly setup: string;
  readonly conditions: string;
  readonly product: string;
}

export type ReactionSide = keyof ReactionSides;

/**
 * `kind` separates the three decks a student can hold at once: the deck a
 * lesson generated, the deck they built themselves out of mistakes and saves,
 * and the DAT deck they brought with them. They behave the same and they are
 * named differently, because a student wants to know which is which.
 */
export interface Deck {
  readonly id: DeckId;
  readonly title: string;
  readonly kind: "lesson" | "personal" | "dat";
  readonly cardIds: readonly CardId[];
}

/* ------------------------------------------------------------------ */
/* Review                                                               */
/* ------------------------------------------------------------------ */

/** The four buttons, in the order they are shown. */
export type Rating = "again" | "hard" | "good" | "easy";

export const RATINGS: readonly Rating[] = Object.freeze(["again", "hard", "good", "easy"]);

/** Student facing, in the coach voice. "Again" is a normal step, not a failure. */
export const RATING_LABELS: Readonly<Record<Rating, string>> = Object.freeze({
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
});

/** For parsing what came out of storage or an import file. */
export function isRating(value: unknown): value is Rating {
  return typeof value === "string" && (RATINGS as readonly string[]).includes(value);
}

/**
 * One card's place in the schedule.
 *
 * `interval` is in DAYS and `ease` is the multiplier the scheduler applies to
 * it, which is the Anki shape and is stated here so nobody has to guess the
 * unit from the arithmetic. What the numbers become after a rating is
 * scheduler.ts's decision, including what a brand new card starts at. Nothing
 * in this file sets them.
 */
export interface ReviewState {
  readonly cardId: CardId;
  /** Days until the next showing, as of the last rating. */
  readonly interval: number;
  /** The multiplier expanding that interval. */
  readonly ease: number;
  /** ISO 8601. */
  readonly dueAt: string;
  /** Null for a card that has never been rated. */
  readonly lastRating: Rating | null;
  /**
   * Paused by the student, the states sheet's fifth state. A suspended card
   * keeps its whole schedule, it just stops being dealt: `dueInDeck` and
   * `dueEverywhere` skip it, so it never counts toward the hero's number and
   * never enters a session it was not opened into by hand. Optional so every
   * persisted state from before the flag existed stays valid; absent means
   * false. Rating the card resumes it, because a rating is the schedule
   * restarting; scheduler.ts's `rateCard` builds a fresh state without the
   * flag, so that rule holds by construction rather than by a branch.
   */
  readonly suspended?: boolean;
}

/** The flag read, in one place, so "absent means false" is code, not lore. */
export function isSuspended(state: ReviewState | undefined): boolean {
  return state?.suspended === true;
}

/**
 * A read, not a policy. It compares two timestamps and nothing else, so the
 * scheduler stays the only thing that decides what `dueAt` should be.
 * `now` is passed in rather than read from the clock, so this is pure and a
 * test can ask about next Tuesday.
 */
export function isDue(state: ReviewState, now: Date): boolean {
  return Date.parse(state.dueAt) <= now.getTime();
}

/**
 * Soonest due first. The most overdue card leads, which is the order a review
 * queue wants. Copies rather than sorting in place, because a snapshot is
 * shared and sorting it under a reader is how a list jumps mid render.
 */
export function byDueDate(states: readonly ReviewState[]): readonly ReviewState[] {
  return [...states].sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

export function dueCount(states: readonly ReviewState[], now: Date): number {
  return states.filter((state) => isDue(state, now)).length;
}

/* ------------------------------------------------------------------ */
/* The recommendation                                                   */
/* ------------------------------------------------------------------ */

/**
 * A card the app is offering, not one the student owns yet.
 *
 * The moment this describes: a mistake happens, a toast says a card would help
 * and offers to save it, and saving shrinks the card and flies it to the deck
 * icon, which bounces with a plus one. `reason` is the toast's own line, and it
 * is authored per cause rather than generic, because "this one catches people
 * out on the ring position" reads as seen and "you got this wrong" does not.
 *
 * `seenAt` exists so the same recommendation is not offered twice in a session
 * and so an ignored offer can be counted rather than repeated.
 */
export interface Reco {
  readonly cardId: CardId;
  readonly reason: string;
  /** ISO 8601, when it was shown. */
  readonly seenAt: string;
}

/* ------------------------------------------------------------------ */
/* The seam                                                             */
/* ------------------------------------------------------------------ */

export interface DeckSnapshot {
  readonly cards: Readonly<Record<CardId, Card>>;
  readonly decks: Readonly<Record<DeckId, Deck>>;
  readonly review: Readonly<Record<CardId, ReviewState>>;
  /** Offered and not yet accepted or dismissed. */
  readonly pendingRecos: readonly Reco[];
}

export const EMPTY_DECKS: DeckSnapshot = Object.freeze({
  cards: {},
  decks: {},
  review: {},
  pendingRecos: [],
});

/**
 * What the surfaces read through.
 *
 * The local implementation behind it is a rendering cache and an offline draft,
 * never an entitlement, and Phase 6 replaces it with a Supabase backed source.
 * `subscribe` plus `getSnapshot` is the external store shape, so a surface
 * reads it with useSyncExternalStore and nothing in this file imports React.
 *
 * `rate` takes the button the student pressed and nothing else. The
 * implementation asks scheduler.ts what that does to the interval, which is why
 * no interval arithmetic appears in this interface.
 */
export interface DeckSource {
  getSnapshot(): DeckSnapshot;
  subscribe(listener: () => void): () => void;
  /** Save a card into a deck. This is what the toast's save button calls. */
  saveCard(card: Card, deckId: DeckId): void;
  /** Offer a card. Shows the toast; does not add anything to a deck. */
  offer(reco: Reco): void;
  /** The student said no thanks. Counted, not repeated. */
  dismissReco(cardId: CardId): void;
  rate(cardId: CardId, rating: Rating): void;
  /**
   * Pause or resume one card's reviews. Suspension is schedule state, so it
   * travels with ReviewState and through this seam, and the Phase 6 source
   * will sync it like any other rating side effect.
   */
  setSuspended(cardId: CardId, suspended: boolean): void;
  createDeck(deck: Deck): void;
  /** The import path. Cards carrying a known externalId update rather than duplicate. */
  importCards(deckId: DeckId, cards: readonly Card[]): void;
  removeCard(cardId: CardId): void;
  reset(): void;
}

/* ------------------------------------------------------------------ */
/* Pure reads over a snapshot                                           */
/* ------------------------------------------------------------------ */

/** A deck's cards, in the deck's own order, skipping ids nothing resolves. */
export function cardsIn(snapshot: DeckSnapshot, deckId: DeckId): readonly Card[] {
  const deck = snapshot.decks[deckId];
  if (deck === undefined) return [];
  const cards: Card[] = [];
  for (const id of deck.cardIds) {
    const card = snapshot.cards[id];
    if (card !== undefined) cards.push(card);
  }
  return cards;
}

/**
 * How many cards in this deck are due. What the deck icon's badge shows.
 * Suspended cards are not counted: a number that includes cards the student
 * paused is a promise the REVIEW button then breaks.
 */
export function dueInDeck(snapshot: DeckSnapshot, deckId: DeckId, now: Date): number {
  let count = 0;
  for (const card of cardsIn(snapshot, deckId)) {
    const state = snapshot.review[card.id];
    if (state !== undefined && isDue(state, now) && !isSuspended(state)) count += 1;
  }
  return count;
}

/** Every due card across every deck, soonest due first. Suspended cards skip. */
export function dueEverywhere(snapshot: DeckSnapshot, now: Date): readonly Card[] {
  const states = Object.values(snapshot.review).filter(
    (state) => isDue(state, now) && !isSuspended(state),
  );
  states.sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  const cards: Card[] = [];
  for (const state of states) {
    const card = snapshot.cards[state.cardId];
    if (card !== undefined) cards.push(card);
  }
  return cards;
}

/** The import dedupe key. Null for a card that carries no external identity. */
export function externalKey(card: Card): string | null {
  if (card.source.kind !== "import") return null;
  const { externalId } = card.source;
  return externalId === undefined ? null : `${card.source.deckName}:${externalId}`;
}

export function isFromMistake(card: Card): boolean {
  return card.source.kind === "mistake";
}
