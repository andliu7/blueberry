/**
 * The seed corpus.
 *
 * The counts are NOT written here. `corpusShape()` at the bottom derives them
 * from the corpus itself, because the previous header carried a literal count
 * that went stale the first time a wave was authored, which is the same failure
 * CLAUDE.md's Tier 1 section warns about for the cause count. A number in a
 * comment is a number nobody updates.
 *
 * WHAT THIS CORPUS IS FOR. It is the thing the checkers run against. A checker
 * with no authored data behind it is a set of functions nobody has ever pointed
 * at real chemistry, and every mistake in one shows up as a fixture that will not
 * load rather than as a wrong mark in front of a student. Importing this module
 * runs every constructor in the package over every problem, which means a broken
 * checker is a corpus that will not import. That is deliberate.
 *
 * WHAT IS SEEDED AND WHAT IS NOT. The weighting follows
 * `docs/COURSE-OUTLINE-ORGO2.md`, which is the authoritative structure for the
 * flagship course, and the depth follows its Act 0 and Act 1 sections because
 * that is where the pathway opens. Act 0 is the spine: spectroscopy, degrees of
 * unsaturation, NMR, structure determination, and the pKa material every exam
 * opens on. Act 1 is the entry chain of alcohols, ethers and epoxides, then
 * allylic and diene chemistry, the Diels-Alder, aromaticity, phenol acidity and
 * electrophilic aromatic substitution with its directing effects.
 *
 * Acts 2 and 3 are deliberately absent, along with Organic Chemistry I as a
 * course. Both are later waves against the same outline, reviewed at the same
 * human gate as other authored copy. The General Chemistry files here predate
 * the outline and are kept as they are: the outline mines mistake patterns from
 * an Organic Chemistry II record and has none to offer a gas law problem, so
 * growing those topics from it would be authoring distractors from nothing.
 *
 * TWO THINGS THIS CORPUS DELIBERATELY DOES NOT COVER.
 *
 * There is no structure problem with stereochemistry in it, because
 * answers/structure.ts compares constitution only and problem.ts refuses to build
 * one. That gap is named in both of those files and it closes when canonical
 * comparison through Indigo is wired on the lazy editor route.
 *
 * There is no problem carrying `stereoLabels`. The prochirality topic is the one
 * that needs them, it is Act 2, and the outline records a schema question still
 * open on it: the reverse task direction needs a label keyed by resulting
 * configuration rather than only per face. Authoring against a field whose shape
 * is unsettled would produce problems that have to be rewritten, and a ProblemId
 * is stable forever once attempted.
 */

import type { Problem } from "../problem.js";
import { ACID_BASE_PROBLEMS } from "./acidBase.js";
import { ALCOHOL_ETHER_EPOXIDE_PROBLEMS } from "./alcoholsEthersEpoxides.js";
import { AROMATIC_PROBLEMS } from "./aromatics.js";
import { DIENE_PROBLEMS } from "./dienes.js";
import { GAS_LAW_PROBLEMS } from "./gasLaws.js";
import { MATCHING_PROBLEMS } from "./matching.js";
import { NMR_PROBLEMS } from "./nmr.js";
import { ORDERING_PROBLEMS } from "./ordering.js";
import { ORGANIC_PROBLEMS } from "./organic.js";
import { PKA_PROBLEMS } from "./pkaAcidity.js";
import { SPECTROSCOPY_PROBLEMS } from "./spectroscopy.js";
import { SPINE_PROBLEMS } from "./spine.js";
import { STOICHIOMETRY_PROBLEMS } from "./stoichiometry.js";

export const SEED_CORPUS: readonly Problem[] = Object.freeze([
  // General Chemistry, predating the Organic Chemistry II outline.
  ...GAS_LAW_PROBLEMS,
  ...STOICHIOMETRY_PROBLEMS,
  ...ACID_BASE_PROBLEMS,
  // Act 0, the spine.
  ...SPECTROSCOPY_PROBLEMS,
  ...NMR_PROBLEMS,
  ...PKA_PROBLEMS,
  ...SPINE_PROBLEMS,
  // Act 1, in the delivered order: the alcohol chain, then the pi systems, then
  // the ring.
  ...ALCOHOL_ETHER_EPOXIDE_PROBLEMS,
  ...DIENE_PROBLEMS,
  ...AROMATIC_PROBLEMS,
  // Mixed course, authored before the outline landed.
  ...ORGANIC_PROBLEMS,
  // The lesson beats that are not arrow pushing, grouped by answer kind while
  // both kinds are new. Both files say why in their headers.
  ...ORDERING_PROBLEMS,
  ...MATCHING_PROBLEMS,
]);

export {
  ACID_BASE_PROBLEMS,
  ALCOHOL_ETHER_EPOXIDE_PROBLEMS,
  AROMATIC_PROBLEMS,
  DIENE_PROBLEMS,
  GAS_LAW_PROBLEMS,
  MATCHING_PROBLEMS,
  NMR_PROBLEMS,
  ORDERING_PROBLEMS,
  ORGANIC_PROBLEMS,
  PKA_PROBLEMS,
  SPECTROSCOPY_PROBLEMS,
  SPINE_PROBLEMS,
  STOICHIOMETRY_PROBLEMS,
};

/** Throws on an unknown id, because a missing problem is a defect in the caller. */
export function problemById(id: string): Problem {
  const problem = SEED_CORPUS.find((candidate) => candidate.id === id);
  if (problem === undefined) {
    throw new Error(`No problem with id ${id} in the seed corpus`);
  }
  return problem;
}

export interface CorpusShape {
  readonly problems: number;
  readonly topics: number;
  readonly courses: number;
  readonly answerKinds: number;
}

/**
 * The corpus's own size, derived rather than declared.
 *
 * This exists so a header, a report, or a reader can state the shape of the
 * corpus without anybody maintaining a literal. The validator computes its own
 * numbers independently and is not replaced by this.
 */
export function corpusShape(): CorpusShape {
  return Object.freeze({
    problems: SEED_CORPUS.length,
    topics: new Set(SEED_CORPUS.map((problem) => problem.topic)).size,
    courses: new Set(SEED_CORPUS.map((problem) => problem.course)).size,
    answerKinds: new Set(SEED_CORPUS.map((problem) => problem.answer.kind)).size,
  });
}
