/**
 * Which of the six courses is actually open.
 *
 * Owner amendment of 2026-08-28: "Courses collapses, since there is one
 * course", and the other five "render greyed with an honest coming treatment,
 * never a dead end and never a broken link".
 *
 * ONE COURSE IS OPEN TODAY. Organic Chemistry II, because it is the only one
 * with an authored breakdown behind it: docs/COURSE-OUTLINE-ORGO2.md is mined
 * from the owner's real course and six real exams, and CLAUDE.md calls it "the
 * authoritative seed for exam facing content and its weighting". The other five
 * have a topic scope and no authored corpus, and shipping an empty track under
 * a real course name is the dead end the amendment forbids.
 *
 * THIS IS NOT AN ENTITLEMENT AND MUST NEVER BECOME ONE. It says what content
 * exists, not what a student has paid for. Anything that gates access is
 * enforced server side per CLAUDE.md's non-negotiables; a constant in the
 * bundle is a suggestion. When Organic Chemistry I is authored, this list grows
 * by one string and every surface that reads it follows.
 */

import type { CourseId } from "@blueberry/curriculum";

export const OPEN_COURSE_IDS: readonly CourseId[] = Object.freeze(["orgo_2"]);

export function isCourseOpen(course: CourseId): boolean {
  return OPEN_COURSE_IDS.includes(course);
}

/**
 * What a closed course says about itself, one line each.
 *
 * The voice is CLAUDE.md's: name what is true, do not apologise, and make the
 * next step obvious. "Coming soon" is the sentence this file exists to avoid,
 * because it tells a student nothing about whether to wait.
 */
// A2 round 4: student copy, not build notes. The old lines said "scoped",
// "authored" and "the engine", which are our words for our process.
export const COURSE_COMING: Record<CourseId, string> = {
  gen_chem_1: "Not open yet. Its stoichiometry and gas law problems already show up in the placement quiz.",
  gen_chem_2: "Not open yet. Kinetics and equilibrium come after General Chemistry I.",
  orgo_1: "Opening next. Its lessons are being written now.",
  orgo_2: "Open.",
  dat: "A review track across the content courses. It opens once more than one course is open.",
  mcat: "A review track, like the DAT one. It opens once its courses are open.",
};
