/**
 * ADVERSARY FINDING: the placement quiz's starting frontier can name a topic
 * whose home course is not the recommended course.
 *
 * `prerequisiteClosure` in placement.ts deliberately crosses course boundaries:
 * an Organic Chemistry II topic's prerequisites are commonly Organic Chemistry I
 * topics ("carried prerequisites", per that file's header), and this is by
 * design. `reduceQuiz` in quiz/machine.ts pushes a failed topic's ENTIRE
 * prerequisite closure onto the backward-probing backlog, with no filter that
 * keeps the backlog inside the claimed course.
 *
 * When the walk asks a backlog question from a DIFFERENT course and the student
 * gets it wrong too, `finish()` can select that cross-course topic as part of the
 * frontier. The result is a `Recommendation` whose `course` field names one
 * course while `startTopics` names a topic filed under a different one.
 *
 * This is recorded as a finding rather than a hard failing assertion, because
 * nothing in quiz/machine.ts's comments says whether a cross-course frontier is
 * intended (a legitimate "go fix this Organic Chemistry I gap before continuing
 * in Organic Chemistry II" recommendation) or an oversight. What is not
 * ambiguous is that `Recommendation.course` is a single `CourseId` and Phase 5's
 * pathway is described in CLAUDE.md as a per-course track with unlock gates, so
 * a start topic that is not IN that course's own topic list has no track to
 * unlock into without further handling that does not exist yet in this package.
 * This wants an explicit ruling, recorded the way CLAUDE.md's other rulings are.
 */

import { describe, expect, it } from "vitest";
import { SEED_CORPUS } from "../src/corpus/index.ts";
import { createQuiz, reduceQuiz, type QuizState } from "../src/quiz/machine.ts";
import { TOPICS, type TopicId } from "../src/placement.ts";
import type { Problem } from "../src/problem.ts";
import type { AnswerState } from "../src/answer.ts";

/**
 * A submission of the same kind as the problem's answer, chosen to grade wrong.
 *
 * Every seed corpus problem carries at least one distractor (corpus.test.ts's
 * own invariant), so reusing the first one is the general answer that also
 * covers the "structure" kind without a bespoke wrong species graph here.
 */
function wrongStateFor(problem: Problem): AnswerState {
  const distractor = problem.distractors[0];
  if (distractor !== undefined) return distractor.state;

  const spec = problem.answer;
  switch (spec.kind) {
    case "numeric":
      return { kind: "numeric", text: "999999", unit: spec.unit };
    case "multiple_choice": {
      const other = spec.options.find((option) => option.id !== spec.correctOptionId);
      if (other === undefined) throw new Error("no wrong option available");
      return { kind: "multiple_choice", optionId: other.id };
    }
    case "reagents":
      return { kind: "reagents", steps: [{ reagents: ["definitely-not-the-answer"] }] };
    case "major_product": {
      const other = spec.candidates.find((candidate) => candidate.id !== spec.correctCandidateId);
      if (other === undefined) throw new Error("no wrong candidate available");
      return { kind: "major_product", candidateId: other.id, reasonId: null };
    }
    case "structure":
      throw new Error(`problem ${problem.id} has structure kind and no distractor to reuse`);
    case "ordering":
    case "matching":
      throw new Error(`problem ${problem.id} has ${spec.kind} kind and no distractor to reuse`);
  }
}

function answerEverythingWrong(initial: QuizState): QuizState {
  let state = initial;
  let elapsed = 0;
  while (state.phase === "asking" && state.currentProblem !== null) {
    const problem = state.config.problems.find((candidate) => candidate.id === state.currentProblem);
    if (problem === undefined) break;
    elapsed += 20;
    state = reduceQuiz(state, {
      kind: "answerSubmitted",
      state: wrongStateFor(problem),
      elapsedSeconds: elapsed,
    });
  }
  return state;
}

describe("the placement quiz's starting frontier and the claimed course", () => {
  it("can recommend a start topic whose home course differs from the recommendation's own course", () => {
    const quiz = answerEverythingWrong(createQuiz({ problems: SEED_CORPUS, claimedCourse: "orgo_2" }));

    expect(quiz.phase).toBe("finished");
    const recommendation = quiz.recommendation;
    expect(recommendation).not.toBeNull();
    if (recommendation === null) return;

    const startTopicCourses = recommendation.startTopics.map((topic: TopicId) => TOPICS[topic].course);
    const foreign = recommendation.startTopics.filter(
      (topic: TopicId) => TOPICS[topic].course !== recommendation.course,
    );

    // This is the fact this test exists to pin down: the walk above produces at
    // least one start topic outside the claimed course. If a future change
    // makes the frontier stay inside the claimed course, this assertion is the
    // one to update, deliberately, with the ruling recorded alongside it.
    expect(foreign.length, `recommendation.course=${recommendation.course}, startTopics courses=${JSON.stringify(startTopicCourses)}`).toBeGreaterThan(0);
  });
});
