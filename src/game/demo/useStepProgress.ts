/**
 * The animation driver: a custom hook (a function whose name starts with `use`
 * that composes other hooks; React's unit of reusable stateful logic) that owns
 * the step's progress number.
 *
 * The renderer contract deliberately has no clock, so this is where time
 * lives. requestAnimationFrame is the browser's "call me before the next
 * frame" API; driving progress from it means the animation advances exactly
 * once per painted frame, which is what the frame measurement script measures.
 *
 * Frame timestamps are recorded into a module-level array exposed as
 * window.__blueberryFrames, so the headless measurement script can read real
 * paint cadence out of the page rather than instrumenting from outside. The
 * array is capped so a long dev session cannot grow it without bound.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const FRAME_LOG_CAP = 4000;

declare global {
  interface Window {
    __blueberryFrames?: number[];
  }
}

function logFrame(now: number): void {
  const log = (window.__blueberryFrames ??= []);
  if (log.length < FRAME_LOG_CAP) log.push(now);
}

export interface StepProgress {
  readonly progress: number;
  readonly playing: boolean;
  readonly play: () => void;
  readonly scrub: (value: number) => void;
}

export function useStepProgress(durationMs: number, loop: boolean): StepProgress {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    stop();
    setPlaying(true);
    startRef.current = performance.now();
    const tick = (now: number) => {
      logFrame(now);
      const t = (now - startRef.current) / durationMs;
      if (t >= 1) {
        if (loop) {
          startRef.current = now;
          setProgress(0);
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setProgress(1);
          rafRef.current = null;
          setPlaying(false);
        }
        return;
      }
      setProgress(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [durationMs, loop, stop]);

  const scrub = useCallback(
    (value: number) => {
      stop();
      setProgress(Math.min(1, Math.max(0, value)));
    },
    [stop],
  );

  // Cancel the frame loop if the component unmounts mid-animation.
  useEffect(() => stop, [stop]);

  return { progress, playing, play, scrub };
}
