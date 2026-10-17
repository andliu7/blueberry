import { useMemo, useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarCheck, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Globe, MapPin, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { WEEKDAY_NAMES, leadDays } from "@/lib/calendarCells";
import {
  byDay,
  dayKey,
  downloadIcs,
  formatDay,
  formatTime,
  slotEnd,
  type Booking,
  type OfficeHour,
} from "@/lib/officeHours";

/**
 * The booking sheet: how a student takes an office-hour slot.
 *
 * The shape is Cal.com's, looked at live on 2026-10-07: a column of session
 * facts (who, how long, where, and which clock the times are on), the month
 * with open days marked, and that day's times beside it. Pick a time, say what
 * you want to go over, confirm, and land on a confirmation card that offers
 * "Add to calendar" and "Change the time". On a phone the same parts stack in
 * a bottom sheet; from 1024px it is a centred dialog with the three columns side
 * by side (schedule round 2: the old side drawer was 60 to 70 percent empty).
 *
 * WHO OWNS WHAT. This component only walks the steps and remembers the picks.
 * The page owns the data and does the writing (`onConfirm`, `onCancel`), and
 * the database decides whether a write is allowed. So nothing here can grant a
 * booking: a press that gets past this sheet still meets RLS on the server.
 *
 * The sheet is Radix's Dialog with our own styling, because Radix already does
 * the hard part of a modal correctly: focus moves in, Tab stays inside, and
 * Escape and the scrim close it. The one thing it cannot do here is return
 * focus, because it only knows its own Dialog.Trigger and this sheet opens from
 * page state; the page passes `opener`, and `onCloseAutoFocus` focuses it.
 */

/**
 * The reader's own time zone in words, "Eastern Daylight Time", for the line
 * that says which clock the times are on. Every time on the page is already
 * shown in the browser's zone; this only says so, as Cal.com does. Here,
 * not in officeHours.ts, because that file is in the entry bundle and this
 * sheet is not.
 */
function timeZoneLabel(at = new Date()): string {
  const part = new Intl.DateTimeFormat(undefined, { timeZoneName: "long" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export type SheetState =
  | { mode: "book"; slotId?: string }
  | { mode: "move"; booking: Booking; slot: OfficeHour | null }
  /** `booked`: this sheet just made the booking, so it shows the success mark. */
  | { mode: "done"; booking: Booking; slot: OfficeHour; moved?: boolean; booked?: boolean };

type Step = "type" | "time" | "question";

export function BookingSheet({
  state,
  slots,
  busy,
  error,
  onConfirm,
  onMove,
  onCancel,
  onClose,
  opener,
}: {
  state: SheetState | null;
  /** Slots this student could book right now (open, future, not their own). */
  slots: OfficeHour[];
  busy: boolean;
  error: string | null;
  onConfirm: (slotId: string, note: string) => void;
  onMove: (booking: Booking, slot: OfficeHour | null) => void;
  onCancel: (booking: Booking) => void;
  onClose: () => void;
  /** The control that opened the sheet. Focus goes back to it on close. */
  opener?: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog.Root open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sch-scrim" />
        <Dialog.Content
          className="sch-sheet"
          data-mode={state?.mode}
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            // If the opener is gone (a slot button that is now booked), Radix's
            // own fallback runs instead.
            const el = opener?.current;
            if (el?.isConnected) {
              e.preventDefault();
              el.focus();
            }
          }}
        >
          {/* A `key` that changes with what opened the sheet: React throws away
              the old step state and starts fresh, instead of a reschedule
              opening on the step a previous booking was left on. */}
          {state && state.mode !== "done" && (
            <Steps
              key={state.mode === "move" ? `move-${state.booking.id}` : `book-${state.slotId ?? ""}`}
              state={state}
              slots={slots}
              busy={busy}
              error={error}
              onConfirm={onConfirm}
            />
          )}
          {state?.mode === "done" && (
            <Done
              state={state}
              busy={busy}
              error={error}
              onMove={() => onMove(state.booking, state.slot)}
              onCancel={() => onCancel(state.booking)}
            />
          )}
          {/* Last in the DOM, drawn in the corner: Tab reaches the sheet's own
              controls first, and Radix's first focus lands on them, not on Close. */}
          <Dialog.Close aria-label="Close" className="sch-close">
            <X className="size-5" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** One kind of session per tutor: who, how long, where. */
interface SessionType {
  tutorId: string;
  tutorName: string;
  minutes: number;
  location: string;
  count: number;
}

function sessionTypes(slots: OfficeHour[]): SessionType[] {
  const map = new Map<string, SessionType>();
  for (const s of slots) {
    const t = map.get(s.tutorId);
    if (t) t.count++;
    else map.set(s.tutorId, { tutorId: s.tutorId, tutorName: s.tutorName, minutes: s.minutes, location: s.location, count: 1 });
  }
  return [...map.values()].sort((a, b) => a.tutorName.localeCompare(b.tutorName));
}

function Steps({
  state,
  slots,
  busy,
  error,
  onConfirm,
}: {
  state: Extract<SheetState, { mode: "book" | "move" }>;
  slots: OfficeHour[];
  busy: boolean;
  error: string | null;
  onConfirm: (slotId: string, note: string) => void;
}) {
  const types = useMemo(() => sessionTypes(slots), [slots]);
  const preset = state.mode === "book" && state.slotId ? slots.find((s) => s.id === state.slotId) : undefined;

  // Opened from a slot on the calendar: straight to the question, like pressing
  // a time on Cal.com. Opened from "Book a session": the first step.
  const [step, setStep] = useState<Step>(preset ? "question" : types.length === 1 ? "time" : "type");
  const [tutorId, setTutorId] = useState<string | null>(preset?.tutorId ?? (types.length === 1 ? types[0].tutorId : null));
  // The picked slot itself, not only its id: if the booking is refused because
  // someone else took the time, the reload drops it from `slots`, and the form
  // and its error must stay on screen rather than vanish with it.
  const [picked, setPicked] = useState<OfficeHour | null>(preset ?? null);
  const [note, setNote] = useState(state.mode === "move" ? state.booking.note : "");

  const mine = slots.filter((s) => s.tutorId === tutorId);
  const type = types.find((t) => t.tutorId === tutorId);
  const facts = (
    <Facts
      moving={state.mode === "move"}
      tutorName={type?.tutorName ?? picked?.tutorName}
      minutes={type?.minutes ?? picked?.minutes}
      location={type?.location ?? picked?.location}
      chosen={step === "question" ? picked : null}
    />
  );

  if (slots.length === 0 && !picked) {
    return (
      <div className="sch-book" data-step="empty">
        {facts}
        <p className="rounded-2xl border-2 border-dashed border-[var(--site-border)] p-6 text-center text-[var(--site-quiet)]">
          No open times right now. Check back after the tutors post next week&rsquo;s hours.
        </p>
      </div>
    );
  }

  if (step === "type") {
    return (
      <div className="sch-book" data-step="type">
        {facts}
        <section aria-label="Pick a session">
          <ul className="flex flex-col gap-2">
            {types.map((t) => (
              <li key={t.tutorId}>
                <button
                  type="button"
                  onClick={() => {
                    setTutorId(t.tutorId);
                    setStep("time");
                  }}
                  className="flex w-full cursor-pointer flex-col gap-1 rounded-2xl border-2 border-b-4 border-[var(--site-border)] bg-card p-4 text-left hover:bg-[var(--bb-wash)] focus-visible:outline-3 focus-visible:outline-[var(--ring)]"
                >
                  <span className="title-face text-lg font-extrabold text-[var(--bb-deep)]">Office hours with {t.tutorName}</span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--site-quiet)]">
                    <span className="inline-flex items-center gap-1"><Clock aria-hidden className="size-4" />{t.minutes} min</span>
                    {t.location && <span className="inline-flex items-center gap-1"><MapPin aria-hidden className="size-4" />{t.location}</span>}
                    <span>{t.count} open {t.count === 1 ? "time" : "times"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  if (step === "time") {
    return (
      <div className="sch-book" data-step="time">
        {facts}
        <PickTime
          slots={mine}
          chosen={picked?.id ?? null}
          onBack={types.length > 1 ? () => setStep("type") : undefined}
          onPick={(s) => {
            setPicked(s);
            setStep("question");
          }}
        />
      </div>
    );
  }

  // step === "question"
  if (!picked) return null;
  return (
    <div className="sch-book" data-step="question">
      {facts}
      <section aria-label="Confirm">
        <label htmlFor="sch-note" className="block text-sm font-semibold text-[var(--bb-deep)]">
          What do you want to go over? <span className="font-normal text-[var(--site-quiet)]">(optional)</span>
        </label>
        <Textarea
          id="sch-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Problem 4 on the practice exam, the aldol step"
          className="mt-1.5 resize-y"
        />
        <p className="mt-2 text-sm text-[var(--site-quiet)]">Your name and email come from your Blueberry account.</p>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-[var(--bb-warn-wash)] px-3 py-2 text-sm font-semibold text-[var(--bb-warn-ink)]">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="sch-ghost" onClick={() => setStep("time")}>
            <ChevronLeft aria-hidden className="size-4" />
            Back
          </button>
          <button type="button" className="sch-btn ml-auto" disabled={busy} onClick={() => onConfirm(picked.id, note)}>
            {busy ? "Booking" : state.mode === "move" ? "Move to this time" : "Confirm"}
          </button>
        </div>
      </section>
    </div>
  );
}

/**
 * The session facts, Cal.com's left column: who, how long, where, the picked
 * time once there is one, and the time zone every time is shown in. It also
 * carries the dialog's title, so a screen reader hears what the sheet is for.
 */
function Facts({
  moving,
  tutorName,
  minutes,
  location,
  chosen,
}: {
  moving: boolean;
  tutorName?: string;
  minutes?: number;
  location?: string;
  chosen: OfficeHour | null;
}) {
  return (
    <div className="sch-facts">
      <p className="text-sm font-semibold text-[var(--site-quiet)]">{moving ? "Changing your time" : "Office hours"}</p>
      <Dialog.Title className="title-face text-2xl leading-tight font-extrabold text-[var(--bb-deep)]">
        {tutorName ? `With ${tutorName}` : "Book a session"}
      </Dialog.Title>
      <ul className="sch-fact-list">
        {chosen && (
          <li className="font-semibold text-[var(--bb-deep)]">
            <CalendarCheck aria-hidden className="size-4 shrink-0" />
            {formatDay(chosen.start)}, {formatTime(chosen.start)} to {formatTime(slotEnd(chosen))}
          </li>
        )}
        {minutes ? (
          <li>
            <Clock aria-hidden className="size-4 shrink-0" />
            {minutes} min, free
          </li>
        ) : null}
        {location ? (
          <li>
            <MapPin aria-hidden className="size-4 shrink-0" />
            {location}
          </li>
        ) : null}
        <li>
          <Globe aria-hidden className="size-4 shrink-0" />
          Times in {timeZoneLabel(chosen?.start)}
        </li>
      </ul>
    </div>
  );
}

/** The month on the left, that day's times on the right (stacked on a phone). */
function PickTime({
  slots,
  chosen,
  onBack,
  onPick,
}: {
  slots: OfficeHour[];
  chosen: string | null;
  onBack?: () => void;
  onPick: (slot: OfficeHour) => void;
}) {
  const days = useMemo(() => new Map(byDay(slots)), [slots]);
  const first = slots[0]?.start ?? new Date();
  const [month, setMonth] = useState(() => new Date(first.getFullYear(), first.getMonth(), 1));
  const [day, setDay] = useState<number>(() => dayKey(first));
  const cells = useMemo(() => {
    // The page's week start (Sunday), so a date sits in the same column in the
    // sheet as on the calendar behind it; blank cells before the 1st.
    const lead = leadDays(month);
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
    ];
  }, [month]);
  const times = days.get(day) ?? [];

  return (
    <section aria-label="Pick a time" className="sch-pick">
      <div>
        <div className="mb-2 flex items-center gap-1">
          {onBack && (
            <button type="button" className="sch-ghost px-2.5" onClick={onBack} aria-label="Back to session types">
              <ChevronLeft aria-hidden className="size-4" />
            </button>
          )}
          <h3 className="title-face mr-auto text-lg font-extrabold text-[var(--bb-deep)]">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h3>
          <button type="button" className="sch-ghost px-2.5" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button type="button" className="sch-ghost px-2.5" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--site-quiet)]">
          {WEEKDAY_NAMES.map((d) => (
            <span key={d} className="py-1">{d}</span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`blank-${i}`} />;
            const k = dayKey(d);
            const open = days.has(k);
            return open ? (
              <button
                key={k}
                type="button"
                data-open
                aria-pressed={k === day}
                aria-label={`${formatDay(d)}, ${days.get(k)!.length} open`}
                className="sch-day"
                onClick={() => setDay(k)}
              >
                {d.getDate()}
              </button>
            ) : (
              <span key={k} className="sch-day" aria-hidden>
                {d.getDate()}
              </span>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="mb-2 flex min-h-11 items-center text-sm font-semibold text-[var(--bb-deep)]">
          {days.has(day) ? formatDay(new Date(day)) : "Pick a day with open times"}
        </h3>
        <ul className="flex flex-col gap-2">
          {times.map((s) => (
            <li key={s.id}>
              <button type="button" className="sch-slot" aria-pressed={s.id === chosen} onClick={() => onPick(s)}>
                <span>{formatTime(s.start)}</span>
                <span className="text-xs font-semibold">{s.minutes} min</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Summary({ slot }: { slot: OfficeHour }) {
  return (
    <div className="rounded-2xl border-2 border-[var(--site-border)] bg-card p-4 text-left">
      <p className="title-face text-lg font-extrabold text-[var(--bb-deep)]">Office hours with {slot.tutorName}</p>
      <ul className="sch-fact-list">
        <li className="font-semibold text-[var(--bb-deep)]">
          <CalendarCheck aria-hidden className="size-4 shrink-0" />
          {formatDay(slot.start)}, {formatTime(slot.start)} to {formatTime(slotEnd(slot))}
        </li>
        {slot.location && (
          <li>
            <MapPin aria-hidden className="size-4 shrink-0" />
            {slot.location}
          </li>
        )}
        <li>
          <Globe aria-hidden className="size-4 shrink-0" />
          Times in {timeZoneLabel(slot.start)}
        </li>
      </ul>
    </div>
  );
}

function Done({
  state,
  busy,
  error,
  onMove,
  onCancel,
}: {
  state: Extract<SheetState, { mode: "done" }>;
  busy: boolean;
  error: string | null;
  onMove: () => void;
  onCancel: () => void;
}) {
  const [now] = useState(() => Date.now());
  const past = state.slot.start.getTime() <= now;
  const fresh = state.booked || state.moved;
  return (
    <section aria-label="Your session" className="sch-done">
      {/* The moment of success: a green mark (green says "you moved", fill with
          dark ink) and a headline, announced once by the status role. */}
      <div role="status" className="flex flex-col items-center gap-2 text-center">
        {fresh && (
          <span aria-hidden className="sch-done-mark">
            <Check className="size-7" strokeWidth={3} />
          </span>
        )}
        <Dialog.Title className="title-face text-2xl font-extrabold text-[var(--bb-deep)]">
          {state.moved ? "Moved" : state.booked ? "You are booked" : "Your session"}
        </Dialog.Title>
        {fresh && (
          <p className="text-sm text-[var(--site-quiet)]">It is on your Schedule. {state.slot.tutorName} will see your question.</p>
        )}
      </div>
      <div className="mt-4">
        <Summary slot={state.slot} />
      </div>
      {state.booking.note && (
        <p className="mt-3 text-sm text-[var(--site-quiet)]">
          You asked about: <span className="text-[var(--bb-deep)]">{state.booking.note}</span>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-[var(--bb-warn-wash)] px-3 py-2 text-sm font-semibold text-[var(--bb-warn-ink)]">
          {error}
        </p>
      )}
      {/* One row: the primary and the one quiet alternative. Close is the X. */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={past ? "sch-btn col-span-2" : "sch-btn"}
          onClick={() => downloadIcs(state.slot, state.booking.note)}
        >
          <CalendarPlus aria-hidden className="size-4 max-[400px]:hidden" />
          Add to calendar
        </button>
        {!past && (
          <button type="button" className="sch-ghost" disabled={busy} onClick={onMove}>
            Change the time
          </button>
        )}
      </div>
      {!past && (
        <div className="mt-3 text-center">
          <button type="button" data-danger className="sch-quiet" disabled={busy} onClick={onCancel}>
            Cancel this session
          </button>
        </div>
      )}
    </section>
  );
}
