/**
 * Account sync for game progress (STATUS A1: lessons tracked on the account).
 *
 * The journal is append only, so syncing it is two set operations: PULL the
 * account's events and merge the ones this device lacks, then PUSH the ones the
 * account lacks. Every event carries an id (journalMerge.ts), so the same event
 * seen from two devices or two tabs counts once, and the table's primary key
 * (user_id, id) with ON CONFLICT DO NOTHING makes a repeated push harmless.
 *
 * THE OFFLINE QUEUE IS THE LOCAL JOURNAL. Nothing extra is persisted: whatever
 * was not pushed before the tab closed is found again by the next session's
 * pull-then-diff. That is why a failed push only has to retry, never remember.
 *
 * WHO OWNS THIS DEVICE'S JOURNAL. localStorage OWNER_KEY names the account the
 * local journal belongs to. None yet: the first account to sign in adopts it,
 * which is how a student's signed-out progress is never lost on a first sign-in.
 * A different account: the old store is copied to a stash key and the local
 * journal is replaced by this account's, so one student's lessons are never
 * pushed into another student's account.
 *
 * A MISSING TABLE (migration not applied yet) or no Supabase in the build sets
 * "local-only" and stops every request for the session. It never throws: the
 * game keeps working on the device, and Me says so.
 *
 * Loaded only through a dynamic import from App.tsx, for a signed-in student.
 * No React here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EconomyEvent } from "@blueberry/economy";
import type { ProgressSource } from "./progress";
import { setSyncStatus, type SyncStatus } from "./syncStatus";

export const OWNER_KEY = "blueberry.progress.owner.v1";
const STORE_KEY = "blueberry.progress.v2";
const STASH_PREFIX = "blueberry.progress.v2.stash:";
const TABLE = "progress_events";
const PAGE = 1000;
const PUSH_BATCH = 200;
const DEBOUNCE_MS = 1500;
/** Waits between retries after a failure: 5 s, 30 s, then 2 minutes at most. */
const BACKOFF_MS = [5_000, 30_000, 120_000] as const;

export interface ProgressSyncOptions {
  readonly userId: string;
  readonly store: ProgressSource;
  readonly getClient: () => Promise<SupabaseClient | null>;
  readonly storage?: Storage;
}

export interface ProgressSync {
  stop(): void;
  status(): SyncStatus;
}

interface QueryError {
  readonly code?: string;
  readonly message?: string;
}

interface QueryResult {
  readonly error: QueryError | null;
  readonly status?: number;
}

/** The table does not exist yet: PostgREST's schema cache miss, Postgres's undefined table, or a 404. */
function isMissingTable(result: QueryResult): boolean {
  return result.error?.code === "PGRST205" || result.error?.code === "42P01" || result.status === 404;
}

class MissingTable extends Error {}

/** A row back from the table, turned into an event with the row's id. */
function rowToEvent(row: { readonly id: unknown; readonly event: unknown }): unknown {
  if (typeof row.event !== "object" || row.event === null) return null;
  return { ...(row.event as Record<string, unknown>), id: row.id };
}

export function startProgressSync({ userId, store, getClient, storage = localStorage }: ProgressSyncOptions): ProgressSync {
  let state: SyncStatus = "syncing";
  let stopped = false;
  let pulled = false;
  let running = false;
  let again = false;
  let failures = 0;
  let debounce: ReturnType<typeof setTimeout> | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  const known = new Set<string>();

  const set = (next: SyncStatus): void => {
    state = next;
    if (!stopped) setSyncStatus(next);
  };
  set("syncing");

  /** Still worth making requests: not stopped, and the table was not found missing. */
  const live = (): boolean => !stopped && state !== "local-only";

  const readStorage = (key: string): string | null => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };
  const writeStorage = (key: string, value: string): void => {
    try {
      storage.setItem(key, value);
    } catch {
      /* storage blocked: the marker is not kept, so the next session asks again */
    }
  };

  async function pull(client: SupabaseClient): Promise<void> {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      const result = await client
        .from(TABLE)
        .select("id, event")
        // Explicit, not left to RLS: staff may read every account's rows (20261024163000),
        // and merging those would corrupt the staff account's own journal.
        .eq("user_id", userId)
        .order("at", { ascending: true })
        .order("seq", { ascending: true })
        .range(from, from + PAGE - 1);
      if (isMissingTable(result)) throw new MissingTable();
      if (result.error) throw new Error(result.error.message ?? "pull failed");
      const page = (result.data ?? []) as { id: unknown; event: unknown }[];
      for (const row of page) rows.push(rowToEvent(row));
      if (page.length < PAGE) break;
    }
    if (stopped) return;

    const events = rows as EconomyEvent[];
    const owner = readStorage(OWNER_KEY);
    if (owner !== null && owner !== userId) {
      // Another account's journal is on this device. Keep a copy, then show this account's.
      const raw = readStorage(STORE_KEY);
      if (raw !== null) writeStorage(`${STASH_PREFIX}${owner}`, raw);
      store.replaceJournal(events);
    } else {
      store.mergeRemote(events);
    }
    for (const row of rows) {
      const id = (row as { id?: unknown } | null)?.id;
      if (typeof id === "string") known.add(id);
    }
    writeStorage(OWNER_KEY, userId);
    pulled = true;
  }

  async function push(client: SupabaseClient): Promise<void> {
    const pending = store.storedJournal().filter((event) => event.id !== undefined && !known.has(event.id));
    for (let i = 0; i < pending.length; i += PUSH_BATCH) {
      const batch = pending.slice(i, i + PUSH_BATCH);
      const rows = batch.map((event) => ({ id: event.id, kind: event.kind, at: event.at, event }));
      // ignoreDuplicates is ON CONFLICT DO NOTHING: two tabs pushing one event leave one row.
      const result = await client.from(TABLE).upsert(rows, { onConflict: "user_id,id", ignoreDuplicates: true });
      if (isMissingTable(result)) throw new MissingTable();
      if (result.error) throw new Error(result.error.message ?? "push failed");
      for (const event of batch) known.add(event.id as string);
      if (stopped) return;
    }
  }

  /** One pass: pull first if it has not succeeded yet, then push. Never overlaps itself. */
  async function run(): Promise<void> {
    if (!live()) return;
    if (running) {
      again = true;
      return;
    }
    running = true;
    set("syncing");
    try {
      const client = await getClient();
      if (stopped) return;
      if (client === null) throw new MissingTable();
      if (!pulled) await pull(client);
      if (stopped) return;
      await push(client);
      failures = 0;
      set("synced");
    } catch (error) {
      if (stopped) return;
      if (error instanceof MissingTable) {
        set("local-only");
        console.info("Blueberry: progress is saved on this device only (no progress table on the account yet).");
        return;
      }
      set("offline");
      const wait = BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)];
      failures += 1;
      if (retry !== null) clearTimeout(retry);
      retry = setTimeout(() => {
        retry = null;
        void run();
      }, wait);
    } finally {
      running = false;
      if (again && live()) {
        again = false;
        void run();
      }
    }
  }

  const schedule = (): void => {
    if (!live()) return;
    if (debounce !== null) clearTimeout(debounce);
    debounce = setTimeout(() => {
      debounce = null;
      void run();
    }, DEBOUNCE_MS);
  };

  /** Back online or back on the tab: try now instead of waiting out the backoff. */
  const wake = (): void => {
    if (state !== "offline") return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    if (retry !== null) {
      clearTimeout(retry);
      retry = null;
    }
    void run();
  };

  const unsubscribe = store.subscribe(schedule);
  if (typeof window !== "undefined") window.addEventListener("online", wake);
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", wake);
  void run();

  return {
    stop() {
      stopped = true;
      unsubscribe();
      if (debounce !== null) clearTimeout(debounce);
      if (retry !== null) clearTimeout(retry);
      if (typeof window !== "undefined") window.removeEventListener("online", wake);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", wake);
      // Signed out: no account to sync with, so Me shows no line.
      setSyncStatus("synced");
    },
    status: () => state,
  };
}
