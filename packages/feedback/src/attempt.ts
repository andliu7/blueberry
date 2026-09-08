/**
 * Turning a resolved attempt into the copy a student sees.
 *
 * chem-core resolves an attempt to one primary cause plus any advisories. This
 * file is the only place that decides what order they are read in, and the rule
 * is: primary first, advisories after, in the order the engine listed them.
 *
 * That ordering matters for the graded chemistry case and is worth stating.
 * A neopentyl SN2 resolves to `correct` with `sn2_center_strongly_hindered` in
 * advisories. The student reads "this is the mechanism the question asked for"
 * first and "and here is the pathway that would win in a real flask" second. Put
 * the other way round it reads as a rejection, which is the outcome CLAUDE.md
 * says deletes the lesson.
 *
 * No sentences are assembled here. Each entry is authored copy served whole, so
 * what a reviewer signed off is what a student reads.
 */

import type { AttemptResolution, CauseId, NamedCause } from "@blueberry/chem-core";
import { resolutionCauses } from "@blueberry/chem-core";

import type { CauseCopyEntry } from "./types.ts";
import { causeCopyEntry } from "./registry.ts";

/**
 * One piece of feedback: the cause instance from the engine, and its copy.
 *
 * The `NamedCause` is carried alongside rather than folded in, because it holds
 * the subjects a renderer highlights and the `relatedRoute` a link points at.
 * Copy says what to think; the cause says what to point at.
 */
export interface FeedbackItem {
  readonly cause: NamedCause;
  readonly copy: CauseCopyEntry;
  readonly isPrimary: boolean;
}

/** Feedback for a resolved attempt: the primary cause first, then advisories. */
export function feedbackForResolution(
  resolution: AttemptResolution,
): readonly FeedbackItem[] {
  const causes = resolutionCauses(resolution);
  return Object.freeze(
    causes.map((cause, index) => ({
      cause,
      copy: causeCopyEntry(cause.id),
      isPrimary: index === 0,
    })),
  );
}

/** Feedback for a single named cause, outside the context of a full resolution. */
export function feedbackForCause(cause: NamedCause): FeedbackItem {
  return { cause, copy: causeCopyEntry(cause.id), isPrimary: true };
}

/**
 * Whether every cause on a resolution has copy.
 *
 * The registry throws on a missing id, so this is the non throwing form, for a
 * caller that wants to count how much of a corpus resolves to authored copy
 * rather than to fail on the first gap. That percentage is the Tier 1 half of
 * the number CLAUDE.md requires on every validator run.
 */
export function resolutionIsFullyCopied(resolution: AttemptResolution): boolean {
  for (const cause of resolutionCauses(resolution)) {
    try {
      causeCopyEntry(cause.id as CauseId);
    } catch {
      return false;
    }
  }
  return true;
}
