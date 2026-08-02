"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { SuccessParticles, useParticleBurst } from "@/components/ui/particle-button";

export interface AnimatedActionClusterProps {
  /** Each child is revealed as its own action. Children keep their own
   *  interactions — the cluster only animates a wrapper around them. */
  children: ReactNode[];
  className?: string;
  /** Start expanded. Ignored when `open` is supplied. */
  defaultOpen?: boolean;
  /** Supply with onOpenChange to let a parent lay out around the open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  open,
  onOpenChange,
  label = "actions",
  direction = "right",
}: AnimatedActionClusterProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const active = open ?? uncontrolled;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { bursting, burst } = useParticleBurst(700);
  const { bursting: sparkling, burst: sparkle } = useParticleBurst(1000);
  const reduce = useReducedMotion();
  // The trigger twinkles periodically to advertise itself, and retires the
  // moment it has been used once. Nagging past the first click is just noise.
  const [everClicked, setEverClicked] = useState(false);

  useEffect(() => {
    if (everClicked || reduce) return;
    const id = setInterval(sparkle, 2800);
    return () => clearInterval(id);
  }, [everClicked, reduce, sparkle]);
  const setActive = (next: boolean) => {
    setUncontrolled(next);
    onOpenChange?.(next);
  };
  const openingLeft = direction === "left";
  // Actions slide out of the trigger, so they enter from whichever side it sits on.
  const enterX = openingLeft ? 18 : -18;

  const trigger = (
    <MagneticButton distance={0.5} className="shrink-0">
      {bursting && <SuccessParticles anchorRef={triggerRef} />}
      {/* Gentler than the click burst: fewer, smaller, shorter throw. */}
      {sparkling && !bursting && (
        <SuccessParticles
          anchorRef={triggerRef}
          count={5}
          minRadius={14}
          spread={14}
          duration={1}
          sizeClass="w-1.5 h-1.5"
        />
      )}
      <motion.button
        ref={triggerRef}
        type="button"
        // Deliberately no `layout` prop. The trigger is meant to stay pinned at
        // the right edge, but opening the toolbar moves it to a different row,
        // and layout animation tweened it across that gap: it visibly shot left
        // before settling back at the right.
        onClick={() => {
          setEverClicked(true);
          burst();
          setActive(!active);
        }}
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
    </MagneticButton>
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
        // Hovering a button widens it into a pill; without this the row can wrap
        // mid-hover and the buttons jump to the next line. The parent is
        // responsible for giving an open cluster a line with room on it.
        active && "flex-nowrap",
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
