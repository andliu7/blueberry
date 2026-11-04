import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { SINK_COST, STREAK_FREEZE_COST, STREAK_FREEZE_MAX_HELD } from "@blueberry/economy";
import { bestValueIndex, DECK_PRICE, DECK_REF_PREFIX, DECK_SINK, ENERGY_PRICE, FREEZE_PAIR_PRICE, dailyDeals, energyOffer, freezePairOffer, rarityFor, setOffer, setPrice, unitSets, dailyPick, deckOffer, formatCountdown, freezeOffer, msUntilNextPick, ownedDeckIds, progressToward, shopDecks } from "../shop/shopModel";
import { parseHash, hrefForShop } from "../app/routes";
import { SHOP_MOLECULES } from "../shop/shopMolecules.generated";

describe("shop rules", () => {
  it("prices a freeze from the economy, never from the shop", () => {
    expect(freezeOffer(1000, 0)).toEqual({ kind: "buy", price: STREAK_FREEZE_COST, left: 1000 - STREAK_FREEZE_COST });
  });
  it("says how far off a freeze is, and when it is full", () => {
    expect(freezeOffer(10, 0)).toEqual({ kind: "short", price: STREAK_FREEZE_COST, need: STREAK_FREEZE_COST - 10 });
    expect(freezeOffer(9999, STREAK_FREEZE_MAX_HELD).kind).toBe("full");
  });
  it("never sells a deck twice", () => {
    expect(deckOffer(9999, true).kind).toBe("owned");
    expect(deckOffer(DECK_PRICE - 1, false).kind).toBe("short");
    expect(deckOffer(DECK_PRICE, false).kind).toBe("buy");
  });
  it("reads ownership back from the journal", () => {
    const journal = [
      { kind: "spend", at: "2026-10-01T10:00:00Z", tz: "UTC", sink: DECK_SINK, cost: DECK_PRICE, ref: `${DECK_REF_PREFIX}u1:1` },
      { kind: "spend", at: "2026-10-01T10:00:00Z", tz: "UTC", sink: DECK_SINK, cost: DECK_PRICE },
    ] as unknown as EconomyEvent[];
    expect([...ownedDeckIds(journal)]).toEqual(["u1:1"]);
  });
  it("clamps the progress bar", () => {
    expect(progressToward(500, 100)).toBe(1);
    expect(progressToward(-5, 100)).toBe(0);
  });
  it("lists decks and routes to #/app/shop", () => {
    expect(shopDecks().length).toBeGreaterThan(0);
    expect(parseHash(hrefForShop()).kind).toBe("shop");
  });
  it("holds one daily pick all day and turns it at local midnight", () => {
    const shelf = ["a", "b", "c", "d"];
    const morning = new Date(2026, 10, 3, 8, 0);
    const night = new Date(2026, 10, 3, 23, 59);
    const tomorrow = new Date(2026, 10, 4, 0, 1);
    expect(dailyPick(shelf, morning)).toBe(dailyPick(shelf, night));
    expect(dailyPick(shelf, tomorrow)).not.toBe(dailyPick(shelf, night));
    expect(dailyPick([], morning)).toBeNull();
  });
  it("counts down to the next pick without overpromising", () => {
    expect(msUntilNextPick(new Date(2026, 10, 3, 15, 15))).toBe((8 * 60 + 45) * 60_000);
    expect(formatCountdown((8 * 60 + 45) * 60_000 + 59_000)).toBe("8h 45m");
    expect(formatCountdown(45 * 60_000)).toBe("45m");
    expect(formatCountdown(30_000)).toBe("under 1m");
  });
});

describe("shop catalogue and ladder", () => {
  it("prices boosts from the economy: refill at the charge gate's price, a pair at two freezes", () => {
    expect(ENERGY_PRICE).toBe(SINK_COST.charge_topup);
    expect(FREEZE_PAIR_PRICE).toBe(STREAK_FREEZE_COST * STREAK_FREEZE_MAX_HELD);
    expect(energyOffer(1000, 5, 20, false)).toEqual({ kind: "buy", price: ENERGY_PRICE, left: 1000 - ENERGY_PRICE });
    expect(energyOffer(1000, 20, 20, false).kind).toBe("full");
    expect(energyOffer(1000, 5, 20, true).kind).toBe("full");
    expect(freezePairOffer(1000, 1).kind).toBe("full");
    expect(freezePairOffer(FREEZE_PAIR_PRICE, 0).kind).toBe("buy");
  });
  it("sells every unit as a set, charging only for the decks not yet owned", () => {
    const sets = unitSets();
    expect(sets.length).toBeGreaterThan(1);
    const set = sets.find((entry) => entry.decks.length > 1)!;
    const none = new Set<string>();
    expect(setPrice(set, none)).toBe(set.decks.length * DECK_PRICE);
    const one = new Set([set.decks[0]!.id]);
    expect(setPrice(set, one)).toBe((set.decks.length - 1) * DECK_PRICE);
    expect(setOffer(99999, set, new Set(set.decks.map((d) => d.id))).kind).toBe("owned");
    // Every deck on the shelf belongs to exactly one set.
    expect(sets.flatMap((entry) => entry.decks).length).toBe(shopDecks().length);
  });
  it("reads rarity off the price, so bigger costs more and looks it", () => {
    expect(rarityFor(ENERGY_PRICE)).toBe("common");
    expect(rarityFor(STREAK_FREEZE_COST)).toBe("common");
    expect(rarityFor(DECK_PRICE)).toBe("rare");
    expect(rarityFor(DECK_PRICE * 3)).toBe("epic");
    expect(rarityFor(DECK_PRICE * 4)).toBe("legendary");
  });
  it("deals three different decks a day and turns them at local midnight", () => {
    const shelf = ["a", "b", "c", "d", "e", "f", "g"];
    const today = dailyDeals(shelf, new Date(2026, 10, 3, 8, 0));
    expect(new Set(today).size).toBe(3);
    expect(dailyDeals(shelf, new Date(2026, 10, 3, 23, 0))).toEqual(today);
    expect(dailyDeals(shelf, new Date(2026, 10, 4, 0, 1))).not.toEqual(today);
    expect(dailyDeals([], new Date())).toEqual([]);
  });
});

describe("shop art", () => {
  it("gives every deck and every unit set its own RDKit structure", () => {
    const keys = [...shopDecks().map((deck) => deck.id), ...unitSets().map((set) => set.id)];
    for (const key of keys) {
      const mol = SHOP_MOLECULES[key];
      expect(mol, `${key} has no structure; add it to scripts/gen_shop_art.py`).toBeDefined();
      expect(mol?.stroke.length ?? 0).toBeGreaterThan(0);
    }
    const sets = unitSets().map((set) => SHOP_MOLECULES[set.id]?.smiles);
    expect(new Set(sets).size).toBe(sets.length);
  });
});

describe("best value mark", () => {
  it("marks the one row with the most per coin, and nothing on a tie", () => {
    expect(bestValueIndex([{ amount: 20, price: 150 }, { amount: 17, price: 150 }, { amount: 19, price: 150 }])).toBe(0);
    expect(bestValueIndex([{ amount: 20, price: 150 }, { amount: 40, price: 300 }])).toBeNull();
    expect(bestValueIndex([{ amount: 20, price: 150 }])).toBeNull();
    expect(bestValueIndex([])).toBeNull();
  });
});
