import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useSession } from "@/lib/useSession";
import { dayKey, formatDay, formatTime } from "@/lib/officeHours";
import {
  bookTutor,
  cancelTutorBooking,
  loadMyBookings,
  loadOpenSlots,
  myTutorRow,
  rateTutorSession,
  type MyBooking,
  type OpenSlot,
} from "@/lib/tutoring/api";
import { TutorBookingSheet, type Answers, type TutorSheetState } from "./TutorBookingSheet";
import { DashedCard, StatusLine, whenText, type Message } from "./parts";
import "../schedule.css";

/**
 * Book a tutor, at #/tutors: paid one-hour sessions with a Blueberry tutor
 * (STATUS.md T1). Free office hours stay on Schedule; this page sits beside
 * them and does not change them.
 *
 * A week of open hours at a time, grouped by day, filterable by tutor. Press an
 * hour, answer four questions, confirm. The hours come from tutor_open_slots,
 * which says an hour is gone without saying who took it.
 *
 * Until the owner applies the tutoring migration every call answers "not
 * ready" and the page says so plainly, with the way to free office hours.
 */

const WEEK_MS = 7 * 86_400_000;

function startOfToday(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function BookTutorPage() {
  const session = useSession();
  const canBook = session?.provider === "supabase";

  const [weekStart, setWeekStart] = useState(startOfToday);
  const [slots, setSlots] = useState<OpenSlot[]>([]);
  const [mine, setMine] = useState<MyBooking[]>([]);
  const [isTutor, setIsTutor] = useState(false);
  const [notReady, setNotReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tutorFilter, setTutorFilter] = useState("");
  const [sheet, setSheet] = useState<TutorSheetState | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  // The slot button that opened the sheet, so focus can go back to it on close.
  const opener = useRef<HTMLElement | null>(null);

  const refresh = useCallback(async () => {
    const [open, my, me] = await Promise.all([
      loadOpenSlots(weekStart, new Date(weekStart.getTime() + WEEK_MS)),
      loadMyBookings(),
      myTutorRow(),
    ]);
    return { open, my, me };
  }, [weekStart]);

  useEffect(() => {
    if (!canBook) return;
    // `live` stops a slow answer for last week overwriting this week's.
    let live = true;
    void refresh().then(({ open, my, me }) => {
      if (!live) return;
      setLoading(false);
      if ((!open.ok && open.notReady) || (!my.ok && my.notReady)) {
        setNotReady(true);
        return;
      }
      setSlots(open.ok ? open.data : []);
      setMine(my.ok ? my.data : []);
      setIsTutor(me.ok && me.data !== null);
      if (!open.ok) setMessage({ ok: false, text: open.error });
    });
    return () => {
      live = false;
    };
  }, [canBook, refresh]);

  const reload = async () => {
    const { open, my } = await refresh();
    if (open.ok) setSlots(open.data);
    if (my.ok) setMine(my.data);
  };

  const tutors = useMemo(() => [...new Map(slots.map((s) => [s.tutorId, s.tutorName])).entries()], [slots]);
  const shown = tutorFilter ? slots.filter((s) => s.tutorId === tutorFilter) : slots;
  const days = useMemo(() => {
    const map = new Map<number, OpenSlot[]>();
    for (const s of shown) {
      const k = dayKey(s.start);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [shown]);

  const confirm = async (slot: OpenSlot, answers: Answers) => {
    setBusy(true);
    setSheetError(null);
    const res = await bookTutor({ tutorId: slot.tutorId, start: slot.start, ...answers, examDate: answers.examDate || null });
    setBusy(false);
    if (!res.ok) {
      setSheetError(res.error);
      void reload();
      return;
    }
    setSheet({ mode: "done", slot, bookingId: res.data, answers });
    void reload();
  };

  const cancel = async (b: MyBooking) => {
    setBusy(true);
    const res = await cancelTutorBooking(b.id);
    await reload();
    setBusy(false);
    setMessage(res.ok ? { ok: true, text: "Session cancelled." } : { ok: false, text: res.error });
  };

  const rate = async (b: MyBooking, stars: number) => {
    setBusy(true);
    const res = await rateTutorSession(b.id, stars, "");
    await reload();
    setBusy(false);
    setMessage(res.ok ? { ok: true, text: `Thanks. You gave ${b.tutorName} ${stars} of 5.` } : { ok: false, text: res.error });
  };

  const now = Date.now();
  const thisWeek = weekStart.getTime() <= startOfToday().getTime();

  return (
    <main className="schedule mx-auto w-full max-w-5xl px-4 pb-10 text-foreground sm:px-6 lg:px-8">
      <PageHeader
        title="Book a tutor"
        subtitle="One hour, one to one, with a Blueberry tutor. Free office hours are on Schedule."
        actions={
          <>
            <a href="#/schedule?view=hours" className="sch-ghost">
              Free office hours
            </a>
            {isTutor && (
              <a href="#/d/tutor" className="sch-ghost">
                Your tutor desk
              </a>
            )}
          </>
        }
      />

      {!session ? (
        <DashedCard>
          <p>Sign in to see open times and book a tutor.</p>
          <a href="#/signin" className="sch-btn mt-4">
            Sign in to book
          </a>
        </DashedCard>
      ) : !canBook ? (
        <DashedCard>
          Booking uses your Blueberry account.{" "}
          <a href="#/signin" className="font-bold text-[var(--bb-blue-ink)] underline">
            Sign in with it
          </a>{" "}
          to book a tutor.
        </DashedCard>
      ) : notReady ? (
        <DashedCard>
          <p>Booking a tutor opens soon. Free office hours are on Schedule.</p>
          <a href="#/schedule?view=hours" className="sch-btn mt-4">
            Go to office hours
          </a>
        </DashedCard>
      ) : (
        <div className="flex flex-col gap-6">
          <StatusLine message={message} />

          <section aria-labelledby="open-hours" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="open-hours" className="title-face text-xl font-extrabold text-[var(--bb-deep)]">
                Open hours
              </h2>
              {tutors.length > 1 && (
                <label className="flex items-center gap-2 text-sm text-[var(--bb-deep)]">
                  Tutor
                  <select
                    className="min-h-11 rounded-xl border-2 border-[var(--site-border)] bg-card px-2"
                    value={tutorFilter}
                    onChange={(e) => setTutorFilter(e.target.value)}
                  >
                    <option value="">Anyone</option>
                    {tutors.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="sch-ghost"
                disabled={thisWeek}
                onClick={() => setWeekStart(new Date(weekStart.getTime() - WEEK_MS))}
              >
                Earlier
              </button>
              <span className="text-sm font-semibold text-[var(--bb-deep)]">
                {weekStart.toLocaleDateString(undefined, { month: "long", day: "numeric" })} to{" "}
                {new Date(weekStart.getTime() + WEEK_MS - 1).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
              </span>
              <button type="button" className="sch-ghost" onClick={() => setWeekStart(new Date(weekStart.getTime() + WEEK_MS))}>
                Later
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-[var(--site-quiet)]">Looking for open hours.</p>
            ) : days.length === 0 ? (
              <p className="text-sm font-semibold text-[var(--bb-deep)]">No open hours this week. Try the next one.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {days.map(([day, list]) => (
                  <div key={day}>
                    <h3 className="mb-2 text-sm font-semibold text-[var(--bb-deep)]">{formatDay(new Date(day))}</h3>
                    <ul className="flex flex-col gap-2">
                      {list.map((s) => (
                        <li key={s.tutorId + s.start.toISOString()}>
                          <button
                            type="button"
                            className="sch-slot"
                            onClick={(e) => {
                              opener.current = e.currentTarget;
                              setSheetError(null);
                              setSheet({ mode: "book", slot: s });
                            }}
                          >
                            <span>{formatTime(s.start)}</span>
                            <span className="text-xs font-semibold text-[var(--site-quiet)]">{s.tutorName}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="my-tutoring" className="border-t-2 border-[var(--site-border)]/40 pt-4">
            <h2 id="my-tutoring" className="title-face text-xl font-extrabold text-[var(--bb-deep)]">
              My tutoring sessions
            </h2>
            {mine.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--site-quiet)]">Nothing booked yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {mine.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[var(--site-border)]/50 bg-card p-3">
                    <div className="min-w-0 text-sm">
                      <p className="font-bold text-[var(--bb-deep)]">{whenText(b.start)}</p>
                      <p className="text-[var(--site-quiet)]">
                        {b.tutorName}
                        {b.status === "cancelled" && ", cancelled"}
                        {b.status === "no_show" && ", marked as missed"}
                        {b.status === "completed" && ", done"}
                      </p>
                    </div>
                    {b.status === "booked" && b.start.getTime() > now && (
                      <button type="button" className="sch-ghost" data-danger disabled={busy} onClick={() => void cancel(b)}>
                        Cancel
                      </button>
                    )}
                    {b.status === "completed" && (
                      <StarRow value={b.stars} disabled={busy} onRate={(n) => void rate(b, n)} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <TutorBookingSheet
        state={sheet}
        busy={busy}
        error={sheetError}
        onConfirm={(slot, answers) => void confirm(slot, answers)}
        onClose={() => setSheet(null)}
        opener={opener}
      />
    </main>
  );
}

/** One to five stars. A rating already given shows filled and can be changed. */
function StarRow({ value, disabled, onRate }: { value: number | null; disabled: boolean; onRate: (n: number) => void }) {
  return (
    <div role="group" aria-label={value ? `You rated this ${value} of 5` : "Rate this session"} className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          aria-label={`${n} of 5`}
          aria-pressed={value === n}
          className="flex size-11 items-center justify-center rounded-full text-[var(--bb-deep)] hover:bg-[var(--bb-wash)]"
          onClick={() => onRate(n)}
        >
          <Star className="size-5" fill={value !== null && n <= value ? "currentColor" : "none"} aria-hidden />
        </button>
      ))}
    </div>
  );
}
