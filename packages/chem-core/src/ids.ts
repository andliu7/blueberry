/**
 * Identifiers, and the one invariant the whole engine rests on.
 *
 * These are plain string aliases rather than branded types. A brand would stop
 * you passing a BondId where an AtomId belongs, and it would also mean every
 * fixture file has to call a constructor to make a literal. The aliases are here
 * for the reader, not for the compiler. If mixed-up ids turn out to be a real
 * source of bugs later, brand them then, with the bug as the evidence.
 *
 * THE INVARIANT: atom ids are stable across a mechanism step.
 *
 * If an atom exists in the `from` state and in the `to` state, it carries the
 * same AtomId in both. That is what makes it possible to say "this carbon lost a
 * lone pair" rather than "some carbon somewhere lost a lone pair". Mass
 * conservation, stereochemistry tracking, and every arrow check depend on it.
 * Bond ids are NOT stable, because a bond that breaks and a bond that forms are
 * different bonds; bonds are matched across a step by their endpoint atom ids.
 *
 * No `react`, no DOM, no rendering, no RDKit anywhere in this package. Pure data
 * and numbers, per the contract in CLAUDE.md and the precedent set by
 * `berryBehaviour.ts` in the sibling repository.
 */

export type AtomId = string;
export type BondId = string;
export type SpeciesId = string;
export type StateId = string;
export type StepId = string;
export type ArrowId = string;
export type PathwayId = string;
export type AttemptId = string;

/**
 * Ids beginning with this prefix are reserved by the engine and must never be
 * used for a real atom, bond, or species.
 */
export const RESERVED_ID_PREFIX = "@";

/**
 * Stands in for an implicit hydrogen in a stereo neighbour list.
 *
 * A stereocenter usually has one hydrogen that is not drawn. The neighbour list
 * still needs four entries or the parity means nothing, so the undrawn hydrogen
 * gets this placeholder.
 */
export const IMPLICIT_HYDROGEN: AtomId = "@implicitH";

/**
 * Stands in for a lone pair in a stereo neighbour list.
 *
 * Needed for pyramidal centres that are stereogenic because of a lone pair
 * rather than a fourth substituent, such as a sulfoxide sulfur.
 */
export const LONE_PAIR: AtomId = "@lonePair";

/**
 * A neighbour slot in a stereo descriptor. Either a real atom id, or one of the
 * two sentinels above.
 *
 * This is a string alias like the rest, so the compiler will not catch a typo in
 * a sentinel. `isSentinelId` exists so a validator can catch it at runtime.
 */
export type StereoNeighbor = AtomId;

export function isSentinelId(id: string): boolean {
  return id.startsWith(RESERVED_ID_PREFIX);
}

export function isImplicitHydrogenSlot(id: StereoNeighbor): boolean {
  return id === IMPLICIT_HYDROGEN;
}

export function isLonePairSlot(id: StereoNeighbor): boolean {
  return id === LONE_PAIR;
}

/**
 * A point in molecular space, in angstroms.
 *
 * This is chemistry geometry, not screen layout. Nothing in this package knows
 * about pixels. Renderers compute their own coordinates; conformational
 * questions such as an E2 dihedral read these.
 */
export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
