/**
 * Resolves a read-along card's drawing pointers (content/u1/lessonExplainers.ts)
 * to the McqVisual the existing card renders. Nothing is drawn here: a pointer
 * either reuses the drawing a pool question already carries, or an entry of
 * CD_FIGURES, which scripts/u1_pools_cd.py wrote from RDKit coordinates, or
 * (ADDED 3 Nov) an entry of STAGE_AB_WORKED_FIGURES, the drawings
 * scripts/u1_pools_ab.py writes for the stage A and B worked examples.
 * Returns null when a pointer does not resolve, so a test can hold every one.
 */
import { CD_FIGURES } from "../content/u1/stage-cd.figures";
import { STAGE_AB_WORKED_FIGURES } from "../content/u1/stage-ab";
import type { ExplainerDrawing } from "../content/u1/lessonExplainers";
import { mcqVisualFor, type McqVisual, type NamedFigure } from "./mcq/mcqFigures";

function namedFigures(ref: ExplainerDrawing): readonly NamedFigure[] | null {
  if ("worked" in ref) {
    const named = STAGE_AB_WORKED_FIGURES[ref.worked];
    return named === undefined ? null : [named];
  }
  if ("figure" in ref) {
    const figure = CD_FIGURES[ref.figure];
    return figure === undefined ? null : [{ figure, name: ref.name }];
  }
  const visual = mcqVisualFor(ref.beat);
  // A scheme is a question with a box to fill; a read-along never shows one.
  if (visual === null || visual.kind === "scheme") return null;
  if (visual.kind === "structure") return ref.part === undefined ? [visual] : null;
  return ref.part === "a" ? [visual.a] : ref.part === "b" ? [visual.b] : [visual.a, visual.b];
}

/** The visual for a card, or null when the card has no drawing or a pointer is broken. */
export function readAlongVisual(draw: readonly ExplainerDrawing[] | undefined): McqVisual | null {
  if (draw === undefined || draw.length === 0) return null;
  const all: NamedFigure[] = [];
  for (const ref of draw) {
    const found = namedFigures(ref);
    if (found === null) return null;
    all.push(...found);
  }
  if (all.length === 1) return { kind: "structure", ...all[0]! };
  if (all.length === 2) return { kind: "pair", a: all[0]!, b: all[1]! };
  return null;
}
