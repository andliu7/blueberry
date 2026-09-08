/**
 * Numeric answers: value, significant figures, and unit. All three, always.
 *
 * BUILD-PROMPT.md Phase 3 names the failure this file exists to prevent: a
 * checker that accepts 2.0 for 2.00 teaches students the wrong habit, and the
 * deliberately broken fixture set is written to catch exactly that. So the
 * submitted answer is carried as TEXT and not as a number. 2.0 and 2.00 are the
 * same double and different answers, and a checker that takes a `number` has
 * already thrown away the thing it is supposed to be checking.
 *
 * THE THREE POLICIES, and why each is an authoring decision rather than a
 * global rule.
 *
 *   sigFigPolicy   "exact" by default. Too many digits is an error in the same
 *                  way too few is: a calculator's fifteen digits are not
 *                  measurements, and claiming them overstates the result. Authors
 *                  can relax it to "at_least", or to "ignore" for a counted
 *                  quantity such as a degree of unsaturation, where significant
 *                  figures do not apply at all.
 *   unitPolicy     "convertible" by default, so 0.500 atm and 380. torr are both
 *                  accepted. "exact" is for the problem where performing the
 *                  conversion IS the question, and then answering in the other
 *                  unit is reported as its own named cause rather than as wrong.
 *   tolerance      Defaults to half of the last significant digit of the authored
 *                  answer, which is the interval that rounds to it. That is a
 *                  derivation and not a guess, and it moves automatically when an
 *                  author writes more digits.
 *
 * WHAT THIS FILE WILL NOT DO. It will not widen a tolerance to make a fixture
 * pass, and the default above is the reason it does not need to: if an authored
 * answer needs a wider window, the honest fix is that the authored answer has
 * more digits than the data support.
 */

import type { CurriculumCauseId } from "../causes.js";
import type { UnitSymbol } from "./units.js";
import { convert, isAffine, resolveUnit, sameDimension, unitDefinition } from "./units.js";

/**
 * A numeric answer as a point in answer space: what a student submitted, or what
 * a distractor predicts. The authored answer's POLICIES live on the spec below;
 * this is only the value.
 */
export interface NumericState {
  readonly kind: "numeric";
  /** As written. "2.00" and "2.0" are different states. */
  readonly text: string;
  /** As written. Null means none was given, which is itself an answer. */
  readonly unit: string | null;
}

export interface ParsedNumber {
  readonly value: number;
  readonly sigFigs: number;
  /**
   * True for trailing zeros with no decimal point, as in "250".
   *
   * The count cannot be read from the notation, so the checker refuses to guess
   * rather than picking the reading that happens to make the answer pass.
   */
  readonly ambiguous: boolean;
  /**
   * Power of ten of the last significant digit. "2.00" is -2, "250" is 1.
   *
   * Computed from the text rather than from log10 of the value, because log10 of
   * a value that has already been rounded is not a fact about the notation.
   */
  readonly lastSignificantPlace: number;
}

export type NumericParse =
  | { readonly ok: true; readonly parsed: ParsedNumber }
  | { readonly ok: false; readonly reason: "not_a_number" };

const NUMBER_PATTERN =
  /^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:\s*(?:[eE]\s*([+-]?\d+)|(?:x|\*|×)\s*10\s*(?:\^|\*\*)\s*([+-]?\d+)))?$/;

/**
 * Parse a written number into value, significant figures, and precision.
 *
 * Never throws. Student text arrives here.
 */
export function parseNumber(text: string): NumericParse {
  const trimmed = text.trim().replace(/,/g, "");
  const match = NUMBER_PATTERN.exec(trimmed);
  if (match === null) return { ok: false, reason: "not_a_number" };

  const sign = match[1] === "-" ? -1 : 1;
  const mantissaText = match[2] ?? "";
  const exponentText = match[3] ?? match[4];
  const exponent = exponentText === undefined ? 0 : Number.parseInt(exponentText.replace(/\s+/g, ""), 10);

  const mantissaValue = Number.parseFloat(mantissaText);
  if (!Number.isFinite(mantissaValue)) return { ok: false, reason: "not_a_number" };
  const value = sign * mantissaValue * Math.pow(10, exponent);
  if (!Number.isFinite(value)) return { ok: false, reason: "not_a_number" };

  const hasPoint = mantissaText.includes(".");
  const [wholePart = "", fractionPart = ""] = mantissaText.split(".");
  const digits = `${wholePart}${fractionPart}`;
  const withoutLeadingZeros = digits.replace(/^0+/, "");

  if (hasPoint) {
    // Everything after the first significant digit counts, trailing zeros
    // included. That is the whole point of writing the zeros down.
    const allZero = withoutLeadingZeros === "";
    const sigFigs = allZero ? Math.max(fractionPart.length, 1) : withoutLeadingZeros.length;
    return {
      ok: true,
      parsed: Object.freeze({
        value,
        sigFigs,
        ambiguous: false,
        lastSignificantPlace: exponent - fractionPart.length,
      }),
    };
  }

  if (withoutLeadingZeros === "") {
    // A written zero. One significant figure by convention and no ambiguity to
    // report, because there are no trailing zeros to argue about.
    return {
      ok: true,
      parsed: Object.freeze({ value, sigFigs: 1, ambiguous: false, lastSignificantPlace: exponent }),
    };
  }

  const trailingZeros = withoutLeadingZeros.length - withoutLeadingZeros.replace(/0+$/, "").length;
  return {
    ok: true,
    parsed: Object.freeze({
      value,
      sigFigs: withoutLeadingZeros.length - trailingZeros,
      ambiguous: trailingZeros > 0,
      lastSignificantPlace: exponent + trailingZeros,
    }),
  };
}

export type SigFigPolicy = "exact" | "at_least" | "ignore";
export type UnitPolicy = "convertible" | "exact";

export interface Tolerance {
  readonly kind: "absolute" | "relative";
  /** Absolute: in the authored unit. Relative: a fraction, so 0.01 is one percent. */
  readonly value: number;
}

export interface NumericAnswerSpec {
  readonly kind: "numeric";
  readonly text: string;
  readonly unit: UnitSymbol | null;
  readonly sigFigPolicy: SigFigPolicy;
  readonly unitPolicy: UnitPolicy;
  readonly tolerance: Tolerance;
  readonly parsed: ParsedNumber;
}

export interface NumericAnswerInput {
  readonly text: string;
  readonly unit?: UnitSymbol | null;
  readonly sigFigPolicy?: SigFigPolicy;
  readonly unitPolicy?: UnitPolicy;
  readonly tolerance?: Tolerance;
}

/** Half of the last significant digit: the interval that rounds to this answer. */
export function defaultTolerance(parsed: ParsedNumber): Tolerance {
  return Object.freeze({ kind: "absolute", value: 0.5 * Math.pow(10, parsed.lastSignificantPlace) });
}

/**
 * Build an authored numeric answer, refusing an authoring defect.
 *
 * Throws, following chem-core's constructor pattern. Every refusal below is a
 * thing an author cannot discover later: an ambiguous authored answer makes the
 * significant figure check meaningless, and a relative tolerance on a Celsius
 * answer is arithmetic on an affine scale.
 */
export function createNumericAnswer(input: NumericAnswerInput): NumericAnswerSpec {
  const parse = parseNumber(input.text);
  if (!parse.ok) {
    throw new Error(`Authored numeric answer "${input.text}" does not parse as a number`);
  }
  const sigFigPolicy = input.sigFigPolicy ?? "exact";
  const unitPolicy = input.unitPolicy ?? "convertible";
  const unit = input.unit ?? null;

  if (parse.parsed.ambiguous && sigFigPolicy !== "ignore") {
    throw new Error(
      `Authored numeric answer "${input.text}" has trailing zeros and no decimal point, so its ` +
        `significant figure count cannot be read. Write it in scientific notation, or set ` +
        `sigFigPolicy to "ignore" if significant figures do not apply to this quantity.`,
    );
  }
  if (unit === null && unitPolicy === "exact") {
    throw new Error(`Authored numeric answer "${input.text}" has no unit, so unitPolicy "exact" says nothing`);
  }
  if (unit !== null) {
    // Throws on an unknown symbol, which is the authoring defect we want loud.
    unitDefinition(unit);
  }

  const tolerance = input.tolerance ?? defaultTolerance(parse.parsed);
  if (!(tolerance.value > 0) || !Number.isFinite(tolerance.value)) {
    throw new Error(`Authored tolerance must be a positive finite number, got ${tolerance.value}`);
  }
  if (tolerance.kind === "relative" && unit !== null && isAffine(unit)) {
    throw new Error(
      `Relative tolerance on ${unit} is arithmetic on an affine scale: one percent of 25 degC and ` +
        `one percent of 298.15 K are different sizes. Use an absolute tolerance.`,
    );
  }

  return Object.freeze({
    kind: "numeric" as const,
    text: input.text,
    unit,
    sigFigPolicy,
    unitPolicy,
    tolerance: Object.freeze({ kind: tolerance.kind, value: tolerance.value }),
    parsed: parse.parsed,
  });
}

export type NumericVerdict =
  | { readonly outcome: "correct" }
  | { readonly outcome: "wrong"; readonly cause: CurriculumCauseId; readonly detail: string };

function toleranceInAuthoredUnit(spec: NumericAnswerSpec): number {
  return spec.tolerance.kind === "absolute"
    ? spec.tolerance.value
    : Math.abs(spec.parsed.value) * spec.tolerance.value;
}

function within(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}

/** Relative closeness, for diagnostics that compare shapes rather than values. */
function closeRelative(a: number, b: number, relative = 5e-3): boolean {
  if (b === 0) return a === 0;
  return Math.abs(a - b) <= Math.abs(b) * relative;
}

/**
 * Grade a numeric submission.
 *
 * ORDER MATTERS AND IT IS THE ORDER A PERSON WOULD MARK IN. Is it a number. Did
 * they give a unit. Is that unit the right kind of thing. Is the value right.
 * Only then, is it written correctly. A student who computed the right number in
 * the wrong unit has made one mistake and should be told about one mistake.
 */
export function checkNumeric(spec: NumericAnswerSpec, state: NumericState): NumericVerdict {
  const parse = parseNumber(state.text);
  if (!parse.ok) {
    return { outcome: "wrong", cause: "answer_not_a_number", detail: `submitted text: ${state.text}` };
  }
  const submitted = parse.parsed;

  let valueInAuthoredUnit = submitted.value;
  let submittedUnit: UnitSymbol | null = null;

  if (spec.unit !== null) {
    if (state.unit === null || state.unit.trim() === "") {
      return { outcome: "wrong", cause: "unit_missing", detail: `expected a unit of ${spec.unit}` };
    }
    submittedUnit = resolveUnit(state.unit);
    if (submittedUnit === null) {
      return { outcome: "wrong", cause: "unit_not_recognised", detail: `submitted unit: ${state.unit}` };
    }
    if (!sameDimension(submittedUnit, spec.unit)) {
      return {
        outcome: "wrong",
        cause: "unit_measures_the_wrong_quantity",
        detail: `submitted ${submittedUnit}, answer is in ${spec.unit}`,
      };
    }
    const converted = convert(submitted.value, submittedUnit, spec.unit);
    if (converted === null) {
      // Unreachable while sameDimension is the guard above. Kept because the two
      // functions are separate and a future dimension could disagree with itself.
      return {
        outcome: "wrong",
        cause: "unit_measures_the_wrong_quantity",
        detail: `no conversion from ${submittedUnit} to ${spec.unit}`,
      };
    }
    valueInAuthoredUnit = converted;
  }

  const tolerance = toleranceInAuthoredUnit(spec);
  const matchesValue = within(valueInAuthoredUnit, spec.parsed.value, tolerance);

  if (!matchesValue) {
    return diagnoseWrongValue(spec, valueInAuthoredUnit, tolerance);
  }

  if (
    spec.unit !== null &&
    spec.unitPolicy === "exact" &&
    submittedUnit !== null &&
    submittedUnit !== spec.unit
  ) {
    return {
      outcome: "wrong",
      cause: "unit_not_the_one_requested",
      detail: `answered in ${submittedUnit}, the question asked for ${spec.unit}`,
    };
  }

  if (spec.sigFigPolicy === "ignore") return { outcome: "correct" };

  if (submitted.ambiguous) {
    return {
      outcome: "wrong",
      cause: "significant_figures_ambiguous_notation",
      detail: `"${state.text}" could be read as ${submitted.sigFigs} or more significant figures`,
    };
  }
  const required = spec.parsed.sigFigs;
  if (submitted.sigFigs < required) {
    return {
      outcome: "wrong",
      cause: "significant_figures_too_few",
      detail: `${submitted.sigFigs} given, ${required} supported`,
    };
  }
  if (spec.sigFigPolicy === "exact" && submitted.sigFigs > required) {
    return {
      outcome: "wrong",
      cause: "significant_figures_too_many",
      detail: `${submitted.sigFigs} given, ${required} supported`,
    };
  }
  return { outcome: "correct" };
}

/**
 * Name the shape of a wrong value where the shape is nameable.
 *
 * These are the Tier 1 diagnostics for numeric answers: a factor of ten, a
 * reciprocal, a sign. Each is a mistake a student makes for a reason, and none
 * of them needs to know which problem this is, which is what separates them from
 * an authored distractor.
 */
function diagnoseWrongValue(
  spec: NumericAnswerSpec,
  submittedValue: number,
  tolerance: number,
): NumericVerdict {
  const expected = spec.parsed.value;

  if (expected !== 0 && within(submittedValue, -expected, tolerance)) {
    return {
      outcome: "wrong",
      cause: "sign_inverted",
      detail: `submitted ${submittedValue}, answer ${expected}`,
    };
  }
  if (expected !== 0 && submittedValue !== 0) {
    const ratio = submittedValue / expected;
    if (ratio > 0) {
      const power = Math.round(Math.log10(ratio));
      if (power !== 0 && Number.isFinite(power) && closeRelative(ratio, Math.pow(10, power))) {
        return {
          outcome: "wrong",
          cause: "off_by_power_of_ten",
          detail: `submitted ${submittedValue}, which is the answer times 10^${power}`,
        };
      }
    }
    if (closeRelative(submittedValue, 1 / expected)) {
      return {
        outcome: "wrong",
        cause: "reciprocal_of_expected_value",
        detail: `submitted ${submittedValue}, which is one over ${expected}`,
      };
    }
  }
  return {
    outcome: "wrong",
    cause: "value_outside_tolerance",
    detail: `submitted ${submittedValue}, answer ${expected} plus or minus ${tolerance}`,
  };
}

/**
 * Whether a submission is at the same point in answer space as a predicted wrong
 * answer.
 *
 * SIGNIFICANT FIGURES ARE DELIBERATELY IGNORED HERE. A distractor predicts a
 * wrong VALUE, and a student who reaches that wrong value has made the mistake
 * the author anticipated whether they wrote it to two figures or four. Notation
 * is graded against the authored answer, by `checkNumeric`, and it would be
 * graded twice if it were also matched here.
 *
 * The unit is not ignored: a distractor in torr does not match an answer in
 * grams. When the distractor names no unit, the unit is not compared at all,
 * which is how an author writes "any answer near this number, however it is
 * labelled".
 */
export function numericStateMatches(
  target: NumericState,
  submitted: NumericState,
  tolerance?: Tolerance,
): boolean {
  const targetParse = parseNumber(target.text);
  const submittedParse = parseNumber(submitted.text);
  if (!targetParse.ok || !submittedParse.ok) return false;

  const targetUnit = target.unit === null ? null : resolveUnit(target.unit);
  let submittedValue = submittedParse.parsed.value;

  if (targetUnit !== null) {
    if (submitted.unit === null) return false;
    const submittedUnit = resolveUnit(submitted.unit);
    if (submittedUnit === null || !sameDimension(submittedUnit, targetUnit)) return false;
    const converted = convert(submittedParse.parsed.value, submittedUnit, targetUnit);
    if (converted === null) return false;
    submittedValue = converted;
  }

  const resolved = tolerance ?? defaultTolerance(targetParse.parsed);
  const window =
    resolved.kind === "absolute"
      ? resolved.value
      : Math.abs(targetParse.parsed.value) * resolved.value;
  return within(submittedValue, targetParse.parsed.value, window);
}
