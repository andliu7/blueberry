/**
 * THE TRAIL AND THE BUTTONS SHARE ONE SCROLLING LAYER.
 *
 * This file exists because of a bug the owner reported twice: "every time I
 * scroll the path lags behind the buttons." docs/DESIGN-GOALS.md records the
 * root cause and it is architectural, not a tuning number:
 *
 *   "PathScene is a STICKY, viewport-sized SVG, and the trail is recomputed
 *   from node positions read with getBoundingClientRect inside a
 *   requestAnimationFrame on scroll. The compositor scrolls the nodes first
 *   and the callback moves the trail afterwards, so the trail is ALWAYS at
 *   least one frame behind. No amount of making that callback faster fixes
 *   it ... THE FIX IS TO TAKE JAVASCRIPT OUT OF THE LOOP."
 *
 * A frame-timing test cannot prove that fix, because a machine fast enough
 * hides a one-frame lag and a machine slow enough invents one. What CAN be
 * proved is the property the fix rests on, and it is a property of the
 * source: the element that draws the ribbon lives inside the same scrolling
 * section as the chips it connects, and NOTHING that draws trail geometry
 * runs on scroll. If both hold, the compositor moves the ribbon and the chips
 * together and there is no callback that could be late.
 *
 * EVERY ASSERTION HERE FAILS ON THE OLD ARCHITECTURE. Before this round the
 * trail was drawn inside PathScene.tsx, which carries three scroll listeners
 * and a requestAnimationFrame, and there was no per-unit trail element for a
 * section to contain. The live counterpart is
 * measurements/_probe-trail-lag.mjs, which scrolls a real browser and reports
 * the measured divergence.
 *
 * It reads source rather than rendering, which is the same reason the rest of
 * the pathway suite is pure: apps/web's vitest environment is `node`, and the
 * geometry decisions are the thing worth pinning either way.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PATHWAY = path.resolve(__dirname, "../tabs/pathway");
const read = (file: string) => readFileSync(path.join(PATHWAY, file), "utf8");

/** Every component file on the pathway surface. */
/* PathTrackMap.tsx was here until 2026-09-05, when the file was deleted. The
   owner removed the scroll map on 2026-09-03 ("asked twice", recorded in
   PathwayTab.tsx), the render went with it, and the component then sat
   unreferenced for two days along with 264 lines of stylesheet for classes
   nothing drew. Nothing is loosened by its going: every surviving component is
   still scanned by the same rules. */
const COMPONENTS = ["PathScene.tsx", "PathwayTab.tsx", "UnitTrail.tsx"] as const;

/**
 * Does this module DRAW the trail, as opposed to merely mentioning it?
 *
 * Two signatures, either of which is enough: it turns points into path
 * strings, or it emits the ribbon's own class onto an element.
 */
function drawsTrail(source: string): boolean {
  return source.includes("trailSegments(") || /className=("|`|\{`)path-trail/.test(source);
}

/**
 * Anything that makes a module's output depend on the scroll position.
 *
 * requestAnimationFrame is on the list because a rAF that is not scheduled by
 * scroll is still a per-frame write, and a per-frame write to trail geometry
 * is the shape of the bug whatever triggered it.
 */
const SCROLL_LINKED: readonly { readonly name: string; readonly pattern: RegExp }[] = [
  { name: 'addEventListener("scroll")', pattern: /addEventListener\(\s*["'`]scroll["'`]/ },
  { name: "onScroll handler", pattern: /\bonScroll\s*=/ },
  { name: "requestAnimationFrame", pattern: /\brequestAnimationFrame\s*\(/ },
  { name: "window.scrollY", pattern: /\bwindow\.scrollY\b/ },
  { name: "pageYOffset", pattern: /\bpageYOffset\b/ },
  { name: "documentElement.scrollTop", pattern: /documentElement\.scrollTop\b/ },
];

describe("the trail scrolls in the same layer as the buttons", () => {
  it("has a module that actually draws the ribbon, so nothing below can pass vacuously", () => {
    const drawing = COMPONENTS.filter((file) => drawsTrail(read(file)));
    expect(drawing).toEqual(["UnitTrail.tsx"]);
  });

  it("never lets a module that draws trail geometry run on scroll", () => {
    for (const file of COMPONENTS) {
      const source = read(file);
      if (!drawsTrail(source)) continue;
      const offenders = SCROLL_LINKED.filter((entry) => entry.pattern.test(source)).map((entry) => entry.name);
      expect({ file, offenders }).toEqual({ file, offenders: [] });
    }
  });

  it("keeps the sticky surface out of the trail business entirely", () => {
    // PathScene is the one sticky, viewport-sized element on the tab, and it
    // is allowed its scroll-linked parallax: a background may lag, a line
    // between buttons may not. What it may not do is draw the line.
    const css = readFileSync(path.join(PATHWAY, "pathway.css"), "utf8");
    const scene = css.indexOf(".path-scene {");
    expect(scene).toBeGreaterThan(-1);
    expect(css.slice(scene, css.indexOf("}", scene))).toContain("position: sticky");
    const source = read("PathScene.tsx");
    expect(drawsTrail(source)).toBe(false);
    expect(source).not.toContain("trailSegments");
  });

  it("puts the trail element inside the very section that holds the chips", () => {
    const tab = read("PathwayTab.tsx");
    const open = tab.indexOf("<section");
    expect(open).toBeGreaterThan(-1);
    const close = tab.indexOf("</section>", open);
    expect(close).toBeGreaterThan(open);
    const section = tab.slice(open, close);
    // The section is the scrolling box: it carries the unit id the layout is
    // keyed on, the chips, the unit gate, and now the ribbon between them.
    expect(section).toContain("data-unit-id={unit.id}");
    expect(section).toContain("<UnitTrail");
    expect(section).toContain("<TrackSlab");
    expect(section).toContain("<UnitGateNode");
  });

  it("draws one box per unit rather than one box at track height", () => {
    // The S2 round recorded what a full-height layer does: about 14500px of
    // track becomes a ~200 MB layer on a 390pt phone at 3x and kills the
    // renderer. The per-unit box is the reason this fix is affordable, so the
    // component must size itself from ONE section and never from the stage.
    const trail = read("UnitTrail.tsx");
    expect(trail).toContain("svg.parentElement");
    expect(trail).not.toContain(".path-stage");
    expect(trail).not.toMatch(/document\.querySelectorAll/);
  });

  it("pins the trail layer with position: absolute, never sticky and never fixed", () => {
    // A sticky or fixed trail would leave the scrolling layer again and
    // reintroduce the exact bug this replaced, and it would do it silently,
    // because it would still look correct in a screenshot taken at rest.
    const css = readFileSync(path.join(PATHWAY, "pathway.css"), "utf8");
    const start = css.indexOf(".path-unit-trail {");
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf("}", start));
    expect(block).toContain("position: absolute");
    expect(block).not.toContain("sticky");
    expect(block).not.toContain("fixed");
    // And its host section must establish the containing block, or "absolute"
    // would resolve against the stage and the ribbon would land in the wrong
    // unit entirely.
    const unit = css.indexOf(".path-unit {");
    expect(unit).toBeGreaterThan(-1);
    expect(css.slice(unit, css.indexOf("}", unit))).toContain("position: relative");
  });
});
