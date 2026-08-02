"use client";

import * as React from "react";
import { useState, useRef } from "react";
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
  count = 8,
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

  return (
    <AnimatePresence>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "pointer-events-none fixed z-[60] w-1 h-1 rounded-full bg-indigo-500 dark:bg-white",
            className,
          )}
          style={{ left: centerX, top: centerY }}
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{
            scale: [0, 1, 0],
            x: [0, (i % 2 ? 1 : -1) * (Math.random() * 50 + 20)],
            y: [0, -Math.random() * 50 - 20],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
        />
      ))}
    </AnimatePresence>
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
