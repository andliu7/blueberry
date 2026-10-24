/**
 * Values for the pKa deck rows with no rung (STATUS C2, src/game/settings/pkaSheet.ts):
 * the aliases line up with the deck, a paste finds them, the store keeps them,
 * and account sync carries them on the same row and clock as the overrides.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pkaDeck } from "@/data/decks/pka";
import { PKA_SAVED_AT_KEY, createPkaSettings, type SettingsStorage } from "../settings/pka";
import { PKA_KNOWN_NO_RUNG, PKA_SHEET_ALIASES, PKA_SHEET_SMARTS, aliasIndex, normaliseSpeciesName } from "../settings/pkaAliases";
import { PKA_SHEET_KEY, createPkaSheet, pkaSheetRows } from "../settings/pkaSheet";
import { matchPkaSheet, parsePkaSheet, sheetValuesFrom, summariseSheetPaste } from "../settings/pkaPaste";
import { startPkaSync } from "../settings/pkaSync";

function mapStorage(): SettingsStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

const deckSheetIds = pkaDeck.groups.flatMap((g) => g.items).flatMap((item) => (item.pkaSheetId === undefined ? [] : [item.pkaSheetId]));

describe("pKa sheet rows", () => {
  it("gives every deck row with no rung a sheet id, aliases and a SMARTS, and nothing else", () => {
    const rows = pkaDeck.groups.flatMap((g) => g.items);
    for (const row of rows) {
      // A row is a rung or a sheet row, never both and never neither.
      expect((row.pkaSiteId === undefined) !== (row.pkaSheetId === undefined), row.title).toBe(true);
    }
    expect(new Set(deckSheetIds).size).toBe(deckSheetIds.length);
    expect(Object.keys(PKA_SHEET_ALIASES).sort()).toEqual([...deckSheetIds].sort());
    expect(Object.keys(PKA_SHEET_SMARTS).sort()).toEqual([...deckSheetIds].sort());
  });

  it("keeps every sheet name apart from the rung aliases and from the other rows", () => {
    const seen = new Map<string, string>();
    for (const [row, entries] of Object.entries(PKA_SHEET_ALIASES)) {
      for (const entry of entries) {
        const name = normaliseSpeciesName(entry.name);
        expect(aliasIndex().has(name), entry.name).toBe(false);
        expect(seen.get(name) ?? row, entry.name).toBe(row);
        seen.set(name, row);
      }
    }
    // The no-rung names are exactly the sheet names ("amide N-H" and "amide" normalise alike).
    expect(new Set(PKA_KNOWN_NO_RUNG.map(normaliseSpeciesName))).toEqual(new Set(seen.keys()));
  });

  it("reads each row's printed number from the deck", () => {
    expect(pkaSheetRows().get("hcl")).toEqual({ id: "hcl", label: "Hydrochloric acid", deckValue: -7 });
    expect(pkaSheetRows().get("hno3")?.deckValue).toBe(0);
  });
});

describe("pasting rows with no rung", () => {
  it("files them on their deck row and still reports them as no rung", () => {
    const match = matchPkaSheet(parsePkaSheet("HCl -6\nHydrogen cyanide 9.2\nAmide 15\nunobtainium 3"));
    expect(match.noRung.map((row) => row.name)).toEqual(["HCl", "Hydrogen cyanide", "Amide"]);
    expect(match.sheet).toEqual([
      { sheetId: "hcl", value: -6, raw: "HCl -6" },
      { sheetId: "hcn", value: 9.2, raw: "Hydrogen cyanide 9.2" },
      { sheetId: "amide", value: 15, raw: "Amide 15" },
    ]);
  });

  it("uses neither of two different values for one row", () => {
    const match = matchPkaSheet(parsePkaSheet("HCl -6\nhydrochloric acid -8"));
    expect(match.sheet).toEqual([]);
    expect(match.noRung).toHaveLength(2);
  });

  it("compares against what the deck shows, and writes only what changed", () => {
    const match = matchPkaSheet(parsePkaSheet("HCl -6\nHF 3\nHBr -9"));
    const summary = summariseSheetPaste({ hbr: -9 }, match);
    expect(summary.changed).toEqual([{ sheetId: "hcl", label: "Hydrochloric acid", from: -7, to: -6, raw: "HCl -6" }]);
    expect(summary.unchanged.map((row) => row.sheetId)).toEqual(["hf", "hbr"]);
    expect(sheetValuesFrom(summary)).toEqual({ hcl: -6 });
  });
});

describe("the sheet store", () => {
  it("stores a value, clears one equal to the deck, and stamps the shared clock", () => {
    const storage = mapStorage();
    const sheet = createPkaSheet(storage);
    sheet.setValues({ hcl: -6, hf: 3.2, nonsense: 1 });
    expect(sheet.getSnapshot()).toEqual({ hcl: -6, hf: 3.2 });
    expect(Number(storage.map.get(PKA_SAVED_AT_KEY))).toBeGreaterThan(0);
    sheet.setValues({ hcl: -7 });
    expect(sheet.getSnapshot()).toEqual({ hf: 3.2 });
    expect(createPkaSheet(storage).getSnapshot()).toEqual({ hf: 3.2 });
    sheet.clearAll();
    expect(sheet.getSnapshot()).toEqual({});
  });

  it("drops bad stored values on load", () => {
    const storage = mapStorage();
    storage.setItem(PKA_SHEET_KEY, JSON.stringify({ hcl: "x", hf: 900, hi: -10.5, mystery: 2 }));
    expect(createPkaSheet(storage).getSnapshot()).toEqual({ hi: -10.5 });
    storage.setItem(PKA_SHEET_KEY, "not json");
    expect(createPkaSheet(storage).getSnapshot()).toEqual({});
  });
});

interface Row {
  preset_id: string;
  overrides: unknown;
  sheet_values?: unknown;
  updated_at: string;
}

function fakeClient(rows: Map<string, Row>, upserts: Row[]): SupabaseClient {
  const fake = {
    from() {
      return {
        select: () => ({ eq: (_c: string, user: string) => ({ maybeSingle: async () => ({ data: rows.get(user) ?? null, error: null }) }) }),
        upsert: async (row: Row & { user_id: string }) => {
          const { user_id, ...rest } = row;
          rows.set(user_id, rest);
          upserts.push(rest);
          return { error: null };
        },
      };
    },
  };
  return fake as unknown as SupabaseClient;
}

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  vi.useRealTimers();
});

describe("syncing the sheet rows", () => {
  it("pushes them with the row and adopts them from a newer row", async () => {
    const rows = new Map<string, Row>();
    const upserts: Row[] = [];
    const storage = mapStorage();
    const store = createPkaSettings(storage);
    const sheet = createPkaSheet(storage);
    sheet.setValues({ hcl: -6 });
    const first = startPkaSync({ userId: "u1", getClient: async () => fakeClient(rows, upserts), store, sheet, storage });
    stops.push(first.stop);
    await first.done;
    expect(rows.get("u1")?.sheet_values).toEqual({ hcl: -6 });

    // A new device: nothing local, the account row is adopted, sheet values included.
    const device = mapStorage();
    const freshSheet = createPkaSheet(device);
    const second = startPkaSync({
      userId: "u1",
      getClient: async () => fakeClient(rows, upserts),
      store: createPkaSettings(device),
      sheet: freshSheet,
      storage: device,
    });
    stops.push(second.stop);
    await second.done;
    expect(freshSheet.getSnapshot()).toEqual({ hcl: -6 });
  });

  it("reads a row without the column as no sheet values", async () => {
    const rows = new Map<string, Row>([["u1", { preset_id: "textbook", overrides: {}, updated_at: new Date(Date.now() + 60_000).toISOString() }]]);
    const storage = mapStorage();
    const sheet = createPkaSheet(storage);
    sheet.setValues({ hcl: -6 });
    // The local save is older than the row, so the row wins.
    storage.setItem(PKA_SAVED_AT_KEY, "1000");
    const sync = startPkaSync({ userId: "u1", getClient: async () => fakeClient(rows, []), store: createPkaSettings(storage), sheet, storage });
    stops.push(sync.stop);
    await sync.done;
    expect(sheet.getSnapshot()).toEqual({});
  });

  it("flushes a change made just before stop instead of dropping it", async () => {
    vi.useFakeTimers();
    const rows = new Map<string, Row>();
    const upserts: Row[] = [];
    const storage = mapStorage();
    const store = createPkaSettings(storage);
    const sync = startPkaSync({ userId: "u1", getClient: async () => fakeClient(rows, upserts), store, sheet: createPkaSheet(storage), storage });
    await sync.done;
    const before = upserts.length;
    store.setOverrides({ water: 15.7 });
    sync.stop();
    await vi.advanceTimersByTimeAsync(0);
    expect(upserts.length).toBe(before + 1);
    expect(rows.get("u1")?.overrides).toEqual({ water: 15.7 });
    // And nothing more fires after the debounce window.
    await vi.advanceTimersByTimeAsync(900);
    expect(upserts.length).toBe(before + 1);
  });
});
