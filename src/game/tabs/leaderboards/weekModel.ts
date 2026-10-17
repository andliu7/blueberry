/**
 * The student's own XP for each day of this week, Monday to Sunday, the
 * window a weekly league ranks on. Pure: journal and clock in, numbers out.
 *
 * Each day's number is the economy's own `xp.today` read at the end of that
 * day, so it is exactly what the HUD showed that evening (goal bonus
 * included). Nothing is estimated and nothing is invented.
 */

import { addDays, deriveEconomy, endOfLocalDayMs, localDate, type EconomyEvent } from "@blueberry/economy";

export interface WeekDay {
  readonly date: string;
  /** One letter, M T W T F S S. */
  readonly letter: string;
  readonly xp: number;
  readonly isToday: boolean;
  /** Later this week: drawn as an empty slot, never as a zero that already happened. */
  readonly ahead: boolean;
}

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export function weekXp(journal: readonly EconomyEvent[], nowMs: number, tz: string): { readonly days: readonly WeekDay[]; readonly total: number } {
  const today = localDate(nowMs, tz);
  const mondayOffset = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(today, -mondayOffset);
  const days = LETTERS.map((letter, index): WeekDay => {
    const date = addDays(monday, index);
    const ahead = index > mondayOffset;
    const xp = ahead || journal.length === 0 ? 0 : deriveEconomy(journal, new Date(Math.min(nowMs, endOfLocalDayMs(date, tz) - 1)).toISOString()).xp.today;
    return { date, letter, xp, isToday: index === mondayOffset, ahead };
  });
  return { days, total: days.reduce((sum, day) => sum + day.xp, 0) };
}

/*
 * weekXp replays the whole journal seven times, so it is worth not repeating.
 * A snapshot's journal array can be rebuilt on every store write (the beta
 * flags prepend fresh synthetic events each time), which made a useMemo on
 * the array itself re-run all seven replays on every unrelated save. The
 * answer only changes when an event is added or the day rolls over, so that
 * is the cache key: length, newest stamp, today's date and zone.
 */
let cache: { readonly key: string; readonly week: ReturnType<typeof weekXp> } | null = null;

export function weekXpCached(journal: readonly EconomyEvent[], nowMs: number, tz: string): ReturnType<typeof weekXp> {
  const key = `${journal.length}|${journal.at(-1)?.at ?? ""}|${localDate(nowMs, tz)}|${tz}`;
  if (cache === null || cache.key !== key) cache = { key, week: weekXp(journal, nowMs, tz) };
  return cache.week;
}
