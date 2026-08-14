"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronLeft, Save, TriangleAlert, Users } from "lucide-react";
import { Blueberry } from "@/components/ui/blueberry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { SiteFooter } from "@/components/ui/site-footer";
import { PageBackground } from "@/components/ui/page-background";
import { StaffSignInNotice } from "@/components/ui/staff-signin-notice";
import { AvailabilityGrid, slotKey } from "@/components/ui/availability-grid";
import { CoachSchedulingCard } from "@/components/ui/coach-scheduling-card";
import { useSession } from "@/lib/useSession";
import {
  addDays,
  bookSlot,
  cancelBooking,
  formatSlotTime,
  fromSlotKey,
  loadTutoring,
  saveAvailability,
  startOfWeek,
  TUTORS,
  tutorFor,
  type Booking,
  type TutorSlot,
} from "@/lib/tutoring";
import { cn } from "@/lib/utils";

/**
 * Tutoring, at #/tutoring.
 *
 * One route, two faces. A TA sees a week grid and paints the hours they are
 * free; a student sees those hours as bookable chips. Splitting them into two
 * pages would mean a TA could not see what a student sees without signing out,
 * which is the fastest way to ship a booking page nobody can use.
 *
 * The TA's painting grid is `availability-grid.tsx`, already built for finding
 * an overlap between several people. The same interaction reads perfectly as
 * "when am I free", which is what it is being asked here.
 */
export default function TutoringPage() {
  const session = useSession();
  const me = session?.email?.toLowerCase() ?? "";
  const iAmTutor = Boolean(tutorFor(me));
  const canWrite = Boolean(session?.canWrite);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [slots, setSlots] = useState<TutorSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  /** Which tutor a student is looking at. */
  const [viewing, setViewing] = useState<string>(TUTORS[0].email);
  const [location, setLocation] = useState("CHM 2201");
  /** The TA's own picks, edited locally until saved. */
  const [mine, setMine] = useState<string[]>([]);

  const idToken = session?.idToken ?? null;

  const refresh = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    const state = await loadTutoring(idToken);
    setSlots(state.slots);
    setBookings(state.bookings);
    setError(state.error ?? null);
    setLoading(false);
  }, [idToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Seed the TA's grid from what the server has, once it arrives.
  useEffect(() => {
    if (!iAmTutor) return;
    setMine(slots.filter((s) => s.tutorEmail.toLowerCase() === me).map((s) => s.slot));
    const found = slots.find((s) => s.tutorEmail.toLowerCase() === me && s.location);
    if (found) setLocation(found.location);
  }, [slots, me, iAmTutor]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const shownTutor = tutorFor(viewing) ?? TUTORS[0];
  const tutorSlots = slots.filter((s) => s.tutorEmail.toLowerCase() === shownTutor.email);
  const tutorLocation = tutorSlots.find((s) => s.location)?.location ?? "";

  /** Everything booked with me, for the TA's own list. */
  const myBookings = bookings
    .filter((b) => b.tutorEmail.toLowerCase() === me)
    .map((b) => ({ b, at: fromSlotKey(b.slot) }))
    .filter((x): x is { b: Booking; at: Date } => x.at !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const saveMine = async () => {
    setBusy(true);
    setError(null);
    const res = await saveAvailability({
      slots: mine,
      tutorName: tutorFor(me)?.name ?? session?.name ?? "",
      location,
      idToken,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "That did not save.");
    setSlots(res.slots ?? []);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  const book = async (slot: string, note: string) => {
    setBusy(true);
    setError(null);
    const res = await bookSlot({
      tutorEmail: shownTutor.email,
      slot,
      studentName: session?.name ?? "",
      note,
      idToken,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "That did not book.");
    setBookings(res.bookings ?? []);
  };

  const drop = async (id: string) => {
    setBusy(true);
    const res = await cancelBooking(id, idToken);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "That did not cancel.");
    setBookings(res.bookings ?? []);
  };

  return (
    <main className="relative min-h-screen text-slate-900 dark:text-stone-100">
      <PageBackground />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <a
          href="#/home"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700 dark:text-stone-300"
        >
          <ChevronLeft className="size-4" />
          Home
        </a>

        <header className="mt-5 grid gap-5 rounded-3xl border border-indigo-200/80 bg-white/75 p-6 shadow-sm dark:border-indigo-400/20 dark:bg-stone-950/70 lg:grid-cols-[1fr_270px]">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">
              Tutoring / CHEM241
            </p>
            <h1 className="title-face mt-3 text-5xl leading-none">Office hours</h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-600 dark:text-stone-300">
              {iAmTutor
                ? "Paint the hours you are free and students can book them. Anything already booked is listed below."
                : "Pick a time with a TA. Sessions are thirty minutes and free."}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/70 p-4 dark:border-indigo-400/30 dark:bg-indigo-950/25">
            <Blueberry
              mood="reading"
              interactive
              onActivate={() => {
                window.location.hash = "#/home";
              }}
              className="h-40 w-40"
              label="Blueberry. Press to go home, drag to spin."
            />
            <p className="mt-2 text-center text-sm text-indigo-900/75 dark:text-indigo-100/75">
              {tutorSlots.length > 0
                ? `${tutorSlots.length} slots offered this term.`
                : "No hours posted yet."}
            </p>
          </div>
        </header>

        <div className="mt-5 flex flex-col gap-5">
          {!session && (
            <p className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              <a href="#/signin" className="font-semibold text-foreground underline">
                Sign in
              </a>{" "}
              to see and book tutoring times.
            </p>
          )}
          <StaffSignInNotice session={session} action="Setting your hours" />
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}
          {loading && (
            <p className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <Loader variant="text-shimmer" size="sm" text="Loading tutoring times…" />
            </p>
          )}

          {/* --------------------------- the TA's own view --------------------------- */}
          {iAmTutor && canWrite && (
            <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950/70 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <CalendarClock className="size-5 text-indigo-600 dark:text-indigo-300" />
                  Your hours
                </h2>
                <div className="flex items-center gap-2">
                  {saved && (
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Saved
                    </span>
                  )}
                  <Button onClick={() => void saveMine()} disabled={busy}>
                    {busy ? (
                      <Loader variant="dots" size="sm" text="Saving" />
                    ) : (
                      <>
                        <Save className="size-4" />
                        Save my hours
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-4 max-w-sm">
                <Label htmlFor="tutor-location">Where you meet</Label>
                <Input
                  id="tutor-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="CHM 2201, or a Zoom link"
                  className="mt-1.5"
                />
              </div>

              <div className="mt-5 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                  Previous week
                </Button>
                <span className="text-sm font-semibold">
                  {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {" – "}
                  {addDays(weekStart, 6).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <Button variant="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                  Next week
                </Button>
              </div>

              {/* Painting the grid is the same gesture as finding an overlap,
                  so the component built for that is reused rather than a second
                  one written that behaves almost the same. */}
              <AvailabilityGrid
                className="mt-4"
                days={days}
                startHour={9}
                endHour={18}
                slotMinutes={30}
                value={mine}
                onChange={setMine}
              />

              <p className="mt-3 text-xs text-muted-foreground">
                Saving replaces all of your hours, not just this week. Move through the weeks
                and paint everything you want to offer before saving.
              </p>

              {myBookings.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4 dark:border-stone-800">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="size-4 text-indigo-600 dark:text-indigo-300" />
                    Booked with you ({myBookings.length})
                  </h3>
                  <ul className="mt-3 flex flex-col gap-2">
                    {myBookings.map(({ b, at }) => (
                      <li
                        key={b.id}
                        className={cn(
                          "flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3",
                          at.getTime() < Date.now()
                            ? "border-slate-200 opacity-60 dark:border-stone-800"
                            : "border-slate-200 dark:border-stone-700",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            {at.toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            at {formatSlotTime(at)}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-stone-300">
                            {b.studentName || b.studentEmail}
                          </p>
                          {b.note && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-stone-400">
                              &ldquo;{b.note}&rdquo;
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => void drop(b.id)}
                          disabled={busy}
                          className="text-destructive"
                        >
                          Cancel
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* --------------------------- the student's view -------------------------- */}
          <section>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">
                {iAmTutor ? "What students see" : "Book a session"}
              </h2>
              {TUTORS.length > 1 &&
                TUTORS.map((t) => (
                  <button
                    key={t.email}
                    type="button"
                    onClick={() => setViewing(t.email)}
                    aria-pressed={viewing === t.email}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-xl px-3 text-sm font-medium transition",
                      viewing === t.email
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-stone-300 dark:hover:bg-stone-800",
                    )}
                  >
                    {t.name}
                  </button>
                ))}
            </div>

            <CoachSchedulingCard
              tutor={shownTutor}
              weekStart={weekStart}
              slots={tutorSlots}
              bookings={bookings.filter(
                (b) => b.tutorEmail.toLowerCase() === shownTutor.email,
              )}
              location={tutorLocation}
              youEmail={me || null}
              busy={busy}
              onWeekChange={(d) => setWeekStart(addDays(weekStart, d === "next" ? 7 : -7))}
              onBook={book}
              onCancel={drop}
            />
          </section>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

// Re-exported so the grid's key format stays the single definition of a slot.
export { slotKey };
