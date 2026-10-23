import { getSupabase } from "@/lib/supabase";

/**
 * Office hours: the slots tutors post and the sessions students book.
 *
 * Two Supabase tables (migration `20261007120000_office_hours.sql`). The rules
 * live there, not here: a tutor on the roster posts, any signed-in student
 * books, and a write without a session is refused by Postgres. Nothing in this
 * file decides who may do what; it only asks, and reports the answer in words.
 *
 * Replaces `tutoring.ts`, which went through Apps Script and needed a Google ID
 * token that a normal Supabase sign-in never has.
 */

export interface OfficeHour {
  id: string;
  tutorId: string;
  tutorName: string;
  start: Date;
  minutes: number;
  location: string;
  /** Somebody has booked it. Kept by a trigger; nobody can write it from here. */
  booked: boolean;
}

export interface Booking {
  id: string;
  slotId: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  note: string;
}

interface SlotRow {
  id: string;
  tutor_id: string;
  tutor_name: string;
  starts_at: string;
  minutes: number;
  location: string | null;
  booked: boolean;
}

interface BookingRow {
  id: string;
  slot_id: string;
  student_id: string;
  student_email: string | null;
  student_name: string | null;
  note: string | null;
}

const toSlot = (r: SlotRow): OfficeHour => ({
  id: r.id,
  tutorId: r.tutor_id,
  tutorName: r.tutor_name,
  start: new Date(r.starts_at),
  minutes: r.minutes,
  location: r.location ?? "",
  booked: r.booked,
});

const toBooking = (r: BookingRow): Booking => ({
  id: r.id,
  slotId: r.slot_id,
  studentId: r.student_id,
  studentEmail: r.student_email ?? "",
  studentName: r.student_name ?? "",
  note: r.note ?? "",
});

/** Postgres codes are not sentences. 42501 is "the rules said no". */
function describeBookingError(error: { code?: string; message?: string }): string {
  if (error.code === "23505") return "Someone booked that time a moment ago. Pick another.";
  if (error.code === "42501") return "That was refused. Sign in again, then try once more.";
  if (error.code === "PGRST301" || error.code === "401")
    return "Your sign-in has expired. Sign in again to book.";
  return error.message || "That did not work.";
}

const NOT_SET_UP = "Office hours are not set up yet.";

/**
 * Slots from the start of `from`'s day onward, plus the signed-in caller's own
 * bookings and, for a tutor, the bookings on their slots (the policy decides
 * which rows come back, so one query serves both).
 *
 * Signed out, the policy returns nothing and Postgres refuses the read outright,
 * so this is only called with a session.
 */
export async function loadOfficeHours(from: Date): Promise<{
  slots: OfficeHour[];
  bookings: Booking[];
  error?: string;
}> {
  const supabase = await getSupabase();
  if (!supabase) return { slots: [], bookings: [], error: NOT_SET_UP };
  const since = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  const [slots, bookings] = await Promise.all([
    supabase
      .from("office_hours")
      .select("id, tutor_id, tutor_name, starts_at, minutes, location, booked")
      .gte("starts_at", since.toISOString())
      .order("starts_at"),
    supabase
      .from("office_hour_bookings")
      .select("id, slot_id, student_id, student_email, student_name, note"),
  ]);

  const error = slots.error ?? bookings.error;
  if (error) return { slots: [], bookings: [], error: describeBookingError(error) };
  return {
    slots: (slots.data as SlotRow[]).map(toSlot),
    bookings: (bookings.data as BookingRow[]).map(toBooking),
  };
}

/**
 * Books one slot for whoever is signed in. The server fills in who that is.
 *
 * The insert asks for its own row back (`.select().single()`), and the
 * confirmation is drawn from that row. It used to be drawn from a reload of
 * every booking, which could land before the new row was visible and close
 * the sheet without a word (critic, schedule round 1). Reading the row back
 * needs no new permission: the select policy already lets a student read
 * their own bookings.
 */
export async function bookOfficeHour(args: {
  slotId: string;
  studentName: string;
  note: string;
}): Promise<{ ok: boolean; error?: string; booking?: Booking }> {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: NOT_SET_UP };
  const { data, error } = await supabase
    .from("office_hour_bookings")
    .insert({
      slot_id: args.slotId,
      student_name: args.studentName.slice(0, 80) || null,
      note: args.note.trim().slice(0, 1000) || null,
    })
    .select("id, slot_id, student_id, student_email, student_name, note")
    .single();
  if (error) return { ok: false, error: describeBookingError(error) };
  return { ok: true, booking: toBooking(data as BookingRow) };
}

export async function cancelBooking(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: NOT_SET_UP };
  const { error } = await supabase.from("office_hour_bookings").delete().eq("id", id);
  return error ? { ok: false, error: describeBookingError(error) } : { ok: true };
}

/**
 * Changing the time: book the new slot first, then cancel the old one.
 *
 * In that order on purpose. If the new booking is refused (somebody took it),
 * the student still has the session they had. The reverse order could leave
 * them with neither.
 */
export async function moveBooking(args: {
  from: Booking;
  toSlotId: string;
  studentName: string;
  note: string;
}): Promise<{ ok: boolean; error?: string; booking?: Booking }> {
  const booked = await bookOfficeHour({
    slotId: args.toSlotId,
    studentName: args.studentName,
    note: args.note,
  });
  if (!booked.ok) return booked;
  const dropped = await cancelBooking(args.from.id);
  if (!dropped.ok)
    return { ok: false, error: "The new time is booked, but the old one could not be cancelled. Cancel it from My sessions." };
  return booked;
}

/** A tutor posts slots. The policy checks they are on the roster. */
export async function postOfficeHours(
  rows: { start: Date; minutes: number; location: string; tutorName: string }[],
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: NOT_SET_UP };
  if (!rows.length) return { ok: true };
  const { error } = await supabase.from("office_hours").insert(
    rows.map((r) => ({
      tutor_name: r.tutorName.slice(0, 80),
      starts_at: r.start.toISOString(),
      minutes: r.minutes,
      location: r.location.slice(0, 200) || null,
    })),
  );
  return error ? { ok: false, error: describeBookingError(error) } : { ok: true };
}

export async function removeOfficeHours(ids: string[]): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: NOT_SET_UP };
  if (!ids.length) return { ok: true };
  const { error } = await supabase.from("office_hours").delete().in("id", ids);
  return error ? { ok: false, error: describeBookingError(error) } : { ok: true };
}

/** The caller's own Supabase user id, or null when signed out. */
export async function currentUserId(): Promise<string | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// ---------------------------------------------------------------- pure helpers

/** The end of a slot. */
export const slotEnd = (s: OfficeHour) => new Date(s.start.getTime() + s.minutes * 60_000);

/** Slots a given student could book right now: open, not started, not their own. */
export function bookable(slots: OfficeHour[], me: string | null, now = new Date()): OfficeHour[] {
  return slots.filter((s) => !s.booked && s.start.getTime() > now.getTime() && s.tutorId !== me);
}

export const dayKey = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Slots grouped by local day, days in order, slots in order within a day. */
export function byDay(slots: OfficeHour[]): [number, OfficeHour[]][] {
  const map = new Map<number, OfficeHour[]>();
  for (const s of [...slots].sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const k = dayKey(s.start);
    const list = map.get(k);
    if (list) list.push(s);
    else map.set(k, [s]);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

export const formatTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export const formatDay = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

/** `20261008T140000Z`, the form an .ics file wants. */
const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Commas, semicolons and backslashes are syntax in an .ics value. */
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

/**
 * One session as an .ics file, for "Add to my calendar". Every calendar app
 * (Google, Apple, Outlook) opens one, and it needs no account or API key.
 */
export function toIcs(slot: OfficeHour, note: string, now = new Date()): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Blueberry//Office hours//EN",
    "BEGIN:VEVENT",
    `UID:${slot.id}@blueberry`,
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART:${icsStamp(slot.start)}`,
    `DTEND:${icsStamp(slotEnd(slot))}`,
    `SUMMARY:${icsText(`Office hours with ${slot.tutorName}`)}`,
    ...(slot.location ? [`LOCATION:${icsText(slot.location)}`] : []),
    ...(note.trim() ? [`DESCRIPTION:${icsText(note.trim())}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Hands the .ics to the browser as a download. */
export function downloadIcs(slot: OfficeHour, note: string) {
  const url = URL.createObjectURL(new Blob([toIcs(slot, note)], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "office-hours.ics";
  a.click();
  URL.revokeObjectURL(url);
}
