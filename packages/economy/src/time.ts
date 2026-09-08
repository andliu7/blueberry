/**
 * Local dates without a date library.
 *
 * docs/ECONOMY.md, Anti-abuse: "Streak days are derived from attempt timestamps
 * in the user's stored timezone, so a client clock cannot manufacture one." That
 * makes the timezone a first class input rather than an ambient setting, so
 * every function here takes the zone explicitly and none of them reads the
 * host's.
 *
 * Intl.DateTimeFormat is the whole implementation. It ships in every runtime
 * this package targets, it carries the IANA database including historical DST
 * rules, and it means no dependency. The one thing it does not do directly is
 * the inverse: given a local wall clock time, which absolute instant is that.
 * `zonedWallTimeToMs` does that by fixed point iteration, which is the standard
 * trick and is exact after two rounds for every real zone offset.
 *
 * Dates are plain "YYYY-MM-DD" strings throughout. Arithmetic on them goes
 * through UTC midnight, which is safe precisely because a civil date has no
 * offset to get wrong.
 */

const DAY_MS = 86_400_000;

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(tz: string): Intl.DateTimeFormat {
  const cached = dateFormatters.get(tz);
  if (cached !== undefined) return cached;
  // en-CA formats as YYYY-MM-DD, which is the shape we store.
  const made = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  dateFormatters.set(tz, made);
  return made;
}

function partsFormatter(tz: string): Intl.DateTimeFormat {
  const cached = partsFormatters.get(tz);
  if (cached !== undefined) return cached;
  const made = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  partsFormatters.set(tz, made);
  return made;
}

/** A zone the runtime does not know is a corrupt journal, not a crash. Fall back to UTC. */
export function safeZone(tz: string): string {
  try {
    dateFormatter(tz);
    return tz;
  } catch {
    return "UTC";
  }
}

/** The student's local calendar date for an instant. */
export function localDate(ms: number, tz: string): string {
  return dateFormatter(safeZone(tz)).format(new Date(ms));
}

interface WallClock {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

function wallClock(ms: number, tz: string): WallClock {
  const parts = partsFormatter(safeZone(tz)).formatToParts(new Date(ms));
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((part) => part.type === type);
    return found === undefined ? 0 : Number(found.value);
  };
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/** The student's local hour, 0 to 23. The streak's at risk check reads this. */
export function localHour(ms: number, tz: string): number {
  return wallClock(ms, tz).hour;
}

/**
 * The wall clock reading in `tz`, expressed as if it were UTC. Offset arithmetic
 * only.
 *
 * The sub-second part is carried over from the input rather than read from the
 * formatter, which does not offer it everywhere. Every zone offset in use is a
 * whole number of minutes, so local milliseconds and UTC milliseconds are the
 * same number. Dropping them instead would leave a sub-second error in the
 * offset, and `zonedWallTimeToMs` would then walk past midnight on the day
 * daylight saving ends.
 */
function wallAsUtcMs(ms: number, tz: string): number {
  const w = wallClock(ms, tz);
  const subSecond = ((ms % 1000) + 1000) % 1000;
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second, subSecond);
}

/**
 * The instant at which the wall clock in `tz` reads the given civil date and
 * time. Two rounds of fixed point: the first correction lands inside an hour of
 * the answer even across a DST jump, and the second settles it.
 */
export function zonedWallTimeToMs(date: string, hour: number, minute: number, second: number, ms: number, tz: string): number {
  const zone = safeZone(tz);
  const target = Date.parse(`${date}T00:00:00Z`) + hour * 3_600_000 + minute * 60_000 + second * 1000 + ms;
  let guess = target;
  for (let round = 0; round < 2; round += 1) {
    const offset = wallAsUtcMs(guess, zone) - guess;
    guess = target - offset;
  }
  return guess;
}

/** The last instant that still belongs to this local day. The mastery replay samples here. */
export function endOfLocalDayMs(date: string, tz: string): number {
  return zonedWallTimeToMs(date, 23, 59, 59, 999, tz);
}

/** Civil date arithmetic. Days are whole days; no offset can make them otherwise. */
export function addDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Every civil date from `from` to `to` inclusive. Empty when `to` precedes `from`. */
export function dateRange(from: string, to: string): readonly string[] {
  const span = daysBetween(from, to);
  if (span < 0) return [];
  const out: string[] = [];
  for (let i = 0; i <= span; i += 1) out.push(addDays(from, i));
  return out;
}

/**
 * ISO 8601 week key, "2026-W35". The rest day is one per ISO week, so weeks have
 * to agree with what a student's calendar shows, and ISO weeks start on Monday.
 */
export function isoWeekKey(date: string): string {
  const d = new Date(Date.parse(`${date}T00:00:00Z`));
  const dayIndex = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayIndex + 3);
  const isoYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Calendar month key, "2026-08". Streak repair is capped at one per month. */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export const MS_PER_DAY = DAY_MS;
