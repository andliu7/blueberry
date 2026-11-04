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
import { PATHWAY_UNITS, unitName } from "../demo/pathwayMap";
import { SECTION_UNITS, sectionDeckSize, sectionDecksFor, type SectionDeckRef } from "../cards/sections/sectionDecks";

export const DECK_SINK: SpendSink = "canvas_skin";
export const DECK_PRICE = SINK_COST[DECK_SINK];
export const DECK_REF_PREFIX = "shop-deck:";

/**
 * The units on sale, in course order: every unit with premade decks that is on
 * the path (Unit 0 is not, so it has no shelf here).
 */
const SHELF_UNITS: readonly string[] = SECTION_UNITS.filter((id) => PATHWAY_UNITS.some((unit) => unit.id === id));

/** The energy refill: SINK_COST.charge_topup, the same price the charge gate sells it at. */
export const ENERGY_PRICE = SINK_COST.charge_topup;
/** Two freezes at once is two freezes: twice STREAK_FREEZE_COST, no discount and no markup. */
export const FREEZE_PAIR_PRICE = STREAK_FREEZE_COST * STREAK_FREEZE_MAX_HELD;

export interface ShopDeck {
  readonly id: string;
  readonly ref: SectionDeckRef;
  readonly title: string;
  readonly unitLabel: string;
  readonly cards: number;
  readonly price: number;
}

function toShopDeck(ref: SectionDeckRef): ShopDeck {
  return { id: ref.id, ref, title: ref.title, unitLabel: ref.unitLabel, cards: sectionDeckSize(ref), price: DECK_PRICE };
}

/** Every section deck for sale, unit by unit in course order. */
export function shopDecks(): readonly ShopDeck[] {
  return SHELF_UNITS.flatMap((unitId) => sectionDecksFor(unitId).map(toShopDeck));
}

/** A whole unit's decks bought in one go. */
export interface UnitSet {
  readonly id: string;
  readonly unitId: string;
  readonly unitLabel: string;
  /** The unit's topic, "Aromaticity & Benzene". */
  readonly name: string;
  readonly decks: readonly ShopDeck[];
  readonly cards: number;
}

/** One set per shelf unit, each holding every deck that unit has. */
export function unitSets(): readonly UnitSet[] {
  const out: UnitSet[] = [];
  for (const unitId of SHELF_UNITS) {
    const decks = sectionDecksFor(unitId).map(toShopDeck);
    const first = decks[0];
    const unit = PATHWAY_UNITS.find((entry) => entry.id === unitId);
    if (first === undefined || unit === undefined) continue;
    out.push({
      id: `set:${unitId}`,
      unitId,
      unitLabel: first.unitLabel,
      name: unitName(unit.title),
      decks,
      cards: decks.reduce((sum, deck) => sum + deck.cards, 0),
    });
  }
  return out;
}

/** The decks of a set still to buy. A set is priced by these, one DECK_PRICE each, so nothing is paid for twice. */
export function setStillToBuy(set: UnitSet, owned: ReadonlySet<string>): readonly ShopDeck[] {
  return set.decks.filter((deck) => !owned.has(deck.id));
}

export function setPrice(set: UnitSet, owned: ReadonlySet<string>): number {
  return setStillToBuy(set, owned).reduce((sum, deck) => sum + deck.price, 0);
}

export function setOffer(balance: number, set: UnitSet, owned: ReadonlySet<string>): Offer {
  const price = setPrice(set, owned);
  return price === 0 ? { kind: "owned" } : deckOffer(balance, false, price);
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

/** The meter is already full, or the exam window has switched energy off: nothing to refill. */
export function energyOffer(balance: number, current: number, cap: number, examWindow: boolean): Offer {
  if (examWindow || current >= cap) return { kind: "full" };
  if (balance < ENERGY_PRICE) return { kind: "short", price: ENERGY_PRICE, need: ENERGY_PRICE - balance };
  return { kind: "buy", price: ENERGY_PRICE, left: balance - ENERGY_PRICE };
}

/** A pair fills both slots, so it is for sale only while none is held. */
export function freezePairOffer(balance: number, held: number): Offer {
  if (held > 0) return { kind: "full" };
  if (balance < FREEZE_PAIR_PRICE) return { kind: "short", price: FREEZE_PAIR_PRICE, need: FREEZE_PAIR_PRICE - balance };
  return { kind: "buy", price: FREEZE_PAIR_PRICE, left: balance - FREEZE_PAIR_PRICE };
}

/**
 * A rarity read from the price alone, so the colour on a tile says how big
 * the item is. It names a band; it sets no price.
 */
export type Rarity = "common" | "rare" | "epic" | "legendary";
export function rarityFor(price: number): Rarity {
  if (price <= STREAK_FREEZE_COST) return "common";
  if (price <= DECK_PRICE) return "rare";
  if (price <= DECK_PRICE * 3) return "epic";
  return "legendary";
}
export const RARITY_LABEL: Readonly<Record<Rarity, string>> = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };

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

/**
 * The one item on a shelf that gives the most for the coin: the highest
 * amount per coin, read from the real amounts and prices. It names a shelf
 * mark and changes no price. Null when nothing stands out (a tie for the top,
 * or a shelf of one), so the mark is never handed out at random.
 */
export function bestValueIndex(rows: readonly { readonly amount: number; readonly price: number }[]): number | null {
  if (rows.length < 2) return null;
  const rate = rows.map((row) => (row.price > 0 ? row.amount / row.price : 0));
  const top = Math.max(...rate);
  const at = rate.indexOf(top);
  return top > 0 && rate.filter((r) => r === top).length === 1 ? at : null;
}

/** How far toward a price the balance is, 0 to 1, for the "almost there" bar. */
export function progressToward(balance: number, price: number): number {
  if (price <= 0) return 1;
  return Math.max(0, Math.min(1, balance / price));
}

/* ------------------------------------------------------------ the daily pick -- */

const DAY_MS = 86_400_000;

/** A whole-day count in the student's own calendar, so the pick turns at local midnight. */
export function localDayNumber(now: Date): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
}

/**
 * Today's featured deck: one shelf deck, chosen by the local day and held all
 * day, owned or not (a bought pick shows as owned, it is not swapped out).
 * The price is the deck's own; the pick changes what is shown first, never
 * what anything costs.
 */
export function dailyPick<T>(shelf: readonly T[], now: Date): T | null {
  if (shelf.length === 0) return null;
  return shelf[localDayNumber(now) % shelf.length] ?? null;
}

/**
 * Today's deals: `count` section decks in a row from the whole shelf, starting
 * at a place set by the local day, so each day brings a different three and
 * every deck comes round. Held all day, owned or not.
 */
export function dailyDeals<T>(shelf: readonly T[], now: Date, count = 3): readonly T[] {
  if (shelf.length === 0) return [];
  const n = Math.min(count, shelf.length);
  const start = (localDayNumber(now) * n) % shelf.length;
  return Array.from({ length: n }, (_, i) => shelf[(start + i) % shelf.length] as T);
}

/** Milliseconds until the next local midnight, when the pick turns. */
export function msUntilNextPick(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, next.getTime() - now.getTime());
}

/** "8h 45m", "45m", or "under 1m", rounded down so it never promises more time than is left. */
export function formatCountdown(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "under 1m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export { STREAK_FREEZE_COST, STREAK_FREEZE_MAX_HELD };
