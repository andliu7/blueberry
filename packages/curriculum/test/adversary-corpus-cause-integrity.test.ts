/**
 * ADVERSARY FINDING: an authored distractor's declared `cause` field can drift
 * from what the real checker actually reports, and neither `createProblem` nor
 * the curriculum-corpus validator check catches it.
 *
 * `Distractor.cause` in problem.ts is documented as "Optional classification,
 * for counting which mistakes a corpus anticipates. It never affects matching.
 * Matching is on state." That is true, and it is also the reason nothing
 * verifies the field is honest: `createProblem` re-runs `checkAnswer` on every
 * distractor to confirm it grades "wrong", but it never compares the resulting
 * verdict's `cause` against the author's own `cause` claim. The validator
 * check in packages/validators/src/checks/curriculum/corpus.ts re-runs the same
 * two soundness properties `createProblem` already enforces (grades wrong, no
 * two distractors collide) and has the identical gap.
 *
 * The seed corpus already carries one live instance: `org1-sn2-predict-product`'s
 * "alkoxide-product" distractor declares `cause: "structure_charge_differs"`,
 * but ethoxide differs from ethanol by a missing proton, so
 * `structureAreEquivalent`'s formula check fires first and the real checker
 * reports `structure_molecular_formula_differs`. `structure.test.ts` documents
 * this exact ordering directly ("names a charge difference where the formula
 * also differs by the proton... The charge cause is what fires when the atoms
 * match and the charge does not"), which makes the mismatch on this specific
 * distractor traceable to a rule the corpus itself already knows and simply did
 * not apply when writing the declared `cause`.
 *
 * This matters because CLAUDE.md's feedback axis is measured as "count of
 * distinct named failure causes, percentage of wrong attempts resolving to a
 * named cause", and `Distractor.cause` is the field a report would reach for to
 * answer "which mistakes does this corpus anticipate". A field that can silently
 * disagree with the checker corrupts that count without ever failing a build.
 */

import { describe, expect, it } from "vitest";
import { checkAnswer } from "../src/answer.ts";
import { SEED_CORPUS } from "../src/corpus/index.ts";

describe("every distractor's declared cause matches what the real checker reports", () => {
  it("has no distractor whose declared cause disagrees with checkAnswer's verdict", () => {
    const mismatches: string[] = [];
    for (const problem of SEED_CORPUS) {
      for (const distractor of problem.distractors) {
        if (distractor.cause === undefined) continue;
        const verdict = checkAnswer(problem.answer, distractor.state);
        if (verdict.outcome === "wrong" && verdict.cause !== distractor.cause) {
          mismatches.push(
            `${problem.id}/${distractor.id}: declared "${distractor.cause}", checker says "${verdict.cause}"`,
          );
        }
      }
    }

    // This is the failing assertion. Today it fails with exactly one entry:
    // org1-sn2-predict-product/alkoxide-product, per the file header above.
    expect(mismatches).toEqual([]);
  });
});
