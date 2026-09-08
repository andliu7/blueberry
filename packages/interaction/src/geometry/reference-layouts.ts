/**
 * The layouts the mis tap numbers are measured on, and where their dimensions
 * came from.
 *
 * A mis tap rate quoted without its layout is not a number, it is a mood. Every
 * layout used in a report is constructed here, from named constants, so a
 * reviewer can rebuild the scene and get the same figure.
 *
 * ============================================================================
 * ALCHEMIE_MEASURED_SCALE: MEASURED, NOT ESTIMATED
 * ============================================================================
 *
 * These numbers were measured off the committed captures. Method, so it can be
 * repeated or disputed:
 *
 *   Captures `docs/reference/alchemie/01-mechanism-canvas-full.png` and
 *   `docs/reference/alchemie/extra/x02-bond-handle-drag.png`, both 2556 by 1179
 *   device pixels. That raster is the iPhone 14 Pro class panel in landscape,
 *   which is 852 by 393 POINTS at a 3x scale factor, so every pixel measurement
 *   divides by 3 to give points. The scale factor is the only assumption and it
 *   is checkable from the raster size alone.
 *
 *   Atom spheres were segmented by colour, red for oxygen and near black for
 *   carbon, and measured by bounding box across three atoms in two captures:
 *   71.3, 71.7, 71.3, 71.3, 71.7 points. Recorded as 71.5.
 *
 *   Bond end handles were measured twice by independent methods that agree to
 *   0.1 point. First, a white pixel width profile taken down the left capsule of
 *   the C=O double bond in capture 01: the shaft holds a constant 9.33 points and
 *   bulges to 15.67 points at both ends, and those bulges are the handles.
 *   Second, capture x02 has a handle pulled off its bond, leaving the stub
 *   isolated against the background as a blob of 15.7 by 16.0 points at
 *   circularity 0.98.
 *
 *   Handle centre to owning atom centre came from the same profile: the double
 *   bond handles sit at 41.5 and 41.3 points from their atoms. Recorded as 41.4.
 *   Handles elsewhere in the scene fall between 38 and 43 points, so treat 41.4
 *   as a central value and not a tolerance.
 *
 *   Lone pair dots are the six white circles around the carboxylate oxygen, each
 *   15.7 to 15.8 points across at circularity 0.98 to 1.01, sitting on an orbit
 *   of 58.0 to 61.3 points, mean 59.5. They group into three pairs whose members
 *   are 25.2 points apart, with the three pair axes about 92 degrees apart.
 *
 *   The two capsules of the C=O double bond are 29.2 points apart, so the two
 *   handles at one atom are 29.2 points apart. That is the tightest pair of
 *   independently tappable targets anywhere in the captures.
 *
 *   The formal charge badge is a grey disc 24.0 points across.
 *
 * THE FINDING THAT MATTERS. Alchemie's bond end handles are 15.7 points across
 * and the two of them at one atom sit 29.2 points apart. The budget in CLAUDE.md
 * is 44 by 44 points. Their atom spheres beat the budget by 60 percent and their
 * handles miss it by a factor of nearly three, which is exactly what
 * `OBSERVATIONS.md` says in prose: strong on atoms, weak on bond handles. It is
 * now a number instead of an impression.
 *
 * ============================================================================
 * BLUEBERRY_PROPOSED_SCALE: DERIVED, AND NOT FINAL
 * ============================================================================
 *
 * These are not measurements of anything. They are the output of running the
 * checkers in this package backwards: the smallest dimensions at which every
 * target in the tightest corpus layout clears 44 points of exclusive diameter
 * under the touch profile. Phase 4 owns rendering and owns the final numbers.
 * What this package owns is the gate they have to pass, and a worked example of
 * a layout that passes it.
 *
 * WHAT THE CORPUS SAYS ABOUT "TIGHTEST". Scanning the 101 committed fixtures in
 * `packages/validators/fixtures/`, 710 atoms carry a lone pair count and the
 * maximum is four, on halide anions: bromide 98 times, chloride 23, fluoride 2,
 * iodide 1. The next case is a bound halogen at three lone pairs plus one bond,
 * bromine 87 times. Both put four satellites around one atom, so both give 90
 * degree spacing, and 90 degrees is therefore the tightest angular spacing the
 * corpus produces. The bound halogen is the harsher of the two because its
 * satellites are of two different kinds and sizes, so it is the one used below.
 */

import { compileLayout, type CompiledLayout, type TargetCircle, type ToleranceProfile } from "./targets.js";
import { TOUCH_TOLERANCE } from "./targets.js";
import { polar, type Point } from "./units.js";

export interface CanvasScale {
  readonly label: string;
  readonly atomDiameter: number;
  readonly bondHandleDiameter: number;
  readonly bondShaftWidth: number;
  /** Handle centre to its atom's centre, along the bond axis, for a single bond. */
  readonly handleDistance: number;
  /** Perpendicular separation between the two handles of a double bond. */
  readonly doubleBondHandleSeparation: number;
  readonly lonePairDotDiameter: number;
  readonly lonePairDotSeparation: number;
  /** Centre of the lone PAIR to the atom's centre. */
  readonly lonePairOrbitRadius: number;
  readonly chargeBadgeDiameter: number;
}

/** Every field measured. See the header for the method. */
export const ALCHEMIE_MEASURED_SCALE: CanvasScale = {
  label: "alchemie, measured from the committed captures",
  atomDiameter: 71.5,
  bondHandleDiameter: 15.7,
  bondShaftWidth: 9.3,
  handleDistance: 41.4,
  doubleBondHandleSeparation: 29.2,
  lonePairDotDiameter: 15.8,
  lonePairDotSeparation: 25.2,
  // The dots orbit at 59.5. The pair's centre is the midpoint of its two dots,
  // which sits at 59.5 * cos(12.5 degrees) = 58.1 because the dots are half the
  // pair's 25 degree span either side of the pair axis.
  lonePairOrbitRadius: 58.1,
  chargeBadgeDiameter: 24.0,
};

/**
 * Derived, not measured, and not final. See the header.
 *
 * The three numbers that differ most from the bar, and why:
 *
 *   bondHandleDiameter 30 against their 15.7. A handle needs 22 points of
 *   effective radius to clear the budget. With 8 points of touch slop that is 14
 *   points of drawn radius, and 15 is taken for headroom. Their handle cannot
 *   clear the budget at any slop that does not encroach on the atom.
 *
 *   doubleBondHandleSeparation 44 against their 29.2. Two equal targets need
 *   their centres a full 44 points apart for both to clear a 44 point disc. This
 *   one is not a judgement call, it falls out of `requiredSeparation`.
 *
 *   handleDistance 54 against their 41.4. A handle that sits ON the atom rim,
 *   which theirs does and by 2.2 points inside it, cannot be given tolerance
 *   without taking points a student can see are part of the atom. Pushing the
 *   handle clear is what buys the tolerance. This is the single change with the
 *   largest effect on the mis tap numbers.
 */
export const BLUEBERRY_PROPOSED_SCALE: CanvasScale = {
  label: "blueberry, derived from the 44 point budget",
  atomDiameter: 64,
  bondHandleDiameter: 30,
  bondShaftWidth: 10,
  handleDistance: 54,
  doubleBondHandleSeparation: 44,
  lonePairDotDiameter: 16,
  lonePairDotSeparation: 25,
  lonePairOrbitRadius: 54,
  chargeBadgeDiameter: 24,
};

/** The circle that contains both dots of a lone pair, which is the pair's
 * target. Half the dot separation plus one dot radius. */
export function lonePairTargetRadius(scale: CanvasScale): number {
  return scale.lonePairDotSeparation / 2 + scale.lonePairDotDiameter / 2;
}

export interface SatelliteSpec {
  readonly kind: "lone_pair" | "bond_handle" | "implicit_hydrogen";
  /** Degrees counter clockwise from the positive x axis. */
  readonly degrees: number;
}

/**
 * One atom with satellites on an arc around it. This is the shape of every tight
 * case in the corpus, because tightness in a mechanism canvas is always about
 * what is crowded around a single atom and never about two atoms being close,
 * atoms being separated by a bond length.
 */
export function atomWithSatellites(
  scale: CanvasScale,
  centre: Point,
  satellites: readonly SatelliteSpec[],
  atomId = "atom",
): readonly TargetCircle[] {
  const targets: TargetCircle[] = [
    { id: atomId, kind: "atom", centre, radius: scale.atomDiameter / 2 },
  ];

  satellites.forEach((satellite, index) => {
    const orbit =
      satellite.kind === "bond_handle" ? scale.handleDistance : scale.lonePairOrbitRadius;
    const radius =
      satellite.kind === "bond_handle"
        ? scale.bondHandleDiameter / 2
        : lonePairTargetRadius(scale);
    targets.push({
      id: `${atomId}:${satellite.kind}:${index}`,
      kind: satellite.kind,
      centre: polar(centre, orbit, satellite.degrees),
      radius,
      ownerAtomId: atomId,
    });
  });

  return targets;
}

/**
 * THE TIGHTEST LONE PAIR CASE IN THE CORPUS.
 *
 * A bound halogen: three lone pairs and one bond, four satellites at 90 degrees.
 * Bromine in this arrangement appears 87 times in the committed fixtures, and
 * the free halide with four lone pairs, which has the same 90 degree spacing,
 * appears 124 times. The bond handle is included because a lone pair next to a
 * handle is a harder case than a lone pair next to another lone pair: the two
 * targets are different sizes, so the boundary between them is not the
 * bisector and sits closer to the smaller one.
 */
export function tightestLonePairLayout(scale: CanvasScale, centre: Point = { x: 200, y: 200 }): readonly TargetCircle[] {
  return atomWithSatellites(
    scale,
    centre,
    [
      { kind: "bond_handle", degrees: 0 },
      { kind: "lone_pair", degrees: 90 },
      { kind: "lone_pair", degrees: 180 },
      { kind: "lone_pair", degrees: 270 },
    ],
    "Br",
  );
}

/**
 * THE TIGHTEST BOND HANDLE TO ATOM CASE.
 *
 * A double bond at one atom: two handles side by side, perpendicular to the bond
 * axis, both sitting close to the atom they attach to. This is the arrangement
 * measured at 29.2 points of separation in the Alchemie capture and it is the
 * tightest pair of independently tappable targets there.
 *
 * The handles are placed so their distance from the atom centre matches the
 * scale's `handleDistance`, with the perpendicular offset taken out of the
 * along-axis component. That keeps the two scales comparable: in both, a handle
 * is the same distance from its atom, and only the separation between the pair
 * differs.
 */
export function tightestBondHandleLayout(
  scale: CanvasScale,
  centre: Point = { x: 200, y: 200 },
): readonly TargetCircle[] {
  const half = scale.doubleBondHandleSeparation / 2;
  const alongSquared = scale.handleDistance * scale.handleDistance - half * half;
  const along = alongSquared > 0 ? Math.sqrt(alongSquared) : 0;
  const radius = scale.bondHandleDiameter / 2;

  return [
    { id: "C", kind: "atom", centre, radius: scale.atomDiameter / 2 },
    {
      id: "C:handle:upper",
      kind: "bond_handle",
      centre: { x: centre.x + along, y: centre.y - half },
      radius,
      ownerAtomId: "C",
    },
    {
      id: "C:handle:lower",
      kind: "bond_handle",
      centre: { x: centre.x + along, y: centre.y + half },
      radius,
      ownerAtomId: "C",
    },
  ];
}

/**
 * A ring of lone pairs at an arbitrary orbit radius, for sweeping.
 *
 * Phase 4 has to fit a whole mechanism on a 390 point wide phone and will be
 * tempted to shrink the scale to do it. This is the function that says what
 * shrinking costs: sweep the orbit radius and watch the mis tap rate.
 */
export function lonePairRing(
  scale: CanvasScale,
  orbitRadius: number,
  count: number,
  centre: Point = { x: 200, y: 200 },
): readonly TargetCircle[] {
  const targets: TargetCircle[] = [
    { id: "X", kind: "atom", centre, radius: scale.atomDiameter / 2 },
  ];
  for (let i = 0; i < count; i += 1) {
    targets.push({
      id: `X:lone_pair:${i}`,
      kind: "lone_pair",
      centre: polar(centre, orbitRadius, (360 / count) * i),
      radius: lonePairTargetRadius(scale),
      ownerAtomId: "X",
    });
  }
  return targets;
}

export function compiled(
  targets: readonly TargetCircle[],
  profile: ToleranceProfile = TOUCH_TOLERANCE,
): CompiledLayout {
  return compileLayout(targets, profile);
}
