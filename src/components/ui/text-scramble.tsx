import { type JSX, useEffect, useMemo, useState } from "react";
import { motion, type MotionProps } from "motion/react";

/**
 * Resolves text out of random characters, left to right.
 *
 * Two changes from the supplied component:
 *
 * 1. **`motion.create` is memoised.** Upstream called it in the render body, so
 *    every render produced a brand new component type. React treats that as a
 *    different element, unmounts the old DOM node and mounts a fresh one, which
 *    for a component that re-renders on every animation tick means throwing the
 *    node away dozens of times a second.
 * 2. **The interval is cleaned up on unmount.** Upstream only cleared it when
 *    the animation finished, so navigating away mid-scramble left a timer
 *    calling setState on an unmounted component.
 *
 * It imports from `motion/react`, not `framer-motion`. Same library, current
 * name, already a dependency here.
 */

type TextScrambleProps = {
  children: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
  as?: React.ElementType;
  className?: string;
  trigger?: boolean;
  onScrambleComplete?: () => void;
} & MotionProps;

const defaultChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function TextScramble({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = defaultChars,
  className,
  as: Component = "p",
  trigger = true,
  onScrambleComplete,
  ...props
}: TextScrambleProps) {
  const MotionComponent = useMemo(
    () => motion.create(Component as keyof JSX.IntrinsicElements),
    [Component],
  );

  const text = children;
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (!trigger) return;

    const steps = duration / speed;
    let step = 0;

    // Local to this effect, deliberately not a ref. Sharing one ref slot
    // between runs meant StrictMode's second invocation overwrote the first
    // interval's id, so the first cleanup cleared the wrong timer and left an
    // orphan running. Two intervals then fought over the same text: the word
    // resolved, restarted, and stalled part way.
    const id = setInterval(() => {
      const progress = step / steps;
      let scrambled = "";

      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") {
          scrambled += " ";
          continue;
        }
        scrambled +=
          progress * text.length > i
            ? text[i]
            : characterSet[Math.floor(Math.random() * characterSet.length)];
      }

      setDisplayText(scrambled);
      step++;

      if (step > steps) {
        clearInterval(id);
        setDisplayText(text);
        onScrambleComplete?.();
      }
    }, speed * 1000);

    return () => clearInterval(id);
    // onScrambleComplete is deliberately excluded: an inline arrow prop would
    // otherwise restart the scramble on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, text, duration, speed, characterSet]);

  return (
    <MotionComponent className={className} {...props}>
      {displayText}
    </MotionComponent>
  );
}

export default TextScramble;
