import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvailabilityGrid, slotKey } from "@/components/ui/availability-grid";
import { useSession } from "@/lib/useSession";
import {
  cancelBooking,
  currentUserId,
  formatDay,
  formatTime,
  loadOfficeHours,
  postOfficeHours,
  removeOfficeHours,
  type Booking,
  type OfficeHour,
} from "@/lib/officeHours";
import "./schedule.css";

/**
 * Posting office hours, at #/d/hours (Me, staff tools; SITE-REPLAN.md section 4).
 *
 * A tutor paints the half hours they are free on a week grid and saves; each
 * painted half hour becomes one bookable slot on Schedule. Below it, who has
 * booked them. Students never see this page in their navigation, and if one
 * types the address the database refuses every write anyway (only staff on the
 * roster may post), so the notice here is courtesy, not the lock.
 *
 * The grid is `availability-grid.tsx`, the same painting gesture the old
 * Tutoring page used, so a TA who used that one already knows this one.
 */

const SLOT_MINUTES = 30;

/** The Monday on or before a date, so a week always starts the same way. */
function mondayOf(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
}

/** "2026-10-08T14:00" (the grid's key) back to a local Date. */
function fromKey(key: string): Date {
  const [date, time] = key.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

const keyOf = (d: Date) => slotKey(d, d.getHours() * 60 + d.getMinutes());

export function OfficeHoursEditor() {
  const session = useSession();
  const isStaff = (session?.role === "admin" || session?.role === "owner") && session.provider === "supabase";

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [me, setMe] = useState<string | null>(null);
  const [slots, setSlots] = useState<OfficeHour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  /**
   * The tutor's unsaved edits, or null for "no edits yet". What the grid shows is
   * derived during render (the edits if there are any, else what is saved), so it
   * follows the data without an effect copying one state into another.
   */
  const [draft, setDraft] = useState<string[] | null>(null);
  const [placeDraft, setPlaceDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)),
    [weekStart],
  );
  const weekEnd = days[6].getTime() + 86_400_000;

  /** My slots in the week on screen. */
  const mineThisWeek = useMemo(
    () => slots.filter((s) => s.tutorId === me && s.start.getTime() >= weekStart.getTime() && s.start.getTime() < weekEnd),
    [slots, me, weekStart, weekEnd],
  );

  const painted = draft ?? mineThisWeek.map((s) => keyOf(s.start));
  const location = placeDraft ?? mineThisWeek.find((s) => s.location)?.location ?? "";

  const apply = (uid: string | null, res: Awaited<ReturnType<typeof loadOfficeHours>>) => {
    setMe(uid);
    setSlots(res.slots);
    setBookings(res.bookings);
    if (res.error) setMessage({ ok: false, text: res.error });
  };
  const refresh = useCallback(
    () => Promise.all([currentUserId(), loadOfficeHours(weekStart)]),
    [weekStart],
  );

  useEffect(() => {
    if (!isStaff) return;
    let live = true;
    void refresh().then(([uid, res]) => {
      if (!live) return;
      setMe(uid);
      setSlots(res.slots);
      setBookings(res.bookings);
      if (res.error) setMessage({ ok: false, text: res.error });
    });
    return () => {
      live = false;
    };
  }, [isStaff, refresh]);

  /** Moving to another week drops unsaved edits; the grid then shows that week as saved. */
  const goWeek = (by: number) => {
    setDraft(null);
    setWeekStart(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + by * 7));
  };

  if (!isStaff) {
    return (
      <p className="max-w-xl rounded-2xl border-2 border-dashed border-[var(--site-border)] p-6 text-[var(--bb-deep)]">
        Posting office hours is for course staff. If you are a TA, sign in with the address on the course roster.
      </p>
    );
  }

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const saved = new Map(mineThisWeek.map((s) => [keyOf(s.start), s]));
    const wanted = new Set(painted);
    const add = painted.filter((k) => !saved.has(k));
    const drop = [...saved.entries()].filter(([k]) => !wanted.has(k)).map(([, s]) => s);
    const bookedDrops = drop.filter((s) => s.booked);
    if (bookedDrops.length) {
      setBusy(false);
      setMessage({
        ok: false,
        text: `${bookedDrops.map((s) => `${formatDay(s.start)} ${formatTime(s.start)}`).join(", ")} ${bookedDrops.length === 1 ? "is" : "are"} booked. Cancel the booking below first, then remove the time.`,
      });
      return;
    }
    const posted = await postOfficeHours(
      add.map((k) => ({ start: fromKey(k), minutes: SLOT_MINUTES, location, tutorName: session?.name || session?.email || "Tutor" })),
    );
    const removed = posted.ok ? await removeOfficeHours(drop.map((s) => s.id)) : posted;
    const [uid, res] = await refresh();
    apply(uid, res);
    setDraft(null);
    setBusy(false);
    setMessage(
      posted.ok && removed.ok
        ? { ok: true, text: `Saved. ${add.length} added, ${drop.length} removed this week.` }
        : { ok: false, text: (posted.ok ? removed.error : posted.error) ?? "That did not save." },
    );
  };

  const slotById = new Map(slots.map((s) => [s.id, s]));
  const onMySlots = bookings
    .filter((b) => slotById.get(b.slotId)?.tutorId === me)
    .map((b) => ({ b, s: slotById.get(b.slotId)! }))
    .sort((x, y) => x.s.start.getTime() - y.s.start.getTime());

  const drop = async (id: string) => {
    setBusy(true);
    const res = await cancelBooking(id);
    const [uid, fresh] = await refresh();
    apply(uid, fresh);
    setBusy(false);
    setMessage(res.ok ? { ok: true, text: "Booking cancelled." } : { ok: false, text: res.error ?? "That did not cancel." });
  };

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <p className="text-[0.95rem] leading-7 text-[var(--site-quiet)]">
        Paint the half hours you are free, then save. Each one becomes a time students can book on Schedule.
      </p>

      <div className="max-w-sm">
        <Label htmlFor="hours-location">Where you meet</Label>
        <Input
          id="hours-location"
          value={location}
          onChange={(e) => setPlaceDraft(e.target.value)}
          placeholder="CHM 2201, or a Zoom link"
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-[var(--site-quiet)]">Used for the times you add when you save.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="sch-ghost" onClick={() => goWeek(-1)}>
          Previous week
        </button>
        <span className="text-sm font-semibold text-[var(--bb-deep)]">
          Week of {weekStart.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
        </span>
        <button type="button" className="sch-ghost" onClick={() => goWeek(1)}>
          Next week
        </button>
      </div>

      <AvailabilityGrid days={days} startHour={9} endHour={18} slotMinutes={SLOT_MINUTES} value={painted} onChange={setDraft} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="sch-btn" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving" : "Save this week"}
        </button>
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={
              message.ok
                ? "rounded-xl bg-[var(--bb-progress)] px-3 py-2 text-sm font-semibold text-[var(--bb-progress-ink)]"
                : "rounded-xl bg-[var(--bb-warn-wash)] px-3 py-2 text-sm font-semibold text-[var(--bb-warn-ink)]"
            }
          >
            {message.text}
          </p>
        )}
      </div>

      <section aria-labelledby="booked-with-you" className="border-t-2 border-[var(--site-border)]/40 pt-4">
        <h3 id="booked-with-you" className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
          Booked with you
        </h3>
        {onMySlots.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--site-quiet)]">Nobody has booked a time yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {onMySlots.map(({ b, s }) => (
              <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border-2 border-[var(--site-border)]/50 bg-card p-3">
                <div className="min-w-0 text-sm">
                  <p className="font-bold text-[var(--bb-deep)]">
                    {formatDay(s.start)}, {formatTime(s.start)}
                  </p>
                  <p className="text-[var(--site-quiet)]">{b.studentName || b.studentEmail}</p>
                  {b.note && <p className="mt-1 text-[var(--bb-deep)]">&ldquo;{b.note}&rdquo;</p>}
                </div>
                <button type="button" className="sch-ghost" data-danger disabled={busy} onClick={() => void drop(b.id)}>
                  Cancel booking
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
