/**
 * Account sync for a student's syllabus plan (STATUS C1). A hand-written fake
 * stands in for Supabase: one row per user in a Map, the real table's primary
 * key. No network.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SYLLABUS_KEY, createSyllabusStore, type SyllabusPlan } from "../syllabus/syllabusPlan";
import { OWNER_KEY, getSyllabusSyncStatus, startSyllabusSync } from "../syllabus/syllabusSync";

interface Row {
  plan: unknown;
  updated_at: string;
}

class FakeDb {
  rows = new Map<string, Row>();
  missing = false;
  upserts: Row[] = [];
  deletes = 0;

  client(user: string): SupabaseClient {
    const db = this;
    const missingError = { code: "PGRST205", message: "Could not find the table" };
    const fake = {
      from(table: string) {
        expect(table).toBe("user_syllabus");
        return {
          select() {
            return {
              eq(column: string, value: string) {
                expect([column, value]).toEqual(["user_id", user]);
                return { maybeSingle: async () => (db.missing ? { data: null, error: missingError } : { data: db.rows.get(user) ?? null, error: null }) };
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
          delete() {
            return {
              eq: async (column: string, value: string) => {
                expect(column).toBe("user_id");
                db.rows.delete(value);
                db.deletes += 1;
                return { error: null };
              },
            };
          },
        };
      },
    };
    return fake as unknown as SupabaseClient;
  }
}

function mapStorage() {
  const map = new Map<string, string>();
  return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
}

const plan = (unitOrder: string[]): SyllabusPlan => ({ version: 1, updatedAt: 0, weeks: [], unitOrder, sectionOrder: {}, notCovered: [], sideQuests: [], exams: [] });

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  vi.useRealTimers();
});

function start(db: FakeDb | null, storage = mapStorage(), user = "user-a") {
  const store = createSyllabusStore(() => storage);
  const sync = startSyllabusSync({ userId: user, getClient: async () => (db === null ? null : db.client(user)), store, storage });
  stops.push(sync.stop);
  return { sync, store, storage };
}

describe("syllabusSync", () => {
  it("falls back to the device, without throwing, when the table does not exist yet", async () => {
    const db = new FakeDb();
    db.missing = true;
    const storage = mapStorage();
    createSyllabusStore(() => storage).replace(plan(["u3"]), 10);
    const { sync, store } = start(db, storage);
    await sync.done;
    expect(getSyllabusSyncStatus()).toBe("device");
    expect(store.getSnapshot()?.unitOrder).toEqual(["u3"]);
  });

  it("falls back to the device with no Supabase in the build", async () => {
    const { sync } = start(null);
    await sync.done;
    expect(getSyllabusSyncStatus()).toBe("device");
  });

  it("adopts a newer account row", async () => {
    const db = new FakeDb();
    db.rows.set("user-a", { plan: plan(["u2", "u3"]), updated_at: new Date(5000).toISOString() });
    const storage = mapStorage();
    createSyllabusStore(() => storage).replace(plan(["u1"]), 1000);
    const { sync, store } = start(db, storage);
    await sync.done;
    expect(getSyllabusSyncStatus()).toBe("account");
    expect(store.getSnapshot()?.unitOrder).toEqual(["u2", "u3"]);
    expect(store.savedAt()).toBe(5000);
    expect(db.upserts).toEqual([]);
  });

  it("pushes a newer device plan, then every change, debounced; clearing deletes the row", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const db = new FakeDb();
    db.rows.set("user-a", { plan: plan(["u9"]), updated_at: new Date(1000).toISOString() });
    const storage = mapStorage();
    createSyllabusStore(() => storage).replace(plan(["u1", "u2"]), 7000);
    const { sync, store } = start(db, storage);
    await sync.done;
    expect(db.rows.get("user-a")).toEqual({ plan: { ...plan(["u1", "u2"]), updatedAt: 7000 }, updated_at: new Date(7000).toISOString() });

    store.replace(plan(["u4"]), 8000);
    store.replace(plan(["u5"]), 9000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(db.upserts).toHaveLength(2);
    expect((db.rows.get("user-a")!.plan as SyllabusPlan).unitOrder).toEqual(["u5"]);

    store.replace(null);
    await vi.advanceTimersByTimeAsync(1000);
    expect(db.deletes).toBe(1);
    expect(db.rows.has("user-a")).toBe(false);
  });

  it("sanitises the account row it adopts", async () => {
    const db = new FakeDb();
    db.rows.set("user-a", { plan: { ...plan(["u2", "u404"]), sideQuests: ["hack"] }, updated_at: new Date(5000).toISOString() });
    const { sync, store } = start(db);
    await sync.done;
    expect(store.getSnapshot()?.unitOrder).toEqual(["u2"]);
    expect(store.getSnapshot()?.sideQuests).toEqual([]);
  });

  it("on an account switch, stashes the old owner's plan and takes the new account's", async () => {
    const db = new FakeDb();
    const storage = mapStorage();
    storage.setItem(OWNER_KEY, "user-old");
    createSyllabusStore(() => storage).replace(plan(["u7"]), 9000);
    const { sync, store } = start(db, storage, "user-a");
    await sync.done;
    expect(JSON.parse(storage.map.get("blueberry.syllabus.v1.stash:user-old")!).unitOrder).toEqual(["u7"]);
    // No row for the new account: the device has no plan now, and the old one never reached it.
    expect(store.getSnapshot()).toBeNull();
    expect(storage.map.has(SYLLABUS_KEY)).toBe(false);
    expect(db.upserts).toEqual([]);
    expect(storage.map.get(OWNER_KEY)).toBe("user-a");
  });
});
