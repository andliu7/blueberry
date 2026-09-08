/**
 * The scheduler state vocabulary, per the committed states sheet
 * (blueberry_spec-card-states): new, learning, due, mastered, suspended, and
 * the derivation precedence cardState.ts documents. Plus suspension as a
 * real scheduler act: paused cards leave every queue, keep their schedule,
 * resume in place, and resume on rating.
 *
 * THE CLOCK IS PINNED IN EVERY TEST, per the gauntlet log's wall-clock rule:
 * "due" is a function of the hour, so every derivation here hands the clock
 * in and would pass at 23:59 as at 09:00.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  CARD_STATE_LABELS,
  cardSchedulerState,
  type CardSchedulerState,
} from "../cards/ui/cardState";
import { MATURE_INTERVAL_DAYS } from "../cards/ui/mastery";
import { reviewQueue, heroModel } from "../cards/ui/landing";
import { DAY_MS, GRADUATING_INTERVAL_DAYS, startCard } from "../cards/scheduler";
import { createLocalDecks } from "../cards/store";
import type { Card, ReviewState } from "../cards/types";
import { dueEverywhere, dueInDeck, isSuspended } from "../cards/types";

/**
 * Vitest runs in the node environment (vitest.config.ts), so localStorage
 * exists only if a test installs one. The same in-memory Storage as
 * cardStore.test.ts: closer to the browser than stubbing the store's own
 * methods, and it is what makes the round-trip test below a real one.
 */
class MemoryStorage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }
}

function installStorage(): void {
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    new MemoryStorage() as unknown as Storage;
}

const NOON = new Date(2026, 8, 2, 12, 0, 0);

function state(overrides: Partial<ReviewState>): ReviewState {
  return {
    cardId: "c1",
    interval: 8,
    ease: 2.5,
    dueAt: new Date(NOON.getTime() + 3 * DAY_MS).toISOString(),
    lastRating: "good",
    ...overrides,
  };
}

function card(id: string): Card {
  return {
    id,
    front: "front",
    back: "back",
    why: "why",
    tags: [],
    source: { kind: "lesson", lessonId: "l", beatId: "b" },
  };
}

describe("the five states of the sheet, derived", () => {
  it("no state at all is new", () => {
    expect(cardSchedulerState(undefined, NOON)).toBe("new");
  });

  it("a started but never rated card is new, even though it is due", () => {
    // startCard sets dueAt to now, so without the precedence this would read
    // "due" and erase the sheet's own distinction.
    expect(cardSchedulerState(startCard("c1", NOON), NOON)).toBe("new");
  });

  it("a card in the learning steps is learning, even when its step has come round", () => {
    const learning = state({
      interval: GRADUATING_INTERVAL_DAYS / 2,
      dueAt: new Date(NOON.getTime() - 1000).toISOString(),
      lastRating: "again",
    });
    expect(cardSchedulerState(learning, NOON)).toBe("learning");
  });

  it("a graduated card whose time has passed is due", () => {
    const due = state({ dueAt: new Date(NOON.getTime() - 1000).toISOString() });
    expect(cardSchedulerState(due, NOON)).toBe("due");
  });

  it("due wins over mastered: the badge answers what to do now", () => {
    const overdueMature = state({
      interval: MATURE_INTERVAL_DAYS + 10,
      dueAt: new Date(NOON.getTime() - 1000).toISOString(),
    });
    expect(cardSchedulerState(overdueMature, NOON)).toBe("due");
  });

  it("a mature card between reviews is mastered", () => {
    expect(cardSchedulerState(state({ interval: MATURE_INTERVAL_DAYS }), NOON)).toBe("mastered");
  });

  it("a graduated card between reviews below maturity is young, the quiet sixth word", () => {
    expect(cardSchedulerState(state({ interval: 8 }), NOON)).toBe("young");
  });

  it("suspended wins over everything", () => {
    const overdueMatureSuspended = state({
      interval: MATURE_INTERVAL_DAYS + 10,
      dueAt: new Date(NOON.getTime() - 1000).toISOString(),
      suspended: true,
    });
    expect(cardSchedulerState(overdueMatureSuspended, NOON)).toBe("suspended");
  });

  it("every state has a label, and the label never scolds", () => {
    const states: readonly CardSchedulerState[] = [
      "new",
      "learning",
      "due",
      "young",
      "mastered",
      "suspended",
    ];
    for (const s of states) {
      expect(CARD_STATE_LABELS[s].length).toBeGreaterThan(0);
    }
    // "Paused" is the student's own act; "suspended" reads like a sanction.
    expect(CARD_STATE_LABELS.suspended).toBe("Paused");
  });
});

describe("suspension is a real scheduler act", () => {
  beforeEach(() => {
    installStorage();
  });

  it("a paused card leaves dueEverywhere and dueInDeck, and comes back on resume", () => {
    const source = createLocalDecks({ now: () => NOON });
    source.createDeck({ id: "d", title: "Deck", kind: "personal", cardIds: [] });
    source.saveCard(card("c1"), "d");
    source.saveCard(card("c2"), "d");

    // Both are new, so both are due right now.
    expect(dueEverywhere(source.getSnapshot(), NOON)).toHaveLength(2);
    expect(dueInDeck(source.getSnapshot(), "d", NOON)).toBe(2);

    source.setSuspended("c1", true);
    expect(isSuspended(source.getSnapshot().review["c1"])).toBe(true);
    expect(dueEverywhere(source.getSnapshot(), NOON).map((c) => c.id)).toEqual(["c2"]);
    expect(dueInDeck(source.getSnapshot(), "d", NOON)).toBe(1);

    source.setSuspended("c1", false);
    expect(isSuspended(source.getSnapshot().review["c1"])).toBe(false);
    expect(dueEverywhere(source.getSnapshot(), NOON)).toHaveLength(2);
  });

  it("pausing keeps the schedule: interval, ease and dueAt do not move", () => {
    const source = createLocalDecks({ now: () => NOON });
    source.saveCard(card("c1"), "d");
    source.rate("c1", "good");
    const before = source.getSnapshot().review["c1"];

    source.setSuspended("c1", true);
    const paused = source.getSnapshot().review["c1"];
    expect(paused?.interval).toBe(before?.interval);
    expect(paused?.ease).toBe(before?.ease);
    expect(paused?.dueAt).toBe(before?.dueAt);
  });

  it("resuming deletes the flag rather than writing false", () => {
    const source = createLocalDecks({ now: () => NOON });
    source.saveCard(card("c1"), "d");
    source.setSuspended("c1", true);
    source.setSuspended("c1", false);
    expect("suspended" in (source.getSnapshot().review["c1"] ?? {})).toBe(false);
  });

  it("rating a paused card resumes it", () => {
    const source = createLocalDecks({ now: () => NOON });
    source.saveCard(card("c1"), "d");
    source.setSuspended("c1", true);
    source.rate("c1", "good");
    expect(isSuspended(source.getSnapshot().review["c1"])).toBe(false);
  });

  it("the flag survives a save and load round trip", () => {
    const first = createLocalDecks({ now: () => NOON });
    first.saveCard(card("c1"), "d");
    first.setSuspended("c1", true);

    const second = createLocalDecks({ now: () => NOON });
    expect(isSuspended(second.getSnapshot().review["c1"])).toBe(true);
  });

  it("the hero's number keeps the promise: paused cards are not counted", () => {
    const source = createLocalDecks({ now: () => NOON });
    source.createDeck({ id: "d", title: "Deck", kind: "personal", cardIds: [] });
    source.saveCard(card("c1"), "d");
    source.saveCard(card("c2"), "d");
    source.setSuspended("c1", true);

    const snapshot = source.getSnapshot();
    const hero = heroModel(snapshot, [], NOON);
    const queue = reviewQueue(snapshot, [], NOON);
    expect(hero.due).toBe(queue.length);
    expect(queue.map((c) => c.id)).toEqual(["c2"]);
  });
});
