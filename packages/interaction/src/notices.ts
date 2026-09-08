/**
 * Why nothing happened, or why what happened is not what was asked for.
 *
 * A closed union of ids, in the same spirit as chem-core's cause registry and
 * for the same three reasons: a validator can group by it, a report can count
 * it, and an adversary can go looking for the id that has never fired.
 *
 * THESE ARE NOT CHEMISTRY CAUSES AND THEY ARE NOT STUDENT COPY.
 *
 * chem-core's `CauseId` names a chemistry mistake. A `NoticeId` names an
 * interaction outcome: a second finger was ignored, a drag was cancelled, a
 * reagent was already on the list. `detail` on a notice is a log line for a
 * developer and a validator, sized like chem-core's `summary`. The sentence a
 * student reads is authored in packages/feedback, keyed by these ids, and if the
 * two ever disagree that is a bug in one of them.
 *
 * The one place the two meet is `arrow_refused_by_legality`, which carries
 * chem-core's own `ArrowLegalityFinding` list. Those findings already carry a
 * CauseId, so the chemistry reason travels with the interaction refusal instead
 * of being reconstructed from it.
 *
 * The bar shows a yellow warning triangle and nothing else. This file is half of
 * the answer to that; the other half is the cause registry in chem-core.
 */

import type { ArrowLegalityFinding } from "@blueberry/chem-core";
import type { ScoredTarget } from "./geometryPort.js";
import type { CommandSeq } from "./ids.js";
import type { HitTarget } from "./targets.js";

export type NoticeId =
  // Pointer plumbing. None of these are the student's fault, and none of them
  // should ever be shown as an error.
  | "secondary_pointer_ignored"
  | "pen_preempted_touch"
  | "non_primary_button_ignored"
  | "stale_pointer_session_replaced"
  | "unknown_pointer_ignored"
  | "timestamp_went_backwards"
  | "drag_cancelled"
  /**
   * A rollback was asked for and deliberately not applied, because the session
   * asking for it was no longer the last thing that changed the document. The
   * student lost nothing; this names the fact that a cancel declined to delete
   * work it did not do. See machine.ts, "WHAT R3 MAY AND MAY NOT TAKE BACK".
   */
  | "rollback_skipped_newer_work"
  /**
   * "No, I meant that one" was refused because the last thing that changed the
   * document was not the target selection it corrects. Undoing blind here is
   * how a revise destroys somebody else's commit, and with no redo stack that
   * loss would be silent and permanent. The wrong guess stays armed; the
   * student taps the intended target instead.
   */
  | "revise_refused_newer_work"
  /**
   * A drag's release landed on a new target, but the document changed under the
   * drag while it was in flight, so the release was ignored rather than allowed
   * to complete an arrow from a source this pointer never armed. The press to
   * sink tap path is unaffected: a press is its own selection under R1.
   */
  | "release_ignored_newer_work"
  /**
   * An external editor handed over a structure carrying the same atom id in
   * more than one species. Every command that edits by atom id would silently
   * resolve to whichever species is found first, making the other atom
   * permanently unreachable, so the handover is refused whole.
   *
   * THIS ID NAMES ONE ENTRY POINT, `acceptExternalStructure`, and the two ids
   * below name the other two. They were one id until the Phase 2 pass four
   * adversary pointed out that this file's own header promises student copy is
   * "keyed by these ids", and three entry points sharing one key means the copy
   * can only ever say the vaguest of the three things. Splitting them costs two
   * union members and lets packages/feedback tell a student to fix the editor,
   * fix the product they drew, or report a broken problem, which are three
   * different sentences.
   */
  | "external_structure_duplicate_atom_ids"
  /**
   * `setPredictedState` was handed a product state carrying the same atom id in
   * more than one species. Same hazard as above, different entry point: this one
   * is the product the student drew being attached to a mechanism draft, not a
   * structure being imported into the editor.
   */
  | "predicted_state_duplicate_atom_ids"
  /**
   * `setShape` was asked to install a draft whose starting state carries the
   * same atom id in more than one species.
   *
   * `createMechanismDraft` throws on this, because a constructor has no notice
   * channel and a problem authored that way is an authoring defect. `setShape`
   * is a live command that does have a channel, and it is the route a restored
   * session takes: a draft deserialised from storage or an offline queue never
   * passed through the constructor, so the throw guarded nothing on that path.
   * Found by the Phase 2 pass four adversary.
   */
  | "restored_draft_duplicate_atom_ids"
  | "backgrounded_mid_drag"
  | "drag_ended_on_its_own_source"
  | "target_was_ambiguous"
  // Shape independent.
  | "nothing_to_undo"
  | "target_not_valid_in_this_shape"
  | "command_not_valid_in_this_shape"
  | "nothing_selected_for_this_target"
  // Mechanism shape.
  | "arrow_refused_by_legality"
  | "bond_source_needs_an_end"
  // Structure shape.
  | "no_element_selected"
  | "atom_not_in_structure"
  | "bond_order_cycled_instead_of_added"
  // Supply the reagents shape.
  | "reagent_already_chosen"
  | "sequence_slot_out_of_range"
  | "sequence_slot_requires_ordered_mode"
  // Major product shape.
  | "unknown_candidate"
  | "reason_requires_a_choice";

/**
 * `info` means the machine absorbed something and the student did not lose an
 * action. `refused` means the student did something deliberate and it did not
 * take effect, which is the class the feedback axis is measured on: every
 * refusal must carry a name, never a bare symbol.
 */
export type NoticeSeverity = "info" | "refused";

export interface InteractionNotice {
  readonly id: NoticeId;
  readonly severity: NoticeSeverity;
  /** Engine facing. One line. Never shown to a student. */
  readonly detail: string;
  /** The command this notice came out of, when there was one. */
  readonly commandSeq?: CommandSeq;
  /** Set on `target_not_valid_in_this_shape` and friends. */
  readonly target?: HitTarget;
  /** Set on `target_was_ambiguous`: the runners up, best first. */
  readonly candidates?: readonly ScoredTarget[];
  /** Set on `arrow_refused_by_legality`: chem-core's own findings, unedited. */
  readonly legality?: readonly ArrowLegalityFinding[];
}

export const ALL_NOTICE_IDS: readonly NoticeId[] = [
  "secondary_pointer_ignored",
  "pen_preempted_touch",
  "non_primary_button_ignored",
  "stale_pointer_session_replaced",
  "unknown_pointer_ignored",
  "timestamp_went_backwards",
  "drag_cancelled",
  "rollback_skipped_newer_work",
  "revise_refused_newer_work",
  "release_ignored_newer_work",
  "external_structure_duplicate_atom_ids",
  "predicted_state_duplicate_atom_ids",
  "restored_draft_duplicate_atom_ids",
  "backgrounded_mid_drag",
  "drag_ended_on_its_own_source",
  "target_was_ambiguous",
  "nothing_to_undo",
  "target_not_valid_in_this_shape",
  "command_not_valid_in_this_shape",
  "nothing_selected_for_this_target",
  "arrow_refused_by_legality",
  "bond_source_needs_an_end",
  "no_element_selected",
  "atom_not_in_structure",
  "bond_order_cycled_instead_of_added",
  "reagent_already_chosen",
  "sequence_slot_out_of_range",
  "sequence_slot_requires_ordered_mode",
  "unknown_candidate",
  "reason_requires_a_choice",
];

/**
 * How many distinct interaction outcomes this package can name.
 *
 * A function rather than a number written into a document, for the reason
 * CLAUDE.md gives about `causeCount()`: a literal in prose goes stale the first
 * time a builder adds one, and one already did.
 */
export function noticeCount(): number {
  return ALL_NOTICE_IDS.length;
}

/** Small helper so call sites stay one line and severity is never forgotten. */
export function notice(
  id: NoticeId,
  severity: NoticeSeverity,
  detail: string,
  extra?: Omit<InteractionNotice, "id" | "severity" | "detail">,
): InteractionNotice {
  return { id, severity, detail, ...(extra ?? {}) };
}
