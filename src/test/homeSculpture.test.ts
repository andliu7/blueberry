import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The home liquid-sculpture section (owner, 15 Oct). Read from source like homeDemo.test.ts:
 * the suite runs without a DOM, and what matters here is which code is allowed to load where.
 */
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const home = read("../components/HomePage.tsx");
const sculpture = read("../components/HomeSculpture.tsx");

describe("home sculpture", () => {
  it("stays out of the entry bundle: home loads it only through React.lazy", () => {
    expect(home).toMatch(/lazy\(\(\) => import\("@\/components\/HomeSculpture"\)\)/);
    expect(home).not.toMatch(/^import .*HomeSculpture/m);
  });

  it("loads the WebGL engine only through React.lazy", () => {
    expect(sculpture).toMatch(/lazy\(\(\) => import\("@\/components\/ui\/liquid-sculpture-hero"\)\)/);
    expect(sculpture).not.toMatch(/^import .*liquid-sculpture-hero/m);
  });

  it("mounts the engine only from 1024px, with a fine pointer, and motion allowed", () => {
    expect(sculpture).toContain(
      'const ENGINE_QUERY = "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)"',
    );
    expect(sculpture).toMatch(/if \(!engine\) return still;/);
  });

  it("gives the still version a heading and no canvas", () => {
    const still = sculpture.slice(sculpture.indexOf("function SculptureStill"));
    expect(still).toMatch(/<h2\b/);
    expect(still).not.toMatch(/canvas|SculptureHero/);
  });

  it("keeps the engine's small text at full opacity in --site-quiet (WCAG AA)", () => {
    expect(sculpture).toContain(
      ".home-sculpture-hero .sh-eyebrow,.home-sculpture-hero .sh-hint,.home-sculpture-hero .sh-credit{color:var(--site-quiet);opacity:1}",
    );
  });

  it("aligns both branches to the 72rem band the other home sections use", () => {
    expect(sculpture).toContain('const BAND = "max(24px, calc((100% - 72rem) / 2 + 24px))"');
    expect(sculpture).toMatch(/max-w-6xl[^"]*min-\[900px\]:px-6/);
    expect(read("./../components/home-sections.css")).toMatch(/\.home-proof \{ max-width: 72rem;/);
  });

  it("ships every image it names", () => {
    for (const f of ["sculpture-light", "sculpture-dark", "sculpture-mobile-light", "sculpture-mobile-dark"]) {
      expect(sculpture).toContain(`hero/${f}.webp`);
      expect(statSync(new URL(`../../public/hero/${f}.webp`, import.meta.url)).size).toBeGreaterThan(0);
    }
  });
});
