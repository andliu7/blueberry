import { useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarPlus, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STYLE_LABEL, type OpenSlot, type Style } from "@/lib/tutoring/api";
import { StatusLine, whenText } from "./parts";

/**
 * Booking one tutoring hour: the questionnaire, then a confirmation card.
 *
 * Same shell as the office-hours BookingSheet (Radix Dialog, `sch-sheet`), in
 * its compact single-column size. The page owns the data and the write
 * (`onConfirm`); the database decides whether the booking is allowed, so a
 * press that gets past this sheet still meets book_tutor_slot on the server.
 *
 * The four questions are the owner's (T1): which course, what you are stuck
 * on, when the exam is, and how you like to be taught. Only the booked tutor
 * and staff can read the answers; the confirmation card shows them back from
 * what was typed here, because the student cannot read that table.
 */

export interface Answers {
  course: string;
  stuckOn: string;
  examDate: string;
  style: Style;
}

export type TutorSheetState =
  | { mode: "book"; slot: OpenSlot }
  | { mode: "done"; slot: OpenSlot; bookingId: string; answers: Answers };

const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

/** The session as an .ics file, the same format officeHours.ts writes for office hours. */
function downloadSessionIcs(slot: OpenSlot, bookingId: string, answers: Answers) {
  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Blueberry//Tutoring//EN",
    "BEGIN:VEVENT",
    `UID:${bookingId}@blueberry-tutoring`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(slot.start)}`,
    `DTEND:${icsStamp(slot.end)}`,
    `SUMMARY:${icsText(`Tutoring with ${slot.tutorName}`)}`,
    `DESCRIPTION:${icsText(`${answers.course}: ${answers.stuckOn}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "tutoring.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export function TutorBookingSheet({
  state,
  busy,
  error,
  onConfirm,
  onClose,
  opener,
}: {
  state: TutorSheetState | null;
  busy: boolean;
  error: string | null;
  onConfirm: (slot: OpenSlot, answers: Answers) => void;
  onClose: () => void;
  opener?: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog.Root open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sch-scrim" />
        {/* data-mode="done" is the sheet's compact single-column size in schedule.css. */}
        <Dialog.Content
          className="sch-sheet"
          data-mode="done"
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            const el = opener?.current;
            if (el?.isConnected) {
              e.preventDefault();
              el.focus();
            }
          }}
        >
          {/* A `key` per slot: React starts the form fresh for each hour opened. */}
          {state?.mode === "book" && (
            <Questions key={state.slot.start.toISOString() + state.slot.tutorId} slot={state.slot} busy={busy} error={error} onConfirm={onConfirm} />
          )}
          {state?.mode === "done" && (
            <div className="flex flex-col items-start gap-3">
              <span className="sch-done-mark" aria-hidden>
                <Check className="size-7" />
              </span>
              <Dialog.Title className="title-face text-2xl font-extrabold text-[var(--bb-deep)]">You are booked</Dialog.Title>
              <p className="text-[var(--bb-deep)]">
                {whenText(state.slot.start)} with {state.slot.tutorName}, one hour.
              </p>
              <p className="text-sm text-[var(--site-quiet)]">
                {state.slot.tutorName} will read what you wrote: {state.answers.course}, &ldquo;{state.answers.stuckOn}&rdquo;.
              </p>
              <button type="button" className="sch-ghost" onClick={() => downloadSessionIcs(state.slot, state.bookingId, state.answers)}>
                <CalendarPlus className="size-4" aria-hidden />
                Add to my calendar
              </button>
            </div>
          )}
          <Dialog.Close aria-label="Close" className="sch-close">
            <X className="size-5" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Questions({
  slot,
  busy,
  error,
  onConfirm,
}: {
  slot: OpenSlot;
  busy: boolean;
  error: string | null;
  onConfirm: (slot: OpenSlot, answers: Answers) => void;
}) {
  const [course, setCourse] = useState("CHEM241");
  const [stuckOn, setStuckOn] = useState("");
  const [examDate, setExamDate] = useState("");
  const [style, setStyle] = useState<Style>("walk_me_through");
  const ready = course.trim().length > 0 && stuckOn.trim().length > 0;

  return (
    <form
      className="flex flex-col gap-4 pr-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !busy) onConfirm(slot, { course, stuckOn, examDate, style });
      }}
    >
      <div>
        <Dialog.Title className="title-face text-xl font-extrabold text-[var(--bb-deep)]">
          {whenText(slot.start)}
        </Dialog.Title>
        <p className="text-sm text-[var(--site-quiet)]">One hour with {slot.tutorName}. Four quick questions so they can prepare.</p>
      </div>

      <div>
        <Label htmlFor="tq-course">Which course</Label>
        <Input id="tq-course" value={course} maxLength={80} onChange={(e) => setCourse(e.target.value)} className="mt-1.5" required />
      </div>

      <div>
        <Label htmlFor="tq-stuck">What are you stuck on?</Label>
        <Textarea
          id="tq-stuck"
          value={stuckOn}
          maxLength={1000}
          onChange={(e) => setStuckOn(e.target.value)}
          placeholder="Aldol condensations: I lose track of which carbon attacks."
          className="mt-1.5"
          required
        />
      </div>

      <div>
        <Label htmlFor="tq-exam">Exam date (if you have one)</Label>
        <Input id="tq-exam" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-1.5 max-w-[12rem]" />
      </div>

      <fieldset>
        <legend className="text-sm font-medium">How do you like to work?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(Object.keys(STYLE_LABEL) as Style[]).map((s) => (
            <label key={s} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-[var(--site-border)]/50 px-3 text-sm text-[var(--bb-deep)]">
              <input type="radio" name="tq-style" value={s} checked={style === s} onChange={() => setStyle(s)} />
              {STYLE_LABEL[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <StatusLine message={error ? { ok: false, text: error } : null} />

      <div>
        <button type="submit" className="sch-btn" disabled={!ready || busy}>
          {busy ? "Booking" : "Confirm booking"}
        </button>
      </div>
    </form>
  );
}
