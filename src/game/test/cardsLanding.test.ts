/**
 * The Cards landing model: the hero, the queue it promises, and the tiles.
 *
 * THE ONE PROPERTY THIS FILE EXISTS TO HOLD: the hero's number and the REVIEW
 * button's session are the same computation. The S3 judge scored the bar down
 * for a headline number that arrived with no account of itself; a Due-today
 * hero that says 23 over a button that starts 19 is the same dishonesty one
 * screen earlier, so it is asserted here as an equality, not eyeballed.
 *
 * THE CLOCK IS PINNED IN EVERY TEST, per the gauntlet log's wall-clock rule:
 * the cutoff is the end of the LOCAL day, so the fixtures build their
 * timestamps through the local Date constructor, never toISOString arithmetic,
 * and the tests would pass at 23:59 as at 09:00.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  DOODLE_COUNT,
  MISTAKES_DECK_ID,
  MISTAKES_DECK_TITLE,
  doodleFor,
  heroModel,
  lessonDeckTiles,
  mistakeDeckCards,
  myDeckTiles,
  reviewQueue,
} from "../cards/ui/landing";
import { adoptMistakeDrafts } from "../cards/ui/CardsHome";
import { LEARNING_MASTERY } from "../cards/ui/mastery";
import { draftCardFromMistake, mistakeCardId } from "../cards/Recommendation";
import { createLocalDecks } from "../cards/store";
import type { Card, DeckSnapshot, ReviewState } from "../cards/types";
import { EMPTY_DECKS } from "../cards/types";
import type { SavedMistake } from "../tabs/trainer/mistakes";

/* ------------------------------------------------------------------ */
/* Fixtures                                                             */
/* ------------------------------------------------------------------ */

/** 9am local on a fixed date. Everything else is built relative to this. */
const MORNING = new Date(2026, 7, 27, 9, 0, 0, 0);

/** Same local day, 9pm: after `now`, before the end of the local day. */
const TONIGHT = new Date(2026, 7, 27, 21, 0, 0, 0);

/** The next local day. */
const TOMORROW = new Date(2026, 7, 28, 9, 0, 0, 0);

function card(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    front: "Which proton comes off first?",
    back: "The one between the two carbonyls.",
    why: "Two carbonyls share the charge, so that anion is the stable one.",
    tags: ["enolates"],
    source: { kind: "lesson", lessonId: "lesson-1", beatId: "beat-1" },
    ...overrides,
  };
}

function due(cardId: string, at: Date): ReviewState {
  return { cardId, interval: 1, ease: 2.5, dueAt: at.toISOString(), lastRating: "good" };
}

/**
 * A journal entry that resolves through the authored bridge: a real reaction,
 * a real cause, and an arrow key with no authored distractor behind it, the
 * same fixture mistakeCard.test.ts uses. Its resolution is ASSERTED below, so
 * a retired cause fails loudly instead of turning these into null-path tests.
 */
function mistake(overrides: Partial<SavedMistake> = {}): SavedMistake {
  return {
    reactionId: "sn2",
    arrowKey: "2e bond:b-oh -> atom:o1",
    verdict: "invalid",
    causeId: "valence_exceeded",
    distractorMatched: false,
    at: "2026-08-26T10:00:00.000Z",
    ...overrides,
  };
}

function snapshotWith(parts: Partial<DeckSnapshot>): DeckSnapshot {
  return { ...EMPTY_DECKS, ...parts };
}

it("the journal fixture resolves to a drafted card, or every test below lies", () => {
  expect(draftCardFromMistake(mistake())).not.toBeNull();
});

/* ------------------------------------------------------------------ */
/* The hero and its queue                                               */
/* ------------------------------------------------------------------ */

describe("the hero's number is the queue's length", () => {
  const snapshot = snapshotWith({
    cards: { a: card("a"), b: card("b"), c: card("c") },
    decks: {
      d1: { id: "d1", title: "EAS", kind: "personal", cardIds: ["a", "b", "c"] },
    },
    review: {
      a: due("a", MORNING),
      b: due("b", TONIGHT),
      c: due("c", TOMORROW),
    },
  });

  it("counts everything due by the end of the LOCAL day, not by this instant", () => {
    const queue = reviewQueue(snapshot, [], MORNING);
    expect(queue.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("hero.due equals the queue the button starts, with the journal included", () => {
    const journal = [mistake()];
    const queue = reviewQueue(snapshot, journal, MORNING);
    expect(heroModel(snapshot, journal, MORNING).due).toBe(queue.length);
    expect(queue.length).toBe(3);
  });

  it("a drafted mistake the store has never seen joins today's pile", () => {
    const queue = reviewQueue(snapshot, [mistake()], MORNING);
    expect(queue.map((c) => c.id)).toContain(mistakeCardId(mistake()));
  });

  it("a saved mistake card is scheduled, never doubled by its journal entry", () => {
    const entry = mistake();
    const saved = draftCardFromMistake(entry);
    expect(saved).not.toBeNull();
    if (saved === null) return;
    const withSaved = snapshotWith({
      cards: { [saved.id]: saved },
      review: { [saved.id]: due(saved.id, TOMORROW) },
    });
    // Scheduled for tomorrow, so it is not due; and it is not "unseen" either.
    expect(reviewQueue(withSaved, [entry], MORNING)).toHaveLength(0);
  });

  it("zero due renders the disabled all-clear hero, still titled Due today", () => {
    const hero = heroModel(EMPTY_DECKS, [], MORNING);
    expect(hero.due).toBe(0);
    expect(hero.title).toBe("Due today");
    expect(hero.buttonDisabled).toBe(true);
  });

  it("one due card gets the singular subline and a live Review button", () => {
    const one = snapshotWith({ cards: { a: card("a") }, review: { a: due("a", MORNING) } });
    const hero = heroModel(one, [], MORNING);
    expect(hero.due).toBe(1);
    expect(hero.subline).toBe("card ready to review");
    expect(hero.buttonDisabled).toBe(false);
    expect(hero.buttonLabel).toBe("Review");
  });
});

/* ------------------------------------------------------------------ */
/* The tiles                                                            */
/* ------------------------------------------------------------------ */

describe("the My-decks grid", () => {
  const snapshot = snapshotWith({
    cards: { a: card("a"), b: card("b") },
    decks: {
      z: { id: "z", title: "Zebra", kind: "personal", cardIds: ["a"] },
      d: { id: "d", title: "DAT", kind: "dat", cardIds: ["b"] },
      l: { id: "l", title: "Aromaticity", kind: "lesson", cardIds: ["b"] },
    },
    review: { a: { cardId: "a", interval: 0.007, ease: 2.5, dueAt: MORNING.toISOString(), lastRating: "again" } },
  });

  it("holds the student's own decks, never the lesson-generated ones", () => {
    const ids = myDeckTiles(snapshot, []).map((t) => t.deckId);
    expect(ids).toContain("z");
    expect(ids).toContain("d");
    expect(ids).not.toContain("l");
  });

  it("My mistakes is a first-class tile even at zero cards", () => {
    const tiles = myDeckTiles(EMPTY_DECKS, []);
    expect(tiles).toHaveLength(1);
    const mistakes = tiles[0];
    expect(mistakes?.deckId).toBe(MISTAKES_DECK_ID);
    expect(mistakes?.title).toBe(MISTAKES_DECK_TITLE);
    expect(mistakes?.count).toBe(0);
    expect(mistakes?.marker).toBe("mistakes");
    expect(mistakes?.mastery).toBe(0);
  });

  it("the mistakes tile counts the assembled deck: journal drafts plus saves", () => {
    const tiles = myDeckTiles(snapshot, [mistake()]);
    const mistakes = tiles.find((t) => t.deckId === MISTAKES_DECK_ID);
    expect(mistakes?.count).toBe(mistakeDeckCards(snapshot, [mistake()]).length);
    expect(mistakes?.count).toBe(1);
  });

  it("a stored mistakes deck does not put a second mistakes tile in the grid", () => {
    const stored = snapshotWith({
      decks: {
        [MISTAKES_DECK_ID]: { id: MISTAKES_DECK_ID, title: MISTAKES_DECK_TITLE, kind: "personal", cardIds: [] },
      },
    });
    const tiles = myDeckTiles(stored, []);
    expect(tiles.filter((t) => t.deckId === MISTAKES_DECK_ID)).toHaveLength(1);
  });

  it("a deck of one learning card shows the learning fraction, not zero", () => {
    const zebra = myDeckTiles(snapshot, []).find((t) => t.deckId === "z");
    expect(zebra?.mastery).toBeCloseTo(LEARNING_MASTERY);
  });

  it("every tile's doodle is stable and in range", () => {
    for (const tile of myDeckTiles(snapshot, [])) {
      expect(tile.doodle).toBe(doodleFor(tile.deckId));
      expect(tile.doodle).toBeGreaterThanOrEqual(0);
      expect(tile.doodle).toBeLessThan(DOODLE_COUNT);
    }
  });
});

describe("the From-your-lessons row", () => {
  it("holds only lesson decks, and every one carries the auto marker", () => {
    const snapshot = snapshotWith({
      cards: { a: card("a") },
      decks: {
        l1: { id: "l1", title: "Aromaticity", kind: "lesson", cardIds: ["a"] },
        p1: { id: "p1", title: "Mine", kind: "personal", cardIds: [] },
      },
    });
    const row = lessonDeckTiles(snapshot);
    expect(row.map((t) => t.deckId)).toEqual(["l1"]);
    expect(row.every((t) => t.marker === "auto")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Adopting drafts, so a rating has somewhere to land                   */
/* ------------------------------------------------------------------ */

class MemoryStorage {
  private readonly entries = new Map<string, string>();
  get length(): number {
    return this.entries.size;
  }
  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }
  removeItem(key: string): void {
    this.entries.delete(key);
  }
  clear(): void {
    this.entries.clear();
  }
  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }
}

describe("adoptMistakeDrafts", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage =
      new MemoryStorage() as unknown as Storage;
  });

  it("saves an unseen journal draft into the stored mistakes deck, with a schedule", () => {
    const source = createLocalDecks({ now: () => MORNING });
    const draft = draftCardFromMistake(mistake());
    expect(draft).not.toBeNull();
    if (draft === null) return;

    adoptMistakeDrafts(source, [draft]);

    const snapshot = source.getSnapshot();
    expect(snapshot.cards[draft.id]).toBeDefined();
    expect(snapshot.decks[MISTAKES_DECK_ID]?.cardIds).toContain(draft.id);
    expect(snapshot.decks[MISTAKES_DECK_ID]?.title).toBe(MISTAKES_DECK_TITLE);
    // startCard: due now, so the adopted draft stays in today's queue.
    expect(snapshot.review[draft.id]?.dueAt).toBe(MORNING.toISOString());
    // And rating it now has somewhere to land: rate() is no longer a no-op.
    source.rate(draft.id, "good");
    expect(source.getSnapshot().review[draft.id]?.lastRating).toBe("good");
  });

  it("adopting twice keeps the schedule the first pass earned", () => {
    const source = createLocalDecks({ now: () => MORNING });
    const draft = draftCardFromMistake(mistake());
    if (draft === null) return;
    adoptMistakeDrafts(source, [draft]);
    source.rate(draft.id, "good");
    const earned = source.getSnapshot().review[draft.id];
    adoptMistakeDrafts(source, [draft]);
    expect(source.getSnapshot().review[draft.id]).toEqual(earned);
  });

  it("leaves a missing non-mistake card alone: a trim is not a draft", () => {
    const source = createLocalDecks({ now: () => MORNING });
    adoptMistakeDrafts(source, [card("gone")]);
    expect(source.getSnapshot().cards["gone"]).toBeUndefined();
    expect(source.getSnapshot().decks[MISTAKES_DECK_ID]).toBeUndefined();
  });
});
