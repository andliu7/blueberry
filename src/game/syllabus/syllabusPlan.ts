/**
 * A STUDENT'S SYLLABUS PLAN (STATUS C1): the type, the store and the side
 * quest rule.
 *
 * The student pastes their Orgo II syllabus on the lazy settings screen
 * (SyllabusSettings.tsx). What is saved is the DERIVED plan, never the pasted
 * text: which week each unit is taught, the order of units and of sections
 * inside a unit, what the course does not cover, the side quests it does
 * cover, and the exam dates. This file holds that type and a tiny store for it
 * (localStorage, blueberry.syllabus.v1).
 *
 * NOT IN THE ENTRY CHUNK. #/app's first open is over its byte budget, so
 * nothing on first open imports this file. The map learns that a plan exists
 * from useSyllabusMap.ts, which reads the storage key and listens for
 * SYLLABUS_EVENT (fired by every save) and only then loads this file through
 * syllabusStart.ts. The side quest rule reaches the section tests and unit
 * exams through syllabusTests.ts (loaded by the lazy test-out run), and the
 * checkpoint mix through beats/template.ts (lazy too). The store checks only
 * the plan's shape; the full id sanitising and the week lookups are in
 * syllabusWeeks.ts.
 *
 * DATES are local wall-clock "YYYY-MM-DD" strings, compared as strings and
 * never passed through toISOString, which would shift a late-evening date by
 * a day (the calendar's syllabus import learned the same lesson).
 *
 * No React, no pool import, no parser.
 */
import { PATHWAY_UNITS, type PathwayNode, type PathwayUnit } from "../demo/pathwayMap";
import { prerequisitesOf } from "../tabs/pathway/pathwayState";
import { unitSections } from "../tabs/pathway/testOuts";

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
  /**
   * The first day of Week 1, set by hand when the syllabus numbers its weeks
   * but gives no dates. Undated weeks then start 7 days apart from it. Absent
   * on plans saved before it existed.
   */
  readonly termStart?: string | null;
}

export const SYLLABUS_KEY = "blueberry.syllabus.v1";
/** Fired on window by every save, so the map (useSyllabusMap.ts) knows without importing this file. */
export const SYLLABUS_EVENT = "blueberry:syllabus";

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
      if (typeof window !== "undefined") window.dispatchEvent(new Event(SYLLABUS_EVENT));
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

/**
 * The section a side quest belongs to: the latest section holding one of its
 * prerequisites (a prerequisite that is itself a side quest is followed back
 * to the main line). The last section when nothing places it.
 */
export function branchSection(unit: PathwayUnit, node: PathwayNode, seen: ReadonlySet<string> = new Set()): number {
  const sections = unitSections(unit);
  let found = 0;
  for (const id of prerequisitesOf(unit, node)) {
    const holder = sections.find((section) => section.sources.includes(id) || section.lights.includes(id));
    const before = unit.nodes.find((entry) => entry.id === id);
    const at = holder !== undefined ? holder.number : before !== undefined && before.kind === "branch" && !seen.has(id) ? branchSection(unit, before, new Set([...seen, node.id])) : 0;
    found = Math.max(found, at);
  }
  return found === 0 ? (sections[sections.length - 1]?.number ?? 1) : found;
}

/**
 * Side quests that count on the section tests, unit exams and unit
 * checkpoints: the syllabus covers them. A side quest the student marked not
 * covered, or whose unit or section they marked not covered, does not count.
 * Empty with no plan.
 */
export function coveredSideQuests(plan: SyllabusPlan | null = syllabusStore.getSnapshot()): ReadonlySet<string> {
  if (plan === null) return new Set();
  const off = new Set(plan.notCovered);
  return new Set(
    plan.sideQuests.filter((id) => {
      if (typeof id !== "string" || off.has(id)) return false;
      const unit = PATHWAY_UNITS.find((entry) => entry.nodes.some((node) => node.id === id));
      const node = unit?.nodes.find((entry) => entry.id === id);
      return unit !== undefined && node !== undefined && !off.has(unit.id) && !off.has(sectionKey(unit.id, branchSection(unit, node)));
    }),
  );
}
