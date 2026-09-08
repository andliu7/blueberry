/**
 * The deck picker's logic, with no React in it. Read this header before
 * trusting anything in this file.
 *
 * The picker in docs/reference/competitors/orgosolver-02-flashcard-decks.png
 * does four things and they are all decisions rather than pixels: it lists
 * decks with a per topic card count, it lets a student select some of them, it
 * offers a shuffle, and its start button NAMES how many cards the session will
 * hold. That last one is the whole reason this file exists separately from the
 * component: "Start 13 cards" is a promise, and a promise that is computed in
 * the middle of JSX cannot be tested. Here it is one function over a snapshot.
 *
 * Everything is pure and takes `now` as an argument rather than reading the
 * clock, the same discipline cards/types.ts uses for isDue, so a test can ask
 * about next Tuesday and two calls in the same render never disagree.
 *
 * WHAT IS NOT HERE. No scheduling: which cards are due is a timestamp
 * comparison the contract already owns, and what a due date should have been
 * belongs to scheduler.ts. No storage: a DeckSnapshot arrives as an argument.
 */

import type { Card, CardId, DeckId, DeckSnapshot } from "../types";
import { cardsIn, dueInDeck, isDue } from "../types";

/**
 * One row of the picker. A flattened view of a deck, because a row renders
 * three numbers and a title and should not have to walk the card table to
 * find them while React is rendering.
 */
export interface DeckRow {
  readonly deckId: DeckId;
  readonly title: string;
  readonly kind: "lesson" | "personal" | "dat";
  readonly cardCount: number;
  readonly dueCount: number;
}

/** Student facing name for each deck kind. Shown as the row's small label. */
export const DECK_KIND_LABELS: Readonly<Record<DeckRow["kind"], string>> = Object.freeze({
  lesson: "From a lesson",
  personal: "Your saves",
  dat: "DAT",
});

/**
 * Rows for every deck in the snapshot, lesson decks first.
 *
 * The order is authored rather than alphabetical because a student opening
 * this screen is usually there for the deck the app just built for them, and
 * an alphabetical list buries it under whatever they imported.
 */
export function deckRows(snapshot: DeckSnapshot, now: Date): readonly DeckRow[] {
  const order: Readonly<Record<DeckRow["kind"], number>> = { lesson: 0, personal: 1, dat: 2 };
  const rows: DeckRow[] = [];
  for (const deck of Object.values(snapshot.decks)) {
    rows.push({
      deckId: deck.id,
      title: deck.title,
      kind: deck.kind,
      cardCount: cardsIn(snapshot, deck.id).length,
      dueCount: dueInDeck(snapshot, deck.id, now),
    });
  }
  rows.sort((a, b) => {
    const byKind = order[a.kind] - order[b.kind];
    return byKind !== 0 ? byKind : a.title.localeCompare(b.title);
  });
  return rows;
}

/* ------------------------------------------------------------------ */
/* Selection                                                            */
/* ------------------------------------------------------------------ */

/**
 * Selection is a plain array of ids rather than a Set, because it is React
 * state and React state has to be replaced rather than mutated for a re-render
 * to happen. An array of at most a few dozen ids is not a performance
 * question, and `includes` reads the way the screen reads.
 */
export function toggleDeck(selected: readonly DeckId[], deckId: DeckId): readonly DeckId[] {
  return selected.includes(deckId)
    ? selected.filter((id) => id !== deckId)
    : [...selected, deckId];
}

export function selectAll(rows: readonly DeckRow[]): readonly DeckId[] {
  return rows.map((row) => row.deckId);
}

export function selectNone(): readonly DeckId[] {
  return [];
}

/* ------------------------------------------------------------------ */
/* Building the session                                                 */
/* ------------------------------------------------------------------ */

/** All the cards in the chosen decks, or only the ones that are due. */
export type SessionScope = "all" | "due";

export interface SessionOptions {
  readonly scope: SessionScope;
  readonly shuffle: boolean;
  /**
   * The shuffle's seed. Supplied rather than read from Math.random so a
   * session is reproducible: a test can assert an order, and a student who
   * reloads mid session gets the deck back in the order they left it.
   */
  readonly seed: number;
  readonly now: Date;
}

/**
 * A tiny seeded generator (mulberry32), named because it is not obvious what
 * a wall of hex constants is doing in a flashcard file. It is thirty year old
 * arithmetic that turns one integer into a repeatable stream of numbers in
 * [0,1). We use it instead of Math.random for exactly one reason: a shuffle
 * nobody can reproduce is a shuffle nobody can test.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates, on a copy. Every permutation equally likely, O(n). */
function shuffled<T>(items: readonly T[], random: () => number): readonly T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/**
 * The cards a start press will actually play.
 *
 * Deduplicated by card id, because a card saved from a mistake can also sit in
 * an imported deck and showing it twice in one session is a bug the student
 * reads as the app losing count. First deck in the selection wins the position.
 *
 * A card with no review state is INCLUDED under scope "due": a card that has
 * never been seen is not overdue, it is new, and a review queue that hides new
 * cards is a queue that never grows. Scope "due" means "due or never seen",
 * and the label functions below say so in words rather than leaving it implied.
 */
export function buildSession(
  snapshot: DeckSnapshot,
  selected: readonly DeckId[],
  options: SessionOptions,
): readonly Card[] {
  const seen = new Set<CardId>();
  const picked: Card[] = [];
  for (const deckId of selected) {
    for (const card of cardsIn(snapshot, deckId)) {
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      if (options.scope === "due") {
        const state = snapshot.review[card.id];
        if (state !== undefined && !isDue(state, options.now)) continue;
      }
      picked.push(card);
    }
  }
  return options.shuffle ? shuffled(picked, mulberry32(options.seed)) : picked;
}

/* ------------------------------------------------------------------ */
/* What the buttons say                                                 */
/* ------------------------------------------------------------------ */

/**
 * The start button's label, which is the promise the reference makes and we
 * keep. Zero is its own sentence rather than "Start 0 cards", because a button
 * that offers nothing should say so instead of counting down to nothing.
 */
export function startLabel(count: number): string {
  if (count <= 0) return "Nothing to review yet";
  if (count === 1) return "Start 1 card";
  return `Start ${count} cards`;
}

/** The row's second line: "12 cards, 4 ready". Ready, not due: nothing is late. */
export function deckRowSubtitle(row: DeckRow): string {
  const cards = row.cardCount === 1 ? "1 card" : `${row.cardCount} cards`;
  if (row.dueCount === 0) return cards;
  return `${cards}, ${row.dueCount} ready`;
}

/** The scope switch's two labels, written so neither reads as a punishment. */
export const SCOPE_LABELS: Readonly<Record<SessionScope, string>> = Object.freeze({
  due: "Ready today",
  all: "Everything",
});
