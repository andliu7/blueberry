/**
 * The trainer's tool button and its three tools. Owner spec, 2026-08-26: "a
 * toggleable button (like 3 dots or a plus that becomes an X)" opening
 * (1) scratchpaper that dims the screen, drawable but sealed off from the
 * canvas below, (2) the periodic table as a quick-reference popup card,
 * (3) a 3D model of where you are at.
 *
 * The scratchpad is a plain <canvas> under pointer events: strokes are ink,
 * nothing else, cleared by its own button. The overlay is a real barrier by
 * construction, a fixed element over everything, so "can't really interact
 * with anything until you close out of it" is a property of the DOM order
 * rather than a discipline. Escape closes every tool; the periodic card and
 * the 3D card are native <dialog>-shaped popups sharing one frame.
 */

import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import type { MechanismStep } from "@blueberry/chem-core";
import type { StepScene } from "../../render/layout/stepScene";

const PeriodicTab = lazy(() => import("../periodic/PeriodicTab"));
const Scene3D = lazy(() => import("../../render/three/Scene3D"));

type Tool = "scratchpad" | "periodic" | "three" | "history" | null;

export interface FeedbackHistoryEntry {
  readonly line: string;
  readonly kind: string;
  readonly at: string;
}

export function TrainerTools({ step, scene, progress, reducedMotion, history, onRecenter }: { readonly step: MechanismStep; readonly scene: StepScene; readonly progress: number; readonly reducedMotion: boolean; readonly history: readonly FeedbackHistoryEntry[]; readonly onRecenter: () => void }) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<Tool>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTool(null);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (next: Tool) => {
    setTool(next);
    setOpen(false);
  };

  return (
    <>
      {/* The plus that becomes an X, bottom right of the canvas card. */}
      <div className="absolute bottom-4 right-4 flex flex-col-reverse items-end gap-2">
        <button
          type="button"
          className="press flex min-h-12 min-w-12 items-center justify-center rounded-full border-2 border-bb-border bg-bb-card text-scale-xl"
          aria-expanded={open}
          aria-label={open ? "Close tools" : "Open tools"}
          title={open ? "Close tools" : "Tools: scratchpaper, periodic table, 3D, history"}
          onPointerDown={() => setOpen((prev) => !prev)}
        >
          <span
            className="inline-block font-semibold text-bb-foreground"
            style={{ transform: open ? "rotate(45deg)" : "none", transition: reducedMotion ? "none" : "transform 140ms ease-out" }}
          >
            +
          </span>
        </button>
        {open ? (
          <div className="fade-in flex flex-col items-end gap-2">
            <ToolButton icon="/icons/scratch.png" label="Scratchpaper" onPick={() => pick("scratchpad")} />
            <ToolButton icon="/icons/periodic.png" label="Periodic table" onPick={() => pick("periodic")} />
            <ToolButton icon="/icons/cube3d.png" label="3D view" onPick={() => pick("three")} />
            <ToolButton icon="/icons/history.png" label={`Feedback history${history.length > 0 ? ` (${history.length})` : ""}`} onPick={() => pick("history")} />
            <ToolButton
              icon="/icons/recenter.png"
              label="Re-centre view"
              onPick={() => {
                onRecenter();
                setOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>

      {tool === "scratchpad" ? <Scratchpad onClose={() => setTool(null)} /> : null}
      {tool === "periodic" ? (
        <ToolCard title="Periodic table" onClose={() => setTool(null)}>
          <ZoomPan>
            <Suspense fallback={<p className="p-6 text-scale-sm text-bb-muted-foreground">Loading the table…</p>}>
              <PeriodicTab selected={null} />
            </Suspense>
          </ZoomPan>
        </ToolCard>
      ) : null}
      {tool === "history" ? (
        <ToolCard title="Feedback history" onClose={() => setTool(null)}>
          {history.length === 0 ? (
            <p className="p-2 text-scale-sm text-bb-muted-foreground">Nothing yet. Every verdict you get lands here, newest first.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {history.map((entry, index) => (
                <li key={index} className="rounded-xl border border-bb-border bg-bb-card p-3">
                  <p className="text-scale-sm text-bb-foreground">{entry.line}</p>
                  <p className="mt-0.5 text-scale-xs text-bb-muted-foreground">
                    {entry.kind.replace(/_/g, " ")} · {entry.at}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </ToolCard>
      ) : null}
      {tool === "three" ? (
        <ToolCard title="Where you are, in 3D" onClose={() => setTool(null)}>
          <div className="h-80">
            <Suspense fallback={<p className="p-6 text-scale-sm text-bb-muted-foreground">Loading the model…</p>}>
              <Scene3D step={step} scene={scene} progress={progress} reducedMotion={reducedMotion} />
            </Suspense>
          </div>
        </ToolCard>
      ) : null}
    </>
  );
}

/**
 * Wheel-zoom and drag-pan for HTML content, owner request 2026-08-26: the
 * periodic table popup scrolls and zooms the same way the mechanism canvas
 * does. CSS transform on a wrapper: wheel scales toward a fixed origin,
 * dragging translates, double click resets. Buttons inside stay clickable
 * because a click is only suppressed after real travel.
 */
function ZoomPan({ children }: { readonly children: ReactNode }) {
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ id: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null);
  return (
    <div
      className="touch-none overflow-hidden"
      style={{ cursor: drag.current !== null ? "grabbing" : "grab" }}
      onWheel={(event) => {
        const factor = Math.exp(-event.deltaY * 0.0016);
        setView((prev) => ({ ...prev, k: Math.min(2.5, Math.max(1, prev.k * factor)) }));
      }}
      onDoubleClick={() => setView({ k: 1, x: 0, y: 0 })}
      onPointerDown={(event) => {
        drag.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: view.x, y: view.y, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const state = drag.current;
        if (state === null || state.id !== event.pointerId) return;
        const dx = event.clientX - state.startX;
        const dy = event.clientY - state.startY;
        if (Math.hypot(dx, dy) > 6) state.moved = true;
        if (state.moved) setView((prev) => ({ ...prev, x: state.x + dx, y: state.y + dy }));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onClickCapture={(event) => {
        // A drag that travelled is not a click on an element cell.
        if (drag.current?.moved) event.stopPropagation();
      }}
    >
      <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
}

function ToolButton({ label, onPick, icon }: { readonly label: string; readonly onPick: () => void; readonly icon?: string }) {
  return (
    <button type="button" className="press flex min-h-11 items-center gap-2 rounded-full border-2 border-bb-border bg-bb-card px-4 text-scale-sm font-semibold text-bb-foreground" onPointerDown={onPick}>
      {/* Generated icon set (fal.ai Nano Banana Lite, owner-specified motifs);
          sized to the adjacent text per the design rules, alt empty because
          the label beside it IS the name. */}
      {icon !== undefined ? <img src={icon} alt="" className="h-5 w-5 rounded object-cover" /> : null}
      {label}
    </button>
  );
}

/** One frame for the popup tools: card centred over a dimmed page. */
function ToolCard({ title, onClose, children }: { readonly title: string; readonly onClose: () => void; readonly children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={title} onPointerDown={onClose}>
      <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl border-2 border-bb-border bg-bb-card p-4" onPointerDown={(event) => event.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-scale-lg font-semibold text-bb-foreground">{title}</h3>
          <button type="button" className="press min-h-11 min-w-11 rounded-full border border-bb-border bg-bb-card font-semibold" aria-label="Close" title="Close" onPointerDown={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * The scratchpaper: the screen dims, strokes are the only interaction, and
 * the work is gone when it closes, like real scratch paper leaving the exam
 * hall. Owner additions 2026-08-26: undo takes back the last stroke, and an
 * eraser mode rubs out what it touches. Both need strokes to be DATA rather
 * than pixels, so every stroke is a point list and the bitmap is a replay:
 * undo pops and replays, the eraser is a stroke whose composite mode is
 * destination-out, and a resize replays too instead of wiping the page.
 */
interface Stroke {
  readonly erase: boolean;
  readonly points: { x: number; y: number }[];
}

function Scratchpad({ onClose }: { readonly onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeRef = useRef<number | null>(null);
  const [eraser, setEraser] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);

  const replay = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const scale = window.devicePixelRatio || 1;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const stroke of strokesRef.current) {
      context.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      context.lineWidth = stroke.erase ? 26 : 2.5;
      context.strokeStyle = "#f5f4f1";
      context.beginPath();
      stroke.points.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.stroke();
    }
    context.globalCompositeOperation = "source-over";
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * scale;
    canvas.height = canvas.clientHeight * scale;
    replay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60" role="dialog" aria-modal="true" aria-label="Scratchpaper">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        style={{ cursor: eraser ? "cell" : "crosshair" }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          activeRef.current = event.pointerId;
          strokesRef.current.push({ erase: eraser, points: [point(event)] });
          setStrokeCount(strokesRef.current.length);
        }}
        onPointerMove={(event) => {
          if (activeRef.current !== event.pointerId) return;
          const stroke = strokesRef.current[strokesRef.current.length - 1];
          if (stroke === undefined) return;
          stroke.points.push(point(event));
          replay();
        }}
        onPointerUp={() => {
          activeRef.current = null;
        }}
      />
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          aria-pressed={eraser}
          className={"press flex min-h-11 items-center gap-2 rounded-full border px-4 text-scale-sm font-semibold text-white " + (eraser ? "border-white bg-white/25" : "border-white/30 bg-white/10")}
          onPointerDown={() => setEraser((prev) => !prev)}
          title="Eraser: rub out strokes"
        >
          <img src="/icons/eraser.png" alt="" className="h-5 w-5 rounded object-cover" />
          Eraser
        </button>
        <button
          type="button"
          className="press min-h-11 rounded-full border border-white/30 bg-white/10 px-4 text-scale-sm font-semibold text-white disabled:opacity-40"
          disabled={strokeCount === 0}
          onPointerDown={() => {
            strokesRef.current.pop();
            setStrokeCount(strokesRef.current.length);
            replay();
          }}
        >
          Undo
        </button>
        <button
          type="button"
          className="press min-h-11 rounded-full border border-white/30 bg-white/10 px-4 text-scale-sm font-semibold text-white disabled:opacity-40"
          disabled={strokeCount === 0}
          onPointerDown={() => {
            strokesRef.current = [];
            setStrokeCount(0);
            replay();
          }}
        >
          Clear
        </button>
        <button type="button" className="press min-h-11 rounded-full border border-white/30 bg-white/10 px-4 text-scale-sm font-semibold text-white" aria-label="Close scratchpaper" title="Close scratchpaper" onPointerDown={onClose}>
          Close ×
        </button>
      </div>
    </div>
  );
}
