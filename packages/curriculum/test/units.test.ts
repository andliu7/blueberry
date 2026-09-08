/**
 * The unit registry, and the case sensitivity rule that keeps molar from
 * becoming metres.
 */

import { describe, expect, it } from "vitest";
import {
  allUnitSymbols,
  convert,
  dimensionOf,
  isAffine,
  resolveUnit,
  sameDimension,
} from "../src/answers/units.ts";

describe("resolveUnit", () => {
  it("matches a symbol exactly and does not case fold it", () => {
    expect(resolveUnit("M")).toBe("M");
    expect(resolveUnit("m")).toBe("m");
    expect(dimensionOf("M")).toBe("concentration");
    expect(dimensionOf("m")).toBe("length");
    expect(sameDimension("M", "m")).toBe(false);
  });

  it("matches spelled out aliases case insensitively", () => {
    expect(resolveUnit("grams")).toBe("g");
    expect(resolveUnit("Atmospheres")).toBe("atm");
    expect(resolveUnit("MOLES")).toBe("mol");
    expect(resolveUnit("ml")).toBe("mL");
  });

  it("returns null for something it does not know", () => {
    expect(resolveUnit("furlongs")).toBeNull();
    expect(resolveUnit("")).toBeNull();
  });

  it("has a definition for every symbol in the union", () => {
    expect(allUnitSymbols().length).toBeGreaterThan(0);
    for (const symbol of allUnitSymbols()) {
      expect(resolveUnit(symbol)).toBe(symbol);
    }
  });
});

describe("convert", () => {
  it("scales within a dimension", () => {
    expect(convert(1, "atm", "torr")).toBeCloseTo(760, 6);
    expect(convert(1, "L", "mL")).toBeCloseTo(1000, 9);
    expect(convert(1, "kcal", "J")).toBeCloseTo(4184, 9);
  });

  it("returns null across dimensions rather than throwing", () => {
    expect(convert(1, "g", "L")).toBeNull();
  });

  it("carries the offset on the affine scale", () => {
    expect(convert(25, "degC", "K")).toBeCloseTo(298.15, 9);
    expect(convert(298.15, "K", "degC")).toBeCloseTo(25, 9);
    expect(isAffine("degC")).toBe(true);
    expect(isAffine("K")).toBe(false);
  });
});
