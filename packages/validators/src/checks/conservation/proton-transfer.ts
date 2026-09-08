import { isSpectator, type MechanismState, type MechanismStep } from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";

/**
 * CHECK 5. Every proton source and every proton sink is a declared, participating member
 * of the multiset.
 *
 * CLAUDE.md, the system boundary rule: a species not in the multiset cannot donate or
 * accept anything. In practice students and authors write the acid above the arrow and
 * leave it out of the drawing, and the substrate quietly gains a proton from the word
 * "H2SO4" written in the margin. This check is what says so by name.
 *
 * HOW A PROTON IS TRACKED.
 *
 * Every non hydrogen atom is a carrier. Its attached hydrogen count is its implicit
 * hydrogens plus the explicit hydrogen atoms bonded to it. Both terms matter: a proton
 * transfer drawn with explicit hydrogens moves a bond, and one drawn with implicit
 * hydrogens moves nothing but two integers, and a check that watches only one of the two
 * sees half the corpus.
 *
 * An atom on only one side of a step counts as zero attached hydrogens on the missing
 * side, so its hydrogens stay in the budget rather than vanishing from the arithmetic
 * along with the atom.
 *
 * Then, per step: total hydrogens gained must equal total hydrogens lost, and every atom
 * on either side of that transfer must live in a species that is a participating member.
 *
 * WHAT IS NOT TRACKED, STATED RATHER THAN LEFT TO BE DISCOVERED.
 *
 * Hydrogen bonded to hydrogen. H2 is not a proton carrier in this model, and H2
 * homolysis is a radical step rather than a proton transfer, so counting it here would
 * report a proton with no donor on correct chemistry. Mass and electron flow cover it.
 *
 * WHAT THIS CHECK IS NOT INDEPENDENT OF, STATED FOR THE SAME REASON.
 *
 * In a closed multiset model, a proton arriving from a species that is not present is
 * also a nuclide that appeared from nowhere, so conservation-mass fires on the same
 * fixture, and usually conservation-charge too. Check 5 cannot be made to fail in
 * isolation and no attempt has been made to force it. Its value is the named cause: mass
 * says an atom appeared, and this says which species should have been drawn holding it.
 * That difference is the feedback specificity axis in CLAUDE.md, not decoration.
 */

interface Carrier {
  readonly speciesId: string;
  readonly attached: number;
  readonly spectator: boolean;
}

function carriers(state: MechanismState): Map<string, Carrier> {
  const out = new Map<string, Carrier>();

  for (const member of state.members) {
    const species = member.species;
    const spectator = isSpectator(state, species.id);
    const elementOf = new Map<string, string>();
    for (const atom of species.atoms) elementOf.set(atom.id, atom.element);

    const bondedHydrogens = new Map<string, number>();
    for (const bond of species.bonds) {
      if (elementOf.get(bond.b) === "H" && elementOf.get(bond.a) !== "H") {
        bondedHydrogens.set(bond.a, (bondedHydrogens.get(bond.a) ?? 0) + 1);
      }
      if (elementOf.get(bond.a) === "H" && elementOf.get(bond.b) !== "H") {
        bondedHydrogens.set(bond.b, (bondedHydrogens.get(bond.b) ?? 0) + 1);
      }
    }

    for (const atom of species.atoms) {
      if (atom.element === "H") continue;
      out.set(atom.id, {
        speciesId: species.id,
        attached: atom.implicitHydrogens + (bondedHydrogens.get(atom.id) ?? 0),
        spectator,
      });
    }
  }

  return out;
}

interface Movement {
  readonly atomId: string;
  readonly delta: number;
  readonly fromSpeciesId: string;
  readonly toSpeciesId: string;
  readonly spectator: boolean;
}

function violationsInStep(step: MechanismStep): Violation[] {
  const violations: Violation[] = [];
  const where = `${step.id} (${step.from.id} to ${step.to.id})`;

  const before = carriers(step.from);
  const after = carriers(step.to);

  const movements: Movement[] = [];
  for (const atomId of new Set<string>([...before.keys(), ...after.keys()])) {
    const beforeCarrier = before.get(atomId);
    const afterCarrier = after.get(atomId);
    const delta = (afterCarrier?.attached ?? 0) - (beforeCarrier?.attached ?? 0);
    if (delta === 0) continue;
    movements.push({
      atomId,
      delta,
      fromSpeciesId: beforeCarrier?.speciesId ?? "(absent from the from state)",
      toSpeciesId: afterCarrier?.speciesId ?? "(absent from the to state)",
      spectator: (beforeCarrier?.spectator ?? false) || (afterCarrier?.spectator ?? false),
    });
  }

  if (movements.length === 0) return violations;

  movements.sort((left, right) => left.atomId.localeCompare(right.atomId));

  const gained = movements.filter((movement) => movement.delta > 0);
  const lost = movements.filter((movement) => movement.delta < 0);
  const gainedTotal = gained.reduce((total, movement) => total + movement.delta, 0);
  const lostTotal = -lost.reduce((total, movement) => total + movement.delta, 0);

  const describe = (list: readonly Movement[]): string =>
    list.length === 0
      ? "none"
      : list
          .map(
            (movement) =>
              `${movement.atomId} in ${movement.delta > 0 ? movement.toSpeciesId : movement.fromSpeciesId} ` +
              `${movement.delta > 0 ? "+" : ""}${movement.delta}`,
          )
          .join(", ");

  if (gainedTotal > lostTotal) {
    violations.push({
      where,
      expected: `${gainedTotal} hydrogen(s) released by species present in this state`,
      actual:
        `only ${lostTotal} released. Gained: ${describe(gained)}. Released: ${describe(lost)}. ` +
        `${gainedTotal - lostTotal} proton(s) arrived from a species that is not a participating member`,
      cause: "proton_source_not_in_state",
    });
  }

  if (lostTotal > gainedTotal) {
    violations.push({
      where,
      expected: `${lostTotal} hydrogen(s) accepted by species present in this state`,
      actual:
        `only ${gainedTotal} accepted. Released: ${describe(lost)}. Gained: ${describe(gained)}. ` +
        `${lostTotal - gainedTotal} proton(s) left to a species that is not a participating member`,
      cause: "proton_sink_not_in_state",
    });
  }

  for (const movement of movements) {
    if (!movement.spectator) continue;
    violations.push({
      where: `${where} / atom ${movement.atomId}`,
      expected:
        "a proton source or sink is a participating member, since a declared spectator is " +
        "excluded from the books on the promise that it does not take part",
      actual:
        `its attached hydrogen count changes by ${movement.delta > 0 ? "+" : ""}${movement.delta} ` +
        `while ${movement.delta > 0 ? movement.toSpeciesId : movement.fromSpeciesId} is declared a spectator`,
      cause: movement.delta > 0 ? "proton_sink_not_in_state" : "proton_source_not_in_state",
    });
  }

  return violations;
}

const find: ViolationFinder = (fixture) => {
  const violations: Violation[] = [];
  for (const step of fixture.pathway.steps) violations.push(...violationsInStep(step));
  return violations;
};

export const conservationProtonTransfer: Check = conservationCheck({
  name: "conservation-proton-transfer",
  description:
    "every hydrogen gained by an atom is released by another atom in a participating member of the same state, counting implicit and explicit hydrogens alike",
  find,
});
