/**
 * One guide structure, drawn from a GuideFigure (scripts/guide_u1.py).
 *
 * Why not StructureFigure, the answer tiles' renderer: that one draws into a
 * fixed 120 by 84 box, so a ring with two esters was shrunk to about 90px and
 * its labels piled up. Here the viewBox is the figure's own size and the CSS
 * width is that size times a scale (.ug-mol, guide.css), so every bond on the
 * page has one of two lengths and nothing is shrunk to fit.
 *
 * Ink is currentColor; the parts the example is about (`hi`) take the accent
 * through the ug-hi-ink class. A charged or radical carbon and its sign sit
 * in one tinted capsule (round 4: a separate disc with the sign on its rim
 * read as a grey smudge with a badge in the dark theme).
 */
import { formulaRuns, stereoShape } from "../onboarding/figures";
import type { GuideBond, GuideFigure, GuideLabel } from "./types";

const STROKE = 2.2;
/** Half the spacing of a chain double bond's two lines. */
const DOUBLE_HALF = 2.4;
/** How far a ring double bond's inner line sits from the ring bond. */
const RING_GAP = 4.6;
/** Matches HALO in scripts/guide_u1.py: the capsule's half width. */
const HALO = 9;
/** Matches SIGN_R in scripts/guide_u1.py, which keeps this circle clear of every bond. */
const SIGN_R = 6.5;

function Bond({ bond }: { readonly bond: GuideBond }) {
  const { x1, y1, x2, y2 } = bond;
  const cls = bond.hi === true ? "ug-hi-ink" : undefined;
  if (bond.stereo !== undefined) {
    const shape = stereoShape({ x1, y1, x2, y2, stereo: bond.stereo });
    if (shape.kind === "wedge") {
      return (
        <polygon
          className={cls}
          points={shape.points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      );
    }
    return (
      <g className={cls} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
        {shape.rungs.map(([ax, ay, bx, by], index) => (
          <line key={index} x1={ax} y1={ay} x2={bx} y2={by} />
        ))}
      </g>
    );
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  // The left normal, which the second (and third) line is offset along.
  const nx = -dy / length;
  const ny = dx / length;
  const lines: [number, number, number, number][] = [];
  if (bond.order === 2 && bond.inner !== undefined) {
    // A ring double bond: one line on the ring, a shorter one inside it.
    const o = RING_GAP * bond.inner;
    const trim = 0.16;
    lines.push([x1, y1, x2, y2]);
    lines.push([x1 + dx * trim + nx * o, y1 + dy * trim + ny * o, x2 - dx * trim + nx * o, y2 - dy * trim + ny * o]);
  } else {
    const offsets = bond.order === 2 ? [DOUBLE_HALF, -DOUBLE_HALF] : bond.order === 3 ? [RING_GAP, 0, -RING_GAP] : [0];
    for (const o of offsets) lines.push([x1 + nx * o, y1 + ny * o, x2 + nx * o, y2 + ny * o]);
  }
  return (
    <g className={cls} stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round">
      {lines.map(([ax, ay, bx, by], index) => (
        <line key={index} x1={ax} y1={ay} x2={bx} y2={by} />
      ))}
    </g>
  );
}

function Label({ label }: { readonly label: GuideLabel }) {
  const size = label.size ?? 14;
  let shift = 0;
  return (
    <text
      className={label.hi === true ? "ug-hi-ink" : undefined}
      x={label.x}
      y={label.y}
      textAnchor={label.anchor ?? "middle"}
      fontSize={size}
      fontWeight={800}
      fill="currentColor"
    >
      {formulaRuns(label.t).map((run, index) => {
        const target = run.level === 1 ? size * 0.22 : run.level === 2 ? -size * 0.4 : 0;
        const dy = target - shift;
        shift = target;
        return (
          <tspan key={index} dy={dy} fontSize={run.level === 0 ? size : size * 0.68}>
            {run.text}
          </tspan>
        );
      })}
    </text>
  );
}

/**
 * A charge as a circled sign, or a radical as a dot, drawn with lines rather
 * than a font glyph: a bare minus beside a skeleton read as one more bond, and
 * a glyph's baseline put the + below its carbon.
 */
function Sign({ x, y, t }: { readonly x: number; readonly y: number; readonly t: string }) {
  if (t === "•") return <circle className="ug-radical" cx={x} cy={y} r={4.2} />;
  // A solid badge: the accent disc with the sign cut out in white.
  const arm = 3.3;
  return (
    <g>
      <circle className="ug-badge" cx={x} cy={y} r={SIGN_R} />
      <g className="ug-badge__sign" strokeWidth={1.9} strokeLinecap="round">
        <line x1={x - arm} y1={y} x2={x + arm} y2={y} />
        {t === "+" ? <line x1={x} y1={y - arm} x2={x} y2={y + arm} /> : null}
      </g>
    </g>
  );
}

export function GuideMol({ figure }: { readonly figure: GuideFigure }) {
  return (
    <svg className="ug-mol__svg" viewBox={`0 0 ${figure.w} ${figure.h}`} fill="none" aria-hidden focusable="false">
      {/* The script writes halos and signs in step, one pair per charged carbon,
          so halo i runs from the carbon to sign i. Drawn first, under the bonds. */}
      {(figure.halos ?? []).map((halo, index) => {
        const sign = figure.signs?.[index] ?? halo;
        return (
          <line key={`h${index}`} className="ug-halo" x1={halo.x} y1={halo.y} x2={sign.x} y2={sign.y} strokeWidth={HALO * 2} strokeLinecap="round" />
        );
      })}
      {figure.bonds.map((bond, index) => (
        <Bond key={`b${index}`} bond={bond} />
      ))}
      {(figure.labels ?? []).map((label, index) => (
        <Label key={`l${index}`} label={label} />
      ))}
      {(figure.signs ?? []).map((sign, index) => (
        <Sign key={`s${index}`} x={sign.x} y={sign.y} t={sign.t} />
      ))}
    </svg>
  );
}
