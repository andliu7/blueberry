/**
 * The shared back disc (owner, 20 Oct, queue item 24: "add a faint circle
 * around it so even if there is an image at the top or something, it's
 * clear"). One class in theme.css, worn by every game back button. Nothing in
 * the type system ties a className to a stylesheet, so a renamed class or a
 * back button that drops it would fail silently; these assertions are that
 * edge. Reads files, not a rendered page, like bootFrontDoor.test.ts.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const game = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(game, rel), "utf8");

// Each back button, by the file it lives in and a snippet unique to its tag.
const BACK_BUTTONS: ReadonlyArray<readonly [string, string]> = [
  ["guide/UnitGuide.tsx", 'aria-label="Back to the path"'],
  ["pathway-sheet/Guidebook.tsx", 'aria-label="Back"'],
  ["onboarding/Frame.tsx", 'className="ob-back'],
  ["cards/ui/DeckScreen.tsx", 'aria-label="Back to your decks"'],
  ["cards/ui/ComposeScreen.tsx", 'aria-label="Back to your decks"'],
  ["glossary/GlossaryPage.tsx", 'className="gl-back'],
];

// WCAG relative luminance and contrast, the same formula as
// measurements/contrast-audit.mjs (not imported: that file launches a browser).
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Lay `top` at `pct`% opacity over `under`, channel by channel in sRGB, as
// color-mix(in srgb, top pct%, transparent) composites over a solid pixel.
const over = (top: string, pct: number, under: string) =>
  "#" +
  [1, 3, 5]
    .map((i) => {
      const t = parseInt(top.slice(i, i + 2), 16);
      const u = parseInt(under.slice(i, i + 2), 16);
      return Math.round((t * pct) / 100 + (u * (100 - pct)) / 100)
        .toString(16)
        .padStart(2, "0");
    })
    .join("");

describe("back disc", () => {
  it("is defined once in theme.css as a layer under the icon", () => {
    const css = read("theme.css");
    expect(css.match(/^\.bb-back-disc \{/gm)).toHaveLength(1);
    expect(css).toMatch(/\.bb-back-disc::before \{[^}]*z-index: -1;[^}]*\}/);
    expect(css).toMatch(/\.bb-back-disc \{[^}]*isolation: isolate;[^}]*\}/);
  });

  it.each(BACK_BUTTONS)("%s wears the shared class", (file, marker) => {
    const src = read(file);
    const at = src.indexOf(marker);
    expect(at).toBeGreaterThan(-1);
    // The opening <button ...> tag around the marker.
    const open = src.lastIndexOf("<button", at);
    const close = src.indexOf(">", at);
    expect(src.slice(open, close)).toContain("bb-back-disc");
  });

  // The browser audit composites translucent layers only down to the flat page
  // behind them and says it cannot see images, so this is the image case. A
  // blur cannot make a solid region worse than pure black or pure white, so
  // those two are the worst images the disc can sit on. 3:1 is the WCAG 1.4.11
  // floor for an icon.
  it("icon ink clears 3:1 on the disc over black and white images, both themes", () => {
    const css = read("theme.css");
    const pct = Number(css.match(/color-mix\(in srgb, var\(--bb-card\) (\d+)%/)![1]);
    const light = css.match(/^:root \{[^}]*--bb-card:[^}]*\}/m)![0];
    const dark = css.match(/^\.dark \{[^}]*\}/m)![0];
    const token = (block: string, name: string) =>
      block.match(new RegExp(`${name}: (#[0-9a-f]{6});`))![1];
    for (const block of [light, dark]) {
      const card = token(block, "--bb-card");
      for (const ink of ["--bb-foreground", "--bb-muted-foreground"]) {
        for (const image of ["#000000", "#ffffff"]) {
          expect(contrast(token(block, ink), over(card, pct, image))).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});
