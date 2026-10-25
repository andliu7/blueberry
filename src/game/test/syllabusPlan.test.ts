/**
 * The light half of the syllabus plan (STATUS C1): the store, sanitising what
 * it reads back, and the lookups the map makes (week, next exam, the units
 * "next up" looks in, the week chip).
 */
import { describe, expect, it } from "vitest";
import {
  SYLLABUS_KEY,
  coveredSideQuests,
  createSyllabusStore,
  sanitisePlan,
  syllabusStore,
  syllabusTarget,
  todayIso,
  upcomingExam,
  weekChip,
  weekOfUnit,
  weekOnDate,
  type SyllabusPlan,
} from "../syllabus/syllabusPlan";

function memory() {
  const map = new Map<string, string>();
  return {
    map,
    storage: { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => void map.set(key, value), removeItem: (key: string) => void map.delete(key) },
  };
}

const PLAN: SyllabusPlan = {
  version: 1,
  updatedAt: 5,
  weeks: [
    { week: 1, start: "2026-08-26", unitIds: ["u1"] },
    { week: 3, start: "2026-09-09", unitIds: ["u2"] },
    { week: 4, start: "2026-09-16", unitIds: ["u3"] },
    { week: 7, start: "2026-10-07", unitIds: ["u4"] },
    { week: 9, start: "2026-10-21", unitIds: ["u5"] },
  ],
  unitOrder: ["u1", "u2", "u3", "u4", "u5"],
  sectionOrder: { u3: [2, 1, 3] },
  notCovered: [],
  sideQuests: ["u4-benzyne"],
  exams: [
    { date: "2026-09-30", title: "Exam 1", unitIds: ["u1", "u2", "u3"] },
    { date: "2026-11-04", title: "Exam 2", unitIds: ["u4", "u5"] },
  ],
};

describe("the store", () => {
  it("is empty with no storage, and an empty plan covers no side quest", () => {
    // Node has no localStorage: the default store reads as no plan.
    expect(syllabusStore.getSnapshot()).toBeNull();
    expect(coveredSideQuests()).toEqual(new Set());
    expect(coveredSideQuests(null)).toEqual(new Set());
  });

  it("reads corrupt or foreign JSON as no plan", () => {
    const { map, storage } = memory();
    const store = createSyllabusStore(() => storage);
    for (const raw of ["{not json", "[]", "null", '{"version":2}', '"text"']) {
      map.set(SYLLABUS_KEY, raw);
      expect(store.getSnapshot(), raw).toBeNull();
    }
  });

  it("survives storage that throws", () => {
    const store = createSyllabusStore(() => ({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    }));
    expect(store.getSnapshot()).toBeNull();
    store.replace(PLAN, 9);
    // Kept for this session, though it could not be written.
    expect(store.getSnapshot()?.unitOrder).toEqual(PLAN.unitOrder);
    store.replace(null);
    expect(store.getSnapshot()).toBeNull();
  });

  it("saves, stamps, notifies, returns one object until it changes, and clears", () => {
    const { map, storage } = memory();
    const store = createSyllabusStore(() => storage);
    let calls = 0;
    const off = store.subscribe(() => (calls += 1));
    store.replace(PLAN, 42);
    expect(calls).toBe(1);
    expect(store.savedAt()).toBe(42);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
    expect(store.getSnapshot()).toEqual({ ...PLAN, updatedAt: 42 });
    store.replace(null);
    expect(map.has(SYLLABUS_KEY)).toBe(false);
    expect(store.getSnapshot()).toBeNull();
    off();
    store.replace(PLAN);
    expect(calls).toBe(2);
  });
});

describe("sanitisePlan", () => {
  it("drops unknown units, lessons, side quests and bad dates", () => {
    const plan = sanitisePlan({
      ...PLAN,
      weeks: [{ week: 1, start: "Sept 2", unitIds: ["u1", "u99"] }, { week: "x" }],
      unitOrder: ["u1", "u99", "u1", 7],
      sectionOrder: { u1: [1, 0, 2.5, 3], u99: [1] },
      notCovered: ["u3", "u3/s2", "nope", "u1-allylic"],
      // u1-allylic is a lesson, not a side quest.
      sideQuests: ["u4-benzyne", "u1-allylic", "made-up"],
      exams: [{ date: "2026-13-45x", title: "Exam 1", unitIds: ["u1", "zz"] }, { title: 4 }],
    });
    expect(plan).toEqual({
      version: 1,
      updatedAt: 5,
      weeks: [{ week: 1, start: null, unitIds: ["u1"] }],
      unitOrder: ["u1"],
      sectionOrder: { u1: [1, 3] },
      notCovered: ["u3", "u3/s2", "u1-allylic"],
      sideQuests: ["u4-benzyne"],
      exams: [{ date: null, title: "Exam 1", unitIds: ["u1"] }],
    });
  });
});

describe("lookups", () => {
  it("finds a unit's week and the week a date falls in", () => {
    expect(weekOfUnit(PLAN, "u3")).toBe(4);
    expect(weekOfUnit(PLAN, "u9")).toBeNull();
    expect(weekOnDate(PLAN, "2026-08-01")).toBeNull();
    expect(weekOnDate(PLAN, "2026-09-09")).toBe(3);
    expect(weekOnDate(PLAN, "2026-09-12")).toBe(3);
    expect(weekOnDate(PLAN, "2026-10-08")).toBe(7);
  });

  it("finds the next exam on or after a date", () => {
    expect(upcomingExam(PLAN, "2026-09-01")?.title).toBe("Exam 1");
    expect(upcomingExam(PLAN, "2026-09-30")?.title).toBe("Exam 1");
    expect(upcomingExam(PLAN, "2026-10-01")?.title).toBe("Exam 2");
    expect(upcomingExam(PLAN, "2026-12-01")).toBeNull();
  });

  it("looks in this week's units first, then the later ones in syllabus order", () => {
    expect(syllabusTarget(PLAN, "2026-09-17")).toEqual(["u3", "u4", "u5"]);
    // Before the term: no dated week yet, so the whole order.
    expect(syllabusTarget(PLAN, "2026-08-01")).toEqual(["u1", "u2", "u3", "u4", "u5"]);
    // A unit marked not covered is skipped.
    expect(syllabusTarget({ ...PLAN, notCovered: ["u4"] }, "2026-09-17")).toEqual(["u3", "u5"]);
    // No dates at all: the syllabus order from the top.
    expect(syllabusTarget({ ...PLAN, weeks: [] }, "2026-09-17")).toEqual(["u1", "u2", "u3", "u4", "u5"]);
  });

  it("writes today as a local date", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("weekChip", () => {
  it("says nothing with no plan", () => {
    expect(weekChip(null, "u1", "2026-09-01", false)).toBeNull();
  });

  it("names the week, and the exam the unit is due before", () => {
    expect(weekChip(PLAN, "u4", "2026-10-08", false)).toEqual({ text: "Week 7 · Before Exam 2, Nov 4", tone: "primary" });
    expect(weekChip(PLAN, "u3", "2026-09-17", false)).toEqual({ text: "Week 4 · Before Exam 1, Sep 30", tone: "primary" });
  });

  it("asks to catch up on an unfinished unit from an earlier week, not a finished one", () => {
    expect(weekChip(PLAN, "u2", "2026-10-08", false)).toEqual({ text: "Catch up: Week 3", tone: "warn" });
    expect(weekChip(PLAN, "u2", "2026-10-08", true)).toEqual({ text: "Week 3", tone: "primary" });
  });

  it("marks a unit off the syllabus, still without locking it", () => {
    expect(weekChip(PLAN, "u9", "2026-10-08", false)).toEqual({ text: "Not on your syllabus", tone: "muted" });
    expect(weekChip({ ...PLAN, notCovered: ["u2"] }, "u2", "2026-10-08", false)?.text).toBe("Not on your syllabus");
  });
});
