/**
 * A trainer question is DATA. The screen owns everything else.
 *
 * The three authored registries (demo/reactions.ts, demo/sequences.ts,
 * demo/resonance.ts) each have their own shape because each was written for
 * its own surface. This file is the one adapter from those shapes into the
 * single shape TrainerScreen renders, so the screen never learns which
 * registry a step came from and nothing instance-specific can fork it.
 *
 * THE ARROW RULE IS DERIVED FROM THE KIND, NEVER PASSED. Owner ruling,
 * carried in TrainerTab.tsx's Selection comment and pinned by the pilot
 * gauntlet: curved arrows appear ONLY on resonance problems, where the drawn
 * arrow IS the answer; a reaction or a sequence shows the arrowless electron
 * gesture with the dashed guide. `curvedArrowsFor` is the whole rule and the
 * screen reads it exactly once. There is no free "mode" flag to set wrong.
 */

import type { CauseId, MechanismRoute, MechanismStep } from "@blueberry/chem-core";
import type { LayoutHints } from "../../../render/layout/layout";
import { TRAINER_REACTIONS, type TrainerReaction } from "../../../demo/reactions";
import { TRAINER_SEQUENCES, type TrainerSequence } from "../../../demo/sequences";
import { RESONANCE_HUNT, type ResonanceEntry } from "../../../demo/resonance";

export type QuestionKind = "reaction" | "sequence" | "resonance";

/**
 * One arm of a decision point. A route is a complete step of its own: from
 * the intermediate the fork sits on, through its own arrows, to its own
 * product, laid out with its own hints. Exactly one route on a fork is
 * favoured under the fork's stated conditions; every other route names the
 * cause a student earns for choosing it, so a wrong branch is graded through
 * the same registry a wrong arrow is.
 */
export interface ForkRoute {
  readonly id: string;
  /** The arm's label: "Substitution", "Elimination", "1,2-addition". */
  readonly label: string;
  readonly route: MechanismRoute;
  readonly step: MechanismStep;
  readonly fromHints: LayoutHints;
  readonly toHints: LayoutHints;
  readonly favoured: boolean;
  /** Required when the route is not favoured: the advisory cause for picking it here. */
  readonly cause?: CauseId;
  /** One line under the arm: why this branch wins or loses under the conditions. */
  readonly why: string;
}

/** A decision point on a step: the conditions the student reads, and the routes out of the intermediate. */
export interface StepFork {
  /**
   * The line above the canvas while the fork is open and while a route is
   * being drawn. It asks the question without answering it: the step's own
   * prompt names the favoured route and must not show until the win.
   */
  readonly prompt: string;
  /** The stated conditions, in the exam's own words: "H2O, 25 C" or "warm, 40 C, allowed to equilibrate". */
  readonly conditions: string;
  readonly routes: readonly ForkRoute[];
}

export interface TrainerQuestionStep {
  readonly step: MechanismStep;
  readonly fromHints: LayoutHints;
  readonly toHints: LayoutHints;
  /** The line above the canvas: the task, in the imperative. Falls back to the entry's brief. */
  readonly prompt: string;
  /** The pill under the canvas. Falls back to the entry's title so the layout never changes. */
  readonly hint: string;
  /** The answer sheet's headline when this step is won before the last. Absent, the sheet falls back to the question's wonPill. */
  readonly wonLine?: string;
  /**
   * Present when the chemistry genuinely forks here. `step` above is then the
   * favoured route, so a linear read of the question (the strip, the record,
   * a lesson's plan) always describes the mechanism that actually wins.
   */
  readonly fork?: StepFork;
}

/** The one favoured route on a fork. Authoring is held to exactly one by the registry test. */
export function favouredRoute(fork: StepFork): ForkRoute {
  const found = fork.routes.find((route) => route.favoured);
  if (found === undefined) throw new Error("a fork must carry exactly one favoured route");
  return found;
}

export interface TrainerQuestion {
  readonly id: string;
  readonly kind: QuestionKind;
  readonly title: string;
  /** One step for a reaction or a resonance find; the authored chain for a sequence. */
  readonly steps: readonly TrainerQuestionStep[];
  /** The win treatment's one line of chemistry, shown on the last step. */
  readonly successLine: string;
  /** The in-canvas pill on the win: a resonance win is a FIND, everything else a goal. */
  readonly wonPill: string;
}

/** The one place the kind decides how a push is drawn. See the header. */
export function curvedArrowsFor(kind: QuestionKind): boolean {
  return kind === "resonance";
}

/** A reaction and a resonance entry share one step shape; only the kind and the win copy differ. */
function singleStep(kind: QuestionKind, entry: TrainerReaction | ResonanceEntry, successLine: string, wonPill: string): TrainerQuestion {
  const { step, fromHints, toHints } = entry;
  return {
    id: entry.id,
    kind,
    title: entry.title,
    steps: [{ step, fromHints, toHints, prompt: entry.prompt ?? entry.brief, hint: entry.hint ?? entry.title }],
    successLine,
    wonPill,
  };
}

export function questionFromReaction(entry: TrainerReaction): TrainerQuestion {
  return singleStep("reaction", entry, entry.successLine, "Goal achieved");
}

export function questionFromResonance(entry: ResonanceEntry): TrainerQuestion {
  return singleStep("resonance", entry, entry.foundLine, "You found a resonance structure!");
}

export function questionFromSequence(entry: TrainerSequence): TrainerQuestion {
  return {
    id: entry.id,
    kind: "sequence",
    title: entry.title,
    // A fork step never falls back to the title: a title can name a route, and the conditions are the honest hint there.
    steps: entry.steps.map(({ step, fromHints, toHints, stepBrief, hint, wonLine, fork }) => ({ step, fromHints, toHints, prompt: stepBrief, hint: hint ?? (fork !== undefined ? fork.conditions : entry.title), ...(wonLine !== undefined ? { wonLine } : {}), ...(fork !== undefined ? { fork } : {}) })),
    successLine: entry.successLine,
    wonPill: "Goal achieved",
  };
}

export interface QuestionRef {
  readonly kind: QuestionKind;
  readonly id: string;
}

function found<T extends { readonly id: string }>(entries: readonly T[], id: string, adapt: (entry: T) => TrainerQuestion): TrainerQuestion | null {
  const entry = entries.find((candidate) => candidate.id === id);
  return entry === undefined ? null : adapt(entry);
}

/**
 * The question a lesson beat plays. beats/types.ts declares the two trainer
 * beats in their own shapes (a mechanism beat carries a TrainerRef, a
 * resonance beat carries the hunt's id); this is the one place those shapes
 * are read, so the Train tab and the lesson runner cannot drift apart.
 */
export function questionForBeat(
  beat: { readonly kind: "mechanism"; readonly play: QuestionRef } | { readonly kind: "resonance"; readonly resonanceId: string },
): TrainerQuestion | null {
  return findQuestion(beat.kind === "mechanism" ? beat.play : { kind: "resonance", id: beat.resonanceId });
}

/** The authored entry behind a ref, adapted, or null when nothing has that id. */
export function findQuestion(ref: QuestionRef): TrainerQuestion | null {
  if (ref.kind === "reaction") return found(TRAINER_REACTIONS, ref.id, questionFromReaction);
  if (ref.kind === "sequence") return found(TRAINER_SEQUENCES, ref.id, questionFromSequence);
  return found(RESONANCE_HUNT, ref.id, questionFromResonance);
}
