"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Particle burst from the centre of an element.
 *
 * Exported on its own so an existing button can emit particles without being
 * replaced — the stock version only worked as a wrapper around shadcn's Button,
 * which this project does not have.
 */
export function SuccessParticles({
  anchorRef,
  count = 14,
  className,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  count?: number;
  className?: string;
}) {
  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  // Rendered through a portal on purpose. These are positioned with viewport
  // coordinates, but any transformed ancestor (the magnetic wrapper, a tilt
  // card) becomes the containing block for position:fixed children, which would
  // throw the burst far off screen. document.body has no such ancestor.
  return createPortal(
    <AnimatePresence>
      {[...Array(count)].map((_, i) => {
        // Fire evenly in every direction. The stock version only threw
        // particles upward and alternated left/right, which on a small round
        // button read as a couple of stray specks rather than a burst.
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const radius = 34 + Math.random() * 30;
        return (
          <motion.div
            key={i}
            className={cn(
              "pointer-events-none fixed z-[60] w-2 h-2 rounded-full",
              "bg-indigo-500 dark:bg-amber-300 shadow-[0_0_8px_currentColor]",
              className,
            )}
            style={{ left: centerX - 4, top: centerY - 4 }}
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{
              scale: [0, 1.15, 0],
              x: [0, Math.cos(angle) * radius],
              y: [0, Math.sin(angle) * radius],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.75, delay: i * 0.012, ease: "easeOut" }}
          />
        );
      })}
    </AnimatePresence>,
    document.body,
  );
}

/** Drives the show/hide window for a burst. */
export function useParticleBurst(duration = 700) {
  const [bursting, setBursting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const burst = () => {
    if (timer.current) clearTimeout(timer.current);
    setBursting(true);
    timer.current = setTimeout(() => setBursting(false), duration);
  };

  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { bursting, burst };
}

/** Standalone button that emits particles when clicked. */
export function ParticleButton({
  children,
  onClick,
  successDuration = 700,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { successDuration?: number }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { bursting, burst } = useParticleBurst(successDuration);

  return (
    <>
      {bursting && <SuccessParticles anchorRef={buttonRef} />}
      <button
        ref={buttonRef}
        onClick={(e) => {
          burst();
          // The stock version swallowed the caller's onClick entirely, so the
          // button looked interactive but did nothing.
          onClick?.(e);
        }}
        className={cn("relative transition-transform duration-100", bursting && "scale-95", className)}
        {...props}
      >
        {children}
      </button>
    </>
  );
}

export default ParticleButton;
