/**
 * Account sync for a student's own pKa values (STATUS C2).
 *
 * One row per user in public.user_pka_settings (migration
 * 20261023130000_user_pka_settings.sql). On sign-in: read the row; if it is
 * newer than this device's last save, adopt it; if this device is newer, or
 * there is no row, push. After that, every change is pushed, debounced. The
 * row carries both stores: pka.ts (table and overrides) and pkaSheet.ts (the
 * deck rows with no rung, in sheet_values), on one clock.
 *
 * WHOSE VALUES ARE ON THIS DEVICE. OWNER_KEY names the account the local copy
 * belongs to. None yet: the first account to sign in adopts it, so values set
 * before signing in are kept. A different account: the old copy is stashed
 * under STASH_PREFIX + its owner and the device takes this account's row, or
 * the defaults, so one student's numbers never land on another's account.
 *
 * A MISSING TABLE (migration not applied), no Supabase in the build, or any
 * error sets status "device" and stops. It never throws: the values keep
 * working on the device and the settings page says where they are saved.
 *
 * Loaded through a dynamic import (App.tsx, for a signed-in student) and from
 * the lazy settings page for its status line. The client is injected, so this
 * file never imports supabase-js at runtime. No React here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PKA_SETTINGS,
  PKA_SETTINGS_KEY,
  pkaSettings,
  type PkaSettingsSource,
} from "./pka";
import { PKA_SHEET_KEY, pkaSheet, type PkaSheetSource } from "./pkaSheet";

export const OWNER_KEY = "blueberry.pka.owner.v1";
const STASH_PREFIX = "blueberry.pka.v1.stash:";
const SHEET_STASH_PREFIX = "blueberry.pka.sheet.v1.stash:";
const TABLE = "user_pka_settings";
const DEBOUNCE_MS = 800;

/* ------------------------------------------------------------------ */
/* Status, an external store for the settings page's one line           */
/* ------------------------------------------------------------------ */

/**
 *   idle     not started: nobody signed in this session
 *   syncing  the first read is running
 *   account  the account row holds what this device holds
 *   device   no table yet, no Supabase, or an error: saved on this device only
 */
export type PkaSyncStatus = "idle" | "syncing" | "account" | "device";

let status: PkaSyncStatus = "idle";
const listeners = new Set<() => void>();

export function getPkaSyncStatus(): PkaSyncStatus {
  return status;
}

export function subscribePkaSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setStatus(next: PkaSyncStatus): void {
  if (next === status) return;
  status = next;
  for (const listener of listeners) listener();
}

/* ------------------------------------------------------------------ */
/* Sync                                                                 */
/* ------------------------------------------------------------------ */

export interface PkaSyncOptions {
  readonly userId: string;
  readonly getClient: () => Promise<SupabaseClient | null>;
  readonly store?: PkaSettingsSource;
  /** Values for the deck rows with no rung (pkaSheet.ts), synced with the same row. */
  readonly sheet?: PkaSheetSource;
  readonly storage?: Pick<Storage, "getItem" | "setItem">;
}

interface Row {
  readonly preset_id: string;
  readonly overrides: unknown;
  /** Absent on a row written before the column existed; reads as none. */
  readonly sheet_values?: unknown;
  readonly updated_at: string;
}

function safeGet(storage: PkaSyncOptions["storage"], key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage: PkaSyncOptions["storage"], key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    /* storage blocked */
  }
}

function defaultStorage(): PkaSyncOptions["storage"] {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}

/** Starts sync for one signed-in user. Returns a stop for sign-out. Never throws. */
export function startPkaSync({
  userId,
  getClient,
  store = pkaSettings,
  sheet = pkaSheet,
  storage = defaultStorage(),
}: PkaSyncOptions): { stop(): void; done: Promise<void> } {
  let stopped = false;
  let unsubscribe: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  /** The client once the first read worked, so stop() can flush a pending push. */
  let live: SupabaseClient | null = null;
  /** True while adopting the account's copy, so that commit is not pushed straight back. */
  let adopting = false;

  const fail = () => {
    setStatus("device");
    stopped = true;
    unsubscribe?.();
    if (timer !== null) clearTimeout(timer);
  };

  const push = async (client: SupabaseClient): Promise<boolean> => {
    const snapshot = store.getSnapshot();
    const at = store.savedAt() || Date.now();
    const { error } = await client.from(TABLE).upsert(
      {
        user_id: userId,
        preset_id: snapshot.presetId,
        overrides: snapshot.overrides,
        sheet_values: sheet.getSnapshot(),
        updated_at: new Date(at).toISOString(),
      },
      { onConflict: "user_id" },
    );
    return error === null || error === undefined;
  };

  const run = async () => {
    setStatus("syncing");
    let client: SupabaseClient | null;
    try {
      client = await getClient();
    } catch {
      client = null;
    }
    if (client === null || stopped) {
      if (!stopped) fail();
      return;
    }

    try {
      const { data, error } = await client
        .from(TABLE)
        .select("preset_id, overrides, sheet_values, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (stopped) return;
      // A missing table (PGRST205, 42P01) lands here like any other error.
      if (error !== null && error !== undefined) {
        fail();
        return;
      }
      const row = (data ?? null) as Row | null;

      const owner = safeGet(storage, OWNER_KEY);
      if (owner !== null && owner !== userId) {
        // Another account's values are on this device. Keep them aside, then
        // take this account's row or the defaults.
        const local = safeGet(storage, PKA_SETTINGS_KEY);
        if (local !== null) safeSet(storage, STASH_PREFIX + owner, local);
        const localSheet = safeGet(storage, PKA_SHEET_KEY);
        if (localSheet !== null) safeSet(storage, SHEET_STASH_PREFIX + owner, localSheet);
        adopting = true;
        const at = row === null ? undefined : Date.parse(row.updated_at);
        store.replaceAll(
          row === null ? DEFAULT_PKA_SETTINGS : { presetId: row.preset_id, overrides: row.overrides },
          at,
        );
        sheet.replaceAll(row === null ? {} : row.sheet_values, at);
        adopting = false;
      } else {
        const remoteAt = row === null ? 0 : Date.parse(row.updated_at);
        const localAt = store.savedAt();
        if (row !== null && remoteAt > localAt) {
          adopting = true;
          store.replaceAll({ presetId: row.preset_id, overrides: row.overrides }, remoteAt);
          sheet.replaceAll(row.sheet_values, remoteAt);
          adopting = false;
        } else if (localAt > remoteAt) {
          if (!(await push(client))) {
            fail();
            return;
          }
        }
      }
      safeSet(storage, OWNER_KEY, userId);
      if (stopped) return;
      setStatus("account");

      live = client;
      const onChange = () => {
        if (adopting || stopped) return;
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          void push(client).then(
            (ok) => {
              if (!ok) fail();
            },
            () => fail(),
          );
        }, DEBOUNCE_MS);
      };
      const offStore = store.subscribe(onChange);
      const offSheet = sheet.subscribe(onChange);
      unsubscribe = () => {
        offStore();
        offSheet();
      };
    } catch {
      fail();
    }
  };

  const done = run();
  return {
    done,
    stop() {
      stopped = true;
      unsubscribe?.();
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
        // A change made just before stop (sign-out, leaving the deck) still goes
        // up now, fire and forget, rather than waiting for the next sign-in.
        if (live !== null) void push(live).catch(() => undefined);
      }
      setStatus("idle");
    },
  };
}
