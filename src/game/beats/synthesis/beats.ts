/**
 * A synthesis gap, seen as a BEAT.
 *
 * WHY THIS ADAPTER EXISTS AT ALL. beats/types.ts is the contract every surface
 * reads: a lesson is ONE playlist, and a mechanism, a sort and a synthesis gap
 * sit in the same sequence. The playlist therefore has to hold a `SynthesisBeat`
 * rather than a `SynthesisGapProblem`, or every consumer of a lesson grows an
 * `if (beat.isReallyASynthesisGap)` and the union stops paying for itself. This
 * file is the one place the two shapes meet, and it goes in one direction only:
 * the corpus is the authored truth and the beat is a view of it.
 *
 * THE LEVELS COME FROM THE PROBLEM, NOT FROM THE KIND. `DEFAULT_LEVELS` says a
 * synthesis beat may serve L2 and L3. A product gap declares L2 alone, because
 * its ranking argument is a choice and packages/curriculum will not grade free
 * prose. `levelRuleViolations` in beats/types.ts allows that (a beat may declare
 * FEWER levels than its kind serves) and refuses the opposite, which is the
 * check `synthesisBeats` is meant to pass rather than to work around.
 *
 * ONE MISMATCH, RECORDED RATHER THAN PAPERED OVER. `SynthesisSlot` in
 * beats/types.ts models a step as "shown reagents" or "reagents to supply", so
 * it can express a reagent gap and a reactant gap exactly, and a PRODUCT gap
 * only approximately: there is no field for "the reagents are shown and the
 * molecule they make is the blank". The slot for a product gap therefore lists
 * the candidate products in `accepts` and keeps the step's own reagents in
 * `why`. That is a lossy view, and it is safe because nothing grades from the
 * beat: `gradeSynthesisGap` reads the problem. It is reported as an integration
 * note rather than fixed here, because beats/types.ts belongs to another file's
 * owner.
 */

import {
  beatAllowedAt,
  levelRuleViolations,
  type LessonPlaylist,
  type LevelRuleViolation,
  type MasteryLevel,
  type SynthesisBeat,
  type SynthesisSlot,
} from "../types";
import { answerOption, type SynthesisGapProblem } from "./problem";
import { SYNTHESIS_GAPS } from "./corpus";

function slotsFor(problem: SynthesisGapProblem): readonly SynthesisSlot[] {
  return problem.steps.map((step) => {
    const isGap = step.id === problem.gapStepId;
    if (!isGap) {
      return {
        id: step.id,
        given: step.over ?? step.produces ?? "",
        ...(step.note === undefined ? {} : { why: step.note }),
      };
    }
    if (problem.gapKind === "product") {
      return {
        id: step.id,
        accepts: problem.bank.map((option) => option.text),
        why: `Reagents shown: ${step.over ?? ""}. ${step.note ?? problem.why}`,
      };
    }
    return {
      id: step.id,
      accepts: problem.bank
        .filter((option) => option.id === problem.correctOptionId)
        .map((option) => option.text),
      ...(step.note === undefined ? {} : { why: step.note }),
    };
  });
}

/**
 * The beat view of one problem.
 *
 * `startMoleculeId` and `targetMoleculeId` are the display names rather than
 * ids into a molecule table, because no molecule table exists yet: the routes
 * here name their compounds and nothing draws them. When docs/DATA-MODEL.md's
 * `molecules` collection lands, these two fields take real ids and nothing else
 * in this file changes, which is the point of referencing rather than inlining.
 */
export function synthesisBeat(problem: SynthesisGapProblem): SynthesisBeat {
  return {
    kind: "synthesis",
    id: problem.id,
    node: problem.node,
    conceptIds: problem.conceptIds,
    levels: problem.levels,
    prompt: problem.prompt,
    ...(problem.brief === undefined ? {} : { brief: problem.brief }),
    diamonds: problem.diamonds,
    startMoleculeId: problem.start,
    targetMoleculeId: problem.target,
    slots: slotsFor(problem),
    bank: problem.bank.map((option) => option.text),
    retro: problem.retro,
  };
}

/** Every authored gap, as beats. What a playlist builder reads. */
export function synthesisBeats(): readonly SynthesisBeat[] {
  return SYNTHESIS_GAPS.map(synthesisBeat);
}

/** The authoring check from beats/types.ts, run over this corpus. */
export function synthesisLevelRuleViolations(): readonly LevelRuleViolation[] {
  return levelRuleViolations(synthesisBeats());
}

/**
 * The gaps a node can serve at one rung.
 *
 * Filters on the beat's declared `levels` and never on its kind, which is THE
 * RULE in beats/types.ts: a beat authored as easy stays easy even though its
 * kind could go harder, and L3 is never shown early because nothing that has
 * not declared L3 can be selected for it.
 */
export function gapsForLevel(
  problems: readonly SynthesisGapProblem[],
  level: MasteryLevel,
): readonly SynthesisGapProblem[] {
  return problems.filter((problem) => beatAllowedAt(synthesisBeat(problem), level));
}

/** A one node playlist of synthesis gaps, for a lesson runner to play. */
export function synthesisPlaylist(
  lessonId: string,
  node: string,
  title: string,
  problems: readonly SynthesisGapProblem[],
): LessonPlaylist {
  return { lessonId, node, title, beats: problems.map(synthesisBeat) };
}

/**
 * The rung this problem can actually be played at, given the rung asked for.
 *
 * A runner should only ever ask for a level the beat declares, and this is what
 * happens when one asks for a level it does not. It NEVER serves above what was
 * asked, because the mastery rule is that L3 is not shown early: it takes the
 * highest declared level at or below the request, and falls back to the lowest
 * declared level only when the request is below everything on offer.
 */
export function levelToPlay(
  problem: SynthesisGapProblem,
  requested: MasteryLevel,
): MasteryLevel {
  if (problem.levels.includes(requested)) return requested;
  let best: MasteryLevel | null = null;
  for (const level of problem.levels) {
    if (level <= requested && (best === null || level > best)) best = level;
  }
  if (best !== null) return best;
  let lowest: MasteryLevel | null = null;
  for (const level of problem.levels) {
    if (lowest === null || level < lowest) lowest = level;
  }
  if (lowest === null) {
    throw new Error(`problem ${problem.id} declares no mastery level`);
  }
  return lowest;
}

/** The answer, as a plain string. Used by the reveal and by the card generator. */
export function answerTextFor(problem: SynthesisGapProblem): string {
  return answerOption(problem).text;
}
