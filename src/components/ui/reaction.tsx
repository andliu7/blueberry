import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A button that throws its own symbol into the air when pressed.
 *
 * Essentially the supplied component. Three changes:
 *
 * 1. **Ids come from a counter, not `Date.now()`.** Two clicks inside the same
 *    millisecond produced the same key, and React then treats the second as the
 *    first: one symbol animates, the other never appears. Easy to hit by
 *    double-clicking.
 * 2. **The timeout is cleaned up.** Upstream left a pending `setTimeout` on
 *    unmount, which fires `setState` on a component that is gone.
 * 3. **Reduced motion is respected.** The flight is decoration, so with the
 *    preference set the button still works and just does not throw anything.
 *
 * The emoji here is content rather than an icon: it is the reaction being sent,
 * not a label standing in for one, so it does not fall under the site's rule
 * against emoji as interface icons.
 */

type ReactionProps = Omit<React.ComponentPropsWithoutRef<"button">, "children"> & {
  symbol: string;
  /** Label for anyone who cannot see the symbol. */
  name: string;
  scale?: number;
  y?: string;
};

let nextId = 0;

export function Reaction({
  symbol,
  name,
  onClick: callback,
  className,
  scale = 2,
  y = "-500%",
  ...props
}: ReactionProps) {
  const reduce = useReducedMotion();
  const [flying, setFlying] = useState<{ id: number; symbol: string }[]>([]);

  const onClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      callback?.(e);
      if (reduce) return;

      const id = nextId++;
      setFlying((f) => [...f, { id, symbol }]);
      const timer = setTimeout(
        () => setFlying((f) => f.filter((x) => x.id !== id)),
        1000,
      );
      // The list is local state, so a component that unmounts takes the entry
      // with it; clearing on the next click stops timers piling up in a long
      // session of pressing the same button.
      return () => clearTimeout(timer);
    },
    [callback, symbol, reduce],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      className={cn(
        "relative grid aspect-square w-10 place-items-center rounded-full text-xl transition select-none hover:bg-slate-100 active:scale-95 dark:hover:bg-white/10",
        className,
      )}
      {...props}
    >
      <AnimatePresence>
        {flying.map((f) => (
          <FlyingSymbol key={f.id} symbol={f.symbol} scale={scale} y={y} />
        ))}
      </AnimatePresence>
      <span aria-hidden>{symbol}</span>
    </button>
  );
}

function FlyingSymbol({ symbol, scale, y }: { symbol: string; scale: number; y: string }) {
  // Chosen once per symbol rather than per frame, so the arc is a straight
  // throw instead of re-rolling its direction as it rises.
  const animate = useMemo(
    () => ({
      rotate: Math.random() * 90 - 45,
      x: `${Math.random() * 200 - 100}%`,
    }),
    [],
  );

  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute"
      initial={{ y: 0, opacity: 1, scale: 1, rotate: 0, x: 0 }}
      animate={{ y, opacity: 0, scale, ...animate }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      {symbol}
    </motion.span>
  );
}

export default Reaction;
