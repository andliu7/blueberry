/**
 * The 44 by 44 point minimum hit target from the Budgets table in CLAUDE.md,
 * made checkable against a layout so a later phase can gate on it.
 *
 * HOW A SQUARE BUDGET IS CHECKED AGAINST ROUND TARGETS.
 *
 * The budget is written as 44 by 44 points, which is the Apple guideline and is
 * stated for a rectangle. Every target here is a circle. The reading used is
 * that a circular target satisfies a 44 by 44 budget when a 44 point diameter
 * disc centred on it belongs entirely to it, which is the disc inscribed in the
 * 44 by 44 square. That is the strictest reading a circle can satisfy at all: a
 * circle can never contain a 44 by 44 square without being 62 points across, and
 * holding round targets to that would fail every real design including Apple's
 * own round controls. The reading is recorded here rather than left implicit,
 * because a reader who assumed the other one would think this check is loose.
 *
 * WHAT IS MEASURED IS THE EXCLUSIVE RADIUS, NOT THE DRAWN RADIUS.
 *
 * A target drawn 44 points across with a neighbour's decision boundary cutting 8
 * points off one side is not a 44 point target. `exclusiveRadius` in
 * `hit-test.ts` gives the exact radius of the disc the target wins outright, and
 * that is what is compared. Both numbers are reported so a failure says whether
 * the target is too small or merely too crowded, which are different bugs with
 * different fixes.
 */

import { exclusiveRadius } from "./hit-test.js";
import type { CompiledLayout } from "./targets.js";
import { MINIMUM_HIT_TARGET_POINTS } from "./units.js";

export interface MinimumTargetRow {
  readonly targetId: string;
  readonly kind: string;
  /** Twice the drawn radius. What the target looks like it is worth. */
  readonly drawnDiameter: number;
  /** Twice the effective radius, drawn plus tolerance, ignoring neighbours. */
  readonly nominalDiameter: number;
  /** Twice the exclusive radius. What the target is actually worth. */
  readonly exclusiveDiameter: number;
  /** The neighbour that cut it down, if any. */
  readonly limitedBy: string | null;
  readonly passes: boolean;
  /** Points short of the minimum. Zero or negative when it passes. */
  readonly shortfall: number;
}

export interface MinimumTargetReport {
  readonly minimumPoints: number;
  readonly profile: string;
  /** Every target, worst exclusive diameter first. */
  readonly rows: readonly MinimumTargetRow[];
  readonly failures: readonly MinimumTargetRow[];
  readonly passes: boolean;
  /** Fraction of targets meeting the budget, 0 to 1. */
  readonly passRate: number;
}

export function checkMinimumHitTargets(
  layout: CompiledLayout,
  minimumPoints: number = MINIMUM_HIT_TARGET_POINTS,
): MinimumTargetReport {
  const rows: MinimumTargetRow[] = layout.targets.map((entry) => {
    const exclusive = exclusiveRadius(layout, entry.target.id);
    const exclusiveDiameter = exclusive.radius * 2;
    const passes = exclusiveDiameter >= minimumPoints;
    return {
      targetId: entry.target.id,
      kind: entry.target.kind,
      drawnDiameter: entry.target.radius * 2,
      nominalDiameter: entry.effectiveRadius * 2,
      exclusiveDiameter,
      limitedBy: exclusive.limitedBy,
      passes,
      shortfall: minimumPoints - exclusiveDiameter,
    };
  });

  rows.sort((a, b) => a.exclusiveDiameter - b.exclusiveDiameter);
  const failures = rows.filter((r) => !r.passes);

  return {
    minimumPoints,
    profile: layout.profile.label,
    rows,
    failures,
    passes: failures.length === 0,
    passRate: rows.length === 0 ? 1 : (rows.length - failures.length) / rows.length,
  };
}

/**
 * The centre to centre separation two targets of the given effective radii need
 * so that both clear the minimum.
 *
 * Falls straight out of the boundary formula. For target a the boundary sits at
 * d * Ra / (Ra + Rb) from a's centre, and that has to be at least half the
 * minimum; the same for b. Solving both and taking the larger gives
 *
 *     d >= (minimum / 2) * (Ra + Rb) / min(Ra, Rb)
 *
 * For two equal targets that reduces to d >= minimum, which is the rule of thumb
 * worth remembering: two equal targets need their centres a full 44 points
 * apart, not 44 points of gap and not 44 points of diameter.
 *
 * This is the function Phase 4 should call when it places lone pairs on an arc.
 */
export function requiredSeparation(
  effectiveRadiusA: number,
  effectiveRadiusB: number,
  minimumPoints: number = MINIMUM_HIT_TARGET_POINTS,
): number {
  const smaller = Math.min(effectiveRadiusA, effectiveRadiusB);
  if (smaller <= 0) return Number.POSITIVE_INFINITY;
  return ((minimumPoints / 2) * (effectiveRadiusA + effectiveRadiusB)) / smaller;
}

/**
 * The smallest orbit radius at which `count` equally spaced children of the
 * given effective radius, sitting around an atom, all clear the minimum against
 * each other AND against the atom they hang off.
 *
 * Two constraints, and the answer is the larger:
 *
 *   - sibling to sibling. `count` children equally spaced on a circle of radius
 *     r have chord 2 r sin(pi / count) between neighbours, and equal radii mean
 *     that chord must be at least the minimum.
 *   - child to parent atom. The child's boundary with the atom sits at
 *     r * Rc / (Rc + Ra) from the child's centre and that must clear half the
 *     minimum too.
 *
 * A single child has no sibling constraint, so `count` of 1 or 0 uses the parent
 * constraint alone.
 */
export function requiredOrbitRadius(
  count: number,
  childEffectiveRadius: number,
  atomEffectiveRadius: number,
  minimumPoints: number = MINIMUM_HIT_TARGET_POINTS,
): number {
  const parentConstraint =
    (minimumPoints / 2) * ((childEffectiveRadius + atomEffectiveRadius) / childEffectiveRadius);

  if (count < 2) return parentConstraint;

  const chordConstraint = minimumPoints / (2 * Math.sin(Math.PI / count));
  return Math.max(parentConstraint, chordConstraint);
}
