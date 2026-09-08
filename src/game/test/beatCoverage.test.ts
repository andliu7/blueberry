/**
 * Which question types a student can actually reach.
 *
 * WHY THIS FILE EXISTS. `BUILT_BEAT_KINDS` read ["mechanism", "resonance"]
 * with a comment calling them "the two the trainer already plays today", long
 * after mcq, match, sort and synthesis had shipped with 102, 30, 22 and 54
 * authored items behind them. Nothing consumed the constant, so nothing went
 * red; any coverage report built on it would have described a product two
 * thirds smaller than the one that exists.
 *
 * The same audit found the opposite error next to it. `trace` has 88 authored
 * items, a complete TraceBeatView and a barrel exporting it, and no importer
 * anywhere: planLesson never schedules a trace step and BeatRunner has no
 * branch that renders one. Content a student cannot reach counts as shipped in
 * a list that says "built" and does not check.
 *
 * So this file makes the list answerable to the code. It reads the two files
 * that actually decide what plays, and fails when they and the constant
 * disagree in either direction: a kind claimed as built with no branch to
 * render it, or a kind rendered somewhere that the constant does not admit.
 *
 * A TEXT CHECK ON SOURCE, for the reason lessonProgress.test.ts states for its
 * stylesheet check: the web suite runs in node with no DOM, so a runner cannot
 * be mounted and asked. It is a floor, not a proof. It cannot tell whether a
 * branch is reachable at runtime, only whether one is written at all, which is
 * exactly the state both defects above were in.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  BEAT_KINDS,
  BUILT_BEAT_KINDS,
  AUTHORED_UNREACHABLE_BEAT_KINDS,
  DEFAULT_LEVELS,
  type BeatKind,
} from "../beats/types";

const read = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const runner = read("../beats/BeatRunner.tsx");
const trainer = read("../tabs/trainer/TrainerTab.tsx");
const template = read("../beats/template.ts");

/** A kind BeatRunner has a rendering branch for. */
function runnerRenders(kind: BeatKind): boolean {
  return new RegExp(`beat\\.kind === "${kind}"`).test(runner);
}

/** A kind the trainer plays on its own surface, outside the lesson runner. */
function trainerPlays(kind: BeatKind): boolean {
  return new RegExp(`"${kind}"`).test(trainer);
}

describe("BUILT_BEAT_KINDS matches what actually renders", () => {
  it("is not the whole list, or it would be telling us nothing", () => {
    // If every kind is built, the constant has no job and should be deleted
    // rather than left as a second name for BEAT_KINDS.
    expect(BUILT_BEAT_KINDS.length).toBeLessThan(BEAT_KINDS.length);
  });

  it.each(BUILT_BEAT_KINDS)("%s has somewhere that renders it", (kind) => {
    expect(runnerRenders(kind) || trainerPlays(kind)).toBe(true);
  });

  it("admits every kind the lesson runner renders", () => {
    const rendered = BEAT_KINDS.filter(runnerRenders);
    for (const kind of rendered) {
      expect(BUILT_BEAT_KINDS).toContain(kind);
    }
  });

  it("accounts for every kind exactly once, built or named unreachable", () => {
    const covered = [...BUILT_BEAT_KINDS, ...AUTHORED_UNREACHABLE_BEAT_KINDS].sort();
    expect(covered).toEqual([...BEAT_KINDS].sort());
  });
});

describe("the unreachable kinds are genuinely unreachable", () => {
  it.each(AUTHORED_UNREACHABLE_BEAT_KINDS)(
    "%s is not rendered by the lesson runner, so the note stays true",
    (kind) => {
      // If someone wires it up, this fails and the fix is to MOVE the kind into
      // BUILT_BEAT_KINDS, which is the good outcome this test is fishing for.
      expect(runnerRenders(kind)).toBe(false);
    },
  );

  it.each(AUTHORED_UNREACHABLE_BEAT_KINDS)("%s is not scheduled by planLesson either", (kind) => {
    expect(new RegExp(`"${kind}"`).test(template)).toBe(false);
  });

  it("still declares the ladder it would serve, so the gap is costed", () => {
    // trace serves L0 to L3, the widest of any kind. That is the size of what
    // is currently unreachable, and it is why the note says close the gap
    // rather than delete the content.
    for (const kind of AUTHORED_UNREACHABLE_BEAT_KINDS) {
      expect(DEFAULT_LEVELS[kind].length).toBeGreaterThan(0);
    }
  });
});
