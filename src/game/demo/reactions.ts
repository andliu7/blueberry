/**
 * The trainer's reaction library. Owner requirement, 2026-08-26: more reaction
 * examples, and the trainer must be replicatable for ANY reaction it is given.
 *
 * This file is the proof of that claim: a reaction here is a MechanismStep
 * built through chem-core's real constructors plus layout hints, and the
 * trainer consumes the registry as data. Adding a reaction is adding an entry;
 * no component changes. Each of the new entries deliberately matches one of
 * the downloaded Alchemie playlists (Acid Base, Carbonyl), so the parity loop
 * can judge our version of a reaction against the bar performing the same one.
 *
 * The SN2 step stays in its own module: the tutorial, the capture script and
 * three test files address it directly, and moving it would touch all of them
 * for zero behaviour.
 */

import {
  createArrow,
  createAtom,
  createBond,
  createSpecies,
  createState,
  createStep,
  fromBond,
  fromLonePair,
  toAtom,
  toBondBetween,
  type MechanismStep,
} from "@blueberry/chem-core";
import type { LayoutHints } from "../render/layout/layout";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "./sn2Step";

export interface TrainerReaction {
  readonly id: string;
  /** The picker label and the card heading. */
  readonly title: string;
  /** One line under the title: what to do, in the imperative. */
  readonly brief: string;
  /** The success card's headline, this reaction's own chemistry in one line. */
  readonly successLine: string;
  readonly step: MechanismStep;
  readonly fromHints: LayoutHints;
  readonly toHints: LayoutHints;
}

/* ------------------------------------------------------------------ */
/* Proton transfer: ammonia deprotonates hydrogen chloride.            */
/* The Acid Base playlist's opening move, and the single most common   */
/* step in the whole corpus.                                           */
/* ------------------------------------------------------------------ */

/**
 * All three hydrogens EXPLICIT, not implicit. A blind critic on the video
 * frames caught the inconsistency: HCl's hydrogen was a sphere on a stick and
 * ammonia's were floating grey letters, one element in two languages in one
 * scene. In the bar's own acid-base clips every hydrogen on an ACTOR species
 * is a real sphere; ghost glyphs are for spectator CH3 groups.
 */
const ammonia = createSpecies({
  id: "sp-ammonia",
  atoms: [
    createAtom({ id: "n1", element: "N", lonePairs: 1 }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "h4", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-nh2", a: "n1", b: "h2" }),
    createBond({ id: "b-nh3", a: "n1", b: "h3" }),
    createBond({ id: "b-nh4", a: "n1", b: "h4" }),
  ],
});

/** The acid's proton is explicit: it is the atom that MOVES. */
const hydrogenChloride = createSpecies({
  id: "sp-hcl",
  atoms: [createAtom({ id: "h1", element: "H" }), createAtom({ id: "cl1", element: "Cl", lonePairs: 3 })],
  bonds: [createBond({ id: "b-hcl", a: "h1", b: "cl1" })],
});

const ammonium = createSpecies({
  id: "sp-ammonium",
  atoms: [
    createAtom({ id: "n1", element: "N", formalCharge: 1, lonePairs: 0 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "h4", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-nh", a: "n1", b: "h1" }),
    createBond({ id: "b-nh2", a: "n1", b: "h2" }),
    createBond({ id: "b-nh3", a: "n1", b: "h3" }),
    createBond({ id: "b-nh4", a: "n1", b: "h4" }),
  ],
});

const chloride = createSpecies({
  id: "sp-chloride",
  atoms: [createAtom({ id: "cl1", element: "Cl", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const PROTON_TRANSFER: MechanismStep = createStep({
  id: "proton-transfer-nh3-hcl",
  from: createState({
    id: "pt-before",
    members: [
      { species: ammonia, role: "nucleophile" },
      { species: hydrogenChloride, role: "substrate" },
    ],
  }),
  to: createState({
    id: "pt-after",
    members: [
      { species: ammonium, role: "product" },
      { species: chloride, role: "leaving_group" },
    ],
  }),
  identity: {
    elementaryStep: "proton_transfer",
    route: "acid_base_proton_transfer",
    reactionCenters: ["h1"],
  },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("n1"), sink: toBondBetween("n1", "h1") }),
    createArrow({ id: "a-release", source: fromBond("b-hcl"), sink: toAtom("cl1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Nucleophilic addition: hydroxide attacks formaldehyde.               */
/* The Carbonyl playlist's opening move, and Unit 0's first mechanism.  */
/* ------------------------------------------------------------------ */

const hydroxideNu = createSpecies({
  id: "sp-hydroxide-nu",
  atoms: [
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh", a: "o1", b: "h1" })],
});

/**
 * The aldehyde hydrogens are explicit: they sit ON the reactive carbon, and a
 * critic caught them dematerialised as arc glyphs "on the very molecule where
 * attack-the-C-not-its-substituents matters". Ghost glyphs stay for spectator
 * CH3 groups; atoms of the electrophile itself are real.
 */
const formaldehyde = createSpecies({
  id: "sp-formaldehyde",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-ch2", a: "c1", b: "h2" }),
    createBond({ id: "b-ch3", a: "c1", b: "h3" }),
    createBond({ id: "b-co", a: "c1", b: "o2", order: 2 }),
  ],
});

const alkoxide = createSpecies({
  id: "sp-alkoxide",
  atoms: [
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "o2", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-oh", a: "o1", b: "h1" }),
    createBond({ id: "b-oc", a: "o1", b: "c1" }),
    createBond({ id: "b-ch2", a: "c1", b: "h2" }),
    createBond({ id: "b-ch3", a: "c1", b: "h3" }),
    createBond({ id: "b-co", a: "c1", b: "o2" }),
  ],
});

const CARBONYL_ADDITION: MechanismStep = createStep({
  id: "carbonyl-addition-oh-ch2o",
  from: createState({
    id: "ca-before",
    members: [
      { species: hydroxideNu, role: "nucleophile" },
      { species: formaldehyde, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ca-after",
    members: [{ species: alkoxide, role: "product" }],
  }),
  identity: {
    elementaryStep: "nucleophilic_attack",
    route: "nucleophilic_addition_carbonyl",
    reactionCenters: ["c1"],
  },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-co"), sink: toAtom("o2") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Electrophilic addition, step 1: ethene protonated by HBr.           */
/* The Addition playlist's opening move: the pi bond is the nucleophile.*/
/* ------------------------------------------------------------------ */

/**
 * PROPENE, not ethene, and the swap was forced by a real hand on the canvas.
 * With ethene the two alkene carbons are chemically identical, but grading
 * compares against the authored arrow set, so grabbing the C=C by its bottom
 * handle built the mirror-image answer and was wobbled back as wrong: the
 * owner's report, "dragging from the bottom doesn't work but the top does."
 * Propene makes the two ends genuinely different: protonating the terminal
 * CH2 gives the secondary cation (Markovnikov, correct), protonating the
 * middle carbon gives the primary cation, which is now an authored
 * distractor that teaches instead of a symmetry accident that frustrates.
 */
const propene = createSpecies({
  id: "sp-propene",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-cc", a: "c1", b: "c2", order: 2 }), createBond({ id: "b-c23", a: "c2", b: "c3" })],
});

const hydrogenBromide = createSpecies({
  id: "sp-hbr",
  atoms: [createAtom({ id: "h1", element: "H" }), createAtom({ id: "br1", element: "Br", lonePairs: 3 })],
  bonds: [createBond({ id: "b-hbr", a: "h1", b: "br1" })],
});

const isopropylCation = createSpecies({
  id: "sp-isopropyl-cation",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "c2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cc", a: "c1", b: "c2" }),
    createBond({ id: "b-ch", a: "c1", b: "h1" }),
    createBond({ id: "b-c23", a: "c2", b: "c3" }),
  ],
});

const bromide = createSpecies({
  id: "sp-bromide-add",
  atoms: [createAtom({ id: "br1", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const ALKENE_PROTONATION: MechanismStep = createStep({
  id: "alkene-protonation-hbr",
  from: createState({
    id: "ap-before",
    members: [
      { species: propene, role: "nucleophile" },
      { species: hydrogenBromide, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ap-after",
    members: [
      { species: isopropylCation, role: "product" },
      { species: bromide, role: "leaving_group" },
    ],
  }),
  identity: {
    elementaryStep: "pi_bond_attack",
    route: "electrophilic_addition_alkene",
    reactionCenters: ["c1", "c2"],
  },
  arrows: [
    createArrow({ id: "a-pi-grab", source: fromBond("b-cc"), sink: toBondBetween("c1", "h1") }),
    createArrow({ id: "a-hbr-release", source: fromBond("b-hbr"), sink: toAtom("br1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* E2 at 2-bromopropane: three arrows, one barrier. Unit 5 spine.       */
/* ------------------------------------------------------------------ */

const bromopropane = createSpecies({
  id: "sp-2-bromopropane",
  atoms: [
    // The beta hydrogen is explicit: it is the atom the base takes.
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "hb", element: "H" }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "br1", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-c1hb", a: "c1", b: "hb" }),
    createBond({ id: "b-c12", a: "c1", b: "c2" }),
    createBond({ id: "b-c23", a: "c2", b: "c3" }),
    createBond({ id: "b-c2br", a: "c2", b: "br1" }),
  ],
});

const hydroxideE2 = createSpecies({
  id: "sp-hydroxide-e2",
  atoms: [
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh", a: "o1", b: "h1" })],
});

const propeneOut = createSpecies({
  id: "sp-propene-out",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-c12", a: "c1", b: "c2", order: 2 }), createBond({ id: "b-c23", a: "c2", b: "c3" })],
});

const waterE2 = createSpecies({
  id: "sp-water-e2",
  atoms: [
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "hb", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh", a: "o1", b: "h1" }), createBond({ id: "b-ohb", a: "o1", b: "hb" })],
});

const bromideE2 = createSpecies({
  id: "sp-bromide-e2",
  atoms: [createAtom({ id: "br1", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const E2_ELIMINATION: MechanismStep = createStep({
  id: "e2-2-bromopropane",
  from: createState({
    id: "e2-before",
    members: [
      { species: hydroxideE2, role: "base" },
      { species: bromopropane, role: "substrate" },
    ],
  }),
  to: createState({
    id: "e2-after",
    members: [
      { species: propeneOut, role: "product" },
      { species: waterE2, role: "byproduct" },
      { species: bromideE2, role: "leaving_group" },
    ],
  }),
  identity: {
    elementaryStep: "concerted_elimination",
    route: "e2",
    reactionCenters: ["hb", "c2"],
  },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("o1"), sink: toBondBetween("o1", "hb") }),
    createArrow({ id: "a-pi", source: fromBond("b-c1hb"), sink: toBondBetween("c1", "c2") }),
    createArrow({ id: "a-leave", source: fromBond("b-c2br"), sink: toAtom("br1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Cyanohydrin: cyanide attacks formaldehyde. Unit 7 branch, one step.  */
/* ------------------------------------------------------------------ */

const cyanide = createSpecies({
  id: "sp-cyanide",
  atoms: [
    createAtom({ id: "c9", element: "C", formalCharge: -1, lonePairs: 1 }),
    createAtom({ id: "n1", element: "N", lonePairs: 1 }),
  ],
  bonds: [createBond({ id: "b-cn", a: "c9", b: "n1", order: 3 })],
});

const formaldehydeCy = createSpecies({
  id: "sp-formaldehyde-cy",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-ch2", a: "c1", b: "h2" }),
    createBond({ id: "b-ch3", a: "c1", b: "h3" }),
    createBond({ id: "b-co", a: "c1", b: "o1", order: 2 }),
  ],
});

const cyanoalkoxide = createSpecies({
  id: "sp-cyanoalkoxide",
  atoms: [
    createAtom({ id: "c9", element: "C" }),
    createAtom({ id: "n1", element: "N", lonePairs: 1 }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cn", a: "c9", b: "n1", order: 3 }),
    createBond({ id: "b-cc", a: "c9", b: "c1" }),
    createBond({ id: "b-ch2", a: "c1", b: "h2" }),
    createBond({ id: "b-ch3", a: "c1", b: "h3" }),
    createBond({ id: "b-co", a: "c1", b: "o1" }),
  ],
});

const CYANOHYDRIN_ATTACK: MechanismStep = createStep({
  id: "cyanohydrin-attack",
  from: createState({
    id: "cy-before",
    members: [
      { species: cyanide, role: "nucleophile" },
      { species: formaldehydeCy, role: "substrate" },
    ],
  }),
  to: createState({
    id: "cy-after",
    members: [{ species: cyanoalkoxide, role: "product" }],
  }),
  identity: {
    elementaryStep: "nucleophilic_attack",
    route: "nucleophilic_addition_carbonyl",
    reactionCenters: ["c1"],
  },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("c9"), sink: toBondBetween("c9", "c1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-co"), sink: toAtom("o1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 5 spine: Williamson ether synthesis, an SN2 wearing a new name. */
/* ------------------------------------------------------------------ */

const methoxide = createSpecies({
  id: "sp-methoxide",
  atoms: [
    createAtom({ id: "om", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "cme", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-ome", a: "om", b: "cme" })],
});

const bromomethaneW = createSpecies({
  id: "sp-bromomethane-w",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "br1", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "b-cbr", a: "c1", b: "br1" })],
});

const dimethylEther = createSpecies({
  id: "sp-dimethyl-ether",
  atoms: [
    createAtom({ id: "om", element: "O", lonePairs: 2 }),
    createAtom({ id: "cme", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-ome", a: "om", b: "cme" }), createBond({ id: "b-oc1", a: "om", b: "c1" })],
});

const bromideW = createSpecies({
  id: "sp-bromide-w",
  atoms: [createAtom({ id: "br1", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const WILLIAMSON: MechanismStep = createStep({
  id: "williamson-ether",
  from: createState({
    id: "wil-before",
    members: [
      { species: methoxide, role: "nucleophile" },
      { species: bromomethaneW, role: "substrate" },
    ],
  }),
  to: createState({
    id: "wil-after",
    members: [
      { species: dimethylEther, role: "product" },
      { species: bromideW, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "concerted_substitution", route: "sn2", reactionCenters: ["c1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("om"), sink: toBondBetween("om", "c1") }),
    createArrow({ id: "a-leave", source: fromBond("b-cbr"), sink: toAtom("br1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 5b spine: epoxide opening, both regiochemistries, taught as a  */
/* pair. Propylene oxide so the two carbons genuinely differ.          */
/* ------------------------------------------------------------------ */

const propyleneOxide = createSpecies({
  id: "sp-propylene-oxide",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1o", a: "c1", b: "o1" }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
  ],
});

const methoxideEp = createSpecies({
  id: "sp-methoxide-ep",
  atoms: [
    createAtom({ id: "om", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "cme", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-ome", a: "om", b: "cme" })],
});

const basicOpened = createSpecies({
  id: "sp-basic-opened",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "om", element: "O", lonePairs: 2 }),
    createAtom({ id: "cme", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-1om", a: "c1", b: "om" }),
    createBond({ id: "b-ome", a: "om", b: "cme" }),
  ],
});

const EPOXIDE_BASIC: MechanismStep = createStep({
  id: "epoxide-basic",
  from: createState({
    id: "epb-before",
    members: [
      { species: methoxideEp, role: "nucleophile" },
      { species: propyleneOxide, role: "substrate" },
    ],
  }),
  to: createState({ id: "epb-after", members: [{ species: basicOpened, role: "product" }] }),
  identity: { elementaryStep: "ring_opening", route: "sn2", reactionCenters: ["c1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("om"), sink: toBondBetween("om", "c1") }),
    createArrow({ id: "a-relieve", source: fromBond("b-1o"), sink: toAtom("o1") }),
  ],
});

const protonatedEpoxide = createSpecies({
  id: "sp-protonated-epoxide",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "o1", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "hp", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1o", a: "c1", b: "o1" }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-ohp", a: "o1", b: "hp" }),
  ],
});

const waterEp = createSpecies({
  id: "sp-water-ep",
  atoms: [
    createAtom({ id: "ow", element: "O", lonePairs: 2 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-ow1", a: "ow", b: "hw1" }), createBond({ id: "b-ow2", a: "ow", b: "hw2" })],
});

const acidOpened = createSpecies({
  id: "sp-acid-opened",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "hp", element: "H" }),
    createAtom({ id: "ow", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1o", a: "c1", b: "o1" }),
    createBond({ id: "b-ohp", a: "o1", b: "hp" }),
    createBond({ id: "b-2ow", a: "c2", b: "ow" }),
    createBond({ id: "b-ow1", a: "ow", b: "hw1" }),
    createBond({ id: "b-ow2", a: "ow", b: "hw2" }),
  ],
});

const EPOXIDE_ACIDIC: MechanismStep = createStep({
  id: "epoxide-acidic",
  from: createState({
    id: "epa-before",
    members: [
      { species: waterEp, role: "nucleophile" },
      { species: protonatedEpoxide, role: "substrate" },
    ],
  }),
  to: createState({ id: "epa-after", members: [{ species: acidOpened, role: "product" }] }),
  identity: { elementaryStep: "ring_opening", route: "sn1", reactionCenters: ["c2"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("ow"), sink: toBondBetween("ow", "c2") }),
    createArrow({ id: "a-relieve", source: fromBond("b-2o"), sink: toAtom("o1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 7 spine: the Grignard's methyl, drawn as the carbanion it      */
/* delivers; and the imine's first bond.                               */
/* ------------------------------------------------------------------ */

const methylCarbanion = createSpecies({
  id: "sp-methyl-carbanion",
  atoms: [createAtom({ id: "cg", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 3 })],
  bonds: [],
});

const formaldehydeG = createSpecies({
  id: "sp-formaldehyde-g",
  atoms: [
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of", order: 2 }),
  ],
});

const ethoxideOut = createSpecies({
  id: "sp-ethoxide-out",
  atoms: [
    createAtom({ id: "cg", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gc", a: "cg", b: "cf" }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of" }),
  ],
});

const GRIGNARD_METHYL: MechanismStep = createStep({
  id: "grignard-methyl",
  from: createState({
    id: "grig-before",
    members: [
      { species: methylCarbanion, role: "nucleophile" },
      { species: formaldehydeG, role: "substrate" },
    ],
  }),
  to: createState({ id: "grig-after", members: [{ species: ethoxideOut, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["cf"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("cg"), sink: toBondBetween("cg", "cf") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-cfo"), sink: toAtom("of") }),
  ],
});

const methylamine = createSpecies({
  id: "sp-methylamine",
  atoms: [
    createAtom({ id: "nm", element: "N", lonePairs: 1, implicitHydrogens: 2 }),
    createAtom({ id: "cn", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-nc", a: "nm", b: "cn" })],
});

const formaldehydeIm = createSpecies({
  id: "sp-formaldehyde-im",
  atoms: [
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of", order: 2 }),
  ],
});

const zwitterion = createSpecies({
  id: "sp-imine-zwitterion",
  atoms: [
    createAtom({ id: "nm", element: "N", formalCharge: 1, implicitHydrogens: 2 }),
    createAtom({ id: "cn", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-nc", a: "nm", b: "cn" }),
    createBond({ id: "b-nf", a: "nm", b: "cf" }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of" }),
  ],
});

const IMINE_ATTACK: MechanismStep = createStep({
  id: "imine-attack",
  from: createState({
    id: "im-before",
    members: [
      { species: methylamine, role: "nucleophile" },
      { species: formaldehydeIm, role: "substrate" },
    ],
  }),
  to: createState({ id: "im-after", members: [{ species: zwitterion, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["cf"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("nm"), sink: toBondBetween("nm", "cf") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-cfo"), sink: toAtom("of") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 7 spine: hydride reduction, the H:- that NaBH4 delivers.        */
/* ------------------------------------------------------------------ */

const hydride = createSpecies({
  id: "sp-hydride",
  atoms: [createAtom({ id: "h9", element: "H", formalCharge: -1, lonePairs: 1 })],
  bonds: [],
});

const formaldehydeH = createSpecies({
  id: "sp-formaldehyde-h",
  atoms: [
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of", order: 2 }),
  ],
});

const methoxideOut = createSpecies({
  id: "sp-methoxide-out",
  atoms: [
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "h9", element: "H" }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfh9", a: "cf", b: "h9" }),
    createBond({ id: "b-cfo", a: "cf", b: "of" }),
  ],
});

const HYDRIDE_REDUCTION: MechanismStep = createStep({
  id: "hydride-reduction",
  from: createState({
    id: "hyd-before",
    members: [
      { species: hydride, role: "nucleophile" },
      { species: formaldehydeH, role: "substrate" },
    ],
  }),
  to: createState({ id: "hyd-after", members: [{ species: methoxideOut, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "reduction", reactionCenters: ["cf"] },
  arrows: [
    createArrow({ id: "a-hydride", source: fromLonePair("h9"), sink: toBondBetween("h9", "cf") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-cfo"), sink: toAtom("of") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 9 spine: alpha-bromination through the enolate, and the        */
/* Michael addition, four arrows moving as one.                        */
/* ------------------------------------------------------------------ */

const enolateBr = createSpecies({
  id: "sp-enolate-br",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const bromine = createSpecies({
  id: "sp-bromine",
  atoms: [
    createAtom({ id: "bra", element: "Br", lonePairs: 3 }),
    createAtom({ id: "brb", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "b-brbr", a: "bra", b: "brb" })],
});

const bromoketone = createSpecies({
  id: "sp-bromoketone",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "bra", element: "Br", lonePairs: 3 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-1br", a: "c1", b: "bra" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const bromideAlpha = createSpecies({
  id: "sp-bromide-alpha",
  atoms: [createAtom({ id: "brb", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const ALPHA_BROMINATION: MechanismStep = createStep({
  id: "alpha-bromination",
  from: createState({
    id: "ab-before",
    members: [
      { species: enolateBr, role: "nucleophile" },
      { species: bromine, role: "electrophile" },
    ],
  }),
  to: createState({
    id: "ab-after",
    members: [
      { species: bromoketone, role: "product" },
      { species: bromideAlpha, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "nucleophilic_attack", route: "acid_base_proton_transfer", reactionCenters: ["c1", "bra"] },
  arrows: [
    createArrow({ id: "a-c-attacks", source: fromBond("b-12"), sink: toBondBetween("c1", "bra") }),
    createArrow({ id: "a-reform", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-brbr", source: fromBond("b-brbr"), sink: toAtom("brb") }),
  ],
});

const enolateMi = createSpecies({
  id: "sp-enolate-mi",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const acrolein = createSpecies({
  id: "sp-acrolein",
  atoms: [
    createAtom({ id: "cb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ca", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "cc", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "oa", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-ba", a: "cb", b: "ca", order: 2 }),
    createBond({ id: "b-ac", a: "ca", b: "cc" }),
    createBond({ id: "b-co", a: "cc", b: "oa", order: 2 }),
  ],
});

const michaelAdduct = createSpecies({
  id: "sp-michael-adduct",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ca", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "cc", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "oa", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1b", a: "c1", b: "cb" }),
    createBond({ id: "b-ba", a: "cb", b: "ca" }),
    createBond({ id: "b-ac", a: "ca", b: "cc", order: 2 }),
    createBond({ id: "b-co", a: "cc", b: "oa" }),
  ],
});

const MICHAEL_ADDITION: MechanismStep = createStep({
  id: "michael-addition",
  from: createState({
    id: "mi-before",
    members: [
      { species: enolateMi, role: "nucleophile" },
      { species: acrolein, role: "electrophile" },
    ],
  }),
  to: createState({ id: "mi-after", members: [{ species: michaelAdduct, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["c1", "cb"] },
  arrows: [
    createArrow({ id: "a-nu", source: fromBond("b-12"), sink: toBondBetween("c1", "cb") }),
    createArrow({ id: "a-reform", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-shift", source: fromBond("b-ba"), sink: toBondBetween("ca", "cc") }),
    createArrow({ id: "a-pi-off", source: fromBond("b-co"), sink: toAtom("oa") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 7 spine: the enamine's first bond, a 2° amine this time.        */
/* ------------------------------------------------------------------ */

const dimethylamine = createSpecies({
  id: "sp-dimethylamine",
  atoms: [
    createAtom({ id: "nm", element: "N", lonePairs: 1, implicitHydrogens: 1 }),
    createAtom({ id: "cn1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cn2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-nc1", a: "nm", b: "cn1" }), createBond({ id: "b-nc2", a: "nm", b: "cn2" })],
});

const formaldehydeEn = createSpecies({
  id: "sp-formaldehyde-en",
  atoms: [
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of", order: 2 }),
  ],
});

const enamineZwitterion = createSpecies({
  id: "sp-enamine-zwitterion",
  atoms: [
    createAtom({ id: "nm", element: "N", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "cn1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cn2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-nc1", a: "nm", b: "cn1" }),
    createBond({ id: "b-nc2", a: "nm", b: "cn2" }),
    createBond({ id: "b-nf", a: "nm", b: "cf" }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of" }),
  ],
});

const ENAMINE_ATTACK: MechanismStep = createStep({
  id: "enamine-attack",
  from: createState({
    id: "en-before",
    members: [
      { species: dimethylamine, role: "nucleophile" },
      { species: formaldehydeEn, role: "substrate" },
    ],
  }),
  to: createState({ id: "en-after", members: [{ species: enamineZwitterion, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["cf"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("nm"), sink: toBondBetween("nm", "cf") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-cfo"), sink: toAtom("of") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 9 spine: enolate alkylation, the C-C bond by SN2.               */
/* ------------------------------------------------------------------ */

const enolateAlk = createSpecies({
  id: "sp-enolate-alk",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const bromomethaneAlk = createSpecies({
  id: "sp-bromomethane-alk",
  atoms: [
    createAtom({ id: "cme", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "brm", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "b-cbr", a: "cme", b: "brm" })],
});

const butanone = createSpecies({
  id: "sp-butanone",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "cme", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-1me", a: "c1", b: "cme" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const bromideAlk = createSpecies({
  id: "sp-bromide-alk",
  atoms: [createAtom({ id: "brm", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const ENOLATE_ALKYLATION: MechanismStep = createStep({
  id: "enolate-alkylation",
  from: createState({
    id: "ea-before",
    members: [
      { species: enolateAlk, role: "nucleophile" },
      { species: bromomethaneAlk, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ea-after",
    members: [
      { species: butanone, role: "product" },
      { species: bromideAlk, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "concerted_substitution", route: "sn2", reactionCenters: ["c1", "cme"] },
  arrows: [
    createArrow({ id: "a-c-attacks", source: fromBond("b-12"), sink: toBondBetween("c1", "cme") }),
    createArrow({ id: "a-reform", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-leave", source: fromBond("b-cbr"), sink: toAtom("brm") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 10 spine: the heart of reductive amination, hydride onto the    */
/* iminium. NaBH3CN's whole trick is choosing THIS carbon.              */
/* ------------------------------------------------------------------ */

const iminium = createSpecies({
  id: "sp-iminium",
  atoms: [
    createAtom({ id: "nm", element: "N", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "cn", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-nc", a: "nm", b: "cn" }),
    createBond({ id: "b-nf", a: "nm", b: "cf", order: 2 }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
  ],
});

const hydrideAm = createSpecies({
  id: "sp-hydride-am",
  atoms: [createAtom({ id: "h9", element: "H", formalCharge: -1, lonePairs: 1 })],
  bonds: [],
});

const methylamineOut = createSpecies({
  id: "sp-methylamine-out",
  atoms: [
    createAtom({ id: "nm", element: "N", lonePairs: 1, implicitHydrogens: 1 }),
    createAtom({ id: "cn", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "h9", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-nc", a: "nm", b: "cn" }),
    createBond({ id: "b-nf", a: "nm", b: "cf" }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfh9", a: "cf", b: "h9" }),
  ],
});

const IMINIUM_REDUCTION: MechanismStep = createStep({
  id: "iminium-reduction",
  from: createState({
    id: "imr-before",
    members: [
      { species: hydrideAm, role: "nucleophile" },
      { species: iminium, role: "substrate" },
    ],
  }),
  to: createState({ id: "imr-after", members: [{ species: methylamineOut, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "reduction", reactionCenters: ["cf"] },
  arrows: [
    createArrow({ id: "a-hydride", source: fromLonePair("h9"), sink: toBondBetween("h9", "cf") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-nf"), sink: toAtom("nm") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 spine: DIBAL-H partial reduction. One hydride, then the      */
/* run STOPS: the cold tetrahedral intermediate is the product here.   */
/* ------------------------------------------------------------------ */

const hydrideD = createSpecies({
  id: "sp-hydride-d",
  atoms: [createAtom({ id: "hd", element: "H", formalCharge: -1, lonePairs: 1 })],
  bonds: [],
});

const methylAcetateD = createSpecies({
  id: "sp-methyl-acetate-d",
  atoms: [
    createAtom({ id: "dca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "dc1", element: "C" }),
    createAtom({ id: "do1", element: "O", lonePairs: 2 }),
    createAtom({ id: "do2", element: "O", lonePairs: 2 }),
    createAtom({ id: "dcm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-dac1", a: "dca", b: "dc1" }),
    createBond({ id: "b-d1o1", a: "dc1", b: "do1", order: 2 }),
    createBond({ id: "b-d1o2", a: "dc1", b: "do2" }),
    createBond({ id: "b-do2cm", a: "do2", b: "dcm" }),
  ],
});

const tiDibal = createSpecies({
  id: "sp-ti-dibal",
  atoms: [
    createAtom({ id: "dca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "dc1", element: "C" }),
    createAtom({ id: "do1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "do2", element: "O", lonePairs: 2 }),
    createAtom({ id: "dcm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "hd", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-dac1", a: "dca", b: "dc1" }),
    createBond({ id: "b-d1o1", a: "dc1", b: "do1" }),
    createBond({ id: "b-d1o2", a: "dc1", b: "do2" }),
    createBond({ id: "b-do2cm", a: "do2", b: "dcm" }),
    createBond({ id: "b-d1hd", a: "dc1", b: "hd" }),
  ],
});

const DIBAL_ESTER: MechanismStep = createStep({
  id: "dibal-ester",
  from: createState({
    id: "dib-before",
    members: [
      { species: hydrideD, role: "nucleophile" },
      { species: methylAcetateD, role: "substrate" },
    ],
  }),
  to: createState({ id: "dib-after", members: [{ species: tiDibal, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "reduction", reactionCenters: ["dc1"] },
  arrows: [
    createArrow({ id: "a-h", source: fromLonePair("hd"), sink: toBondBetween("hd", "dc1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-d1o1"), sink: toAtom("do1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 spine: beta-keto acid decarboxylation. Four arrows around a  */
/* six-membered ring, CO2 walks away, the enol stays.                  */
/* ------------------------------------------------------------------ */

const acetoaceticAcid = createSpecies({
  id: "sp-acetoacetic-acid",
  atoms: [
    createAtom({ id: "kcm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "kck", element: "C" }),
    createAtom({ id: "kok", element: "O", lonePairs: 2 }),
    createAtom({ id: "kca", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "kcc", element: "C" }),
    createAtom({ id: "koa", element: "O", lonePairs: 2 }),
    createAtom({ id: "koh", element: "O", lonePairs: 2 }),
    createAtom({ id: "khh", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-kcmck", a: "kcm", b: "kck" }),
    createBond({ id: "b-ckok", a: "kck", b: "kok", order: 2 }),
    createBond({ id: "b-ckca", a: "kck", b: "kca" }),
    createBond({ id: "b-kcacc", a: "kca", b: "kcc" }),
    createBond({ id: "b-ccoa", a: "kcc", b: "koa", order: 2 }),
    createBond({ id: "b-ccoh", a: "kcc", b: "koh" }),
    createBond({ id: "b-kohh", a: "koh", b: "khh" }),
  ],
});

const enolK = createSpecies({
  id: "sp-enol-k",
  atoms: [
    createAtom({ id: "kcm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "kck", element: "C" }),
    createAtom({ id: "kok", element: "O", lonePairs: 2 }),
    createAtom({ id: "khh", element: "H" }),
    createAtom({ id: "kca", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "b-kcmck", a: "kcm", b: "kck" }),
    createBond({ id: "b-ckok", a: "kck", b: "kok" }),
    createBond({ id: "b-okh", a: "kok", b: "khh" }),
    createBond({ id: "b-ckca", a: "kck", b: "kca", order: 2 }),
  ],
});

const co2K = createSpecies({
  id: "sp-co2-k",
  atoms: [
    createAtom({ id: "kcc", element: "C" }),
    createAtom({ id: "koa", element: "O", lonePairs: 2 }),
    createAtom({ id: "koh", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-ccoa", a: "kcc", b: "koa", order: 2 }),
    createBond({ id: "b-ccoh", a: "kcc", b: "koh", order: 2 }),
  ],
});

const DECARBOXYLATION: MechanismStep = createStep({
  id: "decarboxylation",
  from: createState({
    id: "dec-before",
    members: [{ species: acetoaceticAcid, role: "substrate" }],
  }),
  to: createState({
    id: "dec-after",
    members: [
      { species: enolK, role: "product" },
      { species: co2K, role: "product" },
    ],
  }),
  identity: { elementaryStep: "pericyclic_step", route: "pericyclic", reactionCenters: ["kcc", "kca"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("kok"), sink: toBondBetween("kok", "khh") }),
    createArrow({ id: "a-oh", source: fromBond("b-kohh"), sink: toBondBetween("koh", "kcc") }),
    createArrow({ id: "a-cc", source: fromBond("b-kcacc"), sink: toBondBetween("kca", "kck") }),
    createArrow({ id: "a-pi", source: fromBond("b-ckok"), sink: toAtom("kok") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 9b spine: intramolecular aldol. The enolate end of the chain   */
/* bites its own tail and a five-membered ring appears in one move.    */
/* ------------------------------------------------------------------ */

const hexanedioneEnolate = createSpecies({
  id: "sp-hexanedione-enolate",
  atoms: [
    createAtom({ id: "q1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "q2", element: "C" }),
    createAtom({ id: "qo2", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "q3", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "q4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "q5", element: "C" }),
    createAtom({ id: "qo5", element: "O", lonePairs: 2 }),
    createAtom({ id: "q6", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-q12", a: "q1", b: "q2", order: 2 }),
    createBond({ id: "b-q2o", a: "q2", b: "qo2" }),
    createBond({ id: "b-q23", a: "q2", b: "q3" }),
    createBond({ id: "b-q34", a: "q3", b: "q4" }),
    createBond({ id: "b-q45", a: "q4", b: "q5" }),
    createBond({ id: "b-q5o", a: "q5", b: "qo5", order: 2 }),
    createBond({ id: "b-q56", a: "q5", b: "q6" }),
  ],
});

const cyclopentanolate = createSpecies({
  id: "sp-cyclopentanolate",
  atoms: [
    createAtom({ id: "q1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "q2", element: "C" }),
    createAtom({ id: "qo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "q3", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "q4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "q5", element: "C" }),
    createAtom({ id: "qo5", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "q6", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-q12", a: "q1", b: "q2" }),
    createBond({ id: "b-q2o", a: "q2", b: "qo2", order: 2 }),
    createBond({ id: "b-q23", a: "q2", b: "q3" }),
    createBond({ id: "b-q34", a: "q3", b: "q4" }),
    createBond({ id: "b-q45", a: "q4", b: "q5" }),
    createBond({ id: "b-q5o", a: "q5", b: "qo5" }),
    createBond({ id: "b-q56", a: "q5", b: "q6" }),
    createBond({ id: "b-q15", a: "q1", b: "q5" }),
  ],
});

const INTRA_ALDOL: MechanismStep = createStep({
  id: "intra-aldol",
  from: createState({
    id: "ia-before",
    members: [{ species: hexanedioneEnolate, role: "substrate" }],
  }),
  to: createState({ id: "ia-after", members: [{ species: cyclopentanolate, role: "product" }] }),
  identity: { elementaryStep: "ring_closure", route: "nucleophilic_addition_carbonyl", reactionCenters: ["q1", "q5"] },
  arrows: [
    createArrow({ id: "a-bite", source: fromBond("b-q12"), sink: toBondBetween("q1", "q5") }),
    createArrow({ id: "a-reform", source: fromLonePair("qo2"), sink: toBondBetween("qo2", "q2") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-q5o"), sink: toAtom("qo5") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 9c spine: cuprate conjugate addition. The soft carbon picks    */
/* the far end of the enone, on purpose.                               */
/* ------------------------------------------------------------------ */

const cuprateCarbanion = createSpecies({
  id: "sp-cuprate-carbanion",
  atoms: [createAtom({ id: "vg", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 3 })],
  bonds: [],
});

const mvkC = createSpecies({
  id: "sp-mvk-c",
  atoms: [
    createAtom({ id: "vb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "va", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "vk", element: "C" }),
    createAtom({ id: "vo", element: "O", lonePairs: 2 }),
    createAtom({ id: "vm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-vbva", a: "vb", b: "va", order: 2 }),
    createBond({ id: "b-vavk", a: "va", b: "vk" }),
    createBond({ id: "b-vkvo", a: "vk", b: "vo", order: 2 }),
    createBond({ id: "b-vkvm", a: "vk", b: "vm" }),
  ],
});

const cuprateEnolate = createSpecies({
  id: "sp-cuprate-enolate",
  atoms: [
    createAtom({ id: "vg", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "vb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "va", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "vk", element: "C" }),
    createAtom({ id: "vo", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "vm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-vgvb", a: "vg", b: "vb" }),
    createBond({ id: "b-vbva", a: "vb", b: "va" }),
    createBond({ id: "b-vavk", a: "va", b: "vk", order: 2 }),
    createBond({ id: "b-vkvo", a: "vk", b: "vo" }),
    createBond({ id: "b-vkvm", a: "vk", b: "vm" }),
  ],
});

const CUPRATE_CONJUGATE: MechanismStep = createStep({
  id: "cuprate-conjugate",
  from: createState({
    id: "cup-before",
    members: [
      { species: cuprateCarbanion, role: "nucleophile" },
      { species: mvkC, role: "substrate" },
    ],
  }),
  to: createState({ id: "cup-after", members: [{ species: cuprateEnolate, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["vg", "vb"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("vg"), sink: toBondBetween("vg", "vb") }),
    createArrow({ id: "a-shift", source: fromBond("b-vbva"), sink: toBondBetween("va", "vk") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-vkvo"), sink: toAtom("vo") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 spine: Grignard onto a nitrile. The triple bond gives one    */
/* pi and keeps one; workup turns the imine salt into a ketone.        */
/* ------------------------------------------------------------------ */

const carbanionY = createSpecies({
  id: "sp-carbanion-y",
  atoms: [createAtom({ id: "yg", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 3 })],
  bonds: [],
});

const acetonitrileY = createSpecies({
  id: "sp-acetonitrile-y",
  atoms: [
    createAtom({ id: "yc1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "yc2", element: "C" }),
    createAtom({ id: "yn", element: "N", lonePairs: 1 }),
  ],
  bonds: [
    createBond({ id: "b-y12", a: "yc1", b: "yc2" }),
    createBond({ id: "b-y2n", a: "yc2", b: "yn", order: 3 }),
  ],
});

const ketimideY = createSpecies({
  id: "sp-ketimide-y",
  atoms: [
    createAtom({ id: "yc1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "yc2", element: "C" }),
    createAtom({ id: "yn", element: "N", formalCharge: -1, lonePairs: 2 }),
    createAtom({ id: "yg", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-y12", a: "yc1", b: "yc2" }),
    createBond({ id: "b-y2n", a: "yc2", b: "yn", order: 2 }),
    createBond({ id: "b-y2g", a: "yc2", b: "yg" }),
  ],
});

const GRIGNARD_NITRILE: MechanismStep = createStep({
  id: "grignard-nitrile",
  from: createState({
    id: "yn-before",
    members: [
      { species: carbanionY, role: "nucleophile" },
      { species: acetonitrileY, role: "substrate" },
    ],
  }),
  to: createState({ id: "yn-after", members: [{ species: ketimideY, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["yg", "yc2"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("yg"), sink: toBondBetween("yg", "yc2") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-y2n"), sink: toAtom("yn") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 10 spine: hydride onto a nitrile, the first half of the        */
/* reduction to a primary amine.                                       */
/* ------------------------------------------------------------------ */

const hydrideZ = createSpecies({
  id: "sp-hydride-z",
  atoms: [createAtom({ id: "zh", element: "H", formalCharge: -1, lonePairs: 1 })],
  bonds: [],
});

const acetonitrileZ = createSpecies({
  id: "sp-acetonitrile-z",
  atoms: [
    createAtom({ id: "zc1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "zc2", element: "C" }),
    createAtom({ id: "zn", element: "N", lonePairs: 1 }),
  ],
  bonds: [
    createBond({ id: "b-z12", a: "zc1", b: "zc2" }),
    createBond({ id: "b-z2n", a: "zc2", b: "zn", order: 3 }),
  ],
});

const aldimideZ = createSpecies({
  id: "sp-aldimide-z",
  atoms: [
    createAtom({ id: "zc1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "zc2", element: "C" }),
    createAtom({ id: "zn", element: "N", formalCharge: -1, lonePairs: 2 }),
    createAtom({ id: "zh", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-z12", a: "zc1", b: "zc2" }),
    createBond({ id: "b-z2n", a: "zc2", b: "zn", order: 2 }),
    createBond({ id: "b-z2h", a: "zc2", b: "zh" }),
  ],
});

const NITRILE_HYDRIDE: MechanismStep = createStep({
  id: "nitrile-hydride",
  from: createState({
    id: "zn-before",
    members: [
      { species: hydrideZ, role: "nucleophile" },
      { species: acetonitrileZ, role: "substrate" },
    ],
  }),
  to: createState({ id: "zn-after", members: [{ species: aldimideZ, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "reduction", reactionCenters: ["zc2"] },
  arrows: [
    createArrow({ id: "a-h", source: fromLonePair("zh"), sink: toBondBetween("zh", "zc2") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-z2n"), sink: toAtom("zn") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 11 spine: phenoxide as nucleophile, the Williamson that makes  */
/* anisole. The ring makes the alkoxide easy; the SN2 is the same.     */
/* ------------------------------------------------------------------ */

const phenoxideP = createSpecies({
  id: "sp-phenoxide-p",
  atoms: [
    createAtom({ id: "pc1", element: "C" }),
    createAtom({ id: "pc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "pc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "pc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "pc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "pc6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "po", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-p12", a: "pc1", b: "pc2", order: 2 }),
    createBond({ id: "b-p23", a: "pc2", b: "pc3" }),
    createBond({ id: "b-p34", a: "pc3", b: "pc4", order: 2 }),
    createBond({ id: "b-p45", a: "pc4", b: "pc5" }),
    createBond({ id: "b-p56", a: "pc5", b: "pc6", order: 2 }),
    createBond({ id: "b-p61", a: "pc6", b: "pc1" }),
    createBond({ id: "b-p1o", a: "pc1", b: "po" }),
  ],
});

const bromomethaneP = createSpecies({
  id: "sp-bromomethane-p",
  atoms: [
    createAtom({ id: "pcx", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "pbr", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "b-pcxbr", a: "pcx", b: "pbr" })],
});

const anisoleP = createSpecies({
  id: "sp-anisole-p",
  atoms: [
    createAtom({ id: "pc1", element: "C" }),
    createAtom({ id: "pc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "pc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "pc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "pc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "pc6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "po", element: "O", lonePairs: 2 }),
    createAtom({ id: "pcx", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-p12", a: "pc1", b: "pc2", order: 2 }),
    createBond({ id: "b-p23", a: "pc2", b: "pc3" }),
    createBond({ id: "b-p34", a: "pc3", b: "pc4", order: 2 }),
    createBond({ id: "b-p45", a: "pc4", b: "pc5" }),
    createBond({ id: "b-p56", a: "pc5", b: "pc6", order: 2 }),
    createBond({ id: "b-p61", a: "pc6", b: "pc1" }),
    createBond({ id: "b-p1o", a: "pc1", b: "po" }),
    createBond({ id: "b-pocx", a: "po", b: "pcx" }),
  ],
});

const bromideP = createSpecies({
  id: "sp-bromide-p",
  atoms: [createAtom({ id: "pbr", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const PHENOXIDE_ALKYLATION: MechanismStep = createStep({
  id: "phenoxide-alkylation",
  from: createState({
    id: "ph-before",
    members: [
      { species: phenoxideP, role: "nucleophile" },
      { species: bromomethaneP, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ph-after",
    members: [
      { species: anisoleP, role: "product" },
      { species: bromideP, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "concerted_substitution", route: "sn2", reactionCenters: ["po", "pcx"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("po"), sink: toBondBetween("po", "pcx") }),
    createArrow({ id: "a-leave", source: fromBond("b-pcxbr"), sink: toAtom("pbr") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 5 spine: epoxidation. Four arrows moving at once through the   */
/* butterfly: the one concerted oxygen transfer in the course.         */
/* ------------------------------------------------------------------ */

const etheneXp = createSpecies({
  id: "sp-ethene-xp",
  atoms: [
    createAtom({ id: "xc1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "xc2", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [createBond({ id: "b-x12", a: "xc1", b: "xc2", order: 2 })],
});

const performicXp = createSpecies({
  id: "sp-performic-xp",
  atoms: [
    createAtom({ id: "xhf", element: "H" }),
    createAtom({ id: "xcf", element: "C" }),
    createAtom({ id: "xof", element: "O", lonePairs: 2 }),
    createAtom({ id: "xoi", element: "O", lonePairs: 2 }),
    createAtom({ id: "xop", element: "O", lonePairs: 2 }),
    createAtom({ id: "xhp", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-xcfh", a: "xcf", b: "xhf" }),
    createBond({ id: "b-xcfo", a: "xcf", b: "xof", order: 2 }),
    createBond({ id: "b-xcfoi", a: "xcf", b: "xoi" }),
    createBond({ id: "b-xoiop", a: "xoi", b: "xop" }),
    createBond({ id: "b-xophp", a: "xop", b: "xhp" }),
  ],
});

const oxiraneXp = createSpecies({
  id: "sp-oxirane-xp",
  atoms: [
    createAtom({ id: "xc1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "xc2", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "xop", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-x12", a: "xc1", b: "xc2" }),
    createBond({ id: "b-xc1op", a: "xc1", b: "xop" }),
    createBond({ id: "b-xc2op", a: "xc2", b: "xop" }),
  ],
});

const formicXp = createSpecies({
  id: "sp-formic-xp",
  atoms: [
    createAtom({ id: "xhf", element: "H" }),
    createAtom({ id: "xcf", element: "C" }),
    createAtom({ id: "xof", element: "O", lonePairs: 2 }),
    createAtom({ id: "xoi", element: "O", lonePairs: 2 }),
    createAtom({ id: "xhp", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-xcfh", a: "xcf", b: "xhf" }),
    createBond({ id: "b-xcfo", a: "xcf", b: "xof", order: 2 }),
    createBond({ id: "b-xcfoi", a: "xcf", b: "xoi" }),
    createBond({ id: "b-xoihp", a: "xoi", b: "xhp" }),
  ],
});

const EPOXIDATION: MechanismStep = createStep({
  id: "epoxidation",
  from: createState({
    id: "xp-before",
    members: [
      { species: etheneXp, role: "nucleophile" },
      { species: performicXp, role: "electrophile" },
    ],
  }),
  to: createState({
    id: "xp-after",
    members: [
      { species: oxiraneXp, role: "product" },
      { species: formicXp, role: "product" },
    ],
  }),
  identity: { elementaryStep: "pericyclic_step", route: "pericyclic", reactionCenters: ["xc1", "xc2", "xop"] },
  arrows: [
    createArrow({ id: "a-pi", source: fromBond("b-x12"), sink: toBondBetween("xc2", "xop") }),
    createArrow({ id: "a-oo", source: fromBond("b-xoiop"), sink: toAtom("xop") }),
    createArrow({ id: "a-h", source: fromBond("b-xophp"), sink: toBondBetween("xhp", "xoi") }),
    createArrow({ id: "a-lp", source: fromLonePair("xop"), sink: toBondBetween("xop", "xc1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 3 / Unit 7 spine: the Wolff-Kishner ending. N2 tears itself    */
/* free and takes the carbonyl's oxidation state with it.              */
/* ------------------------------------------------------------------ */

const diazenylAnionWk = createSpecies({
  id: "sp-diazenyl-anion-wk",
  atoms: [
    createAtom({ id: "wkc", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "wkm1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "wkm2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "wkn1", element: "N", lonePairs: 1 }),
    createAtom({ id: "wkn2", element: "N", formalCharge: -1, lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-wkcm1", a: "wkc", b: "wkm1" }),
    createBond({ id: "b-wkcm2", a: "wkc", b: "wkm2" }),
    createBond({ id: "b-wkcn", a: "wkc", b: "wkn1" }),
    createBond({ id: "b-wknn", a: "wkn1", b: "wkn2", order: 2 }),
  ],
});

const carbanionWk = createSpecies({
  id: "sp-carbanion-wk",
  atoms: [
    createAtom({ id: "wkc", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 1 }),
    createAtom({ id: "wkm1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "wkm2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-wkcm1", a: "wkc", b: "wkm1" }),
    createBond({ id: "b-wkcm2", a: "wkc", b: "wkm2" }),
  ],
});

const dinitrogenWk = createSpecies({
  id: "sp-dinitrogen-wk",
  atoms: [
    createAtom({ id: "wkn1", element: "N", lonePairs: 1 }),
    createAtom({ id: "wkn2", element: "N", lonePairs: 1 }),
  ],
  bonds: [createBond({ id: "b-wknn", a: "wkn1", b: "wkn2", order: 3 })],
});

const WOLFF_EXTRUSION: MechanismStep = createStep({
  id: "wolff-extrusion",
  from: createState({
    id: "wk-before",
    members: [{ species: diazenylAnionWk, role: "substrate" }],
  }),
  to: createState({
    id: "wk-after",
    members: [
      { species: carbanionWk, role: "product" },
      { species: dinitrogenWk, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "reduction", reactionCenters: ["wkc"] },
  arrows: [
    createArrow({ id: "a-cn", source: fromBond("b-wkcn"), sink: toAtom("wkc") }),
    createArrow({ id: "a-nn", source: fromLonePair("wkn2"), sink: toBondBetween("wkn1", "wkn2") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 7 spine: 1,2 vs 1,4, drawn from the 1,2 side. The hard         */
/* organometallic hits the carbonyl head-on.                           */
/* ------------------------------------------------------------------ */

const carbanionTw = createSpecies({
  id: "sp-carbanion-tw",
  atoms: [createAtom({ id: "twg", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 3 })],
  bonds: [],
});

const mvkTw = createSpecies({
  id: "sp-mvk-tw",
  atoms: [
    createAtom({ id: "twb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "twa", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "twk", element: "C" }),
    createAtom({ id: "two", element: "O", lonePairs: 2 }),
    createAtom({ id: "twm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-twba", a: "twb", b: "twa", order: 2 }),
    createBond({ id: "b-twak", a: "twa", b: "twk" }),
    createBond({ id: "b-twko", a: "twk", b: "two", order: 2 }),
    createBond({ id: "b-twkm", a: "twk", b: "twm" }),
  ],
});

const allylAlkoxideTw = createSpecies({
  id: "sp-allyl-alkoxide-tw",
  atoms: [
    createAtom({ id: "twb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "twa", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "twk", element: "C" }),
    createAtom({ id: "two", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "twm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "twg", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-twba", a: "twb", b: "twa", order: 2 }),
    createBond({ id: "b-twak", a: "twa", b: "twk" }),
    createBond({ id: "b-twko", a: "twk", b: "two" }),
    createBond({ id: "b-twkm", a: "twk", b: "twm" }),
    createBond({ id: "b-twkg", a: "twk", b: "twg" }),
  ],
});

const GRIGNARD_12: MechanismStep = createStep({
  id: "grignard-12",
  from: createState({
    id: "tw-before",
    members: [
      { species: carbanionTw, role: "nucleophile" },
      { species: mvkTw, role: "substrate" },
    ],
  }),
  to: createState({ id: "tw-after", members: [{ species: allylAlkoxideTw, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["twg", "twk"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("twg"), sink: toBondBetween("twg", "twk") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-twko"), sink: toAtom("two") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 10 spine: diazotization's first bond. The amine meets          */
/* nitrosonium and the N-N bond of every diazonium salt is born here.  */
/* Mechanistically an addition to a polar pi electrophile.             */
/* ------------------------------------------------------------------ */

const methylamineDz = createSpecies({
  id: "sp-methylamine-dz",
  atoms: [
    createAtom({ id: "dzn", element: "N", lonePairs: 1 }),
    createAtom({ id: "dzh1", element: "H" }),
    createAtom({ id: "dzh2", element: "H" }),
    createAtom({ id: "dzc", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-dznh1", a: "dzn", b: "dzh1" }),
    createBond({ id: "b-dznh2", a: "dzn", b: "dzh2" }),
    createBond({ id: "b-dznc", a: "dzn", b: "dzc" }),
  ],
});

const nitrosoniumDz = createSpecies({
  id: "sp-nitrosonium-dz",
  atoms: [
    createAtom({ id: "dznn", element: "N", lonePairs: 1 }),
    createAtom({ id: "dzo", element: "O", formalCharge: 1, lonePairs: 1 }),
  ],
  bonds: [createBond({ id: "b-dzno", a: "dznn", b: "dzo", order: 3 })],
});

const nitrosoammoniumDz = createSpecies({
  id: "sp-nitrosoammonium-dz",
  atoms: [
    createAtom({ id: "dzn", element: "N", formalCharge: 1 }),
    createAtom({ id: "dzh1", element: "H" }),
    createAtom({ id: "dzh2", element: "H" }),
    createAtom({ id: "dzc", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "dznn", element: "N", lonePairs: 1 }),
    createAtom({ id: "dzo", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-dznh1", a: "dzn", b: "dzh1" }),
    createBond({ id: "b-dznh2", a: "dzn", b: "dzh2" }),
    createBond({ id: "b-dznc", a: "dzn", b: "dzc" }),
    createBond({ id: "b-dznnn", a: "dzn", b: "dznn" }),
    createBond({ id: "b-dzno", a: "dznn", b: "dzo", order: 2 }),
  ],
});

const DIAZONIUM_FIRST: MechanismStep = createStep({
  id: "diazonium-first",
  from: createState({
    id: "dz-before",
    members: [
      { species: methylamineDz, role: "nucleophile" },
      { species: nitrosoniumDz, role: "electrophile" },
    ],
  }),
  to: createState({ id: "dz-after", members: [{ species: nitrosoammoniumDz, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["dzn", "dznn"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("dzn"), sink: toBondBetween("dzn", "dznn") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-dzno"), sink: toAtom("dzo") }),
  ],
});

/* ------------------------------------------------------------------ */

export const TRAINER_REACTIONS: readonly TrainerReaction[] = [
  {
    id: "sn2",
    title: "Sₙ2 at bromomethane",
    brief: "Hydroxide attacks, bromide leaves. Draw both arrows.",
    successLine: "Back-side attack: the hydroxide lone pair forms the new C–O bond as the bromide leaves.",
    step: SN2_DEMO_STEP,
    fromHints: SN2_FROM_HINTS,
    toHints: SN2_TO_HINTS,
  },
  {
    id: "proton-transfer",
    title: "Proton transfer",
    brief: "Ammonia takes the acid's proton. Draw both arrows.",
    successLine: "The nitrogen lone pair takes the proton as the H–Cl bond's electrons settle onto chlorine.",
    step: PROTON_TRANSFER,
    fromHints: {
      // The three N-H bonds fan away from the acid so the lone pair side of
      // the nitrogen FACES the proton it is about to take: the staged
      // geometry must agree with the reaction, per the video-frame critic.
      // 90, 180, 270 degrees, all exactly one bond length: the widest the
      // three N-H bonds can spread while the whole lone pair half-plane
      // faces the acid. Round 3 measured the old fan at adjacent angles
      // nearer 65 degrees, "a picture of ammonia a student will remember
      // incorrectly", with one bond visibly longer than the others.
      // 115, 180 and 245 degrees: a real pyramidal projection. Round 3
      // measured 65 degree spacing as cramped, round 4 read 90 degrees as
      // "square-ish geometry"; 65 degrees BETWEEN bonds with the whole fan
      // still clear of the acid's half-plane is the projection a textbook
      // draws.
      n1: { x: -1.45, y: 0 },
      h2: { x: -1.87, y: 0.91 },
      h3: { x: -2.45, y: 0 },
      h4: { x: -1.87, y: -0.91 },
      h1: { x: -0.25, y: 0 },
      cl1: { x: 0.75, y: 0 },
    },
    toHints: {
      n1: { x: -1.25, y: 0 },
      h2: { x: -1.67, y: 0.91 },
      h3: { x: -2.25, y: 0 },
      h4: { x: -1.67, y: -0.91 },
      h1: { x: -0.25, y: 0 },
      cl1: { x: 1.8, y: 0 },
    },
  },
  {
    id: "carbonyl-addition",
    title: "Carbonyl addition",
    brief: "Hydroxide attacks the carbonyl carbon. Where do the π electrons go?",
    successLine: "The lone pair forms the new C–O bond and the π electrons climb onto the carbonyl oxygen.",
    step: CARBONYL_ADDITION,
    fromHints: {
      // Below-left of the carbon, so the approach vector aims at C and away
      // from the carbonyl oxygen: the critic measured the old line landing
      // nearer the O end of the C=O than the carbon it attacks.
      o1: { x: -1.35, y: -0.45 },
      h1: { x: -2.1, y: -1.1 },
      c1: { x: 0, y: 0 },
      h2: { x: -0.35, y: 0.94 },
      h3: { x: 0.95, y: -0.35 },
      o2: { x: 0.62, y: 0.78 },
    },
    toHints: {
      o1: { x: -0.95, y: -0.45 },
      h1: { x: -1.7, y: -1.1 },
      c1: { x: 0, y: 0 },
      h2: { x: -0.35, y: 0.94 },
      h3: { x: 0.95, y: -0.35 },
      o2: { x: 0.62, y: 0.78 },
    },
  },
  {
    id: "alkene-protonation",
    title: "Propene + HBr",
    brief: "The π bond grabs the proton, but which carbon takes the H? Draw both arrows.",
    successLine: "Markovnikov: the H lands on the CH₂ end, so the positive charge sits on the more substituted carbon, where it is most stable.",
    step: ALKENE_PROTONATION,
    fromHints: {
      // The double bond stands vertical on the left with the acid's proton
      // facing it, so the pi cloud and the H it grabs look at each other.
      c1: { x: -1.3, y: 0.55 },
      c2: { x: -1.3, y: -0.45 },
      c3: { x: -2.25, y: -0.95 },
      h1: { x: 0.1, y: 0.15 },
      br1: { x: 1.1, y: 0.15 },
    },
    toHints: {
      c1: { x: -1.15, y: 0.55 },
      h1: { x: -0.35, y: 1.0 },
      c2: { x: -1.15, y: -0.45 },
      c3: { x: -2.1, y: -0.95 },
      br1: { x: 1.6, y: 0.15 },
    },
  },
  {
    id: "e2",
    title: "E2 elimination",
    brief: "Three arrows, one moment: the base pulls, the π forms, the bromide leaves.",
    successLine: "One concerted step: the base takes the β-hydrogen as its electrons become the π bond and bromide departs: anti-periplanar, all at once.",
    step: E2_ELIMINATION,
    fromHints: {
      o1: { x: -2.6, y: 1.15 },
      h1: { x: -3.35, y: 1.7 },
      c1: { x: -1.05, y: 0.15 },
      hb: { x: -1.75, y: 0.85 },
      c2: { x: 0.0, y: -0.35 },
      c3: { x: -0.25, y: -1.4 },
      br1: { x: 1.2, y: 0.35 },
    },
    toHints: {
      o1: { x: -2.6, y: 1.15 },
      h1: { x: -3.35, y: 1.7 },
      hb: { x: -1.95, y: 1.35 },
      c1: { x: -1.05, y: 0.15 },
      c2: { x: 0.0, y: -0.35 },
      c3: { x: -0.25, y: -1.4 },
      br1: { x: 1.75, y: 0.55 },
    },
  },
  {
    id: "cyanohydrin",
    title: "Cyanohydrin attack",
    brief: "Cyanide's carbon is the nucleophile. Two arrows.",
    successLine: "The carbanion carbon attacks the carbonyl and the π electrons climb onto oxygen: one new C–C bond, and a nitrile handle for later chemistry.",
    step: CYANOHYDRIN_ATTACK,
    fromHints: {
      c9: { x: -1.45, y: -0.35 },
      n1: { x: -2.45, y: -0.7 },
      c1: { x: 0, y: 0 },
      h2: { x: -0.35, y: 0.94 },
      h3: { x: 0.95, y: -0.35 },
      o1: { x: 0.62, y: 0.78 },
    },
    toHints: {
      c9: { x: -0.95, y: -0.3 },
      n1: { x: -1.95, y: -0.65 },
      c1: { x: 0, y: 0 },
      h2: { x: -0.35, y: 0.94 },
      h3: { x: 0.95, y: -0.35 },
      o1: { x: 0.62, y: 0.78 },
    },
  },
  {
    id: "williamson",
    title: "Williamson ether",
    brief: "Methoxide attacks the methyl halide: an SN2 that builds an ether.",
    successLine: "Backside attack on the 1° carbon, bromide leaves: the Williamson is SN2 wearing a synthesis name, and it is why 3° halides eliminate instead.",
    step: WILLIAMSON,
    fromHints: {
      om: { x: -1.6, y: 0.1 },
      cme: { x: -2.55, y: 0.6 },
      c1: { x: 0, y: 0 },
      br1: { x: 1.2, y: 0 },
    },
    toHints: {
      om: { x: -1.05, y: 0.1 },
      cme: { x: -2.0, y: 0.6 },
      c1: { x: 0, y: 0 },
      br1: { x: 1.75, y: 0 },
    },
  },
  {
    id: "epoxide-basic",
    title: "Epoxide, basic opening",
    brief: "Strong nucleophile, no acid: which carbon does it hit?",
    successLine: "Under basic conditions the nucleophile attacks the LESS hindered carbon: clean SN2, backside, and the ring strain does the leaving group's job.",
    step: EPOXIDE_BASIC,
    fromHints: {
      om: { x: -1.85, y: -0.35 },
      cme: { x: -2.8, y: -0.8 },
      c1: { x: -0.5, y: 0.15 },
      c2: { x: 0.55, y: 0.15 },
      c3: { x: 1.3, y: -0.6 },
      o1: { x: 0.05, y: 1.05 },
    },
    toHints: {
      om: { x: -1.4, y: -0.3 },
      cme: { x: -2.35, y: -0.75 },
      c1: { x: -0.5, y: 0.15 },
      c2: { x: 0.55, y: 0.15 },
      c3: { x: 1.3, y: -0.6 },
      o1: { x: 0.55, y: 1.15 },
    },
  },
  {
    id: "epoxide-acidic",
    title: "Epoxide, acidic opening",
    brief: "The ring is protonated now. Same question: which carbon?",
    successLine: "Under acid the ring is activated and the MORE substituted carbon takes the hit: it carries the greater share of positive charge, so the weak nucleophile goes there.",
    step: EPOXIDE_ACIDIC,
    fromHints: {
      ow: { x: 1.95, y: -0.5 },
      hw1: { x: 2.7, y: 0.05 },
      hw2: { x: 2.45, y: -1.3 },
      c1: { x: -0.5, y: 0.15 },
      c2: { x: 0.55, y: 0.15 },
      c3: { x: 0.85, y: -0.85 },
      o1: { x: 0.05, y: 1.05 },
      hp: { x: 0.05, y: 2.05 },
    },
    toHints: {
      ow: { x: 1.35, y: -0.45 },
      hw1: { x: 2.1, y: 0.1 },
      hw2: { x: 1.85, y: -1.25 },
      c1: { x: -0.5, y: 0.15 },
      c2: { x: 0.55, y: 0.15 },
      c3: { x: 0.85, y: -0.85 },
      o1: { x: -0.35, y: 1.05 },
      hp: { x: -0.35, y: 2.05 },
    },
  },
  {
    id: "grignard-methyl",
    title: "Grignard addition",
    brief: "The Grignard's methyl, drawn as the carbanion it delivers. Two arrows.",
    successLine: "The carbanion attacks the carbonyl carbon and the π electrons step onto oxygen: a new C–C bond and the alkoxide the workup will protonate.",
    step: GRIGNARD_METHYL,
    fromHints: {
      cg: { x: -1.55, y: -0.35 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
    toHints: {
      cg: { x: -1.0, y: -0.3 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
  },
  {
    id: "imine-attack",
    title: "Imine, first bond",
    brief: "The amine's lone pair opens the imine story. Two arrows.",
    successLine: "Nitrogen attacks the carbonyl carbon and the zwitterion forms: N⁺ and O⁻ on neighbouring atoms, waiting for the proton shuffle that finishes the imine.",
    step: IMINE_ATTACK,
    fromHints: {
      nm: { x: -1.55, y: -0.3 },
      cn: { x: -2.5, y: -0.75 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
    toHints: {
      nm: { x: -1.0, y: -0.25 },
      cn: { x: -1.95, y: -0.7 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
  },
  {
    id: "hydride-reduction",
    title: "Hydride reduction",
    brief: "The H⁻ that NaBH₄ delivers. Two arrows.",
    successLine: "The hydride takes the carbonyl carbon and the π electrons climb onto oxygen: the alkoxide the workup will protonate to the alcohol.",
    step: HYDRIDE_REDUCTION,
    fromHints: {
      h9: { x: -1.35, y: -0.3 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
    toHints: {
      h9: { x: -0.85, y: -0.25 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
  },
  {
    id: "alpha-bromination",
    title: "α-Bromination",
    brief: "The enolate meets Br₂: three arrows.",
    successLine: "The enolate's carbon attacks bromine, the carbonyl reforms behind it, and bromide leaves: the α-carbon is functionalised, and under base this would run again, which is the haloform story.",
    step: ALPHA_BROMINATION,
    fromHints: {
      c1: { x: -1.0, y: 0.15 },
      c2: { x: -1.95, y: -0.35 },
      o1: { x: -2.05, y: 0.75 },
      c3: { x: -2.9, y: -0.95 },
      bra: { x: 0.35, y: -0.15 },
      brb: { x: 1.55, y: -0.5 },
    },
    toHints: {
      c1: { x: -1.0, y: 0.15 },
      bra: { x: 0.1, y: -0.2 },
      c2: { x: -1.95, y: -0.35 },
      o1: { x: -2.05, y: 0.75 },
      c3: { x: -2.9, y: -0.95 },
      brb: { x: 1.95, y: -0.6 },
    },
  },
  {
    id: "michael-addition",
    title: "Michael addition",
    brief: "Soft nucleophile, 1,4. Four arrows move as one.",
    successLine: "The enolate adds to the β-carbon, the enone's π system relays the charge down the chain, and it lands on the far oxygen: conjugate addition, the soft way in.",
    step: MICHAEL_ADDITION,
    fromHints: {
      c1: { x: -1.35, y: 0.2 },
      c2: { x: -2.3, y: -0.3 },
      o1: { x: -2.4, y: 0.8 },
      c3: { x: -3.25, y: -0.9 },
      cb: { x: 0.05, y: -0.2 },
      ca: { x: 1.05, y: 0.25 },
      cc: { x: 2.05, y: -0.2 },
      oa: { x: 3.0, y: 0.25 },
    },
    toHints: {
      c1: { x: -1.35, y: 0.2 },
      c2: { x: -2.3, y: -0.3 },
      o1: { x: -2.4, y: 0.8 },
      c3: { x: -3.25, y: -0.9 },
      cb: { x: -0.35, y: -0.35 },
      ca: { x: 0.65, y: 0.1 },
      cc: { x: 1.65, y: -0.35 },
      oa: { x: 2.6, y: 0.1 },
    },
  },
  {
    id: "enamine-attack",
    title: "Enamine, first bond",
    brief: "A 2° amine this time: no N–H left to lose at the end, which is the whole difference.",
    successLine: "The dimethylamine's lone pair takes the carbonyl carbon: the zwitterion forms, and because the nitrogen came in with only one H, the road ends at an enamine, not an imine: Stork chemistry starts here.",
    step: ENAMINE_ATTACK,
    fromHints: {
      nm: { x: -1.55, y: -0.3 },
      cn1: { x: -2.5, y: 0.15 },
      cn2: { x: -1.85, y: -1.35 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
    toHints: {
      nm: { x: -1.0, y: -0.25 },
      cn1: { x: -1.95, y: 0.2 },
      cn2: { x: -1.3, y: -1.3 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
  },
  {
    id: "enolate-alkylation",
    title: "Enolate alkylation",
    brief: "The enolate's carbon does an SN2 on the methyl halide. Three arrows.",
    successLine: "C-alkylation: the enolate attacks through carbon, the carbonyl reforms behind it, bromide leaves: one new C–C bond, and the regiochemistry was decided back when you chose which enolate to make.",
    step: ENOLATE_ALKYLATION,
    fromHints: {
      c1: { x: -1.0, y: 0.15 },
      c2: { x: -1.95, y: -0.35 },
      o1: { x: -2.05, y: 0.75 },
      c3: { x: -2.9, y: -0.95 },
      cme: { x: 0.35, y: -0.15 },
      brm: { x: 1.55, y: -0.5 },
    },
    toHints: {
      c1: { x: -1.0, y: 0.15 },
      cme: { x: 0.0, y: -0.2 },
      c2: { x: -1.95, y: -0.35 },
      o1: { x: -2.05, y: 0.75 },
      c3: { x: -2.9, y: -0.95 },
      brm: { x: 1.95, y: -0.6 },
    },
  },
  {
    id: "iminium-reduction",
    title: "Iminium reduction",
    brief: "The heart of reductive amination: hydride picks the C=N carbon.",
    successLine: "The hydride lands on the iminium carbon and the π electrons settle onto nitrogen: the amine is made, and NaBH₃CN's whole trick is that it reduces THIS species and leaves the plain carbonyl alone.",
    step: IMINIUM_REDUCTION,
    fromHints: {
      h9: { x: -1.35, y: -0.35 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.55, y: -0.9 },
      nm: { x: 1.05, y: 0.45 },
      cn: { x: 2.05, y: 0.05 },
    },
    toHints: {
      h9: { x: -0.85, y: -0.3 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.55, y: -0.9 },
      nm: { x: 1.05, y: 0.45 },
      cn: { x: 2.05, y: 0.05 },
    },
  },
  {
    id: "dibal-ester",
    title: "DIBAL-H, the deliberate stop",
    brief: "One hydride onto the ester, and then nothing. The cold tetrahedral intermediate IS the product.",
    successLine: "The hydride landed and the pi electrons settled on oxygen, and at -78 degrees that is where the story ends: aluminum holds the tetrahedral alkoxide together, so the aldehyde only appears at workup. Partial reduction is a temperature trick, and you just drew it.",
    step: DIBAL_ESTER,
    fromHints: {
      hd: { x: -1.4, y: 0.35 },
      dca: { x: -0.95, y: -0.75 },
      dc1: { x: 0, y: 0 },
      do1: { x: 0.4, y: 0.95 },
      do2: { x: 1.0, y: -0.5 },
      dcm: { x: 2.0, y: -0.3 },
    },
    toHints: {
      hd: { x: -0.8, y: 0.5 },
      dca: { x: -0.95, y: -0.75 },
      dc1: { x: 0, y: 0 },
      do1: { x: 0.45, y: 1.0 },
      do2: { x: 1.0, y: -0.5 },
      dcm: { x: 2.0, y: -0.3 },
    },
  },
  {
    id: "decarboxylation",
    title: "Decarboxylation",
    brief: "A beta-keto acid loses CO2 through a six-membered ring. Four arrows, all at once.",
    successLine: "All four arrows moved together: the ketone oxygen took the proton, the O-H electrons became CO2's second pi bond, the C-C bond became the enol's alkene, and the old carbonyl pi settled onto oxygen. This is why malonic and acetoacetic ester syntheses end with gentle heating: the ring does the work.",
    step: DECARBOXYLATION,
    fromHints: {
      kcm: { x: -2.6, y: -0.2 },
      kck: { x: -1.6, y: 0.3 },
      kok: { x: -1.35, y: 1.35 },
      kca: { x: -0.6, y: -0.4 },
      kcc: { x: 0.6, y: 0.1 },
      koa: { x: 0.9, y: -0.95 },
      koh: { x: 0.8, y: 1.15 },
      khh: { x: 0.0, y: 1.75 },
    },
    toHints: {
      kcm: { x: -2.7, y: -0.3 },
      kck: { x: -1.7, y: 0.25 },
      kok: { x: -1.4, y: 1.3 },
      khh: { x: -0.6, y: 1.7 },
      kca: { x: -0.75, y: -0.5 },
      kcc: { x: 1.6, y: 0.2 },
      koa: { x: 2.1, y: -0.7 },
      koh: { x: 1.9, y: 1.15 },
    },
  },
  {
    id: "intra-aldol",
    title: "Intramolecular aldol",
    brief: "The chain bites its own tail: one molecule, one move, one new five-membered ring.",
    successLine: "The enolate end reached around and took its own far carbonyl: a five-membered ring in a single step. Rings of five and six win because the chain barely has to bend; this closure is why 2,5-diketones cyclise so eagerly.",
    step: INTRA_ALDOL,
    fromHints: {
      q1: { x: -1.9, y: 0.75 },
      q2: { x: -1.75, y: -0.35 },
      qo2: { x: -2.6, y: -1.05 },
      q3: { x: -0.7, y: -0.9 },
      q4: { x: 0.45, y: -0.55 },
      q5: { x: 0.55, y: 0.6 },
      qo5: { x: 1.45, y: 1.25 },
      q6: { x: 1.5, y: -0.2 },
    },
    toHints: {
      q1: { x: -0.95, y: 0.95 },
      q2: { x: -1.6, y: 0.0 },
      qo2: { x: -2.7, y: 0.0 },
      q3: { x: -0.95, y: -0.95 },
      q4: { x: 0.2, y: -0.6 },
      q5: { x: 0.2, y: 0.6 },
      qo5: { x: 1.05, y: 1.35 },
      q6: { x: 1.3, y: -0.05 },
    },
  },
  {
    id: "cuprate-conjugate",
    title: "Cuprate 1,4-addition",
    brief: "The soft carbanion picks the FAR end of the enone. Three arrows relay the charge onto oxygen.",
    successLine: "The cuprate's carbon landed on the beta position and the relay carried the electrons home to oxygen: 1,4-addition, the enolate as the product. A Grignard would have hit the carbonyl head-on; the soft cuprate reads the enone's whole surface and takes the gentler seat.",
    step: CUPRATE_CONJUGATE,
    fromHints: {
      vg: { x: -1.6, y: 0.45 },
      vb: { x: -0.55, y: 0.75 },
      va: { x: 0.3, y: 0.05 },
      vk: { x: 1.4, y: 0.3 },
      vo: { x: 1.75, y: 1.3 },
      vm: { x: 2.2, y: -0.5 },
    },
    toHints: {
      vg: { x: -1.35, y: 0.35 },
      vb: { x: -0.55, y: 0.75 },
      va: { x: 0.3, y: 0.05 },
      vk: { x: 1.4, y: 0.3 },
      vo: { x: 1.75, y: 1.3 },
      vm: { x: 2.2, y: -0.5 },
    },
  },
  {
    id: "grignard-nitrile",
    title: "Grignard + nitrile",
    brief: "The carbanion attacks the triple bond's carbon. One pi moves up; one stays.",
    successLine: "The carbanion took the nitrile carbon and one pi pair climbed onto nitrogen: a metalated ketimine, which acidic workup hydrolyses to the ketone. Nitriles are the quiet way to a ketone that never over-adds, because the anionic imine repels the second equivalent.",
    step: GRIGNARD_NITRILE,
    fromHints: {
      yg: { x: -1.5, y: 0.45 },
      yc1: { x: -1.0, y: -0.85 },
      yc2: { x: 0, y: 0 },
      yn: { x: 1.15, y: 0.35 },
    },
    toHints: {
      yg: { x: -0.85, y: 0.6 },
      yc1: { x: -1.0, y: -0.85 },
      yc2: { x: 0, y: 0 },
      yn: { x: 1.15, y: 0.35 },
    },
  },
  {
    id: "nitrile-hydride",
    title: "Nitrile reduction, first hydride",
    brief: "Hydride onto the nitrile carbon: the first of the two additions that end at a primary amine.",
    successLine: "The hydride landed and the triple bond let one pi pair go: a metalated aldimine, halfway to the amine. A second hydride does it again, and workup hands you the primary amine with its CH2 built from nothing but H-minus, twice.",
    step: NITRILE_HYDRIDE,
    fromHints: {
      zh: { x: -1.35, y: 0.4 },
      zc1: { x: -1.0, y: -0.85 },
      zc2: { x: 0, y: 0 },
      zn: { x: 1.15, y: 0.35 },
    },
    toHints: {
      zh: { x: -0.75, y: 0.55 },
      zc1: { x: -1.0, y: -0.85 },
      zc2: { x: 0, y: 0 },
      zn: { x: 1.15, y: 0.35 },
    },
  },
  {
    id: "phenoxide-alkylation",
    title: "Phenoxide Williamson",
    brief: "The ring made this alkoxide cheap to form; the SN2 it does is the same one you already know.",
    successLine: "Phenoxide's oxygen took the methyl carbon and bromide left: anisole by Williamson. The aromatic ring is why plain NaOH was enough to make this nucleophile, and it is the same delocalisation that makes phenol a hundred thousand times more acidic than cyclohexanol.",
    step: PHENOXIDE_ALKYLATION,
    fromHints: {
      pc1: { x: -1.3, y: 0.0 },
      pc2: { x: -2.0, y: 0.85 },
      pc3: { x: -3.1, y: 0.7 },
      pc4: { x: -3.5, y: -0.3 },
      pc5: { x: -2.8, y: -1.15 },
      pc6: { x: -1.7, y: -1.0 },
      po: { x: -0.6, y: 0.85 },
      pcx: { x: 0.75, y: 0.45 },
      pbr: { x: 1.95, y: 0.05 },
    },
    toHints: {
      pc1: { x: -1.3, y: 0.0 },
      pc2: { x: -2.0, y: 0.85 },
      pc3: { x: -3.1, y: 0.7 },
      pc4: { x: -3.5, y: -0.3 },
      pc5: { x: -2.8, y: -1.15 },
      pc6: { x: -1.7, y: -1.0 },
      po: { x: -0.6, y: 0.85 },
      pcx: { x: 0.35, y: 0.5 },
      pbr: { x: 2.35, y: 0.2 },
    },
  },
  {
    id: "epoxidation",
    title: "Epoxidation, the butterfly",
    brief: "Four arrows, one moment: the peracid hands over its outer oxygen and leaves as a plain acid.",
    successLine: "All four arrows fired at once: the alkene took the outer oxygen from both sides, the O-O bond snapped back, and the proton slid home to make formic acid. Fully concerted, which is why the alkene's geometry survives perfectly into the epoxide: cis stays cis.",
    step: EPOXIDATION,
    fromHints: {
      xc1: { x: -2.15, y: 0.45 },
      xc2: { x: -2.05, y: -0.7 },
      xop: { x: -0.7, y: -0.1 },
      xoi: { x: 0.45, y: 0.35 },
      xhp: { x: -0.55, y: 1.1 },
      xcf: { x: 1.55, y: -0.2 },
      xof: { x: 1.5, y: -1.3 },
      xhf: { x: 2.5, y: 0.35 },
    },
    toHints: {
      xc1: { x: -2.35, y: 0.5 },
      xc2: { x: -2.25, y: -0.65 },
      xop: { x: -1.3, y: -0.05 },
      xoi: { x: 0.75, y: 0.4 },
      xhp: { x: 0.6, y: 1.45 },
      xcf: { x: 1.85, y: -0.15 },
      xof: { x: 1.8, y: -1.25 },
      xhf: { x: 2.8, y: 0.4 },
    },
  },
  {
    id: "wolff-extrusion",
    title: "Wolff-Kishner, the exit",
    brief: "The diazenyl anion falls apart: N2 tears itself free and leaves a carbanion holding the ticket.",
    successLine: "The C-N bond let go because the nitrogen pair could become N2's third bond: gas out, carbanion left behind, and the carbanion grabs a proton from solvent to finish carbonyl-to-CH2. The whole reduction is powered by how badly two nitrogens want to be dinitrogen.",
    step: WOLFF_EXTRUSION,
    fromHints: {
      wkm1: { x: -2.45, y: 0.55 },
      wkc: { x: -1.5, y: 0.0 },
      wkm2: { x: -1.55, y: -1.1 },
      wkn1: { x: -0.35, y: 0.5 },
      wkn2: { x: 0.75, y: 0.15 },
    },
    toHints: {
      wkm1: { x: -2.45, y: 0.55 },
      wkc: { x: -1.5, y: 0.0 },
      wkm2: { x: -1.55, y: -1.1 },
      wkn1: { x: 0.15, y: 0.7 },
      wkn2: { x: 1.25, y: 0.35 },
    },
  },
  {
    id: "grignard-12",
    title: "1,2 on an enone",
    brief: "The hard organometallic hits the carbonyl head-on and keeps the alkene. Compare the cuprate's choice.",
    successLine: "Straight 1,2: the carbanion took the carbonyl carbon, the charge went to oxygen, and the C=C survived untouched: an allylic alkoxide. Hard nucleophiles read charge and hit the carbonyl; soft ones read orbitals and take the far seat. Same enone, two different products, your choice of reagent.",
    step: GRIGNARD_12,
    fromHints: {
      twg: { x: 2.3, y: 1.15 },
      twb: { x: -1.7, y: 0.7 },
      twa: { x: -0.85, y: 0.0 },
      twk: { x: 0.25, y: 0.25 },
      two: { x: 0.6, y: 1.25 },
      twm: { x: 1.05, y: -0.55 },
    },
    toHints: {
      twg: { x: 1.35, y: 0.95 },
      twb: { x: -1.7, y: 0.7 },
      twa: { x: -0.85, y: 0.0 },
      twk: { x: 0.25, y: 0.25 },
      two: { x: 0.6, y: 1.25 },
      twm: { x: 1.05, y: -0.55 },
    },
  },
  {
    id: "diazonium-first",
    title: "Diazotization begins",
    brief: "The amine's lone pair takes nitrosonium's nitrogen: the N-N bond every diazonium salt is built on.",
    successLine: "The lone pair attacked NO+ and the triple bond relaxed onto oxygen: an N-nitrosoammonium ion, the first intermediate of diazotization. Proton hops and a dehydration later, this N-N bond is the diazonium's, and the aryl version is the doorway to the entire Sandmeyer toolbox.",
    step: DIAZONIUM_FIRST,
    fromHints: {
      dzn: { x: -1.2, y: 0.3 },
      dzh1: { x: -1.85, y: 1.15 },
      dzh2: { x: -0.75, y: 1.3 },
      dzc: { x: -2.15, y: -0.35 },
      dznn: { x: 0.35, y: -0.15 },
      dzo: { x: 1.5, y: -0.5 },
    },
    toHints: {
      dzn: { x: -0.9, y: 0.3 },
      dzh1: { x: -1.55, y: 1.15 },
      dzh2: { x: -0.45, y: 1.3 },
      dzc: { x: -1.85, y: -0.35 },
      dznn: { x: 0.25, y: -0.1 },
      dzo: { x: 1.4, y: -0.45 },
    },
  },
];
