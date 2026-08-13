import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A button you have to mean.
 *
 * Signing out by accident costs you the session and, once accounts hold real
 * progress, a trip back through a password. A hold is the cheapest guard that
 * does not put a dialog in the way of the ordinary case: nothing to read, and
 * letting go is the cancel.
 *
 * The fill is driven by `requestAnimationFrame` against a start timestamp, not
 * by a CSS transition, because the bar has to be able to stop where it is when
 * you let go rather than run to the end.
 *
 * **Keyboard gets two presses instead.** Holding a key is a repeat event, not a
 * hold, and asking someone to keep a key down is worse than asking twice. Enter
 * or Space arms it; a second press within the window confirms.
 */
export function HoldToConfirm({
  onConfirm,
  holdMs = 1500,
  children,
  confirmingLabel = "Keep holding…",
  armedLabel = "Press again to confirm",
  className,
  fillClassName,
}: {
  onConfirm: () => void;
  holdMs?: number;
  children: React.ReactNode;
  confirmingLabel?: string;
  armedLabel?: string;
  className?: string;
  fillClassName?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [armed, setArmed] = useState(false);
  const raf = useRef<number | null>(null);
  const startedAt = useRef(0);
  const done = useRef(false);

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    setProgress(0);
  }, []);

  // Cancels an in-flight hold if the button goes away mid-press.
  useEffect(() => stop, [stop]);

  const tick = useCallback(() => {
    const elapsed = Date.now() - startedAt.current;
    const p = Math.min(1, elapsed / holdMs);
    setProgress(p);
    if (p >= 1) {
      if (!done.current) {
        done.current = true;
        stop();
        onConfirm();
      }
      return;
    }
    raf.current = requestAnimationFrame(tick);
  }, [holdMs, onConfirm, stop]);

  const begin = () => {
    done.current = false;
    startedAt.current = Date.now();
    raf.current = requestAnimationFrame(tick);
  };

  // Armed state expires, so a stray Enter does not leave the button primed.
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);

  const holding = progress > 0;

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        // Left button only, and never on a keyboard-synthesised event.
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        begin();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      aria-describedby={armed ? undefined : undefined}
      className={cn("relative overflow-hidden select-none", className)}
    >
      {/* Under the label, not over it: the text has to stay readable while the
          fill crosses it. */}
      <span
        aria-hidden
        style={{ transform: `scaleX(${progress})` }}
        className={cn(
          "absolute inset-0 origin-left bg-red-500/20",
          fillClassName,
        )}
      />
      <span className="relative flex w-full items-center gap-2.5">
        {holding ? (
          <span className="flex-1 text-left">{confirmingLabel}</span>
        ) : armed ? (
          <span className="flex-1 text-left">{armedLabel}</span>
        ) : (
          children
        )}
      </span>
    </button>
  );
}

export default HoldToConfirm;
