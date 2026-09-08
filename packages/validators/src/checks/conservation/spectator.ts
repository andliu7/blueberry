import {
  conservedTotals,
  findSpecies,
  isSpectator,
  nuclideDifference,
  orphanSpectatorDeclarations,
  type MechanismState,
  type MechanismStep,
  type Species,
} from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";
import { formatSignedNuclides, labelledStates } from "./shared.ts";

/**
 * CHECK 6. Spectator declarations are well formed, and the exclusion is not what makes
 * conservation pass.
 *
 * CLAUDE.md allows spectators and then says the important half: declaring one is an
 * explicit, recorded act that a validator can see and an adversary can attack. This check
 * is both halves. The first four assertions are hygiene. The fifth is the attack surface,
 * and it is the reason this check exists at all.
 *
 * 1. A declaration names a species that is actually in the state. A declaration pointing
 *    at nothing is either a typo or a pre authorisation to exclude something added later.
 *
 * 2. No species is declared twice in one state.
 *
 * 3. Every declaration carries a justification and a name for who made the call. Both are
 *    required by state.ts and both are read by humans, not machines. An empty
 *    justification is an exclusion nobody can argue with later.
 *
 * 4. A species declared a spectator is declared on both sides of a step and is
 *    structurally identical on both sides. state.ts names this invariant and gives it a
 *    cause: spectator_changed_during_step. A spectator that changes is not a spectator,
 *    and a species excluded on one side only is an exclusion that moves the books by
 *    itself.
 *
 * 5. THE ATTACK. Conservation is recomputed with the spectators put back in. If the step
 *    conserves mass, charge, and electrons with spectators excluded but fails with them
 *    included, then the exclusion is load bearing: the declaration is not describing a
 *    molecule that sits out, it is hiding the difference. That is reported in full, with
 *    the quantity and the size of the difference, because it is the one way a correct
 *    looking corpus can be built on a lie and the other six checks will all pass.
 *
 * 6. THE SECOND ATTACK, added after the Phase 0 adversary walked through the gap between
 *    assertions 4 and 5. The whole declared spectator POPULATION is compared across the
 *    step as a multiset of structures, not id by id.
 *
 * This check reads `conservedTotals(..., { includeSpectators: true })`, which is the
 * option bookkeeping.ts says exists for exactly this caller.
 *
 * WHY ASSERTION 6 IS NOT COVERED BY 4 OR BY 5, WHICH IS THE WHOLE POINT OF IT.
 *
 * broken-spectator-declaration-laundering-a-redox-transfer-through-two-swapped-counterions
 * moves one electron from a sodium to a fluorine, with no arrow anywhere, and hides it by
 * giving the before and after form of each atom a DIFFERENT species id: `donor-before` and
 * `acceptor-before` are declared spectators in the from state, `donor-after` and
 * `acceptor-after` in the to state.
 *
 *   Assertion 4 never sees it. It loops over species ids and compares each id against
 *   itself in the two states. `donor-before` has no counterpart named `donor-before` in
 *   the to state, so the comparison it would have made does not happen. An id that appears
 *   on one side only is not compared with anything.
 *
 *   Assertion 5 never sees it either, and this is the sharper half. It totals every
 *   declared spectator into one aggregate per side. Sodium's charge rises by one as it
 *   loses its radical electron and fluorine's charge falls by one as it gains one, so the
 *   two moves cancel inside the aggregate and the totals with spectators included are
 *   identical on both sides. A sum over a set cannot see a transfer within the set. That
 *   is a property of summation, not a bug in the arithmetic, so the fix cannot be a better
 *   sum. It has to be a comparison that keeps the species apart.
 *
 * Assertion 6 is that comparison. Each declared spectator is canonicalised on its own and
 * the two sides are compared as multisets, so a species appearing on one side only is a
 * finding whatever some other species did to compensate for it. Atom ids are part of the
 * canonical form, which is what makes the id swap visible: ids.ts guarantees atom ids are
 * stable across a step, so a genuine spectator carries the same atom ids on both sides and
 * a relabelled one does not.
 *
 * This is strictly stronger than assertion 4 for anything it can see, and assertion 4 is
 * kept anyway because when the id IS the same on both sides it names the species and prints
 * the two structures side by side, which is a better failure line than "one of these was on
 * one side only".
 */

/**
 * A canonical string for a species, for the "did the spectator change" comparison.
 *
 * Bond IDs are deliberately left out. ids.ts: bond ids are not stable across a step,
 * because a bond that breaks and a bond that forms are different bonds, and bonds are
 * matched by their endpoint atom ids. Comparing bond ids would report a spectator as
 * changed because somebody renumbered it. Atom ids ARE stable and are compared.
 */
function canonicalise(species: Species): string {
  const atoms = [...species.atoms]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(
      (atom) =>
        `${atom.id}:${atom.element}:${atom.isotope ?? "-"}:q${atom.formalCharge}` +
        `:lp${atom.lonePairs}:e${atom.unpairedElectrons}:h${atom.implicitHydrogens}`,
    );
  const bonds = [...species.bonds]
    .map((bond) => (bond.a < bond.b ? `${bond.a}|${bond.b}#${bond.order}` : `${bond.b}|${bond.a}#${bond.order}`))
    .sort();
  return `atoms[${atoms.join(",")}] bonds[${bonds.join(",")}]`;
}

/**
 * The declared spectators of one state, as a multiset of canonical structures.
 *
 * Keyed by structure rather than by species id, which is the entire mechanism of
 * assertion 6: a laundering attack keeps the structures and changes the ids, so a
 * comparison keyed by id is exactly the comparison it was built to slip past.
 *
 * A declaration naming a species that is not a member is skipped rather than counted as a
 * missing structure. It is already reported by assertion 1 as an orphan, and counting it
 * here as well would print the same typo twice under two different explanations.
 */
function spectatorStructures(state: MechanismState): Map<string, number> {
  const counts = new Map<string, number>();
  for (const declaration of state.spectators) {
    const species = findSpecies(state, declaration.speciesId);
    if (species === undefined) continue;
    const key = canonicalise(species);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function hygieneViolations(label: string, state: MechanismState): Violation[] {
  const violations: Violation[] = [];

  for (const declaration of orphanSpectatorDeclarations(state)) {
    violations.push({
      where: `${label} / spectator declaration for ${declaration.speciesId}`,
      expected: "the declared species to be a member of this state",
      actual:
        "no member has that species id. A declaration pointing at nothing is a typo, or a " +
        "pre authorisation to exclude something that gets added later",
      cause: "spectator_declared_without_justification",
    });
  }

  const seen = new Set<string>();
  for (const declaration of state.spectators) {
    if (seen.has(declaration.speciesId)) {
      violations.push({
        where: `${label} / spectator declaration for ${declaration.speciesId}`,
        expected: "one declaration per species per state",
        actual: "this species is declared a spectator more than once here",
        cause: "spectator_declared_without_justification",
      });
    }
    seen.add(declaration.speciesId);

    if (declaration.justification.trim() === "") {
      violations.push({
        where: `${label} / spectator declaration for ${declaration.speciesId}`,
        expected: `a non empty justification, alongside reason "${declaration.reason}"`,
        actual:
          "the justification is empty. Excluding something from the books is a decision, and " +
          "an undefended decision cannot be argued with later",
        cause: "spectator_declared_without_justification",
      });
    }
    if (declaration.declaredBy.trim() === "") {
      violations.push({
        where: `${label} / spectator declaration for ${declaration.speciesId}`,
        expected: "a non empty declaredBy, naming the author, problem, or tool that decided",
        actual: "it is empty, so nobody owns this exclusion",
        cause: "spectator_declared_without_justification",
      });
    }
  }

  return violations;
}

function stepViolations(step: MechanismStep): Violation[] {
  const violations: Violation[] = [];
  const where = `${step.id} (${step.from.id} to ${step.to.id})`;

  const declaredSpeciesIds = new Set<string>([
    ...step.from.spectators.map((declaration) => declaration.speciesId),
    ...step.to.spectators.map((declaration) => declaration.speciesId),
  ]);

  for (const speciesId of [...declaredSpeciesIds].sort()) {
    const before = findSpecies(step.from, speciesId);
    const after = findSpecies(step.to, speciesId);

    if (before !== undefined && after !== undefined) {
      const declaredBefore = isSpectator(step.from, speciesId);
      const declaredAfter = isSpectator(step.to, speciesId);
      if (declaredBefore !== declaredAfter) {
        violations.push({
          where: `${where} / species ${speciesId}`,
          expected: "a species present on both sides is declared a spectator on both sides or neither",
          actual:
            `it is a spectator in ${declaredBefore ? step.from.id : step.to.id} and a participant in ` +
            `${declaredBefore ? step.to.id : step.from.id}, so the totals either side are taken over ` +
            `different sets and the comparison is not like for like`,
          cause: "spectator_changed_during_step",
        });
      }

      const canonicalBefore = canonicalise(before);
      const canonicalAfter = canonicalise(after);
      if (canonicalBefore !== canonicalAfter) {
        violations.push({
          where: `${where} / species ${speciesId}`,
          expected: `a declared spectator is structurally identical on both sides: ${canonicalBefore}`,
          actual: `${canonicalAfter}. A spectator that changes is not a spectator`,
          cause: "spectator_changed_during_step",
        });
      }
    }
  }

  // ASSERTION 6. THE SECOND ATTACK. Compare the whole declared spectator population
  // across the step as a multiset of structures, so that a transfer between two spectators
  // cannot cancel inside an aggregate and an id swap cannot dodge the id keyed comparison
  // above. See the long note at the top of this file for why neither 4 nor 5 reaches this.
  const structuresBefore = spectatorStructures(step.from);
  const structuresAfter = spectatorStructures(step.to);
  const structureKeys = [
    ...new Set<string>([...structuresBefore.keys(), ...structuresAfter.keys()]),
  ].sort();

  for (const key of structureKeys) {
    const countBefore = structuresBefore.get(key) ?? 0;
    const countAfter = structuresAfter.get(key) ?? 0;
    if (countBefore === countAfter) continue;

    const onlySide = countBefore > countAfter ? step.from : step.to;
    const namesOnThatSide = onlySide.spectators
      .filter((declaration) => {
        const species = findSpecies(onlySide, declaration.speciesId);
        return species !== undefined && canonicalise(species) === key;
      })
      .map((declaration) => declaration.speciesId)
      .sort()
      .join(", ");

    violations.push({
      where: `${where} / declared spectator structure ${key}`,
      expected:
        `the same count on both sides, since a spectator by definition is the same molecule ` +
        `before and after: ${countBefore} in ${step.from.id}`,
      actual:
        `${countAfter} in ${step.to.id}. It is declared as ${namesOnThatSide || "(no id)"} on the ` +
        `${countBefore > countAfter ? step.from.id : step.to.id} side only. A spectator that is ` +
        `present on one side of a step and gone from the other took part in the step, whatever ` +
        `id it was given. Comparing ids alone misses this, and so does any total over the ` +
        `spectator set, because a transfer inside that set cancels within the sum`,
      cause: "spectator_changed_during_step",
    });
  }

  if (declaredSpeciesIds.size === 0) return violations;

  // THE ATTACK. Is excluding the spectators what makes this step balance?
  const excludedFrom = conservedTotals(step.from);
  const excludedTo = conservedTotals(step.to);
  const includedFrom = conservedTotals(step.from, { includeSpectators: true });
  const includedTo = conservedTotals(step.to, { includeSpectators: true });

  const excludedNuclides = nuclideDifference(excludedFrom.nuclides, excludedTo.nuclides);
  const includedNuclides = nuclideDifference(includedFrom.nuclides, includedTo.nuclides);

  const excludedBalances =
    Object.keys(excludedNuclides).length === 0 &&
    excludedFrom.charge === excludedTo.charge &&
    excludedFrom.valenceElectrons === excludedTo.valenceElectrons;

  if (!excludedBalances) return violations;

  const problems: string[] = [];
  if (Object.keys(includedNuclides).length !== 0) {
    problems.push(`mass by ${formatSignedNuclides(includedNuclides)}`);
  }
  if (includedFrom.charge !== includedTo.charge) {
    problems.push(`charge by ${includedTo.charge - includedFrom.charge}`);
  }
  if (includedFrom.valenceElectrons !== includedTo.valenceElectrons) {
    problems.push(`valence electrons by ${includedTo.valenceElectrons - includedFrom.valenceElectrons}`);
  }

  if (problems.length > 0) {
    violations.push({
      where: `${where} / spectators ${[...declaredSpeciesIds].sort().join(", ")}`,
      expected:
        "the step to conserve mass, charge, and electrons whether the declared spectators are " +
        "counted or not, since a spectator by definition changes nothing",
      actual:
        `it balances only with them excluded. Put them back and it fails on ${problems.join("; ")}. ` +
        `The exclusion is load bearing, so the declaration is hiding the difference rather than ` +
        `describing a molecule that sits out`,
      cause: "spectator_changed_during_step",
    });
  }

  return violations;
}

const find: ViolationFinder = (fixture) => {
  const violations: Violation[] = [];
  for (const { label, state } of labelledStates(fixture.pathway)) {
    violations.push(...hygieneViolations(label, state));
  }
  for (const step of fixture.pathway.steps) {
    violations.push(...stepViolations(step));
  }
  return violations;
};

export const conservationSpectatorDeclaration: Check = conservationCheck({
  name: "conservation-spectator-declaration",
  description:
    "every declared spectator is present, justified, owned, unchanged across the step, matched one for one by structure on both sides, and not the reason the step balances",
  find,
});
