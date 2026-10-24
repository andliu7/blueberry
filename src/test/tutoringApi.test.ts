import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The tutoring client before the migration is applied, and its one translated
 * Postgres error. Until the tables exist, every call must say "not ready" (so
 * the page shows an honest "opens soon" card) and must never throw or fake data.
 */

let mode: { client: "null" } | { client: "error"; code: string; message?: string } = { client: "null" };

/** A query builder that answers every chained call with itself and resolves to the error. */
function builder(result: { data: null; error: { code: string; message: string } }): unknown {
  const target = () => undefined;
  const proxy: unknown = new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
      return () => proxy;
    },
    apply: () => proxy,
  });
  return proxy;
}

vi.mock("@/lib/supabase", () => ({
  getSupabase: async () => {
    if (mode.client === "null") return null;
    const result = { data: null, error: { code: mode.code, message: mode.message ?? "nope" } };
    return {
      rpc: async () => result,
      from: () => builder(result),
      auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
    };
  },
}));

afterEach(() => {
  mode = { client: "null" };
});

async function everyCall() {
  const api = await import("@/lib/tutoring/api");
  const d = new Date("2026-11-10T15:00:00Z");
  return Promise.all([
    api.loadOpenSlots(d, d),
    api.bookTutor({ tutorId: "t", start: d, course: "CHEM241", stuckOn: "x", examDate: null, style: "mix" }),
    api.loadMyBookings(),
    api.cancelTutorBooking("b"),
    api.rateTutorSession("b", 5, ""),
    api.myTutorRow(),
    api.updateMe({ onboarded: true }),
    api.loadAvailability("t"),
    api.saveAvailability([]),
    api.addTimeOff(d, d, ""),
    api.removeTimeOff("x"),
    api.loadMySessions(),
    api.completeTutorSession("b", "completed"),
    api.loadRateStatus("t"),
    api.loadLedger(),
    api.inviteTutor("a@b.c", "A", d),
    api.setTutorActive("t", false),
    api.listTutors(),
    api.markPaid(["l"], ""),
    api.loadPayRules(),
    api.savePayRules((await import("@/lib/tutoring/rules")).DEFAULT_PAY_RULES),
    api.loadReferrals("t"),
    api.addReferral("a@b.c"),
    api.removeReferral("r"),
  ]);
}

describe("tutoring before the migration", () => {
  for (const code of ["PGRST205", "PGRST202", "42P01", "42883"]) {
    it(`answers not ready on ${code}`, async () => {
      mode = { client: "error", code };
      const results = await everyCall();
      for (const r of results) expect(r).toMatchObject({ ok: false, notReady: true });
    });
  }

  it("answers not ready, without throwing, when Supabase is not configured", async () => {
    mode = { client: "null" };
    const results = await everyCall();
    for (const r of results) expect(r).toMatchObject({ ok: false, notReady: true });
  });
});

describe("tutoring errors in words", () => {
  it("turns a lost race (23P01) into a sentence", async () => {
    mode = { client: "error", code: "23P01", message: "conflicting key value violates exclusion constraint" };
    const { bookTutor } = await import("@/lib/tutoring/api");
    const r = await bookTutor({ tutorId: "t", start: new Date(), course: "CHEM241", stuckOn: "x", examDate: null, style: "mix" });
    expect(r).toEqual({ ok: false, error: "Someone booked that time a moment ago. Pick another." });
  });

  it("passes the database's own refusal through as written", async () => {
    mode = { client: "error", code: "P0001", message: "That time is not in the tutor's hours." };
    const { bookTutor } = await import("@/lib/tutoring/api");
    const r = await bookTutor({ tutorId: "t", start: new Date(), course: "CHEM241", stuckOn: "x", examDate: null, style: "mix" });
    expect(r).toEqual({ ok: false, error: "That time is not in the tutor's hours." });
  });
});
