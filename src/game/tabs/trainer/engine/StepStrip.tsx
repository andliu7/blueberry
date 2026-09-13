/**
 * The intermediate slideshow: every step of a multistep question as a strip
 * the student scrubs back and forth through, so "how did I get here" is on
 * screen instead of on scratch paper.
 *
 * DRAWN IN THE TRAIL'S LANGUAGE. The unit map connects its nodes with a
 * ribbon whose completed stretches are green and whose stretches ahead are
 * the plain violet family, and the join between them is where the student
 * is. This strip is that ribbon laid flat: one numbered node per step and
 * the product at the end. It sits in the header row in place of the
 * progress bar, which said the same thing, so the canvas card keeps its
 * size. Nodes carry no picture: at phone size a molecule thumbnail was a
 * blob, and the one on a node ahead of the student leaked the answer.
 *
 * WHAT IT LETS YOU DO. Tap, drag across, or arrow-key to any step already
 * taken and the canvas shows that step with the pushes that completed it,
 * read only. Tap the live node, or the chip under the canvas, to come back.
 * Nothing ahead of the live step is reachable: the strip is a memory, not a
 * spoiler. A decision point on a step marks its node with a small fork.
 *
 * Alchemie, the bar for this surface, shows no step history at all during a
 * multistep puzzle (the corpus was searched frame by frame on 2026-09-11),
 * so this strip is judged on its own clarity rather than blind against one.
 */

import { useRef } from "react";
import { clampView, highlightedNode, type StripNode } from "./forkModel";

const NODE_R = 15;
const GAP = 64;
const PAD = 24;
const HEIGHT = 44;

export interface StepStripProps {
  readonly nodes: readonly StripNode[];
  readonly stepIndex: number;
  /** Non-null while the student is looking back at an earlier step. */
  readonly viewIndex: number | null;
  /** The live step is won (Continue not yet pressed): its node and stretch turn green now, not later. */
  readonly won: boolean;
  readonly onView: (index: number | null) => void;
  readonly reducedMotion: boolean;
}

export function StepStrip({ nodes, stepIndex, viewIndex, won, onView, reducedMotion }: StepStripProps) {
  const dragging = useRef(false);
  if (nodes.length === 0) return null;
  const stepCount = nodes.length - 1;
  const wonLast = won && stepIndex === stepCount - 1;
  const width = PAD * 2 + GAP * (nodes.length - 1);
  const highlighted = highlightedNode(stepIndex, viewIndex, wonLast, stepCount);
  const xOf = (index: number) => PAD + GAP * index;
  const cy = HEIGHT / 2;

  const pick = (index: number) => {
    const target = clampView(index, stepIndex);
    onView(target === stepIndex ? null : target);
  };
  const nearest = (clientX: number, clientY: number, svg: SVGSVGElement) => {
    const ctm = typeof svg.getScreenCTM === "function" ? svg.getScreenCTM() : null;
    const x = ctm === null ? clientX : new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse()).x;
    return Math.round((x - PAD) / GAP);
  };

  return (
    <div
      className="flex items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-primary)] focus-visible:ring-offset-2"
      role="group"
      aria-label="Steps of this mechanism"
      data-step-strip
      tabIndex={0}
      onKeyDown={(event) => {
        const at = viewIndex ?? stepIndex;
        const next =
          event.key === "ArrowLeft" ? at - 1
          : event.key === "ArrowRight" ? at + 1
          : event.key === "Home" ? 0
          : event.key === "End" ? stepIndex
          : null;
        if (next === null) return;
        event.preventDefault();
        pick(next);
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="h-11 w-full max-w-xs select-none"
        style={{ touchAction: "none" }}
        aria-hidden
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          pick(nearest(event.clientX, event.clientY, event.currentTarget));
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          pick(nearest(event.clientX, event.clientY, event.currentTarget));
        }}
        onPointerUp={(event) => {
          dragging.current = false;
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        }}
      >
        {/* The ribbon: a wide edge under-stroke with the fill riding on it. Done stretches green, ahead violet. */}
        {nodes.slice(1).map((node, i) => {
          const done = i < stepIndex || (i === stepIndex && won);
          return (
            <g key={`seg-${node.index}`}>
              <line x1={xOf(i)} y1={cy} x2={xOf(i + 1)} y2={cy} stroke="var(--bb-border)" strokeWidth={10} strokeLinecap="round" />
              <line
                x1={xOf(i)}
                y1={cy}
                x2={xOf(i + 1)}
                y2={cy}
                stroke={done ? "var(--good)" : "var(--bb-border)"}
                strokeWidth={6}
                strokeLinecap="round"
                style={{ transition: reducedMotion ? "none" : "stroke 300ms ease" }}
              />
            </g>
          );
        })}
        {nodes.map((node) => {
          const x = xOf(node.index);
          const done = node.index < stepIndex || (node.index === stepIndex && won) || (node.kind === "product" && wonLast);
          const live = node.index === stepIndex && !won;
          const ring = node.index === highlighted ? "var(--bb-primary)" : done ? "var(--good)" : "var(--bb-border)";
          return (
            <g key={node.index} data-strip-node={node.index}>
              {node.index === highlighted ? <circle cx={x} cy={cy} r={NODE_R + 3} fill="none" stroke="var(--bb-primary-foreground)" strokeWidth={2} /> : null}
              <circle
                cx={x}
                cy={cy}
                r={NODE_R}
                fill={node.index === highlighted ? "var(--bb-primary)" : "var(--bb-card)"}
                stroke={ring}
                strokeWidth={node.index === highlighted ? 3 : 2}
              />
              <text
                x={x}
                y={cy + 5}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={node.index === highlighted ? "var(--bb-primary-foreground)" : done ? "var(--good)" : "var(--bb-muted-foreground)"}
              >
                {node.kind === "product" ? (done ? "✓" : "?") : String(node.index + 1)}
              </text>
              {node.fork && node.index <= stepIndex ? (
                <g transform={`translate(${x + 11} ${cy - 17})`}>
                  <circle r={7} fill="var(--bb-primary)" />
                  <path d="M -3 3 L 0 -1 L 3 3 M 0 -1 L 0 -4" stroke="var(--bb-primary-foreground)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
                </g>
              ) : null}
              {live ? <circle cx={x} cy={cy} r={NODE_R + 4} fill="none" stroke="var(--bb-primary)" strokeWidth={1.5} opacity={0.5} /> : null}
            </g>
          );
        })}
      </svg>
      <span className="sr-only" aria-live="polite">
        {viewIndex !== null ? `Looking back at step ${viewIndex + 1} of ${stepCount}` : `Step ${Math.min(stepIndex + 1, stepCount)} of ${stepCount}`}
      </span>
    </div>
  );
}
