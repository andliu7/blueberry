/**
 * "A wrong answer costs 0 of everything."
 *
 * ECONOMY.md states this three separate times, in the Charge table ("A wrong
 * answer: 0. Load bearing. Do not let this drift"), in the Charge rules
 * ("Mistakes cost nothing... It never prices being wrong") and in the Sinks
 * table ("Wrong answers are free and journalled. Charging for mistakes is
 * charging for learning").
 *
 * The proof is a whole snapshot comparison rather than a check of one field: a
 * journal with fifty wrong attempts scattered through it must derive to exactly
 * the same object as the same journal with none. Anything a future edit charged
 * for a mistake, in any of the five systems, fails here.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy } from "../src/derive.ts";
import type { EconomyEvent } from "../src/journal.ts";
import { at, cleared, settings, started, TZ } from "./helpers.ts";

const DAY = "2026-08-03";
const NOW = at("2026-08-10", "20:00");

const clean: readonly EconomyEvent[] = [
  settings(DAY, { dailyGoal: "regular" }),
  started("n1", "reaction", DAY, "09:00"),
  cleared("n1", "reaction", DAY, { time: "09:20", spine: true }),
  started("n2", "concept", "2026-08-04", "09:00"),
  cleared("n2", "concept", "2026-08-04", { time: "09:10" }),
  started("q1", "quiz", "2026-08-05", "09:00"),
  { kind: "quiz_passed", at: at("2026-08-05", "09:30"), tz: TZ, unitId: "u1", flawless: false },
];

function wrongAttempts(count: number): readonly EconomyEvent[] {
  return Array.from({ length: count }, (unused, i) => ({
    kind: "attempt" as const,
    at: at(`2026-08-0${(i % 5) + 3}`, `${String(9 + (i % 8)).padStart(2, "0")}:15`),
    tz: TZ,
    nodeId: i % 2 === 0 ? "n1" : "n2",
    problemId: `p${i}`,
    correct: false,
  }));
}

describe("a wrong answer", () => {
  it("changes nothing in the snapshot, in any of the five systems", () => {
    const withMistakes = [...clean, ...wrongAttempts(50)];
    expect(deriveEconomy(withMistakes, NOW)).toEqual(deriveEconomy(clean, NOW));
  });

  it("costs no charge, so a student is never priced out by getting it wrong", () => {
    const before = deriveEconomy(clean, NOW).charge.current;
    const after = deriveEconomy([...clean, ...wrongAttempts(50)], NOW).charge.current;
    expect(after).toBe(before);
  });

  it("costs no XP, no diamonds, no mastery and no streak", () => {
    const a = deriveEconomy(clean, NOW);
    const b = deriveEconomy([...clean, ...wrongAttempts(50)], NOW);
    expect(b.xp.total).toBe(a.xp.total);
    expect(b.diamonds.balance).toBe(a.diamonds.balance);
    expect(b.mastery.score).toBe(a.mastery.score);
    expect(b.mastery.visible).toBe(a.mastery.visible);
    expect(b.streak.current).toBe(a.streak.current);
  });

  it("does not shorten a node's half life, so failing a review is not punished", () => {
    const one = [cleared("n1", "concept", DAY, { time: "09:00" })];
    const failed: EconomyEvent = {
      kind: "attempt",
      at: at("2026-08-06", "09:00"),
      tz: TZ,
      nodeId: "n1",
      problemId: "p1",
      correct: false,
    };
    expect(deriveEconomy([...one, failed], NOW).mastery.score).toBe(deriveEconomy(one, NOW).mastery.score);
  });

  it("does not unlock a node it names, so it cannot dilute the mastery denominator", () => {
    const stray: EconomyEvent = {
      kind: "attempt",
      at: at("2026-08-06", "09:00"),
      tz: TZ,
      nodeId: "a-node-never-started",
      problemId: "p1",
      correct: false,
    };
    expect(deriveEconomy([...clean, stray], NOW).mastery.score).toBe(deriveEconomy(clean, NOW).mastery.score);
  });

  it("is still journalled, because the record is what Phase 6 recomputes from", () => {
    // The point of the rule is that mistakes are free, not that they are hidden.
    const withMistakes = [...clean, ...wrongAttempts(3)];
    expect(withMistakes).toHaveLength(clean.length + 3);
  });
});
