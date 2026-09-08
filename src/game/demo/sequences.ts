/**
 * Multi-step problems: an ordered chain of MechanismSteps played as one
 * exercise, each step's own from/to states authored whole, exactly the
 * beat model in docs/DATA-MODEL.md. Owner spec, 2026-08-26: "build a version
 * without the arrows for a multi step problem"; sequences run ARROWLESS:
 * the electron primitive carries the gesture and no committed arrow glyphs
 * accumulate; each solved step plays its animation and the runner advances.
 *
 * The first sequence is Unit 7 spine chemistry: base-catalysed hydration of
 * formaldehyde. Step 1 is the registry's carbonyl addition (the tetrahedral
 * collapse the owner asked about by name); step 2 protonates the alkoxide
 * with hydronium to the gem-diol.
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
  toBondBetween,
  toAtom,
  type MechanismStep,
} from "@blueberry/chem-core";
import type { LayoutHints } from "../render/layout/layout";

export interface TrainerSequence {
  readonly id: string;
  readonly title: string;
  readonly brief: string;
  readonly successLine: string;
  readonly steps: readonly {
    readonly step: MechanismStep;
    readonly stepBrief: string;
    readonly fromHints: LayoutHints;
    readonly toHints: LayoutHints;
  }[];
}

/* ---------------- step 2: the alkoxide takes a proton ---------------- */

const alkoxideIn = createSpecies({
  id: "sp-alkoxide-2",
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

const hydronium = createSpecies({
  id: "sp-hydronium",
  atoms: [
    createAtom({ id: "o3", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "h4", element: "H" }),
    createAtom({ id: "h5", element: "H" }),
    createAtom({ id: "h6", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-oh4", a: "o3", b: "h4" }),
    createBond({ id: "b-oh5", a: "o3", b: "h5" }),
    createBond({ id: "b-oh6", a: "o3", b: "h6" }),
  ],
});

const gemDiol = createSpecies({
  id: "sp-gem-diol",
  atoms: [
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
    createAtom({ id: "h4", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-oh", a: "o1", b: "h1" }),
    createBond({ id: "b-oc", a: "o1", b: "c1" }),
    createBond({ id: "b-ch2", a: "c1", b: "h2" }),
    createBond({ id: "b-ch3", a: "c1", b: "h3" }),
    createBond({ id: "b-co", a: "c1", b: "o2" }),
    createBond({ id: "b-o2h4", a: "o2", b: "h4" }),
  ],
});

const water = createSpecies({
  id: "sp-water",
  atoms: [
    createAtom({ id: "o3", element: "O", lonePairs: 2 }),
    createAtom({ id: "h5", element: "H" }),
    createAtom({ id: "h6", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh5", a: "o3", b: "h5" }), createBond({ id: "b-oh6", a: "o3", b: "h6" })],
});

const ALKOXIDE_PROTONATION: MechanismStep = createStep({
  id: "alkoxide-protonation",
  from: createState({
    id: "akp-before",
    members: [
      { species: alkoxideIn, role: "nucleophile" },
      { species: hydronium, role: "substrate" },
    ],
  }),
  to: createState({
    id: "akp-after",
    members: [
      { species: gemDiol, role: "product" },
      { species: water, role: "leaving_group" },
    ],
  }),
  identity: {
    elementaryStep: "proton_transfer",
    route: "acid_base_proton_transfer",
    reactionCenters: ["h4"],
  },
  arrows: [
    createArrow({ id: "a-grab-h", source: fromLonePair("o2"), sink: toBondBetween("o2", "h4") }),
    createArrow({ id: "a-oh-release", source: fromBond("b-oh4"), sink: toAtom("o3") }),
  ],
});

const STEP2_FROM_HINTS: LayoutHints = {
  o1: { x: -2.3, y: 0.35 },
  h1: { x: -3.0, y: 0.95 },
  c1: { x: -1.35, y: -0.25 },
  h2: { x: -1.7, y: -1.2 },
  h3: { x: -0.6, y: -1.0 },
  o2: { x: -0.75, y: 0.55 },
  o3: { x: 1.15, y: 0.35 },
  h4: { x: 0.25, y: 0.55 },
  h5: { x: 1.85, y: 0.95 },
  h6: { x: 1.55, y: -0.45 },
};

const STEP2_TO_HINTS: LayoutHints = {
  o1: { x: -2.3, y: 0.35 },
  h1: { x: -3.0, y: 0.95 },
  c1: { x: -1.35, y: -0.25 },
  h2: { x: -1.7, y: -1.2 },
  h3: { x: -0.6, y: -1.0 },
  o2: { x: -0.75, y: 0.55 },
  h4: { x: -0.05, y: 1.15 },
  o3: { x: 1.75, y: 0.35 },
  h5: { x: 2.45, y: 0.95 },
  h6: { x: 2.15, y: -0.45 },
};

/* ================= SN1 solvolysis of tert-butyl bromide ================= */

const tButylBromide = createSpecies({
  id: "sp-tbubr",
  atoms: [
    createAtom({ id: "c0", element: "C" }),
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "br1", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-01", a: "c0", b: "c1" }),
    createBond({ id: "b-02", a: "c0", b: "c2" }),
    createBond({ id: "b-03", a: "c0", b: "c3" }),
    createBond({ id: "b-0br", a: "c0", b: "br1" }),
  ],
});

const tButylCation = createSpecies({
  id: "sp-tbu-cation",
  atoms: [
    createAtom({ id: "c0", element: "C", formalCharge: 1 }),
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-01", a: "c0", b: "c1" }),
    createBond({ id: "b-02", a: "c0", b: "c2" }),
    createBond({ id: "b-03", a: "c0", b: "c3" }),
  ],
});

const bromideSn1 = createSpecies({
  id: "sp-bromide-sn1",
  atoms: [createAtom({ id: "br1", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const IONISATION: MechanismStep = createStep({
  id: "sn1-ionisation",
  from: createState({ id: "sn1a-before", members: [{ species: tButylBromide, role: "substrate" }] }),
  to: createState({
    id: "sn1a-after",
    members: [
      { species: tButylCation, role: "intermediate" },
      { species: bromideSn1, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "bond_heterolysis", route: "sn1", reactionCenters: ["c0"] },
  arrows: [createArrow({ id: "a-ionise", source: fromBond("b-0br"), sink: toAtom("br1") })],
});

const waterNu = createSpecies({
  id: "sp-water-nu",
  atoms: [
    createAtom({ id: "ow", element: "O", lonePairs: 2 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-ow1", a: "ow", b: "hw1" }), createBond({ id: "b-ow2", a: "ow", b: "hw2" })],
});

const protonatedAlcohol = createSpecies({
  id: "sp-tbu-oh2",
  atoms: [
    createAtom({ id: "c0", element: "C" }),
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ow", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-01", a: "c0", b: "c1" }),
    createBond({ id: "b-02", a: "c0", b: "c2" }),
    createBond({ id: "b-03", a: "c0", b: "c3" }),
    createBond({ id: "b-0o", a: "c0", b: "ow" }),
    createBond({ id: "b-ow1", a: "ow", b: "hw1" }),
    createBond({ id: "b-ow2", a: "ow", b: "hw2" }),
  ],
});

const CAPTURE: MechanismStep = createStep({
  id: "sn1-capture",
  from: createState({
    id: "sn1b-before",
    members: [
      { species: tButylCation, role: "intermediate" },
      { species: waterNu, role: "nucleophile" },
    ],
  }),
  to: createState({ id: "sn1b-after", members: [{ species: protonatedAlcohol, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "sn1", reactionCenters: ["c0"] },
  arrows: [createArrow({ id: "a-capture", source: fromLonePair("ow"), sink: toBondBetween("ow", "c0") })],
});

/* ================= Acyl substitution: add, then collapse ================= */

const acetylChloride = createSpecies({
  id: "sp-acetyl-chloride",
  atoms: [
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "cl1", element: "Cl", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-mc", a: "cm", b: "c2" }),
    createBond({ id: "b-co", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-ccl", a: "c2", b: "cl1" }),
  ],
});

const hydroxideAcyl = createSpecies({
  id: "sp-hydroxide-acyl",
  atoms: [
    createAtom({ id: "o2", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh", a: "o2", b: "h1" })],
});

const tetrahedral = createSpecies({
  id: "sp-tetrahedral",
  atoms: [
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "cl1", element: "Cl", lonePairs: 3 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-mc", a: "cm", b: "c2" }),
    createBond({ id: "b-co", a: "c2", b: "o1" }),
    createBond({ id: "b-ccl", a: "c2", b: "cl1" }),
    createBond({ id: "b-co2", a: "c2", b: "o2" }),
    createBond({ id: "b-oh", a: "o2", b: "h1" }),
  ],
});

const ACYL_ADDITION: MechanismStep = createStep({
  id: "acyl-addition",
  from: createState({
    id: "acyl-a-before",
    members: [
      { species: hydroxideAcyl, role: "nucleophile" },
      { species: acetylChloride, role: "substrate" },
    ],
  }),
  to: createState({ id: "acyl-a-after", members: [{ species: tetrahedral, role: "intermediate" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["c2"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("o2"), sink: toBondBetween("o2", "c2") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-co"), sink: toAtom("o1") }),
  ],
});

const aceticAcid = createSpecies({
  id: "sp-acetic-acid",
  atoms: [
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-mc", a: "cm", b: "c2" }),
    createBond({ id: "b-co", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-co2", a: "c2", b: "o2" }),
    createBond({ id: "b-oh", a: "o2", b: "h1" }),
  ],
});

const chlorideAcyl = createSpecies({
  id: "sp-chloride-acyl",
  atoms: [createAtom({ id: "cl1", element: "Cl", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const ACYL_COLLAPSE: MechanismStep = createStep({
  id: "acyl-collapse",
  from: createState({ id: "acyl-b-before", members: [{ species: tetrahedral, role: "intermediate" }] }),
  to: createState({
    id: "acyl-b-after",
    members: [
      { species: aceticAcid, role: "product" },
      { species: chlorideAcyl, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["c2"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-expel", source: fromBond("b-ccl"), sink: toAtom("cl1") }),
  ],
});

/* ================= The aldol: enolate, then the attack ================= */

const acetone = createSpecies({
  id: "sp-acetone",
  atoms: [
    // One alpha hydrogen explicit: it is the one the base takes.
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ha", element: "H" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-c1ha", a: "c1", b: "ha" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const hydroxideEnol = createSpecies({
  id: "sp-hydroxide-enol",
  atoms: [
    createAtom({ id: "ob", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hb", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" })],
});

const enolate = createSpecies({
  id: "sp-enolate",
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

const waterEnol = createSpecies({
  id: "sp-water-enol",
  atoms: [
    createAtom({ id: "ob", element: "O", lonePairs: 2 }),
    createAtom({ id: "hb", element: "H" }),
    createAtom({ id: "ha", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" }), createBond({ id: "b-obha", a: "ob", b: "ha" })],
});

const ENOLATE_FORMATION: MechanismStep = createStep({
  id: "enolate-formation",
  from: createState({
    id: "enol-before",
    members: [
      { species: hydroxideEnol, role: "base" },
      { species: acetone, role: "substrate" },
    ],
  }),
  to: createState({
    id: "enol-after",
    members: [
      { species: enolate, role: "intermediate" },
      { species: waterEnol, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["ha", "c1"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("ob"), sink: toBondBetween("ob", "ha") }),
    createArrow({ id: "a-into-pi", source: fromBond("b-c1ha"), sink: toBondBetween("c1", "c2") }),
    createArrow({ id: "a-onto-o", source: fromBond("b-2o"), sink: toAtom("o1") }),
  ],
});

const formaldehydeAldol = createSpecies({
  id: "sp-formaldehyde-aldol",
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

const aldolAlkoxide = createSpecies({
  id: "sp-aldol-alkoxide",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1f", a: "c1", b: "cf" }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of" }),
  ],
});

const ALDOL_ATTACK: MechanismStep = createStep({
  id: "aldol-attack",
  from: createState({
    id: "aldol-before",
    members: [
      { species: enolate, role: "nucleophile" },
      { species: formaldehydeAldol, role: "substrate" },
    ],
  }),
  to: createState({ id: "aldol-after", members: [{ species: aldolAlkoxide, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["c1", "cf"] },
  arrows: [
    createArrow({ id: "a-c-attacks", source: fromBond("b-12"), sink: toBondBetween("c1", "cf") }),
    createArrow({ id: "a-reform-co", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-pi-off", source: fromBond("b-cfo"), sink: toAtom("of") }),
  ],
});

/* ================= EAS nitration: attack, then rearomatize ================= */
/* One Kekule structure, written localised, the same convention the fixture
 * corpus uses for the benzenonium sigma complex (see the adjudication notes
 * in STATUS.md: the sp3 carbon reads as a stereocentre to RDKit only because
 * one resonance form is drawn; here nothing is chiral and the ring is plain). */

const benzene = createSpecies({
  id: "sp-benzene",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
  ],
  bonds: [
    createBond({ id: "b12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
  ],
});

const nitronium = createSpecies({
  id: "sp-nitronium",
  atoms: [
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [createBond({ id: "b-no1", a: "n1", b: "o1", order: 2 }), createBond({ id: "b-no2", a: "n1", b: "o2", order: 2 })],
});

const arenium = createSpecies({
  id: "sp-arenium",
  atoms: [
    // c1 is sp3 now, its ring hydrogen EXPLICIT because step 2 takes it.
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "hx", element: "H" }),
    createAtom({ id: "c2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b1h", a: "c1", b: "hx" }),
    createBond({ id: "b12", a: "c1", b: "c2" }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c1", b: "n1" }),
    createBond({ id: "b-no1", a: "n1", b: "o1" }),
    createBond({ id: "b-no2", a: "n1", b: "o2", order: 2 }),
  ],
});

const EAS_ATTACK: MechanismStep = createStep({
  id: "eas-attack",
  from: createState({
    id: "eas-a-before",
    members: [
      { species: benzene, role: "nucleophile" },
      { species: nitronium, role: "electrophile" },
    ],
  }),
  to: createState({ id: "eas-a-after", members: [{ species: arenium, role: "intermediate" }] }),
  identity: { elementaryStep: "pi_bond_attack", route: "electrophilic_aromatic_substitution", reactionCenters: ["c1", "n1"] },
  arrows: [
    createArrow({ id: "a-ring-attacks", source: fromBond("b12"), sink: toBondBetween("c1", "n1") }),
    createArrow({ id: "a-no-relief", source: fromBond("b-no1"), sink: toAtom("o1") }),
  ],
});

/* Step 2: water takes the sp3 hydrogen and the ring rearomatizes. The arenium
 * here is the SAME structure, restated as its own from-state. */

const areniumIn = createSpecies({
  id: "sp-arenium-2",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "hx", element: "H" }),
    createAtom({ id: "c2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b1h", a: "c1", b: "hx" }),
    createBond({ id: "b12", a: "c1", b: "c2" }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c1", b: "n1" }),
    createBond({ id: "b-no1", a: "n1", b: "o1" }),
    createBond({ id: "b-no2", a: "n1", b: "o2", order: 2 }),
  ],
});

const waterEas = createSpecies({
  id: "sp-water-eas",
  atoms: [
    createAtom({ id: "ow", element: "O", lonePairs: 2 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-ow1", a: "ow", b: "hw1" }), createBond({ id: "b-ow2", a: "ow", b: "hw2" })],
});

const nitrobenzene = createSpecies({
  id: "sp-nitrobenzene",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c1", b: "n1" }),
    createBond({ id: "b-no1", a: "n1", b: "o1" }),
    createBond({ id: "b-no2", a: "n1", b: "o2", order: 2 }),
  ],
});

const hydroniumEas = createSpecies({
  id: "sp-hydronium-eas",
  atoms: [
    createAtom({ id: "ow", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
    createAtom({ id: "hx", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-ow1", a: "ow", b: "hw1" }),
    createBond({ id: "b-ow2", a: "ow", b: "hw2" }),
    createBond({ id: "b-owx", a: "ow", b: "hx" }),
  ],
});

const EAS_REAROMATIZE: MechanismStep = createStep({
  id: "eas-rearomatize",
  from: createState({
    id: "eas-b-before",
    members: [
      { species: areniumIn, role: "intermediate" },
      { species: waterEas, role: "base" },
    ],
  }),
  to: createState({
    id: "eas-b-after",
    members: [
      { species: nitrobenzene, role: "product" },
      { species: hydroniumEas, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "electrophilic_aromatic_substitution", reactionCenters: ["hx", "c1"] },
  arrows: [
    createArrow({ id: "a-take-h", source: fromLonePair("ow"), sink: toBondBetween("ow", "hx") }),
    createArrow({ id: "a-rearomatize", source: fromBond("b1h"), sink: toBondBetween("c1", "c2") }),
  ],
});

/* ================= Wittig: betaine, then the collapse ================= */
/* Trimethylphosphonium ylide on screen where the flask holds triphenyl:
 * three CH3 groups keep the canvas readable and the electron accounting is
 * identical. The brief says so out loud. */

const ylide = createSpecies({
  id: "sp-ylide",
  atoms: [
    createAtom({ id: "cy", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 2 }),
    createAtom({ id: "p1", element: "P", formalCharge: 1 }),
    createAtom({ id: "m1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cp", a: "cy", b: "p1" }),
    createBond({ id: "b-pm1", a: "p1", b: "m1" }),
    createBond({ id: "b-pm2", a: "p1", b: "m2" }),
    createBond({ id: "b-pm3", a: "p1", b: "m3" }),
  ],
});

const formaldehydeW = createSpecies({
  id: "sp-formaldehyde-w",
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

const betaine = createSpecies({
  id: "sp-betaine",
  atoms: [
    createAtom({ id: "cy", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "p1", element: "P", formalCharge: 1 }),
    createAtom({ id: "m1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cp", a: "cy", b: "p1" }),
    createBond({ id: "b-pm1", a: "p1", b: "m1" }),
    createBond({ id: "b-pm2", a: "p1", b: "m2" }),
    createBond({ id: "b-pm3", a: "p1", b: "m3" }),
    createBond({ id: "b-yf", a: "cy", b: "cf" }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of" }),
  ],
});

const WITTIG_ATTACK: MechanismStep = createStep({
  id: "wittig-attack",
  from: createState({
    id: "wit-a-before",
    members: [
      { species: ylide, role: "nucleophile" },
      { species: formaldehydeW, role: "substrate" },
    ],
  }),
  to: createState({ id: "wit-a-after", members: [{ species: betaine, role: "intermediate" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["cy", "cf"] },
  arrows: [
    createArrow({ id: "a-ylide", source: fromLonePair("cy"), sink: toBondBetween("cy", "cf") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-cfo"), sink: toAtom("of") }),
  ],
});

const ethene = createSpecies({
  id: "sp-ethene-wittig",
  atoms: [
    createAtom({ id: "cy", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-yf", a: "cy", b: "cf", order: 2 }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
  ],
});

const phosphineOxide = createSpecies({
  id: "sp-phosphine-oxide",
  atoms: [
    createAtom({ id: "p1", element: "P", formalCharge: 1 }),
    createAtom({ id: "m1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-pm1", a: "p1", b: "m1" }),
    createBond({ id: "b-pm2", a: "p1", b: "m2" }),
    createBond({ id: "b-pm3", a: "p1", b: "m3" }),
    createBond({ id: "b-po", a: "p1", b: "of" }),
  ],
});

const WITTIG_COLLAPSE: MechanismStep = createStep({
  id: "wittig-collapse",
  from: createState({ id: "wit-b-before", members: [{ species: betaine, role: "intermediate" }] }),
  to: createState({
    id: "wit-b-after",
    members: [
      { species: ethene, role: "product" },
      { species: phosphineOxide, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "ring_opening", route: "pericyclic", reactionCenters: ["cy", "p1"] },
  arrows: [
    createArrow({ id: "a-o-to-p", source: fromLonePair("of"), sink: toBondBetween("of", "p1") }),
    createArrow({ id: "a-cp-to-pi", source: fromBond("b-cp"), sink: toBondBetween("cy", "cf") }),
  ],
});

/* ================= HBr + butadiene: protonate, then 1,4 capture ================= */

const butadiene = createSpecies({
  id: "sp-butadiene",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-34", a: "c3", b: "c4", order: 2 }),
  ],
});

const hbr = createSpecies({
  id: "sp-hbr-diene",
  atoms: [createAtom({ id: "hd", element: "H" }), createAtom({ id: "brd", element: "Br", lonePairs: 3 })],
  bonds: [createBond({ id: "b-hbr", a: "hd", b: "brd" })],
});

const allylCation = createSpecies({
  id: "sp-allyl-from-diene",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "hd", element: "H" }),
    createAtom({ id: "c2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "b-1h", a: "c1", b: "hd" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-34", a: "c3", b: "c4", order: 2 }),
  ],
});

const bromideDiene = createSpecies({
  id: "sp-bromide-diene",
  atoms: [createAtom({ id: "brd", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const DIENE_PROTONATION: MechanismStep = createStep({
  id: "diene-protonation",
  from: createState({
    id: "dp-before",
    members: [
      { species: butadiene, role: "nucleophile" },
      { species: hbr, role: "substrate" },
    ],
  }),
  to: createState({
    id: "dp-after",
    members: [
      { species: allylCation, role: "intermediate" },
      { species: bromideDiene, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "pi_bond_attack", route: "electrophilic_addition_alkene", reactionCenters: ["c1"] },
  arrows: [
    createArrow({ id: "a-pi-grab", source: fromBond("b-12"), sink: toBondBetween("c1", "hd") }),
    createArrow({ id: "a-release", source: fromBond("b-hbr"), sink: toAtom("brd") }),
  ],
});

const bromide14 = createSpecies({
  id: "sp-bromide-14",
  atoms: [createAtom({ id: "brd", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const allylCation2 = createSpecies({
  id: "sp-allyl-from-diene-2",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "hd", element: "H" }),
    createAtom({ id: "c2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "b-1h", a: "c1", b: "hd" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-34", a: "c3", b: "c4", order: 2 }),
  ],
});

const product14 = createSpecies({
  id: "sp-14-product",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "hd", element: "H" }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "brd", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-1h", a: "c1", b: "hd" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3", order: 2 }),
    createBond({ id: "b-34", a: "c3", b: "c4" }),
    createBond({ id: "b-4br", a: "c4", b: "brd" }),
  ],
});

const DIENE_CAPTURE_14: MechanismStep = createStep({
  id: "diene-capture-14",
  from: createState({
    id: "dc-before",
    members: [
      { species: allylCation2, role: "intermediate" },
      { species: bromide14, role: "nucleophile" },
    ],
  }),
  to: createState({ id: "dc-after", members: [{ species: product14, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "electrophilic_addition_alkene", reactionCenters: ["c4"] },
  arrows: [
    createArrow({ id: "a-capture", source: fromLonePair("brd"), sink: toBondBetween("brd", "c4") }),
    createArrow({ id: "a-allyl-shift", source: fromBond("b-34"), sink: toBondBetween("c2", "c3") }),
  ],
});

/* ================= SNAr: the Meisenheimer, then the expulsion ================= */
/* 1-fluoro-4-nitrobenzene + methoxide. The charge relay INTO the para nitro
 * group is the whole exam question, so both steps carry it explicitly:
 * four arrows in, four arrows out. One localised Kekule form throughout. */

const fluoronitrobenzene = createSpecies({
  id: "sp-fnb",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "f1", element: "F", lonePairs: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C" }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "on1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "on2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-cf", a: "c1", b: "f1" }),
    createBond({ id: "b12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c4", b: "n1" }),
    createBond({ id: "b-no1", a: "n1", b: "on1" }),
    createBond({ id: "b-no2", a: "n1", b: "on2", order: 2 }),
  ],
});

const methoxideSnar = createSpecies({
  id: "sp-methoxide-snar",
  atoms: [
    createAtom({ id: "om", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-om", a: "om", b: "cm" })],
});

const meisenheimer = createSpecies({
  id: "sp-meisenheimer",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "f1", element: "F", lonePairs: 3 }),
    createAtom({ id: "om", element: "O", lonePairs: 2 }),
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C" }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "on1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "on2", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cf", a: "c1", b: "f1" }),
    createBond({ id: "b-com", a: "c1", b: "om" }),
    createBond({ id: "b-om", a: "om", b: "cm" }),
    createBond({ id: "b12", a: "c1", b: "c2" }),
    createBond({ id: "b23", a: "c2", b: "c3", order: 2 }),
    createBond({ id: "b34", a: "c3", b: "c4" }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c4", b: "n1", order: 2 }),
    createBond({ id: "b-no1", a: "n1", b: "on1" }),
    createBond({ id: "b-no2", a: "n1", b: "on2" }),
  ],
});

const SNAR_ADDITION: MechanismStep = createStep({
  id: "snar-addition",
  from: createState({
    id: "snar-a-before",
    members: [
      { species: methoxideSnar, role: "nucleophile" },
      { species: fluoronitrobenzene, role: "substrate" },
    ],
  }),
  to: createState({ id: "snar-a-after", members: [{ species: meisenheimer, role: "intermediate" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_aromatic_substitution", reactionCenters: ["c1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("om"), sink: toBondBetween("om", "c1") }),
    createArrow({ id: "a-relay-1", source: fromBond("b12"), sink: toBondBetween("c2", "c3") }),
    createArrow({ id: "a-relay-2", source: fromBond("b34"), sink: toBondBetween("c4", "n1") }),
    createArrow({ id: "a-onto-o", source: fromBond("b-no2"), sink: toAtom("on2") }),
  ],
});

const nitroanisole = createSpecies({
  id: "sp-nitroanisole",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "om", element: "O", lonePairs: 2 }),
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C" }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "on1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "on2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-com", a: "c1", b: "om" }),
    createBond({ id: "b-om", a: "om", b: "cm" }),
    createBond({ id: "b12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c4", b: "n1" }),
    createBond({ id: "b-no1", a: "n1", b: "on1" }),
    createBond({ id: "b-no2", a: "n1", b: "on2", order: 2 }),
  ],
});

const fluoride = createSpecies({
  id: "sp-fluoride",
  atoms: [createAtom({ id: "f1", element: "F", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const SNAR_EXPULSION: MechanismStep = createStep({
  id: "snar-expulsion",
  from: createState({ id: "snar-b-before", members: [{ species: meisenheimer, role: "intermediate" }] }),
  to: createState({
    id: "snar-b-after",
    members: [
      { species: nitroanisole, role: "product" },
      { species: fluoride, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_aromatic_substitution", reactionCenters: ["c1"] },
  arrows: [
    createArrow({ id: "a-o-back", source: fromLonePair("on2"), sink: toBondBetween("n1", "on2") }),
    createArrow({ id: "a-relay-back-1", source: fromBond("b-cn"), sink: toBondBetween("c3", "c4") }),
    createArrow({ id: "a-relay-back-2", source: fromBond("b23"), sink: toBondBetween("c1", "c2") }),
    createArrow({ id: "a-expel", source: fromBond("b-cf"), sink: toAtom("f1") }),
  ],
});

/* ================= Claisen: attack, then the alkoxide expels methoxide ================= */

const esterEnolate = createSpecies({
  id: "sp-ester-enolate",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "oe1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce1", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-2oe", a: "c2", b: "oe1" }),
    createBond({ id: "b-oece", a: "oe1", b: "ce1" }),
  ],
});

const methylAcetate = createSpecies({
  id: "sp-methyl-acetate",
  atoms: [
    createAtom({ id: "cm2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ck", element: "C" }),
    createAtom({ id: "ok", element: "O", lonePairs: 2 }),
    createAtom({ id: "oe2", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-mck", a: "cm2", b: "ck" }),
    createBond({ id: "b-cko", a: "ck", b: "ok", order: 2 }),
    createBond({ id: "b-ckoe", a: "ck", b: "oe2" }),
    createBond({ id: "b-oece2", a: "oe2", b: "ce2" }),
  ],
});

const claisenTetrahedral = createSpecies({
  id: "sp-claisen-tet",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "oe1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cm2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ck", element: "C" }),
    createAtom({ id: "ok", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "oe2", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-2oe", a: "c2", b: "oe1" }),
    createBond({ id: "b-oece", a: "oe1", b: "ce1" }),
    createBond({ id: "b-1ck", a: "c1", b: "ck" }),
    createBond({ id: "b-mck", a: "cm2", b: "ck" }),
    createBond({ id: "b-cko", a: "ck", b: "ok" }),
    createBond({ id: "b-ckoe", a: "ck", b: "oe2" }),
    createBond({ id: "b-oece2", a: "oe2", b: "ce2" }),
  ],
});

const CLAISEN_ATTACK: MechanismStep = createStep({
  id: "claisen-attack",
  from: createState({
    id: "cl-a-before",
    members: [
      { species: esterEnolate, role: "nucleophile" },
      { species: methylAcetate, role: "substrate" },
    ],
  }),
  to: createState({ id: "cl-a-after", members: [{ species: claisenTetrahedral, role: "intermediate" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["c1", "ck"] },
  arrows: [
    createArrow({ id: "a-c-attacks", source: fromBond("b-12"), sink: toBondBetween("c1", "ck") }),
    createArrow({ id: "a-reform", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-cko"), sink: toAtom("ok") }),
  ],
});

const ketoester = createSpecies({
  id: "sp-ketoester",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "oe1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cm2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ck", element: "C" }),
    createAtom({ id: "ok", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-2oe", a: "c2", b: "oe1" }),
    createBond({ id: "b-oece", a: "oe1", b: "ce1" }),
    createBond({ id: "b-1ck", a: "c1", b: "ck" }),
    createBond({ id: "b-mck", a: "cm2", b: "ck" }),
    createBond({ id: "b-cko", a: "ck", b: "ok", order: 2 }),
  ],
});

const methoxideOut2 = createSpecies({
  id: "sp-methoxide-out2",
  atoms: [
    createAtom({ id: "oe2", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "ce2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-oece2", a: "oe2", b: "ce2" })],
});

const CLAISEN_COLLAPSE: MechanismStep = createStep({
  id: "claisen-collapse",
  from: createState({ id: "cl-b-before", members: [{ species: claisenTetrahedral, role: "intermediate" }] }),
  to: createState({
    id: "cl-b-after",
    members: [
      { species: ketoester, role: "product" },
      { species: methoxideOut2, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["ck"] },
  arrows: [
    createArrow({ id: "a-reform-pi", source: fromLonePair("ok"), sink: toBondBetween("ck", "ok") }),
    createArrow({ id: "a-expel", source: fromBond("b-ckoe"), sink: toAtom("oe2") }),
  ],
});

/* ================= Keto-enol tautomerism, base-catalyzed ================= */
/* Unit 9a's opening spine node. Both directions are real chemistry; this
 * sequence runs ketone -> enol so the enolate in the middle is the same
 * intermediate every later 9-node leans on. */

const acetoneTau = createSpecies({
  id: "sp-acetone-tau",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ha", element: "H" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-c1ha", a: "c1", b: "ha" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const hydroxideTau = createSpecies({
  id: "sp-hydroxide-tau",
  atoms: [
    createAtom({ id: "ob", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hb", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" })],
});

const enolateTau = createSpecies({
  id: "sp-enolate-tau",
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

const waterTau = createSpecies({
  id: "sp-water-tau",
  atoms: [
    createAtom({ id: "ob", element: "O", lonePairs: 2 }),
    createAtom({ id: "hb", element: "H" }),
    createAtom({ id: "ha", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" }), createBond({ id: "b-obha", a: "ob", b: "ha" })],
});

const TAU_DEPROTONATE: MechanismStep = createStep({
  id: "tau-deprotonate",
  from: createState({
    id: "tau-a-before",
    members: [
      { species: hydroxideTau, role: "base" },
      { species: acetoneTau, role: "substrate" },
    ],
  }),
  to: createState({
    id: "tau-a-after",
    members: [
      { species: enolateTau, role: "intermediate" },
      { species: waterTau, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["ha", "c1"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("ob"), sink: toBondBetween("ob", "ha") }),
    createArrow({ id: "a-into-pi", source: fromBond("b-c1ha"), sink: toBondBetween("c1", "c2") }),
    createArrow({ id: "a-onto-o", source: fromBond("b-2o"), sink: toAtom("o1") }),
  ],
});

/* The enolate reprotonates ON OXYGEN this time: that is the whole point of
 * an ambident nucleophile, and the product is the enol. */

const enolateTau2 = createSpecies({
  id: "sp-enolate-tau2",
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

const waterTau2 = createSpecies({
  id: "sp-water-tau2",
  atoms: [
    createAtom({ id: "ob", element: "O", lonePairs: 2 }),
    createAtom({ id: "hb", element: "H" }),
    createAtom({ id: "ha", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" }), createBond({ id: "b-obha", a: "ob", b: "ha" })],
});

const enol = createSpecies({
  id: "sp-enol",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ha", element: "H" }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-oha", a: "o1", b: "ha" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const hydroxideTau2 = createSpecies({
  id: "sp-hydroxide-tau2",
  atoms: [
    createAtom({ id: "ob", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hb", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" })],
});

const TAU_O_PROTONATE: MechanismStep = createStep({
  id: "tau-o-protonate",
  from: createState({
    id: "tau-b-before",
    members: [
      { species: enolateTau2, role: "intermediate" },
      { species: waterTau2, role: "substrate" },
    ],
  }),
  to: createState({
    id: "tau-b-after",
    members: [
      { species: enol, role: "product" },
      { species: hydroxideTau2, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["o1", "ha"] },
  arrows: [
    createArrow({ id: "a-o-grabs", source: fromLonePair("o1"), sink: toBondBetween("o1", "ha") }),
    createArrow({ id: "a-oh-release", source: fromBond("b-obha"), sink: toAtom("ob") }),
  ],
});

/* ================= Aldol condensation: the E1cb dehydration ================= */
/* Finishing the aldol story: the beta-hydroxy carbonyl loses water through
 * its enolate. Conjugation is the driving force and the copy says so. */

const aldolProduct = createSpecies({
  id: "sp-aldol-product",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "ha2", element: "H" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "oh1", element: "O", lonePairs: 2 }),
    createAtom({ id: "hh", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-c1ha2", a: "c1", b: "ha2" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1f", a: "c1", b: "cf" }),
    createBond({ id: "b-foh", a: "cf", b: "oh1" }),
    createBond({ id: "b-ohh", a: "oh1", b: "hh" }),
  ],
});

const hydroxideCond = createSpecies({
  id: "sp-hydroxide-cond",
  atoms: [
    createAtom({ id: "ob", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hb", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" })],
});

const aldolEnolate = createSpecies({
  id: "sp-aldol-enolate",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "oh1", element: "O", lonePairs: 2 }),
    createAtom({ id: "hh", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1f", a: "c1", b: "cf" }),
    createBond({ id: "b-foh", a: "cf", b: "oh1" }),
    createBond({ id: "b-ohh", a: "oh1", b: "hh" }),
  ],
});

const waterCond = createSpecies({
  id: "sp-water-cond",
  atoms: [
    createAtom({ id: "ob", element: "O", lonePairs: 2 }),
    createAtom({ id: "hb", element: "H" }),
    createAtom({ id: "ha2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" }), createBond({ id: "b-obha2", a: "ob", b: "ha2" })],
});

const COND_DEPROTONATE: MechanismStep = createStep({
  id: "cond-deprotonate",
  from: createState({
    id: "cond-a-before",
    members: [
      { species: hydroxideCond, role: "base" },
      { species: aldolProduct, role: "substrate" },
    ],
  }),
  to: createState({
    id: "cond-a-after",
    members: [
      { species: aldolEnolate, role: "intermediate" },
      { species: waterCond, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["ha2", "c1"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("ob"), sink: toBondBetween("ob", "ha2") }),
    createArrow({ id: "a-into-pi", source: fromBond("b-c1ha2"), sink: toBondBetween("c1", "c2") }),
    createArrow({ id: "a-onto-o", source: fromBond("b-2o"), sink: toAtom("o1") }),
  ],
});

const aldolEnolate2 = createSpecies({
  id: "sp-aldol-enolate2",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "oh1", element: "O", lonePairs: 2 }),
    createAtom({ id: "hh", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1f", a: "c1", b: "cf" }),
    createBond({ id: "b-foh", a: "cf", b: "oh1" }),
    createBond({ id: "b-ohh", a: "oh1", b: "hh" }),
  ],
});

const enone = createSpecies({
  id: "sp-enone",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1f", a: "c1", b: "cf", order: 2 }),
  ],
});

const hydroxideOut2 = createSpecies({
  id: "sp-hydroxide-out2",
  atoms: [
    createAtom({ id: "oh1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hh", element: "H" }),
  ],
  bonds: [createBond({ id: "b-ohh", a: "oh1", b: "hh" })],
});

const COND_EXPEL: MechanismStep = createStep({
  id: "cond-expel",
  from: createState({ id: "cond-b-before", members: [{ species: aldolEnolate2, role: "intermediate" }] }),
  to: createState({
    id: "cond-b-after",
    members: [
      { species: enone, role: "product" },
      { species: hydroxideOut2, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "e1cb", reactionCenters: ["cf"] },
  arrows: [
    createArrow({ id: "a-pi-swing", source: fromBond("b-12"), sink: toBondBetween("c1", "cf") }),
    createArrow({ id: "a-reform-co", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-oh-leaves", source: fromBond("b-foh"), sink: toAtom("oh1") }),
  ],
});

import { TRAINER_REACTIONS } from "./reactions";

const carbonyl = TRAINER_REACTIONS.find((entry) => entry.id === "carbonyl-addition");
if (carbonyl === undefined) throw new Error("sequences need the registry's carbonyl-addition step");

/* ------------------------------------------------------------------ */
/* Unit 8 spine: saponification, the whole arc. Attack, collapse, and   */
/* the proton transfer that makes it irreversible.                      */
/* ------------------------------------------------------------------ */

const hydroxideSap = createSpecies({
  id: "sp-hydroxide-sap",
  atoms: [
    createAtom({ id: "oh1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hh1", element: "H" }),
  ],
  bonds: [createBond({ id: "b-ohh", a: "oh1", b: "hh1" })],
});

const methylAcetateSap = createSpecies({
  id: "sp-methyl-acetate-sap",
  atoms: [
    createAtom({ id: "ca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cac1", a: "ca", b: "c1" }),
    createBond({ id: "b-c1o1", a: "c1", b: "o1", order: 2 }),
    createBond({ id: "b-c1o2", a: "c1", b: "o2" }),
    createBond({ id: "b-o2cm", a: "o2", b: "cm" }),
  ],
});

const tiSap = createSpecies({
  id: "sp-ti-sap",
  atoms: [
    createAtom({ id: "ca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "oh1", element: "O", lonePairs: 2 }),
    createAtom({ id: "hh1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-cac1", a: "ca", b: "c1" }),
    createBond({ id: "b-c1o1", a: "c1", b: "o1" }),
    createBond({ id: "b-c1o2", a: "c1", b: "o2" }),
    createBond({ id: "b-o2cm", a: "o2", b: "cm" }),
    createBond({ id: "b-c1oh", a: "c1", b: "oh1" }),
    createBond({ id: "b-ohh", a: "oh1", b: "hh1" }),
  ],
});

const SAPON_ATTACK: MechanismStep = createStep({
  id: "sapon-attack",
  from: createState({
    id: "sap1-before",
    members: [
      { species: hydroxideSap, role: "nucleophile" },
      { species: methylAcetateSap, role: "substrate" },
    ],
  }),
  to: createState({ id: "sap1-after", members: [{ species: tiSap, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["oh1", "c1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("oh1"), sink: toBondBetween("oh1", "c1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-c1o1"), sink: toAtom("o1") }),
  ],
});

const aceticAcidSap = createSpecies({
  id: "sp-acetic-acid-sap",
  atoms: [
    createAtom({ id: "ca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "oh1", element: "O", lonePairs: 2 }),
    createAtom({ id: "hh1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-cac1", a: "ca", b: "c1" }),
    createBond({ id: "b-c1o1", a: "c1", b: "o1", order: 2 }),
    createBond({ id: "b-c1oh", a: "c1", b: "oh1" }),
    createBond({ id: "b-ohh", a: "oh1", b: "hh1" }),
  ],
});

const methoxideSap = createSpecies({
  id: "sp-methoxide-sap",
  atoms: [
    createAtom({ id: "o2", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-o2cm", a: "o2", b: "cm" })],
});

const SAPON_COLLAPSE: MechanismStep = createStep({
  id: "sapon-collapse",
  from: createState({ id: "sap2-before", members: [{ species: tiSap, role: "substrate" }] }),
  to: createState({
    id: "sap2-after",
    members: [
      { species: aceticAcidSap, role: "product" },
      { species: methoxideSap, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["c1"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") }),
    createArrow({ id: "a-leave", source: fromBond("b-c1o2"), sink: toAtom("o2") }),
  ],
});

const acetateSap = createSpecies({
  id: "sp-acetate-sap",
  atoms: [
    createAtom({ id: "ca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "oh1", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cac1", a: "ca", b: "c1" }),
    createBond({ id: "b-c1o1", a: "c1", b: "o1", order: 2 }),
    createBond({ id: "b-c1oh", a: "c1", b: "oh1" }),
  ],
});

const methanolSap = createSpecies({
  id: "sp-methanol-sap",
  atoms: [
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "hh1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-o2cm", a: "o2", b: "cm" }),
    createBond({ id: "b-o2h", a: "o2", b: "hh1" }),
  ],
});

const SAPON_PT: MechanismStep = createStep({
  id: "sapon-pt",
  from: createState({
    id: "sap3-before",
    members: [
      { species: methoxideSap, role: "nucleophile" },
      { species: aceticAcidSap, role: "substrate" },
    ],
  }),
  to: createState({
    id: "sap3-after",
    members: [
      { species: acetateSap, role: "product" },
      { species: methanolSap, role: "product" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["hh1", "o2"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("o2"), sink: toBondBetween("o2", "hh1") }),
    createArrow({ id: "a-release", source: fromBond("b-ohh"), sink: toAtom("oh1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 spine: transesterification. The same two beats as            */
/* saponification, with an alkoxide in and an alkoxide out.            */
/* ------------------------------------------------------------------ */

const ethoxideT = createSpecies({
  id: "sp-ethoxide-t",
  atoms: [
    createAtom({ id: "oe", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "ce1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ce2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-oece1", a: "oe", b: "ce1" }),
    createBond({ id: "b-ce1ce2", a: "ce1", b: "ce2" }),
  ],
});

const methylAcetateT = createSpecies({
  id: "sp-methyl-acetate-t",
  atoms: [
    createAtom({ id: "cta", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ct1", element: "C" }),
    createAtom({ id: "ot1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ot2", element: "O", lonePairs: 2 }),
    createAtom({ id: "ctm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-tac1", a: "cta", b: "ct1" }),
    createBond({ id: "b-t1o1", a: "ct1", b: "ot1", order: 2 }),
    createBond({ id: "b-t1o2", a: "ct1", b: "ot2" }),
    createBond({ id: "b-to2cm", a: "ot2", b: "ctm" }),
  ],
});

const tiTrans = createSpecies({
  id: "sp-ti-trans",
  atoms: [
    createAtom({ id: "cta", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ct1", element: "C" }),
    createAtom({ id: "ot1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "ot2", element: "O", lonePairs: 2 }),
    createAtom({ id: "ctm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "oe", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ce2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-tac1", a: "cta", b: "ct1" }),
    createBond({ id: "b-t1o1", a: "ct1", b: "ot1" }),
    createBond({ id: "b-t1o2", a: "ct1", b: "ot2" }),
    createBond({ id: "b-to2cm", a: "ot2", b: "ctm" }),
    createBond({ id: "b-t1oe", a: "ct1", b: "oe" }),
    createBond({ id: "b-oece1", a: "oe", b: "ce1" }),
    createBond({ id: "b-ce1ce2", a: "ce1", b: "ce2" }),
  ],
});

const TRANS_ATTACK: MechanismStep = createStep({
  id: "transester-attack",
  from: createState({
    id: "tr1-before",
    members: [
      { species: ethoxideT, role: "nucleophile" },
      { species: methylAcetateT, role: "substrate" },
    ],
  }),
  to: createState({ id: "tr1-after", members: [{ species: tiTrans, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["oe", "ct1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("oe"), sink: toBondBetween("oe", "ct1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-t1o1"), sink: toAtom("ot1") }),
  ],
});

const ethylAcetateT = createSpecies({
  id: "sp-ethyl-acetate-t",
  atoms: [
    createAtom({ id: "cta", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ct1", element: "C" }),
    createAtom({ id: "ot1", element: "O", lonePairs: 2 }),
    createAtom({ id: "oe", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ce2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-tac1", a: "cta", b: "ct1" }),
    createBond({ id: "b-t1o1", a: "ct1", b: "ot1", order: 2 }),
    createBond({ id: "b-t1oe", a: "ct1", b: "oe" }),
    createBond({ id: "b-oece1", a: "oe", b: "ce1" }),
    createBond({ id: "b-ce1ce2", a: "ce1", b: "ce2" }),
  ],
});

const methoxideT = createSpecies({
  id: "sp-methoxide-t",
  atoms: [
    createAtom({ id: "ot2", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "ctm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-to2cm", a: "ot2", b: "ctm" })],
});

const TRANS_COLLAPSE: MechanismStep = createStep({
  id: "transester-collapse",
  from: createState({ id: "tr2-before", members: [{ species: tiTrans, role: "substrate" }] }),
  to: createState({
    id: "tr2-after",
    members: [
      { species: ethylAcetateT, role: "product" },
      { species: methoxideT, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["ct1"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("ot1"), sink: toBondBetween("ot1", "ct1") }),
    createArrow({ id: "a-leave", source: fromBond("b-t1o2"), sink: toAtom("ot2") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 spine: Gilman reagent on an acyl chloride, and the reason    */
/* the run STOPS at the ketone.                                        */
/* ------------------------------------------------------------------ */

const carbanionG = createSpecies({
  id: "sp-carbanion-g",
  atoms: [createAtom({ id: "cg", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 3 })],
  bonds: [],
});

const acetylChlorideG = createSpecies({
  id: "sp-acetyl-chloride-g",
  atoms: [
    createAtom({ id: "cga", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cg1", element: "C" }),
    createAtom({ id: "og1", element: "O", lonePairs: 2 }),
    createAtom({ id: "clg", element: "Cl", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gac1", a: "cga", b: "cg1" }),
    createBond({ id: "b-g1o", a: "cg1", b: "og1", order: 2 }),
    createBond({ id: "b-g1cl", a: "cg1", b: "clg" }),
  ],
});

const tiGilman = createSpecies({
  id: "sp-ti-gilman",
  atoms: [
    createAtom({ id: "cga", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cg1", element: "C" }),
    createAtom({ id: "og1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "clg", element: "Cl", lonePairs: 3 }),
    createAtom({ id: "cg", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gac1", a: "cga", b: "cg1" }),
    createBond({ id: "b-g1o", a: "cg1", b: "og1" }),
    createBond({ id: "b-g1cl", a: "cg1", b: "clg" }),
    createBond({ id: "b-g1cg", a: "cg1", b: "cg" }),
  ],
});

const GILMAN_ATTACK: MechanismStep = createStep({
  id: "gilman-attack",
  from: createState({
    id: "gil1-before",
    members: [
      { species: carbanionG, role: "nucleophile" },
      { species: acetylChlorideG, role: "substrate" },
    ],
  }),
  to: createState({ id: "gil1-after", members: [{ species: tiGilman, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["cg", "cg1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("cg"), sink: toBondBetween("cg", "cg1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-g1o"), sink: toAtom("og1") }),
  ],
});

const acetoneG = createSpecies({
  id: "sp-acetone-g",
  atoms: [
    createAtom({ id: "cga", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cg1", element: "C" }),
    createAtom({ id: "og1", element: "O", lonePairs: 2 }),
    createAtom({ id: "cg", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gac1", a: "cga", b: "cg1" }),
    createBond({ id: "b-g1o", a: "cg1", b: "og1", order: 2 }),
    createBond({ id: "b-g1cg", a: "cg1", b: "cg" }),
  ],
});

const chlorideG = createSpecies({
  id: "sp-chloride-g",
  atoms: [createAtom({ id: "clg", element: "Cl", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const GILMAN_COLLAPSE: MechanismStep = createStep({
  id: "gilman-collapse",
  from: createState({ id: "gil2-before", members: [{ species: tiGilman, role: "substrate" }] }),
  to: createState({
    id: "gil2-after",
    members: [
      { species: acetoneG, role: "product" },
      { species: chlorideG, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["cg1"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("og1"), sink: toBondBetween("og1", "cg1") }),
    createArrow({ id: "a-leave", source: fromBond("b-g1cl"), sink: toAtom("clg") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 / Unit 10 spine: acetic anhydride acylates methylamine.      */
/* Attack, collapse, and the acetate that just left cleans up the      */
/* proton. Also the standard amine protection move.                    */
/* ------------------------------------------------------------------ */

const methylamineA = createSpecies({
  id: "sp-methylamine-a",
  atoms: [
    createAtom({ id: "na", element: "N", lonePairs: 1 }),
    createAtom({ id: "hna1", element: "H" }),
    createAtom({ id: "hna2", element: "H" }),
    createAtom({ id: "cna", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-nh1", a: "na", b: "hna1" }),
    createBond({ id: "b-nh2", a: "na", b: "hna2" }),
    createBond({ id: "b-ncm", a: "na", b: "cna" }),
  ],
});

const aceticAnhydrideA = createSpecies({
  id: "sp-acetic-anhydride-a",
  atoms: [
    createAtom({ id: "aa1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ac1", element: "C" }),
    createAtom({ id: "ao1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ob", element: "O", lonePairs: 2 }),
    createAtom({ id: "ac2", element: "C" }),
    createAtom({ id: "ao2", element: "O", lonePairs: 2 }),
    createAtom({ id: "aa2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-a1c1", a: "aa1", b: "ac1" }),
    createBond({ id: "b-c1o1", a: "ac1", b: "ao1", order: 2 }),
    createBond({ id: "b-c1ob", a: "ac1", b: "ob" }),
    createBond({ id: "b-obc2", a: "ob", b: "ac2" }),
    createBond({ id: "b-c2o2", a: "ac2", b: "ao2", order: 2 }),
    createBond({ id: "b-c2a2", a: "ac2", b: "aa2" }),
  ],
});

const tiAnhydride = createSpecies({
  id: "sp-ti-anhydride",
  atoms: [
    createAtom({ id: "aa1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ac1", element: "C" }),
    createAtom({ id: "ao1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "ob", element: "O", lonePairs: 2 }),
    createAtom({ id: "ac2", element: "C" }),
    createAtom({ id: "ao2", element: "O", lonePairs: 2 }),
    createAtom({ id: "aa2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "na", element: "N", formalCharge: 1 }),
    createAtom({ id: "hna1", element: "H" }),
    createAtom({ id: "hna2", element: "H" }),
    createAtom({ id: "cna", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-a1c1", a: "aa1", b: "ac1" }),
    createBond({ id: "b-c1o1", a: "ac1", b: "ao1" }),
    createBond({ id: "b-c1ob", a: "ac1", b: "ob" }),
    createBond({ id: "b-obc2", a: "ob", b: "ac2" }),
    createBond({ id: "b-c2o2", a: "ac2", b: "ao2", order: 2 }),
    createBond({ id: "b-c2a2", a: "ac2", b: "aa2" }),
    createBond({ id: "b-c1na", a: "ac1", b: "na" }),
    createBond({ id: "b-nh1", a: "na", b: "hna1" }),
    createBond({ id: "b-nh2", a: "na", b: "hna2" }),
    createBond({ id: "b-ncm", a: "na", b: "cna" }),
  ],
});

const ANHYDRIDE_ATTACK: MechanismStep = createStep({
  id: "anhydride-attack",
  from: createState({
    id: "anh1-before",
    members: [
      { species: methylamineA, role: "nucleophile" },
      { species: aceticAnhydrideA, role: "substrate" },
    ],
  }),
  to: createState({ id: "anh1-after", members: [{ species: tiAnhydride, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["na", "ac1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("na"), sink: toBondBetween("na", "ac1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-c1o1"), sink: toAtom("ao1") }),
  ],
});

const protonatedAmideA = createSpecies({
  id: "sp-protonated-amide-a",
  atoms: [
    createAtom({ id: "aa1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ac1", element: "C" }),
    createAtom({ id: "ao1", element: "O", lonePairs: 2 }),
    createAtom({ id: "na", element: "N", formalCharge: 1 }),
    createAtom({ id: "hna1", element: "H" }),
    createAtom({ id: "hna2", element: "H" }),
    createAtom({ id: "cna", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-a1c1", a: "aa1", b: "ac1" }),
    createBond({ id: "b-c1o1", a: "ac1", b: "ao1", order: 2 }),
    createBond({ id: "b-c1na", a: "ac1", b: "na" }),
    createBond({ id: "b-nh1", a: "na", b: "hna1" }),
    createBond({ id: "b-nh2", a: "na", b: "hna2" }),
    createBond({ id: "b-ncm", a: "na", b: "cna" }),
  ],
});

const acetateA = createSpecies({
  id: "sp-acetate-a",
  atoms: [
    createAtom({ id: "ob", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "ac2", element: "C" }),
    createAtom({ id: "ao2", element: "O", lonePairs: 2 }),
    createAtom({ id: "aa2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-obc2", a: "ob", b: "ac2" }),
    createBond({ id: "b-c2o2", a: "ac2", b: "ao2", order: 2 }),
    createBond({ id: "b-c2a2", a: "ac2", b: "aa2" }),
  ],
});

const ANHYDRIDE_COLLAPSE: MechanismStep = createStep({
  id: "anhydride-collapse",
  from: createState({ id: "anh2-before", members: [{ species: tiAnhydride, role: "substrate" }] }),
  to: createState({
    id: "anh2-after",
    members: [
      { species: protonatedAmideA, role: "product" },
      { species: acetateA, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["ac1"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("ao1"), sink: toBondBetween("ao1", "ac1") }),
    createArrow({ id: "a-leave", source: fromBond("b-c1ob"), sink: toAtom("ob") }),
  ],
});

const amideA = createSpecies({
  id: "sp-amide-a",
  atoms: [
    createAtom({ id: "aa1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ac1", element: "C" }),
    createAtom({ id: "ao1", element: "O", lonePairs: 2 }),
    createAtom({ id: "na", element: "N", lonePairs: 1 }),
    createAtom({ id: "hna2", element: "H" }),
    createAtom({ id: "cna", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-a1c1", a: "aa1", b: "ac1" }),
    createBond({ id: "b-c1o1", a: "ac1", b: "ao1", order: 2 }),
    createBond({ id: "b-c1na", a: "ac1", b: "na" }),
    createBond({ id: "b-nh2", a: "na", b: "hna2" }),
    createBond({ id: "b-ncm", a: "na", b: "cna" }),
  ],
});

const aceticAcidA = createSpecies({
  id: "sp-acetic-acid-a",
  atoms: [
    createAtom({ id: "ob", element: "O", lonePairs: 2 }),
    createAtom({ id: "hna1", element: "H" }),
    createAtom({ id: "ac2", element: "C" }),
    createAtom({ id: "ao2", element: "O", lonePairs: 2 }),
    createAtom({ id: "aa2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-obh", a: "ob", b: "hna1" }),
    createBond({ id: "b-obc2", a: "ob", b: "ac2" }),
    createBond({ id: "b-c2o2", a: "ac2", b: "ao2", order: 2 }),
    createBond({ id: "b-c2a2", a: "ac2", b: "aa2" }),
  ],
});

const ANHYDRIDE_PT: MechanismStep = createStep({
  id: "anhydride-pt",
  from: createState({
    id: "anh3-before",
    members: [
      { species: acetateA, role: "nucleophile" },
      { species: protonatedAmideA, role: "substrate" },
    ],
  }),
  to: createState({
    id: "anh3-after",
    members: [
      { species: amideA, role: "product" },
      { species: aceticAcidA, role: "product" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["hna1", "ob"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("ob"), sink: toBondBetween("ob", "hna1") }),
    createArrow({ id: "a-release", source: fromBond("b-nh1"), sink: toAtom("na") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 9a spine: acid-side alpha-halogenation. The enol does the      */
/* attacking, and bromide cleans up its own mess.                      */
/* ------------------------------------------------------------------ */

const propenolH = createSpecies({
  id: "sp-propenol-h",
  atoms: [
    createAtom({ id: "ecm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ece", element: "C" }),
    createAtom({ id: "eoe", element: "O", lonePairs: 2 }),
    createAtom({ id: "ehe", element: "H" }),
    createAtom({ id: "eca", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "b-cmece", a: "ecm", b: "ece" }),
    createBond({ id: "b-ceoe", a: "ece", b: "eoe" }),
    createBond({ id: "b-oehe", a: "eoe", b: "ehe" }),
    createBond({ id: "b-ceca", a: "ece", b: "eca", order: 2 }),
  ],
});

const bromineH = createSpecies({
  id: "sp-bromine-h",
  atoms: [
    createAtom({ id: "bra", element: "Br", lonePairs: 3 }),
    createAtom({ id: "brb", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "b-brbr", a: "bra", b: "brb" })],
});

const protBromoketoneH = createSpecies({
  id: "sp-prot-bromoketone-h",
  atoms: [
    createAtom({ id: "ecm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ece", element: "C" }),
    createAtom({ id: "eoe", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "ehe", element: "H" }),
    createAtom({ id: "eca", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "bra", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cmece", a: "ecm", b: "ece" }),
    createBond({ id: "b-ceoe", a: "ece", b: "eoe", order: 2 }),
    createBond({ id: "b-oehe", a: "eoe", b: "ehe" }),
    createBond({ id: "b-ceca", a: "ece", b: "eca" }),
    createBond({ id: "b-cabr", a: "eca", b: "bra" }),
  ],
});

const bromideH = createSpecies({
  id: "sp-bromide-h",
  atoms: [createAtom({ id: "brb", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const HALO_ACID_ATTACK: MechanismStep = createStep({
  id: "halo-acid-attack",
  from: createState({
    id: "ha1-before",
    members: [
      { species: propenolH, role: "nucleophile" },
      { species: bromineH, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ha1-after",
    members: [
      { species: protBromoketoneH, role: "product" },
      { species: bromideH, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "pi_bond_attack", route: "electrophilic_addition_alkene", reactionCenters: ["eca", "bra"] },
  arrows: [
    createArrow({ id: "a-push", source: fromLonePair("eoe"), sink: toBondBetween("eoe", "ece") }),
    createArrow({ id: "a-attack", source: fromBond("b-ceca"), sink: toBondBetween("eca", "bra") }),
    createArrow({ id: "a-leave", source: fromBond("b-brbr"), sink: toAtom("brb") }),
  ],
});

const bromoketoneH = createSpecies({
  id: "sp-bromoketone-h",
  atoms: [
    createAtom({ id: "ecm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ece", element: "C" }),
    createAtom({ id: "eoe", element: "O", lonePairs: 2 }),
    createAtom({ id: "eca", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "bra", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cmece", a: "ecm", b: "ece" }),
    createBond({ id: "b-ceoe", a: "ece", b: "eoe", order: 2 }),
    createBond({ id: "b-ceca", a: "ece", b: "eca" }),
    createBond({ id: "b-cabr", a: "eca", b: "bra" }),
  ],
});

const hbrH = createSpecies({
  id: "sp-hbr-h",
  atoms: [
    createAtom({ id: "brb", element: "Br", lonePairs: 3 }),
    createAtom({ id: "ehe", element: "H" }),
  ],
  bonds: [createBond({ id: "b-brh", a: "brb", b: "ehe" })],
});

const HALO_ACID_PT: MechanismStep = createStep({
  id: "halo-acid-pt",
  from: createState({
    id: "ha2-before",
    members: [
      { species: bromideH, role: "nucleophile" },
      { species: protBromoketoneH, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ha2-after",
    members: [
      { species: bromoketoneH, role: "product" },
      { species: hbrH, role: "product" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["ehe", "brb"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("brb"), sink: toBondBetween("brb", "ehe") }),
    createArrow({ id: "a-release", source: fromBond("b-oehe"), sink: toAtom("eoe") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 9b spine: crossed aldol, done the only safe way. The partner   */
/* has no alpha hydrogens, so only one enolate can exist.              */
/* ------------------------------------------------------------------ */

const acetoneEnolateX = createSpecies({
  id: "sp-acetone-enolate-x",
  atoms: [
    createAtom({ id: "ka", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "kb", element: "C" }),
    createAtom({ id: "ko", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "kc", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-kakb", a: "ka", b: "kb", order: 2 }),
    createBond({ id: "b-kbko", a: "kb", b: "ko" }),
    createBond({ id: "b-kbkc", a: "kb", b: "kc" }),
  ],
});

const formaldehydeX = createSpecies({
  id: "sp-formaldehyde-x",
  atoms: [
    createAtom({ id: "fc", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "fo", element: "O", lonePairs: 2 }),
  ],
  bonds: [createBond({ id: "b-fcfo", a: "fc", b: "fo", order: 2 })],
});

const crossedAlkoxideX = createSpecies({
  id: "sp-crossed-alkoxide-x",
  atoms: [
    createAtom({ id: "ka", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "kb", element: "C" }),
    createAtom({ id: "ko", element: "O", lonePairs: 2 }),
    createAtom({ id: "kc", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "fc", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "fo", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-kakb", a: "ka", b: "kb" }),
    createBond({ id: "b-kbko", a: "kb", b: "ko", order: 2 }),
    createBond({ id: "b-kbkc", a: "kb", b: "kc" }),
    createBond({ id: "b-kafc", a: "ka", b: "fc" }),
    createBond({ id: "b-fcfo", a: "fc", b: "fo" }),
  ],
});

const CROSSED_ATTACK: MechanismStep = createStep({
  id: "crossed-attack",
  from: createState({
    id: "cx1-before",
    members: [
      { species: acetoneEnolateX, role: "nucleophile" },
      { species: formaldehydeX, role: "substrate" },
    ],
  }),
  to: createState({ id: "cx1-after", members: [{ species: crossedAlkoxideX, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["ka", "fc"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromBond("b-kakb"), sink: toBondBetween("ka", "fc") }),
    createArrow({ id: "a-reform", source: fromLonePair("ko"), sink: toBondBetween("ko", "kb") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-fcfo"), sink: toAtom("fo") }),
  ],
});

const waterX = createSpecies({
  id: "sp-water-x",
  atoms: [
    createAtom({ id: "wo", element: "O", lonePairs: 2 }),
    createAtom({ id: "wh1", element: "H" }),
    createAtom({ id: "wh2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-wowh1", a: "wo", b: "wh1" }),
    createBond({ id: "b-wowh2", a: "wo", b: "wh2" }),
  ],
});

const crossedAldolX = createSpecies({
  id: "sp-crossed-aldol-x",
  atoms: [
    createAtom({ id: "ka", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "kb", element: "C" }),
    createAtom({ id: "ko", element: "O", lonePairs: 2 }),
    createAtom({ id: "kc", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "fc", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "fo", element: "O", lonePairs: 2 }),
    createAtom({ id: "wh1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-kakb", a: "ka", b: "kb" }),
    createBond({ id: "b-kbko", a: "kb", b: "ko", order: 2 }),
    createBond({ id: "b-kbkc", a: "kb", b: "kc" }),
    createBond({ id: "b-kafc", a: "ka", b: "fc" }),
    createBond({ id: "b-fcfo", a: "fc", b: "fo" }),
    createBond({ id: "b-foh", a: "fo", b: "wh1" }),
  ],
});

const hydroxideX = createSpecies({
  id: "sp-hydroxide-x",
  atoms: [
    createAtom({ id: "wo", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "wh2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-wowh2", a: "wo", b: "wh2" })],
});

const CROSSED_PROTONATE: MechanismStep = createStep({
  id: "crossed-protonate",
  from: createState({
    id: "cx2-before",
    members: [
      { species: crossedAlkoxideX, role: "nucleophile" },
      { species: waterX, role: "substrate" },
    ],
  }),
  to: createState({
    id: "cx2-after",
    members: [
      { species: crossedAldolX, role: "product" },
      { species: hydroxideX, role: "product" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["wh1", "fo"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("fo"), sink: toBondBetween("fo", "wh1") }),
    createArrow({ id: "a-release", source: fromBond("b-wowh1"), sink: toAtom("wo") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 9b spine: Dieckmann. The Claisen goes intramolecular and a     */
/* five-membered ring keto-ester falls out.                            */
/* ------------------------------------------------------------------ */

const adipateEnolateD = createSpecies({
  id: "sp-adipate-enolate-d",
  atoms: [
    createAtom({ id: "dm1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "dm1o", element: "O", lonePairs: 2 }),
    createAtom({ id: "dc1", element: "C" }),
    createAtom({ id: "dk1", element: "O", lonePairs: 2 }),
    createAtom({ id: "dc2", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 1 }),
    createAtom({ id: "dc3", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dc4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dc5", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dc6", element: "C" }),
    createAtom({ id: "dk6", element: "O", lonePairs: 2 }),
    createAtom({ id: "dm6o", element: "O", lonePairs: 2 }),
    createAtom({ id: "dm6", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-dm1o", a: "dm1o", b: "dm1" }),
    createBond({ id: "b-dc1o", a: "dc1", b: "dm1o" }),
    createBond({ id: "b-dc1k1", a: "dc1", b: "dk1", order: 2 }),
    createBond({ id: "b-dc12", a: "dc1", b: "dc2" }),
    createBond({ id: "b-dc23", a: "dc2", b: "dc3" }),
    createBond({ id: "b-dc34", a: "dc3", b: "dc4" }),
    createBond({ id: "b-dc45", a: "dc4", b: "dc5" }),
    createBond({ id: "b-dc56", a: "dc5", b: "dc6" }),
    createBond({ id: "b-dc6k6", a: "dc6", b: "dk6", order: 2 }),
    createBond({ id: "b-dc6o", a: "dc6", b: "dm6o" }),
    createBond({ id: "b-dm6o", a: "dm6o", b: "dm6" }),
  ],
});

const dieckmannTI = createSpecies({
  id: "sp-dieckmann-ti",
  atoms: [
    createAtom({ id: "dm1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "dm1o", element: "O", lonePairs: 2 }),
    createAtom({ id: "dc1", element: "C" }),
    createAtom({ id: "dk1", element: "O", lonePairs: 2 }),
    createAtom({ id: "dc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "dc3", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dc4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dc5", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dc6", element: "C" }),
    createAtom({ id: "dk6", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "dm6o", element: "O", lonePairs: 2 }),
    createAtom({ id: "dm6", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-dm1o", a: "dm1o", b: "dm1" }),
    createBond({ id: "b-dc1o", a: "dc1", b: "dm1o" }),
    createBond({ id: "b-dc1k1", a: "dc1", b: "dk1", order: 2 }),
    createBond({ id: "b-dc12", a: "dc1", b: "dc2" }),
    createBond({ id: "b-dc23", a: "dc2", b: "dc3" }),
    createBond({ id: "b-dc34", a: "dc3", b: "dc4" }),
    createBond({ id: "b-dc45", a: "dc4", b: "dc5" }),
    createBond({ id: "b-dc56", a: "dc5", b: "dc6" }),
    createBond({ id: "b-dc6k6", a: "dc6", b: "dk6" }),
    createBond({ id: "b-dc6o", a: "dc6", b: "dm6o" }),
    createBond({ id: "b-dm6o", a: "dm6o", b: "dm6" }),
    createBond({ id: "b-dc26", a: "dc2", b: "dc6" }),
  ],
});

const DIECKMANN_ATTACK: MechanismStep = createStep({
  id: "dieckmann-attack",
  from: createState({
    id: "dk1-before",
    members: [{ species: adipateEnolateD, role: "substrate" }],
  }),
  to: createState({ id: "dk1-after", members: [{ species: dieckmannTI, role: "product" }] }),
  identity: { elementaryStep: "ring_closure", route: "nucleophilic_acyl_substitution", reactionCenters: ["dc2", "dc6"] },
  arrows: [
    createArrow({ id: "a-bite", source: fromLonePair("dc2"), sink: toBondBetween("dc2", "dc6") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-dc6k6"), sink: toAtom("dk6") }),
  ],
});

const ketoEsterD = createSpecies({
  id: "sp-keto-ester-d",
  atoms: [
    createAtom({ id: "dm1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "dm1o", element: "O", lonePairs: 2 }),
    createAtom({ id: "dc1", element: "C" }),
    createAtom({ id: "dk1", element: "O", lonePairs: 2 }),
    createAtom({ id: "dc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "dc3", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dc4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dc5", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dc6", element: "C" }),
    createAtom({ id: "dk6", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-dm1o", a: "dm1o", b: "dm1" }),
    createBond({ id: "b-dc1o", a: "dc1", b: "dm1o" }),
    createBond({ id: "b-dc1k1", a: "dc1", b: "dk1", order: 2 }),
    createBond({ id: "b-dc12", a: "dc1", b: "dc2" }),
    createBond({ id: "b-dc23", a: "dc2", b: "dc3" }),
    createBond({ id: "b-dc34", a: "dc3", b: "dc4" }),
    createBond({ id: "b-dc45", a: "dc4", b: "dc5" }),
    createBond({ id: "b-dc56", a: "dc5", b: "dc6" }),
    createBond({ id: "b-dc6k6", a: "dc6", b: "dk6", order: 2 }),
    createBond({ id: "b-dc26", a: "dc2", b: "dc6" }),
  ],
});

const methoxideD = createSpecies({
  id: "sp-methoxide-d",
  atoms: [
    createAtom({ id: "dm6o", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "dm6", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-dm6o", a: "dm6o", b: "dm6" })],
});

const DIECKMANN_COLLAPSE: MechanismStep = createStep({
  id: "dieckmann-collapse",
  from: createState({ id: "dk2-before", members: [{ species: dieckmannTI, role: "substrate" }] }),
  to: createState({
    id: "dk2-after",
    members: [
      { species: ketoEsterD, role: "product" },
      { species: methoxideD, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["dc6"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("dk6"), sink: toBondBetween("dk6", "dc6") }),
    createArrow({ id: "a-leave", source: fromBond("b-dc6o"), sink: toAtom("dm6o") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 9c spine: malonic ester synthesis, the two moves that matter.  */
/* Deprotonate the doubly activated carbon, then alkylate it.          */
/* ------------------------------------------------------------------ */

const ethoxideM = createSpecies({
  id: "sp-ethoxide-m",
  atoms: [
    createAtom({ id: "moe", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "mce1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "mce2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-moece1", a: "moe", b: "mce1" }),
    createBond({ id: "b-mce12", a: "mce1", b: "mce2" }),
  ],
});

const malonateM = createSpecies({
  id: "sp-malonate-m",
  atoms: [
    createAtom({ id: "mm1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "mo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "mc1", element: "C" }),
    createAtom({ id: "mk1", element: "O", lonePairs: 2 }),
    createAtom({ id: "mch", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "mhx", element: "H" }),
    createAtom({ id: "mc2", element: "C" }),
    createAtom({ id: "mk2", element: "O", lonePairs: 2 }),
    createAtom({ id: "mo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "mm2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-m1o1", a: "mm1", b: "mo1" }),
    createBond({ id: "b-o1c1", a: "mo1", b: "mc1" }),
    createBond({ id: "b-c1k1", a: "mc1", b: "mk1", order: 2 }),
    createBond({ id: "b-c1ch", a: "mc1", b: "mch" }),
    createBond({ id: "b-chhx", a: "mch", b: "mhx" }),
    createBond({ id: "b-chc2", a: "mch", b: "mc2" }),
    createBond({ id: "b-c2k2", a: "mc2", b: "mk2", order: 2 }),
    createBond({ id: "b-c2o2", a: "mc2", b: "mo2" }),
    createBond({ id: "b-o2m2", a: "mo2", b: "mm2" }),
  ],
});

const ethanolM = createSpecies({
  id: "sp-ethanol-m",
  atoms: [
    createAtom({ id: "moe", element: "O", lonePairs: 2 }),
    createAtom({ id: "mhx", element: "H" }),
    createAtom({ id: "mce1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "mce2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-moeh", a: "moe", b: "mhx" }),
    createBond({ id: "b-moece1", a: "moe", b: "mce1" }),
    createBond({ id: "b-mce12", a: "mce1", b: "mce2" }),
  ],
});

const malonateAnionM = createSpecies({
  id: "sp-malonate-anion-m",
  atoms: [
    createAtom({ id: "mm1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "mo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "mc1", element: "C" }),
    createAtom({ id: "mk1", element: "O", lonePairs: 2 }),
    createAtom({ id: "mch", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 1 }),
    createAtom({ id: "mc2", element: "C" }),
    createAtom({ id: "mk2", element: "O", lonePairs: 2 }),
    createAtom({ id: "mo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "mm2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-m1o1", a: "mm1", b: "mo1" }),
    createBond({ id: "b-o1c1", a: "mo1", b: "mc1" }),
    createBond({ id: "b-c1k1", a: "mc1", b: "mk1", order: 2 }),
    createBond({ id: "b-c1ch", a: "mc1", b: "mch" }),
    createBond({ id: "b-chc2", a: "mch", b: "mc2" }),
    createBond({ id: "b-c2k2", a: "mc2", b: "mk2", order: 2 }),
    createBond({ id: "b-c2o2", a: "mc2", b: "mo2" }),
    createBond({ id: "b-o2m2", a: "mo2", b: "mm2" }),
  ],
});

const MALONIC_DEPROT: MechanismStep = createStep({
  id: "malonic-deprot",
  from: createState({
    id: "ma1-before",
    members: [
      { species: ethoxideM, role: "nucleophile" },
      { species: malonateM, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ma1-after",
    members: [
      { species: malonateAnionM, role: "product" },
      { species: ethanolM, role: "product" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["mhx", "moe"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("moe"), sink: toBondBetween("moe", "mhx") }),
    createArrow({ id: "a-release", source: fromBond("b-chhx"), sink: toAtom("mch") }),
  ],
});

const bromomethaneM = createSpecies({
  id: "sp-bromomethane-m",
  atoms: [
    createAtom({ id: "mcx", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "mbr", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "b-cxbr", a: "mcx", b: "mbr" })],
});

const methylMalonateM = createSpecies({
  id: "sp-methyl-malonate-m",
  atoms: [
    createAtom({ id: "mm1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "mo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "mc1", element: "C" }),
    createAtom({ id: "mk1", element: "O", lonePairs: 2 }),
    createAtom({ id: "mch", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "mcx", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "mc2", element: "C" }),
    createAtom({ id: "mk2", element: "O", lonePairs: 2 }),
    createAtom({ id: "mo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "mm2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-m1o1", a: "mm1", b: "mo1" }),
    createBond({ id: "b-o1c1", a: "mo1", b: "mc1" }),
    createBond({ id: "b-c1k1", a: "mc1", b: "mk1", order: 2 }),
    createBond({ id: "b-c1ch", a: "mc1", b: "mch" }),
    createBond({ id: "b-chcx", a: "mch", b: "mcx" }),
    createBond({ id: "b-chc2", a: "mch", b: "mc2" }),
    createBond({ id: "b-c2k2", a: "mc2", b: "mk2", order: 2 }),
    createBond({ id: "b-c2o2", a: "mc2", b: "mo2" }),
    createBond({ id: "b-o2m2", a: "mo2", b: "mm2" }),
  ],
});

const bromideM = createSpecies({
  id: "sp-bromide-m",
  atoms: [createAtom({ id: "mbr", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const MALONIC_ALKYLATE: MechanismStep = createStep({
  id: "malonic-alkylate",
  from: createState({
    id: "ma2-before",
    members: [
      { species: malonateAnionM, role: "nucleophile" },
      { species: bromomethaneM, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ma2-after",
    members: [
      { species: methylMalonateM, role: "product" },
      { species: bromideM, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "concerted_substitution", route: "sn2", reactionCenters: ["mch", "mcx"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("mch"), sink: toBondBetween("mch", "mcx") }),
    createArrow({ id: "a-leave", source: fromBond("b-cxbr"), sink: toAtom("mbr") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 9c capstone: Robinson annulation. Michael, then the ring       */
/* closes, then the water leaves. Three moves, one new six-ring.       */
/* ------------------------------------------------------------------ */

const acetoneEnolateR = createSpecies({
  id: "sp-acetone-enolate-r",
  atoms: [
    createAtom({ id: "ra", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "rb", element: "C" }),
    createAtom({ id: "ro", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "rc", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-rarb", a: "ra", b: "rb", order: 2 }),
    createBond({ id: "b-rbro", a: "rb", b: "ro" }),
    createBond({ id: "b-rbrc", a: "rb", b: "rc" }),
  ],
});

const mvkR = createSpecies({
  id: "sp-mvk-r",
  atoms: [
    createAtom({ id: "wb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "wa", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "wk", element: "C" }),
    createAtom({ id: "wo", element: "O", lonePairs: 2 }),
    createAtom({ id: "wm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-wbwa", a: "wb", b: "wa", order: 2 }),
    createBond({ id: "b-wawk", a: "wa", b: "wk" }),
    createBond({ id: "b-wkwo", a: "wk", b: "wo", order: 2 }),
    createBond({ id: "b-wkwm", a: "wk", b: "wm" }),
  ],
});

const michaelAdductR = createSpecies({
  id: "sp-michael-adduct-r",
  atoms: [
    createAtom({ id: "ra", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "rb", element: "C" }),
    createAtom({ id: "ro", element: "O", lonePairs: 2 }),
    createAtom({ id: "rc", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "wb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "wa", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "wk", element: "C" }),
    createAtom({ id: "wo", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "wm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-rarb", a: "ra", b: "rb" }),
    createBond({ id: "b-rbro", a: "rb", b: "ro", order: 2 }),
    createBond({ id: "b-rbrc", a: "rb", b: "rc" }),
    createBond({ id: "b-rawb", a: "ra", b: "wb" }),
    createBond({ id: "b-wbwa", a: "wb", b: "wa" }),
    createBond({ id: "b-wawk", a: "wa", b: "wk", order: 2 }),
    createBond({ id: "b-wkwo", a: "wk", b: "wo" }),
    createBond({ id: "b-wkwm", a: "wk", b: "wm" }),
  ],
});

const ROBINSON_MICHAEL: MechanismStep = createStep({
  id: "robinson-michael",
  from: createState({
    id: "rb1-before",
    members: [
      { species: acetoneEnolateR, role: "nucleophile" },
      { species: mvkR, role: "substrate" },
    ],
  }),
  to: createState({ id: "rb1-after", members: [{ species: michaelAdductR, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["ra", "wb"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromBond("b-rarb"), sink: toBondBetween("ra", "wb") }),
    createArrow({ id: "a-reform", source: fromLonePair("ro"), sink: toBondBetween("ro", "rb") }),
    createArrow({ id: "a-shift", source: fromBond("b-wbwa"), sink: toBondBetween("wa", "wk") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-wkwo"), sink: toAtom("wo") }),
  ],
});

const heptanedioneEnolateR = createSpecies({
  id: "sp-heptanedione-enolate-r",
  atoms: [
    createAtom({ id: "h1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h2", element: "C" }),
    createAtom({ id: "ho2", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "h3", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h5", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h6", element: "C" }),
    createAtom({ id: "ho6", element: "O", lonePairs: 2 }),
    createAtom({ id: "h7", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-h12", a: "h1", b: "h2", order: 2 }),
    createBond({ id: "b-h2o", a: "h2", b: "ho2" }),
    createBond({ id: "b-h23", a: "h2", b: "h3" }),
    createBond({ id: "b-h34", a: "h3", b: "h4" }),
    createBond({ id: "b-h45", a: "h4", b: "h5" }),
    createBond({ id: "b-h56", a: "h5", b: "h6" }),
    createBond({ id: "b-h6o", a: "h6", b: "ho6", order: 2 }),
    createBond({ id: "b-h67", a: "h6", b: "h7" }),
  ],
});

const cyclicAldolR = createSpecies({
  id: "sp-cyclic-aldol-r",
  atoms: [
    createAtom({ id: "h1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h2", element: "C" }),
    createAtom({ id: "ho2", element: "O", lonePairs: 2 }),
    createAtom({ id: "h3", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h5", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h6", element: "C" }),
    createAtom({ id: "ho6", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "h7", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-h12", a: "h1", b: "h2" }),
    createBond({ id: "b-h2o", a: "h2", b: "ho2", order: 2 }),
    createBond({ id: "b-h23", a: "h2", b: "h3" }),
    createBond({ id: "b-h34", a: "h3", b: "h4" }),
    createBond({ id: "b-h45", a: "h4", b: "h5" }),
    createBond({ id: "b-h56", a: "h5", b: "h6" }),
    createBond({ id: "b-h6o", a: "h6", b: "ho6" }),
    createBond({ id: "b-h67", a: "h6", b: "h7" }),
    createBond({ id: "b-h16", a: "h1", b: "h6" }),
  ],
});

const ROBINSON_CLOSE: MechanismStep = createStep({
  id: "robinson-close",
  from: createState({
    id: "rb2-before",
    members: [{ species: heptanedioneEnolateR, role: "substrate" }],
  }),
  to: createState({ id: "rb2-after", members: [{ species: cyclicAldolR, role: "product" }] }),
  identity: { elementaryStep: "ring_closure", route: "nucleophilic_addition_carbonyl", reactionCenters: ["h1", "h6"] },
  arrows: [
    createArrow({ id: "a-bite", source: fromBond("b-h12"), sink: toBondBetween("h1", "h6") }),
    createArrow({ id: "a-reform", source: fromLonePair("ho2"), sink: toBondBetween("ho2", "h2") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-h6o"), sink: toAtom("ho6") }),
  ],
});

const aldolCarbanionR = createSpecies({
  id: "sp-aldol-carbanion-r",
  atoms: [
    createAtom({ id: "h1", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 1 }),
    createAtom({ id: "h2", element: "C" }),
    createAtom({ id: "ho2", element: "O", lonePairs: 2 }),
    createAtom({ id: "h3", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h5", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h6", element: "C" }),
    createAtom({ id: "ho6", element: "O", lonePairs: 2 }),
    createAtom({ id: "hoh", element: "H" }),
    createAtom({ id: "h7", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-h12", a: "h1", b: "h2" }),
    createBond({ id: "b-h2o", a: "h2", b: "ho2", order: 2 }),
    createBond({ id: "b-h23", a: "h2", b: "h3" }),
    createBond({ id: "b-h34", a: "h3", b: "h4" }),
    createBond({ id: "b-h45", a: "h4", b: "h5" }),
    createBond({ id: "b-h56", a: "h5", b: "h6" }),
    createBond({ id: "b-h6o", a: "h6", b: "ho6" }),
    createBond({ id: "b-oh", a: "ho6", b: "hoh" }),
    createBond({ id: "b-h67", a: "h6", b: "h7" }),
    createBond({ id: "b-h16", a: "h1", b: "h6" }),
  ],
});

const enoneR = createSpecies({
  id: "sp-enone-r",
  atoms: [
    createAtom({ id: "h1", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "h2", element: "C" }),
    createAtom({ id: "ho2", element: "O", lonePairs: 2 }),
    createAtom({ id: "h3", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h5", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h6", element: "C" }),
    createAtom({ id: "h7", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-h12", a: "h1", b: "h2" }),
    createBond({ id: "b-h2o", a: "h2", b: "ho2", order: 2 }),
    createBond({ id: "b-h23", a: "h2", b: "h3" }),
    createBond({ id: "b-h34", a: "h3", b: "h4" }),
    createBond({ id: "b-h45", a: "h4", b: "h5" }),
    createBond({ id: "b-h56", a: "h5", b: "h6" }),
    createBond({ id: "b-h67", a: "h6", b: "h7" }),
    createBond({ id: "b-h16", a: "h1", b: "h6", order: 2 }),
  ],
});

const hydroxideR = createSpecies({
  id: "sp-hydroxide-r",
  atoms: [
    createAtom({ id: "ho6", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hoh", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh", a: "ho6", b: "hoh" })],
});

const ROBINSON_E1CB: MechanismStep = createStep({
  id: "robinson-e1cb",
  from: createState({
    id: "rb3-before",
    members: [{ species: aldolCarbanionR, role: "substrate" }],
  }),
  to: createState({
    id: "rb3-after",
    members: [
      { species: enoneR, role: "product" },
      { species: hydroxideR, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "e1cb", reactionCenters: ["h1", "h6"] },
  arrows: [
    createArrow({ id: "a-pi", source: fromLonePair("h1"), sink: toBondBetween("h1", "h6") }),
    createArrow({ id: "a-leave", source: fromBond("b-h6o"), sink: toAtom("ho6") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 spine: Fischer esterification, the three beats that matter.  */
/* Protonate, attack, lose water. The proton shuffles between beats    */
/* are narrated, not drawn: they are bookkeeping, not chemistry.       */
/* ------------------------------------------------------------------ */

const hydroniumF = createSpecies({
  id: "sp-hydronium-f",
  atoms: [
    createAtom({ id: "fo3", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "fh1", element: "H" }),
    createAtom({ id: "fh2", element: "H" }),
    createAtom({ id: "fh3", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-fo3h1", a: "fo3", b: "fh1" }),
    createBond({ id: "b-fo3h2", a: "fo3", b: "fh2" }),
    createBond({ id: "b-fo3h3", a: "fo3", b: "fh3" }),
  ],
});

const aceticAcidF = createSpecies({
  id: "sp-acetic-acid-f",
  atoms: [
    createAtom({ id: "fca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "fc1", element: "C" }),
    createAtom({ id: "fo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "fo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "fho", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-fcac1", a: "fca", b: "fc1" }),
    createBond({ id: "b-fc1o1", a: "fc1", b: "fo1", order: 2 }),
    createBond({ id: "b-fc1o2", a: "fc1", b: "fo2" }),
    createBond({ id: "b-fo2h", a: "fo2", b: "fho" }),
  ],
});

const protAcidF = createSpecies({
  id: "sp-prot-acid-f",
  atoms: [
    createAtom({ id: "fca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "fc1", element: "C" }),
    createAtom({ id: "fo1", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "fh1", element: "H" }),
    createAtom({ id: "fo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "fho", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-fcac1", a: "fca", b: "fc1" }),
    createBond({ id: "b-fc1o1", a: "fc1", b: "fo1", order: 2 }),
    createBond({ id: "b-fo1h", a: "fo1", b: "fh1" }),
    createBond({ id: "b-fc1o2", a: "fc1", b: "fo2" }),
    createBond({ id: "b-fo2h", a: "fo2", b: "fho" }),
  ],
});

const waterF = createSpecies({
  id: "sp-water-f",
  atoms: [
    createAtom({ id: "fo3", element: "O", lonePairs: 2 }),
    createAtom({ id: "fh2", element: "H" }),
    createAtom({ id: "fh3", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-fo3h2", a: "fo3", b: "fh2" }),
    createBond({ id: "b-fo3h3", a: "fo3", b: "fh3" }),
  ],
});

const FISCHER_PROTONATE: MechanismStep = createStep({
  id: "fischer-protonate",
  from: createState({
    id: "fi1-before",
    members: [
      { species: aceticAcidF, role: "nucleophile" },
      { species: hydroniumF, role: "substrate" },
    ],
  }),
  to: createState({
    id: "fi1-after",
    members: [
      { species: protAcidF, role: "product" },
      { species: waterF, role: "product" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["fh1", "fo1"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("fo1"), sink: toBondBetween("fo1", "fh1") }),
    createArrow({ id: "a-release", source: fromBond("b-fo3h1"), sink: toAtom("fo3") }),
  ],
});

const methanolF = createSpecies({
  id: "sp-methanol-f",
  atoms: [
    createAtom({ id: "fom", element: "O", lonePairs: 2 }),
    createAtom({ id: "fhm", element: "H" }),
    createAtom({ id: "fcm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-fomh", a: "fom", b: "fhm" }),
    createBond({ id: "b-fomc", a: "fom", b: "fcm" }),
  ],
});

const tiFischer = createSpecies({
  id: "sp-ti-fischer",
  atoms: [
    createAtom({ id: "fca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "fc1", element: "C" }),
    createAtom({ id: "fo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "fh1", element: "H" }),
    createAtom({ id: "fo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "fho", element: "H" }),
    createAtom({ id: "fom", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "fhm", element: "H" }),
    createAtom({ id: "fcm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-fcac1", a: "fca", b: "fc1" }),
    createBond({ id: "b-fc1o1", a: "fc1", b: "fo1" }),
    createBond({ id: "b-fo1h", a: "fo1", b: "fh1" }),
    createBond({ id: "b-fc1o2", a: "fc1", b: "fo2" }),
    createBond({ id: "b-fo2h", a: "fo2", b: "fho" }),
    createBond({ id: "b-fc1om", a: "fc1", b: "fom" }),
    createBond({ id: "b-fomh", a: "fom", b: "fhm" }),
    createBond({ id: "b-fomc", a: "fom", b: "fcm" }),
  ],
});

const FISCHER_ATTACK: MechanismStep = createStep({
  id: "fischer-attack",
  from: createState({
    id: "fi2-before",
    members: [
      { species: methanolF, role: "nucleophile" },
      { species: protAcidF, role: "substrate" },
    ],
  }),
  to: createState({ id: "fi2-after", members: [{ species: tiFischer, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["fom", "fc1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("fom"), sink: toBondBetween("fom", "fc1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-fc1o1"), sink: toAtom("fo1") }),
  ],
});

const tiWaterF = createSpecies({
  id: "sp-ti-water-f",
  atoms: [
    createAtom({ id: "fca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "fc1", element: "C" }),
    createAtom({ id: "foh", element: "O", lonePairs: 2 }),
    createAtom({ id: "fhh", element: "H" }),
    createAtom({ id: "fow", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "fw1", element: "H" }),
    createAtom({ id: "fw2", element: "H" }),
    createAtom({ id: "fom", element: "O", lonePairs: 2 }),
    createAtom({ id: "fcm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-fcac1", a: "fca", b: "fc1" }),
    createBond({ id: "b-fc1oh", a: "fc1", b: "foh" }),
    createBond({ id: "b-fohh", a: "foh", b: "fhh" }),
    createBond({ id: "b-fc1ow", a: "fc1", b: "fow" }),
    createBond({ id: "b-fowh1", a: "fow", b: "fw1" }),
    createBond({ id: "b-fowh2", a: "fow", b: "fw2" }),
    createBond({ id: "b-fc1om", a: "fc1", b: "fom" }),
    createBond({ id: "b-fomc", a: "fom", b: "fcm" }),
  ],
});

const protEsterF = createSpecies({
  id: "sp-prot-ester-f",
  atoms: [
    createAtom({ id: "fca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "fc1", element: "C" }),
    createAtom({ id: "foh", element: "O", lonePairs: 2 }),
    createAtom({ id: "fhh", element: "H" }),
    createAtom({ id: "fom", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "fcm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-fcac1", a: "fca", b: "fc1" }),
    createBond({ id: "b-fc1oh", a: "fc1", b: "foh" }),
    createBond({ id: "b-fohh", a: "foh", b: "fhh" }),
    createBond({ id: "b-fc1om", a: "fc1", b: "fom", order: 2 }),
    createBond({ id: "b-fomc", a: "fom", b: "fcm" }),
  ],
});

const waterOutF = createSpecies({
  id: "sp-water-out-f",
  atoms: [
    createAtom({ id: "fow", element: "O", lonePairs: 2 }),
    createAtom({ id: "fw1", element: "H" }),
    createAtom({ id: "fw2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-fowh1", a: "fow", b: "fw1" }),
    createBond({ id: "b-fowh2", a: "fow", b: "fw2" }),
  ],
});

const FISCHER_LOSE_WATER: MechanismStep = createStep({
  id: "fischer-lose-water",
  from: createState({
    id: "fi3-before",
    members: [{ species: tiWaterF, role: "substrate" }],
  }),
  to: createState({
    id: "fi3-after",
    members: [
      { species: protEsterF, role: "product" },
      { species: waterOutF, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["fc1"] },
  arrows: [
    createArrow({ id: "a-push", source: fromLonePair("fom"), sink: toBondBetween("fom", "fc1") }),
    createArrow({ id: "a-leave", source: fromBond("b-fc1ow"), sink: toAtom("fow") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 spine: SOCl2 makes the acyl chloride. The activation move    */
/* every synthesis uses when the acid itself is too lazy to react.     */
/* ------------------------------------------------------------------ */

const aceticAcidS = createSpecies({
  id: "sp-acetic-acid-s",
  atoms: [
    createAtom({ id: "sca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "sc1", element: "C" }),
    createAtom({ id: "so1", element: "O", lonePairs: 2 }),
    createAtom({ id: "so2", element: "O", lonePairs: 2 }),
    createAtom({ id: "sho", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-scac1", a: "sca", b: "sc1" }),
    createBond({ id: "b-sc1o1", a: "sc1", b: "so1", order: 2 }),
    createBond({ id: "b-sc1o2", a: "sc1", b: "so2" }),
    createBond({ id: "b-so2h", a: "so2", b: "sho" }),
  ],
});

const thionylS = createSpecies({
  id: "sp-thionyl-s",
  atoms: [
    createAtom({ id: "ss", element: "S", lonePairs: 1 }),
    createAtom({ id: "sk", element: "O", lonePairs: 2 }),
    createAtom({ id: "scl1", element: "Cl", lonePairs: 3 }),
    createAtom({ id: "scl2", element: "Cl", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-ssk", a: "ss", b: "sk", order: 2 }),
    createBond({ id: "b-sscl1", a: "ss", b: "scl1" }),
    createBond({ id: "b-sscl2", a: "ss", b: "scl2" }),
  ],
});

const protChlorosulfiteS = createSpecies({
  id: "sp-prot-chlorosulfite-s",
  atoms: [
    createAtom({ id: "sca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "sc1", element: "C" }),
    createAtom({ id: "so1", element: "O", lonePairs: 2 }),
    createAtom({ id: "so2", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "sho", element: "H" }),
    createAtom({ id: "ss", element: "S", lonePairs: 1 }),
    createAtom({ id: "sk", element: "O", lonePairs: 2 }),
    createAtom({ id: "scl2", element: "Cl", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-scac1", a: "sca", b: "sc1" }),
    createBond({ id: "b-sc1o1", a: "sc1", b: "so1", order: 2 }),
    createBond({ id: "b-sc1o2", a: "sc1", b: "so2" }),
    createBond({ id: "b-so2h", a: "so2", b: "sho" }),
    createBond({ id: "b-so2s", a: "so2", b: "ss" }),
    createBond({ id: "b-ssk", a: "ss", b: "sk", order: 2 }),
    createBond({ id: "b-sscl2", a: "ss", b: "scl2" }),
  ],
});

const chlorideS = createSpecies({
  id: "sp-chloride-s",
  atoms: [createAtom({ id: "scl1", element: "Cl", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const SOCL2_ACTIVATE: MechanismStep = createStep({
  id: "socl2-activate",
  from: createState({
    id: "so1-before",
    members: [
      { species: aceticAcidS, role: "nucleophile" },
      { species: thionylS, role: "substrate" },
    ],
  }),
  to: createState({
    id: "so1-after",
    members: [
      { species: protChlorosulfiteS, role: "product" },
      { species: chlorideS, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["so2", "ss"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("so2"), sink: toBondBetween("so2", "ss") }),
    createArrow({ id: "a-leave", source: fromBond("b-sscl1"), sink: toAtom("scl1") }),
  ],
});

const chlorosulfiteEsterS = createSpecies({
  id: "sp-chlorosulfite-ester-s",
  atoms: [
    createAtom({ id: "sca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "sc1", element: "C" }),
    createAtom({ id: "so1", element: "O", lonePairs: 2 }),
    createAtom({ id: "so2", element: "O", lonePairs: 2 }),
    createAtom({ id: "ss", element: "S", lonePairs: 1 }),
    createAtom({ id: "sk", element: "O", lonePairs: 2 }),
    createAtom({ id: "scl2", element: "Cl", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-scac1", a: "sca", b: "sc1" }),
    createBond({ id: "b-sc1o1", a: "sc1", b: "so1", order: 2 }),
    createBond({ id: "b-sc1o2", a: "sc1", b: "so2" }),
    createBond({ id: "b-so2s", a: "so2", b: "ss" }),
    createBond({ id: "b-ssk", a: "ss", b: "sk", order: 2 }),
    createBond({ id: "b-sscl2", a: "ss", b: "scl2" }),
  ],
});

const chlorideS2 = createSpecies({
  id: "sp-chloride-s2",
  atoms: [createAtom({ id: "sclx", element: "Cl", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const tiSocl2 = createSpecies({
  id: "sp-ti-socl2",
  atoms: [
    createAtom({ id: "sca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "sc1", element: "C" }),
    createAtom({ id: "so1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "so2", element: "O", lonePairs: 2 }),
    createAtom({ id: "ss", element: "S", lonePairs: 1 }),
    createAtom({ id: "sk", element: "O", lonePairs: 2 }),
    createAtom({ id: "scl2", element: "Cl", lonePairs: 3 }),
    createAtom({ id: "sclx", element: "Cl", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-scac1", a: "sca", b: "sc1" }),
    createBond({ id: "b-sc1o1", a: "sc1", b: "so1" }),
    createBond({ id: "b-sc1o2", a: "sc1", b: "so2" }),
    createBond({ id: "b-so2s", a: "so2", b: "ss" }),
    createBond({ id: "b-ssk", a: "ss", b: "sk", order: 2 }),
    createBond({ id: "b-sscl2", a: "ss", b: "scl2" }),
    createBond({ id: "b-sc1clx", a: "sc1", b: "sclx" }),
  ],
});

const SOCL2_ATTACK: MechanismStep = createStep({
  id: "socl2-attack",
  from: createState({
    id: "so2-before",
    members: [
      { species: chlorideS2, role: "nucleophile" },
      { species: chlorosulfiteEsterS, role: "substrate" },
    ],
  }),
  to: createState({ id: "so2-after", members: [{ species: tiSocl2, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["sclx", "sc1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("sclx"), sink: toBondBetween("sclx", "sc1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-sc1o1"), sink: toAtom("so1") }),
  ],
});

const acetylChlorideS = createSpecies({
  id: "sp-acetyl-chloride-s",
  atoms: [
    createAtom({ id: "sca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "sc1", element: "C" }),
    createAtom({ id: "so1", element: "O", lonePairs: 2 }),
    createAtom({ id: "sclx", element: "Cl", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-scac1", a: "sca", b: "sc1" }),
    createBond({ id: "b-sc1o1", a: "sc1", b: "so1", order: 2 }),
    createBond({ id: "b-sc1clx", a: "sc1", b: "sclx" }),
  ],
});

const chlorosulfiteAnionS = createSpecies({
  id: "sp-chlorosulfite-anion-s",
  atoms: [
    createAtom({ id: "so2", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "ss", element: "S", lonePairs: 1 }),
    createAtom({ id: "sk", element: "O", lonePairs: 2 }),
    createAtom({ id: "scl2", element: "Cl", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-so2s", a: "so2", b: "ss" }),
    createBond({ id: "b-ssk", a: "ss", b: "sk", order: 2 }),
    createBond({ id: "b-sscl2", a: "ss", b: "scl2" }),
  ],
});

const SOCL2_COLLAPSE: MechanismStep = createStep({
  id: "socl2-collapse",
  from: createState({ id: "so3-before", members: [{ species: tiSocl2, role: "substrate" }] }),
  to: createState({
    id: "so3-after",
    members: [
      { species: acetylChlorideS, role: "product" },
      { species: chlorosulfiteAnionS, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["sc1"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("so1"), sink: toBondBetween("so1", "sc1") }),
    createArrow({ id: "a-leave", source: fromBond("b-sc1o2"), sink: toAtom("so2") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 spine: acid to anhydride, by way of the acyl chloride the    */
/* last sequence just made. Carboxylate in, chloride out.              */
/* ------------------------------------------------------------------ */

const acetateN = createSpecies({
  id: "sp-acetate-n",
  atoms: [
    createAtom({ id: "nb", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "nc2", element: "C" }),
    createAtom({ id: "nk2", element: "O", lonePairs: 2 }),
    createAtom({ id: "na2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-nbc2", a: "nb", b: "nc2" }),
    createBond({ id: "b-nc2k2", a: "nc2", b: "nk2", order: 2 }),
    createBond({ id: "b-nc2a2", a: "nc2", b: "na2" }),
  ],
});

const acetylChlorideN = createSpecies({
  id: "sp-acetyl-chloride-n",
  atoms: [
    createAtom({ id: "nca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "nc1", element: "C" }),
    createAtom({ id: "no1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ncl", element: "Cl", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-ncac1", a: "nca", b: "nc1" }),
    createBond({ id: "b-nc1o1", a: "nc1", b: "no1", order: 2 }),
    createBond({ id: "b-nc1cl", a: "nc1", b: "ncl" }),
  ],
});

const tiAnhydrideMake = createSpecies({
  id: "sp-ti-anhydride-make",
  atoms: [
    createAtom({ id: "nca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "nc1", element: "C" }),
    createAtom({ id: "no1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "ncl", element: "Cl", lonePairs: 3 }),
    createAtom({ id: "nb", element: "O", lonePairs: 2 }),
    createAtom({ id: "nc2", element: "C" }),
    createAtom({ id: "nk2", element: "O", lonePairs: 2 }),
    createAtom({ id: "na2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-ncac1", a: "nca", b: "nc1" }),
    createBond({ id: "b-nc1o1", a: "nc1", b: "no1" }),
    createBond({ id: "b-nc1cl", a: "nc1", b: "ncl" }),
    createBond({ id: "b-nc1nb", a: "nc1", b: "nb" }),
    createBond({ id: "b-nbc2", a: "nb", b: "nc2" }),
    createBond({ id: "b-nc2k2", a: "nc2", b: "nk2", order: 2 }),
    createBond({ id: "b-nc2a2", a: "nc2", b: "na2" }),
  ],
});

const ANHMAKE_ATTACK: MechanismStep = createStep({
  id: "anhmake-attack",
  from: createState({
    id: "nm1-before",
    members: [
      { species: acetateN, role: "nucleophile" },
      { species: acetylChlorideN, role: "substrate" },
    ],
  }),
  to: createState({ id: "nm1-after", members: [{ species: tiAnhydrideMake, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["nb", "nc1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("nb"), sink: toBondBetween("nb", "nc1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-nc1o1"), sink: toAtom("no1") }),
  ],
});

const anhydrideN = createSpecies({
  id: "sp-anhydride-n",
  atoms: [
    createAtom({ id: "nca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "nc1", element: "C" }),
    createAtom({ id: "no1", element: "O", lonePairs: 2 }),
    createAtom({ id: "nb", element: "O", lonePairs: 2 }),
    createAtom({ id: "nc2", element: "C" }),
    createAtom({ id: "nk2", element: "O", lonePairs: 2 }),
    createAtom({ id: "na2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-ncac1", a: "nca", b: "nc1" }),
    createBond({ id: "b-nc1o1", a: "nc1", b: "no1", order: 2 }),
    createBond({ id: "b-nc1nb", a: "nc1", b: "nb" }),
    createBond({ id: "b-nbc2", a: "nb", b: "nc2" }),
    createBond({ id: "b-nc2k2", a: "nc2", b: "nk2", order: 2 }),
    createBond({ id: "b-nc2a2", a: "nc2", b: "na2" }),
  ],
});

const chlorideN = createSpecies({
  id: "sp-chloride-n",
  atoms: [createAtom({ id: "ncl", element: "Cl", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const ANHMAKE_COLLAPSE: MechanismStep = createStep({
  id: "anhmake-collapse",
  from: createState({ id: "nm2-before", members: [{ species: tiAnhydrideMake, role: "substrate" }] }),
  to: createState({
    id: "nm2-after",
    members: [
      { species: anhydrideN, role: "product" },
      { species: chlorideN, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["nc1"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("no1"), sink: toBondBetween("no1", "nc1") }),
    createArrow({ id: "a-leave", source: fromBond("b-nc1cl"), sink: toAtom("ncl") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 spine: LiAlH4 takes the ester all the way down. Two          */
/* hydrides, and the aldehyde in the middle never gets to leave.       */
/* ------------------------------------------------------------------ */

const hydrideL1 = createSpecies({
  id: "sp-hydride-l1",
  atoms: [createAtom({ id: "lh1", element: "H", formalCharge: -1, lonePairs: 1 })],
  bonds: [],
});

const methylAcetateL = createSpecies({
  id: "sp-methyl-acetate-l",
  atoms: [
    createAtom({ id: "lca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "lc1", element: "C" }),
    createAtom({ id: "lo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "lo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "lcm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-lcac1", a: "lca", b: "lc1" }),
    createBond({ id: "b-lc1o1", a: "lc1", b: "lo1", order: 2 }),
    createBond({ id: "b-lc1o2", a: "lc1", b: "lo2" }),
    createBond({ id: "b-lo2cm", a: "lo2", b: "lcm" }),
  ],
});

const tiLialh = createSpecies({
  id: "sp-ti-lialh",
  atoms: [
    createAtom({ id: "lca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "lc1", element: "C" }),
    createAtom({ id: "lo1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "lo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "lcm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "lh1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-lcac1", a: "lca", b: "lc1" }),
    createBond({ id: "b-lc1o1", a: "lc1", b: "lo1" }),
    createBond({ id: "b-lc1o2", a: "lc1", b: "lo2" }),
    createBond({ id: "b-lo2cm", a: "lo2", b: "lcm" }),
    createBond({ id: "b-lc1h1", a: "lc1", b: "lh1" }),
  ],
});

const LIALH_FIRST: MechanismStep = createStep({
  id: "lialh-first",
  from: createState({
    id: "la1-before",
    members: [
      { species: hydrideL1, role: "nucleophile" },
      { species: methylAcetateL, role: "substrate" },
    ],
  }),
  to: createState({ id: "la1-after", members: [{ species: tiLialh, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "reduction", reactionCenters: ["lc1"] },
  arrows: [
    createArrow({ id: "a-h", source: fromLonePair("lh1"), sink: toBondBetween("lh1", "lc1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-lc1o1"), sink: toAtom("lo1") }),
  ],
});

const acetaldehydeL = createSpecies({
  id: "sp-acetaldehyde-l",
  atoms: [
    createAtom({ id: "lca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "lc1", element: "C" }),
    createAtom({ id: "lo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "lh1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-lcac1", a: "lca", b: "lc1" }),
    createBond({ id: "b-lc1o1", a: "lc1", b: "lo1", order: 2 }),
    createBond({ id: "b-lc1h1", a: "lc1", b: "lh1" }),
  ],
});

const methoxideL = createSpecies({
  id: "sp-methoxide-l",
  atoms: [
    createAtom({ id: "lo2", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "lcm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-lo2cm", a: "lo2", b: "lcm" })],
});

const LIALH_COLLAPSE: MechanismStep = createStep({
  id: "lialh-collapse",
  from: createState({ id: "la2-before", members: [{ species: tiLialh, role: "substrate" }] }),
  to: createState({
    id: "la2-after",
    members: [
      { species: acetaldehydeL, role: "product" },
      { species: methoxideL, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["lc1"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("lo1"), sink: toBondBetween("lo1", "lc1") }),
    createArrow({ id: "a-leave", source: fromBond("b-lc1o2"), sink: toAtom("lo2") }),
  ],
});

const hydrideL2 = createSpecies({
  id: "sp-hydride-l2",
  atoms: [createAtom({ id: "lh2", element: "H", formalCharge: -1, lonePairs: 1 })],
  bonds: [],
});

const ethoxideL = createSpecies({
  id: "sp-ethoxide-l",
  atoms: [
    createAtom({ id: "lca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "lc1", element: "C" }),
    createAtom({ id: "lo1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "lh1", element: "H" }),
    createAtom({ id: "lh2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-lcac1", a: "lca", b: "lc1" }),
    createBond({ id: "b-lc1o1", a: "lc1", b: "lo1" }),
    createBond({ id: "b-lc1h1", a: "lc1", b: "lh1" }),
    createBond({ id: "b-lc1h2", a: "lc1", b: "lh2" }),
  ],
});

const LIALH_SECOND: MechanismStep = createStep({
  id: "lialh-second",
  from: createState({
    id: "la3-before",
    members: [
      { species: hydrideL2, role: "nucleophile" },
      { species: acetaldehydeL, role: "substrate" },
    ],
  }),
  to: createState({ id: "la3-after", members: [{ species: ethoxideL, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "reduction", reactionCenters: ["lc1"] },
  arrows: [
    createArrow({ id: "a-h", source: fromLonePair("lh2"), sink: toBondBetween("lh2", "lc1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-lc1o1"), sink: toAtom("lo1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 spine: two Grignards on an ester. The ketone in the middle   */
/* is more reactive than the ester that made it. It never survives.    */
/* ------------------------------------------------------------------ */

const carbanionE1 = createSpecies({
  id: "sp-carbanion-e1",
  atoms: [createAtom({ id: "ge1", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 3 })],
  bonds: [],
});

const methylAcetateG = createSpecies({
  id: "sp-methyl-acetate-g",
  atoms: [
    createAtom({ id: "gca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "gc1", element: "C" }),
    createAtom({ id: "go1", element: "O", lonePairs: 2 }),
    createAtom({ id: "go2", element: "O", lonePairs: 2 }),
    createAtom({ id: "gcm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gcac1", a: "gca", b: "gc1" }),
    createBond({ id: "b-gc1o1", a: "gc1", b: "go1", order: 2 }),
    createBond({ id: "b-gc1o2", a: "gc1", b: "go2" }),
    createBond({ id: "b-go2cm", a: "go2", b: "gcm" }),
  ],
});

const tiGrignardE = createSpecies({
  id: "sp-ti-grignard-e",
  atoms: [
    createAtom({ id: "gca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "gc1", element: "C" }),
    createAtom({ id: "go1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "go2", element: "O", lonePairs: 2 }),
    createAtom({ id: "gcm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ge1", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gcac1", a: "gca", b: "gc1" }),
    createBond({ id: "b-gc1o1", a: "gc1", b: "go1" }),
    createBond({ id: "b-gc1o2", a: "gc1", b: "go2" }),
    createBond({ id: "b-go2cm", a: "go2", b: "gcm" }),
    createBond({ id: "b-gc1e1", a: "gc1", b: "ge1" }),
  ],
});

const GRIGNARD_E_FIRST: MechanismStep = createStep({
  id: "grignard-e-first",
  from: createState({
    id: "ge1-before",
    members: [
      { species: carbanionE1, role: "nucleophile" },
      { species: methylAcetateG, role: "substrate" },
    ],
  }),
  to: createState({ id: "ge1-after", members: [{ species: tiGrignardE, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["ge1", "gc1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("ge1"), sink: toBondBetween("ge1", "gc1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-gc1o1"), sink: toAtom("go1") }),
  ],
});

const acetoneE = createSpecies({
  id: "sp-acetone-e",
  atoms: [
    createAtom({ id: "gca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "gc1", element: "C" }),
    createAtom({ id: "go1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ge1", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gcac1", a: "gca", b: "gc1" }),
    createBond({ id: "b-gc1o1", a: "gc1", b: "go1", order: 2 }),
    createBond({ id: "b-gc1e1", a: "gc1", b: "ge1" }),
  ],
});

const methoxideG = createSpecies({
  id: "sp-methoxide-g",
  atoms: [
    createAtom({ id: "go2", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "gcm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-go2cm", a: "go2", b: "gcm" })],
});

const GRIGNARD_E_COLLAPSE: MechanismStep = createStep({
  id: "grignard-e-collapse",
  from: createState({ id: "ge2-before", members: [{ species: tiGrignardE, role: "substrate" }] }),
  to: createState({
    id: "ge2-after",
    members: [
      { species: acetoneE, role: "product" },
      { species: methoxideG, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["gc1"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("go1"), sink: toBondBetween("go1", "gc1") }),
    createArrow({ id: "a-leave", source: fromBond("b-gc1o2"), sink: toAtom("go2") }),
  ],
});

const carbanionE2 = createSpecies({
  id: "sp-carbanion-e2",
  atoms: [createAtom({ id: "ge2", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 3 })],
  bonds: [],
});

const tertButoxideE = createSpecies({
  id: "sp-tert-butoxide-e",
  atoms: [
    createAtom({ id: "gca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "gc1", element: "C" }),
    createAtom({ id: "go1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "ge1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ge2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gcac1", a: "gca", b: "gc1" }),
    createBond({ id: "b-gc1o1", a: "gc1", b: "go1" }),
    createBond({ id: "b-gc1e1", a: "gc1", b: "ge1" }),
    createBond({ id: "b-gc1e2", a: "gc1", b: "ge2" }),
  ],
});

const GRIGNARD_E_SECOND: MechanismStep = createStep({
  id: "grignard-e-second",
  from: createState({
    id: "ge3-before",
    members: [
      { species: carbanionE2, role: "nucleophile" },
      { species: acetoneE, role: "substrate" },
    ],
  }),
  to: createState({ id: "ge3-after", members: [{ species: tertButoxideE, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["ge2", "gc1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("ge2"), sink: toBondBetween("ge2", "gc1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-gc1o1"), sink: toAtom("go1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 8 spine: amide hydrolysis under base. The worst leaving group  */
/* in the ladder only leaves because the proton transfer afterwards    */
/* makes coming back impossible.                                       */
/* ------------------------------------------------------------------ */

const hydroxideAm = createSpecies({
  id: "sp-hydroxide-am",
  atoms: [
    createAtom({ id: "xoh", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "xhh", element: "H" }),
  ],
  bonds: [createBond({ id: "b-xohh", a: "xoh", b: "xhh" })],
});

const acetamideX = createSpecies({
  id: "sp-acetamide-x",
  atoms: [
    createAtom({ id: "xca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "xc1", element: "C" }),
    createAtom({ id: "xo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "xn", element: "N", lonePairs: 1 }),
    createAtom({ id: "xhn", element: "H" }),
    createAtom({ id: "xcn", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-xcac1", a: "xca", b: "xc1" }),
    createBond({ id: "b-xc1o1", a: "xc1", b: "xo1", order: 2 }),
    createBond({ id: "b-xc1n", a: "xc1", b: "xn" }),
    createBond({ id: "b-xnh", a: "xn", b: "xhn" }),
    createBond({ id: "b-xncn", a: "xn", b: "xcn" }),
  ],
});

const tiAmideX = createSpecies({
  id: "sp-ti-amide-x",
  atoms: [
    createAtom({ id: "xca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "xc1", element: "C" }),
    createAtom({ id: "xo1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "xn", element: "N", lonePairs: 1 }),
    createAtom({ id: "xhn", element: "H" }),
    createAtom({ id: "xcn", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "xoh", element: "O", lonePairs: 2 }),
    createAtom({ id: "xhh", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-xcac1", a: "xca", b: "xc1" }),
    createBond({ id: "b-xc1o1", a: "xc1", b: "xo1" }),
    createBond({ id: "b-xc1n", a: "xc1", b: "xn" }),
    createBond({ id: "b-xnh", a: "xn", b: "xhn" }),
    createBond({ id: "b-xncn", a: "xn", b: "xcn" }),
    createBond({ id: "b-xc1oh", a: "xc1", b: "xoh" }),
    createBond({ id: "b-xohh", a: "xoh", b: "xhh" }),
  ],
});

const AMIDE_ATTACK: MechanismStep = createStep({
  id: "amide-attack",
  from: createState({
    id: "am1-before",
    members: [
      { species: hydroxideAm, role: "nucleophile" },
      { species: acetamideX, role: "substrate" },
    ],
  }),
  to: createState({ id: "am1-after", members: [{ species: tiAmideX, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["xoh", "xc1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("xoh"), sink: toBondBetween("xoh", "xc1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-xc1o1"), sink: toAtom("xo1") }),
  ],
});

const aceticAcidX = createSpecies({
  id: "sp-acetic-acid-x",
  atoms: [
    createAtom({ id: "xca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "xc1", element: "C" }),
    createAtom({ id: "xo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "xoh", element: "O", lonePairs: 2 }),
    createAtom({ id: "xhh", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-xcac1", a: "xca", b: "xc1" }),
    createBond({ id: "b-xc1o1", a: "xc1", b: "xo1", order: 2 }),
    createBond({ id: "b-xc1oh", a: "xc1", b: "xoh" }),
    createBond({ id: "b-xohh", a: "xoh", b: "xhh" }),
  ],
});

const amideAnionX = createSpecies({
  id: "sp-amide-anion-x",
  atoms: [
    createAtom({ id: "xn", element: "N", formalCharge: -1, lonePairs: 2 }),
    createAtom({ id: "xhn", element: "H" }),
    createAtom({ id: "xcn", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-xnh", a: "xn", b: "xhn" }),
    createBond({ id: "b-xncn", a: "xn", b: "xcn" }),
  ],
});

const AMIDE_COLLAPSE: MechanismStep = createStep({
  id: "amide-collapse",
  from: createState({ id: "am2-before", members: [{ species: tiAmideX, role: "substrate" }] }),
  to: createState({
    id: "am2-after",
    members: [
      { species: aceticAcidX, role: "product" },
      { species: amideAnionX, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["xc1"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("xo1"), sink: toBondBetween("xo1", "xc1") }),
    createArrow({ id: "a-leave", source: fromBond("b-xc1n"), sink: toAtom("xn") }),
  ],
});

const acetateX = createSpecies({
  id: "sp-acetate-x",
  atoms: [
    createAtom({ id: "xca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "xc1", element: "C" }),
    createAtom({ id: "xo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "xoh", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-xcac1", a: "xca", b: "xc1" }),
    createBond({ id: "b-xc1o1", a: "xc1", b: "xo1", order: 2 }),
    createBond({ id: "b-xc1oh", a: "xc1", b: "xoh" }),
  ],
});

const methylamineX = createSpecies({
  id: "sp-methylamine-x",
  atoms: [
    createAtom({ id: "xn", element: "N", lonePairs: 1 }),
    createAtom({ id: "xhn", element: "H" }),
    createAtom({ id: "xhh", element: "H" }),
    createAtom({ id: "xcn", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-xnh", a: "xn", b: "xhn" }),
    createBond({ id: "b-xnh2", a: "xn", b: "xhh" }),
    createBond({ id: "b-xncn", a: "xn", b: "xcn" }),
  ],
});

const AMIDE_PT: MechanismStep = createStep({
  id: "amide-pt",
  from: createState({
    id: "am3-before",
    members: [
      { species: amideAnionX, role: "nucleophile" },
      { species: aceticAcidX, role: "substrate" },
    ],
  }),
  to: createState({
    id: "am3-after",
    members: [
      { species: acetateX, role: "product" },
      { species: methylamineX, role: "product" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["xhh", "xn"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("xn"), sink: toBondBetween("xn", "xhh") }),
    createArrow({ id: "a-release", source: fromBond("b-xohh"), sink: toAtom("xoh") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 3 spine: EAS bromination. Same two beats as nitration, new     */
/* electrophile: the ring attacks Br2 and bromide cleans up.           */
/* ------------------------------------------------------------------ */

const benzeneBr = createSpecies({
  id: "sp-benzene-br",
  atoms: [
    createAtom({ id: "bc1", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc6", element: "C", implicitHydrogens: 1 }),
  ],
  bonds: [
    createBond({ id: "bb12", a: "bc1", b: "bc2", order: 2 }),
    createBond({ id: "bb23", a: "bc2", b: "bc3" }),
    createBond({ id: "bb34", a: "bc3", b: "bc4", order: 2 }),
    createBond({ id: "bb45", a: "bc4", b: "bc5" }),
    createBond({ id: "bb56", a: "bc5", b: "bc6", order: 2 }),
    createBond({ id: "bb61", a: "bc6", b: "bc1" }),
  ],
});

const bromineB = createSpecies({
  id: "sp-bromine-b",
  atoms: [
    createAtom({ id: "bba", element: "Br", lonePairs: 3 }),
    createAtom({ id: "bbb", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "bb-brbr", a: "bba", b: "bbb" })],
});

const areniumBr = createSpecies({
  id: "sp-arenium-br",
  atoms: [
    createAtom({ id: "bc1", element: "C" }),
    createAtom({ id: "bhx", element: "H" }),
    createAtom({ id: "bc2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "bc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bba", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "bb1h", a: "bc1", b: "bhx" }),
    createBond({ id: "bb12", a: "bc1", b: "bc2" }),
    createBond({ id: "bb23", a: "bc2", b: "bc3" }),
    createBond({ id: "bb34", a: "bc3", b: "bc4", order: 2 }),
    createBond({ id: "bb45", a: "bc4", b: "bc5" }),
    createBond({ id: "bb56", a: "bc5", b: "bc6", order: 2 }),
    createBond({ id: "bb61", a: "bc6", b: "bc1" }),
    createBond({ id: "bb-cbr", a: "bc1", b: "bba" }),
  ],
});

const bromideB = createSpecies({
  id: "sp-bromide-b",
  atoms: [createAtom({ id: "bbb", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const EASBR_ATTACK: MechanismStep = createStep({
  id: "easbr-attack",
  from: createState({
    id: "eb1-before",
    members: [
      { species: benzeneBr, role: "nucleophile" },
      { species: bromineB, role: "electrophile" },
    ],
  }),
  to: createState({
    id: "eb1-after",
    members: [
      { species: areniumBr, role: "intermediate" },
      { species: bromideB, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "pi_bond_attack", route: "electrophilic_aromatic_substitution", reactionCenters: ["bc1", "bba"] },
  arrows: [
    createArrow({ id: "a-ring-attacks", source: fromBond("bb12"), sink: toBondBetween("bc1", "bba") }),
    createArrow({ id: "a-br-leaves", source: fromBond("bb-brbr"), sink: toAtom("bbb") }),
  ],
});

const bromobenzeneB = createSpecies({
  id: "sp-bromobenzene-b",
  atoms: [
    createAtom({ id: "bc1", element: "C" }),
    createAtom({ id: "bc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bc6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "bba", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "bb12", a: "bc1", b: "bc2", order: 2 }),
    createBond({ id: "bb23", a: "bc2", b: "bc3" }),
    createBond({ id: "bb34", a: "bc3", b: "bc4", order: 2 }),
    createBond({ id: "bb45", a: "bc4", b: "bc5" }),
    createBond({ id: "bb56", a: "bc5", b: "bc6", order: 2 }),
    createBond({ id: "bb61", a: "bc6", b: "bc1" }),
    createBond({ id: "bb-cbr", a: "bc1", b: "bba" }),
  ],
});

const hbrB = createSpecies({
  id: "sp-hbr-b",
  atoms: [
    createAtom({ id: "bbb", element: "Br", lonePairs: 3 }),
    createAtom({ id: "bhx", element: "H" }),
  ],
  bonds: [createBond({ id: "bb-brh", a: "bbb", b: "bhx" })],
});

const EASBR_REAROMATIZE: MechanismStep = createStep({
  id: "easbr-rearomatize",
  from: createState({
    id: "eb2-before",
    members: [
      { species: bromideB, role: "nucleophile" },
      { species: areniumBr, role: "substrate" },
    ],
  }),
  to: createState({
    id: "eb2-after",
    members: [
      { species: bromobenzeneB, role: "product" },
      { species: hbrB, role: "product" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "electrophilic_aromatic_substitution", reactionCenters: ["bhx", "bc1"] },
  arrows: [
    createArrow({ id: "a-take-h", source: fromLonePair("bbb"), sink: toBondBetween("bbb", "bhx") }),
    createArrow({ id: "a-rearomatize", source: fromBond("bb1h"), sink: toBondBetween("bc1", "bc2") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 3 spine: sulfonation. SO3 needs no helper cation, and the      */
/* whole thing runs in reverse with steam. The reversible EAS.         */
/* ------------------------------------------------------------------ */

const benzeneSu = createSpecies({
  id: "sp-benzene-su",
  atoms: [
    createAtom({ id: "uc1", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc6", element: "C", implicitHydrogens: 1 }),
  ],
  bonds: [
    createBond({ id: "ub12", a: "uc1", b: "uc2", order: 2 }),
    createBond({ id: "ub23", a: "uc2", b: "uc3" }),
    createBond({ id: "ub34", a: "uc3", b: "uc4", order: 2 }),
    createBond({ id: "ub45", a: "uc4", b: "uc5" }),
    createBond({ id: "ub56", a: "uc5", b: "uc6", order: 2 }),
    createBond({ id: "ub61", a: "uc6", b: "uc1" }),
  ],
});

const so3U = createSpecies({
  id: "sp-so3-u",
  atoms: [
    createAtom({ id: "us", element: "S" }),
    createAtom({ id: "uo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "uo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "uo3", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "ub-so1", a: "us", b: "uo1", order: 2 }),
    createBond({ id: "ub-so2", a: "us", b: "uo2", order: 2 }),
    createBond({ id: "ub-so3", a: "us", b: "uo3", order: 2 }),
  ],
});

const areniumSu = createSpecies({
  id: "sp-arenium-su",
  atoms: [
    createAtom({ id: "uc1", element: "C" }),
    createAtom({ id: "uhx", element: "H" }),
    createAtom({ id: "uc2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "uc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "us", element: "S" }),
    createAtom({ id: "uo1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "uo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "uo3", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "ub1h", a: "uc1", b: "uhx" }),
    createBond({ id: "ub12", a: "uc1", b: "uc2" }),
    createBond({ id: "ub23", a: "uc2", b: "uc3" }),
    createBond({ id: "ub34", a: "uc3", b: "uc4", order: 2 }),
    createBond({ id: "ub45", a: "uc4", b: "uc5" }),
    createBond({ id: "ub56", a: "uc5", b: "uc6", order: 2 }),
    createBond({ id: "ub61", a: "uc6", b: "uc1" }),
    createBond({ id: "ub-cs", a: "uc1", b: "us" }),
    createBond({ id: "ub-so1", a: "us", b: "uo1" }),
    createBond({ id: "ub-so2", a: "us", b: "uo2", order: 2 }),
    createBond({ id: "ub-so3", a: "us", b: "uo3", order: 2 }),
  ],
});

const SULFO_ATTACK: MechanismStep = createStep({
  id: "sulfo-attack",
  from: createState({
    id: "su1-before",
    members: [
      { species: benzeneSu, role: "nucleophile" },
      { species: so3U, role: "electrophile" },
    ],
  }),
  to: createState({ id: "su1-after", members: [{ species: areniumSu, role: "intermediate" }] }),
  identity: { elementaryStep: "pi_bond_attack", route: "electrophilic_aromatic_substitution", reactionCenters: ["uc1", "us"] },
  arrows: [
    createArrow({ id: "a-ring-attacks", source: fromBond("ub12"), sink: toBondBetween("uc1", "us") }),
    createArrow({ id: "a-so-relief", source: fromBond("ub-so1"), sink: toAtom("uo1") }),
  ],
});

const benzenesulfonicU = createSpecies({
  id: "sp-benzenesulfonic-u",
  atoms: [
    createAtom({ id: "uc1", element: "C" }),
    createAtom({ id: "uc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "uc6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "us", element: "S" }),
    createAtom({ id: "uo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "uhx", element: "H" }),
    createAtom({ id: "uo2", element: "O", lonePairs: 2 }),
    createAtom({ id: "uo3", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "ub12", a: "uc1", b: "uc2", order: 2 }),
    createBond({ id: "ub23", a: "uc2", b: "uc3" }),
    createBond({ id: "ub34", a: "uc3", b: "uc4", order: 2 }),
    createBond({ id: "ub45", a: "uc4", b: "uc5" }),
    createBond({ id: "ub56", a: "uc5", b: "uc6", order: 2 }),
    createBond({ id: "ub61", a: "uc6", b: "uc1" }),
    createBond({ id: "ub-cs", a: "uc1", b: "us" }),
    createBond({ id: "ub-so1", a: "us", b: "uo1" }),
    createBond({ id: "ub-o1h", a: "uo1", b: "uhx" }),
    createBond({ id: "ub-so2", a: "us", b: "uo2", order: 2 }),
    createBond({ id: "ub-so3", a: "us", b: "uo3", order: 2 }),
  ],
});

const SULFO_REAROMATIZE: MechanismStep = createStep({
  id: "sulfo-rearomatize",
  from: createState({ id: "su2-before", members: [{ species: areniumSu, role: "substrate" }] }),
  to: createState({ id: "su2-after", members: [{ species: benzenesulfonicU, role: "product" }] }),
  identity: { elementaryStep: "proton_transfer", route: "electrophilic_aromatic_substitution", reactionCenters: ["uhx", "uo1"] },
  arrows: [
    createArrow({ id: "a-take-h", source: fromLonePair("uo1"), sink: toBondBetween("uo1", "uhx") }),
    createArrow({ id: "a-rearomatize", source: fromBond("ub1h"), sink: toBondBetween("uc1", "uc2") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 3 spine: Friedel-Crafts acylation. The acylium is the whole    */
/* point: it cannot rearrange, which is why acylation beats alkylation.*/
/* ------------------------------------------------------------------ */

const benzeneFc = createSpecies({
  id: "sp-benzene-fc",
  atoms: [
    createAtom({ id: "rc1", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc6", element: "C", implicitHydrogens: 1 }),
  ],
  bonds: [
    createBond({ id: "rb12", a: "rc1", b: "rc2", order: 2 }),
    createBond({ id: "rb23", a: "rc2", b: "rc3" }),
    createBond({ id: "rb34", a: "rc3", b: "rc4", order: 2 }),
    createBond({ id: "rb45", a: "rc4", b: "rc5" }),
    createBond({ id: "rb56", a: "rc5", b: "rc6", order: 2 }),
    createBond({ id: "rb61", a: "rc6", b: "rc1" }),
  ],
});

const acyliumFc = createSpecies({
  id: "sp-acylium-fc",
  atoms: [
    createAtom({ id: "rca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "rcc", element: "C" }),
    createAtom({ id: "rco", element: "O", formalCharge: 1, lonePairs: 1 }),
  ],
  bonds: [
    createBond({ id: "rb-cac", a: "rca", b: "rcc" }),
    createBond({ id: "rb-co", a: "rcc", b: "rco", order: 3 }),
  ],
});

const areniumFc = createSpecies({
  id: "sp-arenium-fc",
  atoms: [
    createAtom({ id: "rc1", element: "C" }),
    createAtom({ id: "rhx", element: "H" }),
    createAtom({ id: "rc2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "rc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "rcc", element: "C" }),
    createAtom({ id: "rco", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "rb1h", a: "rc1", b: "rhx" }),
    createBond({ id: "rb12", a: "rc1", b: "rc2" }),
    createBond({ id: "rb23", a: "rc2", b: "rc3" }),
    createBond({ id: "rb34", a: "rc3", b: "rc4", order: 2 }),
    createBond({ id: "rb45", a: "rc4", b: "rc5" }),
    createBond({ id: "rb56", a: "rc5", b: "rc6", order: 2 }),
    createBond({ id: "rb61", a: "rc6", b: "rc1" }),
    createBond({ id: "rb-cc", a: "rc1", b: "rcc" }),
    createBond({ id: "rb-cac", a: "rca", b: "rcc" }),
    createBond({ id: "rb-co", a: "rcc", b: "rco", order: 2 }),
  ],
});

const FC_ATTACK: MechanismStep = createStep({
  id: "fc-attack",
  from: createState({
    id: "fc1-before",
    members: [
      { species: benzeneFc, role: "nucleophile" },
      { species: acyliumFc, role: "electrophile" },
    ],
  }),
  to: createState({ id: "fc1-after", members: [{ species: areniumFc, role: "intermediate" }] }),
  identity: { elementaryStep: "pi_bond_attack", route: "electrophilic_aromatic_substitution", reactionCenters: ["rc1", "rcc"] },
  arrows: [
    createArrow({ id: "a-ring-attacks", source: fromBond("rb12"), sink: toBondBetween("rc1", "rcc") }),
    createArrow({ id: "a-co-relief", source: fromBond("rb-co"), sink: toAtom("rco") }),
  ],
});

const chlorideFc = createSpecies({
  id: "sp-chloride-fc",
  atoms: [createAtom({ id: "rcl", element: "Cl", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const acetophenoneFc = createSpecies({
  id: "sp-acetophenone-fc",
  atoms: [
    createAtom({ id: "rc1", element: "C" }),
    createAtom({ id: "rc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rc6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "rca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "rcc", element: "C" }),
    createAtom({ id: "rco", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "rb12", a: "rc1", b: "rc2", order: 2 }),
    createBond({ id: "rb23", a: "rc2", b: "rc3" }),
    createBond({ id: "rb34", a: "rc3", b: "rc4", order: 2 }),
    createBond({ id: "rb45", a: "rc4", b: "rc5" }),
    createBond({ id: "rb56", a: "rc5", b: "rc6", order: 2 }),
    createBond({ id: "rb61", a: "rc6", b: "rc1" }),
    createBond({ id: "rb-cc", a: "rc1", b: "rcc" }),
    createBond({ id: "rb-cac", a: "rca", b: "rcc" }),
    createBond({ id: "rb-co", a: "rcc", b: "rco", order: 2 }),
  ],
});

const hclFc = createSpecies({
  id: "sp-hcl-fc",
  atoms: [
    createAtom({ id: "rcl", element: "Cl", lonePairs: 3 }),
    createAtom({ id: "rhx", element: "H" }),
  ],
  bonds: [createBond({ id: "rb-clh", a: "rcl", b: "rhx" })],
});

const FC_REAROMATIZE: MechanismStep = createStep({
  id: "fc-rearomatize",
  from: createState({
    id: "fc2-before",
    members: [
      { species: chlorideFc, role: "nucleophile" },
      { species: areniumFc, role: "substrate" },
    ],
  }),
  to: createState({
    id: "fc2-after",
    members: [
      { species: acetophenoneFc, role: "product" },
      { species: hclFc, role: "product" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "electrophilic_aromatic_substitution", reactionCenters: ["rhx", "rc1"] },
  arrows: [
    createArrow({ id: "a-take-h", source: fromLonePair("rcl"), sink: toBondBetween("rcl", "rhx") }),
    createArrow({ id: "a-rearomatize", source: fromBond("rb1h"), sink: toBondBetween("rc1", "rc2") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 1 spine: Br2 on butadiene, the 1,4 ending. The allyl cation    */
/* is drawn in both of its costumes on the way.                        */
/* ------------------------------------------------------------------ */

const butadieneD = createSpecies({
  id: "sp-butadiene-d",
  atoms: [
    createAtom({ id: "d1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "d2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "d3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "d4", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "db12", a: "d1", b: "d2", order: 2 }),
    createBond({ id: "db23", a: "d2", b: "d3" }),
    createBond({ id: "db34", a: "d3", b: "d4", order: 2 }),
  ],
});

const bromineD = createSpecies({
  id: "sp-bromine-d",
  atoms: [
    createAtom({ id: "dba", element: "Br", lonePairs: 3 }),
    createAtom({ id: "dbb", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "db-brbr", a: "dba", b: "dbb" })],
});

const allylCation1D = createSpecies({
  id: "sp-allyl-cation-1-d",
  atoms: [
    createAtom({ id: "d1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "d2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "d3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "d4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dba", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "db12", a: "d1", b: "d2" }),
    createBond({ id: "db23", a: "d2", b: "d3" }),
    createBond({ id: "db34", a: "d3", b: "d4", order: 2 }),
    createBond({ id: "db-1br", a: "d1", b: "dba" }),
  ],
});

const bromideD = createSpecies({
  id: "sp-bromide-d",
  atoms: [createAtom({ id: "dbb", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const DIENE_BR_ATTACK: MechanismStep = createStep({
  id: "diene-br-attack",
  from: createState({
    id: "db1-before",
    members: [
      { species: butadieneD, role: "nucleophile" },
      { species: bromineD, role: "electrophile" },
    ],
  }),
  to: createState({
    id: "db1-after",
    members: [
      { species: allylCation1D, role: "intermediate" },
      { species: bromideD, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "pi_bond_attack", route: "electrophilic_addition_alkene", reactionCenters: ["d1", "dba"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromBond("db12"), sink: toBondBetween("d1", "dba") }),
    createArrow({ id: "a-leave", source: fromBond("db-brbr"), sink: toAtom("dbb") }),
  ],
});

/* The SAME cation, restated in its other contributing structure: the
 * positive charge has moved to d4 and the pi bond sits at d2=d3. That
 * relocation is the entire reason 1,4-addition exists. */
const allylCation2D = createSpecies({
  id: "sp-allyl-cation-2-d",
  atoms: [
    createAtom({ id: "d1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "d2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "d3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "d4", element: "C", formalCharge: 1, implicitHydrogens: 2 }),
    createAtom({ id: "dba", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "db12", a: "d1", b: "d2" }),
    createBond({ id: "db23", a: "d2", b: "d3", order: 2 }),
    createBond({ id: "db34", a: "d3", b: "d4" }),
    createBond({ id: "db-1br", a: "d1", b: "dba" }),
  ],
});

const dibromobuteneD = createSpecies({
  id: "sp-dibromobutene-d",
  atoms: [
    createAtom({ id: "d1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "d2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "d3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "d4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "dba", element: "Br", lonePairs: 3 }),
    createAtom({ id: "dbb", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "db12", a: "d1", b: "d2" }),
    createBond({ id: "db23", a: "d2", b: "d3", order: 2 }),
    createBond({ id: "db34", a: "d3", b: "d4" }),
    createBond({ id: "db-1br", a: "d1", b: "dba" }),
    createBond({ id: "db-4br", a: "d4", b: "dbb" }),
  ],
});

const DIENE_BR_CAPTURE: MechanismStep = createStep({
  id: "diene-br-capture",
  from: createState({
    id: "db2-before",
    members: [
      { species: bromideD, role: "nucleophile" },
      { species: allylCation2D, role: "substrate" },
    ],
  }),
  to: createState({ id: "db2-after", members: [{ species: dibromobuteneD, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "electrophilic_addition_alkene", reactionCenters: ["d4"] },
  arrows: [
    createArrow({ id: "a-capture", source: fromLonePair("dbb"), sink: toBondBetween("dbb", "d4") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 5 spine: alcohol to alkyl halide with HBr. Protonate the OH    */
/* into a leaving group, then SN2. Two beats, no surprises.            */
/* ------------------------------------------------------------------ */

const ethanolOl = createSpecies({
  id: "sp-ethanol-ol",
  atoms: [
    createAtom({ id: "olo", element: "O", lonePairs: 2 }),
    createAtom({ id: "olh", element: "H" }),
    createAtom({ id: "olc1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "olc2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-oloh", a: "olo", b: "olh" }),
    createBond({ id: "b-oloc1", a: "olo", b: "olc1" }),
    createBond({ id: "b-olc12", a: "olc1", b: "olc2" }),
  ],
});

const hbrOl = createSpecies({
  id: "sp-hbr-ol",
  atoms: [
    createAtom({ id: "olha", element: "H" }),
    createAtom({ id: "olbr", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "b-olhbr", a: "olha", b: "olbr" })],
});

const oxoniumOl = createSpecies({
  id: "sp-oxonium-ol",
  atoms: [
    createAtom({ id: "olo", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "olh", element: "H" }),
    createAtom({ id: "olha", element: "H" }),
    createAtom({ id: "olc1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "olc2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-oloh", a: "olo", b: "olh" }),
    createBond({ id: "b-oloha", a: "olo", b: "olha" }),
    createBond({ id: "b-oloc1", a: "olo", b: "olc1" }),
    createBond({ id: "b-olc12", a: "olc1", b: "olc2" }),
  ],
});

const bromideOl = createSpecies({
  id: "sp-bromide-ol",
  atoms: [createAtom({ id: "olbr", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const ROH_PROTONATE: MechanismStep = createStep({
  id: "roh-protonate",
  from: createState({
    id: "ol1-before",
    members: [
      { species: ethanolOl, role: "nucleophile" },
      { species: hbrOl, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ol1-after",
    members: [
      { species: oxoniumOl, role: "product" },
      { species: bromideOl, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["olha", "olo"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("olo"), sink: toBondBetween("olo", "olha") }),
    createArrow({ id: "a-release", source: fromBond("b-olhbr"), sink: toAtom("olbr") }),
  ],
});

const bromoethaneOl = createSpecies({
  id: "sp-bromoethane-ol",
  atoms: [
    createAtom({ id: "olc1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "olc2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "olbr", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-olc12", a: "olc1", b: "olc2" }),
    createBond({ id: "b-olcbr", a: "olc1", b: "olbr" }),
  ],
});

const waterOl = createSpecies({
  id: "sp-water-ol",
  atoms: [
    createAtom({ id: "olo", element: "O", lonePairs: 2 }),
    createAtom({ id: "olh", element: "H" }),
    createAtom({ id: "olha", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-oloh", a: "olo", b: "olh" }),
    createBond({ id: "b-oloha", a: "olo", b: "olha" }),
  ],
});

const ROH_SN2: MechanismStep = createStep({
  id: "roh-sn2",
  from: createState({
    id: "ol2-before",
    members: [
      { species: bromideOl, role: "nucleophile" },
      { species: oxoniumOl, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ol2-after",
    members: [
      { species: bromoethaneOl, role: "product" },
      { species: waterOl, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "concerted_substitution", route: "sn2", reactionCenters: ["olbr", "olc1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("olbr"), sink: toBondBetween("olbr", "olc1") }),
    createArrow({ id: "a-leave", source: fromBond("b-oloc1"), sink: toAtom("olo") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 5 spine: mesylate formation. Same OH problem, politer answer:  */
/* no carbocation risk, stereochemistry untouched.                     */
/* ------------------------------------------------------------------ */

const ethanolVs = createSpecies({
  id: "sp-ethanol-vs",
  atoms: [
    createAtom({ id: "vso", element: "O", lonePairs: 2 }),
    createAtom({ id: "vsh", element: "H" }),
    createAtom({ id: "vsc1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "vsc2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-vsoh", a: "vso", b: "vsh" }),
    createBond({ id: "b-vsoc1", a: "vso", b: "vsc1" }),
    createBond({ id: "b-vsc12", a: "vsc1", b: "vsc2" }),
  ],
});

const mesylClVs = createSpecies({
  id: "sp-mesyl-cl-vs",
  atoms: [
    createAtom({ id: "vsm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "vss", element: "S" }),
    createAtom({ id: "vsk1", element: "O", lonePairs: 2 }),
    createAtom({ id: "vsk2", element: "O", lonePairs: 2 }),
    createAtom({ id: "vscl", element: "Cl", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-vsms", a: "vsm", b: "vss" }),
    createBond({ id: "b-vssk1", a: "vss", b: "vsk1", order: 2 }),
    createBond({ id: "b-vssk2", a: "vss", b: "vsk2", order: 2 }),
    createBond({ id: "b-vsscl", a: "vss", b: "vscl" }),
  ],
});

const protMesylateVs = createSpecies({
  id: "sp-prot-mesylate-vs",
  atoms: [
    createAtom({ id: "vso", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "vsh", element: "H" }),
    createAtom({ id: "vsc1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "vsc2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "vsm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "vss", element: "S" }),
    createAtom({ id: "vsk1", element: "O", lonePairs: 2 }),
    createAtom({ id: "vsk2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-vsoh", a: "vso", b: "vsh" }),
    createBond({ id: "b-vsoc1", a: "vso", b: "vsc1" }),
    createBond({ id: "b-vsc12", a: "vsc1", b: "vsc2" }),
    createBond({ id: "b-vsos", a: "vso", b: "vss" }),
    createBond({ id: "b-vsms", a: "vsm", b: "vss" }),
    createBond({ id: "b-vssk1", a: "vss", b: "vsk1", order: 2 }),
    createBond({ id: "b-vssk2", a: "vss", b: "vsk2", order: 2 }),
  ],
});

const chlorideVs = createSpecies({
  id: "sp-chloride-vs",
  atoms: [createAtom({ id: "vscl", element: "Cl", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const MESYL_ATTACK: MechanismStep = createStep({
  id: "mesyl-attack",
  from: createState({
    id: "vs1-before",
    members: [
      { species: ethanolVs, role: "nucleophile" },
      { species: mesylClVs, role: "substrate" },
    ],
  }),
  to: createState({
    id: "vs1-after",
    members: [
      { species: protMesylateVs, role: "product" },
      { species: chlorideVs, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "concerted_substitution", route: "sn2", reactionCenters: ["vso", "vss"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("vso"), sink: toBondBetween("vso", "vss") }),
    createArrow({ id: "a-leave", source: fromBond("b-vsscl"), sink: toAtom("vscl") }),
  ],
});

const mesylateVs = createSpecies({
  id: "sp-mesylate-vs",
  atoms: [
    createAtom({ id: "vso", element: "O", lonePairs: 2 }),
    createAtom({ id: "vsc1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "vsc2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "vsm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "vss", element: "S" }),
    createAtom({ id: "vsk1", element: "O", lonePairs: 2 }),
    createAtom({ id: "vsk2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-vsoc1", a: "vso", b: "vsc1" }),
    createBond({ id: "b-vsc12", a: "vsc1", b: "vsc2" }),
    createBond({ id: "b-vsos", a: "vso", b: "vss" }),
    createBond({ id: "b-vsms", a: "vsm", b: "vss" }),
    createBond({ id: "b-vssk1", a: "vss", b: "vsk1", order: 2 }),
    createBond({ id: "b-vssk2", a: "vss", b: "vsk2", order: 2 }),
  ],
});

const hclVs = createSpecies({
  id: "sp-hcl-vs",
  atoms: [
    createAtom({ id: "vscl", element: "Cl", lonePairs: 3 }),
    createAtom({ id: "vsh", element: "H" }),
  ],
  bonds: [createBond({ id: "b-vsclh", a: "vscl", b: "vsh" })],
});

const MESYL_DEPROT: MechanismStep = createStep({
  id: "mesyl-deprot",
  from: createState({
    id: "vs2-before",
    members: [
      { species: chlorideVs, role: "nucleophile" },
      { species: protMesylateVs, role: "substrate" },
    ],
  }),
  to: createState({
    id: "vs2-after",
    members: [
      { species: mesylateVs, role: "product" },
      { species: hclVs, role: "product" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["vsh", "vscl"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("vscl"), sink: toBondBetween("vscl", "vsh") }),
    createArrow({ id: "a-release", source: fromBond("b-vsoh"), sink: toAtom("vso") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 7 spine: hemiacetal formation under acid. Protonate the        */
/* carbonyl, then the alcohol adds. Sugar chemistry starts here.       */
/* ------------------------------------------------------------------ */

const hydroniumHe = createSpecies({
  id: "sp-hydronium-he",
  atoms: [
    createAtom({ id: "heo3", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "heh1", element: "H" }),
    createAtom({ id: "heh2", element: "H" }),
    createAtom({ id: "heh3", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-heo3h1", a: "heo3", b: "heh1" }),
    createBond({ id: "b-heo3h2", a: "heo3", b: "heh2" }),
    createBond({ id: "b-heo3h3", a: "heo3", b: "heh3" }),
  ],
});

const acetaldehydeHe = createSpecies({
  id: "sp-acetaldehyde-he",
  atoms: [
    createAtom({ id: "heca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "hec1", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "heo1", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-hecac1", a: "heca", b: "hec1" }),
    createBond({ id: "b-hec1o1", a: "hec1", b: "heo1", order: 2 }),
  ],
});

const protAldehydeHe = createSpecies({
  id: "sp-prot-aldehyde-he",
  atoms: [
    createAtom({ id: "heca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "hec1", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "heo1", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "heh1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-hecac1", a: "heca", b: "hec1" }),
    createBond({ id: "b-hec1o1", a: "hec1", b: "heo1", order: 2 }),
    createBond({ id: "b-heo1h", a: "heo1", b: "heh1" }),
  ],
});

const waterHe = createSpecies({
  id: "sp-water-he",
  atoms: [
    createAtom({ id: "heo3", element: "O", lonePairs: 2 }),
    createAtom({ id: "heh2", element: "H" }),
    createAtom({ id: "heh3", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-heo3h2", a: "heo3", b: "heh2" }),
    createBond({ id: "b-heo3h3", a: "heo3", b: "heh3" }),
  ],
});

const HEMI_PROTONATE: MechanismStep = createStep({
  id: "hemi-protonate",
  from: createState({
    id: "he1-before",
    members: [
      { species: acetaldehydeHe, role: "nucleophile" },
      { species: hydroniumHe, role: "substrate" },
    ],
  }),
  to: createState({
    id: "he1-after",
    members: [
      { species: protAldehydeHe, role: "product" },
      { species: waterHe, role: "product" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["heh1", "heo1"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("heo1"), sink: toBondBetween("heo1", "heh1") }),
    createArrow({ id: "a-release", source: fromBond("b-heo3h1"), sink: toAtom("heo3") }),
  ],
});

const methanolHe = createSpecies({
  id: "sp-methanol-he",
  atoms: [
    createAtom({ id: "heom", element: "O", lonePairs: 2 }),
    createAtom({ id: "hehm", element: "H" }),
    createAtom({ id: "hecm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-heomh", a: "heom", b: "hehm" }),
    createBond({ id: "b-heomc", a: "heom", b: "hecm" }),
  ],
});

const protHemiacetalHe = createSpecies({
  id: "sp-prot-hemiacetal-he",
  atoms: [
    createAtom({ id: "heca", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "hec1", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "heo1", element: "O", lonePairs: 2 }),
    createAtom({ id: "heh1", element: "H" }),
    createAtom({ id: "heom", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "hehm", element: "H" }),
    createAtom({ id: "hecm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-hecac1", a: "heca", b: "hec1" }),
    createBond({ id: "b-hec1o1", a: "hec1", b: "heo1" }),
    createBond({ id: "b-heo1h", a: "heo1", b: "heh1" }),
    createBond({ id: "b-hec1om", a: "hec1", b: "heom" }),
    createBond({ id: "b-heomh", a: "heom", b: "hehm" }),
    createBond({ id: "b-heomc", a: "heom", b: "hecm" }),
  ],
});

const HEMI_ATTACK: MechanismStep = createStep({
  id: "hemi-attack",
  from: createState({
    id: "he2-before",
    members: [
      { species: methanolHe, role: "nucleophile" },
      { species: protAldehydeHe, role: "substrate" },
    ],
  }),
  to: createState({ id: "he2-after", members: [{ species: protHemiacetalHe, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["heom", "hec1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("heom"), sink: toBondBetween("heom", "hec1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-hec1o1"), sink: toAtom("heo1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 10 spine: diazonium substitution. N2 is the best leaving group */
/* in chemistry, and this is the step that proves it.                  */
/* ------------------------------------------------------------------ */

const benzenediazoniumG = createSpecies({
  id: "sp-benzenediazonium-g",
  atoms: [
    createAtom({ id: "gc1", element: "C" }),
    createAtom({ id: "gc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gn1", element: "N", formalCharge: 1 }),
    createAtom({ id: "gn2", element: "N", lonePairs: 1 }),
  ],
  bonds: [
    createBond({ id: "gb12", a: "gc1", b: "gc2", order: 2 }),
    createBond({ id: "gb23", a: "gc2", b: "gc3" }),
    createBond({ id: "gb34", a: "gc3", b: "gc4", order: 2 }),
    createBond({ id: "gb45", a: "gc4", b: "gc5" }),
    createBond({ id: "gb56", a: "gc5", b: "gc6", order: 2 }),
    createBond({ id: "gb61", a: "gc6", b: "gc1" }),
    createBond({ id: "gb-cn", a: "gc1", b: "gn1" }),
    createBond({ id: "gb-nn", a: "gn1", b: "gn2", order: 3 }),
  ],
});

const phenylCationG = createSpecies({
  id: "sp-phenyl-cation-g",
  atoms: [
    createAtom({ id: "gc1", element: "C", formalCharge: 1 }),
    createAtom({ id: "gc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc6", element: "C", implicitHydrogens: 1 }),
  ],
  bonds: [
    createBond({ id: "gb12", a: "gc1", b: "gc2", order: 2 }),
    createBond({ id: "gb23", a: "gc2", b: "gc3" }),
    createBond({ id: "gb34", a: "gc3", b: "gc4", order: 2 }),
    createBond({ id: "gb45", a: "gc4", b: "gc5" }),
    createBond({ id: "gb56", a: "gc5", b: "gc6", order: 2 }),
    createBond({ id: "gb61", a: "gc6", b: "gc1" }),
  ],
});

const dinitrogenG = createSpecies({
  id: "sp-dinitrogen-g",
  atoms: [
    createAtom({ id: "gn1", element: "N", lonePairs: 1 }),
    createAtom({ id: "gn2", element: "N", lonePairs: 1 }),
  ],
  bonds: [createBond({ id: "gb-nn", a: "gn1", b: "gn2", order: 3 })],
});

const DIAZO_LOSS: MechanismStep = createStep({
  id: "diazo-loss",
  from: createState({
    id: "gz1-before",
    members: [{ species: benzenediazoniumG, role: "substrate" }],
  }),
  to: createState({
    id: "gz1-after",
    members: [
      { species: phenylCationG, role: "intermediate" },
      { species: dinitrogenG, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "bond_heterolysis", route: "sn1", reactionCenters: ["gc1"] },
  arrows: [
    createArrow({ id: "a-leave", source: fromBond("gb-cn"), sink: toAtom("gn1") }),
  ],
});

const waterG = createSpecies({
  id: "sp-water-g",
  atoms: [
    createAtom({ id: "gwo", element: "O", lonePairs: 2 }),
    createAtom({ id: "gw1", element: "H" }),
    createAtom({ id: "gw2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "gb-wo1", a: "gwo", b: "gw1" }),
    createBond({ id: "gb-wo2", a: "gwo", b: "gw2" }),
  ],
});

const protPhenolG = createSpecies({
  id: "sp-prot-phenol-g",
  atoms: [
    createAtom({ id: "gc1", element: "C" }),
    createAtom({ id: "gc2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gc6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gwo", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "gw1", element: "H" }),
    createAtom({ id: "gw2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "gb12", a: "gc1", b: "gc2", order: 2 }),
    createBond({ id: "gb23", a: "gc2", b: "gc3" }),
    createBond({ id: "gb34", a: "gc3", b: "gc4", order: 2 }),
    createBond({ id: "gb45", a: "gc4", b: "gc5" }),
    createBond({ id: "gb56", a: "gc5", b: "gc6", order: 2 }),
    createBond({ id: "gb61", a: "gc6", b: "gc1" }),
    createBond({ id: "gb-co", a: "gc1", b: "gwo" }),
    createBond({ id: "gb-wo1", a: "gwo", b: "gw1" }),
    createBond({ id: "gb-wo2", a: "gwo", b: "gw2" }),
  ],
});

const DIAZO_CAPTURE: MechanismStep = createStep({
  id: "diazo-capture",
  from: createState({
    id: "gz2-before",
    members: [
      { species: waterG, role: "nucleophile" },
      { species: phenylCationG, role: "substrate" },
    ],
  }),
  to: createState({ id: "gz2-after", members: [{ species: protPhenolG, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "sn1", reactionCenters: ["gc1"] },
  arrows: [
    createArrow({ id: "a-capture", source: fromLonePair("gwo"), sink: toBondBetween("gwo", "gc1") }),
  ],
});

export const TRAINER_SEQUENCES: readonly TrainerSequence[] = [
  {
    id: "seq-hydration",
    title: "Hydration of formaldehyde · 2 steps",
    brief: "Two steps to the gem-diol: attack, then protonate. No arrows drawn, you move the electrons themselves.",
    successLine: "The whole path: hydroxide built the tetrahedral alkoxide, and the alkoxide took a proton from hydronium. That is base-catalysed hydration, start to finish.",
    steps: [
      {
        // The registry's own step, by reference: one authored truth for the
        // carbonyl attack, never a fork of it.
        step: carbonyl.step,
        stepBrief: "Step 1 · Hydroxide attacks the carbonyl carbon.",
        fromHints: carbonyl.fromHints,
        toHints: carbonyl.toHints,
      },
      {
        step: ALKOXIDE_PROTONATION,
        stepBrief: "Step 2 · The alkoxide takes a proton from hydronium.",
        fromHints: STEP2_FROM_HINTS,
        toHints: STEP2_TO_HINTS,
      },
    ],
  },
  {
    id: "seq-tautomer",
    title: "Keto–enol tautomerism · 2 steps",
    brief: "Base takes the α-proton, then the enolate protonates on OXYGEN: same atoms, new tautomer.",
    successLine: "Tautomerism whole: deprotonate at carbon, reprotonate at oxygen. The enolate in the middle is an ambident nucleophile, and which end takes the proton decides which tautomer you get: the equilibrium favours the ketone, but the enol is how half of Unit 9 happens.",
    steps: [
      {
        step: TAU_DEPROTONATE,
        stepBrief: "Step 1 · The base takes the α-hydrogen; three arrows to the enolate.",
        fromHints: {
          ob: { x: -2.55, y: 1.0 },
          hb: { x: -3.3, y: 1.55 },
          c1: { x: -0.95, y: 0.35 },
          ha: { x: -1.7, y: 0.95 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
        },
        toHints: {
          ob: { x: -2.55, y: 1.0 },
          hb: { x: -3.3, y: 1.55 },
          ha: { x: -2.05, y: 1.6 },
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
        },
      },
      {
        step: TAU_O_PROTONATE,
        stepBrief: "Step 2 · The enolate's OXYGEN takes a proton from water: the enol.",
        fromHints: {
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
          ob: { x: 2.35, y: 1.35 },
          hb: { x: 3.1, y: 1.9 },
          ha: { x: 1.45, y: 1.1 },
        },
        toHints: {
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          ha: { x: 1.15, y: 1.4 },
          c3: { x: 0.6, y: -1.2 },
          ob: { x: 2.75, y: 1.35 },
          hb: { x: 3.5, y: 1.9 },
        },
      },
    ],
  },
  {
    id: "seq-condensation",
    title: "Aldol condensation · 2 steps",
    brief: "The aldol product loses water the E1cb way: enolate first, then the hydroxide is pushed out.",
    successLine: "The condensation whole: deprotonate alpha to the carbonyl, then the enolate's π swings over and expels hydroxide: the enone is conjugated, and that conjugation is the thermodynamic paycheck that drives the dehydration.",
    steps: [
      {
        step: COND_DEPROTONATE,
        stepBrief: "Step 1 · Base takes the α-H between the carbonyl and the alcohol arm.",
        fromHints: {
          ob: { x: -2.75, y: 1.15 },
          hb: { x: -3.5, y: 1.7 },
          c1: { x: -0.95, y: 0.35 },
          ha2: { x: -1.7, y: 1.0 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
          cf: { x: -1.85, y: -0.45 },
          oh1: { x: -2.9, y: -0.15 },
          hh: { x: -3.55, y: 0.5 },
        },
        toHints: {
          ob: { x: -2.75, y: 1.55 },
          hb: { x: -3.5, y: 2.1 },
          ha2: { x: -2.15, y: 2.1 },
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
          cf: { x: -1.85, y: -0.45 },
          oh1: { x: -2.9, y: -0.15 },
          hh: { x: -3.55, y: 0.5 },
        },
      },
      {
        step: COND_EXPEL,
        stepBrief: "Step 2 · The enolate's π swings onto the C–C bond and hydroxide leaves. E1cb.",
        fromHints: {
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
          cf: { x: -1.85, y: -0.45 },
          oh1: { x: -2.9, y: -0.15 },
          hh: { x: -3.55, y: 0.5 },
        },
        toHints: {
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
          cf: { x: -1.85, y: -0.45 },
          oh1: { x: -3.3, y: -0.35 },
          hh: { x: -3.95, y: 0.3 },
        },
      },
    ],
  },
  {
    id: "seq-snar",
    title: "SNAr · 2 steps",
    brief: "Aromatic reactivity inverts: the ring takes a nucleophile, and the nitro group holds the charge while it happens.",
    successLine: "SNAr whole: addition into the Meisenheimer complex, the negative charge parked on the nitro oxygen, then the relay runs backwards and fluoride leaves: the reversed leaving-group order makes sense the moment you see that addition, not C–F cleavage, is the hard step.",
    steps: [
      {
        step: SNAR_ADDITION,
        stepBrief: "Step 1 · Methoxide adds; the charge relays through the ring onto the nitro oxygen. Four arrows.",
        fromHints: {
          om: { x: -2.2, y: 1.55 },
          cm: { x: -3.15, y: 1.95 },
          c1: { x: 0.0, y: 1.0 },
          f1: { x: -1.0, y: 1.55 },
          c2: { x: 0.87, y: 1.5 },
          c3: { x: 1.74, y: 1.0 },
          c4: { x: 1.74, y: 0.0 },
          c5: { x: 0.87, y: -0.5 },
          c6: { x: 0.0, y: 0.0 },
          n1: { x: 2.6, y: -0.5 },
          on1: { x: 3.5, y: 0.0 },
          on2: { x: 2.6, y: -1.5 },
        },
        toHints: {
          om: { x: -0.9, y: 1.75 },
          cm: { x: -1.85, y: 2.15 },
          c1: { x: 0.0, y: 1.0 },
          f1: { x: -1.0, y: 0.55 },
          c2: { x: 0.87, y: 1.5 },
          c3: { x: 1.74, y: 1.0 },
          c4: { x: 1.74, y: 0.0 },
          c5: { x: 0.87, y: -0.5 },
          c6: { x: 0.0, y: 0.0 },
          n1: { x: 2.6, y: -0.5 },
          on1: { x: 3.5, y: 0.0 },
          on2: { x: 2.6, y: -1.5 },
        },
      },
      {
        step: SNAR_EXPULSION,
        stepBrief: "Step 2 · The relay runs backwards and fluoride is pushed out. Four arrows again.",
        fromHints: {
          om: { x: -0.9, y: 1.75 },
          cm: { x: -1.85, y: 2.15 },
          c1: { x: 0.0, y: 1.0 },
          f1: { x: -1.0, y: 0.55 },
          c2: { x: 0.87, y: 1.5 },
          c3: { x: 1.74, y: 1.0 },
          c4: { x: 1.74, y: 0.0 },
          c5: { x: 0.87, y: -0.5 },
          c6: { x: 0.0, y: 0.0 },
          n1: { x: 2.6, y: -0.5 },
          on1: { x: 3.5, y: 0.0 },
          on2: { x: 2.6, y: -1.5 },
        },
        toHints: {
          om: { x: -0.9, y: 1.55 },
          cm: { x: -1.85, y: 1.95 },
          c1: { x: 0.0, y: 1.0 },
          c2: { x: 0.87, y: 1.5 },
          c3: { x: 1.74, y: 1.0 },
          c4: { x: 1.74, y: 0.0 },
          c5: { x: 0.87, y: -0.5 },
          c6: { x: 0.0, y: 0.0 },
          n1: { x: 2.6, y: -0.5 },
          on1: { x: 3.5, y: 0.0 },
          on2: { x: 2.6, y: -1.5 },
          f1: { x: -1.6, y: -0.2 },
        },
      },
    ],
  },
  {
    id: "seq-claisen",
    title: "Claisen condensation · 2 steps",
    brief: "The ester enolate attacks another ester; the tetrahedral intermediate throws methoxide out.",
    successLine: "The Claisen whole: enolate carbon onto the ester carbonyl, then the alkoxide reforms the π and expels methoxide: a β-ketoester, and the doubly-activated proton it carries is what pulls the whole equilibrium over.",
    steps: [
      {
        step: CLAISEN_ATTACK,
        stepBrief: "Step 1 · The enolate carbon attacks the other ester's carbonyl. Three arrows.",
        fromHints: {
          c1: { x: -1.3, y: 0.2 },
          c2: { x: -2.25, y: -0.3 },
          o1: { x: -2.35, y: 0.8 },
          oe1: { x: -3.2, y: -0.9 },
          ce1: { x: -4.15, y: -0.5 },
          cm2: { x: 1.9, y: 1.0 },
          ck: { x: 0.95, y: 0.45 },
          ok: { x: 1.05, y: -0.65 },
          oe2: { x: 0.0, y: 1.05 },
          ce2: { x: -0.2, y: 2.1 },
        },
        toHints: {
          c1: { x: -1.1, y: 0.2 },
          c2: { x: -2.05, y: -0.3 },
          o1: { x: -2.15, y: 0.8 },
          oe1: { x: -3.0, y: -0.9 },
          ce1: { x: -3.95, y: -0.5 },
          ck: { x: 0.35, y: 0.4 },
          cm2: { x: 1.3, y: 0.95 },
          ok: { x: 0.45, y: -0.7 },
          oe2: { x: -0.6, y: 1.0 },
          ce2: { x: -0.8, y: 2.05 },
        },
      },
      {
        step: CLAISEN_COLLAPSE,
        stepBrief: "Step 2 · The alkoxide reforms the carbonyl and methoxide leaves.",
        fromHints: {
          c1: { x: -1.1, y: 0.2 },
          c2: { x: -2.05, y: -0.3 },
          o1: { x: -2.15, y: 0.8 },
          oe1: { x: -3.0, y: -0.9 },
          ce1: { x: -3.95, y: -0.5 },
          ck: { x: 0.35, y: 0.4 },
          cm2: { x: 1.3, y: 0.95 },
          ok: { x: 0.45, y: -0.7 },
          oe2: { x: -0.6, y: 1.0 },
          ce2: { x: -0.8, y: 2.05 },
        },
        toHints: {
          c1: { x: -1.1, y: 0.2 },
          c2: { x: -2.05, y: -0.3 },
          o1: { x: -2.15, y: 0.8 },
          oe1: { x: -3.0, y: -0.9 },
          ce1: { x: -3.95, y: -0.5 },
          ck: { x: 0.35, y: 0.4 },
          cm2: { x: 1.3, y: 0.95 },
          ok: { x: 0.45, y: -0.7 },
          oe2: { x: -0.05, y: 1.75 },
          ce2: { x: -0.25, y: 2.8 },
        },
      },
    ],
  },
  {
    id: "seq-wittig",
    title: "Wittig olefination · 2 steps",
    brief: "The ylide attacks, then the betaine collapses to the alkene. Trimethyl on screen where the flask holds triphenyl; the electrons do not care.",
    successLine: "The Wittig whole: carbanion onto the carbonyl, then the alkoxide grabs phosphorus and the C–P bond becomes the new π. The alkene lands exactly where the carbonyl was, which is the whole point of the reaction.",
    steps: [
      {
        step: WITTIG_ATTACK,
        stepBrief: "Step 1 · The ylide's carbanion attacks the carbonyl.",
        fromHints: {
          cy: { x: -1.15, y: 0.15 },
          p1: { x: -2.25, y: -0.25 },
          m1: { x: -3.2, y: 0.35 },
          m2: { x: -2.6, y: -1.35 },
          m3: { x: -1.75, y: -1.05 },
          cf: { x: 0.35, y: -0.2 },
          hf1: { x: 0.1, y: -1.25 },
          hf2: { x: 1.35, y: -0.45 },
          of: { x: 0.85, y: 0.7 },
        },
        toHints: {
          cy: { x: -0.85, y: 0.1 },
          p1: { x: -1.95, y: -0.3 },
          m1: { x: -2.9, y: 0.3 },
          m2: { x: -2.3, y: -1.4 },
          m3: { x: -1.45, y: -1.1 },
          cf: { x: 0.35, y: -0.2 },
          hf1: { x: 0.1, y: -1.25 },
          hf2: { x: 1.35, y: -0.45 },
          of: { x: 0.85, y: 0.7 },
        },
      },
      {
        step: WITTIG_COLLAPSE,
        stepBrief: "Step 2 · The alkoxide takes phosphorus; the C–P electrons become the alkene.",
        fromHints: {
          cy: { x: -0.85, y: 0.1 },
          p1: { x: -1.95, y: -0.3 },
          m1: { x: -2.9, y: 0.3 },
          m2: { x: -2.3, y: -1.4 },
          m3: { x: -1.45, y: -1.1 },
          cf: { x: 0.35, y: -0.2 },
          hf1: { x: 0.1, y: -1.25 },
          hf2: { x: 1.35, y: -0.45 },
          of: { x: 0.85, y: 0.7 },
        },
        toHints: {
          cy: { x: 0.0, y: 0.35 },
          cf: { x: 1.05, y: 0.0 },
          hf1: { x: 0.8, y: -1.05 },
          hf2: { x: 2.05, y: -0.25 },
          p1: { x: -2.15, y: -0.3 },
          m1: { x: -3.1, y: 0.3 },
          m2: { x: -2.5, y: -1.4 },
          m3: { x: -1.65, y: -1.1 },
          of: { x: -1.35, y: 0.55 },
        },
      },
    ],
  },
  {
    id: "seq-diene",
    title: "HBr + butadiene, 1,4 · 2 steps",
    brief: "Protonate the diene, then the bromide arrives at the FAR end through the allyl system.",
    successLine: "1,4-addition whole: the proton makes the allyl cation, and bromide captures the far end as the π slides over: the thermodynamic product, and Unit 1's whole argument about control.",
    steps: [
      {
        step: DIENE_PROTONATION,
        stepBrief: "Step 1 · The terminal π grabs the proton; the allyl cation is born.",
        fromHints: {
          c1: { x: -1.9, y: 0.35 },
          c2: { x: -0.95, y: -0.15 },
          c3: { x: 0.0, y: 0.35 },
          c4: { x: 0.95, y: -0.15 },
          hd: { x: -1.75, y: 1.6 },
          brd: { x: -0.75, y: 2.1 },
        },
        toHints: {
          c1: { x: -1.9, y: 0.35 },
          hd: { x: -2.5, y: 1.15 },
          c2: { x: -0.95, y: -0.15 },
          c3: { x: 0.0, y: 0.35 },
          c4: { x: 0.95, y: -0.15 },
          brd: { x: 0.1, y: 2.3 },
        },
      },
      {
        step: DIENE_CAPTURE_14,
        stepBrief: "Step 2 · Bromide takes C4 as the allyl π slides to the middle.",
        fromHints: {
          c1: { x: -1.9, y: 0.35 },
          hd: { x: -2.5, y: 1.15 },
          c2: { x: -0.95, y: -0.15 },
          c3: { x: 0.0, y: 0.35 },
          c4: { x: 0.95, y: -0.15 },
          brd: { x: 2.15, y: 0.5 },
        },
        toHints: {
          c1: { x: -1.9, y: 0.35 },
          hd: { x: -2.5, y: 1.15 },
          c2: { x: -0.95, y: -0.15 },
          c3: { x: 0.0, y: 0.35 },
          c4: { x: 0.95, y: -0.15 },
          brd: { x: 1.75, y: 0.5 },
        },
      },
    ],
  },
  {
    id: "seq-eas",
    title: "EAS nitration · 2 steps",
    brief: "The ring attacks, then gives the proton back: substitution that keeps aromaticity.",
    successLine: "Electrophilic aromatic substitution whole: the π attacks the nitronium, the arenium holds its breath, and losing the sp³ proton buys aromaticity back. Attack, then rearomatize: the same two beats under every reaction in this unit.",
    steps: [
      {
        step: EAS_ATTACK,
        stepBrief: "Step 1 · A ring π bond attacks the nitronium; one N=O relieves onto oxygen.",
        fromHints: {
          c1: { x: 0.0, y: 1.0 },
          c2: { x: 0.87, y: 0.5 },
          c3: { x: 0.87, y: -0.5 },
          c4: { x: 0.0, y: -1.0 },
          c5: { x: -0.87, y: -0.5 },
          c6: { x: -0.87, y: 0.5 },
          n1: { x: 0.6, y: 2.15 },
          o1: { x: -0.35, y: 2.6 },
          o2: { x: 1.55, y: 2.6 },
        },
        toHints: {
          c1: { x: 0.0, y: 1.0 },
          c2: { x: 0.87, y: 0.5 },
          c3: { x: 0.87, y: -0.5 },
          c4: { x: 0.0, y: -1.0 },
          c5: { x: -0.87, y: -0.5 },
          c6: { x: -0.87, y: 0.5 },
          hx: { x: -0.7, y: 1.7 },
          n1: { x: 0.6, y: 2.0 },
          o1: { x: -0.3, y: 2.5 },
          o2: { x: 1.55, y: 2.45 },
        },
      },
      {
        step: EAS_REAROMATIZE,
        stepBrief: "Step 2 · Water takes the sp³ hydrogen and the ring rearomatizes.",
        fromHints: {
          c1: { x: 0.0, y: 1.0 },
          c2: { x: 0.87, y: 0.5 },
          c3: { x: 0.87, y: -0.5 },
          c4: { x: 0.0, y: -1.0 },
          c5: { x: -0.87, y: -0.5 },
          c6: { x: -0.87, y: 0.5 },
          hx: { x: -0.7, y: 1.7 },
          n1: { x: 0.6, y: 2.0 },
          o1: { x: -0.3, y: 2.5 },
          o2: { x: 1.55, y: 2.45 },
          ow: { x: -2.1, y: 1.9 },
          hw1: { x: -2.85, y: 2.45 },
          hw2: { x: -2.6, y: 1.1 },
        },
        toHints: {
          c1: { x: 0.0, y: 1.0 },
          c2: { x: 0.87, y: 0.5 },
          c3: { x: 0.87, y: -0.5 },
          c4: { x: 0.0, y: -1.0 },
          c5: { x: -0.87, y: -0.5 },
          c6: { x: -0.87, y: 0.5 },
          n1: { x: 0.6, y: 2.15 },
          o1: { x: -0.35, y: 2.6 },
          o2: { x: 1.55, y: 2.6 },
          ow: { x: -2.4, y: 1.9 },
          hw1: { x: -3.15, y: 2.45 },
          hw2: { x: -2.9, y: 1.1 },
          hx: { x: -1.75, y: 2.7 },
        },
      },
    ],
  },
  {
    id: "seq-sn1",
    title: "SN1 solvolysis · 2 steps",
    brief: "The bromide leaves on its own, then water captures the cation.",
    successLine: "That is SN1 whole: ionisation makes the flat tertiary cation, and water arrives on either face, which is why SN1 scrambles stereochemistry where SN2 inverts it.",
    steps: [
      {
        step: IONISATION,
        stepBrief: "Step 1 · Send the C–Br electrons onto bromine. Nothing pushes them; the cation's stability pulls.",
        fromHints: {
          c0: { x: 0, y: 0 },
          c1: { x: -0.55, y: 0.9 },
          c2: { x: -0.85, y: -0.5 },
          c3: { x: 0.2, y: -1.05 },
          br1: { x: 1.05, y: 0.35 },
        },
        toHints: {
          c0: { x: -0.2, y: 0 },
          c1: { x: -0.75, y: 0.9 },
          c2: { x: -1.05, y: -0.5 },
          c3: { x: 0.0, y: -1.05 },
          br1: { x: 1.75, y: 0.55 },
        },
      },
      {
        step: CAPTURE,
        stepBrief: "Step 2 · Water's lone pair takes the empty carbon.",
        fromHints: {
          c0: { x: 0, y: 0 },
          c1: { x: -0.55, y: 0.9 },
          c2: { x: -0.85, y: -0.5 },
          c3: { x: 0.2, y: -1.05 },
          ow: { x: 1.35, y: 0.45 },
          hw1: { x: 2.1, y: 1.0 },
          hw2: { x: 1.85, y: -0.35 },
        },
        toHints: {
          c0: { x: 0, y: 0 },
          c1: { x: -0.55, y: 0.9 },
          c2: { x: -0.85, y: -0.5 },
          c3: { x: 0.2, y: -1.05 },
          ow: { x: 1.05, y: 0.4 },
          hw1: { x: 1.8, y: 0.95 },
          hw2: { x: 1.55, y: -0.4 },
        },
      },
    ],
  },
  {
    id: "seq-acyl",
    title: "Acyl substitution · 2 steps",
    brief: "Add to the carbonyl, then the tetrahedral intermediate collapses. The ladder's own mechanism.",
    successLine: "Addition, then elimination: the tetrahedral intermediate is the whole story of the reactivity ladder, and the leaving group decides how fast the second step goes.",
    steps: [
      {
        step: ACYL_ADDITION,
        stepBrief: "Step 1 · Hydroxide attacks the acyl carbon; the π electrons step onto oxygen.",
        fromHints: {
          o2: { x: -1.7, y: -0.55 },
          h1: { x: -2.45, y: -1.15 },
          cm: { x: -0.5, y: 1.3 },
          c2: { x: 0, y: 0.25 },
          o1: { x: 0.95, y: 0.85 },
          cl1: { x: 0.75, y: -0.85 },
        },
        toHints: {
          o2: { x: -1.05, y: -0.45 },
          h1: { x: -1.8, y: -1.05 },
          cm: { x: -0.5, y: 1.3 },
          c2: { x: 0, y: 0.25 },
          o1: { x: 0.95, y: 0.85 },
          cl1: { x: 0.75, y: -0.85 },
        },
      },
      {
        step: ACYL_COLLAPSE,
        stepBrief: "Step 2 · The alkoxide reforms the π bond and pushes chloride out.",
        fromHints: {
          cm: { x: -0.5, y: 1.3 },
          c2: { x: 0, y: 0.25 },
          o1: { x: 0.95, y: 0.85 },
          cl1: { x: 0.75, y: -0.85 },
          o2: { x: -1.05, y: -0.45 },
          h1: { x: -1.8, y: -1.05 },
        },
        toHints: {
          cm: { x: -0.5, y: 1.3 },
          c2: { x: 0, y: 0.25 },
          o1: { x: 0.95, y: 0.85 },
          cl1: { x: 1.55, y: -1.25 },
          o2: { x: -1.05, y: -0.45 },
          h1: { x: -1.8, y: -1.05 },
        },
      },
    ],
  },
  {
    id: "seq-aldol",
    title: "Aldol addition · 2 steps",
    brief: "Make the enolate, then let its carbon attack the other carbonyl.",
    successLine: "The aldol, start to finish: base pulls the α-proton to make the enolate, and the enolate's CARBON attacks the second carbonyl: one new C–C bond, the skeleton grown.",
    steps: [
      {
        step: ENOLATE_FORMATION,
        stepBrief: "Step 1 · The base takes the α-hydrogen; three arrows land at once.",
        fromHints: {
          ob: { x: -2.55, y: 1.0 },
          hb: { x: -3.3, y: 1.55 },
          c1: { x: -0.95, y: 0.35 },
          ha: { x: -1.7, y: 0.95 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
        },
        toHints: {
          ob: { x: -2.55, y: 1.0 },
          hb: { x: -3.3, y: 1.55 },
          ha: { x: -2.05, y: 1.6 },
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
        },
      },
      {
        step: ALDOL_ATTACK,
        stepBrief: "Step 2 · The enolate carbon attacks; the carbonyl reforms behind it. Three arrows again.",
        fromHints: {
          c1: { x: -1.15, y: 0.15 },
          c2: { x: -2.1, y: -0.35 },
          o1: { x: -2.2, y: 0.75 },
          c3: { x: -3.05, y: -0.95 },
          cf: { x: 0.35, y: -0.35 },
          hf1: { x: 0.1, y: -1.4 },
          hf2: { x: 1.35, y: -0.6 },
          of: { x: 0.85, y: 0.55 },
        },
        toHints: {
          c1: { x: -1.15, y: 0.15 },
          c2: { x: -2.1, y: -0.35 },
          o1: { x: -2.2, y: 0.75 },
          c3: { x: -3.05, y: -0.95 },
          cf: { x: -0.15, y: -0.55 },
          hf1: { x: -0.4, y: -1.6 },
          hf2: { x: 0.85, y: -0.8 },
          of: { x: 0.35, y: 0.35 },
        },
      },
    ],
  },
  {
    id: "seq-sapon",
    title: "Saponification · 3 steps",
    brief: "Hydroxide in, methoxide out, and the proton transfer that makes soap-making irreversible.",
    successLine: "The full arc: hydroxide built the tetrahedral intermediate, the collapse threw methoxide out, and methoxide took the acid's proton. That last step is why saponification never runs backwards: the carboxylate is too stable to return.",
    steps: [
      {
        step: SAPON_ATTACK,
        stepBrief: "Step 1 · Hydroxide attacks the ester's carbonyl carbon.",
        fromHints: {
          oh1: { x: -1.6, y: 0.5 },
          hh1: { x: -2.35, y: 0.15 },
          ca: { x: -0.95, y: -0.6 },
          c1: { x: 0, y: 0 },
          o1: { x: 0.4, y: 0.9 },
          o2: { x: 1.0, y: -0.5 },
          cm: { x: 2.0, y: -0.3 },
        },
        toHints: {
          oh1: { x: -0.75, y: 0.65 },
          hh1: { x: -1.5, y: 0.95 },
          ca: { x: -0.95, y: -0.6 },
          c1: { x: 0, y: 0 },
          o1: { x: 0.45, y: 1.0 },
          o2: { x: 1.0, y: -0.5 },
          cm: { x: 2.0, y: -0.3 },
        },
      },
      {
        step: SAPON_COLLAPSE,
        stepBrief: "Step 2 · The alkoxide collapses and pushes methoxide out.",
        fromHints: {
          oh1: { x: -0.75, y: 0.65 },
          hh1: { x: -1.5, y: 0.95 },
          ca: { x: -0.95, y: -0.6 },
          c1: { x: 0, y: 0 },
          o1: { x: 0.45, y: 1.0 },
          o2: { x: 1.0, y: -0.5 },
          cm: { x: 2.0, y: -0.3 },
        },
        toHints: {
          oh1: { x: -0.75, y: 0.65 },
          hh1: { x: -1.5, y: 0.95 },
          ca: { x: -0.95, y: -0.6 },
          c1: { x: 0, y: 0 },
          o1: { x: 0.45, y: 1.0 },
          o2: { x: 1.55, y: -0.75 },
          cm: { x: 2.5, y: -0.55 },
        },
      },
      {
        step: SAPON_PT,
        stepBrief: "Step 3 · Methoxide takes the acid's proton. Now it can never go back.",
        fromHints: {
          o2: { x: -2.15, y: 1.25 },
          cm: { x: -3.1, y: 0.95 },
          oh1: { x: -0.7, y: 0.7 },
          hh1: { x: -1.4, y: 1.0 },
          ca: { x: -0.95, y: -0.6 },
          c1: { x: 0, y: 0 },
          o1: { x: 0.45, y: 0.9 },
        },
        toHints: {
          o2: { x: -2.2, y: 1.3 },
          cm: { x: -3.15, y: 1.0 },
          hh1: { x: -1.5, y: 1.15 },
          oh1: { x: -0.7, y: 0.7 },
          ca: { x: -0.95, y: -0.6 },
          c1: { x: 0, y: 0 },
          o1: { x: 0.45, y: 0.9 },
        },
      },
    ],
  },
  {
    id: "seq-transester",
    title: "Transesterification · 2 steps",
    brief: "One ester becomes another: ethoxide in, methoxide out, the same two beats every acyl substitution uses.",
    successLine: "Attack, then collapse: ethoxide built the tetrahedral intermediate and the carbonyl reformed by ejecting methoxide. Biodiesel is made with exactly this move, a few billion litres at a time.",
    steps: [
      {
        step: TRANS_ATTACK,
        stepBrief: "Step 1 · Ethoxide attacks the carbonyl carbon.",
        fromHints: {
          oe: { x: -1.5, y: 0.55 },
          ce1: { x: -2.45, y: 0.9 },
          ce2: { x: -3.3, y: 0.4 },
          cta: { x: -0.95, y: -0.6 },
          ct1: { x: 0, y: 0 },
          ot1: { x: 0.4, y: 0.9 },
          ot2: { x: 1.0, y: -0.5 },
          ctm: { x: 2.0, y: -0.3 },
        },
        toHints: {
          oe: { x: -0.75, y: 0.7 },
          ce1: { x: -1.7, y: 1.05 },
          ce2: { x: -2.55, y: 0.55 },
          cta: { x: -0.95, y: -0.6 },
          ct1: { x: 0, y: 0 },
          ot1: { x: 0.45, y: 1.0 },
          ot2: { x: 1.0, y: -0.5 },
          ctm: { x: 2.0, y: -0.3 },
        },
      },
      {
        step: TRANS_COLLAPSE,
        stepBrief: "Step 2 · The carbonyl reforms and methoxide leaves.",
        fromHints: {
          oe: { x: -0.75, y: 0.7 },
          ce1: { x: -1.7, y: 1.05 },
          ce2: { x: -2.55, y: 0.55 },
          cta: { x: -0.95, y: -0.6 },
          ct1: { x: 0, y: 0 },
          ot1: { x: 0.45, y: 1.0 },
          ot2: { x: 1.0, y: -0.5 },
          ctm: { x: 2.0, y: -0.3 },
        },
        toHints: {
          oe: { x: -0.75, y: 0.7 },
          ce1: { x: -1.7, y: 1.05 },
          ce2: { x: -2.55, y: 0.55 },
          cta: { x: -0.95, y: -0.6 },
          ct1: { x: 0, y: 0 },
          ot1: { x: 0.45, y: 1.0 },
          ot2: { x: 1.6, y: -0.75 },
          ctm: { x: 2.55, y: -0.55 },
        },
      },
    ],
  },
  {
    id: "seq-gilman",
    title: "Gilman + acyl chloride · 2 steps",
    brief: "The cuprate's carbon attacks, chloride leaves, and the run STOPS at the ketone. That stop is the point.",
    successLine: "Two beats to the ketone: the carbanion attacked, the collapse ejected chloride, and then everything stopped. A Grignard would have attacked the ketone a second time; the gentler cuprate does not, and that restraint is the only reason this route to ketones exists.",
    steps: [
      {
        step: GILMAN_ATTACK,
        stepBrief: "Step 1 · The cuprate's methyl carbanion attacks the acyl carbon.",
        fromHints: {
          cg: { x: -1.45, y: 0.35 },
          cga: { x: -0.95, y: -0.85 },
          cg1: { x: 0, y: 0 },
          og1: { x: 0.4, y: 0.95 },
          clg: { x: 1.25, y: -0.6 },
        },
        toHints: {
          cg: { x: -0.85, y: 0.55 },
          cga: { x: -0.95, y: -0.85 },
          cg1: { x: 0, y: 0 },
          og1: { x: 0.45, y: 1.0 },
          clg: { x: 1.25, y: -0.6 },
        },
      },
      {
        step: GILMAN_COLLAPSE,
        stepBrief: "Step 2 · The carbonyl reforms and chloride leaves. The ketone survives.",
        fromHints: {
          cg: { x: -0.85, y: 0.55 },
          cga: { x: -0.95, y: -0.85 },
          cg1: { x: 0, y: 0 },
          og1: { x: 0.45, y: 1.0 },
          clg: { x: 1.25, y: -0.6 },
        },
        toHints: {
          cg: { x: -0.85, y: 0.55 },
          cga: { x: -0.95, y: -0.85 },
          cg1: { x: 0, y: 0 },
          og1: { x: 0.45, y: 1.0 },
          clg: { x: 1.85, y: -0.85 },
        },
      },
    ],
  },
  {
    id: "seq-anhydride",
    title: "Anhydride acylates an amine · 3 steps",
    brief: "Attack, collapse, clean-up: the acetate that just left comes back for the proton. Also THE amine protection move.",
    successLine: "The whole acylation: the amine attacked, acetate left, and acetate then collected the N-H proton to give the neutral amide. Aniline is protected exactly this way before nitration, and the amide comes off later by hydrolysis.",
    steps: [
      {
        step: ANHYDRIDE_ATTACK,
        stepBrief: "Step 1 · The amine's lone pair attacks one carbonyl of the anhydride.",
        fromHints: {
          na: { x: -1.5, y: 0.45 },
          hna1: { x: -2.1, y: 1.05 },
          hna2: { x: -1.35, y: 1.35 },
          cna: { x: -2.45, y: -0.05 },
          aa1: { x: -0.9, y: -0.85 },
          ac1: { x: 0, y: 0 },
          ao1: { x: 0.35, y: 0.95 },
          ob: { x: 1.0, y: -0.55 },
          ac2: { x: 2.0, y: -0.3 },
          ao2: { x: 2.35, y: 0.65 },
          aa2: { x: 2.85, y: -1.05 },
        },
        toHints: {
          na: { x: -0.8, y: 0.55 },
          hna1: { x: -1.4, y: 1.15 },
          hna2: { x: -0.65, y: 1.45 },
          cna: { x: -1.75, y: 0.05 },
          aa1: { x: -0.9, y: -0.85 },
          ac1: { x: 0, y: 0 },
          ao1: { x: 0.4, y: 1.0 },
          ob: { x: 1.0, y: -0.55 },
          ac2: { x: 2.0, y: -0.3 },
          ao2: { x: 2.35, y: 0.65 },
          aa2: { x: 2.85, y: -1.05 },
        },
      },
      {
        step: ANHYDRIDE_COLLAPSE,
        stepBrief: "Step 2 · The collapse pushes acetate out: the better leaving group of the two arms.",
        fromHints: {
          na: { x: -0.8, y: 0.55 },
          hna1: { x: -1.4, y: 1.15 },
          hna2: { x: -0.65, y: 1.45 },
          cna: { x: -1.75, y: 0.05 },
          aa1: { x: -0.9, y: -0.85 },
          ac1: { x: 0, y: 0 },
          ao1: { x: 0.4, y: 1.0 },
          ob: { x: 1.0, y: -0.55 },
          ac2: { x: 2.0, y: -0.3 },
          ao2: { x: 2.35, y: 0.65 },
          aa2: { x: 2.85, y: -1.05 },
        },
        toHints: {
          na: { x: -0.8, y: 0.55 },
          hna1: { x: -1.4, y: 1.15 },
          hna2: { x: -0.65, y: 1.45 },
          cna: { x: -1.75, y: 0.05 },
          aa1: { x: -0.9, y: -0.85 },
          ac1: { x: 0, y: 0 },
          ao1: { x: 0.4, y: 1.0 },
          ob: { x: 1.55, y: -0.8 },
          ac2: { x: 2.5, y: -0.55 },
          ao2: { x: 2.85, y: 0.4 },
          aa2: { x: 3.35, y: -1.3 },
        },
      },
      {
        step: ANHYDRIDE_PT,
        stepBrief: "Step 3 · Acetate returns for the N-H proton. Neutral amide, acetic acid, done.",
        fromHints: {
          ob: { x: -2.3, y: 1.5 },
          ac2: { x: -3.25, y: 1.2 },
          ao2: { x: -3.55, y: 2.1 },
          aa2: { x: -4.1, y: 0.55 },
          na: { x: -0.8, y: 0.55 },
          hna1: { x: -1.5, y: 1.2 },
          hna2: { x: -0.65, y: 1.45 },
          cna: { x: -1.75, y: 0.05 },
          aa1: { x: -0.9, y: -0.85 },
          ac1: { x: 0, y: 0 },
          ao1: { x: 0.4, y: 0.95 },
        },
        toHints: {
          ob: { x: -2.35, y: 1.55 },
          hna1: { x: -1.6, y: 1.35 },
          ac2: { x: -3.3, y: 1.25 },
          ao2: { x: -3.6, y: 2.15 },
          aa2: { x: -4.15, y: 0.6 },
          na: { x: -0.8, y: 0.55 },
          hna2: { x: -0.65, y: 1.45 },
          cna: { x: -1.75, y: 0.05 },
          aa1: { x: -0.9, y: -0.85 },
          ac1: { x: 0, y: 0 },
          ao1: { x: 0.4, y: 0.95 },
        },
      },
    ],
  },
  {
    id: "seq-halo-acid",
    title: "Acid α-bromination · 2 steps",
    brief: "The ENOL attacks bromine, and bromide comes back for the proton. Acid-side halogenation stops at one Br.",
    successLine: "The enol's alkene took bromine, the oxygen relayed the charge, and bromide collected the proton. Under acid the product ketone is LESS reactive than the starting one, so it stops at a single bromine; under base it would run away to the haloform. Same reagent, opposite endings.",
    steps: [
      {
        step: HALO_ACID_ATTACK,
        stepBrief: "Step 1 · The enol attacks bromine, oxygen backs it up.",
        fromHints: {
          ecm: { x: -2.55, y: -0.15 },
          ece: { x: -1.55, y: 0.3 },
          eoe: { x: -1.5, y: 1.4 },
          ehe: { x: -2.25, y: 1.95 },
          eca: { x: -0.55, y: -0.3 },
          bra: { x: 0.75, y: 0.15 },
          brb: { x: 1.95, y: 0.6 },
        },
        toHints: {
          ecm: { x: -2.55, y: -0.15 },
          ece: { x: -1.55, y: 0.3 },
          eoe: { x: -1.5, y: 1.4 },
          ehe: { x: -2.25, y: 1.95 },
          eca: { x: -0.55, y: -0.3 },
          bra: { x: 0.55, y: 0.1 },
          brb: { x: 2.35, y: 0.75 },
        },
      },
      {
        step: HALO_ACID_PT,
        stepBrief: "Step 2 · Bromide takes the O-H proton. Neutral ketone, HBr out.",
        fromHints: {
          brb: { x: -3.3, y: 2.3 },
          ecm: { x: -2.55, y: -0.15 },
          ece: { x: -1.55, y: 0.3 },
          eoe: { x: -1.5, y: 1.4 },
          ehe: { x: -2.25, y: 1.95 },
          eca: { x: -0.55, y: -0.3 },
          bra: { x: 0.55, y: 0.1 },
        },
        toHints: {
          brb: { x: -3.4, y: 2.4 },
          ehe: { x: -2.6, y: 2.05 },
          ecm: { x: -2.55, y: -0.15 },
          ece: { x: -1.55, y: 0.3 },
          eoe: { x: -1.5, y: 1.4 },
          eca: { x: -0.55, y: -0.3 },
          bra: { x: 0.55, y: 0.1 },
        },
      },
    ],
  },
  {
    id: "seq-crossed-aldol",
    title: "Crossed aldol · 2 steps",
    brief: "The partner has NO alpha hydrogens, so only one enolate can exist. That choice is the whole strategy.",
    successLine: "One enolate, one electrophile, one product: because the partner had no alpha hydrogens it could never fight back with an enolate of its own. Pick partners like this and a crossed aldol gives one clean product instead of four.",
    steps: [
      {
        step: CROSSED_ATTACK,
        stepBrief: "Step 1 · The enolate's carbon attacks the partner carbonyl.",
        fromHints: {
          ka: { x: -1.05, y: 0.35 },
          kb: { x: -2.0, y: -0.25 },
          ko: { x: -2.1, y: 0.85 },
          kc: { x: -2.95, y: -0.85 },
          fc: { x: 0.35, y: -0.15 },
          fo: { x: 1.3, y: 0.4 },
        },
        toHints: {
          ka: { x: -1.05, y: 0.35 },
          kb: { x: -2.0, y: -0.25 },
          ko: { x: -2.1, y: 0.85 },
          kc: { x: -2.95, y: -0.85 },
          fc: { x: 0.05, y: -0.2 },
          fo: { x: 1.0, y: 0.35 },
        },
      },
      {
        step: CROSSED_PROTONATE,
        stepBrief: "Step 2 · Water hands the new alkoxide its proton.",
        fromHints: {
          ka: { x: -1.05, y: 0.35 },
          kb: { x: -2.0, y: -0.25 },
          ko: { x: -2.1, y: 0.85 },
          kc: { x: -2.95, y: -0.85 },
          fc: { x: 0.05, y: -0.2 },
          fo: { x: 1.0, y: 0.35 },
          wo: { x: 2.5, y: 1.05 },
          wh1: { x: 1.75, y: 0.85 },
          wh2: { x: 3.1, y: 0.45 },
        },
        toHints: {
          ka: { x: -1.05, y: 0.35 },
          kb: { x: -2.0, y: -0.25 },
          ko: { x: -2.1, y: 0.85 },
          kc: { x: -2.95, y: -0.85 },
          fc: { x: 0.05, y: -0.2 },
          fo: { x: 1.0, y: 0.35 },
          wh1: { x: 1.7, y: 0.75 },
          wo: { x: 2.65, y: 1.15 },
          wh2: { x: 3.25, y: 0.55 },
        },
      },
    ],
  },
  {
    id: "seq-dieckmann",
    title: "Dieckmann condensation · 2 steps",
    brief: "A Claisen that bites its own tail: the ester enolate closes a five-ring, then methoxide is thrown out.",
    successLine: "The enolate reached its own far ester, closed the five-membered ring, and the collapse ejected methoxide. Same two beats as every Claisen; the only new idea is that both ends live on one chain, which is why five- and six-ring keto-esters come out so cleanly.",
    steps: [
      {
        step: DIECKMANN_ATTACK,
        stepBrief: "Step 1 · The ester enolate attacks its own far carbonyl. Ring closed.",
        fromHints: {
          dm1: { x: -3.9, y: -0.5 },
          dm1o: { x: -3.15, y: 0.25 },
          dc1: { x: -2.2, y: -0.2 },
          dk1: { x: -2.25, y: -1.3 },
          dc2: { x: -1.2, y: 0.4 },
          dc3: { x: -1.05, y: -0.75 },
          dc4: { x: 0.1, y: -1.0 },
          dc5: { x: 0.9, y: -0.2 },
          dc6: { x: 0.35, y: 0.8 },
          dk6: { x: 0.9, y: 1.75 },
          dm6o: { x: 1.45, y: 0.3 },
          dm6: { x: 2.45, y: 0.75 },
        },
        toHints: {
          dm1: { x: -3.9, y: -0.5 },
          dm1o: { x: -3.15, y: 0.25 },
          dc1: { x: -2.2, y: -0.2 },
          dk1: { x: -2.25, y: -1.3 },
          dc2: { x: -1.1, y: 0.35 },
          dc3: { x: -1.0, y: -0.8 },
          dc4: { x: 0.15, y: -1.05 },
          dc5: { x: 0.85, y: -0.25 },
          dc6: { x: 0.1, y: 0.7 },
          dk6: { x: 0.55, y: 1.7 },
          dm6o: { x: 1.2, y: 0.35 },
          dm6: { x: 2.2, y: 0.8 },
        },
      },
      {
        step: DIECKMANN_COLLAPSE,
        stepBrief: "Step 2 · The alkoxide collapses and methoxide leaves.",
        fromHints: {
          dm1: { x: -3.9, y: -0.5 },
          dm1o: { x: -3.15, y: 0.25 },
          dc1: { x: -2.2, y: -0.2 },
          dk1: { x: -2.25, y: -1.3 },
          dc2: { x: -1.1, y: 0.35 },
          dc3: { x: -1.0, y: -0.8 },
          dc4: { x: 0.15, y: -1.05 },
          dc5: { x: 0.85, y: -0.25 },
          dc6: { x: 0.1, y: 0.7 },
          dk6: { x: 0.55, y: 1.7 },
          dm6o: { x: 1.2, y: 0.35 },
          dm6: { x: 2.2, y: 0.8 },
        },
        toHints: {
          dm1: { x: -3.9, y: -0.5 },
          dm1o: { x: -3.15, y: 0.25 },
          dc1: { x: -2.2, y: -0.2 },
          dk1: { x: -2.25, y: -1.3 },
          dc2: { x: -1.1, y: 0.35 },
          dc3: { x: -1.0, y: -0.8 },
          dc4: { x: 0.15, y: -1.05 },
          dc5: { x: 0.85, y: -0.25 },
          dc6: { x: 0.1, y: 0.7 },
          dk6: { x: 0.55, y: 1.7 },
          dm6o: { x: 1.75, y: 0.1 },
          dm6: { x: 2.75, y: 0.55 },
        },
      },
    ],
  },
  {
    id: "seq-malonic",
    title: "Malonic ester synthesis · 2 steps",
    brief: "Two esters make one proton cheap. Take it, then alkylate the carbanion. The decarboxylation comes later, free.",
    successLine: "Ethoxide took the doubly activated proton, and the stabilised carbanion did a clean SN2 on the halide. Hydrolyse and warm it later and CO2 walks away, leaving exactly the acetic acid you designed. Two esters, one of which was only ever scaffolding.",
    steps: [
      {
        step: MALONIC_DEPROT,
        stepBrief: "Step 1 · Ethoxide takes the proton BETWEEN the two esters.",
        fromHints: {
          moe: { x: -1.15, y: 1.7 },
          mce1: { x: -2.15, y: 2.15 },
          mce2: { x: -3.05, y: 1.6 },
          mm1: { x: -3.7, y: -0.7 },
          mo1: { x: -2.75, y: -0.15 },
          mc1: { x: -1.75, y: -0.6 },
          mk1: { x: -1.8, y: -1.7 },
          mch: { x: -0.7, y: 0.0 },
          mhx: { x: -0.75, y: 1.1 },
          mc2: { x: 0.45, y: -0.5 },
          mk2: { x: 0.5, y: -1.6 },
          mo2: { x: 1.45, y: 0.1 },
          mm2: { x: 2.45, y: -0.35 },
        },
        toHints: {
          moe: { x: -1.05, y: 1.85 },
          mhx: { x: -0.35, y: 2.5 },
          mce1: { x: -2.05, y: 2.3 },
          mce2: { x: -2.95, y: 1.75 },
          mm1: { x: -3.7, y: -0.7 },
          mo1: { x: -2.75, y: -0.15 },
          mc1: { x: -1.75, y: -0.6 },
          mk1: { x: -1.8, y: -1.7 },
          mch: { x: -0.7, y: 0.0 },
          mc2: { x: 0.45, y: -0.5 },
          mk2: { x: 0.5, y: -1.6 },
          mo2: { x: 1.45, y: 0.1 },
          mm2: { x: 2.45, y: -0.35 },
        },
      },
      {
        step: MALONIC_ALKYLATE,
        stepBrief: "Step 2 · The carbanion does SN2 on the halide. New C-C bond.",
        fromHints: {
          mm1: { x: -3.7, y: -0.7 },
          mo1: { x: -2.75, y: -0.15 },
          mc1: { x: -1.75, y: -0.6 },
          mk1: { x: -1.8, y: -1.7 },
          mch: { x: -0.7, y: 0.0 },
          mc2: { x: 0.45, y: -0.5 },
          mk2: { x: 0.5, y: -1.6 },
          mo2: { x: 1.45, y: 0.1 },
          mm2: { x: 2.45, y: -0.35 },
          mcx: { x: -0.75, y: 1.35 },
          mbr: { x: 0.3, y: 2.05 },
        },
        toHints: {
          mm1: { x: -3.7, y: -0.7 },
          mo1: { x: -2.75, y: -0.15 },
          mc1: { x: -1.75, y: -0.6 },
          mk1: { x: -1.8, y: -1.7 },
          mch: { x: -0.7, y: 0.0 },
          mcx: { x: -0.75, y: 1.15 },
          mc2: { x: 0.45, y: -0.5 },
          mk2: { x: 0.5, y: -1.6 },
          mo2: { x: 1.45, y: 0.1 },
          mm2: { x: 2.45, y: -0.35 },
          mbr: { x: 0.75, y: 2.35 },
        },
      },
    ],
  },
  {
    id: "seq-robinson",
    title: "Robinson annulation · 3 steps",
    brief: "The capstone: Michael addition, intramolecular aldol, dehydration. Everything Unit 9 taught, in one build.",
    successLine: "Michael set the chain, the aldol closed the six-ring, and E1cb burned in the enone. That is the Robinson annulation, and it is three lessons you already knew stacked into one synthesis. Steroid chemists have lived on this ring-build since 1935.",
    steps: [
      {
        step: ROBINSON_MICHAEL,
        stepBrief: "Step 1 · Michael: the enolate adds 1,4 to the enone.",
        fromHints: {
          ra: { x: -1.15, y: 0.35 },
          rb: { x: -2.1, y: -0.25 },
          ro: { x: -2.2, y: 0.85 },
          rc: { x: -3.05, y: -0.85 },
          wb: { x: 0.25, y: 0.7 },
          wa: { x: 1.1, y: 0.0 },
          wk: { x: 2.2, y: 0.25 },
          wo: { x: 2.55, y: 1.25 },
          wm: { x: 3.0, y: -0.55 },
        },
        toHints: {
          ra: { x: -1.15, y: 0.35 },
          rb: { x: -2.1, y: -0.25 },
          ro: { x: -2.2, y: 0.85 },
          rc: { x: -3.05, y: -0.85 },
          wb: { x: -0.05, y: 0.7 },
          wa: { x: 0.85, y: 0.05 },
          wk: { x: 1.95, y: 0.3 },
          wo: { x: 2.3, y: 1.3 },
          wm: { x: 2.75, y: -0.5 },
        },
      },
      {
        step: ROBINSON_CLOSE,
        stepBrief: "Step 2 · The new enolate reaches around and closes the six-ring.",
        fromHints: {
          h1: { x: -1.35, y: 1.1 },
          h2: { x: -1.95, y: 0.15 },
          ho2: { x: -3.05, y: 0.15 },
          h3: { x: -1.35, y: -0.85 },
          h4: { x: -0.2, y: -1.05 },
          h5: { x: 0.85, y: -0.6 },
          h6: { x: 0.95, y: 0.55 },
          ho6: { x: 1.85, y: 1.2 },
          h7: { x: 1.9, y: -0.25 },
        },
        toHints: {
          h1: { x: -0.45, y: 1.0 },
          h2: { x: -1.35, y: 0.5 },
          ho2: { x: -2.4, y: 0.75 },
          h3: { x: -1.35, y: -0.55 },
          h4: { x: -0.45, y: -1.05 },
          h5: { x: 0.5, y: -0.55 },
          h6: { x: 0.5, y: 0.5 },
          ho6: { x: 1.4, y: 1.15 },
          h7: { x: 1.45, y: -0.15 },
        },
      },
      {
        step: ROBINSON_E1CB,
        stepBrief: "Step 3 · E1cb: the carbanion pushes, hydroxide leaves, the enone appears.",
        fromHints: {
          h1: { x: -0.45, y: 1.0 },
          h2: { x: -1.35, y: 0.5 },
          ho2: { x: -2.4, y: 0.75 },
          h3: { x: -1.35, y: -0.55 },
          h4: { x: -0.45, y: -1.05 },
          h5: { x: 0.5, y: -0.55 },
          h6: { x: 0.5, y: 0.5 },
          ho6: { x: 1.4, y: 1.15 },
          hoh: { x: 2.15, y: 1.7 },
          h7: { x: 1.45, y: -0.15 },
        },
        toHints: {
          h1: { x: -0.45, y: 1.0 },
          h2: { x: -1.35, y: 0.5 },
          ho2: { x: -2.4, y: 0.75 },
          h3: { x: -1.35, y: -0.55 },
          h4: { x: -0.45, y: -1.05 },
          h5: { x: 0.5, y: -0.55 },
          h6: { x: 0.5, y: 0.5 },
          h7: { x: 1.45, y: -0.15 },
          ho6: { x: 1.75, y: 1.5 },
          hoh: { x: 2.5, y: 2.0 },
        },
      },
    ],
  },
  {
    id: "seq-fischer",
    title: "Fischer esterification · 3 steps",
    brief: "Protonate the carbonyl, let the alcohol in, push the water out. The proton shuffles between beats are bookkeeping.",
    successLine: "Acid catalysis in three honest moves: the proton made the carbonyl hungry, methanol attacked, and water left once the electrons could relay from the methoxy oxygen. Everything else in the full PADPED dance is proton bookkeeping, and the equilibrium is pushed by drowning it in alcohol.",
    steps: [
      {
        step: FISCHER_PROTONATE,
        stepBrief: "Step 1 · Hydronium protonates the carbonyl oxygen. Now the carbon is hungry.",
        fromHints: {
          fca: { x: -0.95, y: -0.6 },
          fc1: { x: 0, y: 0 },
          fo1: { x: 0.35, y: 1.0 },
          fo2: { x: 1.0, y: -0.5 },
          fho: { x: 1.95, y: -0.25 },
          fo3: { x: 1.4, y: 1.85 },
          fh1: { x: 0.75, y: 1.55 },
          fh2: { x: 2.1, y: 1.5 },
          fh3: { x: 1.45, y: 2.6 },
        },
        toHints: {
          fca: { x: -0.95, y: -0.6 },
          fc1: { x: 0, y: 0 },
          fo1: { x: 0.35, y: 1.0 },
          fh1: { x: 1.0, y: 1.6 },
          fo2: { x: 1.0, y: -0.5 },
          fho: { x: 1.95, y: -0.25 },
          fo3: { x: 1.7, y: 2.15 },
          fh2: { x: 2.4, y: 1.8 },
          fh3: { x: 1.75, y: 2.9 },
        },
      },
      {
        step: FISCHER_ATTACK,
        stepBrief: "Step 2 · Methanol attacks the protonated carbonyl.",
        fromHints: {
          fom: { x: -1.55, y: 0.6 },
          fhm: { x: -2.3, y: 0.25 },
          fcm: { x: -1.65, y: 1.7 },
          fca: { x: -0.95, y: -0.6 },
          fc1: { x: 0, y: 0 },
          fo1: { x: 0.35, y: 1.0 },
          fh1: { x: 1.0, y: 1.6 },
          fo2: { x: 1.0, y: -0.5 },
          fho: { x: 1.95, y: -0.25 },
        },
        toHints: {
          fom: { x: -0.85, y: 0.7 },
          fhm: { x: -1.6, y: 0.4 },
          fcm: { x: -0.95, y: 1.8 },
          fca: { x: -0.95, y: -0.6 },
          fc1: { x: 0, y: 0 },
          fo1: { x: 0.45, y: 1.05 },
          fh1: { x: 1.1, y: 1.65 },
          fo2: { x: 1.0, y: -0.5 },
          fho: { x: 1.95, y: -0.25 },
        },
      },
      {
        step: FISCHER_LOSE_WATER,
        stepBrief: "Step 3 · After the proton hops (offstage), water leaves and the ester appears.",
        fromHints: {
          fca: { x: -0.95, y: -0.6 },
          fc1: { x: 0, y: 0 },
          foh: { x: 0.45, y: 1.05 },
          fhh: { x: 1.15, y: 1.6 },
          fow: { x: 1.05, y: -0.55 },
          fw1: { x: 2.0, y: -0.3 },
          fw2: { x: 1.15, y: -1.6 },
          fom: { x: -0.85, y: 0.7 },
          fcm: { x: -0.95, y: 1.8 },
        },
        toHints: {
          fca: { x: -0.95, y: -0.6 },
          fc1: { x: 0, y: 0 },
          foh: { x: 0.45, y: 1.05 },
          fhh: { x: 1.15, y: 1.6 },
          fom: { x: -0.85, y: 0.7 },
          fcm: { x: -0.95, y: 1.8 },
          fow: { x: 1.65, y: -0.85 },
          fw1: { x: 2.6, y: -0.6 },
          fw2: { x: 1.75, y: -1.9 },
        },
      },
    ],
  },
  {
    id: "seq-socl2",
    title: "SOCl2: acid → acyl chloride · 3 steps",
    brief: "Turn the worst leaving group in the ladder into one that cannot wait to go. Activation, then the usual two beats.",
    successLine: "The acid's OH attacked sulfur and became a chlorosulfite: a leaving group that leaves. Chloride then ran the standard attack-collapse pair, and the ejected chlorosulfite falls apart into SO2 gas and chloride, which is why this reaction only runs forward. Every synthesis that starts 'first, SOCl2' is buying this exact upgrade.",
    steps: [
      {
        step: SOCL2_ACTIVATE,
        stepBrief: "Step 1 · The acid's OH oxygen attacks sulfur; a chloride is pushed off.",
        fromHints: {
          sca: { x: -3.3, y: -0.6 },
          sc1: { x: -2.35, y: 0.0 },
          so1: { x: -2.35, y: 1.1 },
          so2: { x: -1.3, y: -0.5 },
          sho: { x: -1.35, y: -1.6 },
          ss: { x: 0.1, y: 0.1 },
          sk: { x: 0.3, y: 1.2 },
          scl1: { x: 1.25, y: -0.55 },
          scl2: { x: 0.05, y: -1.35 },
        },
        toHints: {
          sca: { x: -3.3, y: -0.6 },
          sc1: { x: -2.35, y: 0.0 },
          so1: { x: -2.35, y: 1.1 },
          so2: { x: -1.15, y: -0.4 },
          sho: { x: -1.2, y: -1.5 },
          ss: { x: 0.0, y: 0.1 },
          sk: { x: 0.2, y: 1.2 },
          scl2: { x: -0.05, y: -1.35 },
          scl1: { x: 1.7, y: -0.75 },
        },
      },
      {
        step: SOCL2_ATTACK,
        stepBrief: "Step 2 · Chloride attacks the carbonyl carbon of the (now deprotonated) chlorosulfite ester.",
        fromHints: {
          sclx: { x: -3.5, y: 1.05 },
          sca: { x: -3.3, y: -0.6 },
          sc1: { x: -2.35, y: 0.0 },
          so1: { x: -2.35, y: 1.1 },
          so2: { x: -1.15, y: -0.4 },
          ss: { x: 0.0, y: 0.1 },
          sk: { x: 0.2, y: 1.2 },
          scl2: { x: -0.05, y: -1.35 },
        },
        toHints: {
          sclx: { x: -2.9, y: 0.95 },
          sca: { x: -3.3, y: -0.6 },
          sc1: { x: -2.35, y: 0.0 },
          so1: { x: -2.15, y: 1.15 },
          so2: { x: -1.15, y: -0.4 },
          ss: { x: 0.0, y: 0.1 },
          sk: { x: 0.2, y: 1.2 },
          scl2: { x: -0.05, y: -1.35 },
        },
      },
      {
        step: SOCL2_COLLAPSE,
        stepBrief: "Step 3 · Collapse. The chlorosulfite leaves, then shatters into SO2 and chloride offstage.",
        fromHints: {
          sclx: { x: -2.9, y: 0.95 },
          sca: { x: -3.3, y: -0.6 },
          sc1: { x: -2.35, y: 0.0 },
          so1: { x: -2.15, y: 1.15 },
          so2: { x: -1.15, y: -0.4 },
          ss: { x: 0.0, y: 0.1 },
          sk: { x: 0.2, y: 1.2 },
          scl2: { x: -0.05, y: -1.35 },
        },
        toHints: {
          sclx: { x: -2.9, y: 0.95 },
          sca: { x: -3.3, y: -0.6 },
          sc1: { x: -2.35, y: 0.0 },
          so1: { x: -2.15, y: 1.15 },
          so2: { x: -0.75, y: -0.5 },
          ss: { x: 0.4, y: 0.0 },
          sk: { x: 0.6, y: 1.1 },
          scl2: { x: 0.35, y: -1.45 },
        },
      },
    ],
  },
  {
    id: "seq-anhydride-make",
    title: "Acid → anhydride · 2 steps",
    brief: "Carboxylate meets the acyl chloride you just made. Attack, collapse, and the middle oxygen is born.",
    successLine: "The carboxylate attacked the acyl chloride and chloride left: an anhydride from the ladder's most reactive rung. Notice the direction: you always climb DOWN the reactivity ladder, which is why the acyl chloride had to be made first.",
    steps: [
      {
        step: ANHMAKE_ATTACK,
        stepBrief: "Step 1 · The carboxylate oxygen attacks the acyl chloride's carbonyl.",
        fromHints: {
          nb: { x: -1.5, y: 0.5 },
          nc2: { x: -2.5, y: 0.05 },
          nk2: { x: -2.55, y: -1.05 },
          na2: { x: -3.45, y: 0.65 },
          nca: { x: -0.9, y: -0.85 },
          nc1: { x: 0, y: 0 },
          no1: { x: 0.35, y: 1.05 },
          ncl: { x: 1.2, y: -0.6 },
        },
        toHints: {
          nb: { x: -0.9, y: 0.6 },
          nc2: { x: -1.9, y: 0.15 },
          nk2: { x: -1.95, y: -0.95 },
          na2: { x: -2.85, y: 0.75 },
          nca: { x: -0.9, y: -0.85 },
          nc1: { x: 0, y: 0 },
          no1: { x: 0.4, y: 1.1 },
          ncl: { x: 1.2, y: -0.6 },
        },
      },
      {
        step: ANHMAKE_COLLAPSE,
        stepBrief: "Step 2 · The carbonyl reforms and chloride leaves. Anhydride made.",
        fromHints: {
          nb: { x: -0.9, y: 0.6 },
          nc2: { x: -1.9, y: 0.15 },
          nk2: { x: -1.95, y: -0.95 },
          na2: { x: -2.85, y: 0.75 },
          nca: { x: -0.9, y: -0.85 },
          nc1: { x: 0, y: 0 },
          no1: { x: 0.4, y: 1.1 },
          ncl: { x: 1.2, y: -0.6 },
        },
        toHints: {
          nb: { x: -0.9, y: 0.6 },
          nc2: { x: -1.9, y: 0.15 },
          nk2: { x: -1.95, y: -0.95 },
          na2: { x: -2.85, y: 0.75 },
          nca: { x: -0.9, y: -0.85 },
          nc1: { x: 0, y: 0 },
          no1: { x: 0.4, y: 1.1 },
          ncl: { x: 1.8, y: -0.85 },
        },
      },
    ],
  },
  {
    id: "seq-lialh4",
    title: "LiAlH4 on an ester · 3 steps",
    brief: "Two hydrides, straight to the primary alcohol. The aldehyde in the middle never survives the flask.",
    successLine: "First hydride, collapse to the aldehyde, second hydride: down two rungs to the alkoxide, alcohol at workup. The aldehyde is MORE reactive than the ester that made it, so with LiAlH4 there is no stopping halfway. That is exactly the job DIBAL exists to do differently.",
    steps: [
      {
        step: LIALH_FIRST,
        stepBrief: "Step 1 · The first hydride attacks the ester carbonyl.",
        fromHints: {
          lh1: { x: -1.4, y: 0.35 },
          lca: { x: -0.95, y: -0.75 },
          lc1: { x: 0, y: 0 },
          lo1: { x: 0.4, y: 0.95 },
          lo2: { x: 1.0, y: -0.5 },
          lcm: { x: 2.0, y: -0.3 },
        },
        toHints: {
          lh1: { x: -0.8, y: 0.5 },
          lca: { x: -0.95, y: -0.75 },
          lc1: { x: 0, y: 0 },
          lo1: { x: 0.45, y: 1.0 },
          lo2: { x: 1.0, y: -0.5 },
          lcm: { x: 2.0, y: -0.3 },
        },
      },
      {
        step: LIALH_COLLAPSE,
        stepBrief: "Step 2 · The alkoxide collapses; methoxide leaves; an aldehyde appears.",
        fromHints: {
          lh1: { x: -0.8, y: 0.5 },
          lca: { x: -0.95, y: -0.75 },
          lc1: { x: 0, y: 0 },
          lo1: { x: 0.45, y: 1.0 },
          lo2: { x: 1.0, y: -0.5 },
          lcm: { x: 2.0, y: -0.3 },
        },
        toHints: {
          lh1: { x: -0.8, y: 0.5 },
          lca: { x: -0.95, y: -0.75 },
          lc1: { x: 0, y: 0 },
          lo1: { x: 0.45, y: 1.0 },
          lo2: { x: 1.6, y: -0.75 },
          lcm: { x: 2.55, y: -0.55 },
        },
      },
      {
        step: LIALH_SECOND,
        stepBrief: "Step 3 · The second hydride finishes it. Alkoxide now, alcohol at workup.",
        fromHints: {
          lh2: { x: -1.45, y: 0.4 },
          lca: { x: -0.95, y: -0.75 },
          lc1: { x: 0, y: 0 },
          lo1: { x: 0.45, y: 1.0 },
          lh1: { x: 0.85, y: -0.6 },
        },
        toHints: {
          lh2: { x: -0.85, y: 0.55 },
          lca: { x: -0.95, y: -0.75 },
          lc1: { x: 0, y: 0 },
          lo1: { x: 0.45, y: 1.0 },
          lh1: { x: 0.85, y: -0.6 },
        },
      },
    ],
  },
  {
    id: "seq-grignard-ester",
    title: "Two Grignards on an ester · 3 steps",
    brief: "Attack, collapse, attack again. The ketone is born more reactive than its parent, so it never survives.",
    successLine: "The first carbanion built the intermediate, the collapse revealed a ketone, and the second carbanion took it immediately: a tertiary alkoxide with two identical new groups. This is why esters plus Grignards give tertiary alcohols and never stop at the ketone, and why the Gilman route exists when you need one.",
    steps: [
      {
        step: GRIGNARD_E_FIRST,
        stepBrief: "Step 1 · The first carbanion attacks the ester carbonyl.",
        fromHints: {
          ge1: { x: -1.45, y: 0.35 },
          gca: { x: -0.95, y: -0.75 },
          gc1: { x: 0, y: 0 },
          go1: { x: 0.4, y: 0.95 },
          go2: { x: 1.0, y: -0.5 },
          gcm: { x: 2.0, y: -0.3 },
        },
        toHints: {
          ge1: { x: -0.85, y: 0.55 },
          gca: { x: -0.95, y: -0.75 },
          gc1: { x: 0, y: 0 },
          go1: { x: 0.45, y: 1.0 },
          go2: { x: 1.0, y: -0.5 },
          gcm: { x: 2.0, y: -0.3 },
        },
      },
      {
        step: GRIGNARD_E_COLLAPSE,
        stepBrief: "Step 2 · Collapse. Methoxide out, and a ketone stands exposed.",
        fromHints: {
          ge1: { x: -0.85, y: 0.55 },
          gca: { x: -0.95, y: -0.75 },
          gc1: { x: 0, y: 0 },
          go1: { x: 0.45, y: 1.0 },
          go2: { x: 1.0, y: -0.5 },
          gcm: { x: 2.0, y: -0.3 },
        },
        toHints: {
          ge1: { x: -0.85, y: 0.55 },
          gca: { x: -0.95, y: -0.75 },
          gc1: { x: 0, y: 0 },
          go1: { x: 0.45, y: 1.0 },
          go2: { x: 1.6, y: -0.75 },
          gcm: { x: 2.55, y: -0.55 },
        },
      },
      {
        step: GRIGNARD_E_SECOND,
        stepBrief: "Step 3 · The second carbanion takes the ketone. Tertiary alkoxide, done.",
        fromHints: {
          ge2: { x: -1.5, y: 0.4 },
          gca: { x: -0.95, y: -0.75 },
          gc1: { x: 0, y: 0 },
          go1: { x: 0.45, y: 1.0 },
          ge1: { x: 0.95, y: -0.55 },
        },
        toHints: {
          ge2: { x: -0.9, y: 0.55 },
          gca: { x: -0.95, y: -0.75 },
          gc1: { x: 0, y: 0 },
          go1: { x: 0.45, y: 1.0 },
          ge1: { x: 0.95, y: -0.55 },
        },
      },
    ],
  },
  {
    id: "seq-amide-hyd",
    title: "Amide hydrolysis · 3 steps",
    brief: "The ladder's most stubborn rung. The amide anion only leaves because the proton transfer after it slams the door.",
    successLine: "Hydroxide attacked, the amide anion was forced out, and it instantly took the acid's proton to give carboxylate plus amine. That last transfer is the thermodynamic sink that makes the whole reluctant hydrolysis run, and it is why amides need hot, strong base while esters fall apart in warm soap water.",
    steps: [
      {
        step: AMIDE_ATTACK,
        stepBrief: "Step 1 · Hydroxide attacks the amide carbonyl. Slowly. Resonance fights back.",
        fromHints: {
          xoh: { x: -1.6, y: 0.5 },
          xhh: { x: -2.35, y: 0.15 },
          xca: { x: -0.95, y: -0.75 },
          xc1: { x: 0, y: 0 },
          xo1: { x: 0.4, y: 0.95 },
          xn: { x: 1.05, y: -0.45 },
          xhn: { x: 1.0, y: -1.55 },
          xcn: { x: 2.1, y: 0.05 },
        },
        toHints: {
          xoh: { x: -0.75, y: 0.65 },
          xhh: { x: -1.5, y: 0.95 },
          xca: { x: -0.95, y: -0.75 },
          xc1: { x: 0, y: 0 },
          xo1: { x: 0.45, y: 1.0 },
          xn: { x: 1.05, y: -0.45 },
          xhn: { x: 1.0, y: -1.55 },
          xcn: { x: 2.1, y: 0.05 },
        },
      },
      {
        step: AMIDE_COLLAPSE,
        stepBrief: "Step 2 · The collapse pushes out the amide anion, the worst leaving group you will ever draw.",
        fromHints: {
          xoh: { x: -0.75, y: 0.65 },
          xhh: { x: -1.5, y: 0.95 },
          xca: { x: -0.95, y: -0.75 },
          xc1: { x: 0, y: 0 },
          xo1: { x: 0.45, y: 1.0 },
          xn: { x: 1.05, y: -0.45 },
          xhn: { x: 1.0, y: -1.55 },
          xcn: { x: 2.1, y: 0.05 },
        },
        toHints: {
          xoh: { x: -0.75, y: 0.65 },
          xhh: { x: -1.5, y: 0.95 },
          xca: { x: -0.95, y: -0.75 },
          xc1: { x: 0, y: 0 },
          xo1: { x: 0.45, y: 1.0 },
          xn: { x: 1.65, y: -0.7 },
          xhn: { x: 1.6, y: -1.8 },
          xcn: { x: 2.7, y: -0.2 },
        },
      },
      {
        step: AMIDE_PT,
        stepBrief: "Step 3 · The amide anion takes the acid's proton. The door slams shut behind it.",
        fromHints: {
          xn: { x: -2.3, y: 1.45 },
          xhn: { x: -3.3, y: 1.2 },
          xcn: { x: -2.25, y: 2.55 },
          xca: { x: -0.95, y: -0.75 },
          xc1: { x: 0, y: 0 },
          xo1: { x: 0.45, y: 0.95 },
          xoh: { x: -0.75, y: 0.65 },
          xhh: { x: -1.5, y: 0.95 },
        },
        toHints: {
          xn: { x: -2.35, y: 1.5 },
          xhh: { x: -1.6, y: 1.2 },
          xhn: { x: -3.35, y: 1.25 },
          xcn: { x: -2.3, y: 2.6 },
          xca: { x: -0.95, y: -0.75 },
          xc1: { x: 0, y: 0 },
          xo1: { x: 0.45, y: 0.95 },
          xoh: { x: -0.75, y: 0.65 },
        },
      },
    ],
  },
  {
    id: "seq-eas-br",
    title: "EAS bromination · 2 steps",
    brief: "Same dance as nitration, new partner: the ring attacks Br2 and bromide comes back for the proton.",
    successLine: "The ring broke its aromaticity to take the bromine, and got it back by handing bromide the proton. Every EAS you will ever draw is these two beats; only the electrophile changes costume.",
    steps: [
      {
        step: EASBR_ATTACK,
        stepBrief: "Step 1 · The ring's pi bond attacks Br2. Aromaticity spent, on purpose.",
        fromHints: {
          bc1: { x: -1.15, y: 0.15 },
          bc2: { x: -1.85, y: 1.0 },
          bc3: { x: -2.95, y: 0.85 },
          bc4: { x: -3.35, y: -0.15 },
          bc5: { x: -2.65, y: -1.0 },
          bc6: { x: -1.55, y: -0.85 },
          bba: { x: 0.35, y: 0.5 },
          bbb: { x: 1.55, y: 0.85 },
        },
        toHints: {
          bc1: { x: -1.15, y: 0.15 },
          bhx: { x: -1.05, y: 1.25 },
          bc2: { x: -1.85, y: 1.0 },
          bc3: { x: -2.95, y: 0.85 },
          bc4: { x: -3.35, y: -0.15 },
          bc5: { x: -2.65, y: -1.0 },
          bc6: { x: -1.55, y: -0.85 },
          bba: { x: 0.0, y: 0.4 },
          bbb: { x: 1.95, y: 1.0 },
        },
      },
      {
        step: EASBR_REAROMATIZE,
        stepBrief: "Step 2 · Bromide takes the sp3 proton; the ring is aromatic again.",
        fromHints: {
          bbb: { x: 0.3, y: 2.0 },
          bc1: { x: -1.15, y: 0.15 },
          bhx: { x: -1.05, y: 1.25 },
          bc2: { x: -1.85, y: 1.0 },
          bc3: { x: -2.95, y: 0.85 },
          bc4: { x: -3.35, y: -0.15 },
          bc5: { x: -2.65, y: -1.0 },
          bc6: { x: -1.55, y: -0.85 },
          bba: { x: 0.0, y: 0.4 },
        },
        toHints: {
          bbb: { x: 0.55, y: 2.25 },
          bhx: { x: -0.4, y: 1.95 },
          bc1: { x: -1.15, y: 0.15 },
          bc2: { x: -1.85, y: 1.0 },
          bc3: { x: -2.95, y: 0.85 },
          bc4: { x: -3.35, y: -0.15 },
          bc5: { x: -2.65, y: -1.0 },
          bc6: { x: -1.55, y: -0.85 },
          bba: { x: 0.0, y: 0.4 },
        },
      },
    ],
  },
  {
    id: "seq-sulfonation",
    title: "Sulfonation · 2 steps",
    brief: "SO3 is electrophilic enough on its own, and the whole reaction runs backwards in steam. The reversible EAS.",
    successLine: "The ring attacked sulfur, the charge parked on oxygen, and the same oxygen reached back for the proton. Sulfonation is the one EAS you can undo: park a sulfonic acid on a position to block it, do your chemistry, then steam it off. That trick is the entire blocking-group strategy.",
    steps: [
      {
        step: SULFO_ATTACK,
        stepBrief: "Step 1 · The ring attacks SO3's sulfur; an S=O relieves the strain.",
        fromHints: {
          uc1: { x: -1.15, y: 0.15 },
          uc2: { x: -1.85, y: 1.0 },
          uc3: { x: -2.95, y: 0.85 },
          uc4: { x: -3.35, y: -0.15 },
          uc5: { x: -2.65, y: -1.0 },
          uc6: { x: -1.55, y: -0.85 },
          us: { x: 0.35, y: 0.45 },
          uo1: { x: 0.6, y: 1.5 },
          uo2: { x: 1.35, y: -0.2 },
          uo3: { x: -0.05, y: -0.6 },
        },
        toHints: {
          uc1: { x: -1.15, y: 0.15 },
          uhx: { x: -1.05, y: 1.25 },
          uc2: { x: -1.85, y: 1.0 },
          uc3: { x: -2.95, y: 0.85 },
          uc4: { x: -3.35, y: -0.15 },
          uc5: { x: -2.65, y: -1.0 },
          uc6: { x: -1.55, y: -0.85 },
          us: { x: 0.1, y: 0.35 },
          uo1: { x: 0.35, y: 1.4 },
          uo2: { x: 1.1, y: -0.3 },
          uo3: { x: -0.3, y: -0.7 },
        },
      },
      {
        step: SULFO_REAROMATIZE,
        stepBrief: "Step 2 · The oxygen that took the charge reaches back for the proton.",
        fromHints: {
          uc1: { x: -1.15, y: 0.15 },
          uhx: { x: -1.05, y: 1.25 },
          uc2: { x: -1.85, y: 1.0 },
          uc3: { x: -2.95, y: 0.85 },
          uc4: { x: -3.35, y: -0.15 },
          uc5: { x: -2.65, y: -1.0 },
          uc6: { x: -1.55, y: -0.85 },
          us: { x: 0.1, y: 0.35 },
          uo1: { x: 0.35, y: 1.4 },
          uo2: { x: 1.1, y: -0.3 },
          uo3: { x: -0.3, y: -0.7 },
        },
        toHints: {
          uc1: { x: -1.15, y: 0.15 },
          uc2: { x: -1.85, y: 1.0 },
          uc3: { x: -2.95, y: 0.85 },
          uc4: { x: -3.35, y: -0.15 },
          uc5: { x: -2.65, y: -1.0 },
          uc6: { x: -1.55, y: -0.85 },
          us: { x: 0.1, y: 0.35 },
          uo1: { x: 0.35, y: 1.4 },
          uhx: { x: 1.05, y: 1.95 },
          uo2: { x: 1.1, y: -0.3 },
          uo3: { x: -0.3, y: -0.7 },
        },
      },
    ],
  },
  {
    id: "seq-fc-acyl",
    title: "Friedel-Crafts acylation · 2 steps",
    brief: "The acylium cannot rearrange, so what you aim is what you get. The reason acylation beats alkylation.",
    successLine: "The ring took the acylium's carbon and chloride cleaned up the proton: acetophenone. The acylium is resonance-stabilised and cannot shift the way alkyl cations do, and the ketone it leaves deactivates the ring against a second hit. Both problems of FC alkylation, solved by one carbonyl.",
    steps: [
      {
        step: FC_ATTACK,
        stepBrief: "Step 1 · The ring attacks the acylium carbon; the triple bond relaxes to C=O.",
        fromHints: {
          rc1: { x: -1.15, y: 0.15 },
          rc2: { x: -1.85, y: 1.0 },
          rc3: { x: -2.95, y: 0.85 },
          rc4: { x: -3.35, y: -0.15 },
          rc5: { x: -2.65, y: -1.0 },
          rc6: { x: -1.55, y: -0.85 },
          rcc: { x: 0.35, y: 0.5 },
          rco: { x: 1.3, y: 1.05 },
          rca: { x: 0.75, y: -0.55 },
        },
        toHints: {
          rc1: { x: -1.15, y: 0.15 },
          rhx: { x: -1.05, y: 1.25 },
          rc2: { x: -1.85, y: 1.0 },
          rc3: { x: -2.95, y: 0.85 },
          rc4: { x: -3.35, y: -0.15 },
          rc5: { x: -2.65, y: -1.0 },
          rc6: { x: -1.55, y: -0.85 },
          rcc: { x: 0.1, y: 0.4 },
          rco: { x: 1.05, y: 0.95 },
          rca: { x: 0.5, y: -0.65 },
        },
      },
      {
        step: FC_REAROMATIZE,
        stepBrief: "Step 2 · Chloride takes the proton; acetophenone stands aromatic again.",
        fromHints: {
          rcl: { x: 0.3, y: 2.1 },
          rc1: { x: -1.15, y: 0.15 },
          rhx: { x: -1.05, y: 1.25 },
          rc2: { x: -1.85, y: 1.0 },
          rc3: { x: -2.95, y: 0.85 },
          rc4: { x: -3.35, y: -0.15 },
          rc5: { x: -2.65, y: -1.0 },
          rc6: { x: -1.55, y: -0.85 },
          rcc: { x: 0.1, y: 0.4 },
          rco: { x: 1.05, y: 0.95 },
          rca: { x: 0.5, y: -0.65 },
        },
        toHints: {
          rcl: { x: 0.55, y: 2.35 },
          rhx: { x: -0.4, y: 2.05 },
          rc1: { x: -1.15, y: 0.15 },
          rc2: { x: -1.85, y: 1.0 },
          rc3: { x: -2.95, y: 0.85 },
          rc4: { x: -3.35, y: -0.15 },
          rc5: { x: -2.65, y: -1.0 },
          rc6: { x: -1.55, y: -0.85 },
          rcc: { x: 0.1, y: 0.4 },
          rco: { x: 1.05, y: 0.95 },
          rca: { x: 0.5, y: -0.65 },
        },
      },
    ],
  },
  {
    id: "seq-diene-br2",
    title: "Br2 + butadiene, 1,4 · 2 steps",
    brief: "Bromine makes an allyl cation, and the cation wears two costumes. Warm conditions pick the far seat.",
    successLine: "Bromine went on at C1 and made an allyl cation that lives at C2 AND C4 at once. Bromide chose the far end: 1,4-addition, the thermodynamic product, with the internal alkene as its prize. Cold it, and the same bromide grabs the near seat instead.",
    steps: [
      {
        step: DIENE_BR_ATTACK,
        stepBrief: "Step 1 · The terminal alkene attacks Br2. An allyl cation is born.",
        fromHints: {
          d1: { x: -2.3, y: 0.35 },
          d2: { x: -1.35, y: -0.25 },
          d3: { x: -0.3, y: 0.25 },
          d4: { x: 0.65, y: -0.35 },
          dba: { x: -2.5, y: 1.75 },
          dbb: { x: -1.45, y: 2.5 },
        },
        toHints: {
          d1: { x: -2.3, y: 0.35 },
          dba: { x: -2.55, y: 1.45 },
          d2: { x: -1.35, y: -0.25 },
          d3: { x: -0.3, y: 0.25 },
          d4: { x: 0.65, y: -0.35 },
          dbb: { x: -1.3, y: 2.75 },
        },
      },
      {
        step: DIENE_BR_CAPTURE,
        stepBrief: "Step 2 · Same cation, other costume: bromide takes the FAR end.",
        fromHints: {
          dbb: { x: 1.75, y: 0.95 },
          d1: { x: -2.3, y: 0.35 },
          dba: { x: -2.55, y: 1.45 },
          d2: { x: -1.35, y: -0.25 },
          d3: { x: -0.3, y: 0.25 },
          d4: { x: 0.65, y: -0.35 },
        },
        toHints: {
          dbb: { x: 1.45, y: 0.55 },
          d1: { x: -2.3, y: 0.35 },
          dba: { x: -2.55, y: 1.45 },
          d2: { x: -1.35, y: -0.25 },
          d3: { x: -0.3, y: 0.25 },
          d4: { x: 0.65, y: -0.35 },
        },
      },
    ],
  },
  {
    id: "seq-roh-hbr",
    title: "Alcohol → alkyl halide · 2 steps",
    brief: "OH is a terrible leaving group. Protonate it and it is water, which leaves happily. Then SN2.",
    successLine: "HBr's proton turned the hydroxyl into water, and the bromide it left behind did the SN2. Every alcohol activation in the course is a variation on this: make the oxygen WANT to leave, then push.",
    steps: [
      {
        step: ROH_PROTONATE,
        stepBrief: "Step 1 · The alcohol oxygen takes HBr's proton.",
        fromHints: {
          olo: { x: -0.6, y: 0.55 },
          olh: { x: -1.35, y: 1.1 },
          olc1: { x: 0.0, y: -0.4 },
          olc2: { x: -0.85, y: -1.15 },
          olha: { x: 0.35, y: 1.55 },
          olbr: { x: 1.55, y: 1.95 },
        },
        toHints: {
          olo: { x: -0.6, y: 0.55 },
          olh: { x: -1.35, y: 1.1 },
          olha: { x: 0.15, y: 1.35 },
          olc1: { x: 0.0, y: -0.4 },
          olc2: { x: -0.85, y: -1.15 },
          olbr: { x: 1.85, y: 2.15 },
        },
      },
      {
        step: ROH_SN2,
        stepBrief: "Step 2 · Bromide attacks from the back; water walks away.",
        fromHints: {
          olbr: { x: 1.6, y: -0.75 },
          olo: { x: -0.6, y: 0.55 },
          olh: { x: -1.35, y: 1.1 },
          olha: { x: 0.15, y: 1.35 },
          olc1: { x: 0.0, y: -0.4 },
          olc2: { x: -0.85, y: -1.15 },
        },
        toHints: {
          olbr: { x: 1.05, y: -0.6 },
          olc1: { x: 0.0, y: -0.4 },
          olc2: { x: -0.85, y: -1.15 },
          olo: { x: -0.95, y: 0.9 },
          olh: { x: -1.7, y: 1.45 },
          olha: { x: -0.2, y: 1.7 },
        },
      },
    ],
  },
  {
    id: "seq-mesylate",
    title: "Mesylate formation · 2 steps",
    brief: "The polite way to fix a bad leaving group: no acid, no carbocation, stereocentre untouched.",
    successLine: "The alcohol attacked sulfur, chloride left, and chloride then collected the proton: an ethyl mesylate, ready for any SN2 you point at it. Unlike the HBr route there was never a cation on the map, which is why this is the move when a stereocentre is nearby.",
    steps: [
      {
        step: MESYL_ATTACK,
        stepBrief: "Step 1 · The alcohol oxygen attacks sulfur; chloride is pushed out.",
        fromHints: {
          vso: { x: -1.15, y: 0.45 },
          vsh: { x: -1.9, y: 1.0 },
          vsc1: { x: -1.55, y: -0.6 },
          vsc2: { x: -2.6, y: -0.95 },
          vss: { x: 0.35, y: 0.2 },
          vsm: { x: 0.8, y: -0.85 },
          vsk1: { x: 0.55, y: 1.3 },
          vsk2: { x: 1.3, y: 0.75 },
          vscl: { x: 0.05, y: -1.35 },
        },
        toHints: {
          vso: { x: -0.85, y: 0.45 },
          vsh: { x: -1.6, y: 1.0 },
          vsc1: { x: -1.25, y: -0.6 },
          vsc2: { x: -2.3, y: -0.95 },
          vss: { x: 0.35, y: 0.2 },
          vsm: { x: 0.8, y: -0.85 },
          vsk1: { x: 0.55, y: 1.3 },
          vsk2: { x: 1.45, y: 0.6 },
          vscl: { x: 0.0, y: -1.85 },
        },
      },
      {
        step: MESYL_DEPROT,
        stepBrief: "Step 2 · Chloride comes back for the proton. Mesylate done.",
        fromHints: {
          vscl: { x: -2.85, y: 1.6 },
          vso: { x: -0.85, y: 0.45 },
          vsh: { x: -1.6, y: 1.0 },
          vsc1: { x: -1.25, y: -0.6 },
          vsc2: { x: -2.3, y: -0.95 },
          vss: { x: 0.35, y: 0.2 },
          vsm: { x: 0.8, y: -0.85 },
          vsk1: { x: 0.55, y: 1.3 },
          vsk2: { x: 1.45, y: 0.6 },
        },
        toHints: {
          vscl: { x: -2.95, y: 1.7 },
          vsh: { x: -2.15, y: 1.35 },
          vso: { x: -0.85, y: 0.45 },
          vsc1: { x: -1.25, y: -0.6 },
          vsc2: { x: -2.3, y: -0.95 },
          vss: { x: 0.35, y: 0.2 },
          vsm: { x: 0.8, y: -0.85 },
          vsk1: { x: 0.55, y: 1.3 },
          vsk2: { x: 1.45, y: 0.6 },
        },
      },
    ],
  },
  {
    id: "seq-hemiacetal",
    title: "Hemiacetal formation · 2 steps",
    brief: "Protonate the carbonyl, then the alcohol adds. Do it twice and you have an acetal; do it in a ring and you have glucose.",
    successLine: "The proton switched the carbonyl on, and methanol added to give the protonated hemiacetal. Run the same pair of moves again with a second methanol and you reach the acetal; let a sugar's own C5 hydroxyl do the attacking and this exact chemistry closes glucose into its ring.",
    steps: [
      {
        step: HEMI_PROTONATE,
        stepBrief: "Step 1 · Hydronium protonates the aldehyde oxygen.",
        fromHints: {
          heca: { x: -1.05, y: -0.7 },
          hec1: { x: 0, y: 0 },
          heo1: { x: 0.35, y: 1.05 },
          heo3: { x: 1.5, y: 1.9 },
          heh1: { x: 0.85, y: 1.6 },
          heh2: { x: 2.2, y: 1.55 },
          heh3: { x: 1.55, y: 2.65 },
        },
        toHints: {
          heca: { x: -1.05, y: -0.7 },
          hec1: { x: 0, y: 0 },
          heo1: { x: 0.35, y: 1.05 },
          heh1: { x: 1.05, y: 1.6 },
          heo3: { x: 1.85, y: 2.2 },
          heh2: { x: 2.55, y: 1.85 },
          heh3: { x: 1.9, y: 2.95 },
        },
      },
      {
        step: HEMI_ATTACK,
        stepBrief: "Step 2 · Methanol attacks the switched-on carbonyl.",
        fromHints: {
          heom: { x: -1.55, y: 0.6 },
          hehm: { x: -2.3, y: 0.25 },
          hecm: { x: -1.65, y: 1.7 },
          heca: { x: -1.05, y: -0.7 },
          hec1: { x: 0, y: 0 },
          heo1: { x: 0.35, y: 1.05 },
          heh1: { x: 1.05, y: 1.6 },
        },
        toHints: {
          heom: { x: -0.85, y: 0.7 },
          hehm: { x: -1.6, y: 0.35 },
          hecm: { x: -0.95, y: 1.8 },
          heca: { x: -1.05, y: -0.7 },
          hec1: { x: 0, y: 0 },
          heo1: { x: 0.4, y: 1.05 },
          heh1: { x: 1.1, y: 1.6 },
        },
      },
    ],
  },
  {
    id: "seq-diazo-sub",
    title: "Diazonium substitution · 2 steps",
    brief: "N2 is the best leaving group in chemistry. It leaves on its own, and whatever is nearby takes the cation.",
    successLine: "The C-N bond broke by itself because nitrogen gas is the one leaving group that never comes back, and water captured the phenyl cation the instant it existed. Swap the water for CuBr, CuCN or KI and the same skeleton delivers the whole Sandmeyer family.",
    steps: [
      {
        step: DIAZO_LOSS,
        stepBrief: "Step 1 · N2 leaves. Nothing pushed it; it just left.",
        fromHints: {
          gc1: { x: -0.9, y: 0.15 },
          gc2: { x: -1.6, y: 1.0 },
          gc3: { x: -2.7, y: 0.85 },
          gc4: { x: -3.1, y: -0.15 },
          gc5: { x: -2.4, y: -1.0 },
          gc6: { x: -1.3, y: -0.85 },
          gn1: { x: 0.35, y: 0.5 },
          gn2: { x: 1.5, y: 0.8 },
        },
        toHints: {
          gc1: { x: -0.9, y: 0.15 },
          gc2: { x: -1.6, y: 1.0 },
          gc3: { x: -2.7, y: 0.85 },
          gc4: { x: -3.1, y: -0.15 },
          gc5: { x: -2.4, y: -1.0 },
          gc6: { x: -1.3, y: -0.85 },
          gn1: { x: 0.9, y: 0.65 },
          gn2: { x: 2.05, y: 0.95 },
        },
      },
      {
        step: DIAZO_CAPTURE,
        stepBrief: "Step 2 · Water captures the phenyl cation. Phenol after one more proton hop.",
        fromHints: {
          gwo: { x: 0.55, y: 0.7 },
          gw1: { x: 1.35, y: 0.15 },
          gw2: { x: 0.85, y: 1.7 },
          gc1: { x: -0.9, y: 0.15 },
          gc2: { x: -1.6, y: 1.0 },
          gc3: { x: -2.7, y: 0.85 },
          gc4: { x: -3.1, y: -0.15 },
          gc5: { x: -2.4, y: -1.0 },
          gc6: { x: -1.3, y: -0.85 },
        },
        toHints: {
          gwo: { x: 0.2, y: 0.6 },
          gw1: { x: 1.0, y: 0.1 },
          gw2: { x: 0.5, y: 1.6 },
          gc1: { x: -0.9, y: 0.15 },
          gc2: { x: -1.6, y: 1.0 },
          gc3: { x: -2.7, y: 0.85 },
          gc4: { x: -3.1, y: -0.15 },
          gc5: { x: -2.4, y: -1.0 },
          gc6: { x: -1.3, y: -0.85 },
        },
      },
    ],
  },
];
