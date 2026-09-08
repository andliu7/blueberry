/**
 * The demo step: SN2 at bromomethane. Hydroxide attacks backside, bromide
 * leaves, one concerted step.
 *
 * Built through chem-core's real constructors, not hand-mocked JSON, so the
 * demo exercises the same validation every fixture passes and cannot drift
 * from the engine's data model. If chem-core tightens a rule this file fails
 * to build, which is the point.
 *
 * Layout hints are authored, not auto-placed, because THIS scene's composition
 * carries chemistry: the nucleophile must visibly approach from the side
 * opposite the leaving group, or the picture teaches frontside attack. The z
 * hints splay the three hydrogens out of plane so the 3D renderer has real
 * depth to show; the 2D renderer ignores z by design.
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

const hydroxide = createSpecies({
  id: "sp-hydroxide",
  atoms: [
    // The H is EXPLICIT, per the owner ruling of 2026-08-25 and per how the bar
    // draws hydroxide (IMG_1644: a real H sphere bonded to the O). Carbons keep
    // their hydrogens implicit and circling; an oxygen's one hydrogen is part
    // of the species' identity and gets a ball of its own.
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh", a: "o1", b: "h1" })],
});

const bromomethane = createSpecies({
  id: "sp-bromomethane",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "br1", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "b-cbr", a: "c1", b: "br1" })],
});

const methanol = createSpecies({
  id: "sp-methanol",
  atoms: [
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-oh", a: "o1", b: "h1" }), createBond({ id: "b-oc", a: "o1", b: "c1" })],
});

const bromide = createSpecies({
  id: "sp-bromide",
  atoms: [createAtom({ id: "br1", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const before = createState({
  id: "sn2-demo-before",
  members: [
    { species: hydroxide, role: "nucleophile" },
    { species: bromomethane, role: "substrate" },
  ],
});

const after = createState({
  id: "sn2-demo-after",
  members: [
    { species: methanol, role: "product" },
    { species: bromide, role: "leaving_group" },
  ],
});

export const SN2_DEMO_STEP: MechanismStep = createStep({
  id: "sn2-demo-step",
  from: before,
  to: after,
  identity: {
    elementaryStep: "concerted_substitution",
    route: "sn2",
    reactionCenters: ["c1"],
  },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") }),
    createArrow({ id: "a-leave", source: fromBond("b-cbr"), sink: toAtom("br1") }),
  ],
});

/** Backside geometry, authored. Scene units; one bond length is 1. */
export const SN2_FROM_HINTS: LayoutHints = {
  o1: { x: -1.9, y: 0 },
  // Up and away from the carbon, so the O-H bond never crowds the attack axis.
  h1: { x: -2.6, y: -0.72 },
  c1: { x: 0, y: 0, z: 0 },
  br1: { x: 1.05, y: 0 },
};

export const SN2_TO_HINTS: LayoutHints = {
  o1: { x: -1.05, y: 0 },
  h1: { x: -1.75, y: -0.72 },
  c1: { x: 0, y: 0 },
  br1: { x: 2.1, y: 0 },
};
