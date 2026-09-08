/**
 * The answer union, and the one place a kind is dispatched on.
 *
 * TWO TYPES, NOT ONE, and the distinction is the load bearing idea in this
 * package.
 *
 *   AnswerState  A POINT in answer space. What a student submitted, or what a
 *                distractor predicts they will submit. Just the value.
 *   AnswerSpec   The AUTHORED answer. The correct point, plus the policies that
 *                decide what counts as reaching it: tolerance, significant figure
 *                policy, unit policy, accepted alternative routes.
 *
 * A distractor holds an `AnswerState`, never an `AnswerSpec`. That is what
 * CLAUDE.md means by "matched on mechanism state, not on prose", carried over to
 * the shapes this package owns: a predicted wrong answer is a value in the same
 * space the student's answer lands in, and matching is the same comparison run
 * against a different point. It is not a string compare of explanations, it is
 * not a regex over what they typed, and it does not go stale when the copy is
 * rewritten.
 *
 * `checkAnswer` is the only switch on `kind` in the grading path. Everything
 * downstream reads a verdict.
 */

import type { CurriculumCauseId } from "./causes.js";
import type { AnswerKind } from "./kinds.js";
import {
  checkMajorProduct,
  checkMultipleChoice,
  majorProductStateMatches,
  multipleChoiceStateMatches,
  type MajorProductAnswerSpec,
  type MajorProductState,
  type MultipleChoiceAnswerSpec,
  type MultipleChoiceState,
} from "./answers/choice.js";
import {
  checkMatching,
  matchingStateMatches,
  type MatchingAnswerSpec,
  type MatchingState,
} from "./answers/matching.js";
import {
  checkOrdering,
  orderingStateMatches,
  type OrderingAnswerSpec,
  type OrderingState,
} from "./answers/ordering.js";
import {
  checkNumeric,
  numericStateMatches,
  type NumericAnswerSpec,
  type NumericState,
  type Tolerance,
} from "./answers/numeric.js";
import {
  checkReagents,
  reagentStateMatches,
  type ReagentState,
  type ReagentsAnswerSpec,
} from "./answers/reagents.js";
import {
  checkStructure,
  structureStateMatches,
  type StructureAnswerSpec,
  type StructureState,
} from "./answers/structure.js";

export type AnswerSpec =
  | NumericAnswerSpec
  | MultipleChoiceAnswerSpec
  | StructureAnswerSpec
  | ReagentsAnswerSpec
  | MajorProductAnswerSpec
  | OrderingAnswerSpec
  | MatchingAnswerSpec;

export type AnswerState =
  | NumericState
  | MultipleChoiceState
  | StructureState
  | ReagentState
  | MajorProductState
  | OrderingState
  | MatchingState;

export type AnswerVerdict =
  | { readonly outcome: "correct" }
  | { readonly outcome: "wrong"; readonly cause: CurriculumCauseId; readonly detail: string }
  | { readonly outcome: "undecided"; readonly cause: CurriculumCauseId; readonly detail: string };

export function answerKindOf(value: AnswerSpec | AnswerState): AnswerKind {
  return value.kind;
}

/**
 * Grade one submission against one authored answer.
 *
 * NEVER THROWS. A submission of the wrong kind is a defect in the calling shell,
 * and it is reported as an undecided verdict rather than thrown, because this
 * runs in front of a student and a crash at 1am is worse than a report. The
 * authoring path is where this package throws: see problem.ts.
 */
export function checkAnswer(spec: AnswerSpec, state: AnswerState): AnswerVerdict {
  if (spec.kind !== state.kind) {
    return {
      outcome: "undecided",
      cause: "submission_kind_does_not_match_problem",
      detail: `problem is ${spec.kind}, submission is ${state.kind}`,
    };
  }
  switch (spec.kind) {
    case "numeric":
      return checkNumeric(spec, state as NumericState);
    case "multiple_choice":
      return checkMultipleChoice(spec, state as MultipleChoiceState);
    case "structure":
      return checkStructure(spec, state as StructureState);
    case "reagents":
      return checkReagents(spec, state as ReagentState);
    case "major_product":
      return checkMajorProduct(spec, state as MajorProductState);
    case "ordering":
      return checkOrdering(spec, state as OrderingState);
    case "matching":
      return checkMatching(spec, state as MatchingState);
    default: {
      // Exhaustiveness: adding a kind without a checker is a compile error here.
      const unreachable: never = spec;
      return {
        outcome: "undecided",
        cause: "submission_kind_does_not_match_problem",
        detail: `no checker for ${JSON.stringify(unreachable)}`,
      };
    }
  }
}

/**
 * Whether a submission is at the same point in answer space as a predicted wrong
 * answer.
 *
 * The spec is passed because two kinds need policy to compare points at all:
 * numeric needs a tolerance, and reagents need the problem's equivalence groups
 * and whether order counts. Neither reads the CORRECT answer out of it.
 */
export function statesMatch(
  spec: AnswerSpec,
  target: AnswerState,
  submitted: AnswerState,
  numericTolerance?: Tolerance,
): boolean {
  if (target.kind !== submitted.kind) return false;
  if (target.kind !== spec.kind) return false;
  switch (target.kind) {
    case "numeric":
      return numericStateMatches(target, submitted as NumericState, numericTolerance);
    case "multiple_choice":
      return multipleChoiceStateMatches(target, submitted as MultipleChoiceState);
    case "structure":
      return structureStateMatches(target, submitted as StructureState);
    case "reagents": {
      const reagentSpec = spec as ReagentsAnswerSpec;
      return reagentStateMatches(
        target,
        submitted as ReagentState,
        reagentSpec.equivalents,
        reagentSpec.mode,
      );
    }
    case "major_product":
      return majorProductStateMatches(target, submitted as MajorProductState);
    case "ordering":
      return orderingStateMatches(target, submitted as OrderingState);
    case "matching":
      return matchingStateMatches(target, submitted as MatchingState);
    default: {
      const unreachable: never = target;
      void unreachable;
      return false;
    }
  }
}
