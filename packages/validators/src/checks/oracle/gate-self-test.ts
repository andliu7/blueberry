import type { Check, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import type { Evaluation } from "./adjudication.ts";
import { evaluateAromaticity } from "./aromaticity.ts";
import type {
  CorpusSequence,
  CorpusState,
  UnspecifiedStereoDeclaration,
} from "./corpus.ts";
import { evaluateMeso } from "./meso.ts";
import type {
  AtomDescriptorResult,
  AtomPayload,
  BondDescriptorResult,
  BondPayload,
  SanitizationMayFail,
  SpeciesPayload,
  SpeciesResult,
  StateResult,
} from "./payload.ts";
import type { ResultByRef } from "./run.ts";
import { evaluateSanitization } from "./sanitization.ts";
import { evaluateStereoDescriptors } from "./stereo-descriptors.ts";

/**
 * Proof that the oracle checks fire.
 *
 * BUILD-PROMPT.md, Phase 0: "A validator suite that has never failed has not been
 * tested." packages/validators/python/negative/ holds the hand run version of this, seven
 * corpus files a person copies into the corpus to watch the suite go red. That is the
 * right tool for auditing the whole pipeline including the sidecar, and it is a manual
 * act nobody performs on a Tuesday. This check is the part that runs on every invocation.
 *
 * It calls the four evaluators, which are pure functions over a corpus and a sidecar
 * response, against responses built here to be wrong in one specific way each. If an
 * evaluator comes back clean on input built to break it, this check fails and the suite
 * goes red, which is the only way a blind check announces itself.
 *
 * It also asserts the three adjudication paths produce adjudications and NOT failures,
 * because an adjudication channel that quietly files everything as a failure is as broken
 * as one that files everything as a pass, just in the noisier direction.
 *
 * Everything here is synthetic and lives in this file. Nothing is written to disk, no
 * corpus file is read, and the sidecar is never spawned, so this check costs nothing and
 * cannot report the suite as MODIFIED by leaving a scratch file inside the package.
 */

const CHECK_NAME = "oracle-gate-self-test";
const FIXTURE = "packages/validators/src/checks/oracle/gate-self-test.ts";

/* -------------------------------------------------------------------------- */
/* Synthetic payload and result builders                                       */
/* -------------------------------------------------------------------------- */

function makeAtom(id: string, authored: "R" | "S" | null): AtomPayload {
  return {
    id,
    element: "C",
    isotope: null,
    formalCharge: 0,
    lonePairs: 0,
    unpairedElectrons: 0,
    implicitHydrogens: 0,
    stereo:
      authored === null
        ? null
        : {
            kind: "tetrahedral",
            neighbors: ["n1", "n2", "n3", "@implicitH"],
            parity: "clockwise",
            authoredDescriptor: authored,
          },
  };
}

function makeBond(id: string, a: string, b: string, authored: "E" | "Z" | null): BondPayload {
  return {
    id,
    a,
    b,
    order: authored === null ? 1 : 2,
    stereo:
      authored === null
        ? null
        : {
            kind: "doubleBond",
            reference: [a, b],
            arrangement: "cis",
            authoredDescriptor: authored,
          },
  };
}

function makeSpeciesPayload(
  id: string,
  atoms: readonly AtomPayload[],
  bonds: readonly BondPayload[],
): SpeciesPayload {
  return { id, label: id, atoms, bonds };
}

function makeCorpusState(
  index: number,
  species: readonly SpeciesPayload[],
  expectMeso: readonly (boolean | null)[],
  mayFail: SanitizationMayFail | null,
  declaredBySpecies: ReadonlyMap<string, readonly UnspecifiedStereoDeclaration[]> = new Map(),
): CorpusState {
  const stateRef = `self-test#seq:synthetic/state:${index}`;
  const atomIds = new Set<string>();
  const speciesByAtomId = new Map<string, string>();
  for (const one of species) {
    for (const atom of one.atoms) {
      atomIds.add(atom.id);
      speciesByAtomId.set(atom.id, one.id);
    }
  }
  return {
    stateRef,
    sequenceId: "synthetic",
    file: "self-test",
    index,
    payload: { stateRef, id: `state-${index}`, sanitizationMayFail: mayFail, species },
    species: species.map((one, slot) => ({
      id: one.id,
      expectMeso: expectMeso[slot] ?? null,
      unspecifiedStereoDeclared: declaredBySpecies.get(one.id) ?? [],
    })),
    atomIds,
    speciesByAtomId,
    sanitizationMayFail: mayFail,
  };
}

interface SpeciesResultSpec {
  readonly id: string;
  readonly ok: boolean;
  readonly errorKind: string | null;
  readonly atomDescriptors: readonly AtomDescriptorResult[];
  readonly bondDescriptors: readonly BondDescriptorResult[];
  readonly unspecified: readonly { readonly kind: string; readonly ref: string | null }[];
  readonly definedCenters: number;
  readonly canonical: string;
  readonly mirror: string;
  readonly aromaticAtomIds: readonly string[];
}

function makeSpeciesResult(spec: SpeciesResultSpec): SpeciesResult {
  if (!spec.ok) {
    return {
      id: spec.id,
      label: spec.id,
      sanitization: {
        ok: false,
        errorKind: spec.errorKind,
        error: `${spec.errorKind ?? "error"}: synthetic`,
      },
      canonicalSmiles: null,
      atomDescriptors: [],
      bondDescriptors: [],
      unspecifiedPotentialStereo: [],
      meso: null,
      aromaticAtomIds: [],
      aromaticBondIds: [],
      aromaticRingCount: null,
    };
  }
  return {
    id: spec.id,
    label: spec.id,
    sanitization: { ok: true, errorKind: null, error: null },
    canonicalSmiles: spec.canonical,
    atomDescriptors: spec.atomDescriptors,
    bondDescriptors: spec.bondDescriptors,
    unspecifiedPotentialStereo: spec.unspecified,
    meso: {
      isMeso: spec.definedCenters >= 2 && spec.canonical === spec.mirror,
      definedTetrahedralCenters: spec.definedCenters,
      canonicalSmiles: spec.canonical,
      mirrorCanonicalSmiles: spec.mirror,
    },
    aromaticAtomIds: spec.aromaticAtomIds,
    aromaticBondIds: [],
    aromaticRingCount: spec.aromaticAtomIds.length > 0 ? 1 : 0,
  };
}

function cleanSpecies(id: string): SpeciesResultSpec {
  return {
    id,
    ok: true,
    errorKind: null,
    atomDescriptors: [],
    bondDescriptors: [],
    unspecified: [],
    definedCenters: 0,
    canonical: "C",
    mirror: "C",
    aromaticAtomIds: [],
  };
}

function makeStateResult(
  state: CorpusState,
  species: readonly SpeciesResult[],
  buildErrors: readonly string[] = [],
): StateResult {
  return {
    stateRef: state.stateRef,
    id: state.payload.id,
    sanitizationMayFail: state.sanitizationMayFail,
    species,
    buildErrors,
  };
}

function refs(entries: readonly (readonly [CorpusState, StateResult])[]): ResultByRef {
  return new Map(entries.map(([state, result]) => [state.stateRef, result]));
}

function sequence(
  states: readonly CorpusState[],
  invariant: readonly string[],
): CorpusSequence {
  return {
    id: "synthetic",
    file: "self-test",
    description: "built in gate-self-test.ts",
    aromaticityInvariantAtomIds: invariant,
    states,
  };
}

const DECLARATION: SanitizationMayFail = {
  expectedError: "AtomValenceException",
  justification: "synthetic declaration built in gate-self-test.ts",
  declaredBy: "oracle-gate-self-test",
};

/* -------------------------------------------------------------------------- */
/* Assertions                                                                  */
/* -------------------------------------------------------------------------- */

interface Assertion {
  readonly name: string;
  /** What the evaluator must do with input built to be wrong in this one way. */
  readonly want: "fails" | "adjudicates";
  readonly evaluate: () => Evaluation;
}

function undeclaredSanitizationFailure(): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const state = makeCorpusState(0, [species], [false], null);
  const result = makeStateResult(state, [
    makeSpeciesResult({ ...cleanSpecies("sp-1"), ok: false, errorKind: "AtomValenceException" }),
  ]);
  return evaluateSanitization([state], refs([[state, result]]));
}

function staleDeclaration(): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const state = makeCorpusState(0, [species], [false], DECLARATION);
  const result = makeStateResult(state, [makeSpeciesResult(cleanSpecies("sp-1"))]);
  return evaluateSanitization([state], refs([[state, result]]));
}

function declarationCoversAnotherError(): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const state = makeCorpusState(0, [species], [false], DECLARATION);
  const result = makeStateResult(state, [
    makeSpeciesResult({ ...cleanSpecies("sp-1"), ok: false, errorKind: "KekulizeException" }),
  ]);
  return evaluateSanitization([state], refs([[state, result]]));
}

function declarationMatches(): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const state = makeCorpusState(0, [species], [false], DECLARATION);
  const result = makeStateResult(state, [
    makeSpeciesResult({ ...cleanSpecies("sp-1"), ok: false, errorKind: "AtomValenceException" }),
  ]);
  return evaluateSanitization([state], refs([[state, result]]));
}

function declarationEchoLost(): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const state = makeCorpusState(0, [species], [false], DECLARATION);
  const base = makeStateResult(state, [
    makeSpeciesResult({ ...cleanSpecies("sp-1"), ok: false, errorKind: "AtomValenceException" }),
  ]);
  // The sidecar dropped the declaration on the way back. Every verdict in the
  // sanitisation check is taken from the corpus copy, so this cannot change a verdict,
  // and that is exactly why it has to be reported rather than gone unnoticed.
  const result: StateResult = { ...base, sanitizationMayFail: null };
  return evaluateSanitization([state], refs([[state, result]]));
}

function declarationEchoKeyOrderIsNotAChange(): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const state = makeCorpusState(0, [species], [false], DECLARATION);
  // The sidecar writes its JSON with sort_keys=True, so the object that comes back has
  // its keys in a different order than the authored corpus. Comparing the two by
  // serialising them reported every declaration in the corpus as altered, which turned
  // the one negative fixture that must not fail the suite red. This assertion is the
  // regression guard for that.
  const reordered: SanitizationMayFail = {
    declaredBy: DECLARATION.declaredBy,
    expectedError: DECLARATION.expectedError,
    justification: DECLARATION.justification,
  };
  const base = makeStateResult(state, [
    makeSpeciesResult({ ...cleanSpecies("sp-1"), ok: false, errorKind: "AtomValenceException" }),
  ]);
  const result: StateResult = { ...base, sanitizationMayFail: reordered };
  return evaluateSanitization([state], refs([[state, result]]));
}

function buildErrorIsNeverDeclarable(): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const state = makeCorpusState(0, [species], [false], DECLARATION);
  const result = makeStateResult(state, [], ["species sp-1 atom a1: stereo slot 'x' is not bonded to it"]);
  return evaluateSanitization([state], refs([[state, result]]));
}

function wrongCipDescriptor(): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", "R")], []);
  const state = makeCorpusState(0, [species], [false], null);
  const descriptor: AtomDescriptorResult = { atomId: "a1", rdkit: "S", authored: "R", agrees: false };
  const result = makeStateResult(state, [
    makeSpeciesResult({ ...cleanSpecies("sp-1"), atomDescriptors: [descriptor], definedCenters: 1, mirror: "C@" }),
  ]);
  return evaluateStereoDescriptors([state], refs([[state, result]]));
}

function wrongEzDescriptor(): Evaluation {
  const atoms = [makeAtom("a1", null), makeAtom("a2", null)];
  const species = makeSpeciesPayload("sp-1", atoms, [makeBond("b1", "a1", "a2", "E")]);
  const state = makeCorpusState(0, [species], [false], null);
  const descriptor: BondDescriptorResult = { bondId: "b1", rdkit: "Z", authored: "E", agrees: false };
  const result = makeStateResult(state, [
    makeSpeciesResult({ ...cleanSpecies("sp-1"), bondDescriptors: [descriptor] }),
  ]);
  return evaluateStereoDescriptors([state], refs([[state, result]]));
}

function droppedDescriptor(): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", "R")], []);
  const state = makeCorpusState(0, [species], [false], null);
  // The authored label is there and the oracle returned nothing for it. Silence here
  // would read exactly like a label that was checked and agreed.
  const result = makeStateResult(state, [makeSpeciesResult(cleanSpecies("sp-1"))]);
  return evaluateStereoDescriptors([state], refs([[state, result]]));
}

/* ---- unspecified potential stereo, and the declaration that covers it ---- */

const STEREO_DECLARATION: UnspecifiedStereoDeclaration = {
  kind: "atom",
  ref: "a1",
  justification:
    "synthetic declaration built in gate-self-test.ts, standing in for the arenium's " +
    "resonance artifact",
  declaredBy: "oracle-gate-self-test",
};

/** One species, one atom, and whatever declarations the case wants on it. */
function stereoDeclarationCase(
  declarations: readonly UnspecifiedStereoDeclaration[],
  unspecified: readonly { readonly kind: string; readonly ref: string | null }[],
): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const state = makeCorpusState(
    0,
    [species],
    [false],
    null,
    new Map([["sp-1", declarations]]),
  );
  const result = makeStateResult(state, [
    makeSpeciesResult({ ...cleanSpecies("sp-1"), unspecified }),
  ]);
  return evaluateStereoDescriptors([state], refs([[state, result]]));
}

function undeclaredUnspecifiedStereo(): Evaluation {
  return stereoDeclarationCase([], [{ kind: "atom", ref: "a1" }]);
}

function declaredUnspecifiedStereo(): Evaluation {
  return stereoDeclarationCase([STEREO_DECLARATION], [{ kind: "atom", ref: "a1" }]);
}

function declarationWithoutJustification(): Evaluation {
  // Blank rather than absent, because absent is rejected by the corpus loader before an
  // evaluator ever sees it. The rule being asserted is the evaluator's own: a declaration
  // with nothing written on it covers nothing, whatever built it.
  return stereoDeclarationCase(
    [{ ...STEREO_DECLARATION, justification: "   " }],
    [{ kind: "atom", ref: "a1" }],
  );
}

function staleStereoDeclaration(): Evaluation {
  // The atom is still there and is no longer unspecified: either it was pinned, or the
  // chemistry moved. Either way the declaration has outlived what it was written about.
  return stereoDeclarationCase([STEREO_DECLARATION], []);
}

function stereoDeclarationNamesNothing(): Evaluation {
  // No atom a9 exists in the species at all. Nothing else is wrong with this state, so
  // the only failure it can produce is the one being asserted.
  return stereoDeclarationCase([{ ...STEREO_DECLARATION, ref: "a9" }], []);
}

function wrongMesoExpectation(): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const state = makeCorpusState(0, [species], [true], null);
  const result = makeStateResult(state, [
    // Two defined centres and a canonical SMILES that differs from its mirror: chiral,
    // not meso. The corpus claims meso.
    makeSpeciesResult({
      ...cleanSpecies("sp-1"),
      definedCenters: 2,
      canonical: "C[C@@H](Br)[C@@H](C)Br",
      mirror: "C[C@H](Br)[C@H](C)Br",
    }),
  ]);
  return evaluateMeso([sequence([state], [])], refs([[state, result]]));
}

function missingMesoExpectation(): Evaluation {
  const one = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const two = makeSpeciesPayload("sp-2", [makeAtom("a2", null)], []);
  const state = makeCorpusState(0, [one, two], [false, null], null);
  const result = makeStateResult(state, [
    makeSpeciesResult(cleanSpecies("sp-1")),
    makeSpeciesResult(cleanSpecies("sp-2")),
  ]);
  return evaluateMeso([sequence([state], [])], refs([[state, result]]));
}

function mesoFlagContradictsItsOwnEvidence(): Evaluation {
  const species = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const state = makeCorpusState(0, [species], [true], null);
  const base = makeSpeciesResult({
    ...cleanSpecies("sp-1"),
    definedCenters: 0,
    canonical: "CC",
    mirror: "CC",
  });
  // isMeso true on zero defined centres. Achiral is not meso, and without the two centre
  // floor a fixture with no stereochemistry at all would satisfy a meso expectation.
  const tampered: SpeciesResult = {
    ...base,
    meso: {
      isMeso: true,
      definedTetrahedralCenters: 0,
      canonicalSmiles: "CC",
      mirrorCanonicalSmiles: "CC",
    },
  };
  const result = makeStateResult(state, [tampered]);
  return evaluateMeso([sequence([state], [])], refs([[state, result]]));
}

function aromaticitySequence(invariant: readonly string[]): Evaluation {
  const ring = ["c1", "c2", "c3", "c4", "c5", "c6"];
  const payload = makeSpeciesPayload(
    "sp-ring",
    ring.map((id) => makeAtom(id, null)),
    [],
  );
  const before = makeCorpusState(0, [payload], [false], null);
  const after = makeCorpusState(1, [payload], [false], null);
  const beforeResult = makeStateResult(before, [
    makeSpeciesResult({ ...cleanSpecies("sp-ring"), aromaticAtomIds: ring }),
  ]);
  const afterResult = makeStateResult(after, [
    makeSpeciesResult({ ...cleanSpecies("sp-ring"), aromaticAtomIds: [] }),
  ]);
  return evaluateAromaticity(
    [sequence([before, after], invariant)],
    refs([
      [before, beforeResult],
      [after, afterResult],
    ]),
  );
}

function invariantContradicted(): Evaluation {
  return aromaticitySequence(["c1", "c2", "c3", "c4", "c5", "c6"]);
}

function unclaimedDearomatisationIsAdjudicated(): Evaluation {
  return aromaticitySequence([]);
}

function invariantNamesAnAbsentAtom(): Evaluation {
  const payload = makeSpeciesPayload("sp-1", [makeAtom("a1", null)], []);
  const before = makeCorpusState(0, [payload], [false], null);
  const after = makeCorpusState(1, [payload], [false], null);
  const beforeResult = makeStateResult(before, [makeSpeciesResult(cleanSpecies("sp-1"))]);
  const afterResult = makeStateResult(after, [makeSpeciesResult(cleanSpecies("sp-1"))]);
  return evaluateAromaticity(
    [sequence([before, after], ["not-an-atom"])],
    refs([
      [before, beforeResult],
      [after, afterResult],
    ]),
  );
}

const ASSERTIONS: readonly Assertion[] = [
  { name: "sanitization fires on an undeclared failure", want: "fails", evaluate: undeclaredSanitizationFailure },
  { name: "sanitization fires on a stale declaration", want: "fails", evaluate: staleDeclaration },
  { name: "sanitization fires when the declaration covers another exception class", want: "fails", evaluate: declarationCoversAnotherError },
  { name: "sanitization adjudicates a declared failure that matches", want: "adjudicates", evaluate: declarationMatches },
  { name: "sanitization fires on a build error even under a declaration", want: "fails", evaluate: buildErrorIsNeverDeclarable },
  { name: "sanitization fires when the sidecar loses the declaration on the way back", want: "fails", evaluate: declarationEchoLost },
  { name: "sanitization treats a reordered declaration echo as unchanged", want: "adjudicates", evaluate: declarationEchoKeyOrderIsNotAChange },
  { name: "stereo fires on an authored R where RDKit says S", want: "fails", evaluate: wrongCipDescriptor },
  { name: "stereo fires on an authored E where RDKit says Z", want: "fails", evaluate: wrongEzDescriptor },
  { name: "stereo fires when an authored descriptor came back unverified", want: "fails", evaluate: droppedDescriptor },
  // Was "adjudicates" until the scope of the CLAUDE.md exception was checked. That
  // exception covers aromaticity perception only. An unlabelled stereocentre now fails,
  // so this assertion demands the stricter verdict, not the looser one.
  { name: "stereo fires on an undeclared unspecified potential stereocentre", want: "fails", evaluate: undeclaredUnspecifiedStereo },
  // The next four are the whole of the declaration mechanism. The first says it works at
  // all; the other three are what stop it being a way to silence the check. Delete any
  // one of them and a declaration becomes an opt out.
  { name: "stereo adjudicates a declared artifact stereo element rather than failing it", want: "adjudicates", evaluate: declaredUnspecifiedStereo },
  { name: "stereo fires on a declaration carrying no justification", want: "fails", evaluate: declarationWithoutJustification },
  { name: "stereo fires on a stale declaration whose element is no longer unspecified", want: "fails", evaluate: staleStereoDeclaration },
  { name: "stereo fires on a declaration naming an atom that is not in the species", want: "fails", evaluate: stereoDeclarationNamesNothing },
  { name: "meso fires on expect.meso true for a chiral diastereomer", want: "fails", evaluate: wrongMesoExpectation },
  { name: "meso fires on a species that lost its expectation", want: "fails", evaluate: missingMesoExpectation },
  { name: "meso fires when isMeso contradicts the values reported beside it", want: "fails", evaluate: mesoFlagContradictsItsOwnEvidence },
  { name: "aromaticity fires when a declared invariant atom dearomatises", want: "fails", evaluate: invariantContradicted },
  { name: "aromaticity adjudicates an unclaimed dearomatisation", want: "adjudicates", evaluate: unclaimedDearomatisationIsAdjudicated },
  { name: "aromaticity fires when the invariant claim names an atom that is not there", want: "fails", evaluate: invariantNamesAnAbsentAtom },
];

export const oracleGateSelfTest: Check = {
  name: CHECK_NAME,
  description:
    "the four oracle evaluators return a failure on input built to break them, and an adjudication where a human decides",

  run(): CheckResult {
    const failures: CheckFailure[] = [];

    for (const assertion of ASSERTIONS) {
      let evaluation: Evaluation;
      try {
        evaluation = assertion.evaluate();
      } catch (error) {
        failures.push({
          expected: `${assertion.name}: the evaluator runs`,
          actual: `it threw ${error instanceof Error ? error.message : String(error)}`,
          fixture: FIXTURE,
        });
        continue;
      }

      if (assertion.want === "fails" && evaluation.failures.length === 0) {
        failures.push({
          expected: `${assertion.name}: at least one failure`,
          actual: `0 failures and ${evaluation.adjudications.length} adjudication(s). The check is blind to this`,
          fixture: FIXTURE,
        });
      }

      if (assertion.want === "adjudicates") {
        if (evaluation.adjudications.length === 0) {
          failures.push({
            expected: `${assertion.name}: at least one adjudication item`,
            actual: `0 adjudication(s) and ${evaluation.failures.length} failure(s)`,
            fixture: FIXTURE,
          });
        }
        if (evaluation.failures.length > 0) {
          failures.push({
            expected: `${assertion.name}: no failure, because a human decides this one`,
            actual:
              `${evaluation.failures.length} failure(s), the first being ` +
              `"${evaluation.failures[0]?.actual ?? ""}". CLAUDE.md sends this case to ` +
              `adjudication, and a suite red on correct chemistry stops being read`,
            fixture: FIXTURE,
          });
        }
      }
    }

    if (failures.length > 0) return failed(failures);
    return passed();
  },
};
