import { describe, expect, it } from "vitest";

import {
  ELEMENTS,
  allElements,
  elementProperties,
  isElement,
  type Element,
} from "../src/elements.ts";

/**
 * Nothing in this file is built at module scope, and no `it.each` is driven by a value
 * read from the package under test.
 *
 * The reason is a measurement one. If a table lookup returns undefined at import time,
 * the whole test file fails to load, Vitest reports zero failing tests for it, and the
 * mutation runner records the mutant that caused it as SURVIVED. Two real survivors in
 * this file were exactly that: `allElements` with its body removed. Reading the table
 * inside a test body turns those back into kills, which is what they should always have
 * been.
 */

describe("the element table", () => {
  it("is frozen and non empty", () => {
    expect(Object.isFrozen(ELEMENTS)).toBe(true);
    expect(allElements().length).toBeGreaterThan(0);
    expect(allElements().length).toBe(Object.keys(ELEMENTS).length);
  });

  it("carries the elements an undergraduate mechanism course actually draws", () => {
    for (const symbol of ["H", "C", "N", "O", "F", "P", "S", "Cl", "Br", "I"] as const) {
      expect(allElements()).toContain(symbol);
    }
  });

  it("gives every element self consistent properties", () => {
    const symbols = allElements();
    expect(symbols.length).toBeGreaterThan(0);
    for (const symbol of symbols) {
      const properties = elementProperties(symbol);

      // The key and the symbol agree, or a lookup returns another element's numbers.
      expect(properties.symbol).toBe(symbol);
      expect(properties.atomicNumber).toBeGreaterThan(0);
      expect(properties.period).toBeGreaterThanOrEqual(1);
      expect(properties.valenceElectrons).toBeGreaterThan(0);
      expect(properties.standardAtomicWeight).toBeGreaterThan(0);
      expect(typeof properties.mainGroup).toBe("boolean");

      // The ceiling has to be able to hold the electrons the element normally carries,
      // or the valence check refuses structures that are correct.
      expect(properties.maxValenceElectrons).toBeGreaterThanOrEqual(properties.valenceElectrons);
      expect(properties.commonNeutralValence.length).toBeGreaterThan(0);
      for (const valence of properties.commonNeutralValence) {
        expect(valence).toBeGreaterThan(0);
        expect(Number.isInteger(valence)).toBe(true);
      }
    }
  });

  it("gives every element a distinct atomic number", () => {
    const numbers = allElements().map((symbol) => elementProperties(symbol).atomicNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("puts the octet ceiling where the periodic table does", () => {
    // The reason octet_expanded_on_period_two is blocking on N and O and is not a
    // finding at all on S and P. If these two rows drift, the same drawing is judged
    // differently one row down for no reason a student can learn from.
    for (const symbol of ["B", "C", "N", "O", "F"] as const) {
      expect(elementProperties(symbol).period).toBe(2);
      expect(elementProperties(symbol).maxValenceElectrons).toBe(8);
    }
    for (const symbol of ["Si", "P", "S", "Cl"] as const) {
      expect(elementProperties(symbol).period).toBe(3);
      expect(elementProperties(symbol).maxValenceElectrons).toBe(12);
    }
    for (const symbol of ["Br", "I"] as const) {
      expect(elementProperties(symbol).maxValenceElectrons).toBe(12);
    }
    expect(elementProperties("H").maxValenceElectrons).toBe(2);
    expect(elementProperties("Li").maxValenceElectrons).toBe(2);
    expect(elementProperties("Na").maxValenceElectrons).toBe(2);
    expect(elementProperties("K").maxValenceElectrons).toBe(2);
    expect(elementProperties("Mg").maxValenceElectrons).toBe(8);
    expect(elementProperties("Al").maxValenceElectrons).toBe(12);
  });

  it("gives the group numbers the formal charge formula depends on", () => {
    expect(elementProperties("H").valenceElectrons).toBe(1);
    expect(elementProperties("B").valenceElectrons).toBe(3);
    expect(elementProperties("C").valenceElectrons).toBe(4);
    expect(elementProperties("N").valenceElectrons).toBe(5);
    expect(elementProperties("O").valenceElectrons).toBe(6);
    expect(elementProperties("F").valenceElectrons).toBe(7);
    expect(elementProperties("Si").valenceElectrons).toBe(4);
    expect(elementProperties("P").valenceElectrons).toBe(5);
    expect(elementProperties("S").valenceElectrons).toBe(6);
    expect(elementProperties("Cl").valenceElectrons).toBe(7);
    expect(elementProperties("Br").valenceElectrons).toBe(7);
    expect(elementProperties("I").valenceElectrons).toBe(7);
    expect(elementProperties("Li").valenceElectrons).toBe(1);
    expect(elementProperties("Na").valenceElectrons).toBe(1);
    expect(elementProperties("K").valenceElectrons).toBe(1);
    expect(elementProperties("Mg").valenceElectrons).toBe(2);
    expect(elementProperties("Al").valenceElectrons).toBe(3);
  });

  it("marks exactly the transition metals as outside the octet model", () => {
    // elementProperties is consulted by every electron count. A transition metal that
    // claimed mainGroup would be graded by a model that does not describe it, and a main
    // group element that claimed otherwise would be skipped by every octet check.
    const nonMainGroup = allElements().filter(
      (symbol) => !elementProperties(symbol).mainGroup,
    );
    expect([...nonMainGroup].sort()).toEqual(["Cu", "Zn"]);
  });

  it("gives common neutral valences that match the drawings", () => {
    expect(elementProperties("H").commonNeutralValence).toEqual([1]);
    expect(elementProperties("B").commonNeutralValence).toEqual([3]);
    expect(elementProperties("C").commonNeutralValence).toEqual([4]);
    expect(elementProperties("N").commonNeutralValence).toEqual([3]);
    expect(elementProperties("O").commonNeutralValence).toEqual([2]);
    expect(elementProperties("F").commonNeutralValence).toEqual([1]);
    expect(elementProperties("P").commonNeutralValence).toEqual([3, 5]);
    expect(elementProperties("S").commonNeutralValence).toEqual([2, 4, 6]);
    expect(elementProperties("Cu").commonNeutralValence).toEqual([1, 2]);
  });

  it("gives standard atomic weights that are near the mass number, for display", () => {
    expect(elementProperties("H").standardAtomicWeight).toBeCloseTo(1.008, 3);
    expect(elementProperties("C").standardAtomicWeight).toBeCloseTo(12.011, 3);
    expect(elementProperties("O").standardAtomicWeight).toBeCloseTo(15.999, 3);
    expect(elementProperties("Br").standardAtomicWeight).toBeCloseTo(79.904, 3);
  });

  it("gives the atomic numbers the table is keyed by", () => {
    expect(elementProperties("H").atomicNumber).toBe(1);
    expect(elementProperties("C").atomicNumber).toBe(6);
    expect(elementProperties("O").atomicNumber).toBe(8);
    expect(elementProperties("Cu").atomicNumber).toBe(29);
    expect(elementProperties("Zn").atomicNumber).toBe(30);
    expect(elementProperties("I").atomicNumber).toBe(53);
  });

  it("gives the periods the octet ceiling is derived from", () => {
    expect(elementProperties("H").period).toBe(1);
    expect(elementProperties("Li").period).toBe(2);
    expect(elementProperties("Na").period).toBe(3);
    expect(elementProperties("Br").period).toBe(4);
    expect(elementProperties("I").period).toBe(5);
  });
});

describe("isElement", () => {
  it("accepts every symbol in the table", () => {
    for (const symbol of allElements()) {
      expect(isElement(symbol)).toBe(true);
    }
  });

  it("rejects a symbol that is not in the table", () => {
    expect(isElement("Xe")).toBe(false);
    expect(isElement("")).toBe(false);
    expect(isElement("c")).toBe(false);
  });

  it("rejects inherited Object properties, which a plain `in` check would accept", () => {
    // The reason the implementation uses hasOwnProperty rather than `symbol in ELEMENTS`.
    expect(isElement("toString")).toBe(false);
    expect(isElement("constructor")).toBe(false);
    expect(isElement("hasOwnProperty")).toBe(false);
  });
});

describe("elementProperties", () => {
  it("throws rather than returning undefined for an unknown element", () => {
    expect(() => elementProperties("Xe" as Element)).toThrow(/Xe/);
  });

  it("returns the same object every call, so callers can compare by reference", () => {
    expect(elementProperties("C")).toBe(elementProperties("C"));
  });
});

describe("allElements", () => {
  it("returns a frozen list that matches the table keys in order", () => {
    const symbols = allElements();
    expect(symbols).toBeDefined();
    expect(Object.isFrozen(symbols)).toBe(true);
    expect([...symbols]).toEqual(Object.keys(ELEMENTS));
  });
});
