/**
 * Unit 5 spine: acid-catalysed dehydration of 2-methylbutan-2-ol, the three
 * E1 beats. Audit 23 Oct top-25 #20: the u5-dehydration lesson used to end on
 * the hydroxide E2 trainer (2-bromopropane), which is not what hot H2SO4 does
 * to an alcohol.
 *
 *   2-methylbutan-2-ol, H2SO4, heat  ->  2-methylbut-2-ene (major)
 *
 * The same substrate as the lesson's own u5-dh-zaitsev question, whose key is
 * derived in scripts/u5_pools.py (every beta H loss from the cation enumerated
 * by RDKit, ranked by carbons on the C=C). The structures below were checked
 * against RDKit when this file was written: alcohol CCC(C)(C)O, oxonium
 * CCC(C)(C)[OH2+], cation CC[C+](C)C, alkene CC=C(C)C (three carbons on the
 * C=C, against two for the minor C=C(C)CC).
 *
 * Modelling choices, the same ones forks/benzylic.ts makes and says so:
 *   - H2SO4 is drawn as hydronium H3O+. Strong acid in a wet alcohol protonates
 *     through H3O+, and H-OSO3H would add six spectator atoms.
 *   - The base in step 3 is the water that just left, the only base in the
 *     flask besides HSO4-.
 *   - The beta hydrogen on the CH2 (hb) is explicit from the alcohol onward,
 *     because it is the atom the base takes and atom ids must survive every
 *     step. Every other H is implicit, so the Zaitsev H is the one to draw.
 *
 * Layout: carbinol carbon ca in the middle, the two methyls on the left, the
 * ethyl to the right with hb pointing up, the OH lower right.
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
import type { TrainerSequence } from "./sequences";

/* ---------------- the shared carbon skeleton ---------------- */

/**
 * ca is C2 (the carbinol carbon), cm1 is C1, cm2 the methyl on C2, cb is C3
 * (one implicit H plus the explicit hb) and cc is C4. `cation` puts the + on
 * ca; `alkene` makes ca=cb double and drops hb.
 */
function skeleton(shape: "sp3" | "cation" | "alkene") {
  const atoms = [
    createAtom({ id: "ca", element: "C", formalCharge: shape === "cation" ? 1 : 0 }),
    createAtom({ id: "cm1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cm2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cb", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "cc", element: "C", implicitHydrogens: 3 }),
    ...(shape === "alkene" ? [] : [createAtom({ id: "hb", element: "H" })]),
  ];
  const bonds = [
    createBond({ id: "b-a1", a: "ca", b: "cm1" }),
    createBond({ id: "b-a2", a: "ca", b: "cm2" }),
    createBond({ id: "b-ab", a: "ca", b: "cb", order: shape === "alkene" ? 2 : 1 }),
    createBond({ id: "b-bc", a: "cb", b: "cc" }),
    ...(shape === "alkene" ? [] : [createBond({ id: "b-bhb", a: "cb", b: "hb" })]),
  ];
  return { atoms, bonds };
}

const SKELETON_HINTS: LayoutHints = {
  ca: { x: 0.0, y: 0.0 },
  cm1: { x: -0.87, y: 0.5 },
  cm2: { x: -0.5, y: -0.87 },
  cb: { x: 0.87, y: 0.5 },
  cc: { x: 1.74, y: 0.0 },
  hb: { x: 0.87, y: 1.5 },
};
/** The alkene has no hb; layoutState is all or nothing, so the hint is dropped too. */
const ALKENE_HINTS: LayoutHints = Object.fromEntries(Object.entries(SKELETON_HINTS).filter(([id]) => id !== "hb"));

/* ---------------- species ---------------- */

const sp3 = skeleton("sp3");
const cat = skeleton("cation");
const ene = skeleton("alkene");

const alcohol = createSpecies({
  id: "sp-dh-alcohol",
  atoms: [...sp3.atoms, createAtom({ id: "o1", element: "O", lonePairs: 2 }), createAtom({ id: "h1", element: "H" })],
  bonds: [...sp3.bonds, createBond({ id: "b-ao", a: "ca", b: "o1" }), createBond({ id: "b-oh1", a: "o1", b: "h1" })],
});

const hydronium = createSpecies({
  id: "sp-dh-h3o",
  atoms: [
    createAtom({ id: "ox", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "hx1", element: "H" }),
    createAtom({ id: "hx2", element: "H" }),
    createAtom({ id: "hx3", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-ox1", a: "ox", b: "hx1" }),
    createBond({ id: "b-ox2", a: "ox", b: "hx2" }),
    createBond({ id: "b-ox3", a: "ox", b: "hx3" }),
  ],
});

const waterFromAcid = createSpecies({
  id: "sp-dh-h3o-water",
  atoms: [
    createAtom({ id: "ox", element: "O", lonePairs: 2 }),
    createAtom({ id: "hx1", element: "H" }),
    createAtom({ id: "hx2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-ox1", a: "ox", b: "hx1" }), createBond({ id: "b-ox2", a: "ox", b: "hx2" })],
});

const oxonium = createSpecies({
  id: "sp-dh-oxonium",
  atoms: [
    ...sp3.atoms,
    createAtom({ id: "o1", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "hx3", element: "H" }),
  ],
  bonds: [
    ...sp3.bonds,
    createBond({ id: "b-ao", a: "ca", b: "o1" }),
    createBond({ id: "b-oh1", a: "o1", b: "h1" }),
    createBond({ id: "b-ohx3", a: "o1", b: "hx3" }),
  ],
});

const cation = createSpecies({ id: "sp-dh-cation", atoms: cat.atoms, bonds: cat.bonds });

/** The water that leaves: the alcohol's own O and H plus the acid's proton. */
const waterLeft = createSpecies({
  id: "sp-dh-water-left",
  atoms: [
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "hx3", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh1", a: "o1", b: "h1" }), createBond({ id: "b-ohx3", a: "o1", b: "hx3" })],
});

const alkene = createSpecies({ id: "sp-dh-alkene", atoms: ene.atoms, bonds: ene.bonds });

const hydroniumOut = createSpecies({
  id: "sp-dh-h3o-out",
  atoms: [
    createAtom({ id: "o1", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "hx3", element: "H" }),
    createAtom({ id: "hb", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-oh1", a: "o1", b: "h1" }),
    createBond({ id: "b-ohx3", a: "o1", b: "hx3" }),
    createBond({ id: "b-ohb", a: "o1", b: "hb" }),
  ],
});

/* ---------------- the three steps ---------------- */

const PROTONATE: MechanismStep = createStep({
  id: "dh-protonate",
  from: createState({
    id: "dh1-before",
    members: [
      { species: alcohol, role: "substrate" },
      { species: hydronium, role: "acid" },
    ],
  }),
  to: createState({
    id: "dh1-after",
    members: [
      { species: oxonium, role: "intermediate" },
      { species: waterFromAcid, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["hx3"] },
  arrows: [
    createArrow({ id: "a-o-takes-h", source: fromLonePair("o1"), sink: toBondBetween("o1", "hx3") }),
    createArrow({ id: "a-oh-to-o", source: fromBond("b-ox3"), sink: toAtom("ox") }),
  ],
});

const IONISE: MechanismStep = createStep({
  id: "dh-ionise",
  from: createState({ id: "dh2-before", members: [{ species: oxonium, role: "intermediate" }] }),
  to: createState({
    id: "dh2-after",
    members: [
      { species: cation, role: "intermediate" },
      { species: waterLeft, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "e1", reactionCenters: ["ca"] },
  arrows: [createArrow({ id: "a-water-leaves", source: fromBond("b-ao"), sink: toAtom("o1") })],
});

const LOSE_PROTON: MechanismStep = createStep({
  id: "dh-lose-proton",
  from: createState({
    id: "dh3-before",
    members: [
      { species: cation, role: "intermediate" },
      { species: waterLeft, role: "base" },
    ],
  }),
  to: createState({
    id: "dh3-after",
    members: [
      { species: alkene, role: "product" },
      { species: hydroniumOut, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "e1", reactionCenters: ["hb", "ca"] },
  arrows: [
    createArrow({ id: "a-take-hb", source: fromLonePair("o1"), sink: toBondBetween("o1", "hb") }),
    createArrow({ id: "a-fold-pi", source: fromBond("b-bhb"), sink: toBondBetween("ca", "cb") }),
  ],
});

/* ---------------- hints ---------------- */

const OXONIUM_HINTS: LayoutHints = {
  ...SKELETON_HINTS,
  o1: { x: 0.87, y: -0.5 },
  h1: { x: 0.55, y: -1.35 },
  hx3: { x: 1.5, y: -1.0 },
};

const PROTONATE_FROM: LayoutHints = {
  ...SKELETON_HINTS,
  o1: { x: 0.87, y: -0.5 },
  h1: { x: 0.55, y: -1.35 },
  hx3: { x: 1.6, y: -1.05 },
  ox: { x: 2.45, y: -1.45 },
  hx1: { x: 3.2, y: -1.0 },
  hx2: { x: 2.7, y: -2.3 },
};
const PROTONATE_TO: LayoutHints = {
  ...OXONIUM_HINTS,
  ox: { x: 2.7, y: -1.6 },
  hx1: { x: 3.45, y: -1.15 },
  hx2: { x: 2.9, y: -2.45 },
};
const IONISE_TO: LayoutHints = {
  ...SKELETON_HINTS,
  o1: { x: 1.1, y: -1.3 },
  h1: { x: 0.7, y: -2.1 },
  hx3: { x: 1.95, y: -1.6 },
};
const LOSE_PROTON_FROM: LayoutHints = {
  ...SKELETON_HINTS,
  o1: { x: 1.55, y: 2.0 },
  h1: { x: 2.4, y: 2.3 },
  hx3: { x: 1.95, y: 1.25 },
};
const LOSE_PROTON_TO: LayoutHints = {
  ...ALKENE_HINTS,
  o1: { x: 1.7, y: 2.05 },
  hb: { x: 0.95, y: 1.8 },
  h1: { x: 2.5, y: 2.4 },
  hx3: { x: 2.1, y: 1.25 },
};

/* ---------------- the sequence ---------------- */

export const ACID_DEHYDRATION_SEQUENCE: TrainerSequence = {
  id: "seq-acid-dehydration",
  title: "2-Methylbutan-2-ol, H2SO4 and heat · 3 steps",
  brief: "Hot acid turns an alcohol into an alkene: protonate the OH, let water leave, then lose a proton.",
  successLine: "E1 whole: the OH only leaves once it is water, the tertiary cation is flat, and water takes the CH2 hydrogen so the C=C carries three carbons. 2-Methylbut-2-ene is the major alkene (Zaitsev); taking a CH3 hydrogen instead gives the minor 2-methylbut-1-ene.",
  steps: [
    {
      step: PROTONATE,
      stepBrief: "Step 1 · The alcohol oxygen takes a proton from hydronium; the O-H electrons stay on that oxygen.",
      wonLine: "Oxygen holds the proton.",
      hint: "Hydroxide is a poor leaving group. Make it water first.",
      fromHints: PROTONATE_FROM,
      toHints: PROTONATE_TO,
    },
    {
      step: IONISE,
      stepBrief: "Step 2 · Send the C-O electrons onto oxygen. Water leaves and the tertiary cation is left behind.",
      wonLine: "Water left; the cation is here.",
      hint: "Tertiary: the cation forms on its own.",
      fromHints: OXONIUM_HINTS,
      toHints: IONISE_TO,
    },
    {
      step: LOSE_PROTON,
      stepBrief: "Step 3 · Water takes the CH2 hydrogen and the C-H electrons become the C=C. Zaitsev: the more substituted alkene.",
      hint: "Heat, and the water that just left is still in the flask.",
      fromHints: LOSE_PROTON_FROM,
      toHints: LOSE_PROTON_TO,
    },
  ],
};
