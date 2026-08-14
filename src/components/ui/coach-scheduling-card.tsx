"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarCheck, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  addDays,
  formatSlotTime,
  fromSlotKey,
  startOfDay,
  type Booking,
  type TutorSlot,
} from "@/lib/tutoring";
import { cn } from "@/lib/utils";

/**
 * Book a tutoring slot with a TA.
 *
 * Adapted from a coach-booking card, and the adaptation is mostly removal. That
 * one carried a star rating, a review count, a per-session price and a
 * four-entry venue dropdown. A course TA has none of those: office hours are
 * free, there is one room, and rating the person who marks your exam is not a
 * feature anyone asked for.
 *
 * `motion`, not `framer-motion` — same library, current name, already a
 * dependency here. Installing the old package would ship it twice.
 *
 * What is kept is the shape that works: a week at a time, days down the page,
 * times as chips, and a confirmation step before anything is booked.
 */

export interface Tutor {
  email: string;
  name: string;
  title: string;
}

export function CoachSchedulingCard({
  tutor,
  weekStart,
  slots,
  bookings,
  location,
  youEmail,
  busy,
  onWeekChange,
  onBook,
  onCancel,
  className,
}: {
  tutor: Tutor;
  weekStart: Date;
  /** Everything this tutor has offered, any week. */
  slots: TutorSlot[];
  bookings: Booking[];
  location: string;
  youEmail: string | null;
  busy?: boolean;
  onWeekChange: (direction: "prev" | "next") => void;
  onBook: (slot: string, note: string) => Promise<void> | void;
  onCancel: (id: string) => Promise<void> | void;
  className?: string;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const reduced = useReducedMotion();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const bookedBy = new Map(bookings.map((b) => [b.slot, b]));
  const now = Date.now();

  const slotsFor = (day: Date) =>
    slots
      .map((s) => ({ raw: s, at: fromSlotKey(s.slot) }))
      .filter(
        (s): s is { raw: TutorSlot; at: Date } =>
          s.at !== null && startOfDay(s.at).getTime() === startOfDay(day).getTime(),
      )
      .sort((a, b) => a.at.getTime() - b.at.getTime());

  const chosenAt = chosen ? fromSlotKey(chosen) : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 p-6 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-stone-100">
            {tutor.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-stone-400">
            {tutor.title} &middot; CHEM241
          </p>
          {location && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-stone-300">
              <MapPin className="size-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
              {location}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-stone-500">
            Per session
          </p>
          {/* Free, and said out loud. Office hours being free is the single
              most useful fact for a student deciding whether to book. */}
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Free</p>
        </div>
      </header>

      <div className="flex items-center justify-between border-y border-slate-200 px-6 py-3 dark:border-stone-800">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous week"
          onClick={() => onWeekChange("prev")}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <h3 className="text-sm font-semibold">
          {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {" – "}
          {addDays(weekStart, 6).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next week"
          onClick={() => onWeekChange("next")}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="flex flex-col gap-5 p-6">
        {days.map((day) => {
          const dayed = slotsFor(day);
          const isToday = startOfDay(day).getTime() === startOfDay(new Date()).getTime();
          return (
            <section key={day.toISOString()}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-stone-100">
                  {isToday
                    ? "Today"
                    : day.toLocaleDateString(undefined, { weekday: "long" })}
                  {", "}
                  {day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </h4>
                {dayed.length === 0 && (
                  <span className="text-sm text-slate-400 dark:text-stone-500">
                    No availability
                  </span>
                )}
              </div>

              {dayed.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {dayed.map(({ raw, at }) => {
                    const taken = bookedBy.get(raw.slot);
                    const mine = taken?.studentEmail?.toLowerCase() === youEmail?.toLowerCase();
                    const past = at.getTime() < now;
                    const disabled = past || (Boolean(taken) && !mine);

                    return (
                      <button
                        key={raw.slot}
                        type="button"
                        disabled={disabled || busy}
                        onClick={() => {
                          if (mine && taken) return void onCancel(taken.id);
                          setChosen(raw.slot);
                          setNote("");
                        }}
                        aria-label={
                          past
                            ? `${formatSlotTime(at)}, already passed`
                            : mine
                              ? `Cancel your ${formatSlotTime(at)} booking`
                              : taken
                                ? `${formatSlotTime(at)}, already booked`
                                : `Book ${formatSlotTime(at)}`
                        }
                        className={cn(
                          "min-h-11 rounded-xl border px-3 text-sm font-medium transition",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                          mine &&
                            "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
                          !mine &&
                            !disabled &&
                            "cursor-pointer border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 dark:border-stone-700 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/40",
                          disabled &&
                            "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 line-through dark:border-stone-800 dark:bg-stone-900 dark:text-stone-600",
                        )}
                      >
                        {formatSlotTime(at)}
                        {mine && " ✓ yours"}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* The confirmation step, over the card rather than replacing it, so the
          week you picked from stays visible behind. */}
      <AnimatePresence>
        {chosen && chosenAt && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="absolute inset-0 flex flex-col bg-white/95 backdrop-blur-sm dark:bg-stone-950/95"
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-stone-800">
              <h3 className="font-semibold">Confirm this time</h3>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back to the week"
                onClick={() => setChosen(null)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-center dark:border-indigo-800 dark:bg-indigo-950/40">
                <p className="text-sm text-indigo-900/75 dark:text-indigo-100/75">
                  {chosenAt.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="mt-1 text-2xl font-bold text-indigo-800 dark:text-indigo-200">
                  {formatSlotTime(chosenAt)}
                </p>
                <p className="mt-1 text-sm text-indigo-900/75 dark:text-indigo-100/75">
                  with {tutor.name} &middot; 30 minutes{location && ` · ${location}`}
                </p>
              </div>

              <label
                htmlFor="booking-note"
                className="mt-4 block text-sm font-medium text-slate-700 dark:text-stone-300"
              >
                What would you like to go over? (optional)
              </label>
              <textarea
                id="booking-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Aldol condensations, exam 2 question 4..."
                className="mt-1.5 min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-stone-700 dark:bg-stone-900"
              />
              {/* Telling the TA what you are stuck on turns thirty minutes of
                  working out what you need into thirty minutes of helping. */}
              <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">
                {tutor.name} sees this before the session.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-5 dark:border-stone-800">
              <Button variant="ghost" onClick={() => setChosen(null)} disabled={busy}>
                Back
              </Button>
              <Button
                onClick={async () => {
                  await onBook(chosen, note);
                  setChosen(null);
                }}
                disabled={busy}
              >
                {busy ? (
                  <Loader variant="dots" size="sm" text="Booking" />
                ) : (
                  <>
                    <CalendarCheck className="size-4" />
                    Confirm booking
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CoachSchedulingCard;
