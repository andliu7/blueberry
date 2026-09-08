/**
 * The corridor. Read this header before touching anything below it, because
 * one rule in here is the whole beat and the rest is arithmetic serving it.
 *
 * THE RULE, and the reference proves it rather than suggests it. In
 * `reference images/in the middle of drawing characters - notice it follows the
 * line even if I'm off.png` the finger is visibly beside the guide and the ink
 * is exactly on it. In `example of drawing off of the lines.png` the finger has
 * gone somewhere else entirely and the ink stops following. So tolerance is a
 * CORRIDOR AROUND A PATH, never a pixel match against a bitmap, and the mark
 * the student sees is the IDEAL path up to how far along it they have got. A
 * wobbly hand draws a clean bond. A hand that leaves the corridor draws nothing
 * new until it comes back.
 *
 * Three numbers make that work and each is here for a reason:
 *
 *   `along`      how far down the path the student has travelled, in px of arc
 *                length. MONOTONIC. It never goes backwards, because a finger
 *                that wobbles back over ground it covered has not un-drawn it.
 *   `offset`     perpendicular distance from the path to the finger. Inside
 *                `tolerancePx` the stroke advances; outside it the stroke
 *                freezes and the finger's own trail is what renders, which is
 *                the honest signal that the guide is not being followed.
 *   `maxStrayPx` the worst offset seen this stroke. It is what separates
 *                `trace_incomplete` (stopped short, stayed on the line) from
 *                `trace_left_the_target` (went somewhere else), and those are
 *                two different sentences to say to a student.
 *
 * WHY THE PROJECTION IS WINDOWED. A ring drawn as one stroke passes close to
 * its own start. A global nearest-point projection would snap `along` back to
 * zero the moment the hand came round, and the stroke would never finish. So
 * the search runs over `[along - tolerance, along + lookahead]` only. The same
 * window is what stops a lift-and-tap at the far end from completing a stroke
 * nobody traced: you cannot jump further than the window, so you have to
 * travel.
 *
 * Everything here is pure and framework free: numbers in, numbers out, no
 * React, no DOM, no clock. That is what makes it testable in
 * apps/web/test/traceGeometry.test.ts, and the surface components are then thin
 * enough to be judged by eye rather than by assertion, which is the split
 * apps/web/vitest.config.ts already declares.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/**
 * A polyline with its arc lengths precomputed.
 *
 * Precomputed because every pointer move projects onto it and walks it, and
 * recomputing cumulative lengths sixty times a second for a shape that never
 * changes is work the 100 ms interaction budget does not need to pay.
 */
export interface TracePath {
  readonly points: readonly Pt[];
  /** `cumulative[i]` is the arc length from `points[0]` to `points[i]`. */
  readonly cumulative: readonly number[];
  readonly length: number;
}

export function distance(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Build a path from authored points.
 *
 * Repeated points are dropped rather than tolerated: a zero length segment has
 * no tangent, and a tangent with no direction is how an arrowhead ends up
 * pointing at nothing. That defect has already shipped once in this repo, on
 * the trainer's leaving group arrow, and it is recorded in STATUS.md.
 */
export function buildPath(points: readonly Pt[]): TracePath {
  const kept: Pt[] = [];
  for (const point of points) {
    const last = kept[kept.length - 1];
    if (last === undefined || distance(last, point) > 1e-6) kept.push(point);
  }
  if (kept.length < 2) {
    throw new Error("a trace path needs at least two distinct points");
  }
  const cumulative: number[] = [0];
  for (let i = 1; i < kept.length; i += 1) {
    cumulative.push(cumulative[i - 1]! + distance(kept[i - 1]!, kept[i]!));
  }
  return Object.freeze({
    points: Object.freeze(kept),
    cumulative: Object.freeze(cumulative),
    length: cumulative[cumulative.length - 1]!,
  });
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

/** The point that sits `along` px down the path, clamped to both ends. */
export function pointAt(path: TracePath, along: number): Pt {
  const target = clamp(along, 0, path.length);
  for (let i = 1; i < path.points.length; i += 1) {
    const start = path.cumulative[i - 1]!;
    const end = path.cumulative[i]!;
    if (target <= end || i === path.points.length - 1) {
      const span = end - start;
      const t = span <= 0 ? 0 : (target - start) / span;
      const a = path.points[i - 1]!;
      const b = path.points[i]!;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return path.points[0]!;
}

/** Unit direction of travel at `along`. Used for the arrowhead and the puck. */
export function tangentAt(path: TracePath, along: number): Pt {
  const target = clamp(along, 0, path.length);
  for (let i = 1; i < path.points.length; i += 1) {
    if (target <= path.cumulative[i]! || i === path.points.length - 1) {
      const a = path.points[i - 1]!;
      const b = path.points[i]!;
      const len = distance(a, b);
      return len <= 0 ? { x: 1, y: 0 } : { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    }
  }
  return { x: 1, y: 0 };
}

/**
 * The ink: the ideal path from the start up to `along`.
 *
 * This is the function that makes the header's rule true. What renders is a
 * prefix of the AUTHORED polyline, so it is clean whatever the hand did.
 */
export function sliceTo(path: TracePath, along: number): readonly Pt[] {
  const target = clamp(along, 0, path.length);
  const out: Pt[] = [path.points[0]!];
  for (let i = 1; i < path.points.length; i += 1) {
    if (path.cumulative[i]! <= target) {
      out.push(path.points[i]!);
    } else {
      break;
    }
  }
  const tip = pointAt(path, target);
  const last = out[out.length - 1]!;
  if (distance(last, tip) > 1e-6) out.push(tip);
  return out;
}

export interface Projection {
  /** Arc length of the closest point on the path. */
  readonly along: number;
  /** Perpendicular distance from the path to the queried point. */
  readonly offset: number;
}

/** Closest point on one segment, as a fraction of that segment. */
function projectOntoSegment(a: Pt, b: Pt, p: Pt): { t: number; offset: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared <= 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared, 0, 1);
  const nearest = { x: a.x + dx * t, y: a.y + dy * t };
  return { t, offset: distance(nearest, p) };
}

/**
 * Nearest point on the path, searched only between `fromAlong` and `toAlong`.
 *
 * The window is the ring fix and the lift-and-tap fix at once, per the header.
 * Segments entirely outside the window are skipped; a segment that straddles it
 * is projected onto and then the result is clamped back into the window, which
 * keeps a long segment usable instead of dropping it wholesale.
 */
export function projectOntoWindow(
  path: TracePath,
  p: Pt,
  fromAlong: number,
  toAlong: number,
): Projection {
  const low = clamp(Math.min(fromAlong, toAlong), 0, path.length);
  const high = clamp(Math.max(fromAlong, toAlong), 0, path.length);
  let best: Projection = { along: low, offset: distance(pointAt(path, low), p) };
  for (let i = 1; i < path.points.length; i += 1) {
    const segStart = path.cumulative[i - 1]!;
    const segEnd = path.cumulative[i]!;
    if (segEnd < low || segStart > high) continue;
    const { t } = projectOntoSegment(path.points[i - 1]!, path.points[i]!, p);
    const raw = segStart + (segEnd - segStart) * t;
    const along = clamp(raw, low, high);
    const offset = distance(pointAt(path, along), p);
    if (offset < best.offset) best = { along, offset };
  }
  return best;
}

/** Whole path projection. Only safe on a path that does not fold back on itself. */
export function projectOnto(path: TracePath, p: Pt): Projection {
  return projectOntoWindow(path, p, 0, path.length);
}

/* ------------------------------------------------------------------ */
/* Tracing one stroke                                                   */
/* ------------------------------------------------------------------ */

export interface TraceProgress {
  /** Furthest arc length reached. Monotonic for the life of the stroke. */
  readonly along: number;
  /** Whether the finger is outside the corridor right now. */
  readonly offCorridor: boolean;
  /** Worst offset seen this stroke, in px. Decides which sentence we say. */
  readonly maxStrayPx: number;
  readonly complete: boolean;
}

export interface TraceRules {
  /** Corridor half width. Authored per beat: a lone pair is not a ring. */
  readonly tolerancePx: number;
}

/**
 * How far ahead of the current position the projection may look.
 *
 * Twice the corridor, floored so a tight tolerance still allows a fast swipe to
 * be sampled coarsely by the browser without stalling. It is deliberately not
 * the path length: see the header on lift-and-tap.
 */
export function lookaheadFor(rules: TraceRules): number {
  return Math.max(rules.tolerancePx * 2, 24);
}

/**
 * How close to the end counts as finished.
 *
 * Capped at a fraction of the stroke so a generous corridor cannot hand a short
 * stroke to a student who traced a third of it. This is a completion rule, not
 * a tolerance the caller can widen: `tolerancePx` stays what the author wrote.
 */
export function endToleranceFor(path: TracePath, rules: TraceRules): number {
  return Math.min(rules.tolerancePx, path.length * 0.15);
}

export const IDLE_TRACE: TraceProgress = Object.freeze({
  along: 0,
  offCorridor: false,
  maxStrayPx: 0,
  complete: false,
});

/**
 * Whether a press may start this stroke.
 *
 * The press has to land near the start, because the direction arrow and the
 * start puck in the reference are a promise about where to begin, and a stroke
 * that could be started from its far end would draw itself backwards. The
 * allowance is a little wider than the corridor, since a fingertip is wider
 * than a line and the first contact point is the least accurate one.
 */
export function canStartAt(path: TracePath, p: Pt, rules: TraceRules): boolean {
  return distance(path.points[0]!, p) <= rules.tolerancePx * 1.6;
}

export function beginTrace(path: TracePath, p: Pt, rules: TraceRules): TraceProgress {
  const projection = projectOntoWindow(path, p, 0, lookaheadFor(rules));
  const offCorridor = projection.offset > rules.tolerancePx;
  return {
    along: offCorridor ? 0 : projection.along,
    offCorridor,
    maxStrayPx: projection.offset,
    complete: false,
  };
}

/**
 * One pointer move.
 *
 * Note what does NOT happen when the finger is outside the corridor: `along` is
 * carried forward unchanged. The stroke does not rewind, and it does not
 * advance. It waits. That is the difference between a guide that helps and a
 * guide that punishes, and it is the behaviour the two reference captures show
 * between them.
 */
export function advanceTrace(
  path: TracePath,
  previous: TraceProgress,
  p: Pt,
  rules: TraceRules,
): TraceProgress {
  if (previous.complete) return previous;
  const lookahead = lookaheadFor(rules);
  const projection = projectOntoWindow(
    path,
    p,
    previous.along - rules.tolerancePx,
    previous.along + lookahead,
  );
  const maxStrayPx = Math.max(previous.maxStrayPx, projection.offset);
  if (projection.offset > rules.tolerancePx) {
    return { along: previous.along, offCorridor: true, maxStrayPx, complete: false };
  }
  const along = Math.max(previous.along, projection.along);
  return {
    along,
    offCorridor: false,
    maxStrayPx,
    complete: along >= path.length - endToleranceFor(path, rules),
  };
}

/**
 * What a released stroke amounted to.
 *
 * Three outcomes, and the middle one is the point: a student who stayed on the
 * line and stopped early gets "keep going", a student who wandered off gets
 * "come back to the line". Collapsing those into one message is how feedback
 * stops teaching, which is the axis CLAUDE.md says this product wins on.
 */
export type StrokeOutcome = "complete" | "incomplete" | "left_target";

export function strokeOutcome(progress: TraceProgress, rules: TraceRules): StrokeOutcome {
  if (progress.complete) return "complete";
  if (progress.maxStrayPx > rules.tolerancePx) return "left_target";
  return "incomplete";
}

/* ------------------------------------------------------------------ */
/* Freehand: turning a wobble into segments                             */
/* ------------------------------------------------------------------ */

function perpendicularDistance(p: Pt, a: Pt, b: Pt): number {
  return projectOntoSegment(a, b, p).offset;
}

/**
 * Ramer to Douglas to Peucker, the boring one.
 *
 * At L3 the canvas is blank and a student draws a whole ring in one gesture.
 * This is what turns those two hundred sampled points into six corners, so a
 * ring becomes six bonds rather than one enormous squiggle. `epsilon` is how
 * far a point may sit off the simplified line before it earns a corner of its
 * own, so a bigger epsilon means fewer, straighter bonds.
 *
 * Chosen over curve fitting because a skeletal structure IS straight lines, and
 * because this algorithm is forty years old, ten lines long, and debuggable at
 * 1am. It is not trying to recognise handwriting; see recognise.ts.
 */
export function simplifyPolyline(points: readonly Pt[], epsilon: number): readonly Pt[] {
  if (points.length <= 2) return points;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  let worstIndex = 0;
  let worst = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicularDistance(points[i]!, first, last);
    if (d > worst) {
      worst = d;
      worstIndex = i;
    }
  }
  if (worst <= epsilon) return [first, last];
  const left = simplifyPolyline(points.slice(0, worstIndex + 1), epsilon);
  const right = simplifyPolyline(points.slice(worstIndex), epsilon);
  return [...left.slice(0, left.length - 1), ...right];
}

/** SVG path data for a polyline. One place, so no component reinvents it. */
export function polylineToPathData(points: readonly Pt[]): string {
  if (points.length === 0) return "";
  const head = points[0]!;
  const rest = points.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  return `M ${head.x.toFixed(2)} ${head.y.toFixed(2)} ${rest.join(" ")}`.trim();
}
