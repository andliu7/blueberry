/**
 * The composer's logic: the three sides, the derived classic faces, and the
 * words a blocked save shows.
 *
 * TWO PROPERTIES CARRY THE SURFACE. The mapping (front is the setup, back is
 * the product, why carries the conditions) is what keeps a three-sided card
 * whole on every surface that predates sides, export and CSV included, so it
 * is pinned exactly. And the blocked-save copy is coach voice by rule, not by
 * taste: no scolding constructions and no rhetorical questions, which is
 * mechanical enough to assert.
 */

import { describe, expect, it } from "vitest";

import {
  EMPTY_SIDES,
  SIDE_LABELS,
  SIDE_ORDER,
  canSave,
  cardFromDraft,
  composedCardId,
  deckTitleProblem,
  draftProblems,
  newDeckId,
  setSide,
} from "../cards/ui/composer";
import type { ReactionSides } from "../cards/types";

const AT = new Date(2026, 7, 27, 12, 0, 0, 0);

const FULL: ReactionSides = {
  setup: "cyclopentene + NBS",
  conditions: "hv, heat",
  product: "3-bromocyclopentene",
};

describe("the pill's order", () => {
  it("is Setup, Conditions, Product, exactly the committed composer image", () => {
    expect(SIDE_ORDER).toEqual(["setup", "conditions", "product"]);
    expect(SIDE_ORDER.map((s) => SIDE_LABELS[s])).toEqual(["Setup", "Conditions", "Product"]);
  });
});

describe("editing a side", () => {
  it("replaces one side and never mutates the draft it was given", () => {
    const next = setSide(EMPTY_SIDES, "conditions", "hv");
    expect(next.conditions).toBe("hv");
    expect(next.setup).toBe("");
    expect(EMPTY_SIDES.conditions).toBe("");
  });
});

describe("what stands between a draft and a card", () => {
  it("an empty draft is three named next steps, setup first", () => {
    const problems = draftProblems(EMPTY_SIDES);
    expect(problems).toHaveLength(3);
    expect(problems[0]).toContain("setup");
    expect(canSave(EMPTY_SIDES)).toBe(false);
  });

  it("whitespace is not a side", () => {
    expect(canSave({ ...FULL, product: "   " })).toBe(false);
  });

  it("a full draft is saveable", () => {
    expect(draftProblems(FULL)).toEqual([]);
    expect(canSave(FULL)).toBe(true);
  });

  it("every problem sentence is coach voice: no scolding, no rhetorical questions", () => {
    for (const sentence of draftProblems(EMPTY_SIDES)) {
      expect(sentence).not.toMatch(/\?/);
      expect(sentence.toLowerCase()).not.toContain("should have");
      expect(sentence.toLowerCase()).not.toContain("you failed");
      expect(sentence.toLowerCase()).not.toContain("wrong");
    }
  });
});

describe("the one mapping from sides to a card", () => {
  it("front is the setup, back is the product, why carries the conditions", () => {
    const card = cardFromDraft(FULL, AT);
    expect(card.front).toBe(FULL.setup);
    expect(card.back).toBe(FULL.product);
    expect(card.why).toBe(`Conditions: ${FULL.conditions}`);
  });

  it("the card carries its sides verbatim, trimmed, and says it was composed", () => {
    const card = cardFromDraft(
      { setup: "  benzene + Br2 ", conditions: " FeBr3 ", product: " bromobenzene " },
      AT,
    );
    expect(card.sides).toEqual({ setup: "benzene + Br2", conditions: "FeBr3", product: "bromobenzene" });
    expect(card.source).toEqual({ kind: "composed", at: AT.toISOString() });
    expect(card.tags).toContain("composed");
  });

  it("the id is stable for the same draft at the same instant", () => {
    expect(cardFromDraft(FULL, AT).id).toBe(cardFromDraft(FULL, AT).id);
  });
});

describe("the composed id", () => {
  it("is namespaced, slugged, and capped", () => {
    const id = composedCardId(FULL, AT);
    expect(id.startsWith("composed:")).toBe(true);
    expect(id).toContain("cyclopentene-nbs");
    const long = composedCardId({ ...FULL, setup: "x".repeat(200) }, AT);
    expect(long.length).toBeLessThanOrEqual("composed:".length + 13 + 1 + 40);
  });
});

describe("where the card goes", () => {
  it("a new deck id lives in the personal namespace and survives slugging", () => {
    expect(newDeckId("EAS Reactions")).toBe("personal:eas-reactions");
    expect(newDeckId("   ")).toBe("personal:deck");
  });

  it("only an empty title is a problem, and the sentence names the next step", () => {
    expect(deckTitleProblem("Carbonyls")).toBeNull();
    const problem = deckTitleProblem("  ");
    expect(problem).not.toBeNull();
    expect(problem).not.toMatch(/\?/);
  });
});
