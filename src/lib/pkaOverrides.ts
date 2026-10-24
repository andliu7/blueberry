import { useEffect, useState } from "react";
import type { DeckGroup } from "@/data/types";

/**
 * The student's own pKa values, read for the SITE's reference deck (STATUS C2).
 *
 * The game keeps them in localStorage under "blueberry.pka.v1"
 * (src/game/settings/pka.ts, which owns the shape and the rules). This is a
 * tiny reader with no @blueberry/curriculum import, so the site chunk does not
 * grow: it takes finite numbers between -25 and 65 and ignores the rest.
 *
 * The deck shows OVERRIDES only, never the game's preset, because the deck is a
 * transcription of one named sheet: a number there changes only when the
 * student changed it themselves.
 */

export const PKA_SETTINGS_KEY = "blueberry.pka.v1";
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

export function readPkaOverrides(): PkaOverrides {
  try {
    return parsePkaOverrides(localStorage.getItem(PKA_SETTINGS_KEY));
  } catch {
    return {};
  }
}

/** One or two decimals at most, the way the game prints them. */
function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/**
 * The deck's groups with each mapped row's badge replaced by the student's
 * value plus " (yours)". Rows with no pkaSiteId, or no override, are returned
 * untouched, and so are the groups when there is nothing to change.
 */
export function applyPkaOverrides(groups: DeckGroup[], overrides: PkaOverrides): DeckGroup[] {
  if (Object.keys(overrides).length === 0) return groups;
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const value = item.pkaSiteId === undefined ? undefined : overrides[item.pkaSiteId];
      return value === undefined ? item : { ...item, badge: `${formatValue(value)} (yours)` };
    }),
  }));
}

/**
 * The overrides, kept fresh when another tab (the game's settings page) writes
 * them. The 'storage' event fires in every OTHER tab of the same origin.
 */
export function usePkaOverrides(): PkaOverrides {
  const [overrides, setOverrides] = useState<PkaOverrides>(readPkaOverrides);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === PKA_SETTINGS_KEY) setOverrides(readPkaOverrides());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return overrides;
}
