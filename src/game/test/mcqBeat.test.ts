/**
 * The easy MCQ beat, tested where it can be tested: the authored corpus, the
 * authoring contract, the grader, and the card offer. No JSX is exercised here
 * because the suite runs in a node environment with no DOM, which is why
 * McqBeatView.tsx carries no rules of its own.
 *
 * The tests worth reading first are the two that pin properties rather than
 * examples: "every wrong option is explained, so the generic curriculum cause
 * can never surface", and "L0 clears the beat and still records what happened".
 * Both are contracts from CLAUDE.md and ../beats/types.ts rather than
 * implementation details, so they should survive any rewrite of the files under
 * them.
 */

import { describe, expect, it } from "vitest";

import { CONCEPTS, checkMultipleChoice, type ConceptId } from "@blueberry/curriculum";

import {
  MAX_BRIEF_CHARS,
  MAX_OPTIONS,
  MAX_OPTION_CHARS,
  MAX_PROMPT_CHARS,
  MCQ_BEATS,
  MCQ_NODES,
  MIN_OPTIONS,
  gradeMcq,
  mcqAnswerSpec,
  mcqAuthoringViolations,
  mcqBeatById,
  mcqBeatsAt,
  mcqBeatsForNode,
  mcqCardFor,
  mcqCardId,
  mcqCardOffer,
  mcqRecoFor,
  revealHeading,
  shouldOfferCard,
  CORRECT_CAUSE,
  DISTRACTOR_CAUSE,
} from "../beats/mcq";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import {
  DEFAULT_LEVELS,
  clearsBeat,
  isSound,
  levelRuleViolations,
  type MasteryLevel,
  type McqBeat,
} from "../beats/types";

const AT = "2026-08-27T09:00:00.000Z";

function beat(id: string): McqBeat {
  const found = mcqBeatById(id);
  if (found === null) throw new Error(`test fixture missing beat ${id}`);
  return found;
}

/* ------------------------------------------------------------------ */
/* The authoring contract                                              */
/* ------------------------------------------------------------------ */

describe("the authored corpus honours the easy contract", () => {
  it("reports no authoring violations", () => {
    expect(mcqAuthoringViolations(MCQ_BEATS)).toEqual([]);
  });

  it("reports no level rule violations against the beat union's own rule", () => {
    expect(levelRuleViolations(MCQ_BEATS)).toEqual([]);
  });

  it("never declares L3, because picking from a list is not producing", () => {
    expect(DEFAULT_LEVELS.mcq).not.toContain(3);
    for (const item of MCQ_BEATS) {
      expect(item.levels).not.toContain(3);
    }
  });

  it("keeps every option list to three or four short options", () => {
    for (const item of MCQ_BEATS) {
      expect(item.options.length).toBeGreaterThanOrEqual(MIN_OPTIONS);
      expect(item.options.length).toBeLessThanOrEqual(MAX_OPTIONS);
      for (const option of item.options) {
        expect(option.text.length).toBeLessThanOrEqual(MAX_OPTION_CHARS);
      }
      expect(item.prompt.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
      if (item.brief !== undefined) {
        expect(item.brief.length).toBeLessThanOrEqual(MAX_BRIEF_CHARS);
      }
    }
  });

  it("catches a beat that grew a fifth option, so the cap is real", () => {
    const wide: McqBeat = {
      ...beat("mcq-directing-meet"),
      id: "test-too-wide",
      options: [
        ...beat("mcq-directing-meet").options,
        { id: "x1", text: "A fourth", why: "Explained." },
        { id: "x2", text: "A fifth", why: "Explained." },
      ],
    };
    const rules = mcqAuthoringViolations([wide]).map((violation) => violation.rule);
    expect(rules.some((rule) => rule.includes("5 options"))).toBe(true);
  });

  it("catches a wrong option with no authored explanation", () => {
    const source = beat("mcq-phenol-reason");
    const bare: McqBeat = {
      ...source,
      id: "test-unexplained",
      options: source.options.map((option) =>
        option.id === source.correctOptionId ? option : { id: option.id, text: option.text },
      ),
    };
    const rules = mcqAuthoringViolations([bare]).map((violation) => violation.rule);
    expect(rules.some((rule) => rule.includes("no authored explanation"))).toBe(true);
  });

  it("catches copy that breaks CLAUDE.md's voice, using curriculum's own lint", () => {
    const source = beat("mcq-phenol-meet");
    const scolding: McqBeat = {
      ...source,
      id: "test-scolding",
      options: source.options.map((option) =>
        option.id === "cyclohexanol"
          ? { ...option, why: "You should have known cyclohexanol is the weaker acid." }
          : option,
      ),
    };
    const rules = mcqAuthoringViolations([scolding]).map((violation) => violation.rule);
    expect(rules.some((rule) => rule.includes("you should have"))).toBe(true);
  });

  it("catches an mcq beat reaching for L3", () => {
    const overreach: McqBeat = { ...beat("mcq-kvt-cold"), id: "test-l3", levels: [3] };
    const rules = mcqAuthoringViolations([overreach]).map((violation) => violation.rule);
    expect(rules.some((rule) => rule.includes("does not serve"))).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* The corpus points at things that exist                              */
/* ------------------------------------------------------------------ */

describe("the corpus points at real ids", () => {
  const nodeIds = new Set(
    PATHWAY_UNITS.flatMap((unit) => unit.nodes.map((node) => node.id)),
  );

  it("names only pathway nodes that exist", () => {
    for (const item of MCQ_BEATS) {
      expect(nodeIds.has(item.node)).toBe(true);
    }
  });

  it("names only curriculum concepts that exist", () => {
    const conceptIds = new Set(Object.keys(CONCEPTS) as ConceptId[]);
    for (const item of MCQ_BEATS) {
      for (const concept of item.conceptIds) {
        expect(conceptIds.has(concept as ConceptId)).toBe(true);
      }
    }
  });

  it("covers all four content targets the task names", () => {
    for (const node of MCQ_NODES) {
      expect(mcqBeatsForNode(node).length).toBeGreaterThan(0);
    }
    // Directing effects, kinetic against thermodynamic, nitro reduction,
    // phenol acidity. Both nitro nodes and both kinetic nodes are covered.
    expect(mcqBeatsForNode("u3-directing").length).toBeGreaterThanOrEqual(3);
    expect(mcqBeatsForNode("u1-kvt").length).toBeGreaterThanOrEqual(3);
    expect(mcqBeatsForNode("u9-kvt-enolate").length).toBeGreaterThanOrEqual(1);
    expect(mcqBeatsForNode("u3-nitro-red").length).toBeGreaterThanOrEqual(3);
    expect(mcqBeatsForNode("u10-nitro-red").length).toBeGreaterThanOrEqual(2);
    expect(mcqBeatsForNode("u11-acidity").length).toBeGreaterThanOrEqual(3);
  });

  it("offers a first meeting and a recall rung on the four topic entry nodes", () => {
    for (const node of ["u3-directing", "u1-kvt", "u3-nitro-red", "u11-acidity"]) {
      expect(mcqBeatsAt(MCQ_BEATS, node, 0).length).toBeGreaterThan(0);
      expect(mcqBeatsAt(MCQ_BEATS, node, 2).length).toBeGreaterThan(0);
    }
  });

  it("does not park the answer in one position across the set", () => {
    const counts = new Map<number, number>();
    for (const item of MCQ_BEATS) {
      const index = item.options.findIndex((option) => option.id === item.correctOptionId);
      counts.set(index, (counts.get(index) ?? 0) + 1);
    }
    // Option order is fixed rather than shuffled at runtime (see content.ts for
    // why), so authoring carries the whole burden of positional balance. No one
    // index may hold more than half the answers.
    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(Math.ceil(MCQ_BEATS.length / 2));
    }
  });
});

/* ------------------------------------------------------------------ */
/* Grading, through curriculum's checker                               */
/* ------------------------------------------------------------------ */

describe("grading runs on the curriculum multiple_choice kind", () => {
  it("builds a real MultipleChoiceAnswerSpec for every beat", () => {
    for (const item of MCQ_BEATS) {
      const spec = mcqAnswerSpec(item);
      expect(spec.kind).toBe("multiple_choice");
      expect(spec.options.length).toBe(item.options.length);
      expect(spec.correctOptionId).toBe(item.correctOptionId);
    }
  });

  it("agrees with checkMultipleChoice on every option of every beat", () => {
    for (const item of MCQ_BEATS) {
      const spec = mcqAnswerSpec(item);
      for (const option of item.options) {
        const verdict = checkMultipleChoice(spec, { kind: "multiple_choice", optionId: option.id });
        const reveal = gradeMcq({
          beat: item,
          level: 2,
          chosenId: option.id,
          elapsedMs: 1000,
          at: AT,
        });
        expect(reveal.matchedAnswer).toBe(verdict.outcome === "correct");
      }
    }
  });

  it("records a correct pick as correct, with the requested route cause", () => {
    const item = beat("mcq-kvt-statement");
    const reveal = gradeMcq({
      beat: item,
      level: 2,
      chosenId: item.correctOptionId,
      elapsedMs: 4200,
      at: AT,
    });
    expect(reveal.matchedAnswer).toBe(true);
    expect(reveal.result.kind).toBe("correct");
    expect(reveal.result.cause).toBe(CORRECT_CAUSE);
    expect(clearsBeat(reveal.result)).toBe(true);
    expect(reveal.result.elapsedMs).toBe(4200);
    expect(reveal.result.at).toBe(AT);
    expect(reveal.checkerCause).toBeNull();
  });

  it("records a wrong pick at a failing rung as invalid, carrying the distractor", () => {
    const reveal = gradeMcq({
      beat: beat("mcq-kvt-statement"),
      level: 2,
      chosenId: "faster",
      elapsedMs: 900,
      at: AT,
    });
    expect(reveal.matchedAnswer).toBe(false);
    expect(reveal.result.kind).toBe("invalid");
    expect(clearsBeat(reveal.result)).toBe(false);
    expect(isSound(reveal.result)).toBe(false);
    expect(reveal.result.distractorId).toBe("faster");
    // The option named a chemistry cause, so that is what is recorded.
    expect(reveal.result.cause).toBe("attacked_wrong_electrophilic_site");
  });

  it("falls back to the shape cause when the option names no chemistry cause", () => {
    const reveal = gradeMcq({
      beat: beat("mcq-kvt-statement"),
      level: 2,
      chosenId: "only",
      elapsedMs: 900,
      at: AT,
    });
    expect(reveal.result.cause).toBe(DISTRACTOR_CAUSE);
  });

  it("refuses an option id the beat does not have, rather than grading it", () => {
    expect(() =>
      gradeMcq({ beat: beat("mcq-kvt-cold"), level: 1, chosenId: "not-an-option", elapsedMs: 1, at: AT }),
    ).toThrow(/has no option/);
  });
});

/* ------------------------------------------------------------------ */
/* L0 cannot fail                                                      */
/* ------------------------------------------------------------------ */

describe("L0 is a first meeting and cannot fail", () => {
  const item = beat("mcq-nitro-meet");

  it("clears the beat on a wrong pick", () => {
    const reveal = gradeMcq({ beat: item, level: 0, chosenId: "phenol", elapsedMs: 500, at: AT });
    expect(reveal.matchedAnswer).toBe(false);
    expect(reveal.firstMeeting).toBe(true);
    expect(reveal.result.kind).toBe("correct");
    expect(clearsBeat(reveal.result)).toBe(true);
  });

  it("still records what actually happened, so the history is not a lie", () => {
    const reveal = gradeMcq({ beat: item, level: 0, chosenId: "phenol", elapsedMs: 500, at: AT });
    expect(reveal.result.cause).not.toBe(CORRECT_CAUSE);
    expect(reveal.result.distractorId).toBe("phenol");
  });

  it("says so on screen rather than showing a silent tick", () => {
    const reveal = gradeMcq({ beat: item, level: 0, chosenId: "phenol", elapsedMs: 500, at: AT });
    expect(revealHeading(reveal)).toMatch(/Nothing was riding on this one/);
  });

  it("does not soften the same pick at L1 or L2", () => {
    for (const level of [1, 2] as MasteryLevel[]) {
      const reveal = gradeMcq({ beat: item, level, chosenId: "phenol", elapsedMs: 500, at: AT });
      expect(reveal.firstMeeting).toBe(false);
      expect(reveal.result.kind).toBe("invalid");
    }
  });
});

/* ------------------------------------------------------------------ */
/* The feedback tier property                                          */
/* ------------------------------------------------------------------ */

describe("every wrong option resolves at Tier 2", () => {
  it("shows an authored explanation for every option of every beat", () => {
    for (const item of MCQ_BEATS) {
      for (const option of item.options) {
        const reveal = gradeMcq({
          beat: item,
          level: 1,
          chosenId: option.id,
          elapsedMs: 1,
          at: AT,
        });
        expect(reveal.chosenWhy.length).toBeGreaterThan(0);
        expect(reveal.answerWhy.length).toBeGreaterThan(0);
      }
    }
  });

  it("never lets the generic curriculum cause be what a student reads", () => {
    // packages/curriculum's registry says option_is_not_the_correct_one is
    // specificity `generic` and means a distractor is missing. It is on every
    // wrong verdict by construction, and it is on the reveal for the log only.
    for (const item of MCQ_BEATS) {
      for (const option of item.options) {
        if (option.id === item.correctOptionId) continue;
        const reveal = gradeMcq({ beat: item, level: 2, chosenId: option.id, elapsedMs: 1, at: AT });
        expect(reveal.checkerCause).toBe("option_is_not_the_correct_one");
        expect(reveal.chosenWhy).not.toContain("option_is_not_the_correct_one");
        expect(reveal.result.cause).not.toBe("option_is_not_the_correct_one");
      }
    }
  });

  it("explains a correct pick too, since a lucky guess teaches nothing", () => {
    const item = beat("mcq-phenol-reason");
    const reveal = gradeMcq({
      beat: item,
      level: 1,
      chosenId: item.correctOptionId,
      elapsedMs: 1,
      at: AT,
    });
    expect(reveal.chosenWhy).toBe(reveal.answerWhy);
    expect(reveal.chosenWhy.length).toBeGreaterThan(40);
    expect(revealHeading(reveal)).toBe("That is it.");
  });
});

/* ------------------------------------------------------------------ */
/* The card offer                                                      */
/* ------------------------------------------------------------------ */

describe("a miss offers a card", () => {
  const item = beat("mcq-directing-halogen");
  const missed = gradeMcq({
    beat: item,
    level: 2,
    chosenId: "deact-meta",
    elapsedMs: 3000,
    at: AT,
  });

  it("offers on a miss and stays quiet on a correct pick", () => {
    expect(shouldOfferCard(missed)).toBe(true);
    const hit = gradeMcq({
      beat: item,
      level: 2,
      chosenId: item.correctOptionId,
      elapsedMs: 3000,
      at: AT,
    });
    expect(shouldOfferCard(hit)).toBe(false);
  });

  it("offers on a first meeting miss too", () => {
    const meeting = gradeMcq({
      beat: beat("mcq-phenol-meet"),
      level: 0,
      chosenId: "same",
      elapsedMs: 100,
      at: AT,
    });
    expect(shouldOfferCard(meeting)).toBe(true);
  });

  it("builds a card that asks the question and carries the teaching line", () => {
    const card = mcqCardFor(item, missed, AT);
    expect(card.id).toBe(mcqCardId(item.id));
    expect(card.front).toBe(item.prompt);
    expect(card.back).toBe("Deactivating and ortho para directing");
    expect(card.why.length).toBeGreaterThan(40);
    expect(card.tags[0]).toBe("mistake");
    expect(card.tags).toContain("u3-directing");
    expect(card.tags).toContain("ewg_edg_rubric");
    expect(card.tags).toContain("regiochemistry_contradicts_stability");
    expect(card.source.kind).toBe("mistake");
    if (card.source.kind === "mistake") {
      expect(card.source.beatId).toBe(item.id);
      expect(card.source.cause).toBe("regiochemistry_contradicts_stability");
      expect(card.source.at).toBe(AT);
    }
  });

  it("keeps the card id stable, so a second miss updates rather than duplicates", () => {
    const again = gradeMcq({ beat: item, level: 2, chosenId: "act-meta", elapsedMs: 10, at: AT });
    expect(mcqCardFor(item, again, AT).id).toBe(mcqCardFor(item, missed, AT).id);
  });

  it("shares the mistake keyspace with the trainer without colliding with it", () => {
    // cards/Recommendation.tsx mints mistake:<reactionId>:<arrowKey> and
    // cards/ui/cardsFromBeats.ts mints beat:<beatId>. One prefix for "earned by
    // a miss", one segment keeping the two mistake sources apart.
    expect(mcqCardId(item.id)).toBe(`mistake:beat:${item.id}`);
    expect(mcqCardId(item.id).startsWith("mistake:")).toBe(true);
    expect(mcqCardId(item.id).startsWith("beat:")).toBe(false);
  });

  it("returns card and toast together, and null on a correct pick", () => {
    const offer = mcqCardOffer(item, missed, AT);
    expect(offer).not.toBeNull();
    expect(offer?.card.id).toBe(mcqCardId(item.id));
    expect(offer?.reco.cardId).toBe(mcqCardId(item.id));
    const hit = gradeMcq({
      beat: item,
      level: 2,
      chosenId: item.correctOptionId,
      elapsedMs: 10,
      at: AT,
    });
    expect(mcqCardOffer(item, hit, AT)).toBeNull();
  });

  it("uses the authored line for what they picked as the toast reason", () => {
    const reco = mcqRecoFor(item, missed, AT);
    expect(reco.cardId).toBe(mcqCardId(item.id));
    expect(reco.reason).toBe(missed.chosenWhy);
    expect(reco.seenAt).toBe(AT);
    // Specific to what the student did, never generic praise or blame: the
    // toast names the substituent they were reasoning about.
    expect(reco.reason).toContain("Bromine is the exception");
  });
});
