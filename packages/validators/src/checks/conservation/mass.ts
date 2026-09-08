import {
  atomNuclideKey,
  conservedTotals,
  nuclideDifference,
  participatingMembers,
  type MechanismState,
  type NuclideCounts,
} from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";
import { formatNuclides, formatSignedNuclides } from "./shared.ts";

/**
 * CHECK 2. Mass is conserved across every step, counting implicit hydrogens.
 *
 * Mass is a multiset of nuclei, compared exactly. It is never a sum of atomic weights.
 * bookkeeping.ts states the reason and it is worth restating where the comparison
 * actually happens: floating point sums of standard atomic weights do not compare equal,
 * so a weight based check needs a tolerance, and a tolerance is a number somebody widens
 * at 2am to make one fixture pass. There is no tolerance in this file and nowhere to put
 * one.
 *
 * Isotopes are separate nuclides, so a deuterium labelling experiment that loses the
 * label and gains a protium is caught here rather than balancing.
 *
 * THE S5 TRAP, AND THE SECOND FAILURE LINE THIS CHECK EMITS.
 *
 * docs/VERIFICATION.md S5: a proton transfer changes implicit hydrogen counts on two
 * atoms and touches nothing else, so a mass check walking the explicit atom list reports
 * conservation while the system silently gained or lost a proton. `nuclideCounts` folds
 * implicit hydrogens in, so the real comparison catches it.
 *
 * That alone does not prove this check is not the naive one. So when the nuclide totals
 * disagree, this check also computes the explicit atom walk, and when THAT walk agrees it
 * emits a second, separate failure line saying so. The line is the evidence: it can only
 * appear on a fixture where the naive implementation would have reported conservation.
 *
 * Scope is `participatingMembers`, which is the system boundary rule from CLAUDE.md.
 * Declared spectators are excluded here on purpose, and whether that exclusion is doing
 * load bearing work is conservation-spectator-declaration's job, not this one's.
 */

/**
 * The naive implementation, kept deliberately.
 *
 * This is the bug S5 describes, written out so it can be run alongside the real check and
 * reported against. It walks the explicit atom list and never looks at
 * `implicitHydrogens`. Nothing calls it except the diagnostic below.
 */
function explicitAtomsOnly(state: MechanismState): NuclideCounts {
  const counts: Record<string, number> = {};
  for (const member of participatingMembers(state)) {
    for (const atom of member.species.atoms) {
      const key = atomNuclideKey(atom);
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

const find: ViolationFinder = (fixture) => {
  const violations: Violation[] = [];

  for (const step of fixture.pathway.steps) {
    const before = conservedTotals(step.from).nuclides;
    const after = conservedTotals(step.to).nuclides;
    const difference = nuclideDifference(before, after);

    if (Object.keys(difference).length === 0) continue;

    violations.push({
      where: `${step.id} (${step.from.id} to ${step.to.id})`,
      expected: `nuclide multiset ${formatNuclides(before)} over the participating members`,
      actual: `${formatNuclides(after)}, a difference of ${formatSignedNuclides(difference)}`,
      cause: "mass_not_conserved",
    });

    const naiveDifference = nuclideDifference(explicitAtomsOnly(step.from), explicitAtomsOnly(step.to));
    if (Object.keys(naiveDifference).length === 0) {
      violations.push({
        where: `${step.id} (${step.from.id} to ${step.to.id})`,
        expected:
          "the difference to be visible in the explicit atom list, where a naive mass check would find it",
        actual:
          `it is not. The explicit atoms balance exactly and the whole difference of ` +
          `${formatSignedNuclides(difference)} lives in implicit hydrogen counts. ` +
          `This is docs/VERIFICATION.md S5: a mass check walking explicit atoms reports ` +
          `conservation here`,
        cause: "implicit_hydrogen_changed_without_arrow",
      });
    }
  }

  return violations;
};

export const conservationMass: Check = conservationCheck({
  name: "conservation-mass",
  description:
    "the nuclide multiset, implicit hydrogens included, is identical either side of every step, compared exactly and never by atomic weight",
  find,
});
