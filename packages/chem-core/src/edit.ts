/**
 * Immutable structural edits.
 *
 * Every function here returns a new object and leaves its input untouched. That
 * is the rule CLAUDE.md states as "a step produces a new State rather than
 * mutating one", and it is the reason `from` and `to` on a step can be compared
 * at all: if a step mutated its input, the before picture would already be gone
 * by the time anything wanted to look at it.
 *
 * These are STRUCTURAL edits, not chemistry. `withBondOrder` will happily give
 * carbon five bonds. That is deliberate. An adversary has to be able to build a
 * broken fixture, and a constructor that refused would mean the valence check
 * could never be shown to fail on input that deserves it. Deciding what is legal
 * belongs to `packages/validators`.
 *
 * There is deliberately no `applyArrows`. See the note at the top of arrows.ts.
 *
 * The patch objects take `undefined` to mean "leave this alone". Fields are
 * copied one at a time rather than spread, because the tsconfig here turns on
 * `exactOptionalPropertyTypes` and a spread of a partial would quietly write
 * `undefined` into a field that is meant to be absent.
 */

import type { Atom, AtomStereo } from "./atom.js";
import type { Bond, BondOrder, BondStereo } from "./bond.js";
import type { AtomId, BondId, Point3, SpeciesId } from "./ids.js";
import type { Species } from "./species.js";
import { requireAtom, requireBond } from "./species.js";
import type { MechanismState, SpectatorDeclaration, StateMember } from "./state.js";

export interface AtomPatch {
  readonly formalCharge?: number;
  readonly lonePairs?: number;
  readonly unpairedElectrons?: number;
  readonly implicitHydrogens?: number;
  readonly isotope?: number;
  readonly stereo?: AtomStereo;
  readonly geometry?: Point3;
}

/**
 * Fields that can be cleared rather than changed.
 *
 * Removing stereochemistry is a real operation: an SN1 ionisation destroys the
 * stereocenter. There is no way to express "set this to absent" with a patch
 * whose absent field already means "leave alone", so clearing gets its own list.
 */
export type ClearableAtomField = "isotope" | "stereo" | "geometry";

function patchAtom(atom: Atom, patch: AtomPatch, clear: readonly ClearableAtomField[]): Atom {
  const clears = new Set<ClearableAtomField>(clear);

  const isotope = clears.has("isotope") ? undefined : (patch.isotope ?? atom.isotope);
  const stereo = clears.has("stereo") ? undefined : (patch.stereo ?? atom.stereo);
  const geometry = clears.has("geometry") ? undefined : (patch.geometry ?? atom.geometry);

  return Object.freeze({
    id: atom.id,
    element: atom.element,
    formalCharge: patch.formalCharge ?? atom.formalCharge,
    lonePairs: patch.lonePairs ?? atom.lonePairs,
    unpairedElectrons: patch.unpairedElectrons ?? atom.unpairedElectrons,
    implicitHydrogens: patch.implicitHydrogens ?? atom.implicitHydrogens,
    ...(isotope === undefined ? {} : { isotope }),
    ...(stereo === undefined ? {} : { stereo }),
    ...(geometry === undefined ? {} : { geometry }),
  });
}

function rebuildSpecies(
  species: Species,
  atoms: readonly Atom[],
  bonds: readonly Bond[],
): Species {
  return Object.freeze({
    id: species.id,
    atoms: Object.freeze([...atoms]),
    bonds: Object.freeze([...bonds]),
    ...(species.label === undefined ? {} : { label: species.label }),
    ...(species.declaredTorsions === undefined
      ? {}
      : { declaredTorsions: species.declaredTorsions }),
  });
}

export function withAtomPatch(
  species: Species,
  atomId: AtomId,
  patch: AtomPatch,
  clear: readonly ClearableAtomField[] = [],
): Species {
  const target = requireAtom(species, atomId);
  const patched = patchAtom(target, patch, clear);
  const atoms = species.atoms.map((atom) => (atom.id === atomId ? patched : atom));
  return rebuildSpecies(species, atoms, species.bonds);
}

export function withAddedAtom(species: Species, atom: Atom): Species {
  if (species.atoms.some((existing) => existing.id === atom.id)) {
    throw new Error(`Species ${species.id} already has an atom ${atom.id}`);
  }
  return rebuildSpecies(species, [...species.atoms, atom], species.bonds);
}

/** Removes the atom and every bond touching it. */
export function withoutAtom(species: Species, atomId: AtomId): Species {
  const atoms = species.atoms.filter((atom) => atom.id !== atomId);
  const bonds = species.bonds.filter((bond) => bond.a !== atomId && bond.b !== atomId);
  return rebuildSpecies(species, atoms, bonds);
}

export function withAddedBond(species: Species, bond: Bond): Species {
  if (species.bonds.some((existing) => existing.id === bond.id)) {
    throw new Error(`Species ${species.id} already has a bond ${bond.id}`);
  }
  return rebuildSpecies(species, species.atoms, [...species.bonds, bond]);
}

export function withoutBond(species: Species, bondId: BondId): Species {
  const bonds = species.bonds.filter((bond) => bond.id !== bondId);
  return rebuildSpecies(species, species.atoms, bonds);
}

export function withBondOrder(species: Species, bondId: BondId, order: BondOrder): Species {
  const target = requireBond(species, bondId);
  const updated: Bond = Object.freeze({
    id: target.id,
    a: target.a,
    b: target.b,
    order,
    ...(target.stereo === undefined ? {} : { stereo: target.stereo }),
  });
  const bonds = species.bonds.map((bond) => (bond.id === bondId ? updated : bond));
  return rebuildSpecies(species, species.atoms, bonds);
}

export function withBondStereo(
  species: Species,
  bondId: BondId,
  stereo: BondStereo | undefined,
): Species {
  const target = requireBond(species, bondId);
  const updated: Bond = Object.freeze({
    id: target.id,
    a: target.a,
    b: target.b,
    order: target.order,
    ...(stereo === undefined ? {} : { stereo }),
  });
  const bonds = species.bonds.map((bond) => (bond.id === bondId ? updated : bond));
  return rebuildSpecies(species, species.atoms, bonds);
}

function rebuildState(
  state: MechanismState,
  members: readonly StateMember[],
  spectators: readonly SpectatorDeclaration[],
): MechanismState {
  return Object.freeze({
    id: state.id,
    members: Object.freeze([...members]),
    spectators: Object.freeze([...spectators]),
  });
}

/** A new state with the same id and one member added. */
export function withMember(state: MechanismState, member: StateMember): MechanismState {
  if (state.members.some((existing) => existing.species.id === member.species.id)) {
    throw new Error(`State ${state.id} already has a species ${member.species.id}`);
  }
  return rebuildState(state, [...state.members, member], state.spectators);
}

export function withoutMember(state: MechanismState, speciesId: SpeciesId): MechanismState {
  const members = state.members.filter((member) => member.species.id !== speciesId);
  const spectators = state.spectators.filter(
    (declaration) => declaration.speciesId !== speciesId,
  );
  return rebuildState(state, members, spectators);
}

/** Replace one species in place, keeping its role. */
export function withReplacedSpecies(state: MechanismState, species: Species): MechanismState {
  if (!state.members.some((member) => member.species.id === species.id)) {
    throw new Error(`State ${state.id} has no species ${species.id} to replace`);
  }
  const members = state.members.map((member) =>
    member.species.id === species.id ? { species, role: member.role } : member,
  );
  return rebuildState(state, members, state.spectators);
}

/**
 * Record a spectator declaration.
 *
 * A separate, named function rather than a field somebody sets, because
 * CLAUDE.md requires declaring a spectator to be an explicit act. This is the
 * act. It refuses to declare a species that is not present, so the record cannot
 * quietly refer to nothing.
 */
export function declareSpectator(
  state: MechanismState,
  declaration: SpectatorDeclaration,
): MechanismState {
  if (!state.members.some((member) => member.species.id === declaration.speciesId)) {
    throw new Error(
      `Cannot declare species ${declaration.speciesId} a spectator: it is not in state ${state.id}`,
    );
  }
  if (state.spectators.some((existing) => existing.speciesId === declaration.speciesId)) {
    throw new Error(`Species ${declaration.speciesId} is already a spectator in state ${state.id}`);
  }
  return rebuildState(state, state.members, [...state.spectators, Object.freeze(declaration)]);
}

/** Withdraw a spectator declaration. Also an explicit act, and also recorded. */
export function withdrawSpectator(
  state: MechanismState,
  speciesId: SpeciesId,
): MechanismState {
  const spectators = state.spectators.filter(
    (declaration) => declaration.speciesId !== speciesId,
  );
  return rebuildState(state, state.members, spectators);
}

/**
 * A copy of a state under a new id.
 *
 * The usual way to start building the `to` state of a step: copy the `from`
 * state, then edit the copy. Species objects are shared by reference, which is
 * safe because every species in this package is frozen and every edit returns a
 * new one.
 */
export function copyStateAs(state: MechanismState, newId: string): MechanismState {
  return Object.freeze({
    id: newId,
    members: state.members,
    spectators: state.spectators,
  });
}
