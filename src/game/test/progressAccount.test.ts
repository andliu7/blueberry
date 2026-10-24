// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?flags="}

/**
 * The progress store's side of account sync (STATUS A1). Every new event
 * carries an id, an old cache gets the same legacy ids on every load, and a
 * merge from another device fills the lesson records and the path without
 * replaying a reward moment.
 *
 * `?flags=` turns the dev-default beta flags off, so the journal read here is
 * the student's own (see trainerBanking.test.ts for why that matters). The one
 * case that needs the unlockall flag reloads the modules under a new URL.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { createLocalProgress } from "../app/progress";
import { deriveMapPathway, statusOf } from "../tabs/pathway/pathwayState";
import { PATHWAY_UNITS } from "../demo/pathwayMap";

const KEY = "blueberry.progress.v2";
const AT = "2026-10-20T10:00:00.000Z";

beforeEach(() => {
  localStorage.clear();
});

function remoteLesson(): EconomyEvent[] {
  return [
    { id: "r-a1", kind: "attempt", at: AT, tz: "UTC", nodeId: "lesson:alkenes", problemId: "p1", correct: true },
    { id: "r-a2", kind: "attempt", at: AT, tz: "UTC", nodeId: "lesson:alkenes", problemId: "p2", correct: false },
    {
      id: "r-c1",
      kind: "node_cleared",
      at: AT,
      tz: "UTC",
      nodeId: "lesson:alkenes",
      nodeKind: "concept",
      flawless: false,
      stepsInOneSitting: 1,
      spine: true,
      difficulty: 3,
    },
    {
      id: "r-c2",
      kind: "node_cleared",
      at: AT,
      tz: "UTC",
      nodeId: "u1-allylic",
      nodeKind: "reaction",
      flawless: false,
      stepsInOneSitting: 1,
      spine: true,
      difficulty: 3,
    },
  ];
}

describe("event ids in the store", () => {
  it("gives every new event an id that survives a reload", () => {
    const store = createLocalProgress();
    store.completeLesson("alkenes" as never, 1, 2, ["p1", "p2"]);
    store.setSettings({ reminderHour: 9 });
    const ids = store.storedJournal().map((e) => e.id);
    expect(ids).toHaveLength(4);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9:_-]{1,80}$/);
    expect(new Set(ids).size).toBe(4);
    expect(createLocalProgress().storedJournal().map((e) => e.id)).toEqual(ids);
  });

  it("gives a cache written before ids the same legacy ids on every load", () => {
    const old = [
      { kind: "chest_earned", at: AT, tz: "UTC", source: "daily_gift" },
      { kind: "chest_earned", at: AT, tz: "UTC", source: "daily_gift" },
    ];
    localStorage.setItem(KEY, JSON.stringify({ journal: old }));
    const first = createLocalProgress().storedJournal().map((e) => e.id);
    const second = createLocalProgress().storedJournal().map((e) => e.id);
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(2);
    for (const id of first) expect(id).toMatch(/^legacy:/);
  });
});

describe("mergeRemote", () => {
  it("fills lesson records and the path from a clear made elsewhere, with no reward moment", () => {
    const store = createLocalProgress();
    store.setSettings({ reminderHour: 9 });
    const receiptBefore = store.getSnapshot().lastReceipt;

    expect(store.mergeRemote(remoteLesson())).toBe(4);

    const snapshot = store.getSnapshot();
    expect(snapshot.lessons["alkenes"]).toEqual({ topic: "alkenes", correct: 1, attempted: 2, completedAt: AT });
    expect(snapshot.attemptedProblems).toEqual(expect.arrayContaining(["p1", "p2"]));
    expect(statusOf(deriveMapPathway(PATHWAY_UNITS, snapshot.journal), "u1-allylic").state).toMatch(/done|review/);
    expect(snapshot.lastReceipt).toBe(receiptBefore);
  });

  it("does not notify subscribers when nothing is new", () => {
    const store = createLocalProgress();
    store.mergeRemote(remoteLesson());
    let heard = 0;
    store.subscribe(() => {
      heard += 1;
    });
    expect(store.mergeRemote(remoteLesson())).toBe(0);
    expect(heard).toBe(0);
  });
});

describe("storedJournal", () => {
  it("leaves out the beta flags' synthetic events", async () => {
    window.history.replaceState(null, "", "/?flags=unlockall");
    vi.resetModules();
    try {
      const fresh = await import("../app/progress");
      const store = fresh.createLocalProgress();
      store.setSettings({ reminderHour: 9 });
      expect(store.getSnapshot().journal.length).toBeGreaterThan(1);
      expect(store.storedJournal()).toHaveLength(1);
      expect(store.storedJournal()[0]?.kind).toBe("settings");
    } finally {
      window.history.replaceState(null, "", "/?flags=");
      vi.resetModules();
    }
  });
});
