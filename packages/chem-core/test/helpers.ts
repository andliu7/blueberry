/**
 * Small builders shared by the chem-core unit tests.
 *
 * Not a fixture format. packages/validators owns the JSON fixture corpus and the reasons
 * it is inert data rather than code. These are the opposite thing: throwaway structures
 * built inline so one test can say one thing. Anything that needs to survive a review
 * belongs in the validator corpus, not here.
 */

import { createAtom, type Atom, type AtomInput } from "../src/atom.ts";
import { createBond, type Bond } from "../src/bond.ts";
import { createSpecies, type Species } from "../src/species.ts";
import { createState, type MechanismState, type SpeciesRole, type StateMember } from "../src/state.ts";

export function atom(id: string, element: AtomInput["element"], rest: Omit<AtomInput, "id" | "element"> = {}): Atom {
  return createAtom({ id, element, ...rest });
}

export function bond(id: string, a: string, b: string, order: 1 | 2 | 3 = 1): Bond {
  return createBond({ id, a, b, order });
}

export function species(id: string, atoms: readonly Atom[], bonds: readonly Bond[] = []): Species {
  return createSpecies({ id, atoms, bonds });
}

export function member(species: Species, role: SpeciesRole = "substrate"): StateMember {
  return { species, role };
}

export function state(id: string, members: readonly StateMember[]): MechanismState {
  return createState({ id, members });
}

/** Methane, all four hydrogens implicit. The smallest thing with a non zero H count. */
export function methane(id = "sp-methane"): Species {
  return species(id, [atom("c1", "C", { implicitHydrogens: 4 })]);
}

/** Hydroxide. One oxygen, three lone pairs, one implicit hydrogen, charge minus one. */
export function hydroxide(id = "sp-hydroxide"): Species {
  return species(id, [atom("o1", "O", { formalCharge: -1, lonePairs: 3, implicitHydrogens: 1 })]);
}

/** Chloromethane, drawn with the C-Cl bond explicit so an arrow can source it. */
export function chloromethane(id = "sp-chloromethane"): Species {
  return species(
    id,
    [atom("c1", "C", { implicitHydrogens: 3 }), atom("cl1", "Cl", { lonePairs: 3 })],
    [bond("b1", "c1", "cl1")],
  );
}
