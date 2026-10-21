/**
 * Where a double bond's second line goes (owner, 20 Oct): the first line sits
 * where a single bond would, the second on the INNER side of the angle, and a
 * ring bond's second line inside the ring. A C=O with a group on each side
 * (a ketone, an ester) stays centred, as the textbook draws it.
 *
 * The coordinates are real figure output: scripts/u3_pools.py `figure()` run
 * on each SMILES with RDKit, so the geometry is what a student sees.
 */
import { describe, expect, it } from "vitest";
import { bondEndsJoined, doubleBondSide, type BondLine } from "../onboarding/figures";

type Row = readonly [number, number, number, number, number];
const bonds = (rows: readonly Row[]): BondLine[] => rows.map(([x1, y1, x2, y2, order]) => ({ x1, y1, x2, y2, order }));

/** Which side of bond `index` (along its left normal) the point lies on: 1 or -1. */
function sideOfPoint(list: readonly BondLine[], index: number, x: number, y: number): 1 | -1 {
  const { x1, y1, x2, y2 } = list[index]!;
  const dot = (x - x1) * -(y2 - y1) + (y - y1) * (x2 - x1);
  return dot > 0 ? 1 : -1;
}

describe("doubleBondSide", () => {
  it("propene (C=CC): the second line goes toward the CH3, inside the angle", () => {
    const list = bonds([
      [42.7, 39.1, 60.0, 49.0, 2],
      [60.0, 49.0, 77.3, 39.0, 1],
    ]);
    expect(doubleBondSide(list, 0)).toBe(sideOfPoint(list, 0, 77.3, 39.0));
  });

  it("cyclohexene: the second line goes toward the ring centre", () => {
    const list = bonds([
      [42.7, 54.0, 42.7, 34.0, 2],
      [42.7, 34.0, 60.0, 24.0, 1],
      [60.0, 24.0, 77.3, 34.0, 1],
      [77.3, 34.0, 77.3, 54.0, 1],
      [77.3, 54.0, 60.0, 64.0, 1],
      [60.0, 64.0, 42.7, 54.0, 1],
    ]);
    expect(doubleBondSide(list, 0)).toBe(sideOfPoint(list, 0, 60, 44));
  });

  it("1-methylcyclohexene: the ring wins over the methyl on the outside", () => {
    const list = bonds([
      [34.0, 64.0, 51.3, 54.0, 1],
      [51.3, 54.0, 51.4, 34.0, 2],
      [51.4, 34.0, 68.7, 24.0, 1],
      [68.7, 24.0, 86.0, 34.0, 1],
      [86.0, 34.0, 86.0, 54.0, 1],
      [86.0, 54.0, 68.6, 64.0, 1],
      [68.6, 64.0, 51.3, 54.0, 1],
    ]);
    expect(doubleBondSide(list, 1)).toBe(sideOfPoint(list, 1, 68.7, 44));
  });

  it("acrolein (C=CC=O): both double bonds go inside the chain's angles", () => {
    const list = bonds([
      [86.0, 39.0, 68.7, 49.0, 2],
      [68.7, 49.0, 51.3, 39.0, 1],
      [51.3, 39.0, 39.2, 46.0, 2],
    ]);
    expect(doubleBondSide(list, 0)).toBe(sideOfPoint(list, 0, 51.3, 39.0));
    expect(doubleBondSide(list, 2)).toBe(sideOfPoint(list, 2, 68.7, 49.0));
  });

  it("2-butanone and methyl acetate: a C=O with a group on each side stays centred", () => {
    const ketone = bonds([
      [86.0, 58.9, 68.7, 49.0, 1],
      [68.7, 49.0, 68.6, 35.0, 2],
      [68.7, 49.0, 51.3, 59.0, 1],
      [51.3, 59.0, 34.0, 49.1, 1],
    ]);
    const ester = bonds([
      [86.0, 58.9, 68.7, 49.0, 1],
      [68.7, 49.0, 68.6, 35.0, 2],
      [68.7, 49.0, 56.5, 56.0, 1],
      [46.1, 56.0, 34.0, 49.1, 1],
    ]);
    expect(doubleBondSide(ketone, 1)).toBe(0);
    expect(doubleBondSide(ester, 1)).toBe(0);
  });

  it("trans-2-butene: one group on each side, so it stays centred", () => {
    const list = bonds([
      [86.0, 39.0, 68.7, 49.0, 1],
      [68.7, 49.0, 51.3, 39.0, 2],
      [51.3, 39.0, 34.0, 49.0, 1],
    ]);
    expect(doubleBondSide(list, 1)).toBe(0);
  });

  it("ethene alone, and a reaction arrow beside it, stay centred", () => {
    const list: BondLine[] = [
      { x1: 40, y1: 40, x2: 60, y2: 40, order: 2 },
      { x1: 60, y1: 40, x2: 80, y2: 50, arrow: true },
    ];
    expect(doubleBondSide(list, 0)).toBe(0);
  });
});

describe("bondEndsJoined", () => {
  it("propene's CH2 end is free and its CH end is joined", () => {
    const list = bonds([
      [42.7, 39.1, 60.0, 49.0, 2],
      [60.0, 49.0, 77.3, 39.0, 1],
    ]);
    expect(bondEndsJoined(list, 0)).toEqual([false, true]);
  });
});
