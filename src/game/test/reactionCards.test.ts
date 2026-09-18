/**
 * Reaction cards: the builder over the authored registry, the reveal that
 * shows only what exists, the #/draw save round trip, the migration out of
 * the dead savedCards store, and the starter seed.
 *
 * THE PINS THAT MATTER MOST, named so a refactor knows what it is defending:
 *
 *   - Nothing on a card is invented. Every chemistry string on a built card
 *     exists character for character in data/reactions.ts, and a reveal
 *     field the data does not state is ABSENT, not filled in.
 *   - The id is derived from the reaction, so a draw save, a migrated save
 *     and a seeded card of the same reaction are ONE card with one schedule.
 *   - The seed happens exactly once. A second call, a later emptiness, or a
 *     store that already has cards must not grow surprise decks.
 *
 * Storage is the same in-memory stub cardStore.test.ts uses, because these
 * paths are exactly where a persistence bug would hide behind a mock.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import { REACTIONS } from "../../data/reactions";
import {
  drawCardFor,
  reactionCardFromStaged,
  reactionCardId,
  stagedReagentLine,
} from "../cards/reactionCard";
import {
  cardFromLegacyEntry,
  LEGACY_SAVED_CARDS_KEY,
  migrateLegacySavedCards,
} from "../cards/migrateSavedCards";
import {
  SEED_FLAG_KEY,
  seedStarterDeck,
  STARTER_DECK_ID,
  STARTER_REACTION_IDS,
  starterCards,
} from "../cards/seed";
import { createLocalDecks, PERSONAL_DECK_ID } from "../cards/store";
import { cardsIn, dueInDeck, isDue, presentReveal, REVEAL_LABELS } from "../cards/types";
import { CardFace } from "../cards/ui/CardFace";
import { cardFromDraft, EMPTY_EXTRAS } from "../cards/ui/composer";
import { reviewQueue } from "../cards/ui/landing";

/* ------------------------------------------------------------------ */
/* Storage stub, the cardStore.test.ts shape                            */
/* ------------------------------------------------------------------ */

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

const NOON = new Date(2026, 8, 17, 12, 0, 0, 0);
const now = (): Date => NOON;

function registryEntry(id: string) {
  const entry = REACTIONS.find((reaction) => reaction.id === id);
  expect(entry, id).toBeDefined();
  return entry!;
}

beforeEach(() => {
  installStorage();
});

/* ------------------------------------------------------------------ */
/* Building a card from the authored registry                           */
/* ------------------------------------------------------------------ */

describe("a reaction card built from the registry", () => {
  it("carries the authored labels verbatim: reactants, reagents, product", () => {
    const reaction = registryEntry("grignard-addition-ketone");
    const card = reactionCardFromStaged(reaction, NOON);
    expect(card.reaction?.reactants).toBe("acetophenone");
    expect(card.reaction?.reagents).toBe("CH3MgBr; then [H3O+]");
    expect(card.reaction?.products).toBe("2-phenylpropan-2-ol");
    // The classic triple stays populated, so every older surface renders
    // the card whole: front asks, back answers, why carries the conditions.
    expect(card.front).toBe("acetophenone");
    expect(card.back).toBe("2-phenylpropan-2-ol");
    expect(card.why).toContain("CH3MgBr");
  });

  it("wears a temperature chip only when a stage states one", () => {
    const gilman = reactionCardFromStaged(registryEntry("gilman-to-ketone"), NOON);
    expect(gilman.reaction?.temperature).toBe("-78 °C");
    const grignard = reactionCardFromStaged(registryEntry("grignard-addition-ketone"), NOON);
    expect(grignard.reaction?.temperature).toBeUndefined();
  });

  it("carries the 1,2 vs 1,4 note verbatim where an author wrote one, and nowhere else", () => {
    const michael = registryEntry("michael-addition");
    const card = reactionCardFromStaged(michael, NOON);
    const authoredNote = michael.stages[0]?.conditions.notes ?? "";
    expect(card.reaction?.reveal.selectivity).toBe(authoredNote);

    const grignard = reactionCardFromStaged(registryEntry("grignard-addition-ketone"), NOON);
    expect(grignard.reaction?.reveal.selectivity).toBeUndefined();
  });

  it("leaves every reveal field the data does not state absent, never recalled", () => {
    // The chemistry rule as one assertion: no pKa, Keq or electronegativity
    // exists in data/reactions.ts, so no built card may carry one.
    for (const id of STARTER_REACTION_IDS) {
      const card = reactionCardFromStaged(registryEntry(id), NOON);
      expect(card.reaction?.reveal.pka, id).toBeUndefined();
      expect(card.reaction?.reveal.keq, id).toBeUndefined();
      expect(card.reaction?.reveal.electronegativity, id).toBeUndefined();
      expect(card.reaction?.reveal.resonance, id).toBeUndefined();
    }
  });

  it("derives a stable id, so the same reaction is always the same card", () => {
    expect(reactionCardId("sn2")).toBe("reaction:sn2");
    const first = drawCardFor("grignard-addition-ketone", NOON);
    const second = drawCardFor("grignard-addition-ketone", new Date(2027, 0, 1));
    expect(first?.id).toBe(second?.id);
  });

  it("returns null for a reaction id the registry does not hold", () => {
    expect(drawCardFor("reaction-that-was-deleted", NOON)).toBeNull();
  });

  it("reads each stage's display reagent, the bottle label the data lists last", () => {
    expect(stagedReagentLine(registryEntry("nabh4-reduction"))).toBe("NaBH4; then [H3O+]");
  });
});

/* ------------------------------------------------------------------ */
/* The reveal shows only what is present                                */
/* ------------------------------------------------------------------ */

describe("the reveal", () => {
  it("presents nothing from an empty reveal, and skips blank fields", () => {
    expect(presentReveal({})).toEqual([]);
    const entries = presentReveal({ pka: "4.76", resonance: "   " });
    expect(entries.map((entry) => entry.field)).toEqual(["pka"]);
    expect(entries[0]?.label).toBe(REVEAL_LABELS.pka);
  });

  it("renders only the fields the author supplied, under their labels", () => {
    const card = cardFromDraft(
      { setup: "acetic acid + water", conditions: "room temperature", product: "acetate" },
      NOON,
      { ...EMPTY_EXTRAS, pka: "4.76" },
    );
    const html = renderToStaticMarkup(
      createElement(CardFace, { card, revealed: true, onReveal: () => undefined }),
    );
    expect(html).toContain("pKa");
    expect(html).toContain("4.76");
    for (const missing of [
      REVEAL_LABELS.keq,
      REVEAL_LABELS.selectivity,
      REVEAL_LABELS.electronegativity,
      REVEAL_LABELS.resonance,
    ]) {
      expect(html.includes(missing), missing).toBe(false);
    }
  });

  it("withholds the product until the reveal, and shows it after", () => {
    const card = drawCardFor("gilman-to-ketone", NOON);
    expect(card).not.toBeNull();
    if (card === null) return;

    const front = renderToStaticMarkup(
      createElement(CardFace, { card, revealed: false, onReveal: () => undefined }),
    );
    expect(front).toContain("benzoyl chloride");
    expect(front).toContain("(CH3)2CuLi");
    expect(front).toContain("-78 °C");
    expect(front.includes("acetophenone")).toBe(false);
    expect(front).toContain("Tap to reveal the answer");

    const back = renderToStaticMarkup(
      createElement(CardFace, { card, revealed: true, onReveal: () => undefined }),
    );
    expect(back).toContain("acetophenone");
  });
});

/* ------------------------------------------------------------------ */
/* The composer's extras                                                */
/* ------------------------------------------------------------------ */

describe("the composer's extras", () => {
  const SIDES = { setup: "cyclopentene + NBS", conditions: "hv, heat", product: "3-bromocyclopentene" };

  it("changes nothing when every extra is blank", () => {
    expect(cardFromDraft(SIDES, NOON).reaction).toBeUndefined();
    expect(cardFromDraft(SIDES, NOON, EMPTY_EXTRAS).reaction).toBeUndefined();
  });

  it("maps the three sides onto the reaction face when an extra is written", () => {
    const card = cardFromDraft(SIDES, NOON, { ...EMPTY_EXTRAS, temperature: "25 °C" });
    expect(card.reaction).toEqual({
      reactants: SIDES.setup,
      reagents: SIDES.conditions,
      products: SIDES.product,
      temperature: "25 °C",
      reveal: {},
    });
    // The three-sided face still travels too; nothing about sides changed.
    expect(card.sides).toEqual(SIDES);
  });
});

/* ------------------------------------------------------------------ */
/* The draw page round trip                                             */
/* ------------------------------------------------------------------ */

describe("saving from #/draw", () => {
  it("lands in the personal deck, due immediately, in the review queue", () => {
    const store = createLocalDecks({ now });
    const card = drawCardFor("grignard-addition-ketone", NOON);
    expect(card).not.toBeNull();
    if (card === null) return;
    store.saveCard(card, PERSONAL_DECK_ID);

    const snapshot = store.getSnapshot();
    expect(cardsIn(snapshot, PERSONAL_DECK_ID).map((held) => held.id)).toEqual([card.id]);
    const state = snapshot.review[card.id];
    expect(state && isDue(state, NOON)).toBe(true);
    expect(dueInDeck(snapshot, PERSONAL_DECK_ID, NOON)).toBe(1);
    // The landing's REVIEW queue is the session the hero starts.
    expect(reviewQueue(snapshot, [], NOON).map((queued) => queued.id)).toContain(card.id);
  });

  it("saving the same reaction twice keeps one card and its earned schedule", () => {
    const store = createLocalDecks({ now });
    const card = drawCardFor("grignard-addition-ketone", NOON);
    if (card === null) return;
    store.saveCard(card, PERSONAL_DECK_ID);
    store.rate(card.id, "good");
    const scheduled = store.getSnapshot().review[card.id];

    store.saveCard(drawCardFor("grignard-addition-ketone", new Date(2027, 0, 1))!, PERSONAL_DECK_ID);
    const snapshot = store.getSnapshot();
    expect(cardsIn(snapshot, PERSONAL_DECK_ID)).toHaveLength(1);
    expect(snapshot.review[card.id]).toEqual(scheduled);
  });
});

/* ------------------------------------------------------------------ */
/* The migration out of the dead store                                  */
/* ------------------------------------------------------------------ */

describe("migrating blueberry_saved_cards_v1", () => {
  const LEGACY = [
    {
      id: "abc-1",
      reactionId: "grignard-addition-ketone",
      front: "acetophenone, CH3MgBr",
      back: "2-phenylpropan-2-ol",
      molfile: "\n  Ketcher\n",
      smiles: "CC(C)(O)c1ccccc1",
      correct: true,
      at: "2026-08-01T10:00:00.000Z",
    },
    {
      id: "abc-2",
      reactionId: "reaction-that-was-deleted",
      front: "the old front",
      back: "the old back",
      correct: false,
      at: "2026-08-02T10:00:00.000Z",
    },
    { id: "abc-3", front: "no reaction id at all" },
  ];

  it("walks every readable entry into the personal deck and removes the key", () => {
    localStorage.setItem(LEGACY_SAVED_CARDS_KEY, JSON.stringify(LEGACY));
    const store = createLocalDecks({ now });

    const migrated = migrateLegacySavedCards(store, PERSONAL_DECK_ID, NOON);
    expect(migrated).toBe(2);
    expect(localStorage.getItem(LEGACY_SAVED_CARDS_KEY)).toBeNull();

    const snapshot = store.getSnapshot();
    const held = cardsIn(snapshot, PERSONAL_DECK_ID);
    expect(held).toHaveLength(2);
    expect(dueInDeck(snapshot, PERSONAL_DECK_ID, NOON)).toBe(2);
  });

  it("rebuilds a resolvable entry through the same builder a fresh save uses", () => {
    localStorage.setItem(LEGACY_SAVED_CARDS_KEY, JSON.stringify([LEGACY[0]]));
    const store = createLocalDecks({ now });
    migrateLegacySavedCards(store, PERSONAL_DECK_ID, NOON);

    const card = store.getSnapshot().cards["reaction:grignard-addition-ketone"];
    expect(card?.reaction?.products).toBe("2-phenylpropan-2-ol");
    // Same derived id, so a later draw save updates rather than duplicates.
    store.saveCard(drawCardFor("grignard-addition-ketone", NOON)!, PERSONAL_DECK_ID);
    expect(cardsIn(store.getSnapshot(), PERSONAL_DECK_ID)).toHaveLength(1);
  });

  it("keeps a gone reaction's own words verbatim rather than inventing a face", () => {
    const card = cardFromLegacyEntry(LEGACY[1], NOON);
    expect(card?.front).toBe("the old front");
    expect(card?.back).toBe("the old back");
    expect(card?.reaction).toBeUndefined();
    expect(card?.source).toEqual({
      kind: "reaction",
      reactionId: "reaction-that-was-deleted",
      at: "2026-08-02T10:00:00.000Z",
    });
  });

  it("is a no-op the second time: the key is gone", () => {
    localStorage.setItem(LEGACY_SAVED_CARDS_KEY, JSON.stringify(LEGACY));
    const store = createLocalDecks({ now });
    migrateLegacySavedCards(store, PERSONAL_DECK_ID, NOON);
    expect(migrateLegacySavedCards(store, PERSONAL_DECK_ID, NOON)).toBe(0);
    expect(cardsIn(store.getSnapshot(), PERSONAL_DECK_ID)).toHaveLength(2);
  });

  it("survives a corrupt payload, and clears the unreadable key", () => {
    localStorage.setItem(LEGACY_SAVED_CARDS_KEY, "{not json");
    const store = createLocalDecks({ now });
    expect(migrateLegacySavedCards(store, PERSONAL_DECK_ID, NOON)).toBe(0);
    expect(localStorage.getItem(LEGACY_SAVED_CARDS_KEY)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* The starter seed                                                     */
/* ------------------------------------------------------------------ */

describe("the starter deck seed", () => {
  it("builds every starter card from the registry, reaction-faced", () => {
    const cards = starterCards(NOON);
    expect(cards).toHaveLength(STARTER_REACTION_IDS.length);
    for (const card of cards) {
      expect(card.reaction).toBeDefined();
      expect(card.source.kind).toBe("reaction");
    }
  });

  it("seeds once into an empty store, all cards due today", () => {
    const store = createLocalDecks({ now });
    expect(seedStarterDeck(store, NOON)).toBe(true);

    const snapshot = store.getSnapshot();
    const held = cardsIn(snapshot, STARTER_DECK_ID);
    expect(held).toHaveLength(STARTER_REACTION_IDS.length);
    expect(dueInDeck(snapshot, STARTER_DECK_ID, NOON)).toBe(STARTER_REACTION_IDS.length);
    expect(localStorage.getItem(SEED_FLAG_KEY)).not.toBeNull();
  });

  it("appears exactly once: a second call adds nothing", () => {
    const store = createLocalDecks({ now });
    seedStarterDeck(store, NOON);
    expect(seedStarterDeck(store, NOON)).toBe(false);
    expect(cardsIn(store.getSnapshot(), STARTER_DECK_ID)).toHaveLength(
      STARTER_REACTION_IDS.length,
    );
  });

  it("does not resurrect a card the student deleted", () => {
    const store = createLocalDecks({ now });
    seedStarterDeck(store, NOON);
    const first = cardsIn(store.getSnapshot(), STARTER_DECK_ID)[0];
    if (first === undefined) return;
    store.removeCard(first.id);
    expect(seedStarterDeck(store, NOON)).toBe(false);
    expect(store.getSnapshot().cards[first.id]).toBeUndefined();
  });

  it("declines a store that already holds cards, and stays declined", () => {
    const store = createLocalDecks({ now });
    const existing = drawCardFor("nabh4-reduction", NOON);
    if (existing === null) return;
    store.saveCard(existing, PERSONAL_DECK_ID);

    expect(seedStarterDeck(store, NOON)).toBe(false);
    expect(store.getSnapshot().decks[STARTER_DECK_ID]).toBeUndefined();
    // The flag is written on the declining pass too: that student is past
    // first-run, so a later empty store does not suddenly sprout the deck.
    store.removeCard(existing.id);
    expect(seedStarterDeck(store, NOON)).toBe(false);
  });

  it("does not seed when storage cannot remember that it seeded", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    (globalThis as unknown as { localStorage: Storage }).localStorage =
      blocked as unknown as Storage;
    const store = createLocalDecks({ now });
    expect(seedStarterDeck(store, NOON)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Nothing invented, held mechanically                                  */
/* ------------------------------------------------------------------ */

describe("every chemistry string on a built card is authored", () => {
  it("comes character for character out of data/reactions.ts", () => {
    for (const id of STARTER_REACTION_IDS) {
      const entry = registryEntry(id);
      const card = reactionCardFromStaged(entry, NOON);
      const face = card.reaction;
      expect(face, id).toBeDefined();
      if (face === undefined) continue;

      expect(face.reactants).toBe(entry.reactant_labels.join(" + "));
      expect(face.products).toBe(entry.product_label);
      for (const piece of face.reagents.split("; then ")) {
        const listed = entry.stages.some((stage) => stage.reagents.includes(piece));
        expect(listed, `${id}: ${piece}`).toBe(true);
      }
      const notes = entry.stages.map((stage) => stage.conditions.notes);
      for (const value of Object.values(face.reveal)) {
        expect(notes.includes(value), `${id}: ${value}`).toBe(true);
      }
    }
  });
});
