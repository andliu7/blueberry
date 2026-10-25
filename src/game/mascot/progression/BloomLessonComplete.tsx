/**
 * Bloom at the end of a lesson and at the end of a unit (BLOOM-STATES-SPEC.md,
 * C; Duolingo 9 and 10). Two celebrations that share one confetti layer, so
 * they share a file.
 *
 * LESSON COMPLETE. Bloom enters from below with one overshoot, lands into
 * cheer + celebrate, confetti bursts behind, "+N XP" pops off the berry, the
 * summary lines the caller passes as children reveal one by one, and once
 * CONTINUE is live (1500ms) a diamond drops onto Bloom's head and flies into
 * a "+N" counter beside it. Continue is never held: the catch is a bonus that
 * plays after it is already live.
 *
 * UNIT COMPLETE. proud + celebrate (MASCOT.md's row), a trophy rising behind
 * the berry and a 40-piece shower. ExamEnd mounts it on a passed quiz.
 *
 * ONE BERRY. Each component renders exactly one <Berry>; the catch and the XP
 * chip are drawn beside it (BloomCatch, BloomXpFlyer) and this file changes
 * the berry's behaviour on their beats, so the face and the diamond agree.
 *
 * HOW THE BEATS RUN. A handful of setTimeouts, one per behaviour change (four
 * at most), each setting state once; everything that moves between them is CSS
 * with inline delays from bloomMotion.ts. Not a rAF loop: the berry already has
 * one, and nothing here changes per frame.
 *
 * REDUCED MOTION: no entry, no confetti, no diamond flight, no timers. Bloom
 * holds the cheer (or proud) face, the trophy stands, "+N XP" and the counter
 * are drawn at their final values and every summary line is already there.
 */

import { Children, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Berry } from "../Berry";
import type { BerryBehaviour } from "../berryBehaviour";
import type { BerryCostume } from "../berryCostume";
import type { BerryMood } from "../berryMood";
import { LESSON_COMPLETE, UNIT_COMPLETE } from "../bloomMotion";
import { BloomCatch } from "./BloomCatch";
import { BloomXpFlyer } from "./BloomXpFlyer";
import {
  LESSON_CATCH_START_MS,
  LESSON_XP_AT_MS,
  catchBeats,
  celebrationConfetti,
  lessonRevealAt,
  type CelebrationPiece,
} from "./progression";
import "./bloom-progression.css";

/** Built once at module load: the bursts are deterministic. */
const LESSON_BURST = celebrationConfetti(24);
const UNIT_BURST = celebrationConfetti(UNIT_COMPLETE.confettiPieces, 600);

/** One piece's fall, as wide as the layer and as long as the layer is tall. */
function Confetti({ pieces, startMs, durationMs }: { readonly pieces: readonly CelebrationPiece[]; readonly startMs: number; readonly durationMs: number }) {
  return (
    <span className="bloom-pro-confetti" aria-hidden>
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="bloom-pro-flake"
          data-c={piece.colour}
          style={
            {
              "--cx": `${(piece.x * 100).toFixed(1)}%`,
              "--cpeak": `${(piece.peakY * 100).toFixed(1)}%`,
              "--cfall": `${(piece.fallY * 100).toFixed(1)}%`,
              "--cspin": `${piece.spin}deg`,
              animationDelay: `${startMs + piece.delayMs}ms`,
              animationDuration: `${durationMs - piece.delayMs}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

/**
 * Run a list of [ms, action] steps once after mount, cancelled on unmount.
 * Skipped entirely under reduced motion, where the caller's initial state is
 * already the final frame.
 */
function useBeats(steps: readonly (readonly [number, () => void])[], reducedMotion: boolean): void {
  useEffect(() => {
    if (reducedMotion) return;
    const ids = steps.map(([at, run]) => window.setTimeout(run, at));
    return () => ids.forEach((id) => window.clearTimeout(id));
    // Steps are rebuilt every render, but the beats run once per mount: that is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);
}

interface Motion {
  readonly behaviour: BerryBehaviour;
  /** Bumped so the same behaviour can replay (two bounces in a row). */
  readonly key: number;
}

/* -------------------------------------------------------- lesson complete -- */

export interface BloomLessonCompleteProps {
  readonly reducedMotion: boolean;
  /** XP the lesson earned, or null while it is unknown. 0 or null shows no chip. */
  readonly xp?: number | null;
  /** Diamonds the store paid, or null while the clear is landing. 0 or null plays no catch. */
  readonly diamonds?: number | null;
  readonly costume?: BerryCostume;
  readonly sizePx?: number;
  /** The summary lines (headline first). Each child reveals on its own beat. */
  readonly children?: ReactNode;
}

export function BloomLessonComplete({
  reducedMotion,
  xp = null,
  diamonds = null,
  costume,
  sizePx = 96,
  children,
}: BloomLessonCompleteProps) {
  const [motion, setMotion] = useState<Motion>({ behaviour: "idle", key: 0 });
  const play = (behaviour: BerryBehaviour) => setMotion((m) => ({ behaviour, key: m.key + 1 }));
  const paid = diamonds ?? 0;
  const beats = catchBeats(LESSON_CATCH_START_MS);
  useBeats(
    [
      [LESSON_COMPLETE.entryMs, () => play("celebrate")],
      ...(paid > 0
        ? ([
            [beats.fallAt, () => play("wideEyed")],
            [beats.landAt, () => play("bounce")],
          ] as const)
        : []),
    ],
    reducedMotion,
  );

  return (
    <div className="bloom-lc" data-reduced={reducedMotion ? "true" : undefined}>
      <span className="bloom-celebrate" style={{ width: sizePx, height: sizePx }}>
        {reducedMotion ? null : <Confetti pieces={LESSON_BURST} startMs={LESSON_COMPLETE.entryMs} durationMs={1200} />}
        <span className="bloom-lc-enter" style={{ animationDuration: `${LESSON_COMPLETE.entryMs}ms`, "--bloom-entry-from": `${LESSON_COMPLETE.entryFromPct}%` } as CSSProperties}>
          <Berry
            mood="cheer"
            behaviour={motion.behaviour}
            behaviourKey={motion.key}
            costume={costume}
            sizePx={sizePx}
            reducedMotion={reducedMotion}
          />
        </span>
        <BloomXpFlyer amount={xp ?? 0} startMs={LESSON_XP_AT_MS} reducedMotion={reducedMotion} />
        <BloomCatch amount={paid} startMs={LESSON_CATCH_START_MS} reducedMotion={reducedMotion} />
      </span>
      {Children.toArray(children).map((child, i) => (
        <div key={i} className="bloom-lc-line" style={reducedMotion ? undefined : { animationDelay: `${lessonRevealAt(i)}ms` }}>
          {child}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- unit complete -- */

/** The trophy, flat and in the illustration palette: a face and a darker lip. */
function Trophy() {
  return (
    <svg viewBox="0 0 64 64" className="bloom-trophy-art" aria-hidden focusable="false">
      <path d="M14 10h-6a2 2 0 0 0-2 2c0 9 5 15 12 16l1-5c-4-1-6-4-7-9h3z" className="bloom-trophy-lip" />
      <path d="M50 10h6a2 2 0 0 1 2 2c0 9-5 15-12 16l-1-5c4-1 6-4 7-9h-3z" className="bloom-trophy-lip" />
      <path d="M16 6h32v12c0 10-7 17-16 17S16 28 16 18z" className="bloom-trophy-face" />
      <path d="M20 9h6v10c0 5 2 8 5 10-6-1-11-5-11-11z" className="bloom-trophy-shine" />
      <path d="M28 34h8v10h-8z" className="bloom-trophy-lip" />
      <path d="M20 44h24a3 3 0 0 1 3 3v7H17v-7a3 3 0 0 1 3-3z" className="bloom-trophy-face" />
      <path d="M17 51h30v3H17z" className="bloom-trophy-lip" />
    </svg>
  );
}

export interface BloomUnitCompleteProps {
  readonly reducedMotion: boolean;
  readonly costume?: BerryCostume;
  readonly sizePx?: number;
  /** The face. proud by default (MASCOT.md, Unit complete). */
  readonly mood?: BerryMood;
}

/** When Bloom hops: as the trophy finishes rising, so the hop reads as the reaction to it. */
const UNIT_HOP_AT_MS = Math.round(UNIT_COMPLETE.trophyRiseMs * 0.6);

export function BloomUnitComplete({ reducedMotion, costume, sizePx = 104, mood = "proud" }: BloomUnitCompleteProps) {
  const [motion, setMotion] = useState<Motion>({ behaviour: "idle", key: 0 });
  useBeats([[UNIT_HOP_AT_MS, () => setMotion((m) => ({ behaviour: "celebrate", key: m.key + 1 }))]], reducedMotion);
  return (
    <span className="bloom-celebrate" data-reduced={reducedMotion ? "true" : undefined}
      // Room above the head for the trophy's cup, which stands taller than the berry.
      style={{ width: sizePx, height: sizePx, marginTop: Math.round(sizePx * 0.5) }}
    >
      <span className="bloom-trophy" style={reducedMotion ? undefined : { animationDuration: `${UNIT_COMPLETE.trophyRiseMs}ms` }}>
        <Trophy />
      </span>
      {reducedMotion ? null : <Confetti pieces={UNIT_BURST} startMs={UNIT_HOP_AT_MS} durationMs={UNIT_COMPLETE.confettiMs} />}
      <span className="bloom-unit-berry">
        <Berry mood={mood} behaviour={motion.behaviour} behaviourKey={motion.key} costume={costume} sizePx={sizePx} reducedMotion={reducedMotion} />
      </span>
    </span>
  );
}
