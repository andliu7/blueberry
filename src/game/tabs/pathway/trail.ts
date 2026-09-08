/**
 * The winding trail, as arithmetic. Pure: no React, no DOM.
 *
 * The trail is the drawn ribbon that connects the nodes, the thing the
 * reference (blueberry_r7-compiled-v2) makes the backbone of the whole tab.
 * PathScene measures where the nodes actually landed and hands the centres
 * here; this module only turns ordered points into SVG path strings, so the
 * geometry is testable without a document and the trail can never disagree
 * with the layout, because it is derived from the layout.
 *
 * LANES. Every node declares a lane:
 *
 *   main   the spine. Consecutive main points are joined directly.
 *   left / right   a diamond fork's arms. Between the two main anchors that
 *          surround them the direct main connection is SUPPRESSED and each
 *          arm is drawn from the first anchor, through its own points, to the
 *          second: the concept node above the fork and the unit gate below it
 *          are those anchors, which is the committed diamond geometry.
 *   loop   a side loop. The main trail keeps its direct connection and the
 *          loop is drawn as a detour off it and back, because an application
 *          lesson is optional and the spine must read as continuous past it.
 *
 * DONE COLOURING. The progress green is a FILL-ONLY semantic (measured:
 * 1.60:1 as a line on cream), so a done stretch is never a bare green
 * hairline: the renderer draws every segment as a wide under-stroke in the
 * edge colour with the fill colour riding on it, and this module only says
 * WHICH stretches are done.
 *
 * THE JOIN, not the pair, and this is a correction of 2026-09-04.
 * docs/DESIGN-GOALS.md's trail clause reads: "Completed stretches are green;
 * everything ahead is the plain violet family. THE JOIN BETWEEN THEM IS WHERE
 * THE STUDENT IS." One join, singular. The rule this file used to apply was
 * "both endpoints done", which produces a join per completed pair, and on the
 * real unlock policy that is a different picture entirely: reactions inside a
 * unit are FREELY ORDERABLE (docs/DESIGN-GOALS.md, owner 2026-09-01), so a
 * student's done-set is scattered rather than a prefix, and a pair rule paints
 * green only where two finished lessons happen to be adjacent.
 *
 * Measured on the built page before the change, with the S2 seed standing on
 * unit 1: the unit's anchors ran done, open, open, open, open, CURRENT, so
 * not one pair was adjacent and the whole fourteen-unit track rendered ZERO
 * done stretches. Both adopted references draw the trail behind the student
 * green from the top of the screen down.
 *
 * So a stretch is done when it lies BEHIND THE JOIN: within each chain, the
 * join is the last point on it that is done, and every stretch up to and
 * including that point is walked road. That is the clause read literally, it
 * reproduces the references, and it is strictly weaker in no case: a chain
 * whose done points are already a prefix (the common one, and the one the
 * existing fixtures pin) gives exactly the same answer as the pair rule.
 *
 * A fork's two arms are two chains, so a done arm is green and the arm the
 * student did not take stays violet. A loop detour is never done at all,
 * because enrichment is off the exam-weighted spine and is not progress.
 */

export type TrailLane = "main" | "left" | "right" | "loop";

export interface TrailPoint {
  readonly x: number;
  readonly y: number;
  readonly lane: TrailLane;
  readonly done: boolean;
  /**
   * A UNIT GATE, which is the one anchor the progress flow may not run
   * through. DESIGN-GOALS 2026-09-04: "The flow can run through several
   * lesson nodes, never through a unit gate." A gate is a boundary rather
   * than a lesson, so a stretch touching one changes colour where it stands
   * instead of being travelled.
   */
  readonly gate?: boolean;
}

export interface TrailSegment {
  readonly d: string;
  readonly done: boolean;
  /** Loop detours render dimmed, like the lessons they lead to. */
  readonly loop: boolean;
  /** Either endpoint is a unit gate, so this stretch never carries the flow. */
  readonly gate: boolean;
}

/**
 * The smallest vertical tangent a full-size segment gets.
 *
 * It is a parameter rather than a constant because the F1 pill draws the SAME
 * shape at a twentieth of the size: 24px of grip on a 20px row pitch is not a
 * curve, it is a loop, and the miniature has to be the unit's real shape and
 * not a knot of it.
 */
export const TRAIL_GRIP_PX = 24;

/** A smooth vertical-tangent cubic between two points, boundaryPath's idiom. */
function cubic(from: TrailPoint, to: TrailPoint, minGrip: number): string {
  const grip = Math.max(minGrip, Math.abs(to.y - from.y) / 2);
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} C ${from.x.toFixed(1)} ${(from.y + grip).toFixed(1)}, ${to.x.toFixed(1)} ${(to.y - grip).toFixed(1)}, ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

interface XY {
  readonly x: number;
  readonly y: number;
}

/**
 * THE FORK ARM, and this function exists because the old one drew an X.
 *
 * The arms used to be the same vertical-tangent cubic the spine is drawn
 * with, which meant each arm arrived at the unit gate from DIRECTLY ABOVE it.
 * Two arms both arriving from directly above converge onto one vertical line
 * and then the arch's two feet spread out below them, and the whole junction
 * reads as a crossing: a critic reproduced it at 390 by 844 as "the left arm
 * sweeps right, the right arm sweeps left" just above the Unit 1 arch.
 * blueberry_branch-diamond draws the opposite: two arms BOWING OUTWARD and
 * converging on the gate WITHOUT TOUCHING, each arriving on its own side.
 *
 * So an arm is one smooth chain with Catmull-Rom tangents, not a run of
 * independent cubics. The tangent at the concept is vertical (the road leaves
 * the fork heading down, as a road does); every interior tangent follows the
 * chord through its neighbours, which is what bows the curve outward around
 * the chips; and the tangent at the gate is the chord from the last chip,
 * which points down and INWARD on that arm's own side. The two arms therefore
 * approach the arch as a V rather than as a shared vertical, and they can
 * only meet at the endpoint they share.
 *
 * Guarantee, and it is the one the critic's finding needs: the curve's x
 * never leaves the interval spanned by its own control polygon on each
 * segment (a Bezier lies inside its control hull), and both control points of
 * every segment are built from points on one side of the centreline plus the
 * shared endpoints, so a left arm cannot enter the right half except at the
 * gate itself. armStaysOnItsSide in the tests asserts exactly that.
 */
function armChain(points: readonly XY[], minGrip: number): readonly string[] {
  const out: string[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const span = Math.max(minGrip, Math.abs(p2.y - p1.y));
    // The virtual neighbour outside each end. At the START of the whole chain
    // it sits straight above p1, which is what pins the leaving tangent
    // vertical; at the END it sits below p2 continuing the last chord, which
    // keeps the arrival tangent parallel to that chord instead of snapping it
    // vertical. Every gap in between reads its real neighbours, so the arm is
    // one continuous curve even though it is emitted a gap at a time.
    const p0 = i === 0 ? { x: p1.x, y: p1.y - span } : points[i - 1]!;
    const p3 =
      i + 2 < points.length
        ? points[i + 2]!
        : { x: p2.x + (p2.x - p1.x) * 0.5, y: p2.y + span * 0.5 };
    // Catmull-Rom to Bezier, tension a sixth: the standard conversion, and
    // the tension is what keeps the bow generous without overshooting a chip.
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    out.push(
      `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
    );
  }
  return out;
}

/**
 * How far up and down the spine a side loop's mouth opens, in pixels.
 *
 * Small, because loops stack: unit 1 carries four enrichment nodes and their
 * rows sit about 75px apart, so a mouth wider than a third of that pitch
 * would make two neighbouring loops share a stretch of spine and read as one
 * long braid rather than as two detours.
 */
export const LOOP_REACH_PX = 62;

/**
 * A SIDE LOOP: a trail that leaves the spine, goes round its node, and
 * rejoins the spine below. It is a closed detour, which is the whole point.
 *
 * blueberry_r7-compiled-v2 draws the enrichment lesson bottom right as a thin
 * solid trail budding off the road and closing back onto it. The build drew a
 * dotted straight stub to a dead-end circle, four of them in a column, so the
 * detour read as a dropped connection rather than as a route: there was no
 * loop anywhere on the surface, and "dimmed SIDE LOOPS" is the goals' own
 * vocabulary for this shape.
 *
 * The construction is one cubic whose two control points share an x. Such a
 * cubic passes through x = (ax + bx + 6cx) / 8 at its midpoint, so solving
 * that for cx puts the apex exactly on the node's centre, and when the two
 * mouth anchors are symmetric about the node's y the apex lands at the node's
 * y as well. The loop therefore goes THROUGH its chip by construction rather
 * than near it, which is the trail-is-code rule applied to a detour.
 */
function loopPath(mouthTop: XY, node: XY, mouthBottom: XY): readonly string[] {
  const cx = (8 * node.x - mouthTop.x - mouthBottom.x) / 6;
  const p1 = { x: cx, y: mouthTop.y };
  const p2 = { x: cx, y: mouthBottom.y };
  // De Casteljau at t = 0.5. The two halves ARE the one curve, exactly, and
  // the split point is the apex, so the out-leg and the back-leg meet on the
  // chip's own centre and each can be drawn, hit-tested and reasoned about on
  // its own without the loop ever ceasing to be a single smooth detour.
  const mid = (a: XY, b: XY): XY => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const q1 = mid(mouthTop, p1);
  const h = mid(p1, p2);
  const r2 = mid(p2, mouthBottom);
  const q2 = mid(q1, h);
  const r1 = mid(h, r2);
  const apex = mid(q2, r1);
  const draw = (a: XY, c1: XY, c2: XY, b: XY) =>
    `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  return [draw(mouthTop, q1, q2, apex), draw(apex, r1, r2, mouthBottom)];
}

/**
 * Where the spine stands at a given y, between two main anchors.
 *
 * The spine between two mains is the vertical-tangent cubic above, so this
 * walks that cubic rather than the straight line: a loop whose mouth was
 * placed on the chord would detach from the road wherever the road is bending,
 * which is the same class of defect as a trail that diverges from its nodes.
 * Bisection on t, because y(t) is monotone on a vertical-tangent cubic and
 * twenty steps is under a thousandth of a pixel at any page height.
 */
function spineAt(from: XY, to: XY, minGrip: number, y: number): XY {
  const grip = Math.max(minGrip, Math.abs(to.y - from.y) / 2);
  const at = (t: number) => {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * from.x + 3 * mt * mt * t * from.x + 3 * mt * t * t * to.x + t * t * t * to.x,
      y: mt * mt * mt * from.y + 3 * mt * mt * t * (from.y + grip) + 3 * mt * t * t * (to.y - grip) + t * t * t * to.y,
    };
  };
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i += 1) {
    const mid = (lo + hi) / 2;
    if (at(mid).y < y) lo = mid;
    else hi = mid;
  }
  return at((lo + hi) / 2);
}

/**
 * Points, in document order, to drawable segments.
 *
 * Total: any input yields a well formed list, and fewer than two points yield
 * an empty one. Points are consumed in the order given, which is the order
 * the nodes sit in the document; nothing here sorts, because the layout is
 * the authority on order.
 */
export function trailSegments(
  points: readonly TrailPoint[],
  minGrip: number = TRAIL_GRIP_PX,
): readonly TrailSegment[] {
  const segments: TrailSegment[] = [];
  const mains = points.filter((point) => point.lane === "main");
  if (mains.length === 0) return [];

  /**
   * THE JOIN: the last point on a chain the student has walked to.
   *
   * -1 when the chain carries no done point at all, which is a unit entirely
   * ahead of the student, and every stretch in it then stays violet.
   */
  const joinOf = (chain: readonly TrailPoint[]): number =>
    chain.reduce((at, entry, index) => (entry.done ? index : at), -1);
  const spineJoin = joinOf(mains);

  let mainIndex = -1;
  let pending: TrailPoint[] = [];
  for (const point of points) {
    if (point.lane !== "main") {
      pending.push(point);
      continue;
    }
    const previous = mainIndex >= 0 ? mains[mainIndex]! : null;
    mainIndex += 1;
    if (previous === null) {
      pending = [];
      continue;
    }
    const arms = pending.filter((p) => p.lane === "left" || p.lane === "right");
    const loops = pending.filter((p) => p.lane === "loop");
    if (arms.length > 0) {
      // THE DIAMOND. One smooth chain per arm, bowing outward and converging
      // on the gate from its own side: see armChain for the X this replaces.
      for (const lane of ["left", "right"] as const) {
        const armPoints = arms.filter((p) => p.lane === lane);
        if (armPoints.length === 0) continue;
        const chain = [previous, ...armPoints, point];
        // An arm is its own chain, so it has its own join: the arm the student
        // walked goes green as far as they got, and the arm they did not take
        // stays violet even though both close on the same gate.
        const armJoin = joinOf(chain);
        // The gate flag is PER SUB-SEGMENT, not per arm: an arm's last stretch
        // is the one that lands on the gate, and the stretches above it are
        // ordinary lesson-to-lesson road that the flow is allowed to travel.
        armChain(chain, minGrip).forEach((d, index) => {
          segments.push({
            d,
            done: index + 1 <= armJoin,
            loop: false,
            gate: chain[index]?.gate === true || chain[index + 1]?.gate === true,
          });
        });
      }
    } else {
      segments.push({
        d: cubic(previous, point, minGrip),
        // Behind the join, so the road the student has already walked is
        // green whether or not they took every lesson on it. See the header.
        done: mainIndex <= spineJoin,
        loop: false,
        gate: previous.gate === true || point.gate === true,
      });
    }
    /*
      THE SPINE RUNS STRAIGHT PAST A SIDE LOOP, always. An application lesson
      is optional and off the exam-weighted spine per CLAUDE.md, so the road
      has to read as continuous behind it; the detour is drawn on top as its
      own closed loop.

      ONE DETOUR PER GAP, not one per chip, and that is this round's fix
      against the critic's "four simultaneous forks at scrollY 0". A run of
      four enrichment nodes drew four separate ovals off four stretches of
      spine, which reads as four forks on one screen and breaks the goals'
      "at most one fork visible per screen". A run is now a SINGLE dimmed
      detour that leaves the spine once, threads every chip in the run, and
      rejoins once, which is the one shape the goals' branch vocabulary has
      for enrichment.
    */
    if (loops.length > 0) {
      // The direct spine segment is ALREADY emitted above (the else branch),
      // because a gap that carries only loops is not a fork and never
      // suppressed its own connection. Pushing it again here drew the road
      // twice, which is invisible on screen and one segment wrong in the
      // model, and the model is what the F1 pill and the done-count read.
      const first = loops[0]!;
      const last = loops[loops.length - 1]!;
      const gap = Math.abs(point.y - previous.y);
      const reach = Math.min(LOOP_REACH_PX, Math.max(6, gap / 3));
      const top = Math.min(Math.max(previous.y + 1, first.y - reach), point.y - 2);
      const bottom = Math.max(Math.min(point.y - 1, last.y + reach), top + 1);
      const mouthTop = spineAt(previous, point, minGrip, top);
      const mouthBottom = spineAt(previous, point, minGrip, bottom);
      const legs =
        loops.length === 1
          ? loopPath(mouthTop, first, mouthBottom)
          : // ONE detour through every chip, not one detour per chip. armChain
            // is the same Catmull-Rom chain the fork's arms use, so the curve
            // passes through each enrichment chip by construction and leaves
            // and rejoins the spine as a single smooth mouth.
            armChain([mouthTop, ...loops, mouthBottom], minGrip);
      // A loop detour never reads as progress: it is enrichment, off the
      // exam-weighted spine, and colouring it green would claim otherwise.
      for (const d of legs) segments.push({ d, done: false, loop: true, gate: false });
    }
    pending = [];
  }

  return segments;
}

/**
 * THE PROGRESS FLOW: which stretches the green TRAVELS along, and in what order.
 *
 * DESIGN-GOALS, owner 2026-09-04: "On finishing a node the green does not
 * appear, it TRAVELS from the node just finished to the next one, along the
 * trail. If several nodes complete at once the flow runs through all of them
 * in sequence rather than snapping."
 *
 * So this is a pure diff between the done-set the renderer drew last time and
 * the one it is about to draw. A stretch that has JUST become done gets a
 * rank, and the ranks run in trail order starting at zero, which is what the
 * renderer turns into a stagger: rank n starts one travel-duration after rank
 * n-1, so a run of three completions plays as three legs of one journey.
 * Everything else gets -1 and is painted in its final colour with no travel.
 *
 * Three stretches never carry the flow:
 *   - a UNIT GATE stretch, because a gate is a boundary and is never skippable
 *   - a LOOP detour, which is enrichment and is never coloured done at all
 *   - a stretch with NO recorded history, which is the first paint of a page:
 *     a student landing on the tab has not just finished anything, and
 *     replaying their whole term as a light show would be a lie about when it
 *     happened. An unknown index reads as "already there".
 *
 * Pure, so the sequencing is testable without a document or a clock.
 */
export function flowOrder(
  segments: readonly TrailSegment[],
  previousDone: readonly boolean[],
): readonly number[] {
  let rank = 0;
  return segments.map((segment, index) => {
    const wasDone = previousDone[index] ?? true;
    if (!segment.done || wasDone || segment.loop || segment.gate) return -1;
    const assigned = rank;
    rank += 1;
    return assigned;
  });
}

/* -------------------------------------------------------------------------- */
/* The F1 track map: the unit's REAL shape, at pill size.                      */
/* -------------------------------------------------------------------------- */

/**
 * One node of the unit the pill is drawing, in the order the track lays it.
 *
 * `wind` is the ABSOLUTE offset the full-size row is drawn at, not an index
 * into a cycle. The attempt-2 pill sampled trackWind(0..count-1) while the
 * track sampled trackWind(first + i) off a running GLOBAL index, and WIND_CYCLE
 * has period four, so the pill drew the unit's real shape only when that unit
 * happened to start on a multiple of four: the critic measured the outline
 * identical standing in units 1, 3 and 9. Handing the offsets in rather than a
 * cycle function removes the class of bug, not just the instance.
 */
export interface TrackMapNode {
  readonly wind: number;
  readonly lane: TrailLane;
  readonly done: boolean;
}

export interface TrackMapModel {
  /** Drawable segments, carrying their own done and loop flags. */
  readonly segments: readonly TrailSegment[];
  /** One point per input node, in the same order; ticks and the berry ride these. */
  readonly points: readonly { readonly x: number; readonly y: number }[];
}

/** The grip a pill-sized segment gets; see TRAIL_GRIP_PX for why it differs. */
export const PILL_GRIP_PX = 5;

/** The widest wind step the full-size track uses, which sets the pill's scale. */
export const WIND_EXTENT = 1.7;

/**
 * Rows for a unit's nodes: a diamond's two arms SHARE rows.
 *
 * Without this the pill stacks a fork's arms one after another and the
 * miniature reads as a longer column rather than as a split, which is the
 * whole thing the outline is supposed to say. A left node and the right node
 * beside it get the same y and opposite x, so the shape widens and closes
 * exactly where the track does.
 */
export function trackMapRows(nodes: readonly TrackMapNode[]): { readonly rows: readonly number[]; readonly count: number } {
  const rows: number[] = new Array<number>(nodes.length).fill(0);
  let row = 0;
  let left = -1;
  let right = -1;
  const closeArms = () => {
    if (left < 0 && right < 0) return;
    row = Math.max(row, left, right);
    left = -1;
    right = -1;
  };
  nodes.forEach((node, index) => {
    if (node.lane === "left") {
      if (left < 0) left = row;
      rows[index] = left;
      left += 1;
      return;
    }
    if (node.lane === "right") {
      if (right < 0) right = row;
      rows[index] = right;
      right += 1;
      return;
    }
    closeArms();
    rows[index] = row;
    row += 1;
  });
  closeArms();
  return { rows, count: Math.max(1, row) };
}

/**
 * The miniature of a unit's real path shape.
 *
 * It runs the SAME trailSegments the full-size scene runs, over the same lane
 * vocabulary, so the pill cannot draw a shape the track does not have: a
 * diamond unit gets a diamond in the pill, a hub unit's spine gets its column,
 * and a unit with a side loop gets its detour. The constraint in DESIGN-GOALS
 * is that unit shapes stay simple enough to read at pill size, and deriving
 * both from one function is what makes the outline "the unit's REAL path
 * shape" rather than an icon of one.
 */
export function trackMapModel(
  nodes: readonly TrackMapNode[],
  width: number,
  height: number,
): TrackMapModel {
  if (nodes.length < 1 || width <= 0 || height <= 0) return { segments: [], points: [] };
  const { rows, count } = trackMapRows(nodes);
  const padY = Math.min(12, height * 0.08);
  const centreX = width / 2;
  // Wind steps run to WIND_EXTENT either side; scale so the widest stays in.
  const amplitude = Math.max(0, width / 2 - 3) / WIND_EXTENT;
  const step = count <= 1 ? 0 : (height - 2 * padY) / (count - 1);
  const points = nodes.map((node, index) => ({
    x: Number((centreX + node.wind * amplitude).toFixed(2)),
    y: Number((padY + rows[index]! * step).toFixed(2)),
  }));
  const trail: TrailPoint[] = points.map((point, index) => ({
    x: point.x,
    y: point.y,
    lane: nodes[index]!.lane,
    done: nodes[index]!.done,
  }));
  return { segments: trailSegments(trail, PILL_GRIP_PX), points };
}
