/**
 * What the SITE's pKa reference deck needs from the game (STATUS C2), loaded by
 * src/lib/pkaOverrides.ts through a dynamic import only when it is needed: the
 * student chose a table other than the course worksheet, or is signed in.
 *
 * Two jobs. One, resolve the chosen table with the game's own pkaValueFor, so
 * the deck and the lessons can never print different numbers for a rung. Two,
 * run account sync while the deck is open, so a signed-in student on a new
 * device sees their account's values without opening #/app first.
 *
 * No React here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PKA_TABLE, type PkaSiteId } from "@blueberry/curriculum";
import { getSupabase } from "@/lib/supabase";
import type { StudentPka } from "@/lib/pkaOverrides";
import {
  COURSE_PRESET_ID,
  PKA_SETTINGS_KEY,
  browserStorage,
  createPkaSettings,
  pkaPreset,
  pkaSettings,
  pkaValueFor,
  type SettingsStorage,
} from "./pka";
import { PKA_SHEET_KEY, createPkaSheet, pkaSheet } from "./pkaSheet";
import { startPkaSync } from "./pkaSync";

/**
 * Every rung's value under a table, overrides aside. Empty for the course
 * worksheet, because that is the table the deck already prints
 * (src/test/pkaDeckStudent.test.ts checks the two agree).
 */
export function presetTable(presetId: string): Record<string, number> {
  if (pkaPreset(presetId).id === COURSE_PRESET_ID) return {};
  const out: Record<string, number> = {};
  for (const id of Object.keys(PKA_TABLE) as PkaSiteId[]) {
    out[id] = pkaValueFor({ presetId, overrides: {} }, id);
  }
  return out;
}

/** The student's values as stored now. Read fresh, so another tab's change counts too. */
export function studentPkaFrom(storage: SettingsStorage = browserStorage()): StudentPka {
  const settings = createPkaSettings(storage).getSnapshot();
  return {
    overrides: settings.overrides,
    table: presetTable(settings.presetId),
    sheet: createPkaSheet(storage).getSnapshot(),
  };
}

export interface WatchOptions {
  readonly userId: string | null;
  readonly onChange: (values: StudentPka) => void;
  readonly getClient?: () => Promise<SupabaseClient | null>;
}

/** Calls onChange now and on every change; syncs with the account when signed in. Returns a stop. */
export function watchStudentPka({ userId, onChange, getClient = getSupabase }: WatchOptions): () => void {
  const emit = () => onChange(studentPkaFrom());
  // An account copy adopted by sync commits to these stores, which is what re-renders the deck.
  const unsubscribes = [pkaSettings.subscribe(emit), pkaSheet.subscribe(emit)];
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PKA_SETTINGS_KEY || event.key === PKA_SHEET_KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  const sync = userId === null ? null : startPkaSync({ userId, getClient });
  emit();
  return () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
    window.removeEventListener("storage", onStorage);
    sync?.stop();
  };
}
