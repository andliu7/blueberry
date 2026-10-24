/**
 * A Unit 0 story scene, played as a tap-through card (content audit, 23 Oct,
 * top-25 #5). Each step is Bloom's line over the step's drawing: the atoms it
 * points at ringed in colour, its curved arrows drawn on top, or chapter 7's
 * decision chart in place of a molecule. One tap per step, Back to look again.
 *
 * This is the stand-in for the animated scene player story.ts describes. It
 * reads only the data that file and the generated figures.ts already carry,
 * so no chemistry is typed here: every atom position and arrow end is RDKit's.
 * The tryIt hints are not interactive yet. A tap, drag, match or draw hint
 * says the try comes next, because chapter 1's lesson plays exactly those
 * four; an arrow hint shows its arrows drawn and says so, since no Unit 0
 * lesson plays an arrow card yet (content audit 23 Oct, section 6).
 */
import { useState } from "react";

import { Berry } from "../mascot/Berry";
import { Press } from "../app/ui/Press";
import { StructureFigure } from "../onboarding/StructureFigure";
import { FIGURE_HEIGHT, FIGURE_WIDTH } from "../onboarding/figures";
import { U0_STORY_FIGURES, type StoryFigure } from "../content/u0/figures";
// The chart lives in the generated pools.ts, which this lazy card loads anyway, so it stays out of first open.
import { U0_SN_CHART } from "../content/u0/pools";
import type { StoryArrow, StoryChapter, StoryStep } from "../content/u0/story";

type Point = readonly [number, number];

/** Where an arrow end sits: on an atom, or at the middle of a bond. */
function endPoint(fig: StoryFigure, atom: number | undefined, bond: readonly [number, number] | undefined): Point | null {
  const xy = (i: number) => fig.atomXY[String(i)] ?? null;
  if (atom !== undefined) return xy(atom);
  if (bond === undefined) return null;
  const a = xy(bond[0]);
  const b = xy(bond[1]);
  return a === null || b === null ? null : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/**
 * A curved arrow as an SVG path: a quadratic bend to one side of the straight
 * line, so it reads as electron movement and not as a bond. Exported for tests.
 */
export function arrowPath(from: Point, to: Point): string {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // A bend of a third of the length, at least 8 units, off the line's left normal.
  const bend = Math.max(8, len / 3);
  const cx = (x1 + x2) / 2 - (dy / len) * bend;
  const cy = (y1 + y2) / 2 + (dx / len) * bend;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function SceneFigure({ step }: { readonly step: StoryStep }) {
  if (step.figure === undefined) return null;
  // Widened to the interface: the generated `as const` table's literal key sets reject a String(i) index.
  const fig: StoryFigure = U0_STORY_FIGURES[step.figure];
  const arrows = (step.arrows ?? []).flatMap((arrow: StoryArrow) => {
    const from = endPoint(fig, arrow.fromAtom, arrow.fromBond);
    const to = endPoint(fig, arrow.toAtom, arrow.toBond);
    return from === null || to === null ? [] : [arrowPath(from, to)];
  });
  return (
    <figure className="flex flex-col items-center gap-1">
      {/* The structure and an overlay with the same viewBox, so a ring or an arrow lands on its atom. */}
      <div className="relative w-full max-w-sm text-bb-foreground" style={{ aspectRatio: `${FIGURE_WIDTH} / ${FIGURE_HEIGHT}` }}>
        <StructureFigure figure={fig.figure} className="absolute inset-0 h-full w-full" />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${FIGURE_WIDTH} ${FIGURE_HEIGHT}`}
          fill="none"
          aria-hidden
          focusable="false"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker id="story-arrow-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--bb-primary)" />
            </marker>
          </defs>
          {(step.highlights ?? []).map((i) => {
            const at = fig.atomXY[String(i)];
            return at === undefined ? null : (
              <circle key={`h${i}`} cx={at[0]} cy={at[1]} r={8} fill="var(--bb-primary)" fillOpacity={0.18} stroke="var(--bb-primary)" strokeWidth={1.4} />
            );
          })}
          {arrows.map((d, i) => (
            <path key={`a${i}`} d={d} stroke="var(--bb-primary)" strokeWidth={1.6} markerEnd="url(#story-arrow-head)" />
          ))}
        </svg>
      </div>
      <figcaption className="text-scale-sm text-bb-muted-foreground">{fig.name}</figcaption>
    </figure>
  );
}

/** Chapter 7's decision chart: substrate class down the side, reagent across the top. */
function SnChart() {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[30rem] border-collapse text-left text-scale-xs text-bb-foreground">
        <thead>
          <tr>
            <th className="border border-bb-border p-1.5">Carbon</th>
            {U0_SN_CHART.reagents.map((reagent) => (
              <th key={reagent} className="border border-bb-border p-1.5 font-semibold">
                {reagent}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {U0_SN_CHART.rows.map((row) => (
            <tr key={row.substrate}>
              <th className="border border-bb-border p-1.5">{row.substrate}</th>
              {row.cells.map((cell, i) => (
                <td key={i} className="border border-bb-border p-1.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StoryScene({
  chapter,
  reducedMotion,
  onDone,
}: {
  readonly chapter: StoryChapter;
  readonly reducedMotion: boolean;
  readonly onDone: () => void;
}) {
  const [at, setAt] = useState(0);
  const steps = chapter.scene.steps;
  const step = steps[at]!;
  const last = at === steps.length - 1;
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 py-2" aria-label={chapter.page}>
      <p className="text-scale-sm font-semibold text-bb-muted-foreground">
        {chapter.page} · {at + 1} of {steps.length}
      </p>
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-bb-border bg-bb-card p-4">
        {step.chart === "sn" ? <SnChart /> : <SceneFigure step={step} />}
        <div className="flex w-full items-start gap-3">
          <Berry mood={step.mood} sizePx={56} reducedMotion={reducedMotion} />
          {/* aria-live so a screen reader hears each new line as the step changes. */}
          <p className="text-scale-base text-bb-foreground" aria-live="polite">
            {step.narration}
          </p>
        </div>
      </div>
      {/* The card cannot be tapped or dragged yet, so a step that invites a try says where the try happens. */}
      {step.tryIt !== undefined && step.tryIt !== "arrow" ? <p className="text-scale-sm text-bb-muted-foreground">Your turn comes in the lesson next.</p> : null}
      {/* Chapter 1's arrow step says "Drag", but no Unit 0 lesson plays an arrow card yet, so say the arrows are drawn here. */}
      {step.tryIt === "arrow" ? <p className="text-scale-sm text-bb-muted-foreground">The arrows are drawn for you here.</p> : null}
      {last ? <p className="text-scale-sm text-bb-muted-foreground">{chapter.bloomOutro}</p> : null}
      <div className="mt-auto flex gap-3">
        {at > 0 ? (
          <Press variant="secondary" onClick={() => setAt(at - 1)}>
            Back
          </Press>
        ) : null}
        <Press block onClick={() => (last ? onDone() : setAt(at + 1))}>
          {last ? "Continue" : "Next"}
        </Press>
      </div>
    </section>
  );
}
