/**
 * What each plan would see on a lesson, for the staff viewer's plan toggle.
 *
 * A PREVIEW, NEVER AN ENTITLEMENT. Nothing here reads or writes progress,
 * billing, the journal or the server, and adminViewer.test.ts reads this
 * file's imports to keep it that way. Real access is decided server side
 * (RLS and the billing Edge Functions), not by this table.
 *
 * PROVISIONAL RULE, owner to confirm. From the 17 Oct evening brief: "Unit 1
 * always free; quizzes always open." Unit 0 (Start here) is free as well,
 * because it is the onboarding course. Everything else is drawn as Pro only.
 */

export type PlanView = "free" | "pro";

export type PlanAccess = "open" | "pro-only";

/** The fields of a lesson the rule reads: its id, its unit, and the map's role and kind. */
export interface PlanLesson {
  readonly id: string;
  readonly unitId: string;
  readonly kind: string;
  readonly role?: string;
}

const FREE_UNITS: ReadonlySet<string> = new Set(["u0", "u1"]);

// A section test-out ("u3-s2-test", "u3-unit-test") or a unit checkpoint ("u3-check").
const QUIZ_ID = /-(s\d+-test|unit-test|check)$/;

export function planAccess(lesson: PlanLesson, plan: PlanView): PlanAccess {
  if (plan === "pro") return "open";
  if (FREE_UNITS.has(lesson.unitId)) return "open";
  if (lesson.role === "quiz" || lesson.kind === "gate" || QUIZ_ID.test(lesson.id)) return "open";
  return "pro-only";
}
