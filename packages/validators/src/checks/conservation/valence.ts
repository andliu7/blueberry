import {
  bondOrderSumAt,
  connectedComponentCount,
  danglingBondIds,
  derivedFormalCharge,
  duplicateAtomIds,
  duplicateSpeciesIds,
  elementProperties,
  nonbondingElectrons,
  speciesIdOccurrences,
  valenceElectronsAround,
  type MechanismState,
} from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";
import { labelledStates } from "./shared.ts";

/**
 * CHECK 1. Valence is satisfied for every atom, given its formal charge, in every state.
 *
 * Three assertions per atom, in the order they matter.
 *
 * 1. The declared formal charge equals the one the structure implies.
 *
 *    chem-core stores `atom.formalCharge` rather than always deriving it, and atom.ts
 *    says why: when the declaration and the structure disagree, one of the two is wrong,
 *    and deriving it silently would delete the signal. This check is the thing that reads
 *    that signal. It is also what makes "given its formal charge" mean something. Without
 *    it, an author could write any charge they liked and the octet arithmetic would still
 *    come out even.
 *
 * 2. Valence electrons around the atom do not exceed the element's ceiling.
 *
 *    `maxValenceElectrons` is a hard ceiling, not an expectation. Six around a
 *    carbocation carbon is fine and is not reported. Ten around a carbon is not.
 *    Bonding electrons are counted in full at both ends, which is the octet convention;
 *    `valenceElectronsAround` already does that, and mixing it up with the formal charge
 *    convention is the classic way to build a check that fires on correct structures.
 *
 * 3. Electron and hydrogen counts are not negative.
 *
 *    An atom with -1 implicit hydrogens is a missing atom rather than a shorthand.
 *
 * Plus four structural preconditions, in this check because every one of them silently
 * corrupts the arithmetic above rather than announcing itself: a bond naming an atom the
 * species does not contain still contributes its order to `bondOrderSumAt`, an atom id
 * appearing in two species makes state wide lookup return whichever came first, a species
 * id appearing on two members does the same thing one level up, and a Species holding two
 * disconnected fragments cannot be given separate roles or declared a spectator
 * separately, which breaks the multiset accounting the other six checks stand on.
 *
 * THE FOURTH ONE, SPECIES ID UNIQUENESS, AND WHY IT LIVES HERE.
 *
 * state.ts states the invariant in prose at the top of the file: "Two equivalents of
 * methanol are two members with two different SpeciesIds, not one member with count: 2...
 * A count field makes the two indistinguishable." Until the Phase 0 adversary went looking,
 * nothing enforced that sentence, and
 * good-adversarial-sn2-with-a-duplicated-species-id-silently-double-counted is the fixture
 * that demonstrated it. Its own note says where the assertion belongs: "It belongs next to
 * duplicateAtomIds in valence.ts."
 *
 * It belongs next to `duplicateAtomIds` because it is the same failure one level up and it
 * has the same two sided shape. `findSpecies` and `findMember` resolve to whichever member
 * `Array.find` reaches first, so the second copy is invisible to every lookup in the
 * engine, including the structural identity comparison inside
 * conservation-spectator-declaration. `conservedTotals` walks `state.members` directly, so
 * the second copy is fully counted in mass, charge, and electrons. Half the engine can see
 * it and half cannot.
 *
 * It survived the corpus because the adversary's fixture kept both copies unchanged across
 * the step, so the double counted contribution was identical on both sides and cancelled.
 * Nothing noticed the duplication, and mass and charge passed by coincidence rather than
 * by inspection. That is the shape of a check that is not checking.
 *
 * NON MAIN GROUP ELEMENTS ARE REJECTED, NOT SKIPPED.
 *
 * elements.ts marks Zn and Cu with `mainGroup: false` and says a validator should not
 * reason about the octet there. The honest response is not to wave those atoms through.
 * A fixture containing one is reported as something this check has no model for, which is
 * a visible refusal rather than a silent pass. When transition metal electron counting is
 * modelled, this becomes a real assertion and the refusal goes away.
 */

function violationsInState(label: string, state: MechanismState): Violation[] {
  const violations: Violation[] = [];

  for (const atomId of duplicateAtomIds(state)) {
    violations.push({
      where: `${label} / atom ${atomId}`,
      expected: "each atom id appears in exactly one species in a state",
      actual: "it appears in more than one, so state wide atom lookup is ambiguous",
      cause: "arrow_endpoint_not_in_state",
    });
  }

  for (const speciesId of duplicateSpeciesIds(state)) {
    const copies = speciesIdOccurrences(state, speciesId);
    violations.push({
      where: `${label} / species ${speciesId}`,
      expected: "each species id names exactly one member of a state",
      actual:
        `${copies} members carry it. Multiplicity is repetition with distinct ids, not one id ` +
        `written ${copies} times. findSpecies and findMember resolve to the first member only, ` +
        `so ${copies - 1} of them are invisible to every lookup while conservedTotals counts ` +
        `all ${copies}`,
      cause: "duplicate_species_id_in_state",
    });
  }

  for (const member of state.members) {
    const species = member.species;

    for (const bondId of danglingBondIds(species)) {
      violations.push({
        where: `${label} / species ${species.id} / bond ${bondId}`,
        expected: "both ends of a bond name atoms this species contains",
        actual: "at least one end names an atom that is not here, so every count at that end is wrong",
        cause: "arrow_endpoint_not_in_state",
      });
    }

    const components = connectedComponentCount(species);
    if (components !== 1) {
      violations.push({
        where: `${label} / species ${species.id}`,
        expected: "connected component count 1",
        actual:
          `${components}. A Species is one connected molecule or ion; two fragments in one ` +
          `Species cannot be given separate roles or declared spectators separately`,
        cause: "mass_not_conserved",
      });
    }

    for (const atom of species.atoms) {
      const where = `${label} / species ${species.id} / atom ${atom.id} (${atom.element})`;
      const properties = elementProperties(atom.element);

      if (atom.lonePairs < 0) {
        violations.push({
          where,
          expected: "lonePairs >= 0",
          actual: `lonePairs ${atom.lonePairs}`,
          cause: "electron_count_not_integral",
        });
      }
      if (atom.unpairedElectrons < 0) {
        violations.push({
          where,
          expected: "unpairedElectrons >= 0",
          actual: `unpairedElectrons ${atom.unpairedElectrons}`,
          cause: "electron_count_not_integral",
        });
      }
      if (atom.implicitHydrogens < 0) {
        violations.push({
          where,
          expected: "implicitHydrogens >= 0",
          actual: `implicitHydrogens ${atom.implicitHydrogens}`,
          cause: "impossible_hydrogen_count",
        });
      }

      if (!properties.mainGroup) {
        violations.push({
          where,
          expected: "a main group element, which is what this check has a model for",
          actual:
            `${atom.element} is marked mainGroup: false in the chem-core element table, so ` +
            `neither the octet rule nor the formal charge formula is trustworthy on it. ` +
            `This check refuses it rather than passing it silently`,
          cause: "valence_exceeded",
        });
        continue;
      }

      const derived = derivedFormalCharge(species, atom.id);
      if (derived !== atom.formalCharge) {
        violations.push({
          where,
          expected: `formal charge ${derived}, from ${properties.valenceElectrons} valence electrons minus ${nonbondingElectrons(atom)} nonbonding minus ${bondOrderSumAt(species, atom.id)} bond order`,
          actual: `the atom declares formal charge ${atom.formalCharge}`,
          cause: "formal_charge_disagrees_with_structure",
        });
      }

      const around = valenceElectronsAround(species, atom.id);
      if (around > properties.maxValenceElectrons) {
        violations.push({
          where,
          expected: `at most ${properties.maxValenceElectrons} valence electrons around it`,
          actual: `${around}`,
          cause:
            properties.period === 2 && properties.maxValenceElectrons === 8
              ? "octet_expanded_on_period_two"
              : "valence_exceeded",
        });
      }
    }
  }

  return violations;
}

const find: ViolationFinder = (fixture) => {
  const violations: Violation[] = [];
  for (const { label, state } of labelledStates(fixture.pathway)) {
    violations.push(...violationsInState(label, state));
  }
  return violations;
};

export const conservationValence: Check = conservationCheck({
  name: "conservation-valence",
  description:
    "every atom in every state satisfies valence given its declared formal charge, and the declared charge matches the one the structure implies",
  find,
});
