/**
 * ADVERSARY FINDING: unit symbol matching is case sensitive for every symbol in
 * the registry, but the collision that justifies case sensitivity ("M" is molar
 * and "m" is metre) exists for exactly one pair out of thirty symbols.
 *
 * units.ts's own header gives the reason for case sensitivity: "'M' is molar and
 * 'm' is metre... A case insensitive symbol match would quietly convert a
 * concentration into a length." That is a real risk for "M" and "m" specifically.
 * It is not a risk for "atm", "torr", "kPa", "mmHg", "cal", "kcal" or any other
 * symbol in `UNITS`: case-folding every symbol and checking for a second symbol
 * that now collides with it finds exactly one collision, `m`/`M`. Every other
 * symbol is safe to accept case-insensitively with no ambiguity at all, and the
 * registry pays for the "M" versus "m" protection everywhere rather than only
 * where it is needed.
 *
 * The practical cost: a student who writes "ATM", the capitalisation used on
 * gauges, textbooks, and by habit after typing in capitals, gets
 * `unit_not_recognised` on chemistry they answered correctly, which is the
 * notation tier CLAUDE.md's feedback axis exists to make specific, spent on a
 * typo the registry did not need to reject.
 */

import { describe, expect, it } from "vitest";
import { allUnitSymbols, resolveUnit } from "../src/answers/units.ts";

describe("case sensitivity is broader than the collision it defends against", () => {
  it("has exactly one case-folded collision in the whole registry, the M/m pair", () => {
    const byFoldedCase = new Map<string, string[]>();
    for (const symbol of allUnitSymbols()) {
      const key = symbol.toLowerCase();
      byFoldedCase.set(key, [...(byFoldedCase.get(key) ?? []), symbol]);
    }
    const collisions = [...byFoldedCase.entries()].filter(([, symbols]) => symbols.length > 1);
    expect(collisions).toEqual([["m", ["m", "M"]]]);
  });

  it("still refuses a common capitalisation of a symbol that has no collision risk", () => {
    // This is the failing assertion: "ATM" cannot be confused with any other
    // registered symbol (verified above), so rejecting it teaches a student
    // their correct chemistry was a unit error it was not.
    expect(resolveUnit("ATM")).toBe("atm");
  });
});
