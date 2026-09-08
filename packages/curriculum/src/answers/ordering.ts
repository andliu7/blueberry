/**
 * Rank a list: the answer shape behind every ladder the course teaches.
 *
 * WHY THIS IS ITS OWN KIND AND NOT FOUR MULTIPLE CHOICE OPTIONS. The corpus
 * already carries `org2-pka-rank-four-acids`, which asks for a ranking and
 * offers four written out orderings to pick between. That works and it teaches
 * less than it could: a student picks a sentence rather than building an order,
 * the wrong answers are limited to the three an author had room to write, and
 * the near miss below cannot be named at all because the checker only ever knew
 * which sentence was tapped. Four items have twenty four orderings. This kind
 * grades all of them.
 *
 * THE NEAR MISS IS THE POINT. An acidity ladder answered with the top two
 * swapped is not the same mistake as an acidity ladder answered backwards, and
 * neither is the same as a list with nothing in place. One adjacent
 * transposition means the student has the ladder and disagrees about one rung,
 * which is a conversation about one comparison. A reversal means they built the
 * right ladder and read the question in the other direction, which is a
 * conversation about the prompt and not about chemistry. Both resolve at Tier 1
 * with no authoring at all, which is what CLAUDE.md's feedback axis is measured
 * on.
 *
 * TIES ARE AUTHORED, NEVER INFERRED. pka.ts carries three sites at 10, and
 * `mostAcidicSites` returns ties as ties on purpose rather than collapsing them
 * to whichever came first in an array. The same discipline holds here:
 * `acceptedAlternatives` is where an author records that two rungs are level, in
 * the same shape reagents.ts uses for a genuinely different route. Nothing in
 * this file looks at a pKa value or decides for itself that two things are
 * equal.
 *
 * WHY THERE IS NO "EVERY WRONG ORDER NEEDS AN EXPLANATION" RULE. problem.ts
 * demands one for multiple choice and major product because five options means
 * four wrong answers an author can actually write. Six items means seven hundred
 * and nineteen wrong orders, so the same demand would be a demand nobody can
 * meet. The named causes below are what covers the space instead, and an
 * authored distractor is for the specific wrong ladder an instructor knows gets
 * built.
 */

import type { OptionId } from "../ids.js";
import type { CurriculumCauseId } from "../causes.js";
import { assertOptionsValid, type ChoiceOption } from "./choice.js";

/**
 * One card to be ranked. Structurally a `ChoiceOption`, and deliberately so:
 * the same authoring validation runs over both, and a shell that can render an
 * option list can render a card.
 */
export type OrderingItem = ChoiceOption;

export interface OrderingState {
  readonly kind: "ordering";
  /** The ranked list as the student left it, best first by the spec's criterion. */
  readonly order: readonly OptionId[];
}

export interface OrderingAnswerSpec {
  readonly kind: "ordering";
  readonly items: readonly OrderingItem[];
  /** The authored ranking. First position is whatever `criterion` says it is. */
  readonly correctOrder: readonly OptionId[];
  /**
   * What the first position means, in the student's words: "most acidic",
   * "fastest to react". Student facing, never compared. It exists so a shell
   * can label the ends of the track, because an ordering with unlabelled ends
   * is a coin flip.
   */
  readonly criterion: string;
  /**
   * Whole orderings that are also correct, which is how a tie is recorded.
   *
   * Two rungs at the same pKa may legitimately be placed either way round, and
   * an author who knows that writes both orders here. The checker never decides
   * a tie for itself.
   */
  readonly acceptedAlternatives: readonly (readonly OptionId[])[];
}

export interface OrderingAnswerInput {
  readonly items: readonly OrderingItem[];
  readonly correctOrder: readonly OptionId[];
  readonly criterion: string;
  readonly acceptedAlternatives?: readonly (readonly OptionId[])[];
}

export type OrderingVerdict =
  | { readonly outcome: "correct" }
  | { readonly outcome: "wrong"; readonly cause: CurriculumCauseId; readonly detail: string }
  | { readonly outcome: "undecided"; readonly cause: CurriculumCauseId; readonly detail: string };

function sequencesEqual(a: readonly OptionId[], b: readonly OptionId[]): boolean {
  return a.length === b.length && a.every((id, position) => id === b[position]);
}

function isPermutationOf(order: readonly OptionId[], ids: ReadonlySet<OptionId>): boolean {
  if (order.length !== ids.size) return false;
  const seen = new Set<OptionId>();
  for (const id of order) {
    if (!ids.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

/** The two ids exchanged, when the submission is the expected order with exactly one adjacent pair swapped. */
function adjacentSwap(
  expected: readonly OptionId[],
  submitted: readonly OptionId[],
): readonly [OptionId, OptionId] | null {
  if (expected.length !== submitted.length) return null;
  const differing: number[] = [];
  for (let position = 0; position < expected.length; position += 1) {
    if (expected[position] !== submitted[position]) differing.push(position);
  }
  if (differing.length !== 2) return null;
  const [first, second] = differing as [number, number];
  if (second !== first + 1) return null;
  if (expected[first] !== submitted[second] || expected[second] !== submitted[first]) return null;
  return [expected[first] as OptionId, expected[second] as OptionId];
}

function isReversalOf(expected: readonly OptionId[], submitted: readonly OptionId[]): boolean {
  return sequencesEqual([...expected].reverse(), submitted);
}

function displacedCount(expected: readonly OptionId[], submitted: readonly OptionId[]): number {
  let count = 0;
  for (let position = 0; position < expected.length; position += 1) {
    if (expected[position] !== submitted[position]) count += 1;
  }
  return count;
}

export function createOrderingAnswer(input: OrderingAnswerInput): OrderingAnswerSpec {
  assertOptionsValid(input.items, "ordering");
  // Two items is a binary choice wearing a ladder's clothes: there are exactly
  // two orders, so multiple choice grades it with an authored explanation for
  // the wrong one, which is strictly more teaching than this kind can give.
  if (input.items.length < 3) {
    throw new Error(
      `an ordering of ${input.items.length} items has only two possible answers. Author it as a ` +
        `multiple choice, where the one wrong answer carries its own explanation.`,
    );
  }
  if (input.criterion.trim() === "") {
    throw new Error(
      "an ordering answer needs a criterion, because a track with unlabelled ends does not say " +
        "which direction the student is ranking in",
    );
  }
  const ids = new Set(input.items.map((item) => item.id));
  if (!isPermutationOf(input.correctOrder, ids)) {
    throw new Error(
      `the authored order must place every item exactly once. Got ${input.correctOrder.length} ` +
        `position(s) for ${ids.size} item(s).`,
    );
  }
  const alternatives = input.acceptedAlternatives ?? [];
  for (const alternative of alternatives) {
    if (!isPermutationOf(alternative, ids)) {
      throw new Error(
        `an accepted alternative ordering must place every item exactly once. Got ` +
          `${alternative.length} position(s) for ${ids.size} item(s).`,
      );
    }
    if (sequencesEqual(alternative, input.correctOrder)) {
      throw new Error("an accepted alternative that repeats the authored order accepts nothing new");
    }
  }
  for (let i = 0; i < alternatives.length; i += 1) {
    for (let j = i + 1; j < alternatives.length; j += 1) {
      if (sequencesEqual(alternatives[i] as readonly OptionId[], alternatives[j] as readonly OptionId[])) {
        throw new Error("two accepted alternative orderings are the same ordering");
      }
    }
  }

  return Object.freeze({
    kind: "ordering" as const,
    items: Object.freeze(input.items.map((item) => Object.freeze({ ...item }))),
    correctOrder: Object.freeze([...input.correctOrder]),
    criterion: input.criterion,
    acceptedAlternatives: Object.freeze(alternatives.map((order) => Object.freeze([...order]))),
  });
}

/** Every ordering this problem accepts, the authored one first. */
export function acceptedOrderings(spec: OrderingAnswerSpec): readonly (readonly OptionId[])[] {
  return [spec.correctOrder, ...spec.acceptedAlternatives];
}

/**
 * The accepted ordering a wrong submission is read against.
 *
 * NOT simply the nearest by count, and the difference only shows up on a
 * problem that records a tie. A submission can be two positions away from one
 * accepted ordering and the exact REVERSAL of another, and "this ladder is
 * built backwards" is the sentence worth saying: it is a whole explanation,
 * where "two out of place" is a score. So the choice runs by how specific the
 * resulting diagnosis is, one adjacent swap first, then a reversal, and only
 * then the smallest number of displaced positions. The authored order wins
 * every tie, so a shell quotes the answer an author wrote rather than an
 * alternative they merely allowed.
 */
function nearestAccepted(
  spec: OrderingAnswerSpec,
  order: readonly OptionId[],
): readonly OptionId[] {
  const candidates = acceptedOrderings(spec).filter(
    (candidate) => candidate.length === order.length,
  );
  const swapped = candidates.find((candidate) => adjacentSwap(candidate, order) !== null);
  if (swapped !== undefined) return swapped;
  const reversed = candidates.find((candidate) => isReversalOf(candidate, order));
  if (reversed !== undefined) return reversed;

  let nearest = spec.correctOrder;
  let best = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = displacedCount(candidate, order);
    if (distance < best) {
      best = distance;
      nearest = candidate;
    }
  }
  return nearest;
}

export interface OrderingBreakdown {
  /**
   * The accepted ordering the submission is read against. See
   * `orderingBreakdown` for how it is chosen; on a problem with no ties there
   * is only one and this is it.
   */
  readonly nearest: readonly OptionId[];
  /** Ids sitting where the nearest accepted ordering puts them. */
  readonly inPlace: readonly OptionId[];
  /** Ids sitting somewhere else. */
  readonly displaced: readonly OptionId[];
  /** The pair exchanged, when the only difference is one adjacent swap. */
  readonly swappedPair: readonly [OptionId, OptionId] | null;
  readonly reversed: boolean;
  readonly placed: number;
  readonly total: number;
}

/**
 * What was right about the ranking, for a shell that wants to show it.
 *
 * Same job as `matchingBreakdown` in matching.ts and the same reason: the
 * verdict union is three shapes wide and adding a per position payload to it
 * would change a type every checker in this package returns. A caller that
 * wants to leave four cards in place and highlight the two that moved calls
 * this; a caller that only needs to grade never does. It is pure, and it never
 * decides correctness.
 */
export function orderingBreakdown(
  spec: OrderingAnswerSpec,
  state: OrderingState,
): OrderingBreakdown {
  const nearest = nearestAccepted(spec, state.order);

  const inPlace: OptionId[] = [];
  const displaced: OptionId[] = [];
  for (let position = 0; position < state.order.length; position += 1) {
    const id = state.order[position] as OptionId;
    if (nearest[position] === id) inPlace.push(id);
    else displaced.push(id);
  }

  return Object.freeze({
    nearest,
    inPlace: Object.freeze(inPlace),
    displaced: Object.freeze(displaced),
    swappedPair: adjacentSwap(nearest, state.order),
    reversed: isReversalOf(nearest, state.order),
    placed: state.order.length,
    total: spec.items.length,
  });
}

/**
 * Grade a ranked list.
 *
 * The diagnosis runs against whichever accepted ordering `nearestAccepted`
 * picks rather than always against the authored one. On a problem with no ties
 * those are the same list. On a problem that records a tie they are not, and
 * diagnosing against the authored order alone would tell a student who swapped
 * one rung of an accepted alternative that their whole ladder is wrong, which
 * is both harsher and less true.
 */
export function checkOrdering(spec: OrderingAnswerSpec, state: OrderingState): OrderingVerdict {
  const ids = new Set(spec.items.map((item) => item.id));
  const seen = new Set<OptionId>();
  for (const id of state.order) {
    if (!ids.has(id)) {
      return {
        outcome: "undecided",
        cause: "ordering_submission_is_not_from_the_item_list",
        detail: `${id} is not one of this problem's items`,
      };
    }
    if (seen.has(id)) {
      return {
        outcome: "undecided",
        cause: "ordering_submission_is_not_from_the_item_list",
        detail: `${id} appears in two positions`,
      };
    }
    seen.add(id);
  }

  if (state.order.length < spec.items.length) {
    const missing = [...ids].filter((id) => !seen.has(id));
    return {
      outcome: "wrong",
      cause: "ordering_is_incomplete",
      detail: `${state.order.length} of ${spec.items.length} placed, still off the track: ${missing.join(", ")}`,
    };
  }

  for (const accepted of acceptedOrderings(spec)) {
    if (sequencesEqual(accepted, state.order)) return { outcome: "correct" };
  }

  const breakdown = orderingBreakdown(spec, state);
  if (breakdown.swappedPair !== null) {
    const [first, second] = breakdown.swappedPair;
    return {
      outcome: "wrong",
      cause: "ordering_one_adjacent_pair_swapped",
      detail: `everything else in place, ${first} and ${second} exchanged`,
    };
  }
  if (breakdown.reversed) {
    return {
      outcome: "wrong",
      cause: "ordering_is_reversed",
      detail: `the accepted order back to front, ranked by ${spec.criterion} in the other direction`,
    };
  }
  return {
    outcome: "wrong",
    cause: "ordering_does_not_match",
    detail: `${breakdown.displaced.length} of ${breakdown.total} out of place`,
  };
}

/**
 * Distractor matching for an ordering: the same sequence the student built.
 *
 * Exact, and it has to be. A predicted wrong ladder is a specific ladder, and
 * an author writing "phenol placed above the carboxylic acid" means that
 * ordering, not every ordering that shares the mistake. Two authored
 * distractors at the same point are refused by problem.ts.
 */
export function orderingStateMatches(target: OrderingState, submitted: OrderingState): boolean {
  return sequencesEqual(target.order, submitted.order);
}
