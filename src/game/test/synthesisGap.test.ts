/**
 * The synthesis gap's logic, tested where the decisions actually live: the
 * parser, the grader and the level rule. The React surface is not tested here
 * for the reason apps/web/vitest.config.ts already gives: asserting JSX output
 * asserts the implementation rather than the design, and the whole beat was
 * built so that everything worth checking is a pure function outside the
 * component.
 */

import { describe, expect, it } from "vitest";
import {
  answerVocabulary,
  foldToVocabulary,
  parseTypedAnswer,
  splitTypedAnswer,
} from "../beats/synthesis/parse";
import {
  beatCauseForCurriculumCause,
  explainSynthesisResult,
  gradeSynthesisGap,
} from "../beats/synthesis/grade";
import { levelToPlay, synthesisBeat } from "../beats/synthesis/beats";
import {
  cardFromMistake,
  offerCardForMistake,
  shouldOfferCard,
} from "../beats/synthesis/cards";
import {
  createSynthesisGapProblem,
  structureAnswerIsSelfConsistent,
} from "../beats/synthesis/problem";
import { SYNTHESIS_GAPS, synthesisGapById } from "../beats/synthesis/corpus";
import type { BeatResult, MasteryLevel } from "../beats/types";

const NOW = new Date("2026-08-27T10:00:00.000Z");

function problem(id: string) {
  const found = synthesisGapById(id);
  if (found === undefined) throw new Error(`no corpus problem ${id}`);
  return found;
}

function gradeTyped(id: string, text: string, level: MasteryLevel = 3): BeatResult {
  return gradeSynthesisGap({
    problem: problem(id),
    submission: { mode: "typed", text },
    level,
    elapsedMs: 4200,
    now: NOW,
  });
}

function gradePicked(id: string, optionId: string, reasonId: string | null = null): BeatResult {
  return gradeSynthesisGap({
    problem: problem(id),
    submission: { mode: "picked", optionId, reasonId },
    level: 2,
    elapsedMs: 4200,
    now: NOW,
  });
}

/* ------------------------------------------------------------------ */

describe("splitTypedAnswer", () => {
  it("reads a numbered two part condition the way an exam key writes it", () => {
    expect(splitTypedAnswer("1) BH3, THF  2) H2O2, NaOH")).toEqual([
      ["BH3", "THF"],
      ["H2O2", "NaOH"],
    ]);
  });

  it("accepts a semicolon or the word then for the same thing", () => {
    const expected = [
      ["BH3", "THF"],
      ["H2O2", "NaOH"],
    ];
    expect(splitTypedAnswer("BH3, THF; H2O2, NaOH")).toEqual(expected);
    expect(splitTypedAnswer("BH3, THF then H2O2, NaOH")).toEqual(expected);
  });

  it("does not mistake the bracket inside NaOC(CH3)3 for a step marker", () => {
    // The regression this guards: a naive /\d[).]/ splits the answer to the
    // very first problem in the corpus into two meaningless halves.
    expect(splitTypedAnswer("NaOC(CH3)3")).toEqual([["NaOC(CH3)3"]]);
  });

  it("keeps a slash inside one token, because Pd/C is one reagent", () => {
    expect(splitTypedAnswer("H2, Pd/C")).toEqual([["H2", "Pd/C"]]);
  });

  it("keeps a locant comma inside one molecule name and still splits a list", () => {
    // The regression this guards: "3-methyl-1,2-epoxybutane" is one molecule
    // and arrived as two tokens until the comma rule learned about locants.
    expect(splitTypedAnswer("3-methyl-1,2-epoxybutane")).toEqual([["3-methyl-1,2-epoxybutane"]]);
    expect(splitTypedAnswer("ethylene glycol, TsOH")).toEqual([["ethylene glycol", "TsOH"]]);
    expect(splitTypedAnswer("LDA,-78 C")).toEqual([["LDA", "-78 C"]]);
  });

  it("folds subscripts and every dash a PDF can produce", () => {
    expect(splitTypedAnswer("Br₂, hv")).toEqual([["Br2", "hv"]]);
    expect(splitTypedAnswer("LDA, –78 °C")).toEqual([["LDA", "-78 °C"]]);
  });

  it("returns nothing for an empty answer rather than one empty step", () => {
    expect(splitTypedAnswer("   ")).toEqual([]);
  });
});

describe("foldToVocabulary", () => {
  const vocabulary = new Set(["NaOH", "TFA"]);

  it("folds a token whose only case-insensitive match is one authored spelling", () => {
    expect(foldToVocabulary("naoh", vocabulary)).toBe("NaOH");
    expect(foldToVocabulary("tfa", vocabulary)).toBe("TFA");
  });

  it("refuses to choose when two authored spellings differ only by case", () => {
    // CO and Co are different things, which is why reagents.ts preserves case.
    // An ambiguous fold has to leave the token exactly as typed.
    const ambiguous = new Set(["CO", "Co"]);
    expect(foldToVocabulary("co", ambiguous)).toBe("co");
  });

  it("leaves a token nothing matches alone", () => {
    expect(foldToVocabulary("KMnO4", vocabulary)).toBe("KMnO4");
  });

  it("parses and folds in one call", () => {
    const boc = problem("syn-u14-boc-orthogonality");
    if (boc.typed === null) throw new Error("the Boc gap should carry a typed answer");
    expect(parseTypedAnswer("tfa", boc.typed.spec, boc.bank)).toEqual([{ reagents: ["TFA"] }]);
  });

  it("collects the answer, the alternatives, the equivalents and the chips", () => {
    const boc = problem("syn-u14-boc-orthogonality");
    if (boc.typed === null) throw new Error("the Boc gap should carry a typed answer");
    const vocab = answerVocabulary(boc.typed.spec, boc.bank);
    expect(vocab.has("TFA")).toBe(true);
    expect(vocab.has("trifluoroacetic acid")).toBe(true);
    expect(vocab.has("HCl")).toBe(true);
    expect(vocab.has("piperidine")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */

describe("grading a typed reagent gap", () => {
  it("accepts the answer typed in the wrong case", () => {
    const result = gradeTyped("syn-u3-butane-acid", "naoc(ch3)3");
    expect(result.kind).toBe("correct");
    expect(result.cause).toBe("matches_requested_route");
    expect(result.level).toBe(3);
  });

  it("accepts an authored equivalent", () => {
    expect(gradeTyped("syn-u3-butane-acid", "potassium tert-butoxide").kind).toBe("correct");
  });

  it("names the route when a different accepted answer was taken", () => {
    const result = gradeTyped("syn-u14-boc-orthogonality", "HCl, dioxane");
    expect(result.kind).toBe("correct_alternative_route");
    if (result.kind !== "correct_alternative_route") throw new Error("unreachable");
    expect(result.routeTaken).toContain("HCl in dioxane");
    expect(result.cause).toBe("alternative_route_same_product");
  });

  it("reads a two part condition as two steps and grades it correct", () => {
    expect(gradeTyped("syn-u3-methylenecyclohexane", "1) BH3, THF 2) H2O2, NaOH").kind).toBe(
      "correct",
    );
  });

  it("names the order when the same two steps arrive backwards", () => {
    const result = gradeTyped("syn-u3-methylenecyclohexane", "1) H2O2, NaOH 2) BH3, THF");
    expect(result.kind).toBe("invalid");
    expect(result.cause).toBe("synthesis_step_out_of_order");
  });

  it("says a piece is missing when only half the condition is typed", () => {
    const result = gradeTyped("syn-u3-methylenecyclohexane", "BH3, THF");
    expect(result.kind).toBe("invalid");
    expect(result.cause).toBe("synthesis_step_missing");
  });

  it("resolves a typed answer that matches an authored chip to THAT chip, not to a diagnostic", () => {
    // CLAUDE.md's specificity refinement: an instructor's sentence about this
    // exact mistake beats a generic one about reagent sets, and this is the
    // test that keeps the two in that order.
    const result = gradeTyped("syn-u3-butane-acid", "NaOCH3");
    expect(result.kind).toBe("valid_not_requested");
    if (result.kind !== "valid_not_requested") throw new Error("unreachable");
    expect(result.built).toContain("2-butene");
    expect(result.distractorId).toBe("opt-naome");
  });

  it("falls to the diagnostic tail only when nothing authored matches", () => {
    const result = gradeTyped("syn-u3-butane-acid", "KMnO4");
    expect(result.kind).toBe("invalid");
    expect(result.cause).toBe("reagent_right_class_wrong_reagent");
    expect(result.distractorId).toBeUndefined();
  });

  it("says a piece is missing when nothing was typed at all", () => {
    expect(gradeTyped("syn-u3-butane-acid", "  ").cause).toBe("synthesis_step_missing");
  });
});

describe("grading a picked chip", () => {
  it("marks the answer chip correct", () => {
    expect(gradePicked("syn-u3-butane-acid", "opt-tbuo").kind).toBe("correct");
  });

  it("gives a sound but different chip result type three, with the product named", () => {
    const result = gradePicked("syn-u3-methylenecyclohexane", "opt-acid-hydration");
    expect(result.kind).toBe("valid_not_requested");
    if (result.kind !== "valid_not_requested") throw new Error("unreachable");
    expect(result.built).toContain("Markovnikov");
    expect(result.cause).toBe("valid_transformation_not_requested");
  });

  it("resolves a chip with no valid product to its own authored copy", () => {
    const result = gradePicked("syn-u14-boc-orthogonality", "opt-piperidine");
    expect(result.kind).toBe("invalid");
    expect(result.cause).toBe("chose_authored_distractor");
    expect(result.distractorId).toBe("opt-piperidine");
  });

  it("throws on a chip the problem does not have", () => {
    expect(() => gradePicked("syn-u3-butane-acid", "opt-nonsense")).toThrow(/no chip/);
  });
});

describe("grading a reactant gap through checkStructure", () => {
  it("marks the authored epoxide correct", () => {
    expect(gradePicked("syn-u3-grignard-epoxide", "opt-epox-isopropyl").kind).toBe("correct");
  });

  it("separates an isomer of the answer from the answer", () => {
    // 2-propyloxirane is C5H10O, exactly like the answer, so the formula gate
    // cannot separate them and the isomorphism search has to.
    const result = gradePicked("syn-u3-grignard-epoxide", "opt-epox-propyl");
    expect(result.kind).toBe("valid_not_requested");
    if (result.kind !== "valid_not_requested") throw new Error("unreachable");
    expect(result.built).toContain("1-phenylpentan-2-ol");
  });

  it("grades a typed molecule name through the same accepted equivalents", () => {
    expect(gradeTyped("syn-u3-grignard-epoxide", "3-methyl-1,2-epoxybutane").kind).toBe("correct");
  });

  it("keeps every corpus answer chip self consistent with checkStructure", () => {
    for (const gap of SYNTHESIS_GAPS) {
      expect(structureAnswerIsSelfConsistent(gap), `${gap.id} answer chip`).toBe(true);
    }
  });
});

describe("grading a product gap through checkMajorProduct", () => {
  const id = "syn-u9-decarb-order";

  it("needs the product and the reason together", () => {
    expect(gradePicked(id, "opt-cyclohexanone", "rsn-six-membered").kind).toBe("correct");
  });

  it("resolves a right product with a wrong argument to the argument's own copy", () => {
    const result = gradePicked(id, "opt-cyclohexanone", "rsn-enol");
    expect(result.kind).toBe("invalid");
    expect(result.distractorId).toBe("rsn-enol");
    const explained = explainSynthesisResult(problem(id), result);
    expect(explained.body).toContain("enol is on the path");
  });

  it("lets the wrong product speak first when both are wrong", () => {
    const result = gradePicked(id, "opt-2-methyl", "rsn-enol");
    expect(result.distractorId).toBe("opt-2-methyl");
  });

  it("refuses a typed submission, because the ranking argument is a choice", () => {
    expect(() => gradeTyped(id, "cyclohexanone", 2)).toThrow(/answered by choosing/);
  });

  it("declares L2 only, so L3 can never select it", () => {
    expect(problem(id).levels).toEqual([2]);
    expect(synthesisBeat(problem(id)).levels).toEqual([2]);
  });
});

/* ------------------------------------------------------------------ */

describe("beatCauseForCurriculumCause", () => {
  it("maps the reagent diagnoses onto shape causes", () => {
    expect(beatCauseForCurriculumCause("reagent_set_incomplete")).toBe("synthesis_step_missing");
    expect(beatCauseForCurriculumCause("synthesis_step_count_wrong")).toBe("synthesis_step_missing");
    expect(beatCauseForCurriculumCause("synthesis_steps_out_of_order")).toBe(
      "synthesis_step_out_of_order",
    );
    expect(beatCauseForCurriculumCause("reagent_set_has_extra_reagent")).toBe(
      "reagent_right_class_wrong_reagent",
    );
  });

  it("sends anything it does not recognise to the logged tail rather than guessing", () => {
    expect(beatCauseForCurriculumCause("structure_is_an_isomer_of_the_answer")).toBe(
      "no_named_cause_logged",
    );
  });
});

describe("levelToPlay", () => {
  const productGap = problem("syn-u9-decarb-order");
  const reagentGap = problem("syn-u3-butane-acid");

  it("serves the rung that was asked for when the problem declares it", () => {
    expect(levelToPlay(reagentGap, 3)).toBe(3);
    expect(levelToPlay(reagentGap, 2)).toBe(2);
  });

  it("never serves above the rung that was asked for", () => {
    // The mastery rule made a test: an L2-only problem asked for at L3 drops to
    // L2, and an L2/L3 problem asked for at L1 drops to L2 rather than to L3.
    expect(levelToPlay(productGap, 3)).toBe(2);
    expect(levelToPlay(reagentGap, 1)).toBe(2);
    expect(levelToPlay(reagentGap, 0)).toBe(2);
  });
});

/* ------------------------------------------------------------------ */

describe("the card a mistake offers", () => {
  const gap = problem("syn-u3-butane-acid");

  it("offers on a miss and stays quiet on a correct answer", () => {
    expect(shouldOfferCard(gradePicked("syn-u3-butane-acid", "opt-naome"))).toBe(true);
    expect(shouldOfferCard(gradePicked("syn-u3-butane-acid", "opt-tbuo"))).toBe(false);
  });

  it("stays quiet when the student found a second valid route", () => {
    expect(shouldOfferCard(gradeTyped("syn-u14-boc-orthogonality", "HCl, dioxane"))).toBe(false);
  });

  it("carries the cause, so the card drills the mistake and not just the fact", () => {
    const result = gradePicked("syn-u3-butane-acid", "opt-naome");
    const card = cardFromMistake(gap, result);
    expect(card.source.kind).toBe("mistake");
    if (card.source.kind !== "mistake") throw new Error("unreachable");
    expect(card.source.cause).toBe(result.cause);
    expect(card.source.at).toBe(NOW.toISOString());
    expect(card.back).toBe("NaOC(CH₃)₃");
  });

  it("prefers the matched chip's authored copy for the card's why", () => {
    const result = gradePicked("syn-u3-butane-acid", "opt-naome");
    expect(cardFromMistake(gap, result).why).toContain("Zaitsev");
  });

  it("writes a toast line that names what the student actually did", () => {
    const result = gradePicked("syn-u3-butane-acid", "opt-naome");
    const offer = offerCardForMistake(gap, result, NOW);
    expect(offer.reco.cardId).toBe(offer.card.id);
    expect(offer.reco.reason).toContain("2-butene");
    expect(offer.reco.seenAt).toBe(NOW.toISOString());
  });
});

/* ------------------------------------------------------------------ */

describe("createSynthesisGapProblem refuses malformed authoring", () => {
  const base = {
    id: "test-gap",
    node: "u3-sequencing",
    conceptIds: ["order-of-operations"],
    gapKind: "reagent" as const,
    prompt: "Fill the blank.",
    start: "A",
    target: "C",
    steps: [
      { id: "s1", over: null, produces: "B" },
      { id: "s2", over: "PCC", produces: "C" },
    ],
    bank: [
      { id: "right", text: "NaOH", answer: [["NaOH"]] },
      { id: "wrong", text: "PCC", answer: [["PCC"]], why: "PCC oxidises; it does not eliminate." },
    ],
    correctOptionId: "right",
    typed: { mode: "set" as const, steps: [["NaOH"]], placeholder: "Type it" },
    why: "Because.",
    source: { file: "Synthesis Practice Problems_KEY.pdf", locator: "problem 1" },
    diamonds: 10,
  };

  it("constructs the well formed one", () => {
    expect(createSynthesisGapProblem(base).gapStepId).toBe("s1");
  });

  it("refuses a row with two blanks", () => {
    expect(() =>
      createSynthesisGapProblem({
        ...base,
        steps: [
          { id: "s1", over: null, produces: "B" },
          { id: "s2", over: null, produces: "C" },
        ],
      }),
    ).toThrow(/exactly one/);
  });

  it("refuses a row with no blank at all", () => {
    expect(() =>
      createSynthesisGapProblem({
        ...base,
        steps: [
          { id: "s1", over: "NaOH", produces: "B" },
          { id: "s2", over: "PCC", produces: "C" },
        ],
      }),
    ).toThrow(/exactly one/);
  });

  it("refuses a wrong chip with no authored explanation", () => {
    expect(() =>
      createSynthesisGapProblem({
        ...base,
        bank: [
          { id: "right", text: "NaOH", answer: [["NaOH"]] },
          { id: "wrong", text: "PCC", answer: [["PCC"]] },
        ],
      }),
    ).toThrow(/no authored explanation/);
  });

  it("refuses a wrong chip the reagent checker would accept", () => {
    // The worst defect this shape allows: the chip labelled wrong is graded
    // right, and the sentence written beside it never runs.
    expect(() =>
      createSynthesisGapProblem({
        ...base,
        bank: [
          { id: "right", text: "NaOH", answer: [["NaOH"]] },
          {
            id: "wrong",
            text: "Sodium hydroxide",
            answer: [["NaOH"]],
            why: "Same reagent, written out.",
          },
        ],
      }),
    ).toThrow(/checker accepts it/);
  });

  it("refuses a problem with no source", () => {
    expect(() =>
      createSynthesisGapProblem({ ...base, source: { file: "", locator: "problem 1" } }),
    ).toThrow(/source file/);
  });

  it("refuses a reactant gap whose chips carry no structure", () => {
    expect(() => createSynthesisGapProblem({ ...base, gapKind: "reactant" })).toThrow(
      /carries no structure/,
    );
  });

  it("refuses a product gap that also offers a typed answer", () => {
    expect(() =>
      createSynthesisGapProblem({
        ...base,
        gapKind: "product",
        steps: [
          { id: "s1", over: "Δ", produces: null },
          { id: "s2", over: "PCC", produces: "C" },
        ],
        bank: [
          { id: "right", text: "B" },
          { id: "wrong", text: "D", why: "Nothing here makes D." },
        ],
        reasons: [
          { id: "r1", text: "Because it does" },
          { id: "r2", text: "Because of strain", why: "Strain is not what drives it." },
        ],
        correctReasonId: "r1",
      }),
    ).toThrow(/L2 only/);
  });
});
