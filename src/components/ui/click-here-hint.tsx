"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Handwritten "click here!" with a curved arrow pointing at whatever sits next
 * to it. Used to point at the toolbar trigger, which starts collapsed and would
 * otherwise be easy to miss, and at the home mark on a deck page.
 *
 * `direction` is which way the arrow points, which is also which side of the
 * target the hint belongs on. The toolbar trigger sits to the hint's right; the
 * home mark sits to its left, and an arrow curving away from the thing it means
 * is worse than no arrow.
 */
export function ClickHereHint({
  className,
  direction = "right",
}: {
  className?: string;
  direction?: "left" | "right";
}) {
  const reduce = useReducedMotion();
  const left = direction === "left";

  return (
    <motion.span
      className={cn(
        "flex items-center gap-1 select-none pointer-events-none",
        left && "flex-row-reverse",
        className,
      )}
      initial={reduce ? false : { opacity: 0, x: left ? -8 : 8 }}
      animate={reduce ? undefined : { opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      aria-hidden
    >
      <span className="playful-face text-sm md:text-base font-bold text-indigo-500 dark:text-amber-300 whitespace-nowrap">
        click here!
      </span>

      {/* Nudges toward the button so the eye follows it. Mirrored rather than
          redrawn for the left-pointing case, and the nudge mirrors with it. */}
      <motion.svg
        width="34"
        height="22"
        viewBox="0 0 34 22"
        fill="none"
        className={cn("text-indigo-500 dark:text-amber-300 shrink-0", left && "-scale-x-100")}
        animate={reduce ? undefined : { x: left ? [0, -4, 0] : [0, 4, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M1 15C7 4 16 1 27 8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M20 7.5L27.5 8.2L25.5 15"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </motion.svg>
    </motion.span>
  );
}

export default ClickHereHint;
