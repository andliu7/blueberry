/**
 * How one reagent slot is SHOWN on a reaction card.
 *
 * A slot's `anyOf` is search vocabulary: every token a student might type,
 * so it mixes three different things. "NaBH4" and "sodium borohydride" are one
 * reagent written two ways; "NaBH4" and "LiAlH4" are two reagents that do the
 * same job; and on a slot with no equivalence group the tokens can be reagents
 * that are used TOGETHER (PPh3 then n-BuLi for a Wittig ylide). Joining them all
 * with "or" taught the last case wrong.
 *
 * So the card shows only the written formulas and abbreviations (the spelled
 * out names are synonyms, and the drawn card is not the place for them), and
 * says "or" only on a slot backed by an equivalence group, which is the
 * curriculum's own statement that its members are interchangeable. Any other
 * slot is listed without a joining word, claiming nothing.
 */

import type { ReagentSlot } from "@blueberry/curriculum";

/** Most reagent tokens shown per slot; the full list is one tap away in Search. */
const TOKENS_PER_SLOT = 3;

/**
 * True for a formula or abbreviation (NaBH4, PCC, n-BuLi, Ph3P=CH2, Swern),
 * false for a spelled out name ("sodium borohydride", "Wittig reagent", "ylide").
 * A formula has a capital or a digit and no space.
 */
export function isWrittenFormula(token: string): boolean {
  return /[A-Z0-9]/.test(token) && !/\s/.test(token);
}

/**
 * Abbreviations that are the SAME reagent as a formula in the table, so a card
 * never prints "LiAlH4 or LAH" as if LAH were a second choice. Display only:
 * search still matches every token. The table itself does not record which
 * tokens are synonyms (owner flag), so this list is kept short and explicit.
 */
const SAME_REAGENT: Readonly<Record<string, string>> = {
  LAH: "LiAlH4",
  "m-CPBA": "mCPBA",
};

/** One token per reagent: a synonym is dropped when the reagent it names is already listed. */
function withoutSynonyms(tokens: readonly string[]): string[] {
  const seen = new Set<string>();
  return tokens.filter((token) => {
    const reagent = SAME_REAGENT[token] ?? token;
    if (seen.has(reagent)) return false;
    seen.add(reagent);
    return true;
  });
}

export interface SlotDisplay {
  readonly tokens: readonly string[];
  /** "or" when the slot is an equivalence group; null when the tokens make no interchangeability claim. */
  readonly joiner: "or" | null;
}

export function slotDisplay(slot: ReagentSlot): SlotDisplay {
  const formulas = slot.anyOf.filter(isWrittenFormula);
  // A slot written only in words still shows its first word, never an empty row.
  const tokens = withoutSynonyms(formulas.length > 0 ? formulas : slot.anyOf.slice(0, 1)).slice(0, TOKENS_PER_SLOT);
  return { tokens, joiner: slot.group !== undefined && tokens.length > 1 ? "or" : null };
}
