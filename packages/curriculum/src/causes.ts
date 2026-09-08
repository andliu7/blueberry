/**
 * Named causes for curriculum answers. Tier 1 for everything that is not a
 * mechanism.
 *
 * Built the same way chem-core's causes.ts is built, and for the same reasons
 * written there: a closed union of ids, a registry typed
 * `Record<CurriculumCauseId, CurriculumCauseDefinition>`, so a union member with
 * no definition is a compile error and a definition outside the union is a
 * compile error, and `curriculumCauseCount()` therefore returns the real number
 * rather than the number somebody remembered to update.
 *
 * These are engine facing, exactly as chem-core's `summary` and `teaches` are.
 * They are sized for a log line and a validator report and they are never what a
 * student reads. Student facing Tier 1 copy for these ids belongs in
 * packages/feedback beside the mechanism copy, in the same three field
 * `CauseCopy` shape, and it is not written yet. That is a named seam, not an
 * oversight: see the note at the bottom of this file.
 *
 * SPECIFICITY, and why it is a field rather than a comment.
 *
 * `specificity` is what the grader reads to decide whether Tier 1 has anything
 * to say about an attempt, and it is the one piece of machinery in this package
 * that a reviewer should look at hardest. Three of the values matter:
 *
 *   notation    The chemistry was right and the reporting was wrong. Wrong
 *               significant figures, a missing unit, an ambiguous number. No
 *               authored distractor is about this, because a distractor predicts
 *               a wrong ANSWER and this student did not give one.
 *   diagnostic  The answer is wrong in a way the checker can name without
 *               knowing which problem it is. Off by a power of ten. The
 *               reciprocal. Right product, wrong reason. Steps in the wrong
 *               order.
 *   generic     Wrong, and the checker has nothing to say beyond that. This is
 *               the value that must never reach a student on its own.
 *
 * See grading.ts for the order the tiers are consulted in, and for the one place
 * this package departs from a literal reading of CLAUDE.md's tier ordering, with
 * the argument for it.
 */

import { ANSWER_KINDS, type AnswerKind } from "./kinds.js";

export type CurriculumCauseCategory =
  | "success"
  | "notation"
  | "units"
  | "arithmetic"
  | "chemistry"
  | "procedure"
  | "undecided";

/**
 * How much the cause narrows things down. Read the note at the top of the file
 * before changing any of these, because the grader's tier order depends on them.
 */
export type CauseSpecificity = "success" | "notation" | "diagnostic" | "generic" | "undecided";

export type CurriculumCauseId =
  // success
  | "matches_authored_answer"
  // notation, the value is right and the writing of it is not
  | "significant_figures_too_few"
  | "significant_figures_too_many"
  | "significant_figures_ambiguous_notation"
  | "unit_missing"
  | "unit_not_recognised"
  | "unit_not_the_one_requested"
  | "answer_not_a_number"
  // arithmetic, wrong in a shape the checker can name
  | "off_by_power_of_ten"
  | "reciprocal_of_expected_value"
  | "sign_inverted"
  | "value_outside_tolerance"
  // units, wrong in a shape the checker can name
  | "unit_measures_the_wrong_quantity"
  // chemistry and procedure
  | "reagent_set_incomplete"
  | "reagent_set_has_extra_reagent"
  | "reagent_set_does_not_match"
  | "synthesis_steps_out_of_order"
  | "synthesis_step_count_wrong"
  | "right_product_wrong_reason"
  | "right_reason_wrong_product"
  | "option_is_not_the_correct_one"
  | "structure_is_an_isomer_of_the_answer"
  | "structure_molecular_formula_differs"
  | "structure_charge_differs"
  | "structure_species_count_differs"
  | "structure_does_not_match"
  // ordering, a ranked list
  | "ordering_is_incomplete"
  | "ordering_one_adjacent_pair_swapped"
  | "ordering_is_reversed"
  | "ordering_does_not_match"
  // matching, a board of pairs
  | "matching_board_incomplete"
  | "matching_one_pair_wrong"
  | "matching_pairs_swapped"
  | "matching_does_not_match"
  // undecided, the checker refuses to guess
  | "ordering_submission_is_not_from_the_item_list"
  | "matching_submission_is_not_on_the_board"
  | "structure_comparison_needs_stereochemistry"
  | "structure_comparison_budget_exhausted"
  | "submission_kind_does_not_match_problem";

export interface CurriculumCauseDefinition {
  readonly id: CurriculumCauseId;
  readonly category: CurriculumCauseCategory;
  readonly specificity: CauseSpecificity;
  /** The answer kinds a checker can emit this cause for. */
  readonly appliesTo: readonly AnswerKind[];
  /** One line, for a log or a report. Never shown to a student. */
  readonly summary: string;
  /** What a student who understood this would then get right. Engine facing. */
  readonly teaches: string;
}

/**
 * Every kind, taken from the registry rather than retyped.
 *
 * This list used to be a second copy of `ANSWER_KINDS`, and a second copy is a
 * list that goes stale the first time a kind is added: a cause declared to
 * apply to "all kinds" would quietly stop applying to the newest one. Reading
 * the registry makes that impossible by construction, which is the same
 * argument the header makes for counting causes rather than writing the number
 * down.
 */
const ALL_KINDS: readonly AnswerKind[] = ANSWER_KINDS;

export const CURRICULUM_CAUSES: Readonly<
  Record<CurriculumCauseId, CurriculumCauseDefinition>
> = Object.freeze({
  matches_authored_answer: Object.freeze({
    id: "matches_authored_answer",
    category: "success",
    specificity: "success",
    appliesTo: ALL_KINDS,
    summary: "the submitted answer matched the authored answer under this problem's policies",
    teaches: "nothing on its own. The problem's own solution copy carries why the answer is right",
  }),

  significant_figures_too_few: Object.freeze({
    id: "significant_figures_too_few",
    category: "notation",
    specificity: "notation",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "value within tolerance, written with fewer significant figures than the data support",
    teaches: "a result carries the precision of the least precise measurement that went into it",
  }),
  significant_figures_too_many: Object.freeze({
    id: "significant_figures_too_many",
    category: "notation",
    specificity: "notation",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "value within tolerance, written with more significant figures than the data support",
    teaches: "extra digits from a calculator are not measurements and claiming them overstates the result",
  }),
  significant_figures_ambiguous_notation: Object.freeze({
    id: "significant_figures_ambiguous_notation",
    category: "notation",
    specificity: "notation",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "trailing zeros with no decimal point, so the significant figure count cannot be read",
    teaches: "scientific notation states the precision instead of leaving it to be inferred",
  }),
  unit_missing: Object.freeze({
    id: "unit_missing",
    category: "units",
    specificity: "notation",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "a bare number was submitted where the answer carries a unit",
    teaches: "a physical quantity is a number and a unit together",
  }),
  unit_not_recognised: Object.freeze({
    id: "unit_not_recognised",
    category: "units",
    specificity: "notation",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "the unit text is not in the unit registry",
    teaches: "nothing about chemistry. This is usually a typo or a unit the registry has not learned",
  }),
  unit_not_the_one_requested: Object.freeze({
    id: "unit_not_the_one_requested",
    category: "units",
    specificity: "notation",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "correct quantity in a convertible unit, on a problem that asked for one specific unit",
    teaches: "reading which unit the question asked for, when the conversion is the point of the question",
  }),
  answer_not_a_number: Object.freeze({
    id: "answer_not_a_number",
    category: "notation",
    specificity: "notation",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "the submitted text does not parse as a decimal or scientific notation number",
    teaches: "nothing about chemistry. This is an input problem",
  }),

  off_by_power_of_ten: Object.freeze({
    id: "off_by_power_of_ten",
    category: "arithmetic",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "value is the authored answer times an integer power of ten",
    teaches: "tracking the prefix through a conversion, which is where a factor of ten usually goes missing",
  }),
  reciprocal_of_expected_value: Object.freeze({
    id: "reciprocal_of_expected_value",
    category: "arithmetic",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "value is one over the authored answer, in the authored unit",
    teaches: "which quantity sits on top when a proportion is rearranged",
  }),
  sign_inverted: Object.freeze({
    id: "sign_inverted",
    category: "arithmetic",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "value has the right magnitude and the wrong sign",
    teaches: "what the sign of this quantity means physically",
  }),
  value_outside_tolerance: Object.freeze({
    id: "value_outside_tolerance",
    category: "arithmetic",
    specificity: "generic",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "value does not match and no named arithmetic relationship to the answer was found",
    teaches: "nothing on its own. This cause is the Tier 3 tail for numeric answers",
  }),
  unit_measures_the_wrong_quantity: Object.freeze({
    id: "unit_measures_the_wrong_quantity",
    category: "units",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["numeric"] as const),
    summary: "the submitted unit has a different dimension from the authored unit",
    teaches: "checking that the unit of a result is the unit the quantity is measured in",
  }),

  reagent_set_incomplete: Object.freeze({
    id: "reagent_set_incomplete",
    category: "chemistry",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["reagents"] as const),
    summary: "every submitted reagent is in the answer, and at least one authored reagent is missing",
    teaches: "which partner or condition the named reagent cannot work without",
  }),
  reagent_set_has_extra_reagent: Object.freeze({
    id: "reagent_set_has_extra_reagent",
    category: "chemistry",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["reagents"] as const),
    summary: "the authored reagents are all present and at least one extra reagent was added",
    teaches: "what each reagent is for, and that an extra one usually changes the product",
  }),
  reagent_set_does_not_match: Object.freeze({
    id: "reagent_set_does_not_match",
    category: "chemistry",
    specificity: "generic",
    appliesTo: Object.freeze(["reagents"] as const),
    summary: "reagents differ from the answer in both directions",
    teaches: "nothing on its own. This cause is the Tier 3 tail for reagent answers",
  }),
  synthesis_steps_out_of_order: Object.freeze({
    id: "synthesis_steps_out_of_order",
    category: "procedure",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["reagents"] as const),
    summary: "the submitted steps are the authored steps in a different order",
    teaches: "that order is chemistry: what a step leaves behind decides what the next step can do",
  }),
  synthesis_step_count_wrong: Object.freeze({
    id: "synthesis_step_count_wrong",
    category: "procedure",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["reagents"] as const),
    summary: "the submitted sequence has a different number of steps from the authored one",
    teaches: "which transformations can share a flask and which cannot",
  }),
  right_product_wrong_reason: Object.freeze({
    id: "right_product_wrong_reason",
    category: "chemistry",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["major_product"] as const),
    summary: "correct major product selected, with a ranking argument that does not support it",
    teaches: "that the product is the conclusion and the argument is the chemistry",
  }),
  right_reason_wrong_product: Object.freeze({
    id: "right_reason_wrong_product",
    category: "chemistry",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["major_product"] as const),
    summary: "correct ranking argument selected, applied to the wrong candidate",
    teaches: "carrying a rule through to the structure it actually picks out",
  }),
  option_is_not_the_correct_one: Object.freeze({
    id: "option_is_not_the_correct_one",
    category: "chemistry",
    specificity: "generic",
    appliesTo: Object.freeze(["multiple_choice"] as const),
    summary: "a wrong option was selected and it carries no authored explanation",
    teaches: "nothing on its own. On a multiple choice problem this cause means a distractor is missing",
  }),

  structure_is_an_isomer_of_the_answer: Object.freeze({
    id: "structure_is_an_isomer_of_the_answer",
    category: "chemistry",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["structure"] as const),
    summary: "same molecular formula and charge as the answer, different connectivity",
    teaches: "that counting atoms is not enough, because the same atoms connect more than one way",
  }),
  structure_molecular_formula_differs: Object.freeze({
    id: "structure_molecular_formula_differs",
    category: "chemistry",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["structure"] as const),
    summary: "the submitted structures do not contain the same atoms as the answer",
    teaches: "which atoms the reagents add and remove, before which bonds move",
  }),
  structure_charge_differs: Object.freeze({
    id: "structure_charge_differs",
    category: "chemistry",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["structure"] as const),
    summary: "same atoms as the answer, different total charge",
    teaches: "where the proton went, since charge and hydrogen count move together in most steps",
  }),
  structure_species_count_differs: Object.freeze({
    id: "structure_species_count_differs",
    category: "chemistry",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["structure"] as const),
    summary: "a different number of separate species from the answer",
    teaches: "that the byproduct and the counterion are part of the answer",
  }),
  structure_does_not_match: Object.freeze({
    id: "structure_does_not_match",
    category: "chemistry",
    specificity: "generic",
    appliesTo: Object.freeze(["structure"] as const),
    summary: "structures differ and the checker found no named difference to report",
    teaches: "nothing on its own. This cause is the Tier 3 tail for structure answers",
  }),

  ordering_is_incomplete: Object.freeze({
    id: "ordering_is_incomplete",
    category: "procedure",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["ordering"] as const),
    summary: "fewer items were placed on the track than the problem offers, with no duplicates",
    teaches: "that a ranking is a claim about every item, including the one that is hardest to place",
  }),
  ordering_one_adjacent_pair_swapped: Object.freeze({
    id: "ordering_one_adjacent_pair_swapped",
    category: "chemistry",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["ordering"] as const),
    summary: "the accepted order with exactly one adjacent pair exchanged, everything else in place",
    teaches: "the single comparison that separates two neighbouring rungs, which is the whole gap here",
  }),
  ordering_is_reversed: Object.freeze({
    id: "ordering_is_reversed",
    category: "procedure",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["ordering"] as const),
    summary: "the accepted order back to front, so the ladder is right and it is read the other way",
    teaches: "which end of the track the prompt asked for. The chemistry underneath is already sound",
  }),
  ordering_does_not_match: Object.freeze({
    id: "ordering_does_not_match",
    category: "chemistry",
    specificity: "generic",
    appliesTo: Object.freeze(["ordering"] as const),
    summary: "the order differs from every accepted one in more than one adjacent swap or a reversal",
    teaches: "nothing on its own. This cause is the Tier 3 tail for ordering answers",
  }),

  matching_board_incomplete: Object.freeze({
    id: "matching_board_incomplete",
    category: "procedure",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["matching"] as const),
    summary: "at least one prompt was left with no target, so part of the board has no answer on it",
    teaches: "which row is the one with nothing obvious to attach to, which is usually the row worth reading again",
  }),
  matching_one_pair_wrong: Object.freeze({
    id: "matching_one_pair_wrong",
    category: "chemistry",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["matching"] as const),
    summary: "every prompt is paired and exactly one sits on a target the authored board does not give it",
    teaches: "the one correspondence that moved, with the rest of the board already standing as evidence",
  }),
  matching_pairs_swapped: Object.freeze({
    id: "matching_pairs_swapped",
    category: "chemistry",
    specificity: "diagnostic",
    appliesTo: Object.freeze(["matching"] as const),
    summary: "two prompts hold each other's targets and nothing else differs",
    teaches: "the property that tells those two apart, since they were confused with each other rather than with the board",
  }),
  matching_does_not_match: Object.freeze({
    id: "matching_does_not_match",
    category: "chemistry",
    specificity: "generic",
    appliesTo: Object.freeze(["matching"] as const),
    summary: "more than two pairs differ from the authored board and they are not a single exchange",
    teaches: "nothing on its own. This cause is the Tier 3 tail for matching answers",
  }),

  ordering_submission_is_not_from_the_item_list: Object.freeze({
    id: "ordering_submission_is_not_from_the_item_list",
    category: "undecided",
    specificity: "undecided",
    appliesTo: Object.freeze(["ordering"] as const),
    summary:
      "the submitted order names an item the problem does not carry, or names one twice, so it " +
      "is not a ranking of this problem's items and there is nothing to compare",
    teaches: "nothing. This is a defect in the calling shell rather than a student error",
  }),
  matching_submission_is_not_on_the_board: Object.freeze({
    id: "matching_submission_is_not_on_the_board",
    category: "undecided",
    specificity: "undecided",
    appliesTo: Object.freeze(["matching"] as const),
    summary:
      "the submitted board names a prompt or a target the problem does not carry, or gives one " +
      "prompt two targets, so which pairing is being claimed is undecidable",
    teaches: "nothing. This is a defect in the calling shell rather than a student error",
  }),

  structure_comparison_needs_stereochemistry: Object.freeze({
    id: "structure_comparison_needs_stereochemistry",
    category: "undecided",
    specificity: "undecided",
    appliesTo: Object.freeze(["structure"] as const),
    summary:
      "a stereo declaration is present and this package compares constitution only, so the " +
      "comparison is undecided and is routed to Indigo rather than guessed",
    teaches: "nothing. This is an engine limit and not a student error",
  }),
  structure_comparison_budget_exhausted: Object.freeze({
    id: "structure_comparison_budget_exhausted",
    category: "undecided",
    specificity: "undecided",
    appliesTo: Object.freeze(["structure"] as const),
    summary:
      "the isomorphism search hit its node ceiling before deciding, so the comparison is " +
      "undecided rather than answered by whichever branch it was on",
    teaches: "nothing. This is an engine limit and not a student error",
  }),
  submission_kind_does_not_match_problem: Object.freeze({
    id: "submission_kind_does_not_match_problem",
    category: "undecided",
    specificity: "undecided",
    appliesTo: ALL_KINDS,
    summary:
      "a submission of one answer kind arrived for a problem of another, which is a defect in " +
      "the calling shell rather than an answer to grade",
    teaches: "nothing. Reported rather than thrown so a shell mistake does not crash a session",
  }),
});

export function allCurriculumCauseIds(): readonly CurriculumCauseId[] {
  return Object.keys(CURRICULUM_CAUSES) as CurriculumCauseId[];
}

/** The real count, by construction. Never write this number in prose. */
export function curriculumCauseCount(): number {
  return allCurriculumCauseIds().length;
}

/** Throws on an unknown id. A lookup miss here is a defect, not a data case. */
export function curriculumCause(id: CurriculumCauseId): CurriculumCauseDefinition {
  const definition = CURRICULUM_CAUSES[id];
  if (definition === undefined) {
    throw new Error(`Unknown curriculum cause id: ${String(id)}`);
  }
  return definition;
}

export function causeSpecificity(id: CurriculumCauseId): CauseSpecificity {
  return curriculumCause(id).specificity;
}

export function causeIdsForKind(kind: AnswerKind): readonly CurriculumCauseId[] {
  return allCurriculumCauseIds().filter((id) => curriculumCause(id).appliesTo.includes(kind));
}

/**
 * SEAM, student facing copy.
 *
 * chem-core keeps the cause registry and packages/feedback keeps the copy, so
 * that rewriting what a student reads never means editing engine code. The same
 * split applies here and the second half is not built: there is no
 * `CurriculumCauseCopy` registry yet, so a shell rendering a Tier 1 curriculum
 * result today has `summary` and `teaches` and nothing written for a person.
 *
 * When it is built it goes in packages/feedback in the existing `CauseCopy`
 * shape, keyed by `CurriculumCauseId`, with a coverage check beside the
 * copy-coverage one that already exists. packages/feedback would then depend on
 * this package as well as on chem-core, which is allowed: the only forbidden
 * edge in CLAUDE.md's layout is chem-core depending on anything.
 */
