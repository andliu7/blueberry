/**
 * The four answer shapes, as one union and one dispatch.
 *
 * WHAT MAKES A SHAPE A MODE RATHER THAN A SPECIAL CASE.
 *
 * A special case would look like this, spread through the machine:
 *
 *   if (shape === "mechanism") { ...arrow handling... }
 *   else if (shape === "reagents") { ...list handling... }
 *
 * repeated at every transition, so that adding the fifth thing means finding
 * every one of those branches. A mode looks like this instead: the machine holds
 * exactly one field saying which draft it has, every draft answers the same two
 * functions, and machine.ts contains no shape name at all. Adding a shape is
 * adding a file and one arm of this switch.
 *
 * The pointer layer, the undo stack, the session ownership rules and the drag
 * cancel rules are written once and are shape blind. That is the difference
 * CLAUDE.md is asking for when it says a state machine built only for dragging
 * arrows has to be rebuilt to take a reagent list.
 *
 * `undo`, `reviseLastTarget` and `setShape` never reach a shape reducer. They are
 * document operations, handled in machine.ts, and a shape does not get an opinion
 * about them.
 */

import { duplicateAtomIds, type MechanismState } from "@blueberry/chem-core";
import type { InteractionCommand } from "../commands.js";
import type { ArmedSourceHint } from "../geometryPort.js";
import { notice, type InteractionNotice } from "../notices.js";
import { applyToMechanism, mechanismArmedHint, type MechanismDraft } from "./mechanism.js";
import type { ShapeOutcome } from "./outcome.js";
import { applyToRanking, type RankingDraft } from "./ranking.js";
import { applyToReagents, type ReagentsDraft } from "./reagents.js";
import { applyToStructure, type StructureDraft } from "./structure.js";

export type ShapeDraft = MechanismDraft | StructureDraft | ReagentsDraft | RankingDraft;

export type AnswerShape = ShapeDraft["shape"];

export const ALL_ANSWER_SHAPES: readonly AnswerShape[] = [
  "mechanism",
  "structure",
  "reagents",
  "ranking",
];

export function applyToShape(
  draft: ShapeDraft,
  command: InteractionCommand,
): ShapeOutcome<ShapeDraft> {
  switch (draft.shape) {
    case "mechanism":
      return applyToMechanism(draft, command);
    case "structure":
      return applyToStructure(draft, command);
    case "reagents":
      return applyToReagents(draft, command);
    case "ranking":
      return applyToRanking(draft, command);
  }
}

/** What the hit tester should know about the current selection, per shape. */
export function armedHintFor(draft: ShapeDraft): ArmedSourceHint | null {
  switch (draft.shape) {
    case "mechanism":
      return mechanismArmedHint(draft);
    case "structure":
      if (draft.pendingBondFrom === null) return null;
      return {
        atomId: draft.pendingBondFrom,
        target: { kind: "atom", atomId: draft.pendingBondFrom },
      };
    case "reagents":
    case "ranking":
      // Tiles and cards are laid out by the shell, not snapped to by geometry.
      return null;
  }
}

/**
 * Whether something is armed and waiting for its second half, RIGHT NOW.
 *
 * A question about the current state of the document, and only that. It is not
 * a way to find out what the last command did, and machine.ts no longer uses it
 * for that: four adversary passes found the same defect five times because this
 * OR over a shape's selection fields cannot tell an arming from a disarm that
 * left an unrelated field set. `ShapeOutcome.report` answers that question now.
 *
 * The two remaining callers both ask the present tense question honestly: the in
 * flight guide needs to know whether there is a source to draw from, and R2's
 * "the pointer wandered off and came back" notice needs to know whether a
 * selection survived. Neither is asking what anything did.
 */
export function hasSelection(draft: ShapeDraft): boolean {
  switch (draft.shape) {
    case "mechanism":
      return draft.armed !== null;
    case "structure":
      return draft.pendingBondFrom !== null || draft.palette !== null;
    case "reagents":
      return draft.armedSlot !== null;
    case "ranking":
      return draft.armed !== null;
  }
}

/**
 * Why a draft may not be installed as the live document, or null if it may.
 *
 * `setShape` hands a whole ShapeDraft over at once. Until pass four that was an
 * unguarded route into the exact condition `createMechanismDraft` throws on: a
 * state carrying the same atom id in two species, where every by-id edit lands
 * on whichever species is found first and the other atom is unreachable. The
 * constructor's throw only ever guarded the constructor, and a session restored
 * from storage, an offline queue, or a JSON round trip never goes through it.
 *
 * A live command has a notice channel that a constructor does not, so this
 * refuses rather than throwing. Nothing a student did wrong, and nothing a
 * student can fix, but the alternative is a session that silently edits the
 * wrong atom for the rest of the problem.
 *
 * IT LIVES HERE, NOT IN machine.ts, on purpose. machine.ts contains no shape
 * name anywhere, which is the property that makes adding a fifth answer shape a
 * new file and one switch arm. Asking "does this draft carry a MechanismState"
 * needs shape names, so it is asked in the file whose job is knowing them.
 */
export function installRefusalFor(draft: ShapeDraft): InteractionNotice | null {
  switch (draft.shape) {
    case "mechanism": {
      // Both states this draft can carry. `predicted` has its own refusal on the
      // live `setPredictedState` path, and for the same reason as the starting
      // state that guard covers one entry point only.
      const fromStartingState = duplicateRefusal(draft.state, "the starting state");
      if (fromStartingState !== null) return fromStartingState;
      if (draft.predicted === null) return null;
      return duplicateRefusal(draft.predicted, "the predicted state");
    }
    case "structure":
      return duplicateRefusal(draft.state, "the structure");
    case "reagents":
    case "ranking":
      // Neither draft carries a MechanismState. A reagent id and a candidate id
      // are opaque strings this package never resolves against chemistry.
      return null;
  }
}

function duplicateRefusal(state: MechanismState, what: string): InteractionNotice | null {
  const duplicated = duplicateAtomIds(state);
  if (duplicated.length === 0) return null;
  return notice(
    "restored_draft_duplicate_atom_ids",
    "refused",
    `${what} in this draft carries atom id${duplicated.length === 1 ? "" : "s"} ${duplicated.join(", ")} in more than one species, so every edit by id would land on whichever species comes first. The draft was not installed`,
  );
}

export type { ChangeReport, ShapeOutcome, ShapeReport } from "./outcome.js";
export { ALL_SHAPE_REPORTS } from "./outcome.js";
export {
  applyToMechanism,
  createMechanismDraft,
  findingsIntroducedBy,
  mechanismArmedHint,
  STUDENT_ARROW_PREFIX,
  toggleId,
  type ArmedElectronSource,
  type MechanismDraft,
} from "./mechanism.js";
export {
  applyToStructure,
  createStructureDraft,
  MAX_IMPLICIT_HYDROGENS,
  type AtomPlacement,
  type StructureDraft,
} from "./structure.js";
export {
  applyToReagents,
  createReagentsDraft,
  move,
  type ReagentsDraft,
} from "./reagents.js";
export {
  applyToRanking,
  chosenCandidate,
  createRankingDraft,
  type RankingDraft,
} from "./ranking.js";
export { armedAtomId, inferSink, type SinkInference } from "./arrowInference.js";
