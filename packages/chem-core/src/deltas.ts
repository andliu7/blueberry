/**
 * The two halves of the arrow check, computed independently.
 *
 * `declaredDeltas` reads the arrows and says what they CLAIM happened.
 * `observedDeltas` reads the two states and says what actually CHANGED.
 * A validator compares them. Neither function knows about the other, and neither
 * one is derived from the other, which is the only reason the comparison means
 * anything. See the note at the top of arrows.ts.
 *
 * EVERYTHING HERE IS COUNTED IN ELECTRONS, NOT IN BOND ORDERS.
 *
 * Two fishhook arrows into the same place make one bond. In bond orders that is
 * two changes of one half each, and half orders are a source of rounding
 * arguments nobody wants. In electrons it is two changes of one electron each,
 * and every number in this file is an integer.
 *
 * A bond order change of one is a bonding electron change of two.
 */

import type { ElectronFlowArrow } from "./arrows.js";
import { nonbondingElectrons } from "./atom.js";
import type { Atom } from "./atom.js";
import { atomPairKey, parseAtomPairKey } from "./bond.js";
import type { AtomId } from "./ids.js";
import type { MechanismState } from "./state.js";

/**
 * Change at one atom.
 *
 * `implicitHydrogens` is here and has no counterpart in `declaredDeltas`, on
 * purpose. Arrows cannot express a change in undrawn hydrogens, so any nonzero
 * value in the observed set with no explicit hydrogen atom to account for it is
 * the S5 bug caught in the act. The named cause is
 * `implicit_hydrogen_changed_without_arrow`.
 */
export interface AtomElectronDelta {
  readonly atomId: AtomId;
  /** Change in 2 * lonePairs + unpairedElectrons. */
  readonly nonbondingElectrons: number;
  /** Change in undrawn hydrogen count. Always 0 in a declared set. */
  readonly implicitHydrogens: number;
  /** Change in the declared formal charge. Reported, never asserted here. */
  readonly formalCharge: number;
}

/** Change in bonding electrons between two atoms. Two electrons is one order. */
export interface BondElectronDelta {
  readonly atomIds: readonly [AtomId, AtomId];
  readonly electrons: number;
}

export interface ElectronDeltaSet {
  readonly atoms: readonly AtomElectronDelta[];
  readonly bonds: readonly BondElectronDelta[];
  /** Atom ids in `from` with no counterpart in `to`. Empty in a declared set. */
  readonly atomsRemoved: readonly AtomId[];
  /** Atom ids in `to` with no counterpart in `from`. Empty in a declared set. */
  readonly atomsAdded: readonly AtomId[];
}

interface MutableAtomDelta {
  nonbondingElectrons: number;
  implicitHydrogens: number;
  formalCharge: number;
}

function emptyAtomDelta(): MutableAtomDelta {
  return { nonbondingElectrons: 0, implicitHydrogens: 0, formalCharge: 0 };
}

function atomDeltaFor(map: Map<AtomId, MutableAtomDelta>, atomId: AtomId): MutableAtomDelta {
  const existing = map.get(atomId);
  if (existing !== undefined) return existing;
  const created = emptyAtomDelta();
  map.set(atomId, created);
  return created;
}

function bumpBond(map: Map<string, number>, key: string, electrons: number): void {
  map.set(key, (map.get(key) ?? 0) + electrons);
}

function collectAtoms(state: MechanismState): Map<AtomId, Atom> {
  const atoms = new Map<AtomId, Atom>();
  for (const member of state.members) {
    for (const atom of member.species.atoms) {
      atoms.set(atom.id, atom);
    }
  }
  return atoms;
}

function collectBondElectrons(state: MechanismState): Map<string, number> {
  const bonds = new Map<string, number>();
  for (const member of state.members) {
    for (const bond of member.species.bonds) {
      bumpBond(bonds, atomPairKey(bond.a, bond.b), bond.order * 2);
    }
  }
  return bonds;
}

function assemble(
  atomDeltas: Map<AtomId, MutableAtomDelta>,
  bondDeltas: Map<string, number>,
  atomsRemoved: readonly AtomId[],
  atomsAdded: readonly AtomId[],
): ElectronDeltaSet {
  const atoms: AtomElectronDelta[] = [];
  for (const [atomId, delta] of atomDeltas) {
    if (
      delta.nonbondingElectrons === 0 &&
      delta.implicitHydrogens === 0 &&
      delta.formalCharge === 0
    ) {
      continue;
    }
    atoms.push(Object.freeze({ atomId, ...delta }));
  }

  const bonds: BondElectronDelta[] = [];
  for (const [key, electrons] of bondDeltas) {
    if (electrons === 0) continue;
    bonds.push(Object.freeze({ atomIds: parseAtomPairKey(key), electrons }));
  }

  atoms.sort((left, right) => left.atomId.localeCompare(right.atomId));
  bonds.sort((left, right) =>
    atomPairKey(left.atomIds[0], left.atomIds[1]).localeCompare(
      atomPairKey(right.atomIds[0], right.atomIds[1]),
    ),
  );

  return Object.freeze({
    atoms: Object.freeze(atoms),
    bonds: Object.freeze(bonds),
    atomsRemoved: Object.freeze([...atomsRemoved]),
    atomsAdded: Object.freeze([...atomsAdded]),
  });
}

/**
 * What the arrows claim.
 *
 * `state` is the `from` state of the step. It is needed only to turn a BondId
 * into the pair of atoms it joins, since a source arrow names the bond by id and
 * bond ids do not survive the step.
 *
 * Throws if an arrow names a bond that is not in the state. That is a broken
 * reference rather than a chemistry error, and a silent zero here would hide it.
 * The named cause `arrow_endpoint_not_in_state` is for the validator to raise
 * after checking references; this function assumes they resolve.
 */
export function declaredDeltas(
  arrows: readonly ElectronFlowArrow[],
  state: MechanismState,
): ElectronDeltaSet {
  const bondEnds = new Map<string, readonly [AtomId, AtomId]>();
  for (const member of state.members) {
    for (const bond of member.species.bonds) {
      bondEnds.set(bond.id, [bond.a, bond.b]);
    }
  }

  const atomDeltas = new Map<AtomId, MutableAtomDelta>();
  const bondDeltas = new Map<string, number>();

  for (const arrow of arrows) {
    const electrons = arrow.electrons;

    switch (arrow.source.kind) {
      case "lonePair":
      case "singleElectron": {
        atomDeltaFor(atomDeltas, arrow.source.atomId).nonbondingElectrons -= electrons;
        break;
      }
      case "bond": {
        const ends = bondEnds.get(arrow.source.bondId);
        if (ends === undefined) {
          throw new Error(
            `Arrow ${arrow.id} sources bond ${arrow.source.bondId}, which is not in state ${state.id}`,
          );
        }
        bumpBond(bondDeltas, atomPairKey(ends[0], ends[1]), -electrons);
        break;
      }
    }

    switch (arrow.sink.kind) {
      case "atom": {
        atomDeltaFor(atomDeltas, arrow.sink.atomId).nonbondingElectrons += electrons;
        break;
      }
      case "betweenAtoms": {
        const [a, b] = arrow.sink.atomIds;
        bumpBond(bondDeltas, atomPairKey(a, b), electrons);
        break;
      }
    }
  }

  return assemble(atomDeltas, bondDeltas, [], []);
}

/**
 * What actually changed between the two states.
 *
 * Atoms are matched by id across the step, which is the invariant stated in
 * ids.ts. An atom that appears on only one side is reported in `atomsAdded` or
 * `atomsRemoved` rather than treated as having changed from nothing, because
 * those two are a different failure with a different named cause.
 */
export function observedDeltas(from: MechanismState, to: MechanismState): ElectronDeltaSet {
  const before = collectAtoms(from);
  const after = collectAtoms(to);

  const atomDeltas = new Map<AtomId, MutableAtomDelta>();
  const atomsRemoved: AtomId[] = [];
  const atomsAdded: AtomId[] = [];

  for (const [atomId, beforeAtom] of before) {
    const afterAtom = after.get(atomId);
    if (afterAtom === undefined) {
      atomsRemoved.push(atomId);
      continue;
    }
    const delta = atomDeltaFor(atomDeltas, atomId);
    delta.nonbondingElectrons = nonbondingElectrons(afterAtom) - nonbondingElectrons(beforeAtom);
    delta.implicitHydrogens = afterAtom.implicitHydrogens - beforeAtom.implicitHydrogens;
    delta.formalCharge = afterAtom.formalCharge - beforeAtom.formalCharge;
  }

  for (const atomId of after.keys()) {
    if (!before.has(atomId)) {
      atomsAdded.push(atomId);
    }
  }

  const bondsBefore = collectBondElectrons(from);
  const bondsAfter = collectBondElectrons(to);
  const bondDeltas = new Map<string, number>();
  const keys = new Set<string>([...bondsBefore.keys(), ...bondsAfter.keys()]);
  for (const key of keys) {
    bondDeltas.set(key, (bondsAfter.get(key) ?? 0) - (bondsBefore.get(key) ?? 0));
  }

  atomsRemoved.sort();
  atomsAdded.sort();

  return assemble(atomDeltas, bondDeltas, atomsRemoved, atomsAdded);
}

/** One disagreement between what the arrows claimed and what the states show. */
export interface DeltaMismatch {
  readonly target:
    | { readonly kind: "atom"; readonly atomId: AtomId }
    | { readonly kind: "atomPair"; readonly atomIds: readonly [AtomId, AtomId] };
  readonly quantity: "nonbondingElectrons" | "bondingElectrons" | "implicitHydrogens";
  readonly declared: number;
  readonly observed: number;
}

/**
 * Every place the two sets disagree.
 *
 * Empty means the arrows fully account for the structural change. This function
 * reports the differences; deciding what they mean, and which named cause to
 * attach, is the validator's job.
 *
 * Note that `implicitHydrogens` is always declared as zero, because no arrow can
 * express it. A mismatch on that quantity is therefore always the observed value
 * standing alone, which is exactly the signal wanted.
 *
 * Formal charge deltas are carried on `AtomElectronDelta` but are NOT compared
 * here. An arrow says nothing about formal charge directly; the charge follows
 * from the electrons, and comparing it here would report the same single error
 * twice. Charge is checked against structure by `derivedFormalCharge`, and
 * across the step by `conservedTotals`.
 */
export function deltaMismatches(
  declared: ElectronDeltaSet,
  observed: ElectronDeltaSet,
): readonly DeltaMismatch[] {
  const mismatches: DeltaMismatch[] = [];

  const declaredAtoms = new Map<AtomId, AtomElectronDelta>(
    declared.atoms.map((delta) => [delta.atomId, delta]),
  );
  const observedAtoms = new Map<AtomId, AtomElectronDelta>(
    observed.atoms.map((delta) => [delta.atomId, delta]),
  );

  for (const atomId of new Set<AtomId>([...declaredAtoms.keys(), ...observedAtoms.keys()])) {
    const declaredAtom = declaredAtoms.get(atomId);
    const observedAtom = observedAtoms.get(atomId);
    const declaredNonbonding = declaredAtom?.nonbondingElectrons ?? 0;
    const observedNonbonding = observedAtom?.nonbondingElectrons ?? 0;
    if (declaredNonbonding !== observedNonbonding) {
      mismatches.push({
        target: { kind: "atom", atomId },
        quantity: "nonbondingElectrons",
        declared: declaredNonbonding,
        observed: observedNonbonding,
      });
    }
    const observedHydrogens = observedAtom?.implicitHydrogens ?? 0;
    if (observedHydrogens !== 0) {
      mismatches.push({
        target: { kind: "atom", atomId },
        quantity: "implicitHydrogens",
        declared: 0,
        observed: observedHydrogens,
      });
    }
  }

  const declaredBonds = new Map<string, number>(
    declared.bonds.map((delta) => [atomPairKey(delta.atomIds[0], delta.atomIds[1]), delta.electrons]),
  );
  const observedBonds = new Map<string, number>(
    observed.bonds.map((delta) => [atomPairKey(delta.atomIds[0], delta.atomIds[1]), delta.electrons]),
  );

  for (const key of new Set<string>([...declaredBonds.keys(), ...observedBonds.keys()])) {
    const declaredElectrons = declaredBonds.get(key) ?? 0;
    const observedElectrons = observedBonds.get(key) ?? 0;
    if (declaredElectrons !== observedElectrons) {
      mismatches.push({
        target: { kind: "atomPair", atomIds: parseAtomPairKey(key) },
        quantity: "bondingElectrons",
        declared: declaredElectrons,
        observed: observedElectrons,
      });
    }
  }

  return Object.freeze(mismatches);
}
