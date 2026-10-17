import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, ChevronLeft, Timer, TriangleAlert } from "lucide-react";
import { CourseCalendar, type CourseDate, type ScheduleItem } from "@/components/ui/event-manager";
import { BookingSheet, type SheetState } from "@/components/BookingSheet";
import { Loader } from "@/components/ui/loader";
import { SyllabusImportTicket } from "@/components/ui/syllabus-import-ticket";
import { StaffSignInNotice } from "@/components/ui/staff-signin-notice";
import { PageHeader } from "@/components/ui/page-header";
import { useSession } from "@/lib/useSession";
import { deleteDate, loadDates, saveDates } from "@/lib/calendar";
import {
  bookable,
  bookOfficeHour,
  byDay,
  cancelBooking,
  currentUserId,
  formatDay,
  formatTime,
  loadOfficeHours,
  moveBooking,
  slotEnd,
  type Booking,
  type OfficeHour,
} from "@/lib/officeHours";
import { EMAIL } from "@/data/site";
import { cn } from "@/lib/utils";
import "./schedule.css";

/**
 * OWNER DECISION, OPEN (SITE-REPLAN.md question 14): may a visitor who is not
 * signed in see the course's exam and deadline dates on Schedule?
 *
 * Built to show them, as recommended, behind this one switch. Turning it off
 * hides the dates in the page only. The database still lets a signed-out
 * visitor read `course_dates` (policy `course_dates_read_all`), so if the answer
 * is "no", that policy has to change too, or the dates stay one request away.
 */
export const SHOW_COURSE_DATES_SIGNED_OUT = true;

/** How far ahead "Find a time" looks, and what "this week" means in its empty line. */
const FIND_DAYS = 7;

/**
 * Schedule, at #/schedule: the course calendar and office hours on one page
 * (SITE-REPLAN.md section 4). #/calendar and #/tutoring redirect here.
 *
 * HOW IT IS PUT TOGETHER. Three kinds of thing share one calendar: course dates
 * (`course_dates`, readable by everyone), open office-hour slots and your own
 * booked sessions (the office-hours tables, readable only when signed in). This
 * page loads each, turns slots and sessions into calendar items, and hands all
 * of it to `CourseCalendar`, which already draws the Focusment-style grid. The
 * column beside it ("Find a time") lists the next week's open times; pressing
 * any slot opens the booking sheet.
 *
 * Booking needs a Supabase sign-in, because the database checks the Supabase
 * token. The page only decides which buttons to show; the database decides
 * what is allowed.
 */
export default function SchedulePage() {
  const session = useSession();
  const isStaff = session?.role === "admin" || session?.role === "owner";
  const canBook = session?.provider === "supabase";
  // Still read for the syllabus import, the one thing here that is Apps Script.
  const idToken = session?.idToken ?? null;
  const showDates = Boolean(session) || SHOW_COURSE_DATES_SIGNED_OUT;

  // ------------------------------------------------------------- course dates
  const [dates, setDates] = useState<CourseDate[]>([]);
  const [datesLoading, setDatesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load once, for everyone: `course_dates` is readable signed out. `live` stops
  // a reply that lands after the page has gone from setting state on nothing.
  useEffect(() => {
    let live = true;
    void loadDates().then(({ dates: rows, error: err }) => {
      if (!live) return;
      setDates(rows);
      setError(err ?? null);
      setDatesLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  const saveDate = async (next: CourseDate) => {
    setSaving(true);
    const { dates: rows, error: err } = await saveDates([next], idToken);
    setSaving(false);
    if (err) setError(err);
    else setDates(rows);
  };

  const removeDate = async (id: string) => {
    setSaving(true);
    const { dates: rows, error: err } = await deleteDate(id, idToken);
    setSaving(false);
    if (err) setError(err);
    else setDates(rows);
  };

  // ------------------------------------------------------------- office hours
  const [me, setMe] = useState<string | null>(null);
  const [slots, setSlots] = useState<OfficeHour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hoursError, setHoursError] = useState<string | null>(null);

  /** Reloads slots and bookings, and returns them so a caller can act on the fresh copy. */
  const refreshHours = useCallback(async () => {
    const [uid, res] = await Promise.all([currentUserId(), loadOfficeHours(new Date())]);
    setMe(uid);
    setSlots(res.slots);
    setBookings(res.bookings);
    setHoursError(res.error ?? null);
    return { uid, ...res };
  }, []);

  useEffect(() => {
    if (!canBook) return;
    let live = true;
    void Promise.all([currentUserId(), loadOfficeHours(new Date())]).then(([uid, res]) => {
      if (!live) return;
      setMe(uid);
      setSlots(res.slots);
      setBookings(res.bookings);
      setHoursError(res.error ?? null);
    });
    return () => {
      live = false;
    };
  }, [canBook]);

  // Derived, not stored: once signed out, the last account's slots are simply
  // not shown, with no effect needed to clear them.
  const shownSlots = useMemo(() => (canBook ? slots : []), [canBook, slots]);
  const slotById = useMemo(() => new Map(shownSlots.map((s) => [s.id, s])), [shownSlots]);
  const open = useMemo(() => bookable(shownSlots, me), [shownSlots, me]);
  const mine = useMemo(
    () =>
      (canBook ? bookings : [])
        .filter((b) => b.studentId === me && slotById.has(b.slotId))
        .map((b) => ({ booking: b, slot: slotById.get(b.slotId)! }))
        .sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime()),
    [canBook, bookings, me, slotById],
  );

  const items: ScheduleItem[] = useMemo(
    () => [
      ...open.map((s) => ({
        id: s.id,
        kind: "open-slot" as const,
        title: `Office hours, ${s.tutorName}`,
        // The room, not the name again (critic, round 2: "Kai Walsh" twice per row).
        detail: s.location || undefined,
        start: s.start,
        end: slotEnd(s),
      })),
      ...mine.map(({ booking, slot }) => ({
        id: booking.id,
        kind: "my-session" as const,
        title: `Session with ${slot.tutorName}`,
        detail: slot.location || undefined,
        start: slot.start,
        end: slotEnd(slot),
      })),
    ],
    [open, mine],
  );

  // ------------------------------------------------------------- the sheet
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The control that opened the sheet, so Escape or Close can hand focus back
  // to it (WCAG 2.4.3). Radix returns focus only to its own Dialog.Trigger, and
  // this sheet opens from page state, so it is remembered here instead. A ref,
  // not state: remembering it must not re-render the page.
  const opener = useRef<HTMLElement | null>(null);

  const openSheet = (next: SheetState) => {
    const active = document.activeElement;
    // "Change the time" opens the sheet from inside the sheet; keep the
    // original opener rather than a button that is about to disappear.
    if (active instanceof HTMLElement && !active.closest(".sch-sheet")) opener.current = active;
    setSheetError(null);
    setNotice(null);
    setSheet(next);
  };

  const openItem = (item: ScheduleItem) => {
    if (item.kind === "open-slot") return openSheet({ mode: "book", slotId: item.id });
    const found = mine.find((m) => m.booking.id === item.id);
    if (found) openSheet({ mode: "done", booking: found.booking, slot: found.slot });
  };

  const confirm = async (slotId: string, note: string) => {
    if (!sheet || sheet.mode === "done") return;
    setBusy(true);
    setSheetError(null);
    const studentName = session?.name ?? "";
    // The slot as it is held now, before any reload: the confirmation is drawn
    // from it and from the row the insert returned, never from a reload that may
    // not show the new booking yet.
    const slot = slotById.get(slotId);
    const res =
      sheet.mode === "move"
        ? await moveBooking({ from: sheet.booking, toSlotId: slotId, studentName, note })
        : await bookOfficeHour({ slotId, studentName, note });
    setBusy(false);
    // Reload in the background so the calendar and My sessions catch up. The
    // sheet does not wait for it and does not read it.
    void refreshHours();
    if (!res.ok || !res.booking || !slot) return setSheetError(res.error ?? "That did not book. Try once more.");
    setSheet({ mode: "done", booking: res.booking, slot, moved: sheet.mode === "move", booked: true });
  };

  const cancel = async (booking: Booking) => {
    setBusy(true);
    setSheetError(null);
    const res = await cancelBooking(booking.id);
    await refreshHours();
    setBusy(false);
    if (!res.ok) return setSheetError(res.error ?? "That did not cancel.");
    setSheet(null);
    setNotice("Session cancelled. The time is open for someone else now.");
  };

  // ------------------------------------------------------------- phone tabs
  // #/tutoring lands here as #/schedule?view=hours, so it opens on the hours.
  const [tab, setTab] = useState<"calendar" | "hours">(() =>
    typeof window !== "undefined" && /[?&]view=hours\b/.test(window.location.hash) ? "hours" : "calendar",
  );

  // ------------------------------------------------------------- the day dock
  // Desktop: a picked day's list shows in the side column, in place of Find a
  // time until "Back to Find a time", so the grid never leaves the screen. The
  // calendar draws the list into `dayDock` (a portal). `setDayDock` is a
  // callback ref: React calls it with the element once it exists, and storing
  // it in state re-renders the calendar with somewhere to draw.
  const [dayDock, setDayDock] = useState<HTMLElement | null>(null);
  const [dayOpen, setDayOpen] = useState(false);

  return (
    <main className="schedule mx-auto w-full max-w-7xl px-4 pb-10 text-foreground sm:px-6 lg:px-8">
      {/* The shared page header (shell round 3), with the staff tools at its right. */}
      <PageHeader
        title="Schedule"
        subtitle={
          session
            ? "Course dates and office hours, in one place."
            : showDates
              ? "Exams and deadlines for CHEM241. Sign in for your own sessions."
              : "Sign in to see the course dates and book office hours."
        }
        actions={
          isStaff && (
            <>
              <a href="#/d/hours" className="sch-ghost">
                Post your hours
              </a>
              <SyllabusImportTicket
                idToken={idToken}
                onSaved={(rows) => {
                  setDates(rows);
                  setError(null);
                }}
              />
            </>
          )
        }
      />

      {/* Staff signed in through Supabase cannot import a syllabus yet: that call
          still goes to Apps Script, which wants a Google token. This says so. */}
      <StaffSignInNotice session={session} action="Importing a syllabus" className="mt-3" />
      <StatusLine error={error} saving={saving} notice={notice} />

      {/* Phone only: the calendar and "Find a time" are two tabs, so neither is
          a long scroll below the other. From 1024px they sit side by side. */}
      <div role="tablist" aria-label="Schedule views" className="mt-4 flex gap-1 rounded-2xl bg-card p-1 ring-1 ring-[var(--site-border)] lg:hidden">
        {(["calendar", "hours"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "min-h-11 flex-1 cursor-pointer rounded-xl text-sm font-bold transition-colors duration-200",
              tab === t ? "bg-[var(--bb-wash)] text-[var(--bb-deep)]" : "text-[var(--site-quiet)]",
            )}
          >
            {t === "calendar" ? "Calendar" : "Find a time"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section
          aria-label="Calendar"
          className={cn(
            "bb-glow flex min-h-0 min-w-0 flex-col self-start rounded-3xl border-2 border-[var(--site-border)]/50 bg-card p-3 [--glow:var(--site-tab-schedule)] sm:p-5",
            tab !== "calendar" && "hidden lg:flex",
          )}
        >
          {/* While the dates load, a still outline of the calendar, not a line of
              text under the title (shell round 3). */}
          {datesLoading && showDates ? (
            <CalendarSkeleton />
          ) : (
          <CourseCalendar
            dates={showDates ? dates : []}
            items={items}
            onOpenItem={openItem}
            showMine={canBook}
            canEdit={isStaff}
            onCreate={(d) => void saveDate({ ...d, id: "" })}
            onUpdate={(id, d) => void saveDate({ ...d, id })}
            onDelete={(id) => void removeDate(id)}
            dayDock={dayDock}
            onPickDay={() => setDayOpen(true)}
          />
          )}
        </section>

        <aside className="flex flex-col gap-4">
          {/* Desktop only (the calendar draws into it from 1024px). */}
          <section
            aria-label="The picked day"
            className={cn("hidden rounded-3xl border-2 border-[var(--site-border)]/50 bg-card p-5", dayOpen && "lg:block")}
          >
            <button type="button" className="sch-ghost mb-3" onClick={() => setDayOpen(false)}>
              <ChevronLeft aria-hidden className="size-4" />
              Back to Find a time
            </button>
            <div ref={setDayDock} />
          </section>
          {/* Phone: shown on the "Find a time" tab. Desktop: shown unless a day is open. */}
          <div
            className={cn(
              "flex-col gap-4",
              tab === "hours" ? (dayOpen ? "flex lg:hidden" : "flex") : dayOpen ? "hidden" : "hidden lg:flex",
            )}
          >
            <FindATime
              signedIn={Boolean(session)}
              canBook={canBook}
              open={open}
              error={hoursError}
              onPick={(slotId) => openSheet({ mode: "book", slotId })}
              onBook={() => openSheet({ mode: "book" })}
            />
            {mine.length > 0 && (
              <MySessions
                mine={mine}
                onOpen={(m) => openSheet({ mode: "done", booking: m.booking, slot: m.slot })}
              />
            )}
          </div>
          <FocusCard />
        </aside>
      </div>

      <BookingSheet
        state={sheet}
        slots={open}
        busy={busy}
        error={sheetError}
        onConfirm={(slotId, note) => void confirm(slotId, note)}
        onMove={(booking, slot) => openSheet({ mode: "move", booking, slot })}
        onCancel={(booking) => void cancel(booking)}
        onClose={() => setSheet(null)}
        opener={opener}
      />
    </main>
  );
}

function StatusLine({
  error,
  saving,
  notice,
}: {
  error: string | null;
  saving: boolean;
  notice: string | null;
}) {
  if (error)
    return (
      <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--bb-warn-wash)] px-3 py-2 text-sm font-semibold text-[var(--bb-warn-ink)]">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        {error}
      </p>
    );
  if (notice)
    return (
      <p role="status" className="mt-3 rounded-xl bg-[var(--bb-progress)] px-3 py-2 text-sm font-semibold text-[var(--bb-progress-ink)]">
        {notice}
      </p>
    );
  if (saving)
    return (
      <div className="mt-3 text-sm text-[var(--site-quiet)]">
        <Loader variant="text-shimmer" size="sm" text="Saving" />
      </div>
    );
  return null;
}

/**
 * The calendar's shape while the course dates load: a title bar and a month of
 * empty cells, so the page holds its layout and nothing jumps when the real
 * calendar arrives. Still, not shimmering: a static outline needs no
 * reduced-motion branch and says "loading" without moving.
 */
function CalendarSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-1 flex-col gap-4">
      <span className="sr-only">Loading the course dates</span>
      <div aria-hidden className="h-8 w-48 rounded-xl bg-[var(--bb-wash)]" />
      <div aria-hidden className="grid flex-1 grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="min-h-12 rounded-lg bg-[var(--bb-wash)]/60" />
        ))}
      </div>
    </div>
  );
}

/** The side column: the next week's open times, as Notion Calendar's "Find a time". */
function FindATime({
  signedIn,
  canBook,
  open,
  error,
  onPick,
  onBook,
}: {
  signedIn: boolean;
  canBook: boolean;
  open: OfficeHour[];
  error: string | null;
  onPick: (slotId: string) => void;
  onBook: () => void;
}) {
  // Read the clock once, when the panel mounts, not on every render.
  const [horizon] = useState(() => Date.now() + FIND_DAYS * 86_400_000);
  const soon = byDay(open.filter((s) => s.start.getTime() < horizon)).slice(0, 3);
  const weekOf = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" });

  return (
    <section aria-labelledby="find-a-time" className="bb-glow rounded-3xl border-2 border-[var(--site-border)]/50 bg-card p-5 [--glow:var(--site-tab-schedule)]">
      <h2 id="find-a-time" className="title-face text-xl font-extrabold text-[var(--bb-deep)]">
        Find a time
      </h2>
      <p className="mt-1 text-sm text-[var(--site-quiet)]">Thirty minutes with a TA. Free for everyone on the course.</p>

      {!signedIn ? (
        <div className="mt-4">
          <a href="#/signin" className="sch-btn">
            Sign in to book
          </a>
        </div>
      ) : !canBook ? (
        <p className="mt-4 text-sm text-[var(--bb-deep)]">
          Booking uses your Blueberry account.{" "}
          <a href="#/signin" className="font-bold text-[var(--bb-blue-ink)] underline">
            Sign in with it
          </a>{" "}
          to book a time.
        </p>
      ) : error ? (
        <p role="alert" className="mt-4 rounded-xl bg-[var(--bb-warn-wash)] px-3 py-2 text-sm font-semibold text-[var(--bb-warn-ink)]">
          {error}
        </p>
      ) : soon.length === 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-[var(--bb-deep)]">No hours posted this week.</p>
          <a
            className="sch-ghost mt-3"
            href={`mailto:${EMAIL}?subject=${encodeURIComponent(`Office hours, week of ${weekOf}`)}`}
          >
            Ask for a time
          </a>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-4">
            {soon.map(([day, list]) => (
              <div key={day}>
                <h3 className="mb-2 text-sm font-semibold text-[var(--bb-deep)]">{formatDay(new Date(day))}</h3>
                <ul className="grid grid-cols-2 gap-2">
                  {list.slice(0, 4).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="sch-slot"
                        onClick={() => onPick(s.id)}
                        aria-label={`Book ${formatTime(s.start)} with ${s.tutorName}, ${formatDay(s.start)}`}
                      >
                        <span>{formatTime(s.start)}</span>
                        <span className="truncate text-xs font-semibold">{s.tutorName.split(" ")[0]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <button type="button" className="sch-btn mt-5 w-full" onClick={onBook}>
            Book a session
          </button>
        </>
      )}
    </section>
  );
}

function MySessions({
  mine,
  onOpen,
}: {
  mine: { booking: Booking; slot: OfficeHour }[];
  onOpen: (m: { booking: Booking; slot: OfficeHour }) => void;
}) {
  return (
    <section aria-labelledby="my-sessions" className="bb-glow rounded-3xl border-2 border-[var(--site-border)]/50 bg-card p-5 [--glow:var(--site-tab-schedule)]">
      <h2 id="my-sessions" className="title-face text-xl font-extrabold text-[var(--bb-deep)]">
        My sessions
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {mine.map((m) => (
          <li key={m.booking.id}>
            <button
              type="button"
              onClick={() => onOpen(m)}
              className="sch-mine flex min-h-11 w-full cursor-pointer items-start gap-2 rounded-xl px-3 py-2 text-left text-sm"
            >
              <CalendarCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block font-bold">
                  {formatDay(m.slot.start)}, {formatTime(m.slot.start)}
                </span>
                <span className="block">with {m.slot.tutorName}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Focus moved here from the home board (SITE-REPLAN.md section 4). The timer
 *  card itself is mounted once by SiteChrome; this only asks it to open. */
function FocusCard() {
  return (
    <section aria-labelledby="focus" className="bb-glow rounded-3xl border-2 border-[var(--site-border)]/50 bg-card p-5 [--glow:var(--site-tab-schedule)]">
      <h2 id="focus" className="title-face flex items-center gap-2 text-xl font-extrabold text-[var(--bb-deep)]">
        <Timer aria-hidden className="size-5" />
        Focus for 25 minutes
      </h2>
      <p className="mt-1 text-sm text-[var(--site-quiet)]">The timer stays in the header while you work, on every page.</p>
      <button
        type="button"
        className="sch-ghost mt-3"
        onClick={() => window.dispatchEvent(new CustomEvent("blueberry:open-focus"))}
      >
        Start a focus session
      </button>
    </section>
  );
}
