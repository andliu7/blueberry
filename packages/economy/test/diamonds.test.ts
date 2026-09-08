/**
 * Diamonds. The rule that matters most here is the anti-abuse one: "First-clear
 * flags live server side keyed by (user, node). Replays earn zero, silently."
 *
 * WHY EVERY JOURNAL BELOW OPENS WITH FILLER. Mastery pays 125 diamonds a rank,
 * and Mastery is a fraction whose denominator is every node the student has
 * UNLOCKED. A test journal that unlocks four nodes and clears four nodes is a
 * student at 100 percent mastery, so it would collect four rank awards and every
 * assertion here would be about two systems at once. The filler is a hundred
 * unlocked, uncleared tutorial nodes: a realistic pathway, and a denominator big
 * enough that a handful of clears leaves the student a Reader. Tutorial nodes
 * cost no charge, so the filler does not disturb the meter either.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy } from "../src/derive.ts";
import type { EconomyEvent } from "../src/journal.ts";
import { at, cleared, settings, spend, started, TZ } from "./helpers.ts";

const DAY = "2026-08-27";
const NOW = at(DAY, "20:00");

function filler(date: string, count = 100): readonly EconomyEvent[] {
  return Array.from({ length: count }, (unused, i) => started(`filler-${i}`, "tutorial", date, "00:10"));
}

const FILLER = filler(DAY);

function balance(events: readonly EconomyEvent[]): number {
  return deriveEconomy([...FILLER, ...events], NOW).diamonds.balance;
}

describe("earning", () => {
  it("pays a node first clear 10", () => {
    expect(balance([cleared("n1", "concept", DAY)])).toBe(10);
  });

  it("pays a spine node 5 more than a branch node, which is how the map does the weighting", () => {
    expect(balance([cleared("n1", "reaction", DAY, { spine: true })])).toBe(15);
    expect(balance([cleared("n1", "reaction", DAY, { spine: false })])).toBe(10);
  });

  it("pays a flawless clear 5 more", () => {
    expect(balance([cleared("n1", "reaction", DAY, { flawless: true, spine: true })])).toBe(20);
  });

  it("pays 5 per step past the first in one sitting", () => {
    expect(balance([cleared("n1", "reaction", DAY, { stepsInOneSitting: 3 })])).toBe(20);
  });

  it("pays a resonance find 8, once per node", () => {
    const find: EconomyEvent = { kind: "resonance_found", at: at(DAY), tz: TZ, nodeId: "n1" };
    expect(balance([find, { ...find, at: at(DAY, "14:00") }])).toBe(8);
  });

  it("pays a unit clear 50 and a boss 200", () => {
    expect(balance([{ kind: "unit_cleared", at: at(DAY), tz: TZ, unitId: "u1" }])).toBe(50);
    expect(balance([{ kind: "boss_cleared", at: at(DAY), tz: TZ, bossId: "b1" }])).toBe(200);
  });

  it("pays a review drill 5, on every clear", () => {
    const one = cleared("r1", "review", DAY, { time: "09:00" });
    const two = cleared("r1", "review", DAY, { time: "10:00" });
    expect(balance([one, two])).toBe(10);
  });

  it("pays nothing for a unit quiz pass on its own: the unit clear is the celebration", () => {
    const pass: EconomyEvent = { kind: "quiz_passed", at: at(DAY), tz: TZ, unitId: "u1", flawless: true };
    expect(balance([pass])).toBe(0);
  });
});

describe("first clears, and only first clears", () => {
  it("pays a replay of a cleared node exactly nothing", () => {
    const first = cleared("n1", "reaction", DAY, { time: "09:00", spine: true, flawless: true });
    const again = cleared("n1", "reaction", DAY, { time: "10:00", spine: true, flawless: true });
    expect(balance([first])).toBe(20);
    expect(balance([first, again])).toBe(20);
  });

  it("does not pay a second time however many times the node is ground", () => {
    const events: EconomyEvent[] = [cleared("n1", "concept", DAY, { time: "08:00" })];
    for (let i = 1; i < 20; i += 1) {
      events.push(cleared("n1", "concept", DAY, { time: `${String(8 + (i % 12)).padStart(2, "0")}:30` }));
    }
    expect(balance(events)).toBe(10);
  });

  it("records every first cleared node id in firstClears", () => {
    const snapshot = deriveEconomy(
      [cleared("n1", "concept", DAY, { time: "09:00" }), cleared("n2", "reaction", DAY, { time: "10:00" })],
      NOW,
    );
    expect(snapshot.firstClears).toEqual({ n1: true, n2: true });
  });
});

describe("spending", () => {
  it("subtracts a spend from the balance and reports earned and spent separately", () => {
    const journal = [...FILLER, cleared("n1", "concept", DAY, { time: "09:00" }), spend("pen_colour", 50, DAY, "10:00")];
    const snapshot = deriveEconomy(journal, NOW);
    expect(snapshot.diamonds.earned).toBe(10);
    expect(snapshot.diamonds.spent).toBe(50);
    // Not clamped. A negative balance is a journal holding a spend that was never
    // affordable, which is an incident to look at rather than a number to hide.
    expect(snapshot.diamonds.balance).toBe(-40);
  });

  it("counts a streak freeze and a charge top-up as spends like any other sink", () => {
    const journal: readonly EconomyEvent[] = [
      { kind: "boss_cleared", at: at(DAY, "09:00"), tz: TZ, bossId: "b1" },
      spend("streak_freeze", 75, DAY, "10:00"),
      spend("charge_topup", 60, DAY, "11:00"),
    ];
    expect(balance(journal)).toBe(200 - 135);
  });
});

describe("streak milestones", () => {
  function sevenDayStreak(days: number): readonly EconomyEvent[] {
    const journal: EconomyEvent[] = [settings("2026-08-01", { dailyGoal: "casual" }), ...filler("2026-08-01")];
    for (let day = 1; day <= days; day += 1) {
      const date = `2026-08-${String(day).padStart(2, "0")}`;
      journal.push(cleared(`n-${date}`, "concept", date));
    }
    return journal;
  }

  it("pays 75 the first time a milestone is reached", () => {
    const snapshot = deriveEconomy(sevenDayStreak(7), at("2026-08-07", "20:00"));
    expect(snapshot.streak.current).toBe(7);
    expect(snapshot.streak.milestoneReached).toBe(7);
    // Seven first clears at 10 each, plus the one milestone.
    expect(snapshot.diamonds.earned).toBe(70 + 75);
  });

  it("pays nothing extra for a streak that has not reached a milestone", () => {
    const snapshot = deriveEconomy(sevenDayStreak(6), at("2026-08-06", "20:00"));
    expect(snapshot.streak.current).toBe(6);
    expect(snapshot.streak.milestoneReached).toBeNull();
    expect(snapshot.diamonds.earned).toBe(60);
  });

  it("reports the milestone only on the day it is crossed, not for ever after", () => {
    const snapshot = deriveEconomy(sevenDayStreak(8), at("2026-08-08", "20:00"));
    expect(snapshot.streak.current).toBe(8);
    expect(snapshot.streak.milestoneReached).toBeNull();
    expect(snapshot.diamonds.earned).toBe(80 + 75);
  });
});
