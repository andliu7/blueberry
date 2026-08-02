"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";

const SPRING_CONFIG = { damping: 100, stiffness: 400 };

type MagneticButtonType = {
  children: React.ReactNode;
  /** How strongly the element chases the cursor, 0..1. */
  distance?: number;
  className?: string;
};

/**
 * Pulls its child toward the cursor while hovered.
 *
 * Uses motion/react rather than framer-motion: framer is only present here as a
 * transitive dependency of motion, so importing it directly would work by
 * hoisting and break on a clean install.
 */
function MagneticButton({ children, distance = 0.6, className }: MagneticButtonType) {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, SPRING_CONFIG);
  const springY = useSpring(y, SPRING_CONFIG);

  useEffect(() => {
    // Only listen while hovered. The original bound a document-level mousemove
    // for the element's whole lifetime and recomputed on every pointer move
    // even when idle.
    if (!isHovered || reduce) {
      x.set(0);
      y.set(0);
      return;
    }

    const calculateDistance = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * distance);
      y.set((e.clientY - centerY) * distance);
    };

    document.addEventListener("mousemove", calculateDistance);
    return () => document.removeEventListener("mousemove", calculateDistance);
  }, [isHovered, distance, reduce, x, y]);

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
}

export { MagneticButton };
export default MagneticButton;
