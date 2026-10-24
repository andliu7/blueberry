/**
 * The ambient glance: every 3 to 6 seconds the eyes look off, hold, and come
 * back. Bible section 01 A, "Blink and glance"; blink was built, this is the
 * other half.
 *
 * Only the schedule lives here. Berry.tsx steps the clock inside the rAF loop
 * it already runs and writes two custom properties on a transition, never per
 * frame; the eye travel itself is a CSS transition in bloom-motion.css.
 *
 * DETERMINISTIC ON PURPOSE, for the reason the blink clock is: a capture has
 * to be reproducible, so the irregularity comes from a tiny linear
 * congruential generator with a fixed seed rather than from Math.random.
 *
 * Pure data, no react, no DOM, same contract as the siblings.
 */

import { GLANCE } from "./bloomMotion";

export const GLANCE_SEED = 0x5bd1e995;

export interface GlanceClock {
  readonly seed: number;
  /** Absolute time of the next transition, in the caller's clock (rAF ms). */
  readonly nextAt: number;
  /** True while the eyes are off to one side. */
  readonly looking: boolean;
  /** Where the eyes are, -1 to 1 times GLANCE.maxLook. (0, 0) while not looking. */
  readonly x: number;
  readonly y: number;
}

/** One LCG step, returning the next seed and a roll in [0, 1). */
function roll(seed: number): [number, number] {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next, next / 4294967296];
}

function gapFrom(r: number): number {
  return GLANCE.gapMinMs + r * (GLANCE.gapMaxMs - GLANCE.gapMinMs);
}

/** A fresh clock: eyes ahead, the first glance one gap from `now`. */
export function startGlance(now: number, seed: number = GLANCE_SEED): GlanceClock {
  const [s, r] = roll(seed);
  return { seed: s, nextAt: now + gapFrom(r), looking: false, x: 0, y: 0 };
}

/**
 * Advance the clock to `now`. Returns the SAME object when nothing is due, so
 * the caller can compare by identity and skip the style write.
 *
 * Looking off: mostly sideways, a little up or down, never less than half the
 * allowed travel so a glance at 40px is a visible glance rather than a twitch.
 * The hold counts from the start of the move, so the eyes rest off to the side
 * for `holdMs` after a `moveMs` travel.
 */
export function stepGlance(clock: GlanceClock, now: number): GlanceClock {
  if (now < clock.nextAt) return clock;
  if (clock.looking) {
    const [s, r] = roll(clock.seed);
    return { seed: s, nextAt: now + gapFrom(r), looking: false, x: 0, y: 0 };
  }
  const [s1, side] = roll(clock.seed);
  const [s2, reach] = roll(s1);
  const [s3, tip] = roll(s2);
  const x = (side < 0.5 ? -1 : 1) * (0.5 + reach * 0.5) * GLANCE.maxLook;
  const y = (tip - 0.5) * GLANCE.maxLook * 0.6;
  return { seed: s3, nextAt: now + GLANCE.moveMs + GLANCE.holdMs, looking: true, x, y };
}
