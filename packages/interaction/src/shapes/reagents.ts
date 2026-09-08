/**
 * The supply the reagents answer shape.
 *
 * Two questions share it, and the difference is one boolean:
 *
 *   "what reagent does this"        an unordered SET
 *   "give a synthesis of this"      an ORDERED sequence
 *
 * CLAUDE.md is explicit that a synthesis is the reagent shape read backwards and
 * must not become a fifth shape, so `ordered` is a flag on this draft rather than
 * a separate mode. Retrosynthesis is the same comparison run in the other
 * direction, which is a grading concern in packages/curriculum and changes
 * nothing here.
 *
 * TAP ONLY REORDERING, WITHOUT A SINGLE DRAG.
 *
 * Reordering a list is the classic place an app reaches for drag and drop and
 * quietly locks out anyone using a trackpad or a switch device. The arm and
 * commit pattern handles it with taps:
 *
 *   tap a slot                    the reagent in it is armed
 *   tap another slot              the armed reagent moves to that position
 *   tap the same slot again       the selection is dropped
 *   tap a reagent tile            the reagent is appended
 */

import type { InteractionCommand } from "../commands.js";
import { haptic } from "../effects.js";
import type { ReagentId } from "../ids.js";
import { notice } from "../notices.js";
import type { HitTarget } from "../targets.js";
import { changed, emitted, refused, unchanged, type ShapeOutcome } from "./outcome.js";

export interface ReagentsDraft {
  readonly shape: "reagents";
  /** True for a synthesis, where the order of addition is part of the answer. */
  readonly ordered: boolean;
  readonly chosen: readonly ReagentId[];
  /** The slot armed for a move. Null when nothing is armed. */
  readonly armedSlot: number | null;
}

export function createReagentsDraft(ordered = false): ReagentsDraft {
  return Object.freeze({
    shape: "reagents" as const,
    ordered,
    chosen: Object.freeze([]),
    armedSlot: null,
  });
}

export function applyToReagents(
  draft: ReagentsDraft,
  command: InteractionCommand,
): ShapeOutcome<ReagentsDraft> {
  switch (command.kind) {
    case "selectTarget":
      return selectTarget(draft, command.target);

    case "clearSelection":
      if (draft.armedSlot === null) return unchanged(draft);
      return changed(Object.freeze({ ...draft, armedSlot: null }), "disarmed");

    case "setReagentsOrdered": {
      if (draft.ordered === command.ordered) return unchanged(draft);
      // Two things at once, so the precedence in outcome.ts decides. The flag
      // itself is a mode: it says whether position carries meaning, which is
      // authored by the problem rather than by the student, so on its own it is
      // an inspection. Dropping a live selection outranks it, because that is
      // the half the student can see and the half a later command depends on.
      const report = draft.armedSlot === null ? "inspected" : "disarmed";
      return changed(
        Object.freeze({ ...draft, ordered: command.ordered, armedSlot: null }),
        report,
      );
    }

    case "removeReagentAt": {
      if (!isSlotInRange(draft, command.index)) {
        return refused(draft, [outOfRange(command.index, draft.chosen.length)]);
      }
      return changed(
        Object.freeze({
          ...draft,
          chosen: Object.freeze(draft.chosen.filter((_, index) => index !== command.index)),
          armedSlot: null,
        }),
        "committed",
      );
    }

    case "submit":
      return emitted(draft, [{ kind: "submitAttempt", draft }]);

    default:
      return refused(draft, [
        notice(
          "command_not_valid_in_this_shape",
          "refused",
          `${command.kind} does nothing in the reagents shape`,
        ),
      ]);
  }
}

function selectTarget(draft: ReagentsDraft, target: HitTarget): ShapeOutcome<ReagentsDraft> {
  switch (target.kind) {
    case "reagentTile":
      return addReagent(draft, target.reagentId);

    case "sequenceSlot":
      return slotStep(draft, target.index);

    case "empty":
      if (draft.armedSlot === null) return unchanged(draft);
      return changed(Object.freeze({ ...draft, armedSlot: null }), "disarmed");

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

function addReagent(draft: ReagentsDraft, reagentId: ReagentId): ShapeOutcome<ReagentsDraft> {
  // A set cannot hold the same reagent twice. A synthesis can: "then more acid"
  // is a real step, and refusing it would make a legitimate answer unreachable.
  if (!draft.ordered && draft.chosen.includes(reagentId)) {
    return refused(
      draft,
      [
        notice(
          "reagent_already_chosen",
          "refused",
          `${reagentId} is already on the list, and this question asks for a set`,
        ),
      ],
      [haptic("refusal")],
    );
  }
  return changed(
    Object.freeze({
      ...draft,
      chosen: Object.freeze([...draft.chosen, reagentId]),
      armedSlot: null,
    }),
    "committed",
    [haptic("commit")],
  );
}

function slotStep(draft: ReagentsDraft, index: number): ShapeOutcome<ReagentsDraft> {
  if (!draft.ordered) {
    return refused(draft, [
      notice(
        "sequence_slot_requires_ordered_mode",
        "refused",
        "this question asks for a set of reagents, so their positions carry no meaning",
      ),
    ]);
  }
  if (!isSlotInRange(draft, index)) {
    return refused(draft, [outOfRange(index, draft.chosen.length)]);
  }

  if (draft.armedSlot === null) {
    return changed(Object.freeze({ ...draft, armedSlot: index }), "armed", [haptic("selection")]);
  }
  if (draft.armedSlot === index) {
    return changed(Object.freeze({ ...draft, armedSlot: null }), "disarmed");
  }
  return changed(
    Object.freeze({ ...draft, chosen: move(draft.chosen, draft.armedSlot, index), armedSlot: null }),
    "committed",
    [haptic("commit")],
  );
}

function isSlotInRange(draft: ReagentsDraft, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < draft.chosen.length;
}

function outOfRange(index: number, length: number) {
  return notice(
    "sequence_slot_out_of_range",
    "refused",
    `slot ${index} does not exist; the sequence holds ${length}`,
  );
}

/** Take the item out of `from` and put it back in at `to`. */
export function move<T>(items: readonly T[], from: number, to: number): readonly T[] {
  const rest = items.filter((_, index) => index !== from);
  const moved = items[from];
  if (moved === undefined) return items;
  return Object.freeze([...rest.slice(0, to), moved, ...rest.slice(to)]);
}
