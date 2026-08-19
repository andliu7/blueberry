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
        // Up and to the right, in a fan. Biased off vertical so they read as
        // drifting away from the berry rather than rising out of its head.
        drift: 18 + Math.random() * 46,
        rotate: Math.random() * 60 - 30,
        scale: 0.85 + Math.random() * 0.5,
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
                x: Math.cos(rad) * 92,
                y: -Math.sin(rad) * 104,
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
              // Starts at the berry's right shoulder rather than its centre.
              className="absolute top-1/2 right-2 text-base select-none"
            >
              💙
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default HeartBurst;
