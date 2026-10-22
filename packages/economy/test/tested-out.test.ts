/**
 * The test-out (owner brief 17 Oct, items 1 and 2): a section's chest quiz or a
 * unit exam, passed. It lights up lessons on the pathway, and the money rule is
 * that it pays ONCE per test, never once per lesson it lights.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, receiptFor } from "../src/derive.ts";
import { isEconomyEvent, type EconomyEvent } from "../src/journal.ts";
import { XP_QUIZ_PASSED, XP_TESTED_OUT } from "../src/rules.ts";
import { at, TZ } from "./helpers.ts";

const DAY = "2026-10-22";

function testedOut(testId: string, nodeIds: readonly string[], time = "12:00"): EconomyEvent {
  return { kind: "tested_out", at: at(DAY, time), tz: TZ, testId, nodeIds };
}

describe("tested_out", () => {
  it("is a valid event with a test id and a list of node ids", () => {
    expect(isEconomyEvent(testedOut("u1-s1-test", ["u1-allylic", "u1-quiz-a"]))).toBe(true);
    expect(isEconomyEvent({ ...testedOut("u1-s1-test", []), testId: "" })).toBe(false);
    expect(isEconomyEvent({ ...testedOut("u1-s1-test", []), nodeIds: "u1-allylic" })).toBe(false);
    expect(isEconomyEvent({ ...testedOut("u1-s1-test", []), nodeIds: [""] })).toBe(false);
  });

  it("pays the unit quiz's XP once per test, however many lessons it lights", () => {
    expect(XP_TESTED_OUT).toBe(XP_QUIZ_PASSED);
    const one = deriveEconomy([testedOut("u1-s1-test", ["a", "b", "c", "d", "e"])], at(DAY, "20:00"));
    const twice = deriveEconomy(
      [testedOut("u1-s1-test", ["a", "b", "c", "d", "e"]), testedOut("u1-s1-test", ["a", "b", "c", "d", "e"], "13:00")],
      at(DAY, "20:00"),
    );
    // The first pass may also meet the day's goal, which pays its own line; the second pays nothing at all.
    expect(twice.xp.total).toBe(one.xp.total);
    const receipt = receiptFor([], testedOut("u1-s1-test", ["a", "b"]), at(DAY, "12:00"));
    expect(receipt.xp).toContainEqual({ label: "Test-out passed", amount: XP_TESTED_OUT });
  });

  it("pays no diamonds and unlocks no mastery node", () => {
    const snap = deriveEconomy([testedOut("u3-exam", ["u3-halo"])], at(DAY, "20:00"));
    expect(snap.diamonds.balance).toBe(0);
    expect(snap.mastery.score).toBe(0);
  });
});
