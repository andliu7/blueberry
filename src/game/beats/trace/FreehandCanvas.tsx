/**
 * The freehand canvas: L3, produce. A blank frame, a tool palette, and
 * recognition that turns the wobble into a clean skeletal structure.
 *
 * THE MOMENT THIS FILE EXISTS FOR. A stroke is drawn raw while the finger is
 * down, in a light "wet ink" colour. On release it goes through recognise.ts
 * and the whole drawing REDRAWS as proper bonds: straight rods, snapped
 * vertices, closed rings, element letters. That redraw is the reward, and it is
 * also honest feedback, because what the student then sees is exactly the graph
 * that will be graded. There is no hidden interpretation between the picture
 * and the answer.
 *
 * WHY THERE IS A TOOL PALETTE AND NOT HANDWRITING. Written out in recognise.ts:
 * reading a hasty "N" as an "H" would mark a correct answer wrong, and that is
 * the most expensive mistake this product can make. So bonds are drawn and
 * elements are placed, which is how every structure editor a chemist has used
 * works. Carbon is never placed: an unlabelled vertex IS a carbon, which is
 * skeletal convention and worth stating on screen once.
 *
 * REACT NOTES:
 *   - undo keeps a stack of whole snapshots rather than a stack of inverse
 *     operations. The state is a handful of arrays; whole copies are cheap, and
 *     an inverse-operation undo is where undo bugs live
 *   - the recognised graph is derived with `useMemo` from strokes plus labels,
 *     so it cannot drift out of step with them. There is no second copy of the
 *     drawing to keep in sync
 *   - `onGraphChange` fires from an effect on that memo, not from the pointer
 *     handler, for the same reason: one source, one notification
 */

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { BondOrder, Element } from "@blueberry/chem-core";
import { fillFor } from "../../render/svg/depth";
import { polylineToPathData, type Pt } from "./geometry";
import {
  DEFAULT_RECOGNISE,
  recognise,
  type ElementPlacement,
  type FreehandStroke,
  type Recognition,
} from "./recognise";
import { bondAxis, chargeLabel, labelledVertices, multipleBondLines, viewBoxOf, viewBoxString } from "./render";
import { elementOf, elementPaletteFor, type Graph, type TraceTarget } from "./target";
import { PressButton } from "./PressButton";

const ROD = 10;

/** What a tap does next. "bond" draws; an element places that element. */
type Tool = { readonly kind: "bond"; readonly order: BondOrder } | { readonly kind: "element"; readonly element: Element };

interface Snapshot {
  readonly strokes: readonly FreehandStroke[];
  readonly labels: readonly ElementPlacement[];
}

const EMPTY: Snapshot = { strokes: [], labels: [] };

export interface FreehandCanvasProps {
  readonly target: TraceTarget;
  readonly onGraphChange: (graph: Graph, recognition: Recognition) => void;
}

const ORDER_LABEL: Record<BondOrder, string> = { 1: "Single", 2: "Double", 3: "Triple" };

export function FreehandCanvas({ target, onGraphChange }: FreehandCanvasProps) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [past, setPast] = useState<readonly Snapshot[]>([]);
  const [tool, setTool] = useState<Tool>({ kind: "bond", order: 1 });
  const [wet, setWet] = useState<readonly Pt[]>([]);
  const [press, setPress] = useState<Pt | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawingRef = useRef<{ pointerId: number; points: Pt[] } | null>(null);
  const strokeCounter = useRef(0);

  const box = useMemo(() => viewBoxOf(target.vertices), [target]);
  const palette = useMemo(
    () => elementPaletteFor(target).filter((element) => element !== "C"),
    [target],
  );

  const recognition = useMemo(
    () => recognise(snapshot.strokes, snapshot.labels, DEFAULT_RECOGNISE),
    [snapshot],
  );

  useEffect(() => {
    onGraphChange(recognition.graph, recognition);
  }, [recognition, onGraphChange]);

  const commit = useCallback((next: Snapshot) => {
    setPast((previous) => [...previous.slice(-30), snapshotOf(next)]);
    setSnapshot(next);
  }, []);

  const toScene = useCallback((event: ReactPointerEvent<SVGSVGElement>): Pt | null => {
    const svg = svgRef.current;
    if (svg === null) return null;
    const ctm = svg.getScreenCTM();
    if (ctm === null) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return { x: point.x, y: point.y };
  }, []);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = toScene(event);
    if (point === null) return;
    setPress(point);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is a nicety; the press is not.
    }
    if (tool.kind === "element") return;
    drawingRef.current = { pointerId: event.pointerId, points: [point] };
    setWet([point]);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drawing = drawingRef.current;
    if (drawing === null || drawing.pointerId !== event.pointerId) return;
    const point = toScene(event);
    if (point === null) return;
    drawing.points.push(point);
    setWet([...drawing.points]);
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    setPress(null);
    const point = toScene(event);
    const drawing = drawingRef.current;
    drawingRef.current = null;
    setWet([]);

    if (tool.kind === "element") {
      if (point === null) return;
      commit({
        ...snapshot,
        labels: [...snapshot.labels, { at: point, element: tool.element, charge: 0 }],
      });
      return;
    }
    if (drawing === null || drawing.pointerId !== event.pointerId) return;
    strokeCounter.current += 1;
    commit({
      ...snapshot,
      strokes: [
        ...snapshot.strokes,
        { id: `f${strokeCounter.current}`, points: drawing.points, order: tool.order },
      ],
    });
  };

  const undo = () => {
    const previous = past[past.length - 2] ?? EMPTY;
    setPast((stack) => stack.slice(0, -1));
    setSnapshot(previous);
  };

  const clear = () => {
    setPast([]);
    setSnapshot(EMPTY);
  };

  const graph = recognition.graph;
  const somethingDrawn = snapshot.strokes.length > 0 || snapshot.labels.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
      <svg
        ref={svgRef}
        viewBox={viewBoxString(box)}
        role="img"
        aria-label={`Draw ${target.name}. ${graph.edges.length} bonds placed so far.`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          touchAction: "none",
          background: "var(--bb-card)",
          borderRadius: "var(--radius-card, 16px)",
          border: "1px solid var(--bb-border)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* The recognised drawing: what will be graded, drawn cleanly. */}
        {graph.edges.map((edge) => {
          const axis = bondAxis(graph, edge);
          if (axis === null) return null;
          return (
            <g key={edge.id}>
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

        {labelledVertices(graph).map((vertex) => {
          const charge = chargeLabel(vertex.charge);
          return (
            <g key={vertex.id}>
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

        {/* Wet ink: the finger's own path, only while the finger is down. */}
        {wet.length > 1 && (
          <path
            d={polylineToPathData(wet)}
            fill="none"
            stroke="var(--bb-primary)"
            strokeWidth={ROD * 0.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.55}
          />
        )}

        {press !== null && (
          <circle cx={press.x} cy={press.y} r={18} fill="none" stroke="var(--bb-primary)" strokeWidth={2} opacity={0.4} />
        )}
      </svg>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2, 8px)", alignItems: "center" }}>
        {([1, 2, 3] as const).map((order) => (
          <PressButton
            key={order}
            tone="quiet"
            selected={tool.kind === "bond" && tool.order === order}
            onPress={() => setTool({ kind: "bond", order })}
          >
            {ORDER_LABEL[order]}
          </PressButton>
        ))}
        {palette.map((element) => (
          <PressButton
            key={element}
            tone="quiet"
            selected={tool.kind === "element" && tool.element === element}
            label={`Place ${element}`}
            onPress={() => setTool({ kind: "element", element })}
            style={{ color: fillFor(element) }}
          >
            {element}
          </PressButton>
        ))}
        <PressButton tone="ghost" disabled={!somethingDrawn} onPress={undo}>
          Undo
        </PressButton>
        <PressButton tone="ghost" disabled={!somethingDrawn} onPress={clear}>
          Clear
        </PressButton>
      </div>

      <p style={{ margin: 0, color: "var(--bb-muted-foreground)", fontSize: "var(--text-scale-sm, 0.875rem)" }}>
        {tool.kind === "bond"
          ? "Drag to draw a bond. Every corner you leave unlabelled is a carbon."
          : `Tap where the ${tool.element} goes.`}
      </p>
    </div>
  );
}

/** A defensive copy, so an undo cannot hand back an array a later edit mutated. */
function snapshotOf(snapshot: Snapshot): Snapshot {
  return { strokes: [...snapshot.strokes], labels: [...snapshot.labels] };
}
