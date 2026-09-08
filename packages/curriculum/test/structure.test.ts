/**
 * Structure comparison: what it decides, and what it refuses to decide.
 *
 * The refusals are the important half. A checker that silently ignores
 * stereochemistry marks the enantiomer correct, and CLAUDE.md's hard assertion is
 * that SN2 inverts, so an undecided answer here is the honest one until canonical
 * comparison through Indigo exists on the editor route.
 */

import { createAtom, createBond, createSpecies, createState } from "@blueberry/chem-core";
import { describe, expect, it } from "vitest";
import {
  checkStructure,
  createStructureAnswer,
  hasStereoDeclarations,
  speciesAreEquivalent,
  structureStateMatches,
  type StructureState,
} from "../src/answers/structure.ts";

const ethanol = createSpecies({
  id: "sp-ethanol",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "o1", element: "O", lonePairs: 2, implicitHydrogens: 1 }),
  ],
  bonds: [createBond({ id: "b1", a: "c1", b: "c2" }), createBond({ id: "b2", a: "c2", b: "o1" })],
});

/** The same molecule, drawn with different ids and in a different order. */
const ethanolRelabelled = createSpecies({
  id: "whatever",
  atoms: [
    createAtom({ id: "z9", element: "O", lonePairs: 2, implicitHydrogens: 1 }),
    createAtom({ id: "z1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "z7", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "x", a: "z1", b: "z9" }), createBond({ id: "y", a: "z7", b: "z1" })],
});

/** Same formula, different connectivity. */
const dimethylEther = createSpecies({
  id: "sp-ether",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b1", a: "c1", b: "o1" }), createBond({ id: "b2", a: "o1", b: "c2" })],
});

const ethene = createSpecies({
  id: "sp-ethene",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [createBond({ id: "b1", a: "c1", b: "c2", order: 2 })],
});

const ethoxide = createSpecies({
  id: "sp-ethoxide",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "o1", element: "O", lonePairs: 3, formalCharge: -1 }),
  ],
  bonds: [createBond({ id: "b1", a: "c1", b: "c2" }), createBond({ id: "b2", a: "c2", b: "o1" })],
});

function stateOf(id: string, ...species: readonly ReturnType<typeof createSpecies>[]): StructureState {
  return {
    kind: "structure",
    state: createState({
      id,
      members: species.map((one) => ({ species: one, role: "product" as const })),
    }),
  };
}

const withStereo = createSpecies({
  id: "sp-stereo",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({
      id: "c2",
      element: "C",
      implicitHydrogens: 1,
      stereo: {
        kind: "tetrahedral",
        neighbors: ["c1", "o1", "br1", "@implicitH"],
        parity: "clockwise",
      },
    }),
    createAtom({ id: "o1", element: "O", lonePairs: 2, implicitHydrogens: 1 }),
    createAtom({ id: "br1", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b1", a: "c1", b: "c2" }),
    createBond({ id: "b2", a: "c2", b: "o1" }),
    createBond({ id: "b3", a: "c2", b: "br1" }),
  ],
});

const answer = createStructureAnswer(stateOf("expected", ethanol).state);

describe("constitution comparison", () => {
  it("ignores atom ids, species ids, and atom order", () => {
    expect(checkStructure(answer, stateOf("given", ethanolRelabelled))).toEqual({
      outcome: "correct",
    });
  });

  it("names an isomer as an isomer", () => {
    expect(checkStructure(answer, stateOf("given", dimethylEther))).toMatchObject({
      outcome: "wrong",
      cause: "structure_is_an_isomer_of_the_answer",
    });
  });

  it("names a different molecular formula", () => {
    expect(checkStructure(answer, stateOf("given", ethene))).toMatchObject({
      cause: "structure_molecular_formula_differs",
    });
  });

  it("names a charge difference where the formula also differs by the proton", () => {
    // Ethoxide is ethanol minus a proton, so the formula differs first. The
    // charge cause is what fires when the atoms match and the charge does not,
    // which is the deprotonated-and-then-something-else case below.
    expect(checkStructure(answer, stateOf("given", ethoxide))).toMatchObject({
      cause: "structure_molecular_formula_differs",
    });
  });

  it("names a charge difference when the atoms are the same", () => {
    // A synthetic state: the same atoms as ethanol with a plus one declared on
    // the oxygen. It is here to reach the charge branch, not to be good chemistry.
    const declaredCation = createSpecies({
      id: "sp-cation",
      atoms: [
        createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
        createAtom({ id: "c2", element: "C", implicitHydrogens: 2 }),
        createAtom({ id: "o1", element: "O", lonePairs: 1, implicitHydrogens: 1, formalCharge: 1 }),
      ],
      bonds: [createBond({ id: "b1", a: "c1", b: "c2" }), createBond({ id: "b2", a: "c2", b: "o1" })],
    });
    expect(checkStructure(answer, stateOf("given", declaredCation))).toMatchObject({
      cause: "structure_charge_differs",
    });
  });

  it("counts species, so a byproduct left in changes the answer", () => {
    const water = createSpecies({
      id: "sp-water",
      atoms: [createAtom({ id: "o", element: "O", lonePairs: 2, implicitHydrogens: 2 })],
    });
    const twoSpecies = createStructureAnswer(stateOf("expected-two", ethanol, water).state);
    expect(checkStructure(twoSpecies, stateOf("given", ethanol))).toMatchObject({
      cause: "structure_molecular_formula_differs",
    });
  });

  it("names a species count difference when the atoms and charge both match", () => {
    const water = createSpecies({
      id: "sp-water",
      atoms: [createAtom({ id: "o", element: "O", lonePairs: 2, implicitHydrogens: 2 })],
    });
    // Ethene plus water carries exactly the atoms of ethanol, in two pieces.
    expect(checkStructure(answer, stateOf("given", ethene, water))).toMatchObject({
      cause: "structure_species_count_differs",
    });
  });

  it("matches two copies of the same molecule against two copies, not one", () => {
    const twoEthanols = createStructureAnswer(stateOf("expected-two", ethanol, ethanol).state);
    expect(checkStructure(twoEthanols, stateOf("given", ethanol, ethanolRelabelled))).toEqual({
      outcome: "correct",
    });
  });
});

describe("what it refuses to decide", () => {
  it("refuses to author a structure answer that declares stereochemistry", () => {
    expect(hasStereoDeclarations(stateOf("s", withStereo).state)).toBe(true);
    expect(() => createStructureAnswer(stateOf("s", withStereo).state)).toThrow(/stereo/);
  });

  it("returns undecided rather than wrong when the submission declares stereochemistry", () => {
    expect(checkStructure(answer, stateOf("given", withStereo))).toMatchObject({
      outcome: "undecided",
      cause: "structure_comparison_needs_stereochemistry",
    });
  });

  it("refuses an answer with no participating species", () => {
    expect(() => createStructureAnswer(createState({ id: "empty", members: [] }))).toThrow();
  });
});

describe("distractor matching on state", () => {
  it("matches a predicted structure against the same structure however it is drawn", () => {
    expect(structureStateMatches(stateOf("t", ethanol), stateOf("s", ethanolRelabelled))).toBe(true);
    expect(structureStateMatches(stateOf("t", ethanol), stateOf("s", dimethylEther))).toBe(false);
    expect(structureStateMatches(stateOf("t", ethene), stateOf("s", ethene))).toBe(true);
  });

  it("does not match when either side declares stereochemistry", () => {
    // Returning false rather than true is the honest answer: the comparison was
    // never made, so an attempt falls through to the tail and is logged.
    expect(structureStateMatches(stateOf("t", withStereo), stateOf("s", withStereo))).toBe(false);
  });
});

describe("the isomorphism certificate", () => {
  it("returns a decided answer with a mapping for equivalent species", () => {
    const outcome = speciesAreEquivalent(ethanol, ethanolRelabelled);
    expect(outcome.decided).toBe(true);
    if (outcome.decided && outcome.isomorphic) {
      expect(outcome.mapping).toHaveLength(ethanol.atoms.length);
      expect(new Set(outcome.mapping).size).toBe(ethanol.atoms.length);
    } else {
      throw new Error("expected an isomorphism");
    }
  });

  it("decides against a species that differs only in bond order", () => {
    const ethanolWithDoubleBond = createSpecies({
      id: "sp-weird",
      atoms: [
        createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
        createAtom({ id: "c2", element: "C", implicitHydrogens: 2 }),
        createAtom({ id: "o1", element: "O", lonePairs: 2, implicitHydrogens: 1 }),
      ],
      bonds: [
        createBond({ id: "b1", a: "c1", b: "c2", order: 2 }),
        createBond({ id: "b2", a: "c2", b: "o1" }),
      ],
    });
    const outcome = speciesAreEquivalent(ethanol, ethanolWithDoubleBond);
    expect(outcome).toMatchObject({ decided: true, isomorphic: false });
  });
});
