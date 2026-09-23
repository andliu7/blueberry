/**
 * The Diels-Alder [4+2]: three arrows in one cycle, one barrier, no intermediate.
 *
 * Node u1-da on demo/pathwayMap.ts. Authored as a single-step TRAINER_REACTIONS
 * entry rather than a sequence because the chemistry is ONE elementary step;
 * splitting it into two would teach the exact mistake the course outline records
 * against this topic ("Concerted mechanism drawn stepwise",
 * documentation/COURSE-OUTLINE-ORGO2.md section 5, Act 1 weighting table, the
 * `diene_addition` plus `diels_alder` row).
 *
 * WHERE EVERY STRUCTURE CAME FROM. All of it is src/data/reactions.ts, entry
 * `diels-alder`, quoted field by field. Nothing here is recalled.
 *
 *   reactants          ["C=CC=C", "C=CC=O"]        buta-1,3-diene and acrolein
 *   reactant_labels    ["buta-1,3-diene", "acrolein"]
 *   reactant_formulas  ["C4H6", "C3H4O"]           both reproduced below
 *   product            "O=CC1CC=CCC1"
 *   product_label      "cyclohex-3-ene-1-carbaldehyde"
 *   product_formula    "C7H10O"                    reproduced by the `to` state
 *   reaction_type      "cycloaddition"
 *   stages[0].conditions.temperature_c  100
 *   stages[0].conditions.notes          the two claims the briefs make, verbatim
 *                      in substance: one concerted step with no intermediate;
 *                      the EWG lowers the dienophile LUMO toward the diene HOMO;
 *                      the diene must reach s-cis or nothing happens at all
 *   intermediates      []                          which is the whole point
 *
 * The atom count is a derived check, not a claim: the `from` state carries
 * C4H6 plus C3H4O and the `to` state carries C7H10O, which is exactly the pair
 * of formula fields above. If an atom were dropped while editing, that stops
 * matching.
 *
 * WHAT IS DELIBERATELY SIMPLIFIED.
 *
 *  - NO STEREOCHEMISTRY IS DRAWN, so the endo rule is not asserted here. The
 *    registry's product SMILES carries no stereodescriptors, and the course
 *    outline's `diels_alder` topic lists "suprafacial, cis relationships
 *    preserved, endo versus exo" as its own line item. A flat canvas that
 *    cannot show a face would have to assert endo from recall, so it does not
 *    mention it. The node's blurb still names it, and it wants its own beat.
 *
 *  - THE DIENE IS DRAWN ALREADY IN s-cis. The conformational lockout is a real
 *    exam item ("s-cis lockout ignored" is the first mistake pattern in that
 *    same outline row) and it is a question about a DIFFERENT substrate, not
 *    an arrow a student pushes. Drawing butadiene s-trans and asking for a
 *    rotation would put a non-electron-flow move inside an arrow exercise.
 *
 *  - BUTADIENE IS SYMMETRIC, AND THE GRADER IS NOT. da1 and da4 are the same
 *    carbon by chemistry and different ids to tabs/trainer/equivalence.ts,
 *    whose rule compares neighbour IDS and so deliberately cannot see a
 *    two-ended symmetry. A student who runs the cycle the other way round
 *    reaches the same product and grades wrong. That is a known and documented
 *    limit of the equivalence rule rather than a fault in this entry, and the
 *    layout below is what keeps it rare: the dienophile sits under the diene
 *    with dp1 beneath da1 and dp2 beneath da4, so the short forming bonds are
 *    the obvious pair and the crossed pair are the long diagonals.
 */

import {
  createArrow,
  createAtom,
  createBond,
  createSpecies,
  createState,
  createStep,
  fromBond,
  toBondBetween,
  type MechanismStep,
} from "@blueberry/chem-core";
import type { LayoutHints } from "../render/layout/layout";
import type { TrainerReaction } from "./reactions";

/* ---------------- species ---------------- */

/**
 * Buta-1,3-diene, from `reactants[0]` "C=CC=C", laid out s-cis.
 *
 * da1 and da4 are the termini that form the two new sigma bonds; da2 and da3
 * carry the single bond that becomes the product's alkene.
 */
const diene = createSpecies({
  id: "sp-da-diene",
  atoms: [
    createAtom({ id: "da1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "da2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "da3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "da4", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "b-da12", a: "da1", b: "da2", order: 2 }),
    createBond({ id: "b-da23", a: "da2", b: "da3" }),
    createBond({ id: "b-da34", a: "da3", b: "da4", order: 2 }),
  ],
});

/**
 * Acrolein, from `reactants[1]` "C=CC=O" and `reactant_labels[1]`.
 *
 * dpc and dpo are the CHO: the electron-withdrawing group the registry's
 * conditions note credits with lowering the dienophile LUMO. It is a spectator
 * to the arrows and the reason the reaction runs, so it is drawn and not
 * pushed.
 */
const dienophile = createSpecies({
  id: "sp-da-dienophile",
  atoms: [
    createAtom({ id: "dp1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dp2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "dpc", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "dpo", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-dp12", a: "dp1", b: "dp2", order: 2 }),
    createBond({ id: "b-dp2c", a: "dp2", b: "dpc" }),
    createBond({ id: "b-dpco", a: "dpc", b: "dpo", order: 2 }),
  ],
});

/**
 * Cyclohex-3-ene-1-carbaldehyde, from `product` "O=CC1CC=CCC1" and
 * `product_label`.
 *
 * Numbering the ring from dp2, which carries the CHO, gives dp2 = C1,
 * da4 = C2, da3 = C3, da2 = C4: the alkene sits between C3 and C4, which is
 * what "cyclohex-3-ene" names. C7H10O, matching `product_formula`.
 */
const adduct = createSpecies({
  id: "sp-da-adduct",
  atoms: [
    createAtom({ id: "da1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "da2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "da3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "da4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dp1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dp2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "dpc", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "dpo", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-da12", a: "da1", b: "da2" }),
    createBond({ id: "b-da23", a: "da2", b: "da3", order: 2 }),
    createBond({ id: "b-da34", a: "da3", b: "da4" }),
    createBond({ id: "b-da4dp2", a: "da4", b: "dp2" }),
    createBond({ id: "b-dp12", a: "dp1", b: "dp2" }),
    createBond({ id: "b-dp1da1", a: "dp1", b: "da1" }),
    createBond({ id: "b-dp2c", a: "dp2", b: "dpc" }),
    createBond({ id: "b-dpco", a: "dpc", b: "dpo", order: 2 }),
  ],
});

/* ---------------- the one step ---------------- */

/**
 * Three arrows, head to tail around the six-membered ring they build.
 *
 * Each one shares its pivot atom with the bond it feeds, which is the
 * adjacency rule chem-core's legality.ts states and lists "any pericyclic
 * step" under. No charge appears anywhere in the step, because nothing is ever
 * separated: that is the difference between this and the ionic diene chemistry
 * one node to the left.
 */
const DIELS_ALDER_STEP: MechanismStep = createStep({
  id: "diels-alder-cycloaddition",
  from: createState({
    id: "da-before",
    members: [
      { species: diene, role: "substrate" },
      { species: dienophile, role: "substrate" },
    ],
  }),
  to: createState({ id: "da-after", members: [{ species: adduct, role: "product" }] }),
  identity: {
    elementaryStep: "pericyclic_step",
    route: "pericyclic",
    reactionCenters: ["da1", "da4", "dp1", "dp2"],
  },
  arrows: [
    // The diene's left pi bond swings onto the dienophile: new sigma da1-dp1.
    createArrow({ id: "a-da-left", source: fromBond("b-da12"), sink: toBondBetween("dp1", "da1") }),
    // The dienophile's pi bond swings onto the diene's other terminus: new
    // sigma da4-dp2. This is the arrow that closes the ring.
    createArrow({ id: "a-da-dienophile", source: fromBond("b-dp12"), sink: toBondBetween("da4", "dp2") }),
    // The diene's right pi bond slides into the old C2-C3 single bond, which is
    // where the product's alkene ends up.
    createArrow({ id: "a-da-right", source: fromBond("b-da34"), sink: toBondBetween("da2", "da3") }),
  ],
});

/* ---------------- layout ---------------- */

/**
 * Before: the diene is the s-cis U on top, the dienophile the short C=C under
 * it. One unit is one bond, the same scale forks/gilman.ts uses. The two
 * forming bonds are the short near-vertical gaps at the outside; the crossed
 * pairing that would give the same product by the mirror cycle is the long
 * diagonal, which is what makes the intended answer the one a finger reaches.
 */
const DA_FROM_HINTS: LayoutHints = {
  da1: { x: -1.0, y: 0.0 },
  da2: { x: -0.5, y: 0.87 },
  da3: { x: 0.5, y: 0.87 },
  da4: { x: 1.0, y: 0.0 },
  dp1: { x: -0.5, y: -1.1 },
  dp2: { x: 0.5, y: -1.1 },
  dpc: { x: 1.37, y: -1.6 },
  dpo: { x: 2.24, y: -2.1 },
};

/** After: the same six atoms as a hexagon, CHO hanging off dp2. */
const DA_TO_HINTS: LayoutHints = {
  da1: { x: -1.0, y: -0.55 },
  da2: { x: -0.5, y: 0.32 },
  da3: { x: 0.5, y: 0.32 },
  da4: { x: 1.0, y: -0.55 },
  dp2: { x: 0.5, y: -1.42 },
  dp1: { x: -0.5, y: -1.42 },
  dpc: { x: 1.37, y: -1.92 },
  dpo: { x: 2.24, y: -2.42 },
};

/* ---------------- the entry ---------------- */

export const DIELS_ALDER_REACTIONS: readonly TrainerReaction[] = [
  {
    id: "diels-alder",
    title: "Diels-Alder cycloaddition",
    brief:
      "An s-cis diene meets a dienophile carrying an aldehyde. Close the ring in one move: three arrows, head to tail, no intermediate.",
    prompt: "Push the whole cycle at once. Two new sigma bonds and one new pi bond, in one step.",
    hint: "Start on a pi bond, not on a lone pair",
    successLine:
      // The frontier-orbital claim is spelled out rather than written as HOMO
      // and LUMO because test/answerSheet.test.ts keeps all-caps words out of
      // every sheet-visible line and its allowlist is a fixed set of real
      // acronyms. Spelling them out says exactly the same thing.
      "One concerted step and no intermediate: the two new sigma bonds and the new alkene all arrive together, giving cyclohex-3-ene-1-carbaldehyde. The aldehyde is why it runs at all, pulling the dienophile's lowest empty orbital down toward the diene's highest filled one, and the s-cis shape is why it can: a diene locked s-trans does nothing here at any temperature.",
    step: DIELS_ALDER_STEP,
    fromHints: DA_FROM_HINTS,
    toHints: DA_TO_HINTS,
  },
];
