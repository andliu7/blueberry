/**
 * Bonds, and the stereochemistry that lives on a bond rather than on an atom.
 *
 * Bond order is 1, 2, or 3. There is no aromatic order and no partial order.
 *
 * No aromatic order, because D3 gives aromaticity perception to RDKit and a
 * Kekule structure is a complete description without it.
 *
 * No partial order, because every State in this engine has to pass a valence
 * check, and a valence check on a half formed bond has no answer. Transition
 * states are drawn as the arrows on a step, not as a State with 1.5 bonds in it.
 * If a problem genuinely needs a transition state as a first class object, that
 * is a new type with its own rules, not a fractional bond order smuggled in
 * here.
 *
 * Dative bonds, as in boron trifluoride diethyl etherate, are order one with
 * formal charges on both ends: boron minus, oxygen plus. That is the ordinary
 * Lewis treatment and it keeps the formal charge formula honest. There is no
 * separate dative bond type.
 */

import type { AtomId, BondId } from "./ids.js";

export type BondOrder = 1 | 2 | 3;

/**
 * Geometry across a double bond.
 *
 * `cis` and `trans` here are geometric statements about two named reference
 * atoms, not CIP descriptors. E and Z require priority ranking, which is CIP,
 * which this package does not do. See atom.ts.
 *
 * `reference[0]` must be a neighbour of `bond.a` and `reference[1]` a neighbour
 * of `bond.b`. `cis` means those two references sit on the same side of the
 * double bond axis.
 */
export interface DoubleBondStereo {
  readonly kind: "doubleBond";
  readonly reference: readonly [AtomId, AtomId];
  readonly arrangement: "cis" | "trans";
  /**
   * The CIP letter, if the problem author recorded one. Copied from RDKit at
   * authoring time. Never computed here.
   */
  readonly authoredDescriptor?: "E" | "Z";
}

export type BondStereo = DoubleBondStereo;

export interface Bond {
  readonly id: BondId;
  readonly a: AtomId;
  readonly b: AtomId;
  readonly order: BondOrder;
  readonly stereo?: BondStereo;
}

export interface BondInput {
  readonly id: BondId;
  readonly a: AtomId;
  readonly b: AtomId;
  readonly order?: BondOrder;
  readonly stereo?: BondStereo;
}

export function createBond(input: BondInput): Bond {
  if (input.a === input.b) {
    throw new Error(`Bond ${input.id} joins atom ${input.a} to itself`);
  }
  return Object.freeze({
    id: input.id,
    a: input.a,
    b: input.b,
    order: input.order ?? 1,
    ...(input.stereo === undefined ? {} : { stereo: input.stereo }),
  });
}

/**
 * A stable key for the pair of atoms a bond joins, independent of which end was
 * written first.
 *
 * Bonds are matched across a mechanism step by this key, not by BondId, because
 * a bond that forms during a step never had an id in the previous state. See the
 * invariant note in ids.ts.
 */
export function atomPairKey(a: AtomId, b: AtomId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function bondPairKey(bond: Bond): string {
  return atomPairKey(bond.a, bond.b);
}

/** Split a key made by `atomPairKey` back into its two atom ids. */
export function parseAtomPairKey(key: string): readonly [AtomId, AtomId] {
  const separator = key.indexOf("|");
  if (separator < 0) {
    throw new Error(`Not an atom pair key: ${key}`);
  }
  return [key.slice(0, separator), key.slice(separator + 1)];
}

/** The other end of a bond, given one end. Throws if the atom is not on it. */
export function otherEnd(bond: Bond, atomId: AtomId): AtomId {
  if (bond.a === atomId) return bond.b;
  if (bond.b === atomId) return bond.a;
  throw new Error(`Atom ${atomId} is not an end of bond ${bond.id}`);
}

export function bondTouches(bond: Bond, atomId: AtomId): boolean {
  return bond.a === atomId || bond.b === atomId;
}
