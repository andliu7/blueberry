/**
 * The card store, tested against a real localStorage stub rather than a mock of
 * itself. Vitest runs these in the node environment (see vitest.config.ts), so
 * there is no localStorage here unless a test installs one, and installing a
 * small in-memory Storage is closer to the browser than stubbing the store's
 * own methods would be: a persistence bug survives a mocked store and dies
 * against this one.
 *
 * The clock is injected, so nothing here depends on when it runs.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CARD_CAP,
  PERSONAL_DECK_ID,
  PERSONAL_DECK_TITLE,
  createLocalDecks,
} from "../cards/store";
import { GRADUATING_INTERVAL_DAYS, STARTING_EASE } from "../cards/scheduler";
import type { Card, Deck } from "../cards/types";
import { cardsIn, dueInDeck, isDue } from "../cards/types";

class MemoryStorage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  getItem(key: string): string | null {
    return this.entries.has(key) ? (this.entries.get(key) as string) : null;
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

function installStorage(): void {
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    new MemoryStorage() as unknown as Storage;
}

const NOON = new Date(2026, 7, 27, 12, 0, 0, 0);
const clock = { at: NOON };
const now = (): Date => clock.at;

function lessonCard(id: string): Card {
  return {
    id,
    front: "Which proton comes off first?",
    back: "The one between the two carbonyls.",
    why: "Two carbonyls share the charge, so that anion is the stable one.",
    tags: ["enolates"],
    source: { kind: "lesson", lessonId: "lesson-enolates-1", beatId: "beat-1" },
  };
}

function importedCard(id: string, externalId: string, back: string): Card {
  return {
    id,
    front: "Formal charge on the nitrogen?",
    back,
    why: "Count the bonds against the group number.",
    tags: ["dat"],
    source: {
      kind: "import",
      deckName: "DAT General Chemistry",
      externalId,
      importedAt: NOON.toISOString(),
    },
  };
}

beforeEach(() => {
  installStorage();
  clock.at = NOON;
});

describe("saving a card", () => {
  it("puts the card in the deck, schedules it, and creates the deck if it is new", () => {
    const store = createLocalDecks({ now });
    store.saveCard(lessonCard("card-1"), PERSONAL_DECK_ID);

    const snapshot = store.getSnapshot();
    expect(snapshot.decks[PERSONAL_DECK_ID]?.title).toBe(PERSONAL_DECK_TITLE);
    expect(cardsIn(snapshot, PERSONAL_DECK_ID).map((card) => card.id)).toEqual(["card-1"]);

    const state = snapshot.review["card-1"];
    expect(state?.ease).toBe(STARTING_EASE);
    expect(state && isDue(state, NOON)).toBe(true);
    expect(dueInDeck(snapshot, PERSONAL_DECK_ID, NOON)).toBe(1);
  });

  it("replaces the snapshot object rather than mutating it", () => {
    // useSyncExternalStore compares snapshot identity to decide on a re-render.
    const store = createLocalDecks({ now });
    const before = store.getSnapshot();
    store.saveCard(lessonCard("card-1"), PERSONAL_DECK_ID);
    expect(store.getSnapshot()).not.toBe(before);
    expect(before.cards["card-1"]).toBeUndefined();
  });

  it("notifies subscribers, and stops after they unsubscribe", () => {
    const store = createLocalDecks({ now });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.saveCard(lessonCard("card-1"), PERSONAL_DECK_ID);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.saveCard(lessonCard("card-2"), PERSONAL_DECK_ID);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps the schedule a re-saved card already earned", () => {
    const store = createLocalDecks({ now });
    store.saveCard(lessonCard("card-1"), PERSONAL_DECK_ID);
    store.rate("card-1", "good");
    const earned = store.getSnapshot().review["card-1"];

    store.saveCard({ ...lessonCard("card-1"), front: "Which proton leaves first?" }, PERSONAL_DECK_ID);

    const after = store.getSnapshot();
    expect(after.cards["card-1"]?.front).toBe("Which proton leaves first?");
    expect(after.review["card-1"]).toEqual(earned);
    expect(after.decks[PERSONAL_DECK_ID]?.cardIds).toEqual(["card-1"]);
  });

  it("survives a reload, because the write went through storage", () => {
    const first = createLocalDecks({ now });
    first.saveCard(lessonCard("card-1"), PERSONAL_DECK_ID);

    const second = createLocalDecks({ now });
    expect(second.getSnapshot().cards["card-1"]?.front).toBe("Which proton comes off first?");
    expect(second.getSnapshot().review["card-1"]).toBeDefined();
  });
});

describe("rating", () => {
  it("hands the interval decision to the scheduler", () => {
    const store = createLocalDecks({ now });
    store.saveCard(lessonCard("card-1"), PERSONAL_DECK_ID);

    store.rate("card-1", "good");
    expect(store.getSnapshot().review["card-1"]?.interval).toBe(GRADUATING_INTERVAL_DAYS);

    clock.at = new Date(NOON.getTime() + 24 * 60 * 60 * 1000);
    store.rate("card-1", "good");
    const state = store.getSnapshot().review["card-1"];
    expect(state?.interval).toBe(3);
    expect(state && Date.parse(state.dueAt)).toBe(clock.at.getTime() + 3 * 24 * 60 * 60 * 1000);
  });

  it("does nothing for a card the student does not hold", () => {
    const store = createLocalDecks({ now });
    const before = store.getSnapshot();
    store.rate("card-nobody-saved", "good");
    expect(store.getSnapshot()).toBe(before);
  });
});

describe("the recommendation toast", () => {
  const reco = { cardId: "card-1", reason: "This one catches people out.", seenAt: NOON.toISOString() };

  it("offers once", () => {
    const store = createLocalDecks({ now });
    store.offer(reco);
    store.offer(reco);
    expect(store.getSnapshot().pendingRecos).toHaveLength(1);
  });

  it("retires the offer when the card is saved", () => {
    const store = createLocalDecks({ now });
    store.offer(reco);
    store.saveCard(lessonCard("card-1"), PERSONAL_DECK_ID);
    expect(store.getSnapshot().pendingRecos).toHaveLength(0);
  });

  it("counts a dismissal and does not push the same card again", () => {
    const store = createLocalDecks({ now });
    store.offer(reco);
    store.dismissReco("card-1");

    expect(store.getSnapshot().pendingRecos).toHaveLength(0);
    expect(store.hasDismissed("card-1")).toBe(true);
    expect(store.dismissedCount()).toBe(1);

    store.offer(reco);
    expect(store.getSnapshot().pendingRecos).toHaveLength(0);
  });

  it("does not offer a card the student already owns", () => {
    const store = createLocalDecks({ now });
    store.saveCard(lessonCard("card-1"), PERSONAL_DECK_ID);
    store.offer(reco);
    expect(store.getSnapshot().pendingRecos).toHaveLength(0);
  });
});

describe("importing a deck the student already owns", () => {
  const DAT: Deck = { id: "deck-dat", title: "DAT General Chemistry", kind: "dat", cardIds: [] };

  it("adds the cards and schedules each one", () => {
    const store = createLocalDecks({ now });
    store.createDeck(DAT);
    store.importCards(DAT.id, [importedCard("a", "anki-1", "Zero."), importedCard("b", "anki-2", "Plus one.")]);

    const snapshot = store.getSnapshot();
    expect(cardsIn(snapshot, DAT.id)).toHaveLength(2);
    expect(Object.keys(snapshot.review)).toHaveLength(2);
  });

  it("updates rather than duplicates on a second import, keeping the review history", () => {
    const store = createLocalDecks({ now });
    store.createDeck(DAT);
    store.importCards(DAT.id, [importedCard("a", "anki-1", "Zero.")]);
    store.rate("a", "easy");
    const earned = store.getSnapshot().review["a"];

    // The same note, re-exported: a fresh local id, the same external id.
    store.importCards(DAT.id, [importedCard("fresh-id", "anki-1", "Zero, and here is why.")]);

    const snapshot = store.getSnapshot();
    expect(cardsIn(snapshot, DAT.id)).toHaveLength(1);
    expect(snapshot.cards["a"]?.back).toBe("Zero, and here is why.");
    expect(snapshot.cards["fresh-id"]).toBeUndefined();
    expect(snapshot.review["a"]).toEqual(earned);
  });

  it("creates the deck under the file's own name when nothing declared it first", () => {
    const store = createLocalDecks({ now });
    store.importCards("deck-dat", [importedCard("a", "anki-1", "Zero.")]);
    expect(store.getSnapshot().decks["deck-dat"]?.title).toBe("DAT General Chemistry");
  });

  it("leaves an existing deck alone when a surface re-declares it", () => {
    const store = createLocalDecks({ now });
    store.createDeck(DAT);
    store.importCards(DAT.id, [importedCard("a", "anki-1", "Zero.")]);
    store.createDeck({ ...DAT, cardIds: [] });
    expect(store.getSnapshot().decks[DAT.id]?.cardIds).toEqual(["a"]);
  });
});

describe("removing and resetting", () => {
  it("takes the card, its schedule and its deck membership together", () => {
    const store = createLocalDecks({ now });
    store.saveCard(lessonCard("card-1"), PERSONAL_DECK_ID);
    store.saveCard(lessonCard("card-2"), PERSONAL_DECK_ID);
    store.removeCard("card-1");

    const snapshot = store.getSnapshot();
    expect(snapshot.cards["card-1"]).toBeUndefined();
    expect(snapshot.review["card-1"]).toBeUndefined();
    expect(snapshot.decks[PERSONAL_DECK_ID]?.cardIds).toEqual(["card-2"]);
  });

  it("clears everything, including the dismissed offers", () => {
    const store = createLocalDecks({ now });
    store.saveCard(lessonCard("card-1"), PERSONAL_DECK_ID);
    store.dismissReco("card-2");
    store.reset();

    expect(store.getSnapshot().cards).toEqual({});
    expect(store.dismissedCount()).toBe(0);
    expect(createLocalDecks({ now }).getSnapshot().cards).toEqual({});
  });
});

describe("the cap", () => {
  it("is a real number, not a comment", () => {
    expect(CARD_CAP).toBe(2000);
  });

  it("drops the oldest card and everything pointing at it", () => {
    const store = createLocalDecks({ now, cardCap: 3 });
    for (const id of ["a", "b", "c", "d"]) store.saveCard(lessonCard(id), PERSONAL_DECK_ID);

    const snapshot = store.getSnapshot();
    expect(Object.keys(snapshot.cards)).toEqual(["b", "c", "d"]);
    expect(snapshot.review["a"]).toBeUndefined();
    expect(snapshot.decks[PERSONAL_DECK_ID]?.cardIds).toEqual(["b", "c", "d"]);
  });
});

describe("storage that refuses to work", () => {
  it("still runs the session, it just does not persist", () => {
    // Private mode, a full quota, or storage disabled by policy.
    const blocked = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };
    (globalThis as unknown as { localStorage: Storage }).localStorage = blocked as unknown as Storage;

    const store = createLocalDecks({ now });
    store.saveCard(lessonCard("card-1"), PERSONAL_DECK_ID);
    expect(store.getSnapshot().cards["card-1"]).toBeDefined();
  });
});
