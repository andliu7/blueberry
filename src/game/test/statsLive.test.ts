import { describe, expect, it } from "vitest";
import { attemptsByUnit, bestJoinTime, deviceShare, firstPerSession, medianDaysToFirstLesson, monthlySignups, retentionAt, sessionsByHour, signupSeries } from "../admin/statsLive";

const now = new Date(2026, 9, 29, 15, 0);
const iso = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).toISOString();

describe("stats builders", () => {
  it("counts sign-ups per day and the 30 days before", () => {
    const r = signupSeries([iso(2026, 9, 29), iso(2026, 9, 29, 9), iso(2026, 9, 1), iso(2026, 8, 15)], now);
    expect(r.series).toHaveLength(30);
    expect(r.series[29]!.value).toBe(2);
    expect(r.series.reduce((a, p) => a + p.value, 0)).toBe(3);
    expect(r.previous).toBe(1);
  });
  it("finds the best join hour and weekday, and null when empty", () => {
    expect(bestJoinTime([])).toBeNull();
    expect(bestJoinTime([iso(2026, 9, 25, 21), iso(2026, 9, 25, 21), iso(2026, 9, 26, 9)])).toEqual({ hour: 21, weekday: "Sunday" });
  });
  it("median days to first lesson ignores learners who never started", () => {
    const profiles = [
      { id: "a", created_at: iso(2026, 9, 1) },
      { id: "b", created_at: iso(2026, 9, 1) },
      { id: "c", created_at: iso(2026, 9, 1) },
    ];
    const ev = [
      { user_id: "a", kind: "node_started", at: iso(2026, 9, 2) },
      { user_id: "b", kind: "node_started", at: iso(2026, 9, 4) },
    ];
    expect(medianDaysToFirstLesson(profiles, ev)).toBe(2);
    expect(medianDaysToFirstLesson(profiles, [])).toBeNull();
  });
  it("retention only measures learners old enough", () => {
    const profiles = [
      { id: "old", created_at: iso(2026, 9, 1) },
      { id: "new", created_at: iso(2026, 9, 29) },
    ];
    const ev = [{ user_id: "old", kind: "x", at: iso(2026, 9, 10) }];
    expect(retentionAt(profiles, ev, 7, now)).toBe(1);
    expect(retentionAt([{ id: "new", created_at: iso(2026, 9, 29) }], ev, 7, now)).toBeNull();
  });
  it("counts a session once and splits devices", () => {
    const rows = [
      { session_id: "s1", device: "phone", occurred_at: iso(2026, 9, 29, 9) },
      { session_id: "s1", device: "phone", occurred_at: iso(2026, 9, 29, 10) },
      { session_id: "s2", device: "desktop", occurred_at: iso(2026, 9, 29, 14) },
      { session_id: "s3", device: null, occurred_at: iso(2026, 9, 29, 14) },
    ];
    const s = firstPerSession(rows);
    expect(s).toHaveLength(3);
    expect(deviceShare(s)).toEqual({ mobile: 0.5, desktop: 0.5 });
    expect(deviceShare([])).toBeNull();
    const h = sessionsByHour(s, true, now);
    expect(h[0]![9]).toBe(1);
    expect(h[0]!.reduce((a, b) => a + b, 0)).toBe(1);
  });
  it("groups attempts by unit and reports no change when there is no earlier data", () => {
    const r = attemptsByUnit([{ at: iso(2026, 9, 28), nodeId: null }], now);
    expect(r.periods[0]!.total).toBe(1);
    expect(r.periods[0]!.deltaPercent).toBeNull();
    expect(r.units).toEqual([]);
  });
  it("sums sign-ups by month for one year", () => {
    const m = monthlySignups([iso(2026, 0, 5), iso(2026, 0, 6), iso(2025, 0, 6)], 2026);
    expect(m[0]).toBe(2);
    expect(m.reduce((a, b) => a + b, 0)).toBe(2);
  });
});
