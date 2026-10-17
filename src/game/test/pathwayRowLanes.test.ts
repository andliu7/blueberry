/**
 * THE ROW'S LANE, and the arithmetic that picks its widths.
 *
 * REWRITTEN in round 3 of P1 (2026-10-17). This file used to pin a four-track
 * grid, [mascot 72][node lane][gap][name], whose node lane held the swing to
 * 34px. The critic measured the road's centres at x=132..166 on a 390pt phone
 * against the bar's roughly 70px of weave, and both blind judges asked for the
 * nodes to "swing much wider left and right". So the chip swings across the
 * whole column now, the name rides the side it leaned away from, and the
 * mascot and side quests the side it leaned toward (nameSide). The pins below
 * are the same KINDS of pin over the new geometry, recomputed, not loosened:
 * the swing has a floor from the bar, nothing overlaps the chip, nothing
 * leaves the screen, and every name keeps at least 96px from 360pt up.
 *
 *   chip centre = column / 2 + wind * step
 *   name room   = column / 2 + |wind| * step - chip / 2 - name gap
 *   outer room  = column / 2 - |wind| * step - chip / 2   (mascot, side lane)
 *
 * Every one of those numbers is written in TWO places: pathway.css declares the
 * lanes, PathwayTab declares the mascot's pixel size (Berry's lean arithmetic
 * scales off a number and cannot be handed a CSS length), and pathwayLayout.ts
 * declares the wind cycle. This file is what stops the three drifting, and it
 * recomputes rather than quoting: the repository has been burned by a comment
 * stating a number the code did not paint.
 *
 * NO DOM AND NO CSS ENGINE. The suite runs in node, so the declarations are read
 * as text out of the stylesheet. That makes it coarse, and coarse in the safe
 * direction: it reads the exact declarations the layout depends on and fails when
 * one of them moves without the others.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { WIND_CYCLE, nameSide } from "../tabs/pathway/pathwayLayout";

const CSS = readFileSync(fileURLToPath(new URL("../tabs/pathway/pathway.css", import.meta.url)), "utf8");

/** The stylesheet with its comments stripped, so prose about a number is not read as the number. */
const CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, " ");

/** One declaration's value, from the first rule that sets it. */
function decl(property: string): string {
  const found = new RegExp(`(?:^|[;{\\s])${property}\\s*:\\s*([^;}]+)`, "m").exec(CODE);
  expect(found, `pathway.css declares ${property}`).not.toBeNull();
  return String(found![1]).trim();
}

/** Split on a separator that is not inside brackets, so min(a, b) survives. */
function splitTop(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let at = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    // A minus is only an operator with whitespace before it; "-44px" is a sign.
    else if (depth === 0 && ch === sep && (sep !== "-" || (i > 0 && /\s/.test(text[i - 1]!)))) {
      parts.push(text.slice(at, i));
      at = i + 1;
    }
  }
  parts.push(text.slice(at));
  return parts;
}

/**
 * A length in px at a given viewport width, at the app's 16px root. Handles px,
 * rem, vw, min() and calc()'s plus and minus, which is every form this stylesheet
 * uses. Written out rather than shelled to a CSS engine because the suite runs in
 * node: every length in this layout is arithmetic over vw and rem, so it resolves
 * exactly on paper.
 */
function len(value: string, vw: number): number {
  const v = value.trim().replace(/^calc\(([\s\S]*)\)$/, "$1").trim();
  const min = /^min\(([\s\S]*)\)$/.exec(v);
  if (min !== null) return Math.min(...splitTop(min[1]!, ",").map((part) => len(part, vw)));
  const plus = splitTop(v, "+");
  if (plus.length > 1) return plus.reduce((sum, part) => sum + len(part, vw), 0);
  const minus = splitTop(v, "-").filter((part) => part.trim().length > 0);
  if (minus.length > 1) return minus.slice(1).reduce((acc, part) => acc - len(part, vw), len(minus[0]!, vw));
  const rem = /^(-?[\d.]+)rem$/.exec(v);
  if (rem !== null) return Number(rem[1]) * 16;
  const vwu = /^(-?[\d.]+)vw$/.exec(v);
  if (vwu !== null) return (Number(vwu[1]) / 100) * vw;
  const raw = /^(-?[\d.]+)px$/.exec(v);
  expect(raw, `cannot resolve length ${value}`).not.toBeNull();
  return Number(raw![1]);
}

/** A fixed length, for the values that carry no vw term. */
function px(value: string): number {
  return len(value, 0);
}

/** A viewport-dependent length at 390pt, the product's measured phone. */
function minPx(value: string): number {
  return len(value, 390);
}

/** One declaration's value inside one named rule, for the values a rule overrides. */
function declIn(selector: string, property: string): string {
  const at = CODE.indexOf(selector);
  expect(at, `pathway.css has a rule ${selector}`).toBeGreaterThan(-1);
  const body = CODE.slice(at, CODE.indexOf("}", at));
  const found = new RegExp(`${property}\\s*:\\s*([^;}]+)`).exec(body);
  expect(found, `${selector} declares ${property}`).not.toBeNull();
  return String(found![1]).trim();
}

/* The chip's own box, from .path-node's own tokens rather than from a number
   typed here: --node-size is the width, and the height is the face plus the wall
   plus the two borders. */
const CHIP_W = px(decl("--node-size"));
const CHIP_H = px(decl("--node-face-h")) + px(decl("--node-lip")) + px(decl("--node-border")) * 2;

const MASCOT_LANE = px(decl("--path-mascot-lane"));
const NAME_GAP = px(decl("--path-name-gap"));
/* The side lane (.path-side): a MASCOT_LANE wide box hung --side-off
   outboard of the chip, its chips centred in it, at their own smaller size. */
const SIDE_OFF = px(declIn(".path-side {", "--side-off"));
const SIDE_W = px(declIn(".path-side .path-node {", "--node-size"));
const SIDE_H = px(declIn(".path-side .path-node {", "--node-face-h")) + px(decl("--node-lip")) + px(decl("--node-border")) * 2;
const SIDE_GAP = px(declIn(".path-side {", "--side-gap"));
/* The unit checkpoint's chip, the widest on the road. */
const CHECK_W = px(declIn(".path-row--check .path-node {", "--node-size"));
const SEAM = px(decl("--path-seam"));

/** The peak of the wind cycle, in steps. */
const PEAK = Math.max(...WIND_CYCLE.map((wind) => Math.abs(wind)));
/** The spine step at 390pt, where the px branch of the min() is the smaller one. */
const SPINE_STEP = minPx(decl("--wind-step"));

/**
 * The content column, measured off the built page by the g1 capture: .path-gate
 * came out 344px wide on a 390pt phone and 448 at max-w-md, so the page reserves
 * 23px a side. The phone width is the one the swing has to fit.
 */
const COLUMN_PHONE = 344;

describe("the road winds as wide as the bar's, and the chip never leaves the column", () => {
  /**
   * THE BAR. The critic measured the duolingo-live path swinging about 70px at
   * 390pt; ours was 34. The floor is the bar's figure, and the ceiling is the
   * column: the widest chip must still sit wholly inside it.
   */
  it("swings at least the bar's 70px at 390pt", () => {
    expect(2 * PEAK * SPINE_STEP).toBeGreaterThanOrEqual(70);
  });

  it("keeps even the widest chip inside the phone column at the widest wind", () => {
    expect(PEAK * SPINE_STEP + CHECK_W / 2).toBeLessThanOrEqual(COLUMN_PHONE / 2);
  });

  it("winds both ways about the centre, never parking on it", () => {
    expect(WIND_CYCLE.reduce((sum, wind) => sum + wind, 0)).toBeCloseTo(0, 5);
    for (const wind of WIND_CYCLE) expect(wind).not.toBe(0);
  });
});

describe("the name takes the open side, the mascot and side quests the lean side", () => {
  it("puts the name opposite the lean", () => {
    for (const wind of WIND_CYCLE) expect(nameSide(wind)).toBe(wind > 0 ? "left" : "right");
  });

  it("starts the name one gap past the chip's own edge, on either side", () => {
    // The two placements in the stylesheet, read as text: they are the formula
    // the room arithmetic below assumes.
    expect(declIn(".path-row--name-left .path-row__name {", "right")).toBe(
      "calc(50% - var(--wind) * var(--wind-step) + var(--row-chip-half) + var(--path-name-gap))",
    );
    expect(declIn(".path-row--name-right .path-row__name {", "left")).toBe(
      "calc(50% + var(--wind) * var(--wind-step) + var(--row-chip-half) + var(--path-name-gap))",
    );
  });

  it("is the same mascot number PathwayTab hands Berry", () => {
    // Berry's lean and bob scale off a pixel number, so the size cannot be a CSS
    // length and the two copies have to be checked against each other. Read as
    // text, because importing PathwayTab pulls in React and the app shell.
    const tab = readFileSync(fileURLToPath(new URL("../tabs/pathway/PathwayTab.tsx", import.meta.url)), "utf8");
    const found = /^const MASCOT_PX = (\d+);$/m.exec(tab);
    expect(found, "PathwayTab declares MASCOT_PX").not.toBeNull();
    expect(Number(found![1])).toBe(MASCOT_LANE);
  });

  it("draws one mascot size on the whole surface", () => {
    const tab = readFileSync(fileURLToPath(new URL("../tabs/pathway/PathwayTab.tsx", import.meta.url)), "utf8");
    const sizes = [...tab.matchAll(/<Berry[^>]*?sizePx=\{([^}]+)\}/g)].map((match) => String(match[1]).trim());
    const onTrack = sizes.filter((size) => size === "MASCOT_PX" || /^\d+$/.test(size));
    expect(onTrack.filter((size) => size === "MASCOT_PX")).toEqual(["MASCOT_PX"]);
  });

  it("hangs the mascot and the side lane outboard of the chip, never over it", () => {
    expect(declIn(".path-row--name-left .path-row__mascot {", "left")).toBe("calc(100% + 4px)");
    expect(declIn(".path-row--name-right .path-row__mascot {", "right")).toBe("calc(100% + 4px)");
    expect(declIn(".path-row--name-left .path-side {", "left")).toBe("calc(100% + var(--side-off))");
    expect(declIn(".path-row--name-right .path-side {", "right")).toBe("calc(100% + var(--side-off))");
  });

  it("draws a side quest smaller than a lesson, and still at least 44 by 44", () => {
    expect(SIDE_W).toBeLessThan(CHIP_W);
    expect(SIDE_H).toBeLessThan(CHIP_H);
    expect(SIDE_W).toBeGreaterThanOrEqual(44);
    expect(SIDE_H).toBeGreaterThanOrEqual(44);
  });

  it("takes the side lane out of flow, so a lesson with side quests is as tall as one without", () => {
    expect(declIn(".path-side {", "position")).toBe("absolute");
    expect(CODE).not.toMatch(/\.path-row--branch/);
  });

  it("fits a run of two side chips beside one row without reaching the next row's mascot", () => {
    const run = 2 * SIDE_H + SIDE_GAP;
    const room = SEAM + CHIP_H / 2 + (SEAM + CHIP_H - MASCOT_LANE);
    expect(run / 2).toBeLessThanOrEqual(room + 0.01);
  });

  it("keeps a coming-soon row on the lesson pitch", () => {
    const soon = px(declIn(".path-soon {", "height")) + 2 * px(declIn(".path-soon {", "margin-block"));
    expect(soon).toBeCloseTo(CHIP_H, 5);
  });
});

describe("one seam number, so the pitch never stutters", () => {
  /**
   * 86.4, AND THE ".4" IS THE POINT OF RECOMPUTING IT. The g1 analysis carried
   * "86 = 11 + 64 + 11" all the way through its arithmetic, and the chip is 64.4:
   * 3.4rem of face plus a 6px wall plus two 2px borders. The rounding never
   * mattered to the conclusion, and quoting the rounded figure into an assertion
   * is exactly how a comment starts disagreeing with the code.
   */
  /*
   * REWRITTEN 2026-10-17, owner: "a bit more physical space ... maybe make the
   * buttons larger too". The chip is 88 by 76 now (4rem face, 8px wall, two
   * 2px borders) and the seam 20, so the pitch is 116. Pinned exactly, the
   * same way 86.4 was, so a token that moves without this test fails.
   *
   * MOVED TO 132 in round 4 of P1: both blind judges asked for the nodes to
   * sit further apart, so the seam is 28 and the pitch 76 + 56. Still pinned
   * exactly, and the ratio test below still caps it at half again the bar's.
   *
   * BACK TO 120 the same day, owner: "pathway slightly less spaced". Seam 22,
   * pitch 76 + 44: still more than the 116 he first asked for, less than 132.
   */
  it("puts two chips one chip plus two seams apart, and that is 120", () => {
    expect(CHIP_W).toBe(88);
    expect(CHIP_H).toBe(76);
    expect(SEAM).toBe(22);
    expect(CHIP_H + 2 * SEAM).toBeCloseTo(120, 5);
  });

  /**
   * The bar again: 86 over a 64px chip is 1.34, and the capture measured Brilliant
   * at 164 over a 134px node, which is 1.22. Ours is the more generous of the two
   * already, which is why adopting 164 would have been the wrong reading of the
   * capture: on a 64px chip it is 2.56, twice the bar.
   */
  /*
   * REWRITTEN 2026-10-17. The old bar was Brilliant's 164 / 134 = 1.22, and it
   * capped the room between nodes; the owner asked for more room and named
   * Duolingo's path as the look. Measured off the duolingo-live capture
   * (t04-path-tabbar, 1170px wide for a 390pt phone): node pitch 86pt over a
   * 63pt tall node, 1.37. The pitch is now pinned to at least that and to no
   * more than half again, so the column reads roomy and still a path.
   */
  it("is a rhythm at least as roomy as the bar's and no looser than half again", () => {
    const ours = (CHIP_H + 2 * SEAM) / CHIP_H;
    const bar = 86 / 63;
    expect(ours).toBeGreaterThanOrEqual(bar);
    expect(ours).toBeLessThanOrEqual(bar * 1.5);
  });

  it("is roomier than the 86.4 pitch it replaced, with a bigger chip", () => {
    expect(CHIP_H + 2 * SEAM).toBeGreaterThan(86.4);
    expect(CHIP_W).toBeGreaterThan(76);
  });

  it("gives no block on the column a seam of its own", () => {
    // Every block between two chips states its room in seams. A bare px padding
    // on one of them is how the 12 / 27 / 14 / 12 seam zoo happened.
    for (const rule of [".path-row {", ".path-gate {"]) {
      const at = CODE.indexOf(rule);
      expect(at, rule).toBeGreaterThan(-1);
      const body = CODE.slice(at, CODE.indexOf("}", at));
      // The property must start a declaration, so `--path-name-gap: 1.25rem`
      // (a lane width that happens to end in "gap") is not read as spacing, and
      // neither is `column-gap`, which separates the tracks rather than the rows.
      const spacing = [...body.matchAll(/[;{]\s*(padding|padding-top|padding-bottom|row-gap|gap)\s*:\s*([^;]+)/g)].map(
        (m) => `${String(m[1])}: ${String(m[2]).trim()}`,
      );
      expect(spacing.length, rule).toBeGreaterThan(0);
      for (const value of spacing) expect(value, `${rule} ${value}`).toContain("--path-seam");
    }
    // REWRITTEN 2026-10-01: ".path-fork {" and ".path-fork__arm {" were in the
    // list above, each stating its room in seams. The fork is retired (one
    // line per unit), so the stricter claim is that no fork block exists to
    // add room of its own between two rows at all.
    expect(CODE).not.toMatch(/\.path-fork[\w-]*\s*\{/);
  });

  /*
   * REWRITTEN 2026-10-01, with the two checks that followed it. They pinned
   * the fork cell's START tag: out of the cell's flow, stilled under reduced
   * motion at the fork's own specificity, and its 34px of headroom reserved
   * on the arms' container (--path-tag-room). That headroom was the 86 to 120
   * pitch jump going into the fork. The fork is retired, so the tag has ONE
   * placement, the row's name track, and the replacement pins exactly that:
   * no second placement, no headroom token, and the one bob still stilled.
   */
  it("gives the START tag one placement on the page, with no headroom reserved for a second", () => {
    expect(CODE).not.toContain("--path-tag-room");
    expect([...CODE.matchAll(/([^{}]*\.path-start[^{}]*)\{/g)].map((m) => String(m[1]).trim().split("\n").pop()!.trim()).filter((sel) => !sel.startsWith(".path-start") && !sel.startsWith(".dark .path-start"))).toEqual([]);
  });

  it("stops the tag's bob under reduced motion, and every animation this surface declares is answered", () => {
    const blocks: string[] = [];
    const marker = "@media (prefers-reduced-motion: reduce)";
    for (let at = CSS.indexOf(marker); at !== -1; at = CSS.indexOf(marker, at + 1)) {
      let depth = 0;
      let i = CSS.indexOf("{", at);
      const from = i;
      do {
        if (CSS[i] === "{") depth += 1;
        else if (CSS[i] === "}") depth -= 1;
        i += 1;
      } while (depth > 0 && i < CSS.length);
      blocks.push(CSS.slice(from, i));
    }
    const off = blocks.join("\n");
    expect(off).toContain(".path-start");
    /* An animation declared INSIDE a no-preference block is answered by
       construction: it never runs under reduced motion, whatever comes later
       in the file. Round 2 (2026-10-17) moved the header reveal there because
       a reduce override that sat above the base rule lost to it. */
    const on: string[] = [];
    const welcome = "@media (prefers-reduced-motion: no-preference)";
    for (let at = CODE.indexOf(welcome); at !== -1; at = CODE.indexOf(welcome, at + 1)) {
      let depth = 0;
      let i = CODE.indexOf("{", at);
      const from = i;
      do {
        if (CODE[i] === "{") depth += 1;
        else if (CODE[i] === "}") depth -= 1;
        i += 1;
      } while (depth > 0 && i < CODE.length);
      on.push(CODE.slice(from, i));
    }
    const names = (text: string) =>
      [...text.matchAll(/animation(?:-name)?\s*:\s*([a-zA-Z][\w-]*)/g)].map((m) => String(m[1])).filter((n) => n !== "none");
    const scoped = new Set(names(on.join("\n")));
    const declared = new Set(names(CODE));
    // Every unscoped animation must be switched off in a reduce block.
    const unscoped = [...declared].filter((name) => !scoped.has(name)).sort();
    expect(unscoped).toEqual(["path-halo", "path-start-bob"]);
    // path-letter-rise is the unit header's per-letter reveal; the chest ones are the treasure chest's (2026-10-17).
    expect([...scoped].sort()).toEqual(["path-chest-bob", "path-chest-lid", "path-chest-pop", "path-chest-say", "path-letter-rise"]);
    expect(off).toContain(".path-reveal__ch");
    expect(off).toContain(".path-node--current");
    for (const name of declared) expect(CODE, `@keyframes ${name} exists`).toContain(`@keyframes ${name}`);
  });

  it("never lets the current row reserve headroom of its own again", () => {
    // Both of its paddings were the pitch spread. The tag and the name moved into
    // the name track, where the row already has the chip's height to spend.
    expect(CODE).not.toMatch(/\.path-row--current\s*\{/);
    expect(CODE).not.toContain("--path-label-drop");
  });
});

/**
 * NOTHING CLIPS, AND IT IS VERIFIED RATHER THAN ASSUMED, at nine viewport widths.
 *
 * "390px clipping: verify, do not assume" was a step of its own in the plan, and
 * the reason it cannot be eyeballed is that no browser may be opened here: an
 * agent that opened one killed every node process on this machine, and rAF is dead
 * through that tool anyway. It does not need one. Every length in this layout is
 * arithmetic over vw and rem, so the whole sweep resolves on paper.
 *
 * The content column is MEASURED, not derived: the g1 capture measured .path-gate
 * at 344px on a 390pt phone and 448 at max-w-md, so the page reserves 23px a side.
 */
describe("nothing clips, at any width a phone or a desktop presents", () => {
  const WIDTHS = [320, 360, 375, 390, 414, 430, 494, 768, 1280];
  const column = (vw: number) => Math.min(vw - 46, 448);
  /** The page's own side margin: the column is centred with 23px a side on a phone. */
  const gutter = (vw: number) => (vw - column(vw)) / 2;
  const SPINE = declIn(".path-row {", "--wind-step");
  const nameRoom = (vw: number, wind: number) => column(vw) / 2 + Math.abs(wind) * len(SPINE, vw) - CHIP_W / 2 - NAME_GAP;

  it.each(WIDTHS)("at %ipx every chip, the checkpoint's too, stays inside the column", (vw) => {
    for (const wind of WIND_CYCLE) {
      expect(Math.abs(wind) * len(SPINE, vw) + CHECK_W / 2).toBeLessThanOrEqual(column(vw) / 2 + 0.01);
    }
  });

  it.each(WIDTHS)("at %ipx the mascot and a side chip stay on screen on the lean side", (vw) => {
    for (const wind of WIND_CYCLE) {
      const chipOuter = Math.abs(wind) * len(SPINE, vw) + CHIP_W / 2;
      const mascotOuter = chipOuter + 4 + MASCOT_LANE;
      const sideOuter = chipOuter + SIDE_OFF + MASCOT_LANE / 2 + SIDE_W / 2;
      expect(mascotOuter, `wind ${wind}`).toBeLessThanOrEqual(column(vw) / 2 + gutter(vw));
      expect(sideOuter, `wind ${wind}`).toBeLessThanOrEqual(column(vw) / 2 + gutter(vw));
    }
  });

  it.each(WIDTHS)("at %ipx every name has room of its own on the open side", (vw) => {
    for (const wind of WIND_CYCLE) expect(nameRoom(vw, wind), `wind ${wind}`).toBeGreaterThan(0);
  });

  it.each(WIDTHS)("at %ipx every name rides its own row: none is placed under a chip", () => {
    expect(CODE).not.toContain(".path-label--under");
    expect(CODE).not.toContain(".path-fork__cell");
  });

  /**
   * THE ONE DEGRADATION, asserted so it is a known number. The grid gave 60px
   * at 320pt and 100 at 360; the wide lane gives every name more, because the
   * open side grows as the chip swings away.
   */
  it("gives the name at least 96px from 360pt up, and records what 320 gives", () => {
    for (const vw of WIDTHS.filter((w) => w >= 360)) {
      for (const wind of WIND_CYCLE) expect(nameRoom(vw, wind), `${vw}pt wind ${wind}`).toBeGreaterThanOrEqual(96);
    }
    expect(Math.round(Math.min(...WIND_CYCLE.map((wind) => nameRoom(320, wind))))).toBe(91);
  });
});
