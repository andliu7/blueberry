/**
 * The scratchpad: scratch paper beside the structure editor on a "Draw it"
 * screen, for a finger or an Apple Pencil. Raw ink, nothing more. It NEVER
 * grades and nothing reads it: the editor next to it is the answer, this is
 * where the student works it out first.
 *
 * THE PALM RULE lives in ink.ts and is shared with FreehandCanvas: once a
 * Pencil has touched the paper every later touch is a palm and is refused, and
 * only one pointer draws at a time. A Pencil's pressure sets the line width;
 * a finger or a mouse draws at one width.
 *
 * WHY NOT FreehandCanvas. That canvas is a recogniser: on release it sends
 * every stroke through recognise.ts and redraws the drawing as bonds. Scratch
 * work snapped into bonds would be wrong ink, and a mode flag would make one
 * file do two jobs. So this is a sibling that shares only the pointer rules.
 *
 * DEFAULT EXPORT ON PURPOSE, so DrawBeatView can React.lazy it (the same
 * reason DrawEditor.tsx gives): it is not needed on first paint.
 *
 * REACT NOTES:
 *   - undo keeps a stack of whole snapshots rather than a stack of inverse
 *     operations. The state is one array of strokes; whole copies are cheap,
 *     and an inverse-operation undo is where undo bugs live
 *   - Clear is a snapshot like any other edit, so Undo after Clear brings the
 *     drawing back
 *   - the stroke being drawn lives in a ref (written on every pointer move)
 *     and is mirrored into state only to repaint the wet ink
 */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { polylineToPathData, type Pt } from "./geometry";
import { appendPoint, createPointerGate, widthFor, type InkPoint, type InkStroke } from "./ink";
import { PressButton } from "./PressButton";

/** Line width in CSS px for a finger, a mouse, or a Pencil at middling pressure. */
const BASE_WIDTH = 3;
/** Points closer than this to the last kept one are dropped (ink.ts appendPoint). */
const MIN_GAP = 1.5;
/** How many undo steps are kept. */
const UNDO_DEPTH = 30;

export default function ScratchpadCanvas() {
  const [strokes, setStrokes] = useState<readonly InkStroke[]>([]);
  // The drawing before each edit, newest last. Undo pops it back.
  const [past, setPast] = useState<readonly (readonly InkStroke[])[]>([]);
  const [wet, setWet] = useState<readonly InkPoint[]>([]);

  // useState with an initialiser function: the gate is made once per canvas
  // and kept, so its "a Pencil was seen" latch lasts as long as the paper.
  const [gate] = useState(createPointerGate);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawingRef = useRef<{ pointerId: number; points: readonly InkPoint[] } | null>(null);
  const strokeCounter = useRef(0);

  const commit = (next: readonly InkStroke[]) => {
    setPast((previous) => [...previous.slice(-UNDO_DEPTH), strokes]);
    setStrokes(next);
  };

  const toPaper = (event: PointerEvent): Pt | null => {
    const svg = svgRef.current;
    if (svg === null) return null;
    const box = svg.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  const inkAt = (event: PointerEvent): InkPoint | null => {
    const point = toPaper(event);
    if (point === null) return null;
    return { ...point, w: widthFor(event.pointerType, event.pressure, BASE_WIDTH) };
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!gate.accept(event.pointerId, event.pointerType)) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is a nicety; the stroke is not.
    }
    const point = inkAt(event.nativeEvent);
    const points = point === null ? [] : [point];
    drawingRef.current = { pointerId: event.pointerId, points };
    setWet(points);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drawing = drawingRef.current;
    if (drawing === null || drawing.pointerId !== event.pointerId) return;
    // A Pencil reports up to 240 points a second but the browser fires one
    // move per frame; the coalesced list holds the ones in between.
    // Some browsers return an empty list rather than none, so fall back on both.
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const samples = coalesced.length > 0 ? coalesced : [event.nativeEvent];
    let points = drawing.points;
    for (const sample of samples) {
      const point = inkAt(sample);
      if (point !== null) points = appendPoint(points, point, MIN_GAP);
    }
    if (points === drawing.points) return;
    drawingRef.current = { pointerId: drawing.pointerId, points };
    setWet(points);
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    // A refused pointer (a palm) lifting must not end the Pencil's stroke.
    if (!gate.release(event.pointerId)) return;
    const drawing = drawingRef.current;
    drawingRef.current = null;
    setWet([]);
    if (drawing === null || drawing.points.length === 0) return;
    strokeCounter.current += 1;
    commit([...strokes, { id: `s${strokeCounter.current}`, points: drawing.points }]);
  };

  const undo = () => {
    const previous = past[past.length - 1];
    if (previous === undefined) return;
    setPast((stack) => stack.slice(0, -1));
    setStrokes(previous);
  };

  const clear = () => commit([]);

  return (
    <div className="draw-beat__scratch-inner">
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Scratch paper. ${strokes.length} strokes.`}
        className="draw-beat__scratch-paper"
        style={{
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {strokes.map((stroke) => (
          <InkMark key={stroke.id} points={stroke.points} colour="var(--bb-foreground)" />
        ))}
        {wet.length > 0 && <InkMark points={wet} colour="var(--bb-primary)" />}
      </svg>
      <div className="draw-beat__scratch-foot">
        <p className="draw-beat__scratch-note">Scratch paper. Not graded.</p>
        <PressButton tone="ghost" disabled={past.length === 0} onPress={undo}>
          Undo
        </PressButton>
        <PressButton tone="ghost" disabled={strokes.length === 0} onPress={clear}>
          Clear
        </PressButton>
      </div>
    </div>
  );
}

/**
 * One stroke. All one width (finger, mouse) is a single path; a Pencil's
 * varying width is one round-capped line per segment, which reads as a smooth
 * stroke at these sizes without a stroke-outlining library. A tap is a dot.
 */
function InkMark({ points, colour }: { readonly points: readonly InkPoint[]; readonly colour: string }) {
  const first = points[0];
  if (first === undefined) return null;
  if (points.length === 1) return <circle cx={first.x} cy={first.y} r={first.w / 2} fill={colour} />;
  if (points.every((point) => point.w === first.w)) {
    return (
      <path
        d={polylineToPathData(points)}
        fill="none"
        stroke={colour}
        strokeWidth={first.w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  return (
    <g stroke={colour} strokeLinecap="round">
      {points.slice(1).map((point, index) => {
        const from = points[index]!;
        return (
          <line
            key={index}
            x1={from.x}
            y1={from.y}
            x2={point.x}
            y2={point.y}
            strokeWidth={(from.w + point.w) / 2}
          />
        );
      })}
    </g>
  );
}
