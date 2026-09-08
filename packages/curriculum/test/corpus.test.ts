/**
 * The seed corpus, run through the real checkers.
 *
 * Three properties are asserted over every authored problem, and each one is a
 * different way for the corpus and the engine to disagree:
 *
 *   The authored answer grades CORRECT. A checker that cannot accept the answer
 *   its own author wrote is broken, and this is the assertion that catches a
 *   tolerance, a unit, or a significant figure policy that was never tried.
 *
 *   Every distractor grades WRONG, and grades wrong by matching ITSELF. The
 *   first half is enforced at construction time in problem.ts; the second is
 *   asserted here, because a distractor that does not match its own state is a
 *   distractor no student can ever reach.
 *
 *   The copy passes the voice lint. Also enforced at construction, and asserted
 *   here so the number is visible in a test report rather than only in the
 *   absence of an exception.
 *
 * The counts at the bottom are the numbers BUILD-PROMPT.md Phase 3 asks to see
 * reported. They are written as lower bounds rather than exact figures, because
 * an exact count in a test is a line somebody edits down when the corpus shrinks,
 * and a shrinking corpus is the thing worth catching.
 */

import { describe, expect, it } from "vitest";
import { checkAnswer, type AnswerSpec, type AnswerState } from "../src/answer.ts";
import { SEED_CORPUS } from "../src/corpus/index.ts";
import { voiceViolations } from "../src/explanation.ts";
import { gradeAttempt, tierBreakdown } from "../src/grading.ts";
import { ANSWER_KINDS } from "../src/kinds.ts";
import { distractorCoverage } from "../src/problem.ts";
import { topicDefinition } from "../src/placement.ts";

/** The submission a student makes when they get it exactly right. */
function correctSubmission(spec: AnswerSpec): AnswerState {
  switch (spec.kind) {
    case "numeric":
      return { kind: "numeric", text: spec.text, unit: spec.unit };
    case "multiple_choice":
      return { kind: "multiple_choice", optionId: spec.correctOptionId };
    case "structure":
      return { kind: "structure", state: spec.state };
    case "reagents":
      return { kind: "reagents", steps: spec.steps };
    case "major_product":
      return {
        kind: "major_product",
        candidateId: spec.correctCandidateId,
        reasonId: spec.correctReasonId,
      };
    case "ordering":
      return { kind: "ordering", order: spec.correctOrder };
    case "matching":
      return { kind: "matching", pairs: spec.pairs };
  }
}

describe("the seed corpus", () => {
  it("loads", () => {
    expect(SEED_CORPUS.length).toBeGreaterThanOrEqual(15);
  });

  it("has unique problem ids", () => {
    const ids = new Set(SEED_CORPUS.map((problem) => problem.id));
    expect(ids.size).toBe(SEED_CORPUS.length);
  });

  it("places every problem on a topic in the pathway graph", () => {
    for (const problem of SEED_CORPUS) {
      expect(() => topicDefinition(problem.topic)).not.toThrow();
    }
  });

  it("covers at least three topics and at least three answer kinds", () => {
    const topics = new Set(SEED_CORPUS.map((problem) => problem.topic));
    const kinds = new Set(SEED_CORPUS.map((problem) => problem.answer.kind));
    expect(topics.size).toBeGreaterThanOrEqual(3);
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  it("exercises every answer kind this package owns", () => {
    const kinds = new Set(SEED_CORPUS.map((problem) => problem.answer.kind));
    for (const kind of ANSWER_KINDS) {
      expect(kinds.has(kind), `no authored problem uses the ${kind} answer kind`).toBe(true);
    }
  });

  it("grades every authored answer as correct", () => {
    for (const problem of SEED_CORPUS) {
      const result = gradeAttempt(problem, correctSubmission(problem.answer));
      expect(result.kind, `${problem.id} did not accept its own authored answer`).toBe("correct");
    }
  });

  it("grades every distractor as wrong", () => {
    for (const problem of SEED_CORPUS) {
      for (const distractor of problem.distractors) {
        const verdict = checkAnswer(problem.answer, distractor.state);
        expect(verdict.outcome, `${problem.id}/${distractor.id}`).toBe("wrong");
      }
    }
  });

  it("resolves every distractor to itself at Tier 2", () => {
    for (const problem of SEED_CORPUS) {
      for (const distractor of problem.distractors) {
        const result = gradeAttempt(problem, distractor.state);
        expect(result, `${problem.id}/${distractor.id}`).toMatchObject({
          kind: "matched_distractor",
          tier: 2,
          distractorId: distractor.id,
        });
      }
    }
  });

  it("passes the voice lint on every piece of authored copy", () => {
    for (const problem of SEED_CORPUS) {
      expect(voiceViolations(problem.solution), problem.id).toEqual([]);
      for (const distractor of problem.distractors) {
        expect(voiceViolations(distractor.explanation), `${problem.id}/${distractor.id}`).toEqual([]);
      }
    }
  });

  it("carries a difficulty on every problem, so the rating has something to move against", () => {
    for (const problem of SEED_CORPUS) {
      expect(Number.isInteger(problem.difficulty)).toBe(true);
      expect(problem.difficulty).toBeGreaterThanOrEqual(400);
      expect(problem.difficulty).toBeLessThanOrEqual(2400);
    }
  });
});

describe("the numbers Phase 3 asks to see", () => {
  it("reports Tier 2 coverage across the corpus", () => {
    const coverage = distractorCoverage(SEED_CORPUS);
    console.log(
      `corpus: ${coverage.problems} problems, ${coverage.distractorsTotal} distractors, ` +
        `${coverage.percentWithAtLeastOne.toFixed(1)} percent carrying at least one`,
    );
    expect(coverage.withNone).toEqual([]);
    expect(coverage.percentWithAtLeastOne).toBe(100);
    expect(coverage.distractorsTotal).toBeGreaterThanOrEqual(coverage.problems * 2);
  });

  it("resolves every authored distractor without a model call", () => {
    const results = SEED_CORPUS.flatMap((problem) =>
      problem.distractors.map((distractor) => gradeAttempt(problem, distractor.state)),
    );
    const breakdown = tierBreakdown(results);
    console.log(
      `authored wrong answers: ${breakdown.wrong}, Tier 1 ${breakdown.tier1}, Tier 2 ` +
        `${breakdown.tier2}, Tier 3 ${breakdown.tier3}, resolved without a model call ` +
        `${breakdown.resolvedWithoutModelCallPercent.toFixed(1)} percent`,
    );
    expect(breakdown.tier3).toBe(0);
    expect(breakdown.resolvedWithoutModelCallPercent).toBe(100);
  });

  it("is honest that this rate is measured over anticipated answers only", () => {
    // The 100 percent above is a corpus invariant, not a field measurement: every
    // input in it is a distractor the author wrote, so of course a distractor
    // matched. The number that gates the Budgets row is the same rate measured
    // over attempts arriving from OUTSIDE the corpus, which needs Phase 5's shell
    // and Phase 6's attempt history. This test exists to stop the corpus number
    // being read as that one.
    const unanticipated = gradeAttempt(SEED_CORPUS[0] as (typeof SEED_CORPUS)[number], {
      kind: "numeric",
      text: "7.31",
      unit: "atm",
    });
    expect(unanticipated.kind).toBe("unmatched_wrong");
  });
});
