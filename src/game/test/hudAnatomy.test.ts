/**
 * The header HUD's anatomy and its streak states, read from the files that
 * draw them.
 *
 * WHY THIS EXISTS. Two critics in a row measured the three header cells as
 * three components: marks at 20, 32 and 20 px, then 20, 24 and 20; edges at
 * 1, 1 and 2 px; two grounds. Each round fixed what it was shown and the next
 * one found the rest, because nothing held the anatomy still. These do. They
 * READ hud.css, Hud.tsx and theme.css rather than restating their values, the
 * same way cardsContrast.test.ts does, because a copy of a stylesheet drifts.
 *
 * The flame's four states are rendered through react-dom/server, which is the
 * one DOM-free way to see what FlameMark actually draws.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChargeMark, DiamondMark, FlameMark } from "../app/ui/HudIcons";
import type { StreakState } from "../app/ui/hudModel";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const HUD_CSS = read("../app/ui/hud.css");
const HUD_TSX = read("../app/ui/Hud.tsx");
const THEME = read("../theme.css");

/** Every rule in `css` whose selector list mentions `needle`, comments stripped. */
function rules(css: string, needle: string): { selector: string; body: string }[] {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: { selector: string; body: string }[] = [];
  for (const match of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (match[1] ?? "").trim();
    if (selector.includes(needle)) found.push({ selector, body: match[2] ?? "" });
  }
  return found;
}

/** The properties a rule body declares, as names. */
const props = (body: string) => [...body.matchAll(/(^|;)\s*([-a-z]+)\s*:/g)].map((m) => m[2]);

describe("the header cells are one anatomy", () => {
  it("declares the cell once, with no frame and no ground of its own", () => {
    const base = rules(HUD_CSS, ".hud-item").find((r) => r.selector === ".hud-item");
    expect(base).toBeDefined();
    expect(base?.body).toMatch(/border:\s*0\s*;/);
    expect(base?.body).toMatch(/background:\s*transparent\s*;/);
  });

  it("lets no other rule give a cell a frame, a ground, a gap or a padding, except as state", () => {
    const STATE = /:(hover|focus-visible|active)\b/;
    for (const rule of rules(HUD_CSS, ".hud-item")) {
      if (rule.selector === ".hud-item" || STATE.test(rule.selector)) continue;
      const moved = props(rule.body).filter((p) => /^(border|background|gap|padding|width|height|min-)/.test(p ?? ""));
      expect(moved, rule.selector).toEqual([]);
    }
    // The state rules may paint a ground; they may not change the geometry.
    for (const rule of rules(HUD_CSS, ".hud-item").filter((r) => STATE.test(r.selector))) {
      expect(props(rule.body).filter((p) => /^(gap|padding|width|height|border)/.test(p ?? "")), rule.selector).toEqual([]);
    }
  });

  it("moves only the number on the rank ladder, never the mark", () => {
    const lead = rules(HUD_CSS, '[data-rank="lead"]');
    expect(lead.length).toBe(1);
    expect(props(lead[0]?.body ?? "").sort()).toEqual(["--hud-value-size", "--hud-value-weight"]);
  });

  it("draws every mark at one fixed square size, set in one place", () => {
    const marks = rules(HUD_CSS, ".hud-mark");
    expect(marks.map((r) => r.selector)).toEqual([".hud-mark"]);
    const body = marks[0]?.body ?? "";
    const width = body.match(/width:\s*([^;]+);/)?.[1]?.trim();
    const height = body.match(/height:\s*([^;]+);/)?.[1]?.trim();
    expect(width).toBe("1.5rem");
    expect(height).toBe(width);
    expect(body).toMatch(/flex:\s*none/);
  });

  it("renders three buttons through one component, with no per-cell class or size", () => {
    expect(HUD_TSX.match(/<HudButton\b/g)?.length).toBe(3);
    // Every mark in the header row carries exactly the shared class, and no
    // Tailwind size of its own (the way the 20/32/20 split started).
    const row = HUD_TSX.slice(HUD_TSX.indexOf("export function Hud()"), HUD_TSX.indexOf("function HudSheet("));
    const reading = HUD_TSX.slice(HUD_TSX.indexOf("function ChargeReading("), HUD_TSX.indexOf("export function Hud()"));
    const marks = [...(row + reading).matchAll(/<(DiamondMark|FlameMark|ChargeMark)\b[\s\S]*?\/>/g)].map((m) => m[0]);
    expect(marks.length).toBe(3);
    for (const mark of marks) {
      expect(mark).toMatch(/hud-mark/);
      expect(mark).not.toMatch(/\b[hw]-\d/);
    }
    const button = HUD_TSX.slice(HUD_TSX.indexOf("function HudButton("), HUD_TSX.indexOf("function ChargeReading("));
    expect(button).not.toMatch(/className=\{/);
    expect(button).toMatch(/min-h-11 min-w-11/);
  });
});

describe("the row reads in the bar's order", () => {
  it("renders the streak first, then diamonds, then charge", () => {
    const row = HUD_TSX.slice(HUD_TSX.indexOf("export function Hud()"), HUD_TSX.indexOf("function HudSheet("));
    const order = [...row.matchAll(/<HudButton id="(\w+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["streak", "diamonds", "charge"]);
  });

  it("writes the streak state onto the button, so the DOM says which one is drawn", () => {
    expect(HUD_TSX).toMatch(/data-streak=\{streak\}/);
    expect(HUD_TSX).toMatch(/<HudButton id="streak"[^>]*streak=\{streak\.state\}/);
  });
});

/* ---------------------------------------------------------- the raster ---- */
/*
 * A small software rasteriser for the HUD's own SVG, so the tests below can
 * measure what a critic measured from pixels: how much of its box each mark
 * inks, and how dark it reads in grayscale. It knows exactly what the HUD
 * marks use (absolute and relative M L H V C Z paths, circles, one clip rect
 * per mark, fill, stroke, fill-opacity) and throws on anything else, so a mark
 * drawn with a command it cannot read fails loudly instead of measuring zero.
 */
type Pt = readonly [number, number];

function flatten(d: string): Pt[][] {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const polys: Pt[][] = [];
  let poly: Pt[] = [];
  let at: Pt = [0, 0];
  let start: Pt = [0, 0];
  let cmd = "";
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i] ?? "")) cmd = tokens[i++] ?? "";
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? at[0] : 0;
    const oy = rel ? at[1] : 0;
    switch (cmd.toUpperCase()) {
      case "M":
        if (poly.length > 0) polys.push(poly);
        at = start = [num() + ox, num() + oy];
        poly = [at];
        cmd = rel ? "l" : "L";
        break;
      case "L":
        at = [num() + ox, num() + oy];
        poly.push(at);
        break;
      case "H":
        at = [num() + ox, at[1]];
        poly.push(at);
        break;
      case "V":
        at = [at[0], num() + oy];
        poly.push(at);
        break;
      case "C": {
        const p0 = at;
        const p1: Pt = [num() + ox, num() + oy];
        const p2: Pt = [num() + ox, num() + oy];
        const p3: Pt = [num() + ox, num() + oy];
        for (let s = 1; s <= 16; s += 1) {
          const t = s / 16;
          const u = 1 - t;
          poly.push([
            u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
          ]);
        }
        at = p3;
        break;
      }
      case "Z":
        poly.push(start);
        at = start;
        break;
      default:
        throw new Error(`the raster cannot read path command ${cmd} in ${d}`);
    }
  }
  if (poly.length > 0) polys.push(poly);
  return polys;
}

function insideEvenOdd(polys: Pt[][], x: number, y: number): boolean {
  let inside = false;
  for (const poly of polys) {
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a, a += 1) {
      const [xa, ya] = poly[a] as Pt;
      const [xb, yb] = poly[b] as Pt;
      if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
    }
  }
  return inside;
}

function distance(polys: Pt[][], x: number, y: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const poly of polys) {
    for (let a = 1; a < poly.length; a += 1) {
      const [x1, y1] = poly[a - 1] as Pt;
      const [x2, y2] = poly[a] as Pt;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = dx * dx + dy * dy;
      const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len));
      best = Math.min(best, Math.hypot(x - x1 - t * dx, y - y1 - t * dy));
    }
  }
  return best;
}

/** The declarations of the first rule whose selector is exactly `selector` and declares `probe`. */
function block(css: string, selector: string, probe: string): Map<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const match of css.matchAll(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`, "g"))) {
    const body = (match[2] ?? "").replace(/\/\*[\s\S]*?\*\//g, "");
    if (!body.includes(probe)) continue;
    return new Map([...body.matchAll(/(--[-a-z0-9]+)\s*:\s*([^;]+);/g)].map((m) => [m[1] ?? "", (m[2] ?? "").trim()]));
  }
  throw new Error(`no ${selector} block declaring ${probe}`);
}

/** A theme as the browser would resolve it inside a header cell: theme.css, then hud.css's cell tokens over it. */
function palette(dark: boolean): (value: string) => string {
  const light = new Map([...block(THEME, ":root", "--bb-card:"), ...block(HUD_CSS, ".hud-item", "--hud-ink-streak")]);
  const tokens = dark
    ? new Map([...light, ...block(THEME, ".dark", "--bb-card:"), ...block(HUD_CSS, ".dark .hud-item", "--hud-ink-streak")])
    : light;
  const resolve = (value: string): string => {
    const v = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
    if (v === "#ffffff" || v === "#000000") return v;
    const call = v.match(/^var\(\s*(--[-a-z0-9]+)\s*(?:,\s*(.+))?\)$/);
    if (call === null) throw new Error(`cannot resolve colour ${v}`);
    const own = tokens.get(call[1] ?? "");
    if (own !== undefined) return resolve(own);
    if (call[2] !== undefined) return resolve(call[2]);
    throw new Error(`no token ${call[1]}`);
  };
  return resolve;
}

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]: readonly number[]) => 0.2126 * lin(r ?? 0) + 0.7152 * lin(g ?? 0) + 0.0722 * lin(b ?? 0);

interface Raster {
  /** Share of the 24 unit box that is not the ground. */
  readonly coverage: number;
  /** Mean relative luminance over the box, ground included: the grayscale tone. */
  readonly tone: number;
  /** Mean luminance distance from the ground: how heavy the mark reads in grayscale. */
  readonly mass: number;
}

/** Paints `markup` (one HUD mark) on the header ground at 0.25 unit pitch. */
function raster(markup: string, dark: boolean): Raster {
  const colour = palette(dark);
  const ground = rgb(colour("var(--bb-card)"));
  type Shape = { polys?: Pt[][]; circle?: [number, number, number]; fill: string | null; opacity: number; stroke: string | null; width: number; clipY: number };
  const shapes: Shape[] = [];
  const clips = new Map<string, number>();
  let inClip: string | null = null;
  let activeClip = 0;
  for (const tag of markup.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)\/?>/g)) {
    const [, closing, name, attrText] = tag;
    const attr = (key: string) => (attrText ?? "").match(new RegExp(`\\s${key}="([^"]*)"`))?.[1];
    if (name === "clipPath") inClip = closing ? null : (attr("id") ?? null);
    else if (name === "rect" && !closing && inClip !== null) clips.set(inClip, Number(attr("y")));
    else if (name === "g") activeClip = closing ? 0 : (clips.get(attr("clip-path")?.match(/#([^)]+)/)?.[1] ?? "") ?? 0);
    else if ((name === "path" || name === "circle") && !closing && inClip === null) {
      const fill = attr("fill") ?? "#000000";
      shapes.push({
        polys: name === "path" ? flatten(attr("d") ?? "") : undefined,
        circle: name === "circle" ? [Number(attr("cx")), Number(attr("cy")), Number(attr("r"))] : undefined,
        fill: fill === "none" ? null : colour(fill),
        opacity: Number(attr("fill-opacity") ?? 1),
        stroke: attr("stroke") === undefined ? null : colour(attr("stroke") as string),
        width: Number(attr("stroke-width") ?? 0),
        clipY: activeClip,
      });
    }
  }
  const groundLum = lum(ground);
  let inked = 0;
  let tone = 0;
  let mass = 0;
  let n = 0;
  for (let y = 0.125; y < 24; y += 0.25) {
    for (let x = 0.125; x < 24; x += 0.25) {
      let px: number[] = [...ground];
      for (const s of shapes) {
        if (y < s.clipY) continue;
        const inside = s.polys !== undefined ? insideEvenOdd(s.polys, x, y) : Math.hypot(x - (s.circle?.[0] ?? 0), y - (s.circle?.[1] ?? 0)) <= (s.circle?.[2] ?? 0);
        if (inside && s.fill !== null) px = rgb(s.fill).map((c, k) => c * s.opacity + (px[k] ?? 0) * (1 - s.opacity));
        if (s.stroke !== null && s.width > 0) {
          const d = s.polys !== undefined ? distance(s.polys, x, y) : Math.abs(Math.hypot(x - (s.circle?.[0] ?? 0), y - (s.circle?.[1] ?? 0)) - (s.circle?.[2] ?? 0));
          if (d <= s.width / 2) px = rgb(s.stroke);
        }
      }
      const l = lum(px);
      if (px.some((c, k) => Math.abs(c - (ground[k] ?? 0)) > 1e-6)) inked += 1;
      tone += l;
      mass += Math.abs(l - groundLum);
      n += 1;
    }
  }
  return { coverage: inked / n, tone: tone / n, mass: mass / n };
}

const STATES = ["zero", "pending", "atRisk", "live"] as const;
const flame = (state: StreakState, fill = state === "live" ? 1 : 0) =>
  renderToStaticMarkup(createElement(FlameMark, { lit: state === "live", fill, state }));
const diamond = () => renderToStaticMarkup(createElement(DiamondMark, {}));
const battery = () => renderToStaticMarkup(createElement(ChargeMark, { fill: 1 }));

describe("the marks share their box fairly", () => {
  // The critic's measure: inked area over the 24 unit box. The live flame
  // inked 32 percent against the diamond's 45 and the battery's 41, so it was
  // the lightest mark in the row it is meant to lead.
  it("inks at least 40 percent of the box with the live flame", () => {
    expect(raster(flame("live"), false).coverage).toBeGreaterThanOrEqual(0.4);
  });

  it("gives the live flame at least as much ink as either neighbour", () => {
    const live = raster(flame("live"), false).coverage;
    expect(live).toBeGreaterThanOrEqual(raster(diamond(), false).coverage);
    expect(live).toBeGreaterThanOrEqual(raster(battery(), false).coverage);
  });
});

describe("the streak flame draws its state as a shape", () => {
  it("draws no run as a grey outline, with no core and no clock", () => {
    const svg = flame("zero");
    expect(svg).toMatch(/fill="none" stroke="var\(--hud-out\)"/);
    expect(svg).not.toMatch(/data-flame-clock/);
  });

  it("draws a waiting run as an orange outline with its core lit", () => {
    const svg = flame("pending");
    expect(svg).toMatch(/fill="none" stroke="var\(--streak\)"/);
    expect(svg).toMatch(/class="hud-flame-core"[^>]*fill="var\(--streak\)"/);
    expect(svg).not.toMatch(/stroke-dasharray|data-flame-clock/);
  });

  it("breaks the outline and adds the clock in the evening, both static", () => {
    const svg = flame("atRisk");
    expect(svg).toMatch(/stroke-dasharray/);
    expect(svg).toMatch(/data-flame-clock/);
    // The clock is at least 11 units across, larger than round one's 10.5.
    const r = Number(svg.match(/<circle[^>]*r="([\d.]+)"/)?.[1]);
    expect(2 * r).toBeGreaterThanOrEqual(11);
    for (const state of ["zero", "pending", "live"] as const) expect(flame(state)).not.toMatch(/data-flame-clock/);
  });

  it("draws four different pictures for the four states", () => {
    const pictures = new Set(STATES.map((s) => flame(s).replace(/hud-flame-[a-zA-Z0-9]+/g, "id")));
    expect(pictures.size).toBe(4);
  });

  it.each([false, true])("makes the counted day the heaviest flame in grayscale (dark: %s)", (dark) => {
    // A critic measured the old solid grey pending flame DARKER than live in
    // light grayscale, so the counted day looked quieter than the uncounted.
    const [zero, pending, atRisk, live] = STATES.map((s) => raster(flame(s), dark));
    expect(live?.mass).toBeGreaterThan(pending?.mass ?? 1);
    expect(live?.mass).toBeGreaterThan(atRisk?.mass ?? 1);
    expect(pending?.mass).toBeGreaterThan(zero?.mass ?? 1);
    if (!dark) expect(live?.tone).toBeLessThan(pending?.tone ?? 0);
  });

  it.each([false, true])("lets the live flame outweigh both neighbours in grayscale (dark: %s)", (dark) => {
    const live = raster(flame("live"), dark).mass;
    expect(live).toBeGreaterThan(raster(diamond(), dark).mass);
    expect(live).toBeGreaterThan(raster(battery(), dark).mass);
  });

  it("leaves the flame's other callers exactly the two state drawing they had", () => {
    const plain = renderToStaticMarkup(createElement(FlameMark, { lit: false }));
    expect(plain).toMatch(/fill="#ffffff" fill-opacity="0.42"/);
    expect(plain).not.toMatch(/data-flame-clock|stroke=/);
  });

  it("greys the number only when there is no run, and leans only at risk", () => {
    expect(HUD_TSX).toMatch(/streak\.state === "zero" \? "text-bb-muted-foreground" : "hud-ink-streak"/);
    expect(HUD_TSX).toMatch(/streak\.state === "atRisk" \? "hud-flame-risk"/);
    expect(rules(HUD_CSS, ".hud-flame-risk").length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------ contrast ---- */

function ratio(a: string, b: string): number {
  const [hi, lo] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe.each([
  { name: "light", dark: false },
  { name: "dark", dark: true },
])("the header in the $name theme", ({ name, dark }) => {
  const c = palette(dark);
  // No ground of its own: read on the header's --bb-card, and on --hud-hover
  // under a pointer or focus.
  const GROUNDS = ["var(--bb-card)", "var(--hud-hover)"] as const;

  it.each(["--hud-out", "--streak", "--diamond", "--hud-charge-mark", "--streak-ink"])("mark %s clears 3:1 on both grounds", (mark) => {
    for (const ground of GROUNDS) expect(ratio(c(`var(${mark})`), c(ground)), `${name} ${mark} on ${ground}`).toBeGreaterThanOrEqual(3);
  });

  it.each(["--hud-ink-streak", "--bb-muted-foreground", "--hud-ink-diamond", "--hud-ink-charge"])("number %s clears 4.5:1 on both grounds", (ink) => {
    for (const ground of GROUNDS) expect(ratio(c(`var(${ink})`), c(ground)), `${name} ${ink} on ${ground}`).toBeGreaterThanOrEqual(4.5);
  });

  it("colours each number in its own mark's hue family, not a near black", () => {
    // Hue within 25 degrees of the mark, and light enough to read as a colour:
    // the critic's "navy, rust, forest" were all below 0.07 luminance in light.
    const hue = (hex: string) => {
      const [r, g, b] = rgb(hex);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    for (const [ink, mark] of [["--hud-ink-streak", "--streak"], ["--hud-ink-diamond", "--diamond"], ["--hud-ink-charge", "--hud-charge-mark"]] as const) {
      const delta = Math.abs(hue(c(`var(${ink})`)) - hue(c(`var(${mark})`)));
      expect(Math.min(delta, 360 - delta), `${name} ${ink}`).toBeLessThanOrEqual(25);
      expect(lum(rgb(c(`var(${ink})`))), `${name} ${ink}`).toBeGreaterThan(0.1);
    }
  });
});
