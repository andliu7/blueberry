/**
 * NOTHING IN THE LANDSCAPE IS DARKER THAN THE LAND.
 *
 * THE BUG THIS EXISTS FOR. `.path-ridge` was rendered by PathScene as a bare
 * `<path>` and had no rule anywhere in pathway.css. An SVG shape with no
 * `fill` declared takes the SVG initial value, which is BLACK, so the far
 * hill silhouette painted pure #000000 over a third of the phone screen.
 * Measured on the built page before the fix: 8.11 percent of the scene at
 * scroll 0 and 5.68 percent at scroll 1000 were pixels with every channel
 * under 12, against zero such pixels in either adopted reference
 * (docs/reference/design-goals/units/unit01-path.jpg and unit02-path.jpg,
 * whose landscapes bottom out at mid-tan).
 *
 * WHY A SOURCE TEST AND NOT A SCREENSHOT. A screenshot test would catch this
 * one instance and would depend on a browser, a seed and a scroll position.
 * The DEFECT CLASS is narrower and fully decidable from the source: a scene
 * shape whose class carries no `fill` declaration falls through to an initial
 * value nobody chose. So this asserts two things, and the first is the one
 * that would have caught the bug on the day it was written:
 *
 *   1. EVERY class PathScene puts on an SVG shape has an explicit `fill` in
 *      pathway.css. A missing rule is the failure, not a dark colour.
 *   2. EVERY fill those classes resolve to is inside the terrace family's own
 *      range. "What the terrace family allows" is stated as a number below
 *      rather than left to taste.
 *
 * Both themes, because the night ramp is a ramp too and an unset fill is
 * black at night as well.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PATHWAY = path.resolve(__dirname, "../tabs/pathway");
const CSS = readFileSync(path.join(PATHWAY, "pathway.css"), "utf8");
const THEME = readFileSync(path.resolve(__dirname, "../theme.css"), "utf8");
const SCENE = readFileSync(path.join(PATHWAY, "PathScene.tsx"), "utf8");

/** The SVG elements that paint a fill. `g` and `line` never do. */
const SHAPES = ["path", "circle", "ellipse", "rect", "polygon", "text"];

/**
 * Every `className="path-..."` PathScene puts on one of those elements, and
 * whether that same element also carries a `fill=` ATTRIBUTE.
 *
 * Read off the source rather than listed by hand, so a prop added next round
 * is covered the moment it is drawn instead of the moment somebody remembers
 * this file. The attribute matters because it is the other honest way to say
 * what a shape paints: the lens circles carry `fill="url(#...)"` inline, and
 * an inline fill is a chosen fill even though no rule mentions it.
 */
function sceneShapes(source: string): ReadonlyMap<string, boolean> {
  const found = new Map<string, boolean>();
  for (const shape of SHAPES) {
    // `<path ... className="path-terrace" ...` up to the end of the opening tag.
    const tag = new RegExp(`<${shape}\\b([^>]*)>`, "gs");
    for (const match of source.matchAll(tag)) {
      const attributes = match[1]!;
      const classAt = attributes.match(/className=\{?"([^"{]+)"/);
      if (classAt === null) continue;
      const inline = /\bfill=/.test(attributes);
      for (const name of classAt[1]!.trim().split(/\s+/)) {
        if (!name.startsWith("path-")) continue;
        found.set(name, (found.get(name) ?? false) || inline);
      }
    }
  }
  return found;
}

/** Declarations inside the rule for exactly this class selector. */
function ruleFor(css: string, className: string): string | null {
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const bodies: string[] = [];
  for (const block of blocks) {
    const selectors = block[1]!.split(",").map((s) => s.trim());
    // The plain class, or the class qualified by a state or a theme, but never
    // a DESCENDANT of it: `.path-mark__atom` inside `.path-mark` is its own
    // shape and gets its own row in the list above.
    if (selectors.some((s) => new RegExp(`(^|[\\s>])\\.${className}([.:\\[][^\\s>]*)?$`).test(s))) {
      bodies.push(block[2]!);
    }
  }
  return bodies.length === 0 ? null : bodies.join(";");
}

function declaration(body: string, property: string): string | null {
  const hits = [...body.matchAll(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "g"))];
  return hits.length === 0 ? null : hits[hits.length - 1]![1]!.trim();
}

/** The token table of one theme block, `--name` to its literal value. */
function tokens(css: string, opener: RegExp): Map<string, string> {
  const at = css.search(opener);
  if (at === -1) throw new Error(`no block matching ${opener}`);
  // From the opening brace to its matching close, counting depth.
  const start = css.indexOf("{", at);
  let depth = 0;
  let end = start;
  for (let i = start; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const table = new Map<string, string>();
  for (const match of css.slice(start, end).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    table.set(match[1]!, match[2]!.trim());
  }
  return table;
}

/** Resolve `var(--a, fallback)` chains down to a literal, or null. */
function resolve(value: string, table: Map<string, string>, depth = 0): string | null {
  const trimmed = value.trim();
  if (depth > 8) return null;
  const varMatch = trimmed.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/);
  if (varMatch === null) return trimmed;
  const named = table.get(varMatch[1]!);
  if (named !== undefined) return resolve(named, table, depth + 1);
  return varMatch[2] === undefined ? null : resolve(varMatch[2], table, depth + 1);
}

function rgb(colour: string): readonly [number, number, number] | null {
  const hex = colour.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex !== null) {
    const h = hex[1]!;
    const wide = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
    return [0, 2, 4].map((i) => parseInt(wide.slice(i, i + 2), 16)) as unknown as [number, number, number];
  }
  const fn = colour.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (fn === null) return null;
  const parts = fn[1]!.split(/[\s,/]+/).filter((p) => p !== "").map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((n) => Number.isNaN(n))) return null;
  return [parts[0]!, parts[1]!, parts[2]!];
}

/** WCAG relative luminance, the same arithmetic the contrast audit uses. */
function luminance([r, g, b]: readonly [number, number, number]): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/**
 * HOW MUCH DARKER THAN THE GROUND A LANDSCAPE FILL MAY BE, derived from the
 * terrace family itself rather than typed in.
 *
 * The ceiling is the whole declared ramp, --path-terrace-0 to
 * --path-terrace-3, plus ONE MORE PLATE of the same size, which is the far
 * ridge's slot. Written as an expression over the tokens so that moving the
 * ramp moves the ceiling with it and neither can drift: a round that
 * lightens the plates automatically tightens this, which is the direction a
 * derived bar should move.
 *
 * It is deliberately NOT a floor on legibility. These are decorative plates
 * and watermarks; the marks that carry meaning (chips, trail, gate, track
 * map) keep their WCAG floors and the contrast audit measures those. This is
 * a CEILING on darkness, which is the property both references have
 * (nothing in either is darker than mid-tan) and the build had lost.
 *
 * A margin of one percent is allowed on the comparison and nothing more, so
 * a value rounded to a hex triplet is not a failure. An unset fill is black,
 * which is 17.9:1 on the light ground: a mistake fails this by an order of
 * magnitude, never by a hair.
 */
function terraceCeiling(table: Map<string, string>): number {
  const step = (token: string) => {
    const literal = resolve(`var(${token})`, table);
    const colour = literal === null ? null : rgb(literal);
    if (colour === null) throw new Error(`${token} does not resolve to a colour`);
    return colour;
  };
  const ground = step("--path-terrace-0");
  const deepest = step("--path-terrace-3");
  const penultimate = step("--path-terrace-2");
  // The ramp, times one more plate of the same size.
  return contrast(deepest, ground) * contrast(deepest, penultimate) * 1.01;
}

/** A fill that paints no colour at all. Neither dark nor light: absent. */
const UNPAINTED = new Set(["none", "transparent", "currentcolor", "inherit"]);

/**
 * THE LAND: the plates, the hills, the ground, and the watermarks drawn ON
 * them. These carry the terrace ceiling, because they ARE the terrace family
 * or a wash over it.
 *
 * Named rather than filtered, because a list a reader can check is worth more
 * than a clever rule, and because the boundary of this list is the whole
 * argument. The chips, the trail and the gate arch are not here: they are
 * controls, they are held to WCAG floors by the contrast audit, and holding
 * them to a darkness CEILING as well would be nonsense.
 */
/* "path-mark" and "path-mark__atom" were here until 2026-09-05. The owner
   removed the molecule watermarks and MoleculeMark went with them, so those
   two names no longer match any shape the scene draws. They are dropped rather
   than left in place: offendersIn only reports a class it finds in the table,
   so a name for a deleted shape is silently vacuous, and this list is
   deliberately one "a reader can check". A list with dead names in it cannot
   be checked. Nothing was loosened by their going: the ceiling, the ground and
   every surviving shape are unchanged. */
const LAND = ["path-terrace", "path-ridge", "path-hump", "path-ground", "path-prop"];

/**
 * THINGS STANDING ON THE LAND: a cloud, a boulder. They are objects rather
 * than ground, and the adopted designs draw them darker than any plate: a
 * reference boulder samples at #a5a5a4 on an #e1d9ca ground, which is 1.76:1
 * (measurements/_probe-ref-boulder.mjs). So they get their own ceiling, taken
 * from that measurement plus a quarter of margin.
 *
 * It is a real bar and not an escape hatch. 2.2 still fails the SVG initial
 * black by a factor of eight on the light ground, which is the defect this
 * file exists for, and it is the reference's own worst case rather than a
 * number chosen to let something through.
 */
const OBJECTS = ["path-cloud", "path-boulder", "path-boulder--far"];
const OBJECT_CEILING = 2.2;

/**
 * Objects are measured against --path-terrace-3, the DEEPEST plate, and the
 * land is measured against --path-terrace-0, the lightest.
 *
 * Not a convenience: it is where each thing sits. A plate's job is to be a
 * step down from the top of the ramp, so the top of the ramp is what bounds
 * it. An object stands on the near ground at the bottom of a band, which is
 * the deep plate, and the reference's 1.76:1 boulder was itself sampled
 * against the ground immediately beside it (#a5a5a4 on #e1d9ca) rather than
 * against the palest thing on the page. Measuring an object against a plate
 * it never touches would be comparing it to the wrong surface.
 */
const OBJECT_GROUND = "--path-terrace-3";

/**
 * The token table for one theme. Both stylesheets, because the landscape
 * legitimately reaches for app-wide tokens (`.path-mark__atom` knocks a hole
 * in the ground with `var(--bb-background)`), and a table that could not see
 * theme.css would report those as unresolvable and be noise rather than a
 * gate.
 */
function themeTable(opener: RegExp): Map<string, string> {
  return new Map([...tokens(THEME, opener), ...tokens(CSS, opener)]);
}

describe("the pathway landscape's paint", () => {
  const shapes = sceneShapes(SCENE);

  it("draws at least the plates, the ridge, the props and the clouds", () => {
    // A sanity anchor: if the scrape returns nothing the two tests below pass
    // vacuously, which is the one way this file could lie.
    expect(shapes.size).toBeGreaterThanOrEqual(4);
    expect([...shapes.keys()]).toContain("path-ridge");
    expect([...shapes.keys()]).toContain("path-terrace");
  });

  it("declares an explicit fill for every shape it draws, so nothing falls through to the SVG initial black", () => {
    const missing: string[] = [];
    for (const [name, inlineFill] of shapes) {
      if (inlineFill) continue;
      const body = ruleFor(CSS, name);
      if (body === null || declaration(body, "fill") === null) missing.push(name);
    }
    expect(missing.sort()).toEqual([]);
  });

  /** Every offending fill in one list of classes, against one ceiling. */
  function offendersIn(
    names: readonly string[],
    table: Map<string, string>,
    ground: readonly [number, number, number],
    ceiling: number,
  ) {
    const offenders: { name: string; fill: string; ratio: number; ceiling: number }[] = [];
    for (const name of names) {
      const body = ruleFor(CSS, name);
      if (body === null) continue;
      const declared = declaration(body, "fill");
      if (declared === null) continue;
      const literal = resolve(declared, table);
      if (literal !== null && UNPAINTED.has(literal.toLowerCase())) continue;
      const colour = literal === null ? null : rgb(literal);
      if (colour === null) {
        // An unresolvable fill is a failure, not a skip: that is exactly the
        // shape of the bug (a token that does not exist at this scope).
        offenders.push({ name, fill: declared, ratio: Number.POSITIVE_INFINITY, ceiling });
        continue;
      }
      const ratio = contrast(colour, ground);
      if (ratio > ceiling) {
        offenders.push({ name, fill: literal ?? declared, ratio: +ratio.toFixed(2), ceiling: +ceiling.toFixed(2) });
      }
    }
    return offenders;
  }

  it.each([
    ["light", /^:root\s*\{/m],
    ["dark", /^\.dark\s*\{/m],
  ])("keeps every %s LAND fill inside the terrace family", (_theme, opener) => {
    const table = themeTable(opener);
    const ground = rgb(resolve("var(--path-terrace-0)", table) ?? "");
    expect(ground).not.toBeNull();
    expect(offendersIn(LAND, table, ground!, terraceCeiling(table))).toEqual([]);
  });

  it.each([
    ["light", /^:root\s*\{/m],
    ["dark", /^\.dark\s*\{/m],
  ])("keeps every %s OBJECT standing on the land no darker than the reference's own boulder", (_theme, opener) => {
    const table = themeTable(opener);
    const ground = rgb(resolve(`var(${OBJECT_GROUND})`, table) ?? "");
    expect(ground).not.toBeNull();
    expect(offendersIn(OBJECTS, table, ground!, OBJECT_CEILING)).toEqual([]);
  });

  it("holds the black an unset fill would give against BOTH ceilings, so neither is a rubber stamp", () => {
    // The regression this file exists for, asserted as a property of the bars
    // rather than of the current stylesheet: whatever the tokens move to, the
    // SVG initial value must still fail by an order of magnitude. A ceiling
    // that stopped catching black would be a check weakened unnoticed.
    const table = themeTable(/^:root\s*\{/m);
    const light = rgb(resolve("var(--path-terrace-0)", table) ?? "")!;
    const deep = rgb(resolve(`var(${OBJECT_GROUND})`, table) ?? "")!;
    const black: readonly [number, number, number] = [0, 0, 0];
    expect(contrast(black, light)).toBeGreaterThan(terraceCeiling(table) * 5);
    expect(contrast(black, deep)).toBeGreaterThan(OBJECT_CEILING * 5);
  });
});
