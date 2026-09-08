/**
 * What a course is CALLED, and which of its problems are served.
 *
 * WHY THIS IS NOT IN CoursesTab.tsx. It was, and that quietly defeated the
 * lazy boundary around the whole Courses tab. Shell.tsx loads that tab with
 * React.lazy, but CourseChip, MeTab and PathwayTab each imported a name from
 * it, and a static import from three eagerly-loaded modules pins the target
 * into the entry chunk no matter what the dynamic import says. Vite had been
 * saying so on every build:
 *
 *   [INEFFECTIVE_DYNAMIC_IMPORT] src/tabs/courses/CoursesTab.tsx is
 *   dynamically imported by src/app/Shell.tsx but also statically imported by
 *   ... dynamic import will not move module into another chunk.
 *
 * Every one of those three wanted DATA, not the tab. So the data lives here,
 * in a module with no React and no component tree, and the tab is free to be
 * lazy again. CLAUDE.md's rule is that heavy imports are lazy; a boundary that
 * silently does not hold is worse than not having drawn one.
 *
 * problemsForTopic comes with them because PathwayTab already calls it, and it
 * carries the curriculum corpus that the pathway pulls in either way.
 */

import {
  SEED_CORPUS,
  type CourseId,
  type Problem,
  type TopicId,
} from "@blueberry/curriculum";

export const COURSE_LABEL: Record<CourseId, string> = {
  gen_chem_1: "General Chemistry I",
  gen_chem_2: "General Chemistry II",
  orgo_1: "Organic Chemistry I",
  orgo_2: "Organic Chemistry II",
  dat: "DAT preparation",
  mcat: "MCAT preparation",
};

/**
 * The name a course goes by in the HEADER, where 393px of row is shared with
 * two tools and three readouts.
 *
 * "Organic Chemistry II" is 20 characters and measured 138px in the display
 * face, which is more than the whole tool rail. This is the name a student
 * would say out loud anyway, so it is not a truncation of the real one, it is
 * the real one at conversational length. COURSE_LABEL stays the formal name
 * and is what the sheet, the Me tab and the course list all show.
 */
export const COURSE_SHORT: Record<CourseId, string> = {
  gen_chem_1: "Gen Chem I",
  gen_chem_2: "Gen Chem II",
  orgo_1: "Orgo I",
  orgo_2: "Orgo II",
  dat: "DAT",
  mcat: "MCAT",
};

export const COURSE_BLURB: Record<CourseId, string> = {
  gen_chem_1: "Stoichiometry, gas laws, thermochemistry, and the habits of a correct number.",
  gen_chem_2: "Kinetics, equilibrium, acids and bases, titration curves, electrochemistry.",
  orgo_1: "Structure, stereochemistry, substitution and elimination, the first mechanisms.",
  orgo_2: "Spectroscopy first, then aromatics, the acyl ladder, enolates. The flagship.",
  dat: "A review track over all four courses, weighted to what the DAT asks.",
  mcat: "The same review, weighted to the MCAT's chemistry and biochemistry overlap.",
};


/**
 * Question kinds a lesson serves TODAY. Owner ruling, 2026-08-26: no fill-in
 * the-blank or multiple choice for now; reactions and concept work only, at
 * the easy level, with the longer stoichiometry problems returning when the
 * full Alchemie-style stoichiometry features exist (the unit-cancellation
 * keyboard and equation surfaces in the video corpus). The authored MCQ and
 * numeric corpus stays; it is gated, not deleted.
 */
const SERVED_KINDS = new Set(["major_product", "reagents", "structure"]);

/**
 * `?serveAll=1` lifts the gate for the capture scripts and nothing else. No
 * served topic has three problems today, so the combo interstitial at three
 * in a row is unreachable through the gate by real clicks; the gated gas law
 * questions are the shortest real path to it. This widens WHICH authored
 * problems are served, never how one is graded, the same family as
 * App.tsx's ?measure flag. See measurements/capture-economy.mjs.
 */
const SERVE_ALL =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("serveAll") === "1";

export function problemsForTopic(topic: TopicId): readonly Problem[] {
  return SEED_CORPUS.filter((problem) => problem.topic === topic && (SERVE_ALL || SERVED_KINDS.has(problem.answer.kind)));
}

/**
 * The two or three characters that stand in for a course on a list row.
 *
 * WHY A MARK AT ALL. The reference course picker gives every option a big flat
 * emblem, and it does that whether or not the option is one a learner can take:
 * the grid reads as a shelf of objects and the eye lands on a shape before it
 * lands on a word. Ours was six paragraphs of text under a heading, which is a
 * settings page. A monogram is the honest local version of that flag: it is
 * this product's own mark, it needs no asset, and it says the same thing at
 * 48px that the course name says at 16.
 *
 * Not an icon per course, because the six differ by SUBJECT and not by object,
 * and six invented pictograms for "General Chemistry I" against "General
 * Chemistry II" would be six shapes a student has to learn before the list is
 * faster than the words already were.
 */
export const COURSE_MARK: Record<CourseId, string> = {
  gen_chem_1: "G1",
  gen_chem_2: "G2",
  orgo_1: "O1",
  orgo_2: "O2",
  dat: "DAT",
  mcat: "MCAT",
};
