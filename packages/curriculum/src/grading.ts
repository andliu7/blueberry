/**
 * The grading result. Never a boolean, and countable by construction.
 *
 * chem-core resolves a mechanism attempt to one of four outcomes, each carrying
 * a named cause, because CLAUDE.md's feedback axis is measured as a percentage
 * and a boolean cannot be measured. This is the same idea for the shapes this
 * package owns, and the result type is built so the two numbers CLAUDE.md's
 * Budgets table asks for fall out of counting, rather than being computed
 * somewhere else and hoped for.
 *
 * FIVE OUTCOMES:
 *
 *   correct             Reached the authored answer under the authored policies.
 *                       Carries the solution copy, because CLAUDE.md says a
 *                       correct step explains why it was right: a student who
 *                       guesses correctly has learned nothing.
 *   named_cause         Tier 1. The checker named what went wrong without needing
 *                       to know which problem this is.
 *   matched_distractor  Tier 2. The submission landed on a predicted wrong answer
 *                       and carries that author's explanation.
 *   unmatched_wrong     Tier 3. Wrong, nothing specific to say. LOGGED, because
 *                       CLAUDE.md says a recurring Tier 3 is a missing Tier 2
 *                       that should be authored and never generated again.
 *   indeterminate       The checker refused to decide. Not correct, not wrong,
 *                       and counted in neither. See the honesty note below.
 *
 * WHY `indeterminate` IS ITS OWN OUTCOME AND NOT A WRONG ANSWER. Today the only
 * source of it is a structure comparison this package cannot make, per the
 * limits written at the top of answers/structure.ts. Folding it into "wrong"
 * would mark a possibly correct student wrong, and folding it into the Tier 3
 * tail would inflate the number the AI budget is a ceiling on with attempts no
 * model call would help. It is reported separately and it should be a number a
 * person watches.
 *
 * THE TIER ORDER, AND THE ONE PLACE THIS DEPARTS FROM A LITERAL READING OF
 * CLAUDE.md. CLAUDE.md says the tiers are consulted in order and "a tier is only
 * reached when the one above it has nothing to say". Read literally, any Tier 1
 * cause would pre-empt every authored distractor. That is right for the causes
 * that are about NOTATION, where the chemistry was right and no distractor
 * applies, and wrong for the causes that are about the VALUE, where an
 * instructor's explanation of this exact mistake on this exact problem is
 * strictly more specific than a cause shared by the whole corpus. So the order
 * here is:
 *
 *   1. a notation cause, if there is one          (Tier 1)
 *   2. an authored distractor, if one matches     (Tier 2)
 *   3. any remaining diagnostic cause             (Tier 1)
 *   4. the tail                                   (Tier 3)
 *
 * This is recorded rather than decided silently, per CLAUDE.md's communication
 * rules, and it is the kind of thing the orchestrator should adjudicate rather
 * than a builder settling alone.
 */

import { checkAnswer, statesMatch, type AnswerState } from "./answer.js";
import { causeSpecificity, type CurriculumCauseId } from "./causes.js";
import type { Explanation } from "./explanation.js";
import type { AttemptId, DistractorId, ProblemId } from "./ids.js";
import type { AnswerKind } from "./kinds.js";
import type { Problem } from "./problem.js";

export type FeedbackTier = 1 | 2 | 3;

/**
 * What a Tier 3 hit records.
 *
 * CLAUDE.md: "Every Tier 3 hit is logged with the state that produced it,
 * because a recurring Tier 3 is a missing Tier 2 that should be authored and
 * never generated again." So the submitted state is carried whole, not a summary
 * of it: the point of the log is that an author can turn the entry directly into
 * a distractor.
 */
export interface Tier3Entry {
  readonly problemId: ProblemId;
  readonly answerKind: AnswerKind;
  readonly submitted: AnswerState;
  readonly checkerCause: CurriculumCauseId;
  readonly detail: string;
}

export type GradingResult =
  | {
      readonly kind: "correct";
      readonly problemId: ProblemId;
      readonly tier: null;
      readonly cause: "matches_authored_answer";
      readonly explanation: Explanation;
    }
  | {
      readonly kind: "named_cause";
      readonly problemId: ProblemId;
      readonly tier: 1;
      readonly cause: CurriculumCauseId;
      readonly detail: string;
    }
  | {
      readonly kind: "matched_distractor";
      readonly problemId: ProblemId;
      readonly tier: 2;
      readonly distractorId: DistractorId;
      readonly explanation: Explanation;
      /** What the checker itself said. Kept so a report can group Tier 2 hits. */
      readonly checkerCause: CurriculumCauseId;
    }
  | {
      readonly kind: "unmatched_wrong";
      readonly problemId: ProblemId;
      readonly tier: 3;
      readonly cause: CurriculumCauseId;
      readonly detail: string;
      readonly log: Tier3Entry;
    }
  | {
      readonly kind: "indeterminate";
      readonly problemId: ProblemId;
      readonly tier: null;
      readonly cause: CurriculumCauseId;
      readonly detail: string;
    };

export interface Attempt {
  readonly id: AttemptId;
  readonly problemId: ProblemId;
  readonly submitted: AnswerState;
}

/**
 * Grade one submission. Never throws.
 *
 * The authoring path throws and the grading path reports, which is the split
 * chem-core and packages/interaction already use: constructors refuse defects,
 * reducers report. A student's answer is data, not a defect, however wrong it is.
 */
export function gradeAttempt(problem: Problem, submitted: AnswerState): GradingResult {
  const verdict = checkAnswer(problem.answer, submitted);

  if (verdict.outcome === "correct") {
    return {
      kind: "correct",
      problemId: problem.id,
      tier: null,
      cause: "matches_authored_answer",
      explanation: problem.solution,
    };
  }
  if (verdict.outcome === "undecided") {
    return {
      kind: "indeterminate",
      problemId: problem.id,
      tier: null,
      cause: verdict.cause,
      detail: verdict.detail,
    };
  }

  const specificity = causeSpecificity(verdict.cause);
  if (specificity === "notation") {
    return {
      kind: "named_cause",
      problemId: problem.id,
      tier: 1,
      cause: verdict.cause,
      detail: verdict.detail,
    };
  }

  for (const distractor of problem.distractors) {
    if (statesMatch(problem.answer, distractor.state, submitted, distractor.tolerance)) {
      return {
        kind: "matched_distractor",
        problemId: problem.id,
        tier: 2,
        distractorId: distractor.id,
        explanation: distractor.explanation,
        checkerCause: verdict.cause,
      };
    }
  }

  if (specificity === "diagnostic") {
    return {
      kind: "named_cause",
      problemId: problem.id,
      tier: 1,
      cause: verdict.cause,
      detail: verdict.detail,
    };
  }

  return {
    kind: "unmatched_wrong",
    problemId: problem.id,
    tier: 3,
    cause: verdict.cause,
    detail: verdict.detail,
    log: {
      problemId: problem.id,
      answerKind: problem.answer.kind,
      submitted,
      checkerCause: verdict.cause,
      detail: verdict.detail,
    },
  };
}

export function isWrong(result: GradingResult): boolean {
  return (
    result.kind === "named_cause" ||
    result.kind === "matched_distractor" ||
    result.kind === "unmatched_wrong"
  );
}

export interface TierBreakdown {
  readonly total: number;
  readonly correct: number;
  readonly wrong: number;
  readonly indeterminate: number;
  readonly tier1: number;
  readonly tier2: number;
  readonly tier3: number;
  /**
   * Tier 2 as a percentage of wrong attempts.
   *
   * The builder brief for this package asks for this number against 90 percent.
   * CLAUDE.md's Budgets table gates the row "Wrong attempts resolved without a
   * model call" at 90 percent "at Tier 1 or Tier 2", which is the field below.
   * Both are reported because they are different measurements and the file that
   * wins is CLAUDE.md.
   */
  readonly tier2PercentOfWrong: number;
  /** The Budgets row: Tier 1 plus Tier 2, over wrong attempts. */
  readonly resolvedWithoutModelCallPercent: number;
}

export function tierBreakdown(results: readonly GradingResult[]): TierBreakdown {
  const correct = results.filter((result) => result.kind === "correct").length;
  const indeterminate = results.filter((result) => result.kind === "indeterminate").length;
  const tier1 = results.filter((result) => result.kind === "named_cause").length;
  const tier2 = results.filter((result) => result.kind === "matched_distractor").length;
  const tier3 = results.filter((result) => result.kind === "unmatched_wrong").length;
  const wrong = tier1 + tier2 + tier3;
  return {
    total: results.length,
    correct,
    wrong,
    indeterminate,
    tier1,
    tier2,
    tier3,
    tier2PercentOfWrong: wrong === 0 ? 0 : (tier2 / wrong) * 100,
    resolvedWithoutModelCallPercent: wrong === 0 ? 0 : ((tier1 + tier2) / wrong) * 100,
  };
}

/** Every Tier 3 hit, ready to be read by whoever authors the missing distractor. */
export function tier3Entries(results: readonly GradingResult[]): readonly Tier3Entry[] {
  return results
    .filter((result): result is Extract<GradingResult, { kind: "unmatched_wrong" }> =>
      result.kind === "unmatched_wrong",
    )
    .map((result) => result.log);
}
