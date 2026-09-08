/**
 * A State is a multiset of Species. This is the system boundary rule.
 *
 * CLAUDE.md and VERIFICATION.md B5 both say why, and it is worth repeating at
 * the type that implements it: conservation is asserted over the multiset, not
 * over the substrate. Protonation and deprotonation are the two most common
 * steps in the corpus and neither conserves charge on the substrate alone. A
 * model that tracks one molecule reports a charge violation on every correct
 * protonation, and the suite is red from the first fixture for a modelling
 * reason rather than an implementation one.
 *
 * MULTIPLICITY IS REPETITION, NOT A COUNT FIELD.
 *
 * Two equivalents of methanol are two members with two different SpeciesIds, not
 * one member with `count: 2`. That costs a little memory and buys the thing the
 * whole engine needs: when one of the two reacts, an arrow can name the atom it
 * reacted at. A count field makes the two indistinguishable, and an arrow into
 * "one of the two methanols" cannot be checked against a bond delta.
 *
 * ROLE LIVES ON THE MEMBERSHIP, NOT ON THE SPECIES.
 *
 * "Substrate" is a job a molecule holds in one reaction. Water is the solvent in
 * one problem and the nucleophile in the next. Putting `role` on Species would
 * make the same molecule two different objects for no chemical reason.
 */

import type { Species } from "./species.js";
import { findAtom, findBond, findBondBetween } from "./species.js";
import type { Atom } from "./atom.js";
import type { Bond } from "./bond.js";
import type { AtomId, BondId, SpeciesId, StateId } from "./ids.js";

export type SpeciesRole =
  | "substrate"
  | "reagent"
  | "nucleophile"
  | "electrophile"
  | "acid"
  | "base"
  | "catalyst"
  | "counterion"
  | "solvent"
  | "intermediate"
  | "leaving_group"
  | "product"
  | "byproduct";

export interface StateMember {
  readonly species: Species;
  readonly role: SpeciesRole;
}

/**
 * Why a species is excluded from conservation.
 *
 * A named enum rather than prose, so a validator can group by it, a report can
 * count it, and an adversary can go looking for the reason that gets abused. The
 * prose lives alongside in `justification`, which is for the human reading the
 * failure, not for the machine.
 */
export type SpectatorReason =
  | "inert_solvent"
  | "unreacting_counterion"
  | "bulk_medium"
  | "authored_simplification";

/**
 * An explicit, recorded act of excluding a species from conservation.
 *
 * Not a boolean on Species, and not implicit in a role. CLAUDE.md requires that
 * declaring a spectator be something a validator can see and an adversary can
 * attack, and a flag buried in a molecule is neither: it does not say who
 * decided, or why, and it travels with the molecule into problems where it is
 * not true.
 *
 * The invariant a validator must enforce, which is the reason this is safe at
 * all: a declared spectator must be structurally identical in both states of any
 * step it is declared across. A spectator that changes is not a spectator, and
 * `spectator_changed_during_step` is the named cause for it.
 */
export interface SpectatorDeclaration {
  readonly speciesId: SpeciesId;
  readonly reason: SpectatorReason;
  /** Why this is genuinely a spectator here. Required. Read by humans. */
  readonly justification: string;
  /** Who made the call. A problem id, an author, or a tool name. */
  readonly declaredBy: string;
}

export interface MechanismState {
  readonly id: StateId;
  readonly members: readonly StateMember[];
  readonly spectators: readonly SpectatorDeclaration[];
}

export interface MechanismStateInput {
  readonly id: StateId;
  readonly members: readonly StateMember[];
  readonly spectators?: readonly SpectatorDeclaration[];
}

export function createState(input: MechanismStateInput): MechanismState {
  return Object.freeze({
    id: input.id,
    members: Object.freeze([...input.members]),
    spectators: Object.freeze([...(input.spectators ?? [])]),
  });
}

export function isSpectator(state: MechanismState, speciesId: SpeciesId): boolean {
  return state.spectators.some((declaration) => declaration.speciesId === speciesId);
}

export function spectatorDeclarationFor(
  state: MechanismState,
  speciesId: SpeciesId,
): SpectatorDeclaration | undefined {
  return state.spectators.find((declaration) => declaration.speciesId === speciesId);
}

/** Members that conservation is asserted over. Spectators are excluded. */
export function participatingMembers(state: MechanismState): readonly StateMember[] {
  return state.members.filter((member) => !isSpectator(state, member.species.id));
}

export function spectatorMembers(state: MechanismState): readonly StateMember[] {
  return state.members.filter((member) => isSpectator(state, member.species.id));
}

/**
 * Spectator declarations naming a species that is not in the state.
 *
 * Should always be empty. A declaration pointing at nothing is either a typo or
 * an attempt to pre-authorise excluding something that gets added later, and
 * both are worth naming.
 */
export function orphanSpectatorDeclarations(
  state: MechanismState,
): readonly SpectatorDeclaration[] {
  const present = new Set<SpeciesId>(state.members.map((member) => member.species.id));
  return state.spectators.filter((declaration) => !present.has(declaration.speciesId));
}

export function findSpecies(state: MechanismState, speciesId: SpeciesId): Species | undefined {
  return state.members.find((member) => member.species.id === speciesId)?.species;
}

export function findMember(state: MechanismState, speciesId: SpeciesId): StateMember | undefined {
  return state.members.find((member) => member.species.id === speciesId);
}

export interface AtomLocation {
  readonly species: Species;
  readonly atom: Atom;
}

/**
 * Locate an atom anywhere in the state.
 *
 * Atom ids are unique across the whole state, not just within a species. That is
 * what lets an arrow name a source in one molecule and a sink in another without
 * carrying a species id on every endpoint.
 */
export function findAtomInState(state: MechanismState, atomId: AtomId): AtomLocation | undefined {
  for (const member of state.members) {
    const atom = findAtom(member.species, atomId);
    if (atom !== undefined) {
      return { species: member.species, atom };
    }
  }
  return undefined;
}

/**
 * Atom ids that appear in more than one species in this state.
 *
 * Should always be empty. A duplicate id makes `findAtomInState` return whichever
 * molecule happens to be first in the list, which is a bug that shows up as
 * chemistry going wrong in one molecule and not the other.
 */
export function duplicateAtomIds(state: MechanismState): readonly AtomId[] {
  const seen = new Set<AtomId>();
  const duplicates = new Set<AtomId>();
  for (const member of state.members) {
    for (const atom of member.species.atoms) {
      if (seen.has(atom.id)) {
        duplicates.add(atom.id);
      }
      seen.add(atom.id);
    }
  }
  return [...duplicates];
}

/**
 * Species ids used by more than one member of this state.
 *
 * Should always be empty, and the sentence it enforces is the one at the top of
 * this file: multiplicity is repetition with distinct ids, never one id written
 * twice. Nothing used to enforce it, and the consequences are worse than a
 * cosmetic duplicate.
 *
 * `findSpecies` and `findMember` both resolve to whichever member `Array.find`
 * reaches first, so the second copy is permanently invisible to every lookup,
 * including the structural identity comparison in the spectator check. Meanwhile
 * `conservedTotals` walks `members` directly, so the second copy is fully counted
 * in mass, charge, and electrons. One half of the engine can see it and the other
 * half cannot, which is the shape of a bug that reads as chemistry going wrong.
 *
 * Returned sorted so a failure report is stable between runs.
 */
export function duplicateSpeciesIds(state: MechanismState): readonly SpeciesId[] {
  const seen = new Set<SpeciesId>();
  const duplicates = new Set<SpeciesId>();
  for (const member of state.members) {
    if (seen.has(member.species.id)) {
      duplicates.add(member.species.id);
    }
    seen.add(member.species.id);
  }
  return [...duplicates].sort();
}

/** How many members of this state carry a given species id. Normally 0 or 1. */
export function speciesIdOccurrences(state: MechanismState, speciesId: SpeciesId): number {
  return state.members.filter((member) => member.species.id === speciesId).length;
}

export interface BondLocation {
  readonly species: Species;
  readonly bond: Bond;
}

/**
 * Locate a bond anywhere in the state, by id.
 *
 * Bond ids are only unique within a species by construction, so this returns the
 * first match. A state carrying the same bond id in two species is a data error
 * the valence check reports; this function does not silently arbitrate it.
 */
export function findBondInState(state: MechanismState, bondId: BondId): BondLocation | undefined {
  for (const member of state.members) {
    const bond = findBond(member.species, bondId);
    if (bond !== undefined) {
      return { species: member.species, bond };
    }
  }
  return undefined;
}

/**
 * Whether two atoms are joined by a bond anywhere in this state.
 *
 * Atoms in two different species are never bonded, which is what makes this the
 * right adjacency test for arrow legality: an arrow reaching from one molecule
 * into another has to form a bond, it cannot travel along one that is not there.
 */
export function atomsAreBonded(state: MechanismState, a: AtomId, b: AtomId): boolean {
  if (a === b) return false;
  for (const member of state.members) {
    if (findBondBetween(member.species, a, b) !== undefined) return true;
  }
  return false;
}

export function allAtoms(state: MechanismState): readonly Atom[] {
  return state.members.flatMap((member) => [...member.species.atoms]);
}

export function membersWithRole(
  state: MechanismState,
  role: SpeciesRole,
): readonly StateMember[] {
  return state.members.filter((member) => member.role === role);
}
