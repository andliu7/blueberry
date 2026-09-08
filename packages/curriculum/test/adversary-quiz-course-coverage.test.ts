/**
 * ADVERSARY FINDING: claiming the DAT or MCAT course at the placement quiz
 * violates the quiz's own documented invariant, and a student who correctly
 * claims a course they are entitled to claim gets no starting point at all.
 *
 * `CourseId` in placement.ts includes "dat" and "mcat", and
 * `QuizConfig.claimedCourse` in quiz/machine.ts accepts any `CourseId`. But every
 * entry in the 46 row `TOPICS` registry has a home `course` of "gen_chem_1",
 * "gen_chem_2", "orgo_1" or "orgo_2": nothing is filed under "dat" or "mcat".
 * `topicIdsForCourse("dat")` and `topicIdsForCourse("mcat")` are therefore always
 * empty, independent of how many problems the corpus carries tagged with those
 * courses.
 *
 * `nextProbe` in quiz/machine.ts walks `courseTopics(course)` to find the first
 * question. When that list is empty and the backlog is empty (which it always is
 * on the first question), `nextProbe` returns `problem: null` immediately, and
 * `createQuiz` finishes the quiz having asked zero questions.
 *
 * `Recommendation.startTopics`'s own doc comment in quiz/machine.ts reads:
 * "Never empty; a student who missed everything starts at the course's first
 * topic, which is a starting point and not a judgement." For "dat" and "mcat"
 * this promise does not hold: `startTopics` comes back empty, `questionsAsked`
 * is 0, and the generated copy reads "the fastest route to the material you are
 * aiming for runs through 0 topics worth firming up first", which is not a
 * sentence a student can act on.
 *
 * curriculum-quiz.ts's own validator check never catches this: its course list
 * is `["gen_chem_1", "gen_chem_2", "orgo_1", "orgo_2", null]`, which omits both
 * "dat" and "mcat" even though both are valid `CourseId` values a real onboarding
 * flow can send.
 */

import { describe, expect, it } from "vitest";
import { SEED_CORPUS } from "../src/corpus/index.ts";
import { createQuiz, reduceQuiz, type QuizState } from "../src/quiz/machine.ts";
import { probeTopicIdsForCourse, topicIdsForCourse } from "../src/placement.ts";

/**
 * INVERTED IN PLACE after the fix, per this repository's practice: this file
 * originally characterised the broken shape (createQuiz finishing instantly
 * with zero questions asked). placement.ts now gives DAT and MCAT a probe list
 * spanning the four content courses, so the quiz ASKS, and the contract
 * assertions this file was written for now pass against a real walk.
 */
function skipToEnd(initial: QuizState): QuizState {
  let state = initial;
  let elapsed = 0;
  while (state.phase === "asking" && state.currentProblem !== null) {
    elapsed += 20;
    state = reduceQuiz(state, { kind: "skipped", elapsedSeconds: elapsed });
  }
  return state;
}

describe("claiming a course the topic registry never assigns any topic to", () => {
  it("has zero topics for dat and mcat in the pathway registry, which is what makes the walk break", () => {
    // This half is not the bug by itself: it is the precondition that produces
    // the bug below. Recorded here so the cause is not left implicit.
    expect(topicIdsForCourse("dat")).toEqual([]);
    expect(topicIdsForCourse("mcat")).toEqual([]);
  });

  it.each(["dat", "mcat"] as const)(
    "probes a review course claim %s against the content sequence rather than finishing instantly",
    (course) => {
      expect(probeTopicIdsForCourse(course).length).toBeGreaterThan(0);
      const quiz = createQuiz({ problems: SEED_CORPUS, claimedCourse: course });
      expect(quiz.phase).toBe("asking");
      expect(quiz.currentProblem).not.toBeNull();
    },
  );

  it.each(["dat", "mcat"] as const)(
    "gives claimedCourse %s a non-empty starting frontier, per the recommendation's own contract",
    (course) => {
      const quiz = skipToEnd(createQuiz({ problems: SEED_CORPUS, claimedCourse: course }));

      expect(quiz.phase).toBe("finished");
      expect(quiz.recommendation).not.toBeNull();
      expect(quiz.recommendation?.questionsAsked ?? 0).toBeGreaterThan(0);
      expect(quiz.recommendation?.startTopics.length ?? 0).toBeGreaterThan(0);
    },
  );

  it("produces copy that names a topic count rather than the nonsensical zero", () => {
    const quiz = skipToEnd(createQuiz({ problems: SEED_CORPUS, claimedCourse: "dat" }));
    expect(quiz.recommendation?.copy ?? "").not.toMatch(/\b0 topics\b/);
  });
});
