import type { Deck } from "@/data/types";
import { epoxidationDeck } from "./epoxidation";
import { iodinationDeck } from "./iodination";
import { grignardDeck } from "./grignard";
import { pkaDeck } from "./pka";
import { irDeck } from "./ir";
import { nmrDeck } from "./nmr";
import { resonanceDeck } from "./resonance";

/**
 * The registry. Every deck listed here appears on the hub and in the navigation
 * pill automatically, and becomes reachable at `#/deck/<id>`.
 *
 * To add one: copy a deck file, edit it, import it, and put it in this array.
 *
 * Lab decks first, in lab order, since those are what people arrive for. The
 * reference decks follow: they are the things you look up while working through
 * a lab deck rather than sit down to drill.
 */
export const DECKS: Deck[] = [
  epoxidationDeck,
  iodinationDeck,
  grignardDeck,
  pkaDeck,
  irDeck,
  nmrDeck,
  resonanceDeck,
];

export function findDeck(id: string): Deck | undefined {
  return DECKS.find((deck) => deck.id === id);
}
