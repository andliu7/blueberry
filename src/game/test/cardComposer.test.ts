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
  EMPTY_QUIZ,
  EMPTY_SIDES,
  SELF_CHECK_BACK,
  addOption,
  quizCardFromDraft,
  quizProblems,
  removeOption,
  setOption,
  setQuizKind,
  toggleCorrect,
  type QuizDraft,
  SIDE_LABELS,
  SIDE_ORDER,
  canSave,
  cardFromDraft,
  composedCardId,
  deckTitleProblem,
  draftProblems,
  newDeckId,
  questionCardFromDraft,
  questionProblems,
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

/* The plain question shape, added with the 29 Sep rebuild so a card that is
   not a reaction has boxes that fit it. */
describe("a question card", () => {
  it("maps straight onto front, back and why, as the student wrote them", () => {
    const card = questionCardFromDraft({ front: " Most acidic proton? ", back: "The alpha one", why: "" }, AT);
    expect(card.front).toBe("Most acidic proton?");
    expect(card.back).toBe("The alpha one");
    expect(card.why).toBe("");
    expect(card.source).toEqual({ kind: "composed", at: AT.toISOString() });
    expect(card.sides).toBeUndefined();
    expect(card.reaction).toBeUndefined();
    expect(card.id.startsWith("composed:")).toBe(true);
  });

  it("needs a question and an answer, and says so in the coach voice", () => {
    expect(questionProblems({ front: "q", back: "a", why: "" })).toEqual([]);
    const problems = questionProblems({ front: " ", back: "", why: "because" });
    expect(problems).toHaveLength(2);
    for (const problem of problems) expect(problem).not.toMatch(/\?|wrong|must/i);
  });
});

describe("the four question types", () => {
  const base = { ...EMPTY_QUIZ, question: " Which is a Grignard reagent? " };

  it("a short answer needs a question and an answer, a long answer only the question", () => {
    expect(quizProblems(base)).toHaveLength(1);
    expect(quizProblems({ ...base, question: "" })).toHaveLength(2);
    expect(quizProblems({ ...base, kind: "long" })).toEqual([]);
    expect(quizProblems({ ...base, answer: "RMgX" })).toEqual([]);
  });

  it("a long answer with no model answer says it is checked by the student", () => {
    const card = quizCardFromDraft({ ...base, kind: "long" }, AT);
    expect(card.back).toBe(SELF_CHECK_BACK);
    expect(card.quiz).toEqual({ kind: "long" });
  });

  it("pick one: the mark is single, blank rows are dropped, indexes stay aligned", () => {
    let d: QuizDraft = setQuizKind(base, "mcq");
    d = setOption(setOption(addOption(d), 0, "NaCl"), 2, "CH3MgBr");
    d = toggleCorrect(toggleCorrect(d, 0), 2);
    expect(d.correct).toEqual([2]);
    expect(quizProblems(d)).toEqual([]);
    const card = quizCardFromDraft(d, AT);
    expect(card.quiz).toEqual({ kind: "mcq", options: ["NaCl", "CH3MgBr"], correct: [1] });
    expect(card.back).toBe("CH3MgBr");
    expect(card.front).toBe("Which is a Grignard reagent?");
  });

  it("pick many toggles, and switching down to pick one keeps one mark", () => {
    let d = setOption(setOption(setQuizKind(base, "multi"), 0, "a"), 1, "b");
    d = toggleCorrect(toggleCorrect(d, 0), 1);
    expect(quizCardFromDraft(d, AT).back).toBe("a; b");
    expect(setQuizKind(d, "mcq").correct).toEqual([0]);
    expect(toggleCorrect(d, 0).correct).toEqual([1]);
  });

  it("a choice card needs two options and a right one", () => {
    expect(quizProblems(setQuizKind(base, "mcq"))).toContain("Add at least two options.");
    const two = setOption(setOption(setQuizKind(base, "mcq"), 0, "a"), 1, "b");
    expect(quizProblems(two)[0]).toContain("right");
  });

  it("removing a row shifts the marks and never goes below two rows", () => {
    let d = setQuizKind(addOption(base), "multi");
    d = toggleCorrect(toggleCorrect(d, 1), 2);
    expect(removeOption(d, 0).correct).toEqual([0, 1]);
    expect(removeOption(setQuizKind(base, "mcq"), 0).options).toHaveLength(2);
  });
});
