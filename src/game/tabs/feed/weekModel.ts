/**
 * "Your week": the seven days around today and three real counts, from the
 * student's own journal. It replaces the sample friend posts: with no friend
 * accounts open, the Feed shows numbers that are true on this device.
 *
 * Day marks use the same arithmetic as streakPageModel (counted, covered, missed). Pure, no DOM.
 */

import { addDays, deriveEconomy, endOfLocalDayMs, localDate, type EconomyEvent } from "@blueberry/economy";
import type { StreakMonthKind } from "../../lesson/streakModel";

export interface WeekDay {
  readonly date: string;
  readonly letter: string;
  readonly kind: StreakMonthKind;
  readonly today: boolean;
}

export interface WeekModel {
  readonly days: readonly WeekDay[];
  readonly practiced: number;
  readonly lessons: number;
  readonly cards: number;
  /** Nothing to count yet, so the card says so rather than showing three zeros. */
  readonly empty: boolean;
}

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function weekModel(journal: readonly EconomyEvent[], now: string): WeekModel {
  const snapshot = deriveEconomy(journal, now);
  const today = localDate(Date.parse(now), snapshot.tz);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const start = addDays(today, -dow);

  // One derive per day up to today (at most seven), not a month: the Feed
  // re-runs this whenever the journal changes. The same arithmetic as the
  // streak page: a day that did not count but left the run alive was covered.
  const dates = LETTERS.map((_, i) => addDays(start, i)).filter((d) => d <= today);
  const snaps = dates.map((d) => {
    if (d === today) return snapshot;
    const cutoff = endOfLocalDayMs(d, snapshot.tz);
    const upTo = journal.filter((e) => {
      const ms = Date.parse(e.at);
      return Number.isFinite(ms) && ms <= cutoff;
    });
    return deriveEconomy(upTo, new Date(cutoff).toISOString());
  });
  const counted = snaps.map((s) => s.streak.todayCounted);
  const kinds = new Map<string, StreakMonthKind>();
  dates.forEach((date, i) => {
    if (counted[i] === true) kinds.set(date, "counted");
    else if (date === today) kinds.set(date, "pending");
    else {
      const next = snaps[i + 1];
      const after = next === undefined ? 0 : next.streak.current - (counted[i + 1] === true ? 1 : 0);
      kinds.set(date, after > 0 ? "freeze" : "missed");
    }
  });

  const days: WeekDay[] = LETTERS.map((letter, i) => {
    const date = addDays(start, i);
    return { date, letter, kind: date > today ? "future" : (kinds.get(date) ?? "future"), today: date === today };
  });

  let lessons = 0;
  let cards = 0;
  for (const event of journal) {
    if (!(Date.parse(event.at) > 0)) continue;
    const date = localDate(Date.parse(event.at), event.tz);
    if (date < start || date > today) continue;
    if (event.kind === "node_cleared") lessons += 1;
    else if (event.kind === "cards_reviewed") cards += event.graded;
  }
  const practiced = days.filter((d) => d.kind === "counted").length;
  return { days, practiced, lessons, cards, empty: practiced === 0 && lessons === 0 && cards === 0 };
}
