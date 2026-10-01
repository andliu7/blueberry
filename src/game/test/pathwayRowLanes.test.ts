/**
 * THE ROW'S THREE TRACKS, and the arithmetic that picks their widths.
 *
 * WHY THIS FILE EXISTS. A pathway row used to be one centred cell with three
 * pieces of furniture absolutely positioned over it, each choosing its own side
 * per row: the name took one of three placements, the mascot took whichever flank
 * the chip had vacated, and the chip swung 265px across the whole column. A critic
 * named the consequence rather than the cause: "the label chip has NO FIXED
 * RELATIONSHIP to its node ... fixing pitch will not make the column read as a
 * line while the label moves every row."
 *
 * The row is a grid now, and every width in it is derived from one chain:
 *
 *   node lane   = the chip's own width + the total swing
 *   total swing = 2 * peak(WIND_CYCLE) * the spine step
 *   mascot lane = the chip's leftmost position at the most negative wind, which is
 *                 mascot + (lane / 2) - peak * step - chip / 2
 *   name        = the content column minus the other three tracks
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
import { WIND_CYCLE } from "../tabs/pathway/pathwayLayout";

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
const NODE_LANE = px(decl("--path-node-lane"));
const NAME_GAP = px(decl("--path-name-gap"));
/* The branch lane's chip centre, row-local (.path-branch, 2026-10-01). */
const BRANCH_X = px(declIn(".path-branch {", "--branch-x"));
const SEAM = px(decl("--path-seam"));

/** The peak of the wind cycle, in steps. */
const PEAK = Math.max(...WIND_CYCLE.map((wind) => Math.abs(wind)));
/** The spine step at 390pt, where the px branch of the min() is the smaller one. */
const SPINE_STEP = minPx(decl("--wind-step"));

/**
 * The content column, measured off the built page by the g1 capture: .path-gate
 * came out 344px wide on a 390pt phone and 448 at max-w-md, so the page reserves
 * 23px a side. These are the two widths the tracks have to add up to.
 */
const COLUMN_PHONE = 344;
const COLUMN_WIDE = 448;

describe("the node lane holds the swing, and only the swing", () => {
  it("is exactly the chip plus its total travel", () => {
    expect(NODE_LANE).toBe(CHIP_W + 2 * PEAK * SPINE_STEP);
  });

  it("keeps the chip's outer edge inside the lane at the widest wind", () => {
    const outer = PEAK * SPINE_STEP + CHIP_W / 2;
    expect(outer).toBeLessThanOrEqual(NODE_LANE / 2);
  });

  /**
   * THE BAR, and it is the reason 34px of travel is enough. Pitch and swing only
   * mean anything against node size: the capture measured Brilliant swinging 59px
   * on a 128px node, which is 0.46 node widths. Anything close to that is the same
   * road proportionally, whatever the absolute travel is.
   */
  it("swings the same proportion of a node that the bar does", () => {
    const ours = (2 * PEAK * SPINE_STEP) / CHIP_W;
    const bar = 59 / 128;
    expect(Math.abs(ours - bar)).toBeLessThan(0.08);
  });
});

describe("the mascot lane cannot touch a chip", () => {
  it("is bounded by the chip's leftmost position at any spine wind", () => {
    // The chip's left edge, measured from the row's left edge, at the most
    // negative wind in the cycle.
    const chipLeft = MASCOT_LANE + NODE_LANE / 2 - PEAK * SPINE_STEP - CHIP_W / 2;
    expect(chipLeft).toBeGreaterThanOrEqual(MASCOT_LANE);
  });

  it("is the same number PathwayTab hands Berry", async () => {
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
    // Every mascot standing beside a node on the track is one size. The course
    // picker's greeting berry is not on the track and is not in this list.
    // REWRITTEN 2026-10-01: it counted two MASCOT_PX placements, the row's and
    // the fork cell's. The fork is retired, so the track has ONE placement and
    // it must be MASCOT_PX: exactly one. (The 88 is the course picker.)
    const onTrack = sizes.filter((size) => size === "MASCOT_PX" || /^\d+$/.test(size));
    expect(onTrack.filter((size) => size === "MASCOT_PX")).toEqual(["MASCOT_PX"]);
  });
});

describe("the name track gets what is left, and a loop chip never reaches it", () => {
  it("adds up to the measured content column at both widths", () => {
    const namePhone = COLUMN_PHONE - MASCOT_LANE - NODE_LANE - NAME_GAP;
    const nameWide = COLUMN_WIDE - MASCOT_LANE - NODE_LANE - NAME_GAP;
    // Wide enough that a two-word lesson name is not one word per line.
    expect(namePhone).toBeGreaterThanOrEqual(120);
    expect(nameWide).toBeGreaterThan(namePhone);
  });

  /*
     REWRITTEN 2026-10-01, owner: side quests leave the main road onto a
     branch lane. These two pinned the old detour (a road chip swung 2.55
     steps off the road, overhanging the name gap and outboard of the spine's
     peak). The detour and loopWind are deleted; the same two places now pin
     the branch lane: its chip never shares an x with the road's chips, and a
     side quest's name gets at least the room a lesson's does.
  */
  it("keeps the branch chip in its own column, left of the road's chip at its leftmost swing", () => {
    const branchRight = BRANCH_X + CHIP_W / 2;
    const roadLeft = MASCOT_LANE + NODE_LANE / 2 - PEAK * SPINE_STEP - CHIP_W / 2;
    expect(branchRight).toBeLessThanOrEqual(roadLeft + 0.01);
    // And a whole chip apart centre to centre, never the half chip g9 measured.
    expect(MASCOT_LANE + NODE_LANE / 2 - PEAK * SPINE_STEP - BRANCH_X).toBeGreaterThanOrEqual(CHIP_W - 0.01);
  });

  it("gives a side quest's name at least the room a lesson's name gets, on the road's pitch", () => {
    const branchName = COLUMN_PHONE - 2 * BRANCH_X - px(declIn(".path-row--branch .path-row__name", "margin-left"));
    expect(branchName).toBeGreaterThanOrEqual(COLUMN_PHONE - MASCOT_LANE - NODE_LANE - NAME_GAP);
    // No padding of its own: a side-quest row rides the row's one seam.
    const rule = CODE.slice(CODE.indexOf(".path-row--branch {"), CODE.indexOf("}", CODE.indexOf(".path-row--branch {")));
    expect(rule).not.toMatch(/padding/);
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
  it("puts two chips one chip plus two seams apart, and that is 86.4", () => {
    expect(CHIP_H + 2 * SEAM).toBeCloseTo(86.4, 5);
  });

  /**
   * The bar again: 86 over a 64px chip is 1.34, and the capture measured Brilliant
   * at 164 over a 134px node, which is 1.22. Ours is the more generous of the two
   * already, which is why adopting 164 would have been the wrong reading of the
   * capture: on a 64px chip it is 2.56, twice the bar.
   */
  it("is a rhythm no looser than the bar's by more than a fifth", () => {
    const ours = (CHIP_H + 2 * SEAM) / CHIP_H;
    expect(ours).toBeLessThan((164 / 134) * 1.2);
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
    const declared = new Set(
      [...CODE.matchAll(/animation(?:-name)?\s*:\s*([a-zA-Z][\w-]*)/g)].map((m) => String(m[1])).filter((n) => n !== "none"),
    );
    expect([...declared].sort()).toEqual(["path-halo", "path-start-bob"]);
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
  const SPINE = declIn(".path-row {", "--wind-step");

  it.each(WIDTHS)("at %ipx the row's four tracks fit the column and the chip stays in its lane", (vw) => {
    const name = column(vw) - MASCOT_LANE - NODE_LANE - NAME_GAP;
    expect(name, "the row overflows its column").toBeGreaterThan(0);
    const chipEdge = PEAK * len(SPINE, vw) + CHIP_W / 2;
    expect(chipEdge).toBeLessThanOrEqual(NODE_LANE / 2 + 0.01);
    // The mascot's box abuts the chip at the most negative wind, never overlaps it.
    const chipLeft = MASCOT_LANE + NODE_LANE / 2 - PEAK * len(SPINE, vw) - CHIP_W / 2;
    expect(chipLeft).toBeGreaterThanOrEqual(MASCOT_LANE - 0.01);
  });

  // REWRITTEN 2026-10-01 with the branch lane (see above): was "a detour
  // overhangs into the gap and no further", over the deleted loop step.
  it.each(WIDTHS)("at %ipx the branch chip stays in the page gutter and left of the road", (vw) => {
    expect(BRANCH_X - CHIP_W / 2).toBeGreaterThanOrEqual(-23);
    const roadLeft = MASCOT_LANE + NODE_LANE / 2 - PEAK * len(SPINE, vw) - CHIP_W / 2;
    expect(BRANCH_X + CHIP_W / 2).toBeLessThanOrEqual(roadLeft + 0.01);
    expect(column(vw) - 2 * BRANCH_X - 17, "a side quest's name track").toBeGreaterThan(0);
  });

  /*
   * REWRITTEN 2026-10-01: this checked, at every width, that a fork cell's
   * under-the-chip name fit its half-column track. The fork and the under
   * name are retired; the replacement holds every width to the one rule left,
   * that no name on the page is placed under its chip or in a half column.
   */
  it.each(WIDTHS)("at %ipx every name rides its own row's name track: none is placed under a chip", () => {
    expect(CODE).not.toContain(".path-label--under");
    expect(CODE).not.toContain(".path-fork__cell");
  });

  /**
   * THE ONE DEGRADATION, asserted so it is a known number rather than a surprise.
   * At 320pt the name track is 72px, which is narrow enough that a long title
   * wraps past the chip's own height and grows its row. 360 is the practical floor
   * of a phone in use and gives 112. Reported in the build report rather than
   * papered over, because the fix is a responsive lane scheme that cannot be
   * judged without eyes.
   */
  it("gives the name at least 96px from 360pt up, and records what 320 gives", () => {
    for (const vw of WIDTHS.filter((w) => w >= 360)) {
      expect(column(vw) - MASCOT_LANE - NODE_LANE - NAME_GAP, `${vw}pt`).toBeGreaterThanOrEqual(96);
    }
    expect(column(320) - MASCOT_LANE - NODE_LANE - NAME_GAP).toBe(72);
  });
});
