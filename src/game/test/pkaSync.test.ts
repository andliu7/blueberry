/**
 * Account sync for a student's own pKa values (STATUS C2). A hand-written
 * fake stands in for Supabase: one row per user in a Map, which is the real
 * table's primary key. No network.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPkaSettings, type SettingsStorage } from "../settings/pka";
import { OWNER_KEY, getPkaSyncStatus, startPkaSync } from "../settings/pkaSync";

interface Row {
  preset_id: string;
  overrides: unknown;
  updated_at: string;
}

class FakeDb {
  rows = new Map<string, Row>();
  missing = false;
  upserts: Row[] = [];

  client(user: string): SupabaseClient {
    const db = this;
    const missingError = { code: "PGRST205", message: "Could not find the table" };
    const fake = {
      from(table: string) {
        expect(table).toBe("user_pka_settings");
        return {
          select() {
            return {
              eq(column: string, value: string) {
                expect(column).toBe("user_id");
                expect(value).toBe(user);
                return {
                  maybeSingle: async () =>
                    db.missing
                      ? { data: null, error: missingError }
                      : { data: db.rows.get(user) ?? null, error: null },
                };
              },
            };
          },
          upsert: async (row: Row & { user_id: string }, options: unknown) => {
            expect(options).toEqual({ onConflict: "user_id" });
            if (db.missing) return { error: missingError };
            const { user_id, ...rest } = row;
            db.rows.set(user_id, rest);
            db.upserts.push(rest);
            return { error: null };
          },
        };
      },
    };
    return fake as unknown as SupabaseClient;
  }
}

function mapStorage(): SettingsStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  vi.useRealTimers();
});

function start(db: FakeDb | null, storage = mapStorage(), store = createPkaSettings(storage), user = "u1") {
  const sync = startPkaSync({ userId: user, getClient: async () => (db === null ? null : db.client(user)), store, storage });
  stops.push(sync.stop);
  return { sync, store, storage };
}

describe("pkaSync", () => {
  it("falls back to the device, without throwing, when the table does not exist yet", async () => {
    const db = new FakeDb();
    db.missing = true;
    const { sync, store } = start(db);
    await sync.done;
    expect(getPkaSyncStatus()).toBe("device");
    // Local edits still work.
    store.setOverrides({ water: 15.7 });
    expect(store.getSnapshot().overrides).toEqual({ water: 15.7 });
  });

  it("stays local when Supabase is not configured", async () => {
    const { sync } = start(null);
    await sync.done;
    expect(getPkaSyncStatus()).toBe("device");
  });

  it("adopts a newer account row", async () => {
    const db = new FakeDb();
    const storage = mapStorage();
    const store = createPkaSettings(storage);
    store.setOverrides({ water: 15.7 });
    const later = new Date(store.savedAt() + 60_000).toISOString();
    db.rows.set("u1", { preset_id: "textbook", overrides: { phenol: 9.9 }, updated_at: later });
    const { sync } = start(db, storage, store);
    await sync.done;
    expect(store.getSnapshot()).toEqual({ presetId: "textbook", overrides: { phenol: 9.9 } });
    expect(store.savedAt()).toBe(Date.parse(later));
    expect(db.upserts).toEqual([]);
    expect(getPkaSyncStatus()).toBe("account");
  });

  it("pushes a newer local copy, and a first one when there is no row", async () => {
    const db = new FakeDb();
    db.rows.set("u1", { preset_id: "course_worksheet", overrides: {}, updated_at: new Date(1000).toISOString() });
    const storage = mapStorage();
    const store = createPkaSettings(storage);
    store.setOverrides({ water: 15.7 });
    const { sync } = start(db, storage, store);
    await sync.done;
    expect(db.rows.get("u1")).toMatchObject({ preset_id: "course_worksheet", overrides: { water: 15.7 } });

    const fresh = new FakeDb();
    const second = start(fresh, storage, store);
    await second.sync.done;
    expect(fresh.rows.get("u1")?.overrides).toEqual({ water: 15.7 });
  });

  it("pushes later changes once, debounced", async () => {
    vi.useFakeTimers();
    const db = new FakeDb();
    const { sync, store } = start(db);
    await sync.done;
    store.setOverrides({ water: 15.7 });
    store.setOverrides({ phenol: 9.9 });
    expect(db.upserts).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(900);
    expect(db.upserts).toHaveLength(1);
    expect(db.rows.get("u1")?.overrides).toEqual({ water: 15.7, phenol: 9.9 });
  });

  it("never pushes another account's values: stashes them and takes this account's", async () => {
    const db = new FakeDb();
    const storage = mapStorage();
    const store = createPkaSettings(storage);
    store.setOverrides({ water: 14 });
    storage.setItem(OWNER_KEY, "someone-else");
    const { sync } = start(db, storage, store);
    await sync.done;
    expect(store.getSnapshot().overrides).toEqual({});
    expect(db.rows.has("u1")).toBe(false);
    expect(storage.map.get("blueberry.pka.v1.stash:someone-else")).toContain('"water":14');
    expect(storage.map.get(OWNER_KEY)).toBe("u1");
  });
});
