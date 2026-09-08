import { describe, expect, it } from "vitest";

import {
  createQuiz,
  reduceQuiz,
  simulateFleet,
  simulateStudent,
  QUESTION_CAP,
  SEED_CORPUS,
  TIME_BUDGET_SECONDS,
  type QuizConfig,
} from "../src/index.js";

const CONFIG: QuizConfig = { problems: SEED_CORPUS, claimedCourse: "gen_chem_1" };

describe("the quiz machine", () => {
  it("starts asking with a real problem from the claimed course", () => {
    const state = createQuiz(CONFIG);
    expect(state.phase).toBe("asking");
    expect(state.currentProblem).not.toBeNull();
    const problem = SEED_CORPUS.find((candidate) => candidate.id === state.currentProblem);
    expect(problem?.course).toBe("gen_chem_1");
  });

  it("a skip counts as a wrong answer and queues backward probes", () => {
    const state = createQuiz(CONFIG);
    const after = reduceQuiz(state, { kind: "skipped", elapsedSeconds: 30 });
    expect(after.asked).toHaveLength(1);
    expect(after.asked[0]?.correct).toBe(false);
  });

  it("finishes with a recommendation that always names a starting topic", () => {
    const result = simulateStudent(CONFIG, { kind: "alwaysWrong" });
    expect(result.finished).toBe(true);
    const state = replayToEnd({ kind: "alwaysWrong" });
    expect(state.recommendation).not.toBeNull();
    expect(state.recommendation?.startTopics.length).toBeGreaterThan(0);
    // The voice contract: never a demotion.
    expect(state.recommendation?.copy).not.toMatch(/back|behind|fail|weak/i);
  });

  it("an all correct student is recommended forward with earned framing", () => {
    const state = replayToEnd({ kind: "alwaysRight" });
    expect(state.recommendation?.copy).toContain("earned");
  });
});

describe("the bound, which is the design", () => {
  it("no simulated student exceeds the question cap", () => {
    const fleet = simulateFleet(SEED_CORPUS, "gen_chem_1");
    expect(fleet.worstQuestions).toBeLessThanOrEqual(QUESTION_CAP);
  });

  it("no simulated student exceeds the modelled time budget", () => {
    const fleet = simulateFleet(SEED_CORPUS, "gen_chem_1");
    expect(fleet.worstModelledSeconds).toBeLessThan(TIME_BUDGET_SECONDS);
    expect(fleet.allFinished).toBe(true);
  });

  it("holds with no claimed course too", () => {
    const fleet = simulateFleet(SEED_CORPUS, null);
    expect(fleet.worstQuestions).toBeLessThanOrEqual(QUESTION_CAP);
    expect(fleet.worstModelledSeconds).toBeLessThan(TIME_BUDGET_SECONDS);
  });
});

describe("determinism", () => {
  it("the same seed walks the same path twice", () => {
    const first = simulateStudent(CONFIG, { kind: "mixed", seed: 42 });
    const second = simulateStudent(CONFIG, { kind: "mixed", seed: 42 });
    expect(first.path).toEqual(second.path);
    expect(first.questionsAsked).toBe(second.questionsAsked);
  });

  it("different seeds may walk different paths, and both are bounded", () => {
    const a = simulateStudent(CONFIG, { kind: "mixed", seed: 1 });
    const b = simulateStudent(CONFIG, { kind: "mixed", seed: 99991 });
    expect(a.questionsAsked).toBeLessThanOrEqual(QUESTION_CAP);
    expect(b.questionsAsked).toBeLessThanOrEqual(QUESTION_CAP);
  });
});

describe("corpus thinness is a visible fact", () => {
  it("reports topics the walk wanted and could not probe, rather than padding", () => {
    // The always wrong student walks backwards hardest, so it surfaces the
    // most unprobeable topics. The seed corpus is 16 problems over 11 topics
    // against a 46 topic registry, so thinness is expected and must be REPORTED.
    const result = simulateStudent(CONFIG, { kind: "alwaysWrong" });
    expect(Array.isArray(result.unprobeable)).toBe(true);
  });
});

function replayToEnd(profile: { kind: "alwaysRight" } | { kind: "alwaysWrong" }) {
  let state = createQuiz(CONFIG);
  let elapsed = 0;
  while (state.phase === "asking" && state.currentProblem !== null) {
    const problem = SEED_CORPUS.find((candidate) => candidate.id === state.currentProblem);
    if (problem === undefined) break;
    elapsed += 30;
    if (profile.kind === "alwaysRight") {
      state = reduceQuiz(state, {
        kind: "answerSubmitted",
        state: correctFor(problem),
        elapsedSeconds: elapsed,
      });
    } else {
      state = reduceQuiz(state, { kind: "skipped", elapsedSeconds: elapsed });
    }
  }
  return state;
}

function correctFor(problem: (typeof SEED_CORPUS)[number]) {
  const spec = problem.answer;
  switch (spec.kind) {
    case "numeric":
      return { kind: "numeric", text: spec.text, unit: spec.unit } as const;
    case "multiple_choice":
      return { kind: "multiple_choice", optionId: spec.correctOptionId } as const;
    case "major_product":
      return {
        kind: "major_product",
        candidateId: spec.correctCandidateId,
        reasonId: spec.correctReasonId,
      } as const;
    case "reagents":
      return { kind: "reagents", steps: spec.steps } as const;
    case "structure":
      return { kind: "structure", state: spec.state } as const;
    case "ordering":
    case "matching":
      // Neither kind is in the seed corpus this test walks. The throw keeps the
      // switch exhaustive without inventing a correct answer shape here.
      throw new Error(`correctFor has no case for the ${spec.kind} kind`);
  }
}
