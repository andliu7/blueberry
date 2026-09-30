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
import { FlameMark } from "../app/ui/HudIcons";
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

describe("the streak flame draws its state as a shape", () => {
  const draw = (state: StreakState, fill: number) =>
    renderToStaticMarkup(createElement(FlameMark, { lit: state === "live", fill, state }));

  it("draws no run as an outline, with no core and no clock", () => {
    const svg = draw("zero", 0);
    expect(svg).toMatch(/fill="none" stroke="var\(--hud-out\)"/);
    expect(svg).not.toMatch(/hud-flame-core[^>]*stroke/);
    expect(svg).not.toMatch(/data-flame-clock/);
  });

  it("draws a waiting run solid, with its ember burning and cut out by a card ring", () => {
    const svg = draw("pending", 0);
    expect(svg).not.toMatch(/fill="none" stroke="var\(--hud-out\)"/);
    expect(svg).toMatch(/class="hud-flame-core"[^>]*fill="var\(--streak-core\)"[^>]*stroke="var\(--bb-card\)"/);
    expect(svg).not.toMatch(/data-flame-clock/);
  });

  it("adds the clock in the evening, and only then", () => {
    expect(draw("atRisk", 0.4)).toMatch(/data-flame-clock/);
    for (const state of ["zero", "pending", "live"] as const) expect(draw(state, 1)).not.toMatch(/data-flame-clock/);
  });

  it("draws four different pictures for the four states", () => {
    const pictures = new Set((["zero", "pending", "atRisk", "live"] as const).map((s) => draw(s, s === "live" ? 1 : 0).replace(/hud-flame-[a-zA-Z0-9]+(?=["\)])/g, "id")));
    expect(pictures.size).toBe(4);
  });

  it("leaves the flame's other callers exactly the two state drawing they had", () => {
    const plain = renderToStaticMarkup(createElement(FlameMark, { lit: false }));
    expect(plain).toMatch(/fill="#ffffff" fill-opacity="0.42"/);
    expect(plain).not.toMatch(/data-flame-clock|stroke="var\(--bb-card\)"/);
  });

  it("greys the number only when there is no run, and leans only at risk", () => {
    expect(HUD_TSX).toMatch(/streak\.state === "zero" \? "text-bb-muted-foreground" : "text-streak-ink"/);
    expect(HUD_TSX).toMatch(/streak\.state === "atRisk" \? "hud-flame-risk"/);
    expect(rules(HUD_CSS, ".hud-flame-risk").length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------ contrast ---- */

function block(css: string, selector: string, probe: string): string {
  const pattern = new RegExp(`(^|\\n)${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "g");
  for (const match of css.matchAll(pattern)) if ((match[2] ?? "").includes(probe)) return match[2] ?? "";
  throw new Error(`no ${selector} block declaring ${probe}`);
}
function hex(declarations: string, name: string): string {
  const match = declarations.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (match?.[1] === undefined) throw new Error(`${name} is not a plain hex here`);
  return match[1];
}
function luminance(h: string): number {
  const c = (i: number) => {
    const v = Number.parseInt(h.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(0) + 0.7152 * c(1) + 0.0722 * c(2);
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const THEMES = [
  { name: "light", tokens: block(THEME, ":root", "--bb-card:") },
  { name: "dark", tokens: block(THEME, ".dark", "--bb-card:") },
] as const;

describe.each(THEMES)("the header in the $name theme", ({ name, tokens }) => {
  const t = (n: string) => hex(tokens, n);
  // The cell has no ground, so it is read on the header's --bb-card, and on
  // --bb-muted under a pointer or focus.
  const GROUNDS = ["--bb-card", "--bb-muted"] as const;

  it.each(["--hud-out", "--streak", "--diamond", "--good", "--streak-ink"])("mark %s clears 3:1 on both grounds", (mark) => {
    for (const ground of GROUNDS) expect(ratio(t(mark), t(ground)), `${name} ${mark} on ${ground}`).toBeGreaterThanOrEqual(3);
  });

  it.each(["--streak-ink", "--bb-muted-foreground", "--diamond-ink", "--good-ink"])("number %s clears 4.5:1 on both grounds", (ink) => {
    for (const ground of GROUNDS) expect(ratio(t(ink), t(ground)), `${name} ${ink} on ${ground}`).toBeGreaterThanOrEqual(4.5);
  });

  it("separates the ember from the grey body by 3:1 somewhere across its ring", () => {
    // The ember is amber on the grey body with a card coloured ring between.
    // Either edge of the ring clearing 3:1 is what keeps it a shape.
    const ringToBody = ratio(t("--bb-card"), t("--hud-out"));
    const coreToRing = ratio(t("--streak-core"), t("--bb-card"));
    const coreToBody = ratio(t("--streak-core"), t("--hud-out"));
    expect(ringToBody).toBeGreaterThanOrEqual(3);
    expect(Math.max(coreToRing, coreToBody)).toBeGreaterThanOrEqual(3);
  });
});
