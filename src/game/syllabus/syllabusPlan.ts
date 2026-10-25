/**
 * A STUDENT'S SYLLABUS PLAN (STATUS C1), the light half.
 *
 * The student pastes their Orgo II syllabus on the lazy settings screen
 * (SyllabusSettings.tsx). What is saved is the DERIVED plan, never the pasted
 * text: which week each unit is taught, the order of units and of sections
 * inside a unit, what the course does not cover, the side quests it does
 * cover, and the exam dates. This file holds that type, a tiny store for it
 * (localStorage, blueberry.syllabus.v1) and the helpers the map reads.
 *
 * Pure and light: no React, no pool import, no parser. The pathway reads this
 * on its first frame, so it is in the entry chunk; everything heavy lives in
 * the lazy files beside it.
 *
 * DATES are local wall-clock "YYYY-MM-DD" strings, compared as strings and
 * never passed through toISOString, which would shift a late-evening date by
 * a day (the calendar's syllabus import learned the same lesson).
 */
import { PATHWAY_UNITS } from "../demo/pathwayMap";

export interface SyllabusWeek {
  readonly week: number;
  /** The earliest date the syllabus gives inside this week, or null. */
  readonly start: string | null;
  readonly unitIds: readonly string[];
}

export interface SyllabusExam {
  readonly date: string | null;
  readonly title: string;
  /** The units taught since the previous exam, plus any the exam line names. */
  readonly unitIds: readonly string[];
}

export interface SyllabusPlan {
  readonly version: 1;
  readonly updatedAt: number;
  readonly weeks: readonly SyllabusWeek[];
  /** The units the syllabus teaches, in its order. A unit not here is not on the syllabus. */
  readonly unitOrder: readonly string[];
  /** Section numbers per unit, in the order "next up" walks them. */
  readonly sectionOrder: Readonly<Record<string, readonly number[]>>;
  /** Unit ids, section keys ("u3/s2") and node ids the student marked not covered. */
  readonly notCovered: readonly string[];
  /** Side quest (branch) ids the syllabus covers: these count on quizzes and exams. */
  readonly sideQuests: readonly string[];
  readonly exams: readonly SyllabusExam[];
}

export const SYLLABUS_KEY = "blueberry.syllabus.v1";

export function sectionKey(unitId: string, section: number): string {
  return `${unitId}/s${section}`;
}

/* ------------------------------------------------------------------ */
/* Sanitise: a hand-edited or stale store keeps known ids only          */
/* ------------------------------------------------------------------ */

let knownIds: { units: Set<string>; nodes: Set<string>; branches: Set<string> } | null = null;
function known() {
  if (knownIds === null) {
    knownIds = { units: new Set(), nodes: new Set(), branches: new Set() };
    for (const unit of PATHWAY_UNITS) {
      knownIds.units.add(unit.id);
      for (const node of unit.nodes) {
        knownIds.nodes.add(node.id);
        if (node.kind === "branch") knownIds.branches.add(node.id);
      }
    }
  }
  return knownIds;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
const unique = <T,>(items: readonly T[]): T[] => [...new Set(items)];

/** The plan, or null when the value is not one. Unknown ids are dropped. */
export function sanitisePlan(value: unknown): SyllabusPlan | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) return null;
  const { units, nodes, branches } = known();
  const unitIds = (list: unknown) => unique(strings(list).filter((id) => units.has(id)));
  const sectionOrder: Record<string, number[]> = {};
  if (typeof raw.sectionOrder === "object" && raw.sectionOrder !== null) {
    for (const [unitId, list] of Object.entries(raw.sectionOrder as Record<string, unknown>)) {
      if (!units.has(unitId) || !Array.isArray(list)) continue;
      sectionOrder[unitId] = unique(list.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 50));
    }
  }
  const weeks = (Array.isArray(raw.weeks) ? raw.weeks : []).flatMap((entry: unknown): SyllabusWeek[] => {
    const week = entry as Record<string, unknown> | null;
    if (week === null || typeof week !== "object" || !Number.isInteger(week.week)) return [];
    const start = typeof week.start === "string" && DATE.test(week.start) ? week.start : null;
    return [{ week: week.week as number, start, unitIds: unitIds(week.unitIds) }];
  });
  const exams = (Array.isArray(raw.exams) ? raw.exams : []).flatMap((entry: unknown): SyllabusExam[] => {
    const exam = entry as Record<string, unknown> | null;
    if (exam === null || typeof exam !== "object" || typeof exam.title !== "string") return [];
    const date = typeof exam.date === "string" && DATE.test(exam.date) ? exam.date : null;
    return [{ date, title: exam.title.slice(0, 60), unitIds: unitIds(exam.unitIds) }];
  });
  return {
    version: 1,
    updatedAt: typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
    weeks,
    unitOrder: unitIds(raw.unitOrder),
    sectionOrder,
    notCovered: unique(strings(raw.notCovered).filter((id) => units.has(id) || nodes.has(id) || /^u\d+\/s\d+$/.test(id))),
    sideQuests: unique(strings(raw.sideQuests).filter((id) => branches.has(id))),
    exams,
  };
}

/* ------------------------------------------------------------------ */
/* The store, read with useSyncExternalStore                            */
/* ------------------------------------------------------------------ */

export interface SyllabusStore {
  subscribe(listener: () => void): () => void;
  /** The saved plan, or null. The same object until the stored value changes. */
  getSnapshot(): SyllabusPlan | null;
  /** When the plan was last saved, or 0. Sync compares it with the account row. */
  savedAt(): number;
  /** Saves a plan, stamped now unless `at` is given. Null clears it. */
  replace(plan: SyllabusPlan | null, at?: number): void;
}

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

export function createSyllabusStore(storage: () => Storage | undefined): SyllabusStore {
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; plan: SyllabusPlan | null } = { raw: null, plan: null };
  const read = (): string | null => {
    try {
      return storage()?.getItem(SYLLABUS_KEY) ?? null;
    } catch {
      return null;
    }
  };
  const snapshot = () => {
    const raw = read();
    if (raw !== cache.raw) {
      let plan: SyllabusPlan | null = null;
      try {
        plan = raw === null ? null : sanitisePlan(JSON.parse(raw));
      } catch {
        plan = null;
      }
      cache = { raw, plan };
    }
    return cache.plan;
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: snapshot,
    savedAt: () => snapshot()?.updatedAt ?? 0,
    replace(plan, at) {
      try {
        if (plan === null) storage()?.removeItem(SYLLABUS_KEY);
        else storage()?.setItem(SYLLABUS_KEY, JSON.stringify({ ...plan, updatedAt: at ?? Date.now() }));
      } catch {
        /* storage blocked: the plan lasts until the page closes, below */
      }
      // Blocked storage still shows the plan this session.
      if (read() === null) cache = { raw: null, plan: plan === null ? null : { ...plan, updatedAt: at ?? Date.now() } };
      for (const listener of listeners) listener();
    },
  };
}

export const syllabusStore: SyllabusStore = createSyllabusStore(() => {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
});

/* ------------------------------------------------------------------ */
/* What the map and the tests read                                      */
/* ------------------------------------------------------------------ */

/** Today as a local "YYYY-MM-DD". */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Side quests that count on quizzes and exams: the syllabus covers them. Empty with no plan. */
export function coveredSideQuests(plan: SyllabusPlan | null = syllabusStore.getSnapshot()): ReadonlySet<string> {
  if (plan === null) return new Set();
  return new Set(plan.sideQuests.filter((id) => !plan.notCovered.includes(id)));
}

/** True when the plan teaches this unit: it is in the order and not marked not covered. */
export function unitCovered(plan: SyllabusPlan, unitId: string): boolean {
  return plan.unitOrder.includes(unitId) && !plan.notCovered.includes(unitId);
}

/** The first syllabus week that teaches the unit, or null. */
export function weekOfUnit(plan: SyllabusPlan, unitId: string): number | null {
  return plan.weeks.find((week) => week.unitIds.includes(unitId))?.week ?? null;
}

/** The week the date falls in: the last week starting on or before it, or null with no dates. */
export function weekOnDate(plan: SyllabusPlan, today: string): number | null {
  let found: number | null = null;
  for (const week of plan.weeks) if (week.start !== null && week.start <= today) found = week.week;
  return found;
}

/** The next exam on or after today, or null. */
export function upcomingExam(plan: SyllabusPlan, today: string): SyllabusExam | null {
  return plan.exams.filter((exam) => exam.date !== null && exam.date >= today).sort((a, b) => (a.date! < b.date! ? -1 : 1))[0] ?? null;
}

/**
 * The units "next up" looks in, in order: this week's units, then every unit
 * after them in the syllabus order. With no dated weeks, the syllabus order
 * from the top. Units marked not covered are left out.
 */
export function syllabusTarget(plan: SyllabusPlan, today: string): readonly string[] {
  const order = plan.unitOrder.filter((id) => !plan.notCovered.includes(id));
  const week = weekOnDate(plan, today);
  if (week === null) return order;
  const thisWeek = plan.weeks.find((entry) => entry.week === week)?.unitIds.filter((id) => order.includes(id)) ?? [];
  const from = thisWeek.length === 0 ? -1 : Math.min(...thisWeek.map((id) => order.indexOf(id)));
  const later = order.filter((id, at) => at > from && !thisWeek.includes(id) && (weekOfUnit(plan, id) ?? Infinity) >= week);
  return [...thisWeek, ...later];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-14" as "Oct 14". */
export function shortDate(date: string): string {
  return `${MONTHS[Number(date.slice(5, 7)) - 1] ?? ""} ${Number(date.slice(8, 10))}`;
}

/**
 * The chip a unit's page wears on the map, or null with no plan. Never a
 * lock: a unit off the syllabus is still playable, and the chip says only
 * where it sits in the student's course.
 */
export function weekChip(plan: SyllabusPlan | null, unitId: string, today: string, unitDone: boolean): { readonly text: string; readonly tone: "primary" | "muted" | "warn" } | null {
  if (plan === null) return null;
  if (!unitCovered(plan, unitId)) return { text: "Not on your syllabus", tone: "muted" };
  const week = weekOfUnit(plan, unitId);
  const now = weekOnDate(plan, today);
  const exam = upcomingExam(plan, today);
  const parts: string[] = [];
  if (week !== null) parts.push(!unitDone && now !== null && week < now ? `Catch up: Week ${week}` : `Week ${week}`);
  if (exam !== null && exam.unitIds.includes(unitId)) parts.push(`Before ${exam.title}, ${shortDate(exam.date!)}`);
  if (parts.length === 0) return null;
  return { text: parts.join(" · "), tone: parts[0]!.startsWith("Catch up") ? "warn" : "primary" };
}
