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
  /** How many cards stay visible behind the current one before retiring. */
  depth?: number;
  /** Alternate a slight tilt per card, the fanned flavour of the reference. */
  rotate?: boolean;
  className?: string;
};

function StackedCard({
  index,
  count,
  progress,
  peek,
  depth,
  rotate,
  children,
}: {
  index: number;
  count: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  peek: number;
  depth: number;
  rotate: boolean;
  children: ReactNode;
}) {
  const span = count > 1 ? 1 / count : 1;
  const start = index * span;
  // Once `depth` more cards have stacked on top, this one has done its job.
  const retireAt = Math.min(1, start + span * depth);

  // Shrink and fade out over its retirement window rather than piling up
  // forever, which pushed the live card further down the screen with every
  // card passed.
  const scale = useTransform(progress, [start, retireAt], [1, 0.9]);
  const opacity = useTransform(progress, [start, retireAt], [1, 0]);
  const tilt = rotate ? (index % 2 === 0 ? -1.2 : 1.2) : 0;

  return (
    <div
      className="sticky flex justify-center"
      // Offsets cycle within the depth window, so the visible stack edge stays
      // a few pixels deep instead of marching down the page.
      style={{ top: `calc(6rem + ${(index % depth) * peek}px)` }}
    >
      <motion.div style={{ scale, opacity, rotate: tilt }} className="w-full origin-top">
        {children}
      </motion.div>
    </div>
  );
}

export function StackedCards({
  children,
  vhPerCard = 18,
  peek = 8,
  depth = 5,
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
      // Scroll distance for the stack to pin against. The tail is deliberately
      // short: a long one leaves empty space below the last card that you have
      // to scroll back up through, which felt like getting caught at the bottom.
      style={{ minHeight: `${children.length * vhPerCard + 10}vh` }}
    >
      {children.map((child, i) => (
        <StackedCard
          key={i}
          index={i}
          count={children.length}
          progress={scrollYProgress}
          peek={peek}
          depth={depth}
          rotate={rotate}
        >
          {child}
        </StackedCard>
      ))}
    </div>
  );
}

export default StackedCards;
