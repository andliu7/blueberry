/**
 * Which lessons this browser has opened, so a unit hub can offer the first one
 * not yet read as its one next step (Learn round 2).
 *
 * "Opened" is the only lesson progress the site can see: the game's journal is
 * not read by the site yet, and a lesson page has no end-of-lesson moment to
 * record. It lives in localStorage because it is a per-device convenience, not
 * a record anyone relies on; a private window simply starts every unit at its
 * first lesson. Every access is wrapped, since storage can throw.
 */

const KEY = "blueberry_lessons_opened_v1";

export function lessonsOpened(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function markLessonOpened(id: string): void {
  try {
    const seen = lessonsOpened();
    if (seen.has(id)) return;
    localStorage.setItem(KEY, JSON.stringify([...seen, id]));
  } catch {
    /* Private browsing refuses storage. Nothing to recover. */
  }
}

/**
 * Which lessons this browser has FINISHED (S3 round 2): left through the end block's
 * button (S3 round 3 dropped "scrolled to the end block", which counted skimming). Opening a lesson is not finishing it; a student who
 * opened Lesson 1 and pressed Back was told the next thing to do was Unit 2. Learn's
 * decision card and the unit hubs move on from this set, never from `lessonsOpened`.
 */
const DONE_KEY = "blueberry_lessons_finished_v1";

export function lessonsFinished(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function markLessonFinished(id: string, now: Date = new Date()): void {
  try {
    const done = lessonsFinished();
    if (done.has(id)) return;
    localStorage.setItem(DONE_KEY, JSON.stringify([...done, id]));
    // S3 round 4: and the day it was finished, so Learn's rail can count reading.
    localStorage.setItem(LOG_KEY, JSON.stringify([...readLog(), { id, day: dayKey(now) }]));
  } catch {
    /* Private browsing refuses storage. Nothing to recover. */
  }
}

/**
 * S3 ROUND 4: THE DAYS A LESSON WAS FINISHED ON THIS DEVICE. Learn's rail sat at zero
 * for a student who only reads on the site, because its streak and quests came from the
 * app alone. Each first finish is logged with its local calendar day ("2026-10-16"), so
 * the rail can light the day and the "Finish a lesson" quest. Lessons finished before
 * this log existed have no day, so they count toward the lesson total but light no day:
 * an honest gap, not an invented date.
 */
const LOG_KEY = "blueberry_study_log_v1";

/** A local calendar day as "YYYY-MM-DD", the same day the student's clock shows. */
export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function readLog(): { id: string; day: string }[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const rows: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows)
      ? rows.filter(
          (r): r is { id: string; day: string } =>
            typeof r === "object" && r !== null && typeof r.id === "string" && typeof r.day === "string",
        )
      : [];
  } catch {
    return [];
  }
}

/** How many lessons were finished on each day, keyed by `dayKey`. */
export function lessonsFinishedByDay(): ReadonlyMap<string, number> {
  const byDay = new Map<string, number>();
  for (const row of readLog()) byDay.set(row.day, (byDay.get(row.day) ?? 0) + 1);
  return byDay;
}
