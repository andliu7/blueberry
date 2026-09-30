/**
 * The Challenge: a harder run of a node already cleared, which pays on a pass.
 *
 * WHY THIS FILE EXISTS. The Challenge card used to price its door as a unit
 * quiz, "refunded in full on a pass", and nothing in the game ever emitted the
 * `quiz_passed` event that refund is paid on. A promise about money that no
 * code keeps is the failure this package is built to prevent, so the whole
 * flow is pinned here, on the derivation, rather than on a screen:
 *
 *   entry    the run's own `node_started`, priced as the node's kind
 *   pass     `challenge_passed`, which moves XP and the diamond balance
 *   fail     no event at all, so nothing moves but the entry charge
 *   gate     a pass on a node never cleared pays nothing
 *
 * The amounts are the review drill row (see XP_CHALLENGE_PASSED in rules.ts
 * for why that row and why it is a proposal awaiting the owner).
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, receiptFor } from "../src/derive.ts";
import { isEconomyEvent, type EconomyEvent } from "../src/journal.ts";
import {
  CHARGE_CAP,
  CHARGE_COST,
  DIAMONDS_CHALLENGE_PASSED,
  DIAMONDS_REVIEW_CLEARED,
  XP_CHALLENGE_PASSED,
  XP_NODE_FIRST_CLEAR,
  XP_REPLAY,
} from "../src/rules.ts";
import { at, cleared, started, TZ } from "./helpers.ts";

const DAY = "2026-08-27";
const NOW = at(DAY, "20:00");

function passed(nodeId: string, time: string): EconomyEvent {
  return { kind: "challenge_passed", at: at(DAY, time), tz: TZ, nodeId };
}

/** A student who cleared n1 in the morning. */
const CLEARED: readonly EconomyEvent[] = [started("n1", "concept", DAY, "09:00"), cleared("n1", "concept", DAY, { time: "09:05" })];

describe("the Challenge's price and payout", () => {
  it("is priced from the review drill row, and pays more than a plain replay", () => {
    expect(XP_CHALLENGE_PASSED).toBe(XP_NODE_FIRST_CLEAR.review);
    expect(XP_CHALLENGE_PASSED).toBe(12);
    expect(DIAMONDS_CHALLENGE_PASSED).toBe(DIAMONDS_REVIEW_CLEARED);
    expect(DIAMONDS_CHALLENGE_PASSED).toBe(5);
    // A replay pays 5 XP and no diamonds. The harder run must beat the easy one.
    expect(XP_CHALLENGE_PASSED).toBeGreaterThan(XP_REPLAY);
  });

  it("charges the node's own price on entry, from the run's node_started", () => {
    const before = deriveEconomy(CLEARED, at(DAY, "12:00")).charge.current;
    const after = deriveEconomy([...CLEARED, started("n1", "concept", DAY, "12:00")], at(DAY, "12:00")).charge.current;
    expect(before - after).toBe(CHARGE_COST.concept);
  });

  it("pays a pass: the event is journalled and the balance and XP move", () => {
    const entry = started("n1", "concept", DAY, "12:00");
    const pass = passed("n1", "12:04");
    const receipt = receiptFor([...CLEARED, entry], pass, at(DAY, "12:04"));
    // The pass also completes the default 20 XP daily goal here (10 from the
    // clear plus 12), so the receipt carries that line too; the Challenge's
    // own line is the one pinned.
    expect(receipt.xp.filter((line) => line.label === "Challenge passed")).toEqual([
      { label: "Challenge passed", amount: XP_CHALLENGE_PASSED },
    ]);
    expect(receipt.diamonds).toEqual([{ label: "Challenge passed", amount: DIAMONDS_CHALLENGE_PASSED }]);

    const without = deriveEconomy([...CLEARED, entry], NOW);
    const withPass = deriveEconomy([...CLEARED, entry, pass], NOW);
    expect(withPass.diamonds.balance - without.diamonds.balance).toBe(DIAMONDS_CHALLENGE_PASSED);
    expect(withPass.xp.total).toBeGreaterThan(without.xp.total);
  });

  it("pays on every pass, like the review drill it is priced from", () => {
    const one = [...CLEARED, started("n1", "concept", DAY, "12:00"), passed("n1", "12:04")];
    const two = [...one, started("n1", "concept", DAY, "13:00"), passed("n1", "13:04")];
    expect(deriveEconomy(two, NOW).diamonds.balance - deriveEconomy(one, NOW).diamonds.balance).toBe(
      DIAMONDS_CHALLENGE_PASSED,
    );
  });

  it("pays nothing on a fail: the entry charge is gone and nothing else moves", () => {
    const failed = [...CLEARED, started("n1", "concept", DAY, "12:00")];
    const base = deriveEconomy(CLEARED, at(DAY, "12:00"));
    const after = deriveEconomy(failed, at(DAY, "12:00"));
    expect(after.diamonds.balance).toBe(base.diamonds.balance);
    expect(after.xp.total).toBe(base.xp.total);
    expect(after.charge.current).toBe(base.charge.current - CHARGE_COST.concept);
  });

  it("never refunds charge on a pass: the old quiz refund promise is not reborn here", () => {
    const entry = started("n1", "concept", DAY, "12:00");
    const failed = deriveEconomy([...CLEARED, entry], at(DAY, "12:04")).charge.current;
    const won = deriveEconomy([...CLEARED, entry, passed("n1", "12:04")], at(DAY, "12:04")).charge.current;
    expect(won).toBe(failed);
    expect(won).toBeLessThan(CHARGE_CAP);
  });
});

describe("a Challenge is unavailable before the node is cleared", () => {
  it("pays nothing for a pass on a node never cleared", () => {
    const receipt = receiptFor([started("n2", "concept", DAY, "12:00")], passed("n2", "12:04"), at(DAY, "12:04"));
    expect(receipt.xp).toEqual([]);
    expect(receipt.diamonds).toEqual([]);
    expect(deriveEconomy([passed("n2", "12:04")], NOW).diamonds.balance).toBe(0);
  });

  it("pays nothing for a pass journalled BEFORE the first clear, even when the clear follows", () => {
    const early = [passed("n1", "08:00"), ...CLEARED];
    expect(deriveEconomy(early, NOW).diamonds.balance).toBe(deriveEconomy(CLEARED, NOW).diamonds.balance);
  });
});

describe("the event's shape", () => {
  it("accepts a pass carrying a node id, and nothing less", () => {
    expect(isEconomyEvent(passed("n1", "12:00"))).toBe(true);
    expect(isEconomyEvent({ kind: "challenge_passed", at: at(DAY), tz: TZ, nodeId: "" })).toBe(false);
    expect(isEconomyEvent({ kind: "challenge_passed", at: at(DAY), tz: TZ })).toBe(false);
  });
});
