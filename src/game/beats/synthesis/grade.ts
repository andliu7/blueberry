/**
 * Grading a synthesis gap. One entry point, three curriculum checkers behind
 * it, and no chemistry of its own.
 *
 * WHY THERE IS NO CHEMISTRY IN THIS FILE. Every decision about whether an
 * answer is right is made by packages/curriculum: `checkReagents`,
 * `checkStructure` and `checkMajorProduct`. This module chooses which of the
 * three applies, translates their verdict into the repo's four result types,
 * and stops. That boundary is the reason a synthesis gap cannot quietly grow a
 * second, unreviewed definition of "correct" beside the package that already
 * has one and is tested.
 *
 * THE TIER ORDER, and it is CLAUDE.md's, restated as code. Within the two free
 * tiers, SPECIFICITY wins. So on the typed path a submission is compared
 * against the authored chips BEFORE the generic diagnostics run: a chip's `why`
 * was written for that exact mistake, and "you supplied an extra reagent" is a
 * worse sentence than the one an instructor already wrote. Zero tokens either
 * way. Tier 3 is reached only when neither the answer nor any chip matched, and
 * `no_named_cause_logged` is the cause that says so out loud, because a
 * recurring tail entry is a missing chip somebody should author.
 *
 * WHY THE PICK PATH RESOLVES TO A DISTRACTOR AND THE TYPED PATH DIAGNOSES.
 * A pick is a closed choice: every wrong chip is authored and the constructor
 * refuses one with no explanation, so a wrong pick ALWAYS has Tier 2 copy
 * waiting. Typing is open, so a typed answer that matches nothing authored gets
 * the diagnostic causes instead. Same grader, different amount known about the
 * submission.
 *
 * RESULT TYPE THREE IS REACHABLE HERE, and that is deliberate. A chip carrying
 * `builds` is sound chemistry doing a different transformation: picking
 * H2CrO4 where the route wanted PCC really does make the acid. CLAUDE.md says
 * that is `valid_not_requested` carrying the name of what was built, not
 * "wrong", and the union in beats/types.ts makes the name a compile error when
 * it is missing rather than a promise in a comment.
 */

import {
  checkMajorProduct,
  checkReagents,
  checkStructure,
  reagentStateMatches,
  type CurriculumCauseId,
  type ReagentStep,
} from "@blueberry/curriculum";
import type { BeatCauseId, BeatResult, BeatShapeCauseId, MasteryLevel } from "../types";
import { parseTypedAnswer, stepsFromOption } from "./parse";
import {
  answerOption,
  bankOption,
  gapStep,
  reasonOption,
  type BankOption,
  type GapKind,
  type SynthesisGapProblem,
} from "./problem";

/**
 * What the student handed in.
 *
 * A union rather than one shape with optional fields, for the reason the rest
 * of the repo gives: a picked submission cannot have text and a typed one
 * cannot have an option id, and a union makes that the compiler's problem.
 */
export type GapSubmission =
  | { readonly mode: "picked"; readonly optionId: string; readonly reasonId: string | null }
  | { readonly mode: "typed"; readonly text: string };

export interface GradeGapInput {
  readonly problem: SynthesisGapProblem;
  readonly submission: GapSubmission;
  readonly level: MasteryLevel;
  readonly elapsedMs: number;
  /** Passed in rather than read from the clock, so grading is pure. */
  readonly now: Date;
}

/**
 * Curriculum causes to beat shape causes.
 *
 * Two closed unions owned by two packages, so the translation is a function
 * rather than a cast. The default arm is `no_named_cause_logged` on purpose:
 * silently inventing a plausible cause for a checker verdict this file does not
 * recognise would put a wrong sentence in front of a student, where the tail
 * puts an honest one and a log line somebody can act on.
 */
export function beatCauseForCurriculumCause(cause: CurriculumCauseId): BeatShapeCauseId {
  switch (cause) {
    case "reagent_set_incomplete":
    case "synthesis_step_count_wrong":
      return "synthesis_step_missing";
    case "synthesis_steps_out_of_order":
      return "synthesis_step_out_of_order";
    case "reagent_set_has_extra_reagent":
    case "reagent_set_does_not_match":
      return "reagent_right_class_wrong_reagent";
    default:
      return "no_named_cause_logged";
  }
}

interface ResultShell {
  readonly beatId: string;
  readonly level: MasteryLevel;
  readonly elapsedMs: number;
  readonly at: string;
}

function shell(input: GradeGapInput): ResultShell {
  return {
    beatId: input.problem.id,
    level: input.level,
    elapsedMs: input.elapsedMs,
    at: input.now.toISOString(),
  };
}

function correct(base: ResultShell): BeatResult {
  return { ...base, kind: "correct", cause: "matches_requested_route" };
}

function alternative(base: ResultShell, routeTaken: string): BeatResult {
  return {
    ...base,
    kind: "correct_alternative_route",
    cause: "alternative_route_same_product",
    routeTaken,
  };
}

function invalid(base: ResultShell, cause: BeatCauseId, distractorId?: string): BeatResult {
  return {
    ...base,
    kind: "invalid",
    cause,
    ...(distractorId === undefined ? {} : { distractorId }),
  };
}

/** A wrong chip, resolved through its own authored copy. Tier 2. */
function fromDistractor(base: ResultShell, option: BankOption): BeatResult {
  if (option.builds !== undefined) {
    return {
      ...base,
      kind: "valid_not_requested",
      cause: "valid_transformation_not_requested",
      distractorId: option.id,
      built: option.builds,
    };
  }
  return invalid(base, "chose_authored_distractor", option.id);
}

/**
 * Which authored route a correct reagent answer actually took.
 *
 * `checkReagents` says correct and does not say which of the accepted answers
 * it matched, so this asks the same question the package asks, once per
 * candidate, using the package's own comparison. Null means the primary answer,
 * which is the ordinary case.
 */
function routeLabelFor(
  problem: SynthesisGapProblem,
  steps: readonly ReagentStep[],
): string | null {
  const typed = problem.typed;
  if (typed === null) return null;
  const { spec } = typed;
  const submitted = { kind: "reagents" as const, steps };
  if (
    reagentStateMatches(
      { kind: "reagents", steps: spec.steps },
      submitted,
      spec.equivalents,
      spec.mode,
    )
  ) {
    return null;
  }
  for (let index = 0; index < spec.acceptedAlternatives.length; index += 1) {
    const candidate = spec.acceptedAlternatives[index];
    if (candidate === undefined) continue;
    const matches = reagentStateMatches(
      { kind: "reagents", steps: candidate },
      submitted,
      spec.equivalents,
      spec.mode,
    );
    if (matches) return typed.alternativeLabels[index] ?? null;
  }
  return null;
}

/** The authored chip a submission is, if any. Tier 2 on the typed path. */
function matchingChip(
  problem: SynthesisGapProblem,
  steps: readonly ReagentStep[],
): BankOption | undefined {
  const typed = problem.typed;
  if (typed === null) return undefined;
  const { spec } = typed;
  return problem.bank.find((option) => {
    if (option.id === problem.correctOptionId) return false;
    const target = stepsFromOption(option);
    if (target.length === 0) return false;
    return reagentStateMatches(
      { kind: "reagents", steps: target },
      { kind: "reagents", steps },
      spec.equivalents,
      spec.mode,
    );
  });
}

/** The reagent path, shared by a picked chip and a typed string. */
function gradeReagentSteps(
  input: GradeGapInput,
  steps: readonly ReagentStep[],
  pickedChip: BankOption | undefined,
): BeatResult {
  const base = shell(input);
  const { problem } = input;
  const typed = problem.typed;
  if (typed === null) {
    throw new Error(`problem ${problem.id} has no typed answer, so its reagents cannot be graded`);
  }
  if (steps.length === 0) {
    return invalid(base, "synthesis_step_missing");
  }

  const verdict = checkReagents(typed.spec, { kind: "reagents", steps });
  if (verdict.outcome === "correct") {
    const label = routeLabelFor(problem, steps);
    return label === null ? correct(base) : alternative(base, label);
  }

  // Tier 2 before the diagnostics, per CLAUDE.md's specificity refinement.
  const chip = pickedChip ?? matchingChip(problem, steps);
  if (chip !== undefined) return fromDistractor(base, chip);

  return invalid(base, beatCauseForCurriculumCause(verdict.cause));
}

function gradePickedReactant(input: GradeGapInput, option: BankOption): BeatResult {
  const base = shell(input);
  const { problem } = input;
  if (problem.structureSpec === null || option.structure === undefined) {
    throw new Error(`problem ${problem.id} is a reactant gap with no structure to compare`);
  }
  const verdict = checkStructure(problem.structureSpec, {
    kind: "structure",
    state: option.structure,
  });
  if (verdict.outcome === "correct") return correct(base);
  if (verdict.outcome === "undecided") {
    // The comparison ran out of budget rather than deciding. Marking a possibly
    // correct answer wrong would be the one unforgivable move, so this falls
    // back to the authored id and logs the tail cause beside it.
    return option.id === problem.correctOptionId
      ? correct(base)
      : invalid(base, "no_named_cause_logged", option.id);
  }
  return fromDistractor(base, option);
}

function gradePickedProduct(
  input: GradeGapInput,
  option: BankOption,
  reasonId: string | null,
): BeatResult {
  const base = shell(input);
  const { problem } = input;
  if (problem.majorProductSpec === null) {
    throw new Error(`problem ${problem.id} is a product gap with no candidates`);
  }
  const verdict = checkMajorProduct(problem.majorProductSpec, {
    kind: "major_product",
    candidateId: option.id,
    reasonId,
  });
  if (verdict.outcome === "correct") return correct(base);

  // The product is the bigger claim, so a wrong product speaks first. A right
  // product with the wrong argument resolves to the argument's own copy, which
  // is the whole point of asking for it.
  if (option.id !== problem.correctOptionId) return fromDistractor(base, option);
  const reason = reasonId === null ? undefined : reasonOption(problem, reasonId);
  if (reason !== undefined) return fromDistractor(base, reason);
  return invalid(base, "no_named_cause_logged");
}

/**
 * Grade one attempt at one gap.
 *
 * Throws on a submission the problem cannot accept (typing at a product gap,
 * an option id nothing resolves). Those are caller bugs rather than student
 * mistakes, and a loud failure in a test beats a quiet `invalid` in front of a
 * student who answered correctly.
 */
export function gradeSynthesisGap(input: GradeGapInput): BeatResult {
  const { problem, submission } = input;

  if (submission.mode === "typed") {
    if (problem.typed === null) {
      throw new Error(
        `problem ${problem.id} is a ${problem.gapKind} gap and is answered by choosing, not by typing`,
      );
    }
    const steps = parseTypedAnswer(submission.text, problem.typed.spec, problem.bank);
    return gradeReagentSteps(input, steps, undefined);
  }

  const option = bankOption(problem, submission.optionId);
  if (option === undefined) {
    throw new Error(`problem ${problem.id} has no chip ${submission.optionId}`);
  }
  switch (problem.gapKind) {
    case "reagent":
      return gradeReagentSteps(input, stepsFromOption(option), option.id === problem.correctOptionId ? undefined : option);
    case "reactant":
      return gradePickedReactant(input, option);
    case "product":
      return gradePickedProduct(input, option, submission.reasonId);
  }
}

/* ------------------------------------------------------------------ */
/* What the student reads                                               */
/* ------------------------------------------------------------------ */

export type ExplanationTone = "correct" | "alternative" | "not_requested" | "invalid";

export interface GapExplanation {
  /** One line naming what happened. Never a rhetorical question, never blame. */
  readonly headline: string;
  /** The specific half: what they did, or what the answer does. */
  readonly body: string;
  /** The authored teaching line for this route. Shown whatever the mark. */
  readonly why: string;
  /** The answer, revealed after the attempt. */
  readonly answerText: string;
  readonly tone: ExplanationTone;
}

/**
 * ONE SHAPE CAUSE IS DOING TWO JOBS HERE, and it is recorded rather than hidden.
 *
 * `checkReagents` distinguishes "everything needed plus something extra"
 * (`reagent_set_has_extra_reagent`) from "a different set entirely"
 * (`reagent_set_does_not_match`). BeatShapeCauseId in beats/types.ts has one id
 * covering both, `reagent_right_class_wrong_reagent`, and this file does not own
 * that union. So the id carries both and the SENTENCE is written to be true of
 * both rather than to match the id's name, because the id is engine facing and
 * the sentence is what a student reads. A third id would be an integration edit
 * in a file another agent owns.
 */
function headlineFor(cause: BeatCauseId, gapKind: GapKind): string {
  switch (cause) {
    case "synthesis_step_out_of_order":
      return "The right reagents, in the other order.";
    case "synthesis_step_missing":
      return "Part of that condition is still missing.";
    case "reagent_right_class_wrong_reagent":
      return gapKind === "reactant"
        ? "That is not the molecule this step joins."
        : "That is not the reagent set this step takes.";
    case "chose_authored_distractor":
      return "Here is what that one does instead.";
    default:
      return gapKind === "reactant"
        ? "Not the partner this step is waiting for."
        : "Not the reagent this step is waiting for.";
  }
}

/**
 * The copy, in the coach voice CLAUDE.md specifies: name what happened plainly,
 * treat the mistake as the normal step it is, make the next action reachable.
 * Every sentence is specific to the route on screen, because generic praise
 * reads as hollow and specific praise reads as seen.
 */
export function explainSynthesisResult(
  problem: SynthesisGapProblem,
  result: BeatResult,
): GapExplanation {
  const answer = answerOption(problem);
  const step = gapStep(problem);
  const makes = step.produces ?? problem.target;
  const chip =
    result.distractorId === undefined
      ? undefined
      : bankOption(problem, result.distractorId) ?? reasonOption(problem, result.distractorId);

  // A product gap's blank IS what the arrow makes, so a sentence about what the
  // answer "carries this arrow to" would name the blank twice.
  const carries =
    problem.gapKind === "product"
      ? `${answer.text} is what this arrow makes.`
      : `${answer.text} is what carries this arrow to ${makes}.`;

  switch (result.kind) {
    case "correct":
      return {
        headline: "That is the step.",
        body: carries,
        why: step.note ?? problem.why,
        answerText: answer.text,
        tone: "correct",
      };
    case "correct_alternative_route":
      return {
        headline: `That works too: ${result.routeTaken}.`,
        body: `The key runs ${answer.text} here, and yours lands on the same ${makes}.`,
        why: step.note ?? problem.why,
        answerText: answer.text,
        tone: "alternative",
      };
    case "valid_not_requested":
      return {
        headline: "Real chemistry, a different product.",
        body: `That gives ${result.built}. This route needs ${makes}, which is where ${answer.text} comes in.`,
        why: chip?.why ?? problem.why,
        answerText: answer.text,
        tone: "not_requested",
      };
    case "invalid":
      return {
        headline: headlineFor(result.cause, problem.gapKind),
        body: chip?.why ?? `${carries} Worth another run at the row.`,
        why: step.note ?? problem.why,
        answerText: answer.text,
        tone: "invalid",
      };
  }
}
