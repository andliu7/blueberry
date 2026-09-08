/**
 * Atoms, and the stereochemistry that lives on an atom.
 *
 * Two things this file deliberately does NOT do.
 *
 * 1. It does not compute a CIP descriptor. See VERIFICATION.md S4. Correct CIP
 *    needs the hierarchical digraph with duplicate atoms, ring handling, and
 *    like/unlike auxiliary descriptors, and shipped implementations have carried
 *    bugs in it for years. chem-core stores geometry. RDKit assigns the letter,
 *    in CI, and the letter is copied here at authoring time as
 *    `authoredDescriptor`. If you find yourself writing a function that returns
 *    "R" or "S" from a structure, stop.
 *
 * 2. It does not carry an aromaticity flag. D3 says chem-core is never used for
 *    aromaticity perception. Rings are stored in Kekule form, with alternating
 *    single and double bonds, and RDKit perceives aromaticity in validators. A
 *    boolean here would be a perception result wearing a data field's clothes.
 */

import type { Element } from "./elements.js";
import type { AtomId, Point3, StereoNeighbor } from "./ids.js";

/**
 * Which way round a tetrahedral centre is.
 *
 * The convention, stated once here because a sign error in it is exactly the bug
 * CLAUDE.md warns about under anti addition:
 *
 *   Stand at `neighbors[0]` and look toward the central atom, so that the other
 *   three neighbours point away from you. Read `neighbors[1]`, `neighbors[2]`,
 *   `neighbors[3]` in that order. If they run clockwise from where you stand,
 *   the parity is `clockwise`.
 *
 * Swapping any two entries in the neighbour list flips the parity. That is the
 * property a validator should test first, because it catches a list that was
 * reordered without the parity being updated.
 */
export type StereoParity = "clockwise" | "counterclockwise";

export interface TetrahedralStereo {
  readonly kind: "tetrahedral";
  /**
   * Exactly four slots. Use `IMPLICIT_HYDROGEN` for an undrawn hydrogen and
   * `LONE_PAIR` for a stereogenic lone pair, as on a sulfoxide sulfur. Four
   * slots always, because parity over three is meaningless.
   */
  readonly neighbors: readonly [StereoNeighbor, StereoNeighbor, StereoNeighbor, StereoNeighbor];
  readonly parity: StereoParity;
  /**
   * The CIP letter, if the problem author recorded one.
   *
   * Copied from RDKit at authoring time. Never computed on device, never
   * computed in this package. Absent means "not needed at runtime", not
   * "not a stereocenter".
   */
  readonly authoredDescriptor?: "R" | "S";
}

export type AtomStereo = TetrahedralStereo;

export interface Atom {
  readonly id: AtomId;
  readonly element: Element;
  /**
   * Mass number, when the atom is isotopically labelled. Absent means natural
   * abundance. Deuterium is `{ element: "H", isotope: 2 }` rather than a
   * separate element, so every hydrogen rule applies to it without a special
   * case.
   */
  readonly isotope?: number;
  /**
   * The charge the author declares.
   *
   * This is stored rather than always derived, on purpose. `derivedFormalCharge`
   * in bookkeeping.ts computes what the structure implies. When the two disagree
   * the structure is wrong, or the declaration is, and that disagreement is a
   * named cause a validator reports. Deriving it silently would delete the
   * signal.
   */
  readonly formalCharge: number;
  /** Count of PAIRS, not electrons. A carboxylate oxygen has 3, not 6. */
  readonly lonePairs: number;
  /** Single unpaired electrons, for radicals. Zero for everything closed shell. */
  readonly unpairedElectrons: number;
  /**
   * Hydrogens bonded to this atom that are not drawn as their own Atom.
   *
   * These are real atoms for every purpose except the bond list. They count
   * toward mass, toward bond order sums, and toward formal charge. A proton
   * transfer that changes only implicit hydrogen counts changes nothing in
   * `bonds`, which is precisely the bug VERIFICATION.md S5 describes, so
   * anything walking bonds to count mass will be wrong.
   */
  readonly implicitHydrogens: number;
  readonly stereo?: AtomStereo;
  /** Optional molecular geometry, in angstroms. Not screen coordinates. */
  readonly geometry?: Point3;
}

export interface AtomInput {
  readonly id: AtomId;
  readonly element: Element;
  readonly isotope?: number;
  readonly formalCharge?: number;
  readonly lonePairs?: number;
  readonly unpairedElectrons?: number;
  readonly implicitHydrogens?: number;
  readonly stereo?: AtomStereo;
  readonly geometry?: Point3;
}

/**
 * Build an atom, filling in the zeros.
 *
 * `Object.freeze` is here because `readonly` in TypeScript is a compile time
 * promise and disappears at runtime. The freeze is what actually stops a
 * renderer from writing to a shared atom at 1am.
 */
export function createAtom(input: AtomInput): Atom {
  return Object.freeze({
    id: input.id,
    element: input.element,
    formalCharge: input.formalCharge ?? 0,
    lonePairs: input.lonePairs ?? 0,
    unpairedElectrons: input.unpairedElectrons ?? 0,
    implicitHydrogens: input.implicitHydrogens ?? 0,
    ...(input.isotope === undefined ? {} : { isotope: input.isotope }),
    ...(input.stereo === undefined ? {} : { stereo: input.stereo }),
    ...(input.geometry === undefined ? {} : { geometry: input.geometry }),
  });
}

/** Nonbonding electrons on this atom. Lone pairs count double. */
export function nonbondingElectrons(atom: Atom): number {
  return atom.lonePairs * 2 + atom.unpairedElectrons;
}

/**
 * A key identifying the nuclide, for mass conservation.
 *
 * Mass is conserved as a multiset of nuclei, not as a sum of floating point
 * weights, because floating point sums of atomic weights do not compare equal
 * and a tolerance on that comparison is a tolerance somebody will later widen.
 */
export function nuclideKey(element: Element, isotope?: number): string {
  return isotope === undefined ? element : `[${isotope}${element}]`;
}

export function atomNuclideKey(atom: Atom): string {
  return nuclideKey(atom.element, atom.isotope);
}
