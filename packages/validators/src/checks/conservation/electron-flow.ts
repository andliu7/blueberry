import {
  conservedTotals,
  declaredDeltas,
  deltaMismatches,
  findAtomInState,
  observedDeltas,
  referencedAtomIds,
  referencedBondIds,
  type MechanismStep,
} from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";

/**
 * CHECK 4. Electron count is conserved, and every arrow's declared source, sink, and
 * count matches the bond and lone pair deltas the two states actually show.
 *
 * This is the one check in the family that compares two independently produced things.
 * `declaredDeltas` reads only the arrows and says what they claim. `observedDeltas` reads
 * only the two states and says what changed. Neither function knows about the other, and
 * chem-core deliberately provides no way to compute the product state from the arrows,
 * because if it did the arrows would agree with the product by construction and this
 * check would be verifying nothing. arrows.ts says so at the top and it is the reason the
 * comparison means anything.
 *
 * Everything is counted in electrons, not bond orders. A bond order change of one is a
 * bonding electron change of two, and two fishhooks into one place are two changes of one
 * electron each. No halves, no rounding, no tolerance.
 *
 * FOUR ASSERTIONS PER STEP.
 *
 * 1. Every arrow endpoint resolves in the `from` state. All arrow ids resolve against
 *    `from`, including sinks, because a bond forming arrow names two atoms that are not
 *    yet bonded. An unresolved endpoint is reported and the step is still compared, so
 *    one broken reference does not hide a second, unrelated disagreement.
 *
 *    Bond sources are resolved BEFORE calling `declaredDeltas`, which throws on a bond id
 *    it cannot find. A throw would be turned into a whole check failure by family.ts with
 *    no per fixture detail, so the reference is checked first and the comparison is only
 *    attempted once the ids are known to resolve. That is not a skip: the unresolved
 *    reference has already been recorded as a violation of this same check.
 *
 * 2. No atom appears or disappears across the step. Atom ids are stable across a step,
 *    which is the invariant in ids.ts that the entire delta comparison rests on. An atom
 *    present on only one side means the two delta sets are describing different systems
 *    and comparing them is meaningless rather than merely wrong.
 *
 * 3. `deltaMismatches` is empty. Note that implicit hydrogen deltas are always declared
 *    as zero, because no arrow can express a change in undrawn hydrogens. Any observed
 *    implicit hydrogen change therefore appears here standing alone, which is the S5 bug
 *    caught in the act and the named cause is implicit_hydrogen_changed_without_arrow.
 *
 * 4. Total valence electrons are conserved over the participating multiset. Arrows move
 *    electrons, they never make them.
 *
 *    Assertion 4 is not independent of conservation-charge. See the note in charge.ts:
 *    with a conserved nuclide multiset the two are the same equation. It is asserted here
 *    anyway because it is the statement a student is told, and because the two stop being
 *    equivalent the moment mass is also broken.
 */

function violationsInStep(step: MechanismStep): Violation[] {
  const violations: Violation[] = [];
  const where = `${step.id} (${step.from.id} to ${step.to.id})`;

  const knownBondIds = new Set<string>();
  for (const member of step.from.members) {
    for (const bond of member.species.bonds) knownBondIds.add(bond.id);
  }

  let everyReferenceResolves = true;

  for (const arrow of step.arrows) {
    for (const atomId of referencedAtomIds(arrow)) {
      if (findAtomInState(step.from, atomId) === undefined) {
        everyReferenceResolves = false;
        violations.push({
          where: `${where} / arrow ${arrow.id}`,
          expected: `atom ${atomId} to be present in the from state`,
          actual: "it is not in any species there, so the arrow is anchored to nothing",
          cause: "arrow_endpoint_not_in_state",
        });
      }
    }
    for (const bondId of referencedBondIds(arrow)) {
      if (!knownBondIds.has(bondId)) {
        everyReferenceResolves = false;
        violations.push({
          where: `${where} / arrow ${arrow.id}`,
          expected: `bond ${bondId} to be present in the from state`,
          actual: "it is not, so there is no electron pair for this arrow to move",
          cause: "arrow_endpoint_not_in_state",
        });
      }
    }
  }

  const observed = observedDeltas(step.from, step.to);

  for (const atomId of observed.atomsRemoved) {
    violations.push({
      where: `${where} / atom ${atomId}`,
      expected: "atom ids are stable across a step, so every atom in from is also in to",
      actual: "it is absent from the to state",
      cause: "species_disappeared_without_sink",
    });
  }
  for (const atomId of observed.atomsAdded) {
    violations.push({
      where: `${where} / atom ${atomId}`,
      expected: "atom ids are stable across a step, so every atom in to was also in from",
      actual: "it is absent from the from state",
      cause: "species_appeared_without_source",
    });
  }

  if (everyReferenceResolves) {
    const declared = declaredDeltas(step.arrows, step.from);

    for (const mismatch of deltaMismatches(declared, observed)) {
      const target =
        mismatch.target.kind === "atom"
          ? `atom ${mismatch.target.atomId}`
          : `atom pair ${mismatch.target.atomIds[0]}-${mismatch.target.atomIds[1]}`;

      const cause =
        mismatch.quantity === "implicitHydrogens"
          ? "implicit_hydrogen_changed_without_arrow"
          : mismatch.declared === 0
            ? "bond_change_without_arrow"
            : "arrow_count_disagrees_with_deltas";

      violations.push({
        where: `${where} / ${target}`,
        expected: `${mismatch.quantity} change of ${mismatch.declared}, which is what the ${step.arrows.length} arrow(s) claim`,
        actual: `the two states show ${mismatch.observed}`,
        cause,
      });
    }
  }

  const before = conservedTotals(step.from).valenceElectrons;
  const after = conservedTotals(step.to).valenceElectrons;
  if (before !== after) {
    violations.push({
      where,
      expected: `${before} valence electrons over the participating members`,
      actual: `${after}, a change of ${after - before}. Arrows move electrons, they never make them`,
      cause: "electron_count_not_conserved",
    });
  }

  return violations;
}

const find: ViolationFinder = (fixture) => {
  const violations: Violation[] = [];
  for (const step of fixture.pathway.steps) violations.push(...violationsInStep(step));
  return violations;
};

export const conservationElectronFlow: Check = conservationCheck({
  name: "conservation-electron-flow",
  description:
    "what the arrows declare and what the two states show are computed independently and agree exactly, and total valence electrons are conserved across every step",
  find,
});
