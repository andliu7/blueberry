import { useEffect, useMemo, useState } from "react";
import type { DeckGroup, DeckItem } from "@/data/types";

/**
 * The student's own pKa values, read for the SITE's reference deck (STATUS C2).
 *
 * The game keeps them in localStorage under "blueberry.pka.v1"
 * (src/game/settings/pka.ts, which owns the shape and the rules). This is a
 * tiny reader with no @blueberry/curriculum import, so the site chunk does not
 * grow: it takes finite numbers between -25 and 65 and ignores the rest.
 *
 * WHAT A ROW SHOWS. The deck is a transcription of the course worksheet, which
 * is also the game's default table, so a student on it with no changes sees the
 * deck as printed (src/test/pkaDeckStudent.test.ts pins that the two agree).
 * A row changes when the student's value differs from it:
 *   - their own value for a rung (an override)            "4.76 (yours)"
 *   - another table they chose, e.g. "Standard textbook"   "4.8 (your table)"
 *   - their own value for a row with no rung (HCl, HCN...)  "-6 (yours)"
 * The table values come from the game's own resolver (pkaValueFor), loaded
 * through a dynamic import only when the student chose another table or is
 * signed in (src/game/settings/pkaSiteBridge.ts), so nothing is copied here
 * and a default visitor downloads nothing extra.
 *
 * SIGNED IN. The same bridge runs account sync (pkaSync.ts) while the deck is
 * open, so a student on a new device sees their account's values here without
 * opening the game first.
 */

export const PKA_SETTINGS_KEY = "blueberry.pka.v1";
/** PKA_SHEET_KEY in src/game/settings/pkaSheet.ts: values for rows with no rung. */
export const PKA_SHEET_KEY = "blueberry.pka.sheet.v1";
/** COURSE_PRESET_ID in src/game/settings/pka.ts: the table this deck transcribes. */
const COURSE_PRESET_ID = "course_worksheet";
/** The same window as PKA_INPUT_MIN / PKA_INPUT_MAX in src/game/settings/pka.ts. */
const MIN = -25;
const MAX = 65;

export type PkaOverrides = Readonly<Record<string, number>>;

/** Parses the stored JSON. Bad or missing JSON reads as no overrides. */
export function parsePkaOverrides(raw: string | null): PkaOverrides {
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw) as { overrides?: unknown };
    const overrides = parsed?.overrides;
    if (typeof overrides !== "object" || overrides === null) return {};
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && value >= MIN && value <= MAX) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** One or two decimals at most, the way the game prints them. */
function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/** The chosen table's id, or the course worksheet when none is stored. */
export function parsePkaPresetId(raw: string | null): string {
  if (raw === null) return COURSE_PRESET_ID;
  try {
    const presetId = (JSON.parse(raw) as { presetId?: unknown })?.presetId;
    return typeof presetId === "string" ? presetId : COURSE_PRESET_ID;
  } catch {
    return COURSE_PRESET_ID;
  }
}

/** The stored values for rows with no rung, keyed by DeckItem.pkaSheetId. Same window as overrides. */
export function parsePkaSheetValues(raw: string | null): PkaOverrides {
  if (raw === null) return {};
  try {
    return parsePkaOverrides(JSON.stringify({ overrides: JSON.parse(raw) }));
  } catch {
    return {};
  }
}

/** The number a deck badge prints ("~0" is 0), or null when it is not one. */
export function deckBadgeValue(badge: string): number | null {
  const text = badge.trim().replace(/^~\s*/, "");
  if (text === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** Everything that can change a pKa deck row for one student. */
export interface StudentPka {
  /** Their own value per rung. */
  readonly overrides: PkaOverrides;
  /** Their chosen table's value per rung; empty on the course worksheet, which the deck already prints. */
  readonly table: PkaOverrides;
  /** Their own value per row with no rung. */
  readonly sheet: PkaOverrides;
}

const NONE: PkaOverrides = Object.freeze({});

/** The new badge for one row, or undefined when the row stays as printed. */
function rowBadge(item: DeckItem, overrides: PkaOverrides, table: PkaOverrides, sheet: PkaOverrides): string | undefined {
  if (item.pkaSheetId !== undefined) {
    const own = sheet[item.pkaSheetId];
    return own === undefined ? undefined : `${formatValue(own)} (yours)`;
  }
  if (item.pkaSiteId === undefined) return undefined;
  const ids = item.pkaSecondSiteId === undefined ? [item.pkaSiteId] : [item.pkaSiteId, item.pkaSecondSiteId];
  const printed = deckBadgeValue(item.badge);
  let mine = false;
  let moved = false;
  const parts = ids.map((id) => {
    const own = overrides[id];
    if (own !== undefined) {
      mine = true;
      moved = true;
      return formatValue(own);
    }
    const fromTable = table[id];
    if (fromTable !== undefined && fromTable !== printed) {
      moved = true;
      return formatValue(fromTable);
    }
    return item.badge;
  });
  if (!moved) return undefined;
  // "Hydronium / protonated alcohol" prints both rungs' values when they differ, one when they agree.
  return `${[...new Set(parts)].join(" / ")} ${mine ? "(yours)" : "(your table)"}`;
}

/**
 * The deck's groups with each changed row's badge replaced (see the header for
 * the three cases). Rows that do not change are returned untouched, and so are
 * the groups when there is nothing to change.
 */
export function applyPkaOverrides(
  groups: DeckGroup[],
  overrides: PkaOverrides,
  { table = NONE, sheet = NONE }: { readonly table?: PkaOverrides; readonly sheet?: PkaOverrides } = {},
): DeckGroup[] {
  if (Object.keys(overrides).length + Object.keys(table).length + Object.keys(sheet).length === 0) return groups;
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const badge = rowBadge(item, overrides, table, sheet);
      return badge === undefined ? item : { ...item, badge };
    }),
  }));
}

interface LocalPka {
  readonly overrides: PkaOverrides;
  readonly sheet: PkaOverrides;
  readonly presetId: string;
}

function readLocalPka(): LocalPka {
  const read = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const settings = read(PKA_SETTINGS_KEY);
  return {
    overrides: parsePkaOverrides(settings),
    sheet: parsePkaSheetValues(read(PKA_SHEET_KEY)),
    presetId: parsePkaPresetId(settings),
  };
}

/**
 * The student's pKa values for the deck. `enabled` is false on decks with no
 * pKa rows, so they do nothing. Signed out on the course worksheet this is a
 * plain localStorage read; otherwise the game's bridge is imported on demand
 * and takes over (resolved table values, account sync, same-tab updates).
 */
export function useStudentPka(enabled: boolean, userId: string | null): StudentPka {
  const [local, setLocal] = useState<LocalPka>(readLocalPka);
  const [live, setLive] = useState<StudentPka | null>(null);

  // The 'storage' event fires in every OTHER tab of the same origin, e.g. the game's settings page.
  useEffect(() => {
    if (!enabled) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === PKA_SETTINGS_KEY || event.key === PKA_SHEET_KEY) setLocal(readLocalPka());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [enabled]);

  const needsLive = enabled && (userId !== null || local.presetId !== COURSE_PRESET_ID);
  useEffect(() => {
    if (!needsLive) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    void import("@/game/settings/pkaSiteBridge").then(({ watchStudentPka }) => {
      if (cancelled) return;
      stop = watchStudentPka({ userId, onChange: setLive });
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [needsLive, userId]);

  // useMemo keeps the same object between renders, so the caller's own useMemo does not re-run every render.
  return useMemo(
    () => (needsLive && live !== null ? live : { overrides: local.overrides, table: NONE, sheet: local.sheet }),
    [needsLive, live, local],
  );
}
