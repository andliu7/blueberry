/**
 * The journal validator. Everything this package reads comes back out of
 * storage, and storage is a place a student can edit, so `isEconomyEvent` is the
 * boundary between JSON and the union.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy } from "../src/derive.ts";
import { isCalendarDate, isEconomyEvent, readJournal } from "../src/journal.ts";
import { at, cleared, settings, spend, started } from "./helpers.ts";

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

describe("event ids", () => {
  const event = { ...base, kind: "unit_cleared", unitId: "u1" };

  it("accepts an event with a well formed id, and one with none", () => {
    expect(isEconomyEvent({ ...event, id: "3f0c2a1e-9b7d-4c1e-8f00-1a2b3c4d5e6f" })).toBe(true);
    expect(isEconomyEvent({ ...event, id: "legacy:1a2b3c:0" })).toBe(true);
    expect(isEconomyEvent(event)).toBe(true);
  });

  it("rejects an empty id, an id over 80 characters, and an id that is not a string", () => {
    expect(isEconomyEvent({ ...event, id: "" })).toBe(false);
    expect(isEconomyEvent({ ...event, id: "a".repeat(81) })).toBe(false);
    expect(isEconomyEvent({ ...event, id: 42 })).toBe(false);
    expect(isEconomyEvent({ ...event, id: "has space" })).toBe(false);
  });

  it("derives the same snapshot from a journal with ids as from the same journal without", () => {
    const journal = [
      started("n1", "concept", "2026-08-27", "11:00"),
      cleared("n1", "concept", "2026-08-27"),
      spend("costume", 10, "2026-08-27"),
    ];
    const withIds = journal.map((e, i) => ({ ...e, id: `id-${i}` }));
    const now = at("2026-08-27", "23:00");
    expect(deriveEconomy(withIds, now)).toEqual(deriveEconomy(journal, now));
  });
});
