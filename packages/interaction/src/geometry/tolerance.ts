/**
 * Tolerance, and what it costs.
 *
 * THE POINT OF THIS FILE.
 *
 * Growing a target's hit area is not free. Under the ranking rule in
 * `hit-test.ts` the boundary between two targets sits where their normalised
 * distances are equal, so raising one target's effective radius moves that
 * boundary toward the other target. Tolerance is zero sum between neighbours.
 * Every point one target gains, some other target loses.
 *
 * So the question is never "how much slop should a lone pair get". It is "how
 * much slop can a lone pair take before it starts stealing points that are drawn
 * as something else". That has an exact answer for any given layout, and this
 * file computes it. The touch profile in `targets.ts` is set from the answer
 * rather than from taste.
 *
 * ENCROACHMENT is the name for the failure: target A's boundary with target B
 * has moved inside B's DRAWN silhouette, so there are points a student can see
 * are part of B, can aim at, can hit dead centre of the visible ink, and still
 * get A. That is the specific thing a student cannot learn their way around,
 * because the screen is lying to them.
 *
 * Owner pairs are exempt and only owner pairs. A bond end handle sits on its
 * atom's rim by design, measured at 2.2 points inside the silhouette in the
 * Alchemie reference, and a lone pair glyph orbits its own atom. Those overlaps
 * are the design, not a bug. Two lone pairs on the same oxygen are NOT exempt:
 * they are siblings, they are independently tappable, and the spacing between
 * them is exactly the tightest spacing the exit condition asks about.
 */

import {
  boundaryDistance,
  type ExclusiveRadius,
  exclusiveRadius,
} from "./hit-test.js";
import {
  compileLayout,
  isOwnerPair,
  type CompiledLayout,
  type CompiledTarget,
  type TargetCircle,
  type TargetKind,
  type ToleranceProfile,
} from "./targets.js";
import { distance } from "./units.js";

export interface ContentionPair {
  readonly aId: string;
  readonly bId: string;
  /** Centre to centre, points. */
  readonly separation: number;
  /** How far past each other the two effective circles reach. Positive means
   * they overlap and there is a boundary between them inside both. */
  readonly overlapDepth: number;
  /** Distance from a's centre to the decision boundary, along the centre line. */
  readonly boundaryFromA: number;
  /**
   * How far inside b's DRAWN radius the boundary sits. Positive is encroachment:
   * a has taken points that are visibly part of b.
   */
  readonly encroachmentOnB: number;
  /** Same, the other way round. */
  readonly encroachmentOnA: number;
  /** True when one is the other's owning atom, in which case the two
   * encroachment numbers are reported but are not violations. */
  readonly ownerPair: boolean;
}

export interface ContentionReport {
  readonly profile: string;
  readonly pairs: readonly ContentionPair[];
  /** Pairs that are not owner pairs and where either encroachment is positive.
   * A layout with a non empty list here has targets a student can aim at and
   * miss through no fault of their own. */
  readonly violations: readonly ContentionPair[];
  readonly worstEncroachment: number;
}

/**
 * Every pair whose effective circles overlap, with the boundary arithmetic.
 *
 * O(n squared) in the number of targets. This is an analysis function, run in
 * tests and in Phase 4's layout gate, never on a pointer move.
 */
export function analyseContention(layout: CompiledLayout): ContentionReport {
  const pairs: ContentionPair[] = [];
  const targets = layout.targets;

  for (let i = 0; i < targets.length; i += 1) {
    const a = targets[i];
    if (a === undefined) continue;
    for (let j = i + 1; j < targets.length; j += 1) {
      const b = targets[j];
      if (b === undefined) continue;

      const separation = distance(a.target.centre, b.target.centre);
      const overlapDepth = a.effectiveRadius + b.effectiveRadius - separation;
      if (overlapDepth <= 0) continue;

      const boundaryFromA = boundaryDistance(a, b);
      const boundaryFromB = separation - boundaryFromA;

      pairs.push({
        aId: a.target.id,
        bId: b.target.id,
        separation,
        overlapDepth,
        boundaryFromA,
        encroachmentOnB: b.target.radius - boundaryFromB,
        encroachmentOnA: a.target.radius - boundaryFromA,
        ownerPair: isOwnerPair(a.target, b.target),
      });
    }
  }

  const violations = pairs.filter(
    (p) => !p.ownerPair && (p.encroachmentOnA > 0 || p.encroachmentOnB > 0),
  );
  const worstEncroachment = pairs.reduce(
    (worst, p) =>
      p.ownerPair ? worst : Math.max(worst, p.encroachmentOnA, p.encroachmentOnB),
    Number.NEGATIVE_INFINITY,
  );

  return {
    profile: layout.profile.label,
    pairs,
    violations,
    worstEncroachment: pairs.length === 0 ? Number.NEGATIVE_INFINITY : worstEncroachment,
  };
}

/**
 * The largest slop, in points, that every target of `kind` can carry on this set
 * of targets before any non owner boundary crosses inside a neighbour's drawn
 * silhouette.
 *
 * This is the derivation the touch profile is set from. It is a bisection rather
 * than a closed form because raising the slop for one kind moves boundaries at
 * every target of that kind at once, including boundaries between two targets of
 * the same kind where both sides move. The predicate is monotone in the slop,
 * which is what makes bisection valid: more slop never removes an encroachment.
 *
 * `Infinity` is not returned. The search is capped at `maxSlop`, default 64
 * points, and hitting the cap means the layout is loose enough that tolerance is
 * not the binding constraint on it.
 */
export function maxSlopWithoutEncroachment(
  targets: readonly TargetCircle[],
  kind: TargetKind,
  base: ToleranceProfile,
  maxSlop = 64,
  toleranceOfSearch = 0.01,
): number {
  const hasViolation = (slop: number): boolean => {
    const profile: ToleranceProfile = {
      label: `${base.label} probe`,
      pointerClass: base.pointerClass,
      slop: { ...base.slop, [kind]: slop },
    };
    return analyseContention(compileLayout(targets, profile)).violations.length > 0;
  };

  if (hasViolation(0)) return 0;
  if (!hasViolation(maxSlop)) return maxSlop;

  let low = 0;
  let high = maxSlop;
  while (high - low > toleranceOfSearch) {
    const mid = (low + high) / 2;
    if (hasViolation(mid)) high = mid;
    else low = mid;
  }
  return low;
}

export interface ToleranceCostRow {
  readonly slop: number;
  /** Exclusive radius of the target the slop was spent on. */
  readonly gained: number;
  /** Exclusive radius of the neighbour it was taken from. */
  readonly neighbourLost: number;
  readonly encroaches: boolean;
}

/**
 * The tradeoff, tabulated, for a named target against a named neighbour.
 *
 * This is the function to point at when someone asks why the slop is 8 and not
 * 20. It shows the neighbour's exclusive radius shrinking point for point as the
 * target's grows, and the row where encroachment starts.
 */
export function toleranceCostCurve(
  targets: readonly TargetCircle[],
  kind: TargetKind,
  subjectId: string,
  neighbourId: string,
  base: ToleranceProfile,
  slops: readonly number[],
): readonly ToleranceCostRow[] {
  return slops.map((slop) => {
    const profile: ToleranceProfile = {
      label: `${base.label} at slop ${slop}`,
      pointerClass: base.pointerClass,
      slop: { ...base.slop, [kind]: slop },
    };
    const layout = compileLayout(targets, profile);
    return {
      slop,
      gained: exclusiveRadius(layout, subjectId).radius,
      neighbourLost: exclusiveRadius(layout, neighbourId).radius,
      encroaches: analyseContention(layout).violations.length > 0,
    };
  });
}

/** Exclusive radius for every target in the layout, worst first. */
export function exclusiveRadii(layout: CompiledLayout): readonly ExclusiveRadius[] {
  const rows = layout.targets.map((t: CompiledTarget) => exclusiveRadius(layout, t.target.id));
  return [...rows].sort((a, b) => a.radius - b.radius);
}
