"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface TimePickerProps {
  defaultValue?: string;
  onChange?: (time: string) => void;
  className?: string;
}

const steps = [
  { label: "+15m", minutes: 15 }, { label: "+30m", minutes: 30 },
  { label: "+1h", minutes: 60 }, { label: "+2h", minutes: 120 },
  { label: "−2h", minutes: -120 }, { label: "−1h", minutes: -60 },
  { label: "−30m", minutes: -30 }, { label: "−15m", minutes: -15 },
];

function clampTime(value: string) {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  const total = Math.max(0, Math.min(1439, (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0)));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function TimeWheelPicker({ defaultValue = "00:25", onChange, className }: TimePickerProps) {
  const [time, setTime] = useState(clampTime(defaultValue));
  const [open, setOpen] = useState(false);
  useEffect(() => onChange?.(time), [time, onChange]);
  const adjust = (amount: number) => {
    const [h, m] = time.split(":").map(Number);
    setTime(clampTime(`${Math.floor((h * 60 + m + amount) / 60)}:${(h * 60 + m + amount) % 60}`));
  };
  return (
    <div className={cn("relative grid size-72 place-items-center", className)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <AnimatePresence>
        {open && <motion.div initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .8 }} className="absolute inset-0 rounded-full border border-slate-200 bg-white/90 shadow-2xl backdrop-blur dark:border-stone-700 dark:bg-stone-950/90">
          {steps.map((step, index) => {
            const angle = index * 45 - 90;
            const x = Math.cos((angle * Math.PI) / 180) * 94;
            const y = Math.sin((angle * Math.PI) / 180) * 94;
            return <motion.button key={step.label} type="button" onClick={() => adjust(step.minutes)} style={{ transform: `translate(${x}px, ${y}px)` }} whileTap={{ scale: .94 }} className="absolute left-1/2 top-1/2 -ml-7 -mt-5 min-h-10 w-14 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-blue-400/10">{step.label}</motion.button>;
          })}
        </motion.div>}
      </AnimatePresence>
      <input aria-label="Time" value={time} onChange={(event) => setTime(event.target.value.replace(/[^0-9:]/g, "").slice(0, 5))} onBlur={() => setTime(clampTime(time))} className="relative z-10 w-28 rounded-full border border-slate-200 bg-white px-3 py-2 text-center font-mono text-xl font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-blue-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100" />
    </div>
  );
}

export const TimeCirclePicker = TimeWheelPicker;
