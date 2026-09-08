/**
 * What a pointer can hit, and how a layout of those things is prepared for
 * repeated querying.
 *
 * A target is a circle. Every interactive thing in a mechanism canvas is either
 * drawn as a circle already, an atom sphere, a bond end handle, an implicit
 * hydrogen glyph, or is small enough that its circumscribed circle is an honest
 * stand in for it. Circles are chosen deliberately over rectangles because the
 * decision boundary between two circles under the ranking rule in `hit-test.ts`
 * is itself a circle with a closed form, which is what makes the exclusive
 * radius in `minimum-target.ts` an exact number rather than a sampled estimate.
 *
 * A lone PAIR is one target, not two. It is drawn as two dots, and the two dots
 * always move together in a mechanism, so splitting them into two targets would
 * create an ambiguity with no meaning behind it. The pair's target circle is the
 * circle that contains both dots.
 */

import type { Point } from "./units.js";

/**
 * The four kinds of thing a student can touch on a mechanism canvas.
 *
 * These are interaction kinds, not chemistry kinds. `chem-core` knows about
 * atoms, bonds, and electrons; it does not know that a lone pair is drawn as two
 * dots on an arc. Nothing here imports `chem-core`, on purpose: this package can
 * hit test a layout of circles with no chemistry loaded at all, which is what
 * makes it testable without building a molecule first.
 */
export type TargetKind = "atom" | "lone_pair" | "bond_handle" | "implicit_hydrogen";

export const TARGET_KINDS: readonly TargetKind[] = [
  "atom",
  "lone_pair",
  "bond_handle",
  "implicit_hydrogen",
];

/**
 * The three pointer types Phase 2 must handle distinctly. Touch has a contact
 * patch and needs slop. A mouse cursor is a single pixel and needs none. A pen
 * tip is small and precise but is still held in a hand, so it sits between them.
 */
export type PointerClass = "touch" | "mouse" | "pen";

export interface TargetCircle {
  /** Stable across a layout. The state machine keys its selection off this. */
  readonly id: string;
  readonly kind: TargetKind;
  /** Centre in layout points. */
  readonly centre: Point;
  /**
   * The DRAWN radius in points. Not the hit radius. Tolerance is added later and
   * separately, because the drawn radius is what a student sees and aims at and
   * the two numbers must never be conflated in a report.
   */
  readonly radius: number;
  /**
   * For a lone pair, bond handle, or implicit hydrogen, the id of the atom
   * target it is attached to. An atom has no owner.
   *
   * This exists for one reason: a child sits ON its parent by design, so the
   * two silhouettes overlap and that overlap is not a layout bug. The
   * encroachment check in `tolerance.ts` skips owner pairs and reports every
   * other overlap. Without this the tightest and most correct layout in the
   * corpus would report as its own worst violation.
   */
  readonly ownerAtomId?: string;
}

/** A tolerance profile in points, one slop value per target kind. */
export interface ToleranceProfile {
  readonly label: string;
  readonly pointerClass: PointerClass;
  readonly slop: Readonly<Record<TargetKind, number>>;
}

/**
 * Zero slop. The drawn silhouette is the hit area, nothing more.
 *
 * This is the mouse profile and it is also the honest baseline every other
 * profile is measured against: run a check under this and under a touch profile
 * and the difference is exactly what the tolerance bought and what it cost.
 */
export const EXACT_TOLERANCE: ToleranceProfile = {
  label: "exact, no slop",
  pointerClass: "mouse",
  slop: { atom: 0, lone_pair: 0, bond_handle: 0, implicit_hydrogen: 0 },
};

/**
 * Pen. A stylus tip contacts over roughly 1 mm and the user can see where it is
 * pointing, so it needs a little slop for hand tremor and none for occlusion.
 * 3 points is about 0.47 mm on an iPhone point.
 *
 * This number is a design choice, not a measurement. It is small enough that
 * `analyseContention` reports zero encroachment on every reference layout in
 * `reference-layouts.ts`, which is the property that justifies it.
 */
export const PEN_TOLERANCE: ToleranceProfile = {
  label: "pen, apple pencil class",
  pointerClass: "pen",
  slop: { atom: 0, lone_pair: 3, bond_handle: 3, implicit_hydrogen: 3 },
};

/**
 * Touch, and the only profile where the number matters.
 *
 * DERIVED, NOT PICKED. The derivation is in `tolerance.ts`:
 * `maxSlopWithoutEncroachment` returns the largest slop a kind can carry on a
 * given layout before its decision boundary crosses inside a neighbour's drawn
 * silhouette. Run against `BLUEBERRY_TIGHTEST_LONE_PAIR_LAYOUT` and
 * `BLUEBERRY_TIGHTEST_BOND_HANDLE_LAYOUT` the answer is larger than 8 for the
 * small kinds, and 8 is taken as the working value because slop past the point
 * where the fingertip model stops improving is cost with no benefit. The
 * fingertip sweep in the geometry report test is what shows where that is.
 *
 * Atoms get none. An atom is 71 points across in the reference and 44 or more in
 * ours. Growing it only steals from the handles and lone pairs sitting on its
 * rim, which are the targets that actually need the help. This is the single
 * most important line in the file: tolerance is zero sum between neighbours, so
 * it is spent on the small target and never on the large one.
 */
export const TOUCH_TOLERANCE: ToleranceProfile = {
  label: "touch, fingertip",
  pointerClass: "touch",
  slop: { atom: 0, lone_pair: 8, bond_handle: 8, implicit_hydrogen: 8 },
};

export const TOLERANCE_PROFILES: Readonly<Record<PointerClass, ToleranceProfile>> = {
  touch: TOUCH_TOLERANCE,
  mouse: EXACT_TOLERANCE,
  pen: PEN_TOLERANCE,
};

/** A target with its tolerance already folded in, ready to be queried. */
export interface CompiledTarget {
  readonly target: TargetCircle;
  /** Drawn radius plus the profile's slop for this kind. */
  readonly effectiveRadius: number;
  readonly effectiveRadiusSquared: number;
}

/**
 * A layout prepared for repeated hit testing.
 *
 * Compilation does the per target arithmetic once so a pointer move does none.
 * It is not a spatial index. See the complexity note in `hit-test.ts` for why
 * there is no grid here.
 */
export interface CompiledLayout {
  readonly targets: readonly CompiledTarget[];
  readonly profile: ToleranceProfile;
  readonly byId: ReadonlyMap<string, CompiledTarget>;
}

export class DuplicateTargetIdError extends Error {
  constructor(public readonly id: string) {
    super(`duplicate target id in layout: ${id}`);
    this.name = "DuplicateTargetIdError";
  }
}

export class InvalidTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTargetError";
  }
}

export function compileLayout(
  targets: readonly TargetCircle[],
  profile: ToleranceProfile,
): CompiledLayout {
  const compiled: CompiledTarget[] = [];
  const byId = new Map<string, CompiledTarget>();

  for (const target of targets) {
    if (byId.has(target.id)) throw new DuplicateTargetIdError(target.id);
    if (!(target.radius > 0)) {
      throw new InvalidTargetError(
        `target ${target.id} has radius ${target.radius}, which must be above zero`,
      );
    }
    if (!Number.isFinite(target.centre.x) || !Number.isFinite(target.centre.y)) {
      throw new InvalidTargetError(`target ${target.id} has a non finite centre`);
    }
    const slop = profile.slop[target.kind];
    const effectiveRadius = target.radius + slop;
    const entry: CompiledTarget = {
      target,
      effectiveRadius,
      effectiveRadiusSquared: effectiveRadius * effectiveRadius,
    };
    compiled.push(entry);
    byId.set(target.id, entry);
  }

  return { targets: compiled, profile, byId };
}

/** True when one of the two targets is the other's owning atom. */
export function isOwnerPair(a: TargetCircle, b: TargetCircle): boolean {
  return a.ownerAtomId === b.id || b.ownerAtomId === a.id;
}

/** True when both targets hang off the same atom, two lone pairs on one oxygen
 * for instance. Siblings are NOT exempt from the encroachment check. They are
 * the pairs the tightest spacing in the corpus is measured between. */
export function isSiblingPair(a: TargetCircle, b: TargetCircle): boolean {
  return (
    a.ownerAtomId !== undefined && b.ownerAtomId !== undefined && a.ownerAtomId === b.ownerAtomId
  );
}
