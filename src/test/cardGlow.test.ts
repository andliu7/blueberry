import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GLOW_CARDS } from "@/lib/cardGlow";

/**
 * The card glow (owner, 15 Oct, option A) lives in two files: the JS that writes the
 * pointer position (src/lib/cardGlow.ts) and the CSS that draws it (site-shell.css).
 * If the two lists drift, a card either never glows or glows stuck at its centre.
 */
const css = readFileSync(new URL("../components/ui/site-shell.css", import.meta.url), "utf8");
const names = (list: string) => list.split(",").map((s) => s.trim()).sort();

describe("card glow", () => {
  it("draws the glow on exactly the cards the listener feeds", () => {
    const m = css.match(/:is\(([^)]*)\):hover\s*\{\s*background-image/);
    expect(m).not.toBeNull();
    expect(names(m![1])).toEqual(names(GLOW_CARDS));
  });

  it("is mouse only and off under Reduce motion", () => {
    const at = css.indexOf(":is(.bb-glow");
    const before = css.slice(0, at);
    expect(before.lastIndexOf("@media (hover: hover) and (pointer: fine)")).toBeGreaterThan(-1);
    expect(css.slice(at - 60, at)).toContain('html:not([data-motion="reduced"])');
  });

  it("paints the face as a background image, under the card's text", () => {
    expect(css).toMatch(/:is\(\.bb-glow[^)]*\):hover\s*\{\s*background-image:\s*radial-gradient/);
  });

  // Round 2: the visible part is a rim on the border, drawn by one ::after. It must be masked
  // down to a 3px ring (content box punched out), or it would cover the card's text.
  it("draws the rim on exactly the same cards, masked to a ring that cannot cover text", () => {
    const m = css.match(/:is\(([^)]*)\)::after\s*\{([^}]*)\}/);
    expect(m).not.toBeNull();
    expect(names(m![1])).toEqual(names(GLOW_CARDS));
    expect(m![2]).toContain("pointer-events: none");
    expect(m![2]).toContain("padding: 3px");
    expect(m![2]).toMatch(/mask:\s*linear-gradient\(#000 0 0\) content-box/);
    expect(m![2]).toContain("mask-composite: exclude");
  });

  it("gives every glowing card a containing block without overriding its own position", () => {
    const m = css.match(/@layer base\s*\{\s*:where\(([^)]*)\)\s*\{\s*position: relative/);
    expect(m).not.toBeNull();
    expect(names(m![1])).toEqual(names(GLOW_CARDS));
  });
});
