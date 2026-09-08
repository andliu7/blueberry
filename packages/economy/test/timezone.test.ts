/**
 * Local days, in the student's zone rather than the server's.
 *
 * ECONOMY.md, Anti-abuse: "Streak days are derived from attempt timestamps in
 * the user's stored timezone, so a client clock cannot manufacture one." The
 * timestamp is absolute and the zone says how to read it, so the same instant is
 * a different day for a student in Auckland and a student in Los Angeles, and
 * both are right.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy } from "../src/derive.ts";
import type { EconomyEvent } from "../src/journal.ts";
import { addDays, daysBetween, endOfLocalDayMs, isoWeekKey, localDate, localHour, monthKey, zonedWallTimeToMs } from "../src/time.ts";
import { at, cleared, settings } from "./helpers.ts";

const NY = "America/New_York";
const TOKYO = "Asia/Tokyo";

describe("reading an instant in a zone", () => {
  it("gives the same instant different local dates in different zones", () => {
    const instant = Date.parse("2026-08-04T03:30:00Z");
    expect(localDate(instant, NY)).toBe("2026-08-03");
    expect(localDate(instant, TOKYO)).toBe("2026-08-04");
    expect(localDate(instant, "UTC")).toBe("2026-08-04");
  });

  it("reads the local hour, which is what the at risk check runs on", () => {
    const instant = Date.parse("2026-08-04T03:30:00Z");
    expect(localHour(instant, NY)).toBe(23);
    expect(localHour(instant, TOKYO)).toBe(12);
  });

  it("round trips a wall clock reading back to the instant that shows it", () => {
    const ms = zonedWallTimeToMs("2026-08-03", 23, 30, 0, 0, NY);
    expect(new Date(ms).toISOString()).toBe("2026-08-04T03:30:00.000Z");
    expect(localDate(ms, NY)).toBe("2026-08-03");
  });

  it("survives the end of daylight saving, when a local day is 25 hours long", () => {
    // US daylight saving ends on 2026-11-01. The civil day is still one day.
    const end = endOfLocalDayMs("2026-11-01", NY);
    expect(localDate(end, NY)).toBe("2026-11-01");
    expect(localHour(end, NY)).toBe(23);
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
  });

  it("falls back to UTC for a zone the runtime has never heard of", () => {
    const instant = Date.parse("2026-08-04T03:30:00Z");
    expect(localDate(instant, "Mars/Olympus")).toBe("2026-08-04");
  });
});

describe("civil date arithmetic", () => {
  it("adds and subtracts whole days across a month boundary", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-08-27", "2026-09-10")).toBe(14);
  });

  it("keys ISO weeks from Monday, and calendar months from the date", () => {
    expect(isoWeekKey("2026-08-03")).toBe(isoWeekKey("2026-08-09"));
    expect(isoWeekKey("2026-08-09")).not.toBe(isoWeekKey("2026-08-10"));
    expect(monthKey("2026-08-31")).toBe("2026-08");
  });
});

describe("a day counted in the student's zone", () => {
  it("counts a late night session as that evening, not as the next morning", () => {
    // 23:30 in New York is 03:30 UTC the following day. A student who finished
    // their goal before bed did it on the day they think they did.
    const journal: readonly EconomyEvent[] = [
      settings("2026-08-03", { dailyGoal: "casual" }, "08:00", NY),
      cleared("n1", "concept", "2026-08-03", { time: "23:30", tz: NY }),
      cleared("n2", "concept", "2026-08-04", { time: "23:30", tz: NY }),
    ];
    const now = at("2026-08-04", "23:45", NY);
    const snapshot = deriveEconomy(journal, now);
    expect(snapshot.tz).toBe(NY);
    expect(snapshot.streak.current).toBe(2);
    expect(snapshot.xp.today).toBe(20);
  });

  it("would have split that session across two days had it been read in UTC", () => {
    const journal: readonly EconomyEvent[] = [
      settings("2026-08-03", { dailyGoal: "casual" }, "08:00", "UTC"),
      cleared("n1", "concept", "2026-08-03", { time: "23:30", tz: "UTC" }),
      cleared("n2", "concept", "2026-08-04", { time: "23:30", tz: "UTC" }),
    ];
    // Same wall clock readings, read in UTC: the local dates differ from the NY
    // case above, which is the whole reason the zone is stored on the event.
    const snapshot = deriveEconomy(journal, at("2026-08-04", "23:45", "UTC"));
    expect(snapshot.tz).toBe("UTC");
    expect(snapshot.streak.current).toBe(2);
  });

  it("is at risk by the student's own evening, not by the server's", () => {
    const journal: readonly EconomyEvent[] = [settings("2026-08-03", { dailyGoal: "casual" }, "08:00", TOKYO)];
    // 10:00 UTC is 19:00 in Tokyo and 06:00 in New York.
    const instant = "2026-08-03T10:00:00.000Z";
    expect(deriveEconomy(journal, instant).streak.atRisk).toBe(true);
    const western: readonly EconomyEvent[] = [settings("2026-08-03", { dailyGoal: "casual" }, "08:00", NY)];
    expect(deriveEconomy(western, instant).streak.atRisk).toBe(false);
  });
});
