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

import type { Figure, FigureBond, FigureBox, FigureLabel } from "./figures";
import { bondEndsJoined, doubleBondSide, FIGURE_HEIGHT, FIGURE_WIDTH, formulaRuns, stereoShape } from "./figures";

/** Bond weight, in viewBox units. Reads at the 145px the tile draws it at. */
const STROKE = 2.6;
/** How far the two lines of a double bond sit from the bond's own axis. */
const DOUBLE_GAP = 3.1;
/**
 * A double bond drawn to one side: how far the second line sits from the
 * first, and how much shorter it is at each end (a share of the bond, but
 * never so little that it runs into the neighbouring bond at a corner).
 */
const SIDE_GAP = 5.4;
const SIDE_TRIM = 0.18;
const SIDE_TRIM_MIN = 4.6;
/** The trim at a free end, where nothing meets the bond: just clear of the cap. */
const SIDE_TRIM_FREE = 1.4;
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

/**
 * `side` is only read for a double bond: 1 or -1 puts the second line on that
 * side of the first (doubleBondSide in figures.ts picks it), 0 centres both.
 */
function Bond({
  bond,
  side = 0,
  joined = [true, true],
}: {
  readonly bond: FigureBond;
  readonly side?: 1 | -1 | 0;
  /** Whether each end meets another bond (bondEndsJoined in figures.ts). */
  readonly joined?: readonly [boolean, boolean];
}) {
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

  if (bond.stereo !== undefined) {
    const shape = stereoShape({ ...bond, stereo: bond.stereo });
    if (shape.kind === "wedge") {
      return (
        <polygon
          points={shape.points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      );
    }
    return (
      <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
        {shape.rungs.map(([ax, ay, bx, by], index) => (
          <line key={index} x1={ax} y1={ay} x2={bx} y2={by} />
        ))}
      </g>
    );
  }

  const order = bond.order ?? 1;
  const trim = Math.max(length * SIDE_TRIM, SIDE_TRIM_MIN);
  const trim1 = joined[0] ? trim : SIDE_TRIM_FREE;
  const trim2 = joined[1] ? trim : SIDE_TRIM_FREE;
  // A bond too short to keep a real second line keeps the centred drawing.
  if (order === 2 && side !== 0 && length - trim1 - trim2 > length * 0.4) {
    // The first line where a single bond would be, the second shorter one beside it.
    const o = SIDE_GAP * side;
    const ux = dx / length;
    const uy = dy / length;
    return (
      <g stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round">
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <line
          x1={x1 + ux * trim1 + nx * o}
          y1={y1 + uy * trim1 + ny * o}
          x2={x2 - ux * trim2 + nx * o}
          y2={y2 - uy * trim2 + ny * o}
        />
      </g>
    );
  }
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

/**
 * `box` draws only that part of the viewBox (figures.ts fitBox), so a small
 * molecule fills the space it is given; left out, the full 120 by 84 box.
 */
export function StructureFigure({
  figure,
  className,
  box,
}: {
  readonly figure: Figure;
  readonly className?: string;
  readonly box?: FigureBox;
}) {
  return (
    <svg
      className={className}
      viewBox={box === undefined ? `0 0 ${FIGURE_WIDTH} ${FIGURE_HEIGHT}` : `${box.x} ${box.y} ${box.w} ${box.h}`}
      fill="none"
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      {(figure.bonds ?? []).map((bond, index, bonds) => (
        <Bond
          key={`b${index}`}
          bond={bond}
          side={bond.order === 2 ? doubleBondSide(bonds, index) : 0}
          joined={bond.order === 2 ? bondEndsJoined(bonds, index) : undefined}
        />
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
