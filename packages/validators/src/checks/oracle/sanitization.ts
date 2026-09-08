import type { Check, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import type { Adjudication, Evaluation } from "./adjudication.ts";
import { toNotMeasurable } from "./adjudication.ts";
import type { CorpusState } from "./corpus.ts";
import type { SanitizationMayFail, SpeciesResult } from "./payload.ts";
import { oracleRun, unusableFailure, type ResultByRef } from "./run.ts";

/**
 * CHECK: RDKit sanitisation succeeds on every state, or fails exactly as declared.
 *
 * Sanitisation is RDKit's own consistency pass: valence, kekulisation, aromaticity
 * perception, and ring perception. It is the gate every other number in a SpeciesResult
 * sits behind, because CONTRACT.md has the sidecar report null for everything downstream
 * of a sanitisation failure rather than a number it could not compute.
 *
 * THE FOUR CASES, from CONTRACT.md, "Declaring that sanitisation may fail". Two of them
 * are failures, one is an adjudication item, one is an ordinary pass.
 *
 *   sanitises, nothing declared        pass
 *   fails,     nothing declared        FAILURE
 *   fails,     declared, class matches ADJUDICATION, for a human
 *   fails,     declared, class differs FAILURE, the declaration covered another problem
 *   sanitises, declared                FAILURE, a stale escape hatch becomes a blanket one
 *
 * The adjudication row is the one CLAUDE.md licenses: "RDKit's aromaticity perception is
 * a model, not ground truth, and legitimate reactive intermediates can fail its
 * sanitization." A declaration is the recorded, attackable act that says so, in the same
 * spirit as a spectator declaration in chem-core. It is not a skip, and the two failure
 * rows around it are what keep it from becoming one.
 *
 * BUILD ERRORS ARE ALWAYS FAILURES AND ARE NEVER DECLARABLE. A stereo slot naming an atom
 * the centre is not bonded to, a bond naming an atom that is not there, a slot count that
 * is not four: those are data errors in the corpus, not chemistry RDKit has an opinion
 * about, and no declaration covers them.
 */

const CHECK_NAME = "oracle-sanitization";

/** Fields CONTRACT.md requires to be null or empty when sanitisation failed. */
function reportedSomethingItCouldNotCompute(species: SpeciesResult): string[] {
  const reported: string[] = [];
  if (species.canonicalSmiles !== null) reported.push(`canonicalSmiles ${species.canonicalSmiles}`);
  if (species.meso !== null) reported.push("meso");
  if (species.aromaticRingCount !== null) reported.push(`aromaticRingCount ${species.aromaticRingCount}`);
  if (species.atomDescriptors.length > 0) reported.push(`${species.atomDescriptors.length} atom descriptor(s)`);
  if (species.bondDescriptors.length > 0) reported.push(`${species.bondDescriptors.length} bond descriptor(s)`);
  if (species.aromaticAtomIds.length > 0) reported.push(`${species.aromaticAtomIds.length} aromatic atom(s)`);
  return reported;
}

function describeDeclaration(declaration: SanitizationMayFail | null): string {
  if (declaration === null) return "no declaration";
  return (
    `expectedError ${declaration.expectedError}, declaredBy ${declaration.declaredBy}, ` +
    `justification of ${declaration.justification.length} character(s)`
  );
}

/** Null when the two say the same thing. Otherwise the one difference, named. */
function declarationDifference(
  corpus: SanitizationMayFail | null,
  echoed: SanitizationMayFail | null,
): string | null {
  if (corpus === null && echoed === null) return null;
  if (corpus === null) return `the sidecar echoed a declaration the corpus does not carry: ${describeDeclaration(echoed)}`;
  if (echoed === null) return "the sidecar echoed no declaration at all";
  const fields = ["expectedError", "justification", "declaredBy"] as const;
  const different = fields.filter((field) => corpus[field] !== echoed[field]);
  if (different.length === 0) return null;
  return different
    .map((field) => `${field} was ${JSON.stringify(corpus[field])} and came back ${JSON.stringify(echoed[field])}`)
    .join("; ");
}

export function evaluateSanitization(
  states: readonly CorpusState[],
  resultByRef: ResultByRef,
): Evaluation {
  const failures: CheckFailure[] = [];
  const adjudications: Adjudication[] = [];

  for (const state of states) {
    const result = resultByRef.get(state.stateRef);
    if (result === undefined) {
      failures.push({
        expected: "a sidecar result for every corpus state",
        actual: "none came back",
        fixture: state.stateRef,
      });
      continue;
    }

    for (const buildError of result.buildErrors) {
      failures.push({
        expected: "every species translates into an RDKit molecule",
        actual: buildError,
        fixture: state.stateRef,
      });
    }

    if (result.species.length + result.buildErrors.length !== state.species.length) {
      failures.push({
        expected: `${state.species.length} species either analysed or reported as a build error`,
        actual: `${result.species.length} analysed plus ${result.buildErrors.length} build error(s)`,
        fixture: state.stateRef,
      });
    }

    const declaration = state.sanitizationMayFail;

    // The echo is cross checked against the corpus rather than trusted. Every verdict
    // below is taken from the corpus copy, so a sidecar that lost or invented a
    // declaration cannot change a verdict without this line firing.
    //
    // Field by field, not by serialising both sides. The sidecar writes its JSON with
    // sort_keys=True and the corpus is authored in reading order, so a string comparison
    // reports every declaration in the corpus as altered. That is not a hypothetical: it
    // is what this check did on first run, and it turned the one negative fixture that
    // must NOT fail the suite red for a reason that had nothing to do with chemistry.
    const echoMismatch = declarationDifference(declaration, result.sanitizationMayFail ?? null);
    if (echoMismatch !== null) {
      failures.push({
        expected: `the declaration echoed back unchanged: ${describeDeclaration(declaration)}`,
        actual: echoMismatch,
        fixture: state.stateRef,
      });
    }

    const corpusSpeciesIds = new Set(state.species.map((one) => one.id));
    let failedCount = 0;

    for (const species of result.species) {
      if (!corpusSpeciesIds.has(species.id)) {
        failures.push({
          expected: "results only for species that were sent",
          actual: `a result came back for species ${species.id}, which is not in this state`,
          fixture: state.stateRef,
        });
      }

      const sanitization = species.sanitization;
      if (sanitization === undefined || typeof sanitization.ok !== "boolean") {
        failures.push({
          expected: "every species result carries a sanitization verdict",
          actual: `species ${species.id} carries none`,
          fixture: state.stateRef,
        });
        continue;
      }

      if (sanitization.ok) continue;
      failedCount += 1;

      const overreported = reportedSomethingItCouldNotCompute(species);
      if (overreported.length > 0) {
        failures.push({
          expected:
            "nothing downstream of a failed sanitisation is reported, per CONTRACT.md",
          actual: `species ${species.id} did not sanitise yet reported ${overreported.join(", ")}`,
          fixture: state.stateRef,
        });
      }

      const kind = sanitization.errorKind ?? "unknown";
      const message = sanitization.error ?? "no message";

      if (declaration === null) {
        failures.push({
          expected: `species ${species.id} sanitises, or carries a sanitizationMayFail declaration`,
          actual: `${kind}: ${message}`,
          fixture: state.stateRef,
        });
        continue;
      }

      if (kind !== declaration.expectedError) {
        failures.push({
          expected: `the declared failure ${declaration.expectedError} on species ${species.id}`,
          actual:
            `${kind}: ${message}. The declaration covered a different problem than the ` +
            `one that occurred, so it does not cover this`,
          fixture: state.stateRef,
        });
        continue;
      }

      adjudications.push({
        category: "declared-sanitization-failure",
        where: `${state.stateRef} species:${species.id}`,
        finding:
          `RDKit raised ${kind} exactly as declared by ${declaration.declaredBy}. ` +
          `Message: ${message}. Justification on file: ${declaration.justification} ` +
          `A human decides whether this is a legitimate reactive intermediate that ` +
          `RDKit's model refuses, or a modelling error in the corpus.`,
      });
    }

    if (declaration !== null && failedCount === 0 && result.buildErrors.length === 0) {
      failures.push({
        expected:
          "a sanitizationMayFail declaration covers a sanitisation that actually fails",
        actual:
          `every species in this state sanitised cleanly, so the declaration by ` +
          `${declaration.declaredBy} for ${declaration.expectedError} is stale. ` +
          `CONTRACT.md: a stale escape hatch is how an escape hatch becomes a blanket one`,
        fixture: state.stateRef,
      });
    }
  }

  return { failures, adjudications };
}

export const oracleSanitization: Check = {
  name: CHECK_NAME,
  description:
    "RDKit sanitises every corpus state, or fails with the exact exception class the author declared",

  async run(context): Promise<CheckResult> {
    const run = await oracleRun(context);
    if (run.kind === "unusable") return failed([unusableFailure(CHECK_NAME, null)]);

    const evaluation = evaluateSanitization(run.data.corpus.states, run.data.resultByRef);
    const notMeasurable = toNotMeasurable(CHECK_NAME, evaluation.adjudications);

    if (evaluation.failures.length > 0) {
      return failed(evaluation.failures, { notMeasurable });
    }
    return passed({ notMeasurable });
  },
};
