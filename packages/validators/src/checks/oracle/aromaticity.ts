import type { Check, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import type { Adjudication, Evaluation } from "./adjudication.ts";
import { toNotMeasurable } from "./adjudication.ts";
import type { CorpusSequence, CorpusState } from "./corpus.ts";
import { oracleRun, unusableFailure, type ResultByRef } from "./run.ts";

/**
 * CHECK: RDKit's perceived aromaticity is stable across steps that should not affect it.
 *
 * THIS IS THE CHECK CLAUDE.md's EXCEPTION IS ABOUT. "RDKit's aromaticity perception is a
 * model, not ground truth, and legitimate reactive intermediates can fail its
 * sanitization. Aromaticity disagreements go to human adjudication rather than
 * auto-failing." So this check has three verdicts, and which one applies is decided by an
 * authored claim rather than by the check guessing.
 *
 *   A ring carbon in `aromaticityInvariantAtomIds` whose perceived aromaticity changes
 *   across a step is a FAILURE. The author has stated that nothing in the step touches
 *   that atom's aromaticity. Either the chemistry moved and the claim is stale, or
 *   RDKit's model moved under a corpus that was written against it. Both need fixing, and
 *   the author can withdraw the claim in one line if the movement turns out to be real.
 *
 *   Any other aromaticity change is an ADJUDICATION item. Benzene going to a Wheland
 *   intermediate really does stop being aromatic. Filing that as a failure would make the
 *   suite red on correct chemistry, and a suite that is red on correct chemistry stops
 *   being read.
 *
 *   No change is a pass and is silent.
 *
 * WHY THE COMPARISON IS BY ATOM ID ACROSS THE WHOLE STATE, not per species. A state is a
 * multiset of species and atoms move between species during a mechanism: the bromine that
 * was in Br2 is in the arenium ion one step later. chem-core keeps atom ids stable across
 * a step, per the invariant in chem-core/src/ids.ts, so the atom id is the only thing that
 * survives the step and is therefore the only sound thing to key on.
 *
 * WHAT AN UNSANITISED SPECIES DOES TO THIS CHECK, stated plainly because it is a real
 * hole. When a species does not sanitise, RDKit computes no aromaticity for it and
 * CONTRACT.md has the sidecar report an empty list rather than a guess. An empty list is
 * indistinguishable from "nothing here is aromatic", so treating it as data would invent
 * a dearomatisation that did not happen. Those atoms are therefore marked unknown and
 * excluded from the comparison, which means a sanitizationMayFail declaration on a state
 * also suspends the aromaticity invariant across the two boundaries that state touches.
 * That suspension is never silent: every invariant atom it covers becomes an explicit
 * adjudication item naming the declaration, so a human sees exactly which claim stopped
 * being checked and why.
 */

const CHECK_NAME = "oracle-aromaticity-stability";

interface StateAromaticity {
  readonly state: CorpusState;
  /** Atom ids RDKit perceives as aromatic. */
  readonly aromatic: ReadonlySet<string>;
  /** Atom ids RDKit actually computed an answer for. */
  readonly known: ReadonlySet<string>;
  /** Species with no usable answer, with the reason, for the adjudication text. */
  readonly unusableSpecies: readonly string[];
}

function atomIdsBySpecies(state: CorpusState): Map<string, readonly string[]> {
  const byId = new Map<string, readonly string[]>();
  for (const species of state.payload.species) {
    byId.set(species.id, species.atoms.map((atom) => atom.id));
  }
  return byId;
}

function readState(
  state: CorpusState,
  resultByRef: ResultByRef,
  failures: CheckFailure[],
): StateAromaticity {
  const aromatic = new Set<string>();
  const known = new Set<string>();
  const unusableSpecies: string[] = [];
  const atomsBySpecies = atomIdsBySpecies(state);
  const result = resultByRef.get(state.stateRef);

  if (result === undefined) {
    failures.push({
      expected: "a sidecar result for every corpus state",
      actual: "none came back",
      fixture: state.stateRef,
    });
    return {
      state,
      aromatic,
      known,
      unusableSpecies: [...atomsBySpecies.keys()].map((id) => `${id} (no result)`),
    };
  }

  const analysed = new Set<string>();
  for (const species of result.species) {
    analysed.add(species.id);
    const ownAtoms = atomsBySpecies.get(species.id);
    if (ownAtoms === undefined) continue; // Reported by oracle-sanitization.

    if (!species.sanitization.ok) {
      unusableSpecies.push(`${species.id} (${species.sanitization.errorKind ?? "unknown"})`);
      continue;
    }
    for (const atomId of ownAtoms) known.add(atomId);
    for (const atomId of species.aromaticAtomIds) {
      if (!ownAtoms.includes(atomId)) {
        failures.push({
          expected: `aromatic atom ids on species ${species.id} name atoms of that species`,
          actual: `it reported ${atomId}, which is not in it`,
          fixture: state.stateRef,
        });
        continue;
      }
      aromatic.add(atomId);
    }
  }

  for (const speciesId of atomsBySpecies.keys()) {
    if (!analysed.has(speciesId)) unusableSpecies.push(`${speciesId} (no result)`);
  }

  return { state, aromatic, known, unusableSpecies };
}

function compareBoundary(
  sequence: CorpusSequence,
  before: StateAromaticity,
  after: StateAromaticity,
  invariant: ReadonlySet<string>,
  failures: CheckFailure[],
  adjudications: Adjudication[],
): void {
  const boundary = `${before.state.stateRef} -> state:${after.state.index}`;
  const suspendedInvariant: string[] = [];
  let suspendedOther = 0;

  const shared = [...before.state.atomIds].filter((atomId) => after.state.atomIds.has(atomId));
  shared.sort();

  for (const atomId of shared) {
    const comparable = before.known.has(atomId) && after.known.has(atomId);
    if (!comparable) {
      if (invariant.has(atomId)) suspendedInvariant.push(atomId);
      else suspendedOther += 1;
      continue;
    }

    const wasAromatic = before.aromatic.has(atomId);
    const isAromatic = after.aromatic.has(atomId);
    if (wasAromatic === isAromatic) continue;

    const movement = `${wasAromatic ? "aromatic" : "not aromatic"} to ${isAromatic ? "aromatic" : "not aromatic"}`;

    if (invariant.has(atomId)) {
      failures.push({
        expected: `atom ${atomId} keeps its perceived aromaticity across this step, as declared by aromaticityInvariantAtomIds`,
        actual: `RDKit moved it ${movement}`,
        fixture: boundary,
      });
      continue;
    }

    adjudications.push({
      category: "aromaticity-changed",
      where: `${boundary} atom:${atomId}`,
      finding:
        `RDKit moved this atom ${movement}. It is not in this sequence's ` +
        `aromaticityInvariantAtomIds, so no authored claim was contradicted. A human ` +
        `decides whether the perception change is the intended chemistry. Sequence: ` +
        `${sequence.id}.`,
    });
  }

  if (suspendedInvariant.length > 0 || suspendedOther > 0) {
    const declarations = [before.state, after.state]
      .filter((state) => state.sanitizationMayFail !== null)
      .map(
        (state) =>
          `${state.stateRef} declares ${state.sanitizationMayFail?.expectedError ?? "?"} ` +
          `by ${state.sanitizationMayFail?.declaredBy ?? "?"}`,
      );
    const unusable = [...before.unusableSpecies, ...after.unusableSpecies];
    adjudications.push({
      category: "not-comparable",
      where: boundary,
      finding:
        `aromaticity could not be compared for ${suspendedInvariant.length} atom(s) under ` +
        `an aromaticityInvariantAtomIds claim` +
        (suspendedInvariant.length > 0 ? ` (${suspendedInvariant.join(", ")})` : "") +
        ` and ${suspendedOther} other atom(s), because RDKit produced no aromaticity for ` +
        `species ${unusable.join(", ")}. ` +
        (declarations.length > 0
          ? `Declared: ${declarations.join("; ")}. `
          : "No sanitizationMayFail declaration covers this. ") +
        `While that holds, the invariant claim on those atoms is not being checked.`,
    });
  }
}

export function evaluateAromaticity(
  sequences: readonly CorpusSequence[],
  resultByRef: ResultByRef,
): Evaluation {
  const failures: CheckFailure[] = [];
  const adjudications: Adjudication[] = [];

  for (const sequence of sequences) {
    const invariant = new Set(sequence.aromaticityInvariantAtomIds);

    // A claim over a single state compares nothing, so it reads as verified while
    // verifying nothing. That is the shape of an assertion that can never fail.
    if (invariant.size > 0 && sequence.states.length < 2) {
      failures.push({
        expected:
          "aromaticityInvariantAtomIds is claimed only on a sequence with at least two states",
        actual:
          `sequence ${sequence.id} claims ${invariant.size} invariant atom(s) over ` +
          `${sequence.states.length} state(s). There is no step to hold the claim across`,
        fixture: `${sequence.file}#seq:${sequence.id}`,
      });
    }

    for (const atomId of invariant) {
      const absentFrom = sequence.states
        .filter((state) => !state.atomIds.has(atomId))
        .map((state) => `state:${state.index}`);
      if (absentFrom.length > 0) {
        failures.push({
          expected: `atom ${atomId}, named in aromaticityInvariantAtomIds, exists in every state of the sequence`,
          actual: `it is absent from ${absentFrom.join(", ")}, so the claim names an atom that is not there`,
          fixture: `${sequence.file}#seq:${sequence.id}`,
        });
      }
    }

    const read = sequence.states.map((state) => readState(state, resultByRef, failures));
    for (let index = 0; index + 1 < read.length; index += 1) {
      const before = read[index];
      const after = read[index + 1];
      if (before === undefined || after === undefined) continue;
      compareBoundary(sequence, before, after, invariant, failures, adjudications);
    }
  }

  return { failures, adjudications };
}

export const oracleAromaticityStability: Check = {
  name: CHECK_NAME,
  description:
    "perceived aromaticity holds across every step an author declared it invariant over, and every other change is adjudicated",

  async run(context): Promise<CheckResult> {
    const run = await oracleRun(context);
    if (run.kind === "unusable") return failed([unusableFailure(CHECK_NAME, null)]);

    const evaluation = evaluateAromaticity(run.data.corpus.sequences, run.data.resultByRef);
    const notMeasurable = toNotMeasurable(CHECK_NAME, evaluation.adjudications);

    if (evaluation.failures.length > 0) {
      return failed(evaluation.failures, { notMeasurable });
    }
    return passed({ notMeasurable });
  },
};
