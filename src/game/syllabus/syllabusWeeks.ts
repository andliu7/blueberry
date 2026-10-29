/**
 * The syllabus plan, read for the map (STATUS C1): the full sanitise of a
 * stored or synced plan, the week and exam lookups, the units "next up" looks
 * in, and the week chip a unit's page wears.
 *
 * Lazy: the pathway loads this only once a plan exists (PathwayTab), and the
 * syllabus screen and sync import it. A student with no syllabus never pays
 * for it on first open. Pure, no React.
 */
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { syllabusStore, todayIso, type SyllabusExam, type SyllabusPlan, type SyllabusWeek } from "./syllabusPlan";

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
    // Only when set, so a plan saved before the field existed reads back unchanged.
    ...(typeof raw.termStart === "string" && DATE.test(raw.termStart) ? { termStart: raw.termStart } : {}),
  };
}


/** The saved plan, sanitised, or null. */
export function savedPlan(): SyllabusPlan | null {
  const plan = syllabusStore.getSnapshot();
  return plan === null ? null : sanitisePlan(plan);
}

/** True when the plan teaches this unit: it is in the order and not marked not covered. */
export function unitCovered(plan: SyllabusPlan, unitId: string): boolean {
  return plan.unitOrder.includes(unitId) && !plan.notCovered.includes(unitId);
}

/** The first syllabus week that teaches the unit, or null. */
export function weekOfUnit(plan: SyllabusPlan, unitId: string): number | null {
  return plan.weeks.find((week) => week.unitIds.includes(unitId))?.week ?? null;
}

/** "2026-08-24" plus `days`, as a local "YYYY-MM-DD" (the Date constructor rolls months and years over). */
export function addDays(date: string, days: number): string {
  return todayIso(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)) + days));
}

/** When a week starts: its own date, else 7 days a week from the hand-set first day of Week 1, else null. */
export function weekStart(plan: SyllabusPlan, week: SyllabusWeek): string | null {
  if (week.start !== null) return week.start;
  return plan.termStart == null ? null : addDays(plan.termStart, 7 * (week.week - 1));
}

/**
 * The week the date falls in: the last week starting on or before it, or null
 * with no dates. A syllabus with week numbers and no dates ("Week 3:
 * Aromaticity") has none until the student sets the first day of Week 1.
 */
export function weekOnDate(plan: SyllabusPlan, today: string): number | null {
  let found: number | null = null;
  for (const week of plan.weeks) {
    const start = weekStart(plan, week);
    if (start !== null && start <= today) found = week.week;
  }
  return found;
}

/** True when the plan has weeks and at least one has no date: the screen then asks for the first day of Week 1. */
export function needsTermStart(plan: SyllabusPlan): boolean {
  return plan.weeks.some((week) => week.start === null);
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
