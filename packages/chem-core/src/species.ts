/**
 * A Species is one connected molecule or ion.
 *
 * Connectivity is a rule about a Species, not a thing this file enforces at
 * construction time. `connectedComponentCount` is provided so a validator can
 * assert it and so an adversary can build a fixture that violates it. A
 * constructor that threw would make that fixture unbuildable, which would mean
 * the check could never be shown to fail on broken input, which is the one thing
 * VERIFICATION.md calls the highest leverage instruction in the whole set.
 */

import type { Atom } from "./atom.js";
import type { Bond } from "./bond.js";
import { bondTouches, otherEnd } from "./bond.js";
import type { AtomId, BondId, SpeciesId } from "./ids.js";

/**
 * A torsion angle the author asserts, in degrees.
 *
 * E2 needs a dihedral. Rather than requiring full 3D coordinates on every atom
 * of every problem, an author can state the one torsion the mechanism turns on
 * and say why. `justification` is required because a stated torsion that nobody
 * defended is a number a validator will trust and a student will be graded
 * against.
 *
 * Zero degrees is syn periplanar, 180 is anti periplanar.
 */
export interface DeclaredTorsion {
  readonly atoms: readonly [AtomId, AtomId, AtomId, AtomId];
  readonly degrees: number;
  readonly justification: string;
}

export interface Species {
  readonly id: SpeciesId;
  /** Human readable name for debugging and for feedback text. Not an identity. */
  readonly label?: string;
  readonly atoms: readonly Atom[];
  readonly bonds: readonly Bond[];
  readonly declaredTorsions?: readonly DeclaredTorsion[];
}

export interface SpeciesInput {
  readonly id: SpeciesId;
  readonly label?: string;
  readonly atoms: readonly Atom[];
  readonly bonds?: readonly Bond[];
  readonly declaredTorsions?: readonly DeclaredTorsion[];
}

export function createSpecies(input: SpeciesInput): Species {
  return Object.freeze({
    id: input.id,
    atoms: Object.freeze([...input.atoms]),
    bonds: Object.freeze([...(input.bonds ?? [])]),
    ...(input.label === undefined ? {} : { label: input.label }),
    ...(input.declaredTorsions === undefined
      ? {}
      : { declaredTorsions: Object.freeze([...input.declaredTorsions]) }),
  });
}

export function findAtom(species: Species, atomId: AtomId): Atom | undefined {
  return species.atoms.find((atom) => atom.id === atomId);
}

/** Same as `findAtom`, but throws. For call sites that have already checked. */
export function requireAtom(species: Species, atomId: AtomId): Atom {
  const atom = findAtom(species, atomId);
  if (atom === undefined) {
    throw new Error(`Species ${species.id} has no atom ${atomId}`);
  }
  return atom;
}

export function findBond(species: Species, bondId: BondId): Bond | undefined {
  return species.bonds.find((bond) => bond.id === bondId);
}

export function requireBond(species: Species, bondId: BondId): Bond {
  const bond = findBond(species, bondId);
  if (bond === undefined) {
    throw new Error(`Species ${species.id} has no bond ${bondId}`);
  }
  return bond;
}

/** The bond joining two atoms, if there is one. */
export function findBondBetween(species: Species, a: AtomId, b: AtomId): Bond | undefined {
  return species.bonds.find(
    (bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a),
  );
}

export function bondsAt(species: Species, atomId: AtomId): readonly Bond[] {
  return species.bonds.filter((bond) => bondTouches(bond, atomId));
}

/** Neighbour atom ids. Implicit hydrogens are not in here; they have no id. */
export function neighborIds(species: Species, atomId: AtomId): readonly AtomId[] {
  return bondsAt(species, atomId).map((bond) => otherEnd(bond, atomId));
}

/**
 * Bonds naming an atom this Species does not contain.
 *
 * Should always be empty. A dangling bond makes every downstream count wrong in
 * a way that reads as a chemistry error rather than a data error, so it is worth
 * being able to report it by name.
 */
export function danglingBondIds(species: Species): readonly BondId[] {
  const known = new Set<AtomId>(species.atoms.map((atom) => atom.id));
  return species.bonds
    .filter((bond) => !known.has(bond.a) || !known.has(bond.b))
    .map((bond) => bond.id);
}

/**
 * How many disconnected fragments this Species contains.
 *
 * One is the only correct answer for a well formed Species. Zero means it has no
 * atoms. Anything above one means two molecules were packed into one Species,
 * which breaks the multiset accounting in state.ts because they can no longer be
 * given separate roles or declared spectators separately.
 */
export function connectedComponentCount(species: Species): number {
  if (species.atoms.length === 0) return 0;

  const adjacency = new Map<AtomId, AtomId[]>();
  for (const atom of species.atoms) {
    adjacency.set(atom.id, []);
  }
  for (const bond of species.bonds) {
    adjacency.get(bond.a)?.push(bond.b);
    adjacency.get(bond.b)?.push(bond.a);
  }

  const seen = new Set<AtomId>();
  let components = 0;

  for (const atom of species.atoms) {
    if (seen.has(atom.id)) continue;
    components += 1;
    const stack: AtomId[] = [atom.id];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || seen.has(current)) continue;
      seen.add(current);
      for (const next of adjacency.get(current) ?? []) {
        if (!seen.has(next)) stack.push(next);
      }
    }
  }

  return components;
}
