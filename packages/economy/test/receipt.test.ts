/**
 * The receipt: the lines the reward moment animates.
 *
 * ECONOMY.md, Anti-abuse: "The client animates what the server concluded. The
 * reward moment plays from the server's receipt, never from local math." So the
 * receipt is not a second implementation of the rules. It is the difference
 * between two derivations, which is why the tests below check that its lines add
 * up to the change in the snapshot rather than checking them against a table.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, receiptFor } from "../src/derive.ts";
import type { EconomyEvent } from "../src/journal.ts";
import { at, cleared, settings, started, TZ } from "./helpers.ts";

const DAY = "2026-08-03";
const NOW = at(DAY, "20:00");

function total(lines: readonly { readonly amount: number }[]): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}

/**
 * Forty unlocked, uncleared tutorial nodes. Same reason as diamonds.test.ts: a
 * journal that unlocks only what it clears is a student measured against a
 * one node course, so every receipt would also carry a rank up and these
 * assertions would be about two systems at once.
 *
 * This used to read "a student at 100 percent mastery", and that is no longer
 * true: a caller that names no `universe` now divides by the unlocked set
 * floored at MASTERY_MIN_UNIVERSE_DIFFICULTY, so a bare first clear is 7.5 and
 * sits in Reader. The filler is still here, and still earns its place, because
 * it makes the denominator a realistic pathway rather than the floor, which is
 * what these receipts should be read against. Tutorial nodes are free, so the
 * charge meter is untouched.
 */
const FILLER: readonly EconomyEvent[] = Array.from({ length: 40 }, (unused, i) =>
  started(`filler-${i}`, "tutorial", DAY, "08:00"),
);

describe("the lines", () => {
  it("names each award on a first clear rather than handing over one number", () => {
    const event = cleared("n1", "reaction", DAY, { time: "12:00", spine: true, flawless: true, stepsInOneSitting: 3 });
    const receipt = receiptFor([settings(DAY, { dailyGoal: "serious" }), ...FILLER], event, NOW);
    expect(receipt.xp).toEqual([
      { label: "First clear", amount: 15 },
      { label: "Flawless", amount: 5 },
      { label: "One sitting", amount: 6 },
    ]);
    expect(receipt.diamonds).toEqual([
      { label: "First clear", amount: 10 },
      { label: "Spine node", amount: 5 },
      { label: "Flawless", amount: 5 },
      { label: "One sitting", amount: 10 },
    ]);
  });

  it("adds the daily goal line to the event that crossed the goal, and to no other", () => {
    const casual = settings(DAY, { dailyGoal: "casual" });
    const first = cleared("n1", "concept", DAY, { time: "12:00" });
    const second = cleared("n2", "concept", DAY, { time: "13:00" });
    const crossing = receiptFor([casual, ...FILLER], first, NOW);
    const after = receiptFor([casual, ...FILLER, first], second, NOW);
    expect(crossing.xp).toEqual([
      { label: "First clear", amount: 10 },
      { label: "Daily goal", amount: 10 },
    ]);
    expect(after.xp).toEqual([{ label: "First clear", amount: 10 }]);
  });

  it("hands a replay an empty diamond list, which is what earning zero looks like", () => {
    const first = cleared("n1", "concept", DAY, { time: "12:00" });
    const replay = cleared("n1", "concept", DAY, { time: "13:00" });
    const receipt = receiptFor([settings(DAY, { dailyGoal: "serious" }), ...FILLER, first], replay, NOW);
    expect(receipt.diamonds).toEqual([]);
    expect(receipt.xp).toEqual([{ label: "Replay", amount: 5 }]);
  });

  it("reports the charge the event spent, and the charge a flawless clear gave back", () => {
    // Read minutes after the event, not hours: by 20:00 regeneration has refilled
    // the meter either way and both deltas are honestly zero.
    const soon = at(DAY, "12:25");
    const journal: readonly EconomyEvent[] = [];
    const spendEvent = started("n1", "reaction", DAY, "12:00");
    expect(receiptFor(journal, spendEvent, soon).charge.delta).toBe(-8);
    const clear = cleared("n1", "reaction", DAY, { time: "12:20", flawless: true });
    expect(receiptFor([spendEvent], clear, soon).charge.delta).toBe(3);
  });
});

describe("the streak line", () => {
  const casual = settings("2026-08-03", { dailyGoal: "casual" });

  it("says whether today counted and what the streak now stands at", () => {
    const journal = [casual, cleared("n1", "concept", "2026-08-03"), cleared("n2", "concept", "2026-08-04")];
    const event = cleared("n3", "concept", "2026-08-05", { time: "12:00" });
    const receipt = receiptFor(journal, event, at("2026-08-05", "20:00"));
    expect(receipt.streak.counted).toBe(true);
    expect(receipt.streak.current).toBe(3);
    expect(receipt.streak.savedBy).toBeUndefined();
  });

  it("says a rest day saved the streak, which is the announcement after the fact", () => {
    // Days 3, 4 and 5 counted, the 6th missed and auto covered, and this is the 7th.
    const journal = [
      casual,
      cleared("n1", "concept", "2026-08-03"),
      cleared("n2", "concept", "2026-08-04"),
      cleared("n3", "concept", "2026-08-05"),
    ];
    const event = cleared("n4", "concept", "2026-08-07", { time: "12:00" });
    const receipt = receiptFor(journal, event, at("2026-08-07", "20:00"));
    expect(receipt.streak.savedBy).toBe("rest_day");
    expect(receipt.streak.current).toBe(4);
  });

  it("carries the milestone and its diamonds on the day the milestone lands", () => {
    const journal: EconomyEvent[] = [casual];
    for (let dayNumber = 3; dayNumber <= 8; dayNumber += 1) {
      journal.push(cleared(`n${dayNumber}`, "concept", `2026-08-0${dayNumber}`));
    }
    const event = cleared("n9", "concept", "2026-08-09", { time: "12:00" });
    const receipt = receiptFor(journal, event, at("2026-08-09", "20:00"));
    expect(receipt.streak.milestone).toBe(7);
    expect(receipt.diamonds).toContainEqual({ label: "7 day streak", amount: 75 });
  });
});

describe("the mastery line", () => {
  it("reports the visible number before and after, never the model's own dip", () => {
    const unlockedOnly = Array.from({ length: 20 }, (unused, i) => started(`n${i}`, "tutorial", DAY, "09:00"));
    const event = cleared("n0", "concept", DAY, { time: "12:00" });
    const receipt = receiptFor(unlockedOnly, event, NOW);
    expect(receipt.mastery.visibleBefore).toBe(0);
    expect(receipt.mastery.visibleAfter).toBeGreaterThan(4);
    expect(receipt.mastery.rankUp).toBeNull();
  });

  it("names a rank up and pays it once", () => {
    // A fourteen node course at difficulty 3 is a denominator of 42, just clear
    // of MASTERY_MIN_UNIVERSE_DIFFICULTY. Two clears is 14 and change, inside
    // Reader; the third crosses 16 into Arrow Pusher. It takes three, because
    // the floor means no single clear can ever cross a rank on its own, which
    // is the property this file's neighbours pin.
    const universe = Array.from({ length: 14 }, (unused, i) => ({ nodeId: `n${i}`, difficulty: 3 as const }));
    const already = [cleared("n0", "concept", DAY, { time: "12:00" }), cleared("n1", "concept", DAY, { time: "12:00" })];
    expect(deriveEconomy(already, NOW, { universe }).mastery.rank).toBe("Reader");
    const event = cleared("n2", "concept", DAY, { time: "12:00" });
    const receipt = receiptFor(already, event, NOW, { universe });
    expect(receipt.mastery.rankUp).toBe("Arrow Pusher");
    expect(receipt.diamonds).toContainEqual({ label: "New rank: Arrow Pusher", amount: 125 });
  });

  it("pays a first clear on an empty journal for the clear and nothing else", () => {
    // The bug this option was added for. Before the floor, this receipt named
    // five rank ups and paid 750 diamonds for one lesson, because one node
    // cleared out of one node unlocked is 100 percent.
    const event = cleared("n0", "concept", DAY, { time: "12:00" });
    const receipt = receiptFor([], event, NOW);
    expect(receipt.mastery.rankUp).toBeNull();
    expect(receipt.diamonds).toEqual([{ label: "First clear", amount: 10 }]);
  });

  it("reads the same universe on both sides, so a rank up is never a denominator artefact", () => {
    // before is derived from `journal`, after from `journal + event`. If only one
    // side saw the course, the first clear would cross four ranks on the way in.
    const universe = Array.from({ length: 40 }, (unused, i) => ({ nodeId: `n${i}`, difficulty: 3 as const }));
    const event = cleared("n0", "concept", DAY, { time: "12:00" });
    const receipt = receiptFor([], event, NOW, { universe });
    expect(receipt.mastery.rankUp).toBeNull();
    expect(receipt.mastery.visibleBefore).toBe(0);
    // 100 * 3 / 120, less eight hours of decay. The exact number is asserted
    // against the snapshot rather than a literal, which is this file's rule.
    expect(receipt.mastery.visibleAfter).toBeGreaterThan(2);
    expect(receipt.mastery.visibleAfter).toBeLessThan(2.5);
    expect(deriveEconomy([event], NOW, { universe }).mastery.visible).toBe(receipt.mastery.visibleAfter);
  });
});

describe("the receipt adds up to what the snapshot did", () => {
  const journal: readonly EconomyEvent[] = [settings(DAY, { dailyGoal: "casual" }), started("n1", "reaction", DAY, "09:00"), ...FILLER];

  it("matches the XP, diamond and charge deltas exactly", () => {
    const event = cleared("n1", "reaction", DAY, { time: "09:20", spine: true, flawless: true });
    const before = deriveEconomy(journal, NOW);
    const after = deriveEconomy([...journal, event], NOW);
    const receipt = receiptFor(journal, event, NOW);
    expect(total(receipt.xp)).toBe(after.xp.total - before.xp.total);
    expect(total(receipt.diamonds)).toBe(after.diamonds.earned - before.diamonds.earned);
    expect(receipt.charge.delta).toBe(after.charge.current - before.charge.current);
    expect(receipt.mastery.visibleAfter).toBe(after.mastery.visible);
  });

  it("is a pure function of the same three arguments", () => {
    const event = cleared("n1", "reaction", DAY, { time: "09:20" });
    expect(receiptFor(journal, event, NOW)).toEqual(receiptFor(journal, event, NOW));
  });

  it("does not mutate the journal it was handed", () => {
    const event = cleared("n1", "reaction", DAY, { time: "09:20" });
    const copy = [...journal];
    receiptFor(journal, event, NOW);
    expect(journal).toEqual(copy);
  });
});

describe("the shape a shell can rely on", () => {
  it("carries no undefined keys on the streak line when nothing special happened", () => {
    const receipt = receiptFor([], { kind: "unit_cleared", at: at(DAY, "12:00"), tz: TZ, unitId: "u1" }, NOW);
    expect(Object.keys(receipt.streak).sort()).toEqual(["counted", "current"]);
    expect(receipt.diamonds).toEqual([{ label: "Unit cleared", amount: 50 }]);
  });
});
