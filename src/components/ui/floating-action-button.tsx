"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedActionClusterProps {
  /** Each child is revealed as its own action. Children keep their own
   *  interactions — the cluster only animates a wrapper around them. */
  children: ReactNode[];
  className?: string;
  /** Start expanded. */
  defaultOpen?: boolean;
  label?: string;
  /**
   * Which way the actions unfold. "left" puts the trigger on the right and the
   * actions emerge to its left, so the motion matches a cluster anchored to the
   * right edge of a toolbar.
   */
  direction?: "right" | "left";
}

/**
 * A trigger that fans its actions out and folds them away again.
 *
 * Adapted from the social-icons floating action button. That version keeps
 * every icon mounted and merely blurs them when closed, so the row occupies
 * full width whether open or shut and the blurred buttons stay clickable. Here
 * the actions genuinely collapse into the trigger, and each one animates in its
 * own wrapper so whatever is passed in keeps its own hover behaviour intact.
 */
export function AnimatedActionCluster({
  children,
  className,
  defaultOpen = true,
  label = "actions",
  direction = "right",
}: AnimatedActionClusterProps) {
  const [active, setActive] = useState(defaultOpen);
  const openingLeft = direction === "left";
  // Actions slide out of the trigger, so they enter from whichever side it sits on.
  const enterX = openingLeft ? 18 : -18;

  const trigger = (
    <motion.button
        type="button"
        // `layout` animates the trigger's own travel: with the cluster anchored
        // to the right edge, opening it grows the group leftward and carries the
        // trigger along rather than teleporting it.
        layout
        onClick={() => setActive((a) => !a)}
        aria-expanded={active}
        aria-label={active ? `Hide ${label}` : `Show ${label}`}
        title={active ? `Hide ${label}` : `Show ${label}`}
        className={cn(
          "h-9 w-9 shrink-0 rounded-full flex items-center justify-center cursor-pointer",
          "bg-slate-900 text-white dark:bg-stone-100 dark:text-stone-900",
          "shadow-sm outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
          "focus-visible:ring-offset-[#f6f4ef] dark:focus-visible:ring-offset-[#0c0a09]",
        )}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        animate={{ rotate: active ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Plus size={18} strokeWidth={3} />
      </motion.button>
  );

  const actions = (
    <AnimatePresence initial={false}>
      {active &&
        children.map((child, i) => (
          <motion.div
            key={i}
            className="shrink-0"
            initial={{ opacity: 0, scale: 0.6, x: enterX, filter: "blur(4px)" }}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              filter: "blur(0px)",
              // Nearest the trigger leads, so the row unfurls outward.
              transition: { delay: (openingLeft ? children.length - 1 - i : i) * 0.045, duration: 0.28 },
            }}
            exit={{
              opacity: 0,
              scale: 0.6,
              x: enterX,
              filter: "blur(4px)",
              transition: { duration: 0.16 },
            }}
          >
            {child}
          </motion.div>
        ))}
    </AnimatePresence>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        // Once open the cluster claims its own line. Sharing a row leaves too
        // little slack, and hovering a button widens it into a pill — enough to
        // wrap the row and make the buttons jump to the next line mid-hover.
        active && "basis-full justify-end flex-nowrap",
        className,
      )}
    >
      {openingLeft ? (
        <>
          {actions}
          {trigger}
        </>
      ) : (
        <>
          {trigger}
          {actions}
        </>
      )}
    </div>
  );
}

export default AnimatedActionCluster;
