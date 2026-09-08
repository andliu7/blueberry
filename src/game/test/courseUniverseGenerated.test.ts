/**
 * The generated mastery universe against the real curriculum.
 *
 * src/app/courseUniverse.generated.ts is a precomputed copy of the course graph,
 * written by scripts/gen-course-universe.mjs. It exists because progress.ts is
 * reachable from the shell and therefore ships in the game route's entry chunk:
 * importing @blueberry/curriculum there dragged the whole authored corpus into
 * the initial payload, 176.4 KB gzipped to 260.9 KB in one commit.
 *
 * A precomputed table is a copy, and a copy drifts. This test is what makes the
 * copy safe: it reads the corpus the same way the generator does and fails the
 * moment the two disagree. A red run here means run the generator, never edit
 * the table by hand.
 */

import { describe, expect, it } from "vitest";
import { ALL_COURSE_IDS, probeTopicIdsForCourse, topicDefinition } from "@blueberry/curriculum";
import { MASTERY_DEFAULT_DIFFICULTY, MASTERY_MIN_UNIVERSE_DIFFICULTY } from "@blueberry/economy";
import { COURSE_UNIVERSE } from "../app/courseUniverse.generated";
import { courseUniverse, lessonNodeId } from "../app/progress";

/** The generator's own rule, restated so a change to one side fails loudly. */
function difficultyFor(topic: string): number {
  try {
    const definition = topicDefinition(topic as never) as { readonly difficulty?: unknown };
    const own = definition.difficulty;
    return typeof own === "number" && own >= 1 && own <= 5 ? own : MASTERY_DEFAULT_DIFFICULTY;
  } catch {
    return MASTERY_DEFAULT_DIFFICULTY;
  }
}

describe("the generated course universe", () => {
  it("names every course the curriculum does", () => {
    expect(Object.keys(COURSE_UNIVERSE).sort()).toEqual([...ALL_COURSE_IDS].sort());
  });

  for (const course of ALL_COURSE_IDS) {
    it(`matches the corpus for ${course}, node for node and weight for weight`, () => {
      const expected = probeTopicIdsForCourse(course).map((topic) => [lessonNodeId(topic), difficultyFor(topic)]);
      const actual = (COURSE_UNIVERSE[course] ?? []).map(([nodeId, difficulty]) => [nodeId, difficulty]);
      expect(actual).toEqual(expected);
    });
  }

  it("hands progress.ts the same universe it would have derived", () => {
    for (const course of ALL_COURSE_IDS) {
      const derived = courseUniverse(course);
      const expected = probeTopicIdsForCourse(course).map((topic) => ({
        nodeId: lessonNodeId(topic),
        difficulty: difficultyFor(topic),
      }));
      expect(derived).toEqual(expected);
    }
  });

  it("uses the ids the journal uses, so numerator and denominator agree", () => {
    // A universe of raw topic ids would divide correctly and match nothing,
    // which reads as a student who has cleared none of their course.
    for (const rows of Object.values(COURSE_UNIVERSE)) {
      for (const [nodeId] of rows) expect(nodeId.startsWith("lesson:")).toBe(true);
    }
  });

  it("keeps the ledger of courses still narrower than the mastery floor", () => {
    // Not a failure: these are stub courses, and the floor is what stops a
    // three topic course reading as Exam Ready. The assertion is here so that
    // authoring one of them out is a deliberate, visible change rather than a
    // silent shift in what a rank means. See docs/ECONOMY.md, Mastery.
    const narrow = ALL_COURSE_IDS.filter((course) => {
      const sum = (COURSE_UNIVERSE[course] ?? []).reduce((total, [, difficulty]) => total + difficulty, 0);
      return sum < MASTERY_MIN_UNIVERSE_DIFFICULTY;
    });
    expect(narrow.sort()).toEqual(["gen_chem_1", "gen_chem_2", "orgo_1"]);
  });
});
