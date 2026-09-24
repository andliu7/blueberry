/**
 * The lavender is gone, and it is a check rather than a promise.
 *
 * WHY THIS FILE EXISTS. "Drop the lavender" has been asked for across weeks and
 * keeps coming back, because nothing in the repository could tell you whether it
 * had happened. Three sweeps replaced hex literals and each one missed the
 * Tailwind utility classes, which a hex grep cannot see: 832 of them across 85
 * files, the `text-` utility on `indigo-700` and its friends, including 208 inside
 * the deck answer markup. A palette cannot be held by a commit message.
 *
 * Two things are pinned here and they answer two different failures.
 *
 *   1. THE FAMILY IS BANNED BY NAME. No Tailwind `indigo-*`, `violet-*` or
 *      `purple-*` utility class, and none of the lavender hexes, may appear in
 *      src/ or packages/ outside the exceptions listed below. Each exception
 *      carries the reason it is one, so the next sweep re-reads the judgement
 *      instead of re-litigating it.
 *
 *   2. EVERY RATIO IS RECOMPUTED, NEVER QUOTED. This repository has been burned
 *      three times by a comment stating a contrast ratio for a colour the code
 *      did not paint: theme.css argued for a violet and shipped a blue, and
 *      meter.css named a value --bb-primary-bright has never held. So the ramp
 *      below is measured here with the real WCAG formula against the grounds the
 *      app actually paints. A number in a comment beside one of these hexes is
 *      either reproduced by this test or it is wrong.
 *
 * Test 1 is a TEXT check over source files, not a computed style, because the
 * suite runs in node with no DOM and no CSS engine. That makes it coarse, and it
 * is coarse in the safe direction: it looks for the exact spellings the defect
 * takes. A lavender arriving some other way will not be caught. It is a floor.
 *
 * ONE MORE TRAP, PAID FOR ONCE, AND THIS FILE PAID IT TWICE. Tailwind v4 scans
 * comments and markdown as well as code, so naming a class in a comment about
 * having removed that class puts its rule straight back into the shipped CSS. The
 * first draft of this header did exactly that and re-emitted the rule it exists to
 * ban. So no prose here or in the swept files spells a banned utility in full: the
 * shade is named on its own, and the pattern below is built from parts.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const ROOTS = ["src", "packages"];
const EXT = /\.(ts|tsx|js|jsx|css|html)$/;

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sources(full, out);
    else if (EXT.test(entry)) out.push(full);
  }
  return out;
}

const FILES = ROOTS.flatMap((d) => sources(join(ROOT, d)))
  .map((f) => ({
    path: relative(ROOT, f).split("\\").join("/"),
    text: readFileSync(f, "utf8"),
  }))
  // This file names every banned hex in order to ban it.
  .filter((f) => f.path !== "src/test/lavender.test.ts");

/**
 * The file with its comments removed, for the hex check.
 *
 * Naming a hex as the thing that was REPLACED is the whole point of the sweep's
 * prose, so a comment mentioning `#6366f1` is evidence rather than a defect. The
 * distinction has to be made on the text because there is no parser here: block
 * comments go first, then any line that is pure prose. CSS needed the block pass
 * specifically, since a continuation line inside a slash-star comment carries no
 * marker of its own and meter.css's note about a value the token never held was
 * read as live code without it.
 */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith("//") && !t.startsWith("*");
    })
    .join("\n");
}

/* ------------------------------------------------------------------ *
 * 1. The family, banned by name.
 * ------------------------------------------------------------------ */

/**
 * Owned by another session as of this sweep, so their rows are reported rather
 * than edited. DELETE A ROW the moment its file is clean; the test asserts that
 * every path listed here is still dirty, so a stale exception fails loudly
 * instead of quietly excusing a file that no longer needs it.
 */
const CLASS_EXCEPTIONS: Record<string, string> = {
  "src/components/HomePage.tsx": "another session owns this file; 10 hits reported to the owner",
  "src/components/HomeHero.tsx": "another session owns this file; 2 hits reported to the owner",
};

// Built from parts so this file does not itself emit the utilities it bans.
const UTILITIES =
  "from|via|to|bg|text|border|ring|shadow|fill|stroke|decoration|outline|accent|caret|divide|placeholder";
const FAMILIES = "indigo|violet|purple";
const classPattern = () =>
  new RegExp(`\\b(?:${UTILITIES})-(?:${FAMILIES})-(?:50|100|200|300|400|500|600|700|800|900|950)\\b`, "g");

/**
 * The lavender hexes by name, lower case. The pale blue-violet washes and the
 * old indigo regime, as the owner named them.
 */
const LAVENDER_HEXES = [
  "#a5b4fc", "#c4b5fd", "#ddd6fe", "#ede9fe", "#818cf8",
  "#6366f1", "#8b5cf6", "#a78bfa", "#4f46e5", "#4338ca",
  "#3730a3", "#312e81", "#eef2ff", "#e0e7ff", "#c7d2fe",
  "#f5f3ff",
];

/**
 * Judged and kept, with the reason. These are not chrome, so sticker rule 9 and
 * the "drop the lavender" request do not reach them.
 */
const HEX_EXCEPTIONS: Record<string, string> = {
  "src/game/tabs/periodic/PeriodicTab.tsx":
    "noble/gas #ddd6fe is H 250.5, --bb-primary's own hue at wash lightness, carries PERIODIC_INK at 10.03:1, and is a categorical scale where moving further collides with nonmetal #bfdbfe",
  "src/components/ui/blueberry-loader.tsx":
    "the mascot's own palette: #a5b4fc and #6366f1 are stops on the berry's body gradient, not chrome",
  "src/game/tokens.css":
    "a v2 token file nothing imports yet; its --purple-* ramp is dead until it is wired in, and it was swept separately",
  "src/data/decks/carbonyls/all.ts":
    "generated by scripts/make_flashcards.py in the mechanism_trainer repo; a hand edit here is overwritten on the next run",
  // NOT judged, only deferred: these two are owned by another session. Their
  // lavenders are real and reported to the owner. Delete the rows when they land.
  "src/index.css":
    "OWNED BY ANOTHER SESSION. Real lavender at :397, :398 (indigo-600), :534, :572, :622 (violet-500), :535, :573, :623 (#7c3aed), :580, :581 (violet-400), :1173, :1398, :1411 (indigo-500), :1328 (#faf9ff)",
  "src/components/ui/page-background.tsx":
    "OWNED BY ANOTHER SESSION. Real lavender at :530, :531 (indigo-500) and :574 (#faf9ff)",
};

/**
 * The same colours spelled as `rgb()` or `rgba()`, derived from the list above so
 * the two can never drift apart.
 *
 * THIS IS THE HOLE THE EARLIER SWEEPS FELL THROUGH. A grep for `#4f46e5` does not
 * see `rgba(79, 70, 229, 0.1)`, and profile-card.tsx alone carried five of them in
 * its shadows. Whitespace is stripped before the comparison because the repository
 * spells these both ways.
 */
const LAVENDER_TRIPLES = LAVENDER_HEXES.map((hex) => ({
  hex,
  triple: channels(hex).join(","),
}));

describe("no lavender in src or packages", () => {
  it("ships no Tailwind indigo, violet or purple utility class", () => {
    const dirty: string[] = [];
    for (const file of FILES) {
      const hits = file.text.match(classPattern()) ?? [];
      if (hits.length === 0) continue;
      if (file.path in CLASS_EXCEPTIONS) continue;
      dirty.push(`${file.path} (${hits.length}): ${[...new Set(hits)].sort().join(", ")}`);
    }
    expect(dirty, `lavender utility classes are back in:\n${dirty.join("\n")}`).toEqual([]);
  });

  it("keeps every recorded class exception honest, so a stale row fails", () => {
    for (const [path, reason] of Object.entries(CLASS_EXCEPTIONS)) {
      const file = FILES.find((f) => f.path === path);
      expect(file, `${path} is listed as an exception but no longer exists`).toBeDefined();
      const hits = file?.text.match(classPattern()) ?? [];
      expect(
        hits.length,
        `${path} is clean now, so delete its row from CLASS_EXCEPTIONS (${reason})`,
      ).toBeGreaterThan(0);
    }
  });

  it("ships none of the lavender hexes", () => {
    const dirty: string[] = [];
    for (const file of FILES) {
      if (file.path in HEX_EXCEPTIONS) continue;
      const live = code(file.text).toLowerCase();
      const found = LAVENDER_HEXES.filter((hex) => live.includes(hex));
      if (found.length > 0) dirty.push(`${file.path}: ${found.sort().join(", ")}`);
    }
    expect(dirty, `lavender hexes are back in:\n${dirty.join("\n")}`).toEqual([]);
  });

  it("ships none of them spelled as rgb() either", () => {
    const dirty: string[] = [];
    for (const file of FILES) {
      if (file.path in HEX_EXCEPTIONS) continue;
      const live = code(file.text).replace(/\s+/g, "");
      const found = LAVENDER_TRIPLES.filter((c) => live.includes(c.triple)).map(
        (c) => `rgb(${c.triple}) is ${c.hex}`,
      );
      if (found.length > 0) dirty.push(`${file.path}: ${found.join("; ")}`);
    }
    expect(dirty, `lavender rgb() values are back in:\n${dirty.join("\n")}`).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 2. The ramp, measured rather than quoted.
 * ------------------------------------------------------------------ */

const GROUNDS = {
  cream: "#fbf3e6",
  white: "#ffffff",
  ground: "#f5f7fb",
  night: "#171a2e",
  nightCard: "#232741",
  stone900: "#1c1917",
};

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG 2.x relative luminance. The real formula, not an approximation. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The brand blue-violet ramp that replaced Tailwind's indigo. */
const RAMP = {
  50: "#f1f4fa",
  100: "#e5eaf5",
  200: "#ccd5ea",
  300: "#bbb1eb",
  400: "#9989e2",
  500: "#6b51dd",
  600: "#5a3fd8",
  700: "#472ab4",
  800: "#3d2599",
  900: "#33208c",
  950: "#1f1456",
} as const;

describe("the brand ramp measures what its comments claim", () => {
  it("anchors the 600, 700 and 900 steps on the locked tokens", () => {
    // These three are --bb-primary, --bb-primary-ink and --bb-primary-edge. If a
    // future edit moves them, it moves the tokens, and that is a decision rather
    // than a sweep.
    expect(RAMP[600]).toBe("#5a3fd8");
    expect(RAMP[700]).toBe("#472ab4");
    expect(RAMP[900]).toBe("#33208c");
  });

  it("carries body text at 4.5:1 on every light ground it is used as ink on", () => {
    for (const step of [600, 700, 800, 900, 950] as const) {
      for (const ground of [GROUNDS.cream, GROUNDS.white, GROUNDS.ground]) {
        expect(contrast(RAMP[step], ground), `${step} ${RAMP[step]} on ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("carries body text at 4.5:1 on every dark ground it is used as ink on", () => {
    for (const step of [100, 200, 300, 400] as const) {
      for (const ground of [GROUNDS.night, GROUNDS.nightCard, GROUNDS.stone900]) {
        expect(contrast(RAMP[step], ground), `${step} ${RAMP[step]} on ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("carries a white label on the filled steps", () => {
    for (const step of [600, 700, 800, 900, 950] as const) {
      expect(contrast(RAMP[step], "#ffffff"), `white on ${RAMP[step]}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("holds the 3:1 shape floor where a step draws a boundary rather than text", () => {
    // ring and border steps. 400 is the focus ring in both themes, which is why it
    // is measured on a light ground and a dark one.
    expect(contrast(RAMP[400], GROUNDS.white)).toBeGreaterThanOrEqual(2.98);
    expect(contrast(RAMP[400], GROUNDS.night)).toBeGreaterThanOrEqual(3.0);
    expect(contrast(RAMP[500], GROUNDS.night)).toBeGreaterThanOrEqual(3.0);
  });

  it("never weakens the Tailwind shade it replaced on the ground that shade met", () => {
    // Light shades are dark-mode ink, dark shades are light-mode ink. Each is
    // compared on the grounds it actually meets, because a dark shade's ratio
    // against a dark ground is a pairing the code never makes.
    const replaced: Record<number, string> = {
      50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8",
      500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81",
      950: "#1e1b4b",
    };
    const light = [GROUNDS.cream, GROUNDS.white, GROUNDS.ground];
    const dark = [GROUNDS.night, GROUNDS.nightCard, GROUNDS.stone900];
    for (const [stepText, old] of Object.entries(replaced)) {
      const step = Number(stepText) as keyof typeof RAMP;
      const meets = step <= 400 ? dark : light;
      for (const ground of meets) {
        const before = contrast(old, ground);
        const after = contrast(RAMP[step], ground);
        // 0.05 of slack, which is the rounding in a two-decimal ratio.
        expect(after, `${step}: ${old} -> ${RAMP[step]} on ${ground}`).toBeGreaterThanOrEqual(before - 0.05);
      }
    }
  });

  it("fixes the deck answer emphasis, which was illegible in dark mode", () => {
    // `a:` in a deck is body text, rendered by QuestionCard on bg-white and
    // dark:bg-stone-900. The old class had no dark sibling and measured 2.21:1 on
    // the night card; the pair that replaced it clears the body floor in both.
    expect(contrast(RAMP[700], GROUNDS.white)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(RAMP[300], GROUNDS.stone900)).toBeGreaterThanOrEqual(4.5);
    const decks = FILES.filter((f) => /^src\/data\/decks\/[a-z]+\.ts$/.test(f.path));
    expect(decks.length).toBeGreaterThan(0);
    for (const deck of decks) {
      const allowed = [`text-[${RAMP[700]}]`, `text-[${RAMP[300]}]`];
      const emphasis = deck.text.match(/text-\[#[0-9a-f]{6}\]/g) ?? [];
      for (const hit of emphasis) {
        expect(allowed, `${deck.path} paints an ink outside the ramp: ${hit}`).toContain(hit);
      }
      // Every light ink in the answer markup carries its dark sibling.
      const bare = deck.text.match(new RegExp(`text-\\[${RAMP[700]}\\](?! dark:)`, "g")) ?? [];
      expect(bare, `${deck.path} has emphasis with no dark-mode ink`).toEqual([]);
    }
  });
});
