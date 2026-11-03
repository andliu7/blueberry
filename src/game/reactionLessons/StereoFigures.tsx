/**
 * The walk's moving pictures: geometry and bond length the student can change,
 * instead of a paragraph describing them. Each figure has one control and one
 * sentence that updates with it. Nothing blocks Continue.
 *
 *   PyramidFigure  slide the reaction forward; the groups on the carbon flip like
 *                  an umbrella (inversion) or pyramidalise (addition)
 *   AntiFigure     turn the front bond of a Newman projection until H and the
 *                  leaving group are opposite (E2 needs that)
 *   BondsFigure    tap the bond you think gives; lengths are ranked, partial
 *                  charges drawn bigger where they are larger
 */
import { useState } from "react";

import type { BondEnd, BondRow, Visual } from "./model";
import { BOND_PX, conformerName, isAnti, lgDistance, nuDistance, pyramidSubs, smooth } from "./stereoGeometry";

type PyramidVisual = Extract<Visual, { kind: "pyramid" }>;
type AntiVisual = Extract<Visual, { kind: "anti" }>;
type BondsVisual = Extract<Visual, { kind: "bonds" }>;

const INK = "var(--bond-stroke, currentColor)";
const ACCENT = "var(--bb-primary, #5a3fd8)";

/* ------------------------------------------------------------------ */

function Wedge({ x1, y1, x2, y2, dash }: { x1: number; y1: number; x2: number; y2: number; dash: boolean }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  if (!dash) {
    const w = 6;
    return <polygon points={`${x1},${y1} ${x2 + nx * w},${y2 + ny * w} ${x2 - nx * w},${y2 - ny * w}`} fill={INK} />;
  }
  const bars = [];
  for (let i = 1; i <= 6; i += 1) {
    const f = i / 6;
    const w = 1 + 6 * f;
    const cx = x1 + dx * f;
    const cy = y1 + dy * f;
    bars.push(<line key={i} x1={cx + nx * w} y1={cy + ny * w} x2={cx - nx * w} y2={cy - ny * w} stroke={INK} strokeWidth={2} strokeLinecap="round" />);
  }
  return <g>{bars}</g>;
}

export function PyramidFigure({ visual }: { visual: PyramidVisual }) {
  const [pct, setPct] = useState(0);
  const t = pct / 100;
  const S = 62;
  const cx = 160;
  const cy = 92;
  const subs = pyramidSubs(t, visual.from, visual.to);
  const nuX = cx + S * nuDistance(t);
  const lgX = cx - S * lgDistance(t);
  const formed = t >= 0.98;
  const hasLg = visual.lg !== undefined;
  const lgGone = t >= 0.98;
  const stage = t < 0.15 ? "Before" : t > 0.85 ? "After" : "Mid-step";
  const flat = Math.abs(visual.from + (visual.to - visual.from) * smooth(t) - 90) < 4;
  const note = hasLg
    ? t < 0.15
      ? `The three groups lean away from ${visual.lg}.`
      : t > 0.85
        ? `The three groups now lean away from ${visual.nu}. Every group flipped sides: that is inversion.`
        : flat
          ? "Halfway: the groups lie flat. The carbon is briefly bonded to both ends."
          : "The groups are swinging through, like an umbrella in the wind."
    : t < 0.15
      ? "Flat to start: three groups in one plane."
      : t > 0.85
        ? `Now four groups on a tetrahedron, tilted away from ${visual.nu}.`
        : "The carbon pyramidalises as the new bond closes.";
  return (
    <figure className="m-0 flex flex-col gap-2" aria-label="Shape of the carbon as the reaction runs">
      <svg viewBox="0 0 320 184" className="w-full rounded-2xl border-2 border-bb-border bg-bb-card text-bb-foreground" role="img" aria-label={note}>
        {subs.map((p, i) => {
          const x = cx + S * p.x;
          const y = cy - S * p.y;
          const label = visual.subs[i] ?? "";
          const lx = x + (x >= cx ? 10 : -10);
          return (
            <g key={label + i}>
              {p.depth === "plain" ? (
                <line x1={cx} y1={cy} x2={x} y2={y} stroke={INK} strokeWidth={3} strokeLinecap="round" />
              ) : (
                <Wedge x1={cx} y1={cy} x2={x} y2={y} dash={p.depth === "dash"} />
              )}
              <text x={lx} y={y + 5} textAnchor={x >= cx ? "start" : "end"} fontSize={15} fontWeight={700} fill="currentColor">
                {label}
              </text>
            </g>
          );
        })}
        {hasLg ? (
          <g opacity={lgGone ? 0.45 : 1}>
            <line x1={cx} y1={cy} x2={lgX} y2={cy} stroke={INK} strokeWidth={3} strokeLinecap="round" strokeDasharray={t < 0.02 ? undefined : "6 5"} />
            <text x={lgX - 8} y={cy + 5} textAnchor="end" fontSize={15} fontWeight={700} fill="currentColor">
              {visual.lg}
            </text>
          </g>
        ) : null}
        <line x1={cx} y1={cy} x2={nuX} y2={cy} stroke={ACCENT} strokeWidth={3} strokeLinecap="round" strokeDasharray={formed ? undefined : "6 5"} opacity={t < 0.02 ? 0.55 : 1} />
        <text x={nuX + 8} y={cy + 5} fontSize={15} fontWeight={800} fill={ACCENT}>
          {visual.nu}
        </text>
        <circle cx={cx} cy={cy} r={5} fill={INK} />
        <text x={cx} y={cy + 24} textAnchor="middle" fontSize={11} fontWeight={700} fill="currentColor" opacity={0.7}>
          C
        </text>
      </svg>
      <label className="flex flex-col gap-1 text-scale-sm font-semibold text-bb-muted-foreground">
        <span>
          Slide the reaction: <span className="text-bb-foreground">{stage}</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          aria-valuetext={`${stage}. ${note}`}
          className="h-11 w-full accent-[#5a3fd8]"
        />
      </label>
      <figcaption className="m-0 text-scale-sm text-bb-muted-foreground" aria-live="polite">
        <span className="font-semibold text-bb-foreground">{note}</span> {visual.caption}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

export function AntiFigure({ visual }: { visual: AntiVisual }) {
  const [deg, setDeg] = useState(30);
  const cx = 160;
  const cy = 92;
  const R = 42;
  const L = 78;
  const front = [
    { a: deg, label: visual.hydrogen, hot: true },
    { a: deg + 120, label: "H", hot: false },
    { a: deg + 240, label: "CH₃", hot: false },
  ];
  const back = [
    { a: 90, label: visual.leaving, hot: true },
    { a: 210, label: "H", hot: false },
    { a: 330, label: "H", hot: false },
  ];
  const pt = (a: number, r: number) => ({ x: cx + r * Math.cos((a * Math.PI) / 180), y: cy - r * Math.sin((a * Math.PI) / 180) });
  const anti = isAnti(deg);
  const name = conformerName(deg);
  const note = anti
    ? `Anti: ${visual.hydrogen} and ${visual.leaving} are on opposite sides, in one plane. This is the shape E2 needs.`
    : name === "eclipsed"
      ? `${visual.hydrogen} sits right on top of ${visual.leaving}. Keep turning.`
      : name === "gauche"
        ? `${visual.hydrogen} is at an angle to ${visual.leaving}. Not opposite yet.`
        : `${visual.hydrogen} is not opposite ${visual.leaving} yet. Keep turning.`;
  return (
    <figure className="m-0 flex flex-col gap-2" aria-label="Newman projection, turn the front carbon">
      <svg viewBox="0 0 320 184" className="w-full rounded-2xl border-2 border-bb-border bg-bb-card text-bb-foreground" role="img" aria-label={note}>
        {back.map((b) => {
          const s = pt(b.a, R);
          const e = pt(b.a, L);
          const l = pt(b.a, L + 14);
          return (
            <g key={`b${b.a}`}>
              <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={b.hot ? ACCENT : INK} strokeWidth={3} strokeLinecap="round" />
              <text x={l.x} y={l.y + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill={b.hot ? ACCENT : "currentColor"}>
                {b.label}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={INK} strokeWidth={3} />
        {front.map((f) => {
          const e = pt(f.a, L - 8);
          const l = pt(f.a, L + 6);
          return (
            <g key={`f${f.label}${f.a - deg}`}>
              <line x1={cx} y1={cy} x2={e.x} y2={e.y} stroke={f.hot ? (anti ? ACCENT : "#d98324") : INK} strokeWidth={4} strokeLinecap="round" />
              <text x={l.x} y={l.y + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill={f.hot ? (anti ? ACCENT : "#d98324") : "currentColor"}>
                {f.label}
              </text>
            </g>
          );
        })}
      </svg>
      <label className="flex flex-col gap-1 text-scale-sm font-semibold text-bb-muted-foreground">
        <span>Turn the front carbon until {visual.hydrogen} is opposite {visual.leaving}</span>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={deg}
          onChange={(e) => setDeg(Number(e.target.value))}
          aria-valuetext={note}
          className="h-11 w-full accent-[#5a3fd8]"
        />
      </label>
      <figcaption className="m-0 text-scale-sm text-bb-muted-foreground" aria-live="polite">
        <span className="font-semibold text-bb-foreground">{note}</span> {visual.caption}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

function Delta({ end, x, y }: { end: BondEnd; x: number; y: number }) {
  if (end.charge === undefined) return null;
  const big = end.size === "large";
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={big ? 20 : 12} fontWeight={800} fill={end.charge === "plus" ? ACCENT : "#c0392b"}>
      {end.charge === "plus" ? "δ+" : "δ−"}
    </text>
  );
}

function BondDrawing({ row }: { row: BondRow }) {
  const len = BOND_PX[row.length];
  const mid = 150;
  const x1 = mid - len / 2;
  const x2 = mid + len / 2;
  return (
    <svg viewBox="0 0 300 54" className="h-[54px] w-full" aria-hidden="true">
      <line x1={x1} y1={34} x2={x2} y2={34} stroke={INK} strokeWidth={row.length === "long" ? 2.5 : 4} strokeLinecap="round" strokeDasharray={row.length === "long" ? "7 4" : undefined} />
      <circle cx={x1} cy={34} r={11} fill="var(--bb-card, #fff)" stroke={INK} strokeWidth={2.5} />
      <circle cx={x2} cy={34} r={11} fill="var(--bb-card, #fff)" stroke={INK} strokeWidth={2.5} />
      <text x={x1} y={39} textAnchor="middle" fontSize={13} fontWeight={800} fill="currentColor">
        {row.a.sym}
      </text>
      <text x={x2} y={39} textAnchor="middle" fontSize={13} fontWeight={800} fill="currentColor">
        {row.b.sym}
      </text>
      <Delta end={row.a} x={x1} y={14} />
      <Delta end={row.b} x={x2} y={14} />
    </svg>
  );
}

export function BondsFigure({ visual }: { visual: BondsVisual }) {
  const [misses, setMisses] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState<"right" | "shown" | null>(null);
  const answer = visual.rows.findIndex((r) => r.gives === true);
  const choose = (i: number) => {
    if (done !== null) return;
    setPicked(i);
    if (i === answer) {
      setDone("right");
      return;
    }
    if (misses >= 1) setDone("shown");
    setMisses(misses + 1);
  };
  return (
    <figure className="m-0 flex flex-col gap-2" aria-label="Compare the bonds">
      <p className="m-0 text-scale-base font-semibold text-bb-primary">{visual.prompt}</p>
      <div className="flex flex-col gap-2">
        {visual.rows.map((row, i) => {
          const isAnswer = done !== null && i === answer;
          const isWrong = picked === i && i !== answer && done === null;
          return (
            <button
              key={row.label}
              type="button"
              onClick={() => choose(i)}
              aria-pressed={picked === i}
              className={`flex min-h-[44px] w-full flex-col rounded-xl border-2 bg-bb-card px-3 py-1 text-left text-bb-foreground ${
                isAnswer ? "border-bb-primary" : isWrong ? "border-[#c0392b]" : "border-bb-border"
              }`}
            >
              <span className="text-scale-sm font-semibold">{row.label}</span>
              <BondDrawing row={row} />
            </button>
          );
        })}
      </div>
      {picked !== null ? (
        <p className="m-0 rounded-xl border-2 border-bb-border bg-bb-card px-3 py-2 text-scale-base" aria-live="polite">
          {done !== null ? visual.right : visual.wrong}
        </p>
      ) : null}
    </figure>
  );
}

export function VisualFigure({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case "pyramid":
      return <PyramidFigure visual={visual} />;
    case "anti":
      return <AntiFigure visual={visual} />;
    case "bonds":
      return <BondsFigure visual={visual} />;
  }
}
