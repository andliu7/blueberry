/**
 * A STUDENT'S SYLLABUS PLAN (STATUS C1), the light half: the type, the store
 * and the one helper the entry chunk needs.
 *
 * The student pastes their Orgo II syllabus on the lazy settings screen
 * (SyllabusSettings.tsx). What is saved is the DERIVED plan, never the pasted
 * text: which week each unit is taught, the order of units and of sections
 * inside a unit, what the course does not cover, the side quests it does
 * cover, and the exam dates. This file holds that type and a tiny store for it
 * (localStorage, blueberry.syllabus.v1).
 *
 * IN THE ENTRY CHUNK, SO IT STAYS SMALL. #/app's first open is over its byte
 * budget, so only what a student with no syllabus needs lives here: the store
 * (read on the first frame) and coveredSideQuests (testOuts.ts). The store
 * checks only the plan's shape; the full id sanitising, the week lookups and
 * the map chip are in syllabusWeeks.ts, loaded once a plan exists. An unknown
 * id in a shape-checked plan is harmless here: coveredSideQuests is only ever
 * asked about real map nodes.
 *
 * DATES are local wall-clock "YYYY-MM-DD" strings, compared as strings and
 * never passed through toISOString, which would shift a late-evening date by
 * a day (the calendar's syllabus import learned the same lesson).
 *
 * No React, no pool import, no parser.
 */

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

/** The plan if the value has its shape (version 1, the lists present), else null. syllabusWeeks.ts sanitises the ids. */
function shapeOf(value: unknown): SyllabusPlan | null {
  const plan = value as SyllabusPlan | null;
  const lists = plan !== null && typeof plan === "object" ? [plan.weeks, plan.unitOrder, plan.notCovered, plan.sideQuests, plan.exams] : [];
  return plan !== null && typeof plan === "object" && plan.version === 1 && lists.every(Array.isArray) ? plan : null;
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
        plan = raw === null ? null : shapeOf(JSON.parse(raw));
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
  return new Set(plan.sideQuests.filter((id) => typeof id === "string" && !plan.notCovered.includes(id)));
}
