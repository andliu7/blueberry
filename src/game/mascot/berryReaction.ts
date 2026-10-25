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
import { COMBO_CONFETTI, COMBO_SPARKLES } from "./bloomMotion";

/**
 * `wrongAgain` is a second miss on the SAME item (BLOOM-STATES-SPEC.md, B).
 * The caller decides "same item"; this file only decides the face.
 */
export type ReactionOutcome = "correct" | "wrong" | "nearMiss" | "wrongAgain";

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
  /** Offer the hint: the caller rings the tray's hint control. Wrong again only. */
  readonly hint: boolean;
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
          hint: false,
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
        hint: false,
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
        hint: false,
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
          hint: false,
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
        hint: false,
      };
    }
    case "wrongAgain": {
      // The char still wins: a third miss in a row is the oxidized beat
      // whether or not it was the same item twice.
      if (run.missRun >= CHARRED_AT_MISSES) return reactionFor("wrong", run);
      // No sad hold. The friend already winced once at this one; the second
      // time it leans in at the problem with you and points at the hint.
      return {
        state: "neutral",
        mood: SETTLED_AFTER_MISS.mood,
        behaviour: SETTLED_AFTER_MISS.behaviour,
        chain: NO_CHAIN,
        sparkles: false,
        holdMs: null,
        combo: null,
        hint: true,
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
 * What a combo milestone draws BESIDE the berry (BLOOM-STATES-SPEC.md, B).
 * The bounce chain above is pinned and unchanged; escalation lives here
 * instead. `sparkles` is the total around the head, the three Berry's own
 * `sparkleKey` already draws included, so a stage adds `sparkles - 3`.
 * Confetti only at 8, and nothing past the cap or for a broken combo, so the
 * escalation never turns into a pressure loop.
 */
export interface ComboOverlay {
  readonly sparkles: number;
  readonly confetti: number;
}

export function comboOverlayFor(combo: number | null): ComboOverlay | null {
  if (combo !== 3 && combo !== 5 && combo !== 8) return null;
  return {
    sparkles: COMBO_SPARKLES[combo],
    confetti: combo === COMBO_CONFETTI.atCombo ? COMBO_CONFETTI.pieces : 0,
  };
}

/** One confetti piece, as fractions of the stage box. Read by BloomStage as CSS variables. */
export interface ConfettiPiece {
  /** Where it lands, from the head's centre. 0.3 to 0.75 of the stage width, either side. */
  readonly x: number;
  /** How high it rises before it falls, a negative fraction of the stage height. */
  readonly peakY: number;
  /** Where it ends, below the head. Positive fraction of the stage height. */
  readonly fallY: number;
  /** Spin by the end, in degrees. */
  readonly spin: number;
  readonly delayMs: number;
  /** Index into the stage's confetti colours. */
  readonly colour: number;
}

/** The confetti palette length in bloom-answers.css. */
export const CONFETTI_COLOURS = 5;

/**
 * A deterministic burst: the same pieces every time, like Berry's blink, so a
 * capture is reproducible. Pieces fan out to both sides of the head with a
 * small seeded wobble and land beside the berry, never on its face: measured
 * at 40px, a burst that fell straight down covered the eyes. The widest piece
 * lands at 0.75 of the stage width from the centre, a quarter stage past the
 * berry's edge, so the burst stays near the berry it belongs to.
 */
export function confettiPieces(count: number): readonly ConfettiPiece[] {
  let seed = 0x2545f491;
  const roll = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: Math.max(0, count) }, (_, i): ConfettiPiece => {
    // Alternate sides, and step outward along each side.
    const side = i % 2 === 0 ? -1 : 1;
    const step = count <= 2 ? 0 : Math.floor(i / 2) / Math.max(1, Math.ceil(count / 2) - 1);
    return {
      x: side * Math.min(0.75, 0.3 + step * 0.4 + roll() * 0.05),
      peakY: -(0.25 + roll() * 0.3),
      fallY: 0.15 + roll() * 0.3,
      spin: Math.round((roll() - 0.5) * 720),
      delayMs: Math.round(roll() * 120),
      colour: i % CONFETTI_COLOURS,
    };
  });
}

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
