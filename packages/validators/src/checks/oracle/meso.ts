import type { Check, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import type { Adjudication, Evaluation } from "./adjudication.ts";
import { toNotMeasurable } from "./adjudication.ts";
import type { CorpusSequence } from "./corpus.ts";
import { oracleRun, unusableFailure, type ResultByRef } from "./run.ts";

/**
 * CHECK: authored meso expectations match RDKit's answer.
 *
 * CLAUDE.md names meso detection as one of the two things the RDKit oracle exists for,
 * alongside CIP descriptors, and names the fixture that makes it matter: "Br2 addition to
 * cis-2-butene gives the racemic 2,3-dibromobutane pair; to trans-2-butene it gives the
 * meso compound. If an implementation swaps these, it has a sign error in the addition
 * geometry." Meso versus chiral-diastereomer is the difference between those two answers,
 * and it is invisible to mass, charge, and valence conservation. Nothing else in the
 * suite would notice a swap.
 *
 * WHAT MESO MEANS HERE, from CONTRACT.md: at least two defined tetrahedral centres, and a
 * canonical SMILES equal to the canonical SMILES of the mirror image. The two centre
 * floor matters. A molecule with no stereocentres is achiral rather than meso, and
 * without the floor a fixture with no stereochemistry at all would satisfy a meso
 * expectation, which is a green check over an empty claim.
 *
 * The sidecar's `isMeso` is recomputed here from the three values it reports alongside
 * it. That is not distrust for its own sake: `isMeso` is one boolean, and a boolean is
 * exactly the kind of value that can be wrong in a way no other number in the response
 * contradicts.
 *
 * EXPECTATIONS ARE REQUIRED IN GROUPS. CONTRACT.md: `expect.meso` is required to be
 * present on every species in a sequence that any meso expectation appears in. A species
 * that quietly lost its expectation is otherwise indistinguishable from one that never
 * had a claim to make, and the check would report green over a claim that has gone
 * missing.
 */

const CHECK_NAME = "oracle-meso-detection";

export function evaluateMeso(
  sequences: readonly CorpusSequence[],
  resultByRef: ResultByRef,
): Evaluation {
  const failures: CheckFailure[] = [];
  const adjudications: Adjudication[] = [];

  for (const sequence of sequences) {
    const anyExpectation = sequence.states.some((state) =>
      state.species.some((species) => species.expectMeso !== null),
    );

    for (const state of sequence.states) {
      const result = resultByRef.get(state.stateRef);
      if (result === undefined) {
        if (anyExpectation) {
          failures.push({
            expected: "a sidecar result for every state carrying a meso expectation",
            actual: "none came back",
            fixture: state.stateRef,
          });
        }
        continue;
      }

      const analysed = new Map(result.species.map((one) => [one.id, one]));

      for (const species of state.species) {
        if (anyExpectation && species.expectMeso === null) {
          failures.push({
            expected: `an expect.meso claim on species ${species.id}`,
            actual:
              "it carries none, while other species in this sequence do. CONTRACT.md " +
              "requires the claim on every species in a sequence any meso expectation " +
              "appears in, so a species that lost its expectation is visible",
            fixture: state.stateRef,
          });
          continue;
        }
        if (species.expectMeso === null) continue;

        const analysis = analysed.get(species.id);
        if (analysis === undefined) {
          failures.push({
            expected: `species ${species.id} analysed so its meso claim can be checked`,
            actual:
              "the species produced no result at all, so expect.meso " +
              `${species.expectMeso} was never verified`,
            fixture: state.stateRef,
          });
          continue;
        }

        if (!analysis.sanitization.ok) {
          adjudications.push({
            category: "not-comparable",
            where: `${state.stateRef} species:${species.id}`,
            finding:
              `expect.meso ${species.expectMeso} could not be compared against RDKit, ` +
              `because this species did not sanitise ` +
              `(${analysis.sanitization.errorKind ?? "unknown"}). The sanitisation check ` +
              `owns the verdict on the state. This expectation remains unverified.`,
          });
          continue;
        }

        const meso = analysis.meso;
        if (meso === null || meso === undefined) {
          failures.push({
            expected: `a meso result for species ${species.id}, which sanitised cleanly`,
            actual: "the sidecar reported none",
            fixture: state.stateRef,
          });
          continue;
        }

        const recomputed =
          meso.definedTetrahedralCenters >= 2 &&
          meso.canonicalSmiles === meso.mirrorCanonicalSmiles;
        if (recomputed !== meso.isMeso) {
          failures.push({
            expected: `isMeso recomputed from the reported values: ${recomputed}`,
            actual:
              `the sidecar reported isMeso ${meso.isMeso} with ` +
              `${meso.definedTetrahedralCenters} defined centre(s), ` +
              `SMILES ${meso.canonicalSmiles} against mirror ${meso.mirrorCanonicalSmiles}`,
            fixture: state.stateRef,
          });
          continue;
        }

        if (meso.isMeso !== species.expectMeso) {
          failures.push({
            expected: `species ${species.id} isMeso ${species.expectMeso}`,
            actual:
              `RDKit says ${meso.isMeso}: ${meso.definedTetrahedralCenters} defined ` +
              `tetrahedral centre(s), canonical ${meso.canonicalSmiles}, ` +
              `mirror ${meso.mirrorCanonicalSmiles}`,
            fixture: state.stateRef,
          });
        }
      }
    }
  }

  return { failures, adjudications };
}

export const oracleMesoDetection: Check = {
  name: CHECK_NAME,
  description:
    "every authored expect.meso equals RDKit's canonical SMILES against mirror image answer",

  async run(context): Promise<CheckResult> {
    const run = await oracleRun(context);
    if (run.kind === "unusable") return failed([unusableFailure(CHECK_NAME, null)]);

    const evaluation = evaluateMeso(run.data.corpus.sequences, run.data.resultByRef);
    const notMeasurable = toNotMeasurable(CHECK_NAME, evaluation.adjudications);

    if (evaluation.failures.length > 0) {
      return failed(evaluation.failures, { notMeasurable });
    }
    return passed({ notMeasurable });
  },
};
