/**
 * The energy diagram, drawn. One or more profiles share an axis; each state is a flat well and
 * each step a smooth hump to its transition state. Pure SVG, no dependency, themed from the
 * game tokens (violet primary, calm amber for the second path). Used by the MCQ view (a static
 * picture beside the question) and by EnergyLab (the interactive one).
 */
import type { EnergyProfile } from "./energyModel";

const W = 360;
const H = 200;
const PAD_X = 34;
const PAD_Y = 22;
const WELL = 46;

export interface EnergyFigureProps {
  readonly profiles: readonly EnergyProfile[];
  /** A state id to mark with the ball. */
  readonly at?: string | undefined;
  /** Show the numbers (kcal/mol) beside each well. */
  readonly numbers?: boolean;
  /** Show the energy at the top of each hump, so a barrier is read as a difference of two numbers. */
  readonly tsNumbers?: boolean;
  /** Shared vertical range; set it so two figures can be compared on one scale. */
  readonly range?: readonly [number, number];
  readonly label: string;
}

const COLOURS = ["var(--bb-primary)", "var(--warn)"];

export function EnergyFigure({ profiles, at, numbers = true, tsNumbers = false, range, label }: EnergyFigureProps) {
  const all = profiles.flatMap((p) => [...p.states.map((s) => s.energy), ...p.ts]);
  const lo = range?.[0] ?? Math.min(...all) - 2;
  const hi = range?.[1] ?? Math.max(...all) + 2;
  const y = (e: number) => H - PAD_Y - ((e - lo) / (hi - lo || 1)) * (H - 2 * PAD_Y);
  const steps = Math.max(...profiles.map((p) => p.states.length)) - 1;
  const slot = (W - 2 * PAD_X - WELL) / Math.max(steps, 1);
  const x0 = (i: number) => PAD_X + i * slot;

  const ball = (() => {
    if (at === undefined) return null;
    for (const p of profiles) {
      const i = p.states.findIndex((s) => s.id === at);
      if (i >= 0) return { x: x0(i) + WELL / 2, y: y(p.states[i]!.energy) - 7 };
    }
    return null;
  })();

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full max-w-md" style={{ color: "var(--bb-foreground)" }}>
      <line x1={PAD_X - 14} y1={PAD_Y - 8} x2={PAD_X - 14} y2={H - PAD_Y + 6} stroke="var(--bb-border-strong)" strokeWidth={1.5} />
      <text x={8} y={H / 2} fontSize={10} fill="var(--bb-muted-foreground)" transform={`rotate(-90 8 ${H / 2})`} textAnchor="middle">
        Energy
      </text>
      <text x={W / 2} y={H - 3} fontSize={10} fill="var(--bb-muted-foreground)" textAnchor="middle">
        Reaction progress
      </text>
      {profiles.map((p, pi) => {
        const colour = COLOURS[pi % COLOURS.length]!;
        const d = p.states
          .map((s, i) => {
            const a = x0(i);
            const flat = `${i === 0 ? "M" : "L"} ${a} ${y(s.energy)} L ${a + WELL} ${y(s.energy)}`;
            if (i === p.states.length - 1) return flat;
            const next = p.states[i + 1]!;
            const x1 = a + WELL;
            const x2 = x0(i + 1);
            const xm = (x1 + x2) / 2;
            const top = y(p.ts[i]!);
            const w = x2 - x1;
            return `${flat} C ${x1 + 0.4 * w} ${y(s.energy)}, ${xm - 0.2 * w} ${top}, ${xm} ${top} C ${xm + 0.2 * w} ${top}, ${x2 - 0.4 * w} ${y(next.energy)}, ${x2} ${y(next.energy)}`;
          })
          .join(" ");
        return (
          <g key={pi}>
            <path d={d} fill="none" stroke={colour} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            {tsNumbers
              ? p.ts.map((top, i) => (
                  <text key={`ts${i}`} x={(x0(i) + WELL + x0(i + 1)) / 2} y={y(top) - 5} fontSize={10} textAnchor="middle" fill="var(--bb-muted-foreground)">
                    {top}
                  </text>
                ))
              : null}
            {p.states.map((s, i) => (
              <g key={`${s.id}-${i}`}>
                {numbers ? (
                  <text x={x0(i) + WELL / 2} y={y(s.energy) + 14} fontSize={10} textAnchor="middle" fill="var(--bb-muted-foreground)">
                    {s.energy}
                  </text>
                ) : null}
                <text x={x0(i) + WELL / 2} y={y(s.energy) - 11 - (ball !== null && ball.x === x0(i) + WELL / 2 ? 8 : 0)} fontSize={10.5} fontWeight={600} textAnchor="middle" fill="currentColor">
                  {s.label}
                </text>
              </g>
            ))}
          </g>
        );
      })}
      {ball === null ? null : <circle cx={ball.x} cy={ball.y} r={6} fill="var(--bb-primary)" stroke="var(--bb-card)" strokeWidth={2} />}
    </svg>
  );
}
