/**
 * `@blueberry/interaction` geometry: hit testing, tolerance, and the synthetic
 * fingertip model.
 *
 * ============================================================================
 * THE SURFACE THE POINTER STATE MACHINE CODES AGAINST
 * ============================================================================
 *
 * Geometry answers questions about coordinates. It holds no state, knows nothing
 * about gestures, taps, drags, or pointer identity, and never decides what an
 * interaction means. Three functions are the whole contract:
 *
 *   compileLayout(targets, profile) -> CompiledLayout
 *       Call once per layout change. Folds tolerance into each target so the
 *       hot path does no arithmetic it can avoid. Cheap, O(n), but not free, so
 *       do not call it inside a pointer move handler.
 *
 *   hitTest(layout, point) -> HitResult | null
 *       Call on every pointer move and every pointer down. O(n) with no
 *       allocation on a miss. Returns the winning target, the runner up, and the
 *       MARGIN between them.
 *
 *   rankTargets(layout, point) -> HitCandidate[]
 *       Every target under the point, best first. For a disambiguation list. Not
 *       for the hot path, it sorts.
 *
 * ON THE MARGIN, WHICH IS THE ONE THING WORTH READING TWICE. `HitResult.margin`
 * is the difference in normalised distance between the winner and the runner up,
 * and it is `Infinity` when nothing contested the hit. Geometry deliberately
 * does NOT threshold it. Whether a margin of 0.05 is too close to act on depends
 * on what the student is doing, whether an undo is cheap, and whether the
 * gesture is a tap or a drag release, and geometry knows none of that. Pick the
 * threshold in the state machine and pick it once, in a named constant.
 *
 * The pointer class chooses the profile:
 *
 *   TOLERANCE_PROFILES.touch  slop on the small targets, none on atoms
 *   TOLERANCE_PROFILES.pen    a little slop for tremor
 *   TOLERANCE_PROFILES.mouse  no slop at all
 *
 * That is the whole of what "pen is handled distinctly from touch" means at the
 * geometry layer. Pressure, palm rejection, and pointer identity are the state
 * machine's, not geometry's.
 *
 * ON THE FOUR ANSWER SHAPES. CLAUDE.md requires the interaction layer to serve
 * four answer shapes, not one. Geometry is shape agnostic by construction: it
 * hit tests circles with ids and kinds and does not know whether the id names an
 * atom in a mechanism, a reagent tile, or a candidate product card. A reagent
 * tile is a target with a different `kind`; add the kind to `TargetKind` and the
 * tolerance profiles and everything else here works unchanged. Nothing in this
 * directory needs to be rebuilt for the other three shapes, which was the point
 * of keeping chemistry out of it.
 *
 * ============================================================================
 * THE OTHER HALF: MEASUREMENT, NOT RUNTIME
 * ============================================================================
 *
 * `checkMinimumHitTargets`, `analyseContention`, and everything in
 * `fingertip.ts` are the measurement harness the Phase 2 exit condition runs on.
 * They are O(n squared) or worse and they never run on a device. Phase 4 should
 * gate its layouts on `checkMinimumHitTargets`.
 *
 * Every number the fingertip model produces is a MODEL, not an observation of a
 * human. Read the header of `fingertip.ts` before quoting one.
 */

export {
  IPHONE_12,
  MINIMUM_HIT_TARGET_POINTS,
  PIXEL_6A,
  POINTS_PER_MM_ANDROID,
  POINTS_PER_MM_IOS,
  distance,
  distanceSquared,
  millimetresToPoints,
  pointsToMillimetres,
  polar,
  type Point,
  type ReferenceDevice,
} from "./units.js";

export {
  DuplicateTargetIdError,
  EXACT_TOLERANCE,
  InvalidTargetError,
  PEN_TOLERANCE,
  TARGET_KINDS,
  TOLERANCE_PROFILES,
  TOUCH_TOLERANCE,
  compileLayout,
  isOwnerPair,
  isSiblingPair,
  type CompiledLayout,
  type CompiledTarget,
  type TargetCircle,
  type PointerClass,
  type TargetKind,
  type ToleranceProfile,
} from "./targets.js";

export {
  boundaryDistance,
  exclusiveRadius,
  hitTest,
  rankTargets,
  type ExclusiveRadius,
  type HitCandidate,
  type HitResult,
} from "./hit-test.js";

export {
  analyseContention,
  exclusiveRadii,
  maxSlopWithoutEncroachment,
  toleranceCostCurve,
  type ContentionPair,
  type ContentionReport,
  type ToleranceCostRow,
} from "./tolerance.js";

export {
  checkMinimumHitTargets,
  requiredOrbitRadius,
  requiredSeparation,
  type MinimumTargetReport,
  type MinimumTargetRow,
} from "./minimum-target.js";

export {
  FINGERTIP_BIASED,
  FINGERTIP_BUDGET_DERIVED,
  FINGERTIP_CONSERVATIVE,
  FINGERTIP_PESSIMISTIC,
  coveredTargets,
  isAmbiguousUnderFingertip,
  misTapRate,
  misTapRateMonteCarlo,
  misTapSweep,
  sigmaForCaptureRate,
  type Confusion,
  type ContactPatch,
  type FingertipModel,
  type MisTapReport,
  type QuadratureOptions,
  type SweepRow,
} from "./fingertip.js";

export {
  ALCHEMIE_MEASURED_SCALE,
  BLUEBERRY_PROPOSED_SCALE,
  atomWithSatellites,
  compiled,
  lonePairRing,
  lonePairTargetRadius,
  tightestBondHandleLayout,
  tightestLonePairLayout,
  type CanvasScale,
  type SatelliteSpec,
} from "./reference-layouts.js";
