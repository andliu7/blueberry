"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Little hearts drifting off the berry while you hover it.
 *
 * Adapted from the `Reaction` component rather than pasted. That one is a
 * button that emits a symbol on click, and its `FlyingSymbol` is the piece
 * worth keeping: a motion div that animates outward, rotates a random amount
 * and fades. What does not carry over is the button: this sits over a WebGL
 * canvas, fires on hover rather than click, and has to keep emitting for as
 * long as the pointer stays rather than once per press.
 *
 * `pointer-events-none` throughout, because the canvas underneath owns the
 * pointer. A heart that stole a mouseover would end the hover that is spawning
 * it, and the effect would flicker itself out of existence.
 */

/** How often a new heart appears while hovering. */
const EMIT_MS = 260;

/** How long one lives. Matches the motion transition below. */
const LIFE_MS = 1150;

interface Heart {
  id: number;
  /** Degrees, so each one leaves on its own line. */
  drift: number;
  rotate: number;
  scale: number;
  delay: number;
}

let nextId = 0;

export function HeartBurst({ active }: { active: boolean }) {
  const [hearts, setHearts] = useState<Heart[]>([]);
  const reduced = useReducedMotion();
  const timer = useRef<number | undefined>(undefined);

  const spawn = useCallback(() => {
    const id = nextId++;
    setHearts((prev) => [
      ...prev,
      {
        id,
        // A steeper fan than before: mostly upward with a lean to the right,
        // so the hearts rise off the berry's shoulder rather than sliding
        // sideways out of his face.
        drift: 48 + Math.random() * 44,
        rotate: Math.random() * 60 - 30,
        scale: 1 + Math.random() * 0.55,
        delay: Math.random() * 0.12,
      },
    ]);
    // Reaped on a timer rather than by an exit callback, so a hover that ends
    // mid-flight still cleans up and the array cannot grow without bound.
    window.setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, LIFE_MS + 200);
  }, []);

  useEffect(() => {
    if (!active || reduced) return;
    spawn();
    timer.current = window.setInterval(spawn, EMIT_MS);
    return () => window.clearInterval(timer.current);
  }, [active, reduced, spawn]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
    >
      <AnimatePresence>
        {hearts.map((h) => {
          const rad = (h.drift * Math.PI) / 180;
          return (
            <motion.span
              key={h.id}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4, rotate: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                // Polar, so drift angle actually sets the direction rather than
                // x and y being picked independently and fighting each other.
                // Further than before: a bigger heart on a short leash reads
                // as stuck to the berry rather than as leaving it.
                x: Math.cos(rad) * 100,
                y: -Math.sin(rad) * 140,
                scale: h.scale,
                rotate: h.rotate,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: LIFE_MS / 1000,
                delay: h.delay,
                ease: "easeOut",
                opacity: { times: [0, 0.15, 0.6, 1], duration: LIFE_MS / 1000 },
              }}
              // From the berry's top-right, so the fan clears his head instead
              // of crossing his face. Red and larger, on request — the blue
              // ones read as bubbles.
              className="absolute top-[16%] right-[8%] text-2xl select-none"
            >
              ❤️
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default HeartBurst;
