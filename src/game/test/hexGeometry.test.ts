import { describe, expect, it } from "vitest";
import { GLYPH_MOAT, glyphClearance, hexHeight, hexVertices, kekuleEdges, kekuleLines, ringInset, ringLayout } from "../app/ui/hexGeometry";

describe("hexagon key geometry", () => {
  it("draws a regular hexagon: six equal sides", () => {
    const v = hexVertices(0, 0, 10);
    const sides = v.map((p, i) => Math.hypot(v[(i + 1) % 6]!.x - p.x, v[(i + 1) % 6]!.y - p.y));
    for (const side of sides) expect(side).toBeCloseTo(10, 6);
    expect(hexHeight(10)).toBeCloseTo(Math.sqrt(3) * 10, 6);
  });

  it("puts each benzene Kekule structure's three double bonds on alternating edges, no two sharing a carbon", () => {
    for (const set of ["a", "b"] as const) {
      const edges = kekuleEdges(set);
      expect(edges).toHaveLength(3);
      const carbons = edges.flatMap((e) => [e, (e + 1) % 6]);
      expect(new Set(carbons).size).toBe(6);
    }
  });

  it("the two Kekule structures are complementary: together they cover every C-C bond once", () => {
    const all = [...kekuleEdges("a"), ...kekuleEdges("b")].sort();
    expect(all).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("draws the second line of each double bond inside the ring and shorter than the bond", () => {
    const r = 20;
    const apothem = (Math.sqrt(3) / 2) * r;
    for (const [p, q] of kekuleLines(0, 0, r, "a", 4)) {
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      expect(Math.hypot(mid.x, mid.y)).toBeCloseTo(apothem - 4, 6);
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(r);
    }
  });

  it("turning Kekule set a by 60 degrees about the ring's centre lands it exactly on set b (the press animation)", () => {
    const cx = 30;
    const cy = 26;
    const r = 30;
    const turn = (p: { x: number; y: number }) => {
      const c = Math.cos(Math.PI / 3);
      const s = Math.sin(Math.PI / 3);
      return { x: cx + (p.x - cx) * c - (p.y - cy) * s, y: cy + (p.x - cx) * s + (p.y - cy) * c };
    };
    const key = (p: { x: number; y: number }) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
    const seg = ([p, q]: readonly [{ x: number; y: number }, { x: number; y: number }]) => [key(p), key(q)].sort().join("|");
    const turned = kekuleLines(cx, cy, r, "a", 6, 0.13).map(([p, q]) => seg([turn(p), turn(q)])).sort();
    const b = kekuleLines(cx, cy, r, "b", 6, 0.13).map(seg).sort();
    expect(turned).toEqual(b);
  });

  it("draws the ring inside the face, and keeps the glyph at least 6px clear of every bond at 64px and up", () => {
    // Round keys at 64, 72, 88 (glyph box 30% of the width, hex.css) and the
    // 80px path node with its 24px glyph (hexNode.css).
    const cases: readonly [number, number][] = [
      [32, 64 * 0.3],
      [36, 72 * 0.3],
      [44, 88 * 0.3],
      [40, 24],
    ];
    for (const [r, glyph] of cases) {
      const { ringR, glyph: maxGlyph, stroke } = ringLayout(r);
      expect(ringR).toBeLessThan(r);
      expect(stroke).toBeLessThanOrEqual(2.5);
      expect(glyph).toBeLessThanOrEqual(maxGlyph);
      expect(glyphClearance(r, glyph)).toBeGreaterThanOrEqual(GLYPH_MOAT);
    }
  });

  it("sets the drawn ring 7 to 9px in from the face's edge, at a 2px weight, so it reads as a ring and not as a rim", () => {
    for (const r of [32, 36, 40, 44]) {
      const { ringR, stroke } = ringLayout(r);
      const gap = (Math.sqrt(3) / 2) * (r - ringR);
      expect(gap).toBeCloseTo(ringInset(r), 6);
      expect(gap).toBeGreaterThanOrEqual(7);
      expect(gap).toBeLessThanOrEqual(9);
      expect(stroke).toBe(2);
    }
  });
});
