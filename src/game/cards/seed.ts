/**
 * The starter deck. Read this header before trusting anything in this file.
 *
 * THE PROBLEM IT FIXES, from the design audit: a brand new student opening
 * the Cards tab met "Due today 0 / ALL CLEAR / 0 cards", which is the tab
 * telling them to leave before they have seen what a card is. The fix is a
 * small deck of reaction cards seeded once, on the first visit, so the tab
 * opens with something to review and the review loop teaches itself.
 *
 * DERIVED, NEVER INVENTED. Every card comes out of data/reactions.ts through
 * reactionCardFromStaged: RDKit-checked, syllabus-sourced, carried verbatim.
 * The six ids below are a curation, not chemistry: tier 1 and 2 reactions a
 * CHEM241 student meets early. A field the data does not carry stays absent
 * on the card.
 *
 * SIX DISTINCT SUBSTRATES, which round 4 is where they became distinct. The
 * first curation took four of its six from acetophenone, so the deck tray
 * dealt a hand labelled "acetophe…" four times and a student flicking through
 * it could not tell one card from another. The six now start from
 * acetophenone, benzaldehyde, benzoic acid, benzoyl chloride, methyl benzoate
 * and buta-1,3-diene, one each, and they still exercise the face: two state a
 * temperature (gilman at -78, the diene addition at 40) and the diene
 * addition's authored notes speak to 1,2 against 1,4, which is the one reveal
 * field the composer and the registry share.
 *
 * EXACTLY ONCE. A flag in localStorage marks the seeding done, and the seed
 * also refuses when the store already holds cards, so a returning student
 * (or one whose legacy draw saves just migrated) never finds six cards they
 * did not ask for, and a student who deletes the starter deck does not watch
 * it respawn. Storage that throws means no seed: a session that cannot
 * remember it seeded must not seed at every visit.
 */

import { REACTIONS } from "../../data/reactions";
import { reactionCardFromStaged } from "./reactionCard";
import type { Card, DeckId, DeckSource } from "./types";

export const STARTER_DECK_ID: DeckId = "deck-starter";
export const STARTER_DECK_TITLE = "Starter reactions";

/** The done flag. Versioned like the store's own key. */
export const SEED_FLAG_KEY = "blueberry.cards.seeded.v1";

/** The curated ids. See the header for why these six. */
export const STARTER_REACTION_IDS: readonly string[] = Object.freeze([
  "imine-formation",
  "acetylide-addition",
  "socl2-acid-to-chloride",
  "gilman-to-ketone",
  "lialh4-reduction",
  "diene-1-4-addition",
]);

/** The starter cards, built fresh from the registry. Missing ids are skipped. */
export function starterCards(now: Date): readonly Card[] {
  const cards: Card[] = [];
  for (const id of STARTER_REACTION_IDS) {
    const reaction = REACTIONS.find((entry) => entry.id === id);
    if (reaction !== undefined) cards.push(reactionCardFromStaged(reaction, now));
  }
  return cards;
}

/**
 * Seed the starter deck, once. Returns true when it actually seeded.
 *
 * The flag is written on every first pass, including the pass that declines
 * because the store already has cards: that student is past first-run, and
 * marking it stops the check re-running forever.
 */
export function seedStarterDeck(source: DeckSource, now: Date = new Date()): boolean {
  try {
    if (localStorage.getItem(SEED_FLAG_KEY) !== null) return false;
    localStorage.setItem(SEED_FLAG_KEY, now.toISOString());
  } catch {
    // Blocked storage. Without the flag, seeding would repeat every session.
    return false;
  }

  if (Object.keys(source.getSnapshot().cards).length > 0) return false;

  const cards = starterCards(now);
  if (cards.length === 0) return false;

  source.createDeck({ id: STARTER_DECK_ID, title: STARTER_DECK_TITLE, kind: "personal", cardIds: [] });
  for (const card of cards) source.saveCard(card, STARTER_DECK_ID);
  return true;
}
