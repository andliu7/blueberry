import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Minus, Plus } from "lucide-react";
import { AnimateDigits } from "@/components/ui/animate-digits";
import { cn } from "@/lib/utils";

/**
 * A minute count you can spin, nudge or simply type.
 *
 * Adapted from the supplied radial time picker, shrunk to fit a 22rem card in
 * the corner of the screen. It has three states, and each exists because the
 * one before it is wrong for some job:
 *
 * 1. **A chip**, at rest. The number is the point; the control is not.
 * 2. **A dial**, once you press it. Drag around the ring, or scroll over it, to
 *    sweep through values. Good for "somewhere around forty".
 * 3. **A field**, if you press the number in the middle. Good for "exactly 45",
 *    which is a genuinely tedious thing to reach by dragging.
 *
 * The `−` and `+` buttons stay visible throughout, because a dial is a poor way
 * to move by exactly one and there is no reason to make you choose.
 *
 * **The dial reads rotation, not position.** Mapping the pointer's absolute
 * angle to a value means the number leaps the moment you touch the ring
 * anywhere other than the current handle, and wraps from max to min when you
 * cross twelve o'clock. Accumulating the *change* in angle instead means the
 * value moves with your hand from wherever you grabbed, and clamps at the ends
 * instead of wrapping.
 */

/** Degrees of rotation per step. A full turn is thirty steps. */
const DEG_PER_STEP = 12;
/** Wheel delta that counts as one step. */
const WHEEL_THRESHOLD = 40;

export function DialMinutes({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [dragging, setDragging] = useState(false);

  const dialRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastAngle = useRef<number | null>(null);
  const angleAccum = useRef(0);
  const wheelAccum = useRef(0);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const commit = (v: number) => onChange(clamp(Math.round(v / step) * step));

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  /** Close on Escape, and on a click that lands outside the dial. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditing(false);
        setOpen(false);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!dialRef.current?.contains(e.target as Node)) {
        setEditing(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    // Deferred a frame: the press that opened the dial is still propagating,
    // and would otherwise close it again immediately.
    const id = setTimeout(() => window.addEventListener("pointerdown", onDown), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  function angleAt(e: PointerEvent | React.PointerEvent) {
    const el = dialRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (editing) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    lastAngle.current = angleAt(e);
    angleAccum.current = 0;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || lastAngle.current === null) return;
    const a = angleAt(e);
    // Normalise the difference into (-180, 180] so a sweep across the
    // atan2 discontinuity at ±180° reads as a small move, not a full turn.
    let d = a - lastAngle.current;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    lastAngle.current = a;

    angleAccum.current += d;
    const steps = Math.trunc(angleAccum.current / DEG_PER_STEP);
    if (steps !== 0) {
      angleAccum.current -= steps * DEG_PER_STEP;
      commit(value + steps * step);
    }
  }

  function endDrag() {
    setDragging(false);
    lastAngle.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    wheelAccum.current += e.deltaY;
    if (Math.abs(wheelAccum.current) >= WHEEL_THRESHOLD) {
      const steps = Math.trunc(wheelAccum.current / WHEEL_THRESHOLD);
      wheelAccum.current -= steps * WHEEL_THRESHOLD;
      // Down decreases, matching the way a scroll wheel moves a list away.
      commit(value - steps * step);
    }
  }

  function saveDraft() {
    const n = Number(draft.replace(/\D+/g, ""));
    if (Number.isFinite(n) && draft.trim() !== "") commit(n);
    setEditing(false);
  }

  const pct = max > min ? (clamp(value) - min) / (max - min) : 0;
  const RADIUS = 30;
  const CIRC = 2 * Math.PI * RADIUS;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "cursor-pointer rounded-xl border border-slate-200 px-2.5 py-1.5 text-left transition-colors hover:border-indigo-300 dark:border-stone-800 dark:hover:border-indigo-400/50",
          className,
        )}
      >
        <span className="block font-mono text-[0.6rem] tracking-widest text-slate-400 uppercase dark:text-stone-500">
          {label}
        </span>
        <span className="mt-0.5 flex items-center gap-0.5 font-mono text-sm text-slate-900 dark:text-stone-100">
          <AnimateDigits
            value={String(value)}
            reduce={reduce}
            enterY={12}
            className="text-sm"
          />
          m
        </span>
      </button>
    );
  }

  return (
    <motion.div
      ref={dialRef}
      initial={reduce ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "rounded-xl border border-indigo-300 bg-white p-2 dark:border-indigo-400/50 dark:bg-stone-950",
        className,
      )}
    >
      <span className="block text-center font-mono text-[0.6rem] tracking-widest text-slate-400 uppercase dark:text-stone-500">
        {label}
      </span>

      <div
        className="relative mx-auto mt-1 size-[72px] touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        style={{ cursor: editing ? "default" : dragging ? "grabbing" : "grab" }}
      >
        <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
          <circle
            cx="36"
            cy="36"
            r={RADIUS}
            fill="none"
            strokeWidth="4"
            className="stroke-slate-200 dark:stroke-stone-800"
          />
          <circle
            cx="36"
            cy="36"
            r={RADIUS}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - pct)}
            className="stroke-indigo-500 transition-[stroke-dashoffset] duration-200"
          />
        </svg>

        {editing ? (
          <div className="absolute inset-0 grid place-items-center">
            <input
              ref={inputRef}
              value={draft}
              inputMode="numeric"
              aria-label={`${label} minutes`}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveDraft();
                if (e.key === "Escape") setEditing(false);
              }}
              onBlur={saveDraft}
              className="w-9 rounded-md bg-slate-100 text-center font-mono text-base text-slate-900 outline-none dark:bg-stone-900 dark:text-stone-100"
            />
          </div>
        ) : (
          <button
            type="button"
            // Press the number to type it. The dial is for sweeping; this is
            // for the times you already know you want forty-five.
            onClick={() => {
              setDraft(String(value));
              setEditing(true);
            }}
            aria-label={`Type an exact number of minutes for ${label.toLowerCase()}`}
            className="absolute inset-0 grid cursor-text place-items-center rounded-full"
          >
            <AnimateDigits
              value={String(value)}
              reduce={reduce}
              enterY={14}
              className="font-mono text-lg font-semibold text-slate-900 dark:text-stone-50"
            />
          </button>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between">
        <DialStep label={`Less ${label.toLowerCase()}`} onClick={() => commit(value - step)}>
          <Minus className="size-3" />
        </DialStep>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setOpen(false);
          }}
          aria-label="Done"
          className="cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <Check className="size-3.5" />
        </button>
        <DialStep label={`More ${label.toLowerCase()}`} onClick={() => commit(value + step)}>
          <Plus className="size-3" />
        </DialStep>
      </div>
    </motion.div>
  );
}

function DialStep({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-stone-900 dark:hover:text-stone-100"
    >
      {children}
    </button>
  );
}

export default DialMinutes;
