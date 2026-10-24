/**
 * Merging this device's journal with the account's (STATUS A1, lessons tracked
 * on the account). The rules that matter: nothing is counted twice, nothing
 * local is lost on a first sign-in, and a lesson's attempts stay ahead of its
 * clear when they share an instant, because the derivation breaks ties by
 * position.
 */

import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { lessonsFromJournal, mergeJournals, withIds } from "../app/journalMerge";

const tz = "UTC";

function attempt(id: string, at: string, problemId: string, correct: boolean, nodeId = "lesson:alkenes"): EconomyEvent {
  return { id, kind: "attempt", at, tz, nodeId, problemId, correct };
}

function clear(id: string, at: string, nodeId = "lesson:alkenes"): EconomyEvent {
  return {
    id,
    kind: "node_cleared",
    at,
    tz,
    nodeId,
    nodeKind: "concept",
    flawless: false,
    stepsInOneSitting: 1,
    spine: true,
    difficulty: 3,
  };
}

function gift(id: string | undefined, at: string): EconomyEvent {
  const event: EconomyEvent = { kind: "chest_earned", at, tz, source: "daily_gift" };
  return id === undefined ? event : { ...event, id };
}

const T1 = "2026-10-20T10:00:00.000Z";
const T2 = "2026-10-21T10:00:00.000Z";
const T3 = "2026-10-22T10:00:00.000Z";

describe("mergeJournals", () => {
  it("counts an event both sides hold once", () => {
    const shared = gift("g1", T1);
    const { journal, added, toPush } = mergeJournals([shared], [shared]);
    expect(journal.map((e) => e.id)).toEqual(["g1"]);
    expect(added).toEqual([]);
    expect(toPush).toEqual([]);
  });

  it("loses nothing local on a first sign-in, and pushes all of it", () => {
    const local = [gift("g1", T1), attempt("a1", T2, "p1", true), clear("c1", T2)];
    const { journal, added, toPush } = mergeJournals(local, []);
    expect(journal).toEqual(local);
    expect(added).toEqual([]);
    expect(toPush).toEqual(local);
  });

  it("adds remote only events in time order", () => {
    const local = [gift("g1", T1), gift("g3", T3)];
    const remote = [gift("g2", T2)];
    const { journal, added, toPush } = mergeJournals(local, remote);
    expect(journal.map((e) => e.id)).toEqual(["g1", "g2", "g3"]);
    expect(added.map((e) => e.id)).toEqual(["g2"]);
    expect(toPush.map((e) => e.id)).toEqual(["g1", "g3"]);
  });

  it("keeps a lesson's attempts ahead of its clear on a tie in time", () => {
    const remote = [attempt("a1", T2, "p1", true), attempt("a2", T2, "p2", false), clear("c1", T2)];
    const { journal } = mergeJournals([gift("g3", T3)], remote);
    expect(journal.map((e) => e.id)).toEqual(["a1", "a2", "c1", "g3"]);
  });

  it("gives the same result when run twice", () => {
    const local = [gift("g1", T1)];
    const remote = [attempt("a1", T2, "p1", true), clear("c1", T2)];
    const once = mergeJournals(local, remote).journal;
    const twice = mergeJournals(once, remote);
    expect(twice.journal).toEqual(once);
    expect(twice.added).toEqual([]);
  });

  it("drops an invalid remote row and never throws", () => {
    const remote: unknown[] = [null, { kind: "nonsense", at: T1, tz, id: "x1" }, { ...gift("bad id!", T1) }, gift("g2", T2)];
    const { journal, added } = mergeJournals([], remote);
    expect(added.map((e) => e.id)).toEqual(["g2"]);
    expect(journal.map((e) => e.id)).toEqual(["g2"]);
  });

  it("lets the local copy win when both sides use one id", () => {
    const local = [gift("same", T1)];
    const remote = [{ ...gift("same", T1), source: "onboarding_gift" }];
    const { journal } = mergeJournals(local, remote);
    expect(journal).toEqual(local);
  });
});

describe("withIds", () => {
  it("gives an old journal the same ids on every load, and two identical events two ids", () => {
    const old = [gift(undefined, T1), gift(undefined, T1), gift(undefined, T2)];
    const first = withIds(old);
    const second = withIds(old);
    expect(first.map((e) => e.id)).toEqual(second.map((e) => e.id));
    expect(new Set(first.map((e) => e.id)).size).toBe(3);
    for (const event of first) expect(event.id).toMatch(/^legacy:[0-9a-f]+:\d+$/);
  });

  it("keeps an id an event already has", () => {
    expect(withIds([gift("keep", T1)])[0]?.id).toBe("keep");
  });
});

describe("lessonsFromJournal", () => {
  it("rebuilds a lesson record from a clear and its attempts", () => {
    const journal = [attempt("a1", T2, "p1", true), attempt("a2", T2, "p2", false), clear("c1", T2)];
    expect(lessonsFromJournal(journal, {})).toEqual({
      alkenes: { topic: "alkenes", correct: 1, attempted: 2, completedAt: T2 },
    });
  });

  it("never overwrites a record that is already there", () => {
    const existing = { alkenes: { topic: "alkenes" as never, correct: 5, attempted: 5, completedAt: T1 } };
    const journal = [attempt("a1", T2, "p1", false), clear("c1", T2)];
    expect(lessonsFromJournal(journal, existing)).toEqual(existing);
  });

  it("skips clears that are not lessons", () => {
    expect(lessonsFromJournal([clear("c1", T2, "u1-allylic")], {})).toEqual({});
  });
});
