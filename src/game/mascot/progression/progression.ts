/**
 * The pure half of Bloom's progression beats (BLOOM-STATES-SPEC.md, section C):
 * when each beat lands and how big the streak flame is. The two level-change
 * rules live apart in levelChange.ts, because the Hud is on the #/app first
 * paint and must not pull this file (and its constants) in with them.
 *
 * Same contract as berryBehaviour.ts and its siblings: pure data and numbers,
 * no react, no DOM, so every timing the components draw can be tested here.
 * The numbers themselves come from bloomMotion.ts; nothing below types a
 * duration of its own except where it is derived from those.
 */

import { CATCH, EVOLVING, LESSON_COMPLETE, LEVEL_UP, STREAK_FLAME } from "../bloomMotion";

/* ------------------------------------------------------------- the streak -- */

/**
 * How big the flame behind Bloom is drawn for a streak of `days`. 1 at day
 * one, growing by a fixed step every time the streak doubles, capped at 1.6 so
 * a long streak never pushes the flame off the card. A restarted streak is day
 * one again and simply gets the day-one flame: no loss is drawn (conflict 2).
 */
export function flameScaleFor(days: number): number {
  const d = Number.isFinite(days) ? Math.max(1, days) : 1;
  return Math.min(STREAK_FLAME.max, 1 + STREAK_FLAME.perDoubling * Math.log2(d));
}

/* -------------------------------------------------------------- level up -- */

/** When each beat of the easter egg starts, in ms from the overlay opening. */
export interface EvolvingBeats {
  readonly silhouetteAt: number;
  readonly flashAt: number;
  readonly revealAt: number;
  /** The caption is on screen and the joke is over. Always under EVOLVING.maxTotalMs. */
  readonly doneAt: number;
}

/** How long the reveal holds before the level up itself starts. Inside the 2400ms cap. */
const REVEAL_HOLD_MS = 900;

export function evolvingBeats(): EvolvingBeats {
  const silhouetteAt = EVOLVING.darkMs;
  const flashAt = silhouetteAt + EVOLVING.silhouetteMs;
  const revealAt = flashAt + EVOLVING.flashMs;
  return { silhouetteAt, flashAt, revealAt, doneAt: Math.min(EVOLVING.maxTotalMs - 1, revealAt + REVEAL_HOLD_MS) };
}

/** The level up's own beats, from the moment it starts: dip, grow and back, ring, badge roll. */
export function levelUpBeats(): { readonly growAt: number; readonly badgeAt: number; readonly doneAt: number } {
  const growAt = LEVEL_UP.dipMs;
  // The badge rolls as the grow peaks, so the new number lands on the biggest frame.
  const badgeAt = growAt + Math.round(LEVEL_UP.growMs / 2) - Math.round(LEVEL_UP.badgeRollMs / 2);
  const doneAt = Math.max(growAt + LEVEL_UP.growMs, LEVEL_UP.ringMs);
  return { growAt, badgeAt, doneAt };
}

/* ---------------------------------------------------------- diamond catch -- */

/** When the diamond's beats land, in ms after the catch starts. */
export interface CatchBeats {
  /** The diamond leaves the top: Bloom goes wide eyed. */
  readonly fallAt: number;
  /** The diamond lands on Bloom's head: Bloom hops. */
  readonly landAt: number;
  /** It leaves the head for the counter. */
  readonly flyAt: number;
  /** It reaches the counter, which starts counting up. */
  readonly arriveAt: number;
}

export function catchBeats(startMs = 0): CatchBeats {
  const fallAt = startMs + CATCH.hangMs;
  const landAt = fallAt + CATCH.fallMs;
  const flyAt = landAt + CATCH.restMs;
  return { fallAt, landAt, flyAt, arriveAt: flyAt + CATCH.flyMs };
}

/* -------------------------------------------------------- lesson complete -- */

/**
 * When the i-th summary line reveals, in ms from the screen opening. The
 * headline is line 0 and lands at headlineAtMs; the stats follow from
 * statsFromMs, one stagger apart. Nothing waits past CONTINUE's 1500ms: a long
 * summary reveals its tail at the cap rather than holding the screen.
 */
export function lessonRevealAt(index: number): number {
  if (index <= 0) return LESSON_COMPLETE.headlineAtMs;
  const at = LESSON_COMPLETE.statsFromMs + (index - 1) * LESSON_COMPLETE.statsStaggerMs;
  return Math.min(LESSON_COMPLETE.continueLiveByMs, at);
}

/**
 * When the lesson-complete diamond catch starts: the moment CONTINUE is live,
 * so it is a bonus that plays on a screen the student can already leave, and
 * it does not cut into the celebrate hop or the XP chip before it.
 */
export const LESSON_CATCH_START_MS = LESSON_COMPLETE.continueLiveByMs;

/** When the "+N XP" chip pops off the berry: as the celebrate hop leaves the ground. */
export const LESSON_XP_AT_MS = LESSON_COMPLETE.entryMs + LESSON_COMPLETE.landMs + 120;

/* ----------------------------------------------------------------- counts -- */

/**
 * A counter's shown value `elapsed` ms into a count-up of `durationMs`, eased
 * out so it slows into the final number. Whole numbers only, never past
 * `value`, and the final value from the last frame on (and under reduced
 * motion, where the caller passes elapsed = durationMs).
 */
export function countUpAt(value: number, elapsed: number, durationMs: number): number {
  if (value <= 0) return Math.max(0, Math.round(value));
  if (durationMs <= 0 || elapsed >= durationMs) return value;
  if (elapsed <= 0) return 0;
  const t = elapsed / durationMs;
  const eased = 1 - (1 - t) ** 3;
  return Math.min(value, Math.floor(value * eased));
}

/* --------------------------------------------------------------- confetti -- */

export interface CelebrationPiece {
  /** Where it lands across the stage, -0.5 (left edge) to 0.5 (right edge), from the centre. */
  readonly x: number;
  /** How high it rises first, a negative fraction of the stage height. */
  readonly peakY: number;
  /** Where it ends, a positive fraction of the stage height below the start. */
  readonly fallY: number;
  readonly spin: number;
  readonly delayMs: number;
  /** Index into the five confetti colours in bloom-progression.css. */
  readonly colour: number;
}

export const CELEBRATION_COLOURS = 5;

/**
 * A deterministic burst for the lesson and unit screens, the same pieces every
 * time (like Berry's blink) so a capture is reproducible. Wider than the combo
 * burst in berryReaction.ts, which is held near a 40px berry: this one is the
 * width of the card and its delays spread over `spreadMs`, so a 40-piece unit
 * burst reads as a shower rather than one pop.
 */
export function celebrationConfetti(count: number, spreadMs = 300): readonly CelebrationPiece[] {
  let seed = 0x6d2b79f5;
  const roll = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const n = Math.max(0, Math.floor(count));
  return Array.from({ length: n }, (_, i): CelebrationPiece => {
    // Evenly across the width with a little wobble, so no gap opens in the middle.
    const lane = n <= 1 ? 0 : i / (n - 1) - 0.5;
    return {
      x: Math.max(-0.5, Math.min(0.5, lane + (roll() - 0.5) * 0.08)),
      peakY: -(0.2 + roll() * 0.35),
      fallY: 0.55 + roll() * 0.4,
      spin: Math.round((roll() - 0.5) * 900),
      delayMs: Math.round(roll() * spreadMs),
      colour: i % CELEBRATION_COLOURS,
    };
  });
}
