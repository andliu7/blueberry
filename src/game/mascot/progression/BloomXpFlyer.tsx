/**
 * The "+N XP" chip that pops off the reward berry at the end of a lesson
 * (BLOOM-STATES-SPEC.md, C; Duolingo 7): pops in to 1.2 and settles, then rises
 * 32px and fades. The Hud has its own XP pop, but lessons render outside the
 * Shell, so that one plays late; this one plays where the student is looking.
 *
 * Two nested wrappers, one animation each (pop outside, rise inside), with the
 * timings written inline from XP_FLYER, the same pattern as BloomCatch. Place
 * it inside a box the size of the berry with `position: relative`.
 *
 * REDUCED MOTION: the chip sits above the berry, still and fully visible.
 */

import type { CSSProperties } from "react";
import { XP_FLYER } from "../bloomMotion";
import "./bloom-progression.css";

export interface BloomXpFlyerProps {
  /** XP earned. 0 or less draws nothing. */
  readonly amount: number;
  /** When the pop starts, in ms after this mounts. */
  readonly startMs?: number;
  readonly reducedMotion: boolean;
}

export function BloomXpFlyer({ amount, startMs = 0, reducedMotion }: BloomXpFlyerProps) {
  if (amount <= 0) return null;
  const pop = { animationDelay: `${startMs}ms`, animationDuration: `${XP_FLYER.popMs}ms` } as CSSProperties;
  const rise = {
    animationDelay: `${startMs + XP_FLYER.riseFromMs}ms`,
    animationDuration: `${XP_FLYER.riseToMs - XP_FLYER.riseFromMs}ms`,
    "--bloom-xp-rise": `${-XP_FLYER.risePx}px`,
  } as CSSProperties;
  return (
    <span className="bloom-xp" data-reduced={reducedMotion ? "true" : undefined} aria-label={`Plus ${amount} XP`}>
      <span className="bloom-xp-pop" style={reducedMotion ? undefined : pop}>
        <span className="bloom-xp-chip" style={reducedMotion ? undefined : rise} aria-hidden>
          +{amount} XP
        </span>
      </span>
    </span>
  );
}
