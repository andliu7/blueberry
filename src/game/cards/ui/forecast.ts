/**
 * The seven-day forecast on the Cards home: how many cards come due each day.
 *
 * WHY IT IS ON THE HOME AND NOT IN A STATS PAGE. Anki keeps its forecast three
 * menus deep. A student deciding whether to do twenty cards tonight wants to
 * know that tomorrow holds forty, and the number is cheap: it is a read of
 * `dueAt` over the store, nothing more.
 *
 * DAY 0 IS THE HERO'S NUMBER, BY CONSTRUCTION. Today's bar is
 * `reviewQueue(...).length`, the same computation the start button plays
 * (landing.ts), so the bar and the button cannot disagree. Later days count
 * scheduled cards whose `dueAt` falls inside that LOCAL day, suspended cards
 * skipped, exactly the rule `dueEverywhere` applies to today.
 *
 * Pure: `now` is an argument, per the wall-clock rule.
 */

import type { SavedMistake } from "../../tabs/trainer/mistakes";
import { endOfLocalDay } from "../scheduler";
import type { DeckSnapshot } from "../types";
import { isSuspended } from "../types";
import { reviewQueue } from "./landing";

export interface ForecastDay {
  /** "Today", then short weekday names. */
  readonly label: string;
  readonly count: number;
}

export const FORECAST_DAYS = 7;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function dueForecast(
  snapshot: DeckSnapshot,
  mistakes: readonly SavedMistake[],
  now: Date,
  days: number = FORECAST_DAYS,
): readonly ForecastDay[] {
  const out: ForecastDay[] = [{ label: "Today", count: reviewQueue(snapshot, mistakes, now).length }];
  for (let offset = 1; offset < days; offset += 1) {
    // The local Date constructor, so a day is a calendar day even across a
    // daylight saving change; adding 24h in milliseconds is not.
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
    const start = endOfLocalDay(new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1, 12)).getTime();
    const end = endOfLocalDay(day).getTime();
    let count = 0;
    for (const state of Object.values(snapshot.review)) {
      if (snapshot.cards[state.cardId] === undefined || isSuspended(state)) continue;
      const due = Date.parse(state.dueAt);
      if (due > start && due <= end) count += 1;
    }
    out.push({ label: WEEKDAYS[day.getDay()] ?? "", count });
  }
  return out;
}
