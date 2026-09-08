/**
 * The backdrop's one real risk is that it steals a pointer from the arrow
 * machine, so that is what most of this file is about.
 *
 * The stylesheet assertions are not decoration either. A background that
 * animates a layout property drops the canvas off the compositor and takes the
 * 60 fps row in CLAUDE.md's budgets table with it, and a background that takes
 * pointer events breaks drawing outright. Both are invisible in review and
 * obvious in a test.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const CSS = readFileSync(
  fileURLToPath(new URL("../tabs/trainer/backdrop.css", import.meta.url)),
  "utf8",
);
const TSX = readFileSync(
  fileURLToPath(new URL("../tabs/trainer/CanvasBackdrop.tsx", import.meta.url)),
  "utf8",
);

/** The source with comments removed, so a check reads the code and not the
 *  prose describing it. Both files explain the rules they follow, and a check
 *  that greps prose fails on the sentence saying the code is right. */
const CODE = TSX.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every @keyframes BODY, brace matched. Splitting on the token would sweep in
 *  the ordinary rules below the first one. */
function keyframeBlocks(css: string): string[] {
  const blocks: string[] = [];
  let at = css.indexOf("@keyframes");
  while (at !== -1) {
    const open = css.indexOf("{", at);
    if (open === -1) break;
    let depth = 0;
    let i = open;
    for (; i < css.length; i += 1) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    blocks.push(css.slice(open + 1, i));
    at = css.indexOf("@keyframes", i);
  }
  return blocks;
}

describe("the backdrop cannot interfere with drawing", () => {
  it("never takes a pointer", () => {
    expect(CSS).toContain("pointer-events: none");
  });

  it("paints BEHIND the molecules", () => {
    // The bug this pins: an absolutely positioned element paints above static
    // in-flow content whatever the DOM order says, so the backdrop was sitting
    // on top of the chemistry and washing the atoms out. Without a negative
    // index the molecules lose contrast and nothing else reports it.
    expect(RULES).toMatch(/\.backdrop\s*\{[^}]*z-index:\s*-1/);
  });

  it("listens passively and never cancels the event", () => {
    // preventDefault on a pointerdown would kill the drag that draws an arrow;
    // stopPropagation would stop the canvas ever hearing about it.
    //
    // Comments are stripped first. The header of that file EXPLAINS that it
    // calls neither, and a check that reads prose fails on the sentence saying
    // the code is correct, which teaches the next author to delete the comment.
    expect(TSX).toContain("{ passive: true }");
    expect(CODE).not.toContain("preventDefault");
    expect(CODE).not.toContain("stopPropagation");
  });

  it("removes its listener when the mode changes", () => {
    // Left attached, a resonance listener would keep spawning ripples over a
    // mechanism, and keep the section alive after it unmounts.
    expect(TSX).toContain("removeEventListener");
  });

  it("is marked decorative, so a screen reader does not read water aloud", () => {
    expect(TSX).toContain('aria-hidden="true"');
  });
});

describe("the stylesheet stays on the compositor", () => {
  it("animates transform and opacity only, never a layout property", () => {
    const bodies = keyframeBlocks(CSS).join("\n");
    expect(bodies.length).toBeGreaterThan(0);
    for (const layout of ["width:", "height:", "top:", "left:", "margin", "padding"]) {
      expect(bodies.includes(layout), layout).toBe(false);
    }
  });

  it("honours reduced motion", () => {
    expect(CSS).toContain("prefers-reduced-motion: reduce");
  });

  it("gives dark mode its own plate rather than dimming the light one", () => {
    // A dimmed light plate goes grey. The dark plate was generated for the job.
    expect(CSS).toContain("mechanism-dark.webp");
    // The app themes on a .dark CLASS, per the @custom-variant in theme.css.
    expect(CSS).toContain(".dark .backdrop--mechanism");
  });

  it("never themes off the operating system preference", () => {
    // The student picks the theme. Keying off prefers-color-scheme put the dark
    // plate behind a light canvas for anyone whose laptop was in dark mode.
    expect(RULES.includes("prefers-color-scheme")).toBe(false);
  });
});

describe("the three modes say different things", () => {
  it("drifts the mechanism and the hybrid, because those go somewhere", () => {
    expect(CSS).toContain(".backdrop--mechanism .backdrop__plate--drift");
    expect(CSS).toContain(".backdrop--hybrid .backdrop__plate--drift");
  });

  it("never drifts resonance, because in resonance nothing moves", () => {
    const drift = CSS.slice(CSS.indexOf(".backdrop--mechanism .backdrop__plate--drift"));
    const rule = drift.slice(0, drift.indexOf("}"));
    expect(rule.includes("resonance")).toBe(false);
  });

  it("only ever ripples resonance", () => {
    expect(TSX).toContain('mode !== "resonance"');
  });

  it("caps how many ripples can be on screen at once", () => {
    expect(TSX).toContain("MAX_RIPPLES");
  });
});
