import { postToAppsScript } from "@/lib/appsScript";
import { supabase } from "@/lib/supabase";
import { describeWrite } from "@/lib/useCourse";
import type { CourseDate, CourseDateKind } from "@/components/ui/event-manager";

/**
 * The calendar's data layer.
 *
 * Dates cross the wire as ISO strings and become `Date` objects here, in one
 * place. Doing it at each call site is how you end up with a component that
 * works until someone hands it a row straight from the sheet and it tries to
 * call `.getTime()` on a string.
 *
 * Reading and writing dates is Supabase now, so staff signed in here can
 * actually save. Importing a syllabus is still Apps Script, because that call
 * is really a call to Claude with the API key in Script Properties, and moving
 * it needs an Edge Function rather than a table.
 */

const KINDS: CourseDateKind[] = [
  "exam",
  "quiz",
  "assignment",
  "lecture",
  "lab",
  "office-hours",
];

/** A row as the sheet and the model both speak it. */
export interface WireDate {
  id?: string;
  title: string;
  kind: string;
  start: string;
  end?: string;
  detail?: string;
}

/**
 * Wire row to `CourseDate`, or null if the date is unusable.
 *
 * Returning null rather than an Invalid Date matters: one bad row from a
 * hand-edited sheet would otherwise render as "NaN" across the grid and take
 * the sort order with it.
 */
export function fromWire(row: WireDate, fallbackId: string): CourseDate | null {
  const start = new Date(row.start);
  if (Number.isNaN(start.getTime())) return null;

  const end = row.end ? new Date(row.end) : undefined;
  const kind = (KINDS as string[]).includes(row.kind)
    ? (row.kind as CourseDateKind)
    : "assignment";

  return {
    id: row.id?.trim() || fallbackId,
    title: row.title,
    kind,
    start,
    end: end && !Number.isNaN(end.getTime()) ? end : undefined,
    detail: row.detail?.trim() || undefined,
  };
}

/**
 * Local wall-clock, deliberately not `toISOString`.
 *
 * A 9am exam stored as UTC comes back as 9am UTC — which is 4am in College
 * Park in the autumn, and 5am in the spring. The sheet holds the time the
 * syllabus printed, with no zone attached.
 */
export function toWire(d: CourseDate): WireDate {
  const local = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return {
    id: d.id,
    title: d.title,
    kind: d.kind,
    start: local(d.start),
    end: d.end ? local(d.end) : "",
    detail: d.detail ?? "",
  };
}

function parseAll(rows: unknown): CourseDate[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row, i) => fromWire(row as WireDate, `row-${i}`))
    .filter((d): d is CourseDate => d !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** A `course_dates` row, which is `WireDate` under Postgres' column names. */
interface DateRow {
  id: string;
  title: string;
  kind: string;
  start_at: string;
  end_at: string | null;
  detail: string | null;
}

const rowToWire = (r: DateRow): WireDate => ({
  id: r.id,
  title: r.title,
  kind: r.kind,
  start: r.start_at,
  end: r.end_at ?? undefined,
  detail: r.detail ?? undefined,
});

/** Draft rows are keyed `draft-0`; saved ones are uuids. Only the latter exist. */
const isUuid = (v: string | undefined): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Reads every date. Signed out is fine: the policy allows `anon` to select. */
export async function loadDates(_idToken?: string | null): Promise<{
  dates: CourseDate[];
  error?: string;
}> {
  if (!supabase) return { dates: [], error: "The calendar backend is not set up yet." };

  const { data, error } = await supabase
    .from("course_dates")
    .select("id, title, kind, start_at, end_at, detail")
    .order("start_at");

  if (error) return { dates: [], error: describeWrite(error) };
  return { dates: parseAll((data ?? []).map((r) => rowToWire(r as DateRow))) };
}

/**
 * Adds or updates the dates it is given, and touches nothing else.
 *
 * **Additive on purpose.** The name reads like "make the calendar be this", and
 * an earlier version of this function obliged: it upserted the list and then
 * deleted every row not in it. The editor calls this with a *single* date when
 * you save one event, so that version would have wiped the entire calendar on
 * the first edit and reported success. Removal has its own function, which is
 * the only thing that should ever delete.
 *
 * Rows that already carry a uuid are updated in place; rows without one are new
 * and let the column default generate the id.
 */
export async function saveDates(
  dates: CourseDate[],
  _idToken?: string | null,
): Promise<{ dates: CourseDate[]; error?: string }> {
  if (!supabase) return { dates: [], error: "The calendar backend is not set up yet." };
  if (!dates.length) return loadDates();

  const rows = dates.map((d) => {
    const wire = toWire(d);
    return {
      // A draft row carries a placeholder id like `draft-0`, which is not a
      // uuid and would be rejected by the column type.
      ...(isUuid(wire.id) ? { id: wire.id } : {}),
      title: wire.title,
      kind: wire.kind,
      start_at: wire.start,
      end_at: wire.end || null,
      detail: wire.detail || null,
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase.from("course_dates").upsert(rows);
  if (error) return { dates: [], error: describeWrite(error) };

  return loadDates();
}

export async function deleteDate(
  id: string,
  _idToken?: string | null,
): Promise<{ dates: CourseDate[]; error?: string }> {
  if (!supabase) return { dates: [], error: "The calendar backend is not set up yet." };

  const { error } = await supabase.from("course_dates").delete().eq("id", id);
  if (error) return { dates: [], error: describeWrite(error) };
  return loadDates();
}

/**
 * A syllabus PDF in, unsaved rows out.
 *
 * Nothing is written by this call. What comes back is a proposal to look at,
 * and saving is a separate, deliberate step — see `CalendarPage`.
 */
export async function importSyllabus(
  file: File,
  idToken: string | null,
): Promise<{ dates: CourseDate[]; error?: string }> {
  let pdf: string;
  try {
    pdf = await toBase64(file);
  } catch {
    return { dates: [], error: "That file could not be read." };
  }

  const body = await postToAppsScript("importPdf", { idToken, pdf });
  if (!body.ok) return { dates: [], error: describe(body.error) };

  // Extracted rows have no id yet — they are not saved, so they have no row to
  // be keyed by. A temporary one keeps React's list reconciliation honest.
  const rows = Array.isArray(body.dates) ? body.dates : [];
  return {
    dates: rows
      .map((row, i) => fromWire(row as WireDate, `draft-${i}`))
      .filter((d): d is CourseDate => d !== null)
      .sort((a, b) => a.start.getTime() - b.start.getTime()),
  };
}

/** Strips the `data:application/pdf;base64,` prefix the API does not want. */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

/** Backend error codes are not sentences. */
function describe(error: unknown): string {
  if (error === "not-configured") return "The calendar backend is not set up yet.";
  if (error === "unreachable") return "Could not reach the server. Check the connection.";
  return typeof error === "string" && error ? error : "That did not work.";
}
