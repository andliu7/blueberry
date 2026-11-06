/**
 * The ring geometry behind the hexagon keys (piece "hex", owner idea of 2 Nov:
 * "make the buttons like the badges, hexagon shaped, but still with the button
 * animation. It represents cyclohexanes and benzenes").
 *
 * Every hexagon here is REGULAR and FLAT-TOPPED, so it is a ring and never a
 * stretched lozenge. Round 3 (3 Nov judges): only round keys and path nodes
 * wear it. A text key stretched to 6:1 read as a price tag, not a ring, so
 * text keys stay the rounded .btn3d, one family with the answer rows.
 *
 * THE CHEMISTRY, derived rather than recalled. Benzene is a six-carbon ring
 * whose Kekule structure puts three C=C double bonds on alternating edges.
 * Edges are numbered 0..5 from the right-hand vertex, going clockwise on
 * screen (y grows downward). Set "a" is edges 0, 2, 4; set "b" is 1, 3, 5.
 * Those are the two Kekule structures, and they are resonance contributors of
 * the same molecule, not two molecules and not a reaction. Cyclohexane is the
 * same ring with no double bonds. The second line of a double bond is drawn
 * INSIDE the ring and a little shorter than the bond, the textbook convention.
 * The tests in test/hexGeometry.test.ts pin all of this.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type KekuleSet = "a" | "b";

const SQRT3 = Math.sqrt(3);

const round = (n: number) => Math.round(n * 100) / 100;

/** The six vertices of a regular flat-topped hexagon, vertex 0 on the right, clockwise. */
export function hexVertices(cx: number, cy: number, r: number): readonly Point[] {
  const out: Point[] = [];
  for (let k = 0; k < 6; k += 1) {
    const a = (Math.PI / 3) * k;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

/** The height of a flat-topped regular hexagon of circumradius r. */
export function hexHeight(r: number): number {
  return SQRT3 * r;
}

/** A closed path through `pts` with every corner softened by a radius-`rc` curve. */
export function roundedPolygonPath(pts: readonly Point[], rc: number): string {
  const n = pts.length;
  const parts: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const prev = pts[(i - 1 + n) % n]!;
    const cur = pts[i]!;
    const next = pts[(i + 1) % n]!;
    const toPrev = { x: prev.x - cur.x, y: prev.y - cur.y };
    const toNext = { x: next.x - cur.x, y: next.y - cur.y };
    const lp = Math.hypot(toPrev.x, toPrev.y);
    const ln = Math.hypot(toNext.x, toNext.y);
    const d = Math.min(rc, lp / 2, ln / 2);
    const a = { x: cur.x + (toPrev.x / lp) * d, y: cur.y + (toPrev.y / lp) * d };
    const b = { x: cur.x + (toNext.x / ln) * d, y: cur.y + (toNext.y / ln) * d };
    parts.push(`${i === 0 ? "M" : "L"}${round(a.x)} ${round(a.y)}`);
    parts.push(`Q${round(cur.x)} ${round(cur.y)} ${round(b.x)} ${round(b.y)}`);
  }
  return `${parts.join("")}Z`;
}

/** A regular flat-topped hexagon as a rounded path. */
export function hexPath(cx: number, cy: number, r: number, rc = r * 0.12): string {
  return roundedPolygonPath(hexVertices(cx, cy, r), rc);
}

/**
 * How a round key or path node lays its benzene out, from the face's
 * circumradius r (round 3, 3 Nov judges: "thinner strokes, with at least 6px
 * clear of the glyph, would make it read as a ring rather than a halo of
 * tick marks").
 *
 * The face is the slab. ON it sits a line drawing of the molecule the way a
 * textbook draws it: a thin hexagon (the six C-C bonds) inset from the face's
 * edge, and the second line of each double bond inset again from that. The
 * glyph gets whatever is left in the middle, less a 6px moat, so the bonds
 * never crowd it.
 *
 *   ringR      circumradius of the drawn ring
 *   bondInset  how far inside the ring the second line of a double bond sits
 *   stroke     line width, the same for every bond, as in a skeletal drawing
 *   glyph      the largest square glyph box that keeps GLYPH_MOAT clear of the
 *              inner lines, capped at 36% of the key's width
 */
export const GLYPH_MOAT = 6;
/** How far a glyph's ink reaches from its centre, as a fraction of its box (check, play, bulb, star). */
export const GLYPH_REACH = 0.42;

export interface RingLayout {
  readonly ringR: number;
  readonly bondInset: number;
  readonly stroke: number;
  readonly glyph: number;
}

export function ringLayout(r: number): RingLayout {
  const apothem = (SQRT3 / 2) * r;
  // Round 4 (4 Nov judges): one 2px weight for every bond, and the ring set
  // 6-9px in from the face's edge so it reads as a drawing ON the key, not
  // as a second rim.
  const stroke = 2;
  const ringApothem = apothem - ringInset(r);
  const ringR = (ringApothem * 2) / SQRT3;
  const bondInset = Math.max(3.5, ringR * 0.18);
  const inner = ringApothem - bondInset - stroke / 2;
  const glyph = Math.floor(Math.min(2 * r * 0.36, (inner - GLYPH_MOAT) / GLYPH_REACH));
  return { ringR, bondInset, stroke, glyph };
}

/** How far the drawn ring sits inside the face's edge, measured across a flat side: 6px at 64px, 8px at the 80px node. */
export function ringInset(r: number): number {
  return Math.min(9, Math.max(7, r * 0.2));
}

/** The clear distance between a glyph of box size `glyph` and the nearest inner bond line. */
export function glyphClearance(r: number, glyph: number): number {
  const { ringR, bondInset, stroke } = ringLayout(r);
  return (SQRT3 / 2) * ringR - bondInset - stroke / 2 - glyph * GLYPH_REACH;
}

/** The edge indices that carry a double bond in one Kekule structure. */
export function kekuleEdges(set: KekuleSet): readonly number[] {
  return set === "a" ? [0, 2, 4] : [1, 3, 5];
}

/**
 * The inner line of each double bond in one Kekule set, as [from, to] pairs:
 * the edge pulled toward the centre by `inset` and trimmed by `trim` (a
 * fraction of the edge) at each end.
 */
export function kekuleLines(
  cx: number,
  cy: number,
  r: number,
  set: KekuleSet,
  inset = r * 0.2,
  trim = 0.16,
): readonly (readonly [Point, Point])[] {
  const v = hexVertices(cx, cy, r);
  const apothem = (SQRT3 / 2) * r;
  const k = (apothem - inset) / apothem;
  const pull = (p: Point): Point => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k });
  return kekuleEdges(set).map((e) => {
    const p = pull(v[e]!);
    const q = pull(v[(e + 1) % 6]!);
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    return [
      { x: p.x + dx * trim, y: p.y + dy * trim },
      { x: q.x - dx * trim, y: q.y - dy * trim },
    ] as const;
  });
}

/** One SVG path string for a set of line segments. */
export function linesPath(lines: readonly (readonly [Point, Point])[]): string {
  return lines.map(([p, q]) => `M${round(p.x)} ${round(p.y)}L${round(q.x)} ${round(q.y)}`).join("");
}

/** The ring's six single bonds as one open-free closed path (sharp corners, a line drawing). */
export function ringPath(cx: number, cy: number, r: number): string {
  const v = hexVertices(cx, cy, r);
  return `${v.map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join("")}Z`;
}
