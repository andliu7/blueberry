/**
 * The path's unlock celebration (owner, 23 Oct: "a green glow follows the
 * path down to the next button and that one has a lock unlocking animation
 * and then has a bright glow and slight celebration (not confetti)").
 *
 * The suite runs without a DOM, so these read the source, the way
 * pathSupernova.test.ts does, over pathUnlock.css and PathwayTab.tsx. They pin that only compositor properties
 * animate, that reduced motion turns the motion off, that the road still
 * never listens to scroll, and that the celebration has one source.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const RULES = read("../tabs/pathway/pathUnlock.css").replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "");
const CODE = read("../tabs/pathway/PathwayTab.tsx").replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/** The body of a brace-matched block starting at `from`. */
function block(from: number): string {
  const open = RULES.indexOf("{", from);
  let depth = 0;
  for (let i = open; i < RULES.length; i++) {
    if (RULES[i] === "{") depth++;
    if (RULES[i] === "}" && --depth === 0) return RULES.slice(open + 1, i);
  }
  throw new Error("unclosed block");
}

const NAMES = [...RULES.matchAll(/@keyframes (path-unlock-[a-z-]+)/g)].map((m) => m[1]!);

describe("path unlock motion", () => {
  it("draws all five parts: the glow, the shackle, the lock, the bounce and halo, the sparks", () => {
    for (const name of ["fill", "travel", "shackle", "lock", "bounce", "halo", "spark"]) expect(NAMES).toContain(`path-unlock-${name}`);
    expect(CODE).toContain('className="path-road__glow"');
    expect(CODE).toContain('className="path-unlock__shackle"');
    expect(CODE).toMatch(/SPARKS = \[0, 1, 2, 3, 4, 5, 6, 7\]/);
  });

  it("animates only transform and opacity in every path-unlock keyframe", () => {
    for (const name of NAMES) {
      const props = [...block(RULES.indexOf(`@keyframes ${name}`)).matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      expect(props.length, name).toBeGreaterThan(0);
      for (const p of props) expect(["transform", "opacity"], `${name} animates ${p}`).toContain(p);
    }
  });

  it("turns the motion off under reduced motion, both the OS setting and the in-app one", () => {
    // Outside any media block the parts sit in the still frame: no glow, no padlock, no sparks, a soft halo.
    const base = (selector: string) => block(RULES.indexOf(`${selector} {`));
    expect(base(".path-road__glow")).toMatch(/display:\s*none/);
    expect(base(".path-unlock__lock")).toMatch(/display:\s*none/);
    expect(base(".path-unlock__ring")).toMatch(/display:\s*none/);
    expect(base(".path-unlock__halo")).toMatch(/opacity:\s*0\.6/);
    // Every path-unlock animation is declared inside the one no-preference block.
    const motion = block(RULES.indexOf("@media (prefers-reduced-motion: no-preference)"));
    const outside = RULES.replace(motion, "");
    expect(outside).not.toMatch(/animation:\s*path-unlock-/);
    for (const name of NAMES) expect(motion, name).toContain(`@keyframes ${name}`);
    // The in-app setting undoes it, and no travelling glow is even rendered.
    expect(motion).toMatch(/\.path-unlock--still,\s*\.path-unlock--still \.path-unlock__halo\s*{\s*animation:\s*none/);
    expect(motion).toMatch(/\.path-unlock--still \.path-unlock__lock,\s*\.path-unlock--still \.path-unlock__ring\s*{\s*display:\s*none/);
    expect(CODE.match(/glow=\{reducedMotion \? null : glow\}/g)).toHaveLength(2);
  });

  it("keeps the road off scroll: RoadLine adds no listener and no frame loop", () => {
    const road = CODE.slice(CODE.indexOf("function RoadLine("), CODE.indexOf("function TrackNode("));
    expect(road.length).toBeGreaterThan(500);
    expect(road).not.toMatch(/addEventListener|requestAnimationFrame|onScroll/);
  });

  it("sets the celebration from one source, readCelebration, read once on mount", () => {
    expect(CODE.match(/readCelebration\(/g)).toHaveLength(1);
    expect(CODE).toMatch(/useState<Celebration \| null>\(\(\) => readCelebration\(/);
    // Nothing else ever sets it but the clear after it has played.
    expect(CODE.match(/setCelebrate\(/g)).toEqual(["setCelebrate("]);
    expect(CODE).toContain("setCelebrate(null)");
  });
});
