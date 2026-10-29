/**
 * The lesson chain across Units 1 to 3, merged: one place to ask which lesson
 * teaches a concept and what a lesson assumes. Unit 1's own file
 * (u1/lessonLinks.ts) stays as it was; this merges it with Units 2 and 3
 * (u23/lessonLinks.ts) in path order, so a Unit 3 lesson can point back to a
 * Unit 2 or Unit 1 lesson. Entry-chunk safe, like the files it merges.
 */
import { CONCEPT_LABELS, U1_LINKS, type LessonLink } from "./u1/lessonLinks";
import { U23_LABELS, U2_LINKS, U3_LINKS } from "./u23/lessonLinks";

export const CHAIN_LINKS: Readonly<Record<string, LessonLink>> = { ...U1_LINKS, ...U2_LINKS, ...U3_LINKS };
export const CHAIN_LABELS: Readonly<Record<string, string>> = { ...CONCEPT_LABELS, ...U23_LABELS };
/** Lessons in the order the student meets them: Unit 1, then 2, then 3. */
export const CHAIN_ORDER: readonly string[] = Object.keys(CHAIN_LINKS);

/** The lesson that teaches a concept, in any of the three units, or null for a Unit 0 concept. */
export function chainTeacherOf(concept: string): string | null {
  for (const [node, link] of Object.entries(CHAIN_LINKS)) if (link.teaches.includes(concept)) return node;
  return null;
}
