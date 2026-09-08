/**
 * The board's state machine. Pure, so the whole interaction can be tested
 * without a browser, which is the same trade packages/interaction made in
 * Phase 2 and for the same reason: the bugs in a pairing board are logic bugs,
 * and rendering them makes them harder to see, not easier.
 *
 * THE RULE THAT SHAPES EVERYTHING HERE: a pair is judged the moment it is made,
 * not when a Continue button is pressed. The reference board grades on Continue
 * and that is where its three named weaknesses come from. A pair judged on the
 * spot can clear itself out of the way, can say something specific about itself,
 * and can move a counter. A board judged at the end can do none of the three,
 * because by then the student has four answers on screen and one verdict.
 *
 * SO A WRONG PAIR BOUNCES. It shakes, it says why, and the two cards are
 * released. It does not sit on the board being wrong. That is deliberate and it
 * is the Duolingo behaviour rather than the reference's: leaving a wrong pair
 * in place means the student is now reading a board that contains a lie, and
 * every later comparison is made against it.
 *
 * GRADING IS NOT DONE HERE. Every judgement in this file goes through
 * `matchingBreakdown` and `checkMatching` from packages/curriculum. That is the
 * package that owns what a correct board is, it is the package with the tests
 * that enumerate all 24 bijection boards, and a second comparison living in the
 * shell is how two answers to one question end up shipping. What this file owns
 * is WHEN a judgement is asked for and what happens to the cards afterwards.
 *
 * PENDING IS AN ANIMATION CUE AND NOT A RESULT. The moment a pair lands it is in
 * `landed` and the counter has already moved: progress is never held back for a
 * transition. `pending` exists so the view knows which two cards are on their
 * way out or shaking, and `settle` is the view saying the animation is over. A
 * board with `pending` set ignores further picks, so a tap during the shake
 * cannot race the settle.
 */

import {
  checkMatching,
  matchingBreakdown,
  type MatchingPair,
  type MatchingState,
  type MatchingVerdict,
  type OptionId,
} from "@blueberry/curriculum";
import type { BeatCauseId, BeatResult } from "../types";
import type { Card } from "../../cards/types";
import {
  authoredLoadOf,
  authoredTargetFor,
  textOf,
  type MatchBoardSpec,
} from "./spec";
import { messageForLanding, messageForMiss, type PairMessage } from "./reasons";

export type Side = "prompt" | "target";

export interface Selection {
  readonly side: Side;
  readonly id: OptionId;
}

/** One rejected drop. `index` is its position in the run, not a clock. */
export interface Miss {
  readonly promptId: OptionId;
  readonly targetId: OptionId;
  readonly index: number;
}

export interface Pending {
  readonly promptId: OptionId;
  readonly targetId: OptionId;
  readonly outcome: "landed" | "rejected";
  readonly message: PairMessage;
}

export interface BoardState {
  /** Correct pairs, in the order the student found them. */
  readonly landed: readonly MatchingPair[];
  readonly selected: Selection | null;
  readonly pending: Pending | null;
  /**
   * The last thing the board said, kept after `pending` clears.
   *
   * Two fields for two lifetimes, and they are genuinely different: `pending`
   * lives exactly as long as an animation, and the SENTENCE has to outlive it
   * or a student who looks up a moment late has nothing to read. This is also
   * what the polite live region announces, so it must not be torn down by a
   * timer the student cannot see.
   */
  readonly lastMessage: PairMessage | null;
  readonly misses: readonly Miss[];
  /** Every drop attempted, right or wrong. */
  readonly attempts: number;
}

export type BoardAction =
  | { readonly kind: "pick"; readonly side: Side; readonly id: OptionId }
  | { readonly kind: "clear" }
  | { readonly kind: "settle" };

export function initialBoardState(): BoardState {
  return Object.freeze({
    landed: Object.freeze([]),
    selected: null,
    pending: null,
    lastMessage: null,
    misses: Object.freeze([]),
    attempts: 0,
  });
}

export function isPromptLanded(state: BoardState, promptId: OptionId): boolean {
  return state.landed.some((pair) => pair.promptId === promptId);
}

/** How many prompts have already landed on this target. */
export function landedLoadOf(state: BoardState, targetId: OptionId): number {
  return state.landed.filter((pair) => pair.targetId === targetId).length;
}

/**
 * A target is finished when every prompt the authored board puts on it has
 * landed. A decoy has an authored load of zero and is never finished, which is
 * right: a decoy stays on the board so it can go on being ruled out.
 */
export function isTargetFull(
  spec: MatchBoardSpec,
  state: BoardState,
  targetId: OptionId,
): boolean {
  const load = authoredLoadOf(spec, targetId);
  return load > 0 && landedLoadOf(state, targetId) >= load;
}

/** Misses already made with this card, which is what escalates the copy. */
export function missesOnPrompt(state: BoardState, promptId: OptionId): number {
  return state.misses.filter((miss) => miss.promptId === promptId).length;
}

/**
 * Judge one dropped pair, through the curriculum package and nothing else.
 *
 * A one pair `MatchingState` is a legal state: `matchingBreakdown` walks the
 * spec's prompts and reports the ones it finds, so a board holding a single
 * pair comes back as exactly that pair's verdict plus a list of prompts nobody
 * has touched, which is discarded here.
 */
export function judgePair(
  spec: MatchBoardSpec,
  promptId: OptionId,
  targetId: OptionId,
): "correct" | "wrong" {
  const state: MatchingState = { kind: "matching", pairs: [{ promptId, targetId }] };
  return matchingBreakdown(spec.answer, state).correctCount === 1 ? "correct" : "wrong";
}

export function reduceBoard(
  spec: MatchBoardSpec,
  state: BoardState,
  action: BoardAction,
): BoardState {
  switch (action.kind) {
    case "clear":
      return state.selected === null ? state : { ...state, selected: null };

    case "settle":
      if (state.pending === null) return state;
      return { ...state, pending: null, selected: null };

    case "pick": {
      // A pick during a transition is dropped rather than queued. Queueing it
      // would land a pair against a board the student is not looking at yet.
      if (state.pending !== null) return state;

      if (action.side === "prompt" && isPromptLanded(state, action.id)) return state;
      if (action.side === "target" && isTargetFull(spec, state, action.id)) return state;

      const selected = state.selected;
      if (selected === null) {
        return { ...state, selected: { side: action.side, id: action.id } };
      }
      if (selected.side === action.side) {
        // Same column: a second thought, not a pair. Tapping the same card
        // twice puts it back down.
        return {
          ...state,
          selected: selected.id === action.id ? null : { side: action.side, id: action.id },
        };
      }

      const promptId = action.side === "prompt" ? action.id : selected.id;
      const targetId = action.side === "target" ? action.id : selected.id;
      const attempts = state.attempts + 1;

      if (judgePair(spec, promptId, targetId) === "correct") {
        const pair: MatchingPair = { promptId, targetId };
        const message = messageForLanding(spec, promptId, targetId);
        return {
          ...state,
          landed: [...state.landed, pair],
          selected: null,
          attempts,
          lastMessage: message,
          pending: { promptId, targetId, outcome: "landed", message },
        };
      }

      const prior = missesOnPrompt(state, promptId);
      const message = messageForMiss(spec, promptId, targetId, prior);
      return {
        ...state,
        selected: null,
        attempts,
        misses: [...state.misses, { promptId, targetId, index: state.misses.length }],
        lastMessage: message,
        pending: { promptId, targetId, outcome: "rejected", message },
      };
    }

    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

/* ------------------------------------------------------------------ */
/* What is on screen                                                    */
/* ------------------------------------------------------------------ */

/**
 * A landed card stays on screen for exactly as long as its animation, which is
 * why `pending` is consulted here. Without that the pair would vanish on the
 * frame it landed and there would be nothing to animate.
 */
export function visiblePromptIds(
  spec: MatchBoardSpec,
  state: BoardState,
): readonly OptionId[] {
  return spec.answer.prompts
    .map((prompt) => prompt.id)
    .filter(
      (id) =>
        !isPromptLanded(state, id) ||
        (state.pending?.outcome === "landed" && state.pending.promptId === id),
    );
}

export function visibleTargetIds(
  spec: MatchBoardSpec,
  state: BoardState,
): readonly OptionId[] {
  return spec.answer.targets
    .map((target) => target.id)
    .filter(
      (id) =>
        !isTargetFull(spec, state, id) ||
        (state.pending?.outcome === "landed" && state.pending.targetId === id),
    );
}

/**
 * The target column, shuffled deterministically.
 *
 * WHY THIS IS NOT `Math.random`. The authored board lists pair i's target at
 * position i, so an unshuffled column is solved by reading straight down and
 * the beat tests nothing. A random shuffle would reorder the column on every
 * React re-render, which moves a card out from under a finger mid tap. Seeded
 * from the beat id, the order is stable for a given board across every render
 * and every machine, and a test can assert what it is.
 *
 * The rotate at the end guarantees at least one card moved: a seeded shuffle is
 * allowed to return the identity by chance, and a board that happens to line up
 * row for row is the exact defect this function exists to prevent.
 */
export function shuffledTargetIds(spec: MatchBoardSpec): readonly OptionId[] {
  const ids = spec.answer.targets.map((target) => target.id);
  if (ids.length < 2) return ids;

  let seed = 2166136261;
  for (const character of spec.beatId) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const next = (): number => {
    // A small linear congruential generator, the boring kind. Its constants are
    // Numerical Recipes'; nothing here needs a better one than that.
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    const held = shuffled[index] as OptionId;
    shuffled[index] = shuffled[swap] as OptionId;
    shuffled[swap] = held;
  }
  const unmoved = shuffled.every((id, index) => id === ids[index]);
  return unmoved ? [...shuffled.slice(1), shuffled[0] as OptionId] : shuffled;
}

export function landedCount(state: BoardState): number {
  return state.landed.length;
}

/* ------------------------------------------------------------------ */
/* Where focus goes when a pair clears                                  */
/* ------------------------------------------------------------------ */

/** What the view should focus once the settle has removed the landed cards. */
export type FocusTarget = "next-prompt" | "completion" | "none";

export interface FocusInput {
  /** Focus was inside the board at the instant the settle was dispatched. */
  readonly focusWasOnTheBoard: boolean;
  /** Focus is still on something the board owns, after the settle rendered. */
  readonly focusStillOnTheBoard: boolean;
}

/**
 * WHY THIS EXISTS, and it is the accessibility bug the first review caught.
 *
 * A pair that lands unmounts both of its buttons about a third of a second
 * later. The browser does not hand focus to a neighbour when the focused
 * element disappears: it drops focus to <body>. So a student pairing by
 * keyboard pressed Enter, watched the pair clear, and then had to tab from the
 * top of the document again, once per pair, four times a board. That is the
 * difference between "keyboard operable" as a claim and as a fact.
 *
 * The decision is pure and lives here so it can be tested; the view does the
 * two DOM reads it needs and then calls focus(). Three rules, and each is a
 * case in the test file:
 *
 *   Focus is never STOLEN. If the student was not on the board, we are not
 *   moving their cursor. A pointer user's focus sits on <body> the whole time
 *   and must be left there.
 *
 *   A bounced pair keeps its own focus. Nothing unmounted, so the button the
 *   student pressed still has it, and yanking focus to the top of the column
 *   after a wrong answer would lose their place for no reason.
 *
 *   The last pair goes to the celebration. There is no next prompt to land on,
 *   and the alternative is <body> again at the exact moment there is something
 *   new to read.
 */
export function focusTargetAfterSettle(
  spec: MatchBoardSpec,
  state: BoardState,
  input: FocusInput,
): FocusTarget {
  if (!input.focusWasOnTheBoard) return "none";
  if (state.pending !== null) return "none";
  if (input.focusStillOnTheBoard) return "none";
  return isBoardComplete(spec, state) ? "completion" : "next-prompt";
}

export function isBoardComplete(spec: MatchBoardSpec, state: BoardState): boolean {
  return state.landed.length === spec.answer.prompts.length;
}

/**
 * The finished board, graded by the package's own checker.
 *
 * Worth stating plainly because it looks redundant: every pair here was already
 * judged one at a time, so this always says correct on a complete board. It is
 * run anyway, because "the pairs I accepted add up to the board the author
 * wrote" is a claim worth checking against the checker rather than against my
 * own accumulation, and a test pins it.
 */
export function boardVerdict(spec: MatchBoardSpec, state: BoardState): MatchingVerdict {
  return checkMatching(spec.answer, { kind: "matching", pairs: state.landed });
}

/**
 * The named cause for a finished board.
 *
 * A board finished with no misses is the requested route. A board finished
 * after misses all made with ONE card is `matched_all_but_one_pair`, which says
 * exactly what happened. Misses spread across several cards get the logged tail
 * rather than a guess: `matched_by_name_not_by_property` is a real diagnostic
 * and this beat has no signal that would justify claiming it, so it stays
 * unreachable from here until an author supplies one. Naming a cause we cannot
 * evidence is how a wrong explanation becomes permanent.
 */
export function causeForBoard(state: BoardState): BeatCauseId {
  if (state.misses.length === 0) return "matches_requested_route";
  const missedPrompts = new Set(state.misses.map((miss) => miss.promptId));
  return missedPrompts.size === 1 ? "matched_all_but_one_pair" : "no_named_cause_logged";
}

export interface BeatResultInput {
  readonly elapsedMs: number;
  /** ISO 8601. Passed in rather than read from the clock, so this stays pure. */
  readonly at: string;
}

/**
 * The result the runner records. `correct` because the board a student leaves
 * is the board the author wrote: wrong pairs bounced and never became part of
 * it. What the misses cost is carried by the cause and by the mistake cards,
 * not by downgrading an outcome the student did reach.
 */
export function beatResultFor(
  spec: MatchBoardSpec,
  state: BoardState,
  input: BeatResultInput,
): BeatResult {
  return {
    kind: "correct",
    beatId: spec.beatId,
    level: spec.level,
    cause: causeForBoard(state),
    elapsedMs: input.elapsedMs,
    at: input.at,
  };
}

/**
 * The card a miss offers.
 *
 * CLAUDE.md's Anki borrow, at the moment it actually happens: a mistake offers
 * a card, the student saves it, and the scheduler brings it back. Front is the
 * card they misplaced, back is where it really goes, and `why` is the authored
 * explanation, so a card reviewed cold six weeks later still teaches rather
 * than only testing. The id is stable per beat and per prompt, so missing the
 * same card twice offers one card and not two.
 */
export function cardForMiss(spec: MatchBoardSpec, miss: Miss, at: string): Card {
  const truth = authoredTargetFor(spec, miss.promptId);
  const why = spec.whyByPrompt[miss.promptId];
  return {
    id: `${spec.beatId}:${miss.promptId}`,
    front: textOf(spec, miss.promptId),
    back: truth === undefined ? textOf(spec, miss.targetId) : textOf(spec, truth),
    why: why ?? "This one came up on a matching board and is worth a second look.",
    tags: ["match", spec.node],
    source: {
      kind: "mistake",
      beatId: spec.beatId,
      cause: "matched_all_but_one_pair",
      at,
    },
  };
}
