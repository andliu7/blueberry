/**
 * A ball-and-stick model the student turns by hand (ADDED 3 Nov, Unit 1
 * review suggestion 9): "endo points under the C=C bridge" is a spatial idea,
 * and a drawing that turns teaches it better than the words. Drag to turn, or
 * use the arrow keys; Reset puts it back to the textbook view. Plain SVG, no
 * 3-D library, nothing moves until the student moves it.
 */
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { place, radius, type Model3D } from "./model3d";

const SIZE = 150;
const START_YAW = -0.35;
const START_PITCH = 0.25;
const STEP = 0.2;

const FILL: Readonly<Record<string, string>> = { O: "#d9483b", H: "var(--bb-card)" };

export function Model3DView({ model, name }: { readonly model: Model3D; readonly name: string }) {
  const [turn, setTurn] = useState({ yaw: START_YAW, pitch: START_PITCH });
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const r = useMemo(() => radius(model), [model]);
  const scale = (SIZE / 2 - 12) / r;
  const placed = place(model, turn.yaw, turn.pitch);

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ...turn };
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (d === null) return;
    const pitch = Math.max(-1.5, Math.min(1.5, d.pitch + (e.clientY - d.y) * 0.012));
    setTurn({ yaw: d.yaw + (e.clientX - d.x) * 0.012, pitch });
  };
  const onUp = () => {
    drag.current = null;
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const move: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
    const m = move[e.key];
    if (m === undefined) return;
    e.preventDefault();
    setTurn((t) => ({ yaw: t.yaw + m[0], pitch: Math.max(-1.5, Math.min(1.5, t.pitch + m[1])) }));
  };

  // Painter's order: bonds and atoms furthest away first.
  const items = [
    ...model.bonds.map((b, i) => ({ kind: "bond" as const, i, depth: (placed[b.a]!.depth + placed[b.b]!.depth) / 2 - 0.01 })),
    ...placed.map((p, i) => ({ kind: "atom" as const, i, depth: p.depth })),
  ].sort((a, b) => a.depth - b.depth);
  const fade = (depth: number) => 0.45 + 0.55 * ((depth / r + 1) / 2);
  const xy = (i: number) => ({ x: SIZE / 2 + placed[i]!.sx * scale, y: SIZE / 2 + placed[i]!.sy * scale });

  return (
    <figure className="flex flex-col items-center gap-1">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={`${name}, a 3-D model. Drag or use the arrow keys to turn it.`}
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
        className="cursor-grab touch-none rounded-xl text-bb-foreground focus-visible:outline-2 focus-visible:outline-bb-ring"
      >
        {items.map((item) => {
          if (item.kind === "bond") {
            const bond = model.bonds[item.i]!;
            const p = xy(bond.a);
            const q = xy(bond.b);
            const light = model.atoms[bond.a]!.el === "H" || model.atoms[bond.b]!.el === "H";
            const op = fade(item.depth);
            if (bond.order === 2) {
              const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
              const ox = (-(q.y - p.y) / len) * 2.2;
              const oy = ((q.x - p.x) / len) * 2.2;
              return (
                <g key={`b${item.i}`} stroke="currentColor" strokeWidth={1.8} opacity={op} strokeLinecap="round">
                  <line x1={p.x + ox} y1={p.y + oy} x2={q.x + ox} y2={q.y + oy} />
                  <line x1={p.x - ox} y1={p.y - oy} x2={q.x - ox} y2={q.y - oy} />
                </g>
              );
            }
            return <line key={`b${item.i}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="currentColor" strokeWidth={light ? 1.2 : 2.4} opacity={op} strokeLinecap="round" />;
          }
          const atom = placed[item.i]!;
          const c = xy(item.i);
          const rr = atom.el === "H" ? 3.2 : atom.el === "C" ? 4 : 5.5;
          return (
            <circle
              key={`a${item.i}`}
              cx={c.x}
              cy={c.y}
              r={rr}
              fill={FILL[atom.el] ?? "currentColor"}
              stroke="currentColor"
              strokeWidth={atom.el === "H" ? 1 : 0}
              opacity={fade(item.depth)}
            />
          );
        })}
      </svg>
      <figcaption className="flex items-center gap-2 text-scale-xs text-bb-muted-foreground">
        <span>{name}</span>
        <button type="button" onClick={() => setTurn({ yaw: START_YAW, pitch: START_PITCH })} className="rounded-lg border border-bb-border px-2 py-0.5 font-semibold">
          Reset
        </button>
      </figcaption>
    </figure>
  );
}

/** One or two models side by side, each turned on its own. */
export default function Model3DPair({ models }: { readonly models: readonly { readonly model: Model3D; readonly name: string }[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {models.map((m) => (
        <Model3DView key={m.name} model={m.model} name={m.name} />
      ))}
    </div>
  );
}
