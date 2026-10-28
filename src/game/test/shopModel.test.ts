import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { STREAK_FREEZE_COST, STREAK_FREEZE_MAX_HELD } from "@blueberry/economy";
import { DECK_PRICE, DECK_REF_PREFIX, DECK_SINK, deckOffer, freezeOffer, ownedDeckIds, progressToward, shopDecks } from "../shop/shopModel";
import { parseHash, hrefForShop } from "../app/routes";

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
});
