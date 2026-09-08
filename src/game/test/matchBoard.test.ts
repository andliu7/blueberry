/**
 * The matching beat, tested where its decisions actually live.
 *
 * Three of the four modules under src/beats/match are pure, which is the whole
 * reason the split exists: the interesting claims about a pairing board are
 * "this pair is judged the moment it is made", "a wrong pair bounces and says
 * something specific", and "the target column is not solvable by reading
 * straight down", and none of the three needs a DOM to be checked. The React
 * file is the view over these and owns no rules, so it is not snapshotted:
 * asserting JSX output would pin the implementation and not the design, which
 * is the reason apps/web/vitest.config.ts gives for its node environment.
 *
 * The copy is tested too, and deliberately. CLAUDE.md's feedback axis is won on
 * specificity, so "the first miss does not hand over the answer" and "the
 * second miss teaches" are behaviours with tests rather than intentions in a
 * header.
 */

import { describe, expect, it } from "vitest";

import { checkMatching, type MatchingState } from "@blueberry/curriculum";
import type { MatchBeat } from "../beats/types";
import {
  ALKENE_OXIDATION_BOARD,
  IR_SIGNAL_BOARD,
  MATCH_BOARDS,
  PKA_LADDER_BOARD,
  PROTECTING_GROUP_BOARD,
  matchBoardById,
} from "../beats/match/boards";
import {
  CARD_TEXT_CAP,
  buildMatchBoard,
  decoysAt,
  isPlayable,
  matchAuthoringProblems,
  promptIdFor,
  targetIdFor,
  textOf,
} from "../beats/match/spec";
import {
  beatResultFor,
  boardVerdict,
  cardForMiss,
  causeForBoard,
  focusTargetAfterSettle,
  initialBoardState,
  isBoardComplete,
  judgePair,
  reduceBoard,
  shuffledTargetIds,
  visiblePromptIds,
  visibleTargetIds,
  type BoardAction,
  type BoardState,
} from "../beats/match/board";
import {
  completionLine,
  joinMessage,
  messageForMiss,
  progressLine,
} from "../beats/match/reasons";

const SPEC = buildMatchBoard(ALKENE_OXIDATION_BOARD, 1);
const SPEC_L2 = buildMatchBoard(ALKENE_OXIDATION_BOARD, 2);

/** Run a list of actions from a fresh board, settling after each one. */
function play(spec = SPEC, actions: readonly BoardAction[] = []): BoardState {
  let state = initialBoardState();
  for (const action of actions) {
    state = reduceBoard(spec, state, action);
    state = reduceBoard(spec, state, { kind: "settle" });
  }
  return state;
}

function pickPair(promptId: string, targetId: string): readonly BoardAction[] {
  return [
    { kind: "pick", side: "prompt", id: promptId },
    { kind: "pick", side: "target", id: targetId },
  ];
}

describe("authoring", () => {
  it("every shipped board is playable at both levels it declares", () => {
    for (const board of MATCH_BOARDS) {
      for (const level of board.levels) {
        const problems = matchAuthoringProblems(board, level);
        expect(isPlayable(problems), `${board.id} at L${level}: ${problems.join("; ")}`).toBe(true);
      }
    }
  });

  it("every pair and every decoy carries a why, so no miss is left without teaching", () => {
    for (const board of MATCH_BOARDS) {
      // The warnings are exactly the missing-why reports. Zero problems of any
      // kind is the real bar here, not merely zero errors.
      expect(matchAuthoringProblems(board, 2), board.id).toEqual([]);
    }
  });

  it("refuses a level matching does not serve, rather than rendering it anyway", () => {
    const problems = matchAuthoringProblems(ALKENE_OXIDATION_BOARD, 3);
    expect(isPlayable(problems)).toBe(false);
    expect(problems.join(" ")).toContain("cannot be played at level 3");
    expect(() => buildMatchBoard(ALKENE_OXIDATION_BOARD, 3)).toThrow();
  });

  it("reports a duplicate pair id instead of quietly renaming one", () => {
    const broken: MatchBeat = {
      ...ALKENE_OXIDATION_BOARD,
      pairs: [
        { id: "same", left: "A", right: "B", why: "because" },
        { id: "same", left: "C", right: "D", why: "because" },
      ],
      decoys: [],
    };
    const problems = matchAuthoringProblems(broken, 1);
    expect(problems).toContain("two pairs share the id same");
    expect(isPlayable(problems)).toBe(false);
  });

  it("reports a decoy that reuses a pair id, which would collide in the target column", () => {
    const broken: MatchBeat = {
      ...ALKENE_OXIDATION_BOARD,
      decoys: [{ id: "osmium", text: "a clash", why: "collides with the pair of the same id" }],
    };
    expect(matchAuthoringProblems(broken, 2)).toContain(
      "decoy osmium reuses a pair id, so its target would collide",
    );
    // At L1 there are no decoys at all, so the same beat is playable there.
    expect(isPlayable(matchAuthoringProblems(broken, 1))).toBe(true);
  });

  it("finds a board by id and returns undefined rather than throwing for an unknown one", () => {
    expect(matchBoardById("match-ir-signal")).toBe(IR_SIGNAL_BOARD);
    expect(matchBoardById("no-such-board")).toBeUndefined();
  });
});

describe("the level ladder is a different board, not a stricter grader", () => {
  it("holds decoys back at L1 and puts them on the board at L2", () => {
    expect(decoysAt(ALKENE_OXIDATION_BOARD, 1)).toEqual([]);
    expect(decoysAt(ALKENE_OXIDATION_BOARD, 2)).toHaveLength(1);
    expect(SPEC.answer.targets).toHaveLength(4);
    expect(SPEC_L2.answer.targets).toHaveLength(5);
    expect(SPEC_L2.decoyTargetIds).toEqual([targetIdFor("halohydrin")]);
  });

  it("grades the same four pairs at both levels", () => {
    expect(SPEC.answer.pairs).toEqual(SPEC_L2.answer.pairs);
  });
});

describe("judging one pair at a time, through the curriculum checker", () => {
  it("accepts the authored pairing", () => {
    expect(judgePair(SPEC, promptIdFor("osmium"), targetIdFor("osmium"))).toBe("correct");
  });

  it("rejects a pairing the author did not write", () => {
    expect(judgePair(SPEC, promptIdFor("osmium"), targetIdFor("dibromide"))).toBe("wrong");
  });

  it("rejects a decoy target, which pairs with nothing", () => {
    expect(judgePair(SPEC_L2, promptIdFor("osmium"), targetIdFor("halohydrin"))).toBe("wrong");
  });
});

describe("the board's state machine", () => {
  it("lands a correct pair, moves the counter at once, and clears both cards", () => {
    const state = play(SPEC, pickPair(promptIdFor("osmium"), targetIdFor("osmium")));
    expect(state.landed).toEqual([{ promptId: promptIdFor("osmium"), targetId: targetIdFor("osmium") }]);
    expect(state.misses).toEqual([]);
    expect(visiblePromptIds(SPEC, state)).not.toContain(promptIdFor("osmium"));
    expect(visibleTargetIds(SPEC, state)).not.toContain(targetIdFor("osmium"));
  });

  it("keeps a landed pair on screen until the view says the animation is over", () => {
    let state = initialBoardState();
    state = reduceBoard(SPEC, state, { kind: "pick", side: "prompt", id: promptIdFor("osmium") });
    state = reduceBoard(SPEC, state, { kind: "pick", side: "target", id: targetIdFor("osmium") });
    // Landed already, and the counter has moved, but both cards are still drawn.
    expect(state.landed).toHaveLength(1);
    expect(state.pending?.outcome).toBe("landed");
    expect(visiblePromptIds(SPEC, state)).toContain(promptIdFor("osmium"));
    state = reduceBoard(SPEC, state, { kind: "settle" });
    expect(visiblePromptIds(SPEC, state)).not.toContain(promptIdFor("osmium"));
  });

  it("bounces a wrong pair: nothing lands, both cards stay, and the miss is recorded", () => {
    const state = play(SPEC, pickPair(promptIdFor("osmium"), targetIdFor("dibromide")));
    expect(state.landed).toEqual([]);
    expect(state.misses).toEqual([
      { promptId: promptIdFor("osmium"), targetId: targetIdFor("dibromide"), index: 0 },
    ]);
    expect(visiblePromptIds(SPEC, state)).toContain(promptIdFor("osmium"));
    expect(visibleTargetIds(SPEC, state)).toContain(targetIdFor("dibromide"));
    expect(state.lastMessage?.tone).toBe("rejected");
  });

  it("pairs from either end, so a student may pick the right hand card first", () => {
    const state = play(SPEC, [
      { kind: "pick", side: "target", id: targetIdFor("ozonolysis") },
      { kind: "pick", side: "prompt", id: promptIdFor("ozonolysis") },
    ]);
    expect(state.landed).toHaveLength(1);
  });

  it("treats a second pick in the same column as a second thought, not a pair", () => {
    let state = reduceBoard(SPEC, initialBoardState(), {
      kind: "pick",
      side: "prompt",
      id: promptIdFor("osmium"),
    });
    state = reduceBoard(SPEC, state, { kind: "pick", side: "prompt", id: promptIdFor("dibromide") });
    expect(state.selected).toEqual({ side: "prompt", id: promptIdFor("dibromide") });
    expect(state.attempts).toBe(0);
  });

  it("puts a card back down when it is tapped twice", () => {
    let state = reduceBoard(SPEC, initialBoardState(), {
      kind: "pick",
      side: "prompt",
      id: promptIdFor("osmium"),
    });
    state = reduceBoard(SPEC, state, { kind: "pick", side: "prompt", id: promptIdFor("osmium") });
    expect(state.selected).toBeNull();
  });

  it("drops a pick made during a transition rather than queueing it", () => {
    let state = initialBoardState();
    state = reduceBoard(SPEC, state, { kind: "pick", side: "prompt", id: promptIdFor("osmium") });
    state = reduceBoard(SPEC, state, { kind: "pick", side: "target", id: targetIdFor("osmium") });
    const midAnimation = state;
    state = reduceBoard(SPEC, state, { kind: "pick", side: "prompt", id: promptIdFor("dibromide") });
    expect(state).toBe(midAnimation);
  });

  it("ignores a pick on a card that has already left the board", () => {
    const landedOne = play(SPEC, pickPair(promptIdFor("osmium"), targetIdFor("osmium")));
    const after = reduceBoard(SPEC, landedOne, {
      kind: "pick",
      side: "prompt",
      id: promptIdFor("osmium"),
    });
    expect(after).toBe(landedOne);
  });

  it("keeps a decoy on the board however many times it is ruled out", () => {
    const state = play(SPEC_L2, [
      ...pickPair(promptIdFor("osmium"), targetIdFor("halohydrin")),
      ...pickPair(promptIdFor("dibromide"), targetIdFor("halohydrin")),
    ]);
    expect(visibleTargetIds(SPEC_L2, state)).toContain(targetIdFor("halohydrin"));
    expect(state.misses).toHaveLength(2);
  });

  it("keeps the sentence after the animation ends, so a late look still reads it", () => {
    let state = initialBoardState();
    state = reduceBoard(SPEC, state, { kind: "pick", side: "prompt", id: promptIdFor("osmium") });
    state = reduceBoard(SPEC, state, { kind: "pick", side: "target", id: targetIdFor("dibromide") });
    state = reduceBoard(SPEC, state, { kind: "settle" });
    expect(state.pending).toBeNull();
    expect(state.lastMessage).not.toBeNull();
  });
});

describe("finishing the board", () => {
  const solved = (spec = SPEC): BoardState =>
    play(
      spec,
      spec.answer.pairs.flatMap((pair) => pickPair(pair.promptId, pair.targetId)),
    );

  it("is complete only when every prompt has landed", () => {
    const partial = play(SPEC, pickPair(promptIdFor("osmium"), targetIdFor("osmium")));
    expect(isBoardComplete(SPEC, partial)).toBe(false);
    expect(isBoardComplete(SPEC, solved())).toBe(true);
  });

  it("agrees with the package's own whole board checker", () => {
    expect(boardVerdict(SPEC, solved())).toEqual({ outcome: "correct" });
  });

  it("is the same board the checker grades directly, so the shell added nothing", () => {
    const state: MatchingState = { kind: "matching", pairs: solved().landed };
    expect(checkMatching(SPEC.answer, state)).toEqual({ outcome: "correct" });
  });

  it("names the requested route when nothing bounced", () => {
    expect(causeForBoard(solved())).toBe("matches_requested_route");
  });

  it("names the one card that took a second look", () => {
    const state = play(SPEC, [
      ...pickPair(promptIdFor("osmium"), targetIdFor("dibromide")),
      ...SPEC.answer.pairs.flatMap((pair) => pickPair(pair.promptId, pair.targetId)),
    ]);
    expect(state.misses).toHaveLength(1);
    expect(causeForBoard(state)).toBe("matched_all_but_one_pair");
  });

  it("logs the tail rather than guessing when misses are spread across cards", () => {
    const state = play(SPEC, [
      ...pickPair(promptIdFor("osmium"), targetIdFor("dibromide")),
      ...pickPair(promptIdFor("ozonolysis"), targetIdFor("epoxide-open")),
      ...SPEC.answer.pairs.flatMap((pair) => pickPair(pair.promptId, pair.targetId)),
    ]);
    expect(causeForBoard(state)).toBe("no_named_cause_logged");
  });

  it("reports a correct result carrying the level it was played at", () => {
    const result = beatResultFor(SPEC, solved(), { elapsedMs: 4200, at: "2026-08-27T10:00:00.000Z" });
    expect(result.kind).toBe("correct");
    expect(result.level).toBe(1);
    expect(result.beatId).toBe("match-alkene-oxidation");
    expect(result.elapsedMs).toBe(4200);
  });

  it("solves every shipped board at both of its levels", () => {
    for (const board of MATCH_BOARDS) {
      for (const level of board.levels) {
        const spec = buildMatchBoard(board, level);
        expect(boardVerdict(spec, solved(spec)), `${board.id} at L${level}`).toEqual({
          outcome: "correct",
        });
      }
    }
  });
});

describe("the target column is not solvable by reading straight down", () => {
  it("shuffles every shipped board off the identity order", () => {
    for (const board of MATCH_BOARDS) {
      for (const level of board.levels) {
        const spec = buildMatchBoard(board, level);
        const authored = spec.answer.targets.map((target) => target.id);
        const shuffled = shuffledTargetIds(spec);
        expect(shuffled, `${board.id} at L${level}`).not.toEqual(authored);
        expect([...shuffled].sort()).toEqual([...authored].sort());
      }
    }
  });

  it("is stable, so a card does not move out from under a finger between renders", () => {
    expect(shuffledTargetIds(SPEC)).toEqual(shuffledTargetIds(SPEC));
  });
});

describe("what the board says", () => {
  it("uses the authored decoy explanation when the student lands on a decoy", () => {
    const message = messageForMiss(SPEC_L2, promptIdFor("osmium"), targetIdFor("halohydrin"), 0);
    expect(message.tone).toBe("rejected");
    expect(message.detail).toContain("Br2 in water");
  });

  it("does not hand over the answer on a first miss", () => {
    const message = messageForMiss(SPEC, promptIdFor("osmium"), targetIdFor("epoxide-open"), 0);
    const sentence = joinMessage(message);
    // It names the two cards in play.
    expect(sentence).toContain(textOf(SPEC, promptIdFor("osmium")));
    expect(sentence).toContain(textOf(SPEC, targetIdFor("epoxide-open")));
    // It does not name the card that target really belongs to.
    expect(sentence).not.toContain(textOf(SPEC, promptIdFor("epoxide-open")));
  });

  it("teaches on the second miss with the same card", () => {
    const first = messageForMiss(SPEC, promptIdFor("osmium"), targetIdFor("epoxide-open"), 0);
    const second = messageForMiss(SPEC, promptIdFor("osmium"), targetIdFor("dibromide"), 1);
    expect(second.detail).not.toBe(first.detail);
    expect(second.detail).toContain("Osmium bridges the alkene");
  });

  it("says plainly when a target belongs to nobody", () => {
    const message = messageForMiss(SPEC_L2, promptIdFor("osmium"), targetIdFor("halohydrin"), 0);
    // A decoy with a why takes the authored path; strip it and the derived line
    // is the one that has to stand on its own.
    const bare = buildMatchBoard(
      { ...ALKENE_OXIDATION_BOARD, decoys: [{ id: "halohydrin", text: "One OH and one Br" }] },
      2,
    );
    const derived = messageForMiss(bare, promptIdFor("osmium"), targetIdFor("halohydrin"), 0);
    expect(message.detail).toBeDefined();
    expect(derived.headline).toContain("Nothing on this board goes on");
  });

  it("counts progress inside the board, which the reference does not", () => {
    expect(progressLine(0, 4)).toBe("4 pairs to find.");
    expect(progressLine(2, 4)).toBe("2 of 4 matched, 2 to go.");
    expect(progressLine(4, 4)).toBe("All 4 matched.");
  });

  it("celebrates a clean board differently from one that took a second look", () => {
    expect(completionLine(4, 0)).not.toBe(completionLine(4, 1));
    expect(completionLine(4, 0)).toContain("first try");
    expect(completionLine(4, 2)).toContain("usually goes");
  });
});

describe("voice", () => {
  /** Every sentence this beat can put in front of a student, on one board. */
  function everySentence(): readonly string[] {
    const lines: string[] = [progressLine(0, 4), progressLine(2, 4), progressLine(4, 4)];
    for (const misses of [0, 1, 2]) lines.push(completionLine(4, misses));
    for (const board of MATCH_BOARDS) {
      lines.push(board.prompt);
      if (board.brief !== undefined) lines.push(board.brief);
      const spec = buildMatchBoard(board, 2);
      for (const pair of spec.answer.pairs) {
        for (const target of spec.answer.targets) {
          for (const prior of [0, 1]) {
            if (target.id === pair.targetId) continue;
            lines.push(joinMessage(messageForMiss(spec, pair.promptId, target.id, prior)));
          }
        }
      }
      for (const prompt of spec.answer.prompts) lines.push(prompt.text);
      for (const target of spec.answer.targets) lines.push(target.text);
      for (const why of Object.values(spec.whyByPrompt)) lines.push(why);
      for (const why of Object.values(spec.whyByDecoy)) lines.push(why);
    }
    return lines;
  }

  it("never scolds and never asks a rhetorical question", () => {
    const banned = ["you should", "you failed", "wrong!", "incorrect", "try harder", "obviously"];
    for (const line of everySentence()) {
      const lowered = line.toLowerCase();
      for (const phrase of banned) {
        expect(lowered, `banned phrase "${phrase}" in: ${line}`).not.toContain(phrase);
      }
    }
  });

  it("carries no em dash, per CLAUDE.md", () => {
    for (const line of everySentence()) {
      expect(line, line).not.toContain("—");
    }
  });
});

describe("the card a miss offers", () => {
  it("puts the misplaced card on the front and where it really goes on the back", () => {
    const state = play(SPEC, pickPair(promptIdFor("osmium"), targetIdFor("dibromide")));
    const miss = state.misses[0];
    expect(miss).toBeDefined();
    const card = cardForMiss(SPEC, miss!, "2026-08-27T10:00:00.000Z");
    expect(card.front).toBe(textOf(SPEC, promptIdFor("osmium")));
    expect(card.back).toBe(textOf(SPEC, targetIdFor("osmium")));
    expect(card.why).toContain("Osmium bridges the alkene");
    expect(card.source.kind).toBe("mistake");
    expect(card.tags).toContain("u5-syn-diol");
  });

  it("gives the same card the same id, so missing twice offers one card", () => {
    const state = play(SPEC, [
      ...pickPair(promptIdFor("osmium"), targetIdFor("dibromide")),
      ...pickPair(promptIdFor("osmium"), targetIdFor("ozonolysis")),
    ]);
    const [first, second] = state.misses;
    expect(cardForMiss(SPEC, first!, "x").id).toBe(cardForMiss(SPEC, second!, "y").id);
  });
});

describe("the other three boards carry the content targets this piece was given", () => {
  it("matches a pKa to a compound", () => {
    const spec = buildMatchBoard(PKA_LADDER_BOARD, 1);
    expect(judgePair(spec, promptIdFor("acetone"), targetIdFor("acetone"))).toBe("correct");
    expect(judgePair(spec, promptIdFor("acetone"), targetIdFor("ethanol"))).toBe("wrong");
  });

  it("matches a spectroscopic signal to a functional group", () => {
    const spec = buildMatchBoard(IR_SIGNAL_BOARD, 2);
    expect(textOf(spec, promptIdFor("nitrile"))).toContain("2250");
    expect(judgePair(spec, promptIdFor("acid"), targetIdFor("alcohol"))).toBe("wrong");
  });

  it("matches a protecting group to what it protects", () => {
    const spec = buildMatchBoard(PROTECTING_GROUP_BOARD, 1);
    expect(judgePair(spec, promptIdFor("boc"), targetIdFor("boc"))).toBe("correct");
  });
});

describe("a card is a pill, not a paragraph", () => {
  /**
   * The layout constraint, asserted rather than trusted to review.
   *
   * This is the fix for the one thing the first version of this beat got
   * genuinely wrong: cards up to seventy characters, rendered in a 150 point
   * phone column, wrapped to five or six lines and pushed the feedback box off
   * screen. The cap is not a style preference, it is what decides whether the
   * board is playable on the surface the reference is a screenshot of, so it
   * gets a test and not a comment.
   */
  function everyCardText(): readonly { readonly board: string; readonly text: string }[] {
    const cards: { board: string; text: string }[] = [];
    for (const board of MATCH_BOARDS) {
      const spec = buildMatchBoard(board, 2);
      for (const prompt of spec.answer.prompts) cards.push({ board: board.id, text: prompt.text });
      for (const target of spec.answer.targets) cards.push({ board: board.id, text: target.text });
    }
    return cards;
  }

  it("keeps every shipped card inside the cap", () => {
    for (const card of everyCardText()) {
      expect(
        card.text.length,
        `${card.board}: "${card.text}" is ${card.text.length} characters`,
      ).toBeLessThanOrEqual(CARD_TEXT_CAP);
    }
  });

  it("reports an overlong card as a warning and still lets the board grade", () => {
    const wordy: MatchBeat = {
      ...ALKENE_OXIDATION_BOARD,
      pairs: [
        {
          id: "long",
          left: "A very broad band from 2500 to 3300 cm-1, sitting over a C=O near 1710",
          right: "A carboxylic acid",
          why: "the dimer",
        },
        { id: "short", left: "Sharp 2250", right: "A nitrile", why: "the triple bond region" },
      ],
      decoys: [],
    };
    const problems = matchAuthoringProblems(wordy, 1);
    const overlong = problems.filter((problem) => problem.includes("characters of left text"));
    expect(overlong).toHaveLength(1);
    expect(overlong[0]).toContain(`the cap is ${CARD_TEXT_CAP}`);
    // A warning, so the board still plays and still grades correctly.
    expect(isPlayable(problems)).toBe(true);
    const spec = buildMatchBoard(wordy, 1);
    expect(judgePair(spec, promptIdFor("long"), targetIdFor("long"))).toBe("correct");
  });

  it("says nothing about a card that is exactly at the cap", () => {
    const exact = "x".repeat(CARD_TEXT_CAP);
    const board: MatchBeat = {
      ...ALKENE_OXIDATION_BOARD,
      pairs: [
        { id: "a", left: exact, right: exact, why: "at the cap" },
        { id: "b", left: "short", right: "shorter", why: "well under" },
      ],
      decoys: [],
    };
    expect(matchAuthoringProblems(board, 1)).toEqual([]);
  });
});

describe("the presentation field is reported, not silently reinterpreted", () => {
  it("warns when a beat asks for connectors, because this board judges pair by pair", () => {
    const connectors: MatchBeat = { ...ALKENE_OXIDATION_BOARD, presentation: "connectors" };
    const problems = matchAuthoringProblems(connectors, 1);
    const warning = problems.find((problem) => problem.includes("authored as connectors"));
    expect(warning, problems.join(" | ")).toBeDefined();
    expect(warning).toContain("drawn as columns");
    // Reported, never repaired: it is a warning, so the board still plays.
    expect(isPlayable(problems)).toBe(true);
  });

  it("says nothing at all about the shipped boards, which are authored as columns", () => {
    for (const board of MATCH_BOARDS) {
      expect(board.presentation, board.id).toBe("columns");
      expect(matchAuthoringProblems(board, 2), board.id).toEqual([]);
    }
  });
});

describe("where focus goes when a landed pair unmounts", () => {
  const solvedThree = (): BoardState =>
    play(
      SPEC,
      SPEC.answer.pairs.slice(0, 3).flatMap((pair) => pickPair(pair.promptId, pair.targetId)),
    );

  it("moves to the next prompt, because the browser would drop focus to the body", () => {
    expect(
      focusTargetAfterSettle(SPEC, solvedThree(), {
        focusWasOnTheBoard: true,
        focusStillOnTheBoard: false,
      }),
    ).toBe("next-prompt");
  });

  it("never steals focus from a student who was not on the board", () => {
    expect(
      focusTargetAfterSettle(SPEC, solvedThree(), {
        focusWasOnTheBoard: false,
        focusStillOnTheBoard: false,
      }),
    ).toBe("none");
  });

  it("leaves a bounced pair alone, because nothing unmounted and focus survived", () => {
    const bounced = play(SPEC, pickPair(promptIdFor("osmium"), targetIdFor("dibromide")));
    expect(
      focusTargetAfterSettle(SPEC, bounced, {
        focusWasOnTheBoard: true,
        focusStillOnTheBoard: true,
      }),
    ).toBe("none");
  });

  it("waits for the animation rather than moving focus mid flight", () => {
    let state = initialBoardState();
    state = reduceBoard(SPEC, state, { kind: "pick", side: "prompt", id: promptIdFor("osmium") });
    state = reduceBoard(SPEC, state, { kind: "pick", side: "target", id: targetIdFor("osmium") });
    expect(state.pending).not.toBeNull();
    expect(
      focusTargetAfterSettle(SPEC, state, {
        focusWasOnTheBoard: true,
        focusStillOnTheBoard: false,
      }),
    ).toBe("none");
  });

  it("sends the last pair to the celebration, where the next thing to read is", () => {
    const solved = play(
      SPEC,
      SPEC.answer.pairs.flatMap((pair) => pickPair(pair.promptId, pair.targetId)),
    );
    expect(isBoardComplete(SPEC, solved)).toBe(true);
    expect(
      focusTargetAfterSettle(SPEC, solved, {
        focusWasOnTheBoard: true,
        focusStillOnTheBoard: false,
      }),
    ).toBe("completion");
  });
});
