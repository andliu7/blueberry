/**
 * The Lessons list's rows (#/app/admin/lessons), built the way Stripe's payments
 * list is: one row per lesson with the figures an owner scans for, a few status
 * tabs that each carry a count, and a unit filter plus a search.
 *
 * Pure: reads the lesson index and each lesson's slides, writes nothing.
 */
import { planAccess, type PlanAccess } from "./planView";
import type { LessonRow, Slide, UnitRow } from "./slides";

export interface LessonTableRow {
  readonly id: string;
  readonly title: string;
  readonly unitId: string;
  /** "Unit 3", the part of the unit title before its dot. */
  readonly unitShort: string;
  readonly unitTitle: string;
  readonly kind: string;
  readonly role?: string;
  /** What the Type column says. */
  readonly type: string;
  readonly questions: number;
  readonly drafts: number;
  /** What a Member (Free) sees: open, or the Pro lock. */
  readonly access: PlanAccess;
  readonly check: boolean;
}

export type LessonFilter = "all" | "free" | "pro" | "checks" | "drafts";

export const LESSON_FILTERS: readonly (readonly [LessonFilter, string])[] = [
  ["all", "All"],
  ["free", "Free"],
  ["pro", "Pro only"],
  ["checks", "Checkpoints"],
  ["drafts", "Has drafts"],
];

const KIND_TYPE: Readonly<Record<string, string>> = {
  spine: "Core",
  branch: "Branch",
  gate: "Checkpoint",
  boss: "Boss",
};
const ROLE_TYPE: Readonly<Record<string, string>> = {
  quiz: "Quiz",
  practice: "Practice",
  video: "Video",
};

// A section test-out or a unit checkpoint, by id, as planView reads them.
const CHECK_ID = /-(s\d+-test|unit-test|check)$/;

export function unitShort(title: string): string {
  return title.split(" · ")[0]!.trim();
}

export function lessonRow(lesson: LessonRow, unit: UnitRow, slides: readonly Slide[]): LessonTableRow {
  const roleType = lesson.role === undefined ? undefined : ROLE_TYPE[lesson.role];
  return {
    id: lesson.id,
    title: lesson.title,
    unitId: unit.unitId,
    unitShort: unitShort(unit.title),
    unitTitle: unit.title,
    kind: lesson.kind,
    ...(lesson.role === undefined ? {} : { role: lesson.role }),
    type: roleType ?? KIND_TYPE[lesson.kind] ?? lesson.kind,
    questions: slides.length,
    drafts: slides.filter((slide) => slide.draft === true).length,
    access: planAccess({ ...lesson, unitId: unit.unitId }, "free"),
    check: lesson.role === "quiz" || lesson.kind === "gate" || lesson.kind === "boss" || CHECK_ID.test(lesson.id),
  };
}

export function lessonTable(
  units: readonly UnitRow[],
  slidesFor: (id: string) => readonly Slide[],
): readonly LessonTableRow[] {
  return units.flatMap((unit) => unit.lessons.map((lesson) => lessonRow(lesson, unit, slidesFor(lesson.id))));
}

export function matchesFilter(row: LessonTableRow, filter: LessonFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "free":
      return row.access === "open";
    case "pro":
      return row.access === "pro-only";
    case "checks":
      return row.check;
    case "drafts":
      return row.drafts > 0;
  }
}

/** The unit filter and the search, before a status tab: what each tab's count is taken over. */
export function scopeRows(rows: readonly LessonTableRow[], unitId: string | null, query: string): readonly LessonTableRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (unitId === null || row.unitId === unitId) &&
      (q === "" || row.title.toLowerCase().includes(q) || row.id.toLowerCase().includes(q)),
  );
}

export function filterCounts(rows: readonly LessonTableRow[]): Readonly<Record<LessonFilter, number>> {
  const count = (filter: LessonFilter) => rows.filter((row) => matchesFilter(row, filter)).length;
  return { all: count("all"), free: count("free"), pro: count("pro"), checks: count("checks"), drafts: count("drafts") };
}
