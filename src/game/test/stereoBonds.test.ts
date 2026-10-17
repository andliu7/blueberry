/**
 * Wedge and hash bonds: the renderer's geometry (stereoShape in onboarding/figures.ts,
 * drawn by StructureFigure.tsx) and the Unit 1 stereo answers that use them. The
 * stereo itself is RDKit's: scripts/u1_pools_cd.py wedges each drawing with
 * WedgeMolBonds and reads it back from the drawn coordinates before writing.
 */
import { describe, expect, it } from "vitest";

import { stereoShape } from "../onboarding/figures";
import { CD_FIGURES, CD_FIGURE_SMILES } from "../content/u1/stage-cd.figures";
import { U1_OPTION_TILES, U1_POOLS } from "../content/u1";
import { mcqOptionTiles } from "../beats/mcq/mcqFigures";

describe("the stereo bond's ink", () => {
  it("draws a wedge as a triangle pointed at the stereocentre and wide at the far end", () => {
    const shape = stereoShape({ x1: 10, y1: 20, x2: 30, y2: 20, stereo: "wedge" });
    expect(shape.kind).toBe("wedge");
    if (shape.kind !== "wedge") return;
    expect(shape.points[0]).toEqual([10, 20]);
    const [, a, b] = shape.points;
    expect(a![0]).toBe(30);
    expect(b![0]).toBe(30);
    expect(Math.abs(a![1] - b![1])).toBeGreaterThan(4);
  });

  it("draws a hash as rungs across the bond that widen away from the stereocentre", () => {
    const shape = stereoShape({ x1: 0, y1: 0, x2: 0, y2: 20, stereo: "hash" });
    expect(shape.kind).toBe("hash");
    if (shape.kind !== "hash") return;
    const widths = shape.rungs.map(([ax, , bx]) => Math.abs(ax - bx));
    expect(widths.length).toBeGreaterThan(3);
    for (let i = 1; i < widths.length; i += 1) expect(widths[i]!).toBeGreaterThan(widths[i - 1]!);
    // Each rung crosses the bond at right angles: both ends at one height.
    for (const [, ay, , by] of shape.rungs) expect(ay).toBeCloseTo(by);
  });
});

describe("Unit 1's stereo answers are drawn, not described", () => {
  const beats = new Map(
    Object.values(U1_POOLS)
      .flat()
      .flatMap((entry) => (entry.item.kind === "mcq" ? [[entry.id, entry.item.beat] as const] : [])),
  );
  // Every Unit 1 item whose answer is a stereo relationship. Its tiles live in
  // stage-cd.ts; each tile's figure is looked up by identity in CD_FIGURES.
  const STEREO_ITEMS = [
    "u1-cd-st-cis",
    "u1-cd-st-endo",
    "u1-cd-3d-maleate",
    "u1-cd-3d-fumarate",
    "u1-cd-3d-cis-meso",
    "u1-cd-3d-trans-racemate",
    "u1-cd-3d-junction",
    "u1-cd-3d-hexadiene",
    "u1-cd-3d-one-centre",
    "u1-cd-3d-fumarate-cp",
  ];
  const STEREO_TILES = Object.fromEntries(
    STEREO_ITEMS.map((entry) => [
      entry,
      Object.fromEntries(
        Object.entries(U1_OPTION_TILES[entry] ?? {}).map(([option, tile]) => [
          option,
          [Object.keys(CD_FIGURES).find((key) => CD_FIGURES[key] === tile.figure) ?? `${entry}::${option} not in CD_FIGURES`, tile.name] as const,
        ]),
      ),
    ]),
  );

  it("draws every option of every stereo item, so the whole set renders as tiles", () => {
    expect(Object.keys(STEREO_TILES).length).toBeGreaterThan(0);
    for (const [entry, options] of Object.entries(STEREO_TILES)) {
      const beat = beats.get(entry);
      expect(beat, entry).toBeDefined();
      const ids = beat!.options.map((option) => option.id);
      expect(Object.keys(options).sort(), entry).toEqual([...ids].sort());
      expect(mcqOptionTiles(entry, ids), entry).not.toBeNull();
    }
  });

  it("covers the stereo lessons it was built for, u1-da-stereo and u1-da-3d", () => {
    const nodes = new Set(Object.keys(STEREO_TILES).map((entry) => beats.get(entry)?.node));
    expect([...nodes].sort()).toEqual(["u1-da-3d", "u1-da-stereo"]);
  });

  it("puts a wedge or hash in every stereo drawing, only on single bonds, from a SMILES with assigned centres", () => {
    for (const options of Object.values(STEREO_TILES)) {
      for (const [key] of Object.values(options)) {
        const bonds = CD_FIGURES[key]?.bonds ?? [];
        expect(bonds.some((bond) => bond.stereo !== undefined), key).toBe(true);
        for (const bond of bonds) if (bond.stereo !== undefined) expect(bond.order ?? 1, key).toBe(1);
        expect(CD_FIGURE_SMILES[key], key).toMatch(/@/);
      }
    }
  });

  it("draws no wedge on a figure whose SMILES carries no stereocentre", () => {
    for (const [key, figure] of Object.entries(CD_FIGURES)) {
      if (/@/.test(CD_FIGURE_SMILES[key] ?? "")) continue;
      for (const bond of figure.bonds ?? []) expect(bond.stereo, key).toBeUndefined();
    }
  });
});
