/**
 * The diamond catch (BLOOM-STATES-SPEC.md, C; Duolingo 8): a diamond hangs a
 * beat above Bloom, falls onto its head, rests there with one bob, then flies
 * into a "+N" counter beside the berry, which counts up as it arrives.
 *
 * Bloom has no arms, so "holds it up" is the diamond sitting on top of the
 * head. This file draws only what is BESIDE the berry (the diamond and the
 * counter). The berry itself belongs to the parent, which reads the same
 * beats from `catchBeats` and plays wideEyed on the fall and a bounce on the
 * landing, so a screen keeps exactly one berry.
 *
 * ALL CSS. Each part of the flight is its own nested wrapper with one
 * animation (fly > fall > bob > glyph), and the delays and durations are
 * written inline from bloomMotion.ts, so the keyframes carry no timing of
 * their own and a retune is one constant. Place it inside a box the size of
 * the berry with `position: relative`.
 *
 * REDUCED MOTION: no diamond at all, the counter is drawn at its final value.
 */

import { useEffect, useState, type CSSProperties } from "react";
import { DiamondMark } from "../../app/ui/HudIcons";
import { CATCH, LESSON_COMPLETE } from "../bloomMotion";
import { catchBeats, countUpAt } from "./progression";
import "./bloom-progression.css";

/**
 * A number that counts up from 0 to `value` over `durationMs`, starting
 * `startMs` after mount. One rAF loop that stops when the count lands, so it
 * re-renders only for those 600ms; under reduced motion it never starts.
 */
export function BloomCountUp({
  value,
  startMs,
  durationMs = LESSON_COMPLETE.countUpMs,
  reducedMotion,
}: {
  readonly value: number;
  readonly startMs: number;
  readonly durationMs?: number;
  readonly reducedMotion: boolean;
}) {
  const [elapsed, setElapsed] = useState(reducedMotion ? durationMs : 0);
  useEffect(() => {
    if (reducedMotion) {
      setElapsed(durationMs);
      return;
    }
    const opened = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = now - opened - startMs;
      setElapsed(t);
      if (t < durationMs) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, startMs, durationMs, reducedMotion]);
  return <>{countUpAt(value, elapsed, durationMs)}</>;
}

export interface BloomCatchProps {
  /** Diamonds paid. 0 or less draws nothing. */
  readonly amount: number;
  /** When the catch starts, in ms after this mounts. */
  readonly startMs?: number;
  readonly reducedMotion: boolean;
}

export function BloomCatch({ amount, startMs = 0, reducedMotion }: BloomCatchProps) {
  if (amount <= 0) return null;
  const beats = catchBeats(startMs);
  const ms = (n: number) => `${n}ms`;
  return (
    <span className="bloom-catch" data-reduced={reducedMotion ? "true" : undefined}>
      {reducedMotion ? null : (
        <span
          className="bloom-catch-fly"
          style={{ animationDelay: ms(beats.flyAt), animationDuration: ms(CATCH.flyMs) } as CSSProperties}
          aria-hidden
        >
          <span
            className="bloom-catch-fall"
            style={{ animationDelay: `${ms(startMs)}, ${ms(beats.fallAt)}`, animationDuration: `1ms, ${ms(CATCH.fallMs)}` }}
          >
            <span
              className="bloom-catch-bob"
              style={{ animationDelay: ms(beats.landAt), animationDuration: ms(CATCH.restMs) }}
            >
              <DiamondMark className="bloom-catch-gem" />
            </span>
          </span>
        </span>
      )}
      <span
        className="bloom-catch-count"
        style={reducedMotion ? undefined : { animationDelay: ms(beats.arriveAt) }}
        aria-label={`Plus ${amount} ${amount === 1 ? "diamond" : "diamonds"}`}
      >
        <DiamondMark className="bloom-catch-count-gem" />
        <span aria-hidden>
          +<BloomCountUp value={amount} startMs={beats.arriveAt} reducedMotion={reducedMotion} />
        </span>
      </span>
    </span>
  );
}
