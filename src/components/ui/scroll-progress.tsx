import { motion, useScroll, useSpring, type SpringOptions } from "motion/react";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";

/**
 * A bar that fills as its container scrolls.
 *
 * Imported from `motion/react`, not `framer-motion`. They are the same library —
 * `motion` is the current name — and this project already depends on it, so the
 * `npm install framer-motion` the source called for would have installed a
 * second copy of the same code under its old name.
 */
export function ScrollProgress({
  className,
  springOptions,
  containerRef,
}: {
  className?: string;
  springOptions?: SpringOptions;
  containerRef?: RefObject<HTMLElement | null>;
}) {
  const { scrollYProgress } = useScroll({
    container: containerRef as RefObject<HTMLElement>,
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 50,
    restDelta: 0.001,
    ...springOptions,
  });

  return (
    <motion.div
      aria-hidden
      className={cn("inset-x-0 top-0 h-1 origin-left", className)}
      style={{ scaleX }}
    />
  );
}

export default ScrollProgress;
