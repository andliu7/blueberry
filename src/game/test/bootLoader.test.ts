/**
 * The front door's contract, which is split across two files on purpose and is
 * therefore exactly the kind of thing that drifts.
 *
 * index.html draws the loader, because it has to paint before any JavaScript
 * runs; src/app/Loader.tsx adopts it by id, and the capture and the contrast
 * audit find it by the same ids and class names. Nothing in the type system
 * connects those, so renaming `#boot-word` in the markup would leave a loader
 * whose word never changes, a capture that still passes, and no compiler error
 * anywhere. These assertions are that missing edge.
 *
 * They read the FILES rather than a rendered page, because the environment here
 * is node (see vite.config.ts: the React components are judged by the frame
 * scripts and the human gate, not by asserting JSX output). What is checked is
 * the contract, never the design: nothing below has an opinion about the colour
 * of the field or the shape of the curve.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const html = readFileSync(path.join(root, "index.html"), "utf8");
const loader = readFileSync(path.join(root, "src/app/Loader.tsx"), "utf8");

describe("the boot layer's markup", () => {
  it("carries the three ids Loader.tsx and the measurement scripts look up", () => {
    for (const id of ["boot", "boot-mark", "boot-word"]) {
      expect(html).toContain(`id="${id}"`);
      expect(loader).toContain(id);
    }
  });

  it("paints before any script, so the first frame is never a blank rectangle", () => {
    // The layer must be in the document, not created by the module bundle. If
    // this ever fails the loader has been moved into React and has become the
    // thing it exists to cover for.
    const bootAt = html.indexOf('id="boot"');
    const moduleAt = html.indexOf('type="module"');
    expect(bootAt).toBeGreaterThan(-1);
    expect(moduleAt).toBeGreaterThan(-1);
    expect(bootAt).toBeLessThan(moduleAt);
  });

  it("is two panels, so the field parts from the line the mark sits on", () => {
    const panels = html.match(/class="boot-panel boot-panel--(top|bottom)"/g) ?? [];
    expect(panels).toHaveLength(2);
  });

  it("starts the rule at a real position rather than at zero", () => {
    // 0.16 is the one milestone that happens before Loader.tsx exists: the
    // document parsed. A rule that starts at zero is reporting nothing.
    expect(html).toMatch(/--boot-progress:\s*0\.16/);
  });

  it("defines the field in both themes", () => {
    expect(html).toMatch(/:root\s*\{[^}]*--boot-field:/s);
    expect(html).toMatch(/\.dark\s*\{[^}]*--boot-field:/s);
  });
});

/**
 * The property names in a `transition` shorthand, split on TOP LEVEL commas.
 *
 * A naive split on every comma tears `cubic-bezier(0.5, 0.02, 0.2, 1)` into
 * four pieces and reads "0.02" as a property name, which is how the first
 * version of this failed on a correct stylesheet.
 */
function transitionProperties(rule: string): readonly string[] {
  const body = rule.replace(/^transition:/, "").replace(/;$/, "");
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of body) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  parts.push(current);
  return parts.map((part) => part.trim().split(/\s+/)[0] ?? "").filter((name) => name !== "");
}

describe("the reveal", () => {
  it("animates only compositor properties", () => {
    // Every transition in the boot block must name transform or opacity and
    // nothing else. width, height, top, left and background on a per frame path
    // are what the 60 fps budget is lost to.
    const block = html.slice(html.indexOf("#boot {"), html.indexOf("</style>"));
    const transitions = block.match(/transition:[^;]+;/gs) ?? [];
    expect(transitions.length).toBeGreaterThan(0);
    for (const rule of transitions) {
      for (const property of transitionProperties(rule)) {
        expect(["transform", "opacity", "none"]).toContain(property);
      }
    }
  });

  it("becomes a cross fade under prefers-reduced-motion", () => {
    const block = html.slice(html.indexOf("@media (prefers-reduced-motion: reduce)"), html.indexOf("</style>"));
    // The panels stop moving and the mark stops growing.
    expect(block).toContain("transform: none");
    // The whole layer fades instead.
    expect(block).toMatch(/#boot\[data-boot="reveal"\]\s*\{\s*opacity:\s*0;/);
  });
});

describe("the two files that have to agree", () => {
  it("draws the mark at the same two sizes and the same breakpoint", () => {
    // Loader.tsx sizes the berry; index.html sizes the box the words hang off.
    // A mark wider than its box eats the gap under it.
    expect(loader).toMatch(/window\.innerWidth >= 768 \? 112 : 96/);
    expect(html).toMatch(/@media \(min-width: 768px\)\s*\{\s*\.boot-mark\s*\{\s*width:\s*112px;\s*height:\s*112px;/s);
    expect(html).toMatch(/\.boot-mark\s*\{[^}]*width:\s*96px;\s*height:\s*96px;/s);
  });

  it("gives the removal timer more room than the longest transition", () => {
    // Loader.tsx removes the layer REVEAL_MS after the reveal starts. If that
    // is shorter than the slowest transition the field is deleted mid wipe.
    const revealMs = Number(/const REVEAL_MS = (\d+);/.exec(loader)?.[1]);
    const durations = [...html.matchAll(/transition:[^;]*?(\d+)ms/gs)].map((match) => Number(match[1]));
    const boot = html.slice(html.indexOf("#boot {"), html.indexOf("@media (prefers-reduced-motion"));
    const bootDurations = [...boot.matchAll(/(\d+)ms/g)].map((match) => Number(match[1]));
    expect(durations.length).toBeGreaterThan(0);
    expect(revealMs).toBeGreaterThan(Math.max(...bootDurations));
  });
});
