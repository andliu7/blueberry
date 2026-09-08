import { describe, expect, it } from "vitest";

import type { CheckContext } from "../src/check.ts";

/**
 * ADVERSARY FINDING, Phase 3, attack surface 3 (the quiz walk) and attack
 * surface 6 (what a check structurally misses). HISTORICAL: the header below
 * describes the check as it stood when the finding was filed; the describe
 * block at the bottom records the fix and now guards against regression.
 *
 * curriculum-quiz.ts's own fleet loop reads:
 *
 *   const courses = ["gen_chem_1", "gen_chem_2", "orgo_1", "orgo_2", null] as const;
 *
 * `CourseId` in packages/curriculum/src/placement.ts has six members: those four,
 * plus "dat" and "mcat". The check never simulates a fleet for either of the two
 * it omits, so a defect that only shows up for those two claims is invisible to
 * this check by construction, no matter how many fixtures sit in fixtures/: the
 * course list is a literal array in the check's own source, which is outside
 * this adversary's write scope, the same shape of blind spot
 * feedback-copy-coverage.test.ts documents for a different check.
 *
 * The defect that list is blind to is real and is pinned down at the curriculum
 * layer in packages/curriculum/test/adversary-quiz-course-coverage.test.ts:
 * claiming "dat" or "mcat" at the placement quiz finishes the quiz having asked
 * zero questions and returns `startTopics: []`, which contradicts
 * `Recommendation.startTopics`'s own "Never empty" doc comment in
 * quiz/machine.ts. Every `CourseId` the registry admits is a value a real
 * onboarding flow can send, per QuizConfig.claimedCourse's own type.
 *
 * WHY THIS IS A PASSING TEST AND NOT A RED ONE, STATED RATHER THAN LEFT
 * IMPLICIT, per the brief's own instruction to say so when a control cannot be
 * built. feedback-copy-coverage.test.ts's check reads its subject through an
 * import this suite can `vi.mock`, so a fake cause id there makes the real check
 * genuinely fail. This check's course list is a plain array literal written
 * inside packages/validators/src/checks/curriculum/quiz.ts itself, never derived
 * from `@blueberry/curriculum` or from anything else this test can intercept.
 * Mocking `@blueberry/curriculum` changes what the check would see IF it asked
 * about "dat" or "mcat"; it cannot make the check ask about them, because which
 * courses to ask about is not data the check reads, it is code the check
 * contains. There is no fixture and no mock inside
 * packages/validators/fixtures/ or packages/validators/tests/ that can add
 * "dat" and "mcat" to that array, and widening this adversary's write scope to
 * quiz.ts itself is the boundary CLAUDE.md's git discipline section draws.
 *
 * So this test runs the REAL, unmodified `curriculumQuiz` check against the REAL
 * built `@blueberry/curriculum` package and shows it reports SUITE: PASS while
 * the broken walk above is reachable from the same corpus the check just
 * exercised. That is the blind spot stated as a fact about the shipped check,
 * not reconstructed from a description of it, and a passing assertion is the
 * honest way to record a check that is structurally incapable of seeing its own
 * gap.
 */

const emptyContext: CheckContext = {
  repoRoot: "",
  packageRoot: "",
  fixturesDir: "",
  fixtures: [],
};

/**
 * INVERTED IN PLACE after the fix. The check's course list is now DERIVED from
 * `ALL_COURSE_IDS` in placement.ts rather than written out in the check's own
 * source, and placement.ts gives DAT and MCAT a probe list spanning the four
 * content courses. So the blind spot this file documented is closed two ways:
 * the walks work, and the check exercises them. The assertions below guard
 * both, so a regression to a hardcoded narrower list in a future edit of the
 * check has a test to get past.
 */
describe("curriculum-quiz, whose course fleet is derived from the registry", () => {
  it("runs green while the review course walks it now covers actually work", async () => {
    const { curriculumQuiz } = await import("../src/checks/curriculum/quiz.ts");
    const curriculum = await import("@blueberry/curriculum");

    const result = await curriculumQuiz.run(emptyContext);
    expect(result.status).toBe("pass");

    // The walks the old hardcoded list never tried: a DAT or MCAT claim asks
    // real questions and ends with a non-empty frontier, per the
    // Recommendation contract.
    for (const course of ["dat", "mcat"] as const) {
      let state = curriculum.createQuiz({ problems: curriculum.SEED_CORPUS, claimedCourse: course });
      expect(state.phase).toBe("asking");
      let elapsed = 0;
      while (state.phase === "asking" && state.currentProblem !== null) {
        elapsed += 20;
        state = curriculum.reduceQuiz(state, { kind: "skipped", elapsedSeconds: elapsed });
      }
      expect(state.phase).toBe("finished");
      expect(state.recommendation?.questionsAsked ?? 0).toBeGreaterThan(0);
      expect(state.recommendation?.startTopics.length ?? 0).toBeGreaterThan(0);
    }

    // The derivation guard: every course the registry admits must be a course
    // the registry's own probe list serves. If a CourseId is ever added whose
    // probe list is empty, this fails before the quiz can dead-end on it.
    for (const course of curriculum.ALL_COURSE_IDS) {
      expect(
        curriculum.probeTopicIdsForCourse(course).length,
        `probeTopicIdsForCourse(${course})`,
      ).toBeGreaterThan(0);
    }
  });
});
