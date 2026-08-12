import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A number that changes by moving rather than by being replaced.
 *
 * Adapted from the supplied `animate-digits`, with four changes:
 *
 * - No `"use client"`. That directive is a Next.js server-components marker;
 *   this is a Vite SPA where every component is already a client component, and
 *   leaving it in would be cargo.
 * - **Blur is off by default** (`enterBlur = 0`), as asked. The prop survives so
 *   it can be turned back on, but a 52px blur on a clock you are reading to
 *   check the time is working against the one thing the clock is for.
 * - Reduced motion is honoured: the digit is swapped without animating.
 * - Each cell is width-locked with `ch` units so the clock does not jitter as
 *   digits change. `tabular-nums` equalises glyph widths in the font, but the
 *   grid cell here is sized by its content, and an exiting `1` overlapping an
 *   entering `8` briefly made the cell the width of the wider of the two.
 *
 * The mechanic is worth understanding: each digit owns two springs' worth of
 * state, and on a change it *jumps* the spring (position and velocity reset
 * instantly) to an offset, then releases it to zero. The outgoing digit is
 * pushed onto a short exit queue and animates away independently, which is what
 * lets a fast change overlap rather than cutting the previous one off.
 */

interface AnimateDigitsProps {
  value: string;
  gap?: number;
  className?: string;
  digitClassName?: string;
  enterStiffness?: number;
  enterDamping?: number;
  exitStiffness?: number;
  exitDamping?: number;
  /** `dynamic` sends the digit up when counting up and down when counting down. */
  direction?: "dynamic" | "up" | "down";
  enterY?: number;
  enterBlur?: number;
  enterScale?: number;
  animationDelay?: number;
}

interface ExitItem {
  id: number;
  char: string;
  exitY: number;
}

let _id = 0;

function DigitCell({
  char,
  isDigit,
  className,
  reduce,
  enterStiffness = 170,
  enterDamping = 10,
  exitStiffness = 170,
  exitDamping = 15,
  direction = "dynamic",
  enterY = 32,
  enterBlur = 0,
  enterScale = 0.7,
}: {
  char: string;
  isDigit: boolean;
  className?: string;
  reduce: boolean;
  enterStiffness?: number;
  enterDamping?: number;
  exitStiffness?: number;
  exitDamping?: number;
  direction?: "dynamic" | "up" | "down";
  enterY?: number;
  enterBlur?: number;
  enterScale?: number;
}) {
  const [exitQueue, setExitQueue] = useState<ExitItem[]>([]);

  const prevCharRef = useRef(char);
  const isFirstRender = useRef(true);

  const springConfig = { stiffness: enterStiffness, damping: enterDamping };
  const y = useSpring(0, springConfig);
  const opacity = useSpring(1, springConfig);
  const scale = useSpring(1, springConfig);
  const blur = useSpring(0, springConfig);
  const filter = useTransform(blur, (v) => `blur(${v}px)`);

  useEffect(() => {
    if (!isDigit || reduce) return;

    const prev = prevCharRef.current;
    prevCharRef.current = char;

    // Nothing animates on mount: the clock should be *there* when the card
    // opens, not fly in a digit at a time.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // `!/\d/.test(prev)` guards the colon and any placeholder: there is no
    // meaningful direction from ":" to "4".
    if (char === prev || !/\d/.test(prev)) return;

    const up =
      direction === "dynamic" ? Number(char) > Number(prev) : direction === "up";

    const id = _id++;
    setExitQueue((q) => {
      const next = [...q, { id, char: prev, exitY: up ? -enterY : enterY }];
      // Three deep. A tab that was throttled and catches up can fire a dozen
      // changes in a frame, and every one of them would otherwise be a live
      // spring animating something nobody will see.
      return next.length > 3 ? next.slice(-3) : next;
    });

    // `jump` moves the spring without animating: the digit is placed offscreen
    // with zero velocity, and the `set` calls immediately after are what it
    // actually animates toward.
    y.jump(up ? enterY : -enterY);
    opacity.jump(0);
    scale.jump(enterScale);
    if (enterBlur) blur.jump(enterBlur);

    y.set(0);
    opacity.set(1);
    scale.set(1);
    blur.set(0);
  }, [char, isDigit, reduce, direction, enterY, enterBlur, enterScale, y, opacity, scale, blur]);

  if (!isDigit) {
    return <span className={className}>{char}</span>;
  }

  if (reduce) {
    return (
      <span className={cn("grid place-items-center", className)} style={{ width: "1ch" }}>
        {char}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "relative grid place-items-center [&>*]:col-start-1 [&>*]:row-start-1",
        className,
      )}
      style={{ width: "1ch" }}
    >
      <AnimatePresence>
        {exitQueue.map(({ id, char: exitChar, exitY }) => (
          <motion.span
            key={id}
            aria-hidden
            initial={{ opacity: 1, scale: 1, y: 0 }}
            animate={{ opacity: 0, scale: 0.7, y: exitY }}
            transition={{ type: "spring", stiffness: exitStiffness, damping: exitDamping }}
            onAnimationComplete={() =>
              setExitQueue((q) => q.filter((item) => item.id !== id))
            }
          >
            {exitChar}
          </motion.span>
        ))}
      </AnimatePresence>
      <motion.span style={enterBlur ? { opacity, scale, filter, y } : { opacity, scale, y }}>
        {char}
      </motion.span>
    </div>
  );
}

function AnimateDigits({
  value,
  gap = 2,
  className,
  digitClassName,
  reduce = false,
  enterStiffness,
  enterDamping,
  exitStiffness,
  exitDamping,
  direction,
  enterY,
  enterBlur,
  enterScale,
  animationDelay = 80,
}: AnimateDigitsProps & { reduce?: boolean }) {
  /**
   * What the cells actually show, which lags `value` on purpose.
   *
   * Jumping several steps at once — 30:00 straight to 25:00 when you change the
   * session length — would animate one enormous change. Queuing the
   * intermediate values and walking them at `animationDelay` apart turns it into
   * a roll, which is the whole reason for using this over a plain number.
   */
  const [displayedValue, setDisplayedValue] = useState(value);

  const pendingQueue = useRef<string[]>([]);
  const isAnimating = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayedRef = useRef(value);

  useEffect(() => {
    if (value === displayedRef.current) return;

    // Defined inside the effect so it closes over the current `animationDelay`
    // rather than needing it in a dependency array it would then restart on.
    const processQueue = () => {
      const next = pendingQueue.current.shift();
      if (next === undefined) {
        isAnimating.current = false;
        return;
      }
      displayedRef.current = next;
      setDisplayedValue(next);
      timerRef.current = setTimeout(processQueue, animationDelay);
    };

    pendingQueue.current.push(value);
    if (!isAnimating.current) {
      isAnimating.current = true;
      processQueue();
    }
  }, [value, animationDelay]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={cn("flex items-center tabular-nums", className)} style={{ gap }}>
      {displayedValue.split("").map((char, i) => (
        <DigitCell
          // Index is the right key here, unusually: a cell is a *position* in
          // the clock, and keying by character would unmount and remount the
          // tens digit every time it changed, throwing away the spring.
          key={i}
          char={char}
          isDigit={/\d/.test(char)}
          className={digitClassName}
          reduce={reduce}
          enterStiffness={enterStiffness}
          enterDamping={enterDamping}
          exitStiffness={exitStiffness}
          exitDamping={exitDamping}
          direction={direction}
          enterY={enterY}
          enterBlur={enterBlur}
          enterScale={enterScale}
        />
      ))}
    </div>
  );
}

export { AnimateDigits, type AnimateDigitsProps };
export default AnimateDigits;
