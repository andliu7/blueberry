/**
 * A student's own values for the species their sheet prints that Blueberry's
 * ladder has no rung for (STATUS C2): HI, HBr, HCl, H2SO4, HNO3, HF, HN3, HCN,
 * carbocations, amide N-H.
 *
 * WHY A SEPARATE STORE. pka.ts holds values for RUNGS, and a rung is a
 * curriculum change (PkaSiteId is a closed union the checkers are written
 * against). These species are printed on the site's pKa deck and nowhere a
 * lesson grades, so a pasted value for one is kept here, keyed by the deck row
 * (DeckItem.pkaSheetId), and only that deck row shows it. Nothing in the game
 * reads this store.
 *
 * Same clock as pka.ts: a commit here also writes PKA_SAVED_AT_KEY, so account
 * sync (pkaSync.ts) sees one "last changed on this device" for both stores and
 * pushes or adopts them together. No React here; an external store like pka.ts.
 */

import { pkaDeck } from "@/data/decks/pka";
import { deckBadgeValue } from "@/lib/pkaOverrides";
import { PKA_SHEET_ALIASES } from "./pkaAliases";
import { PKA_SAVED_AT_KEY, browserStorage, isStorablePka, type SettingsStorage } from "./pka";

/** Mirrored in src/lib/pkaOverrides.ts, which reads it without importing this file. */
export const PKA_SHEET_KEY = "blueberry.pka.sheet.v1";

export type PkaSheetValues = Readonly<Record<string, number>>;

export interface PkaSheetRow {
  readonly id: string;
  /** The deck row's own title, so the paste report names what the student will see. */
  readonly label: string;
  /** The number the deck prints, or null when its badge is not a number. */
  readonly deckValue: number | null;
}

let rows: Map<string, PkaSheetRow> | null = null;

/** The deck rows that carry a pkaSheetId, by that id. */
export function pkaSheetRows(): ReadonlyMap<string, PkaSheetRow> {
  if (rows !== null) return rows;
  rows = new Map();
  for (const item of pkaDeck.groups.flatMap((group) => group.items)) {
    if (item.pkaSheetId === undefined) continue;
    rows.set(item.pkaSheetId, { id: item.pkaSheetId, label: item.title, deckValue: deckBadgeValue(item.badge) });
  }
  return rows;
}

/** Known rows and storable numbers only, like pka.ts's sanitiseOverrides. */
export function sanitiseSheetValues(raw: unknown): Record<string, number> {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!(key in PKA_SHEET_ALIASES)) continue;
    if (typeof value !== "number" || !isStorablePka(value)) continue;
    out[key] = value;
  }
  return out;
}

export interface PkaSheetSource {
  getSnapshot(): PkaSheetValues;
  subscribe(listener: () => void): () => void;
  /**
   * Several rows in ONE commit. A value equal to the deck's own number clears
   * that row instead of storing it, so the deck does not mark it "yours".
   */
  setValues(values: Readonly<Record<string, number>>): void;
  clearAll(): void;
  /** Account sync adopting a newer copy; `at` is kept as the save time. */
  replaceAll(raw: unknown, at?: number): void;
}

function load(storage: SettingsStorage): PkaSheetValues {
  try {
    const raw = storage.getItem(PKA_SHEET_KEY);
    return raw === null ? {} : sanitiseSheetValues(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function createPkaSheet(storage: SettingsStorage = browserStorage()): PkaSheetSource {
  let snapshot = load(storage);
  const listeners = new Set<() => void>();

  const commit = (next: PkaSheetValues, at: number = Date.now()) => {
    snapshot = next;
    try {
      storage.setItem(PKA_SHEET_KEY, JSON.stringify(next));
      storage.setItem(PKA_SAVED_AT_KEY, String(at));
    } catch {
      /* storage blocked: the values last for the session */
    }
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setValues(values) {
      const next: Record<string, number> = { ...snapshot };
      let changed = false;
      for (const [id, value] of Object.entries(values)) {
        const row = pkaSheetRows().get(id);
        if (row === undefined || !isStorablePka(value)) continue;
        if (value === row.deckValue) {
          if (id in next) {
            delete next[id];
            changed = true;
          }
        } else if (next[id] !== value) {
          next[id] = value;
          changed = true;
        }
      }
      if (changed) commit(next);
    },
    clearAll() {
      if (Object.keys(snapshot).length === 0) return;
      commit({});
    },
    replaceAll(raw, at) {
      commit(sanitiseSheetValues(raw), at);
    },
  };
}

/** One instance for the app, like pkaSettings in pka.ts. */
export const pkaSheet: PkaSheetSource = createPkaSheet();
