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

import type { MechanismStep } from "@blueberry/chem-core";
import type { LayoutHints } from "../../../render/layout/layout";
import { TRAINER_REACTIONS, type TrainerReaction } from "../../../demo/reactions";
import { TRAINER_SEQUENCES, type TrainerSequence } from "../../../demo/sequences";
import { RESONANCE_HUNT, type ResonanceEntry } from "../../../demo/resonance";

export type QuestionKind = "reaction" | "sequence" | "resonance";

export interface TrainerQuestionStep {
  readonly step: MechanismStep;
  readonly fromHints: LayoutHints;
  readonly toHints: LayoutHints;
  /** The line above the canvas: the task, in the imperative. Falls back to the entry's brief. */
  readonly prompt: string;
  /** The pill under the canvas. Falls back to the entry's title so the layout never changes. */
  readonly hint: string;
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
  return singleStep("resonance", entry, entry.foundLine, "Structure found");
}

export function questionFromSequence(entry: TrainerSequence): TrainerQuestion {
  return {
    id: entry.id,
    kind: "sequence",
    title: entry.title,
    steps: entry.steps.map(({ step, fromHints, toHints, stepBrief, hint }) => ({ step, fromHints, toHints, prompt: stepBrief, hint: hint ?? entry.title })),
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
