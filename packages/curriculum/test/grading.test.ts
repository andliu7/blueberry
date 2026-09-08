/**
 * The tier order, and the counters the Budgets table reads.
 *
 * The order asserted here is the one argued for at the top of grading.ts: a
 * NOTATION cause pre-empts distractor matching, because no distractor is about
 * notation, and a DIAGNOSTIC cause does not, because an authored explanation of
 * this mistake on this problem is more specific than a cause the whole corpus
 * shares.
 */

import { describe, expect, it } from "vitest";
import { createNumericAnswer } from "../src/answers/numeric.ts";
import { gradeAttempt, isWrong, tier3Entries, tierBreakdown } from "../src/grading.ts";
import { createProblem } from "../src/problem.ts";

const copy = {
  whatHappened: "This is the volume ratio applied the other way round.",
  why: "Pressure and volume move in opposite directions when the temperature is held fixed.",
  lookAt: "Solve P1 V1 equals P2 V2 for the unknown before substituting.",
};

const problem = createProblem({
  id: "test-boyle",
  course: "gen_chem_1",
  topic: "gas_laws",
  difficulty: 800,
  prompt: "A 2.50 L sample at 1.00 atm is compressed to 1.25 L. What is the new pressure?",
  answer: createNumericAnswer({ text: "2.00", unit: "atm" }),
  solution: {
    whatHappened: "Halving the volume doubles the pressure, giving 2.00 atm.",
    why: "The same molecules now strike half the wall area, so each unit of area takes twice as many collisions.",
    lookAt: "Check the direction first: a smaller volume has to give a larger pressure.",
  },
  distractors: [
    { id: "inverted", state: { kind: "numeric", text: "0.500", unit: "atm" }, explanation: copy },
  ],
});

function grade(text: string, unit: string | null = "atm") {
  return gradeAttempt(problem, { kind: "numeric", text, unit });
}

describe("gradeAttempt", () => {
  it("carries the solution copy on a correct answer", () => {
    const result = grade("2.00");
    expect(result.kind).toBe("correct");
    if (result.kind !== "correct") throw new Error("expected correct");
    expect(result.cause).toBe("matches_authored_answer");
    expect(result.explanation.why).toContain("collisions");
    expect(result.tier).toBeNull();
  });

  it("puts a notation cause at Tier 1, ahead of any distractor", () => {
    const result = grade("2.0");
    expect(result).toMatchObject({ kind: "named_cause", tier: 1, cause: "significant_figures_too_few" });
  });

  it("puts an anticipated wrong answer at Tier 2, ahead of the checker's own diagnosis", () => {
    const result = grade("0.500");
    expect(result).toMatchObject({ kind: "matched_distractor", tier: 2, distractorId: "inverted" });
    if (result.kind !== "matched_distractor") throw new Error("expected a distractor match");
    // The checker also had a name for it. The authored explanation wins because
    // it is about this problem.
    expect(result.checkerCause).toBe("reciprocal_of_expected_value");
    expect(result.explanation.lookAt).toContain("P1 V1");
  });

  it("falls back to a diagnostic cause at Tier 1 when no distractor matches", () => {
    const result = grade("20.0");
    expect(result).toMatchObject({ kind: "named_cause", tier: 1, cause: "off_by_power_of_ten" });
  });

  it("reaches the Tier 3 tail only when nothing specific applies, and logs it", () => {
    const result = grade("3.17");
    expect(result).toMatchObject({ kind: "unmatched_wrong", tier: 3, cause: "value_outside_tolerance" });
    if (result.kind !== "unmatched_wrong") throw new Error("expected the tail");
    expect(result.log.submitted).toEqual({ kind: "numeric", text: "3.17", unit: "atm" });
    expect(result.log.answerKind).toBe("numeric");
  });

  it("reports a submission of the wrong kind rather than throwing", () => {
    const result = gradeAttempt(problem, { kind: "multiple_choice", optionId: "a" });
    expect(result).toMatchObject({
      kind: "indeterminate",
      cause: "submission_kind_does_not_match_problem",
    });
  });
});

describe("counters", () => {
  it("counts the tiers and reports both rates", () => {
    const results = [
      grade("2.00"), // correct
      grade("2.0"), // tier 1, notation
      grade("0.500"), // tier 2
      grade("20.0"), // tier 1, diagnostic
      grade("3.17"), // tier 3
      gradeAttempt(problem, { kind: "multiple_choice", optionId: "a" }), // indeterminate
    ];
    const breakdown = tierBreakdown(results);
    expect(breakdown).toMatchObject({
      total: 6,
      correct: 1,
      wrong: 4,
      indeterminate: 1,
      tier1: 2,
      tier2: 1,
      tier3: 1,
    });
    expect(breakdown.tier2PercentOfWrong).toBeCloseTo(25, 9);
    expect(breakdown.resolvedWithoutModelCallPercent).toBeCloseTo(75, 9);
    expect(results.filter(isWrong)).toHaveLength(4);
    expect(tier3Entries(results)).toHaveLength(1);
  });

  it("reports zero rather than dividing by zero when nothing was wrong", () => {
    const breakdown = tierBreakdown([grade("2.00")]);
    expect(breakdown.wrong).toBe(0);
    expect(breakdown.resolvedWithoutModelCallPercent).toBe(0);
  });
});

describe("authoring refusals", () => {
  it("refuses a distractor that grades correct", () => {
    expect(() =>
      createProblem({
        id: "test-second-right-answer",
        course: "gen_chem_1",
        topic: "gas_laws",
        difficulty: 800,
        prompt: "Same problem",
        answer: createNumericAnswer({ text: "2.00", unit: "atm" }),
        solution: copy,
        distractors: [
          { id: "not-wrong", state: { kind: "numeric", text: "2.00", unit: "atm" }, explanation: copy },
        ],
      }),
    ).toThrow(/grades CORRECT/);
  });

  it("refuses two distractors at the same point in answer space", () => {
    expect(() =>
      createProblem({
        id: "test-colliding",
        course: "gen_chem_1",
        topic: "gas_laws",
        difficulty: 800,
        prompt: "Same problem",
        answer: createNumericAnswer({ text: "2.00", unit: "atm" }),
        solution: copy,
        distractors: [
          { id: "a", state: { kind: "numeric", text: "0.500", unit: "atm" }, explanation: copy },
          { id: "b", state: { kind: "numeric", text: "380.", unit: "torr" }, explanation: copy },
        ],
      }),
    ).toThrow(/same point in/);
  });

  it("refuses copy that breaks the voice contract", () => {
    expect(() =>
      createProblem({
        id: "test-voice",
        course: "gen_chem_1",
        topic: "gas_laws",
        difficulty: 800,
        prompt: "Same problem",
        answer: createNumericAnswer({ text: "2.00", unit: "atm" }),
        solution: {
          whatHappened: "You should have doubled the pressure.",
          why: "Obviously the volume halved.",
          lookAt: "Try again.",
        },
      }),
    ).toThrow(/voice contract/);
  });

  it("refuses a difficulty outside the rating scale", () => {
    expect(() =>
      createProblem({
        id: "test-difficulty",
        course: "gen_chem_1",
        topic: "gas_laws",
        difficulty: 40,
        prompt: "Same problem",
        answer: createNumericAnswer({ text: "2.00", unit: "atm" }),
        solution: copy,
      }),
    ).toThrow(/rating scale/);
  });
});
