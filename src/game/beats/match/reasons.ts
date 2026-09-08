/**
 * What the board SAYS when a pair lands and when a pair bounces.
 *
 * THIS FILE IS THE POINT OF THE PIECE. The reference capture
 * ("reference images/matching - not ideal but okay.png") draws four connectors
 * and grades them on a Continue press, and a wrong connector gets no sentence
 * at all. The owner's note on it is "not ideal but okay", so this is the beat
 * where the job is to beat the reference rather than match it, and the gap the
 * reference leaves is exactly this: the student learns THAT they were wrong and
 * never WHY those two do not go together.
 *
 * THE ORDER OF TIERS, and it is CLAUDE.md's order rather than one invented
 * here: authored copy pre-empts derived copy, because a decoy's `why` was
 * written by an instructor for this exact confusion and a sentence assembled
 * out of two card labels was not. So:
 *
 *   1. The student landed on a DECOY that carries a `why`. That is the Tier 2
 *      anticipated distractor, on this exact board, and it wins outright.
 *   2. The student has missed with this same card before and the board carries
 *      an authored `why` for what that card IS for. Second miss, so the coach
 *      stops withholding and hands over the thread.
 *   3. Derived, and it names both cards. Nothing on this board goes there, or
 *      that is not what this card does.
 *
 * WHAT THE FIRST MISS DELIBERATELY DOES NOT SAY. It never names the prompt that
 * the target really belongs to. On a four pair board that is a quarter of the
 * answer handed over for one wrong tap, and a board that pays out for guessing
 * teaches guessing. The first miss says what is true and specific and stops
 * there; the second miss teaches. That escalation is the reason
 * `priorMissesOnPrompt` is an argument.
 *
 * VOICE, per CLAUDE.md. A coach on the student's side: name what happened
 * plainly, treat the miss as the normal step it is, make the next move
 * reachable. No "you should have", no rhetorical questions, no praise that
 * would fit any answer. A landed pair is congratulated by NAMING WHAT THE
 * STUDENT DID, because specific praise reads as seen and "Nice work!" does not.
 *
 * Pure. No React, no clock, no storage. Everything it needs arrives as an
 * argument, which is what makes the copy testable sentence by sentence.
 */

import type { OptionId } from "@blueberry/curriculum";
import { authoredLoadOf, textOf, type MatchBoardSpec } from "./spec";

/**
 * One thing the board says about one pair.
 *
 * Two fields rather than one string because the view treats them differently:
 * the headline is the sentence that must be readable in the half second the
 * card is on its way out, and the detail is the teaching that stays. A caller
 * that wants one string joins them.
 */
export interface PairMessage {
  readonly tone: "landed" | "rejected";
  /** Names the two cards. Always present. */
  readonly headline: string;
  /** The teaching line. Absent when nothing authored applies yet. */
  readonly detail?: string;
}

export function joinMessage(message: PairMessage): string {
  return message.detail === undefined
    ? message.headline
    : `${message.headline} ${message.detail}`;
}

/**
 * A pair landed. Specific praise: the two cards by name, then the authored
 * reason the pairing is the pairing.
 */
export function messageForLanding(
  spec: MatchBoardSpec,
  promptId: OptionId,
  targetId: OptionId,
): PairMessage {
  const left = textOf(spec, promptId);
  const right = textOf(spec, targetId);
  const why = spec.whyByPrompt[promptId];
  return {
    tone: "landed",
    headline: `${left} lands on ${right}.`,
    ...(why === undefined ? {} : { detail: why }),
  };
}

/**
 * A pair bounced. See the tier order in the header.
 *
 * `priorMissesOnPrompt` counts misses made with this same left hand card BEFORE
 * this one, so zero is the first miss.
 */
export function messageForMiss(
  spec: MatchBoardSpec,
  promptId: OptionId,
  targetId: OptionId,
  priorMissesOnPrompt: number,
): PairMessage {
  const left = textOf(spec, promptId);
  const right = textOf(spec, targetId);

  // Tier 1: the authored decoy. Written for this confusion, so it wins.
  const decoyWhy = spec.whyByDecoy[targetId];
  if (decoyWhy !== undefined) {
    return {
      tone: "rejected",
      headline: `${left} does not belong on ${right}.`,
      detail: decoyWhy,
    };
  }

  // Tier 2: second miss with this card. Stop withholding and teach.
  const ownWhy = spec.whyByPrompt[promptId];
  if (priorMissesOnPrompt >= 1 && ownWhy !== undefined) {
    return {
      tone: "rejected",
      headline: `Not ${right} either.`,
      detail: `Here is what ${left} is for: ${ownWhy}`,
    };
  }

  // Tier 3, derived. Two shapes, and each is a fact about THIS board.
  if (authoredLoadOf(spec, targetId) === 0) {
    return {
      tone: "rejected",
      headline: `Nothing on this board goes on ${right}.`,
      detail: "That row is there to be ruled out. Every card on the left has a home somewhere else.",
    };
  }
  return {
    tone: "rejected",
    headline: `${right} is not what ${left} does.`,
    detail: `${left} has its own row still on the board.`,
  };
}

/**
 * The line above the board: how far in they are.
 *
 * The reference has no sense of progress within a board at all, which is the
 * third weakness named in this piece's brief. A count is the cheapest honest
 * fix and it is the one a screen reader can also read, which is why the view
 * puts this exact string in the live region rather than only drawing a bar.
 */
export function progressLine(landed: number, total: number): string {
  if (landed === 0) return `${total} pairs to find.`;
  if (landed === total) return `All ${total} matched.`;
  return `${landed} of ${total} matched, ${total - landed} to go.`;
}

/**
 * What the board says when the last pair lands.
 *
 * A clean board and a board finished after a few bounces get different
 * sentences, because "you got there without a wrong turn" is only true of one
 * of them and a celebration that would fit either is the hollow kind.
 */
export function completionLine(total: number, misses: number): string {
  if (misses === 0) return `All ${total} on the first try. That is the whole board read correctly.`;
  if (misses === 1) return `All ${total} matched, with one card that took a second look.`;
  return `All ${total} matched. ${misses} took a second look, and that is how a board like this usually goes.`;
}
