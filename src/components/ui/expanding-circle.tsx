"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A soft circle that opens outward from the middle of the page.
 *
 * Scale and opacity only. Growing a circle by animating width and height would
 * relayout the page on every frame; a transform is composited and costs the
 * main thread nothing, which matters here because the aurora canvas behind it
 * is already drawing.
 *
 * The centring is done with motion's own `x` and `y` rather than Tailwind's
 * `-translate-x-1/2`. Motion writes the whole `transform`, so a translate from
 * a class would be overwritten by the scale and the circle would open from the
 * corner instead of the middle.
 */
export function ExpandingCircle({
  className,
  delay = 0,
  /** Fraction of the viewport the circle reaches when open. */
  size = "min(150vw, 1200px)",
}: {
  className?: string;
  delay?: number;
  size?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      aria-hidden
      initial={reduced ? { opacity: 0.6, scale: 1, x: "-50%", y: "-50%" } : { opacity: 0, scale: 0.35, x: "-50%", y: "-50%" }}
      animate={{ opacity: 0.85, scale: 1, x: "-50%", y: "-50%" }}
      transition={reduced ? { duration: 0 } : { duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: size,
        height: size,
        // The brand ramp's 400 step #9989e2 = rgb(153,137,226), replacing
        // indigo-400 `#818cf8`. The fuchsia and the dark fade are untouched. A
        // ripple is decoration, no floor; the swap is luminance-neutral, so the
        // measured ratios are unchanged at 2.99:1 on white and 5.75:1 on night.
        background:
          "radial-gradient(circle, rgba(153,137,226,0.30) 0%, rgba(217,70,239,0.16) 42%, rgba(23,19,39,0) 70%)",
      }}
      className={cn("pointer-events-none absolute top-1/2 left-1/2 rounded-full", className)}
    />
  );
}

export default ExpandingCircle;
