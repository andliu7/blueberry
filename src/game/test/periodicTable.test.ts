/**
 * The periodic table's data and layout. The values come from PubChem
 * (src/game/tabs/periodic/pubchemElements.ts, generated); group and period are
 * DERIVED from the atomic number in elements.ts, so they are checked here
 * against what PubChem itself says: the electron configuration and the
 * category.
 */

import { describe, expect, it } from "vitest";
import { CATEGORIES, ELEMENTS, elementBySymbol, gridPosition, kelvinToCelsius, periodAndGroup } from "../tabs/periodic/elements";
import { PUBCHEM_ROWS } from "../tabs/periodic/pubchemElements";

/**
 * The period a PubChem configuration implies: one shell past its noble gas core
 * ("[Kr]..." is period 5), or the highest shell for H and He. Not "the highest
 * shell written", because palladium is [Kr] 4d10 with no 5s electron at all.
 */
const CORE_SHELL: Record<string, number> = { He: 1, Ne: 2, Ar: 3, Kr: 4, Xe: 5, Rn: 6 };
function periodFromConfiguration(configuration: string): number {
  const core = /^\[(\w+)\]/.exec(configuration)?.[1];
  if (core !== undefined) return CORE_SHELL[core] + 1;
  return Math.max(...[...configuration.matchAll(/(\d)[spdf]\d+/g)].map((match) => Number(match[1])));
}

describe("periodic table data", () => {
  it("has all 118 elements, in order, straight from the PubChem rows", () => {
    expect(PUBCHEM_ROWS).toHaveLength(118);
    expect(ELEMENTS.map((element) => element.number)).toEqual(Array.from({ length: 118 }, (_, i) => i + 1));
    ELEMENTS.forEach((element, index) => {
      expect(element.symbol).toBe(PUBCHEM_ROWS[index][1]);
      expect(element.mass).toBe(PUBCHEM_ROWS[index][3]);
    });
  });

  it("derives the period that the electron configuration implies, for every element", () => {
    for (const element of ELEMENTS) {
      expect(element.period, element.symbol).toBe(periodFromConfiguration(element.configuration));
    }
  });

  it("puts PubChem's families in the right groups", () => {
    const groupsOf = (category: string) => new Set(ELEMENTS.filter((e) => e.category === category).map((e) => e.group));
    expect(groupsOf("alkali")).toEqual(new Set([1]));
    expect(groupsOf("alkaline")).toEqual(new Set([2]));
    expect(groupsOf("halogen")).toEqual(new Set([17]));
    expect(groupsOf("noble")).toEqual(new Set([18]));
    expect(groupsOf("lanthanide")).toEqual(new Set([null]));
    expect(groupsOf("actinide")).toEqual(new Set([null]));
  });

  it("matches a few hand-checkable placements", () => {
    expect(periodAndGroup(1)).toEqual({ period: 1, group: 1 });
    expect(periodAndGroup(2)).toEqual({ period: 1, group: 18 });
    expect(periodAndGroup(6)).toEqual({ period: 2, group: 14 });
    expect(periodAndGroup(35)).toEqual({ period: 4, group: 17 });
    expect(periodAndGroup(72)).toEqual({ period: 6, group: 4 });
    expect(periodAndGroup(86)).toEqual({ period: 6, group: 18 });
    expect(periodAndGroup(118)).toEqual({ period: 7, group: 18 });
  });

  it("gives every element its own grid cell, inside the 18 by 10 grid, with the spacer row empty", () => {
    const seen = new Set<string>();
    for (const element of ELEMENTS) {
      const { column, row } = gridPosition(element);
      expect(column).toBeGreaterThanOrEqual(1);
      expect(column).toBeLessThanOrEqual(18);
      expect([1, 2, 3, 4, 5, 6, 7, 9, 10]).toContain(row);
      const key = `${column},${row}`;
      expect(seen.has(key), `${element.symbol} collides at ${key}`).toBe(false);
      seen.add(key);
    }
    // Group 3 of periods 6 and 7 is left for the "57-71" and "89-103" markers.
    expect(seen.has("3,6")).toBe(false);
    expect(seen.has("3,7")).toBe(false);
    // The inset sits in columns 3 to 12 of rows 1 to 3, which must be empty.
    for (let row = 1; row <= 3; row += 1) {
      for (let column = 3; column <= 12; column += 1) expect(seen.has(`${column},${row}`)).toBe(false);
    }
  });

  it("has a filter for every category that occurs, and no empty filter", () => {
    expect(new Set(ELEMENTS.map((element) => element.category))).toEqual(new Set(CATEGORIES));
  });

  it("finds symbols case-insensitively and converts kelvin", () => {
    expect(elementBySymbol("br")?.name).toBe("Bromine");
    expect(elementBySymbol("Xx")).toBeNull();
    expect(kelvinToCelsius(273.15)).toBe(0);
    expect(kelvinToCelsius(373.15)).toBe(100);
  });
});
