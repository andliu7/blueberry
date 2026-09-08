/**
 * Turning a synthesis gap into a card, and turning a mistake on one into an
 * offer.
 *
 * THE MOMENT THIS FILE SERVES, from the spec: a mistake happens, a toast says a
 * card would help and offers to save it, and saving flies the card to the deck
 * icon. Everything about that moment except the animation is here, because the
 * animation is the surface's and the CONTENT is authoring. The reason line on
 * the toast is written per cause rather than generically, for the reason
 * cards/types.ts gives: "this one catches people out on the ring position"
 * reads as seen and "you got this wrong" does not.
 *
 * WHY A CARD FROM A SYNTHESIS GAP IS THREE SIDED. Card carries front, back and
 * `why`, and the third field is what stops this being a flashcard clone. A gap
 * card's front is the arrow with a question mark on it, its back is the
 * reagent, and its `why` is the authored line that says what that reagent is
 * FOR. Six weeks later the front and back are a lookup; the `why` is the part
 * that still teaches.
 *
 * NO SCHEDULER HERE, same rule as cards/types.ts. This file makes cards and
 * offers. What happens to an interval after a rating is scheduler.ts's, and
 * nothing below sets an interval, an ease or a due date.
 */

import type { Card, CardId, Reco } from "../../cards/types";
import type { BeatResult, LessonId } from "../types";
import { answerOption, bankOption, gapStep, reasonOption, type SynthesisGapProblem } from "./problem";

/** What the row looks like just before the blank. The card's own set up. */
function stepBefore(problem: SynthesisGapProblem): string {
  const index = problem.steps.findIndex((step) => step.id === problem.gapStepId);
  if (index <= 0) return problem.start;
  return problem.steps[index - 1]?.produces ?? problem.start;
}

/**
 * The question a card asks, built from the row rather than authored twice.
 *
 * Authoring the front separately would let the card and the beat drift, and a
 * card that asks a slightly different question from the beat it came from is a
 * card that trains the wrong recall.
 */
export function gapQuestion(problem: SynthesisGapProblem): string {
  const step = gapStep(problem);
  const before = stepBefore(problem);
  switch (problem.gapKind) {
    case "reagent":
      return `${before} to ${step.produces ?? problem.target}: what goes over the arrow?`;
    case "reactant":
      return `${before} to ${step.produces ?? problem.target}: what does it react with?`;
    case "product":
      return `${before} with ${step.over ?? "these conditions"}: what comes out?`;
  }
}

/** A stable card id. Same beat, same gap, same card, across sessions. */
export function cardIdFor(problem: SynthesisGapProblem): CardId {
  return `card-${problem.id}`;
}

const BASE_TAGS = Object.freeze(["synthesis"]);

function tagsFor(problem: SynthesisGapProblem): readonly string[] {
  return [...BASE_TAGS, problem.node, problem.gapKind, ...problem.conceptIds];
}

/** The card a lesson generates from this gap, whether or not it was missed. */
export function cardFromGap(problem: SynthesisGapProblem, lessonId: LessonId): Card {
  return {
    id: cardIdFor(problem),
    front: gapQuestion(problem),
    back: answerOption(problem).text,
    why: problem.why,
    tags: tagsFor(problem),
    source: { kind: "lesson", lessonId, beatId: problem.id },
  };
}

/**
 * The card offered after a miss.
 *
 * It carries the CAUSE, because that is what the card drills: a card born from
 * "right family, wrong member" is a different card from one born from "right
 * reagents, wrong order", even when the front and back are the same two
 * sentences. Its `why` prefers the authored copy of whatever chip was matched,
 * because that copy was written for this exact mistake.
 */
export function cardFromMistake(problem: SynthesisGapProblem, result: BeatResult): Card {
  const chip =
    result.distractorId === undefined
      ? undefined
      : bankOption(problem, result.distractorId) ?? reasonOption(problem, result.distractorId);
  return {
    id: cardIdFor(problem),
    front: gapQuestion(problem),
    back: answerOption(problem).text,
    why: chip?.why ?? problem.why,
    tags: tagsFor(problem),
    source: {
      kind: "mistake",
      beatId: problem.id,
      cause: result.cause,
      at: result.at,
    },
  };
}

/**
 * The toast line. Specific to what the student actually did, per CLAUDE.md's
 * voice rule, and never a scolding construction.
 */
export function recoReason(problem: SynthesisGapProblem, result: BeatResult): string {
  const answer = answerOption(problem);
  const chip =
    result.distractorId === undefined
      ? undefined
      : bankOption(problem, result.distractorId) ?? reasonOption(problem, result.distractorId);

  if (result.kind === "valid_not_requested") {
    return `You built ${result.built} there, which is real. A card on when ${answer.text} is the right call would make this one automatic.`;
  }
  switch (result.cause) {
    case "synthesis_step_out_of_order":
      return "The reagents were right and the order was not. Order is the thing a card is best at.";
    case "reagent_right_class_wrong_reagent":
      return `That was a different set from the one this arrow takes. Keep ${answer.text} where you will find it again.`;
    case "synthesis_step_missing":
      return `Half of that condition was there. A card on ${answer.text} would fill in the rest.`;
    case "chose_authored_distractor":
      return chip === undefined
        ? `Worth keeping ${answer.text} somewhere you will see it again.`
        : `${chip.text} catches a lot of people here. Save the pair and it stops catching you.`;
    default:
      return `Worth keeping ${answer.text} somewhere you will see it again.`;
  }
}

/** The offer: the card, plus the line the toast shows and when it was shown. */
export interface GapCardOffer {
  readonly card: Card;
  readonly reco: Reco;
}

export function offerCardForMistake(
  problem: SynthesisGapProblem,
  result: BeatResult,
  now: Date,
): GapCardOffer {
  const card = cardFromMistake(problem, result);
  return {
    card,
    reco: {
      cardId: card.id,
      reason: recoReason(problem, result),
      seenAt: now.toISOString(),
    },
  };
}

/**
 * Whether a result should raise the offer at all.
 *
 * A correct answer does not, because a toast after every right answer is noise
 * and CLAUDE.md's reward rule is about celebrating, not interrupting. An
 * alternative route does not either: the student knew a second way to do it,
 * which is the opposite of a gap. The other two do.
 */
export function shouldOfferCard(result: BeatResult): boolean {
  return result.kind === "invalid" || result.kind === "valid_not_requested";
}
