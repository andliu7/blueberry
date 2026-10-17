import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The home loader under reduced motion (home round 2, critic-home-r1 "Fix the reduced-motion
 * loader"). The loader is meant to fade where it stands in 120 ms, the portfolio's reduced
 * branch (andliu-portfolio app/globals.css:457-460). It measured 3 s instead: HomePage put
 * `data-loader` on the page, and index.css's spinner rule slows every animation under a
 * `[data-loader]` to 3 s for reduced motion. HomeLoader then removed the node at 1.1 s, so a
 * reduced-motion visitor saw the page through a violet veil for a second and then a hard cut.
 *
 * Read from the source files, because the duration is decided by the cascade of three files
 * (tokens.css sets the variable, home.css uses it, index.css can override it), which a jsdom
 * render does not compute.
 */
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const noComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const tokens = read("../tokens.css");
const homeCss = noComments(read("../components/home.css"));
const loaderTsx = read("../components/HomeLoader.tsx");

/** The value of --bb-dur-wipe inside the reduced-motion block of tokens.css, in ms. */
function reducedWipeMs(): number {
  const block = tokens.match(/html\[data-motion="reduced"\]\s*\{([^}]*)\}/)?.[1] ?? "";
  const ms = block.match(/--bb-dur-wipe:\s*(\d+)ms/)?.[1];
  return Number(ms);
}

describe("home loader, reduced motion", () => {
  it("fades in 120 ms, the portfolio's reduced branch", () => {
    expect(reducedWipeMs()).toBe(120);
    expect(homeCss).toMatch(/html\[data-motion="reduced"\] \.home-loader \{ animation: home-fade var\(--bb-dur-wipe\) linear \d+ms both; \}/);
  });

  it("finishes the fade before the node is removed, so there is no hard cut", () => {
    const delay = Number(homeCss.match(/\.home-loader \{ animation: home-fade var\(--bb-dur-wipe\) linear (\d+)ms both/)?.[1]);
    const removeAt = Number(loaderTsx.match(/const REMOVE_AT_MS = (\d+);/)?.[1]);
    expect(Number.isFinite(delay) && Number.isFinite(removeAt)).toBe(true);
    expect(delay + reducedWipeMs()).toBeLessThan(removeAt);
  });

  it("is never under a [data-loader], whose reduced rule in index.css stretches animations to 3 s", () => {
    // The spinner rule still exists and is right for spinners; the home page must not opt in.
    expect(read("../index.css")).toMatch(/\[data-loader\][\s\S]{0,40}animation-duration: 3s !important/);
    for (const file of ["../components/HomePage.tsx", "../components/HomeLoader.tsx"]) {
      expect(noComments(read(file)), file).not.toMatch(/data-loader/);
    }
  });
});
