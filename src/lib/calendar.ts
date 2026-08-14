import { postToAppsScript } from "@/lib/appsScript";
import type { CourseDate, CourseDateKind } from "@/components/ui/event-manager";

/**
 * The calendar's data layer.
 *
 * Dates cross the wire as ISO strings and become `Date` objects here, in one
 * place. Doing it at each call site is how you end up with a component that
 * works until someone hands it a row straight from the sheet and it tries to
 * call `.getTime()` on a string.
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

export async function loadDates(idToken: string | null): Promise<{
  dates: CourseDate[];
  error?: string;
}> {
  const body = await postToAppsScript("listDates", { idToken });
  if (!body.ok) return { dates: [], error: describe(body.error) };
  return { dates: parseAll(body.dates) };
}

export async function saveDates(
  dates: CourseDate[],
  idToken: string | null,
): Promise<{ dates: CourseDate[]; error?: string }> {
  const body = await postToAppsScript("saveDates", {
    idToken,
    dates: dates.map(toWire),
  });
  if (!body.ok) return { dates: [], error: describe(body.error) };
  return { dates: parseAll(body.dates) };
}

export async function deleteDate(
  id: string,
  idToken: string | null,
): Promise<{ dates: CourseDate[]; error?: string }> {
  const body = await postToAppsScript("deleteDate", { idToken, id });
  if (!body.ok) return { dates: [], error: describe(body.error) };
  return { dates: parseAll(body.dates) };
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
