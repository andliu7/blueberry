/**
 * The deck tray's environment: the composition a critic can hold a ruler to.
 *
 * The background doctrine of 2026-09-02 makes this a checkable rule rather
 * than a matter of taste. "The environment is COMPOSED, never scattered...
 * props are placed by a deterministic per-unit placement table... Random
 * per-route scatter of icons or molecules is a defect a critic names." So the
 * three things worth asserting are exactly the three the doctrine states:
 * the table is fixed, every prop is inside the frame, and every prop is
 * somewhere a student can actually see it.
 *
 * The third is the one a review would miss. The scene settles its contents at
 * its foot, so what a prop has to clear is the fan and the tray rising from
 * there. A prop placed behind them is not a subtle prop, it is a prop that
 * never renders anywhere visible, and a screenshot on one viewport is a weak
 * way to notice that.
 *
 * ROUND 4 REPLACED THE OPACITY ASSERTION WITH A CONTRAST ONE, and the swap is
 * a strengthening rather than a trade. Round 3 drew every prop at 0.12, under
 * contrast-audit.mjs's own published <0.15 skip threshold, so the gate never
 * scored a mark on this face: it passed by not being measured, and what a
 * person saw was the grey-green sky the round 3 critic named. The props are
 * painted in the warm-tech families now, and this file computes the WCAG
 * ratio of each drawn line against the ground it sits on and holds it to the
 * 3.0 graphics floor. Skipping is no longer available to them.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  PROP_EXTENT,
  SCENE_ARC_TOP,
  SCENE_FAN_TOP,
  SCENE_HEIGHT,
  SCENE_LIFT_COLUMN,
  SCENE_PALETTE,
  SCENE_PROPS,
  SCENE_VIEWBOX,
  SCENE_WIDTH,
  propBox,
} from "../cards/ui/scene";

/** WCAG 2.1 relative luminance of a #rrggbb string. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const CARDS_CSS = readFileSync(
  fileURLToPath(new URL("../cards/ui/cards.css", import.meta.url)),
  "utf8",
);

describe("the tray scene's placement table", () => {
  it("is a frozen table, not a generated scatter", () => {
    expect(Object.isFrozen(SCENE_PROPS)).toBe(true);
    // Deterministic in the strongest sense available to a test: two reads of
    // the module's own table are the same objects, so nothing is computed per
    // render, per route or per deck.
    expect(SCENE_PROPS).toBe(SCENE_PROPS);
    expect(SCENE_PROPS.length).toBeGreaterThan(0);
  });

  it("names only prop kinds that have a drawn extent", () => {
    for (const prop of SCENE_PROPS) {
      expect(PROP_EXTENT[prop.kind]).toBeDefined();
      expect(prop.scale).toBeGreaterThan(0);
    }
  });

  it("draws every prop wholly inside the frame", () => {
    for (const prop of SCENE_PROPS) {
      const box = propBox(prop);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(SCENE_WIDTH);
      expect(box.bottom).toBeLessThanOrEqual(SCENE_HEIGHT);
    }
  });

  it("keeps every prop somewhere the fan does not cover it", () => {
    // Legal is: wholly in the open sky above the fan's box, OR above the
    // resting arc and clear of the raised card's own column. That is the
    // committed image's arrangement, which puts two clouds behind the fan
    // either side of the raised card and none behind the card itself.
    for (const prop of SCENE_PROPS) {
      const box = propBox(prop);
      const inSky = box.bottom <= SCENE_FAN_TOP;
      const besideTheLift =
        box.bottom <= SCENE_ARC_TOP &&
        (box.right <= SCENE_LIFT_COLUMN.left || box.left >= SCENE_LIFT_COLUMN.right);
      expect(inSky || besideTheLift).toBe(true);
    }
  });

  it("spreads the props across the width rather than piling them in one place", () => {
    // Composed means the sky reads as a sky. Two props whose boxes overlap
    // horizontally AND vertically are one blot, so no pair may do both.
    for (let i = 0; i < SCENE_PROPS.length; i += 1) {
      for (let j = i + 1; j < SCENE_PROPS.length; j += 1) {
        const a = propBox(SCENE_PROPS[i]!);
        const b = propBox(SCENE_PROPS[j]!);
        const overlapsX = a.left < b.right && b.left < a.right;
        const overlapsY = a.top < b.bottom && b.top < a.bottom;
        expect(overlapsX && overlapsY).toBe(false);
      }
    }
  });

  it("draws every prop line over the 3.0 graphics floor, in both themes", () => {
    // The floor contrast-audit.mjs holds an SVG stroke to under WCAG 1.4.11.
    // These lines are SCORED now rather than skipped, which is why the values
    // are here to be checked at all.
    expect(ratio(SCENE_PALETTE.tan, SCENE_PALETTE.ground)).toBeGreaterThanOrEqual(3);
    expect(ratio(SCENE_PALETTE.line, SCENE_PALETTE.ground)).toBeGreaterThanOrEqual(3);
    expect(ratio(SCENE_PALETTE.tanDark, SCENE_PALETTE.groundDark)).toBeGreaterThanOrEqual(3);
    expect(ratio(SCENE_PALETTE.lineDark, SCENE_PALETTE.groundDark)).toBeGreaterThanOrEqual(3);
  });

  it("keeps the filled cloud honest: white is carried by its own outline", () => {
    // contrast-audit.mjs collapses a shape's fill and stroke to the better of
    // the two ("A shape is ONE component, not two"). The white cloud fails on
    // its fill alone and passes on its tan outline, so this asserts the pair
    // the gate will actually score rather than pretending the fill clears.
    expect(ratio(SCENE_PALETTE.cloudFill, SCENE_PALETTE.ground)).toBeLessThan(3);
    expect(ratio(SCENE_PALETTE.tan, SCENE_PALETTE.ground)).toBeGreaterThanOrEqual(3);
    expect(SCENE_PROPS.some((prop) => prop.tone === "filled")).toBe(true);
    expect(SCENE_PROPS.some((prop) => prop.tone === "outline")).toBe(true);
  });

  it("the stylesheet paints the palette this table publishes", () => {
    // The SVG needs these per theme and a presentation attribute cannot switch
    // on the .dark class, so cards.css restates them. Asserting the pair keeps
    // the measured values above describing the pixels a person receives.
    expect(CARDS_CSS).toContain(`--scene-tan: ${SCENE_PALETTE.tan};`);
    expect(CARDS_CSS).toContain(`--scene-line: ${SCENE_PALETTE.line};`);
    expect(CARDS_CSS).toContain(`--scene-cloud: ${SCENE_PALETTE.cloudFill};`);
    expect(CARDS_CSS).toContain(`--scene-tan: ${SCENE_PALETTE.tanDark};`);
    expect(CARDS_CSS).toContain(`--scene-line: ${SCENE_PALETTE.lineDark};`);
    expect(CARDS_CSS).toContain(`--scene-cloud: ${SCENE_PALETTE.cloudFillDark};`);
  });

  it("writes the viewBox from the same two numbers the table is measured in", () => {
    expect(SCENE_VIEWBOX).toBe(`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`);
    expect(SCENE_FAN_TOP).toBeLessThan(SCENE_ARC_TOP);
    expect(SCENE_ARC_TOP).toBeLessThan(SCENE_HEIGHT);
    expect(SCENE_LIFT_COLUMN.left).toBeLessThan(SCENE_LIFT_COLUMN.right);
  });
});
