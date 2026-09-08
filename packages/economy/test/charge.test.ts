/**
 * Charge. Two rules from ECONOMY.md do all the work and both are asserted here:
 * charge is spent when a node STARTS and never per question, and mistakes cost
 * nothing. The third, that regeneration is computed from timestamps on read
 * rather than accumulated by a tick, is the reason every case below moves `now`
 * instead of moving a counter.
 */

import { describe, expect, it } from "vitest";
import { canAfford, chargeCostFor, deriveEconomy } from "../src/derive.ts";
import type { EconomyEvent } from "../src/journal.ts";
import { at, cleared, settings, spend, started, TZ } from "./helpers.ts";

const DAY = "2026-08-27";

function chargeAt(events: readonly EconomyEvent[], now: string): number {
  return deriveEconomy(events, now).charge.current;
}

describe("the meter", () => {
  it("starts full at 30 for a student with no history", () => {
    const snapshot = deriveEconomy([], at(DAY, "12:00"));
    expect(snapshot.charge.current).toBe(30);
    expect(snapshot.charge.cap).toBe(30);
    expect(snapshot.charge.nextRegenAt).toBeNull();
    expect(snapshot.charge.fullAt).toBeNull();
  });

  it("charges a concept node 5 and a reaction node 8 on entry", () => {
    expect(chargeAt([started("n1", "concept", DAY, "12:00")], at(DAY, "12:10"))).toBe(25);
    expect(chargeAt([started("n1", "reaction", DAY, "12:00")], at(DAY, "12:10"))).toBe(22);
  });

  it("charges a branch node the same as a reaction node, and a quiz 10", () => {
    expect(chargeAt([started("n1", "branch", DAY, "12:00")], at(DAY, "12:10"))).toBe(22);
    expect(chargeAt([started("n1", "quiz", DAY, "12:00")], at(DAY, "12:10"))).toBe(20);
  });

  it("charges nothing for a review drill, a tutorial node or an intro node", () => {
    const free: readonly EconomyEvent[] = [
      started("r1", "review", DAY, "12:00"),
      started("t1", "tutorial", DAY, "12:01"),
      started("i1", "intro", DAY, "12:02"),
    ];
    expect(chargeAt(free, at(DAY, "12:10"))).toBe(30);
  });

  it("never goes below zero, however many nodes are started", () => {
    const events = Array.from({ length: 10 }, (unused, i) => started(`n${i}`, "reaction", DAY, `12:0${i}`));
    // Ten reaction nodes back to back is 80 charge against a meter of 30.
    expect(chargeAt(events, at(DAY, "12:10"))).toBe(0);
  });

  it("spends on entry and not per question, so a long node costs the same as a short one", () => {
    const attempts: EconomyEvent[] = [];
    for (let i = 0; i < 25; i += 1) {
      attempts.push({ kind: "attempt", at: at(DAY, "12:05"), tz: TZ, nodeId: "n1", problemId: `p${i}`, correct: i % 2 === 0 });
    }
    const journal = [started("n1", "reaction", DAY, "12:00"), ...attempts];
    expect(chargeAt(journal, at(DAY, "12:10"))).toBe(22);
  });
});

describe("regeneration, computed from timestamps on read", () => {
  it("adds one point per thirty minutes and reports when the next one lands", () => {
    const journal = [started("n1", "concept", DAY, "12:00")];
    expect(chargeAt(journal, at(DAY, "12:29"))).toBe(25);
    expect(chargeAt(journal, at(DAY, "12:30"))).toBe(26);
    expect(chargeAt(journal, at(DAY, "13:15"))).toBe(27);
  });

  it("names the instant of the next point and the instant the meter is full", () => {
    const snapshot = deriveEconomy([started("n1", "concept", DAY, "12:00")], at(DAY, "12:10"));
    expect(snapshot.charge.nextRegenAt).toBe(at(DAY, "12:30"));
    expect(snapshot.charge.fullAt).toBe(at(DAY, "14:30"));
  });

  it("stops at the cap and reports no pending regeneration once it is there", () => {
    const snapshot = deriveEconomy([started("n1", "concept", DAY, "12:00")], at(DAY, "18:00"));
    expect(snapshot.charge.current).toBe(30);
    expect(snapshot.charge.nextRegenAt).toBeNull();
    expect(snapshot.charge.fullAt).toBeNull();
  });

  it("refills an empty meter overnight, which is the fifteen hour claim in the table", () => {
    const drain = Array.from({ length: 4 }, (unused, i) => started(`n${i}`, "reaction", DAY, `12:0${i}`));
    expect(chargeAt(drain, at(DAY, "12:10"))).toBe(0);
    // Four hours later, eight intervals have landed. By the next morning it is full.
    expect(chargeAt(drain, at(DAY, "16:00"))).toBe(8);
    expect(chargeAt(drain, at("2026-08-28", "07:00"))).toBe(30);
  });
});

describe("the ways charge comes back", () => {
  it("pays 3 back on a flawless clear", () => {
    const journal = [started("n1", "reaction", DAY, "12:00"), cleared("n1", "reaction", DAY, { time: "12:05", flawless: true })];
    expect(chargeAt(journal, at(DAY, "12:10"))).toBe(25);
  });

  it("refunds a unit quiz in full on a pass", () => {
    const journal: readonly EconomyEvent[] = [
      started("q1", "quiz", DAY, "12:00"),
      { kind: "quiz_passed", at: at(DAY, "12:05"), tz: TZ, unitId: "u1", flawless: false },
    ];
    expect(chargeAt(journal, at(DAY, "12:10"))).toBe(30);
  });

  it("pays the combo mini game between 2 and 6, and clamps anything outside that", () => {
    const drain = [started("n1", "reaction", DAY, "12:00"), started("n2", "reaction", DAY, "12:01")];
    const combo = (amount: number): EconomyEvent => ({ kind: "combo_bonus", at: at(DAY, "12:05"), tz: TZ, charge: amount });
    expect(chargeAt([...drain, combo(2)], at(DAY, "12:10"))).toBe(16);
    expect(chargeAt([...drain, combo(6)], at(DAY, "12:10"))).toBe(20);
    expect(chargeAt([...drain, combo(99)], at(DAY, "12:10"))).toBe(20);
    expect(chargeAt([...drain, combo(1)], at(DAY, "12:10"))).toBe(16);
  });

  it("fills the meter on a charge top-up", () => {
    const journal = [
      started("n1", "reaction", DAY, "12:00"),
      started("n2", "reaction", DAY, "12:01"),
      spend("charge_topup", 60, DAY, "12:05"),
    ];
    expect(chargeAt(journal, at(DAY, "12:10"))).toBe(30);
  });
});

describe("the exam window", () => {
  const EXAM = "2026-09-01";
  const withExam: readonly EconomyEvent[] = [settings(DAY, { examDate: EXAM })];

  it("reads full and says how many days are left", () => {
    const journal = [...withExam, started("n1", "reaction", DAY, "12:00"), started("n2", "reaction", DAY, "12:01")];
    const snapshot = deriveEconomy(journal, at(DAY, "12:10"));
    expect(snapshot.charge.examWindow).toBe(true);
    expect(snapshot.charge.examDaysLeft).toBe(5);
    expect(snapshot.charge.current).toBe(30);
    expect(snapshot.charge.nextRegenAt).toBeNull();
  });

  it("spends nothing on entry inside the window, which outlives the window itself", () => {
    // Judged after the exam has passed, so the snapshot is out of the window and
    // cannot be masking the spend by reading full.
    const inside: readonly EconomyEvent[] = [
      settings("2026-08-20", { examDate: "2026-08-20" }),
      ...Array.from({ length: 5 }, (unused, i) => started(`n${i}`, "concept", "2026-08-20", `23:0${i}`)),
    ];
    const outside: readonly EconomyEvent[] = [
      ...Array.from({ length: 5 }, (unused, i) => started(`n${i}`, "concept", "2026-08-20", `23:0${i}`)),
    ];
    const now = at("2026-08-21", "00:10");
    expect(deriveEconomy(inside, now).charge.examWindow).toBe(false);
    expect(chargeAt(inside, now)).toBe(30);
    expect(chargeAt(outside, now)).toBe(7);
  });

  it("opens fourteen days before the exam and not fifteen", () => {
    const fourteen = deriveEconomy([settings(DAY, { examDate: "2026-09-10" })], at(DAY, "12:00"));
    const fifteen = deriveEconomy([settings(DAY, { examDate: "2026-09-11" })], at(DAY, "12:00"));
    expect(fourteen.charge.examDaysLeft).toBe(14);
    expect(fourteen.charge.examWindow).toBe(true);
    expect(fifteen.charge.examDaysLeft).toBe(15);
    expect(fifteen.charge.examWindow).toBe(false);
  });

  it("closes again once the exam date has passed", () => {
    const snapshot = deriveEconomy([settings("2026-08-20", { examDate: "2026-08-25" })], at(DAY, "12:00"));
    expect(snapshot.charge.examWindow).toBe(false);
    expect(snapshot.charge.examDaysLeft).toBeNull();
  });
});

describe("the two helpers a shell renders a locked node with", () => {
  it("prices a node kind, and prices everything at zero inside the exam window", () => {
    const plain = deriveEconomy([], at(DAY, "12:00"));
    expect(chargeCostFor("reaction", plain)).toBe(8);
    expect(chargeCostFor("tutorial", plain)).toBe(0);
    const exam = deriveEconomy([settings(DAY, { examDate: "2026-08-30" })], at(DAY, "12:00"));
    expect(chargeCostFor("reaction", exam)).toBe(0);
  });

  it("answers whether the student can enter right now", () => {
    const drained = deriveEconomy(
      Array.from({ length: 4 }, (unused, i) => started(`n${i}`, "reaction", DAY, `12:0${i}`)),
      at(DAY, "12:10"),
    );
    expect(drained.charge.current).toBe(0);
    expect(canAfford("reaction", drained)).toBe(false);
    expect(canAfford("review", drained)).toBe(true);
  });
});
