import type { Deck } from "@/data/types";
import { epoxidationDeck } from "./epoxidation";
import { iodinationDeck } from "./iodination";
import { grignardDeck } from "./grignard";
import { reductionDeck } from "./reduction";
import { pkaDeck } from "./pka";
import { irDeck } from "./ir";
import { nmrDeck } from "./nmr";
import { resonanceDeck } from "./resonance";
import { carbonylDecks } from "./carbonyls";

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
  reductionDeck,
  pkaDeck,
  irDeck,
  nmrDeck,
  resonanceDeck,
  // The Carbonyls folder, generated next door. Nine decks rather than one entry
  // here, so a new reaction family in the trainer appears on the hub without
  // this file being touched.
  ...carbonylDecks,
];

export function findDeck(id: string): Deck | undefined {
  return DECKS.find((deck) => deck.id === id);
}
