/**
 * Open tutoring hours, as plain functions.
 *
 * Mirrors tutor_open_slots and the tutor_bookings_no_overlap constraint in
 * supabase/migrations/20261024120000_tutoring.sql. The database is what
 * decides; this copy exists so the rules (half-open hours, cancelled bookings
 * free their hour, weekly hours are wall clock in the tutor's zone) are pinned
 * by tests that run without a database.
 */

/** One session is one hour. */
export const SLOT_MINUTES = 60;

/** A weekly rule: weekday 0 is Sunday, minutes from local midnight. */
export interface AvailabilityRule {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

/** Time off: a blocked window. */
export interface Block {
  start: Date;
  end: Date;
}

export type BookingStatus = "booked" | "cancelled" | "completed" | "no_show";

export interface Taken {
  start: Date;
  end: Date;
  status: BookingStatus;
}

/** Half-open, like tstzrange '[)': 10:00-11:00 and 11:00-12:00 do not overlap. */
export const overlaps = (a: Block, b: Block) =>
  a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();

/** The constraint's `where (status <> 'cancelled')`: a no-show still held the hour. */
export const blocksSlot = (taken: Taken, cand: Block) => taken.status !== "cancelled" && overlaps(taken, cand);

const formatters = new Map<string, Intl.DateTimeFormat>();
function partsIn(instant: Date, timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(instant)) if (part.type !== "literal") p[part.type] = Number(part.value);
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** How far the zone's wall clock is ahead of UTC at an instant, in ms. */
function offsetMs(instant: Date, timeZone: string): number {
  const p = partsIn(instant, timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * A wall-clock time in a zone to an instant: `("2026-10-30", 840, "America/New_York")`
 * is 14:00 that day in New York, 18:00Z. Guess with the offset at the naive
 * instant, then correct once with the offset at the guess, which settles it
 * on either side of a daylight-saving change.
 */
export function wallToInstant(ymd: string, minute: number, timeZone: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, 0, minute);
  const first = naive - offsetMs(new Date(naive), timeZone);
  return new Date(naive - offsetMs(new Date(first), timeZone));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The local date of an instant in a zone, "2026-10-30". */
export function localYmd(instant: Date, timeZone: string): string {
  const p = partsIn(instant, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

const weekdayOf = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/**
 * Every open hour for one tutor in [from, to): weekly rules expanded day by day
 * in the tutor's zone (starting a day early, as the SQL does, so an evening
 * rule that lands after midnight UTC is not missed), minus time off, minus
 * live bookings, minus anything not after `now`.
 */
export function openSlots(
  rules: AvailabilityRule[],
  blocks: Block[],
  taken: Taken[],
  from: Date,
  to: Date,
  now: Date,
  timeZone: string,
): Block[] {
  const lo = Math.max(from.getTime(), now.getTime());
  const out = new Map<number, Block>();
  const last = localYmd(to, timeZone);
  for (let day = addDays(localYmd(new Date(lo), timeZone), -1); day <= last; day = addDays(day, 1)) {
    const wd = weekdayOf(day);
    for (const r of rules) {
      if (r.weekday !== wd) continue;
      for (let m = r.startMinute; m + SLOT_MINUTES <= r.endMinute; m += SLOT_MINUTES) {
        const start = wallToInstant(day, m, timeZone);
        const t = start.getTime();
        if (t < lo || t >= to.getTime() || t <= now.getTime()) continue;
        const cand = { start, end: new Date(t + SLOT_MINUTES * 60_000) };
        if (blocks.some((b) => overlaps(b, cand))) continue;
        if (taken.some((b) => blocksSlot(b, cand))) continue;
        out.set(t, cand);
      }
    }
  }
  return [...out.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Painted hours back to weekly rules: one-hour cells `{ weekday, minute }`
 * merged into runs, so Tuesday 14:00, 15:00 and 16:00 become one rule,
 * Tuesday 14:00-17:00. What the tutor desk saves (tutor_set_availability).
 */
export function rulesFromHours(cells: { weekday: number; minute: number }[]): AvailabilityRule[] {
  const out: AvailabilityRule[] = [];
  const sorted = [...new Map(cells.map((c) => [`${c.weekday}:${c.minute}`, c])).values()].sort(
    (a, b) => a.weekday - b.weekday || a.minute - b.minute,
  );
  for (const c of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.weekday === c.weekday && prev.endMinute === c.minute) prev.endMinute += SLOT_MINUTES;
    else out.push({ weekday: c.weekday, startMinute: c.minute, endMinute: c.minute + SLOT_MINUTES });
  }
  return out;
}

/** The other way: each rule's one-hour cells. */
export function hoursFromRules(rules: AvailabilityRule[]): { weekday: number; minute: number }[] {
  return rules.flatMap((r) => {
    const cells: { weekday: number; minute: number }[] = [];
    for (let m = r.startMinute; m + SLOT_MINUTES <= r.endMinute; m += SLOT_MINUTES) cells.push({ weekday: r.weekday, minute: m });
    return cells;
  });
}
