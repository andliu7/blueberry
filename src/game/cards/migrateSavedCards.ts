/**
 * The one-way migration out of the dead saved-cards store. Read this header
 * before trusting anything in this file.
 *
 * WHAT IT REPLACES. src/lib/savedCards.ts kept the #/draw page's "Save as
 * card" saves under "blueberry_saved_cards_v1", and nothing anywhere read
 * them back: a bookshelf with no front. The draw page now saves reaction
 * cards straight into the game's deck store (see reactionCard.ts), and this
 * module walks whatever the old key still holds into the same place, once,
 * then removes the key. savedCards.ts itself is deleted with this change.
 *
 * WHAT A LEGACY ENTRY BECOMES. An entry whose reactionId still resolves in
 * data/reactions.ts is rebuilt through the same builder a fresh save uses,
 * so it gets the full reaction face and, crucially, the SAME derived id: a
 * student who re-saves that reaction later updates the migrated card rather
 * than growing a duplicate with a rival schedule. An entry whose reaction is
 * gone from the registry keeps its own front and back verbatim as a plain
 * card, because those strings were derived from authored data at the time
 * and inventing a replacement would be worse than carrying them.
 *
 * WHAT IS DROPPED, SAID PLAINLY. The old entries could carry the student's
 * own drawing (a molfile and a SMILES). The card model has no field for a
 * drawing and no surface ever rendered one, so the drawing does not migrate.
 * The card, and the schedule the save starts, is what was ever visible.
 */

import { drawCardFor } from "./reactionCard";
import type { Card, DeckId, DeckSource } from "./types";

/** The dead store's key, exactly as savedCards.ts spelled it. */
export const LEGACY_SAVED_CARDS_KEY = "blueberry_saved_cards_v1";

/** The old shape, loosely: everything optional because it is parsed storage. */
interface LegacyEntry {
  readonly reactionId?: unknown;
  readonly front?: unknown;
  readonly back?: unknown;
  readonly at?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** One legacy entry becomes one card, or nothing when it holds nothing usable. */
export function cardFromLegacyEntry(entry: unknown, now: Date): Card | null {
  if (typeof entry !== "object" || entry === null) return null;
  const legacy = entry as LegacyEntry;
  const reactionId = asString(legacy.reactionId);
  if (reactionId === null) return null;

  const rebuilt = drawCardFor(reactionId, now);
  if (rebuilt !== null) return rebuilt;

  // The reaction left the registry. Carry the entry's own words, verbatim.
  const front = asString(legacy.front);
  const back = asString(legacy.back);
  if (front === null || back === null) return null;
  return {
    id: `reaction:${reactionId}`,
    front,
    back,
    why: "",
    tags: [],
    source: {
      kind: "reaction",
      reactionId,
      at: asString(legacy.at) ?? now.toISOString(),
    },
  };
}

/**
 * Move every readable legacy entry into `deckId`, then remove the key.
 * Returns how many cards landed. Safe to call every load: once the key is
 * gone this is one storage read and out. A payload that does not parse is
 * removed too, because the old store had no reader and unreadable bytes
 * under a dead key are not data anyone can ever use.
 */
export function migrateLegacySavedCards(
  source: DeckSource,
  deckId: DeckId,
  now: Date = new Date(),
): number {
  let raw: string | null;
  try {
    raw = localStorage.getItem(LEGACY_SAVED_CARDS_KEY);
  } catch {
    return 0;
  }
  if (raw === null) return 0;

  let migrated = 0;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        const card = cardFromLegacyEntry(entry, now);
        if (card !== null) {
          source.saveCard(card, deckId);
          migrated += 1;
        }
      }
    }
  } catch {
    /* corrupt payload: nothing readable to carry over */
  }

  try {
    localStorage.removeItem(LEGACY_SAVED_CARDS_KEY);
  } catch {
    /* removal failing only means this runs again next load */
  }
  return migrated;
}
