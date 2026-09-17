/**
 * Gilman cuprate on an enone: the decision point at the carbonyl.
 *
 * Source: Exam 3, CHEM 241, Fall 2023 key, Q7d. Acetophenone is aldol
 * condensed to dypnone (Ph-CO-CH=C(CH3)-Ph) by steps 1 and 2, then
 * "(CH3)2CuLi, then H+" and the key draws Ph-CO-CH2-C(CH3)2-Ph: the methyl
 * lands on the BETA carbon, so the key's answer is the 1,4 (conjugate)
 * addition product, not the 1,2 alcohol.
 *
 * Two simplifications, both deliberate:
 *  - The enone is methyl vinyl ketone (CH2=CH-CO-CH3) instead of the key's
 *    dypnone. Same enone pattern, same enolate, same protonation; the two
 *    phenyls and the extra methyl are spectators to the mechanism and would
 *    only crowd the canvas. The key's substrate is named in the brief.
 *  - The cuprate is drawn as a methyl carbanion (CH3- with one lone pair), the
 *    same model reactions.ts uses for its cuprate and Grignard entries. The
 *    real nucleophile is the Cu-CH3 bond of the cuprate; the arrow that
 *    matters is the one from carbon to carbon, and the carbanion draws it.
 *
 * Step 1 forks: the same methyl can add 1,4 (favoured, cuprate) or 1,2 (what a
 * Grignard would do). Step 2 protonates the enolate on carbon at workup.
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

/* ---------------- species ---------------- */

/* The cuprate's methyl, as a carbanion. See the header for why. */
const gilmanMethyl = createSpecies({
  id: "sp-gilman-methyl",
  atoms: [createAtom({ id: "gm", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 3 })],
  bonds: [],
});

/* Methyl vinyl ketone: gb is the beta carbon, ga alpha, gk the carbonyl carbon. */
const gilmanEnone = createSpecies({
  id: "sp-gilman-enone",
  atoms: [
    createAtom({ id: "gb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ga", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gk", element: "C" }),
    createAtom({ id: "go", element: "O", lonePairs: 2 }),
    createAtom({ id: "gc", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gba", a: "gb", b: "ga", order: 2 }),
    createBond({ id: "b-gak", a: "ga", b: "gk" }),
    createBond({ id: "b-gko", a: "gk", b: "go", order: 2 }),
    createBond({ id: "b-gkc", a: "gk", b: "gc" }),
  ],
});

/* 1,4 product: the enolate. Methyl on the beta carbon, C=C moved to alpha-carbonyl, O-. */
const gilmanEnolate = createSpecies({
  id: "sp-gilman-enolate",
  atoms: [
    createAtom({ id: "gm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "gb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ga", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gk", element: "C" }),
    createAtom({ id: "go", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "gc", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gmb", a: "gm", b: "gb" }),
    createBond({ id: "b-gba", a: "gb", b: "ga" }),
    createBond({ id: "b-gak", a: "ga", b: "gk", order: 2 }),
    createBond({ id: "b-gko", a: "gk", b: "go" }),
    createBond({ id: "b-gkc", a: "gk", b: "gc" }),
  ],
});

/* 1,2 product: the alkoxide. Methyl on the carbonyl carbon, the C=C untouched. */
const gilmanAlkoxide = createSpecies({
  id: "sp-gilman-alkoxide",
  atoms: [
    createAtom({ id: "gm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "gb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ga", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gk", element: "C" }),
    createAtom({ id: "go", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "gc", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gba", a: "gb", b: "ga", order: 2 }),
    createBond({ id: "b-gak", a: "ga", b: "gk" }),
    createBond({ id: "b-gko", a: "gk", b: "go" }),
    createBond({ id: "b-gkc", a: "gk", b: "gc" }),
    createBond({ id: "b-gkm", a: "gk", b: "gm" }),
  ],
});

/* Workup acid. gh3 is the proton the alpha carbon takes. */
const gilmanHydronium = createSpecies({
  id: "sp-gilman-hydronium",
  atoms: [
    createAtom({ id: "gho", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "gh1", element: "H" }),
    createAtom({ id: "gh2", element: "H" }),
    createAtom({ id: "gh3", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-gho1", a: "gho", b: "gh1" }),
    createBond({ id: "b-gho2", a: "gho", b: "gh2" }),
    createBond({ id: "b-gho3", a: "gho", b: "gh3" }),
  ],
});

/* 2-pentanone, the 1,4 product after workup. The new alpha H is explicit
   because it is the atom the step moved. */
const gilmanKetone = createSpecies({
  id: "sp-gilman-ketone",
  atoms: [
    createAtom({ id: "gm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "gb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ga", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "gh3", element: "H" }),
    createAtom({ id: "gk", element: "C" }),
    createAtom({ id: "go", element: "O", lonePairs: 2 }),
    createAtom({ id: "gc", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gmb", a: "gm", b: "gb" }),
    createBond({ id: "b-gba", a: "gb", b: "ga" }),
    createBond({ id: "b-gah3", a: "ga", b: "gh3" }),
    createBond({ id: "b-gak", a: "ga", b: "gk" }),
    createBond({ id: "b-gko", a: "gk", b: "go", order: 2 }),
    createBond({ id: "b-gkc", a: "gk", b: "gc" }),
  ],
});

const gilmanWater = createSpecies({
  id: "sp-gilman-water",
  atoms: [
    createAtom({ id: "gho", element: "O", lonePairs: 2 }),
    createAtom({ id: "gh1", element: "H" }),
    createAtom({ id: "gh2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-gho1", a: "gho", b: "gh1" }), createBond({ id: "b-gho2", a: "gho", b: "gh2" })],
});

/* ---------------- step 1, favoured: 1,4 addition ---------------- */

const GILMAN_CONJUGATE: MechanismStep = createStep({
  id: "gilman-conjugate",
  from: createState({
    id: "gilman-14-before",
    members: [
      { species: gilmanMethyl, role: "nucleophile" },
      { species: gilmanEnone, role: "substrate" },
    ],
  }),
  to: createState({ id: "gilman-14-after", members: [{ species: gilmanEnolate, role: "intermediate" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["gm", "gb"] },
  arrows: [
    createArrow({ id: "a-attack-beta", source: fromLonePair("gm"), sink: toBondBetween("gm", "gb") }),
    createArrow({ id: "a-shift-pi", source: fromBond("b-gba"), sink: toBondBetween("ga", "gk") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-gko"), sink: toAtom("go") }),
  ],
});

/* ---------------- step 1, not favoured: 1,2 addition ---------------- */

const GILMAN_DIRECT: MechanismStep = createStep({
  id: "gilman-direct",
  from: createState({
    id: "gilman-12-before",
    members: [
      { species: gilmanMethyl, role: "nucleophile" },
      { species: gilmanEnone, role: "substrate" },
    ],
  }),
  to: createState({ id: "gilman-12-after", members: [{ species: gilmanAlkoxide, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["gm", "gk"] },
  arrows: [
    createArrow({ id: "a-attack-carbonyl", source: fromLonePair("gm"), sink: toBondBetween("gm", "gk") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-gko"), sink: toAtom("go") }),
  ],
});

/* ---------------- step 2: the enolate takes a proton on carbon ---------------- */

const GILMAN_PROTONATION: MechanismStep = createStep({
  id: "gilman-protonation",
  from: createState({
    id: "gilman-h-before",
    members: [
      { species: gilmanEnolate, role: "intermediate" },
      { species: gilmanHydronium, role: "acid" },
    ],
  }),
  to: createState({
    id: "gilman-h-after",
    members: [
      { species: gilmanKetone, role: "product" },
      { species: gilmanWater, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["ga", "gh3"] },
  arrows: [
    createArrow({ id: "a-c-grabs", source: fromBond("b-gak"), sink: toBondBetween("ga", "gh3") }),
    createArrow({ id: "a-oh-release", source: fromBond("b-gho3"), sink: toAtom("gho") }),
    createArrow({ id: "a-reform-co", source: fromLonePair("go"), sink: toBondBetween("go", "gk") }),
  ],
});

/* ---------------- layout ---------------- */

/* The enone zigzag, shared by every state. */
const ENONE = {
  gb: { x: -1.5, y: 0.5 },
  ga: { x: -0.63, y: 0.0 },
  gk: { x: 0.23, y: 0.5 },
  go: { x: 0.23, y: 1.5 },
  gc: { x: 1.1, y: 0.0 },
} as const;

const CONJUGATE_FROM_HINTS: LayoutHints = { ...ENONE, gm: { x: -2.7, y: -0.5 } };
const CONJUGATE_TO_HINTS: LayoutHints = { ...ENONE, gm: { x: -2.37, y: 0.0 } };

const DIRECT_FROM_HINTS: LayoutHints = { ...ENONE, gm: { x: 1.4, y: -1.0 } };
const DIRECT_TO_HINTS: LayoutHints = {
  ...ENONE,
  gc: { x: 1.2, y: 0.8 },
  gm: { x: 0.6, y: -0.4 },
};

const PROTONATION_FROM_HINTS: LayoutHints = {
  ...ENONE,
  gm: { x: -2.37, y: 0.0 },
  gho: { x: -0.6, y: -1.6 },
  gh3: { x: -0.62, y: -0.85 },
  gh1: { x: -1.3, y: -1.95 },
  gh2: { x: 0.1, y: -1.95 },
};
const PROTONATION_TO_HINTS: LayoutHints = {
  ...ENONE,
  gm: { x: -2.37, y: 0.0 },
  gh3: { x: -0.63, y: -0.8 },
  gho: { x: 0.9, y: -1.5 },
  gh1: { x: 0.3, y: -1.95 },
  gh2: { x: 1.5, y: -1.95 },
};

/* ---------------- the fork ---------------- */

const GILMAN_FORK: StepFork = {
  prompt: "Step 1 · A cuprate meets an enone. Which carbon does the methyl take?",
  conditions: "(CH3)2CuLi, THF, then H3O+ workup",
  routes: [
    {
      id: "route-conjugate",
      label: "1,4-addition, conjugate",
      route: "nucleophilic_addition_carbonyl",
      step: GILMAN_CONJUGATE,
      fromHints: CONJUGATE_FROM_HINTS,
      toHints: CONJUGATE_TO_HINTS,
      favoured: true,
      why: "A cuprate is a soft nucleophile and the beta carbon is the enone's soft end; the methyl lands there and the electrons fold back to make the enolate.",
    },
    {
      id: "route-direct",
      label: "1,2-addition, direct",
      route: "nucleophilic_addition_carbonyl",
      step: GILMAN_DIRECT,
      fromHints: DIRECT_FROM_HINTS,
      toHints: DIRECT_TO_HINTS,
      favoured: false,
      cause: "conjugate_addition_favoured_for_soft_nucleophile",
      why: "This is the organolithium's move, and the Grignard's: straight onto the carbonyl carbon. The reagent in this flask is neither.",
    },
  ],
};

/* ---------------- the sequence ---------------- */

export const GILMAN_SEQUENCES: readonly TrainerSequence[] = [
  {
    id: "seq-gilman-enone",
    title: "Cuprate onto an enone",
    brief:
      "Exam 3 Q7d, steps 3 and 4: an enone meets (CH3)2CuLi, then acid. The key's substrate is dypnone; here it is methyl vinyl ketone, the same enone pattern. Where does the methyl go?",
    successLine: "1,4-addition: the soft cuprate picks the beta carbon and workup protonates the enolate on carbon, the ketone comes back.",
    steps: [
      {
        step: GILMAN_CONJUGATE,
        stepBrief: "Add the cuprate's methyl to the enone. Two sites are open; choose the one a cuprate picks.",
        wonLine: "Methyl is on the beta carbon.",
        hint: "A cuprate and an enone.",
        fromHints: CONJUGATE_FROM_HINTS,
        toHints: CONJUGATE_TO_HINTS,
        fork: GILMAN_FORK,
      },
      {
        step: GILMAN_PROTONATION,
        stepBrief: "Workup: hydronium protonates the enolate on the alpha carbon and the carbonyl re-forms.",
        hint: "Protonate on carbon",
        fromHints: PROTONATION_FROM_HINTS,
        toHints: PROTONATION_TO_HINTS,
      },
    ],
  },
];
