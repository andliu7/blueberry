/**
 * What a student can touch.
 *
 * A HitTarget is the single unit of meaning this whole package trades in. The
 * geometry package turns a point into one of these; the shell can also construct
 * one directly when it already knows what was touched, which is the case for
 * every button and tile that is a real widget rather than a shape on a canvas.
 *
 * WHY BOND END HANDLES AND NOT THE BOND BODY.
 *
 * `docs/reference/alchemie/extra/x02-bond-handle-drag.png` shows the small white
 * circles at each end of a bond being dragged, not the capsule between them.
 * That is not a styling choice, it carries information the bond body cannot: it
 * names WHICH END of the bond is the pivot. A pi bond attacking an electrophile
 * forms its new bond at one specific carbon, and an arrow drawn from the middle
 * of the bond does not say which. `bondBody` is still accepted as a target,
 * because it is the larger and easier thing to hit, but an arrow whose sink
 * needs a pivot and whose source was the bond body is refused with a named
 * reason rather than guessed at. See shapes/arrowInference.ts.
 *
 * The tile targets at the bottom belong to the three answer shapes Phase 3
 * grades. They are here, in the same union, on purpose: a shape is a mode this
 * machine can be in, and every mode drives the same "select a target" path.
 */

import type { AtomId, BondId, Element } from "@blueberry/chem-core";
import type { Point2 } from "./pointer.js";
import type { CandidateId, ReagentId, ReasonId } from "./ids.js";

export type HitTarget =
  /**
   * The atom sphere itself. In mechanism mode with nothing selected this toggles
   * whether the atom's lone pairs are drawn; with a source selected it is the
   * sink. An atom body is never an electron SOURCE, because electrons come from
   * a lone pair, a bond, or a radical, never from an atom in general.
   */
  | { readonly kind: "atom"; readonly atomId: AtomId }
  /** One drawn lone pair on an atom. `slotIndex` distinguishes the pairs on the same atom. */
  | { readonly kind: "lonePair"; readonly atomId: AtomId; readonly slotIndex: number }
  /** The single unpaired electron on a radical. Source of a fishhook arrow. */
  | { readonly kind: "unpairedElectron"; readonly atomId: AtomId }
  /** The implicit hydrogen arc around an atom. See OBSERVATIONS.md, worth taking. */
  | { readonly kind: "hydrogenCount"; readonly atomId: AtomId }
  /** The circular handle at one end of a bond. `atomId` is the atom that end sits on. */
  | { readonly kind: "bondEndHandle"; readonly bondId: BondId; readonly atomId: AtomId }
  /** The capsule between the two handles. */
  | { readonly kind: "bondBody"; readonly bondId: BondId }
  /**
   * A place where a bond could form but none exists yet. Offered by the geometry
   * package only while a source is armed, because it is meaningless otherwise.
   */
  | { readonly kind: "betweenAtomsSite"; readonly atomIds: readonly [AtomId, AtomId] }
  /** An element in the structure builder's palette. */
  | { readonly kind: "paletteElement"; readonly element: Element }
  /** A reagent tile in the supply the reagents shape. */
  | { readonly kind: "reagentTile"; readonly reagentId: ReagentId }
  /** A position in an ordered synthesis sequence. */
  | { readonly kind: "sequenceSlot"; readonly index: number }
  /** One candidate product in the major product shape. */
  | { readonly kind: "candidate"; readonly candidateId: CandidateId }
  /** One authored reason a candidate wins. */
  | { readonly kind: "reasonTile"; readonly reasonId: ReasonId }
  /** Nothing was under the point. Carries the point so the structure builder can place an atom. */
  | { readonly kind: "empty"; readonly point: Point2 };

export type HitTargetKind = HitTarget["kind"];

/**
 * Whether two targets mean the same thing.
 *
 * This is load bearing. machine.ts decides a pointer release did something only
 * when the target under the release differs from the target under the press, so
 * this function is what separates a tap from a drag. There is no distance
 * threshold anywhere in the machine, which is deliberate: a shaky hand on a small
 * handle should still tap, and how much wobble counts as "still on the handle"
 * is a hit testing question that belongs in the geometry package with the
 * fingertip model, not in a magic number here.
 *
 * Every `empty` compares equal to every other `empty`, whatever the coordinates.
 * A drag that starts in nothing and ends in nothing is one nothing.
 */
export function sameTarget(a: HitTarget, b: HitTarget): boolean {
  return targetKey(a) === targetKey(b);
}

/**
 * A string that is equal for two targets exactly when they mean the same thing.
 *
 * Built through JSON.stringify of a normalised tuple rather than by joining with
 * a separator, so an atom id that happens to contain the separator cannot make
 * two different targets look equal. Also usable as a Map key by a renderer.
 */
export function targetKey(target: HitTarget): string {
  switch (target.kind) {
    case "atom":
    case "unpairedElectron":
    case "hydrogenCount":
      return JSON.stringify([target.kind, target.atomId]);
    case "lonePair":
      return JSON.stringify([target.kind, target.atomId, target.slotIndex]);
    case "bondEndHandle":
      return JSON.stringify([target.kind, target.bondId, target.atomId]);
    case "bondBody":
      return JSON.stringify([target.kind, target.bondId]);
    case "betweenAtomsSite": {
      // The pair is unordered, exactly as chem-core's ElectronSink treats it.
      const [first, second] = target.atomIds;
      const ordered = first <= second ? [first, second] : [second, first];
      return JSON.stringify([target.kind, ordered[0], ordered[1]]);
    }
    case "paletteElement":
      return JSON.stringify([target.kind, target.element]);
    case "reagentTile":
      return JSON.stringify([target.kind, target.reagentId]);
    case "sequenceSlot":
      return JSON.stringify([target.kind, target.index]);
    case "candidate":
      return JSON.stringify([target.kind, target.candidateId]);
    case "reasonTile":
      return JSON.stringify([target.kind, target.reasonId]);
    case "empty":
      // Coordinates deliberately excluded. Nothing is nothing.
      return JSON.stringify([target.kind]);
  }
}

/** The atom a target sits on, when it sits on one. For highlighting and for tests. */
export function targetAtomId(target: HitTarget): AtomId | null {
  switch (target.kind) {
    case "atom":
    case "lonePair":
    case "unpairedElectron":
    case "hydrogenCount":
    case "bondEndHandle":
      return target.atomId;
    default:
      return null;
  }
}
