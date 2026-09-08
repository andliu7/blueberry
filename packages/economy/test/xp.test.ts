/**
 * XP, row by row, through the derivation rather than through the constants.
 *
 * Most of these pin the daily goal to "serious" (35 XP) first, so that a single
 * award under 35 does not also trip the +10 daily goal bonus and make the
 * assertion about two rules at once. The goal bonus has its own tests below.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy } from "../src/derive.ts";
import type { EconomyEvent } from "../src/journal.ts";
import { at, cleared, settings, TZ } from "./helpers.ts";

const DAY = "2026-08-27";
const NOW = at(DAY, "20:00");
const SERIOUS: EconomyEvent = settings(DAY, { dailyGoal: "serious" });

function xpOf(events: readonly EconomyEvent[]): number {
  return deriveEconomy([SERIOUS, ...events], NOW).xp.total;
}

describe("XP per node kind", () => {
  it("pays a concept node first clear 10", () => {
    expect(xpOf([cleared("n1", "concept", DAY)])).toBe(10);
  });

  it("pays a reaction node first clear 15", () => {
    expect(xpOf([cleared("n1", "reaction", DAY)])).toBe(15);
  });

  it("pays a branch node first clear 20", () => {
    expect(xpOf([cleared("n1", "branch", DAY)])).toBe(20);
  });

  it("pays a tutorial and an intro node at the concept rate, free entry notwithstanding", () => {
    expect(xpOf([cleared("t1", "tutorial", DAY)])).toBe(10);
    expect(xpOf([cleared("i1", "intro", DAY)])).toBe(10);
  });

  it("pays a flawless clear 5 on top, once, on the first clear", () => {
    expect(xpOf([cleared("n1", "reaction", DAY, { flawless: true })])).toBe(20);
  });

  it("pays 3 per step past the first when a sequence is done in one sitting", () => {
    expect(xpOf([cleared("n1", "reaction", DAY, { stepsInOneSitting: 4 })])).toBe(15 + 9);
  });
});

describe("XP for the things that are not nodes", () => {
  it("pays a unit quiz pass 30, and 20 more when it is flawless", () => {
    const pass: EconomyEvent = { kind: "quiz_passed", at: at(DAY), tz: TZ, unitId: "u1", flawless: false };
    const flawless: EconomyEvent = { ...pass, flawless: true };
    // A 30 XP day already clears the 35 goal only when flawless, so the flawless
    // case carries the +10 goal bonus too: 30 + 20 + 10.
    expect(xpOf([pass])).toBe(30);
    expect(xpOf([flawless])).toBe(60);
  });

  it("pays a resonance find 8, and pays it once per node however often it is found", () => {
    const find: EconomyEvent = { kind: "resonance_found", at: at(DAY), tz: TZ, nodeId: "n1" };
    expect(xpOf([find])).toBe(8);
    expect(xpOf([find, { ...find, at: at(DAY, "13:00") }])).toBe(8);
    expect(xpOf([find, { kind: "resonance_found", at: at(DAY, "13:00"), tz: TZ, nodeId: "n2" }])).toBe(16);
  });
});

describe("replays and review drills", () => {
  it("pays a replay of an already cleared node 5, not the first clear award", () => {
    const first = cleared("n1", "reaction", DAY, { time: "09:00" });
    const again = cleared("n1", "reaction", DAY, { time: "10:00" });
    expect(xpOf([first, again])).toBe(15 + 5);
  });

  it("pays no flawless or one sitting bonus on a replay", () => {
    const first = cleared("n1", "reaction", DAY, { time: "09:00" });
    const again = cleared("n1", "reaction", DAY, { time: "10:00", flawless: true, stepsInOneSitting: 5 });
    expect(xpOf([first, again])).toBe(15 + 5);
  });

  it("pays a review drill 12 on every clear, because re-practice is the repeatable earner", () => {
    const one = cleared("r1", "review", DAY, { time: "09:00" });
    const two = cleared("r1", "review", DAY, { time: "10:00" });
    expect(xpOf([one])).toBe(12);
    expect(xpOf([one, two])).toBe(24);
  });
});

describe("the daily goal", () => {
  it("holds the four tiers and reports the one in force", () => {
    const casual = deriveEconomy([settings(DAY, { dailyGoal: "casual" })], NOW);
    expect(casual.xp.goalTier).toBe("casual");
    expect(casual.xp.goalXp).toBe(10);
    expect(deriveEconomy([settings(DAY, { dailyGoal: "exam" })], NOW).xp.goalXp).toBe(60);
  });

  it("defaults to regular for a student who never picked one", () => {
    const snapshot = deriveEconomy([cleared("n1", "concept", DAY)], NOW);
    expect(snapshot.xp.goalTier).toBe("regular");
    expect(snapshot.xp.goalXp).toBe(20);
    expect(snapshot.xp.goalMet).toBe(false);
  });

  it("pays 10 once when the goal is met, and reports today separately from the total", () => {
    const journal = [settings(DAY, { dailyGoal: "casual" }), cleared("n1", "concept", DAY)];
    const snapshot = deriveEconomy(journal, NOW);
    expect(snapshot.xp.goalMet).toBe(true);
    expect(snapshot.xp.today).toBe(20);
    expect(snapshot.xp.total).toBe(20);
  });

  it("does not pay the goal bonus twice on a day that doubles the goal", () => {
    const journal = [
      settings(DAY, { dailyGoal: "casual" }),
      cleared("n1", "concept", DAY, { time: "09:00" }),
      cleared("n2", "concept", DAY, { time: "10:00" }),
      cleared("n3", "concept", DAY, { time: "11:00" }),
    ];
    expect(deriveEconomy(journal, NOW).xp.total).toBe(40);
  });

  it("pays the bonus per day, so two goal days pay it twice", () => {
    const journal = [
      settings("2026-08-26", { dailyGoal: "casual" }),
      cleared("n1", "concept", "2026-08-26"),
      cleared("n2", "concept", DAY),
    ];
    expect(deriveEconomy(journal, NOW).xp.total).toBe(40);
  });

  it("counts today's XP against the goal without counting the bonus toward it", () => {
    // 10 base against a 20 goal is not met, even though 10 plus a bonus would be.
    const journal = [cleared("n1", "concept", DAY)];
    const snapshot = deriveEconomy(journal, NOW);
    expect(snapshot.xp.goalMet).toBe(false);
    expect(snapshot.xp.today).toBe(10);
  });

  it("never pays a goal bonus on a day with no XP at all", () => {
    expect(deriveEconomy([settings(DAY, { dailyGoal: "casual" })], NOW).xp.total).toBe(0);
  });
});

describe("an empty journal", () => {
  it("derives zeroes rather than throwing", () => {
    const snapshot = deriveEconomy([], NOW);
    expect(snapshot.xp.total).toBe(0);
    expect(snapshot.diamonds.balance).toBe(0);
    expect(snapshot.streak.current).toBe(0);
    expect(snapshot.mastery.score).toBe(0);
    expect(snapshot.charge.current).toBe(30);
  });
});
