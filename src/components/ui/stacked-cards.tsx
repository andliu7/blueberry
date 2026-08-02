"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A rolling stack: every card pins at the same line near the top of the
 * viewport, so the newest one always sits in the same place. As the next card
 * rides up over it, the ones already stacked recede a few pixels each, and the
 * one that has fallen `depth` places back fades out. The visible stack is
 * therefore always about `depth` cards deep, wherever you are in the list.
 *
 * Adapted from the sticky-card references, with three deliberate departures:
 *
 * - **No Lenis.** Both references wrap themselves in `<ReactLenis root>`, which
 *   replaces the page's native scrolling globally. This app already runs three
 *   independent scroll-driven systems (the sticky hero, the scroll-linked card
 *   choreography, and the sticky toolbar); a scroll hijacker underneath them is
 *   asking for trouble.
 * - **Wraps arbitrary children, not images.** The references render fixed-size
 *   `<img>` tiles. Study cards vary in height and carry buttons, ratings and
 *   typeset maths, so nothing here constrains height or replaces the child.
 * - **Pin points are measured, not assumed.** The references give every card an
 *   identical slot and divide scroll progress evenly. That only holds while the
 *   cards are the same height; expand one here and the arithmetic drifts out of
 *   step with the layout, which is what made the stack gather five cards and
 *   then dump all five at once.
 */

export type StackedCardsProps = {
  children: ReactNode[];
  /**
   * Scroll distance allotted to each card, in vh. Cards taller than this take
   * proportionally longer, since pin points are measured rather than assumed.
   */
  vhPerCard?: number;
  /** Pixels each card recedes for every card stacked on top of it. */
  peek?: number;
  /** How many cards stay on screen behind the newest before falling away. */
  depth?: number;
  /** Where the stack pins, in pixels from the top of the viewport. */
  anchor?: number;
  /**
   * Scroll distance after the last card arrives, in vh. Without it the last
   * card would unpin the instant it pinned, since a sticky element cannot
   * outlast its container.
   */
  tailVh?: number;
  className?: string;
};

function StackedCard({
  index,
  front,
  peek,
  depth,
  anchor,
  minHeight,
  markerRef,
  children,
}: {
  index: number;
  front: MotionValue<number>;
  peek: number;
  depth: number;
  anchor: number;
  minHeight: string;
  markerRef: (node: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  // How many cards have arrived on top of this one, in card units.
  const age = useTransform(front, (f) => Math.min(depth, Math.max(0, f - index)));
  const y = useTransform(age, (a) => -a * peek);
  const scale = useTransform(age, (a) => 1 - a * 0.03);
  // Only the card falling out the back of the stack fades; the rest stay solid,
  // so the stack reads as a fixed-depth deck rather than a slow dissolve.
  const opacity = useTransform(age, (a) => Math.min(1, depth - a));
  // A retired card is invisible but still stacked here, and its exposed sliver
  // would otherwise keep swallowing clicks meant for the live card.
  const pointerEvents = useTransform(age, (a) => (a > depth - 0.5 ? "none" : "auto"));

  return (
    <>
      {/* Zero-height sibling in normal flow. The wrapper below is sticky, so
          once it pins its own rect reports where it is parked rather than where
          it belongs; this marker never moves and is what gets measured. */}
      <div ref={markerRef} aria-hidden className="h-0" />
      <div
        className="sticky flex items-start justify-center"
        style={{ top: anchor, minHeight }}
      >
        <motion.div
          style={{ y, scale, opacity, pointerEvents }}
          className="w-full origin-top"
        >
          {children}
        </motion.div>
      </div>
    </>
  );
}

export function StackedCards({
  children,
  vhPerCard = 20,
  peek = 10,
  depth = 5,
  anchor = 96,
  tailVh = 24,
  className,
}: StackedCardsProps) {
  const container = useRef<HTMLDivElement>(null);
  const markers = useRef<(HTMLDivElement | null)[]>([]);
  /** Document-space y of each card's pin point, plus the container's bottom. */
  const pins = useRef<number[]>([]);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  const measure = useCallback(() => {
    const el = container.current;
    if (!el) return;
    const base = window.scrollY;
    const next = markers.current.map((m) => (m ? m.getBoundingClientRect().top + base : 0));
    next.push(el.getBoundingClientRect().bottom + base);
    pins.current = next;
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    // Expanding a card grows the stack, and anything above it changing height
    // moves every pin point below.
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    if (container.current) ro.observe(container.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [measure, children.length]);

  /**
   * Continuous index of the card arriving at the pin line: 3.4 means card 3 is
   * pinned and card 4 is 40% of the way up over it. Every card derives its own
   * depth in the stack by subtracting its index from this one value.
   */
  const front = useTransform(scrollY, (y) => {
    const p = pins.current;
    if (p.length < 2) return 0;
    const line = y + anchor;
    if (line <= p[0]) return 0;
    // Pin points are sorted, so the enclosing pair is a binary search away.
    let lo = 0;
    let hi = p.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (p[mid] <= line) lo = mid;
      else hi = mid;
    }
    const span = p[lo + 1] - p[lo];
    return lo + (span > 0 ? (line - p[lo]) / span : 0);
  });

  // Reduced motion gets a plain column; the stack is purely presentational.
  if (reduce) {
    return <div className={cn("flex flex-col gap-4", className)}>{children}</div>;
  }

  return (
    <div ref={container} className={cn("relative", className)}>
      {children.map((child, i) => (
        <StackedCard
          key={i}
          index={i}
          front={front}
          peek={peek}
          depth={depth}
          anchor={anchor}
          minHeight={`${vhPerCard}vh`}
          markerRef={(node) => {
            markers.current[i] = node;
          }}
        >
          {child}
        </StackedCard>
      ))}
      {/* Holds the finished stack still for a beat, then lets the whole deck
          unpin and scroll away together into whatever follows. */}
      <div aria-hidden style={{ height: `${tailVh}vh` }} />
    </div>
  );
}

export default StackedCards;
