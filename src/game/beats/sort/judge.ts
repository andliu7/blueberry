/**
 * Grading a sort, and the one place a curriculum verdict becomes a beat result.
 *
 * NOTHING HERE DECIDES CORRECTNESS. `gradeAttempt` in packages/curriculum does
 * that, over the `ordering` answer kind, and it also runs CLAUDE.md's tier
 * order: a notation cause, then an authored distractor, then a diagnostic
 * cause, then the logged tail. Re-implementing any of that here would be a
 * second grader that could disagree with the first, and the first is the one
 * the validators measure. This file translates, and translation is all it does.
 *
 * THE TRANSLATION, and why it is not the identity. A curriculum verdict speaks
 * in `CurriculumCauseId` and five outcomes. A beat result speaks in
 * `BeatCauseId` and the repository's four outcomes. The mapping is a table
 * below rather than a chain of ifs, so a cause added to either side shows up as
 * a missing key rather than as a silently generic result.
 *
 * PARTIAL CREDIT IS THE POINT OF THIS BEAT. An acidity ladder answered with two
 * neighbours exchanged is not the same mistake as one answered backwards, and
 * neither is the same as a list with nothing in place. `orderingBreakdown`
 * already separates those, so the headline names the two cards that traded
 * places rather than saying "wrong". Where an instructor anticipated the exact
 * ladder, the authored Tier 2 explanation is shown instead and this file only
 * chooses the outcome.
 *
 * WHY A REVERSED LADDER IS `valid_not_requested` AND NOT `invalid`. CLAUDE.md's
 * four result types put "chemically sound but a different transformation" in
 * its own case, carrying the name of what was actually built. A ladder built
 * correctly and read from the other end is exactly that: every comparison in it
 * holds. So is the basicity ladder handed in for a nucleophilicity question.
 * Marking either of those `invalid` would tell a student their chemistry was
 * impossible when it was sound, which is the unfair grade CLAUDE.md's result
 * type three exists to prevent.
 *
 * UNFINISHED IS NOT WRONG. A board with an empty rung returns `unfinished` and
 * no result at all, so nothing is written to the attempt history for a student
 * who has not answered yet. The view keeps Check disabled until the track is
 * full, and this is the second guard behind that.
 */

import {
  gradeAttempt,
  orderingBreakdown,
  type CurriculumCauseId,
  type Explanation,
  type FeedbackTier,
  type OrderingBreakdown,
  type OrderingState,
} from "@blueberry/curriculum";
import { canFail, type BeatResult, type BeatShapeCauseId, type MasteryLevel } from "../types";
import { boardIsComplete, boardOrder, emptyRungCount, type SortBoard } from "./board";
import type { DistractorMeaning, SortContent } from "./ladders";

export interface JudgeContext {
  /** The rung of the mastery ladder this was played at. Recorded on the result. */
  readonly level: MasteryLevel;
  readonly elapsedMs: number;
  /** ISO 8601. Passed in rather than read from the clock, so this stays pure. */
  readonly at: string;
}

export type SortJudgement =
  | { readonly status: "unfinished"; readonly emptyRungs: number }
  | {
      readonly status: "judged";
      readonly result: BeatResult;
      /** Which feedback tier answered. Null on a correct answer, which has no tier. */
      readonly tier: FeedbackTier | null;
      /** Authored copy: the solution on a correct answer, the distractor's on a Tier 2 hit. */
      readonly explanation: Explanation | null;
      /** One line over the card, always present, in the coach voice. */
      readonly headline: string;
      readonly breakdown: OrderingBreakdown;
    };

/**
 * Curriculum cause to beat shape cause.
 *
 * A total Record rather than a switch with a default, so adding an ordering
 * cause to packages/curriculum fails this file at compile time instead of
 * quietly resolving to the tail. Only the ordering causes appear: the other
 * kinds cannot reach a sort beat, and listing them would imply they could.
 */
type OrderingCauseId = Extract<CurriculumCauseId, `ordering_${string}`>;

const SHAPE_CAUSE: Readonly<Record<OrderingCauseId, BeatShapeCauseId>> = Object.freeze({
  ordering_one_adjacent_pair_swapped: "order_adjacent_pair_swapped",
  ordering_is_reversed: "order_fully_reversed",
  // The generic tail. BeatShapeCauseId names it plainly rather than guessing at
  // a reason, which is what CLAUDE.md means by logging the Tier 3 tail.
  ordering_does_not_match: "no_named_cause_logged",
  // Unreachable through the view, which keeps Check disabled until the track is
  // full, and unreachable through judgeSort, which returns `unfinished` first.
  // Mapped anyway so the Record stays total. BeatShapeCauseId has no member for
  // an unfinished ordering; that gap is reported as an integration note rather
  // than papered over with a cause that would claim something untrue.
  ordering_is_incomplete: "no_named_cause_logged",
  // A submission naming an item this problem does not carry is a defect in this
  // shell, not a student error. The board model makes it unreachable and the
  // tests fuzz that invariant.
  ordering_submission_is_not_from_the_item_list: "no_named_cause_logged",
});

function shapeCause(cause: CurriculumCauseId): BeatShapeCauseId {
  const mapped = (SHAPE_CAUSE as Readonly<Record<string, BeatShapeCauseId | undefined>>)[cause];
  return mapped ?? "no_named_cause_logged";
}

function meaningFor(content: SortContent, distractorId: string): DistractorMeaning | undefined {
  return content.distractorMeanings.find((meaning) => meaning.id === distractorId);
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** The two cards that traded places, written out for a student. */
function labelOf(content: SortContent, id: string): string {
  return content.beat.items.find((item) => item.id === id)?.label ?? id;
}

/**
 * Grade one board.
 *
 * `content` supplies both halves: the problem gradeAttempt reads, and the
 * authored beat the headline is written from.
 */
export function judgeSort(
  content: SortContent,
  board: SortBoard,
  context: JudgeContext,
): SortJudgement {
  if (!boardIsComplete(board)) {
    return { status: "unfinished", emptyRungs: emptyRungCount(board) };
  }

  const state: OrderingState = { kind: "ordering", order: boardOrder(board) };
  const breakdown = orderingBreakdown(content.spec, state);
  const grading = gradeAttempt(content.problem, state);

  const base = {
    beatId: content.beat.id,
    level: context.level,
    elapsedMs: context.elapsedMs,
    at: context.at,
  } as const;

  // THE L0 CONTRACT, held here as well as in the ladder. A beat played at a
  // level that cannot fail records `correct` whatever the board says. Sort
  // beats declare levels 2 and 3, so this never fires today; it is here because
  // the contract belongs to the runner and not to the authoring.
  if (!canFail(context.level)) {
    return {
      status: "judged",
      result: { ...base, kind: "correct", cause: "matches_requested_route" },
      tier: null,
      explanation: content.problem.solution,
      headline: "That is the ladder. Here is why it stands up.",
      breakdown,
    };
  }

  if (grading.kind === "correct") {
    const exact = sameOrder(state.order, content.spec.correctOrder);
    if (exact) {
      return {
        status: "judged",
        result: { ...base, kind: "correct", cause: "matches_requested_route" },
        tier: null,
        explanation: grading.explanation,
        headline: `Every rung in place, ${content.trackEnds.first.toLowerCase()} at the top.`,
        breakdown,
      };
    }
    // An accepted alternative, which is how the curriculum package records a
    // tie. Same claim, other order, and saying so is the difference between
    // "correct" and "correct, and here is what you spotted".
    return {
      status: "judged",
      result: {
        ...base,
        kind: "correct_alternative_route",
        cause: "alternative_route_same_product",
        routeTaken: "the tied rungs placed the other way round",
      },
      tier: null,
      explanation: grading.explanation,
      headline: "Right. Those two sit on the same rung, so either order between them stands.",
      breakdown,
    };
  }

  if (grading.kind === "indeterminate") {
    // Only reachable from a shell defect: a submission naming a card this
    // problem does not carry. Reported honestly rather than scored either way.
    return {
      status: "judged",
      result: { ...base, kind: "invalid", cause: shapeCause(grading.cause) },
      tier: null,
      explanation: null,
      headline: "Something went wrong reading that board. Nothing was recorded against it.",
      breakdown,
    };
  }

  if (grading.kind === "matched_distractor") {
    const meaning = meaningFor(content, grading.distractorId);
    const cause: BeatShapeCauseId = meaning?.cause ?? "chose_authored_distractor";
    const built = meaning?.built;
    const result: BeatResult =
      built === undefined
        ? { ...base, kind: "invalid", cause, distractorId: grading.distractorId }
        : {
            ...base,
            kind: "valid_not_requested",
            cause,
            built,
            distractorId: grading.distractorId,
          };
    return {
      status: "judged",
      result,
      tier: 2,
      explanation: grading.explanation,
      headline:
        built === undefined
          ? "Close. This one catches a lot of people, and here is the comparison it turns on."
          : `That is ${built}, built soundly. It answers the other question.`,
      breakdown,
    };
  }

  // Tier 1 and Tier 3 both arrive here: a named diagnostic cause, or the tail.
  const cause = shapeCause(grading.cause);
  const tier: FeedbackTier = grading.kind === "named_cause" ? 1 : 3;

  if (cause === "order_fully_reversed") {
    const last = content.trackEnds.last.toLowerCase();
    return {
      status: "judged",
      result: {
        ...base,
        kind: "valid_not_requested",
        cause,
        built: `the same ladder, ${last} first`,
      },
      tier,
      explanation: null,
      headline: `The ladder is right and it is upside down. Flip it so ${content.trackEnds.first.toLowerCase()} is at the top.`,
      breakdown,
    };
  }

  if (cause === "order_adjacent_pair_swapped" && breakdown.swappedPair !== null) {
    const [first, second] = breakdown.swappedPair;
    return {
      status: "judged",
      result: { ...base, kind: "invalid", cause },
      tier,
      explanation: null,
      headline: `One pair to settle. Everything else is on its right rung, and ${labelOf(content, first)} and ${labelOf(content, second)} traded places.`,
      breakdown,
    };
  }

  const placed = breakdown.inPlace.length;
  return {
    status: "judged",
    result: { ...base, kind: "invalid", cause },
    tier,
    explanation: null,
    headline:
      placed === 0
        ? `Nothing landed yet. Start from the ends: pick the one card you are surest is ${content.trackEnds.first.toLowerCase()}.`
        : `${placed} of ${breakdown.total} are already on the right rung. Work down the track and check each neighbouring pair.`,
    breakdown,
  };
}
