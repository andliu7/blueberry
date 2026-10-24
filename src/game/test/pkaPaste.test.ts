/**
 * The pKa sheet paste (STATUS C2) against the kinds of text students really
 * paste: spreadsheet blocks, CSV, PDF copies that split a row in two, bullets,
 * Unicode minus signs and subscripts. Each case says what it guards.
 */

import { describe, expect, it } from "vitest";
import { matchPkaSheet, overridesFrom, parsePkaSheet, summarisePaste, type PasteLine } from "../settings/pkaPaste";
import { DEFAULT_PKA_SETTINGS, TEXTBOOK_PRESET_ID } from "../settings/pka";

/** The lines that parsed, as [name, value]. */
function good(lines: readonly PasteLine[]): [string, number][] {
  return lines.flatMap((line) => ("problem" in line ? [] : [[line.name, line.value] as [string, number]]));
}

function problems(lines: readonly PasteLine[]): string[] {
  return lines.flatMap((line) => ("problem" in line ? [line.problem] : []));
}

/** Paste straight through to rung -> value. */
function matched(text: string): Record<string, number> {
  return Object.fromEntries(matchPkaSheet(parsePkaSheet(text)).matched.map((m) => [m.siteId, m.value]));
}

describe("parsePkaSheet", () => {
  it("reads a tab-separated spreadsheet block and skips its header", () => {
    const lines = parsePkaSheet("Acid\tpKa\nAcetic acid\t4.76\nWater\t15.7\nPhenol\t10\n");
    expect(good(lines)).toEqual([
      ["Acetic acid", 4.76],
      ["Water", 15.7],
      ["Phenol", 10],
    ]);
    expect(problems(lines)).toEqual([]);
  });

  it("reads quoted CSV and its header", () => {
    expect(good(parsePkaSheet('Compound,pKa\n"Acetic acid", 4.76\n"Water",15.7'))).toEqual([
      ["Acetic acid", 4.76],
      ["Water", 15.7],
    ]);
  });

  it("joins a PDF copy that puts names and values on alternating lines", () => {
    expect(good(parsePkaSheet("Acetic acid\n4.76\nWater\n15.7\nPhenol\n10"))).toEqual([
      ["Acetic acid", 4.76],
      ["Water", 15.7],
      ["Phenol", 10],
    ]);
    expect(matched("Acetic acid\n4.76\nWater\n15.7")).toEqual({ carboxylic_acid: 4.76, water: 15.7 });
  });

  it("does not read the digit in a formula as the value", () => {
    expect(good(parsePkaSheet("H₂O 15.7"))).toEqual([["H₂O", 15.7]]);
    expect(matched("H₂O 15.7\nNH4+ 9.2\nH3O+ -1.7")).toEqual({ water: 15.7, ammonium: 9.2, hydronium: -1.7 });
    expect(matched("1,3-dicarbonyl 9")).toEqual({ beta_dicarbonyl_alpha_ch: 9 });
  });

  it("reads a hyphen or a Unicode minus right before a digit as a minus sign", () => {
    expect(good(parsePkaSheet("HCl −7\nHBr -8"))).toEqual([
      ["HCl", -7],
      ["HBr", -8],
    ]);
  });

  it("reads a spaced hyphen or dash as a separator, not a sign", () => {
    expect(good(parsePkaSheet("Water - 15.7\nWater – 15.7\nPhenol — 10"))).toEqual([
      ["Water", 15.7],
      ["Water", 15.7],
      ["Phenol", 10],
    ]);
  });

  it("accepts 'pKa =', 'pKa:', '~' and 'about' before the number", () => {
    expect(good(parsePkaSheet("Acetic acid pKa = 4.8\nWater pKa: 15.7\nAlcohol ~16\nPhenol about 10\nWater=16"))).toEqual([
      ["Acetic acid", 4.8],
      ["Water", 15.7],
      ["Alcohol", 16],
      ["Phenol", 10],
      ["Water", 16],
    ]);
  });

  it("strips bullets and list numbers so '1.' is not the value", () => {
    expect(good(parsePkaSheet("• Phenol 10\n- Water 15.7\n* Alkane 50"))).toEqual([
      ["Phenol", 10],
      ["Water", 15.7],
      ["Alkane", 50],
    ]);
    expect(good(parsePkaSheet("1. Phenol 10\n2) Water 15.7\n10. Acetic acid 4.76"))).toEqual([
      ["Phenol", 10],
      ["Water", 15.7],
      ["Acetic acid", 4.76],
    ]);
  });

  it("matches a name with a formula in brackets", () => {
    expect(matched("Acetic acid (CH3COOH) 4.76")).toEqual({ carboxylic_acid: 4.76 });
    // The parenthetical is tried when the name itself is not an alias.
    expect(matched("Ethanoic acid (CH3COOH) 4.76")).toEqual({ carboxylic_acid: 4.76 });
  });

  it("uses a structure or conjugate-base column only when the name does not match", () => {
    const lines = parsePkaSheet("Acid\tConjugate base\tpKa\nAcetic acid\tacetate\t4.76");
    expect(lines).toEqual([{ raw: "Acetic acid\tacetate\t4.76", name: "Acetic acid", value: 4.76, extras: ["acetate"] }]);
    expect(matched("Acetic acid\tacetate\t4.76")).toEqual({ carboxylic_acid: 4.76 });
    // The name is not an alias, so the structure column decides.
    expect(matched("Ethanoic acid\tCH3COOH\t4.8")).toEqual({ carboxylic_acid: 4.8 });
    expect(matched("Mystery acid\tunknown thing\t4.8")).toEqual({});
  });

  it("reads a comma decimal inside a tab-separated row", () => {
    expect(good(parsePkaSheet("Essigsäure\t4,76\nAcetic acid\t4,76"))).toEqual([
      ["Essigsäure", 4.76],
      ["Acetic acid", 4.76],
    ]);
  });

  it("refuses two numbers on one line and a range", () => {
    expect(problems(parsePkaSheet("Acetic acid 4.76 4.8"))).toEqual(["two_numbers"]);
    expect(problems(parsePkaSheet("Water 15-16\nWater 15 to 16\nAlcohol 16 - 18"))).toEqual(["range", "range", "range"]);
  });

  it("refuses a value off the ladder", () => {
    expect(problems(parsePkaSheet("water 157"))).toEqual(["out_of_range"]);
    expect(problems(parsePkaSheet("water\n157"))).toEqual(["out_of_range"]);
  });

  it("reports a name with no number, and a number with no name", () => {
    expect(problems(parsePkaSheet("Strong acids\nWater 15.7"))).toEqual(["no_number"]);
    expect(problems(parsePkaSheet("4.76"))).toEqual(["no_name"]);
  });

  it("handles an empty paste, Windows line endings and trailing whitespace", () => {
    expect(parsePkaSheet("")).toEqual([]);
    expect(parsePkaSheet("   \n\n\t\n")).toEqual([]);
    expect(good(parsePkaSheet("Water 15.7   \r\nPhenol\t10\t \r\n"))).toEqual([
      ["Water", 15.7],
      ["Phenol", 10],
    ]);
  });
});

describe("matchPkaSheet", () => {
  it("splits unknown names from species with no rung yet", () => {
    const match = matchPkaSheet(parsePkaSheet("unobtainium 3\nHCl -7\nHydrochloric acid -7\nAmide 15"));
    expect(match.matched).toEqual([]);
    expect(match.unknown.map((u) => u.name)).toEqual(["unobtainium"]);
    expect(match.noRung.map((u) => u.name)).toEqual(["HCl", "Hydrochloric acid", "Amide"]);
  });

  it("applies neither of two lines that put different values on one rung", () => {
    const match = matchPkaSheet(parsePkaSheet("acetic acid 4.76\ncarboxylic acid 4.2\nwater 15.7"));
    expect(match.matched.map((m) => m.siteId)).toEqual(["water"]);
    expect(match.conflicts).toEqual([
      {
        siteId: "carboxylic_acid",
        entries: [
          { raw: "acetic acid 4.76", value: 4.76 },
          { raw: "carboxylic acid 4.2", value: 4.2 },
        ],
      },
    ]);
  });

  it("collapses an identical duplicate into one", () => {
    const match = matchPkaSheet(parsePkaSheet("water 15.7\nH2O 15.7"));
    expect(match.matched).toEqual([{ siteId: "water", value: 15.7, raw: "water 15.7" }]);
    expect(match.conflicts).toEqual([]);
  });

  it("gives every rung a row names when the sheet prints two on one", () => {
    expect(matched("Hydronium / protonated alcohol or ether ~0")).toEqual({ hydronium: 0, protonated_alcohol: 0 });
    expect(matched("Aryl / vinyl proton\t40")).toEqual({ vinylic_or_aromatic_ch: 40 });
  });

  it("reads the site's own reference deck rows", () => {
    expect(
      matched(
        [
          "Protonated carbonyl\t-7",
          "Carboxylic acid\t5",
          "Phenol\t10",
          "Proton between two carbonyls\t10",
          "Protonated amine\t10",
          "Alcohol\t16",
          "Water\t16",
          "Alpha proton\t20",
          "Terminal alkyne\t25",
          "Amine N–H\t35",
          "Alkane\t50",
        ].join("\n"),
      ),
    ).toEqual({
      protonated_carbonyl: -7,
      carboxylic_acid: 5,
      phenol: 10,
      beta_dicarbonyl_alpha_ch: 10,
      ammonium: 10,
      alcohol: 16,
      water: 16,
      ketone_alpha_ch: 20,
      terminal_alkyne_ch: 25,
      amine_nh: 35,
      alkane_ch: 50,
    });
  });
});

describe("summarisePaste", () => {
  it("reports old -> new against the course preset, and leaves equal values out of the write", () => {
    const summary = summarisePaste(
      DEFAULT_PKA_SETTINGS,
      matchPkaSheet(parsePkaSheet("water 15.7\nacetic acid 4.76\nphenol 10\nunobtainium 3\nHCl -7\nwater 157")),
    );
    expect(summary.changed).toEqual([
      { siteId: "water", label: "Water", from: 16, to: 15.7 },
      { siteId: "carboxylic_acid", label: "Carboxylic acid O-H", from: 5, to: 4.76 },
    ]);
    expect(summary.unchanged).toEqual([{ siteId: "phenol", label: "Phenol O-H", value: 10 }]);
    expect(summary.unknown).toHaveLength(1);
    expect(summary.noRung).toHaveLength(1);
    expect(summary.rejected).toEqual([{ raw: "water 157", problem: "out_of_range" }]);
    expect(overridesFrom(summary)).toEqual({ water: 15.7, carboxylic_acid: 4.76 });
  });

  it("compares against the student's current table, override included", () => {
    const settings = { presetId: TEXTBOOK_PRESET_ID, overrides: { water: 14 } };
    const summary = summarisePaste(settings, matchPkaSheet(parsePkaSheet("water 15.7\nacetic acid 4.8")));
    expect(summary.changed).toEqual([{ siteId: "water", label: "Water", from: 14, to: 15.7 }]);
    expect(summary.unchanged.map((u) => u.siteId)).toEqual(["carboxylic_acid"]);
  });
});
