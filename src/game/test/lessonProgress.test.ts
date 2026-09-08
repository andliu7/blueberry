/**
 * The lesson's green: how far it has travelled, and where it is allowed to
 * appear at all.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM lessonTemplate.test.ts. That file
 * guards the template's ORDERING and its run machine. This one guards two
 * promises about the goal green specifically, both of which a critic measured
 * as broken on the previous build and neither of which any existing test
 * could have caught:
 *
 *   1. THE GREEN NEVER RUNS OVER A MISS. `recipeProgress` is the length of
 *      the strip's green capsule, and it takes a CLEARED fraction. The
 *      previous build handed the strip the ANSWERED fraction, so a wrong
 *      answer filled the current segment solid green while the panel
 *      underneath said "Not yet". DESIGN-GOALS is that "green says you
 *      moved" and the committed badge sheet reserves the green fill for
 *      cleared beats, so a miss moves the position and not the colour.
 *
 *   2. THE GREEN IS NEVER A LINE. DESIGN-GOALS' FILL-ONLY rule: the goal
 *      green is 1.60:1 on cream, so it appears "ONLY as a fill carrying dark
 *      ink or a white check on a large shape, never as text, never as a
 *      hairline". Two separate green hairlines shipped anyway, one on the
 *      strip's done segment (#a7cd8e on #cfe7b6, 1.34:1) and one on the
 *      correct-answer option tile (#75b49e on #d1fae5, 1.9:1), and in the
 *      first case a file header asserted the opposite of what the file's own
 *      pixels did. A comment cannot hold that rule; a check reading the
 *      stylesheet can.
 *
 * The second test is a TEXT check on a stylesheet rather than a computed
 * style, because the web suite runs in node with no DOM and no CSS engine.
 * That makes it a coarse instrument and it is written to be coarse in the
 * safe direction: it looks for a green token inside a border or outline
 * declaration, which is the exact shape of both defects, and it will not
 * catch a green line drawn some other way. It is a floor, not a proof.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { recipeProgress, type RecipeSegment } from "../beats/template";
import { sessionProgress, selectOption, commitPick, startMcqSession } from "../beats/mcq/session";
import { mcqBeatsForNode } from "../beats/mcq";

const seg = (state: RecipeSegment["state"], badge: RecipeSegment["badge"] = "mcq"): RecipeSegment => ({
  slot: "recognise",
  badge,
  state,
  label: "Quick questions",
});

/* ------------------------------------------------------------------ */
/* 1. How far the green has travelled                                   */
/* ------------------------------------------------------------------ */

describe("the strip's green capsule", () => {
  it("is empty on a lesson nobody has started", () => {
    expect(recipeProgress([seg("current"), seg("todo"), seg("todo", "reward")])).toBe(0);
  });

  it("covers exactly the segments behind the student", () => {
    const segments = [seg("done"), seg("done"), seg("current"), seg("todo", "reward")];
    expect(recipeProgress(segments)).toBe(0.5);
  });

  it("carries the current segment's own cleared fraction into the run", () => {
    const segments = [seg("done"), seg("current"), seg("todo"), seg("todo", "reward")];
    // One of four behind, plus half of the one being played: 1.5 of 4.
    expect(recipeProgress(segments, 0.5)).toBeCloseTo(0.375, 6);
  });

  it("ignores a within-step fraction when no segment is current", () => {
    // The finished run: everything behind, nothing being played. A fraction
    // arriving late must not push the bar past its own end.
    expect(recipeProgress([seg("done"), seg("done")], 0.8)).toBe(1);
  });

  it("clamps a fraction outside 0 to 1 rather than trusting its caller", () => {
    const segments = [seg("current"), seg("todo")];
    expect(recipeProgress(segments, -3)).toBe(0);
    expect(recipeProgress(segments, 9)).toBe(0.5);
  });

  it("is 0 rather than NaN on an empty strip", () => {
    expect(recipeProgress([])).toBe(0);
  });

  it("never exceeds 1", () => {
    const all = [seg("done"), seg("done"), seg("done")];
    expect(recipeProgress(all, 1)).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* 2. A miss moves the position and not the colour                      */
/* ------------------------------------------------------------------ */

describe("a miss does not paint as progress", () => {
  const beats = mcqBeatsForNode("u3-directing");

  it("has beats to run, or the rest of this block proves nothing", () => {
    expect(beats.length).toBeGreaterThan(0);
  });

  it("advances the answered count and NOT the cleared one on a wrong pick", () => {
    const beat = beats[0]!;
    const wrong = beat.options.find((option) => option.id !== beat.correctOptionId);
    expect(wrong, "the beat needs a wrong option to pick").toBeDefined();
    const commit = commitPick(selectOption(startMcqSession(beats, 1), wrong!.id), {
      at: "2026-09-05T00:00:00.000Z",
      elapsedMs: 1000,
    });
    expect(commit, "a picked option must be committable").not.toBeNull();
    const progress = sessionProgress(commit!.session);
    expect(progress.answered).toBe(1);
    expect(progress.cleared).toBe(0);
    expect(progress.fraction).toBeGreaterThan(0);
    // The one the strip reads. A wrong answer leaves the green where it was.
    expect(progress.clearedFraction).toBe(0);
  });

  it("advances both on a right pick", () => {
    const beat = beats[0]!;
    const commit = commitPick(selectOption(startMcqSession(beats, 1), beat.correctOptionId), {
      at: "2026-09-05T00:00:00.000Z",
      elapsedMs: 1000,
    });
    expect(commit, "a picked option must be committable").not.toBeNull();
    const progress = sessionProgress(commit!.session);
    expect(progress.cleared).toBe(1);
    expect(progress.clearedFraction).toBeGreaterThan(0);
    expect(progress.clearedFraction).toBe(progress.fraction);
  });

  it("reports a finished empty run rather than a stuck one", () => {
    const progress = sessionProgress(startMcqSession([], 1));
    expect(progress.fraction).toBe(1);
    expect(progress.clearedFraction).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* 3. FILL ONLY: no green line anywhere in the lesson's stylesheets      */
/* ------------------------------------------------------------------ */

const GREEN_TOKENS = ["--progress", "--progress-deep", "--progress-edge", "--progress-glow", "--good"];

/** Declarations whose PROPERTY draws a line rather than a fill. */
const LINE_PROPERTIES =
  /^\s*(border|border-top|border-right|border-bottom|border-left|border-color|border-top-color|border-right-color|border-bottom-color|border-left-color|border-inline|border-block|outline|outline-color|text-decoration-color|--opt-rim|--seg-rim|--badge-rim|--chip-press-rim)\s*:/;

function lineDeclarationsUsingGreen(css: string): string[] {
  return css
    .split("\n")
    .map((line) => line.split("/*")[0] ?? "")
    .filter((line) => LINE_PROPERTIES.test(line))
    .filter((line) => GREEN_TOKENS.some((token) => line.includes(token)));
}

describe("the goal green is a fill and never a hairline", () => {
  const files = ["../beats/beat-chrome.css", "../lesson/scheme.css"];

  for (const file of files) {
    it(`draws no green line in ${file.split("/").pop()}`, () => {
      const css = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
      expect(lineDeclarationsUsingGreen(css)).toEqual([]);
    });
  }

  it("would catch the two lines that actually shipped", () => {
    // The regression guard's own guard: if the matcher stopped matching, the
    // test above would pass on a stylesheet full of green hairlines. These
    // are the two declarations a critic measured on the previous build.
    const shipped = [
      "  --seg-rim: var(--seg-done-rim);",
      "  --opt-rim: color-mix(in srgb, var(--good) 45%, var(--good-soft));",
      "  border: 2px solid color-mix(in srgb, var(--good) 45%, var(--good-soft));",
    ].join("\n");
    expect(lineDeclarationsUsingGreen(shipped)).toHaveLength(2);
  });
});
