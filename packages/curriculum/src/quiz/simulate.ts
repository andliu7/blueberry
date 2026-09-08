/**
 * Simulated students through the real quiz machine.
 *
 * This is the measured half of the 180 second exit condition, and it is honest
 * about what it is: the TIME is a model (WORST_CASE_SECONDS_BY_KIND), the WALK
 * is real. Every simulated student runs through createQuiz and reduceQuiz with
 * real problems and real grading, so the question counts and the paths are
 * facts; only the seconds are assumptions, and they err high on purpose.
 *
 * Determinism: a student profile plus a seed always produces the same path.
 * The mixed profile uses a small linear congruential generator seeded by the
 * caller, never Math.random, so a validator can run the same student twice and
 * assert the paths are identical.
 */

import type { AnswerState } from "../answer.js";
import type { Problem } from "../problem.js";
import {
  createQuiz,
  reduceQuiz,
  WORST_CASE_SECONDS_BY_KIND,
  type QuizConfig,
  type QuizState,
} from "./machine.js";
import type { CourseId } from "../placement.js";

export type StudentProfile =
  | { readonly kind: "alwaysRight" }
  | { readonly kind: "alwaysWrong" }
  | { readonly kind: "rightUntilQuestion"; readonly n: number }
  | { readonly kind: "mixed"; readonly seed: number };

export interface SimulationResult {
  readonly profile: StudentProfile;
  readonly questionsAsked: number;
  readonly modelledSeconds: number;
  readonly path: readonly string[];
  readonly finished: boolean;
  readonly unprobeable: readonly string[];
}

/**
 * The right answer, derived from the spec per kind. The spec is policies plus
 * the authored answer; this reconstructs the submission a perfect student makes.
 */
function correctStateFor(problem: Problem): AnswerState {
  const spec = problem.answer;
  switch (spec.kind) {
    case "numeric":
      return { kind: "numeric", text: spec.text, unit: spec.unit };
    case "multiple_choice":
      return { kind: "multiple_choice", optionId: spec.correctOptionId };
    case "major_product":
      return {
        kind: "major_product",
        candidateId: spec.correctCandidateId,
        reasonId: spec.correctReasonId,
      };
    case "reagents":
      return { kind: "reagents", steps: spec.steps };
    case "structure":
      return { kind: "structure", state: spec.state };
    case "ordering":
      return { kind: "ordering", order: spec.correctOrder };
    case "matching":
      return { kind: "matching", pairs: spec.pairs };
  }
}

/** A wrong answer: the first distractor's state, which is authored to grade wrong. */
function wrongStateFor(problem: Problem): AnswerState {
  const distractor = problem.distractors[0];
  if (distractor === undefined) {
    throw new Error(
      `problem ${problem.id} has no distractor to use as a wrong answer; the corpus check requires at least one, so this should be unreachable`,
    );
  }
  return distractor.state;
}

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function simulateStudent(
  config: QuizConfig,
  profile: StudentProfile,
): SimulationResult {
  const random = profile.kind === "mixed" ? lcg(profile.seed) : null;
  let state: QuizState = createQuiz(config);
  let elapsed = 0;
  const path: string[] = [];
  let questionNumber = 0;

  while (state.phase === "asking" && state.currentProblem !== null) {
    const problem = config.problems.find((candidate) => candidate.id === state.currentProblem);
    if (problem === undefined) break;
    questionNumber += 1;
    path.push(problem.id);
    elapsed += WORST_CASE_SECONDS_BY_KIND[problem.answer.kind];

    const answerRight =
      profile.kind === "alwaysRight" ? true
      : profile.kind === "alwaysWrong" ? false
      : profile.kind === "rightUntilQuestion" ? questionNumber < profile.n
      : (random as () => number)() < 0.5;

    state = reduceQuiz(state, {
      kind: "answerSubmitted",
      state: answerRight ? correctStateFor(problem) : wrongStateFor(problem),
      elapsedSeconds: elapsed,
    });
  }

  return {
    profile,
    questionsAsked: state.asked.length,
    modelledSeconds: elapsed,
    path,
    finished: state.phase === "finished",
    unprobeable: state.recommendation?.unprobeable ?? state.unprobeable,
  };
}

export interface FleetResult {
  readonly results: readonly SimulationResult[];
  readonly worstQuestions: number;
  readonly worstModelledSeconds: number;
  readonly allFinished: boolean;
}

/** The standard fleet the validator check runs. Deterministic, seeds fixed. */
export function simulateFleet(problems: readonly Problem[], claimedCourse: CourseId | null): FleetResult {
  const config: QuizConfig = { problems, claimedCourse };
  const profiles: StudentProfile[] = [
    { kind: "alwaysRight" },
    { kind: "alwaysWrong" },
    { kind: "rightUntilQuestion", n: 2 },
    { kind: "rightUntilQuestion", n: 4 },
    { kind: "mixed", seed: 7 },
    { kind: "mixed", seed: 1234 },
    { kind: "mixed", seed: 987654 },
  ];
  const results = profiles.map((profile) => simulateStudent(config, profile));
  return {
    results,
    worstQuestions: Math.max(...results.map((result) => result.questionsAsked)),
    worstModelledSeconds: Math.max(...results.map((result) => result.modelledSeconds)),
    allFinished: results.every((result) => result.finished),
  };
}
