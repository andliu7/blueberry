"use client";

import { useCallback, useRef, useState } from "react";
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
  animationConfig?: AnimationOptions;
  staggerTiming?: number;
  staggerOrigin?: "first" | "last" | "center" | number;
  className?: string;
  onClick?: () => void;
}

const BoldOnHover = ({
  text,
  initialStyle = "'wght' 400, 'slnt' 0",
  hoverStyle = "'wght' 900, 'slnt' -10",
  initialWeight = 700,
  hoverWeight = 900,
  animationConfig = { type: "spring", duration: 0.7 },
  staggerTiming = 0.03,
  staggerOrigin = "first",
  className,
  onClick,
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
      { fontVariationSettings: hoverStyle, fontWeight: hoverWeight },
      staggered(animationConfig),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, animate, hoverStyle, hoverWeight, animationConfig]);

  const handleDeactivate = useCallback(() => {
    setIsActive(false);
    animate(
      ".char",
      { fontVariationSettings: initialStyle, fontWeight: initialWeight },
      staggered(animationConfig),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, initialStyle, initialWeight, animationConfig]);

  const throttledActivate = useThrottledCallback(handleActivate, 100);
  const throttledDeactivate = useThrottledCallback(handleDeactivate, 100);

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
          aria-hidden="true"
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
};

export default BoldOnHover;
