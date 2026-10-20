/**
 * Charge. Two rules from ECONOMY.md do all the work and both are asserted here:
 * charge is spent when a node STARTS and never per question, and mistakes cost
 * nothing. The third, that regeneration is computed from timestamps on read
 * rather than accumulated by a tick, is the reason every case below moves `now`
 * instead of moving a counter.
 *
 * NUMBERS CHANGED BY OWNER DECISION, 2026-10-20 (docs/ECONOMY.md, Charge): cap
 * 30 -> 20, concept 5 -> 3, reaction and branch 8 -> 3, quiz 10 -> 6,
 * regeneration +1 -> +10 per 30 min, flawless +3 -> +2. Only the expected
 * numbers below moved; every rule each case asserts is the rule it asserted.
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
  it("starts full at 20 for a student with no history", () => {
    const snapshot = deriveEconomy([], at(DAY, "12:00"));
    expect(snapshot.charge.current).toBe(20);
    expect(snapshot.charge.cap).toBe(20);
    expect(snapshot.charge.nextRegenAt).toBeNull();
    expect(snapshot.charge.fullAt).toBeNull();
  });

  it("charges a concept node 3 and a reaction node 3 on entry", () => {
    expect(chargeAt([started("n1", "concept", DAY, "12:00")], at(DAY, "12:10"))).toBe(17);
    expect(chargeAt([started("n1", "reaction", DAY, "12:00")], at(DAY, "12:10"))).toBe(17);
  });

  it("charges a branch node the same as a reaction node, and a quiz 6", () => {
    expect(chargeAt([started("n1", "branch", DAY, "12:00")], at(DAY, "12:10"))).toBe(17);
    expect(chargeAt([started("n1", "quiz", DAY, "12:00")], at(DAY, "12:10"))).toBe(14);
  });

  it("charges nothing for a review drill, a tutorial node or an intro node", () => {
    const free: readonly EconomyEvent[] = [
      started("r1", "review", DAY, "12:00"),
      started("t1", "tutorial", DAY, "12:01"),
      started("i1", "intro", DAY, "12:02"),
    ];
    expect(chargeAt(free, at(DAY, "12:10"))).toBe(20);
  });

  it("never goes below zero, however many nodes are started", () => {
    const events = Array.from({ length: 10 }, (unused, i) => started(`n${i}`, "reaction", DAY, `12:0${i}`));
    // Ten reaction nodes back to back is 30 charge against a meter of 20.
    expect(chargeAt(events, at(DAY, "12:10"))).toBe(0);
  });

  it("spends on entry and not per question, so a long node costs the same as a short one", () => {
    const attempts: EconomyEvent[] = [];
    for (let i = 0; i < 25; i += 1) {
      attempts.push({ kind: "attempt", at: at(DAY, "12:05"), tz: TZ, nodeId: "n1", problemId: `p${i}`, correct: i % 2 === 0 });
    }
    const journal = [started("n1", "reaction", DAY, "12:00"), ...attempts];
    expect(chargeAt(journal, at(DAY, "12:10"))).toBe(17);
  });
});

describe("regeneration, computed from timestamps on read", () => {
  // Six concept nodes from 12:00 to 12:05 spend 18 of 20, leaving 2.
  const SIX = Array.from({ length: 6 }, (unused, i) => started(`n${i}`, "concept", DAY, `12:0${i}`));

  it("adds ten points per thirty minutes, capped at the meter, and reports when the next ten land", () => {
    expect(chargeAt(SIX, at(DAY, "12:29"))).toBe(2);
    expect(chargeAt(SIX, at(DAY, "12:30"))).toBe(12);
    expect(chargeAt(SIX, at(DAY, "12:59"))).toBe(12);
    // A second interval would make 22: the meter stops at 20.
    expect(chargeAt(SIX, at(DAY, "13:00"))).toBe(20);
  });

  it("names the instant of the next ten and the instant the meter is full", () => {
    const snapshot = deriveEconomy(SIX, at(DAY, "12:10"));
    expect(snapshot.charge.nextRegenAt).toBe(at(DAY, "12:30"));
    expect(snapshot.charge.fullAt).toBe(at(DAY, "13:00"));
  });

  it("stops at the cap and reports no pending regeneration once it is there", () => {
    const snapshot = deriveEconomy([started("n1", "concept", DAY, "12:00")], at(DAY, "18:00"));
    expect(snapshot.charge.current).toBe(20);
    expect(snapshot.charge.nextRegenAt).toBeNull();
    expect(snapshot.charge.fullAt).toBeNull();
  });

  it("refills an empty meter in an hour", () => {
    const drain = Array.from({ length: 7 }, (unused, i) => started(`n${i}`, "reaction", DAY, `12:0${i}`));
    expect(chargeAt(drain, at(DAY, "12:10"))).toBe(0);
    expect(chargeAt(drain, at(DAY, "12:30"))).toBe(10);
    expect(chargeAt(drain, at(DAY, "13:00"))).toBe(20);
  });
});

describe("the ways charge comes back", () => {
  it("pays 2 back on a flawless clear", () => {
    const journal = [started("n1", "reaction", DAY, "12:00"), cleared("n1", "reaction", DAY, { time: "12:05", flawless: true })];
    expect(chargeAt(journal, at(DAY, "12:10"))).toBe(19);
  });

  it("refunds a unit quiz in full on a pass", () => {
    const journal: readonly EconomyEvent[] = [
      started("q1", "quiz", DAY, "12:00"),
      { kind: "quiz_passed", at: at(DAY, "12:05"), tz: TZ, unitId: "u1", flawless: false },
    ];
    expect(chargeAt(journal, at(DAY, "12:10"))).toBe(20);
  });

  it("pays the combo mini game between 2 and 6, and clamps anything outside that", () => {
    // Four reaction nodes leave 8, deep enough that the cap cannot hide the clamp.
    const drain = Array.from({ length: 4 }, (unused, i) => started(`n${i}`, "reaction", DAY, `12:0${i}`));
    const combo = (amount: number): EconomyEvent => ({ kind: "combo_bonus", at: at(DAY, "12:05"), tz: TZ, charge: amount });
    expect(chargeAt([...drain, combo(2)], at(DAY, "12:10"))).toBe(10);
    expect(chargeAt([...drain, combo(6)], at(DAY, "12:10"))).toBe(14);
    expect(chargeAt([...drain, combo(99)], at(DAY, "12:10"))).toBe(14);
    expect(chargeAt([...drain, combo(1)], at(DAY, "12:10"))).toBe(10);
  });

  it("fills the meter on a charge top-up", () => {
    const journal = [
      started("n1", "reaction", DAY, "12:00"),
      started("n2", "reaction", DAY, "12:01"),
      spend("charge_topup", 60, DAY, "12:05"),
    ];
    expect(chargeAt(journal, at(DAY, "12:10"))).toBe(20);
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
    expect(snapshot.charge.current).toBe(20);
    expect(snapshot.charge.nextRegenAt).toBeNull();
  });

  it("spends nothing on entry inside the window, which outlives the window itself", () => {
    // Judged after the exam has passed, so the snapshot is out of the window and
    // cannot be masking the spend by reading full. The starts sit under half
    // an hour before `now`, so no regeneration interval has landed.
    const inside: readonly EconomyEvent[] = [
      settings("2026-08-20", { examDate: "2026-08-20" }),
      ...Array.from({ length: 5 }, (unused, i) => started(`n${i}`, "concept", "2026-08-20", `23:4${i + 5}`)),
    ];
    const outside: readonly EconomyEvent[] = [
      ...Array.from({ length: 5 }, (unused, i) => started(`n${i}`, "concept", "2026-08-20", `23:4${i + 5}`)),
    ];
    const now = at("2026-08-21", "00:10");
    expect(deriveEconomy(inside, now).charge.examWindow).toBe(false);
    expect(chargeAt(inside, now)).toBe(20);
    expect(chargeAt(outside, now)).toBe(5);
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
    expect(chargeCostFor("reaction", plain)).toBe(3);
    expect(chargeCostFor("tutorial", plain)).toBe(0);
    const exam = deriveEconomy([settings(DAY, { examDate: "2026-08-30" })], at(DAY, "12:00"));
    expect(chargeCostFor("reaction", exam)).toBe(0);
  });

  it("answers whether the student can enter right now", () => {
    const drained = deriveEconomy(
      Array.from({ length: 7 }, (unused, i) => started(`n${i}`, "reaction", DAY, `12:0${i}`)),
      at(DAY, "12:10"),
    );
    expect(drained.charge.current).toBe(0);
    expect(canAfford("reaction", drained)).toBe(false);
    expect(canAfford("review", drained)).toBe(true);
  });
});

/* ------------------------------------------------ owner 2026-10-20 rules --- */

describe("entry prices set by the owner on 2026-10-20", () => {
  const entered = (entry: "challenge" | "final", time = "12:00"): EconomyEvent => ({
    kind: "node_started",
    at: at(DAY, time),
    tz: TZ,
    nodeId: "n1",
    nodeKind: "concept",
    entry,
  });

  it("charges a Challenge run 6, whatever kind the node is journalled as", () => {
    expect(chargeAt([entered("challenge")], at(DAY, "12:10"))).toBe(14);
  });

  it("charges a section final or unit checkpoint 6", () => {
    expect(chargeAt([entered("final")], at(DAY, "12:10"))).toBe(14);
  });

  it("prices both through the helpers, and both at zero inside the exam window", () => {
    const plain = deriveEconomy([], at(DAY, "12:00"));
    expect(chargeCostFor("concept", plain, "challenge")).toBe(6);
    expect(chargeCostFor("concept", plain, "final")).toBe(6);
    expect(chargeCostFor("concept", plain)).toBe(3);
    const exam = deriveEconomy([settings(DAY, { examDate: "2026-08-30" })], at(DAY, "12:00"));
    expect(chargeCostFor("concept", exam, "final")).toBe(0);
    expect(chargeAt([settings(DAY, { examDate: "2026-08-30" }), entered("final", "12:01")], at(DAY, "12:10"))).toBe(20);
  });

  it("lets five lessons fit a full tank and leaves the final one point short, the owner's stated intent", () => {
    const five = Array.from({ length: 5 }, (unused, i) => started(`l${i}`, "concept", DAY, `12:0${i}`));
    const snapshot = deriveEconomy(five, at(DAY, "12:10"));
    expect(snapshot.charge.current).toBe(5);
    expect(canAfford("concept", snapshot, "final")).toBe(false);
    expect(canAfford("concept", snapshot)).toBe(true);
  });
});

const EARN_DAY = "2026-10-20";

describe("charge earned, owner 2026-10-20", () => {
  // A day whose rotating quest is the card run, so no review or flawless clear
  // below also completes a daily quest (those pay their own 5; see quests.test.ts).
  // Three lessons spend 9 of 20, so every earning below is visible under the cap.
  const SPENT = Array.from({ length: 3 }, (unused, i) => started(`s${i}`, "concept", EARN_DAY, `12:0${i}`));

  it("pays 3 for every review drill cleared, first clear or not", () => {
    const once = [...SPENT, cleared("r1", "review", EARN_DAY, { time: "12:05" })];
    const twice = [...once, cleared("r1", "review", EARN_DAY, { time: "12:06" })];
    expect(chargeAt(once, at(EARN_DAY, "12:10"))).toBe(14);
    expect(chargeAt(twice, at(EARN_DAY, "12:10"))).toBe(17);
  });

  it("pays a flawless review drill its 3 and not the lesson bonus on top", () => {
    const journal = [...SPENT, cleared("r1", "review", EARN_DAY, { time: "12:05", flawless: true })];
    expect(chargeAt(journal, at(EARN_DAY, "12:10"))).toBe(14);
  });

  it("pays 2 for a flawless lesson, on a replay too, and nothing for one with a miss", () => {
    const first = [...SPENT, cleared("s0", "concept", EARN_DAY, { time: "12:05", flawless: true })];
    const replay = [...first, started("s0", "concept", EARN_DAY, "12:06"), cleared("s0", "concept", EARN_DAY, { time: "12:07", flawless: true })];
    const missed = [...SPENT, cleared("s0", "concept", EARN_DAY, { time: "12:05" })];
    expect(chargeAt(first, at(EARN_DAY, "12:10"))).toBe(13);
    // The replay costs 3 to enter and returns 2: no farm.
    expect(chargeAt(replay, at(EARN_DAY, "12:10"))).toBe(12);
    expect(chargeAt(missed, at(EARN_DAY, "12:10"))).toBe(11);
  });

  it("pays nothing for a flawless clear of a free kind, which would mint charge with no entry price", () => {
    for (const kind of ["tutorial", "intro"] as const) {
      const journal = [...SPENT, cleared("t1", kind, EARN_DAY, { time: "12:05", flawless: true })];
      expect(chargeAt(journal, at(EARN_DAY, "12:10"))).toBe(11);
    }
  });
});
