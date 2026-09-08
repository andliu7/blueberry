import { describe, expect, it } from "vitest";

import { evaluateStereoDescriptors } from "../src/checks/oracle/stereo-descriptors.ts";
import type { CorpusState, UnspecifiedStereoDeclaration } from "../src/checks/oracle/corpus.ts";
import type {
  AtomPayload,
  BondPayload,
  SpeciesPayload,
  SpeciesResult,
  StateResult,
} from "../src/checks/oracle/payload.ts";
import type { ResultByRef } from "../src/checks/oracle/run.ts";

/**
 * ADVERSARY FINDING, Phase 0, attack surface 4.
 *
 * packages/validators/src/checks/oracle/gate-self-test.ts is the self test for the
 * unspecified stereo declaration mechanism. Its own comment says the four assertions it
 * runs, undeclared / declared-with-reason / declared-without-justification / stale, are
 * "the whole of the declaration mechanism... Delete any one of them and a declaration
 * becomes an opt out." Every one of those four assertions is built with kind: "atom".
 * STEREO_DECLARATION there is hardcoded `kind: "atom", ref: "a1"`, and no case in
 * ASSERTIONS ever constructs a `kind: "bond"` declaration or an `unspecifiedPotentialStereo`
 * entry of kind "bond". The evaluator in stereo-descriptors.ts is written generically over
 * `element.kind`, so nothing suggests the bond arm is actually broken, but "nothing
 * suggests it is broken" is exactly the gap an untested code path leaves, and CLAUDE.md's
 * own reference fixtures for this corpus (cis/trans 2-butene addition) are bond geometry,
 * not atom geometry.
 *
 * This file is the missing half of gate-self-test.ts's coverage, written the same way:
 * synthetic SpeciesResult objects, no RDKit spawned, calling the same exported evaluator.
 * A companion fixture, fixtures/bond-kind-unspecified-stereo-declaration.oracle.json,
 * exercises the one case that can be proven this way, the declared-with-reason path,
 * against real RDKit on 2-butene and confirmed it adjudicates correctly. The three failing
 * cases below cannot be added as a permanent .oracle.json fixture without leaving the
 * suite red forever, since the oracle corpus format has no mustFail-style declaration the
 * way a conservation fixture does; a state that should fail either fails or it does not,
 * and there is no field that says "expected". So they are captured here instead, as pure
 * unit tests against the real evaluator function.
 */

function bondAtom(id: string): AtomPayload {
  return {
    id,
    element: "C",
    isotope: null,
    formalCharge: 0,
    lonePairs: 0,
    unpairedElectrons: 0,
    implicitHydrogens: 1,
    stereo: null,
  };
}

function speciesPayload(id: string, bonds: readonly BondPayload[]): SpeciesPayload {
  return { id, label: id, atoms: [bondAtom("a1"), bondAtom("a2")], bonds };
}

function corpusState(
  species: SpeciesPayload,
  declarations: readonly UnspecifiedStereoDeclaration[],
): CorpusState {
  const stateRef = "test#seq:bond-kind/state:0";
  return {
    stateRef,
    sequenceId: "bond-kind",
    file: "test",
    index: 0,
    payload: { stateRef, id: "state-0", sanitizationMayFail: null, species: [species] },
    species: [{ id: species.id, expectMeso: false, unspecifiedStereoDeclared: declarations }],
    atomIds: new Set(species.atoms.map((atom) => atom.id)),
    speciesByAtomId: new Map(species.atoms.map((atom) => [atom.id, species.id])),
    sanitizationMayFail: null,
  };
}

function cleanSpeciesResult(
  id: string,
  unspecified: readonly { readonly kind: string; readonly ref: string | null }[],
): SpeciesResult {
  return {
    id,
    label: id,
    sanitization: { ok: true, errorKind: null, error: null },
    canonicalSmiles: "CC=CC",
    atomDescriptors: [],
    bondDescriptors: [],
    unspecifiedPotentialStereo: unspecified,
    meso: { isMeso: false, definedTetrahedralCenters: 0, canonicalSmiles: "CC=CC", mirrorCanonicalSmiles: "CC=CC" },
    aromaticAtomIds: [],
    aromaticBondIds: [],
    aromaticRingCount: 0,
  };
}

function refs(state: CorpusState, result: StateResult): ResultByRef {
  return new Map([[state.stateRef, result]]);
}

const BOND: UnspecifiedStereoDeclaration = {
  kind: "bond",
  ref: "b1",
  justification: "synthetic bond-kind declaration, mirroring STEREO_DECLARATION in gate-self-test.ts",
  declaredBy: "adversary-pass-phase-0",
};

describe("unspecified stereo declaration mechanism, kind: bond (not covered by gate-self-test.ts)", () => {
  it("fails on an undeclared unspecified bond stereo element", () => {
    const species = speciesPayload("sp-1", [{ id: "b1", a: "a1", b: "a2", order: 2, stereo: null }]);
    const state = corpusState(species, []);
    const result: StateResult = {
      stateRef: state.stateRef,
      id: "state-0",
      sanitizationMayFail: null,
      species: [cleanSpeciesResult("sp-1", [{ kind: "bond", ref: "b1" }])],
      buildErrors: [],
    };
    const evaluation = evaluateStereoDescriptors([state], refs(state, result));
    expect(evaluation.failures.length).toBeGreaterThan(0);
    expect(evaluation.adjudications.length).toBe(0);
  });

  it("adjudicates, and does not fail, a declared bond stereo element with a reason", () => {
    const species = speciesPayload("sp-1", [{ id: "b1", a: "a1", b: "a2", order: 2, stereo: null }]);
    const state = corpusState(species, [BOND]);
    const result: StateResult = {
      stateRef: state.stateRef,
      id: "state-0",
      sanitizationMayFail: null,
      species: [cleanSpeciesResult("sp-1", [{ kind: "bond", ref: "b1" }])],
      buildErrors: [],
    };
    const evaluation = evaluateStereoDescriptors([state], refs(state, result));
    expect(evaluation.failures.length).toBe(0);
    expect(evaluation.adjudications.length).toBeGreaterThan(0);
  });

  it("fails a bond declaration with no justification, even though the corpus loader would already reject it on disk", () => {
    const species = speciesPayload("sp-1", [{ id: "b1", a: "a1", b: "a2", order: 2, stereo: null }]);
    const state = corpusState(species, [{ ...BOND, justification: "   " }]);
    const result: StateResult = {
      stateRef: state.stateRef,
      id: "state-0",
      sanitizationMayFail: null,
      species: [cleanSpeciesResult("sp-1", [{ kind: "bond", ref: "b1" }])],
      buildErrors: [],
    };
    const evaluation = evaluateStereoDescriptors([state], refs(state, result));
    expect(evaluation.failures.length).toBeGreaterThan(0);
    expect(evaluation.adjudications.length).toBe(0);
  });

  it("fails a stale bond declaration whose element RDKit no longer reports as unspecified", () => {
    const species = speciesPayload("sp-1", [{ id: "b1", a: "a1", b: "a2", order: 2, stereo: null }]);
    const state = corpusState(species, [BOND]);
    const result: StateResult = {
      stateRef: state.stateRef,
      id: "state-0",
      sanitizationMayFail: null,
      species: [cleanSpeciesResult("sp-1", [])],
      buildErrors: [],
    };
    const evaluation = evaluateStereoDescriptors([state], refs(state, result));
    expect(evaluation.failures.length).toBeGreaterThan(0);
    expect(evaluation.adjudications.length).toBe(0);
  });

  it("fails a bond declaration whose ref names no bond in the species", () => {
    const species = speciesPayload("sp-1", [{ id: "b1", a: "a1", b: "a2", order: 2, stereo: null }]);
    const state = corpusState(species, [{ ...BOND, ref: "b9" }]);
    const result: StateResult = {
      stateRef: state.stateRef,
      id: "state-0",
      sanitizationMayFail: null,
      species: [cleanSpeciesResult("sp-1", [])],
      buildErrors: [],
    };
    const evaluation = evaluateStereoDescriptors([state], refs(state, result));
    expect(evaluation.failures.length).toBeGreaterThan(0);
    expect(evaluation.adjudications.length).toBe(0);
  });
});
