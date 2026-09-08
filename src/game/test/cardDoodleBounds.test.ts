/**
 * EVERY SKETCH FITS INSIDE ITS OWN VIEWBOX. Read this header before deciding
 * this suite is strange, because the way it works is unusual on purpose.
 *
 * THE DEFECT IT PINS was measured in the running build by the round 3 critic,
 * not imagined here. `Acid` set its "OH" at x=44 with SVG's default
 * `text-anchor: start` at fontSize 9, so the label painted out to about x=55
 * inside a box 52 wide: the H was sliced down its middle and the Carbonyls
 * tile rendered its label as "Ol". `Thiol` had the identical fault at x=43,
 * and `Ketone` had the neighbouring one, a bare C=O double bond drawn with no
 * oxygen on the end of it, so the Reaction Deck tile showed two floating
 * parallel strokes reading as "II". None of the three is a chemistry error
 * and none of them broke a render; they are the kind of thing only a person
 * looking at the pixels catches, which is exactly why they need a check.
 *
 * WHY IT READS THE SOURCE FILE. apps/web/vitest.config.ts runs in a node
 * environment over `test/**\/*.test.ts` and its header says why: the pure
 * layers are unit tested and the React components are judged at the human
 * gate. That is the right split and this suite does not reopen it. But a
 * table of label positions living beside the drawing would be a COPY of the
 * drawing, and deckTray.test.ts already carries the lesson about copies in
 * its own words: "the stated bound is the painted bound", written after a
 * constant drifted away from the chrome it was supposed to describe.
 *
 * So this reads the coordinates out of the file that paints them. There is
 * one source of truth, it is the drawing itself, and a sketch that grows a
 * label past the edge fails here whatever anybody wrote in a comment.
 *
 * WHAT IT CANNOT SEE, stated so nobody trusts it further than it goes: it
 * checks anchor points, not rendered glyph rasters, and it treats a label's
 * width as a conservative advance estimate rather than a measured one. It
 * will catch a label placed off the edge. It will not catch a font that
 * renders wider than the estimate.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DOODLE_VIEW_H, DOODLE_VIEW_W } from "../cards/ui/Doodles";

const SOURCE = readFileSync(
  path.join(__dirname, "..", "cards", "ui", "Doodles.tsx"),
  "utf8",
);

/** Only the sketch table's own drawing code, not the scene props below it. */
const SKETCHES = SOURCE.slice(
  SOURCE.indexOf("/** A benzene ring"),
  SOURCE.indexOf("const DOODLES = ["),
);

/**
 * The label's own size, read out of the file rather than restated. If someone
 * changes LABEL's fontSize the bound moves with it, which is the whole point.
 */
const LABEL_FONT = Number(/const LABEL = \{\s*fontSize: (\d+(?:\.\d+)?)/.exec(SOURCE)?.[1]);

/**
 * A generous per-character advance for a grotesque capital, as a fraction of
 * the em. Real capitals in the system stack run about 0.60 to 0.72; 0.75 is
 * deliberately over, because a bound that fails a little early costs a nudge
 * and a bound that passes a little late costs a clipped letter on a tile.
 */
const ADVANCE = 0.75;

/** Cap height as a fraction of the em, for the ascent above the baseline. */
const CAP = 0.75;

/** The widest a stroke's round cap can bulge past its own centre line. */
const STROKE_BULGE = 1.6;

interface Label {
  readonly sketch: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
}

/** Every `<text {...LABEL} x=".." y="..">TEXT</text>` in the sketch table. */
function labels(): readonly Label[] {
  const found: Label[] = [];
  const byFunction = SKETCHES.split(/^function /m);
  for (const block of byFunction) {
    const sketch = /^(\w+)\(/.exec(block)?.[1] ?? "(top of file)";
    const re = /<text\s+\{\.\.\.LABEL\}\s+x="(-?[\d.]+)"\s+y="(-?[\d.]+)">\s*([A-Za-z]+)\s*<\/text>/g;
    let match = re.exec(block);
    while (match !== null) {
      found.push({ sketch, x: Number(match[1]), y: Number(match[2]), text: match[3] ?? "" });
      match = re.exec(block);
    }
  }
  return found;
}

/** Every coordinate pair in a path `d`, a polygon `points` or a circle. */
function points(): readonly { sketch: string; x: number; y: number }[] {
  const found: { sketch: string; x: number; y: number }[] = [];
  for (const block of SKETCHES.split(/^function /m)) {
    const sketch = /^(\w+)\(/.exec(block)?.[1] ?? "(top of file)";
    for (const d of block.matchAll(/\sd="([^"]+)"/g)) {
      const numbers = (d[1] ?? "").match(/-?[\d.]+/g) ?? [];
      for (let i = 0; i + 1 < numbers.length; i += 2) {
        found.push({ sketch, x: Number(numbers[i]), y: Number(numbers[i + 1]) });
      }
    }
    for (const p of block.matchAll(/\spoints="([^"]+)"/g)) {
      for (const pair of (p[1] ?? "").trim().split(/\s+/)) {
        const [x, y] = pair.split(",").map(Number);
        found.push({ sketch, x: x ?? 0, y: y ?? 0 });
      }
    }
    for (const c of block.matchAll(/cx="(-?[\d.]+)"\s+cy="(-?[\d.]+)"\s+r="(-?[\d.]+)"/g)) {
      const cx = Number(c[1]);
      const cy = Number(c[2]);
      const r = Number(c[3]);
      found.push({ sketch, x: cx - r, y: cy - r });
      found.push({ sketch, x: cx + r, y: cy + r });
    }
  }
  return found;
}

describe("the sketch table's own geometry", () => {
  it("finds the labels and the strokes at all, so a silent zero cannot pass", () => {
    // Every assertion below is a loop, and a loop over nothing passes. This is
    // the guard that says the parse still matches the file it is reading.
    expect(labels().length).toBeGreaterThanOrEqual(6);
    expect(points().length).toBeGreaterThanOrEqual(40);
    expect(LABEL_FONT).toBeGreaterThan(0);
  });

  it("THE ROUND 3 DEFECT: no heteroatom label paints outside the viewBox", () => {
    for (const label of labels()) {
      const half = (label.text.length * LABEL_FONT * ADVANCE) / 2;
      expect(label.x - half).toBeGreaterThanOrEqual(0);
      expect(label.x + half).toBeLessThanOrEqual(DOODLE_VIEW_W);
      expect(label.y - LABEL_FONT * CAP).toBeGreaterThanOrEqual(0);
      expect(label.y).toBeLessThanOrEqual(DOODLE_VIEW_H);
    }
  });

  it("catches the exact placement that shipped, so the bound can fail", () => {
    // Acid's old "OH": x=44, fontSize 9, anchored at the START rather than the
    // middle, so its whole width ran to the right of 44.
    expect(44 + "OH".length * 9 * ADVANCE).toBeGreaterThan(DOODLE_VIEW_W);
    // Thiol's old "SH", the same fault at x=43.
    expect(43 + "SH".length * 9 * ADVANCE).toBeGreaterThan(DOODLE_VIEW_W);
  });

  it("every label is centred on its atom, so the bound is the one measured", () => {
    // The check above assumes text-anchor: middle. A start-anchored label
    // would pass it while painting twice as far right, so no <text> may carry
    // its own attributes instead of spreading LABEL.
    const texts = SKETCHES.match(/<text/g) ?? [];
    const spread = SKETCHES.match(/<text\s+\{\.\.\.LABEL\}/g) ?? [];
    expect(spread.length).toBe(texts.length);
  });

  it("no stroke leaves the box either, round caps counted", () => {
    for (const point of points()) {
      expect(point.x).toBeGreaterThanOrEqual(-0.001);
      expect(point.y).toBeGreaterThanOrEqual(-0.001);
      expect(point.x).toBeLessThanOrEqual(DOODLE_VIEW_W - STROKE_BULGE / 2);
      expect(point.y).toBeLessThanOrEqual(DOODLE_VIEW_H - STROKE_BULGE / 2);
    }
  });

  it("THE KETONE ENDS IN AN OXYGEN, which is what makes it a ketone on screen", () => {
    // The bare C=O drew two parallel strokes and no atom, so the tile showed a
    // floating "II" hanging off the ring. Every sketch in both goal images
    // terminates in a ring or a labelled atom; this asserts ours does.
    const ketone = SKETCHES.slice(SKETCHES.indexOf("function Ketone"));
    expect(ketone.slice(0, ketone.indexOf("function Alkene"))).toContain(">\n        O\n      </text>");
  });
});
