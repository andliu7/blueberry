"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, stagger, useAnimate, type AnimationOptions } from "motion/react";

function useThrottledCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: A) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  );
}

interface AnimatedTextProps {
  text: string;
  /** font-variation-settings, applied when the family is a variable font. */
  initialStyle?: string;
  hoverStyle?: string;
  /**
   * Numeric weights animated alongside the variation settings. System font
   * stacks ignore `font-variation-settings` entirely, so without these the
   * effect would be invisible on anything but a variable font.
   */
  initialWeight?: number;
  hoverWeight?: number;
  /**
   * Per-character pop. Weight alone is invisible on a static font like a system
   * serif, which only ships regular and bold — 900 then renders identically to
   * 700 and the whole effect disappears. Scale and lift always read.
   */
  hoverScale?: number;
  hoverLift?: number;
  animationConfig?: AnimationOptions;
  staggerTiming?: number;
  staggerOrigin?: "first" | "last" | "center" | number;
  className?: string;
  onClick?: () => void;
  /**
   * Plays the pop once without being hovered, then hands back to hover.
   *
   * The hub's heading arrives on its own after the opening, with no cursor
   * anywhere near it, so it needs a way to show what it does before anyone
   * thinks to point at it.
   */
  autoPlay?: boolean;
  /** Wait before the automatic pop starts. */
  autoPlayDelay?: number;
  /** How long the letters stay up before settling back. */
  autoPlayHold?: number;
}

const BoldOnHover = ({
  text,
  initialStyle = "'wght' 400, 'slnt' 0",
  hoverStyle = "'wght' 900, 'slnt' -10",
  initialWeight = 700,
  hoverWeight = 900,
  hoverScale = 1.22,
  hoverLift = -4,
  animationConfig = { type: "spring", duration: 0.7 },
  staggerTiming = 0.03,
  staggerOrigin = "first",
  className,
  onClick,
  autoPlay = false,
  autoPlayDelay = 250,
  autoPlayHold = 700,
}: AnimatedTextProps) => {
  const [animationScope, animate] = useAnimate();
  const [isActive, setIsActive] = useState(false);

  const staggered = (base: AnimationOptions): AnimationOptions => ({
    ...base,
    delay: stagger(staggerTiming, { from: staggerOrigin }),
  });

  const handleActivate = useCallback(() => {
    if (isActive) return;
    setIsActive(true);
    animate(
      ".char",
      {
        fontVariationSettings: hoverStyle,
        fontWeight: hoverWeight,
        scale: hoverScale,
        y: hoverLift,
      },
      staggered(animationConfig),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, animate, hoverStyle, hoverWeight, hoverScale, hoverLift, animationConfig]);

  const handleDeactivate = useCallback(() => {
    setIsActive(false);
    animate(
      ".char",
      {
        fontVariationSettings: initialStyle,
        fontWeight: initialWeight,
        scale: 1,
        y: 0,
      },
      staggered(animationConfig),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, initialStyle, initialWeight, animationConfig]);

  const throttledActivate = useThrottledCallback(handleActivate, 100);
  const throttledDeactivate = useThrottledCallback(handleDeactivate, 100);

  /**
   * Read through refs on purpose. `animationConfig` defaults to an object
   * literal, so both handlers get a new identity on every render; depending on
   * them directly would re-run this effect each time and pop the letters over
   * and over.
   */
  const activateRef = useRef(handleActivate);
  const deactivateRef = useRef(handleDeactivate);
  activateRef.current = handleActivate;
  deactivateRef.current = handleDeactivate;

  useEffect(() => {
    if (!autoPlay) return;
    const up = setTimeout(() => activateRef.current(), autoPlayDelay);
    const down = setTimeout(() => deactivateRef.current(), autoPlayDelay + autoPlayHold);
    return () => {
      clearTimeout(up);
      clearTimeout(down);
    };
  }, [autoPlay, autoPlayDelay, autoPlayHold]);

  return (
    <motion.span
      className={className}
      onHoverStart={throttledActivate}
      onHoverEnd={throttledDeactivate}
      onClick={onClick}
      ref={animationScope}
    >
      <span className="sr-only">{text}</span>

      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          className="inline-block whitespace-pre char"
          style={{ transformOrigin: "bottom center" }}
          aria-hidden="true"
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
};

export default BoldOnHover;
