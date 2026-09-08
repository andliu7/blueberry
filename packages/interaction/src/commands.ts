/**
 * The semantic vocabulary every answer shape consumes.
 *
 * This is the layer that makes tap only completion a first class path rather
 * than a fallback. A tap produces `selectTarget`. A drag produces `selectTarget`
 * on press and `selectTarget` on release. A keyboard, a switch device, or a
 * plain button in the shell's own UI produces `selectTarget` too, with no
 * pointer involved at all. There is no separate drag command anywhere in this
 * file, and no shape reducer can tell which one it is being driven by.
 *
 * If you ever find yourself adding a command whose name contains "drag", the
 * abstraction has slipped. Stop and say so.
 */

import type { AtomId, ElectronCount, MechanismState } from "@blueberry/chem-core";
import type { ReasonId } from "./ids.js";
import type { ShapeDraft } from "./shapes/index.js";
import type { HitTarget } from "./targets.js";

export type InteractionCommand =
  /** The universal one. Arms a source, commits a sink, toggles a thing, places an atom. */
  | { readonly kind: "selectTarget"; readonly target: HitTarget }
  /** Drop whatever is armed. What a tap on empty space and an Escape key both mean. */
  | { readonly kind: "clearSelection" }
  /** Undo the last change to the draft, including an arming. */
  | { readonly kind: "undo" }
  /**
   * Undo the last change and redo it against a different target. This is the
   * answer to an ambiguous tap: the machine acts on the hit tester's best guess
   * immediately, and a "did you mean" affordance sends this if the student says
   * it guessed wrong. Built out of undo rather than out of a special case in the
   * pointer layer.
   */
  | { readonly kind: "reviseLastTarget"; readonly target: HitTarget }
  /** Switch answer shape, carrying the empty draft for the new one. */
  | { readonly kind: "setShape"; readonly draft: ShapeDraft }
  /** Hand the draft to a grader. Produces an effect, not a state change. */
  | { readonly kind: "submit" }
  /** Mechanism shape. Two electrons is the ordinary arrow, one is a fishhook. */
  | { readonly kind: "setElectronCount"; readonly electrons: ElectronCount }
  /**
   * Mechanism shape. Attach the product state the student drew, when a problem
   * asks for arrows AND a product. See the gap noted in shapes/mechanism.ts.
   */
  | { readonly kind: "setPredictedState"; readonly state: MechanismState | null }
  /** Structure shape. Formal charge has no drag gesture; it is a stepper. */
  | { readonly kind: "adjustCharge"; readonly atomId: AtomId; readonly delta: number }
  /** Structure shape. Tapping a drawn pair removes one; this is how one is added. */
  | { readonly kind: "adjustLonePairs"; readonly atomId: AtomId; readonly delta: number }
  /** Structure shape. Take a whole structure from an external editor, such as Ketcher. */
  | { readonly kind: "acceptExternalStructure"; readonly state: MechanismState }
  /** Structure shape. */
  | { readonly kind: "removeAtom"; readonly atomId: AtomId }
  /** Reagents shape. A synthesis is ordered; a plain reagent question is a set. */
  | { readonly kind: "setReagentsOrdered"; readonly ordered: boolean }
  /** Reagents shape. */
  | { readonly kind: "removeReagentAt"; readonly index: number }
  /** Major product shape. The reason a candidate wins. */
  | { readonly kind: "setReason"; readonly reasonId: ReasonId | null };

export type InteractionCommandKind = InteractionCommand["kind"];

export function selectTarget(target: HitTarget): InteractionCommand {
  return { kind: "selectTarget", target };
}
