import { describe, expect, it } from "vitest";
import { Calendar, addMonths, monthGrid, nextRange, sameDay } from "../../components/ui/calendar";
import { buildFunnel, buildToday, capFunnel, dailyCounts, periodDays, presetPeriod, previousPeriod, returningUsers, sampleView, termStart } from "../admin/adminHomeLive";
import { sampleAdminHome } from "../admin/adminHomeData";
import { moveTask, step, SEED_TASKS } from "../admin/TaskBoard";

const now = new Date(2026, 9, 29, 15, 0);
const iso = (d: Date) => d.toISOString();

describe("period", () => {
  it("presets cover the right number of days", () => {
    expect(periodDays(presetPeriod("today", now))).toBe(1);
    expect(periodDays(presetPeriod("7", now))).toBe(7);
    expect(periodDays(presetPeriod("30", now))).toBe(30);
  });
  it("the previous period is as long and ends the day before", () => {
    const p = presetPeriod("7", now);
    const q = previousPeriod(p);
    expect(periodDays(q)).toBe(7);
    expect(sameDay(new Date(q.to.getFullYear(), q.to.getMonth(), q.to.getDate() + 1), p.from)).toBe(true);
  });
  it("the term starts on the latest term date that has passed", () => {
    expect(termStart(now)).toEqual(new Date(2026, 7, 24));
    expect(termStart(new Date(2026, 1, 3))).toEqual(new Date(2026, 0, 12));
  });
});

describe("live builders", () => {
  it("counts per day and ignores times outside the period", () => {
    const p = presetPeriod("7", now);
    const t = [iso(new Date(2026, 9, 29, 9)), iso(new Date(2026, 9, 29, 10)), iso(new Date(2026, 9, 22, 9)), iso(new Date(2026, 8, 1))];
    const c = dailyCounts(t, p);
    expect(c).toHaveLength(7);
    expect(c[6]).toBe(2);
    expect(c.reduce((a, b) => a + b, 0)).toBe(2);
  });
  it("the funnel never grows", () => {
    expect(capFunnel([10, 12, 5, 7])).toEqual([10, 10, 5, 5]);
    const f = buildFunnel({ visits: null, signups: 10, started: 8, finished: 12, returned: 3, paid: null }, { visits: null, signups: 5, started: 4, finished: 2, returned: 1, paid: null });
    expect(f.map((s) => s.id)).toEqual(["signed", "l1start", "l1done", "day2"]);
    expect(f[2]!.count).toBeLessThanOrEqual(f[1]!.count);
  });
  it("today counts people active in the last 15 minutes", () => {
    const ev = [
      { user_id: "a", kind: "node_started", at: iso(new Date(2026, 9, 29, 14, 55)) },
      { user_id: "b", kind: "node_cleared", at: iso(new Date(2026, 9, 29, 9, 0)) },
    ];
    const t = buildToday([iso(new Date(2026, 9, 29, 8))], ev, now);
    expect(t).toEqual({ learningNow: 1, signupsToday: 1, lessonsFinishedToday: 1, activeToday: 2 });
  });
  it("returning users need two different days", () => {
    const p = presetPeriod("7", now);
    const ev = [
      { user_id: "a", kind: "x", at: iso(new Date(2026, 9, 28, 9)) },
      { user_id: "a", kind: "x", at: iso(new Date(2026, 9, 29, 9)) },
      { user_id: "b", kind: "x", at: iso(new Date(2026, 9, 29, 9)) },
    ];
    expect([...returningUsers(ev, p)]).toEqual(["a"]);
  });
  it("the sample view is cut to the period and stays sample", () => {
    const v = sampleView(sampleAdminHome, presetPeriod("7", now), now);
    expect(v.signups).toHaveLength(7);
    expect(v.source).toBe("sample");
    expect(v.liveParts).toEqual([]);
  });
});

describe("calendar model", () => {
  it("clamps the 31st when moving a month", () => {
    expect(addMonths(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28));
  });
  it("draws six weeks starting on the chosen weekday", () => {
    const g = monthGrid(new Date(2026, 9, 1), 1);
    expect(g).toHaveLength(42);
    expect(g[0]!.getDay()).toBe(1);
  });
  it("a range takes a start, then an end in order, then starts again", () => {
    const a = new Date(2026, 9, 10);
    const b = new Date(2026, 9, 5);
    const r1 = nextRange({ from: null, to: null }, a);
    expect(r1).toEqual({ from: a, to: null });
    expect(nextRange(r1, b)).toEqual({ from: b, to: a });
    expect(nextRange({ from: b, to: a }, a)).toEqual({ from: a, to: null });
  });
  it("exports the component", () => expect(typeof Calendar).toBe("function"));
});

describe("task board", () => {
  it("moves a card and stops at the ends", () => {
    expect(moveTask(SEED_TASKS, "t2", "done").find((t) => t.id === "t2")!.column).toBe("done");
    expect(step("todo", -1)).toBe("todo");
    expect(step("doing", 1)).toBe("done");
  });
});
