/**
 * Treasure chests. A chest is a reward at the end of a pathway section, not a
 * lesson: it pays DIAMONDS_CHEST once per chest id and touches nothing else.
 * Round 2 of the pathway journalled a chest as a lesson clear, so it set off
 * whatever rank award was waiting (+135 on one profile, +10 on another) and
 * added XP to the daily goal. These pin that it cannot do either.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, receiptFor } from "../src/derive.ts";
import { isEconomyEvent, type EconomyEvent } from "../src/journal.ts";
import { DIAMONDS_CHEST } from "../src/rules.ts";
import { at, cleared, TZ } from "./helpers.ts";

const DAY = "2026-10-17";
const NOW = at(DAY, "20:00");
const chest = (chestId: string, time = "13:00"): EconomyEvent => ({ kind: "chest_opened", at: at(DAY, time), tz: TZ, chestId });

// Four clears of four unlocked nodes: a student at full mastery, one event
// away from any rank award an unlock could set off.
const CLEARS = ["a", "b", "c", "d"].map((id) => cleared(id, "concept", DAY, { spine: true }));

describe("a treasure chest", () => {
  it("pays the chest amount and nothing else, whatever rank award is waiting", () => {
    const receipt = receiptFor(CLEARS, chest("s1-chest"), NOW);
    expect(receipt.diamonds).toEqual([{ label: "Treasure chest", amount: DIAMONDS_CHEST }]);
    expect(receipt.xp).toEqual([]);
  });

  it("pays the same on an empty journal as on a long one", () => {
    expect(receiptFor([], chest("s1-chest"), NOW).diamonds).toEqual(receiptFor(CLEARS, chest("s1-chest"), NOW).diamonds);
  });

  it("pays once per chest, and a second chest pays again", () => {
    const once = deriveEconomy([...CLEARS, chest("s1-chest")], NOW).diamonds.balance;
    const twice = deriveEconomy([...CLEARS, chest("s1-chest"), chest("s1-chest", "14:00")], NOW).diamonds.balance;
    const two = deriveEconomy([...CLEARS, chest("s1-chest"), chest("s2-chest", "14:00")], NOW).diamonds.balance;
    expect(twice).toBe(once);
    expect(two).toBe(once + DIAMONDS_CHEST);
  });

  it("moves neither XP nor mastery", () => {
    const before = deriveEconomy(CLEARS, NOW);
    const after = deriveEconomy([...CLEARS, chest("s1-chest")], NOW);
    expect(after.xp).toEqual(before.xp);
    expect(after.mastery).toEqual(before.mastery);
  });

  it("is a journal event a stored journal keeps", () => {
    expect(isEconomyEvent(chest("s1-chest"))).toBe(true);
    expect(isEconomyEvent({ kind: "chest_opened", at: at(DAY), tz: TZ, chestId: "" })).toBe(false);
  });
});
