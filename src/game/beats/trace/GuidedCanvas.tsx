/**
 * The guided canvas: L0 to L2, where a guide exists and the corridor is the
 * whole behaviour.
 *
 * WHAT THE REFERENCE SHOWS, taken affordance by affordance from
 * `reference images/(dark mode) drawing characters.png`,
 * `.../in the middle of drawing characters - notice it follows the line even if
 * I'm off.png` and `.../example of drawing off of the lines.png`:
 *
 *   - what is already drawn renders SOLID, in the ink colour, rounded caps
 *   - what is still to come renders as a DIM GHOST at the same width, so the
 *     shape is legible as a whole before a finger touches it
 *   - the ONE stroke that is next carries a dashed centre line, an arrowhead at
 *     its far end, and a filled puck with a direction arrow at its start. Only
 *     one at a time: the sequence is the teaching
 *   - the drawn mark sits on the guide even when the finger is beside it, and
 *     stops following when the finger leaves. geometry.ts owns that rule and
 *     this file only renders what it returns
 *
 * WHAT IS OURS RATHER THAN THE REFERENCE'S: the corridor is drawn, faintly, as
 * a wide band under the pending stroke. The reference leaves its tolerance
 * invisible, which is fine for a letter whose shape everyone already knows. A
 * student meeting a molecule has no idea how much slack they have, and a band
 * that says "anywhere in here" is the difference between drawing confidently
 * and drawing carefully. It is the corridor made visible, at the authored
 * tolerance, so it cannot lie about how much room there is.
 *
 * REACT NOTES, for reading this at 1am:
 *   - `useId` gives this instance a unique marker id, because two canvases on
 *     one page sharing an SVG `<marker id>` would both point at the first one
 *   - `useMemo` on the paths is not a micro optimisation: `buildPath` walks and
 *     measures every stroke, and a pointer move must not rebuild them
 *   - the pointer plumbing is the same shape as tabs/trainer/DrawCanvas.tsx:
 *     `getScreenCTM().inverse()` puts a client point into the SVG's own
 *     coordinates, `setPointerCapture` keeps move and up coming after the
 *     finger leaves the element, and `touch-action: none` stops the page
 *     scrolling out from under a drag. Lifted rather than imported, because
 *     importing that component would drag mechanism state in with it
 *   - refs hold the live trace, state holds what renders. A pointer move at
 *     120 Hz writes the ref every time and sets state every time too, which is
 *     one small tree; the ref exists so a move never reads a stale closure
 */

import { useCallback, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { fillFor } from "../../render/svg/depth";
import type { GuideStyle } from "../types";
import {
  IDLE_TRACE,
  advanceTrace,
  beginTrace,
  buildPath,
  canStartAt,
  pointAt,
  polylineToPathData,
  sliceTo,
  strokeOutcome,
  tangentAt,
  type Pt,
  type StrokeOutcome,
  type TracePath,
  type TraceProgress,
} from "./geometry";
import { bondAxis, chargeLabel, labelledVertices, multipleBondLines, viewBoxOf, viewBoxString } from "./render";
import { elementOf, strokePoints, type TraceTarget } from "./target";

/** Bond rod width, matching render/svg/depth.tsx so the two look like one app. */
const ROD = 10;
const PUCK_R = 17;

export interface GuidedCanvasProps {
  readonly target: TraceTarget;
  readonly guide: GuideStyle;
  readonly tolerancePx: number;
  /** L0 cannot fail: a press finishes the pending stroke. See canFail() in types.ts. */
  readonly cannotFail: boolean;
  /** Fired on every release that did not complete the stroke. */
  readonly onStrokeMiss: (strokeId: string, outcome: Exclude<StrokeOutcome, "complete">) => void;
  readonly onComplete: () => void;
}

interface Live {
  readonly pointerId: number;
  readonly strokeId: string;
  readonly path: TracePath;
}

export function GuidedCanvas({
  target,
  guide,
  tolerancePx,
  cannotFail,
  onStrokeMiss,
  onComplete,
}: GuidedCanvasProps) {
  const markerId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const liveRef = useRef<Live | null>(null);
  const progressRef = useRef<TraceProgress>(IDLE_TRACE);

  const [doneIds, setDoneIds] = useState<readonly string[]>([]);
  const doneRef = useRef<readonly string[]>([]);
  const [progress, setProgress] = useState<TraceProgress>(IDLE_TRACE);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [trail, setTrail] = useState<readonly Pt[]>([]);
  const [press, setPress] = useState<Pt | null>(null);

  const rules = useMemo(() => ({ tolerancePx }), [tolerancePx]);
  const graph = useMemo(() => ({ vertices: target.vertices, edges: target.edges }), [target]);
  const box = useMemo(() => viewBoxOf(target.vertices), [target]);

  const paths = useMemo(() => {
    const map = new Map<string, TracePath>();
    for (const plan of target.strokes) map.set(plan.id, buildPath(strokePoints(target, plan)));
    return map;
  }, [target]);

  const edgesByStroke = useMemo(() => {
    const map = new Map<string, readonly string[]>();
    for (const plan of target.strokes) map.set(plan.id, plan.edgeIds);
    return map;
  }, [target]);

  const done = useMemo(() => new Set(doneIds), [doneIds]);
  const pending = target.strokes.find((plan) => !done.has(plan.id)) ?? null;
  const pendingPath = pending === null ? null : paths.get(pending.id)!;

  const doneEdgeIds = useMemo(() => {
    const set = new Set<string>();
    for (const id of doneIds) for (const edgeId of edgesByStroke.get(id) ?? []) set.add(edgeId);
    return set;
  }, [doneIds, edgesByStroke]);

  const toScene = useCallback((event: ReactPointerEvent<SVGSVGElement>): Pt | null => {
    const svg = svgRef.current;
    if (svg === null) return null;
    const ctm = svg.getScreenCTM();
    if (ctm === null) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return { x: point.x, y: point.y };
  }, []);

  /**
   * Mark a stroke drawn.
   *
   * The list is kept in a ref as well as in state because `onComplete` has to
   * fire exactly once, and a state updater is not the place to call it: React
   * treats updaters as pure and calls them twice in development to prove it, so
   * a side effect inside one fires twice. Ref for the decision, state for the
   * render.
   */
  const finish = useCallback(
    (strokeId: string) => {
      if (doneRef.current.includes(strokeId)) return;
      const next = [...doneRef.current, strokeId];
      doneRef.current = next;
      setDoneIds(next);
      if (next.length === target.strokes.length) onComplete();
    },
    [onComplete, target.strokes.length],
  );

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = toScene(event);
    if (point === null) return;
    // The acknowledgement, first, before any decision about what the press means.
    setPress(point);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is a nicety; the press is not. Same reasoning as DrawCanvas.tsx.
    }
    if (pending === null || pendingPath === null) return;
    if (cannotFail) {
      // L0 meets the shape rather than tests it: the press draws the stroke.
      finish(pending.id);
      return;
    }
    if (!canStartAt(pendingPath, point, rules)) return;
    const started = beginTrace(pendingPath, point, rules);
    liveRef.current = { pointerId: event.pointerId, strokeId: pending.id, path: pendingPath };
    progressRef.current = started;
    setActiveId(pending.id);
    setProgress(started);
    setTrail([point]);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const live = liveRef.current;
    if (live === null || live.pointerId !== event.pointerId) return;
    const point = toScene(event);
    if (point === null) return;
    const next = advanceTrace(live.path, progressRef.current, point, rules);
    progressRef.current = next;
    setProgress(next);
    setTrail((previous) => (next.offCorridor ? [...previous.slice(-80), point] : []));
    if (next.complete) {
      liveRef.current = null;
      setActiveId(null);
      setProgress(IDLE_TRACE);
      setTrail([]);
      finish(live.strokeId);
    }
  };

  const endStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    setPress(null);
    const live = liveRef.current;
    if (live === null || live.pointerId !== event.pointerId) return;
    liveRef.current = null;
    const outcome = strokeOutcome(progressRef.current, rules);
    progressRef.current = IDLE_TRACE;
    setActiveId(null);
    setProgress(IDLE_TRACE);
    setTrail([]);
    if (outcome !== "complete") onStrokeMiss(live.strokeId, outcome);
  };

  const showGhost = guide === "solid";
  const showEndpoints = guide === "faded";
  /**
   * The corridor band and the dashed remainder are THE GUIDE, so they belong to
   * L0 and L1 only. L2 is "endpoints only" in the ladder spec: the corridor is
   * still there and still forgiving, it is simply no longer drawn, so the hand
   * has to know the line rather than read it. The start puck survives at L2,
   * because where to begin and which way to go is a sequencing instruction
   * rather than a guide to the path.
   */
  const showPathGuide = guide === "solid";

  const ink = activeId !== null && pendingPath !== null && progress.along > 0
    ? sliceTo(pendingPath, progress.along)
    : null;
  const remainderStart = pendingPath === null ? 0 : progress.along;
  const remainder =
    pendingPath === null || remainderStart >= pendingPath.length - 0.5
      ? null
      : buildPath([
          pointAt(pendingPath, remainderStart),
          ...pendingPath.points.filter(
            (_, index) => (pendingPath.cumulative[index] ?? 0) > remainderStart + 0.5,
          ),
        ]);
  const puck = pendingPath === null || progress.along > 0 ? null : pointAt(pendingPath, 0);
  const puckDirection = pendingPath === null ? { x: 1, y: 0 } : tangentAt(pendingPath, 0);

  return (
    <svg
      ref={svgRef}
      viewBox={viewBoxString(box)}
      role="img"
      aria-label={`Trace ${target.name}. ${doneIds.length} of ${target.strokes.length} strokes drawn.`}
      style={{ width: "100%", height: "auto", touchAction: "none", display: "block" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
    >
      <style>{`
        @keyframes bb-trace-puck { 0%,100% { r: ${PUCK_R}px } 50% { r: ${PUCK_R + 3}px } }
        .bb-trace-puck { animation: bb-trace-puck 1.6s var(--ease-in-out, ease-in-out) infinite }
        @media (prefers-reduced-motion: reduce) { .bb-trace-puck { animation: none } }
      `}</style>
      <defs>
        <marker
          id={`${markerId}-head`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="12"
          markerHeight="12"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          {/* userSpaceOnUse, not the default strokeWidth: a marker that scales
              with the stroke rendered larger than the atoms it pointed at once
              already in this repo, and it is recorded in STATUS.md. */}
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--bb-primary)" />
        </marker>
      </defs>

      {/* The ghost: the whole shape, dim, so it is legible before it is drawn. */}
      {showGhost &&
        target.edges
          .filter((edge) => !doneEdgeIds.has(edge.id))
          .map((edge) => {
            const axis = bondAxis(graph, edge);
            if (axis === null) return null;
            return (
              // --scene-faint is the token the contrast audit already blessed
              // for a faint scene mark, in both themes. The ghost is context;
              // the affordance a student acts on is the pending stroke's puck,
              // dashes and arrowhead, which are all --bb-primary at full strength.
              <g key={`ghost-${edge.id}`} opacity={0.45}>
                <line
                  x1={axis.from.x}
                  y1={axis.from.y}
                  x2={axis.to.x}
                  y2={axis.to.y}
                  stroke="var(--scene-faint)"
                  strokeWidth={ROD}
                  strokeLinecap="round"
                />
                {multipleBondLines(graph, edge).map((line, index) => (
                  <line
                    key={index}
                    x1={line.from.x}
                    y1={line.from.y}
                    x2={line.to.x}
                    y2={line.to.y}
                    stroke="var(--scene-faint)"
                    strokeWidth={ROD}
                    strokeLinecap="round"
                  />
                ))}
              </g>
            );
          })}

      {/* L2: endpoints only. Where to start and where to stop, nothing between. */}
      {showEndpoints &&
        target.strokes
          .filter((plan) => !done.has(plan.id))
          .flatMap((plan) => {
            const path = paths.get(plan.id)!;
            return [pointAt(path, 0), pointAt(path, path.length)].map((point, index) => (
              <circle
                key={`dot-${plan.id}-${index}`}
                cx={point.x}
                cy={point.y}
                r={7}
                fill="var(--bb-muted-foreground)"
              />
            ));
          })}

      {/* Drawn already: solid, in the bond colour, with its extra lines. */}
      {target.edges
        .filter((edge) => doneEdgeIds.has(edge.id))
        .map((edge) => {
          const axis = bondAxis(graph, edge);
          if (axis === null) return null;
          return (
            <g key={`done-${edge.id}`}>
              <line
                x1={axis.from.x}
                y1={axis.from.y}
                x2={axis.to.x}
                y2={axis.to.y}
                stroke="var(--bond-stroke)"
                strokeWidth={ROD}
                strokeLinecap="round"
              />
              {multipleBondLines(graph, edge).map((line, index) => (
                <line
                  key={index}
                  x1={line.from.x}
                  y1={line.from.y}
                  x2={line.to.x}
                  y2={line.to.y}
                  stroke="var(--bond-stroke)"
                  strokeWidth={ROD}
                  strokeLinecap="round"
                />
              ))}
            </g>
          );
        })}

      {/* The corridor, made visible at exactly the authored tolerance. */}
      {pendingPath !== null && !cannotFail && showPathGuide && (
        <path
          d={polylineToPathData(pendingPath.points)}
          fill="none"
          stroke="var(--bb-primary)"
          strokeWidth={tolerancePx * 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.09}
        />
      )}

      {/* What the finger drew, snapped to the guide. The header's whole point. */}
      {ink !== null && (
        <path
          d={polylineToPathData(ink)}
          fill="none"
          stroke="var(--bb-primary)"
          strokeWidth={ROD}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Still to draw on this stroke: dashed, with the head at the far end. */}
      {remainder !== null && !cannotFail && showPathGuide && (
        <path
          d={polylineToPathData(remainder.points)}
          fill="none"
          stroke="var(--bb-primary)"
          strokeWidth={5}
          strokeDasharray="12 10"
          strokeLinecap="round"
          markerEnd={`url(#${markerId}-head)`}
          opacity={0.85}
        />
      )}

      {/* Where the finger actually is, once it has left the corridor. Warning
          colour, never red: the stroke is waiting, not wrong. */}
      {trail.length > 1 && (
        <path
          d={polylineToPathData(trail)}
          fill="none"
          stroke="var(--warn)"
          strokeWidth={ROD * 0.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.75}
        />
      )}

      {/* The start puck: put your finger here, go this way. */}
      {puck !== null && !cannotFail && (
        <g>
          <circle className="bb-trace-puck" cx={puck.x} cy={puck.y} r={PUCK_R} fill="var(--bb-primary)" />
          <path
            d={`M ${puck.x - puckDirection.x * 7 - puckDirection.y * 5} ${puck.y - puckDirection.y * 7 + puckDirection.x * 5}
                L ${puck.x + puckDirection.x * 8} ${puck.y + puckDirection.y * 8}
                L ${puck.x - puckDirection.x * 7 + puckDirection.y * 5} ${puck.y - puckDirection.y * 7 - puckDirection.x * 5} z`}
            fill="var(--bb-primary-foreground)"
          />
        </g>
      )}

      {/* Element letters. Dim until a bond reaches them, so the shape leads and
          the labels confirm it rather than the other way round. */}
      {labelledVertices(graph).map((vertex) => {
        const reached = target.edges.some(
          (edge) => doneEdgeIds.has(edge.id) && (edge.a === vertex.id || edge.b === vertex.id),
        );
        const charge = chargeLabel(vertex.charge);
        return (
          <g key={`label-${vertex.id}`} opacity={reached ? 1 : 0.4}>
            <circle cx={vertex.x} cy={vertex.y} r={13} fill="var(--bb-card)" />
            <text
              x={vertex.x}
              y={vertex.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={19}
              fontWeight={700}
              fill={fillFor(elementOf(vertex))}
              style={{ fontFamily: "var(--font-sans, system-ui)" }}
            >
              {elementOf(vertex)}
            </text>
            {charge !== null && (
              <text
                x={vertex.x + 13}
                y={vertex.y - 12}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={700}
                fill="var(--charge-ink, var(--bb-foreground))"
              >
                {charge}
              </text>
            )}
          </g>
        );
      })}

      {/* The press ring. Rendered from pointer down, removed on release. */}
      {press !== null && (
        <circle cx={press.x} cy={press.y} r={20} fill="none" stroke="var(--bb-primary)" strokeWidth={2} opacity={0.45} />
      )}
    </svg>
  );
}
