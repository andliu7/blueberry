/**
 * The resonance hunt. Owner direction, 2026-08-26: "include resonance
 * structures as well, like a 'you found a resonance structure' game mode. I
 * think that's where I want the arrows to go."
 *
 * Each entry is a real MechanismStep whose from and to states are two
 * contributing structures of ONE species: no sigma bond forms or breaks, no
 * atom moves, only pi bonds, lone pairs and formal charge relocate. The
 * route is chem-core's own "resonance", added for exactly this mode, so the
 * data never mislabels delocalisation as a reaction.
 *
 * Allyl cation is Unit 1's opening spine node in the pathway map ("draw and
 * rank allyl cation resonance forms"); acetate is the anion every pKa
 * argument in Unit 8 leans on. Both directions of the allyl pair are
 * entries, because finding B from A and A from B are different pushes.
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

export interface ResonanceEntry {
  readonly id: string;
  readonly title: string;
  readonly brief: string;
  /** The celebration line: this mode's success is a FIND. */
  readonly foundLine: string;
  /** The engine screen's line above the canvas, the task in the imperative. The brief when absent. */
  readonly prompt?: string;
  /** The engine screen's pill under the canvas: one nudge toward the first move. Title when absent. */
  readonly hint?: string;
  readonly step: MechanismStep;
  readonly fromHints: LayoutHints;
  readonly toHints: LayoutHints;
}

/* ---------------- allyl cation, form A <-> form B ---------------- */

const allylA = createSpecies({
  id: "sp-allyl-a",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 2, formalCharge: 1 }),
  ],
  bonds: [createBond({ id: "b12", a: "c1", b: "c2", order: 2 }), createBond({ id: "b23", a: "c2", b: "c3" })],
});

const allylB = createSpecies({
  id: "sp-allyl-b",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2, formalCharge: 1 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [createBond({ id: "b12", a: "c1", b: "c2" }), createBond({ id: "b23", a: "c2", b: "c3", order: 2 })],
});

const ALLYL_HINTS: LayoutHints = {
  c1: { x: -1.0, y: 0 },
  c2: { x: 0, y: 0.4 },
  c3: { x: 1.0, y: 0 },
};

const ALLYL_A_TO_B: MechanismStep = createStep({
  id: "res-allyl-a-to-b",
  from: createState({ id: "allyl-a", members: [{ species: allylA, role: "substrate" }] }),
  to: createState({ id: "allyl-b", members: [{ species: allylB, role: "product" }] }),
  identity: { elementaryStep: "electron_delocalisation", route: "resonance", reactionCenters: ["c1", "c3"] },
  arrows: [createArrow({ id: "a-shift", source: fromBond("b12"), sink: toBondBetween("c2", "c3") })],
});

const ALLYL_B_TO_A: MechanismStep = createStep({
  id: "res-allyl-b-to-a",
  from: createState({ id: "allyl-b2", members: [{ species: allylB, role: "substrate" }] }),
  to: createState({ id: "allyl-a2", members: [{ species: allylA, role: "product" }] }),
  identity: { elementaryStep: "electron_delocalisation", route: "resonance", reactionCenters: ["c1", "c3"] },
  arrows: [createArrow({ id: "a-shift-back", source: fromBond("b23"), sink: toBondBetween("c1", "c2") })],
});

/* ---------------- acetate anion, two arrows at once ---------------- */

const acetateA = createSpecies({
  id: "sp-acetate-a",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "o2", element: "O", lonePairs: 3, formalCharge: -1 }),
  ],
  bonds: [
    createBond({ id: "b-cc", a: "c1", b: "c2" }),
    createBond({ id: "b-co1", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-co2", a: "c2", b: "o2" }),
  ],
});

const acetateB = createSpecies({
  id: "sp-acetate-b",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 3, formalCharge: -1 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-cc", a: "c1", b: "c2" }),
    createBond({ id: "b-co1", a: "c2", b: "o1" }),
    createBond({ id: "b-co2", a: "c2", b: "o2", order: 2 }),
  ],
});

const ACETATE_HINTS: LayoutHints = {
  c1: { x: -1.2, y: -0.2 },
  c2: { x: 0, y: 0.2 },
  o1: { x: 0.4, y: 1.15 },
  o2: { x: 0.95, y: -0.5 },
};

const ACETATE_A_TO_B: MechanismStep = createStep({
  id: "res-acetate-a-to-b",
  from: createState({ id: "acetate-a", members: [{ species: acetateA, role: "substrate" }] }),
  to: createState({ id: "acetate-b", members: [{ species: acetateB, role: "product" }] }),
  identity: { elementaryStep: "electron_delocalisation", route: "resonance", reactionCenters: ["o1", "o2"] },
  arrows: [
    createArrow({ id: "a-lp-in", source: fromLonePair("o2"), sink: toBondBetween("c2", "o2") }),
    createArrow({ id: "a-pi-out", source: fromBond("b-co1"), sink: toAtom("o1") }),
  ],
});

/* ---------------- the Meisenheimer complex, ring carbon to nitro oxygen ---------------- */
/* The complex from 1-fluoro-4-nitrobenzene + methoxide, seq-snar's own
 * species (same atom ids). Form A holds the charge on the ring carbon that
 * carries NO2 (para to the attacked carbon); form B is seq-snar's
 * intermediate, the charge on oxygen. Both forms come out of
 * scripts/u4_pools.py's resonance walk (anion_forms) as
 * COC1(F)C=C[C-]([N+](=O)[O-])C=C1 and COC1(F)C=CC(=[N+]([O-])[O-])C=C1.
 * Unit 4's u4-meisenheimer plays it: one push, before seq-snar asks for all
 * eight arrows at the end of u4-lg-order (audit 23 Oct, top-25 #6). */

function meisenheimerForm(id: string, chargeOn: "ring" | "oxygen") {
  const ring = chargeOn === "ring";
  return createSpecies({
    id,
    atoms: [
      createAtom({ id: "c1", element: "C" }),
      createAtom({ id: "f1", element: "F", lonePairs: 3 }),
      createAtom({ id: "om", element: "O", lonePairs: 2 }),
      createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
      createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
      createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
      ring ? createAtom({ id: "c4", element: "C", formalCharge: -1, lonePairs: 1 }) : createAtom({ id: "c4", element: "C" }),
      createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
      createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
      createAtom({ id: "n1", element: "N", formalCharge: 1 }),
      createAtom({ id: "on1", element: "O", formalCharge: -1, lonePairs: 3 }),
      ring ? createAtom({ id: "on2", element: "O", lonePairs: 2 }) : createAtom({ id: "on2", element: "O", formalCharge: -1, lonePairs: 3 }),
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
      createBond({ id: "b-cn", a: "c4", b: "n1", order: ring ? 1 : 2 }),
      createBond({ id: "b-no1", a: "n1", b: "on1" }),
      createBond({ id: "b-no2", a: "n1", b: "on2", order: ring ? 2 : 1 }),
    ],
  });
}

/** seq-snar's intermediate layout, so the complex looks the same here as in the full mechanism. */
const MEISENHEIMER_HINTS: LayoutHints = {
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
};

const MEISENHEIMER_RING_TO_O: MechanismStep = createStep({
  id: "res-meisenheimer-ring-to-o",
  from: createState({ id: "meisenheimer-ring", members: [{ species: meisenheimerForm("sp-meisenheimer-ring", "ring"), role: "substrate" }] }),
  to: createState({ id: "meisenheimer-oxygen", members: [{ species: meisenheimerForm("sp-meisenheimer-oxygen", "oxygen"), role: "product" }] }),
  identity: { elementaryStep: "electron_delocalisation", route: "resonance", reactionCenters: ["c4", "on2"] },
  arrows: [
    createArrow({ id: "a-lp-to-cn", source: fromLonePair("c4"), sink: toBondBetween("c4", "n1") }),
    createArrow({ id: "a-no-off", source: fromBond("b-no2"), sink: toAtom("on2") }),
  ],
});

export const RESONANCE_HUNT: readonly ResonanceEntry[] = [
  {
    id: "res-allyl-1",
    title: "Allyl cation",
    brief: "Move only electrons. Find the other contributing structure.",
    foundLine: "The π bond slid over and the charge moved with it: same atoms, same skeleton, electrons delocalised.",
    prompt: "Find the allyl cation's other resonance structure.",
    hint: "Grab the π bond by a handle and send it toward the empty carbon.",
    step: ALLYL_A_TO_B,
    fromHints: ALLYL_HINTS,
    toHints: ALLYL_HINTS,
  },
  {
    id: "res-allyl-2",
    title: "Allyl cation, back",
    brief: "Now push it back the other way.",
    foundLine: "You found it again, and that is the point: neither structure is the molecule. The real allyl cation is both at once.",
    step: ALLYL_B_TO_A,
    fromHints: ALLYL_HINTS,
    toHints: ALLYL_HINTS,
  },
  {
    id: "res-acetate",
    title: "Acetate anion",
    brief: "Two arrows this time: a lone pair goes in as the π electrons step off.",
    foundLine: "The two C–O bonds are genuinely equivalent: the real acetate spreads its charge over both oxygens.",
    step: ACETATE_A_TO_B,
    fromHints: ACETATE_HINTS,
    toHints: ACETATE_HINTS,
  },
  {
    id: "res-meisenheimer",
    title: "Meisenheimer complex",
    brief: "Two arrows: the ring's lone pair goes in toward N as an N=O π bond steps off onto oxygen.",
    foundLine: "The charge left the ring for a nitro oxygen. That oxygen form is why a nitro group ortho or para to the halogen makes SNAr go.",
    prompt: "Push the ring's negative charge onto a nitro oxygen.",
    hint: "Start from the lone pair on the carbon that holds NO₂.",
    step: MEISENHEIMER_RING_TO_O,
    fromHints: MEISENHEIMER_HINTS,
    toHints: MEISENHEIMER_HINTS,
  },
];
