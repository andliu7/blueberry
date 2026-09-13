/**
 * The decision point, as arithmetic. Pure: no React, no DOM.
 *
 * TWO GRADES, KEPT APART. At a fork the student picks a route and draws its
 * arrows. The arrows are graded by gradeDrawing exactly as on any other step,
 * against the route's own authored step. Only a drawing that grades correct
 * earns the second grade, which asks whether that route is the one the
 * stated conditions favour. A wrong branch with right arrows is therefore
 * never "invalid": it is a correct mechanism for the wrong flask, and it
 * carries a named cause from the same registry a wrong arrow does, advisory,
 * with the winning route named beside it.
 *
 * THE STRIP reads a multistep question as the states it passes through: one
 * node per step, standing for the state that step starts from, and a final
 * node for the product. A student may look back at any step already taken
 * and at the live one, never ahead: the strip shows how they got here, not
 * where they are going.
 */

import type { CauseId } from "@blueberry/chem-core";
import type { DrawVerdict } from "../grade";
import { favouredRoute, type ForkRoute, type StepFork, type TrainerQuestion } from "./question";

export type BranchVerdict =
  | { readonly kind: "favoured"; readonly route: ForkRoute }
  | { readonly kind: "not_favoured"; readonly route: ForkRoute; readonly favoured: ForkRoute; readonly cause: CauseId };

/**
 * The branch grade for a drawing on a chosen route, or null when the drawing
 * itself did not pass: wrong arrows are the first grade's business and the
 * student hears about those before anything is said about the branch.
 */
export function gradeBranch(fork: StepFork, chosen: ForkRoute, drawing: DrawVerdict): BranchVerdict | null {
  if (drawing.kind !== "correct") return null;
  if (chosen.favoured) return { kind: "favoured", route: chosen };
  return {
    kind: "not_favoured",
    route: chosen,
    favoured: favouredRoute(fork),
    cause: chosen.cause ?? "route_requires_conditions_not_present",
  };
}

/**
 * The order the chooser draws routes in: by label, never by authoring order.
 * Authors write the favoured route first because the step plays it, and a
 * student who noticed that the top puck always wins would be graded on
 * nothing. Sorting on the label is deterministic and says nothing.
 */
export function chooserOrder(routes: readonly ForkRoute[]): readonly ForkRoute[] {
  return [...routes].sort((a, b) => a.label.localeCompare(b.label));
}

export interface StripNode {
  /** The step this node stands at the start of; steps.length for the product. */
  readonly index: number;
  readonly kind: "step" | "product";
  /** Whether a decision point sits on this step. */
  readonly fork: boolean;
}

/** One node per step, then the product. A single-step question has no strip at all. */
export function stripNodes(question: TrainerQuestion): readonly StripNode[] {
  if (question.steps.length < 2) return [];
  const nodes: StripNode[] = question.steps.map((step, index) => ({ index, kind: "step", fork: step.fork !== undefined }));
  nodes.push({ index: question.steps.length, kind: "product", fork: false });
  return nodes;
}

/**
 * Where the strip may take the student: a step already taken, or the live
 * one. The product node is the live canvas once the last step is won and
 * nowhere before it, so it never resolves to a view of its own.
 */
export function clampView(index: number, stepIndex: number): number {
  return Math.min(Math.max(0, index), stepIndex);
}

/** The node the strip highlights: the viewed step when looking back, the live step otherwise. */
export function highlightedNode(stepIndex: number, viewIndex: number | null, wonLast: boolean, stepCount: number): number {
  if (viewIndex !== null) return clampView(viewIndex, stepIndex);
  return wonLast ? stepCount : stepIndex;
}
