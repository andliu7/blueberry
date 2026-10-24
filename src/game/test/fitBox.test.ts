/**
 * Question drawings are fitted to their own ink (audit 23 Oct, section 5 #7):
 * the box holds every bond end, keeps the 120 by 84 ratio, and lets the allyl
 * cation, which used a third of the full box, draw its bonds about 30 px long
 * at the 72 px thumbnail height.
 */
import { describe, expect, it } from "vitest";

import { U1_VISUALS } from "../content/u1";
import type { Figure } from "../onboarding/figures";
import { FIGURE_HEIGHT, FIGURE_WIDTH, fitBox, sharedFitBoxes } from "../onboarding/figures";

function structure(id: string): Figure {
  const visual = U1_VISUALS[id];
  if (visual === undefined || visual.kind !== "structure") throw new Error(`${id} is not a structure visual`);
  return visual.figure;
}

describe("fitBox", () => {
  it("keeps the full box's ratio and every bond end inside", () => {
    for (const visual of Object.values(U1_VISUALS)) {
      const figures = visual.kind === "structure" ? [visual.figure] : visual.kind === "pair" ? [visual.a.figure, visual.b.figure] : [];
      for (const figure of figures) {
        const box = fitBox(figure);
        expect(box.w / box.h).toBeCloseTo(FIGURE_WIDTH / FIGURE_HEIGHT, 6);
        for (const bond of figure.bonds ?? []) {
          for (const [x, y] of [[bond.x1, bond.y1], [bond.x2, bond.y2]] as const) {
            expect(x).toBeGreaterThanOrEqual(box.x);
            expect(x).toBeLessThanOrEqual(box.x + box.w);
            expect(y).toBeGreaterThanOrEqual(box.y);
            expect(y).toBeLessThanOrEqual(box.y + box.h);
          }
        }
      }
    }
  });

  it("draws the allyl cation's bonds at least 30 px long at the 72 px thumbnail height", () => {
    const figure = structure("u1-allylic-where");
    const box = fitBox(figure);
    const pxPerUnit = 72 / box.h;
    for (const bond of figure.bonds ?? []) {
      expect(Math.hypot(bond.x2 - bond.x1, bond.y2 - bond.y1) * pxPerUnit).toBeGreaterThanOrEqual(30);
    }
  });

  it("never draws a figure more than twice its full-box size", () => {
    const box = fitBox({ bonds: [{ x1: 50, y1: 40, x2: 70, y2: 40 }] });
    expect(box.h).toBeGreaterThanOrEqual(FIGURE_HEIGHT / 2);
  });

  it("gives the two halves of a pair one scale", () => {
    const [a, b] = sharedFitBoxes([structure("u1-allylic-where"), structure("u1-qa-heptatrienyl")]);
    expect(a?.w).toBe(b?.w);
    expect(a?.h).toBe(b?.h);
  });
});

describe("locants beside a charge", () => {
  it("keep clear of the charge mark on the numbered allyl cation", () => {
    const labels = structure("u1-allylic-where").labels ?? [];
    const plus = labels.find((label) => label.t === "+");
    const one = labels.find((label) => label.t === "1");
    expect(plus).toBeDefined();
    expect(one).toBeDefined();
    // The "+" is 14 units and the "1" 10: centres closer than 10 overlap.
    expect(Math.hypot(plus!.x - one!.x, plus!.y - one!.y)).toBeGreaterThan(10);
  });
});
