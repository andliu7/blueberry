/**
 * The major product answer shape: a ranked choice among candidate products,
 * plus the reason the winner wins.
 *
 * CLAUDE.md asks for "a choice among candidate products, and the reason it
 * wins". Both halves are here, and the reason is not optional decoration: a
 * student who picks the right product for the wrong reason has not learned
 * Markovnikov, they have learned to recognise a picture, and the authored
 * ranking argument is what separates the two.
 *
 * Modelled as a full ORDER rather than a single pick. A plain "which one wins"
 * question reads the head of the list and ignores the rest, so one model covers
 * both, and no second shape appears the first time a problem asks a student to
 * rank three products by rate.
 *
 * Tap only again, and by the same arm and commit rule as everywhere else: tap
 * the candidate you want to move, then tap the position you want it in.
 */

import type { InteractionCommand } from "../commands.js";
import { haptic } from "../effects.js";
import type { CandidateId, ReasonId } from "../ids.js";
import { notice } from "../notices.js";
import type { HitTarget } from "../targets.js";
import { move } from "./reagents.js";
import { changed, emitted, refused, unchanged, type ShapeOutcome } from "./outcome.js";

export interface RankingDraft {
  readonly shape: "ranking";
  /** Best first. Starts in whatever order the problem presented them. */
  readonly order: readonly CandidateId[];
  /** The authored reason the head of the list wins. Null until chosen. */
  readonly reason: ReasonId | null;
  /** The candidate armed for a move. Null when nothing is armed. */
  readonly armed: CandidateId | null;
}

export function createRankingDraft(candidates: readonly CandidateId[]): RankingDraft {
  return Object.freeze({
    shape: "ranking" as const,
    order: Object.freeze([...candidates]),
    reason: null,
    armed: null,
  });
}

/** The student's answer to "which one wins". Null when there are no candidates. */
export function chosenCandidate(draft: RankingDraft): CandidateId | null {
  return draft.order[0] ?? null;
}

export function applyToRanking(
  draft: RankingDraft,
  command: InteractionCommand,
): ShapeOutcome<RankingDraft> {
  switch (command.kind) {
    case "selectTarget":
      return selectTarget(draft, command.target);

    case "clearSelection":
      if (draft.armed === null) return unchanged(draft);
      return changed(Object.freeze({ ...draft, armed: null }), "disarmed");

    case "setReason":
      return setReason(draft, command.reasonId);

    case "submit":
      return emitted(draft, [{ kind: "submitAttempt", draft }]);

    default:
      return refused(draft, [
        notice(
          "command_not_valid_in_this_shape",
          "refused",
          `${command.kind} does nothing in the major product shape`,
        ),
      ]);
  }
}

function selectTarget(draft: RankingDraft, target: HitTarget): ShapeOutcome<RankingDraft> {
  switch (target.kind) {
    case "candidate":
      return candidateStep(draft, target.candidateId);

    case "reasonTile":
      return setReason(draft, target.reasonId);

    case "empty":
      if (draft.armed === null) return unchanged(draft);
      return changed(Object.freeze({ ...draft, armed: null }), "disarmed");

    default:
      return refused(draft, [
        notice(
          "target_not_valid_in_this_shape",
          "refused",
          `${target.kind} belongs to another answer shape`,
          { target },
        ),
      ]);
  }
}

function candidateStep(draft: RankingDraft, candidateId: CandidateId): ShapeOutcome<RankingDraft> {
  const index = draft.order.indexOf(candidateId);
  if (index < 0) {
    return refused(draft, [
      notice(
        "unknown_candidate",
        "refused",
        `${candidateId} is not one of the candidates on this problem`,
      ),
    ]);
  }

  if (draft.armed === null) {
    return changed(Object.freeze({ ...draft, armed: candidateId }), "armed", [haptic("selection")]);
  }
  if (draft.armed === candidateId) {
    return changed(Object.freeze({ ...draft, armed: null }), "disarmed");
  }

  const from = draft.order.indexOf(draft.armed);
  if (from < 0) {
    // The armed candidate left the list somehow. Drop the selection rather than
    // moving something arbitrary. A disarm and nothing else: the order is
    // untouched, so no work was committed.
    return changed(Object.freeze({ ...draft, armed: null }), "disarmed");
  }
  return changed(
    Object.freeze({ ...draft, order: move(draft.order, from, index), armed: null }),
    "committed",
    [haptic("commit")],
  );
}

function setReason(draft: RankingDraft, reasonId: ReasonId | null): ShapeOutcome<RankingDraft> {
  if (draft.order.length === 0) {
    return refused(draft, [
      notice(
        "reason_requires_a_choice",
        "refused",
        "there is nothing to give a reason about until there are candidates",
      ),
    ]);
  }
  if (draft.reason === reasonId) return unchanged(draft);
  // The reason is half the answer on this shape, per the header, so choosing one
  // is a commit rather than a mode change.
  return changed(Object.freeze({ ...draft, reason: reasonId }), "committed", [haptic("commit")]);
}
