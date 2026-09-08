/**
 * Drawing a skeletal graph: the small geometry both canvases share.
 *
 * Split out of the components because it is arithmetic and arithmetic is
 * testable, while JSX output is not worth asserting (apps/web/vitest.config.ts
 * says so and it is right). Split out of target.ts because that file is about
 * what a molecule IS and this one is about how it looks.
 *
 * THE DOUBLE BOND CHOICE, stated because it is the one thing here a chemist
 * will look at twice. A textbook double bond is two parallel lines symmetric
 * about the bond axis. This beat traces the AXIS, so drawing both lines off it
 * would leave the traced stroke with nothing under it. So the axis is one of
 * the two lines and the second sits parallel, offset toward the molecule's
 * centre. That is the inner line convention every ring double bond already uses
 * and it reads correctly in a chain too. A triple bond gets one line each side.
 *
 * LABEL GAPS. A bond that runs under an "O" makes the letter unreadable, so a
 * bond touching a labelled vertex stops short of it. Carbon is unlabelled by
 * skeletal convention, so most bonds are untouched by this.
 */

import { elementOf, type Graph, type TraceEdge, type TraceVertex } from "./target";
import type { Pt } from "./geometry";

/** How far the second line of a multiple bond sits off the axis. */
export const MULTIPLE_BOND_GAP = 9;
/** How much room a labelled vertex clears for itself, in px of bond. */
export const LABEL_GAP = 15;

export function centroidOf(vertices: readonly TraceVertex[]): Pt {
  if (vertices.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const vertex of vertices) {
    x += vertex.x;
    y += vertex.y;
  }
  return { x: x / vertices.length, y: y / vertices.length };
}

export interface ViewBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A frame around the molecule with room to breathe.
 *
 * Computed rather than authored so a molecule can be laid out where it reads
 * well instead of inside a fixed canvas. A minimum size stops a two atom
 * fragment from being blown up to fill the screen, which would make its bond
 * look nothing like the bonds in the beat beside it.
 */
export function viewBoxOf(vertices: readonly TraceVertex[], padding = 56, minimum = 260): ViewBox {
  if (vertices.length === 0) return { x: 0, y: 0, width: minimum, height: minimum };
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const vertex of vertices) {
    left = Math.min(left, vertex.x);
    right = Math.max(right, vertex.x);
    top = Math.min(top, vertex.y);
    bottom = Math.max(bottom, vertex.y);
  }
  const width = Math.max(right - left + padding * 2, minimum);
  const height = Math.max(bottom - top + padding * 2, minimum);
  const centreX = (left + right) / 2;
  const centreY = (top + bottom) / 2;
  return { x: centreX - width / 2, y: centreY - height / 2, width, height };
}

export function viewBoxString(box: ViewBox): string {
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

export interface Segment {
  readonly from: Pt;
  readonly to: Pt;
}

function shorten(from: Pt, to: Pt, byStart: number, byEnd: number): Segment {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length <= byStart + byEnd) return { from, to };
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;
  return {
    from: { x: from.x + ux * byStart, y: from.y + uy * byStart },
    to: { x: to.x - ux * byEnd, y: to.y - uy * byEnd },
  };
}

/** The bond axis, trimmed clear of any element letter at either end. */
export function bondAxis(graph: Graph, edge: TraceEdge): Segment | null {
  const a = graph.vertices.find((vertex) => vertex.id === edge.a);
  const b = graph.vertices.find((vertex) => vertex.id === edge.b);
  if (a === undefined || b === undefined) return null;
  return shorten(
    { x: a.x, y: a.y },
    { x: b.x, y: b.y },
    elementOf(a) === "C" ? 0 : LABEL_GAP,
    elementOf(b) === "C" ? 0 : LABEL_GAP,
  );
}

/**
 * The extra lines a multiple bond needs, on top of its axis.
 *
 * Empty for a single bond, one line for a double, two for a triple. Each is
 * shortened a little further at both ends, which is what stops the inner line
 * of a ring bond from poking past the ring vertex.
 */
export function multipleBondLines(graph: Graph, edge: TraceEdge): readonly Segment[] {
  if (edge.order === 1) return [];
  const axis = bondAxis(graph, edge);
  if (axis === null) return [];
  const dx = axis.to.x - axis.from.x;
  const dy = axis.to.y - axis.from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-6) return [];
  const nx = -dy / length;
  const ny = dx / length;
  const inset = shorten(axis.from, axis.to, MULTIPLE_BOND_GAP, MULTIPLE_BOND_GAP);

  const offsetBy = (amount: number): Segment => ({
    from: { x: inset.from.x + nx * amount, y: inset.from.y + ny * amount },
    to: { x: inset.to.x + nx * amount, y: inset.to.y + ny * amount },
  });

  if (edge.order === 3) return [offsetBy(MULTIPLE_BOND_GAP), offsetBy(-MULTIPLE_BOND_GAP)];

  // Double: inward, toward the molecule's centre, so ring bonds get their inner
  // line on the inside and a chain bond picks a consistent side.
  const centre = centroidOf(graph.vertices);
  const midX = (axis.from.x + axis.to.x) / 2;
  const midY = (axis.from.y + axis.to.y) / 2;
  const towardCentre = nx * (centre.x - midX) + ny * (centre.y - midY);
  return [offsetBy(towardCentre >= 0 ? MULTIPLE_BOND_GAP : -MULTIPLE_BOND_GAP)];
}

/** Vertices that get a letter drawn on them. Carbon does not, by convention. */
export function labelledVertices(graph: Graph): readonly TraceVertex[] {
  return graph.vertices.filter((vertex) => elementOf(vertex) !== "C");
}

/** "+", "2-", or null. The sign a charge badge shows beside an element. */
export function chargeLabel(charge: number | undefined): string | null {
  if (charge === undefined || charge === 0) return null;
  const magnitude = Math.abs(charge);
  const sign = charge > 0 ? "+" : "-";
  return magnitude === 1 ? sign : `${magnitude}${sign}`;
}
