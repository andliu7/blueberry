/**
 * The path sky's supernova (owner, 2026-10-20: "a brighter flash, like a
 * four-point star shape, and then it closes. There's a red or blue light where
 * that was, with a slight ripple").
 *
 * The suite runs without a DOM, so these read the source, the way
 * canvasBackdrop.test.ts does. They pin the parts the owner named (star,
 * closing, red or blue glow, ripple), that only compositor properties animate,
 * and that reduced motion keeps a still glow.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const CSS = readFileSync(
  fileURLToPath(new URL("../tabs/pathway/pathStars.css", import.meta.url)),
  "utf8",
);
const TSX = readFileSync(
  fileURLToPath(new URL("../tabs/pathway/PathStars.tsx", import.meta.url)),
  "utf8",
);
/** Code without comments, so a check reads the rules and not the prose. */
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const CODE = TSX.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/** The body of one @keyframes block, brace matched. */
function keyframes(name: string): string {
  const at = RULES.indexOf(`@keyframes ${name}`);
  expect(at, `@keyframes ${name}`).toBeGreaterThan(-1);
  const open = RULES.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < RULES.length; i++) {
    if (RULES[i] === "{") depth++;
    if (RULES[i] === "}" && --depth === 0) return RULES.slice(open + 1, i);
  }
  throw new Error(`unclosed @keyframes ${name}`);
}

describe("path supernova", () => {
  it("spawns the four parts and picks red or blue", () => {
    for (const part of ["bloom", "flash", "glow", "ripple"]) {
      expect(CODE).toContain(`path-stars-${part}`);
    }
    expect(CODE).toMatch(/POP_TONES = \["red", "blue"\]/);
    expect(CODE).toContain("el.dataset.tone");
  });

  it("draws the flash as a four-point star that closes to nothing", () => {
    const flash = RULES.slice(RULES.indexOf(".path-stars-flash {"));
    // Eight corners: four tips and four waist points.
    const poly = flash.match(/clip-path:\s*polygon\(([^)]*)\)/);
    expect(poly).not.toBeNull();
    expect(poly![1].split(",")).toHaveLength(8);
    const last = keyframes("path-stars-flash").match(/100%\s*{([^}]*)}/);
    expect(last![1]).toMatch(/scale\(0\)/);
  });

  it("colours the glow and the ripple per tone, in both themes", () => {
    expect(RULES).toMatch(/\.path-stars-pop\[data-tone="blue"\]\s*{\s*--c:/);
    expect(RULES).toMatch(/\.dark \.path-stars-pop\s*{\s*--c:/);
    expect(RULES).toMatch(/\.dark \.path-stars-pop\[data-tone="blue"\]\s*{\s*--c:/);
    expect(RULES).toMatch(/\.path-stars-ripple\s*{[^}]*border:[^}]*var\(--c\)/);
  });

  it("animates only transform and opacity", () => {
    for (const name of ["path-stars-bloom", "path-stars-flash", "path-stars-glow", "path-stars-ripple"]) {
      const props = [...keyframes(name).matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      expect(props.length).toBeGreaterThan(0);
      for (const p of props) expect(["transform", "opacity"], `${name} animates ${p}`).toContain(p);
    }
  });

  it("keeps a still glow under reduced motion and hides the flashes", () => {
    expect(CODE.match(/className="path-stars-still"/g)).toHaveLength(2);
    expect(RULES).toMatch(/\.path-stars-still\s*{[^}]*display:\s*none/);
    expect(RULES).toMatch(/html\[data-motion="reduced"\] \.path-stars-still\s*{\s*display:\s*block/);
    expect(RULES).toMatch(/html\[data-motion="reduced"\] \.path-stars-fx\s*{\s*display:\s*none/);
  });
});
