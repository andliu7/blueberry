/**
 * Turning "the student touched this, having already selected that" into a
 * chem-core `ElectronSink`.
 *
 * This file is the whole reason tap only completion works. A drag has a natural
 * reading of where the arrow ends: wherever the finger was let go. A tap does
 * not, because a single tap on an atom could mean two different arrows, and the
 * difference is chemistry:
 *
 *   lone pair on O, tap carbon      the pair becomes an O to C bond
 *   the C to Br bond, tap Br        the bonding pair collapses onto Br
 *
 * Both are "tap an atom". The first is `betweenAtoms`, the second is `atom`. The
 * rule that separates them is below, and it is decided by what was ARMED, not by
 * how the student touched anything, which is exactly why the tap path and the
 * drag path can share it.
 *
 * WHY THE BOND END HANDLE EARNS ITS KEEP.
 *
 * A pi bond attacking an electrophile forms its new bond at one specific end.
 * `C1=C2` plus `E` gives `C1-E`, not `C2-E`. An arrow starting from the middle of
 * the bond does not say which carbon, and guessing is how a Markovnikov question
 * silently grades the wrong regiochemistry. The end handle in
 * `docs/reference/alchemie/extra/x02-bond-handle-drag.png` names the end. When
 * the source was armed from the bond BODY instead, and the sink genuinely needs
 * a pivot, this file refuses with `bond_source_needs_an_end` rather than picking
 * one. That refusal is a sentence a student can act on, which is the gap the
 * feedback axis is measured on.
 *
 * This file does not decide whether an arrow is LEGAL. chem-core's
 * `arrowLegalityFindings` does that, over the whole arrow list, after this file
 * has produced a candidate. Two jobs, two places.
 */

import {
  bondTouches,
  findBondInState,
  toAtom,
  toBondBetween,
  type AtomId,
  type ElectronSink,
  type MechanismState,
} from "@blueberry/chem-core";
import type { NoticeId } from "../notices.js";
import type { HitTarget } from "../targets.js";
import type { ArmedElectronSource } from "./mechanism.js";

export type SinkInference =
  | { readonly ok: true; readonly sink: ElectronSink }
  | { readonly ok: false; readonly noticeId: NoticeId; readonly detail: string };

/**
 * Where the armed electrons currently sit, as a single atom, when they sit on
 * one. A bond source sits on two atoms and returns null here; use the pivot.
 */
export function armedAtomId(armed: ArmedElectronSource): AtomId | null {
  const source = armed.source;
  if (source.kind === "lonePair" || source.kind === "singleElectron") {
    return source.atomId;
  }
  return null;
}

export function inferSink(
  armed: ArmedElectronSource,
  target: HitTarget,
  state: MechanismState,
): SinkInference {
  switch (target.kind) {
    // Every target that names one atom and nothing else reads the same way.
    case "atom":
    case "lonePair":
    case "unpairedElectron":
      return sinkOnAtom(armed, target.atomId, state);

    // Landing on an existing bond means "into this bond", which raises its order.
    // A lone pair on oxygen into an existing C-O sigma bond is how a carbonyl
    // forms. The end handle and the body read the same way here, because the
    // bond already names both of its atoms.
    case "bondEndHandle":
    case "bondBody": {
      const found = findBondInState(state, target.bondId);
      if (found === undefined) {
        return {
          ok: false,
          noticeId: "nothing_selected_for_this_target",
          detail: `bond ${target.bondId} is not in state ${state.id}`,
        };
      }
      return { ok: true, sink: toBondBetween(found.bond.a, found.bond.b) };
    }

    // A place where a bond could form but none exists. The geometry package
    // offers these only while something is armed, which is why they need no
    // inference at all.
    case "betweenAtomsSite":
      return { ok: true, sink: toBondBetween(target.atomIds[0], target.atomIds[1]) };

    default:
      return {
        ok: false,
        noticeId: "target_not_valid_in_this_shape",
        detail: `${target.kind} is not a place electrons can go`,
      };
  }
}

function sinkOnAtom(
  armed: ArmedElectronSource,
  atomId: AtomId,
  state: MechanismState,
): SinkInference {
  const source = armed.source;

  if (source.kind === "lonePair" || source.kind === "singleElectron") {
    // Nonbonding electrons moving onto a DIFFERENT atom form a bond to it. There
    // is no such thing as a lone pair teleporting to another atom without one.
    // Moving onto the atom they are already on is a no op, and it is left to
    // chem-core to say so as `arrow_declares_no_change` rather than being
    // silently swallowed here, so the student gets the chemistry name for it.
    if (source.atomId === atomId) {
      return { ok: true, sink: toAtom(atomId) };
    }
    return { ok: true, sink: toBondBetween(source.atomId, atomId) };
  }

  // A bond source. Two readings, and the bond's own ends decide which.
  const found = findBondInState(state, source.bondId);
  if (found === undefined) {
    return {
      ok: false,
      noticeId: "nothing_selected_for_this_target",
      detail: `bond ${source.bondId} is not in state ${state.id}`,
    };
  }

  // Onto one of its own ends: the bonding pair collapses there. This is every
  // leaving group departure and every heterolysis.
  if (bondTouches(found.bond, atomId)) {
    return { ok: true, sink: toAtom(atomId) };
  }

  // Onto some other atom: the bond is forming a new bond, and WHICH END does it
  // matters. Only the end handle knows.
  if (armed.pivotAtomId === null) {
    return {
      ok: false,
      noticeId: "bond_source_needs_an_end",
      detail:
        `bond ${source.bondId} was selected by its body, so which of its two ` +
        `atoms bonds to ${atomId} is undecided. Select the handle at that end.`,
    };
  }
  return { ok: true, sink: toBondBetween(armed.pivotAtomId, atomId) };
}
