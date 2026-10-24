// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?flags="}

/**
 * Account sync (STATUS A1). A hand-written fake client stands in for Supabase:
 * it records every call and keeps rows in a Map keyed by (user, id), which is
 * the real table's primary key, so "no duplicate rows" is checked against the
 * same rule the database enforces. No network, no real database.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EconomyEvent } from "@blueberry/economy";
import { createLocalProgress } from "../app/progress";
import { OWNER_KEY, startProgressSync, type ProgressSync } from "../app/progressSync";
import { getSyncStatus } from "../app/syncStatus";

interface Row {
  readonly user: string;
  readonly id: string;
  readonly kind: string;
  readonly at: string;
  readonly event: unknown;
  readonly seq: number;
}

/** The table, shared by every fake client so two "tabs" see one database. */
class FakeDb {
  rows = new Map<string, Row>();
  calls: string[] = [];
  seq = 0;
  missing = false;
  failPushes = 0;

  forUser(user: string): Row[] {
    return [...this.rows.values()].filter((row) => row.user === user);
  }

  client(user: string): SupabaseClient {
    const db = this;
    const missing = () => ({ data: null, error: { code: "PGRST205", message: "no table" }, status: 404 });
    const fake = {
      from(table: string) {
        expect(table).toBe("progress_events");
        return {
          select(columns: string) {
            db.calls.push(`select ${columns}`);
            const chain = {
              order: () => chain,
              range: async (from: number, to: number) => {
                if (db.missing) return missing();
                const own = db.forUser(user).sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.seq - b.seq);
                return { data: own.slice(from, to + 1).map((row) => ({ id: row.id, event: row.event })), error: null, status: 200 };
              },
            };
            return chain;
          },
          upsert: async (rows: { id: string; kind: string; at: string; event: unknown }[], options: unknown) => {
            db.calls.push(`upsert ${rows.length}`);
            expect(options).toEqual({ onConflict: "user_id,id", ignoreDuplicates: true });
            if (db.missing) return missing();
            if (db.failPushes > 0) {
              db.failPushes -= 1;
              return { data: null, error: { code: "08006", message: "network" }, status: 0 };
            }
            for (const row of rows) {
              const key = `${user}|${row.id}`;
              if (!db.rows.has(key)) db.rows.set(key, { user, ...row, seq: (db.seq += 1) });
            }
            return { data: null, error: null, status: 201 };
          },
        };
      },
    };
    return fake as unknown as SupabaseClient;
  }
}

function lessonEventsFrom(device: ReturnType<typeof createLocalProgress>): readonly EconomyEvent[] {
  device.completeLesson("alkenes" as never, 2, 2, ["p1", "p2"]);
  return device.storedJournal();
}

let db: FakeDb;
const engines: ProgressSync[] = [];

function start(user: string, store = createLocalProgress()): ProgressSync {
  const engine = startProgressSync({ userId: user, store, getClient: async () => db.client(user) });
  engines.push(engine);
  return engine;
}

/** Let every pending promise in the engine settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

beforeEach(() => {
  localStorage.clear();
  db = new FakeDb();
  vi.useFakeTimers();
});

afterEach(() => {
  for (const engine of engines.splice(0)) engine.stop();
  vi.useRealTimers();
});

describe("progress sync", () => {
  it("pushes every local event on a first sign-in and leaves the local journal as it was", async () => {
    const store = createLocalProgress();
    store.completeLesson("alkenes" as never, 1, 2, ["p1", "p2"]);
    const before = store.storedJournal();

    const engine = start("ada", store);
    await settle();

    expect(engine.status()).toBe("synced");
    expect(store.storedJournal()).toEqual(before);
    expect(db.forUser("ada").map((row) => row.id).sort()).toEqual(before.map((e) => e.id).sort());
    expect(localStorage.getItem(OWNER_KEY)).toBe("ada");
  });

  it("merges events from another device and fills the lesson record", async () => {
    // Device one finishes a lesson and syncs it.
    const deviceOne = createLocalProgress();
    const events = lessonEventsFrom(deviceOne);
    start("ada", deviceOne);
    await settle();
    expect(db.forUser("ada")).toHaveLength(events.length);

    // Device two: a fresh store with nothing on it.
    localStorage.clear();
    const deviceTwo = createLocalProgress();
    expect(deviceTwo.getSnapshot().lessons["alkenes"]).toBeUndefined();
    start("ada", deviceTwo);
    await settle();

    expect(deviceTwo.storedJournal().map((e) => e.id)).toEqual(events.map((e) => e.id));
    expect(deviceTwo.getSnapshot().lessons["alkenes"]).toMatchObject({ correct: 2, attempted: 2 });
  });

  it("pushes an event appended after start once, after the debounce", async () => {
    const store = createLocalProgress();
    start("ada", store);
    await settle();
    const callsBefore = db.calls.filter((c) => c.startsWith("upsert")).length;

    store.setSettings({ reminderHour: 8 });
    await settle();
    expect(db.forUser("ada")).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1500);
    await settle();
    expect(db.forUser("ada")).toHaveLength(1);
    expect(db.calls.filter((c) => c.startsWith("upsert")).length).toBe(callsBefore + 1);
  });

  it("retries a failed push and ends with one row per event", async () => {
    const store = createLocalProgress();
    lessonEventsFrom(store);
    db.failPushes = 1;
    const engine = start("ada", store);
    await settle();
    expect(engine.status()).toBe("offline");
    expect(getSyncStatus()).toBe("offline");
    expect(db.forUser("ada")).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(engine.status()).toBe("synced");
    expect(db.forUser("ada")).toHaveLength(store.storedJournal().length);
    expect(new Set(db.forUser("ada").map((row) => row.id)).size).toBe(db.forUser("ada").length);
  });

  it("goes local-only on a missing table, never throws, makes no more calls and keeps the local journal", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    db.missing = true;
    const store = createLocalProgress();
    lessonEventsFrom(store);
    const before = store.storedJournal();

    const engine = start("ada", store);
    await settle();
    expect(engine.status()).toBe("local-only");
    expect(getSyncStatus()).toBe("local-only");
    expect(info).toHaveBeenCalledTimes(1);
    const calls = db.calls.length;

    store.setSettings({ reminderHour: 8 });
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(200_000);
    await settle();
    expect(db.calls.length).toBe(calls);
    expect(store.storedJournal().slice(0, before.length)).toEqual(before);
    expect(localStorage.getItem(OWNER_KEY)).toBeNull();
    info.mockRestore();
  });

  it("goes local-only when the build has no Supabase client", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const engine = startProgressSync({ userId: "ada", store: createLocalProgress(), getClient: async () => null });
    engines.push(engine);
    await settle();
    expect(engine.status()).toBe("local-only");
  });

  it("never pushes one account's events into a second account on the same device, and stashes the first", async () => {
    const store = createLocalProgress();
    const adaEvents = lessonEventsFrom(store);
    const first = start("ada", store);
    await settle();
    first.stop();
    const adaRaw = localStorage.getItem("blueberry.progress.v2");

    // Grace signs in on the same device; her account already has one event.
    const graceEvent: EconomyEvent = { id: "grace-1", kind: "chest_earned", at: "2026-10-01T10:00:00.000Z", tz: "UTC", source: "daily_gift" };
    db.rows.set("grace|grace-1", { user: "grace", id: "grace-1", kind: graceEvent.kind, at: graceEvent.at, event: graceEvent, seq: 999 });
    start("grace", store);
    await settle();

    const adaIds = new Set(adaEvents.map((e) => e.id));
    expect(db.forUser("grace").some((row) => adaIds.has(row.id))).toBe(false);
    expect(store.storedJournal().map((e) => e.id)).toEqual(["grace-1"]);
    expect(store.getSnapshot().lessons["alkenes"]).toBeUndefined();
    expect(localStorage.getItem("blueberry.progress.v2.stash:ada")).toBe(adaRaw);
    expect(localStorage.getItem(OWNER_KEY)).toBe("grace");
  });

  it("leaves one row per id when two tabs push the same events", async () => {
    const tabA = createLocalProgress();
    lessonEventsFrom(tabA);
    const tabB = createLocalProgress();
    start("ada", tabA);
    start("ada", tabB);
    await settle();
    await vi.advanceTimersByTimeAsync(2000);
    await settle();
    const ids = db.forUser("ada").map((row) => row.id);
    expect(ids).toHaveLength(tabA.storedJournal().length);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
