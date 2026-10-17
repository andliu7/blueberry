// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import svgpath from "svgpath";
import { describe, expect, it } from "vitest";
import { SiteNavLinks } from "@/components/ui/site-nav";

/**
 * The phone bar's glyphs are big enough (shell round 8, 2026-10-07).
 *
 * Round 7's critic measured our unselected glyphs at 21 to 30px wide and 411 to 584 px2 of
 * ink, against Duolingo's 27 to 36px and 685 to 880 px2: the drawings won alone and lost in
 * the bar because they were light. The floors here are the fix: every glyph, current or
 * not, paints at least 32px on its longer side and 650 px2.
 *
 * HOW, without a browser (this suite runs in node). The bar is rendered to markup, each svg
 * is parsed, and its painted area is sampled on a grid of 4 points per CSS px: a point is
 * ink if it falls inside any filled shape, or within half a stroke's width of a stroked
 * line, after that shape's transforms and inside its clip. Curves are flattened into short
 * lines. The svg's CSS size is read from its class, so shrinking the class fails this too.
 * measurements/tab-glyph-ink.mjs is the same count from real pixels in Chrome; the round 8
 * log has both, and they agree to within a few percent.
 */

const MIN_SIDE = 32;
const MIN_INK = 650;
const STEP = 0.25; // CSS px between samples

type M = [number, number, number, number, number, number]; // a b c d e f, as in SVG
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const inv = ([a, b, c, d, e, f]: M): M => {
  const k = a * d - b * c;
  return [d / k, -b / k, -c / k, a / k, (c * f - d * e) / k, (b * e - a * f) / k];
};
const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** translate(x y) and rotate(deg cx cy), the only two the glyphs use. */
function parseTransform(t: string | null): M {
  let m: M = [1, 0, 0, 1, 0, 0];
  for (const [, fn, args] of (t ?? "").matchAll(/(\w+)\(([^)]*)\)/g)) {
    const n = args.split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === "translate") m = mul(m, [1, 0, 0, 1, n[0], n[1] ?? 0]);
    else if (fn === "rotate") {
      const r = (n[0] * Math.PI) / 180;
      const [cx, cy] = [n[1] ?? 0, n[2] ?? 0];
      m = mul(m, [1, 0, 0, 1, cx, cy]);
      m = mul(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]);
      m = mul(m, [1, 0, 0, 1, -cx, -cy]);
    } else throw new Error(`transform ${fn} not handled`);
  }
  return m;
}

/** Path data to polylines (one per subpath), arcs and curves cut into 16 straight pieces. */
function flatten(d: string): [number, number][][] {
  const lines: [number, number][][] = [];
  let cur: [number, number][] = [];
  let [x, y, sx, sy] = [0, 0, 0, 0];
  const bez = (pts: number[]) => {
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      const u = 1 - t;
      if (pts.length === 4) {
        cur.push([u * u * x + 2 * u * t * pts[0] + t * t * pts[2], u * u * y + 2 * u * t * pts[1] + t * t * pts[3]]);
      } else {
        const [a, b, c] = [u * u * u, 3 * u * u * t, 3 * u * t * t];
        cur.push([a * x + b * pts[0] + c * pts[2] + t * t * t * pts[4], a * y + b * pts[1] + c * pts[3] + t * t * t * pts[5]]);
      }
    }
  };
  svgpath(d)
    .abs()
    .unshort()
    .unarc()
    .iterate((seg) => {
      const [cmd, ...n] = seg as [string, ...number[]];
      if (cmd === "M") {
        if (cur.length) lines.push(cur);
        cur = [[n[0], n[1]]];
        [x, y, sx, sy] = [n[0], n[1], n[0], n[1]];
        return;
      }
      if (cmd === "L") cur.push([n[0], n[1]]);
      else if (cmd === "H") cur.push([n[0], y]);
      else if (cmd === "V") cur.push([x, n[0]]);
      else if (cmd === "C" || cmd === "Q") bez(n);
      else if (cmd === "Z") cur.push([sx, sy]);
      [x, y] = cur[cur.length - 1];
    });
  if (cur.length) lines.push(cur);
  return lines;
}

/** Nonzero winding, SVG's default fill rule. */
function insidePoly(lines: [number, number][][], px: number, py: number) {
  let w = 0;
  for (const pts of lines) {
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      if (y1 <= py ? y2 > py : y2 <= py) {
        const cross = (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1);
        if (y2 > y1 ? cross > 0 : cross < 0) w += y2 > y1 ? 1 : -1;
      }
    }
  }
  return w !== 0;
}
function nearLine(lines: [number, number][][], px: number, py: number, r: number) {
  for (const pts of lines) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const [dx, dy] = [x2 - x1, y2 - y1];
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
      if ((px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2 <= r * r) return true;
    }
  }
  return false;
}

type Shape = (x: number, y: number) => boolean; // in the shape's own units
interface Mark {
  hit: Shape;
  toLocal: M;
  clips: { hit: Shape; toLocal: M }[];
}

function shapeOf(el: Element): { hit: Shape; painted: boolean } | null {
  const style = el.getAttribute("style") ?? "";
  const stroked = /stroke:var/.test(style) && /fill:none/.test(style);
  const width = Number(/stroke-width:([\d.]+)/.exec(style)?.[1] ?? 0);
  const num = (a: string) => Number(el.getAttribute(a));
  if (el.tagName === "path") {
    const lines = flatten(el.getAttribute("d")!);
    return stroked
      ? { hit: (x, y) => nearLine(lines, x, y, width / 2), painted: true }
      : { hit: (x, y) => insidePoly(lines, x, y), painted: true };
  }
  if (el.tagName === "circle")
    return { hit: (x, y) => (x - num("cx")) ** 2 + (y - num("cy")) ** 2 <= num("r") ** 2, painted: true };
  if (el.tagName === "ellipse")
    return { hit: (x, y) => ((x - num("cx")) / num("rx")) ** 2 + ((y - num("cy")) / num("ry")) ** 2 <= 1, painted: true };
  return null;
}

/** Every painted shape in an svg, with its transform to svg units and its clips. */
function marks(svg: Element): Mark[] {
  const clipsById = new Map<string, Element>();
  for (const c of svg.querySelectorAll("clipPath")) clipsById.set(c.id, c);
  const out: Mark[] = [];
  const walk = (el: Element, m: M, clips: Mark["clips"]) => {
    if (el.tagName === "clipPath") return;
    const here = mul(m, parseTransform(el.getAttribute("transform")));
    let cl = clips;
    const ref = /url\(#([^)]+)\)/.exec(el.getAttribute("clip-path") ?? "")?.[1];
    if (ref) {
      // The clip's shapes are in the user space of the element that references it.
      const shapes = [...clipsById.get(ref)!.children].map((c) => ({ hit: shapeOf(c)!.hit, toLocal: inv(here) }));
      cl = [...clips, { hit: (x: number, y: number) => shapes.some((s) => s.hit(x, y)), toLocal: inv(here) }];
    }
    const s = shapeOf(el);
    if (s?.painted) out.push({ hit: s.hit, toLocal: inv(here), clips: cl });
    for (const child of el.children) walk(child, here, cl);
  };
  for (const child of svg.children) walk(child, [1, 0, 0, 1, 0, 0], []);
  return out;
}

/** Ink area (CSS px2) and painted box (CSS px) of one svg drawn at `size` CSS px. */
function measure(svg: Element, size: number) {
  const [, , vw, vh] = svg.getAttribute("viewBox")!.split(" ").map(Number);
  const k = size / vw;
  const all = marks(svg);
  let n = 0;
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let py = STEP / 2; py < vh * k; py += STEP) {
    for (let px = STEP / 2; px < vw * k; px += STEP) {
      const [ux, uy] = [px / k, py / k];
      const ink = all.some(
        (mk) => mk.hit(...apply(mk.toLocal, ux, uy)) && mk.clips.every((c) => c.hit(...apply(c.toLocal, ux, uy))),
      );
      if (!ink) continue;
      n++;
      [x0, y0, x1, y1] = [Math.min(x0, px), Math.min(y0, py), Math.max(x1, px), Math.max(y1, py)];
    }
  }
  return { ink: n * STEP * STEP, w: x1 - x0 + STEP, h: y1 - y0 + STEP };
}

// Read from the repo root (vitest's cwd): under jsdom, import.meta.url is not a file URL.
const nav = readFileSync("src/components/ui/site-nav.tsx", "utf8");
const barSize = Number(/<SiteTabIcon id=\{d\.id\} className="size-([\d.]+)" \/>/.exec(nav)?.[1]) * 4;

function barSvgs(route: string) {
  const html = renderToStaticMarkup(createElement(SiteNavLinks, { route, placement: "bar" }));
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  return [...doc.querySelectorAll("a")].map((a) => ({
    current: a.getAttribute("aria-current") === "page",
    svg: a.querySelector("svg[data-tab-icon]")!,
  }));
}

describe("the phone bar's glyphs carry Duolingo's weight (shell round 8)", () => {
  it("reads the svg size from the bar's class", () => {
    expect(barSize).toBeGreaterThan(0);
  });

  const sizes = barSvgs("").map(({ svg }) => ({ id: svg.getAttribute("data-tab-icon")!, ...measure(svg, barSize) }));
  for (const s of sizes) {
    it(`${s.id}: at least ${MIN_SIDE}px on its longer side and ${MIN_INK} px2 of ink`, () => {
      expect(Math.max(s.w, s.h), `${s.id} ${s.w.toFixed(1)} x ${s.h.toFixed(1)}`).toBeGreaterThanOrEqual(MIN_SIDE);
      expect(s.ink, `${s.id} ink`).toBeGreaterThanOrEqual(MIN_INK);
    });
  }

  it("draws the current tab's glyph exactly as the others: the chip changes, the glyph does not shrink", () => {
    for (const route of ["", "study-decks", "schedule"]) {
      const items = barSvgs(route);
      const classes = new Set(items.map(({ svg }) => svg.getAttribute("class")));
      expect(classes.size, route).toBe(1);
      for (const { svg } of items) {
        const id = svg.getAttribute("data-tab-icon");
        const rest = barSvgs("").find((i) => i.svg.getAttribute("data-tab-icon") === id)!.svg;
        // The same drawing, apart from the clip ids React generates per copy.
        const strip = (s: Element) => s.innerHTML.replace(/tab-[a-z]+-[A-Za-z0-9]+/g, "");
        expect(strip(svg), `${route} ${id}`).toBe(strip(rest));
      }
    }
  });

  it("the sampler is honest: a known square measures its own size", () => {
    const doc = new DOMParser().parseFromString(
      `<svg viewBox="0 0 36 36"><path d="M0 0h18v18H0z" style="fill:var(--x)"></path><g clip-path="url(#k)"><clipPath id="k"><path d="M0 0h9v36H0z"></path></clipPath><path d="M0 20h36v4H0z" style="fill:var(--x)"></path></g></svg>`,
      "text/html",
    );
    const m = measure(doc.querySelector("svg")!, 36);
    // 18 x 18 = 324, plus the clipped bar 9 x 4 = 36.
    expect(m.ink).toBeCloseTo(360, 0);
    expect(m.w).toBeCloseTo(18, 1);
    expect(m.h).toBeCloseTo(24, 1);
  });
});
