/**
 * The deck picker's promises.
 *
 * The reference's start button says "Start (13 cards)" and that is a promise
 * about what happens next. These tests hold it: the label is computed from the
 * same session the press plays, so the two cannot disagree, and the cases that
 * would break it (a card in two decks, a scope filter, a shuffle) are each
 * exercised rather than argued.
 */

import { describe, expect, it } from "vitest";

import type { Card, DeckSnapshot, ReviewState } from "../cards/types";
import {
  buildSession,
  deckRowSubtitle,
  deckRows,
  selectAll,
  selectNone,
  startLabel,
  toggleDeck,
} from "../cards/ui/picker";

const NOW = new Date("2026-08-27T12:00:00.000Z");

function card(id: string): Card {
  return {
    id,
    front: `front ${id}`,
    back: `back ${id}`,
    why: "",
    tags: [],
    source: { kind: "lesson", lessonId: "l1", beatId: `b-${id}` },
  };
}

function review(cardId: string, dueAt: string): ReviewState {
  return { cardId, interval: 1, ease: 2.5, dueAt, lastRating: "good" };
}

function snapshotOf(
  cardIds: readonly string[],
  decks: readonly { id: string; title: string; kind: "lesson" | "personal" | "dat"; cardIds: readonly string[] }[],
  reviews: readonly ReviewState[] = [],
): DeckSnapshot {
  return {
    cards: Object.fromEntries(cardIds.map((id) => [id, card(id)])),
    decks: Object.fromEntries(decks.map((deck) => [deck.id, deck])),
    review: Object.fromEntries(reviews.map((state) => [state.cardId, state])),
    pendingRecos: [],
  };
}

describe("deck rows", () => {
  it("counts the cards and the ones that are ready", () => {
    const snapshot = snapshotOf(
      ["a", "b", "c"],
      [{ id: "d1", title: "Enolates", kind: "lesson", cardIds: ["a", "b", "c"] }],
      [review("a", "2026-08-26T00:00:00.000Z"), review("b", "2026-09-30T00:00:00.000Z")],
    );
    const rows = deckRows(snapshot, NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.cardCount).toBe(3);
    // `a` is overdue and counts. `b` is scheduled for September and does not.
    // `c` has never been rated, so it has no review state and no due date yet.
    expect(rows[0]!.dueCount).toBe(1);
    expect(deckRowSubtitle(rows[0]!)).toBe("3 cards, 1 ready");
  });

  it("skips a card id that resolves to nothing rather than counting it", () => {
    const snapshot = snapshotOf(["a"], [{ id: "d1", title: "Ghosts", kind: "lesson", cardIds: ["a", "gone"] }]);
    expect(deckRows(snapshot, NOW)[0]!.cardCount).toBe(1);
  });

  it("puts lesson decks first, then saves, then imports", () => {
    const snapshot = snapshotOf(
      ["a"],
      [
        { id: "d3", title: "DAT deck", kind: "dat", cardIds: ["a"] },
        { id: "d2", title: "My cards", kind: "personal", cardIds: ["a"] },
        { id: "d1", title: "Enolates", kind: "lesson", cardIds: ["a"] },
      ],
    );
    expect(deckRows(snapshot, NOW).map((row) => row.kind)).toEqual(["lesson", "personal", "dat"]);
  });
});

describe("selection", () => {
  it("toggles without mutating the array it was handed", () => {
    const before: readonly string[] = ["d1"];
    const after = toggleDeck(before, "d2");
    expect(after).toEqual(["d1", "d2"]);
    expect(before).toEqual(["d1"]);
    expect(toggleDeck(after, "d1")).toEqual(["d2"]);
  });

  it("select all names every row, none names nothing", () => {
    const rows = deckRows(
      snapshotOf(["a"], [
        { id: "d1", title: "One", kind: "lesson", cardIds: ["a"] },
        { id: "d2", title: "Two", kind: "lesson", cardIds: ["a"] },
      ]),
      NOW,
    );
    expect(selectAll(rows)).toEqual(["d1", "d2"]);
    expect(selectNone()).toEqual([]);
  });
});

describe("building the session", () => {
  const snapshot = snapshotOf(
    ["a", "b", "c"],
    [
      { id: "d1", title: "One", kind: "lesson", cardIds: ["a", "b"] },
      { id: "d2", title: "Two", kind: "personal", cardIds: ["b", "c"] },
    ],
    [review("a", "2026-08-26T00:00:00.000Z"), review("b", "2026-09-30T00:00:00.000Z")],
  );

  it("shows a card in two decks exactly once", () => {
    const session = buildSession(snapshot, ["d1", "d2"], { scope: "all", shuffle: false, seed: 1, now: NOW });
    expect(session.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("scope due keeps overdue and never seen, and drops the scheduled one", () => {
    const session = buildSession(snapshot, ["d1", "d2"], { scope: "due", shuffle: false, seed: 1, now: NOW });
    // `a` is overdue, `c` has never been rated, `b` is not due until September.
    expect(session.map((c) => c.id)).toEqual(["a", "c"]);
  });

  it("the same seed shuffles the same way, and keeps every card", () => {
    const first = buildSession(snapshot, ["d1", "d2"], { scope: "all", shuffle: true, seed: 42, now: NOW });
    const again = buildSession(snapshot, ["d1", "d2"], { scope: "all", shuffle: true, seed: 42, now: NOW });
    expect(first.map((c) => c.id)).toEqual(again.map((c) => c.id));
    expect([...first.map((c) => c.id)].sort()).toEqual(["a", "b", "c"]);
  });

  it("a different seed can produce a different order", () => {
    const orders = new Set<string>();
    for (let seed = 0; seed < 30; seed += 1) {
      const session = buildSession(snapshot, ["d1", "d2"], { scope: "all", shuffle: true, seed, now: NOW });
      orders.add(session.map((c) => c.id).join(""));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it("nothing selected is an empty session, not every card", () => {
    expect(buildSession(snapshot, [], { scope: "all", shuffle: false, seed: 1, now: NOW })).toEqual([]);
  });
});

describe("the start button keeps its promise", () => {
  it("names exactly the number of cards the session will hold", () => {
    const snapshot = snapshotOf(
      ["a", "b", "c"],
      [{ id: "d1", title: "One", kind: "lesson", cardIds: ["a", "b", "c"] }],
      [review("c", "2026-09-30T00:00:00.000Z")],
    );
    for (const scope of ["all", "due"] as const) {
      const session = buildSession(snapshot, ["d1"], { scope, shuffle: false, seed: 7, now: NOW });
      expect(startLabel(session.length)).toContain(String(session.length));
    }
  });

  it("says nothing rather than offering zero cards", () => {
    expect(startLabel(0)).toBe("Nothing to review yet");
    expect(startLabel(1)).toBe("Start 1 card");
    expect(startLabel(9)).toBe("Start 9 cards");
  });
});
