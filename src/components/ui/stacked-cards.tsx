"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Sticky stacking cards: each card pins at the top, shrinks slightly, and the
 * next one rides up over it, leaving a visible stack edge behind.
 *
 * Adapted from the sticky-card references. Two deliberate departures:
 *
 * - **No Lenis.** Both references wrap themselves in `<ReactLenis root>`, which
 *   replaces the page's native scrolling globally. This app already runs three
 *   independent scroll-driven systems (the sticky hero, the scroll-linked card
 *   choreography, and the sticky toolbar); a scroll hijacker underneath them is
 *   asking for trouble. Native scroll plus `useScroll` is what the rest of the
 *   app already uses.
 * - **Wraps arbitrary children, not images.** The references render fixed-size
 *   `<img>` tiles. Study cards vary in height and carry buttons, ratings and
 *   typeset maths, so nothing here constrains height or replaces the child.
 */

export type StackedCardsProps = {
  children: ReactNode[];
  /**
   * Scroll height allotted per card. The references stack 4-5 cards and can
   * afford a screenful each; 44 cards at that rate is a 27-viewport page, so
   * this is deliberately tight.
   */
  vhPerCard?: number;
  /** Pixels each card is offset down from the one before, showing the stack edge. */
  peek?: number;
  /** Smallest a card may shrink to, so late cards stay readable. */
  minScale?: number;
  /** Alternate a slight tilt per card, the fanned flavour of the reference. */
  rotate?: boolean;
  className?: string;
};

function StackedCard({
  index,
  count,
  progress,
  peek,
  minScale,
  rotate,
  children,
}: {
  index: number;
  count: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  peek: number;
  minScale: number;
  rotate: boolean;
  children: ReactNode;
}) {
  // Each card starts shrinking when the stack reaches it and finishes at the end.
  const start = count > 1 ? index / count : 0;
  // Cards deeper in the stack end up smaller, floored so they stay legible.
  const targetScale = Math.max(minScale, 1 - (count - index - 1) * 0.015);
  const scale = useTransform(progress, [start, 1], [1, targetScale]);
  const tilt = rotate ? (index % 2 === 0 ? -1.2 : 1.2) : 0;

  return (
    <div
      className="sticky flex justify-center"
      style={{ top: `calc(6rem + ${index * peek}px)` }}
    >
      <motion.div style={{ scale, rotate: tilt }} className="w-full origin-top">
        {children}
      </motion.div>
    </div>
  );
}

export function StackedCards({
  children,
  vhPerCard = 18,
  peek = 8,
  minScale = 0.86,
  rotate = false,
  className,
}: StackedCardsProps) {
  const container = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  // Reduced motion gets a plain column; the stack is purely presentational.
  if (reduce) {
    return <div className={cn("flex flex-col gap-4", className)}>{children}</div>;
  }

  return (
    <div
      ref={container}
      className={cn("relative", className)}
      // The stack needs real scroll distance to pin against, one screenful-ish
      // per card, plus a tail so the last card can settle.
      style={{ minHeight: `${children.length * vhPerCard + 40}vh` }}
    >
      {children.map((child, i) => (
        <StackedCard
          key={i}
          index={i}
          count={children.length}
          progress={scrollYProgress}
          peek={peek}
          minScale={minScale}
          rotate={rotate}
        >
          {child}
        </StackedCard>
      ))}
    </div>
  );
}

export default StackedCards;
