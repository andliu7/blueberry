/**
 * The Cards landing, as pure functions over a snapshot. Read this header
 * before trusting anything in this file.
 *
 * THE DECISION THE SCREEN OPENS ON, per the design goals: review, not
 * browsing. So the first thing this file computes is the hero: one number,
 * and the queue that number promises. THEY ARE THE SAME COMPUTATION. The
 * number is the length of the queue the REVIEW button starts, derived once in
 * `reviewQueue`, because a hero that says 23 over a session that runs 19 is
 * the exact dishonesty the S3 judge scored against the bar. The cutoff is the
 * END of the local day, scheduler.ts's own `endOfLocalDay`, so the number
 * does not grow under the student's thumb at 8:59pm; the wall-clock lesson in
 * the gauntlet log is honoured by taking `now` as an argument everywhere.
 *
 * MY MISTAKES IS A FIRST CLASS DECK, fed by the trainer's journal (the Tier 2
 * distractor log plus the Tier 1 causes). A journal entry is not a card;
 * cards/Recommendation.tsx already owns the bridge (`draftCardFromMistake`,
 * which refuses rather than invents when no authored copy exists), and this
 * file only assembles: journal entries drafted into cards, deduplicated
 * against the copies already saved in the store, which keep their earned
 * schedule. The tile is always in the grid, even at zero, because a first
 * class deck that vanishes when empty reads as a feature that comes and goes.
 *
 * AUTO AGAINST AUTHORED, at a glance: decks generated from lessons carry the
 * `auto` marker (the lightning bolt) and live in their own row; decks a
 * student made or imported are the grid. The marker is data here and a glyph
 * in the component, so a test can assert the split without rendering.
 *
 * Pure: no storage, no clock reads, no React. The journal arrives as an
 * argument so this file never touches localStorage itself.
 */

import type { SavedMistake } from "../../tabs/trainer/mistakes";
import { draftCardFromMistake } from "../Recommendation";
import { endOfLocalDay } from "../scheduler";
import type { Card, DeckId, DeckSnapshot } from "../types";
import { dueEverywhere, isFromMistake } from "../types";
import { deckMastery, cardMastery } from "./mastery";

/** The mistakes deck's stable id. A namespace of its own, held by no store. */
export const MISTAKES_DECK_ID: DeckId = "mistakes";
export const MISTAKES_DECK_TITLE = "My mistakes";

/* ------------------------------------------------------------------ */
/* The mistakes deck                                                    */
/* ------------------------------------------------------------------ */

/**
 * The cards of the mistakes deck: every journal entry that resolves to
 * authored copy, plus every mistake card already saved through the toast.
 * The saved copy WINS on a collision, because it is the one whose review
 * state the schedule has been writing to.
 */
export function mistakeDeckCards(
  snapshot: DeckSnapshot,
  mistakes: readonly SavedMistake[],
): readonly Card[] {
  const byId = new Map<string, Card>();
  for (const mistake of mistakes) {
    const draft = draftCardFromMistake(mistake);
    if (draft !== null && !byId.has(draft.id)) byId.set(draft.id, draft);
  }
  for (const card of Object.values(snapshot.cards)) {
    if (isFromMistake(card)) byId.set(card.id, card);
  }
  return [...byId.values()];
}

/* ------------------------------------------------------------------ */
/* The hero                                                             */
/* ------------------------------------------------------------------ */

/**
 * Everything the REVIEW button will run, in order: the scheduled queue due by
 * the end of the local day (soonest first, the scheduler's order), then the
 * drafted mistake cards the store has never seen, which are new and therefore
 * belong in today's pile.
 */
export function reviewQueue(
  snapshot: DeckSnapshot,
  mistakes: readonly SavedMistake[],
  now: Date,
): readonly Card[] {
  const scheduled = dueEverywhere(snapshot, endOfLocalDay(now));
  const unseen = mistakeDeckCards(snapshot, mistakes).filter(
    (card) => snapshot.cards[card.id] === undefined,
  );
  return [...scheduled, ...unseen];
}

export interface HeroModel {
  /** The one big number. Exactly `reviewQueue(...).length`, never computed twice. */
  readonly due: number;
  readonly title: string;
  readonly subline: string;
  readonly buttonLabel: string;
  readonly buttonDisabled: boolean;
}

export function heroModel(
  snapshot: DeckSnapshot,
  mistakes: readonly SavedMistake[],
  now: Date,
): HeroModel {
  const due = reviewQueue(snapshot, mistakes, now).length;
  if (due === 0) {
    return {
      due,
      title: "Due today",
      subline: "Everything is holding. Come back when a card starts to fade.",
      buttonLabel: "All clear",
      buttonDisabled: true,
    };
  }
  return {
    due,
    title: "Due today",
    subline: due === 1 ? "card ready to review" : "cards ready to review",
    buttonLabel: "Review",
    buttonDisabled: false,
  };
}

/* ------------------------------------------------------------------ */
/* The deck tiles                                                       */
/* ------------------------------------------------------------------ */

/** Which glyph a tile's marker draws. Data here, pixels in the component. */
export type TileMarker = "none" | "auto" | "mistakes";

export interface DeckTile {
  readonly deckId: DeckId;
  readonly title: string;
  readonly count: number;
  /** 0..1, the thin green bar. See mastery.ts for the ramp. */
  readonly mastery: number;
  readonly marker: TileMarker;
}

/**
 * The My-decks grid: the decks a student made or brought (personal and dat),
 * title order, with My mistakes always present as the grid's own member.
 */
export function myDeckTiles(
  snapshot: DeckSnapshot,
  mistakes: readonly SavedMistake[],
): readonly DeckTile[] {
  const tiles: DeckTile[] = [];
  for (const deck of Object.values(snapshot.decks)) {
    if (deck.kind === "lesson") continue;
    // The mistakes deck materialises in the store the first time it is
    // reviewed (so ratings have somewhere to land), but the grid's tile for
    // it is always the assembled one below: journal plus saved cards, never
    // the stored husk alone, and never both at once.
    if (deck.id === MISTAKES_DECK_ID) continue;
    tiles.push({
      deckId: deck.id,
      title: deck.title,
      count: deck.cardIds.length,
      mastery: deckMastery(snapshot, deck.id),
      marker: "none",
    });
  }
  tiles.sort((a, b) => a.title.localeCompare(b.title));

  const mistakeCards = mistakeDeckCards(snapshot, mistakes);
  let sum = 0;
  for (const card of mistakeCards) sum += cardMastery(snapshot.review[card.id]);
  tiles.push({
    deckId: MISTAKES_DECK_ID,
    title: MISTAKES_DECK_TITLE,
    count: mistakeCards.length,
    mastery: mistakeCards.length === 0 ? 0 : sum / mistakeCards.length,
    marker: "mistakes",
  });
  return tiles;
}

/** The From-your-lessons row: auto-collected decks, each carrying the bolt. */
export function lessonDeckTiles(snapshot: DeckSnapshot): readonly DeckTile[] {
  const tiles: DeckTile[] = [];
  for (const deck of Object.values(snapshot.decks)) {
    if (deck.kind !== "lesson") continue;
    tiles.push({
      deckId: deck.id,
      title: deck.title,
      count: deck.cardIds.length,
      mastery: deckMastery(snapshot, deck.id),
      marker: "auto",
    });
  }
  tiles.sort((a, b) => a.title.localeCompare(b.title));
  return tiles;
}
