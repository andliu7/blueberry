/**
 * Grignard meets a carboxylic acid: the decision point is the first step.
 *
 * Source of truth, two keys that agree:
 *   "Carboxylic Acids_KEY.pdf" Q1: "Why can't you react CH3MgBr with
 *   pentanoic acid?" The key draws the acid (pKa 5) plus CH3MgBr giving the
 *   carboxylate plus CH4 (pKa 50), Keq = 10^45.
 *   "Exam 2_CHEM 241_Fall 2023_KEY.pdf" Q3: the same reaction with CH3Li on
 *   3-ethylbenzoic acid, drawn as :CH3(-) taking the O-H proton, 10^(50-5)
 *   = 10^45, carboxylate plus CH4. The tertiary alcohol the question shows is
 *   the product that does NOT form.
 *
 * The organometallic is modelled as a bare methyl carbanion, one lone pair,
 * formal charge -1, exactly as the exam key draws it. The Mg counterion is
 * omitted: it is a spectator to the electron flow and would only crowd the
 * canvas. Acetic acid stands in for pentanoic acid so the substrate fits the
 * scene; the acid's chain plays no part in either route.
 *
 * One step, one fork. The favoured arm is the proton transfer the keys draw;
 * the other arm is the carbonyl addition a student reaches for by reflex.
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

/* ---------------- the shared starting point ---------------- */

/** CH3(-), the Grignard's carbon. Mg counterion omitted, see the header. */
const methylCarbanion = createSpecies({
  id: "sp-methyl-carbanion-ga",
  atoms: [createAtom({ id: "cn", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 3 })],
  bonds: [],
});

const aceticAcid = createSpecies({
  id: "sp-acetic-acid-ga",
  atoms: [
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-cmc1", a: "cm", b: "c1" }),
    createBond({ id: "b-c1o1", a: "c1", b: "o1", order: 2 }),
    createBond({ id: "b-c1o2", a: "c1", b: "o2" }),
    createBond({ id: "b-o2h1", a: "o2", b: "h1" }),
  ],
});

const GA_BEFORE = createState({
  id: "ga-before",
  members: [
    { species: methylCarbanion, role: "nucleophile" },
    { species: aceticAcid, role: "substrate" },
  ],
});

const GA_FROM_HINTS: LayoutHints = {
  cn: { x: -2.0, y: 0.3 },
  h1: { x: -0.55, y: 0.85 },
  o2: { x: 0.3, y: 0.6 },
  c1: { x: 0.85, y: -0.25 },
  o1: { x: 0.5, y: -1.2 },
  cm: { x: 1.85, y: -0.35 },
};

/* ---------------- favoured: take the acidic proton ---------------- */

const acetate = createSpecies({
  id: "sp-acetate-ga",
  atoms: [
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "o2", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cmc1", a: "cm", b: "c1" }),
    createBond({ id: "b-c1o1", a: "c1", b: "o1", order: 2 }),
    createBond({ id: "b-c1o2", a: "c1", b: "o2" }),
  ],
});

const methane = createSpecies({
  id: "sp-methane-ga",
  atoms: [createAtom({ id: "cn", element: "C", implicitHydrogens: 3 }), createAtom({ id: "h1", element: "H" })],
  bonds: [createBond({ id: "b-cnh1", a: "cn", b: "h1" })],
});

const GA_DEPROTONATION: MechanismStep = createStep({
  id: "grignard-acid-deprotonation",
  from: GA_BEFORE,
  to: createState({
    id: "ga-after-deprotonation",
    members: [
      { species: acetate, role: "product" },
      { species: methane, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["h1"] },
  arrows: [
    createArrow({ id: "a-grab-h", source: fromLonePair("cn"), sink: toBondBetween("cn", "h1") }),
    createArrow({ id: "a-oh-release", source: fromBond("b-o2h1"), sink: toAtom("o2") }),
  ],
});

const GA_DEPROTONATION_TO_HINTS: LayoutHints = {
  cn: { x: -2.3, y: 0.3 },
  h1: { x: -1.35, y: 0.55 },
  o2: { x: 0.45, y: 0.6 },
  c1: { x: 1.0, y: -0.25 },
  o1: { x: 0.65, y: -1.2 },
  cm: { x: 2.0, y: -0.35 },
};

/* ---------------- not favoured: add to the carbonyl ---------------- */

const tetrahedralAlkoxide = createSpecies({
  id: "sp-tetrahedral-ga",
  atoms: [
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "cn", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cmc1", a: "cm", b: "c1" }),
    createBond({ id: "b-c1o1", a: "c1", b: "o1" }),
    createBond({ id: "b-c1o2", a: "c1", b: "o2" }),
    createBond({ id: "b-o2h1", a: "o2", b: "h1" }),
    createBond({ id: "b-c1cn", a: "c1", b: "cn" }),
  ],
});

const GA_ADDITION: MechanismStep = createStep({
  id: "grignard-acid-addition",
  from: GA_BEFORE,
  to: createState({ id: "ga-after-addition", members: [{ species: tetrahedralAlkoxide, role: "intermediate" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["cn", "c1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("cn"), sink: toBondBetween("cn", "c1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-c1o1"), sink: toAtom("o1") }),
  ],
});

const GA_ADDITION_TO_HINTS: LayoutHints = {
  cn: { x: 0.9, y: 0.7 },
  h1: { x: -1.2, y: 0.95 },
  o2: { x: -0.3, y: 0.7 },
  c1: { x: 0.3, y: -0.1 },
  o1: { x: 0.3, y: -1.1 },
  cm: { x: 1.3, y: -0.1 },
};

/* ---------------- the fork ---------------- */

const GRIGNARD_ACID_FORK: StepFork = {
  prompt: "Step 1 · A Grignard meets a carboxylic acid. What happens first?",
  conditions: "CH3MgBr, ether, 1 equivalent",
  routes: [
    {
      id: "route-deprotonate",
      label: "Take the acidic proton",
      route: "acid_base_proton_transfer",
      step: GA_DEPROTONATION,
      fromHints: GA_FROM_HINTS,
      toHints: GA_DEPROTONATION_TO_HINTS,
      favoured: true,
      why: "The carbanion is the conjugate base of methane, pKa about 50, and the acid's proton sits at pKa about 5: a 45 unit gap, Keq about 10^45, and the proton is gone on contact.",
    },
    {
      id: "route-add",
      label: "Add to the carbonyl",
      route: "nucleophilic_addition_carbonyl",
      step: GA_ADDITION,
      fromHints: GA_FROM_HINTS,
      toHints: GA_ADDITION_TO_HINTS,
      favoured: false,
      cause: "acid_base_step_outruns_addition",
      why: "An acid base step with a 45 unit pKa gap is over before any addition can start, and the carboxylate it leaves is deactivated toward nucleophiles.",
    },
  ],
};

export const GRIGNARD_ACID_SEQUENCES: readonly TrainerSequence[] = [
  {
    id: "seq-grignard-acid",
    title: "Grignard + carboxylic acid · 1 step",
    brief: "CH3MgBr meets acetic acid. Decide what the carbanion does first.",
    successLine:
      "The Grignard is a base long before it is a nucleophile: pKa 5 against pKa 50 is Keq about 10^45, so the acid is deprotonated and the carbanion leaves as methane. The carboxylate that remains is deactivated, and no addition follows. This is the key's answer to why CH3MgBr cannot be used on a carboxylic acid.",
    steps: [
      {
        step: GA_DEPROTONATION,
        stepBrief: "Step 1 · The methyl carbanion takes the O-H proton; the O-H electrons stay on oxygen.",
        hint: "A Grignard and a carboxylic acid, one equivalent.",
        fromHints: GA_FROM_HINTS,
        toHints: GA_DEPROTONATION_TO_HINTS,
        fork: GRIGNARD_ACID_FORK,
      },
    ],
  },
];
