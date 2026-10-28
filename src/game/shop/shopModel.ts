/**
 * The shop's rules, pure: what is for sale, what it costs, and why a row can
 * or cannot be bought right now. No React, no storage.
 *
 * DIAMONDS ARE EARNED, NEVER BOUGHT. Every price here comes from the economy
 * package (SINK_COST, STREAK_FREEZE_COST) and nothing in this file invents or
 * changes one. There is no real-money row and no random box, by the brief.
 *
 * DECKS. The economy has no "deck" sink yet, and packages/economy is not this
 * piece's to edit, so a deck purchase journals as a `canvas_skin` spend (a
 * cosmetic, 150) with a ref of "shop-deck:<deck id>". Ownership is read back
 * from that ref, so the journal stays the only record. An owner decision is
 * open: add a real `deck` sink and price, then change DECK_SINK below.
 */

import { SINK_COST, STREAK_FREEZE_COST, STREAK_FREEZE_MAX_HELD, type EconomyEvent, type SpendSink } from "@blueberry/economy";
import { sectionDeckSize, sectionDecksFor, type SectionDeckRef } from "../cards/sections/sectionDecks";

export const DECK_SINK: SpendSink = "canvas_skin";
export const DECK_PRICE = SINK_COST[DECK_SINK];
export const DECK_REF_PREFIX = "shop-deck:";

/** The units whose first section deck is on the shelf, in course order. */
const SHELF_UNITS: readonly string[] = ["u1", "u2", "u3", "u4"];

export interface ShopDeck {
  readonly id: string;
  readonly ref: SectionDeckRef;
  readonly title: string;
  readonly unitLabel: string;
  readonly cards: number;
  readonly price: number;
}

/** The decks for sale. The first section deck of each shelf unit that has one. */
export function shopDecks(): readonly ShopDeck[] {
  const out: ShopDeck[] = [];
  for (const unitId of SHELF_UNITS) {
    const ref = sectionDecksFor(unitId)[0];
    if (ref === undefined) continue;
    out.push({
      id: ref.id,
      ref,
      title: ref.title,
      unitLabel: ref.unitLabel,
      cards: sectionDeckSize(ref),
      price: DECK_PRICE,
    });
  }
  return out;
}

/** Deck ids the journal says were bought here. */
export function ownedDeckIds(journal: readonly EconomyEvent[]): ReadonlySet<string> {
  const owned = new Set<string>();
  for (const event of journal) {
    if (event.kind !== "spend" || event.sink !== DECK_SINK) continue;
    if (event.ref !== undefined && event.ref.startsWith(DECK_REF_PREFIX)) owned.add(event.ref.slice(DECK_REF_PREFIX.length));
  }
  return owned;
}

export type Offer =
  | { readonly kind: "buy"; readonly price: number; readonly left: number }
  | { readonly kind: "short"; readonly price: number; readonly need: number }
  | { readonly kind: "full" }
  | { readonly kind: "owned" };

export function freezeOffer(balance: number, held: number): Offer {
  if (held >= STREAK_FREEZE_MAX_HELD) return { kind: "full" };
  if (balance < STREAK_FREEZE_COST) return { kind: "short", price: STREAK_FREEZE_COST, need: STREAK_FREEZE_COST - balance };
  return { kind: "buy", price: STREAK_FREEZE_COST, left: balance - STREAK_FREEZE_COST };
}

export function deckOffer(balance: number, owned: boolean, price: number = DECK_PRICE): Offer {
  if (owned) return { kind: "owned" };
  if (balance < price) return { kind: "short", price, need: price - balance };
  return { kind: "buy", price, left: balance - price };
}

/** How far toward a price the balance is, 0 to 1, for the "almost there" bar. */
export function progressToward(balance: number, price: number): number {
  if (price <= 0) return 1;
  return Math.max(0, Math.min(1, balance / price));
}

export { STREAK_FREEZE_COST, STREAK_FREEZE_MAX_HELD };
