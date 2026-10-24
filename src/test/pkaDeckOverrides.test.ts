/**
 * The site's pKa reference deck shows a student's own values (STATUS C2).
 * Only rows that are a game rung change, only when the student overrode that
 * rung, and bad storage leaves the deck exactly as transcribed.
 */

import { describe, expect, it } from "vitest";
import { pkaDeck } from "@/data/decks/pka";
import { applyPkaOverrides, parsePkaOverrides } from "@/lib/pkaOverrides";
import { PKA_TABLE } from "@blueberry/curriculum";

const rows = (groups = pkaDeck.groups) => groups.flatMap((g) => g.items);

describe("pKa deck overrides", () => {
  it("maps only real rungs", () => {
    const mapped = rows().filter((row) => row.pkaSiteId !== undefined);
    expect(mapped.length).toBe(13);
    for (const row of mapped) expect(row.pkaSiteId! in PKA_TABLE, row.title).toBe(true);
    // The HX acids, amide and carbocation rows have no rung.
    for (const title of ["Hydrochloric acid", "Amide N–H", "Carbocations"]) {
      expect(rows().find((row) => row.title === title)?.pkaSiteId, title).toBeUndefined();
    }
  });

  it("puts the student's value on mapped rows only", () => {
    const overrides = parsePkaOverrides(JSON.stringify({ presetId: "textbook", overrides: { water: 15.7, carbonic_acid: 6.3 } }));
    const after = rows(applyPkaOverrides(pkaDeck.groups, overrides));
    const before = rows();
    expect(after.find((row) => row.title === "Water")?.badge).toBe("15.7 (yours)");
    // Every other row is untouched, including the preset: the deck shows overrides only.
    after.forEach((row, i) => {
      if (row.title !== "Water") expect(row).toBe(before[i]);
    });
  });

  it("leaves the deck unchanged on bad or missing storage", () => {
    for (const raw of [null, "", "not json", "[]", '{"overrides":"x"}', '{"overrides":{"water":"16","phenol":900,"alcohol":null}}']) {
      const overrides = parsePkaOverrides(raw);
      expect(overrides, String(raw)).toEqual({});
      expect(applyPkaOverrides(pkaDeck.groups, overrides)).toBe(pkaDeck.groups);
    }
  });
});
