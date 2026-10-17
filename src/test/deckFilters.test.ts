/**
 * Category chips and the reagents switch on a deck page (owner, 2026-10-16),
 * pinned against the real generated carbonyl decks as well as small fixtures.
 */
import { describe, expect, it } from "vitest";
import type { Question } from "@/data/types";
import { deckCategories, hasReagents, hideReagents, maskableScheme } from "@/lib/deckFilters";
import { carbonylAllDeck } from "@/data/decks/carbonyls/all";
import { carbonylAcidsDeck } from "@/data/decks/carbonyls/acids";
import { carbonylNameReagentDeck } from "@/data/decks/carbonyls/name-reagent";

const card = (heading?: string): Question => ({ q: "x", a: "y", heading });

describe("deck categories", () => {
  it("groups the big carbonyl deck by family, every card exactly once", () => {
    const groups = deckCategories(carbonylAllDeck.questions);
    expect(groups.map((g) => g.label)).toContain("Reduction");
    expect(groups.length).toBeGreaterThanOrEqual(5);
    const seen = groups.flatMap((g) => g.indexes).sort((a, b) => a - b);
    expect(seen).toEqual(carbonylAllDeck.questions.map((_, i) => i));
  });

  it("drops a first part every heading shares", () => {
    const labels = deckCategories(carbonylAcidsDeck.questions).map((g) => g.label);
    expect(labels).toEqual(["Worked examples", "More of the same"]);
  });

  it("offers no row when there is nothing to choose between", () => {
    expect(deckCategories([card("A"), card("A")])).toEqual([]);
    expect(deckCategories([card(), card()])).toEqual([]);
  });

  it("files a card with no heading under Other", () => {
    expect(deckCategories([card("A"), card()]).map((g) => g.label)).toEqual(["A", "Other"]);
  });
});

describe("hiding reagents", () => {
  it("replaces only the reagents in a forward card's prompt", () => {
    expect(hideReagents("Fischer esterification: Benzoic acid + CH₃OH , H₂SO₄ cat.")).toBe(
      "Fischer esterification: Benzoic acid + ?",
    );
    expect(hideReagents("No reagents here")).toBe("No reagents here");
  });

  it("applies to forward reaction cards and leaves the question-style decks alone", () => {
    expect(carbonylAcidsDeck.questions.every(hasReagents)).toBe(true);
    expect(carbonylNameReagentDeck.questions.some(hasReagents)).toBe(false);
    expect(hasReagents({ q: "A + B", a: "c" })).toBe(false);
  });

  it("masks only the generator's scheme images", () => {
    expect(maskableScheme("carbonyl_fischer.svg")).toBe(true);
    expect(maskableScheme("grignard_1.svg")).toBe(false);
  });
});

describe("drawable products", () => {
  it("every forward carbonyl card carries its product's SMILES", () => {
    for (const q of carbonylAllDeck.questions) expect(q.product, q.q).toMatch(/^[A-Za-z0-9@+\-[\]()=#%/\\.]+$/);
  });
});
