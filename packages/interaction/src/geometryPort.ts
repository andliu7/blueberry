/**
 * The only thing this state machine needs from hit testing, written as an
 * interface so the two can be built and tested independently.
 *
 * `src/geometry/` is owned by a different builder: it holds hit target geometry,
 * snapping, and the synthetic fingertip model. This file is not that. It is the
 * contract the state machine codes against, declared on the consumer side so the
 * machine has no dependency on the implementation and so its tests can pass a
 * five line fake.
 *
 * That direction matters. If the machine imported concrete geometry, then every
 * state machine test would also be a geometry test, and a fingertip model change
 * would turn a pointer session test red for a reason that has nothing to do with
 * pointer sessions.
 *
 * WHAT THE MACHINE ASSUMES THE GEOMETRY PACKAGE PROVIDES.
 *
 * 1. `hitTest` is a pure function of its query. Same query, same answer. No time,
 *    no randomness, no internal cursor.
 * 2. It never throws, and a miss is the `empty` target rather than null, because
 *    "nothing is here" is an answer the machine acts on and a null is not.
 * 3. It reads `pointerType` and applies its own contact radius per kind. A
 *    fingertip is not a pen tip. This package does not own that number.
 * 4. It reads `armedSource` and may offer `betweenAtomsSite` targets that exist
 *    only while a source is armed, so a bond that does not exist yet still has
 *    somewhere to tap.
 * 5. `margin` is how much better the winner was than the runner up. The state
 *    machine, not geometry, decides what margin is too small to act on
 *    confidently; the threshold is `AMBIGUOUS_MARGIN` below and it is the only
 *    one in the package.
 *
 * WHAT THE ADAPTER IN BETWEEN HAS TO DO, AND WHO OWNS IT.
 *
 * `src/geometry/` speaks in circles: `{ id, kind, centre, radius }`, where `kind`
 * is one of a small geometric set and `id` is a layout key. This file speaks in
 * chemistry: a lone pair on THIS atom, the handle at THIS end of THIS bond. The
 * translation between them needs a table from layout id to semantic target, and
 * only the code that BUILT the layout has that table, which is the renderer in
 * Phase 4. So the adapter belongs with the layout builder, not here and not in
 * geometry. It is about twenty lines: run `compileLayout` once per layout change,
 * call `hitTest` per event, map `result.target.id` through the table, and turn a
 * miss into `{ kind: "empty", point }`.
 *
 * Two things that table cannot supply, recorded rather than assumed:
 *   - geometry's kind set has no bond body, no unpaired electron, and no bond
 *     formation site. Either those kinds get added there, or the layout builder
 *     synthesises them.
 *   - reagent tiles, candidate cards and palette buttons are real widgets in the
 *     shell, not circles on a canvas. The shell already knows which one was
 *     tapped, so it should build the HitTarget itself and dispatch a `command`
 *     event. It never needs to hit test at all.
 */

import type { AtomId } from "@blueberry/chem-core";
import type { Point2, PointerKind } from "./pointer.js";
import type { HitTarget } from "./targets.js";

/**
 * What the machine tells the hit tester about the current selection.
 *
 * Only the parts geometry could act on. A lone pair armed on an oxygen means
 * every nearby atom becomes a plausible bond formation site; a bond armed at one
 * end means the same for that end.
 */
export interface ArmedSourceHint {
  /** The atom the armed electrons currently sit on, when there is one. */
  readonly atomId: AtomId | null;
  /** The target the student actually touched to arm it. */
  readonly target: HitTarget;
}

export interface HitTestQuery {
  readonly point: Point2;
  readonly pointerType: PointerKind;
  /** Null when nothing is selected. */
  readonly armedSource: ArmedSourceHint | null;
}

export interface ScoredTarget {
  readonly target: HitTarget;
  /**
   * Lower is better. The units are the geometry package's business; the machine
   * only relies on the ordering, best first.
   */
  readonly score: number;
}

export interface HitTestOutcome {
  /** Never null. `empty` when nothing is under the point. */
  readonly primary: HitTarget;
  /** Best first, and `candidates[0]` is `primary` when the list is non empty. */
  readonly candidates: readonly ScoredTarget[];
  /**
   * How much better the winner scored than the runner up, and `Infinity` when
   * nothing contested it. Geometry reports this number and deliberately does not
   * threshold it; see AMBIGUOUS_MARGIN.
   */
  readonly margin: number;
}

/**
 * Below this margin, a hit is treated as contested.
 *
 * ONE named constant, in ONE place, because the geometry package explicitly
 * hands this decision over and two thresholds that drift apart is the failure
 * mode that invites. The machine still ACTS on the winner rather than stopping
 * to ask, because stopping to ask on every crowded tap is worse than acting and
 * offering `reviseLastTarget`; it just says so in a notice.
 *
 * 0.15 of a normalised radius is a starting value, not a measured one. The
 * fingertip model in `src/geometry/` can produce a measured one, and when it
 * does, this number should be replaced with the evidence next to it.
 */
export const AMBIGUOUS_MARGIN = 0.15;

export function isContested(outcome: HitTestOutcome): boolean {
  return outcome.margin < AMBIGUOUS_MARGIN;
}

export interface HitTester {
  hitTest(query: HitTestQuery): HitTestOutcome;
}

/**
 * Everything the reducer needs from the outside world, in one bag.
 *
 * Passed to `reduce` rather than captured in a closure so the reducer stays a
 * pure function of (state, event, environment) and a test can swap the tester
 * per call.
 */
export interface InteractionEnvironment {
  readonly hitTester: HitTester;
}
