/**
 * The tapered curved arrow, pure geometry.
 *
 * WHY THIS IS A FILLED OUTLINE AND NOT A STROKE. An SVG stroke has one width
 * for the whole path. The design reference
 * (docs/reference/design-goals/blueberry_r9-lesson-mechanism_1788289491.png)
 * shows a curved arrow that is thin where the electrons leave and thick going
 * into the head, so it cannot be a stroke at all. The construction here walks
 * the curve, pushes each sample sideways by a half width that GROWS along the
 * arc, and comes back down the other side into a single closed subpath. The
 * arrowhead is part of that same outline, so there is no seam between shaft
 * and head and no marker element to keep in sync.
 *
 * Three shape facts read off that reference by pixel sampling, all three drawn
 * here rather than approximated away:
 *
 * - The tail is a ROUND cap, not a flat cut. The cap is emitted as sampled
 *   line segments so the whole path stays M/L/Z and a test can measure it.
 * - The rear of the head is NOTCHED: the barbs sweep back past the point
 *   where the shaft enters, so the rear edge is split rather than straight.
 *   This is not cosmetic. On a chemistry canvas a flat-backed filled triangle
 *   is a wedge bond, and this arrow must never read as one.
 * - The whole arrow is proportioned to its travel. See profileForChord.
 *
 * The taper is the owner's stated direction for this build. The design goals
 * MANIFEST says that image "locks only the shell", so nothing here claims a
 * ratified spec; it claims a brief.
 *
 * No React, no DOM, no imports. TaperedArrowSvg.tsx turns the string this
 * produces into an element and is the only file that knows about SVG.
 */

/**
 * Structurally identical to `Point2` in @blueberry/interaction, declared
 * locally so the pilot has no dependencies at all. TypeScript is structural,
 * so a caller can pass an interaction Point2 straight in.
 */
export interface Point2 {
  readonly x: number;
  readonly y: number;
}

/**
 * The width profile, exposed as data so a critic can move one number rather
 * than hunt a literal in the path builder.
 *
 * All four are FULL widths in px, not half widths, because that is what a
 * person measuring a screenshot with a ruler reads off. They are the sizes
 * drawn at or above FULL_PROFILE_CHORD_PX; shorter arrows scale the whole
 * profile down, see profileForChord.
 */
export interface ArrowWidthProfile {
  /** Width where the electrons leave. Thin: the tail is a hint, not a claim. */
  readonly tailPx: number;
  /** Width where the shaft meets the head. The thick end of the taper. */
  readonly shoulderPx: number;
  /** Width across the arrowhead barbs. Wider than the shoulder, so the head reads as a head. */
  readonly headPx: number;
  /** How far back from the tip the barbs sit, measured along the arc. */
  readonly headLengthPx: number;
}

/**
 * MEASURED off the design reference, then rescaled, and here is the
 * arithmetic so the next person can redo it.
 *
 * Pixel sampling of blueberry_r9-lesson-mechanism_1788289491.png (768 wide)
 * gives: shaft 10 px at the tail, 19 px at the shoulder, head 43 px across
 * the barbs and about 50 px long, over a chord of about 140 px. The bonds in
 * that same image measure about 90 px (three of them: 84.9, 85.2, 85.1 by
 * dark-pixel centroid, which biases a few px short). Our canvas draws a bond
 * at 72 px, so every measured px is multiplied by 72 / 90 = 0.8:
 *
 *   tail        10 * 0.8 = 8
 *   shoulder    19 * 0.8 = 15.2, rounded to 15
 *   head        43 * 0.8 = 34.4, rounded to 34
 *   head length 50 * 0.8 = 40
 *   chord      140 * 0.8 = 112, which is FULL_PROFILE_CHORD_PX below
 *
 * As fractions of the chord these are 7.1, 13.4, 30.4 and 35.7 percent,
 * against the reference's own 7.1, 13.6, 30.7 and 35.7. An earlier draft of
 * this file wrote the head at "about a fifth" of the chord; measured, it is
 * about a third, and that misread is why the first build looked thin beside
 * the reference.
 */
export const DEFAULT_WIDTH_PROFILE: ArrowWidthProfile = {
  tailPx: 8,
  shoulderPx: 15,
  headPx: 34,
  headLengthPx: 40,
};

/**
 * The chord the profile numbers were measured over, in our 72 px bond world.
 * At or above this the profile is drawn as written; below it the WHOLE
 * profile scales down linearly with the chord. See profileForChord.
 */
export const FULL_PROFILE_CHORD_PX = 112;

/**
 * Shortest chord drawn as a full shaft-and-head ribbon. Same value, same
 * meaning and same wording as MIN_CHORD in apps/web/src/tabs/trainer/
 * hitLayout.ts, the file the bow rule was copied from: the shortest chord an
 * arrow can have and still read as an arrow rather than a tick. Under the
 * 18 px bow floor a shorter chord bows more than it travels, and the result
 * is a hook pointing back at its own source. Below this the arrow is drawn
 * as a head alone (see ArrowDegenerateCase), and when there is a sink to
 * land on, the landing swings around its rim first so the chord reaches this
 * length at all, which is the same rescue hitLayout's landingOnRim performs.
 */
export const MIN_CHORD_PX = 34;

/**
 * Chords under this are the no-direction degenerate case. It is 1 on
 * purpose: that is the threshold the copied bow rule calls degenerate, so
 * there is no sliver of chord length where one of the two treats the arrow
 * as real and the other does not.
 */
const ZERO_CHORD_PX = 1;

/** Below this much drawable length there is nothing worth putting on screen. */
const MIN_DRAWN_PX = 2;

/**
 * How far the shaft runs on PAST the barb line, as a fraction of the head
 * length. This is what splits the rear edge of the head: the barbs sit
 * behind the shoulder, so each rear edge slants from a swept barb forward
 * and inward to the shaft. Read off the reference, where the shaft enters
 * the head about a third of the head length ahead of the barbs.
 */
const HEAD_NOTCH_FRACTION = 0.3;

/**
 * Cap on the rim swing, copied from hitLayout.ts landingOnRim. Past about
 * 100 degrees the landing would sit behind the sink as seen from the source,
 * which stops reading as "onto this atom" at all; better a short chord drawn
 * as a head than a landing on the far side.
 */
const SWING_MAX_RAD = 1.75;

/** Samples used to measure arc length and to find the sink crossing. */
const FINE_SAMPLES = 128;

/** Polyline segments down each side of the shaft. At 40 a 120 px shaft steps every 3 px. */
const SHAFT_SAMPLES = 40;

/** Intermediate points on the round tail cap. Eight steps a semicircle, so about 22 degrees each. */
const TAIL_CAP_SAMPLES = 8;

/**
 * The honest failures. Each is handled explicitly rather than allowed to
 * fall through into a path string full of NaN.
 *
 * - `zero-length-chord`: source and sink are the same point, or so nearly
 *   the same that there is no direction to draw in. NOTHING IS DRAWN and
 *   `path` is the empty string.
 * - `chord-shorter-than-head`: the travel is under MIN_CHORD_PX (and no rim
 *   swing could lengthen it), or a sink trim ate the shaft. What draws is a
 *   HEAD ALONE: a notched arrowhead scaled to the travel available, sized
 *   and oriented on the straight source-to-tip segment, one frame for both,
 *   so a squeezed arrow is a small clean head rather than a hook. A full
 *   ribbon here would bow more than it travels.
 * - `sink-swallows-curve`: `sinkRadiusPx` trimmed everything, that is, the
 *   arrow ends inside the atom it was aimed at. NOTHING IS DRAWN. Drawing
 *   the scrap that survives would put a two px speck on an atom's rim, which
 *   reads as dirt rather than as an arrow.
 */
export type ArrowDegenerateCase = "zero-length-chord" | "chord-shorter-than-head" | "sink-swallows-curve";

export interface TaperedArrowInput {
  /** Where the electrons leave. */
  readonly from: Point2;
  /** Where they land. */
  readonly to: Point2;
  /** The curve bows AWAY from this, normally the scene centroid. */
  readonly away: Point2;
  /** Requested bow, before the cap and the floor below. Default 34. */
  readonly bowMagnitude?: number;
  /** Overrides merged onto DEFAULT_WIDTH_PROFILE, then chord-scaled like it. */
  readonly width?: Partial<ArrowWidthProfile>;
  /** Keep this much clear around `to`, trimmed off the head end. Default 0. */
  readonly sinkRadiusPx?: number;
}

export interface TaperedArrowGeometry {
  /** A single closed filled subpath, or "" when nothing should be drawn. */
  readonly path: string;
  /** Non-null when one of the three cases above applied. See that union. */
  readonly degenerate: ArrowDegenerateCase | null;
  /** The quadratic control point actually used. */
  readonly control: Point2;
  /** The bow after the cap and the floor. */
  readonly bowPx: number;
  /** Centre of the tail cap. */
  readonly tail: Point2;
  /** Centre of the shoulder, where the shaft stops inside the head. */
  readonly shoulder: Point2;
  /** The point of the arrow. */
  readonly tip: Point2;
  /** Half the DRAWN width at the tail, after chord scaling. */
  readonly tailHalfWidthPx: number;
  /** Half the DRAWN width across the barbs, after chord scaling. Always the larger. */
  readonly headHalfWidthPx: number;
  /** Arc length of the curve actually drawn, after any sink trim. */
  readonly lengthPx: number;
}

/** Two decimals. Deterministic, and short enough that a path stays readable. */
function round2(value: number): number {
  // Last line of defence only. Every degenerate case is caught by an explicit
  // branch below, so a non-finite number reaching here is a bug, not a shape.
  if (!Number.isFinite(value)) return 0;
  const scaled = Math.round(value * 100);
  // Math.round(-0.4) is -0, and "-0" in a path is noise. Normalise it.
  return scaled === 0 ? 0 : scaled / 100;
}

function pt(p: Point2): string {
  return `${round2(p.x)} ${round2(p.y)}`;
}

function distance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Quadratic Bezier point at t. */
function quadAt(p0: Point2, c: Point2, p1: Point2, t: number): Point2 {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
}

/**
 * Unit tangent at t. Falls back to the chord direction where the derivative
 * vanishes, which happens only when the control point sits exactly on top of
 * an endpoint.
 */
function quadDirection(p0: Point2, c: Point2, p1: Point2, t: number): Point2 {
  const dx = 2 * (1 - t) * (c.x - p0.x) + 2 * t * (p1.x - c.x);
  const dy = 2 * (1 - t) * (c.y - p0.y) + 2 * t * (p1.y - c.y);
  const len = Math.hypot(dx, dy);
  if (len > 1e-9) return { x: dx / len, y: dy / len };
  const cx = p1.x - p0.x;
  const cy = p1.y - p0.y;
  const clen = Math.hypot(cx, cy);
  if (clen > 1e-9) return { x: cx / clen, y: cy / clen };
  return { x: 1, y: 0 };
}

/**
 * The control point of a quadratic from `from` to `to` that bows AWAY from
 * `away`, so an arrow arcs around the molecule rather than across it.
 *
 * COPIED, deliberately and with the reasoning intact, from
 * apps/web/src/tabs/trainer/hitLayout.ts `bowAwayFrom`. It is copied rather
 * than imported because the pilot must not depend on the surface it replaces;
 * if the rule ever changes, both copies change and the tests here pin the cap
 * and the floor so a silent drift fails.
 *
 * The cap: above about a third of the chord the curve stops reading as a push
 * and starts reading as a loop, and a control point thrown out past an
 * endpoint gives the curve a tangent there pointing BACK along itself, so the
 * head ends up aimed away from what it is landing on.
 *
 * The floor: a bond-to-atom arrow travels perhaps 40 px, and at 32 percent
 * that is a 13 px bow, a stub the eye skips next to the long sweep of a
 * nucleophile arrow. Eighteen keeps a short arrow readable as an arc. The
 * floor is also why MIN_CHORD_PX exists: under 34 px of chord an 18 px bow
 * is more bow than travel, so a full ribbon is never drawn there.
 *
 * Divergence noted for the record: apps/web/src/render/layout/stepScene.ts
 * picks its playback bow side by arrow list index parity. That rule is not
 * used here and should not be copied; parity knows nothing about where the
 * molecule is.
 */
export function bowControlPoint(from: Point2, to: Point2, away: Point2, magnitude: number): Point2 {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return { x: mid.x, y: mid.y - magnitude };
  const bow = cappedBow(magnitude, len);
  const nx = (-dy / len) * bow;
  const ny = (dx / len) * bow;
  const a = { x: mid.x + nx, y: mid.y + ny };
  const b = { x: mid.x - nx, y: mid.y - ny };
  return distance(a, away) >= distance(b, away) ? a : b;
}

/** The cap and the floor on their own, so a test can pin them without a curve. */
export function cappedBow(magnitude: number, chordLengthPx: number): number {
  return Math.min(magnitude, Math.max(18, chordLengthPx * 0.32));
}

/**
 * The profile actually drawn for a given chord.
 *
 * At or above FULL_PROFILE_CHORD_PX the profile is drawn as written. Below
 * it, ALL FOUR numbers scale linearly with the chord, so a short push is a
 * small arrow rather than an undersized shaft carrying a full-size head.
 * This is the reference's own proportion rule: its head is about a third of
 * its chord, and dividing every number by the chord keeps that true at every
 * length. The scale runs to zero with the chord on purpose; MIN_CHORD_PX
 * decides what is drawable, not this function.
 */
export function profileForChord(profile: ArrowWidthProfile, chordPx: number): ArrowWidthProfile {
  const scale = Math.min(1, Math.max(0, chordPx) / FULL_PROFILE_CHORD_PX);
  return {
    tailPx: profile.tailPx * scale,
    shoulderPx: profile.shoulderPx * scale,
    headPx: profile.headPx * scale,
    headLengthPx: profile.headLengthPx * scale,
  };
}

/**
 * The pilot's port of hitLayout.ts landingOnRim, the half of the bow rule
 * the first draft of this file failed to copy.
 *
 * A lone pair pushing onto the atom beside it is the most common arrow in
 * the corpus, and on our 72 px bonds its straight landing is a 17 to 30 px
 * chord: under MIN_CHORD_PX, so drawn straight it would be a hook. The rim
 * of the sink is a whole circle of honest landing places, so the landing
 * SWINGS around it, away from the molecule, until the chord reaches
 * MIN_CHORD_PX. That is also how the arrow is drawn on paper: out, over,
 * and down onto the atom. Where there is already room the swing is zero and
 * nothing about a long arrow changes (the caller does not invoke this).
 *
 * Law of cosines: the landing sits at `sinkRadius` from `to`, the source at
 * `reach`, and the swing angle theta gives a chord of
 * sqrt(reach^2 + r^2 - 2 r reach cos theta). Solving for chord =
 * MIN_CHORD_PX: cos over 1 means the straight landing already suffices
 * (callers guard that), cos under -1 means no angle reaches it, so take the
 * capped best available.
 */
function swungLanding(from: Point2, to: Point2, sinkRadius: number, away: Point2): Point2 {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const reach = Math.hypot(dx, dy) || 1;
  const cos =
    (reach * reach + sinkRadius * sinkRadius - MIN_CHORD_PX * MIN_CHORD_PX) / (2 * reach * sinkRadius);
  const swing = Math.min(Math.acos(Math.max(-1, Math.min(1, cos))), SWING_MAX_RAD);
  const base = Math.atan2(dy, dx);
  const pick = (sign: number): Point2 => ({
    x: to.x + Math.cos(base + sign * swing) * sinkRadius,
    y: to.y + Math.sin(base + sign * swing) * sinkRadius,
  });
  const a = pick(1);
  const b = pick(-1);
  // Swing to the side away from the rest of the molecule, the same side
  // bowControlPoint arcs to, so the curve and its landing agree.
  return distance(a, away) >= distance(b, away) ? a : b;
}

/**
 * Half width of the ribbon a fraction `u` of the way from tail to shoulder.
 *
 * Quadratic rather than linear, and rather than a fractional power, for two
 * reasons: the reference keeps the shaft thin for the first half and then
 * thickens quickly, and u*u is exact float arithmetic on every engine, which
 * is part of what makes the path string deterministic.
 */
function shaftHalfWidth(profile: ArrowWidthProfile, u: number): number {
  const tail = profile.tailPx / 2;
  const shoulder = profile.shoulderPx / 2;
  return tail + (shoulder - tail) * (u * u);
}

interface Sample {
  readonly t: number;
  readonly p: Point2;
  /** Cumulative arc length from t = 0. */
  readonly s: number;
}

function sampleCurve(p0: Point2, c: Point2, p1: Point2, tMax: number, count: number): readonly Sample[] {
  const out: Sample[] = [];
  let s = 0;
  let previous: Point2 | null = null;
  for (let i = 0; i <= count; i += 1) {
    const t = (i / count) * tMax;
    const p = quadAt(p0, c, p1, t);
    if (previous !== null) s += distance(previous, p);
    out.push({ t, p, s });
    previous = p;
  }
  return out;
}

interface Frame {
  readonly p: Point2;
  /** Unit tangent, pointing from tail toward tip. */
  readonly dir: Point2;
}

/** The point and tangent a given arc length along a sampled curve. */
function frameAtArcLength(
  samples: readonly Sample[],
  target: number,
  p0: Point2,
  c: Point2,
  p1: Point2,
): Frame {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (first === undefined || last === undefined) return { p: p0, dir: quadDirection(p0, c, p1, 0) };
  const at = (t: number): Frame => ({ p: quadAt(p0, c, p1, t), dir: quadDirection(p0, c, p1, t) });
  if (target <= 0) return at(first.t);
  if (target >= last.s) return at(last.t);
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1];
    const b = samples[i];
    if (a === undefined || b === undefined) break;
    if (b.s >= target) {
      const span = b.s - a.s;
      const k = span < 1e-9 ? 0 : (target - a.s) / span;
      return at(a.t + (b.t - a.t) * k);
    }
  }
  return at(last.t);
}

function offsetPoint(p: Point2, dir: Point2, halfWidth: number, side: 1 | -1): Point2 {
  // Normal to `dir`. Which side is which does not matter, only that the two
  // passes use opposite signs, because the ribbon is symmetric.
  return { x: p.x + -dir.y * halfWidth * side, y: p.y + dir.x * halfWidth * side };
}

function offset(frame: Frame, halfWidth: number, side: 1 | -1): Point2 {
  return offsetPoint(frame.p, frame.dir, halfWidth, side);
}

/**
 * The direction the arrowhead points, which is the straight line from the
 * barb line to the tip, NOT the curve's tangent there.
 *
 * This matters on a strongly bent arrow. The head is drawn as straight barb
 * lines to a tip that sits further along a CURVING path, so hanging the
 * barbs off the tangent gives the two sides of the head different lengths
 * and the head reads as hooked. Measured against the barb-to-tip chord
 * instead, the head is isoceles at every curvature: both barbs sit at
 * exactly hypot(headHalf, barbToTip) from the tip, which is what the
 * symmetry test measures off the emitted path.
 */
function headAxis(base: Point2, tip: Point2, fallback: Point2): Point2 {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return fallback;
  return { x: dx / len, y: dy / len };
}

function nothingDrawn(
  reason: ArrowDegenerateCase,
  control: Point2,
  bowPx: number,
  from: Point2,
  to: Point2,
): TaperedArrowGeometry {
  return {
    path: "",
    degenerate: reason,
    control,
    bowPx,
    tail: from,
    shoulder: from,
    tip: to,
    tailHalfWidthPx: 0,
    headHalfWidthPx: 0,
    lengthPx: 0,
  };
}

/**
 * The head drawn alone, for travel under MIN_CHORD_PX or a trim that ate the
 * shaft. ONE FRAME for everything: the straight segment from the source to
 * the trimmed tip gives the length, the scale, the orientation and the
 * anchor. An earlier draft scaled this case by ARC length while anchoring on
 * the CHORD, and under the 18 px bow floor those diverge without bound as
 * the chord shrinks; a critic caught it emitting a triangle 21.7 px across
 * and 1.01 px long.
 *
 * The head keeps the chord-scaled profile's own size and sits with its tip
 * on the landing, which makes the 34 px boundary quiet: at 34.1 the full
 * arrow's head is this same head with a thin shaft behind it, at 33.9 the
 * shaft is gone and the head stays put.
 */
function headOnlyGeometry(
  from: Point2,
  tip: Point2,
  profile: ArrowWidthProfile,
  control: Point2,
  bowPx: number,
): TaperedArrowGeometry {
  const travel = distance(from, tip);
  if (travel < MIN_DRAWN_PX) return nothingDrawn("zero-length-chord", control, bowPx, from, tip);
  const axis = headAxis(from, tip, { x: 1, y: 0 });
  const headLen = Math.min(travel, profile.headLengthPx);
  // A chevron under two px is the speck the doc comment above promises never
  // to draw: it reads as dirt on an atom's rim, not as an arrow.
  if (headLen < MIN_DRAWN_PX) return nothingDrawn("zero-length-chord", control, bowPx, from, tip);
  // Width in proportion to the length drawn, so the barb angle never changes.
  const headHalf = (profile.headPx / 2) * (headLen / (profile.headLengthPx || 1));
  const notch = headLen * HEAD_NOTCH_FRACTION;
  const barbBase = { x: tip.x - axis.x * headLen, y: tip.y - axis.y * headLen };
  const rearMid = { x: tip.x - axis.x * (headLen - notch), y: tip.y - axis.y * (headLen - notch) };
  const barbA = offsetPoint(barbBase, axis, headHalf, 1);
  const barbB = offsetPoint(barbBase, axis, headHalf, -1);
  const path = `M ${pt(barbA)} L ${pt(tip)} L ${pt(barbB)} L ${pt(rearMid)} Z`;
  return {
    path,
    degenerate: "chord-shorter-than-head",
    control,
    bowPx,
    // No shaft, so the rear notch point is the closest thing to a tail.
    tail: rearMid,
    shoulder: barbBase,
    tip,
    tailHalfWidthPx: headHalf,
    headHalfWidthPx: headHalf,
    lengthPx: headLen,
  };
}

/**
 * Build the closed filled outline for one tapered curved arrow.
 *
 * Deterministic: the sample counts are constants, every coordinate goes
 * through round2, and nothing consults a clock or a random source. Same input,
 * same string, every time. The path uses only M, L and Z commands, so a test
 * can parse every vertex and measure the drawn shape with a ruler.
 */
export function taperedArrowGeometry(input: TaperedArrowInput): TaperedArrowGeometry {
  const requested: ArrowWidthProfile = { ...DEFAULT_WIDTH_PROFILE, ...input.width };
  const magnitude = input.bowMagnitude ?? 34;
  const from = input.from;
  let to = input.to;
  let sinkRadius = input.sinkRadiusPx ?? 0;
  let chord = distance(from, to);

  // Case one: no chord at all. See ArrowDegenerateCase.
  if (chord < ZERO_CHORD_PX) {
    return nothingDrawn("zero-length-chord", bowControlPoint(from, to, input.away, magnitude), magnitude, from, to);
  }

  // The rim swing. Only when the straight landing would leave less than
  // MIN_CHORD_PX of chord, and only when the source is outside the rim at
  // all; a long arrow's landing does not move.
  if (sinkRadius > 0 && chord > sinkRadius && chord - sinkRadius < MIN_CHORD_PX) {
    to = swungLanding(from, to, sinkRadius, input.away);
    sinkRadius = 0;
    chord = distance(from, to);
  }

  const control = bowControlPoint(from, to, input.away, magnitude);
  const bowPx = cappedBow(magnitude, chord);
  const profile = profileForChord(requested, chord);

  // Trim the head end back out of the sink. Walking backwards is correct
  // because distance to the endpoint only decreases over the last stretch of
  // the curve, so the first sample outside the circle, seen from the end, is
  // the crossing.
  let tEnd = 1;
  if (sinkRadius > 0) {
    const full = sampleCurve(from, control, to, 1, FINE_SAMPLES);
    let crossing = -1;
    for (let i = full.length - 1; i >= 0; i -= 1) {
      const sample = full[i];
      if (sample !== undefined && distance(sample.p, to) >= sinkRadius) {
        crossing = i;
        break;
      }
    }
    // Case three: every sample is inside the sink.
    if (crossing < 0) return nothingDrawn("sink-swallows-curve", control, bowPx, from, to);
    const a = full[crossing];
    const b = full[crossing + 1];
    if (a === undefined) return nothingDrawn("sink-swallows-curve", control, bowPx, from, to);
    if (b === undefined) {
      tEnd = a.t;
    } else {
      const da = distance(a.p, to);
      const db = distance(b.p, to);
      const span = da - db;
      tEnd = span < 1e-9 ? a.t : a.t + (b.t - a.t) * ((da - sinkRadius) / span);
    }
  }

  const fine = sampleCurve(from, control, to, tEnd, FINE_SAMPLES);
  const last = fine[fine.length - 1];
  const totalLength = last === undefined ? 0 : last.s;

  // Case three again: the trim left a speck rather than an arrow.
  if (totalLength < MIN_DRAWN_PX) return nothingDrawn("sink-swallows-curve", control, bowPx, from, to);

  const tipFrame = frameAtArcLength(fine, totalLength, from, control, to);

  // Case two: too little travel for a full ribbon, either because the chord
  // is under MIN_CHORD_PX (an 18 px bow would out-travel it) or because the
  // sink trim ate the shaft. The head is drawn alone, scaled to what is
  // there.
  if (chord < MIN_CHORD_PX || totalLength <= profile.headLengthPx) {
    return headOnlyGeometry(from, tipFrame.p, profile, control, bowPx);
  }

  // The barbs sit headLengthPx back from the tip; the shaft runs PAST them
  // by the notch, which is what splits the rear edge of the head.
  const barbArc = totalLength - profile.headLengthPx;
  const notchPx = profile.headLengthPx * HEAD_NOTCH_FRACTION;
  const shoulderArc = barbArc + notchPx;
  const barbFrame = frameAtArcLength(fine, barbArc, from, control, to);
  const shoulderFrame = frameAtArcLength(fine, shoulderArc, from, control, to);
  const headHalf = profile.headPx / 2;
  const tailHalf = profile.tailPx / 2;

  // One pass up the far side, one back down the near side, one closed subpath.
  const left: Point2[] = [];
  const right: Point2[] = [];
  for (let i = 0; i <= SHAFT_SAMPLES; i += 1) {
    const u = i / SHAFT_SAMPLES;
    const frame = frameAtArcLength(fine, shoulderArc * u, from, control, to);
    const half = shaftHalfWidth(profile, u);
    left.push(offset(frame, half, 1));
    right.push(offset(frame, half, -1));
  }

  const axis = headAxis(barbFrame.p, tipFrame.p, barbFrame.dir);
  const barbA = offsetPoint(barbFrame.p, axis, headHalf, 1);
  const barbB = offsetPoint(barbFrame.p, axis, headHalf, -1);

  const tailFrame = frameAtArcLength(fine, 0, from, control, to);

  const parts: string[] = [];
  const start = left[0];
  parts.push(`M ${pt(start === undefined ? from : start)}`);
  for (let i = 1; i < left.length; i += 1) {
    const p = left[i];
    if (p !== undefined) parts.push(`L ${pt(p)}`);
  }
  // Back and out to the barb, forward to the point, back to the other barb,
  // forward and in to the shaft again. The two backward steps are the notch.
  parts.push(`L ${pt(barbA)}`);
  parts.push(`L ${pt(tipFrame.p)}`);
  parts.push(`L ${pt(barbB)}`);
  for (let i = right.length - 1; i >= 0; i -= 1) {
    const p = right[i];
    if (p !== undefined) parts.push(`L ${pt(p)}`);
  }
  // The round tail cap, as sampled segments so the path stays M/L/Z. From
  // the near-side tail corner, around the back of the tail, to the far-side
  // corner the path opened at; Z closes the last sliver.
  for (let i = 1; i <= TAIL_CAP_SAMPLES; i += 1) {
    const theta = (Math.PI * i) / (TAIL_CAP_SAMPLES + 1);
    const capPoint = {
      x: tailFrame.p.x + tailHalf * (Math.cos(theta) * tailFrame.dir.y - Math.sin(theta) * tailFrame.dir.x),
      y: tailFrame.p.y + tailHalf * (-Math.cos(theta) * tailFrame.dir.x - Math.sin(theta) * tailFrame.dir.y),
    };
    parts.push(`L ${pt(capPoint)}`);
  }
  parts.push("Z");

  return {
    path: parts.join(" "),
    degenerate: null,
    control,
    bowPx,
    tail: tailFrame.p,
    shoulder: shoulderFrame.p,
    tip: tipFrame.p,
    tailHalfWidthPx: tailHalf,
    headHalfWidthPx: headHalf,
    lengthPx: totalLength,
  };
}

/** The bare centre line, for a critic who wants to see the spine under the ribbon. */
export function taperedArrowSpinePath(input: TaperedArrowInput): string {
  const from = input.from;
  let to = input.to;
  const sinkRadius = input.sinkRadiusPx ?? 0;
  const chord = distance(from, to);
  if (chord < ZERO_CHORD_PX) return "";
  // Mirror the rim swing, so the skeleton shows the curve actually drawn.
  if (sinkRadius > 0 && chord > sinkRadius && chord - sinkRadius < MIN_CHORD_PX) {
    to = swungLanding(from, to, sinkRadius, input.away);
  }
  const control = bowControlPoint(from, to, input.away, input.bowMagnitude ?? 34);
  return `M ${pt(from)} Q ${pt(control)} ${pt(to)}`;
}
