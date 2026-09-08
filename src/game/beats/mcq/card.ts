/**
 * Turning a missed MCQ into a card offer. Pure: builds the objects, saves
 * nothing.
 *
 * THE MOMENT THIS SERVES, from the spec: a mistake happens, a toast says a card
 * would help and offers to save it, and saving shrinks the card and flies it to
 * the deck icon. This file owns the first half, the two objects that toast is
 * made of, so the animation and the store can be built and changed without
 * touching what a card actually says. `DeckSource.offer` and `DeckSource.saveCard`
 * in ../../cards/types.ts are what the screen calls with them.
 *
 * WHY THE RECO REASON IS THE OPTION'S OWN `why`. The Reco doc in cards/types.ts
 * asks for a line that is authored per cause rather than generic, because "this
 * one catches people out on the ring position" reads as seen and "you got this
 * wrong" does not. The most specific sentence available is the one an instructor
 * already wrote for exactly this distractor, so that is the line, unchanged. It
 * is also the sentence the student just read under the option, which means the
 * toast is continuous with the explanation rather than a second voice.
 *
 * WHY THE CARD ID IS DERIVED AND NOT MINTED. `mcq:<beatId>` is stable, so a
 * student who misses the same beat twice is offered the same card and saving it
 * again updates one card rather than growing a duplicate. That is the same
 * reason cards/types.ts keeps an externalId for the import path. The invariant
 * in that file holds here too: rewording the beat keeps the id, and asking a
 * different question means a new beat id and therefore a new card.
 *
 * WHAT THE CARD ASKS. Front is the beat's prompt, so the card asks the question
 * the student actually met. Back is the answer option's text. `why` is the
 * answer's authored explanation, which is the field cards/types.ts calls the one
 * that makes this ours rather than a flashcard clone: a card reviewed cold six
 * weeks later still explains itself.
 */

import type { Card, Reco } from "../../cards/types";
import type { McqBeat } from "../types";
import type { McqReveal } from "./grade";

/**
 * The deterministic card id for a beat. Stable across sessions and devices.
 *
 * The `mistake:` prefix is deliberate and shared. cards/Recommendation.tsx
 * already mints `mistake:<reactionId>:<arrowKey>` for a trainer miss and
 * cards/ui/cardsFromBeats.ts mints `beat:<beatId>` for a lesson card, so one
 * prefix separating "a card I earned by getting something wrong" from "a card
 * the lesson generated" keeps a deck filter to one rule rather than three. The
 * `beat:` segment after it is what stops a beat mistake colliding with a
 * trainer mistake, since both keyspaces are free strings.
 */
export function mcqCardId(beatId: string): string {
  return `mistake:beat:${beatId}`;
}

/**
 * The card a missed beat generates.
 *
 * `at` is passed in for the same reason grade.ts takes it: this stays pure and
 * a test can ask about a fixed timestamp.
 */
export function mcqCardFor(beat: McqBeat, reveal: McqReveal, at: string): Card {
  return {
    id: mcqCardId(beat.id),
    front: beat.prompt,
    back: reveal.answerText,
    why: reveal.answerWhy,
    // "mistake" first and the cause last, which is the tag convention
    // cards/Recommendation.tsx already set for a trainer miss, with the pathway
    // node and the concepts the review queue keys on in between.
    tags: ["mistake", beat.node, ...beat.conceptIds, reveal.result.cause],
    source: {
      kind: "mistake",
      beatId: beat.id,
      cause: reveal.result.cause,
      at,
    },
  };
}

/** The toast beside it. The reason is the authored line for what they picked. */
export function mcqRecoFor(beat: McqBeat, reveal: McqReveal, at: string): Reco {
  return {
    cardId: mcqCardId(beat.id),
    reason: reveal.chosenWhy,
    seenAt: at,
  };
}

/**
 * Whether to offer a card at all.
 *
 * Only on a pick that missed the answer, and that includes a first meeting: L0
 * clears the beat, and a student who met the idea and reached for the wrong
 * option is exactly who a card helps. A correct pick generates no offer here,
 * because a card per right answer is how a deck becomes noise. Lesson cards for
 * correct work are a different origin (`CardSource.kind === "lesson"`) and a
 * different builder's job.
 */
export function shouldOfferCard(reveal: McqReveal): boolean {
  return !reveal.matchedAnswer;
}

/**
 * Card and toast together, which is the pair a screen actually needs.
 *
 * Structurally this is cards/Recommendation.tsx's `CardOffer`, and it is not
 * imported from there on purpose: that module is a .tsx and importing it would
 * pull React into a path that is deliberately pure. Structural typing means the
 * value fits a `CardOffer` parameter anyway, so the integration is one call and
 * no adapter.
 */
export interface McqCardOffer {
  readonly card: Card;
  readonly reco: Reco;
}

/** The offer, or null when the pick matched and no card is worth pushing. */
export function mcqCardOffer(beat: McqBeat, reveal: McqReveal, at: string): McqCardOffer | null {
  if (!shouldOfferCard(reveal)) return null;
  return { card: mcqCardFor(beat, reveal, at), reco: mcqRecoFor(beat, reveal, at) };
}
