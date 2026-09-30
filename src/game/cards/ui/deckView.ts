/**
 * The deck, read at a glance: the mastery strip, each card's line in the
 * list, and the cover a deck row wears. Read this header before trusting it.
 *
 * THE MASTERY STRIP. One cell per card, in deck order, coloured by the card's
 * scheduler state (cardState.ts). Anki answers "how is this deck doing" with a
 * table of numbers on a separate stats screen; a strip of forty cells answers
 * it before the student has read a word, and it is the same vocabulary the
 * card list and the card face use, so there is one set of colours to learn.
 *
 * THE COVER IS A REAL DRAWING, never a sketch. The previous tiles drew
 * hand-made structures picked by a hash of the deck id, so "Starter
 * reactions" wore a random alkene and a card called benzoic acid wore a thiol
 * ring. The cover is now the STARTING MATERIAL of a reaction card in that
 * deck, the RDKit drawing data/reactions.ts already ships, so it can only
 * ever show chemistry the deck actually holds. It is the start and never the
 * product, because the product is an answer. A deck with no drawn card gets
 * no cover rather than an invented one. `deckCovers` keeps the covers on one
 * screen distinct where the decks allow it, because six identical
 * acetophenones read as a template, not as six decks.
 *
 * THE CARD'S LINE IS WHOLE. The fan it replaces cut names to eight letters
 * ("acetophe..."). A list row wraps instead, so every name is readable; the
 * deck view test holds that.
 *
 * Pure: `now` arrives as an argument.
 */

import { DAY_MS, endOfLocalDay } from "../scheduler";
import type { Card, DeckSnapshot, ReviewState } from "../types";
import { isDue, isSuspended } from "../types";
import { cardSchedulerState, type CardSchedulerState } from "./cardState";
import { normaliseFormula } from "./formulaText";
import { intervalLabel } from "./intervalLabel";

/** Strip order for the legend and the count chips: the path a card walks. */
export const STATE_ORDER: readonly CardSchedulerState[] = Object.freeze([
  "new",
  "learning",
  "due",
  "young",
  "mastered",
  "suspended",
]);

export function deckCells(
  snapshot: DeckSnapshot,
  cards: readonly Card[],
  now: Date,
): readonly CardSchedulerState[] {
  return cards.map((card) => cardSchedulerState(snapshot.review[card.id], now));
}

export function stateCounts(cells: readonly CardSchedulerState[]): Readonly<Record<CardSchedulerState, number>> {
  const counts: Record<CardSchedulerState, number> = {
    new: 0,
    learning: 0,
    due: 0,
    young: 0,
    mastered: 0,
    suspended: 0,
  };
  for (const cell of cells) counts[cell] += 1;
  return counts;
}

/**
 * The cards of one deck that today's review would play, by the same rule as
 * landing.ts's `reviewQueue`: due by the end of the LOCAL day and not paused,
 * plus a drafted mistake the store has never held (it has no schedule yet,
 * so it is new, and new is reviewable). The deck row's badge and the deck's
 * "Review due" button both read this, so the number and the run agree.
 */
export function deckDueCards(snapshot: DeckSnapshot, cards: readonly Card[], now: Date): readonly Card[] {
  const cutoff = endOfLocalDay(now);
  return cards.filter((card) => {
    const state = snapshot.review[card.id];
    if (state === undefined) return snapshot.cards[card.id] === undefined && card.source.kind === "mistake";
    return isDue(state, cutoff) && !isSuspended(state);
  });
}

/**
 * What the card asks, in one line a student recognises. A reaction card names
 * its start and its conditions, never its product; a three-sided card its
 * setup; anything else its front.
 */
export function cardTitle(card: Card): string {
  if (card.reaction !== undefined) {
    // Normalised so no SMILES syntax ("#") reaches a row; the row renders it
    // through FormulaLabel for the subscripts.
    const reagents = normaliseFormula(card.reaction.reagents.trim());
    return reagents.length > 0 ? `${card.reaction.reactants} with ${reagents}` : card.reaction.reactants;
  }
  if (card.sides !== undefined) return card.sides.setup;
  return card.front;
}

/** When the card comes back, in words. "Due now" for anything due today. */
export function dueLabel(state: ReviewState | undefined, now: Date): string {
  const kind = cardSchedulerState(state, now);
  if (kind === "suspended") return "Paused";
  if (state === undefined || kind === "new") return "New, not seen yet";
  const days = (Date.parse(state.dueAt) - now.getTime()) / DAY_MS;
  if (days <= 0) return "Due now";
  return `Back in ${intervalLabel(days)}`;
}

export interface DeckCover {
  readonly light?: string;
  readonly dark?: string;
  /** Names the start material, for the image's alt. */
  readonly alt: string;
}

function coverOf(card: Card): DeckCover | null {
  const art = card.reaction?.art;
  if (art === undefined || (art.startLight === undefined && art.startDark === undefined)) return null;
  return {
    ...(art.startLight === undefined ? {} : { light: art.startLight }),
    ...(art.startDark === undefined ? {} : { dark: art.startDark }),
    alt: card.reaction?.reactants ?? "",
  };
}

/**
 * One cover per deck, in the order given. A drawing already used by an
 * earlier row is skipped when the deck holds another; a deck whose only
 * drawings are taken reuses its first, because its own chemistry beats none.
 */
export function deckCovers(decks: readonly (readonly Card[])[]): readonly (DeckCover | null)[] {
  const taken = new Set<string>();
  return decks.map((cards) => {
    const covers = cards.map(coverOf).filter((cover): cover is DeckCover => cover !== null);
    // Keyed on the start material's NAME, not the file: the registry renders
    // one file per reaction, so eight acetophenone reactions are eight paths
    // of one drawing, and a path key would call them distinct.
    const fresh = covers.find((cover) => !taken.has(cover.alt));
    const pick = fresh ?? covers[0] ?? null;
    if (pick !== null) taken.add(pick.alt);
    return pick;
  });
}
