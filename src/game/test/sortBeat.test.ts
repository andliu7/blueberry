/**
 * Sort the cards: the logic under the drag.
 *
 * WHAT IS WORTH TESTING HERE AND WHAT IS NOT. The React component is judged by
 * eye and measured by the frame and contrast scripts, per the note at the top
 * of vitest.config.ts, so nothing below renders JSX. What IS worth pinning is
 * everything the component delegates to: the board invariant that no gesture
 * may ever lose a card, the grading translation that decides whether a student
 * is told "wrong" or "the right ladder, upside down", and the professor
 * adjustable pKa layer, whose whole job is to flag a contradiction rather than
 * teach one.
 *
 * THE INVARIANT, stated once because four tests lean on it: rungs plus pool
 * always hold every card exactly once. A drag that drops a card on an occupied
 * rung, a keyboard nudge off the end of the track, a tap that swaps two rungs:
 * none of them may duplicate or delete a card. That is fuzzed rather than
 * argued, over a random walk of every move the surface can make.
 */

import { describe, expect, it } from "vitest";

import {
  allCards,
  applyDrop,
  boardIsComplete,
  boardOrder,
  emptyBoard,
  emptyRungCount,
  hitTarget,
  nudge,
  openingBoard,
  placeOf,
  placeOnRung,
  returnToPool,
  shuffled,
  type DropTarget,
  type SortBoard,
  type TargetRect,
} from "../beats/sort/board";
import { judgeSort } from "../beats/sort/judge";
import { SORT_LADDERS, sortContentById, type SortContent } from "../beats/sort/ladders";
import {
  COURSE_PRESET_ID,
  DEFAULT_PKA_SETTINGS,
  TEXTBOOK_PRESET_ID,
  sortBeatPkaConflicts,
  type PkaSettingsSnapshot,
} from "../settings/pka";
import { DEFAULT_LEVELS, levelRuleViolations } from "../beats/types";
import { createOrderingAnswer, createProblem } from "@blueberry/curriculum";

const CARDS = ["a", "b", "c", "d"] as const;
const CONTEXT = { level: 2, elapsedMs: 4200, at: "2026-08-27T10:00:00.000Z" } as const;

function boardFrom(order: readonly string[]): SortBoard {
  let board = emptyBoard(order);
  order.forEach((card, index) => {
    board = placeOnRung(board, card, index);
  });
  return board;
}

/**
 * A ladder with no authored distractors, so the Tier 1 copy is what answers.
 *
 * Built here rather than shipped in ladders.ts because it is not chemistry a
 * student should ever meet: it exists to reach the branch that every authored
 * ladder currently pre-empts with a Tier 2 explanation.
 */
function bareContent(): SortContent {
  const answer = createOrderingAnswer({
    criterion: "hottest",
    items: [
      { id: "x", text: "A flame" },
      { id: "y", text: "A kettle" },
      { id: "z", text: "A window" },
    ],
    correctOrder: ["x", "y", "z"],
  });
  const problem = createProblem({
    id: "test-order-bare",
    course: "orgo_2",
    topic: "pka_and_acidity",
    difficulty: 1000,
    prompt: "Order these by temperature, hottest first.",
    answer,
    solution: {
      whatHappened: "Flame, kettle, window.",
      why: "A fixture, so this text is here to satisfy the voice contract rather than to teach.",
      lookAt: "Nothing. This problem is a test fixture and is never served to a student.",
    },
  });
  return {
    beat: {
      kind: "sort",
      id: "test-sort-bare",
      node: "pka_and_acidity",
      conceptIds: [],
      levels: [2],
      prompt: "Order these by temperature, hottest first.",
      criterion: "pka",
      direction: "descending",
      items: [
        { id: "x", label: "A flame", why: "hot" },
        { id: "y", label: "A kettle", why: "warm" },
        { id: "z", label: "A window", why: "cold" },
      ],
      order: ["x", "y", "z"],
    },
    problem,
    spec: answer,
    trackEnds: { first: "Hottest", last: "Coldest" },
    distractorMeanings: [],
  };
}

function contentOrThrow(id: string): SortContent {
  const found = sortContentById(id);
  if (found === undefined) throw new Error(`no sort content ${id}`);
  return found;
}

/** Every card present exactly once across rungs and pool. */
function holdsEveryCardOnce(board: SortBoard, expected: readonly string[]): boolean {
  const held = [...allCards(board)].sort();
  const want = [...expected].sort();
  return held.length === want.length && held.every((card, index) => card === want[index]);
}

describe("the board", () => {
  it("opens with every card in the pool and every rung empty", () => {
    const board = openingBoard(CARDS, 11);
    expect(board.pool).toHaveLength(4);
    expect(board.slots).toEqual([null, null, null, null]);
    expect(emptyRungCount(board)).toBe(4);
    expect(boardIsComplete(board)).toBe(false);
    expect(holdsEveryCardOnce(board, CARDS)).toBe(true);
  });

  it("shuffles deterministically from a seed, and a different seed gives a different pool", () => {
    expect(shuffled(CARDS, 11)).toEqual(shuffled(CARDS, 11));
    const seeds = new Set([7, 11, 23, 41].map((seed) => shuffled(CARDS, seed).join()));
    expect(seeds.size).toBeGreaterThan(1);
  });

  it("moves a card from the pool onto an empty rung", () => {
    const board = placeOnRung(openingBoard(CARDS, 3), "c", 1);
    expect(board.slots[1]).toBe("c");
    expect(board.pool).not.toContain("c");
    expect(holdsEveryCardOnce(board, CARDS)).toBe(true);
  });

  it("exchanges rungs when a ranked card lands on an occupied one", () => {
    const board = placeOnRung(boardFrom(["a", "b", "c", "d"]), "a", 2);
    expect(board.slots).toEqual(["c", "b", "a", "d"]);
    expect(board.pool).toHaveLength(0);
  });

  it("sends the occupant back to the pool when a pool card lands on it", () => {
    let board = emptyBoard(CARDS);
    board = placeOnRung(board, "a", 0);
    board = placeOnRung(board, "b", 0);
    expect(board.slots[0]).toBe("b");
    expect(board.pool).toContain("a");
    expect(holdsEveryCardOnce(board, CARDS)).toBe(true);
  });

  it("never loses a card, over a random walk of every move the surface can make", () => {
    // A pseudo random walk with a fixed seed, so a failure is reproducible.
    let state = 12345;
    const next = (bound: number): number => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state % bound;
    };
    let board = openingBoard(CARDS, 5);
    for (let step = 0; step < 4000; step += 1) {
      const card = CARDS[next(CARDS.length)] as string;
      const move = next(4);
      if (move === 0) board = placeOnRung(board, card, next(CARDS.length));
      else if (move === 1) board = returnToPool(board, card);
      else if (move === 2) board = nudge(board, card, next(2) === 0 ? -1 : 1);
      else board = applyDrop(board, card, { kind: "pool" });
      expect(holdsEveryCardOnce(board, CARDS), `step ${step}`).toBe(true);
      expect(board.slots).toHaveLength(4);
    }
  });

  it("ignores a move that cannot be made rather than throwing", () => {
    const board = boardFrom(["a", "b", "c", "d"]);
    expect(placeOnRung(board, "a", 9)).toBe(board);
    expect(placeOnRung(board, "zz", 0)).toBe(board);
    expect(nudge(board, "a", -1)).toBe(board);
    expect(nudge(board, "d", 1)).toBe(board);
    expect(returnToPool(openingBoard(CARDS, 1), "a")).toEqual(openingBoard(CARDS, 1));
  });

  it("gives the keyboard a real path: nudge places from the pool and reorders on the track", () => {
    let board = emptyBoard(CARDS);
    board = nudge(board, "c", 1);
    expect(board.slots[0]).toBe("c");
    board = nudge(board, "d", -1);
    expect(board.slots[1]).toBe("d");
    board = nudge(board, "d", -1);
    expect(board.slots).toEqual(["d", "c", null, null]);
  });

  it("drops empty rungs from the graded order rather than filling them", () => {
    let board = emptyBoard(CARDS);
    board = placeOnRung(board, "a", 0);
    board = placeOnRung(board, "d", 3);
    expect(boardOrder(board)).toEqual(["a", "d"]);
    expect(placeOf(board, "b")).toEqual({ where: "pool" });
    expect(placeOf(board, "a")).toEqual({ where: "slot", index: 0 });
    expect(placeOf(board, "nope")).toBeNull();
  });
});

describe("hit testing", () => {
  const rects: readonly TargetRect[] = [
    { target: { kind: "pool" }, left: 0, top: 200, right: 300, bottom: 300 },
    { target: { kind: "slot", index: 0 }, left: 0, top: 0, right: 300, bottom: 60 },
    { target: { kind: "slot", index: 1 }, left: 0, top: 60, right: 300, bottom: 120 },
  ];

  it("finds the rung under the pointer", () => {
    expect(hitTarget(rects, 150, 30)).toEqual({ kind: "slot", index: 0 });
    expect(hitTarget(rects, 150, 90)).toEqual({ kind: "slot", index: 1 });
    expect(hitTarget(rects, 150, 250)).toEqual({ kind: "pool" });
  });

  it("returns null off every target, so a drop in the margin puts the card back", () => {
    expect(hitTarget(rects, 150, 400)).toBeNull();
    expect(hitTarget(rects, 400, 30)).toBeNull();
  });

  it("lets a rung win over the pool where they overlap, matching the painting order", () => {
    const overlapping: readonly TargetRect[] = [
      { target: { kind: "pool" }, left: 0, top: 0, right: 300, bottom: 300 },
      { target: { kind: "slot", index: 2 }, left: 0, top: 0, right: 300, bottom: 60 },
    ];
    expect(hitTarget(overlapping, 10, 10)).toEqual({ kind: "slot", index: 2 });
  });
});

describe("the authored ladders", () => {
  it("carries all four of the ladders the seventeen non mechanism nodes need", () => {
    expect(SORT_LADDERS.map((content) => content.beat.id)).toEqual([
      "sort-pka-hierarchy",
      "sort-acyl-reactivity",
      "sort-oxidation-ladder",
      "sort-basicity-vs-nucleophilicity",
    ]);
  });

  it("declares only the mastery levels a sort beat may serve", () => {
    expect(levelRuleViolations(SORT_LADDERS.map((content) => content.beat))).toEqual([]);
    for (const content of SORT_LADDERS) {
      for (const level of content.beat.levels) {
        expect(DEFAULT_LEVELS.sort, content.beat.id).toContain(level);
      }
    }
  });

  it("derives the beat from the problem, so the two cannot drift apart", () => {
    for (const content of SORT_LADDERS) {
      const itemIds = content.beat.items.map((item) => item.id);
      expect(content.spec.items.map((item) => item.id), content.beat.id).toEqual(itemIds);
      expect([...content.beat.order].sort(), content.beat.id).toEqual([...itemIds].sort());
      expect(content.beat.order, content.beat.id).toEqual([...content.spec.correctOrder]);
    }
  });

  it("labels both ends of every track and gives every card a reason", () => {
    for (const content of SORT_LADDERS) {
      expect(content.trackEnds.first.length, content.beat.id).toBeGreaterThan(0);
      expect(content.trackEnds.last.length, content.beat.id).toBeGreaterThan(0);
      for (const item of content.beat.items) {
        expect(item.why, `${content.beat.id} ${item.id}`).toBeTruthy();
      }
    }
  });

  it("declares a meaning only for distractors its problem actually carries", () => {
    for (const content of SORT_LADDERS) {
      const ids = new Set(content.problem.distractors.map((distractor) => distractor.id));
      for (const meaning of content.distractorMeanings) {
        expect(ids.has(meaning.id), `${content.beat.id} ${meaning.id}`).toBe(true);
      }
    }
  });
});

describe("judging a sort", () => {
  const acidity = contentOrThrow("sort-pka-hierarchy");
  const acyl = contentOrThrow("sort-acyl-reactivity");
  const nucleophilicity = contentOrThrow("sort-basicity-vs-nucleophilicity");

  it("refuses to grade an unfinished track, and reports how many rungs are left", () => {
    let board = emptyBoard(acidity.beat.order);
    board = placeOnRung(board, acidity.beat.order[0] as string, 0);
    const judgement = judgeSort(acidity, board, CONTEXT);
    expect(judgement.status).toBe("unfinished");
    if (judgement.status !== "unfinished") throw new Error("expected unfinished");
    expect(judgement.emptyRungs).toBe(3);
  });

  it("marks the authored order correct and carries the solution copy", () => {
    const judgement = judgeSort(acidity, boardFrom(acidity.beat.order), CONTEXT);
    if (judgement.status !== "judged") throw new Error("expected a judgement");
    expect(judgement.result.kind).toBe("correct");
    expect(judgement.result.cause).toBe("matches_requested_route");
    expect(judgement.result.level).toBe(2);
    expect(judgement.tier).toBeNull();
    expect(judgement.explanation?.whatHappened).toContain("Carboxylic acid");
  });

  it("accepts the authored tie as a correct alternative route, and names it", () => {
    // pka.ts puts phenol and the malonic ester C-H on the same rung, and the
    // corpus records both orders. The alternative is correct AND worth saying.
    const tied = ["carboxylic-acid", "beta-dicarbonyl", "phenol", "ketone-alpha"];
    const judgement = judgeSort(acidity, boardFrom(tied), CONTEXT);
    if (judgement.status !== "judged") throw new Error("expected a judgement");
    expect(judgement.result.kind).toBe("correct_alternative_route");
    if (judgement.result.kind !== "correct_alternative_route") throw new Error("narrowing");
    expect(judgement.result.routeTaken).toBe("the tied rungs placed the other way round");
    expect(judgement.headline).toContain("same rung");
  });

  it("names the two cards that traded places on an adjacent swap, and does not call it flat wrong", () => {
    // Not an authored distractor on the acyl ladder: acid chloride and amide
    // are the ends, so exchanging them is not one of the three predicted
    // answers, and this is the generic Tier 1 near miss.
    const swapped = ["anhydride", "acid-chloride", "ester", "amide"];
    const judgement = judgeSort(acyl, boardFrom(swapped), CONTEXT);
    if (judgement.status !== "judged") throw new Error("expected a judgement");
    expect(judgement.result.cause).toBe("order_adjacent_pair_swapped");
    expect(judgement.tier).toBe(1);
    expect(judgement.headline).toContain("An acid chloride");
    expect(judgement.headline).toContain("An anhydride");
    expect(judgement.breakdown.swappedPair).not.toBeNull();
  });

  it("treats a reversed ladder as sound work aimed the other way, not as an invalid answer", () => {
    const reversed = [...acyl.beat.order].reverse();
    const judgement = judgeSort(acyl, boardFrom(reversed), CONTEXT);
    if (judgement.status !== "judged") throw new Error("expected a judgement");
    expect(judgement.result.kind).toBe("valid_not_requested");
    if (judgement.result.kind !== "valid_not_requested") throw new Error("narrowing");
    expect(judgement.result.built).toBe("the same ladder, least reactive first");
    // The corpus anticipated this one, so it arrives as Tier 2 with authored copy.
    expect(judgement.tier).toBe(2);
    expect(judgement.explanation).not.toBeNull();
  });

  it("names the basicity ladder as what was built rather than as one pair out of place", () => {
    // The point of the distractor meaning table. The checker sees one adjacent
    // swap; the instructor knows it is the other ranking, answered soundly.
    const byBasicity = ["hydroxide", "hydrosulfide", "fluoride", "water"];
    const judgement = judgeSort(nucleophilicity, boardFrom(byBasicity), CONTEXT);
    if (judgement.status !== "judged") throw new Error("expected a judgement");
    expect(judgement.tier).toBe(2);
    expect(judgement.result.kind).toBe("valid_not_requested");
    expect(judgement.result.cause).toBe("order_used_a_different_criterion");
    expect(judgement.result.distractorId).toBe("ranked-by-basicity");
    if (judgement.result.kind !== "valid_not_requested") throw new Error("narrowing");
    expect(judgement.result.built).toBe("the basicity ladder");
  });

  it("uses the track's own end labels when a reversal was not anticipated by an author", () => {
    // Every authored ladder here predicts its own reversal, so the Tier 1
    // reversal copy is only reachable on a ladder nobody wrote a distractor
    // for. That is exactly the ladder an author will add next, so the branch is
    // covered against a content-free fixture rather than left to be discovered.
    const bare = bareContent();
    const judgement = judgeSort(bare, boardFrom(["z", "y", "x"]), CONTEXT);
    if (judgement.status !== "judged") throw new Error("expected a judgement");
    expect(judgement.tier).toBe(1);
    expect(judgement.result.kind).toBe("valid_not_requested");
    expect(judgement.result.cause).toBe("order_fully_reversed");
    if (judgement.result.kind !== "valid_not_requested") throw new Error("narrowing");
    expect(judgement.result.built).toBe("the same ladder, coldest first");
    expect(judgement.headline).toContain("hottest");
  });

  it("points at the ends of the track when nothing at all landed in place", () => {
    const deranged = ["anhydride", "acid-chloride", "amide", "ester"];
    const judgement = judgeSort(acyl, boardFrom(deranged), CONTEXT);
    if (judgement.status !== "judged") throw new Error("expected a judgement");
    expect(judgement.breakdown.inPlace).toEqual([]);
    expect(judgement.headline).toContain("reacts first");
  });

  it("falls back to a partial credit line when nothing more specific applies", () => {
    // Two non adjacent displacements: not a swap, not a reversal, not authored.
    const scrambled = ["ester", "anhydride", "amide", "acid-chloride"];
    const judgement = judgeSort(acyl, boardFrom(scrambled), CONTEXT);
    if (judgement.status !== "judged") throw new Error("expected a judgement");
    expect(judgement.result.kind).toBe("invalid");
    expect(judgement.result.cause).toBe("no_named_cause_logged");
    expect(judgement.headline).toMatch(/of 4 are already on the right rung/);
  });

  it("records the level, the elapsed time and the timestamp on every result", () => {
    const judgement = judgeSort(acyl, boardFrom(acyl.beat.order), CONTEXT);
    if (judgement.status !== "judged") throw new Error("expected a judgement");
    expect(judgement.result.beatId).toBe("sort-acyl-reactivity");
    expect(judgement.result.elapsedMs).toBe(4200);
    expect(judgement.result.at).toBe("2026-08-27T10:00:00.000Z");
  });

  it("cannot fail at L0, which is the ladder contract rather than a difficulty setting", () => {
    const wrong = [...acyl.beat.order].reverse();
    const judgement = judgeSort(acyl, boardFrom(wrong), { ...CONTEXT, level: 0 });
    if (judgement.status !== "judged") throw new Error("expected a judgement");
    expect(judgement.result.kind).toBe("correct");
  });
});

describe("the professor adjustable pKa layer, as this beat reads it", () => {
  const acidity = contentOrThrow("sort-pka-hierarchy");

  // The layer itself is src/settings/pka.ts and is tested there. What belongs
  // here is the half this beat owns: that its ladders carry the pKa links the
  // check needs, that the shipped tables leave them standing, and that a table
  // which WOULD flip one is flagged rather than applied.

  it("links every rung of the pKa ladder to the table, and nothing else to it", () => {
    expect(acidity.beat.items.map((item) => item.pkaSiteId)).toEqual([
      "carboxylic_acid",
      "phenol",
      "beta_dicarbonyl_alpha_ch",
      "ketone_alpha_ch",
    ]);
    const acyl = contentOrThrow("sort-acyl-reactivity");
    // Deliberately unlinked: the acyl ladder ranks by reactivity, which leaving
    // group pKa explains and does not define. Linking it would flag a table for
    // disagreeing with something the ladder never asserted.
    expect(acyl.beat.items.every((item) => item.pkaSiteId === undefined)).toBe(true);
  });

  it("stands clean under both shipped tables, which is what the app expects", () => {
    for (const presetId of [COURSE_PRESET_ID, TEXTBOOK_PRESET_ID]) {
      const settings: PkaSettingsSnapshot = { presetId, overrides: {} };
      for (const content of SORT_LADDERS) {
        expect(
          sortBeatPkaConflicts(content.beat, settings),
          `${content.beat.id} under ${presetId}`,
        ).toEqual([]);
      }
    }
    expect(sortBeatPkaConflicts(acidity.beat, DEFAULT_PKA_SETTINGS)).toEqual([]);
  });

  it("FLAGS a custom value that would flip the authored ladder rather than teaching either version", () => {
    // A student whose lecturer puts the plain ketone alpha C-H at 8 has put it
    // above the malonic ester C-H, which contradicts the reviewed explanation
    // on this problem. The app says so; it does not reorder the ladder.
    const settings: PkaSettingsSnapshot = {
      presetId: COURSE_PRESET_ID,
      overrides: { ketone_alpha_ch: 8 },
    };
    const conflicts = sortBeatPkaConflicts(acidity.beat, settings);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      kind: "order_flipped",
      earlier: { itemId: "beta-dicarbonyl", value: 10 },
      later: { itemId: "ketone-alpha", value: 8 },
    });
    expect(conflicts[0]?.message).toContain("still grades on the ladder it was written with");
    // And the authored order is untouched. The ladder is still the ladder.
    expect(acidity.beat.order[3]).toBe("ketone-alpha");
    const judgement = judgeSort(acidity, boardFrom(acidity.beat.order), CONTEXT);
    if (judgement.status !== "judged") throw new Error("expected a judgement");
    expect(judgement.result.kind).toBe("correct");
  });

  it("ignores an override on a rung no card links to", () => {
    const acyl = contentOrThrow("sort-acyl-reactivity");
    const settings: PkaSettingsSnapshot = {
      presetId: COURSE_PRESET_ID,
      overrides: { carboxylic_acid: 99 },
    };
    expect(sortBeatPkaConflicts(acyl.beat, settings)).toEqual([]);
  });
});

describe("the drop path a gesture takes", () => {
  it("routes a pool drop and a rung drop through the same rules", () => {
    const board = boardFrom(["a", "b", "c", "d"]);
    const toPool: DropTarget = { kind: "pool" };
    const toRung: DropTarget = { kind: "slot", index: 0 };
    expect(applyDrop(board, "b", toPool).slots).toEqual(["a", null, "c", "d"]);
    expect(applyDrop(board, "b", toRung).slots).toEqual(["b", "a", "c", "d"]);
    expect(holdsEveryCardOnce(applyDrop(board, "b", toPool), CARDS)).toBe(true);
  });
});
