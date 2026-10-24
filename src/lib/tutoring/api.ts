import { getSupabase } from "@/lib/supabase";
import { DEFAULT_PAY_RULES, type PayRules } from "./rules";
import type { AvailabilityRule } from "./slots";

/**
 * Paid tutoring, talking to Supabase (migration 20261024120000_tutoring.sql).
 *
 * Like officeHours.ts, nothing here decides who may do what: the database does
 * (RLS, column grants, and the rpcs that write bookings and the ledger). This
 * file asks and turns the answer into a sentence.
 *
 * NOT READY. Until the owner applies the migration, every table and rpc here is
 * missing. Each call then answers `{ ok: false, notReady: true }` and the pages
 * show an honest "opens soon" card. There is no localStorage fallback for the
 * data: bookings are shared between people, and a booking only one browser can
 * see would be a fake one.
 *
 * supabase-js is fetched by `getSupabase()` on the first call, never at import,
 * so importing this file costs nothing on a page that does not use it.
 */

export type Result<T> = { ok: true; data: T } | { ok: false; notReady?: boolean; error: string };

interface PgError {
  code?: string;
  message?: string;
}

/** The table or function does not exist yet: the migration is not applied. */
const NOT_READY_CODES = new Set(["PGRST205", "PGRST202", "42P01", "42883"]);
const NOT_READY: Result<never> = { ok: false, notReady: true, error: "Tutoring is not set up yet." };

export function describeTutoringError(error: PgError): string {
  if (error.code === "23P01") return "Someone booked that time a moment ago. Pick another.";
  if (error.code === "23505") return "That address is already on someone's list.";
  if (error.code === "42501") return error.message && !/permission denied/i.test(error.message)
    ? error.message
    : "That was refused. Sign in again, then try once more.";
  if (error.code === "PGRST301" || error.code === "401") return "Your sign-in has expired. Sign in again.";
  // P0001 is our own `raise exception`, already a sentence.
  return error.message || "That did not work.";
}

function fail(error: PgError): Result<never> {
  if (error.code && NOT_READY_CODES.has(error.code)) return NOT_READY;
  return { ok: false, error: describeTutoringError(error) };
}

async function client() {
  try {
    return await getSupabase();
  } catch {
    return null;
  }
}

/** One rpc call, mapped. */
async function rpc<T>(fn: string, args: Record<string, unknown>, map: (data: unknown) => T): Promise<Result<T>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return fail(error);
  return { ok: true, data: map(data) };
}

// ---------------------------------------------------------------- types

export type Style = "walk_me_through" | "practice_problems" | "quick_questions" | "mix";

export const STYLE_LABEL: Record<Style, string> = {
  walk_me_through: "Walk me through it",
  practice_problems: "Practice problems together",
  quick_questions: "Quick questions",
  mix: "A mix",
};

export interface OpenSlot {
  tutorId: string;
  tutorName: string;
  start: Date;
  end: Date;
}

export interface MyBooking {
  id: string;
  tutorId: string;
  tutorName: string;
  start: Date;
  end: Date;
  status: "booked" | "cancelled" | "completed" | "no_show";
  stars: number | null;
}

export interface TutorSession {
  id: string;
  start: Date;
  end: Date;
  status: MyBooking["status"];
  studentName: string;
  studentEmail: string;
  course: string;
  stuckOn: string;
  examDate: string | null;
  style: Style | null;
}

export interface TutorRow {
  id: string;
  email: string;
  userId: string | null;
  displayName: string;
  startedAt: Date;
  timezone: string;
  active: boolean;
  onboardedAt: Date | null;
}

export interface TimeOff {
  id: string;
  start: Date;
  end: Date;
  reason: string;
}

/** tutor_rate_status, as the database judged it just now. */
export interface RateStatus {
  monthsOk: boolean;
  avgRating: number | null;
  ratingCount: number;
  ratingOk: boolean;
  lessons: number;
  lessonsOk: boolean;
  referrals: number;
  referralsOk: boolean;
  qualified: boolean;
  rateCents: number;
  unpaidCents: number;
  unpaidCount: number;
  rules: PayRules;
}

export interface LedgerRow {
  id: string;
  tutorId: string;
  sessionEndsAt: Date;
  minutes: number;
  rateCents: number;
  amountCents: number;
  paidAt: Date | null;
  paidNote: string;
}

// ---------------------------------------------------------------- mappers

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const date = (v: unknown) => new Date(str(v));
const maybeDate = (v: unknown) => (typeof v === "string" ? new Date(v) : null);

const toTutor = (r: Row): TutorRow => ({
  id: str(r.id),
  email: str(r.email),
  userId: typeof r.user_id === "string" ? r.user_id : null,
  displayName: str(r.display_name),
  startedAt: date(r.started_at),
  timezone: str(r.timezone),
  active: r.active !== false,
  onboardedAt: maybeDate(r.onboarded_at),
});

const toRules = (r: Row | null | undefined): PayRules =>
  r
    ? {
        baseRateCents: Number(r.base_rate_cents),
        raisedRateCents: Number(r.raised_rate_cents),
        minMonths: Number(r.min_months),
        minAvgRating: Number(r.min_avg_rating),
        minRatings: Number(r.min_ratings),
        minLessons: Number(r.min_lessons),
        minReferrals: Number(r.min_referrals),
      }
    : DEFAULT_PAY_RULES;

const toStatus = (r: Row): RateStatus => ({
  monthsOk: r.months_ok === true,
  avgRating: r.avg_rating == null ? null : Number(r.avg_rating),
  ratingCount: Number(r.rating_count ?? 0),
  ratingOk: r.rating_ok === true,
  lessons: Number(r.lessons ?? 0),
  lessonsOk: r.lessons_ok === true,
  referrals: Number(r.referrals ?? 0),
  referralsOk: r.referrals_ok === true,
  qualified: r.qualified === true,
  rateCents: Number(r.rate_cents ?? 0),
  unpaidCents: Number(r.unpaid_cents ?? 0),
  unpaidCount: Number(r.unpaid_count ?? 0),
  rules: toRules(r.rules as Row | undefined),
});

const toLedger = (r: Row): LedgerRow => ({
  id: str(r.id),
  tutorId: str(r.tutor_id),
  sessionEndsAt: date(r.session_ends_at),
  minutes: Number(r.minutes),
  rateCents: Number(r.rate_cents),
  amountCents: Number(r.amount_cents),
  paidAt: maybeDate(r.paid_at),
  paidNote: str(r.paid_note),
});

const rows = (data: unknown) => (Array.isArray(data) ? (data as Row[]) : []);

// ---------------------------------------------------------------- students

export function loadOpenSlots(from: Date, to: Date): Promise<Result<OpenSlot[]>> {
  return rpc("tutor_open_slots", { p_from: from.toISOString(), p_to: to.toISOString() }, (data) =>
    rows(data).map((r) => ({
      tutorId: str(r.tutor_id),
      tutorName: str(r.tutor_name),
      start: date(r.starts_at),
      end: date(r.ends_at),
    })),
  );
}

export function bookTutor(args: {
  tutorId: string;
  start: Date;
  course: string;
  stuckOn: string;
  examDate: string | null;
  style: Style;
}): Promise<Result<string>> {
  return rpc(
    "book_tutor_slot",
    {
      p_tutor: args.tutorId,
      p_starts: args.start.toISOString(),
      p_course: args.course.trim().slice(0, 80),
      p_stuck_on: args.stuckOn.trim().slice(0, 1000),
      p_exam_date: args.examDate || null,
      p_style: args.style,
    },
    (data) => str(data),
  );
}

export function loadMyBookings(): Promise<Result<MyBooking[]>> {
  return rpc("my_tutor_bookings", {}, (data) =>
    rows(data).map((r) => ({
      id: str(r.id),
      tutorId: str(r.tutor_id),
      tutorName: str(r.tutor_name),
      start: date(r.starts_at),
      end: date(r.ends_at),
      status: str(r.status) as MyBooking["status"],
      stars: r.stars == null ? null : Number(r.stars),
    })),
  );
}

export function cancelTutorBooking(id: string): Promise<Result<null>> {
  return rpc("cancel_tutor_booking", { p_booking: id }, () => null);
}

export function rateTutorSession(id: string, stars: number, comment: string): Promise<Result<null>> {
  return rpc("rate_tutor_session", { p_booking: id, p_stars: stars, p_comment: comment.slice(0, 500) }, () => null);
}

// ---------------------------------------------------------------- tutors

/** The caller's own tutor row, or null when they are not a tutor. */
export async function myTutorRow(): Promise<Result<TutorRow | null>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user.id;
  if (!uid) return { ok: true, data: null };
  const { data, error } = await supabase.from("tutors").select("*").eq("user_id", uid).maybeSingle();
  if (error) return fail(error);
  return { ok: true, data: data ? toTutor(data as Row) : null };
}

export function updateMe(args: { displayName?: string; timezone?: string; onboarded?: boolean }): Promise<Result<null>> {
  return rpc(
    "tutor_update_me",
    { p_display_name: args.displayName ?? null, p_timezone: args.timezone ?? null, p_onboarded: args.onboarded ?? false },
    () => null,
  );
}

export async function loadAvailability(tutorId: string): Promise<Result<{ rules: AvailabilityRule[]; timeOff: TimeOff[] }>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const [rules, off] = await Promise.all([
    supabase.from("tutor_availability").select("weekday, start_minute, end_minute").eq("tutor_id", tutorId),
    supabase
      .from("tutor_availability_exceptions")
      .select("id, starts_at, ends_at, reason")
      .eq("tutor_id", tutorId)
      .order("starts_at"),
  ]);
  const error = rules.error ?? off.error;
  if (error) return fail(error);
  return {
    ok: true,
    data: {
      rules: rows(rules.data).map((r) => ({
        weekday: Number(r.weekday),
        startMinute: Number(r.start_minute),
        endMinute: Number(r.end_minute),
      })),
      timeOff: rows(off.data).map((r) => ({
        id: str(r.id),
        start: date(r.starts_at),
        end: date(r.ends_at),
        reason: str(r.reason),
      })),
    },
  };
}

/** Replaces the caller's weekly hours in one transaction (tutor_set_availability). */
export function saveAvailability(rules: AvailabilityRule[]): Promise<Result<null>> {
  return rpc(
    "tutor_set_availability",
    { p_rules: rules.map((r) => ({ weekday: r.weekday, start_minute: r.startMinute, end_minute: r.endMinute })) },
    () => null,
  );
}

export async function addTimeOff(start: Date, end: Date, reason: string): Promise<Result<null>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { error } = await supabase
    .from("tutor_availability_exceptions")
    .insert({ starts_at: start.toISOString(), ends_at: end.toISOString(), reason: reason.trim().slice(0, 200) || null });
  return error ? fail(error) : { ok: true, data: null };
}

export async function removeTimeOff(id: string): Promise<Result<null>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { error } = await supabase.from("tutor_availability_exceptions").delete().eq("id", id);
  return error ? fail(error) : { ok: true, data: null };
}

export function loadMySessions(): Promise<Result<TutorSession[]>> {
  return rpc("tutor_sessions", {}, (data) =>
    rows(data).map((r) => ({
      id: str(r.id),
      start: date(r.starts_at),
      end: date(r.ends_at),
      status: str(r.status) as TutorSession["status"],
      studentName: str(r.student_name),
      studentEmail: str(r.student_email),
      course: str(r.course),
      stuckOn: str(r.stuck_on),
      examDate: typeof r.exam_date === "string" ? r.exam_date : null,
      style: (typeof r.preferred_style === "string" ? r.preferred_style : null) as Style | null,
    })),
  );
}

export function completeTutorSession(id: string, outcome: "completed" | "no_show"): Promise<Result<null>> {
  return rpc("complete_tutor_session", { p_booking: id, p_outcome: outcome }, () => null);
}

export function loadRateStatus(tutorId: string): Promise<Result<RateStatus>> {
  return rpc("tutor_rate_status", { p_tutor: tutorId }, (data) => toStatus((data ?? {}) as Row));
}

/** Ledger rows the caller may see (their own, or every tutor's for staff). */
export async function loadLedger(tutorId?: string): Promise<Result<LedgerRow[]>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  let query = supabase
    .from("tutor_ledger")
    .select("id, tutor_id, session_ends_at, minutes, rate_cents, amount_cents, paid_at, paid_note")
    .order("session_ends_at", { ascending: false });
  if (tutorId) query = query.eq("tutor_id", tutorId);
  const { data, error } = await query;
  if (error) return fail(error);
  return { ok: true, data: rows(data).map(toLedger) };
}

// ---------------------------------------------------------------- admin

export async function inviteTutor(email: string, displayName: string, startedAt: Date): Promise<Result<null>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { error } = await supabase.from("tutors").insert({
    email: email.trim().toLowerCase(),
    display_name: displayName.trim().slice(0, 80),
    started_at: startedAt.toISOString(),
  });
  return error ? fail(error) : { ok: true, data: null };
}

export async function setTutorActive(id: string, active: boolean): Promise<Result<null>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { error } = await supabase.from("tutors").update({ active }).eq("id", id);
  return error ? fail(error) : { ok: true, data: null };
}

export interface TutorWithStatus {
  tutor: TutorRow;
  status: RateStatus | null;
}

/** Every tutor (staff only, by RLS), each with today's rate status and what is owed. */
export async function listTutors(): Promise<Result<TutorWithStatus[]>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { data, error } = await supabase.from("tutors").select("*").order("display_name");
  if (error) return fail(error);
  const tutors = rows(data).map(toTutor);
  const statuses = await Promise.all(tutors.map((t) => loadRateStatus(t.id)));
  return {
    ok: true,
    data: tutors.map((tutor, i) => {
      const s = statuses[i];
      return { tutor, status: s.ok ? s.data : null };
    }),
  };
}

/** Marks unpaid ledger rows paid. The database stamps who did it. */
export async function markPaid(ids: string[], note: string): Promise<Result<null>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  if (!ids.length) return { ok: true, data: null };
  const { error } = await supabase
    .from("tutor_ledger")
    .update({ paid_at: new Date().toISOString(), paid_note: note.trim().slice(0, 200) || null })
    .in("id", ids)
    .is("paid_at", null);
  return error ? fail(error) : { ok: true, data: null };
}

export async function loadPayRules(): Promise<Result<PayRules>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { data, error } = await supabase.from("tutor_pay_rules").select("*").maybeSingle();
  if (error) return fail(error);
  return { ok: true, data: toRules(data as Row | null) };
}

export async function savePayRules(r: PayRules): Promise<Result<null>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { error } = await supabase
    .from("tutor_pay_rules")
    .update({
      base_rate_cents: r.baseRateCents,
      raised_rate_cents: r.raisedRateCents,
      min_months: r.minMonths,
      min_avg_rating: r.minAvgRating,
      min_ratings: r.minRatings,
      min_lessons: r.minLessons,
      min_referrals: r.minReferrals,
    })
    .eq("id", true);
  return error ? fail(error) : { ok: true, data: null };
}

// ---------------------------------------------------------------- referrals

export interface Referral {
  id: string;
  email: string;
  createdAt: Date;
}

/** The caller's own referrals (RLS returns only theirs; staff see all). */
export async function loadReferrals(tutorId: string): Promise<Result<Referral[]>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { data, error } = await supabase
    .from("tutor_referrals")
    .select("id, referred_email, created_at")
    .eq("tutor_id", tutorId)
    .order("created_at");
  if (error) return fail(error);
  return { ok: true, data: rows(data).map((r) => ({ id: str(r.id), email: str(r.referred_email), createdAt: date(r.created_at) })) };
}

/** A student the tutor brought in. It counts toward the raise once that student completes a session. */
export async function addReferral(email: string): Promise<Result<null>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { error } = await supabase.from("tutor_referrals").insert({ referred_email: email.trim().toLowerCase() });
  return error ? fail(error) : { ok: true, data: null };
}

export async function removeReferral(id: string): Promise<Result<null>> {
  const supabase = await client();
  if (!supabase) return NOT_READY;
  const { error } = await supabase.from("tutor_referrals").delete().eq("id", id);
  return error ? fail(error) : { ok: true, data: null };
}
