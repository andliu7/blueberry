/**
 * Grading one easy MCQ beat. Pure: no React, no storage, no clock.
 *
 * THE GRADER IS CURRICULUM'S. `checkMultipleChoice` in
 * packages/curriculum/src/answers/choice.ts is what decides whether the pick is
 * the answer, and this file never compares two option ids itself. That matters
 * more than it looks: the moment a surface writes its own `chosen === correct`,
 * the package's rule and the screen's rule are two rules, and the one a student
 * sees is the one nobody tested. Same reason LessonPlayer calls gradeAttempt
 * and nothing else.
 *
 * WHAT THIS FILE ADDS ON TOP, and why it is not in curriculum. Two things
 * curriculum has no opinion about because they are beat concepts rather than
 * answer concepts:
 *
 *   1. THE MASTERY LEVEL. `canFail(0)` is false, so at L0 the beat is a first
 *      meeting and a wrong pick still clears it. That is a contract in
 *      ../types.ts, not a difficulty setting, and it is honoured here rather
 *      than by the component, so it is testable without a browser. It is
 *      honoured HONESTLY: the recorded result carries the cause the student
 *      actually earned, so the attempt history never claims they picked the
 *      right option when they did not. Only the outcome is generous.
 *
 *   2. WHICH COPY THE SCREEN SHOWS. Every wrong option in content.ts carries
 *      an authored `why`, so a wrong pick always resolves at CLAUDE.md's Tier 2
 *      and never falls through to the Tier 1 tail. Curriculum's own registry
 *      agrees: `option_is_not_the_correct_one` is specificity `generic` and its
 *      teaching note reads "on a multiple choice problem this cause means a
 *      distractor is missing". So the verdict's cause is deliberately not what
 *      the student reads; it is kept on the reveal for the log and for the
 *      test that proves the fall through never happens.
 *
 * The reveal shows BOTH explanations after a wrong pick, in this order: what
 * the chosen option was about, then what the answer is and why. That is the
 * shape of the "short explanation" reference capture, which leads with the
 * claim and follows with one muted line, and it is the coach voice ordering:
 * name what happened first, then make the next step reachable.
 */

import { checkMultipleChoice, type MultipleChoiceState } from "@blueberry/curriculum";

import { mcqAnswerSpec } from "./authoring";
import {
  beatAllowedAt,
  canFail,
  type BeatCauseId,
  type BeatOption,
  type BeatResult,
  type MasteryLevel,
  type McqBeat,
} from "../types";

/**
 * The cause recorded for a pick that matched the authored answer. chem-core's
 * own success cause, reached through BeatCauseId, rather than a new id: a
 * correct MCQ is the requested route taken.
 */
export const CORRECT_CAUSE: BeatCauseId = "matches_requested_route";

/**
 * The fallback for a wrong pick whose option names no chemistry cause. It is a
 * shape cause, which is the honest reading: the student matched an authored
 * distractor, and the teaching is in that distractor's own copy.
 */
export const DISTRACTOR_CAUSE: BeatCauseId = "chose_authored_distractor";

export interface McqReveal {
  readonly beatId: string;
  readonly level: MasteryLevel;
  readonly chosenId: string;
  /** Did the pick match the authored answer. The truth, whatever the level. */
  readonly matchedAnswer: boolean;
  /**
   * Was this a first meeting, where a wrong pick still clears the beat. True
   * exactly when the level cannot fail, so a screen can say so out loud rather
   * than silently marking a wrong answer correct.
   */
  readonly firstMeeting: boolean;
  /** The authored line for the option the student picked. Always present. */
  readonly chosenWhy: string;
  readonly chosenText: string;
  /** The answer, and the authored line for it. Shown whatever they picked. */
  readonly answerId: string;
  readonly answerText: string;
  readonly answerWhy: string;
  /**
   * What curriculum's checker said, kept for the log. Never rendered: on this
   * beat it is always the generic `option_is_not_the_correct_one`, and that
   * cause's own registry entry says it means a distractor is missing.
   */
  readonly checkerCause: string | null;
  readonly result: BeatResult;
}

function optionById(beat: McqBeat, id: string): BeatOption {
  const option = beat.options.find((candidate) => candidate.id === id);
  if (option === undefined) {
    throw new Error(`beat ${beat.id} has no option ${id}; a screen can only submit an option it rendered`);
  }
  return option;
}

/** The authored explanation, or a stated absence. Authoring bans the absence. */
function whyOf(option: BeatOption): string {
  return option.why ?? "";
}

export interface McqAttempt {
  readonly beat: McqBeat;
  readonly level: MasteryLevel;
  readonly chosenId: string;
  readonly elapsedMs: number;
  /** ISO 8601. Passed in rather than read from the clock, so this stays pure. */
  readonly at: string;
}

export function gradeMcq(attempt: McqAttempt): McqReveal {
  const { beat, level, chosenId, elapsedMs, at } = attempt;

  const chosen = optionById(beat, chosenId);
  const answer = optionById(beat, beat.correctOptionId);

  const state: MultipleChoiceState = { kind: "multiple_choice", optionId: chosenId };
  const verdict = checkMultipleChoice(mcqAnswerSpec(beat), state);
  const matchedAnswer = verdict.outcome === "correct";
  const firstMeeting = !canFail(level);

  const base = { beatId: beat.id, level, elapsedMs, at } as const;

  let result: BeatResult;
  if (matchedAnswer) {
    result = { ...base, kind: "correct", cause: CORRECT_CAUSE };
  } else {
    // The cause is the option's own when the author named one, and the shape
    // cause otherwise. Either way it is what actually happened, so a first
    // meeting that clears is still logged as the distractor it was.
    const cause = chosen.cause ?? DISTRACTOR_CAUSE;
    result = firstMeeting
      ? { ...base, kind: "correct", cause, distractorId: chosen.id }
      : { ...base, kind: "invalid", cause, distractorId: chosen.id };
  }

  return {
    beatId: beat.id,
    level,
    chosenId,
    matchedAnswer,
    firstMeeting,
    chosenWhy: whyOf(chosen),
    chosenText: chosen.text,
    answerId: answer.id,
    answerText: answer.text,
    answerWhy: whyOf(answer),
    checkerCause: verdict.outcome === "correct" ? null : verdict.cause,
    result,
  };
}

/**
 * The one line heading over the explanation, in the coach voice.
 *
 * Three cases and they read differently on purpose. A correct pick is told what
 * it recognised, because generic praise reads hollow and specific praise reads
 * as seen. A first meeting is told plainly that nothing was riding on it, which
 * is more honest than a green tick over a wrong answer. A wrong pick at a level
 * that can fail is told the mistake is a normal road, which is the wording the
 * lesson screen already uses.
 */
export function revealHeading(reveal: McqReveal): string {
  if (reveal.matchedAnswer) return "That is it.";
  if (reveal.firstMeeting) return "Now you have seen it. Nothing was riding on this one.";
  return "Not yet, and this is a common road.";
}

/** Beats authored for this node that are allowed at this rung. */
export function mcqBeatsAt(
  beats: readonly McqBeat[],
  node: string,
  level: MasteryLevel,
): readonly McqBeat[] {
  return beats.filter((beat) => beat.node === node && beatAllowedAt(beat, level));
}
