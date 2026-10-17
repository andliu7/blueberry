/**
 * The front door's contract as it stands inside the site, split across the
 * site's index.html (the markup and the script that drives it) and
 * src/game/app/Loader.tsx (which reports the game's milestones and lays the live
 * Bloom over the static one). Nothing in the type system connects the two, so a
 * rename on either side would leave a loader that never finishes or a Bloom
 * that never blinks, with no compiler error anywhere. These assertions are that
 * missing edge.
 *
 * bootLoader.test.ts is the game repository's older contract (two panels, a
 * rule), red on purpose until the owner decides; see
 * documentation/BOOT-LOADER-BLOCKER.md. This file pins what is built today and
 * reads files, not a rendered page, like that one.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repo = path.resolve(__dirname, "../../..");
const html = readFileSync(path.join(repo, "index.html"), "utf8");
const loader = readFileSync(path.join(repo, "src/game/app/Loader.tsx"), "utf8");
const theme = readFileSync(path.join(repo, "src/game/theme.css"), "utf8");

/**
 * The value of a custom property in the first rule for exactly `selector` that
 * sets it. A stylesheet can open the same selector more than once.
 */
function prop(css: string, selector: ":root" | ".dark", name: string): string | undefined {
  const opener = selector === ":root" ? /^\s*:root \{/ : /^\s*\.dark \{/;
  let offset = 0;
  for (const line of css.split("\n")) {
    if (opener.test(line)) {
      const body = css.slice(offset + line.indexOf("{") + 1).split("}")[0];
      const value = body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();
      if (value !== undefined) return value;
    }
    offset += line.length + 1;
  }
  return undefined;
}

/** The property names in a `transition` value, split on top-level commas only. */
function transitionProperties(value: string): string[] {
  const names: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of value + ",") {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      names.push(current.trim().split(/\s+/)[0]);
      current = "";
    } else current += character;
  }
  return names;
}

describe("the boot layer in the site's index.html", () => {
  it("carries the ids its script and Loader.tsx look up", () => {
    for (const id of ["boot", "boot-mark", "boot-strip", "boot-word"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(loader).toContain('"boot-mark"');
  });

  it("is in the document before the module bundle, so its first frame is never blank", () => {
    const bootAt = html.indexOf('<div id="boot">');
    const moduleAt = html.indexOf('type="module"');
    expect(bootAt).toBeGreaterThan(-1);
    expect(bootAt).toBeLessThan(moduleAt);
  });

  it("is switched on by the head script, before the body is parsed", () => {
    const headEnd = html.indexOf("</head>");
    const setAt = html.indexOf("setAttribute('data-boot'");
    expect(setAt).toBeGreaterThan(-1);
    expect(setAt).toBeLessThan(headEnd);
  });

  it("speaks the same events as Loader.tsx", () => {
    expect(html).toContain("window.__blueberryBoot =");
    expect(loader).toContain("__blueberryBoot");
    expect(html).toContain("blueberry:boot-gone");
    expect(loader).toContain('"blueberry:boot-gone"');
    expect(html).toContain('class="boot-static"');
    expect(loader).toContain(".boot-static");
  });

  it("draws Bloom at the size the live Berry is portalled in at", () => {
    const small = html.match(/\.boot-stage \{[^}]*--mark:\s*(\d+)px/s)?.[1];
    const wide = html.match(/@media \(min-width: 768px\) \{ \.boot-stage \{ --mark:\s*(\d+)px/)?.[1];
    expect(small).toBeDefined();
    expect(wide).toBeDefined();
    expect(loader).toMatch(new RegExp(`innerWidth >= 768 \\? ${wide} : ${small}`));
  });

  it("is painted with the game's own ground in both themes, so the reveal changes no colour", () => {
    expect(prop(html, ":root", "--boot-top")).toBe(prop(theme, ":root", "--bb-ground-top"));
    expect(prop(html, ":root", "--boot-bottom")).toBe(prop(theme, ":root", "--bb-ground-bottom"));
    expect(prop(html, ".dark", "--boot-top")).toBe(prop(theme, ".dark", "--bb-ground-top"));
    expect(prop(html, ".dark", "--boot-bottom")).toBe(prop(theme, ".dark", "--bb-ground-bottom"));
  });

  it("lifts its ground like a curtain while Bloom, a separate child, flies to the screen underneath", () => {
    // The ground is on #boot::before, so lifting it never moves Bloom; reduced motion keeps it still.
    expect(html).toMatch(/#boot\[data-lift\]::before \{ transform: translateY\(-100%\)/);
    expect(html).toMatch(/data-motion="reduced"\] #boot\[data-lift\]::before \{ transform: none/);
    expect(html).toContain("el.setAttribute('data-lift', '')");
  });

  it("writes the wordmark one letter after another, and shows it whole under reduced motion", () => {
    const letters = html.match(/<p class="boot-name"[^]*?<\/p>/)?.[0].match(/<path pathLength="1"/g) ?? [];
    expect(letters).toHaveLength("blueberry".length);
    expect(html).toMatch(/data-motion="reduced"\] \.boot-name path \{ animation: none; fill-opacity: 1/);
  });

  it("never comes down over an empty #root, whatever the clock says", () => {
    // Round 5 let the 15 s cap reveal before React had mounted: 100, then a
    // white screen. Every reveal now waits on shown(), which needs visible text
    // in #root and the route's ready report (or 30 s, for an error page).
    expect(html).toContain("if (!force && !shown())");
    const shown = html.slice(html.indexOf("function shown()"), html.indexOf("function shown()") + 200);
    expect(shown).toContain("!painted()");
    expect(shown).toContain("got.ready");
  });

  it("keeps the app behind it out of reach while it is up", () => {
    expect(html).toContain("root.inert = true");
    expect(html).toContain("root.setAttribute('aria-hidden', 'true')");
  });

  it("animates transform and opacity only", () => {
    const style = html.slice(html.indexOf("--boot-top"), html.indexOf("</style>", html.indexOf("--boot-top")));
    for (const rule of style.match(/transition:[^;}]+/g) ?? []) {
      for (const name of transitionProperties(rule.replace("transition:", ""))) expect(["transform", "opacity", "none"]).toContain(name);
    }
  });
});
