/**
 * The stage around one berry on a grading surface: everything an answer
 * reaction draws BESIDE Bloom rather than on it (BLOOM-STATES-SPEC.md, B).
 *
 *   Combo 5 and 8    three more sparkles around the head (Berry draws the
 *                    first three on its own sparkleKey); confetti at 8
 *   Thinking         three thought dots rising off the head, looping
 *   Reduced          the puff when a charred berry clears: uniform scale
 *                    1 to 1.08 to 1 plus a brightness flash, 600ms
 *
 * And `BloomHintRing`, the attention ring a wrong-again miss puts on the
 * tray's hint control. It is exported from here so its CSS ships in the same
 * file as the rest of the answer overlays.
 *
 * WHY A WRAPPER AND NOT MORE BERRY. Berry's loop writes exactly one transform
 * and a pose cannot change volume by design (scaleX is derived from scaleY).
 * The puff is a change in volume, so it has to be a transform on an element
 * around the berry. Putting the overlays here too keeps Berry.tsx, which is on
 * the #/app first paint, from growing: this file only loads with the lesson
 * chunks that grade answers.
 *
 * Reduced motion keys off `data-reduced`, a prop-driven attribute, so the
 * gallery's toggle shows the still frames; the media query and the html
 * attribute still apply on top, the way mascot.css does it.
 */

import type { CSSProperties, ReactNode } from "react";
import { comboOverlayFor, confettiPieces } from "./berryReaction";
import "./bloom-answers.css";

/** The props useBerryReactions hands over; spread them in. */
export interface BloomStageReactionProps {
  /** The milestone (3, 5 or 8) THIS grade reached, or null. Null on every other grade, so a fresh mount draws nothing. */
  readonly combo: number | null;
  /** Bumped on every milestone so the overlay replays. 0 draws none. */
  readonly comboKey: number;
  /** Non-zero only on the grade that cleared the char; it counts puffs so the parity restarts the animation. 0 never puffs. */
  readonly puffKey: number;
}

export interface BloomStageProps extends Partial<BloomStageReactionProps> {
  readonly reducedMotion: boolean;
  /** Mid-item and quiet for a while (useIdleInput's "thinking"): draw the thought dots. */
  readonly thinking?: boolean;
  readonly className?: string;
  /** The one <Berry>. */
  readonly children: ReactNode;
}

/** Berry draws three sparkles of its own on the same reaction; a stage adds the rest. */
const BERRY_OWN_SPARKLES = 3;
const STAR = "M12 0 C12.8 7 17 11.2 24 12 C17 12.8 12.8 17 12 24 C11.2 17 7 12.8 0 12 C7 11.2 11.2 7 12 0 Z";
const DOTS = [0, 1, 2];
// Built once at module load: the burst is deterministic, so there is nothing to recompute.
const CONFETTI = confettiPieces(24);

export function BloomStage({
  reducedMotion,
  combo = null,
  comboKey = 0,
  puffKey = 0,
  thinking = false,
  className = "",
  children,
}: BloomStageProps) {
  const overlay = comboKey > 0 ? comboOverlayFor(combo) : null;
  const extraSparkles = overlay === null ? 0 : Math.max(0, overlay.sparkles - BERRY_OWN_SPARKLES);
  return (
    <span className={`bloom-stage ${className}`} data-reduced={reducedMotion ? "true" : undefined}>
      {/* The puff alternates between two identical keyframes ("a" and "b"):
          changing animation-name restarts a CSS animation without remounting
          the berry, which would reset its rAF loop and drop the blend. */}
      <span className="bloom-stage-body" data-puff={puffKey > 0 ? (puffKey % 2 === 1 ? "a" : "b") : undefined}>
        {children}
      </span>

      {thinking ? (
        <span className="bloom-thought" aria-hidden>
          {DOTS.map((i) => (
            <span key={i} className="bloom-thought-dot" data-i={i} />
          ))}
        </span>
      ) : null}

      {/* key={comboKey} remounts the overlay so its animation replays on the next milestone. */}
      {overlay !== null ? (
        <span className="bloom-combo" key={`c${comboKey}`} data-combo={combo ?? undefined} aria-hidden>
          {Array.from({ length: extraSparkles }, (_, i) => (
            <svg key={i} className="bloom-combo-sparkle" data-i={i} viewBox="0 0 24 24">
              <path d={STAR} />
            </svg>
          ))}
          {overlay.confetti > 0
            ? CONFETTI.slice(0, overlay.confetti).map((piece, i) => (
                <span
                  key={i}
                  className="bloom-confetti"
                  data-c={piece.colour}
                  style={
                    {
                      "--cx": `${(piece.x * 100).toFixed(1)}%`,
                      "--cpeak": `${(piece.peakY * 100).toFixed(1)}%`,
                      "--cfall": `${(piece.fallY * 100).toFixed(1)}%`,
                      "--cspin": `${piece.spin}deg`,
                      animationDelay: `${piece.delayMs}ms`,
                    } as CSSProperties
                  }
                />
              ))
            : null}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The attention ring for the hint control, once per wrong-again miss. Place it
 * inside the control (which needs `position: relative`); it takes the
 * control's border radius. key={ringKey} remounts it so a second miss replays.
 */
export function BloomHintRing({ ringKey, reducedMotion }: { readonly ringKey: number; readonly reducedMotion: boolean }) {
  if (ringKey <= 0) return null;
  return <span key={ringKey} className="bloom-hint-ring" data-reduced={reducedMotion ? "true" : undefined} aria-hidden />;
}
