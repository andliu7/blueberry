/**
 * The shelf and the deck: what the home and a deck promise at a glance.
 * Written with the 29 Sep rebuild. Several pins here RE-PIN capabilities whose
 * old tests went with the components they tested; each says which.
 *
 *   - "Every card's name is readable in the deck browser" was deckTray.test's
 *     floor for the fan. The deck view is a list now; the pin is that every
 *     card's whole title is in the markup, never cut.
 *   - "Each deck's art is stable and distinct" was cardDoodles/
 *     cardDoodleBounds for hand-drawn sketches. The art is a real RDKit drawing
 *     now; the pin is that it comes from the deck's own cards, is the START
 *     and never the product, and is distinct across rows where decks allow.
 *   - "The start button's count is the session it plays" was deckPicker.test's
 *     promise. It holds for the home's start button (the hero), the forecast's
 *     today bar, and a deck's "Review N due".
 *
 * The clock is pinned in every test, per the gauntlet log's wall-clock rule.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { REACTIONS } from "../../data/reactions";
import { reactionCardFromStaged } from "../cards/reactionCard";
import { createLocalDecks } from "../cards/store";
import type { Card, DeckSnapshot, ReviewState } from "../cards/types";
import { cardsIn, EMPTY_DECKS } from "../cards/types";
import { DeckScreen } from "../cards/ui/DeckScreen";
import { cardTitle, deckCells, deckCovers, deckDueCards, dueLabel, stateCounts } from "../cards/ui/deckView";
import { dueForecast, FORECAST_DAYS } from "../cards/ui/forecast";
import { Home } from "../cards/ui/Home";
import { heroModel, reviewQueue } from "../cards/ui/landing";

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

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage() as unknown as Storage;
});

const MORNING = new Date(2026, 8, 29, 9, 0, 0, 0);
const at = (day: number, hour = 12) => new Date(2026, 8, 29 + day, hour, 0, 0, 0);

function state(cardId: string, dueAt: Date, extra: Partial<ReviewState> = {}): ReviewState {
  return { cardId, interval: 3, ease: 2.5, dueAt: dueAt.toISOString(), lastRating: "good", ...extra };
}

function reaction(id: string): Card {
  const entry = REACTIONS.find((r) => r.id === id);
  expect(entry, id).toBeDefined();
  return reactionCardFromStaged(entry!, MORNING);
}

/** Two decks of registry cards with a spread of states and due dates. */
function fixture(): DeckSnapshot {
  const a = ["nabh4-reduction", "wolff-kishner", "clemmensen"].map(reaction);
  const b = ["lialh4-reduction", "dibalh-to-aldehyde"].map(reaction);
  const cards: Record<string, Card> = {};
  for (const card of [...a, ...b]) cards[card.id] = card;
  const [a0, a1, a2] = a;
  const [b0, b1] = b;
  return {
    ...EMPTY_DECKS,
    cards,
    decks: {
      a: { id: "a", title: "Ketone reductions", kind: "personal", cardIds: a.map((c) => c.id) },
      b: { id: "b", title: "Ester reductions", kind: "personal", cardIds: b.map((c) => c.id) },
    },
    review: {
      [a0!.id]: state(a0!.id, at(0, 20)), // due tonight: counts today
      [a1!.id]: state(a1!.id, at(1)), // tomorrow
      [a2!.id]: state(a2!.id, at(-2), { suspended: true }), // paused: never counts
      [b0!.id]: state(b0!.id, at(3)),
      [b1!.id]: { cardId: b1!.id, interval: 0, ease: 2.5, dueAt: at(-1).toISOString(), lastRating: null }, // new
    },
  };
}

describe("today's number is one computation", () => {
  it("the forecast's today bar is the hero's number and the start button's queue", () => {
    const snapshot = fixture();
    const today = dueForecast(snapshot, [], MORNING)[0];
    expect(today?.label).toBe("Today");
    expect(today?.count).toBe(heroModel(snapshot, [], MORNING).due);
    expect(today?.count).toBe(reviewQueue(snapshot, [], MORNING).length);
  });

  it("puts later cards on their own local day and never counts a paused one", () => {
    const forecast = dueForecast(fixture(), [], MORNING);
    expect(forecast).toHaveLength(FORECAST_DAYS);
    expect(forecast.map((day) => day.count)).toEqual([2, 1, 0, 1, 0, 0, 0]);
  });

  it("the home's start button names the count it will play", () => {
    const snapshot = fixture();
    const html = renderToStaticMarkup(
      createElement(Home, {
        snapshot,
        journal: [],
        source: createLocalDecks({ now: () => MORNING }),
        onStart: () => undefined,
        onOpenDeck: () => undefined,
        onCompose: () => undefined,
        now: MORNING,
      }),
    );
    expect(html).toContain(`Start review, ${reviewQueue(snapshot, [], MORNING).length} cards`);
    // Import is reachable from the shelf now, not from an unlinked hub.
    expect(html).toContain("Import a file");
    expect(html).toContain("+ New card");
  });
});

describe("a deck at a glance", () => {
  it("one strip cell per card, in deck order, with counts that add up", () => {
    const snapshot = fixture();
    const cards = cardsIn(snapshot, "a");
    const cells = deckCells(snapshot, cards, MORNING);
    expect(cells).toHaveLength(cards.length);
    expect(cells).toEqual(["young", "young", "suspended"]);
    const counts = stateCounts(deckCells(snapshot, cardsIn(snapshot, "b"), MORNING));
    expect(counts.new).toBe(1);
    expect(Object.values(counts).reduce((sum, n) => sum + n, 0)).toBe(2);
  });

  it("Review N due plays exactly the N it names, and the hero agrees across decks", () => {
    const snapshot = fixture();
    const dueA = deckDueCards(snapshot, cardsIn(snapshot, "a"), MORNING);
    const dueB = deckDueCards(snapshot, cardsIn(snapshot, "b"), MORNING);
    expect(dueA).toHaveLength(1);
    expect(dueB).toHaveLength(1);
    expect(dueA.length + dueB.length).toBe(heroModel(snapshot, [], MORNING).due);

    const html = renderToStaticMarkup(
      createElement(DeckScreen, {
        title: "Ketone reductions",
        cards: cardsIn(snapshot, "a"),
        snapshot,
        storedDeckId: "a",
        onBack: () => undefined,
        onReview: () => undefined,
        onSetSuspended: () => undefined,
        onRemove: () => undefined,
        now: MORNING,
      }),
    );
    expect(html).toContain(`Review ${dueA.length} due`);
    // Review all skips the paused card: two of three.
    expect(html).toContain("Review all 2");
    expect(html).toContain(">CSV<");
    expect(html).toContain(">JSON<");
  });

  it("every card's whole name is in the list, never cut", () => {
    const snapshot = fixture();
    const cards = cardsIn(snapshot, "a");
    const html = renderToStaticMarkup(
      createElement(DeckScreen, {
        title: "Ketone reductions",
        cards,
        snapshot,
        storedDeckId: "a",
        onBack: () => undefined,
        onReview: () => undefined,
        onSetSuspended: () => undefined,
        onRemove: () => undefined,
        now: MORNING,
      }),
    );
    const text = html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&");
    for (const card of cards) expect(text).toContain(cardTitle(card));
    expect(html).not.toMatch(/truncate|line-clamp|text-ellipsis/);
  });

  it("a card's title names its start and conditions, never its product", () => {
    for (const entry of REACTIONS) {
      const card = reactionCardFromStaged(entry, MORNING);
      const title = cardTitle(card);
      expect(title).toContain(card.reaction?.reactants ?? "IMPOSSIBLE");
      // A product label that is also a substring of the start (none today)
      // would make this check meaningless, so it is skipped rather than faked.
      if (!(card.reaction?.reactants ?? "").includes(entry.product_label) && !(card.reaction?.reagents ?? "").includes(entry.product_label)) {
        expect(title.includes(entry.product_label), entry.id).toBe(false);
      }
    }
  });

  it("says when a card comes back, in words", () => {
    expect(dueLabel(undefined, MORNING)).toBe("New, not seen yet");
    expect(dueLabel(state("x", at(-1)), MORNING)).toBe("Due now");
    expect(dueLabel(state("x", at(3, 9)), MORNING)).toBe("Back in 3 days");
    expect(dueLabel(state("x", at(3), { suspended: true }), MORNING)).toBe("Paused");
  });
});

describe("deck covers are the deck's own chemistry", () => {
  it("draws the start material of a card in that deck, never a product", () => {
    const snapshot = fixture();
    const decks = [cardsIn(snapshot, "a"), cardsIn(snapshot, "b")];
    const covers = deckCovers(decks);
    covers.forEach((cover, index) => {
      expect(cover).not.toBeNull();
      const starts = decks[index]!.map((card) => card.reaction?.art?.startLight);
      const products = decks[index]!.map((card) => card.reaction?.art?.productLight);
      expect(starts).toContain(cover?.light);
      expect(products).not.toContain(cover?.light);
    });
  });

  it("keeps covers distinct across rows when the decks allow it", () => {
    // Two decks that both start from acetophenone and one that also holds a
    // benzaldehyde card: the second deck must take its other drawing.
    const first = [reaction("nabh4-reduction")];
    const second = [reaction("wolff-kishner"), reaction("cyanohydrin")];
    const [a, b] = deckCovers([first, second]);
    // Both acetophenone reactions have their own file, so the names are
    // what is compared: the same molecule twice is the same picture.
    expect(a?.alt).toBe("acetophenone");
    expect(b?.alt).not.toBe(a?.alt);
    expect(b?.light).toBe(second[1]?.reaction?.art?.startLight);
  });

  it("is stable, and absent rather than invented for a deck with no drawing", () => {
    const decks = [[reaction("imine-formation")], []];
    expect(deckCovers(decks)).toEqual(deckCovers(decks));
    expect(deckCovers(decks)[1]).toBeNull();
  });
});
