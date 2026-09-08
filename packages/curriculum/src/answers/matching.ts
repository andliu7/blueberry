/**
 * Match a set of prompts to a set of targets: reagent to job, spectral feature
 * to structural claim, name to ladder rung.
 *
 * WHY THE BOARD IS NOT GRADED AS ONE THING. A student who puts three of four
 * reagents on the right job has three quarters of the chemistry, and a checker
 * that answers "wrong" has thrown away the only useful sentence available:
 * which one moved. So the verdict names how many are out of place, and
 * `matchingBreakdown` hands a shell the pairs themselves so the three that
 * landed can stay landed while the fourth is picked back up. That is the whole
 * argument for this kind existing rather than four separate multiple choice
 * questions: the mistakes on a board are RELATED, and a swap is the clearest
 * example. Two reagents in each other's places is one confusion, not two
 * errors, and it reads as one sentence.
 *
 * TARGET REUSE IS AN AUTHORED DECISION. Two boards look alike and grade
 * differently. A bijection, four reagents onto four transformations, cannot
 * carry exactly one wrong pair: displacing one prompt always displaces another,
 * so the near miss on a bijection is the SWAP. A board where several reagents
 * share a job, four reagents onto three categories, can carry exactly one wrong
 * pair, and there the near miss is that single pair. Both causes exist, both are
 * reachable, and which one a given problem can produce follows from
 * `allowTargetReuse` rather than from anything the checker guesses.
 *
 * MORE TARGETS THAN PROMPTS IS ALLOWED AND IS NOT REUSE. A decoy job nobody
 * does is a legitimate authored distractor sitting in the target column, and it
 * costs nothing to grade. What `allowTargetReuse` controls is whether ONE target
 * may take more than one prompt.
 *
 * WHY THERE IS NO "EVERY WRONG BOARD NEEDS AN EXPLANATION" RULE. Same reason as
 * ordering.ts: four prompts onto four targets is twenty four boards, and
 * problem.ts's finite space rule exists for answer spaces an author can actually
 * enumerate. The named causes cover the space; an authored distractor is for the
 * specific confusion an instructor knows by name.
 */

import type { OptionId } from "../ids.js";
import type { CurriculumCauseId } from "../causes.js";
import { assertOptionsValid, type ChoiceOption } from "./choice.js";

/** A row in the left column. Structurally a `ChoiceOption`, and validated as one. */
export type MatchingPrompt = ChoiceOption;
/** A row in the right column. Same shape, different job, named apart for the reader. */
export type MatchingTarget = ChoiceOption;

export interface MatchingPair {
  readonly promptId: OptionId;
  readonly targetId: OptionId;
}

export interface MatchingState {
  readonly kind: "matching";
  /** The board as the student left it. Pair order is never compared. */
  readonly pairs: readonly MatchingPair[];
}

export interface MatchingAnswerSpec {
  readonly kind: "matching";
  readonly prompts: readonly MatchingPrompt[];
  readonly targets: readonly MatchingTarget[];
  /** The authored board. Exactly one pair per prompt. */
  readonly pairs: readonly MatchingPair[];
  /** Whether one target may take more than one prompt. See the file header. */
  readonly allowTargetReuse: boolean;
}

export interface MatchingAnswerInput {
  readonly prompts: readonly MatchingPrompt[];
  readonly targets: readonly MatchingTarget[];
  readonly pairs: readonly MatchingPair[];
  readonly allowTargetReuse?: boolean;
}

export type MatchingVerdict =
  | { readonly outcome: "correct" }
  | { readonly outcome: "wrong"; readonly cause: CurriculumCauseId; readonly detail: string }
  | { readonly outcome: "undecided"; readonly cause: CurriculumCauseId; readonly detail: string };

function pairMap(pairs: readonly MatchingPair[]): ReadonlyMap<OptionId, OptionId> {
  const map = new Map<OptionId, OptionId>();
  for (const pair of pairs) map.set(pair.promptId, pair.targetId);
  return map;
}

export function createMatchingAnswer(input: MatchingAnswerInput): MatchingAnswerSpec {
  assertOptionsValid(input.prompts, "matching prompts");
  assertOptionsValid(input.targets, "matching targets");

  const promptIds = new Set(input.prompts.map((prompt) => prompt.id));
  const targetIds = new Set(input.targets.map((target) => target.id));
  const overlap = [...promptIds].filter((id) => targetIds.has(id));
  if (overlap.length > 0) {
    // A shared id makes a dropped card ambiguous in the state, and makes a
    // report of "b is on the wrong job" unreadable.
    throw new Error(
      `matching prompt and target ids must be distinct, and ${overlap.join(", ")} appear in both columns`,
    );
  }

  const paired = new Set<OptionId>();
  const targetUse = new Map<OptionId, number>();
  for (const pair of input.pairs) {
    if (!promptIds.has(pair.promptId)) {
      throw new Error(`the authored board pairs ${pair.promptId}, which is not one of the prompts`);
    }
    if (!targetIds.has(pair.targetId)) {
      throw new Error(`the authored board pairs ${pair.promptId} to ${pair.targetId}, which is not one of the targets`);
    }
    if (paired.has(pair.promptId)) {
      throw new Error(`the authored board pairs ${pair.promptId} twice, so it has two right answers`);
    }
    paired.add(pair.promptId);
    targetUse.set(pair.targetId, (targetUse.get(pair.targetId) ?? 0) + 1);
  }
  const unpaired = [...promptIds].filter((id) => !paired.has(id));
  if (unpaired.length > 0) {
    throw new Error(
      `the authored board leaves ${unpaired.join(", ")} with no target, so those rows have no right answer`,
    );
  }

  const allowTargetReuse = input.allowTargetReuse ?? false;
  const reused = [...targetUse].filter(([, count]) => count > 1).map(([id]) => id);
  if (!allowTargetReuse && reused.length > 0) {
    throw new Error(
      `the authored board puts more than one prompt on ${reused.join(", ")} while allowTargetReuse ` +
        `is false. Set it true if the chemistry really is many to one, because the checker's near ` +
        `miss rule depends on knowing which board this is.`,
    );
  }
  if (allowTargetReuse && reused.length === 0) {
    throw new Error(
      "allowTargetReuse is true and every target takes exactly one prompt, which is a bijection " +
        "declared as something else. On a bijection the near miss is a swap, and this flag would " +
        "hide that.",
    );
  }

  return Object.freeze({
    kind: "matching" as const,
    prompts: Object.freeze(input.prompts.map((prompt) => Object.freeze({ ...prompt }))),
    targets: Object.freeze(input.targets.map((target) => Object.freeze({ ...target }))),
    pairs: Object.freeze(input.pairs.map((pair) => Object.freeze({ ...pair }))),
    allowTargetReuse,
  });
}

export interface MatchingBreakdown {
  /** Pairs the student made that the authored board agrees with. */
  readonly correct: readonly MatchingPair[];
  /** Pairs the student made that sit on a different target from the authored one. */
  readonly wrong: readonly MatchingPair[];
  /** Prompts the student left with no target at all. */
  readonly unpaired: readonly OptionId[];
  readonly correctCount: number;
  readonly total: number;
}

/**
 * Which pairs were right, for a shell that wants to say so.
 *
 * The verdict union this package grades through is three shapes wide and shared
 * by every checker, so a per pair payload does not belong in it. This is the
 * function that carries it instead: pure, derived from the same two arguments
 * the checker reads, and never consulted for correctness. A lesson player calls
 * it to leave the right cards where they are.
 */
export function matchingBreakdown(
  spec: MatchingAnswerSpec,
  state: MatchingState,
): MatchingBreakdown {
  const authored = pairMap(spec.pairs);
  const submitted = pairMap(state.pairs);
  const correct: MatchingPair[] = [];
  const wrong: MatchingPair[] = [];
  for (const prompt of spec.prompts) {
    const chosen = submitted.get(prompt.id);
    if (chosen === undefined) continue;
    const pair: MatchingPair = Object.freeze({ promptId: prompt.id, targetId: chosen });
    if (authored.get(prompt.id) === chosen) correct.push(pair);
    else wrong.push(pair);
  }
  const unpaired = spec.prompts
    .map((prompt) => prompt.id)
    .filter((id) => !submitted.has(id));

  return Object.freeze({
    correct: Object.freeze(correct),
    wrong: Object.freeze(wrong),
    unpaired: Object.freeze(unpaired),
    correctCount: correct.length,
    total: spec.prompts.length,
  });
}

/** The two prompts holding each other's targets, when that is the only difference. */
function swappedPromptPair(
  spec: MatchingAnswerSpec,
  wrong: readonly MatchingPair[],
): readonly [OptionId, OptionId] | null {
  if (wrong.length !== 2) return null;
  const authored = pairMap(spec.pairs);
  const [first, second] = wrong as [MatchingPair, MatchingPair];
  if (authored.get(first.promptId) !== second.targetId) return null;
  if (authored.get(second.promptId) !== first.targetId) return null;
  return [first.promptId, second.promptId];
}

export function checkMatching(spec: MatchingAnswerSpec, state: MatchingState): MatchingVerdict {
  const promptIds = new Set(spec.prompts.map((prompt) => prompt.id));
  const targetIds = new Set(spec.targets.map((target) => target.id));
  const seen = new Set<OptionId>();
  for (const pair of state.pairs) {
    if (!promptIds.has(pair.promptId)) {
      return {
        outcome: "undecided",
        cause: "matching_submission_is_not_on_the_board",
        detail: `${pair.promptId} is not one of this problem's prompts`,
      };
    }
    if (!targetIds.has(pair.targetId)) {
      return {
        outcome: "undecided",
        cause: "matching_submission_is_not_on_the_board",
        detail: `${pair.targetId} is not one of this problem's targets`,
      };
    }
    if (seen.has(pair.promptId)) {
      return {
        outcome: "undecided",
        cause: "matching_submission_is_not_on_the_board",
        detail: `${pair.promptId} carries two targets, so the board does not say which one is the answer`,
      };
    }
    seen.add(pair.promptId);
  }

  const breakdown = matchingBreakdown(spec, state);
  if (breakdown.unpaired.length > 0) {
    return {
      outcome: "wrong",
      cause: "matching_board_incomplete",
      detail:
        `${breakdown.correctCount} of ${breakdown.total} placed correctly, still waiting: ` +
        `${breakdown.unpaired.join(", ")}`,
    };
  }
  if (breakdown.wrong.length === 0) return { outcome: "correct" };

  const swapped = swappedPromptPair(spec, breakdown.wrong);
  if (swapped !== null) {
    return {
      outcome: "wrong",
      cause: "matching_pairs_swapped",
      detail: `${swapped[0]} and ${swapped[1]} are in each other's places`,
    };
  }
  if (breakdown.wrong.length === 1) {
    const only = breakdown.wrong[0] as MatchingPair;
    return {
      outcome: "wrong",
      cause: "matching_one_pair_wrong",
      detail: `${breakdown.correctCount} of ${breakdown.total} landed, ${only.promptId} is on ${only.targetId}`,
    };
  }
  return {
    outcome: "wrong",
    cause: "matching_does_not_match",
    detail: `${breakdown.wrong.length} of ${breakdown.total} on the wrong target`,
  };
}

/**
 * Distractor matching for a board: the same prompt to target map, whatever
 * order the pairs happen to be listed in.
 *
 * Pair order is a fact about the drag sequence and not about the answer, so two
 * states that assign the same targets are one point in answer space. A
 * distractor written prompt by prompt therefore catches a student who built the
 * same board from the other end, which is what an author means.
 */
export function matchingStateMatches(target: MatchingState, submitted: MatchingState): boolean {
  const left = pairMap(target.pairs);
  const right = pairMap(submitted.pairs);
  if (left.size !== right.size) return false;
  for (const [promptId, targetId] of left) {
    if (right.get(promptId) !== targetId) return false;
  }
  return true;
}
