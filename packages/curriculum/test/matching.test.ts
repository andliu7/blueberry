/**
 * The matching answer kind: the authoring refusals, the four named outcomes, the
 * breakdown a shell renders from, and the sweep over a whole board.
 *
 * The claim this file exists to hold down is the one in the checker's header:
 * on a BIJECTION exactly one wrong pair is impossible, so the near miss there is
 * the swap, and only a board that allows target reuse can produce a single wrong
 * pair. That is asserted by enumerating every board rather than by argument.
 */

import { describe, expect, it } from "vitest";
import {
  checkMatching,
  createMatchingAnswer,
  matchingBreakdown,
  matchingStateMatches,
  type MatchingPair,
  type MatchingState,
} from "../src/answers/matching.ts";
import { gradeAttempt } from "../src/grading.ts";
import { createProblem } from "../src/problem.ts";
import { problemById } from "../src/corpus/index.ts";

const bijection = createMatchingAnswer({
  prompts: [
    { id: "pcc", text: "PCC" },
    { id: "jones", text: "CrO3, aqueous acid" },
    { id: "nabh4", text: "NaBH4" },
    { id: "lialh4", text: "LiAlH4" },
  ],
  targets: [
    { id: "to-aldehyde", text: "Primary alcohol up to the aldehyde" },
    { id: "to-acid", text: "Primary alcohol up to the carboxylic acid" },
    { id: "ketone-down", text: "Ketone down to the alcohol, ester untouched" },
    { id: "ester-down", text: "Ester down to the primary alcohol" },
  ],
  pairs: [
    { promptId: "pcc", targetId: "to-aldehyde" },
    { promptId: "jones", targetId: "to-acid" },
    { promptId: "nabh4", targetId: "ketone-down" },
    { promptId: "lialh4", targetId: "ester-down" },
  ],
});

const reusable = createMatchingAnswer({
  allowTargetReuse: true,
  prompts: [
    { id: "socl2", text: "SOCl2" },
    { id: "dcc", text: "DCC" },
    { id: "pyridine", text: "Pyridine" },
    { id: "amine", text: "Ethylamine" },
  ],
  targets: [
    { id: "activate", text: "Activates the acid" },
    { id: "neutralise", text: "Takes up the acid byproduct" },
    { id: "nucleophile", text: "Supplies the nitrogen in the product" },
  ],
  pairs: [
    { promptId: "socl2", targetId: "activate" },
    { promptId: "dcc", targetId: "activate" },
    { promptId: "pyridine", targetId: "neutralise" },
    { promptId: "amine", targetId: "nucleophile" },
  ],
});

function board(...pairs: readonly [string, string][]): MatchingState {
  return { kind: "matching", pairs: pairs.map(([promptId, targetId]) => ({ promptId, targetId })) };
}

function permutations<T>(items: readonly T[]): readonly (readonly T[])[] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([items[i] as T, ...tail]);
  }
  return out;
}

describe("authoring a matching answer", () => {
  it("refuses a prompt and a target sharing an id", () => {
    expect(() =>
      createMatchingAnswer({
        prompts: [
          { id: "a", text: "Reagent A" },
          { id: "b", text: "Reagent B" },
        ],
        targets: [
          { id: "a", text: "Job A" },
          { id: "c", text: "Job C" },
        ],
        pairs: [
          { promptId: "a", targetId: "a" },
          { promptId: "b", targetId: "c" },
        ],
      }),
    ).toThrow(/appear in both columns/);
  });

  it("refuses a prompt with no target, because that row has no right answer", () => {
    expect(() =>
      createMatchingAnswer({
        prompts: [
          { id: "a", text: "Reagent A" },
          { id: "b", text: "Reagent B" },
        ],
        targets: [
          { id: "x", text: "Job X" },
          { id: "y", text: "Job Y" },
        ],
        pairs: [{ promptId: "a", targetId: "x" }],
      }),
    ).toThrow(/no target/);
  });

  it("refuses a prompt paired twice, because that row has two right answers", () => {
    expect(() =>
      createMatchingAnswer({
        prompts: [
          { id: "a", text: "Reagent A" },
          { id: "b", text: "Reagent B" },
        ],
        targets: [
          { id: "x", text: "Job X" },
          { id: "y", text: "Job Y" },
        ],
        pairs: [
          { promptId: "a", targetId: "x" },
          { promptId: "a", targetId: "y" },
          { promptId: "b", targetId: "y" },
        ],
      }),
    ).toThrow(/twice/);
  });

  it("refuses a target taking two prompts unless reuse is declared", () => {
    expect(() =>
      createMatchingAnswer({
        prompts: [
          { id: "a", text: "Reagent A" },
          { id: "b", text: "Reagent B" },
        ],
        targets: [
          { id: "x", text: "Job X" },
          { id: "y", text: "Job Y" },
        ],
        pairs: [
          { promptId: "a", targetId: "x" },
          { promptId: "b", targetId: "x" },
        ],
      }),
    ).toThrow(/allowTargetReuse is false/);
  });

  it("refuses a bijection that declares reuse, because that hides the swap", () => {
    expect(() =>
      createMatchingAnswer({
        allowTargetReuse: true,
        prompts: [
          { id: "a", text: "Reagent A" },
          { id: "b", text: "Reagent B" },
        ],
        targets: [
          { id: "x", text: "Job X" },
          { id: "y", text: "Job Y" },
        ],
        pairs: [
          { promptId: "a", targetId: "x" },
          { promptId: "b", targetId: "y" },
        ],
      }),
    ).toThrow(/bijection declared as something else/);
  });

  it("allows more targets than prompts, because a decoy job is a real distractor", () => {
    expect(() =>
      createMatchingAnswer({
        prompts: [
          { id: "a", text: "Reagent A" },
          { id: "b", text: "Reagent B" },
        ],
        targets: [
          { id: "x", text: "Job X" },
          { id: "y", text: "Job Y" },
          { id: "z", text: "A job nobody here does" },
        ],
        pairs: [
          { promptId: "a", targetId: "x" },
          { promptId: "b", targetId: "y" },
        ],
      }),
    ).not.toThrow();
  });
});

describe("grading a board", () => {
  it("accepts the authored board whatever order the pairs arrive in", () => {
    expect(
      checkMatching(
        bijection,
        board(
          ["lialh4", "ester-down"],
          ["pcc", "to-aldehyde"],
          ["nabh4", "ketone-down"],
          ["jones", "to-acid"],
        ),
      ),
    ).toEqual({ outcome: "correct" });
  });

  it("names two reagents in each other's places", () => {
    const verdict = checkMatching(
      bijection,
      board(
        ["pcc", "to-acid"],
        ["jones", "to-aldehyde"],
        ["nabh4", "ketone-down"],
        ["lialh4", "ester-down"],
      ),
    );
    expect(verdict).toMatchObject({ outcome: "wrong", cause: "matching_pairs_swapped" });
    expect(verdict.outcome === "wrong" ? verdict.detail : "").toContain("pcc");
    expect(verdict.outcome === "wrong" ? verdict.detail : "").toContain("jones");
  });

  it("names the one row that moved, on a board where jobs are shared", () => {
    const verdict = checkMatching(
      reusable,
      board(
        ["socl2", "activate"],
        ["dcc", "activate"],
        ["pyridine", "nucleophile"],
        ["amine", "nucleophile"],
      ),
    );
    expect(verdict).toMatchObject({ outcome: "wrong", cause: "matching_one_pair_wrong" });
    expect(verdict.outcome === "wrong" ? verdict.detail : "").toContain("pyridine");
    expect(verdict.outcome === "wrong" ? verdict.detail : "").toContain("3 of 4");
  });

  it("names an unfinished board before it counts anything wrong", () => {
    const verdict = checkMatching(
      bijection,
      board(["pcc", "to-aldehyde"], ["jones", "to-acid"], ["nabh4", "ketone-down"]),
    );
    expect(verdict).toMatchObject({ outcome: "wrong", cause: "matching_board_incomplete" });
    expect(verdict.outcome === "wrong" ? verdict.detail : "").toContain("lialh4");
  });

  it("falls to the tail when more than two rows are wrong and it is not one exchange", () => {
    expect(
      checkMatching(
        bijection,
        board(
          ["pcc", "ketone-down"],
          ["jones", "ester-down"],
          ["nabh4", "to-aldehyde"],
          ["lialh4", "to-acid"],
        ),
      ),
    ).toMatchObject({ outcome: "wrong", cause: "matching_does_not_match" });
  });

  it("refuses to grade a pair naming a prompt this board does not carry", () => {
    expect(
      checkMatching(
        bijection,
        board(
          ["dcc", "to-aldehyde"],
          ["jones", "to-acid"],
          ["nabh4", "ketone-down"],
          ["lialh4", "ester-down"],
        ),
      ),
    ).toMatchObject({
      outcome: "undecided",
      cause: "matching_submission_is_not_on_the_board",
    });
  });

  it("refuses to grade a pair naming a target this board does not carry", () => {
    expect(
      checkMatching(
        bijection,
        board(
          ["pcc", "to-amide"],
          ["jones", "to-acid"],
          ["nabh4", "ketone-down"],
          ["lialh4", "ester-down"],
        ),
      ),
    ).toMatchObject({
      outcome: "undecided",
      cause: "matching_submission_is_not_on_the_board",
    });
  });

  it("refuses to grade one prompt carrying two targets", () => {
    expect(
      checkMatching(
        bijection,
        board(
          ["pcc", "to-aldehyde"],
          ["pcc", "to-acid"],
          ["nabh4", "ketone-down"],
          ["lialh4", "ester-down"],
        ),
      ),
    ).toMatchObject({
      outcome: "undecided",
      cause: "matching_submission_is_not_on_the_board",
    });
  });
});

describe("the breakdown a shell renders from", () => {
  it("reports which pairs were right rather than failing the whole board", () => {
    const breakdown = matchingBreakdown(
      bijection,
      board(
        ["pcc", "to-aldehyde"],
        ["jones", "to-acid"],
        ["nabh4", "ester-down"],
        ["lialh4", "ketone-down"],
      ),
    );
    expect(breakdown.correctCount).toBe(2);
    expect(breakdown.total).toBe(4);
    expect(breakdown.correct.map((pair: MatchingPair) => pair.promptId)).toEqual(["pcc", "jones"]);
    expect(breakdown.wrong.map((pair: MatchingPair) => pair.promptId)).toEqual(["nabh4", "lialh4"]);
    expect(breakdown.unpaired).toEqual([]);
  });

  it("lists the rows still waiting", () => {
    const breakdown = matchingBreakdown(bijection, board(["pcc", "to-aldehyde"]));
    expect(breakdown.correctCount).toBe(1);
    expect(breakdown.unpaired).toEqual(["jones", "nabh4", "lialh4"]);
  });
});

describe("distractor matching", () => {
  it("ignores the order the pairs were dropped in", () => {
    const target = board(["pcc", "to-acid"], ["jones", "to-aldehyde"]);
    expect(matchingStateMatches(target, board(["jones", "to-aldehyde"], ["pcc", "to-acid"]))).toBe(
      true,
    );
    expect(matchingStateMatches(target, board(["pcc", "to-aldehyde"], ["jones", "to-acid"]))).toBe(
      false,
    );
  });

  it("resolves an authored wrong board at Tier 2", () => {
    const problem = createProblem({
      id: "test-match-tier-2",
      course: "orgo_2",
      topic: "oxidation_and_reduction_ladder",
      difficulty: 1100,
      prompt: "Match each reagent to the transformation it carries out.",
      answer: bijection,
      solution: {
        whatHappened: "PCC stops at the aldehyde and the aqueous oxidant carries on to the acid.",
        why: "Water lets the aldehyde form a hydrate, and the hydrate has a C-H the oxidant can take again.",
        lookAt: "Read the solvent beside each oxidant before pairing it.",
      },
      distractors: [
        {
          id: "oxidants-exchanged",
          cause: "matching_pairs_swapped",
          state: board(
            ["pcc", "to-acid"],
            ["jones", "to-aldehyde"],
            ["nabh4", "ketone-down"],
            ["lialh4", "ester-down"],
          ),
          explanation: {
            whatHappened: "The two chromium oxidants are in each other's places.",
            why: "The solvent is the whole difference: aqueous conditions carry the aldehyde on to the acid.",
            lookAt: "Read the solvent beside each oxidant, since both are the same metal.",
          },
        },
      ],
    });

    const result = gradeAttempt(
      problem,
      board(
        ["pcc", "to-acid"],
        ["jones", "to-aldehyde"],
        ["nabh4", "ketone-down"],
        ["lialh4", "ester-down"],
      ),
    );
    expect(result).toMatchObject({
      kind: "matched_distractor",
      tier: 2,
      distractorId: "oxidants-exchanged",
    });
  });

  it("refuses an authored distractor the checker cannot grade", () => {
    expect(() =>
      createProblem({
        id: "test-match-undecidable-distractor",
        course: "orgo_2",
        topic: "oxidation_and_reduction_ladder",
        difficulty: 1100,
        prompt: "Match each reagent to the transformation it carries out.",
        answer: bijection,
        solution: {
          whatHappened: "PCC stops at the aldehyde.",
          why: "Without water there is no hydrate for the oxidant to take a second hydrogen from.",
          lookAt: "Read the solvent beside each oxidant.",
        },
        distractors: [
          {
            id: "off-the-board",
            state: board(
              ["pcc", "to-amide"],
              ["jones", "to-acid"],
              ["nabh4", "ketone-down"],
              ["lialh4", "ester-down"],
            ),
            explanation: {
              whatHappened: "This board names a job the problem does not offer.",
              why: "A pairing the checker cannot decide about can never match, so it would teach nobody.",
              lookAt: "Check every id in a distractor against the authored columns.",
            },
          },
        ],
      }),
    ).toThrow(/cannot be graded/);
  });
});

describe("every board a student can build", () => {
  it("never reports one wrong pair on a bijection, because one is impossible there", () => {
    const promptIds = bijection.prompts.map((prompt) => prompt.id);
    const targetIds = bijection.targets.map((target) => target.id);
    const counts = new Map<string, number>();
    for (const assignment of permutations(targetIds)) {
      const pairs = promptIds.map((promptId, index) => ({
        promptId,
        targetId: assignment[index] as string,
      }));
      const verdict = checkMatching(bijection, { kind: "matching", pairs });
      const key = verdict.outcome === "correct" ? "correct" : verdict.cause;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    expect([...counts.values()].reduce((sum, count) => sum + count, 0)).toBe(24);
    expect(counts.get("correct")).toBe(1);
    // Six pairs of prompts, so six single exchanges.
    expect(counts.get("matching_pairs_swapped")).toBe(6);
    expect(counts.get("matching_one_pair_wrong")).toBeUndefined();
    expect(counts.get("matching_does_not_match")).toBe(17);
  });

  it("does report one wrong pair on a board where a job is shared", () => {
    const promptIds = reusable.prompts.map((prompt) => prompt.id);
    const targetIds = reusable.targets.map((target) => target.id);
    let singles = 0;
    // Every assignment of three targets across four prompts, all 81 of them.
    for (const a of targetIds)
      for (const b of targetIds)
        for (const c of targetIds)
          for (const d of targetIds) {
            const pairs = promptIds.map((promptId, index) => ({
              promptId,
              targetId: [a, b, c, d][index] as string,
            }));
            const verdict = checkMatching(reusable, { kind: "matching", pairs });
            if (verdict.outcome === "wrong" && verdict.cause === "matching_one_pair_wrong") {
              singles += 1;
            }
          }
    // Four rows, each movable to two other targets.
    expect(singles).toBe(8);
  });

  it("grades the authored corpus board and its distractors as the corpus claims", () => {
    const problem = problemById("org2-match-acyl-synthesis-jobs");
    for (const distractor of problem.distractors) {
      const result = gradeAttempt(problem, distractor.state);
      expect(result, `${problem.id}/${distractor.id}`).toMatchObject({
        kind: "matched_distractor",
        distractorId: distractor.id,
      });
    }
  });
});
