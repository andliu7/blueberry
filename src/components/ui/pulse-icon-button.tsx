"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A circular icon with concentric rings pulsing outward, and a spin on hover.
 *
 * Two deliberate departures from the brief:
 *
 * 1. **`interactive` can turn the button into a `<span>`.** The brief asks for a
 *    real `<button>`, and that is the default, because a div you can click is
 *    invisible to a keyboard. But this is also used as the avatar on the about
 *    card, where it is a picture and nothing more, and a button that announces
 *    itself to a screen reader and then does nothing when pressed is worse than
 *    no button at all.
 * 2. **The surface is overridable.** The brief's near-black gradient is right on
 *    a dark page and a black hole in the middle of a white card, so the shell
 *    can be restyled through `className` while keeping the rings and the motion.
 *
 * Reduced motion drops the ping, the pulse and the rotation. What is left is the
 * icon and its rings, held still.
 *
 * `animateOn` decides what sets the motion off. Rings pulsing on a loop read as
 * a notification badge asking to be dealt with; on the about card they are meant
 * to answer the pointer, so that usage passes `"group-hover"` and nothing moves
 * until the card is hovered.
 *
 * Standalone, with no shadcn Card dependency. Used with a lucide icon it is
 * simply `<PulseIconButton icon={<Rocket />} label="Launch" onClick={...} />`.
 */

export interface PulseIconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  /** Accessible name. Required in practice for an icon-only control. */
  label?: string;
  /** Rotate on hover. */
  spin?: boolean;
  /**
   * What sets the motion off.
   *
   * `"always"` is the brief's behaviour: the rings pulse on a loop and the shell
   * spins when you point at it. `"group-hover"` holds everything still until an
   * ancestor marked `group/card` is hovered, which is what the about card wants,
   * since a ring pulsing away on its own reads as a notification badge rather
   * than as something answering you.
   *
   * The class names have to be written out in full for Tailwind to find them, so
   * `"group-hover"` is tied to the `group/card` name specifically rather than
   * taking one as a string.
   */
  animateOn?: "always" | "group-hover" | "never";
  /**
   * Render as a real button. Set false for decoration, which drops the element
   * from the accessibility tree entirely rather than lying about it.
   */
  interactive?: boolean;
  /** Restyles the shell. The rings and the motion are unaffected. */
  className?: string;
  /** Restyles the rings, e.g. to tint them on a pale background. */
  ringClassName?: string;
}

const PAD = { sm: "p-4", md: "p-6", lg: "p-8" } as const;
const ICON = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9" } as const;

export function PulseIconButton({
  icon,
  onClick,
  size = "md",
  label,
  spin = true,
  animateOn = "always",
  interactive = true,
  className,
  ringClassName,
}: PulseIconButtonProps) {
  const reduce = useReducedMotion();
  const animate = !reduce && animateOn !== "never";
  const onGroup = animate && animateOn === "group-hover";
  const onSelf = animate && animateOn === "always";

  const shell = cn(
    "relative rounded-full border border-white/20 shadow-2xl backdrop-blur-lg",
    "bg-gradient-to-br from-black/80 to-black/60",
    "transition-transform duration-500 ease-out",
    PAD[size],
    spin && onSelf && "hover:rotate-12 hover:scale-110",
    spin && onGroup && "group-hover/card:rotate-12 group-hover/card:scale-110",
    interactive &&
      "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
    className,
  );

  const inner = (
    <span
      className={cn(
        "grid place-items-center transition-transform duration-700 ease-out",
        ICON[size],
        // Counter-rotates, so the icon ends up nearly upright while the shell
        // around it turns.
        spin && onSelf && "group-hover/pulse:-rotate-180",
        spin && onGroup && "group-hover/card:-rotate-180",
        "[&>svg]:h-full [&>svg]:w-full",
      )}
    >
      {icon}
    </span>
  );

  return (
    <div className="relative inline-flex">
      {/* Rings sit behind and never take a click, so they cannot swallow the
          button they are drawing attention to. Held at zero opacity until they
          are wanted, so a ring that only animates on hover is not left sitting
          there as a static outline in the meantime. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full border-2 border-white/20",
          onSelf && "animate-ping",
          onGroup && "opacity-0 group-hover/card:animate-ping group-hover/card:opacity-100",
          ringClassName,
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full border border-white/10",
          onSelf && "animate-pulse",
          onGroup && "opacity-0 group-hover/card:animate-pulse group-hover/card:opacity-100",
          ringClassName,
        )}
      />

      {interactive ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={cn("group/pulse", shell)}
        >
          {inner}
        </button>
      ) : (
        <span aria-hidden className={cn("group/pulse inline-grid", shell)}>
          {inner}
        </span>
      )}
    </div>
  );
}

export default PulseIconButton;
