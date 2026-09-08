/**
 * L3: turning a wobble into a structure, and then grading it.
 *
 * WHAT THIS IS NOT. It is not handwriting recognition and it never guesses at a
 * letter. A student at L3 draws BONDS as strokes on a blank canvas and TAPS a
 * vertex to say what element sits there, choosing from a palette of the
 * elements the target actually contains. That is how every structure editor a
 * chemist has ever used works, and it is the boring choice on purpose: an OCR
 * pass that reads a hasty "N" as an "H" would mark a correct answer wrong, and
 * a wrong answer on a correct drawing is the single most expensive thing this
 * product can do to a student the night before an exam.
 *
 * SO THE RECOGNITION IS GRAPH RECOGNITION, in four steps, each of them plain:
 *
 *   1. SIMPLIFY. Each raw stroke goes through Ramer to Douglas to Peucker
 *      (geometry.ts), so a ring drawn as one gesture becomes its corners.
 *   2. CLUSTER. Every segment endpoint from every stroke is snapped into a
 *      vertex if it lands within `snapPx` of one. This is what closes a ring
 *      the student did not quite close, and it is the same forgiveness the
 *      corridor gives at L1 and L2, applied to endpoints instead of paths.
 *   3. LABEL. Element placements snap to the nearest vertex. Unlabelled
 *      vertices are carbon, which is skeletal convention.
 *   4. GRADE. The graph is filled by target.ts's one valence rule, built into a
 *      chem-core MechanismState, and handed to packages/curriculum's
 *      `checkStructure`. We do not write our own comparison: that file already
 *      does constitution over a multiset of species, it already knows what it
 *      cannot do, and it has been through an adversary pass.
 *
 * WHY GRADING GOES THROUGH CURRICULUM AND NOT CHEM-CORE. chem-core grades
 * ARROWS. The four answer shapes in CLAUDE.md put "a structure" in
 * packages/curriculum, graded by canonical structure equivalence, and the
 * structure answer kind is already built and already exported. A trace beat is
 * a structure answer with a different input device.
 *
 * ONE SEAM THAT IS NOT CLOSED, and it is reported rather than papered over.
 * `checkStructure` names causes from `CurriculumCauseId`. `BeatResult.cause` in
 * beats/types.ts is `CauseId | BeatShapeCauseId`, which does not include them.
 * So `toBeatResult` below funnels a curriculum cause into the tail id
 * `no_named_cause_logged` while keeping the real cause and its detail on this
 * module's own richer result, which is what the surface shows the student.
 * Nothing is lost to the reader; what is lost is the TYPED id on the recorded
 * result, and that closes the day `BeatCauseId` widens. The required edit is in
 * this piece's return value. It is a narrow funnel by construction: the guided
 * levels resolve to `trace_incomplete` and `trace_left_the_target`, which are
 * real shape causes, and only the L3 structure comparison reaches it.
 */

import {
  checkStructure,
  createStructureAnswer,
  type CurriculumCauseId,
  type StructureVerdict,
} from "@blueberry/curriculum";
import type { BeatCauseId, BeatId, BeatResult, MasteryLevel } from "../types";
import { simplifyPolyline, distance, type Pt } from "./geometry";
import {
  OverValentError,
  stateOf,
  targetState,
  type Graph,
  type TraceEdge,
  type TraceTarget,
  type TraceVertex,
  type VertexId,
} from "./target";
import type { BondOrder, Element } from "@blueberry/chem-core";

/** One gesture at L3: raw sampled points plus the bond order that was selected. */
export interface FreehandStroke {
  readonly id: string;
  readonly points: readonly Pt[];
  readonly order: BondOrder;
}

/** A tap that says "this vertex is an oxygen". Snapped to the nearest vertex. */
export interface ElementPlacement {
  readonly at: Pt;
  readonly element: Element;
  readonly charge?: number;
}

export interface RecogniseOptions {
  /** How close two endpoints must be to become one vertex. */
  readonly snapPx: number;
  /** How far a point may sit off a straightened stroke before it earns a corner. */
  readonly simplifyPx: number;
  /** Shorter than this and a segment is a tap or a twitch, not a bond. */
  readonly minBondPx: number;
}

export const DEFAULT_RECOGNISE: RecogniseOptions = Object.freeze({
  snapPx: 26,
  simplifyPx: 10,
  minBondPx: 22,
});

export interface Recognition {
  readonly graph: Graph;
  /** Segments dropped for being shorter than `minBondPx`. Reported, not hidden. */
  readonly droppedSegments: number;
  /** Strokes that closed on themselves after snapping. Also reported. */
  readonly droppedLoops: number;
  /** Element taps that landed on no vertex at all. */
  readonly unplacedLabels: number;
}

interface Cluster {
  x: number;
  y: number;
  count: number;
}

/**
 * Endpoint clustering, greedy and single pass.
 *
 * Greedy rather than k means because there is no k to know and because a
 * student's endpoints are either obviously together or obviously apart. The
 * running centroid moves as points join, so a ring closed within `snapPx` per
 * hop still lands on one vertex rather than drifting into two.
 */
class VertexPool {
  private readonly clusters: Cluster[] = [];
  // Written out rather than declared as a constructor parameter property,
  // which this repo's `erasableSyntaxOnly` forbids: a parameter property
  // emits a runtime assignment, so it is not type syntax a stripper can erase.
  private readonly snapPx: number;

  constructor(snapPx: number) {
    this.snapPx = snapPx;
  }

  add(point: Pt): number {
    let bestIndex = -1;
    let best = this.snapPx;
    for (let i = 0; i < this.clusters.length; i += 1) {
      const cluster = this.clusters[i]!;
      const d = Math.hypot(cluster.x - point.x, cluster.y - point.y);
      if (d <= best) {
        best = d;
        bestIndex = i;
      }
    }
    if (bestIndex >= 0) {
      const cluster = this.clusters[bestIndex]!;
      const next = cluster.count + 1;
      cluster.x += (point.x - cluster.x) / next;
      cluster.y += (point.y - cluster.y) / next;
      cluster.count = next;
      return bestIndex;
    }
    this.clusters.push({ x: point.x, y: point.y, count: 1 });
    return this.clusters.length - 1;
  }

  /** Nearest existing vertex, or null. Used to place an element tap. */
  nearest(point: Pt): number | null {
    let bestIndex: number | null = null;
    let best = this.snapPx;
    for (let i = 0; i < this.clusters.length; i += 1) {
      const cluster = this.clusters[i]!;
      const d = Math.hypot(cluster.x - point.x, cluster.y - point.y);
      if (d <= best) {
        best = d;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  snapshot(): readonly Cluster[] {
    return this.clusters;
  }
}

function vertexIdFor(index: number): VertexId {
  return `v${index}`;
}

/**
 * Steps one to three: strokes and taps in, a skeletal graph out.
 *
 * Two edges between the same pair of vertices collapse to one carrying the
 * HIGHER order, because a student who traced a bond twice drew one bond and a
 * student who selected "double" and drew over their single meant the double.
 * Neither is a mistake worth failing, and neither is invented chemistry: the
 * order was still explicitly selected before the stroke.
 */
export function recognise(
  strokes: readonly FreehandStroke[],
  labels: readonly ElementPlacement[],
  options: RecogniseOptions = DEFAULT_RECOGNISE,
): Recognition {
  const pool = new VertexPool(options.snapPx);
  const pending: { a: number; b: number; order: BondOrder }[] = [];
  let droppedSegments = 0;
  let droppedLoops = 0;

  for (const stroke of strokes) {
    const corners = simplifyPolyline(stroke.points, options.simplifyPx);
    for (let i = 1; i < corners.length; i += 1) {
      const from = corners[i - 1]!;
      const to = corners[i]!;
      if (distance(from, to) < options.minBondPx) {
        droppedSegments += 1;
        continue;
      }
      const a = pool.add(from);
      const b = pool.add(to);
      if (a === b) {
        droppedLoops += 1;
        continue;
      }
      pending.push({ a, b, order: stroke.order });
    }
  }

  const byPair = new Map<string, { a: number; b: number; order: BondOrder }>();
  for (const edge of pending) {
    const key = edge.a < edge.b ? `${edge.a}:${edge.b}` : `${edge.b}:${edge.a}`;
    const existing = byPair.get(key);
    if (existing === undefined || edge.order > existing.order) byPair.set(key, edge);
  }

  const elements = new Map<number, { element: Element; charge: number }>();
  let unplacedLabels = 0;
  for (const label of labels) {
    const index = pool.nearest(label.at);
    if (index === null) {
      unplacedLabels += 1;
      continue;
    }
    elements.set(index, { element: label.element, charge: label.charge ?? 0 });
  }

  const vertices: TraceVertex[] = pool.snapshot().map((cluster, index) => {
    const label = elements.get(index);
    return {
      id: vertexIdFor(index),
      x: cluster.x,
      y: cluster.y,
      ...(label === undefined ? {} : { element: label.element, charge: label.charge }),
    };
  });

  const edges: TraceEdge[] = [...byPair.values()].map((edge, index) => ({
    id: `e${index}`,
    a: vertexIdFor(edge.a),
    b: vertexIdFor(edge.b),
    order: edge.order,
  }));

  return { graph: { vertices, edges }, droppedSegments, droppedLoops, unplacedLabels };
}

/* ------------------------------------------------------------------ */
/* Grading                                                              */
/* ------------------------------------------------------------------ */

/**
 * A cause from any of the three registries this beat can legitimately reach:
 * chem-core's chemistry causes, beats/types.ts's answer shape causes, and
 * packages/curriculum's structure comparison causes. See the header on why the
 * third one cannot yet ride on a BeatResult.
 */
export type TraceCauseId = BeatCauseId | CurriculumCauseId;

export type TraceOutcome =
  | { readonly kind: "correct"; readonly cause: TraceCauseId; readonly detail: string }
  | { readonly kind: "invalid"; readonly cause: TraceCauseId; readonly detail: string }
  | { readonly kind: "undecided"; readonly cause: TraceCauseId; readonly detail: string };

/**
 * Grade a drawing against a target.
 *
 * The over valent case is caught and named rather than allowed to reach the
 * comparison: `valence_exceeded` is a chem-core cause with authored copy in
 * packages/feedback, so a student who put five bonds on a carbon reads a
 * sentence a person wrote about exactly that, which is a Tier 1 hit rather than
 * a generic mismatch.
 */
export function gradeDrawing(target: TraceTarget, drawn: Graph): TraceOutcome {
  if (drawn.edges.length === 0) {
    return {
      kind: "invalid",
      cause: "trace_incomplete",
      detail: "there is nothing on the canvas yet",
    };
  }
  let submitted;
  try {
    submitted = stateOf(drawn, "trace-submission");
  } catch (error) {
    if (error instanceof OverValentError) {
      return {
        kind: "invalid",
        cause: "valence_exceeded",
        detail: `more bonds than there is room for at ${error.vertexIds.length} atom${error.vertexIds.length === 1 ? "" : "s"}`,
      };
    }
    throw error;
  }
  const answer = createStructureAnswer(targetState(target));
  const verdict: StructureVerdict = checkStructure(answer, { kind: "structure", state: submitted });
  if (verdict.outcome === "correct") {
    // chem-core's success cause. There is no positive id in BeatShapeCauseId
    // and inventing one here would put a second registry beside the closed one.
    return { kind: "correct", cause: "matches_requested_route", detail: `that is ${target.name}` };
  }
  return { kind: verdict.outcome === "wrong" ? "invalid" : "undecided", cause: verdict.cause, detail: verdict.detail };
}

/**
 * The recorded result, in the shape beats/types.ts declares.
 *
 * `no_named_cause_logged` appears here ONLY where a curriculum cause has no
 * home in BeatCauseId yet, per this file's header. Every id that does have a
 * home is passed through unchanged, so widening BeatCauseId later shrinks this
 * function rather than rewriting it.
 */
export function toBeatResult(
  outcome: TraceOutcome,
  context: {
    readonly beatId: BeatId;
    readonly level: MasteryLevel;
    readonly elapsedMs: number;
    readonly at: string;
  },
): BeatResult {
  const cause: BeatCauseId = isBeatCause(outcome.cause) ? outcome.cause : "no_named_cause_logged";
  const base = { beatId: context.beatId, level: context.level, cause, elapsedMs: context.elapsedMs, at: context.at };
  return outcome.kind === "correct"
    ? { ...base, kind: "correct" }
    : { ...base, kind: "invalid" };
}

/**
 * Whether an id is one BeatResult can carry.
 *
 * A runtime check rather than a type guard over a literal list, because the
 * only ids this module can produce that are NOT BeatCauseIds come out of
 * `checkStructure`, and those all begin `structure_`. Narrow, documented, and
 * it fails safe: an id it does not recognise funnels to the tail rather than
 * being asserted into a union it does not belong to.
 */
function isBeatCause(cause: TraceCauseId): cause is BeatCauseId {
  return !cause.startsWith("structure_");
}

/** The cause a guided stroke set resolves to. Both are real shape causes. */
export function guidedCause(outcome: "incomplete" | "left_target"): BeatCauseId {
  return outcome === "left_target" ? "trace_left_the_target" : "trace_incomplete";
}
