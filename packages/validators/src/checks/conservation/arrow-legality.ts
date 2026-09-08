import { arrowLegalityFindings, type MechanismStep } from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";

/**
 * CHECK 5. Every arrow, taken one at a time, is an arrow that can be drawn.
 *
 * WHY THIS IS A SEPARATE CHECK FROM conservation-electron-flow.
 *
 * The two are asking different questions about the same arrows, and the Phase 0 adversary
 * proved the difference is not academic.
 *
 *   conservation-electron-flow asks: do all the arrows TOGETHER account for the structural
 *   change between the two states? It compares `declaredDeltas` against `observedDeltas`.
 *   Both sides are aggregates keyed by atom id and by unordered atom pair.
 *
 *   this check asks: is EACH arrow, on its own, something a chemist could draw? It never
 *   looks at the `to` state at all.
 *
 * good-adversarial-sn2-with-swapped-arrows-producing-identical-declared-deltas is the
 * fixture that separates them. It takes a correct SN2 and replaces the two correct arrows
 * with two individually impossible ones, chosen so their combined declared total is bit
 * for bit identical to the correct pair's. The aggregate comparison therefore reports
 * nothing, and cannot report anything, because summation destroyed the per arrow
 * information before the comparison ran. No amount of work inside deltas.ts fixes that.
 * The second question has to be asked separately, which is what this file does.
 *
 * The rules and the argument for each of them are at the top of
 * packages/chem-core/src/legality.ts, next to the code that implements them. They are
 * stated there rather than here on purpose: CLAUDE.md gives chem-core "arrow legality" as
 * one of its jobs, so the rule set is engine behaviour that the browser runs on every
 * interaction inside the 100 ms budget, and this check is the thing that grades it against
 * the corpus. A validator that reimplemented the rules would be grading its own arithmetic.
 *
 * ONE DELIBERATE OVERLAP WITH conservation-electron-flow, WRITTEN DOWN.
 *
 * Both checks report an arrow endpoint that does not resolve in the `from` state.
 * electron-flow reports it because it must resolve bond ids before `declaredDeltas` can be
 * called without throwing. This check reports it because an arrow anchored to nothing is
 * the first way an arrow can fail to be drawable, and staying silent about it here to
 * avoid a duplicate line would mean the legality rule set has a hole in its first rule.
 *
 * family.ts requires a cascade like that to be written down: a fixture with an unresolved
 * endpoint must name BOTH checks in `expect.mustFail`, or it fails the one it did not
 * declare. That is the intended behaviour and it is why this paragraph exists. No fixture
 * in the corpus currently has an unresolved endpoint.
 *
 * WHAT A GREEN RUN HERE DOES NOT MEAN.
 *
 * Adjacency is geometry, not reactivity. It cannot tell a legitimate pi bond attack from
 * an arrow with the same shape that hands a departing bond's pair straight to a nucleophile
 * that never donated anything, because those two are the same shape. Ranking the two ends
 * of a bond by which is the electrophile is reactivity modelling and is a different family.
 * legality.ts says the same thing at the point where it stops.
 */

function violationsInStep(step: MechanismStep): Violation[] {
  const where = `${step.id} (arrows resolve against ${step.from.id})`;

  return arrowLegalityFindings(step.arrows, step.from).map((finding) => ({
    where: `${where} / arrow ${finding.arrowId} [${finding.rule}]`,
    expected: finding.expected,
    actual: finding.actual,
    cause: finding.cause,
  }));
}

const find: ViolationFinder = (fixture) => {
  const violations: Violation[] = [];
  for (const step of fixture.pathway.steps) violations.push(...violationsInStep(step));
  return violations;
};

export const conservationArrowLegality: Check = conservationCheck({
  name: "conservation-arrow-legality",
  description:
    "every arrow starts on electron density that exists, moves no more of it than is there, and has a source site and a sink site that share an atom",
  find,
});
