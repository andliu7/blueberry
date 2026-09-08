/**
 * The two answer kinds whose answer space is a finite authored list: multiple
 * choice, and pick the major product with its reason.
 *
 * These two are together because the second is the first with a second axis, and
 * because both share the property that makes them different from every other
 * kind here: THE WRONG ANSWERS ARE ENUMERABLE. There are five options, so there
 * are four wrong answers, and an author can write an explanation for each one.
 * problem.ts turns that into a construction time refusal: a multiple choice
 * problem with an unexplained option does not build. Nothing else in this
 * package can make that demand, because nothing else has a finite answer space.
 *
 * MAJOR PRODUCT IS TWO CHOICES, and CLAUDE.md's answer shape table is explicit
 * about why: the student supplies "a choice among candidate products, and the
 * reason it wins". A student who picks the right product from the wrong argument
 * has not learned the chemistry, and grading only the product hides that
 * completely. `right_product_wrong_reason` is the cause that exists for it and
 * it is one of the more useful things this package can tell a person.
 */

import type { OptionId } from "../ids.js";
import type { CurriculumCauseId } from "../causes.js";

export interface ChoiceOption {
  readonly id: OptionId;
  /** Student facing. A structure is referred to by label here; rendering is Phase 4. */
  readonly text: string;
}

export interface MultipleChoiceState {
  readonly kind: "multiple_choice";
  readonly optionId: OptionId;
}

export interface MultipleChoiceAnswerSpec {
  readonly kind: "multiple_choice";
  readonly options: readonly ChoiceOption[];
  readonly correctOptionId: OptionId;
}

export interface MajorProductState {
  readonly kind: "major_product";
  readonly candidateId: OptionId;
  /**
   * The ranking argument. Null when the student picked a product and no reason,
   * which is a real submission and not an error: a shell may collect them in two
   * taps and grade after the first.
   */
  readonly reasonId: OptionId | null;
}

export interface MajorProductAnswerSpec {
  readonly kind: "major_product";
  readonly candidates: readonly ChoiceOption[];
  readonly reasons: readonly ChoiceOption[];
  readonly correctCandidateId: OptionId;
  readonly correctReasonId: OptionId;
}

export type ChoiceVerdict =
  | { readonly outcome: "correct" }
  | { readonly outcome: "wrong"; readonly cause: CurriculumCauseId; readonly detail: string };

function optionIds(options: readonly ChoiceOption[]): readonly OptionId[] {
  return options.map((option) => option.id);
}

/** Refuses a malformed option list. Called by problem.ts at authoring time. */
export function assertOptionsValid(options: readonly ChoiceOption[], label: string): void {
  if (options.length < 2) {
    throw new Error(`${label} needs at least two options, got ${options.length}`);
  }
  const seen = new Set<OptionId>();
  for (const option of options) {
    if (option.id.trim() === "") {
      throw new Error(`${label} has an option with an empty id`);
    }
    if (option.text.trim() === "") {
      throw new Error(`${label} option ${option.id} has empty text`);
    }
    if (seen.has(option.id)) {
      throw new Error(`${label} has two options with id ${option.id}`);
    }
    seen.add(option.id);
  }
}

export function createMultipleChoiceAnswer(input: {
  readonly options: readonly ChoiceOption[];
  readonly correctOptionId: OptionId;
}): MultipleChoiceAnswerSpec {
  assertOptionsValid(input.options, "multiple choice");
  if (!optionIds(input.options).includes(input.correctOptionId)) {
    throw new Error(`correctOptionId ${input.correctOptionId} is not one of the options`);
  }
  return Object.freeze({
    kind: "multiple_choice" as const,
    options: Object.freeze([...input.options]),
    correctOptionId: input.correctOptionId,
  });
}

export function createMajorProductAnswer(input: {
  readonly candidates: readonly ChoiceOption[];
  readonly reasons: readonly ChoiceOption[];
  readonly correctCandidateId: OptionId;
  readonly correctReasonId: OptionId;
}): MajorProductAnswerSpec {
  assertOptionsValid(input.candidates, "major product candidates");
  assertOptionsValid(input.reasons, "major product reasons");
  if (!optionIds(input.candidates).includes(input.correctCandidateId)) {
    throw new Error(`correctCandidateId ${input.correctCandidateId} is not one of the candidates`);
  }
  if (!optionIds(input.reasons).includes(input.correctReasonId)) {
    throw new Error(`correctReasonId ${input.correctReasonId} is not one of the reasons`);
  }
  return Object.freeze({
    kind: "major_product" as const,
    candidates: Object.freeze([...input.candidates]),
    reasons: Object.freeze([...input.reasons]),
    correctCandidateId: input.correctCandidateId,
    correctReasonId: input.correctReasonId,
  });
}

/** Exact match. There is nothing to be approximate about in a list of five. */
export function checkMultipleChoice(
  spec: MultipleChoiceAnswerSpec,
  state: MultipleChoiceState,
): ChoiceVerdict {
  if (state.optionId === spec.correctOptionId) return { outcome: "correct" };
  return {
    outcome: "wrong",
    cause: "option_is_not_the_correct_one",
    detail: `selected ${state.optionId}, answer is ${spec.correctOptionId}`,
  };
}

export function checkMajorProduct(
  spec: MajorProductAnswerSpec,
  state: MajorProductState,
): ChoiceVerdict {
  const productRight = state.candidateId === spec.correctCandidateId;
  const reasonRight = state.reasonId === spec.correctReasonId;

  if (productRight && reasonRight) return { outcome: "correct" };
  if (productRight) {
    return {
      outcome: "wrong",
      cause: "right_product_wrong_reason",
      detail:
        state.reasonId === null
          ? "product selected with no ranking argument"
          : `reason ${state.reasonId}, answer is ${spec.correctReasonId}`,
    };
  }
  if (reasonRight) {
    return {
      outcome: "wrong",
      cause: "right_reason_wrong_product",
      detail: `argument ${state.reasonId} does not pick out ${state.candidateId}`,
    };
  }
  return {
    outcome: "wrong",
    cause: "option_is_not_the_correct_one",
    detail: `selected ${state.candidateId} for ${String(state.reasonId)}`,
  };
}

export function multipleChoiceStateMatches(
  target: MultipleChoiceState,
  submitted: MultipleChoiceState,
): boolean {
  return target.optionId === submitted.optionId;
}

/**
 * A major product distractor matches on the candidate, and on the reason only if
 * it names one.
 *
 * An author writing a distractor for "picked the anti Markovnikov product"
 * usually means it whatever argument the student attached, because the product
 * choice is the mistake. Naming a reason as well narrows the distractor to one
 * specific pairing, which is what an author wants when the interesting mistake
 * is the ARGUMENT rather than the structure.
 */
export function majorProductStateMatches(
  target: MajorProductState,
  submitted: MajorProductState,
): boolean {
  if (target.candidateId !== submitted.candidateId) return false;
  if (target.reasonId === null) return true;
  return target.reasonId === submitted.reasonId;
}
