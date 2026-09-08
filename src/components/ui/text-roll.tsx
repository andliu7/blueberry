import { motion } from "motion/react";

import { cn } from "@/lib/utils";

/** Seconds between one character starting and the next. */
const STAGGER = 0.035;

/**
 * Text that rolls over to a second copy of itself, one character at a time.
 *
 * Two identical rows sit on top of each other, the second absolutely positioned
 * over the first and parked a full line below. On hover both travel up by one
 * line: the first leaves, the second arrives, and because each character carries
 * its own delay the word reads as rolling rather than flipping.
 *
 * **`driven` is why this is not a straight copy.** The version this came from
 * always put `whileHover` on its own wrapper, which is right for the nav list it
 * was demonstrated in, where the text IS the target. Inside a button it is
 * wrong: the label is smaller than the control, so hovering the padding, which
 * is most of the button, would leave the text sitting still. With `driven` the
 * component states the variants and animates nothing itself, and the nearest
 * motion ancestor's hover drives it, so the whole control is the target.
 *
 * `center` staggers outward from the middle instead of left to right. Better on
 * a short centred label, where a left-to-right sweep reads as a lag.
 */
export function TextRoll({
  children,
  className,
  center = false,
  driven = false,
}: {
  children: string;
  className?: string;
  /** Stagger outward from the middle rather than left to right. */
  center?: boolean;
  /** Let a motion ancestor's hover drive it, instead of hovering this text. */
  driven?: boolean;
}) {
  const characters = children.split("");
  const delayOf = (i: number) =>
    center ? STAGGER * Math.abs(i - (characters.length - 1) / 2) : STAGGER * i;

  const row = (from: number | string, to: number | string) =>
    characters.map((character, i) => (
      <motion.span
        key={i}
        variants={{ initial: { y: from }, hovered: { y: to } }}
        transition={{ ease: "easeInOut", delay: delayOf(i) }}
        className="inline-block"
      >
        {/* A space collapses to nothing once it is its own inline-block. */}
        {character === " " ? "\u00A0" : character}
      </motion.span>
    ));

  return (
    <motion.span
      // Owning the gesture when standalone, stating only the vocabulary when
      // driven, so the ancestor's hover is the one that propagates.
      initial="initial"
      {...(driven ? {} : { whileHover: "hovered" })}
      className={cn("relative block overflow-hidden", className)}
      style={{ lineHeight: 0.85 }}
      // The rolling copy is decoration; the word is announced once.
      aria-label={children}
    >
      <span aria-hidden>{row(0, "-100%")}</span>
      <span aria-hidden className="absolute inset-0">
        {row("100%", 0)}
      </span>
    </motion.span>
  );
}

export default TextRoll;
