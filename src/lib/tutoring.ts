import { postToAppsScript } from "@/lib/appsScript";

/**
 * TA office hours and student bookings.
 *
 * A slot is a local wall-clock string, `2026-08-19T14:00`, the same convention
 * the calendar uses. Not an epoch and not UTC: a tutoring session at "Tuesday
 * 2pm" has to still read Tuesday 2pm for anyone whose laptop is set to another
 * zone, and everybody involved is on one campus.
 */

export const SLOT_MINUTES = 30;

export interface TutorSlot {
  tutorEmail: string;
  tutorName: string;
  slot: string;
  location: string;
}

export interface Booking {
  id: string;
  tutorEmail: string;
  slot: string;
  studentEmail: string;
  studentName: string;
  note: string;
}

export interface TutoringState {
  slots: TutorSlot[];
  bookings: Booking[];
  you: string | null;
  error?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A Date to the stored form. */
export const toSlotKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Back again. Returns null rather than an Invalid Date, so one bad row cannot
 *  poison a sort or render as "NaN" across the week. */
export function fromSlotKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** The Monday on or before a date, so a week always starts the same way. */
export function startOfWeek(d: Date): Date {
  const day = startOfDay(d);
  // getDay() is 0 for Sunday; shift so Monday is the first column.
  const offset = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - offset);
  return day;
}

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const formatSlotTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function describe(error: unknown): string {
  if (error === "not-configured") return "Tutoring is not set up yet.";
  if (error === "unreachable") return "Could not reach the server.";
  return typeof error === "string" && error ? error : "That did not work.";
}

function readState(body: Record<string, unknown>): TutoringState {
  return {
    slots: Array.isArray(body.slots) ? (body.slots as TutorSlot[]) : [],
    bookings: Array.isArray(body.bookings) ? (body.bookings as Booking[]) : [],
    you: typeof body.you === "string" ? body.you : null,
  };
}

export async function loadTutoring(idToken: string | null): Promise<TutoringState> {
  const body = await postToAppsScript("tutoring", { idToken });
  if (!body.ok) return { slots: [], bookings: [], you: null, error: describe(body.error) };
  return readState(body);
}

/**
 * Replaces the calling tutor's whole week in one call.
 *
 * Whole-set rather than per-slot because unticking is as meaningful as ticking,
 * and a diff of two hundred checkboxes is a great deal of round trips and a
 * great deal of ways to end up half-applied.
 */
export async function saveAvailability(args: {
  slots: string[];
  tutorName: string;
  location: string;
  idToken: string | null;
}): Promise<{ ok: boolean; error?: string; slots?: TutorSlot[] }> {
  const body = await postToAppsScript("setAvailability", args);
  if (!body.ok) return { ok: false, error: describe(body.error) };
  return { ok: true, slots: Array.isArray(body.slots) ? (body.slots as TutorSlot[]) : [] };
}

export async function bookSlot(args: {
  tutorEmail: string;
  slot: string;
  studentName: string;
  note: string;
  idToken: string | null;
}): Promise<{ ok: boolean; error?: string; bookings?: Booking[] }> {
  const body = await postToAppsScript("bookSlot", args);
  if (!body.ok) return { ok: false, error: describe(body.error) };
  return { ok: true, bookings: Array.isArray(body.bookings) ? (body.bookings as Booking[]) : [] };
}

export async function cancelBooking(
  id: string,
  idToken: string | null,
): Promise<{ ok: boolean; error?: string; bookings?: Booking[] }> {
  const body = await postToAppsScript("cancelBooking", { id, idToken });
  if (!body.ok) return { ok: false, error: describe(body.error) };
  return { ok: true, bookings: Array.isArray(body.bookings) ? (body.bookings as Booking[]) : [] };
}

/** The course TAs, from the CHEM241 syllabus. */
export const TUTORS = [
  { email: "kaiwalsh@umd.edu", name: "Kai Walsh", title: "Teaching Assistant" },
  { email: "vwedekin@umd.edu", name: "Vince Wedekind", title: "Teaching Assistant" },
] as const;

export const tutorFor = (email: string) =>
  TUTORS.find((t) => t.email === email.toLowerCase()) ?? null;
