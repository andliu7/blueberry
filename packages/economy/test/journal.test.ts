/**
 * The journal validator. Everything this package reads comes back out of
 * storage, and storage is a place a student can edit, so `isEconomyEvent` is the
 * boundary between JSON and the union.
 */

import { describe, expect, it } from "vitest";
import { isCalendarDate, isEconomyEvent, readJournal } from "../src/journal.ts";
import { at, cleared, settings, spend } from "./helpers.ts";

const base = { at: at("2026-08-27"), tz: "UTC" };

describe("isEconomyEvent", () => {
  it("accepts every kind the union declares", () => {
    const journal = [
      { ...base, kind: "node_started", nodeId: "n1", nodeKind: "concept" },
      cleared("n1", "concept", "2026-08-27"),
      { ...base, kind: "quiz_passed", unitId: "u1", flawless: true },
      { ...base, kind: "unit_cleared", unitId: "u1" },
      { ...base, kind: "boss_cleared", bossId: "b1" },
      { ...base, kind: "resonance_found", nodeId: "n1" },
      { ...base, kind: "attempt", nodeId: "n1", problemId: "p1", correct: false },
      spend("costume", 100, "2026-08-27"),
      { ...base, kind: "combo_bonus", charge: 4 },
      settings("2026-08-27", { dailyGoal: "serious", examDate: "2026-09-10", reminderHour: 20 }),
    ];
    for (const event of journal) expect(isEconomyEvent(event)).toBe(true);
  });

  it("rejects anything that is not an object with a real instant and a real zone", () => {
    expect(isEconomyEvent(null)).toBe(false);
    expect(isEconomyEvent("node_cleared")).toBe(false);
    expect(isEconomyEvent([])).toBe(false);
    expect(isEconomyEvent({ ...base, kind: "nonsense" })).toBe(false);
    expect(isEconomyEvent({ kind: "unit_cleared", unitId: "u1", at: "not a date", tz: "UTC" })).toBe(false);
    expect(isEconomyEvent({ kind: "unit_cleared", unitId: "u1", at: base.at, tz: "Mars/Olympus" })).toBe(false);
  });

  it("rejects a node_cleared with a difficulty off the 1 to 5 scale", () => {
    const good = cleared("n1", "concept", "2026-08-27");
    expect(isEconomyEvent({ ...good, difficulty: 0 })).toBe(false);
    expect(isEconomyEvent({ ...good, difficulty: 6 })).toBe(false);
    expect(isEconomyEvent({ ...good, difficulty: 2.5 })).toBe(false);
    expect(isEconomyEvent({ ...good, stepsInOneSitting: 0 })).toBe(false);
    expect(isEconomyEvent({ ...good, flawless: "yes" })).toBe(false);
  });

  it("rejects a spend with an unknown sink or a negative cost", () => {
    expect(isEconomyEvent({ ...base, kind: "spend", sink: "hint", cost: 10 })).toBe(false);
    expect(isEconomyEvent({ ...base, kind: "spend", sink: "costume", cost: -10 })).toBe(false);
    expect(isEconomyEvent({ ...base, kind: "spend", sink: "costume", cost: 10, ref: "bloom-labcoat" })).toBe(true);
  });

  it("rejects a settings event carrying an impossible exam date or reminder hour", () => {
    expect(isEconomyEvent({ ...base, kind: "settings", examDate: "2026-02-31" })).toBe(false);
    expect(isEconomyEvent({ ...base, kind: "settings", examDate: null })).toBe(true);
    expect(isEconomyEvent({ ...base, kind: "settings", reminderHour: 24 })).toBe(false);
    expect(isEconomyEvent({ ...base, kind: "settings", reminderHour: 0 })).toBe(true);
  });

  it("reads a stored array by dropping only what does not validate", () => {
    const stored = [cleared("n1", "concept", "2026-08-27"), { kind: "spend", sink: "hint" }, null, 7];
    expect(readJournal(stored)).toHaveLength(1);
    expect(readJournal("not an array")).toEqual([]);
  });
});

describe("isCalendarDate", () => {
  it("accepts real dates and refuses shapes that only look like dates", () => {
    expect(isCalendarDate("2026-08-27")).toBe(true);
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("2026-8-27")).toBe(false);
    expect(isCalendarDate("")).toBe(false);
  });
});
