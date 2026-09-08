/**
 * What Bloom does when an answer is graded. The answer reaction rows of
 * docs/MASCOT.md, as a table a lesson player and the trainer both read.
 *
 * Why this is a file and not a few lines inside LessonPlayer. Two surfaces
 * grade answers today (the lesson player over the curriculum package, the
 * trainer over chem-core) and both have to make the same face for the same
 * outcome, or the character has two personalities. A student who bounces in
 * a lesson and twitches in the trainer for the same correct answer learns
 * that the mascot is decoration. So the mapping from OUTCOME plus RUN to a
 * (state, mood, behaviour chain) triple lives here once, and the two
 * surfaces only decide the outcome.
 *
 * Same contract as its four siblings: pure data, no react, no DOM. The chains
 * below are module constants so a component can pass them as props without
 * a fresh array every render.
 *
 * The rows, from MASCOT.md's "Answer reactions" table:
 *
 *   Correct               neutral  happy     squash then bounce
 *   Combo, escalating     neutral  excited   bounce x n
 *   Near miss             neutral  thinking  leanIn
 *   Wrong                 neutral  sad       squash
 *   Wrong again           neutral  curious   leanIn      (the hint offer)
 *   Oxidized, third miss  charred  sad       stressed
 *
 * And the tone rule that governs the sad rows: "A sad mood after a miss
 * recovers inside one second and never holds." `holdMs` on a reaction is how
 * long the FACE holds before the caller settles it back to the working face.
 * The charred STATE is not a face and outlives the sad beat on purpose: it
 * is the comic mark of the third miss, and it clears on the next correct
 * answer with a brighter puff (Berry's `flashKey`), which is the recovery
 * beat the state's own comment promises.
 */

import type { BerryBehaviour } from "./berryBehaviour";
import type { BerryMood } from "./berryMood";
import type { BerryState } from "./berryState";

export type ReactionOutcome = "correct" | "wrong" | "nearMiss";

export interface Reaction {
  readonly state: BerryState;
  readonly mood: BerryMood;
  /** The first behaviour to play. */
  readonly behaviour: BerryBehaviour;
  /** Behaviours to play after it finishes, in order. Each repeat escalates. */
  readonly chain: readonly BerryBehaviour[];
  /** Three sparkles around the head. Correct answers only. */
  readonly sparkles: boolean;
  /** How long the face holds before the caller settles it. null holds until the next event. */
  readonly holdMs: number | null;
  /** The combo milestone this reaction is, or null. */
  readonly combo: number | null;
}

/** The run lengths a reaction is decided from. Both are AFTER the graded answer is counted. */
export interface AnswerRun {
  /** Consecutive correct answers, this one included when it was correct. */
  readonly correctRun: number;
  /** Consecutive misses, this one included when it was a miss. */
  readonly missRun: number;
}

/** Where the combo interstitial fires. MASCOT.md says escalating; the spec names these three. */
export const COMBO_MILESTONES: readonly number[] = Object.freeze([3, 5, 8]);

/** The miss count that chars the berry. */
export const CHARRED_AT_MISSES = 3;

/**
 * How long a sad face is allowed to hold. MASCOT.md's tone rule says inside
 * one second; 900 leaves a frame's margin under it rather than sitting on it.
 */
export const SAD_HOLD_MS = 900;

const NO_CHAIN: readonly BerryBehaviour[] = Object.freeze([]);
const THEN_BOUNCE: readonly BerryBehaviour[] = Object.freeze(["bounce"]);

/** bounce x n for a combo of n milestones reached: 3 gives two extra bounces, 5 three, 8 four. */
const bounces = (n: number): readonly BerryBehaviour[] => Object.freeze(Array.from({ length: n }, (): BerryBehaviour => "bounce"));
const COMBO_CHAINS: Readonly<Record<number, readonly BerryBehaviour[]>> = Object.freeze({
  3: bounces(2),
  5: bounces(3),
  8: bounces(4),
});

export function isComboMilestone(correctRun: number): boolean {
  return COMBO_MILESTONES.includes(correctRun);
}

export function reactionFor(outcome: ReactionOutcome, run: AnswerRun): Reaction {
  switch (outcome) {
    case "correct": {
      if (isComboMilestone(run.correctRun)) {
        return {
          state: "neutral",
          mood: "excited",
          behaviour: "bounce",
          chain: COMBO_CHAINS[run.correctRun] ?? THEN_BOUNCE,
          sparkles: true,
          holdMs: null,
          combo: run.correctRun,
        };
      }
      return {
        state: "neutral",
        mood: "happy",
        behaviour: "squash",
        chain: THEN_BOUNCE,
        sparkles: true,
        holdMs: null,
        combo: null,
      };
    }
    case "nearMiss":
      return {
        state: "neutral",
        mood: "thinking",
        behaviour: "leanIn",
        chain: NO_CHAIN,
        sparkles: false,
        holdMs: null,
        combo: null,
      };
    case "wrong": {
      if (run.missRun >= CHARRED_AT_MISSES) {
        // Oxidized: the comic beat. Sad and stressed for under a second, then
        // the face settles while the char stays until the next correct.
        return {
          state: "charred",
          mood: "sad",
          behaviour: "stressed",
          chain: NO_CHAIN,
          sparkles: false,
          holdMs: SAD_HOLD_MS,
          combo: null,
        };
      }
      return {
        state: "neutral",
        mood: "sad",
        behaviour: "squash",
        chain: NO_CHAIN,
        sparkles: false,
        holdMs: SAD_HOLD_MS,
        combo: null,
      };
    }
    default: {
      const unreachable: never = outcome;
      return unreachable;
    }
  }
}

/**
 * The face a wrong answer settles to once the sad beat is over: MASCOT.md's
 * "Wrong again, offers hint" row. Curious, leaning in at the problem, which
 * is the friend who also got it wrong turning back to the page.
 */
export const SETTLED_AFTER_MISS: Pick<Reaction, "mood" | "behaviour"> = Object.freeze({
  mood: "curious",
  behaviour: "leanIn",
});

/**
 * The one line in the combo interstitial's speech bubble.
 *
 * CLAUDE.md's voice rule: praise is specific or it is hollow. Every line names
 * the count and the topic, because those are the two things the student
 * actually did, and none of them is a sentence a smart friend would roll their
 * eyes at. `topicLabel` is the topic's display label ("Gas laws").
 */
export function comboLine(count: number, topicLabel: string): string {
  const topic = topicLabel.trim() === "" ? "this topic" : topicLabel.trim();
  if (count >= 8) return `Eight in a row. That is exam pace on ${topic}, and you set it.`;
  if (count >= 5) return `Five straight on ${topic}. This is starting to look like something you own.`;
  return `Three in a row on ${topic}. You are not guessing at these, you are reading them.`;
}

/** The small caption on the strip when the berry chars. Comic, and on the student's side. */
export const CHARRED_LINE = "Three in a row went sideways. Bloom is a little toasted too. The next one clears the smoke.";
