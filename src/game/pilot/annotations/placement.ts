/**
 * Where an atom's implicit hydrogens and lone pairs sit: one allocator, one
 * free arc set, shared between both kinds, computed in a bond-relative frame.
 *
 * Pure TypeScript. No React, no DOM, no pixels. Everything here is in SCENE
 * space: y grows UP, angles are radians measured counter-clockwise from the
 * positive x axis, and distances are scene units (one standard bond length =
 * 1). A renderer flips y once when it converts to SVG, exactly as
 * render/layout/vec.ts and hitLayout.ts already do. Nothing in this module
 * knows that a screen exists, which is what lets the art layer and the hit
 * layer both read it and be unable to disagree.
 *
 * ---------------------------------------------------------------------------
 * THE BUG THIS EXISTS TO FIX
 *
 * `openAngle` already means "the direction AWAY from this atom's bonds". Both
 * producers agree on that:
 *
 *   src/render/layout/layout.ts        openDirection -> angleOf(scale(sum, -1))
 *   src/tabs/trainer/hitLayout.ts      resettleOpenAngles -> Math.atan2(-sy, -sx)
 *
 * But both lone pair consumers then fan from `openAngle + Math.PI`, which is
 * the direction the sum of the bonds points, so the fan lands back ON the
 * bonds. For an atom with ONE bond, openAngle + Math.PI is EXACTLY the bond
 * direction: on H-Br every one of bromine's three lone pairs is drawn down the
 * H-Br bond. For a bent two bond atom it lands on the bisector between them,
 * which is the one direction a lone pair can never occupy.
 *
 * The hydrogen arc never had the bug: MoleculeSvg passes `openAngle` straight
 * through to HydrogenArc with no + Math.PI.
 *
 * ---------------------------------------------------------------------------
 * THE ONE LINE EACH SHIPPED FILE NEEDS, RECORDED HERE AND NOT APPLIED
 *
 * Not applied in this wave: rows 2, 3 and 4 of the inventory share those files
 * and must keep working. These two must land in the SAME commit as each other,
 * because the art and the hit targets have to agree about where a lone pair is
 * or a student taps one place and the electrons leave from another.
 *
 *   src/render/svg/MoleculeSvg.tsx:72
 *     -   const angle = placement.openAngle + Math.PI + (i - (count - 1) / 2) * 1.25;
 *     +   const angle = placement.openAngle + (i - (count - 1) / 2) * 1.25;
 *
 *   src/tabs/trainer/hitLayout.ts:70
 *     -   const angle = atom.from.openAngle + Math.PI + (i - (atom.fromLonePairs - 1) / 2) * 1.25;
 *     +   const angle = atom.from.openAngle + (i - (atom.fromLonePairs - 1) / 2) * 1.25;
 *
 * A third site is a consequence rather than a cause and needs the same edit
 * when those two land, because it feeds the (wrong) lone pair direction in as
 * a hydrogen keep-out:
 *
 *   src/tabs/trainer/DrawCanvas.tsx:928 and :938
 *     -   ...(atom.fromLonePairs > 0 ? [atom.from.openAngle + Math.PI] : [])
 *     +   ...(atom.fromLonePairs > 0 ? [atom.from.openAngle] : [])
 *
 * Those three edits fix the direction. They do NOT fix the sharing: a fanned
 * lone pair and a gap-filled hydrogen still choose their angles independently
 * and can land on each other. That is what `placeAnnotations` below replaces
 * them with in wave 2, one call per atom for both kinds at once.
 *
 * ---------------------------------------------------------------------------
 * THE RULE
 *
 * 0. Everything is computed in a BOND-RELATIVE frame. A canonical reference
 *    direction is derived from the bond set alone (the circular mean of the
 *    bond directions; see `canonicalFrame` for the symmetric-set fallback),
 *    every bond angle is rewritten relative to it, the whole allocation runs
 *    in that frame, and the result is rotated back at the end. Rotating the
 *    molecule rotates the reference with it, so the same molecule at any
 *    orientation gets the same placement, rotated. Without this, ordering
 *    ties broke on absolute scene angle and a hydrogen and a lone pair could
 *    TRADE PLACES as the molecule turned, which reads as the app glitching
 *    and re-points an armed hit target mid-gesture.
 * 1. Every real bond direction claims a keep-out cone of +/- `bondClearance`.
 * 2. Those cones are merged on the circle. What is left over is the free arc
 *    set. A leftover sliver narrower than MIN_USABLE_ARC is discarded: it is
 *    too narrow to hold even one drawn slot (see the constant), not somewhere
 *    a student reads as "away from the bonds".
 * 3. Hydrogens and lone pairs are allocated into that ONE shared arc set, not
 *    each into its own. Slots go to the widest gap first, by the
 *    highest-averages rule: each slot goes to the arc with the largest
 *    width / (slots already there + 1), so the widest gap is used first and
 *    keeps being used while it is still the roomiest per slot. Ties go to the
 *    arc with the smaller bond-relative start.
 * 4. Within an arc the k slots sit at width * (i + 0.5) / k: even spacing
 *    with a half-gap inset at each end, so the slots SPREAD ACROSS THE FULL
 *    free arc instead of bunching into its middle. This is the round 2
 *    change that closed the spacing gap against the bar: with the old
 *    (i + 1) / (k + 1) insets, a one-bond atom's three lone pairs sat 29.8 px
 *    apart at the app's 28 px rim against the bar's 38.9; with the half-gap
 *    spread and the geometric clearance below they sit 43.4 px apart.
 * 5. Kinds are assigned by openness: the most open positions go to lone
 *    pairs, the rest to hydrogens. Lone pairs are the domains a student has
 *    to be able to hit and drag, they are drawn small on the rim, and VSEPR
 *    puts the largest electron domains furthest from the bonding pairs.
 *    Ties break on bond-relative angle ascending, so the result is
 *    deterministic AND rotation-invariant.
 *
 * Because both kinds draw from one ordered list of distinct positions, a
 * hydrogen and a lone pair can never be handed the same angle. They also do
 * not share a circle: by default hydrogens orbit at 0.75 of the lone pair
 * radius, the shipped app's own two-ring geometry (HydrogenArc at the atom
 * disc, ATOM_R = 21 px; lone pairs at (ATOM_R + 7) = 28 px; 21 / 28 = 0.75).
 *
 * ---------------------------------------------------------------------------
 * DEGRADATION, DEFINED RATHER THAN DISCOVERED
 *
 * When the keep-out cones cover the whole circle, or every surviving gap is a
 * sub-MIN_USABLE_ARC sliver, there is nowhere honest to put anything. At the
 * geometric default clearance no drawable molecule gets there (four bonds at
 * 90 degrees still leave four usable gaps), but a caller can pass a larger
 * clearance and a hostile input can pack bonds, so the mode is defined:
 *
 *   - It finds the widest RAW gap between two adjacent bond directions,
 *     ignoring clearance, and treats that single gap as the arc.
 *   - Every slot goes there, spread by the same half-gap rule, so slots stay
 *     distinct from each other and off the bonds bounding the gap.
 *   - Every slot gets `crowded: true`, and so does the result.
 *   - `minBondDistance` then reports how close the worst slot actually came
 *     to a bond, which in this mode is less than `bondClearance` by
 *     construction.
 *
 * A caller that cares can read `crowded` and do something about it (fade the
 * glyphs, collapse three hydrogens to an "H3" chip, drop the lone pair dots
 * to a count). Deciding that is presentation and belongs to the caller. This
 * module's job is to be deterministic and to say plainly that it ran out of
 * room.
 */

/** A point in scene units. Deliberately not `Vec`: nothing here has depth. */
export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export type AnnotationKind = "hydrogen" | "lonePair";

export interface AnnotationSlot {
  readonly kind: AnnotationKind;
  /**
   * Position within its own kind, counting up from the bond-relative frame's
   * zero direction. Stable across renders AND under whole-molecule rotation:
   * rotating every bond by theta rotates every slot by theta and keeps its
   * index, so a hit target keyed on (kind, index) keeps pointing at the same
   * dot. (For a bond set that is exactly symmetric under some rotation the
   * numbering is stable up to that symmetry, which maps the slots onto
   * themselves anyway.)
   */
  readonly index: number;
  /** Scene radians, normalised to [0, 2 pi). */
  readonly angle: number;
  /** Scene units: the atom centre plus the kind's radius at `angle`. */
  readonly pos: Point2D;
  /** Radians to the nearest bond direction, in [0, pi]. Pi when the atom has no bonds. */
  readonly bondDistance: number;
  /** True when this slot had to be placed inside a bond keep-out cone. See DEGRADATION. */
  readonly crowded: boolean;
}

/** A run of directions no bond claims. `start` is in [0, 2 pi); `width` is positive radians. */
export interface FreeArc {
  readonly start: number;
  readonly width: number;
}

export interface AnnotationPlacement {
  readonly hydrogens: readonly AnnotationSlot[];
  readonly lonePairs: readonly AnnotationSlot[];
  /** The usable free arcs the allocation drew from, ascending by start. Empty in the degraded mode. */
  readonly freeArcs: readonly FreeArc[];
  /** True when the degraded mode ran, i.e. at least one slot sits inside a keep-out cone. */
  readonly crowded: boolean;
  /** Smallest `bondDistance` over every slot. Infinity when there are no slots. */
  readonly minBondDistance: number;
  /** Smallest angular gap between any two slots of either kind. Infinity below two slots. */
  readonly minSlotSeparation: number;
}

export interface AnnotationRequest {
  /** Atom centre in scene units. Defaults to the origin. */
  readonly centre?: Point2D;
  /**
   * Direction of every REAL bond leaving this atom, scene radians, pointing
   * from this atom toward its neighbour. Implicit hydrogens are not bonds here:
   * they are what this module is placing.
   */
  readonly bondAngles: readonly number[];
  readonly hydrogenCount: number;
  readonly lonePairCount: number;
  /** Orbit radius for lone pair slots, scene units. */
  readonly radius: number;
  /**
   * Orbit radius for hydrogen glyphs, scene units. Defaults to
   * `radius * HYDROGEN_RING_RATIO`, the shipped app's two-ring geometry, so
   * the two kinds never share a circle unless a caller asks them to.
   */
  readonly hydrogenRadius?: number;
  /** Half-width of a bond's keep-out cone, radians. Defaults to BOND_CLEARANCE. */
  readonly bondClearance?: number;
}

const TAU = Math.PI * 2;
const EPS = 1e-9;

/**
 * Half-width of a bond's keep-out cone, radians (27.5 degrees).
 *
 * Derived from what the drawn geometry needs at the shipped rim, not lifted
 * from anywhere. Lone pairs orbit at 28 px (ATOM_R 21 + 7, MoleculeSvg.tsx). A
 * single bond rod is BOND_WIDTH = 10 px wide (depth.tsx), half-width 5 px. A
 * lone pair is two 2.4 px dots offset 3.4 px either side of its slot, so its
 * tangential half-extent is 5.8 px. For the pair's near dot to clear the rod's
 * edge with a 2.1 px margin:
 *
 *   28 * sin(0.48) = 12.9 px >= 5 (rod) + 5.8 (pair) + 2.1 (margin)
 *
 * Round 1 used 0.9 rad, carried over from KEEP_OUT in depth.tsx where it
 * protects a wide H glyph much further out. On a one-bonded atom that deleted
 * 103 degrees of rim with nothing on it to avoid and bunched the slots into
 * the middle of the open face, which is how we lost the spacing contest
 * against the bar (29.8 px nearest-neighbour at the rim against its 38.9).
 */
export const BOND_CLEARANCE = 0.48;

/**
 * Default hydrogen orbit as a fraction of the lone pair orbit. The shipped
 * app draws HydrogenArc on the atom disc at ATOM_R = 21 px and lone pairs at
 * (ATOM_R + 7) = 28 px (MoleculeSvg.tsx), so the rings were always separate:
 * 21 / 28. Round 1 defaulted both kinds onto ONE circle, which was a
 * regression against geometry the shipped app had already got right.
 */
export const HYDROGEN_RING_RATIO = 21 / 28;

/**
 * The narrowest free arc worth allocating into, radians (6.9 degrees).
 *
 * At the shipped 28 px lone pair rim a 0.12 radian arc subtends 3.4 px, which
 * is narrower than one lone pair dot (4.8 px diameter), so nothing drawable
 * fits in a narrower gap and keeping it would only pull the apportionment
 * toward a direction a student reads as "between the bonds". Such slivers
 * appear when two bonds sit just past 2 * BOND_CLEARANCE apart, e.g. 55 to 62
 * degrees at the default clearance.
 */
export const MIN_USABLE_ARC = 0.12;

function norm(angle: number): number {
  const wrapped = angle % TAU;
  return wrapped < 0 ? wrapped + TAU : wrapped;
}

/** Unsigned angular distance between two directions, in [0, pi]. */
export function angularDistance(a: number, b: number): number {
  const d = Math.abs(norm(a) - norm(b));
  return d > Math.PI ? TAU - d : d;
}

function requireFinite(value: number, what: string): number {
  if (!Number.isFinite(value)) throw new Error(`placeAnnotations: ${what} must be finite, got ${value}`);
  return value;
}

function requireCount(value: number, what: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`placeAnnotations: ${what} must be a non-negative integer, got ${value}`);
  }
  return value;
}

/**
 * A reference direction derived from the bond set alone, so that rotating the
 * bond set rotates the reference with it (equivariance). That is the whole
 * rotation-invariance fix: run everything relative to this and absolute scene
 * orientation can no longer reach any ordering decision.
 *
 * The circular mean (atan2 of the summed unit vectors) is the reference
 * whenever it exists. It vanishes only for bond sets balanced around the
 * centre (two opposite bonds, an even trigonal or square set), and for those
 * the m-th angular harmonic is used instead: sum e^(i m b), first m with a
 * nonzero sum, reference = its angle / m. Newton's identities guarantee some
 * m <= n is nonzero for n unit vectors, so the loop terminates. For such
 * symmetric sets the reference is canonical up to the set's own rotational
 * symmetry, which maps the placement onto itself anyway. The magnitude tested
 * against the threshold is rotation-invariant, so the CHOICE of m never
 * depends on orientation.
 */
function canonicalFrame(bondAngles: readonly number[]): number {
  const n = bondAngles.length;
  // Summed in sorted order: float addition is not associative to the last
  // bit, and the bond-order-independence promise is bit-identical output.
  const sorted = [...bondAngles].sort((a, b) => a - b);
  for (let m = 1; m <= n; m += 1) {
    let x = 0;
    let y = 0;
    for (const bond of sorted) {
      x += Math.cos(m * bond);
      y += Math.sin(m * bond);
    }
    if (Math.hypot(x, y) > 1e-7 * n) return Math.atan2(y, x) / m;
  }
  // Unreachable in exact arithmetic (see above); kept so floating point noise
  // on a pathological input degrades to "deterministic" rather than a throw.
  return n === 0 ? 0 : Math.min(...bondAngles.map(norm));
}

/**
 * The arcs no bond cone covers, in ascending start order (which, fed
 * bond-relative angles, is what makes the allocator's tie-break stable under
 * rotation). Slivers under MIN_USABLE_ARC are dropped. An empty result means
 * no usable arc survives and the caller must degrade.
 */
export function freeArcsFor(bondAngles: readonly number[], clearance: number): readonly FreeArc[] {
  const c = Math.max(0, Math.min(Math.PI, clearance));
  if (bondAngles.length === 0 || c <= EPS) {
    // No bonds means no keep-out. The whole circle is free, anchored at the
    // same -pi/2 that layout.ts hands an unbonded atom, so a bare atom's
    // annotations sit where the rest of the app already expects them to.
    return [{ start: norm(-Math.PI / 2), width: TAU }];
  }

  // Every cone as a half-open interval on [0, 2 pi), split where it wraps.
  const flat: { s: number; e: number }[] = [];
  for (const angle of bondAngles) {
    const s = norm(angle - c);
    const e = s + 2 * c;
    if (e <= TAU) flat.push({ s, e });
    else {
      flat.push({ s, e: TAU });
      flat.push({ s: 0, e: e - TAU });
    }
  }
  flat.sort((a, b) => a.s - b.s);

  const merged: { s: number; e: number }[] = [];
  for (const iv of flat) {
    const last = merged[merged.length - 1];
    if (last !== undefined && iv.s <= last.e + EPS) last.e = Math.max(last.e, iv.e);
    else merged.push({ s: iv.s, e: iv.e });
  }

  const covered = merged.reduce((total, iv) => total + (iv.e - iv.s), 0);
  if (covered >= TAU - EPS) return [];

  const arcs: FreeArc[] = [];
  for (let i = 0; i < merged.length; i += 1) {
    const end = merged[i]!.e;
    const nextStart = i + 1 < merged.length ? merged[i + 1]!.s : merged[0]!.s + TAU;
    const width = nextStart - end;
    if (width >= MIN_USABLE_ARC) arcs.push({ start: norm(end), width });
  }
  arcs.sort((a, b) => a.start - b.start);
  return arcs;
}

/**
 * The widest gap between two adjacent bond directions, clearance ignored. The
 * degraded mode's last resort: there is no room, so take the most room there
 * is. With a single bond this is the whole circle starting at that bond.
 */
function widestRawGap(bondAngles: readonly number[]): FreeArc {
  const sorted = Array.from(new Set(bondAngles.map(norm))).sort((a, b) => a - b);
  const first = sorted[0];
  if (first === undefined) return { start: norm(-Math.PI / 2), width: TAU };
  // One bond: the gap is the whole circle, anchored OPPOSITE the bond so the
  // even spread starts as far from it as the circle allows.
  if (sorted.length === 1) return { start: norm(first + Math.PI), width: TAU };
  let best: FreeArc = { start: first, width: -Infinity };
  for (let i = 0; i < sorted.length; i += 1) {
    const here = sorted[i]!;
    const next = i + 1 < sorted.length ? sorted[i + 1]! : sorted[0]! + TAU;
    const width = next - here;
    if (width > best.width + EPS) best = { start: here, width };
  }
  return best;
}

/**
 * How many slots each arc takes, by the highest-averages rule: repeatedly give
 * the next slot to the arc with the largest width / (already placed + 1). That
 * is "widest gap first" carried all the way through rather than only for the
 * first slot. Ties go to the arc with the smaller (bond-relative) start angle.
 */
function apportion(arcs: readonly FreeArc[], total: number): number[] {
  const counts = arcs.map(() => 0);
  for (let placed = 0; placed < total; placed += 1) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < arcs.length; i += 1) {
      const score = arcs[i]!.width / (counts[i]! + 1);
      if (score > bestScore + EPS) {
        bestScore = score;
        bestIndex = i;
      }
    }
    counts[bestIndex] = counts[bestIndex]! + 1;
  }
  return counts;
}

/** The angles a single arc holds for `count` slots. */
function anglesInArc(arc: FreeArc, count: number): number[] {
  if (count <= 0) return [];
  // A full circle has no ends to inset from, so it wraps instead: even spacing
  // all the way round from the anchor. A partial arc spreads its k slots at
  // (i + 0.5) / k: even spacing with a half-gap inset at each end, using the
  // WHOLE arc. See rule 4 in the header for why this beat the old
  // (i + 1) / (k + 1) insets.
  const full = arc.width >= TAU - EPS;
  const angles: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = full ? i / count : (i + 0.5) / count;
    angles.push(norm(arc.start + arc.width * t));
  }
  return angles;
}

/**
 * Place an atom's implicit hydrogens and lone pairs so that neither ever sits
 * on a bond-facing direction and the two never share an angle.
 *
 * Deterministic: the same request always returns the same slots, in the same
 * order, to the last bit. Rotation-invariant: adding theta to every bond angle
 * returns the same placement with theta added to every slot angle, same kinds,
 * same indices (see rule 0 and `canonicalFrame`).
 */
export function placeAnnotations(request: AnnotationRequest): AnnotationPlacement {
  const centre = request.centre ?? { x: 0, y: 0 };
  requireFinite(centre.x, "centre.x");
  requireFinite(centre.y, "centre.y");
  const radius = requireFinite(request.radius, "radius");
  const hydrogenRadius = requireFinite(request.hydrogenRadius ?? radius * HYDROGEN_RING_RATIO, "hydrogenRadius");
  const clearance = requireFinite(request.bondClearance ?? BOND_CLEARANCE, "bondClearance");
  const hydrogenCount = requireCount(request.hydrogenCount, "hydrogenCount");
  const lonePairCount = requireCount(request.lonePairCount, "lonePairCount");
  const bondAngles = request.bondAngles.map((a, i) => norm(requireFinite(a, `bondAngles[${i}]`)));

  // Rule 0: rewrite the bonds relative to the canonical frame, allocate there,
  // rotate back at the end. Absolute orientation touches nothing in between.
  const frame = canonicalFrame(bondAngles);
  const relativeBonds = bondAngles.map((a) => norm(a - frame));

  const total = hydrogenCount + lonePairCount;
  const usable = freeArcsFor(relativeBonds, clearance);
  const absoluteArcs = usable
    .map((arc) => ({ start: norm(arc.start + frame), width: arc.width }))
    .sort((a, b) => a.start - b.start);

  if (total === 0) {
    return {
      hydrogens: [],
      lonePairs: [],
      freeArcs: absoluteArcs,
      crowded: false,
      minBondDistance: Infinity,
      minSlotSeparation: Infinity,
    };
  }

  const degraded = usable.length === 0;
  const arcs = degraded ? [widestRawGap(relativeBonds)] : usable;
  const counts = apportion(arcs, total);

  const angles: number[] = [];
  for (let i = 0; i < arcs.length; i += 1) angles.push(...anglesInArc(arcs[i]!, counts[i]!));

  const bondDistanceOf = (angle: number): number =>
    relativeBonds.length === 0 ? Math.PI : Math.min(...relativeBonds.map((bond) => angularDistance(angle, bond)));

  // Most open first, ties on bond-relative angle ascending. Lone pairs take
  // the head of that list, hydrogens take the tail. See rule 5 in the header.
  // `angle` is bond-relative here, so the sort cannot see the scene's x axis.
  const ranked = angles
    .map((angle) => ({ angle, bondDistance: bondDistanceOf(angle) }))
    .sort((a, b) => (Math.abs(a.bondDistance - b.bondDistance) > EPS ? b.bondDistance - a.bondDistance : a.angle - b.angle));

  const build = (
    entries: readonly { angle: number; bondDistance: number }[],
    kind: AnnotationKind,
    r: number,
  ): AnnotationSlot[] =>
    entries
      .slice()
      // Numbered by bond-relative angle, so index survives rotation too.
      .sort((a, b) => a.angle - b.angle)
      .map((entry, index) => {
        const angle = norm(entry.angle + frame);
        return {
          kind,
          index,
          angle,
          pos: { x: centre.x + r * Math.cos(angle), y: centre.y + r * Math.sin(angle) },
          bondDistance: entry.bondDistance,
          crowded: entry.bondDistance < clearance - EPS,
        };
      });

  const lonePairs = build(ranked.slice(0, lonePairCount), "lonePair", radius);
  const hydrogens = build(ranked.slice(lonePairCount), "hydrogen", hydrogenRadius);

  const all = [...lonePairs, ...hydrogens];
  const minBondDistance = Math.min(...all.map((slot) => slot.bondDistance));
  let minSlotSeparation = Infinity;
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      minSlotSeparation = Math.min(minSlotSeparation, angularDistance(all[i]!.angle, all[j]!.angle));
    }
  }

  return {
    hydrogens,
    lonePairs,
    freeArcs: absoluteArcs,
    crowded: all.some((slot) => slot.crowded),
    minBondDistance,
    minSlotSeparation,
  };
}
