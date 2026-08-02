"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "motion/react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonHoldAndReleaseProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  /** Fired once the button has been held for the full duration. */
  onConfirm: () => void;
  holdDuration?: number;
  label?: string;
  holdingLabel?: string;
  confirmLabel?: string;
  /** How long the confirmed state shows before returning to idle. */
  confirmedFor?: number;
}

/**
 * Press-and-hold button. The fill is a motion animation, but the commit itself
 * runs on a timeout rather than the frame loop, so a throttled or backgrounded
 * tab can't leave the hold stuck part-way with nothing ever firing.
 */
export function ButtonHoldAndRelease({
  onConfirm,
  holdDuration = 1200,
  label = "Hold to Reset",
  holdingLabel = "Keep holding…",
  confirmLabel = "Reset!",
  confirmedFor = 1400,
  className,
  ...props
}: ButtonHoldAndReleaseProps) {
  const [phase, setPhase] = useState<"idle" | "holding" | "done">("idle");
  const controls = useAnimation();
  const timer = useRef<number | undefined>(undefined);

  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;

  const clearTimer = () => {
    if (timer.current !== undefined) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
  };

  const start = useCallback(() => {
    if (phase !== "idle" || timer.current !== undefined) return;
    setPhase("holding");
    controls.set({ width: "0%" });
    controls.start({
      width: "100%",
      transition: { duration: holdDuration / 1000, ease: "linear" },
    });
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      setPhase("done");
      controls.set({ width: "100%" });
      confirmRef.current();
    }, holdDuration);
  }, [phase, holdDuration, controls]);

  // Only cancels a hold in flight, so releasing after a successful commit does
  // not wipe the confirmed state.
  const cancel = useCallback(() => {
    if (timer.current === undefined) return;
    clearTimer();
    setPhase("idle");
    controls.stop();
    controls.start({ width: "0%", transition: { duration: 0.15 } });
  }, [controls]);

  useEffect(() => {
    if (phase !== "done") return;
    const back = setTimeout(() => {
      setPhase("idle");
      controls.start({ width: "0%", transition: { duration: 0.2 } });
    }, confirmedFor);
    return () => clearTimeout(back);
  }, [phase, confirmedFor, controls]);

  useEffect(() => clearTimer, []);

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "relative min-w-[9rem] h-9 px-3 overflow-hidden touch-none select-none rounded-lg",
        "border border-red-300 bg-red-50 text-red-700 text-sm font-semibold",
        "cursor-pointer outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f4ef]",
        className,
      )}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        start();
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if (e.repeat) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") cancel();
      }}
      onBlur={cancel}
      onContextMenu={(e) => e.preventDefault()}
      {...props}
    >
      <motion.span
        aria-hidden
        initial={{ width: "0%" }}
        animate={controls}
        className="absolute left-0 top-0 h-full bg-red-300/50"
      />
      <span className="relative z-10 w-full flex items-center justify-center gap-1.5 whitespace-nowrap">
        <Trash2 className="w-3.5 h-3.5" />
        {phase === "done" ? confirmLabel : phase === "holding" ? holdingLabel : label}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {phase === "done" ? confirmLabel : ""}
      </span>
    </button>
  );
}

export default ButtonHoldAndRelease;
