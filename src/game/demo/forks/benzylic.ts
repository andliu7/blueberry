/**
 * The tertiary benzylic cation, two exits. Source of truth: the course key
 * "Alcohol SN1SN2E1E2_Review KEY.pdf", Q1 and Q3.
 *
 *   Q1  2-phenylbutan-2-ol, H2SO4, heat        ->  (E)-2-phenylbut-2-ene
 *   Q3  2-phenylbutan-2-ol, 1) HCl 2) CH3COOH  ->  the racemic tertiary benzylic acetate
 *
 * Both start the same way: the OH is protonated, water leaves, and the flat
 * cation sits there. What the key states is the two products and the
 * conditions; the mechanism is what the trainer supplies, so every choice the
 * key does not make is called out in a comment below.
 *
 * What the key states versus what is inferred here:
 *   - Q1's product is the trisubstituted (E) alkene, so the proton lost is the
 *     one on the ethyl CH2 (Zaitsev), not one on the methyl. Key states this
 *     by drawing the product.
 *   - Q1 is silent on which base takes the proton. Textbook answer: water (or
 *     HSO4-) is the only base in the flask; water is used here, the water that
 *     just left, so the student sees the conjugate base of the acid do the job.
 *   - Q1's acid is H2SO4. Modelled as hydronium H3O+, the same reagent the
 *     alkoxide protonation in sequences.ts uses: strong acid in a wet alcohol
 *     protonates through H3O+ and drawing H-OSO3H would add six atoms of
 *     spectator. Said here so nobody reads the hydronium as a claim.
 *   - Q3's key product is the acetate after step 2) CH3COOH. This file covers
 *     step 1) HCl only: capture of the cation by chloride to the racemic
 *     tertiary benzylic chloride. The second SN1 (acetic acid solvolysis of
 *     that chloride) is not authored here.
 *   - Q3 is silent on the losing arm. The losing route is E1 with chloride as
 *     the base, the only other partner in the state; it is the textbook loser
 *     because chloride is a poor base and there is no heat.
 *
 * The beta hydrogen on the ethyl CH2 is EXPLICIT in every species, from the
 * alcohol onward, because it is the atom the base takes at the fork and atom
 * ids must survive every step; the other ring and chain hydrogens are implicit.
 * The phenyl is an honest six carbon Kekule ring, as in the EAS sequences.
 *
 * Layout: ring upper left, methyl lower left, ethyl to the right with its
 * beta hydrogen pointing up, so the alkene product reads as (E): phenyl and
 * the ethyl's CH3 land on opposite sides of the new C=C.
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
import type { LayoutHints } from "../../render/layout/layout";
import type { StepFork } from "../../tabs/trainer/engine/question";
import type { TrainerSequence } from "../sequences";

/* ---------------- the shared carbon skeleton ---------------- */

/**
 * Phenyl ring (c1 ipso, c2..c6 with one implicit H each), the carbinol carbon
 * ca, its methyl cm, and the ethyl cb (one implicit H plus the explicit hb) and cc.
 * `cation` puts the + on ca; `alkene` makes ca=cb double and drops hb.
 */
function skeleton(shape: "sp3" | "cation" | "alkene") {
  const atoms = [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "ca", element: "C", formalCharge: shape === "cation" ? 1 : 0 }),
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cb", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "cc", element: "C", implicitHydrogens: 3 }),
    ...(shape === "alkene" ? [] : [createAtom({ id: "hb", element: "H" })]),
  ];
  const bonds = [
    createBond({ id: "b12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-1a", a: "c1", b: "ca" }),
    createBond({ id: "b-am", a: "ca", b: "cm" }),
    createBond({ id: "b-ab", a: "ca", b: "cb", order: shape === "alkene" ? 2 : 1 }),
    createBond({ id: "b-bc", a: "cb", b: "cc" }),
    ...(shape === "alkene" ? [] : [createBond({ id: "b-bhb", a: "cb", b: "hb" })]),
  ];
  return { atoms, bonds };
}

const SKELETON_HINTS: LayoutHints = {
  ca: { x: 0.0, y: 0.0 },
  c1: { x: -0.87, y: 0.5 },
  c2: { x: -0.87, y: 1.5 },
  c3: { x: -1.74, y: 2.0 },
  c4: { x: -2.61, y: 1.5 },
  c5: { x: -2.61, y: 0.5 },
  c6: { x: -1.74, y: 0.0 },
  cm: { x: -0.5, y: -0.87 },
  cb: { x: 0.87, y: 0.5 },
  cc: { x: 1.74, y: 0.0 },
  hb: { x: 0.87, y: 1.5 },
};
/** The alkene has no hb; layoutState is all or nothing, so the hint is dropped too. */
const ALKENE_HINTS: LayoutHints = Object.fromEntries(
  Object.entries(SKELETON_HINTS).filter(([id]) => id !== "hb"),
);

/* ---------------- species ---------------- */

const sp3 = skeleton("sp3");
const cat = skeleton("cation");
const ene = skeleton("alkene");

const bzAlcohol = createSpecies({
  id: "sp-bz-alcohol",
  atoms: [...sp3.atoms, createAtom({ id: "o1", element: "O", lonePairs: 2 }), createAtom({ id: "h1", element: "H" })],
  bonds: [...sp3.bonds, createBond({ id: "b-ao", a: "ca", b: "o1" }), createBond({ id: "b-oh1", a: "o1", b: "h1" })],
});

const bzCation = createSpecies({ id: "sp-bz-cation", atoms: cat.atoms, bonds: cat.bonds });

const bzAlkene = createSpecies({ id: "sp-bz-alkene", atoms: ene.atoms, bonds: ene.bonds });

/** R-OH2+ where the second proton came from `hAcid` (hx3 from hydronium, hc from HCl). */
function bzOxonium(id: string, hAcid: string) {
  return createSpecies({
    id,
    atoms: [
      ...sp3.atoms,
      createAtom({ id: "o1", element: "O", formalCharge: 1, lonePairs: 1 }),
      createAtom({ id: "h1", element: "H" }),
      createAtom({ id: hAcid, element: "H" }),
    ],
    bonds: [
      ...sp3.bonds,
      createBond({ id: "b-ao", a: "ca", b: "o1" }),
      createBond({ id: "b-oh1", a: "o1", b: "h1" }),
      createBond({ id: `b-o${hAcid}`, a: "o1", b: hAcid }),
    ],
  });
}

/** The water that leaves: the alcohol's own O and H plus the acid's proton. */
function waterLeft(id: string, hAcid: string) {
  return createSpecies({
    id,
    atoms: [
      createAtom({ id: "o1", element: "O", lonePairs: 2 }),
      createAtom({ id: "h1", element: "H" }),
      createAtom({ id: hAcid, element: "H" }),
    ],
    bonds: [createBond({ id: "b-oh1", a: "o1", b: "h1" }), createBond({ id: `b-o${hAcid}`, a: "o1", b: hAcid })],
  });
}

/* ================= seq-benzylic-dehydration: H2SO4, heat ================= */

const hydroniumAcid = createSpecies({
  id: "sp-bz-h3o",
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
  id: "sp-bz-h3o-water",
  atoms: [
    createAtom({ id: "ox", element: "O", lonePairs: 2 }),
    createAtom({ id: "hx1", element: "H" }),
    createAtom({ id: "hx2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-ox1", a: "ox", b: "hx1" }), createBond({ id: "b-ox2", a: "ox", b: "hx2" })],
});

const bzOxoniumH3O = bzOxonium("sp-bz-oxonium-h3o", "hx3");
const waterLeftH3O = waterLeft("sp-bz-water-h3o", "hx3");

const DEHYDRATION_PROTONATE: MechanismStep = createStep({
  id: "bz-dehydration-protonate",
  from: createState({
    id: "bzd1-before",
    members: [
      { species: bzAlcohol, role: "substrate" },
      { species: hydroniumAcid, role: "acid" },
    ],
  }),
  to: createState({
    id: "bzd1-after",
    members: [
      { species: bzOxoniumH3O, role: "intermediate" },
      { species: waterFromAcid, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["hx3"] },
  arrows: [
    createArrow({ id: "a-o-takes-h", source: fromLonePair("o1"), sink: toBondBetween("o1", "hx3") }),
    createArrow({ id: "a-oh-to-o", source: fromBond("b-ox3"), sink: toAtom("ox") }),
  ],
});

const DEHYDRATION_IONISE: MechanismStep = createStep({
  id: "bz-dehydration-ionise",
  from: createState({ id: "bzd2-before", members: [{ species: bzOxoniumH3O, role: "intermediate" }] }),
  to: createState({
    id: "bzd2-after",
    members: [
      { species: bzCation, role: "intermediate" },
      { species: waterLeftH3O, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "e1", reactionCenters: ["ca"] },
  arrows: [createArrow({ id: "a-water-leaves", source: fromBond("b-ao"), sink: toAtom("o1") })],
});

/* Favoured exit under heat: water takes the beta hydrogen on the ethyl CH2
   and the C-H electrons fold into the C=C. Zaitsev: the trisubstituted
   alkene, the key's (E)-2-phenylbut-2-ene. The key does not name the base;
   water is the textbook choice (see the header). */
const hydroniumOut = createSpecies({
  id: "sp-bz-h3o-out",
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

const DEHYDRATION_E1: MechanismStep = createStep({
  id: "bz-dehydration-e1",
  from: createState({
    id: "bzd3-before",
    members: [
      { species: bzCation, role: "intermediate" },
      { species: waterLeftH3O, role: "base" },
    ],
  }),
  to: createState({
    id: "bzd3-after",
    members: [
      { species: bzAlkene, role: "product" },
      { species: hydroniumOut, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "e1", reactionCenters: ["hb", "ca"] },
  arrows: [
    createArrow({ id: "a-take-hb", source: fromLonePair("o1"), sink: toBondBetween("o1", "hb") }),
    createArrow({ id: "a-fold-pi", source: fromBond("b-bhb"), sink: toBondBetween("ca", "cb") }),
  ],
});

/* The other exit: water re-adds to the cation. Real, reversible, and under
   heat it only reforms the protonated alcohol, which ionises again; the
   alkene is what you isolate. */
const DEHYDRATION_RECAPTURE: MechanismStep = createStep({
  id: "bz-dehydration-recapture",
  from: createState({
    id: "bzd3alt-before",
    members: [
      { species: bzCation, role: "intermediate" },
      { species: waterLeftH3O, role: "nucleophile" },
    ],
  }),
  to: createState({ id: "bzd3alt-after", members: [{ species: bzOxoniumH3O, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "sn1", reactionCenters: ["ca"] },
  arrows: [createArrow({ id: "a-recapture", source: fromLonePair("o1"), sink: toBondBetween("o1", "ca") })],
});

/* Hints. The OH sits lower right of ca and the acid comes in from that side;
   the leaving water drifts down and right; the base for E1 sits above hb. */
const OXONIUM_H3O_HINTS: LayoutHints = {
  ...SKELETON_HINTS,
  o1: { x: 0.87, y: -0.5 },
  h1: { x: 0.55, y: -1.35 },
  hx3: { x: 1.5, y: -1.0 },
};
const WATER_LEFT_H3O_HINTS: LayoutHints = {
  o1: { x: 1.1, y: -1.3 },
  h1: { x: 0.7, y: -2.1 },
  hx3: { x: 1.95, y: -1.6 },
};

const DEHYDRATION_PROTONATE_FROM: LayoutHints = {
  ...SKELETON_HINTS,
  o1: { x: 0.87, y: -0.5 },
  h1: { x: 0.55, y: -1.35 },
  hx3: { x: 1.6, y: -1.05 },
  ox: { x: 2.45, y: -1.45 },
  hx1: { x: 3.2, y: -1.0 },
  hx2: { x: 2.7, y: -2.3 },
};
const DEHYDRATION_PROTONATE_TO: LayoutHints = {
  ...OXONIUM_H3O_HINTS,
  ox: { x: 2.7, y: -1.6 },
  hx1: { x: 3.45, y: -1.15 },
  hx2: { x: 2.9, y: -2.45 },
};
const DEHYDRATION_IONISE_FROM: LayoutHints = OXONIUM_H3O_HINTS;
const DEHYDRATION_IONISE_TO: LayoutHints = { ...SKELETON_HINTS, ...WATER_LEFT_H3O_HINTS };

const DEHYDRATION_E1_FROM: LayoutHints = {
  ...SKELETON_HINTS,
  o1: { x: 1.55, y: 2.0 },
  h1: { x: 2.4, y: 2.3 },
  hx3: { x: 1.95, y: 1.25 },
};
const DEHYDRATION_E1_TO: LayoutHints = {
  ...ALKENE_HINTS,
  o1: { x: 1.7, y: 2.05 },
  hb: { x: 0.95, y: 1.8 },
  h1: { x: 2.5, y: 2.4 },
  hx3: { x: 2.1, y: 1.25 },
};
const DEHYDRATION_RECAPTURE_FROM: LayoutHints = DEHYDRATION_IONISE_TO;
const DEHYDRATION_RECAPTURE_TO: LayoutHints = OXONIUM_H3O_HINTS;

const DEHYDRATION_FORK: StepFork = {
  prompt: "Step 3 · The benzylic cation has two ways out. Which one does hot sulfuric acid take?",
  conditions: "H2SO4, heat",
  routes: [
    {
      id: "route-e1",
      label: "Lose a proton, E1",
      route: "e1",
      step: DEHYDRATION_E1,
      fromHints: DEHYDRATION_E1_FROM,
      toHints: DEHYDRATION_E1_TO,
      favoured: true,
      why: "Heat and a non-nucleophilic acid: the bases present are weak ones, water or HSO4-; water takes the CH2 hydrogen, and the trisubstituted alkene is the Zaitsev product the key draws.",
    },
    {
      id: "route-recapture",
      label: "Capture by water",
      route: "sn1",
      step: DEHYDRATION_RECAPTURE,
      fromHints: DEHYDRATION_RECAPTURE_FROM,
      toHints: DEHYDRATION_RECAPTURE_TO,
      favoured: false,
      cause: "substitution_not_favoured_under_conditions",
      why: "Water does re-add, but that only reforms the protonated alcohol, which ionises again under heat. Substitution here is a loop; elimination is the exit.",
    },
  ],
};

/* ================= seq-benzylic-hcl: HCl, 0 to 25 C ================= */

const hcl = createSpecies({
  id: "sp-bz-hcl",
  atoms: [createAtom({ id: "hc", element: "H" }), createAtom({ id: "cl1", element: "Cl", lonePairs: 3 })],
  bonds: [createBond({ id: "b-hcl", a: "hc", b: "cl1" })],
});

const chloride = createSpecies({
  id: "sp-bz-chloride",
  atoms: [createAtom({ id: "cl1", element: "Cl", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const bzOxoniumHCl = bzOxonium("sp-bz-oxonium-hcl", "hc");
const waterLeftHCl = waterLeft("sp-bz-water-hcl", "hc");

const HCL_PROTONATE: MechanismStep = createStep({
  id: "bz-hcl-protonate",
  from: createState({
    id: "bzh1-before",
    members: [
      { species: bzAlcohol, role: "substrate" },
      { species: hcl, role: "acid" },
    ],
  }),
  to: createState({
    id: "bzh1-after",
    members: [
      { species: bzOxoniumHCl, role: "intermediate" },
      { species: chloride, role: "counterion" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["hc"] },
  arrows: [
    createArrow({ id: "a-o-takes-hc", source: fromLonePair("o1"), sink: toBondBetween("o1", "hc") }),
    createArrow({ id: "a-hcl-to-cl", source: fromBond("b-hcl"), sink: toAtom("cl1") }),
  ],
});

const HCL_IONISE: MechanismStep = createStep({
  id: "bz-hcl-ionise",
  from: createState({ id: "bzh2-before", members: [{ species: bzOxoniumHCl, role: "intermediate" }] }),
  to: createState({
    id: "bzh2-after",
    members: [
      { species: bzCation, role: "intermediate" },
      { species: waterLeftHCl, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "sn1", reactionCenters: ["ca"] },
  arrows: [createArrow({ id: "a-water-leaves-hcl", source: fromBond("b-ao"), sink: toAtom("o1") })],
});

/* Favoured exit in cold HCl: chloride takes the empty carbon. The cation is
   flat, so the chloride is racemic (the key draws Q3's product with no
   stereochemistry); the key's acetate comes from a second SN1 in CH3COOH
   that this sequence does not reach. */
const bzChloride = createSpecies({
  id: "sp-bz-alkyl-chloride",
  atoms: [...sp3.atoms, createAtom({ id: "cl1", element: "Cl", lonePairs: 3 })],
  bonds: [...sp3.bonds, createBond({ id: "b-acl", a: "ca", b: "cl1" })],
});

const HCL_CAPTURE: MechanismStep = createStep({
  id: "bz-hcl-capture",
  from: createState({
    id: "bzh3-before",
    members: [
      { species: bzCation, role: "intermediate" },
      { species: chloride, role: "nucleophile" },
    ],
  }),
  to: createState({ id: "bzh3-after", members: [{ species: bzChloride, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "sn1", reactionCenters: ["ca"] },
  arrows: [createArrow({ id: "a-cl-captures", source: fromLonePair("cl1"), sink: toBondBetween("cl1", "ca") })],
});

/* The losing arm: chloride acts as a base and takes hb. The key is silent on
   this; chloride is the only other partner in the state and a poor base, and
   there is no heat, so capture wins. */
const hclOut = createSpecies({
  id: "sp-bz-hcl-out",
  atoms: [createAtom({ id: "hb", element: "H" }), createAtom({ id: "cl1", element: "Cl", lonePairs: 3 })],
  bonds: [createBond({ id: "b-hbcl", a: "hb", b: "cl1" })],
});

const HCL_E1: MechanismStep = createStep({
  id: "bz-hcl-e1",
  from: createState({
    id: "bzh3alt-before",
    members: [
      { species: bzCation, role: "intermediate" },
      { species: chloride, role: "base" },
    ],
  }),
  to: createState({
    id: "bzh3alt-after",
    members: [
      { species: bzAlkene, role: "product" },
      { species: hclOut, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "e1", reactionCenters: ["hb", "ca"] },
  arrows: [
    createArrow({ id: "a-cl-takes-hb", source: fromLonePair("cl1"), sink: toBondBetween("cl1", "hb") }),
    createArrow({ id: "a-fold-pi-hcl", source: fromBond("b-bhb"), sink: toBondBetween("ca", "cb") }),
  ],
});

const OXONIUM_HCL_HINTS: LayoutHints = {
  ...SKELETON_HINTS,
  o1: { x: 0.87, y: -0.5 },
  h1: { x: 0.55, y: -1.35 },
  hc: { x: 1.5, y: -1.0 },
};

const HCL_PROTONATE_FROM: LayoutHints = {
  ...SKELETON_HINTS,
  o1: { x: 0.87, y: -0.5 },
  h1: { x: 0.55, y: -1.35 },
  hc: { x: 1.6, y: -1.05 },
  cl1: { x: 2.45, y: -1.45 },
};
const HCL_PROTONATE_TO: LayoutHints = { ...OXONIUM_HCL_HINTS, cl1: { x: 2.9, y: -1.7 } };
const HCL_IONISE_FROM: LayoutHints = OXONIUM_HCL_HINTS;
const HCL_IONISE_TO: LayoutHints = {
  ...SKELETON_HINTS,
  o1: { x: 1.1, y: -1.3 },
  h1: { x: 0.7, y: -2.1 },
  hc: { x: 1.95, y: -1.6 },
};
const HCL_CAPTURE_FROM: LayoutHints = { ...SKELETON_HINTS, cl1: { x: 1.3, y: -1.35 } };
const HCL_CAPTURE_TO: LayoutHints = { ...SKELETON_HINTS, cl1: { x: 0.87, y: -0.5 } };
const HCL_E1_FROM: LayoutHints = { ...SKELETON_HINTS, cl1: { x: 1.6, y: 2.05 } };
const HCL_E1_TO: LayoutHints = { ...ALKENE_HINTS, cl1: { x: 1.85, y: 2.1 }, hb: { x: 1.0, y: 1.8 } };

const HCL_FORK: StepFork = {
  prompt: "Step 3 · The same benzylic cation, two ways out. Which one does cold HCl take?",
  conditions: "HCl, 0 to 25 °C",
  routes: [
    {
      id: "route-capture-cl",
      label: "Capture by chloride",
      route: "sn1",
      step: HCL_CAPTURE,
      fromHints: HCL_CAPTURE_FROM,
      toHints: HCL_CAPTURE_TO,
      favoured: true,
      why: "Cold, and a good nucleophile sitting right there: chloride reaches the flat cation from either face, so the alkyl chloride is racemic.",
    },
    {
      id: "route-e1-cl",
      label: "Lose a proton, E1",
      route: "e1",
      step: HCL_E1,
      fromHints: HCL_E1_FROM,
      toHints: HCL_E1_TO,
      favoured: false,
      cause: "elimination_not_favoured_under_conditions",
      why: "Chloride is a poor base and there is no heat to drive the alkene out. Cold HCl captures the cation instead.",
    },
  ],
};

/* ================= the two sequences ================= */

export const BENZYLIC_SEQUENCES: readonly TrainerSequence[] = [
  {
    id: "seq-benzylic-dehydration",
    title: "2-Phenylbutan-2-ol, H2SO4 and heat · 3 steps",
    brief: "Protonate the OH, lose water, then decide what the cation does under heat and acid.",
    successLine: "E1 whole: the OH leaves only once it is water, the tertiary benzylic cation is flat and stable, and water takes the CH2 hydrogen to give the trisubstituted (E) alkene. Same cation as the HCl problem, other exit.",
    steps: [
      {
        step: DEHYDRATION_PROTONATE,
        stepBrief: "Step 1 · The alcohol oxygen takes a proton from hydronium; the O-H electrons stay on that oxygen.",
        wonLine: "Oxygen holds the proton.",
        hint: "Hydroxide is a poor leaving group. Make it water first.",
        fromHints: DEHYDRATION_PROTONATE_FROM,
        toHints: DEHYDRATION_PROTONATE_TO,
      },
      {
        step: DEHYDRATION_IONISE,
        stepBrief: "Step 2 · Send the C-O electrons onto oxygen. Water leaves and the benzylic cation is left behind.",
        wonLine: "Water left; the cation is here.",
        hint: "Tertiary and benzylic: the cation is happy to form on its own.",
        fromHints: DEHYDRATION_IONISE_FROM,
        toHints: DEHYDRATION_IONISE_TO,
      },
      {
        step: DEHYDRATION_E1,
        stepBrief: "Step 3 · Water takes the CH2 hydrogen and the C-H electrons become the C=C. Zaitsev.",
        hint: "Heat, and the water that just left is still in the flask.",
        fromHints: DEHYDRATION_E1_FROM,
        toHints: DEHYDRATION_E1_TO,
        fork: DEHYDRATION_FORK,
      },
    ],
  },
  {
    id: "seq-benzylic-hcl",
    title: "2-Phenylbutan-2-ol in cold HCl · 3 steps",
    brief: "Protonate the OH with HCl, lose water, then decide what the cation does in the cold.",
    successLine: "SN1 whole: HCl turns the OH into water, water leaves, and chloride lands on the flat cation from either face, so the alkyl chloride is racemic. The key's acetate is one more SN1 away, in acetic acid.",
    steps: [
      {
        step: HCL_PROTONATE,
        stepBrief: "Step 1 · The alcohol oxygen takes the proton from HCl; the H-Cl electrons become chloride.",
        wonLine: "Oxygen holds the proton.",
        hint: "Hydroxide is a poor leaving group. Make it water first.",
        fromHints: HCL_PROTONATE_FROM,
        toHints: HCL_PROTONATE_TO,
      },
      {
        step: HCL_IONISE,
        stepBrief: "Step 2 · Send the C-O electrons onto oxygen. Water leaves and the benzylic cation is left behind.",
        wonLine: "Water left; the cation is here.",
        hint: "Tertiary and benzylic: the cation is happy to form on its own.",
        fromHints: HCL_IONISE_FROM,
        toHints: HCL_IONISE_TO,
      },
      {
        step: HCL_CAPTURE,
        stepBrief: "Step 3 · Chloride's lone pair takes the empty carbon.",
        hint: "Cold, with chloride and water in the flask.",
        fromHints: HCL_CAPTURE_FROM,
        toHints: HCL_CAPTURE_TO,
        fork: HCL_FORK,
      },
    ],
  },
];
