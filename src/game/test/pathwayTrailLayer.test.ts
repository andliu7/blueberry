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

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PATHWAY = path.resolve(__dirname, "../tabs/pathway");
const read = (file: string) => readFileSync(path.join(PATHWAY, file), "utf8");

/** Every component file on the pathway surface. */
/* PathTrackMap.tsx was here until 2026-09-05, when the file was deleted. The
   owner removed the scroll map on 2026-09-03 ("asked twice", recorded in
   PathwayTab.tsx), the render went with it, and the component then sat
   unreferenced for two days along with 264 lines of stylesheet for classes
   nothing drew. PathScene.tsx followed on 2026-09-17, when the owner dropped
   the generated landscape outright and the pathway became a per-unit pager.
   Nothing is loosened by either going: every surviving component is still
   scanned by the same rules, and the test below pins the scene's absence. */
const COMPONENTS = ["PathwayTab.tsx"] as const;

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

describe("the pathway surface never runs on scroll", () => {
  /*
   * WHAT WENT AND WHY, 2026-09-23. The owner deleted the drawn trail outright
   * ("even get rid of the path connections. just give it a glow"), so
   * UnitTrail.tsx and every .path-trail rule are gone and four assertions
   * went with them. Each one was about the RIBBON and nothing else:
   *
   *   "has a module that actually draws the ribbon"  -  the vacuity guard for
   *       drawsTrail(). With no ribbon there is nothing to guard, and the scan
   *       below no longer depends on the predicate at all.
   *   "puts the trail element inside the very section"  -  the <UnitTrail>
   *       clause only. The rest of that assertion is about the section's own
   *       contents and is KEPT below, unchanged.
   *   "draws one box per unit rather than one at track height"  -  the memory
   *       argument for a per-unit SVG layer. There is no layer.
   *   "pins the trail layer with position: absolute"  -  the .path-unit-trail
   *       block's own position. The half of it that is about .path-unit
   *       establishing a containing block is KEPT below, because the name
   *       cards, the START pill and the mascot still depend on it.
   *
   * WHAT DID NOT GO. The lag bug this file was written for was architectural:
   * nothing on the pathway may make its output depend on the scroll position.
   * That property outlives the ribbon, because a chip that repositions on
   * scroll lags exactly the way the ribbon did. So the scan below is now
   * UNCONDITIONAL over every pathway component rather than gated on
   * drawsTrail. That is a stronger check than the one it replaces.
   */
  it("never lets a pathway component run on scroll", () => {
    for (const file of COMPONENTS) {
      const source = read(file);
      const offenders = SCROLL_LINKED.filter((entry) => entry.pattern.test(source)).map((entry) => entry.name);
      expect({ file, offenders }).toEqual({ file, offenders: [] });
    }
  });

  it("keeps sticky surfaces off the trail, and lets only the two named chrome strips stick", () => {
    /*
     * PathScene was the one sticky, viewport-sized element on the tab, and it
     * was allowed its scroll-linked parallax because a background may lag.
     * The owner dropped the generated landscape outright (2026-09-17), and
     * this test then pinned the BLUNT form of that: nothing in pathway.css
     * was position: sticky at all.
     *
     * Round two of the pager overturned the blunt form, not the property it
     * was defending. A critic drove the built page and found the unit rail
     * 634px above the viewport at the bottom of unit 1, gone at exactly the
     * moment a student reaches the gate, and the Continue bar 346 to 523px
     * below the fold on the two reference phones. Both are CHROME. So the
     * ban is narrowed to what it was always about rather than dropped:
     *
     *   - position: fixed stays banned outright
     *   - sticky is allowed on exactly two selectors, both named here, so a
     *     third one or a sticky scene coming back fails this test
     *   - neither of them is the trail
     *
     * The ribbon itself went on 2026-09-23 (see the block at the top of this
     * describe for which assertions went with it). What this one is about
     * never was the ribbon: it is that nothing on the pathway may leave the
     * scrolling layer except the two named chrome strips.
     */
    expect(existsSync(path.join(PATHWAY, "PathScene.tsx"))).toBe(false);
    // And UnitTrail with it, 2026-09-23: the ribbon is deleted, not disabled.
    expect(existsSync(path.join(PATHWAY, "UnitTrail.tsx"))).toBe(false);
    const css = readFileSync(path.join(PATHWAY, "pathway.css"), "utf8");
    expect(css).not.toContain("position: fixed");
    const sticky = [...css.matchAll(/([^{}]+)\{[^{}]*position:\s*sticky/g)].map((match) =>
      String(match[1]).trim().split("\n").pop()!.trim(),
    );
    /* .path-railwrap became .path-unitbar when the fifteen-numeral rail
       became the unit picker (owner, 2026-09-23). Same strip, same sticky
       argument, one name. The picker's modal list is a fixed overlay and for
       that reason lives in pathway-sheet.css beside the guidebook's, so the
       ban above still means what it says. */
    expect(sticky).toEqual([".path-unitbar", ".path-pager__foot"]);
    for (const selector of sticky) expect(selector).not.toContain("trail");
  });

  it("keeps one unit's chips and its gate inside one scrolling section", () => {
    const tab = read("PathwayTab.tsx");
    const open = tab.indexOf("<section");
    expect(open).toBeGreaterThan(-1);
    const close = tab.indexOf("</section>", open);
    expect(close).toBeGreaterThan(open);
    const section = tab.slice(open, close);
    // The section is the scrolling box: it carries the unit id the layout is
    // keyed on, the chips, and the unit gate they close on.
    expect(section).toContain("data-unit-id={unit.id}");
    expect(section).toContain("<TrackSlab");
    expect(section).toContain("<UnitGateNode");
  });

  it("keeps the unit section as the containing block its absolute children need", () => {
    // The name cards, the START pill and the mascot are all absolutely
    // positioned inside a row. Without this the whole composition resolves
    // against the page and lands in the wrong unit, which is the same class of
    // bug the deleted trail layer was pinned against.
    const css = readFileSync(path.join(PATHWAY, "pathway.css"), "utf8");
    const unit = css.indexOf(".path-unit {");
    expect(unit).toBeGreaterThan(-1);
    expect(css.slice(unit, css.indexOf("}", unit))).toContain("position: relative");
  });
});
