import {
  conservedTotals,
  membersWithRole,
  speciesCharge,
  type MechanismState,
} from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";

/**
 * CHECK 3. The formal charge sum is conserved across every step, over the full species
 * multiset rather than over the substrate.
 *
 * This is docs/VERIFICATION.md B5 made executable, and it is the single assertion that
 * decides whether the corpus is red from the first fixture for a modelling reason. Charge
 * conservation holds only over a closed system. Mechanism drawings are open: a student
 * protonating a carbonyl with hydronium takes the proton from a species that is often not
 * drawn. Track the substrate alone and every protonation in the corpus reports a
 * violation, and the loop spends its five iterations on a modelling error.
 *
 * So the scope is `conservedTotals`, which totals over `participatingMembers`: every
 * species present, minus those explicitly declared spectators.
 *
 * THE SECOND FAILURE LINE.
 *
 * When the multiset charge fails, this check also totals charge over the members whose
 * role is "substrate". If THAT total is conserved, it emits a second failure line saying
 * so. Same reasoning as the S5 line in mass.ts: the line can only appear on a fixture
 * where the substrate only implementation would have reported conservation, so it is
 * evidence that this check is the multiset one rather than the substrate one.
 *
 * WHAT THIS CHECK IS NOT INDEPENDENT OF.
 *
 * Under a conserved nuclide multiset, `valenceElectronCount` is
 * sum(element valence electrons and implicit hydrogens) minus charge, so the first term
 * is fixed and a charge change is exactly a valence electron change. Charge conservation
 * and electron count conservation are therefore the same equation seen from two sides
 * whenever mass holds, and a fixture cannot break one without breaking the other. They
 * are separate checks because they name different causes to a student, not because they
 * are independent evidence. This is written down rather than hidden, so the fixture
 * declaring both in mustFail reads as intended rather than as sloppy.
 */

function substrateCharge(state: MechanismState): number {
  return membersWithRole(state, "substrate").reduce(
    (total, member) => total + speciesCharge(member.species),
    0,
  );
}

const find: ViolationFinder = (fixture) => {
  const violations: Violation[] = [];

  for (const step of fixture.pathway.steps) {
    const before = conservedTotals(step.from);
    const after = conservedTotals(step.to);

    if (before.charge === after.charge) continue;

    violations.push({
      where: `${step.id} (${step.from.id} to ${step.to.id})`,
      expected: `total formal charge ${before.charge} over ${before.countedSpeciesIds.length} participating species`,
      actual: `${after.charge} over ${after.countedSpeciesIds.length} participating species, a change of ${after.charge - before.charge}`,
      cause: "charge_not_conserved",
    });

    // Only meaningful when both states actually carry a substrate. When one side has no
    // member with that role, the two totals are both zero and would compare equal for a
    // bookkeeping reason rather than a chemical one, and the diagnostic would be a lie.
    const substrateBefore = substrateCharge(step.from);
    const substrateAfter = substrateCharge(step.to);
    const bothHaveSubstrate =
      membersWithRole(step.from, "substrate").length > 0 &&
      membersWithRole(step.to, "substrate").length > 0;
    if (bothHaveSubstrate && substrateBefore === substrateAfter) {
      violations.push({
        where: `${step.id} (${step.from.id} to ${step.to.id})`,
        expected: "the change to show up on the substrate, where a substrate only check would find it",
        actual:
          `it does not. Substrate charge is ${substrateBefore} either side. The change lives ` +
          `elsewhere in the multiset, which is exactly the case docs/VERIFICATION.md B5 says a ` +
          `substrate only charge check reports as conserved`,
        cause: "charge_not_conserved",
      });
    }
  }

  return violations;
};

export const conservationCharge: Check = conservationCheck({
  name: "conservation-charge",
  description:
    "the sum of declared formal charges is identical either side of every step, totalled over the full participating species multiset and never over the substrate alone",
  find,
});
