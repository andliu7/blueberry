// @vitest-environment jsdom

/**
 * The site's pKa deck shows every value the game grades a student with
 * (STATUS C2): their chosen table, their own rung values, both rungs of the
 * "Hydronium / protonated alcohol" row, and their values for rows with no rung.
 * Table values come from the game's own resolver (pkaSiteBridge.ts).
 */

import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pkaDeck } from "@/data/decks/pka";
import {
  applyPkaOverrides,
  deckBadgeValue,
  parsePkaPresetId,
  parsePkaSheetValues,
  type StudentPka,
} from "@/lib/pkaOverrides";
import { DEFAULT_PKA_SETTINGS, TEXTBOOK_PRESET_ID, pkaValueFor, type SettingsStorage } from "@/game/settings/pka";
import { presetTable, studentPkaFrom, watchStudentPka } from "@/game/settings/pkaSiteBridge";
import { matchPkaSheet, parsePkaSheet, summarisePaste } from "@/game/settings/pkaPaste";
import type { PkaSiteId } from "@blueberry/curriculum";

const rows = (groups = pkaDeck.groups) => groups.flatMap((g) => g.items);
const badge = (groups: typeof pkaDeck.groups, title: string) => rows(groups).find((row) => row.title === title)?.badge;
const show = (values: StudentPka) => applyPkaOverrides(pkaDeck.groups, values.overrides, values);

function mapStorage(): SettingsStorage {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

describe("pKa deck, the student's whole table", () => {
  it("prints exactly the game's default table, so a default student sees it unchanged", () => {
    for (const row of rows()) {
      for (const id of [row.pkaSiteId, row.pkaSecondSiteId]) {
        if (id === undefined) continue;
        expect(pkaValueFor(DEFAULT_PKA_SETTINGS, id as PkaSiteId), `${row.title} (${id})`).toBe(deckBadgeValue(row.badge));
      }
    }
    expect(presetTable(DEFAULT_PKA_SETTINGS.presetId)).toEqual({});
    expect(show(studentPkaFrom(mapStorage()))).toBe(pkaDeck.groups);
  });

  it("shows the Standard textbook values the game grades with", () => {
    const groups = show({ overrides: {}, table: presetTable(TEXTBOOK_PRESET_ID), sheet: {} });
    expect(badge(groups, "Carboxylic acid")).toBe("4.8 (your table)");
    expect(badge(groups, "Protonated amine")).toBe("10.6 (your table)");
    expect(badge(groups, "Proton between two carbonyls")).toBe("13 (your table)");
    expect(badge(groups, "Alpha proton")).toBe("19 (your table)");
    expect(badge(groups, "Amine N–H")).toBe("38 (your table)");
    expect(badge(groups, "Aryl / vinyl proton")).toBe("43 (your table)");
    expect(badge(groups, "Water")).toBe("15.7 (your table)");
    expect(badge(groups, "Hydronium / protonated alcohol or ether")).toBe("-1.7 / -2.4 (your table)");
    // Rows the textbook agrees with stay as printed.
    expect(badge(groups, "Phenol")).toBe("10");
    expect(badge(groups, "Alkane")).toBe("50");
  });

  it("agrees with the paste: 'Already the same' on the textbook is what the deck shows", () => {
    const settings = { presetId: TEXTBOOK_PRESET_ID, overrides: {} };
    const summary = summarisePaste(settings, matchPkaSheet(parsePkaSheet("acetic acid 4.8")));
    expect(summary.unchanged.map((row) => row.siteId)).toEqual(["carboxylic_acid"]);
    const groups = show({ overrides: {}, table: presetTable(TEXTBOOK_PRESET_ID), sheet: {} });
    expect(badge(groups, "Carboxylic acid")).toBe("4.8 (your table)");
  });

  it("puts the student's own value over their table, marked as theirs", () => {
    const groups = show({ overrides: { carboxylic_acid: 4.76 }, table: presetTable(TEXTBOOK_PRESET_ID), sheet: {} });
    expect(badge(groups, "Carboxylic acid")).toBe("4.76 (yours)");
  });

  it("shows either rung of the hydronium row", () => {
    expect(badge(show({ overrides: { protonated_alcohol: -3 }, table: {}, sheet: {} }), "Hydronium / protonated alcohol or ether")).toBe("~0 / -3 (yours)");
    expect(badge(show({ overrides: { hydronium: -1.7, protonated_alcohol: -1.7 }, table: {}, sheet: {} }), "Hydronium / protonated alcohol or ether")).toBe("-1.7 (yours)");
  });

  it("shows a value for a row with no rung on that row only", () => {
    const groups = show({ overrides: {}, table: {}, sheet: { hcl: -6 } });
    expect(badge(groups, "Hydrochloric acid")).toBe("-6 (yours)");
    rows(groups).forEach((row, i) => {
      if (row.title !== "Hydrochloric acid") expect(row).toBe(rows()[i]);
    });
  });

  it("reads stored values through the bridge, preset included", () => {
    const storage = mapStorage();
    storage.setItem("blueberry.pka.v1", JSON.stringify({ presetId: "textbook", overrides: { water: 14 } }));
    storage.setItem("blueberry.pka.sheet.v1", JSON.stringify({ hf: 3.2 }));
    const values = studentPkaFrom(storage);
    expect(values.overrides).toEqual({ water: 14 });
    expect(values.sheet).toEqual({ hf: 3.2 });
    expect(values.table.carboxylic_acid).toBe(4.8);
  });

  it("reads bad storage as the course worksheet with nothing changed", () => {
    for (const raw of [null, "", "not json", "[]", '{"presetId":7}']) {
      expect(parsePkaPresetId(raw), String(raw)).toBe("course_worksheet");
    }
    for (const raw of [null, "not json", "[]", '{"hcl":"x","hf":900}']) {
      expect(parsePkaSheetValues(raw), String(raw)).toEqual({});
    }
    expect(deckBadgeValue("~0")).toBe(0);
    expect(deckBadgeValue("-10")).toBe(-10);
    expect(deckBadgeValue("n/a")).toBeNull();
  });
});

describe("pKa deck, signed in on a new device", () => {
  it("pulls the account's values without the game ever opening", async () => {
    try {
      localStorage.removeItem("blueberry.pka.v1");
    } catch {
      /* no storage in this environment: the bridge reads none either */
    }
    const row = { preset_id: "textbook", overrides: { water: 14 }, sheet_values: { hcl: -6 }, updated_at: new Date(Date.now() + 60_000).toISOString() };
    const client = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
        upsert: async () => ({ error: null }),
      }),
    } as unknown as SupabaseClient;
    const seen: StudentPka[] = [];
    let adopted: () => void = () => undefined;
    const done = new Promise<void>((resolve) => (adopted = resolve));
    const stop = watchStudentPka({
      userId: "u-new-device",
      getClient: async () => client,
      onChange: (values) => {
        seen.push(values);
        if (values.overrides.water === 14) adopted();
      },
    });
    await done;
    stop();
    const last = seen[seen.length - 1];
    expect(last?.sheet).toEqual({ hcl: -6 });
    expect(badge(show(last as StudentPka), "Water")).toBe("14 (yours)");
    expect(badge(show(last as StudentPka), "Carboxylic acid")).toBe("4.8 (your table)");
  });
});
