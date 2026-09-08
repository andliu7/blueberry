/**
 * Hit testing: given a pointer position and a compiled layout, which target is
 * hit.
 *
 * THE RANKING RULE, AND WHY IT IS THIS ONE.
 *
 * A candidate is any target whose effective circle contains the point. Among
 * candidates the winner is the one with the smallest NORMALISED distance,
 *
 *     n(t) = distance(point, centre(t)) / effectiveRadius(t)
 *
 * so a target is judged on how deep into its own footprint the point landed,
 * not on raw distance.
 *
 * THE THREE RULES THIS WAS CHOSEN OVER, AND WHAT EACH DOES TO THE MEASURED
 * ALCHEMIE GEOMETRY. That geometry is a bond end handle 15.7 points across whose
 * centre sits 41.4 points from the centre of a 71.5 point atom, which puts the
 * handle's inner ink edge at 33.55 and the atom's rim at 35.75, so the two
 * silhouettes overlap by 2.2 points. Numbers measured, see
 * `reference-layouts.ts`.
 *
 *   Nearest centre. The decision boundary is the perpendicular bisector of the
 *   two centres, at 20.7 points from the atom's centre. A 15.7 point handle
 *   would win 15.05 points of the atom's own drawn body. The small target eats
 *   the large one, which is the opposite of the intuition people have about this
 *   rule, and it is the reason it is not used.
 *
 *   Containment in draw order, first match wins. The answer in the 2.2 point
 *   overlap depends on paint order rather than on geometry, so it changes when a
 *   renderer reorders its layers, and the hit test cannot be tested without the
 *   renderer.
 *
 *   Containment, smallest containing target wins. Defensible, and close to what
 *   this rule does inside the overlap. But it has no notion of how deep the
 *   point sits, so it cannot report a margin, which means it cannot tell a clean
 *   tap from a contested one, and it returns nothing at all for a point that
 *   falls just outside every target.
 *
 *   Normalised distance, the rule used here, puts the boundary at 33.95 points
 *   from the atom's centre, so the atom keeps its body out to 33.95 and the
 *   handle keeps all of its own ink but 0.4 points of it. Each target keeps
 *   essentially what it looks like it owns, and the ordering is a continuous
 *   quantity, so a margin falls out for free.
 *
 * The boundary between two targets under this rule is the set where
 * d_a/R_a = d_b/R_b, which for unequal radii is an Apollonius circle and for
 * equal radii is the perpendicular bisector. Both are closed form, and the
 * closest point of that boundary to either centre lies on the line joining the
 * centres, because the whole configuration is symmetric about that line. That
 * fact is what makes `exclusiveRadius` below exact rather than sampled, and it
 * is the reason the 44 point check reports a real number.
 *
 * COMPLEXITY. `hitTest` is O(n) in the number of targets in the layout, with one
 * multiply and one compare per target and no square roots, no allocation, and no
 * sorting. There is deliberately no spatial index. A mechanism canvas holds tens
 * of targets, not thousands; the measured throughput is in the geometry report
 * test and it is several orders of magnitude inside the 100 ms interaction to
 * feedback budget in CLAUDE.md. A grid would be more code, another thing to
 * invalidate when the layout animates, and no faster at this n. If a layout ever
 * carries thousands of targets, add the grid then, with the measurement as the
 * evidence.
 *
 * `rankTargets` is O(n log n) because it sorts. It is not on the pointer move
 * path; it exists for disambiguation UI and for the reports.
 */

import type { CompiledLayout, CompiledTarget, TargetCircle } from "./targets.js";
import { distanceSquared, type Point } from "./units.js";

export interface HitCandidate {
  readonly target: TargetCircle;
  /** distance / effectiveRadius. At most 1 for a candidate. */
  readonly normalisedDistance: number;
  /** Raw centre to pointer distance in points. */
  readonly distance: number;
}

export interface HitResult {
  readonly target: TargetCircle;
  readonly normalisedDistance: number;
  readonly distance: number;
  /**
   * The next best candidate, if any. The state machine uses this to decide
   * whether a tap was clear or contested.
   */
  readonly runnerUp: HitCandidate | null;
  /**
   * runnerUp.normalisedDistance minus the winner's, or Infinity when the winner
   * was unopposed. Small means the tap landed in contested ground.
   *
   * This is the number a disambiguation affordance should key off. It is
   * deliberately not thresholded here: geometry reports the margin, the state
   * machine decides what margin is too small, because that decision depends on
   * what the student is in the middle of doing and geometry does not know that.
   */
  readonly margin: number;
}

/**
 * Compare two candidates. Returns negative when `a` should win.
 *
 * Ties are broken by smaller effective radius first, because a tie means the
 * point sits exactly on the Apollonius boundary and the small target has
 * nowhere else to be hit while the large one has plenty of room. Then by id, so
 * the result is deterministic and a test can assert on it. A hit test that
 * returns a different answer for the same input on a different run is a hit test
 * nobody can debug at 1am.
 */
function compareCandidates(
  aNormalised: number,
  a: CompiledTarget,
  bNormalised: number,
  b: CompiledTarget,
): number {
  if (aNormalised !== bNormalised) return aNormalised - bNormalised;
  if (a.effectiveRadius !== b.effectiveRadius) return a.effectiveRadius - b.effectiveRadius;
  return a.target.id < b.target.id ? -1 : a.target.id > b.target.id ? 1 : 0;
}

/**
 * The pointer move path. O(n), no allocation on the miss path, one small object
 * allocated on a hit.
 */
export function hitTest(layout: CompiledLayout, point: Point): HitResult | null {
  let best: CompiledTarget | null = null;
  let bestNormalisedSquared = Number.POSITIVE_INFINITY;
  let bestDistanceSquared = 0;
  let second: CompiledTarget | null = null;
  let secondNormalisedSquared = Number.POSITIVE_INFINITY;
  let secondDistanceSquared = 0;

  for (const entry of layout.targets) {
    const dSquared = distanceSquared(point, entry.target.centre);
    if (dSquared > entry.effectiveRadiusSquared) continue;
    // Comparing squares of the normalised distance is the same ordering as
    // comparing the normalised distances, both being non negative, and it costs
    // no square root.
    const normalisedSquared = dSquared / entry.effectiveRadiusSquared;

    if (
      best === null ||
      compareCandidates(normalisedSquared, entry, bestNormalisedSquared, best) < 0
    ) {
      second = best;
      secondNormalisedSquared = bestNormalisedSquared;
      secondDistanceSquared = bestDistanceSquared;
      best = entry;
      bestNormalisedSquared = normalisedSquared;
      bestDistanceSquared = dSquared;
    } else if (
      second === null ||
      compareCandidates(normalisedSquared, entry, secondNormalisedSquared, second) < 0
    ) {
      second = entry;
      secondNormalisedSquared = normalisedSquared;
      secondDistanceSquared = dSquared;
    }
  }

  if (best === null) return null;

  const bestNormalised = Math.sqrt(bestNormalisedSquared);
  const runnerUp: HitCandidate | null =
    second === null
      ? null
      : {
          target: second.target,
          normalisedDistance: Math.sqrt(secondNormalisedSquared),
          distance: Math.sqrt(secondDistanceSquared),
        };

  return {
    target: best.target,
    normalisedDistance: bestNormalised,
    distance: Math.sqrt(bestDistanceSquared),
    runnerUp,
    margin: runnerUp === null ? Number.POSITIVE_INFINITY : runnerUp.normalisedDistance - bestNormalised,
  };
}

/**
 * Every candidate under the pointer, best first. Not on the pointer move path.
 *
 * Use this to build a disambiguation list. It is also what the fingertip report
 * reads when it needs to say what was hit instead of the intended target.
 */
export function rankTargets(layout: CompiledLayout, point: Point): readonly HitCandidate[] {
  const candidates: { entry: CompiledTarget; normalised: number; distance: number }[] = [];
  for (const entry of layout.targets) {
    const dSquared = distanceSquared(point, entry.target.centre);
    if (dSquared > entry.effectiveRadiusSquared) continue;
    candidates.push({
      entry,
      normalised: Math.sqrt(dSquared / entry.effectiveRadiusSquared),
      distance: Math.sqrt(dSquared),
    });
  }
  candidates.sort((a, b) => compareCandidates(a.normalised, a.entry, b.normalised, b.entry));
  return candidates.map((c) => ({
    target: c.entry.target,
    normalisedDistance: c.normalised,
    distance: c.distance,
  }));
}

/**
 * The distance from `a`'s centre to the decision boundary with `b`, along the
 * line joining them. Exact, see the header note.
 *
 * If the two centres coincide the boundary is undefined and this returns 0,
 * which is the honest answer: a target sitting exactly on another has no
 * exclusive area at all.
 */
export function boundaryDistance(a: CompiledTarget, b: CompiledTarget): number {
  const d = Math.sqrt(distanceSquared(a.target.centre, b.target.centre));
  const sum = a.effectiveRadius + b.effectiveRadius;
  if (sum === 0) return 0;
  return (d * a.effectiveRadius) / sum;
}

export interface ExclusiveRadius {
  readonly targetId: string;
  /** Radius of the largest disc around the centre in which this target wins
   * every point. Capped by the target's own effective radius, since outside
   * that the target is not a candidate at all. */
  readonly radius: number;
  /** The neighbour that set the limit, or null when the target's own effective
   * radius was the binding constraint and nothing contests it. */
  readonly limitedBy: string | null;
}

/**
 * The largest disc centred on the target inside which the target always wins.
 *
 * This is the number that should be compared against the 44 point budget, not
 * the drawn diameter. A 44 point circle with a neighbour's boundary cutting 8
 * points off one side is not a 44 point target, and reporting it as one is how a
 * layout passes a check and fails a thumb.
 */
export function exclusiveRadius(layout: CompiledLayout, targetId: string): ExclusiveRadius {
  const self = layout.byId.get(targetId);
  if (self === undefined) throw new Error(`no target with id ${targetId} in layout`);

  let radius = self.effectiveRadius;
  let limitedBy: string | null = null;

  for (const other of layout.targets) {
    if (other === self) continue;
    const limit = boundaryDistance(self, other);
    if (limit < radius) {
      radius = limit;
      limitedBy = other.target.id;
    }
  }

  return { targetId, radius, limitedBy };
}
