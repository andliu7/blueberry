/**
 * "Draw it": a produce-style beat where the student draws the structure
 * (the product, the cation, the starting diene) instead of picking it.
 *
 * WHY A BEAT OF ITS OWN. Picking a product from three drawn options is
 * recognition; drawing it from a blank canvas is retrieval plus generation,
 * which is the layer the course exam asks for (Justin Sung, scratchpad
 * justin-sung.md: make the student produce, not recognise). The MCQ cannot
 * grow into this, so it is a new pool item kind with its own surface.
 *
 * DATA ONLY HERE. Every value is written by a script with RDKit
 * (scripts/u1_pools_ab.py, scripts/u1_pools_cd.py): `answer.smiles` is the RDKit
 * canonical SMILES and `answer.inchi` the standard InChI of the same molecule.
 * Nothing in this file imports Ketcher; the editor is lazy-loaded by the view.
 */
import type { ConceptId, MasteryLevel } from "../types";
import type { McqVisual } from "../mcq/mcqFigures";
import type { Figure } from "../../onboarding/figures";

export interface DrawAnswer {
  /** RDKit canonical SMILES of the expected structure. */
  readonly smiles: string;
  /** Standard InChI of the same molecule, from RDKit. Grading compares against this. */
  readonly inchi: string;
  /** Its name, shown under the drawn answer after a miss. */
  readonly name: string;
  /** The expected structure drawn, for the tray after a miss. */
  readonly figure: Figure;
}

export interface DrawBeat {
  readonly kind: "draw";
  readonly id: string;
  readonly node: string;
  readonly conceptIds: readonly ConceptId[];
  readonly levels: readonly MasteryLevel[];
  /** The one heading on the screen, coach voice, no question mark. */
  readonly prompt: string;
  /** One line under the prompt: what to watch for. */
  readonly brief?: string;
  /** What the student starts from: the reactants and the conditions. */
  readonly visual: McqVisual;
  readonly answer: DrawAnswer;
  /**
   * Whether wedges and E/Z count. False for every item today: the lesson asks
   * for connectivity, and a drawn double bond always has a geometry the
   * student did not mean as an answer (see grade.ts).
   */
  readonly stereo: boolean;
  /** Shown on a right answer: why this is the structure. */
  readonly why: string;
  /** Shown on a miss, before the why: the one thing to look at. */
  readonly lookAt: string;
}
