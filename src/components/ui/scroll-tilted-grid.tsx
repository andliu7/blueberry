"use client";

import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
  cubicBezier,
} from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * Scroll-choreographed tiles: content rises from below tipped forward, settles
 * into focus at the middle of the viewport, then tilts back over the top edge
 * as it leaves.
 *
 * Adapted from the editorial image version. That one paints each tile as a
 * `bg-cover` image and crushes it with `brightness(0) contrast(4)` plus a
 * `scaleY(1.8)` stretch and a 20deg skew at the extremes — choices that read
 * well on photographs but would render a text card as an unreadable black
 * parallelogram. Here the focus falloff is blur plus opacity, the skew and
 * stretch are gone, and the tilt and depth are toned down so body text stays
 * legible while it moves.
 */

const easeIntoFocus = cubicBezier(0.22, 1, 0.36, 1);
const easeOutOfFocus = cubicBezier(0, 0, 0.58, 1);
const focusEase: [typeof easeIntoFocus, typeof easeOutOfFocus] = [
  easeIntoFocus,
  easeOutOfFocus,
];

export type Side = "L" | "R";

export type ScrollTiltItemProps = {
  children: ReactNode;
  /** Which way the tile drifts at the extremes. */
  side?: Side;
  perspective?: number;
  /** Peak rotateX at entry and exit, in degrees. */
  maxTilt?: number;
  maxBlur?: number;
  /** Opacity at entry and exit. */
  minOpacity?: number;
  className?: string;
};

export function ScrollTiltItem({
  children,
  side = "L",
  perspective = 900,
  maxTilt = 35,
  maxBlur = 5,
  minOpacity = 0.3,
  className,
}: ScrollTiltItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const reduce = useReducedMotion();
  const sign = side === "L" ? -1 : 1;

  const blur = useTransform(p, [0, 0.5, 1], [maxBlur, 0, maxBlur], { ease: focusEase });
  const opacity = useTransform(p, [0, 0.5, 1], [minOpacity, 1, minOpacity], { ease: focusEase });

  const ty = useTransform(p, [0, 0.5, 1], ["14%", "0%", "-14%"], { ease: focusEase });
  const tz = useTransform(p, [0, 0.5, 1], [180, 0, 180], { ease: focusEase });
  const rx = useTransform(p, [0, 0.5, 1], [maxTilt, 0, -maxTilt], { ease: focusEase });

  // Kept small: a large lateral drift pushes wide cards past the viewport and
  // gives the page a horizontal scrollbar.
  const tx = useTransform(p, [0, 0.5, 1], [`${sign * 6}%`, "0%", `${sign * 6}%`], { ease: focusEase });
  const rot = useTransform(p, [0, 0.5, 1], [-sign * 2, 0, sign * 2], { ease: focusEase });

  const filter = useMotionTemplate`blur(${blur}px)`;

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ perspective }} className={className}>
      <motion.div
        className="will-change-[filter,transform]"
        style={{
          filter,
          opacity,
          x: tx,
          y: ty,
          z: tz,
          rotate: rot,
          rotateX: rx,
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export type ScrollTiltedGridProps = {
  /** Each child becomes one scroll-choreographed tile. */
  children: ReactNode[];
  columns?: 1 | 2;
  className?: string;
} & Omit<ScrollTiltItemProps, "children" | "side" | "className">;

/**
 * Lays children out and alternates which way each one drifts.
 */
export function ScrollTiltedGrid({
  children,
  columns = 1,
  className,
  ...tile
}: ScrollTiltedGridProps) {
  return (
    <div
      className={[
        columns === 2 ? "grid grid-cols-2 gap-10" : "flex flex-col",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children.map((child, i) => (
        <ScrollTiltItem key={i} side={i % 2 === 0 ? "L" : "R"} {...tile}>
          {child}
        </ScrollTiltItem>
      ))}
    </div>
  );
}

export default ScrollTiltedGrid;
