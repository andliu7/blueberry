/**
 * Multiple choice and major product, including the construction time rule that
 * every wrong option carries an explanation.
 */

import { describe, expect, it } from "vitest";
import {
  checkMajorProduct,
  checkMultipleChoice,
  createMajorProductAnswer,
  createMultipleChoiceAnswer,
  majorProductStateMatches,
} from "../src/answers/choice.ts";
import { createProblem } from "../src/problem.ts";

const copy = {
  whatHappened: "This option names the wrong compound.",
  why: "The evidence in the question points somewhere else.",
  lookAt: "Compare the two pieces of evidence against each candidate in turn.",
};

const choice = createMultipleChoiceAnswer({
  options: [
    { id: "a", text: "First" },
    { id: "b", text: "Second" },
    { id: "c", text: "Third" },
  ],
  correctOptionId: "a",
});

describe("multiple choice", () => {
  it("matches exactly", () => {
    expect(checkMultipleChoice(choice, { kind: "multiple_choice", optionId: "a" })).toEqual({
      outcome: "correct",
    });
    expect(checkMultipleChoice(choice, { kind: "multiple_choice", optionId: "b" })).toMatchObject({
      outcome: "wrong",
      cause: "option_is_not_the_correct_one",
    });
  });

  it("refuses an option list with a duplicate id", () => {
    expect(() =>
      createMultipleChoiceAnswer({
        options: [
          { id: "a", text: "First" },
          { id: "a", text: "Also first" },
        ],
        correctOptionId: "a",
      }),
    ).toThrow(/two options with id/);
  });

  it("refuses a correct id that is not in the list", () => {
    expect(() =>
      createMultipleChoiceAnswer({
        options: [
          { id: "a", text: "First" },
          { id: "b", text: "Second" },
        ],
        correctOptionId: "z",
      }),
    ).toThrow(/not one of the options/);
  });

  it("refuses a problem that leaves a wrong option unexplained", () => {
    expect(() =>
      createProblem({
        id: "test-uncovered",
        course: "gen_chem_1",
        topic: "stoichiometry",
        difficulty: 1000,
        prompt: "Which one",
        answer: choice,
        solution: copy,
        distractors: [
          { id: "d-b", state: { kind: "multiple_choice", optionId: "b" }, explanation: copy },
        ],
      }),
    ).toThrow(/no authored explanation/);
  });

  it("builds when every wrong option is explained", () => {
    const problem = createProblem({
      id: "test-covered",
      course: "gen_chem_1",
      topic: "stoichiometry",
      difficulty: 1000,
      prompt: "Which one",
      answer: choice,
      solution: copy,
      distractors: [
        { id: "d-b", state: { kind: "multiple_choice", optionId: "b" }, explanation: copy },
        { id: "d-c", state: { kind: "multiple_choice", optionId: "c" }, explanation: copy },
      ],
    });
    expect(problem.distractors).toHaveLength(2);
  });
});

const major = createMajorProductAnswer({
  candidates: [
    { id: "p1", text: "The tertiary bromide" },
    { id: "p2", text: "The secondary bromide" },
  ],
  reasons: [
    { id: "r1", text: "The more stable cation forms first" },
    { id: "r2", text: "The less hindered carbon is attacked" },
  ],
  correctCandidateId: "p1",
  correctReasonId: "r1",
});

describe("major product", () => {
  it("needs both halves", () => {
    expect(checkMajorProduct(major, { kind: "major_product", candidateId: "p1", reasonId: "r1" })).toEqual({
      outcome: "correct",
    });
  });

  it("names the right product with the wrong argument", () => {
    expect(
      checkMajorProduct(major, { kind: "major_product", candidateId: "p1", reasonId: "r2" }),
    ).toMatchObject({ cause: "right_product_wrong_reason" });
  });

  it("names the right argument applied to the wrong product", () => {
    expect(
      checkMajorProduct(major, { kind: "major_product", candidateId: "p2", reasonId: "r1" }),
    ).toMatchObject({ cause: "right_reason_wrong_product" });
  });

  it("treats a product with no argument as an unfinished answer, not a correct one", () => {
    expect(
      checkMajorProduct(major, { kind: "major_product", candidateId: "p1", reasonId: null }),
    ).toMatchObject({ cause: "right_product_wrong_reason" });
  });

  it("matches a distractor on the candidate alone when it names no reason", () => {
    const target = { kind: "major_product", candidateId: "p2", reasonId: null } as const;
    expect(majorProductStateMatches(target, { kind: "major_product", candidateId: "p2", reasonId: "r1" })).toBe(true);
    expect(majorProductStateMatches(target, { kind: "major_product", candidateId: "p2", reasonId: "r2" })).toBe(true);
    expect(majorProductStateMatches(target, { kind: "major_product", candidateId: "p1", reasonId: "r2" })).toBe(false);
  });

  it("narrows to one pairing when the distractor names a reason", () => {
    const target = { kind: "major_product", candidateId: "p1", reasonId: "r2" } as const;
    expect(majorProductStateMatches(target, { kind: "major_product", candidateId: "p1", reasonId: "r2" })).toBe(true);
    expect(majorProductStateMatches(target, { kind: "major_product", candidateId: "p1", reasonId: null })).toBe(false);
  });
});
