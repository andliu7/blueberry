/**
 * The ordering answer kind: the authoring refusals, the four named outcomes, and
 * the sweep that says what the checker does with every possible answer.
 *
 * The sweep at the bottom is the test worth reading. Four items have twenty
 * four orderings, so the whole answer space is enumerable in a test even though
 * it is far too large to author explanations for, and enumerating it is the only
 * way to know that the near miss rule catches what it claims and nothing else.
 */

import { describe, expect, it } from "vitest";
import {
  acceptedOrderings,
  checkOrdering,
  createOrderingAnswer,
  orderingBreakdown,
  orderingStateMatches,
  type OrderingState,
} from "../src/answers/ordering.ts";
import { gradeAttempt } from "../src/grading.ts";
import { createProblem } from "../src/problem.ts";
import { problemById } from "../src/corpus/index.ts";

const ladder = createOrderingAnswer({
  criterion: "most acidic",
  items: [
    { id: "acid", text: "A carboxylic acid O-H" },
    { id: "phenol", text: "A phenol O-H" },
    { id: "alcohol", text: "An alcohol O-H" },
    { id: "alkyne", text: "A terminal alkyne C-H" },
  ],
  correctOrder: ["acid", "phenol", "alcohol", "alkyne"],
});

function submit(...order: string[]): OrderingState {
  return { kind: "ordering", order };
}

/** Every ordering of the given ids. Used to sweep a whole answer space. */
function permutations<T>(items: readonly T[]): readonly (readonly T[])[] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([items[i] as T, ...tail]);
  }
  return out;
}

describe("authoring an ordering answer", () => {
  it("refuses fewer than three items, because two items is a multiple choice", () => {
    expect(() =>
      createOrderingAnswer({
        criterion: "most acidic",
        items: [
          { id: "a", text: "First" },
          { id: "b", text: "Second" },
        ],
        correctOrder: ["a", "b"],
      }),
    ).toThrow(/only two possible answers/);
  });

  it("refuses two items with the same id", () => {
    expect(() =>
      createOrderingAnswer({
        criterion: "most acidic",
        items: [
          { id: "a", text: "First" },
          { id: "a", text: "Also first" },
          { id: "c", text: "Third" },
        ],
        correctOrder: ["a", "a", "c"],
      }),
    ).toThrow(/two options with id/);
  });

  it("refuses an unlabelled criterion, because the ends of the track decide the answer", () => {
    expect(() =>
      createOrderingAnswer({
        criterion: "   ",
        items: [
          { id: "a", text: "First" },
          { id: "b", text: "Second" },
          { id: "c", text: "Third" },
        ],
        correctOrder: ["a", "b", "c"],
      }),
    ).toThrow(/needs a criterion/);
  });

  it("refuses an authored order that is not a permutation of the items", () => {
    expect(() =>
      createOrderingAnswer({
        criterion: "most acidic",
        items: [
          { id: "a", text: "First" },
          { id: "b", text: "Second" },
          { id: "c", text: "Third" },
        ],
        correctOrder: ["a", "b"],
      }),
    ).toThrow(/every item exactly once/);
  });

  it("refuses an accepted alternative that repeats the authored order", () => {
    expect(() =>
      createOrderingAnswer({
        criterion: "most acidic",
        items: [
          { id: "a", text: "First" },
          { id: "b", text: "Second" },
          { id: "c", text: "Third" },
        ],
        correctOrder: ["a", "b", "c"],
        acceptedAlternatives: [["a", "b", "c"]],
      }),
    ).toThrow(/accepts nothing new/);
  });

  it("refuses two accepted alternatives that are the same ordering", () => {
    expect(() =>
      createOrderingAnswer({
        criterion: "most acidic",
        items: [
          { id: "a", text: "First" },
          { id: "b", text: "Second" },
          { id: "c", text: "Third" },
        ],
        correctOrder: ["a", "b", "c"],
        acceptedAlternatives: [
          ["b", "a", "c"],
          ["b", "a", "c"],
        ],
      }),
    ).toThrow(/the same ordering/);
  });
});

describe("grading an ordering", () => {
  it("accepts the authored order", () => {
    expect(checkOrdering(ladder, submit("acid", "phenol", "alcohol", "alkyne"))).toEqual({
      outcome: "correct",
    });
  });

  it("names one adjacent pair swapped, and says which pair", () => {
    const verdict = checkOrdering(ladder, submit("phenol", "acid", "alcohol", "alkyne"));
    expect(verdict).toMatchObject({
      outcome: "wrong",
      cause: "ordering_one_adjacent_pair_swapped",
    });
    expect(verdict.outcome === "wrong" ? verdict.detail : "").toContain("acid");
    expect(verdict.outcome === "wrong" ? verdict.detail : "").toContain("phenol");
  });

  it("names a list built backwards separately from a list built wrong", () => {
    expect(checkOrdering(ladder, submit("alkyne", "alcohol", "phenol", "acid"))).toMatchObject({
      outcome: "wrong",
      cause: "ordering_is_reversed",
    });
  });

  it("names an unfinished track, and says what is still off it", () => {
    const verdict = checkOrdering(ladder, submit("acid", "phenol"));
    expect(verdict).toMatchObject({ outcome: "wrong", cause: "ordering_is_incomplete" });
    expect(verdict.outcome === "wrong" ? verdict.detail : "").toContain("alkyne");
  });

  it("falls to the tail when the order is wrong in more than one place", () => {
    expect(checkOrdering(ladder, submit("alcohol", "acid", "alkyne", "phenol"))).toMatchObject({
      outcome: "wrong",
      cause: "ordering_does_not_match",
    });
  });

  it("refuses to grade a list carrying an item this problem does not have", () => {
    expect(checkOrdering(ladder, submit("acid", "phenol", "alcohol", "ammonium"))).toMatchObject({
      outcome: "undecided",
      cause: "ordering_submission_is_not_from_the_item_list",
    });
  });

  it("refuses to grade a list carrying one item twice", () => {
    expect(checkOrdering(ladder, submit("acid", "acid", "alcohol", "alkyne"))).toMatchObject({
      outcome: "undecided",
      cause: "ordering_submission_is_not_from_the_item_list",
    });
  });
});

describe("an authored tie", () => {
  const tied = createOrderingAnswer({
    criterion: "most acidic",
    items: [
      { id: "acid", text: "A carboxylic acid O-H" },
      { id: "phenol", text: "A phenol O-H" },
      { id: "dicarbonyl", text: "The C-H between two carbonyls" },
      { id: "ketone", text: "The alpha C-H of a ketone" },
    ],
    correctOrder: ["acid", "phenol", "dicarbonyl", "ketone"],
    acceptedAlternatives: [["acid", "dicarbonyl", "phenol", "ketone"]],
  });

  it("accepts both orders across the tie", () => {
    expect(checkOrdering(tied, submit("acid", "phenol", "dicarbonyl", "ketone")).outcome).toBe(
      "correct",
    );
    expect(checkOrdering(tied, submit("acid", "dicarbonyl", "phenol", "ketone")).outcome).toBe(
      "correct",
    );
  });

  it("still calls a reversal a reversal, though an alternative is nearer by count", () => {
    // The reversal of the authored order differs from the ACCEPTED ALTERNATIVE
    // in only two positions, so a plain nearest-by-count rule would report "two
    // out of place" and lose the one sentence worth saying. This is the case
    // nearestAccepted exists for.
    const backwards = submit("ketone", "dicarbonyl", "phenol", "acid");
    expect(checkOrdering(tied, backwards)).toMatchObject({
      outcome: "wrong",
      cause: "ordering_is_reversed",
    });
  });

  it("reads a swap of the alternative as a swap", () => {
    expect(checkOrdering(tied, submit("dicarbonyl", "acid", "phenol", "ketone"))).toMatchObject({
      outcome: "wrong",
      cause: "ordering_one_adjacent_pair_swapped",
    });
  });

  it("lists both accepted orderings, the authored one first", () => {
    expect(acceptedOrderings(tied)[0]).toEqual(["acid", "phenol", "dicarbonyl", "ketone"]);
    expect(acceptedOrderings(tied)).toHaveLength(2);
  });
});

describe("the breakdown a shell renders from", () => {
  it("says which cards are already where they belong", () => {
    const breakdown = orderingBreakdown(ladder, submit("acid", "phenol", "alkyne", "alcohol"));
    expect(breakdown.inPlace).toEqual(["acid", "phenol"]);
    expect(breakdown.displaced).toEqual(["alkyne", "alcohol"]);
    expect(breakdown.swappedPair).toEqual(["alcohol", "alkyne"]);
    expect(breakdown.reversed).toBe(false);
    expect(breakdown.placed).toBe(4);
    expect(breakdown.total).toBe(4);
  });

  it("never decides correctness, so a correct answer has an empty displaced list", () => {
    const breakdown = orderingBreakdown(ladder, submit("acid", "phenol", "alcohol", "alkyne"));
    expect(breakdown.displaced).toEqual([]);
    expect(breakdown.inPlace).toHaveLength(4);
  });
});

describe("distractor matching", () => {
  it("matches on the exact sequence and nothing looser", () => {
    const target = submit("phenol", "acid", "alcohol", "alkyne");
    expect(orderingStateMatches(target, submit("phenol", "acid", "alcohol", "alkyne"))).toBe(true);
    expect(orderingStateMatches(target, submit("acid", "phenol", "alkyne", "alcohol"))).toBe(false);
  });

  it("resolves an authored wrong ladder at Tier 2, ahead of the diagnostic cause", () => {
    const problem = createProblem({
      id: "test-order-tier-2",
      course: "orgo_2",
      topic: "pka_and_acidity",
      difficulty: 1200,
      prompt: "Rank these four by acidity, most acidic first.",
      answer: ladder,
      solution: {
        whatHappened: "The carboxylic acid leads, then the phenol, then the alcohol, then the alkyne.",
        why: "Each rung follows from how widely the conjugate base spreads its charge.",
        lookAt: "Draw all four conjugate bases side by side before ranking them.",
      },
      distractors: [
        {
          id: "phenol-first",
          cause: "ordering_one_adjacent_pair_swapped",
          state: submit("phenol", "acid", "alcohol", "alkyne"),
          explanation: {
            whatHappened: "This places the phenol ahead of the carboxylic acid.",
            why: "A carboxylate splits its charge between two oxygens, which beats spreading it onto ring carbons.",
            lookAt: "Count the atoms carrying the charge in each conjugate base, then name the element each one is.",
          },
        },
      ],
    });

    const result = gradeAttempt(problem, submit("phenol", "acid", "alcohol", "alkyne"));
    expect(result).toMatchObject({ kind: "matched_distractor", tier: 2, distractorId: "phenol-first" });
  });

  it("refuses an authored distractor that grades correct", () => {
    expect(() =>
      createProblem({
        id: "test-order-second-right-answer",
        course: "orgo_2",
        topic: "pka_and_acidity",
        difficulty: 1200,
        prompt: "Rank these four by acidity, most acidic first.",
        answer: ladder,
        solution: {
          whatHappened: "The carboxylic acid leads the ladder.",
          why: "Its conjugate base splits the charge over two equivalent oxygens.",
          lookAt: "Draw the four conjugate bases before ranking them.",
        },
        distractors: [
          {
            id: "actually-the-answer",
            state: submit("acid", "phenol", "alcohol", "alkyne"),
            explanation: {
              whatHappened: "This is the authored ladder.",
              why: "It matches the answer, which is what makes it a defect rather than a distractor.",
              lookAt: "Compare this state against the authored order before shipping it.",
            },
          },
        ],
      }),
    ).toThrow(/grades CORRECT/);
  });
});

describe("the whole answer space of the authored acidity ladder", () => {
  // Every one of the twenty four orderings, sorted into buckets by what the
  // checker says about it. The counts are derived by hand in the comments and
  // asserted here, so a change to the near miss rule shows up as a number
  // moving rather than as a test nobody wrote.
  const problem = problemById("org2-order-acidity-ladder");
  const answer = problem.answer;

  it("sorts all twenty four into correct, swapped, reversed and the tail", () => {
    if (answer.kind !== "ordering") throw new Error("the acidity ladder is an ordering problem");
    const counts = new Map<string, number>();
    for (const order of permutations(answer.items.map((item) => item.id))) {
      const verdict = checkOrdering(answer, { kind: "ordering", order });
      const key = verdict.outcome === "correct" ? "correct" : verdict.cause;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    expect([...counts.values()].reduce((sum, count) => sum + count, 0)).toBe(24);
    // The authored order and the one accepted alternative across the tie.
    expect(counts.get("correct")).toBe(2);
    // Three adjacent swaps of each accepted ordering, less the one swap of each
    // that lands on the other accepted ordering.
    expect(counts.get("ordering_one_adjacent_pair_swapped")).toBe(4);
    // Both accepted orderings read backwards.
    expect(counts.get("ordering_is_reversed")).toBe(2);
    expect(counts.get("ordering_does_not_match")).toBe(16);
    // Nothing in a complete permutation is ever undecided or incomplete.
    expect(counts.get("ordering_submission_is_not_from_the_item_list")).toBeUndefined();
    expect(counts.get("ordering_is_incomplete")).toBeUndefined();
  });

  it("has no authored distractor sitting on an accepted ordering", () => {
    if (answer.kind !== "ordering") throw new Error("the acidity ladder is an ordering problem");
    for (const distractor of problem.distractors) {
      const state = distractor.state;
      if (state.kind !== "ordering") throw new Error("distractor kind mismatch");
      for (const accepted of acceptedOrderings(answer)) {
        expect(orderingStateMatches({ kind: "ordering", order: accepted }, state)).toBe(false);
      }
    }
  });
});
