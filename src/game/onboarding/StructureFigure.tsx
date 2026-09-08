/**
 * The one renderer for the drawn chemistry on a placement answer tile.
 *
 * figures.ts holds the data and this holds the ink. Splitting them is not
 * ceremony: the registry is walked by a coverage test that runs in a node
 * environment with no DOM, so it must not import React, and the drawing rules
 * (how thick a bond is, how far apart the two lines of a double bond sit, how
 * a subscript is offset) belong in exactly one place rather than in sixty.
 *
 * EVERYTHING IS `currentColor`, so the structure inherits the tile's own ink
 * and goes dark-on-periwinkle in both themes without this file knowing a
 * single colour. The tile sets the colour; the figure spends it.
 *
 * `aria-hidden`, and this is deliberate rather than lazy. The option's words
 * are still rendered as the tile's caption and they are still the accessible
 * name of the button, so a screen reader hears "Tertiary" exactly as before.
 * A duplicate description of the drawing would read the answer twice.
 */

import type { Figure, FigureBond, FigureLabel } from "./figures";
import { FIGURE_HEIGHT, FIGURE_WIDTH, formulaRuns } from "./figures";

/** Bond weight, in viewBox units. Reads at the 145px the tile draws it at. */
const STROKE = 2.6;
/** How far the two lines of a double bond sit from the bond's own axis. */
const DOUBLE_GAP = 3.1;
const TRIPLE_GAP = 4.4;

function Label({ label }: { readonly label: FigureLabel }) {
  const size = label.size ?? 15;
  const runs = formulaRuns(label.t);
  let shift = 0;
  return (
    <text
      x={label.x}
      y={label.y}
      textAnchor={label.anchor ?? "middle"}
      fontSize={size}
      fontWeight={600}
      fill="currentColor"
      // Tabular figures keep a subscript 2 and a subscript 3 the same width, so
      // two formulae in one tile set line up instead of shimmering.
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {runs.map((run, index) => {
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

/* ------------------------------------------------------------------ */
/* Bonds and arrows                                                    */
/* ------------------------------------------------------------------ */

function Bond({ bond }: { readonly bond: FigureBond }) {
  const { x1, y1, x2, y2 } = bond;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  // The unit normal, which is what a second bond line is offset along.
  const nx = -dy / length;
  const ny = dx / length;

  if (bond.arrow === true) {
    const ux = dx / length;
    const uy = dy / length;
    const head = 7;
    return (
      <g stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" fill="none">
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <line x1={x2} y1={y2} x2={x2 - ux * head + nx * head * 0.6} y2={y2 - uy * head + ny * head * 0.6} />
        <line x1={x2} y1={y2} x2={x2 - ux * head - nx * head * 0.6} y2={y2 - uy * head - ny * head * 0.6} />
      </g>
    );
  }

  const order = bond.order ?? 1;
  const offsets =
    order === 2 ? [DOUBLE_GAP, -DOUBLE_GAP] : order === 3 ? [TRIPLE_GAP, 0, -TRIPLE_GAP] : [0];
  return (
    <g stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round">
      {offsets.map((offset, index) => (
        <line
          key={index}
          x1={x1 + nx * offset}
          y1={y1 + ny * offset}
          x2={x2 + nx * offset}
          y2={y2 + ny * offset}
        />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* The figure                                                          */
/* ------------------------------------------------------------------ */

export function StructureFigure({
  figure,
  className,
}: {
  readonly figure: Figure;
  readonly className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${FIGURE_WIDTH} ${FIGURE_HEIGHT}`}
      fill="none"
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      {(figure.bonds ?? []).map((bond, index) => (
        <Bond key={`b${index}`} bond={bond} />
      ))}
      {(figure.rings ?? []).map((ring, index) => (
        <circle
          key={`r${index}`}
          cx={ring.x}
          cy={ring.y}
          r={ring.r}
          stroke="currentColor"
          strokeWidth={1.8}
          strokeDasharray="4 3"
          fill="none"
        />
      ))}
      {(figure.labels ?? []).map((label, index) => (
        <Label key={`l${index}`} label={label} />
      ))}
    </svg>
  );
}
