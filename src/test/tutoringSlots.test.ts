import { describe, expect, it } from "vitest";
import {
  blocksSlot,
  hoursFromRules,
  openSlots,
  overlaps,
  rulesFromHours,
  wallToInstant,
  type AvailabilityRule,
} from "@/lib/tutoring/slots";

/**
 * Open hours and the double-booking guard, as the database has them
 * (tutor_open_slots, tutor_bookings_no_overlap). Proven on the database itself
 * by supabase/rls-tests/tutoring.sql.
 */

const at = (iso: string) => new Date(iso);
const hour = (iso: string) => ({ start: at(iso), end: new Date(at(iso).getTime() + 3_600_000) });
const NY = "America/New_York";

describe("the double-booking guard", () => {
  it("blocks 10:00-11:00 against 10:30-11:30", () => {
    const a = { start: at("2026-11-10T15:00:00Z"), end: at("2026-11-10T16:00:00Z") };
    const b = { start: at("2026-11-10T15:30:00Z"), end: at("2026-11-10T16:30:00Z") };
    expect(overlaps(a, b)).toBe(true);
    expect(blocksSlot({ ...a, status: "booked" }, b)).toBe(true);
  });

  it("allows back to back, because the ranges are half-open", () => {
    expect(overlaps(hour("2026-11-10T15:00:00Z"), hour("2026-11-10T16:00:00Z"))).toBe(false);
  });

  it("frees the hour when a booking is cancelled, but not for a no-show", () => {
    const h = hour("2026-11-10T15:00:00Z");
    expect(blocksSlot({ ...h, status: "cancelled" }, h)).toBe(false);
    expect(blocksSlot({ ...h, status: "no_show" }, h)).toBe(true);
    expect(blocksSlot({ ...h, status: "completed" }, h)).toBe(true);
  });
});

describe("open hours", () => {
  // Tuesday 2026-11-10, 14:00-17:00 New York (EST, so 19:00Z-22:00Z).
  const tuesday: AvailabilityRule[] = [{ weekday: 2, startMinute: 840, endMinute: 1020 }];
  const from = at("2026-11-09T00:00:00Z");
  const to = at("2026-11-12T00:00:00Z");
  const now = at("2026-11-01T12:00:00Z");
  const starts = (list: { start: Date }[]) => list.map((s) => s.start.toISOString());

  it("expands a weekly rule into one-hour slots in the tutor's zone", () => {
    expect(starts(openSlots(tuesday, [], [], from, to, now, NY))).toEqual([
      "2026-11-10T19:00:00.000Z",
      "2026-11-10T20:00:00.000Z",
      "2026-11-10T21:00:00.000Z",
    ]);
  });

  it("removes a booked hour and keeps a cancelled one", () => {
    const taken = [
      { ...hour("2026-11-10T19:00:00Z"), status: "booked" as const },
      { ...hour("2026-11-10T20:00:00Z"), status: "cancelled" as const },
    ];
    expect(starts(openSlots(tuesday, [], taken, from, to, now, NY))).toEqual([
      "2026-11-10T20:00:00.000Z",
      "2026-11-10T21:00:00.000Z",
    ]);
  });

  it("removes hours inside time off, including a partial overlap", () => {
    const off = [{ start: at("2026-11-10T20:30:00Z"), end: at("2026-11-10T21:15:00Z") }];
    expect(starts(openSlots(tuesday, off, [], from, to, now, NY))).toEqual(["2026-11-10T19:00:00.000Z"]);
  });

  it("drops hours that have started", () => {
    const midway = at("2026-11-10T20:00:00Z");
    expect(starts(openSlots(tuesday, [], [], from, to, midway, NY))).toEqual(["2026-11-10T21:00:00.000Z"]);
  });

  it("keeps the wall clock across the end of daylight saving", () => {
    const friday2pm: AvailabilityRule[] = [{ weekday: 5, startMinute: 840, endMinute: 900 }];
    const out = openSlots(friday2pm, [], [], at("2026-10-29T00:00:00Z"), at("2026-11-08T00:00:00Z"), at("2026-10-01T00:00:00Z"), NY);
    expect(starts(out)).toEqual(["2026-10-30T18:00:00.000Z", "2026-11-06T19:00:00.000Z"]);
  });

  it("converts a wall time on either side of the change", () => {
    expect(wallToInstant("2026-10-30", 840, NY).toISOString()).toBe("2026-10-30T18:00:00.000Z");
    expect(wallToInstant("2026-11-06", 840, NY).toISOString()).toBe("2026-11-06T19:00:00.000Z");
    expect(wallToInstant("2026-11-06", 840, "UTC").toISOString()).toBe("2026-11-06T14:00:00.000Z");
  });

  it("catches an evening rule that lands after midnight UTC", () => {
    // Monday 22:00 New York is Tuesday 03:00Z; asking from Tuesday 00:00Z still finds it.
    const mondayNight: AvailabilityRule[] = [{ weekday: 1, startMinute: 1320, endMinute: 1380 }];
    const out = openSlots(mondayNight, [], [], at("2026-11-10T00:00:00Z"), at("2026-11-11T00:00:00Z"), now, NY);
    expect(starts(out)).toEqual(["2026-11-10T03:00:00.000Z"]);
  });
});

describe("painted hours and weekly rules", () => {
  it("merges consecutive hours into one rule per run, per weekday", () => {
    const cells = [
      { weekday: 2, minute: 900 },
      { weekday: 2, minute: 840 },
      { weekday: 2, minute: 960 },
      { weekday: 2, minute: 1080 },
      { weekday: 4, minute: 600 },
      { weekday: 2, minute: 840 },
    ];
    expect(rulesFromHours(cells)).toEqual([
      { weekday: 2, startMinute: 840, endMinute: 1020 },
      { weekday: 2, startMinute: 1080, endMinute: 1140 },
      { weekday: 4, startMinute: 600, endMinute: 660 },
    ]);
  });

  it("round-trips through cells", () => {
    const rules: AvailabilityRule[] = [
      { weekday: 1, startMinute: 840, endMinute: 1080 },
      { weekday: 3, startMinute: 600, endMinute: 720 },
    ];
    expect(rulesFromHours(hoursFromRules(rules))).toEqual(rules);
  });
});
