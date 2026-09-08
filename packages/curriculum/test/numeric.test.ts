/**
 * Numeric checking, including the negative cases BUILD-PROMPT.md Phase 3 names.
 *
 * The two that matter most are near the top: 2.0 submitted for a 2.00 answer is
 * WRONG, and 2.000 submitted for a 2.00 answer is also wrong. A checker that
 * accepts either teaches students the wrong habit, and both directions have to be
 * asserted because a checker written to catch the first one usually lets the
 * second through.
 */

import { describe, expect, it } from "vitest";
import {
  checkNumeric,
  createNumericAnswer,
  defaultTolerance,
  numericStateMatches,
  parseNumber,
  type NumericState,
} from "../src/answers/numeric.ts";

function submitted(text: string, unit: string | null = null): NumericState {
  return { kind: "numeric", text, unit };
}

function parsedOrThrow(text: string) {
  const parse = parseNumber(text);
  if (!parse.ok) throw new Error(`expected ${text} to parse`);
  return parse.parsed;
}

describe("parseNumber", () => {
  it("counts trailing zeros after a decimal point as significant", () => {
    expect(parsedOrThrow("2.00").sigFigs).toBe(3);
    expect(parsedOrThrow("2.0").sigFigs).toBe(2);
    expect(parsedOrThrow("2").sigFigs).toBe(1);
  });

  it("ignores leading zeros", () => {
    expect(parsedOrThrow("0.00250").sigFigs).toBe(3);
    expect(parsedOrThrow("0.00250").value).toBeCloseTo(0.0025, 12);
  });

  it("flags trailing zeros with no decimal point as ambiguous", () => {
    const parsed = parsedOrThrow("250");
    expect(parsed.ambiguous).toBe(true);
    expect(parsed.sigFigs).toBe(2);
  });

  it("treats a trailing decimal point as making every digit significant", () => {
    const parsed = parsedOrThrow("100.");
    expect(parsed.ambiguous).toBe(false);
    expect(parsed.sigFigs).toBe(3);
  });

  it("reads scientific notation in both spellings", () => {
    expect(parsedOrThrow("6.02e23").sigFigs).toBe(3);
    expect(parsedOrThrow("6.02e23").value).toBeCloseTo(6.02e23, -10);
    expect(parsedOrThrow("6.02 x 10^23").value).toBeCloseTo(6.02e23, -10);
    expect(parsedOrThrow("1.0E-3").value).toBeCloseTo(0.001, 12);
  });

  it("records the place of the last significant digit", () => {
    expect(parsedOrThrow("2.00").lastSignificantPlace).toBe(-2);
    expect(parsedOrThrow("250").lastSignificantPlace).toBe(1);
    expect(parsedOrThrow("6.02e23").lastSignificantPlace).toBe(21);
  });

  it("refuses text that is not a number", () => {
    expect(parseNumber("two").ok).toBe(false);
    expect(parseNumber("").ok).toBe(false);
    expect(parseNumber("2..0").ok).toBe(false);
    expect(parseNumber("2.00 atm").ok).toBe(false);
  });

  it("derives a tolerance of half the last significant digit", () => {
    expect(defaultTolerance(parsedOrThrow("2.00")).value).toBeCloseTo(0.005, 12);
    expect(defaultTolerance(parsedOrThrow("36.0")).value).toBeCloseTo(0.05, 12);
  });
});

describe("significant figures", () => {
  const answer = createNumericAnswer({ text: "2.00", unit: "atm" });

  it("accepts the answer as written", () => {
    expect(checkNumeric(answer, submitted("2.00", "atm"))).toEqual({ outcome: "correct" });
  });

  it("rejects 2.0 for a 2.00 answer", () => {
    const verdict = checkNumeric(answer, submitted("2.0", "atm"));
    expect(verdict).toMatchObject({ outcome: "wrong", cause: "significant_figures_too_few" });
  });

  it("rejects 2.000 for a 2.00 answer", () => {
    const verdict = checkNumeric(answer, submitted("2.000", "atm"));
    expect(verdict).toMatchObject({ outcome: "wrong", cause: "significant_figures_too_many" });
  });

  it("rejects an ambiguous notation even when the value is right", () => {
    const wholeNumber = createNumericAnswer({ text: "2.50e2", unit: "mL" });
    const verdict = checkNumeric(wholeNumber, submitted("250", "mL"));
    expect(verdict).toMatchObject({
      outcome: "wrong",
      cause: "significant_figures_ambiguous_notation",
    });
  });

  it('accepts extra digits under the "at_least" policy and still refuses too few', () => {
    const relaxed = createNumericAnswer({ text: "2.00", unit: "atm", sigFigPolicy: "at_least" });
    expect(checkNumeric(relaxed, submitted("2.000", "atm"))).toEqual({ outcome: "correct" });
    expect(checkNumeric(relaxed, submitted("2.0", "atm"))).toMatchObject({
      cause: "significant_figures_too_few",
    });
  });

  it('ignores notation entirely under the "ignore" policy', () => {
    const counted = createNumericAnswer({
      text: "2",
      sigFigPolicy: "ignore",
      tolerance: { kind: "absolute", value: 0.25 },
    });
    expect(checkNumeric(counted, submitted("2.0000"))).toEqual({ outcome: "correct" });
    expect(checkNumeric(counted, submitted("3"))).toMatchObject({ outcome: "wrong" });
  });

  it("refuses to author an ambiguous answer", () => {
    expect(() => createNumericAnswer({ text: "250", unit: "mL" })).toThrow(/significant figure/);
  });
});

describe("units", () => {
  const answer = createNumericAnswer({ text: "2.00", unit: "atm" });

  it("reports a missing unit rather than grading the bare number", () => {
    expect(checkNumeric(answer, submitted("2.00"))).toMatchObject({ cause: "unit_missing" });
    expect(checkNumeric(answer, submitted("2.00", "  "))).toMatchObject({ cause: "unit_missing" });
  });

  it("reports an unknown unit", () => {
    expect(checkNumeric(answer, submitted("2.00", "atmz"))).toMatchObject({
      cause: "unit_not_recognised",
    });
  });

  it("reports a unit that measures something else", () => {
    expect(checkNumeric(answer, submitted("2.00", "g"))).toMatchObject({
      cause: "unit_measures_the_wrong_quantity",
    });
  });

  it("accepts a convertible unit by default", () => {
    // 2.00 atm is 1520 torr. Written to three figures it is 1.52e3.
    expect(checkNumeric(answer, submitted("1.52e3", "torr"))).toEqual({ outcome: "correct" });
    expect(checkNumeric(answer, submitted("203", "kPa"))).toEqual({ outcome: "correct" });
  });

  it('names the unit as the mistake under the "exact" policy', () => {
    const exact = createNumericAnswer({ text: "2.00", unit: "atm", unitPolicy: "exact" });
    expect(checkNumeric(exact, submitted("1.52e3", "torr"))).toMatchObject({
      cause: "unit_not_the_one_requested",
    });
    expect(checkNumeric(exact, submitted("2.00", "atm"))).toEqual({ outcome: "correct" });
  });

  it("refuses a relative tolerance on an affine scale", () => {
    expect(() =>
      createNumericAnswer({ text: "25.0", unit: "degC", tolerance: { kind: "relative", value: 0.01 } }),
    ).toThrow(/affine/);
  });
});

describe("wrong values, named where they can be named", () => {
  const answer = createNumericAnswer({ text: "25.0", unit: "mL" });

  it("names a factor of ten", () => {
    expect(checkNumeric(answer, submitted("250.", "mL"))).toMatchObject({
      cause: "off_by_power_of_ten",
    });
    expect(checkNumeric(answer, submitted("2.50", "mL"))).toMatchObject({
      cause: "off_by_power_of_ten",
    });
  });

  it("names a reciprocal", () => {
    const twoPointFive = createNumericAnswer({ text: "2.50", unit: "atm" });
    expect(checkNumeric(twoPointFive, submitted("0.400", "atm"))).toMatchObject({
      cause: "reciprocal_of_expected_value",
    });
  });

  it("names an inverted sign", () => {
    const ph = createNumericAnswer({ text: "2.000" });
    expect(checkNumeric(ph, submitted("-2.000"))).toMatchObject({ cause: "sign_inverted" });
  });

  it("falls back to the generic cause when the shape is not nameable", () => {
    expect(checkNumeric(answer, submitted("31.7", "mL"))).toMatchObject({
      cause: "value_outside_tolerance",
    });
  });

  it("reports a non number rather than grading it", () => {
    expect(checkNumeric(answer, submitted("about twenty five", "mL"))).toMatchObject({
      cause: "answer_not_a_number",
    });
  });
});

describe("distractor matching on state", () => {
  it("ignores significant figures, because a distractor predicts a value", () => {
    const target = submitted("22.4", "L");
    expect(numericStateMatches(target, submitted("22.4", "L"))).toBe(true);
    expect(numericStateMatches(target, submitted("22.40", "L"))).toBe(true);
    // The window is half of the last significant digit of the distractor, so
    // 22.4 catches 22.40 and does not catch a genuinely different number.
    expect(numericStateMatches(target, submitted("22.9", "L"))).toBe(false);
  });

  it("converts a compatible unit and rejects an incompatible one", () => {
    const target = submitted("2.00", "atm");
    expect(numericStateMatches(target, submitted("1520", "torr"))).toBe(true);
    expect(numericStateMatches(target, submitted("2.00", "g"))).toBe(false);
    expect(numericStateMatches(target, submitted("2.00", null))).toBe(false);
  });

  it("compares the value alone when the distractor names no unit", () => {
    const target = submitted("12.000", null);
    expect(numericStateMatches(target, submitted("12.00", "g"))).toBe(true);
  });
});
