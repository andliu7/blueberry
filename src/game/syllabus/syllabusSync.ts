/**
 * Account sync for a student's syllabus plan (STATUS C1), the same shape as
 * settings/pkaSync.ts.
 *
 * One row per user in public.user_syllabus (migration
 * 20261025120000_user_syllabus.sql), holding the derived plan only, never the
 * pasted text. On sign-in: read the row; if it is newer than this device's
 * save, adopt it; if this device is newer, push. After that every change is
 * pushed, debounced. Clearing the plan deletes the row.
 *
 * WHOSE PLAN IS ON THIS DEVICE. OWNER_KEY names the account the local copy
 * belongs to. None yet: the first account to sign in adopts it. A different
 * account: the old copy is stashed under STASH_PREFIX + its owner and the
 * device takes this account's row, or none.
 *
 * A MISSING TABLE (migration not applied), no Supabase, or any error sets
 * status "device" and stops. It never throws: the plan keeps working on the
 * device and the screen says where it is saved.
 *
 * Loaded through a dynamic import (src/game/App.tsx, for a signed-in
 * student) and by the lazy syllabus screen for its status line. The client is
 * injected, so this file never imports supabase-js at runtime. No React.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { SYLLABUS_KEY, sanitisePlan, syllabusStore, type SyllabusStore } from "./syllabusPlan";

export const OWNER_KEY = "blueberry.syllabus.owner.v1";
const STASH_PREFIX = "blueberry.syllabus.v1.stash:";
const TABLE = "user_syllabus";
const DEBOUNCE_MS = 800;

/** idle: nobody signed in; syncing: first read; account: the row matches; device: saved here only. */
export type SyllabusSyncStatus = "idle" | "syncing" | "account" | "device";

let status: SyllabusSyncStatus = "idle";
const listeners = new Set<() => void>();

export function getSyllabusSyncStatus(): SyllabusSyncStatus {
  return status;
}

export function subscribeSyllabusSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setStatus(next: SyllabusSyncStatus): void {
  if (next === status) return;
  status = next;
  for (const listener of listeners) listener();
}

export interface SyllabusSyncOptions {
  readonly userId: string;
  readonly getClient: () => Promise<SupabaseClient | null>;
  readonly store?: SyllabusStore;
  readonly storage?: Pick<Storage, "getItem" | "setItem">;
}

interface Row {
  readonly plan: unknown;
  readonly updated_at: string;
}

function safeGet(storage: SyllabusSyncOptions["storage"], key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage: SyllabusSyncOptions["storage"], key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    /* storage blocked */
  }
}

function defaultStorage(): SyllabusSyncOptions["storage"] {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}

/** Starts sync for one signed-in user. Returns a stop for sign-out. Never throws. */
export function startSyllabusSync({ userId, getClient, store = syllabusStore, storage = defaultStorage() }: SyllabusSyncOptions): { stop(): void; done: Promise<void> } {
  let stopped = false;
  let unsubscribe: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let adopting = false;

  const fail = () => {
    setStatus("device");
    stopped = true;
    unsubscribe?.();
    if (timer !== null) clearTimeout(timer);
  };

  const push = async (client: SupabaseClient): Promise<boolean> => {
    const plan = store.getSnapshot();
    if (plan === null) {
      const { error } = await client.from(TABLE).delete().eq("user_id", userId);
      return error === null || error === undefined;
    }
    const { error } = await client
      .from(TABLE)
      .upsert({ user_id: userId, plan, updated_at: new Date(store.savedAt() || Date.now()).toISOString() }, { onConflict: "user_id" });
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
      const { data, error } = await client.from(TABLE).select("plan, updated_at").eq("user_id", userId).maybeSingle();
      if (stopped) return;
      // A missing table (PGRST205, 42P01) lands here like any other error.
      if (error !== null && error !== undefined) {
        fail();
        return;
      }
      const row = (data ?? null) as Row | null;
      const remote = row === null ? null : sanitisePlan(row.plan);
      const remoteAt = row === null ? 0 : Date.parse(row.updated_at);

      const owner = safeGet(storage, OWNER_KEY);
      if (owner !== null && owner !== userId) {
        // Another account's plan is on this device: keep it aside, take this account's.
        const local = safeGet(storage, SYLLABUS_KEY);
        if (local !== null) safeSet(storage, STASH_PREFIX + owner, local);
        adopting = true;
        store.replace(remote, remoteAt || undefined);
        adopting = false;
      } else if (remote !== null && remoteAt > store.savedAt()) {
        adopting = true;
        store.replace(remote, remoteAt);
        adopting = false;
      } else if (store.getSnapshot() !== null && store.savedAt() > remoteAt) {
        if (!(await push(client))) {
          fail();
          return;
        }
      }
      safeSet(storage, OWNER_KEY, userId);
      if (stopped) return;
      setStatus("account");

      unsubscribe = store.subscribe(() => {
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
      });
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
      if (timer !== null) clearTimeout(timer);
      setStatus("idle");
    },
  };
}
