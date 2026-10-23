/**
 * What the Me tab says, as data. No React, no DOM.
 *
 * The same split as hudModel.ts and feedModel.ts: every number on the profile
 * is a function of the journal, so it lives here where a test can pin it, and
 * MeTab.tsx is left with drawing.
 *
 * ONE SOURCE FOR EVERY NUMBER. The round 3 profile read `lessons` (which the
 * dev beta flag fills with synthetic records) beside `activeDays` (which it
 * does not), so it said "32 lessons closed" next to "0 active days". Every
 * figure here comes from the student's REAL journal and the economy derived
 * from it (`snapshot.economy`), so the figures cannot disagree with each other.
 *
 * WHAT "REAL" MEANS. app/progress.ts applies the dev beta flag by prepending
 * preview events stamped at the Unix epoch (its BETA_COMPLETED_AT). Nobody
 * studied in 1970, so an event at or before the epoch is a preview, never a
 * record, and `realJournal` drops it.
 */

import {
  DAILY_GOAL_XP,
  MASTERY_RANKS,
  STREAK_MILESTONES,
  addDays,
  deriveEconomy,
  endOfLocalDayMs,
  localDate,
  type DailyGoalTier,
  type EconomyEvent,
  type EconomySnapshot,
} from "@blueberry/economy";
import { plural } from "@/lib/helpers";

/** The journal without the beta preview's epoch stamped events. */
export function realJournal(journal: readonly EconomyEvent[]): readonly EconomyEvent[] {
  return journal.filter((event) => Date.parse(event.at) > 0);
}

/* ------------------------------------------------------------ identity -- */

/** "Joined October 2026" from the first real event, or null when there is none yet. */
export function joinedLabel(journal: readonly EconomyEvent[]): string | null {
  let first = Number.POSITIVE_INFINITY;
  for (const event of journal) {
    const ms = Date.parse(event.at);
    if (ms > 0 && ms < first) first = ms;
  }
  if (!Number.isFinite(first)) return null;
  const month = new Date(first).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return `Joined ${month}`;
}

/** A display name as saved: single spaces, trimmed, at most 32 characters. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 32);
}

/* ---------------------------------------------------------- week of XP -- */

export interface XpDay {
  readonly date: string;
  /** Narrow weekday letter, M T W T F S S. */
  readonly letter: string;
  readonly xp: number;
  readonly today: boolean;
}

const LETTER = new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" });

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/**
 * XP earned on each of the last seven local days, oldest first.
 *
 * DERIVED, NEVER SUMMED BY HAND. XP has rules a hand sum would miss (a replay
 * pays less than a first clear, the goal bonus lands once a day), so each day's
 * figure is the economy's own total at the end of that day minus its total at
 * the end of the day before. Eight derivations over the real journal; the last
 * day is cut at `nowMs`, so today's bar equals `economy.xp.today`.
 */
export function lastSevenDaysXp(journal: readonly EconomyEvent[], tz: string, nowMs: number): readonly XpDay[] {
  const real = realJournal(journal);
  const today = localDate(nowMs, tz);
  const totalAt = (date: string): number => {
    const cut = Math.min(endOfLocalDayMs(date, tz), nowMs);
    const upTo = real.filter((event) => Date.parse(event.at) <= cut);
    if (upTo.length === 0) return 0;
    return deriveEconomy(upTo, new Date(cut).toISOString()).xp.total;
  };
  const days: XpDay[] = [];
  let before = totalAt(addDays(today, -7));
  for (let back = 6; back >= 0; back -= 1) {
    const date = addDays(today, -back);
    const after = totalAt(date);
    days.push({ date, letter: LETTER.format(new Date(`${date}T12:00:00Z`)), xp: Math.max(0, after - before), today: back === 0 });
    before = after;
  }
  return days;
}

/* ------------------------------------------------------- the month grid -- */

export interface CalendarCell {
  /** Null for the blank cells before the 1st and after the last day. */
  readonly date: string | null;
  readonly day: number;
  readonly active: boolean;
  /** The daily goal was met: a streak day. Always also `active`. */
  readonly goal: boolean;
  readonly today: boolean;
  readonly future: boolean;
}

/** "2026-10" plus `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function monthTitle(month: string): string {
  return new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * The month as Monday first weeks. A day is `active` when the journal has any
 * real event on it, which is the same rule progress.ts uses for activeDays.
 */
export function monthGrid(
  month: string,
  activeDays: readonly string[],
  today: string,
  goalDays: ReadonlySet<string> = new Set(),
): readonly (readonly CalendarCell[])[] {
  const active = new Set(activeDays);
  const first = `${month}-01`;
  const lead = (weekdayOf(first) + 6) % 7; // Monday = 0
  const cells: CalendarCell[] = [];
  for (let i = 0; i < lead; i += 1) cells.push({ date: null, day: 0, active: false, goal: false, today: false, future: false });
  for (let date = first; date.startsWith(month); date = addDays(date, 1)) {
    cells.push({ date, day: Number(date.slice(8)), active: active.has(date), goal: goalDays.has(date), today: date === today, future: date > today });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: 0, active: false, goal: false, today: false, future: false });
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Days in the month the student studied. */
export function activeCount(month: string, activeDays: readonly string[]): number {
  return activeDays.filter((date) => date.startsWith(month)).length;
}

/* ------------------------------------------------------- achievements -- */

export type BadgeColour = "orange" | "yellow" | "purple" | "green" | "blue";

export interface Badge {
  readonly id: string;
  readonly title: string;
  readonly colour: BadgeColour;
  /** Tiers reached, 0 when the first is still ahead. */
  readonly level: number;
  readonly maxLevel: number;
  /** Where the student is, and the next tier's target. Equal at the top. */
  readonly value: number;
  readonly target: number;
  /** One line saying what the next tier asks for, or that it is complete. */
  readonly line: string;
  /**
   * A word printed before the count when the count is not "right now", so a
   * best-ever streak of 2 beside a current streak of 1 does not read as a
   * contradiction. Empty for every other badge.
   */
  readonly countLabel: string;
}

function tiered(
  id: string,
  title: string,
  colour: BadgeColour,
  value: number,
  tiers: readonly number[],
  next: (target: number) => string,
): Badge {
  const level = tiers.filter((tier) => value >= tier).length;
  const top = level >= tiers.length;
  const target = top ? (tiers[tiers.length - 1] as number) : (tiers[level] as number);
  return { id, title, colour, level, maxLevel: tiers.length, value: Math.min(value, target), target, line: top ? "Every level earned" : next(target), countLabel: "" };
}

const CLEAR_TIERS = [1, 5, 10, 25, 50, 100] as const;
const CARD_RUN_TIERS = [1, 5, 15, 40, 100] as const;
const XP_TIERS = [50, 250, 1000, 2500, 5000, 10000] as const;

/**
 * Five badges, each a ladder of levels read from the real journal.
 *
 * The streak ladder IS the economy's own STREAK_MILESTONES and the rank ladder
 * IS MASTERY_RANKS, so a badge level and the reward moment that fired for it
 * can never disagree. The other three ladders are display only: they pay
 * nothing, so they are free to be friendly round numbers.
 */
export function badgesFor(economy: EconomySnapshot, journal: readonly EconomyEvent[]): readonly Badge[] {
  const real = realJournal(journal);
  const clears = Object.keys(economy.firstClears).length;
  const cardRuns = real.filter((event) => event.kind === "cards_reviewed").length;

  const rankIndex = Math.max(0, MASTERY_RANKS.findIndex((rank) => rank.name === economy.mastery.floorRank));
  const nextRank = MASTERY_RANKS[rankIndex + 1];
  const rankBadge: Badge = {
    id: "rank",
    title: MASTERY_RANKS[rankIndex]?.name ?? "Reader",
    colour: "purple",
    level: rankIndex,
    maxLevel: MASTERY_RANKS.length - 1,
    value: nextRank === undefined ? 100 : Math.floor(Math.min(economy.mastery.visible, nextRank.at)),
    target: nextRank === undefined ? 100 : nextRank.at,
    line: nextRank === undefined ? "Top rank reached" : `Reach ${nextRank.at} mastery to become ${nextRank.name}`,
    countLabel: "",
  };

  // The streak ladder is earned by the BEST run ever, not today's, so its
  // count says "Best" and its line names the number outright.
  const best = economy.streak.best;
  const streakBadge: Badge = {
    ...tiered("streak", "On fire", "orange", best, STREAK_MILESTONES, (t) => `Best streak ${plural(best, "day", "days")}. Reach ${t} to level up`),
    countLabel: "Best",
  };

  return [
    streakBadge,
    rankBadge,
    tiered("clears", "Pathfinder", "green", clears, CLEAR_TIERS, (t) => `Finish ${plural(t, "lesson", "lessons")} for the first time`),
    tiered("cards", "Card sharp", "blue", cardRuns, CARD_RUN_TIERS, (t) => `Finish ${t} card ${t === 1 ? "review" : "reviews"}`),
    tiered("xp", "Scholar", "yellow", economy.xp.total, XP_TIERS, (t) => `Earn ${t.toLocaleString("en-US")} XP`),
  ];
}

/* ------------------------------------------------------------ settings -- */

export interface GoalOption {
  readonly tier: DailyGoalTier;
  readonly label: string;
  readonly xp: number;
}

/** The goal picker's options. Exam mode exists only inside the exam window (ECONOMY.md). */
export function goalOptions(examWindow: boolean): readonly GoalOption[] {
  const base: GoalOption[] = [
    { tier: "casual", label: "Casual", xp: DAILY_GOAL_XP.casual },
    { tier: "regular", label: "Regular", xp: DAILY_GOAL_XP.regular },
    { tier: "serious", label: "Serious", xp: DAILY_GOAL_XP.serious },
  ];
  if (examWindow) base.push({ tier: "exam", label: "Exam", xp: DAILY_GOAL_XP.exam });
  return base;
}

/** The exam date the student last saved, or null. Read from the journal's settings events. */
export function examDateFrom(journal: readonly EconomyEvent[]): string | null {
  let found: string | null = null;
  for (const event of journal) {
    if (event.kind === "settings" && event.examDate !== undefined) found = event.examDate;
  }
  return found;
}

/**
 * The local dates the student STUDIED on, sorted.
 *
 * Narrower than progress.ts's activeDays on purpose: that list counts any
 * event, so changing the daily goal on a settings screen would light a day on
 * the calendar. A settings event is not studying, so it is left out here.
 */
export function studyDays(journal: readonly EconomyEvent[]): readonly string[] {
  const days = new Set<string>();
  for (const event of realJournal(journal)) {
    if (event.kind === "settings") continue;
    const ms = Date.parse(event.at);
    if (Number.isFinite(ms)) days.add(localDate(ms, event.tz));
  }
  return [...days].sort();
}

/**
 * The days in `month` on which the daily goal was met, which are the days
 * that count toward the streak. Read from the economy itself: one derivation
 * at the end of each day of the month (cut at `nowMs` for today), asking
 * `xp.goalMet`. A day the student studied but did not reach the goal is NOT
 * in this set, so the calendar can tell "studied" from "streak day" and never
 * draws a five day run beside a one day streak.
 */
export function goalDaysInMonth(journal: readonly EconomyEvent[], tz: string, month: string, nowMs: number): ReadonlySet<string> {
  const real = realJournal(journal);
  const met = new Set<string>();
  const today = localDate(nowMs, tz);
  for (let date = `${month}-01`; date.startsWith(month) && date <= today; date = addDays(date, 1)) {
    const cut = Math.min(endOfLocalDayMs(date, tz), nowMs);
    const upTo = real.filter((event) => Date.parse(event.at) <= cut);
    if (upTo.length === 0) continue;
    // Only a day with a real event of its own can have met its goal.
    if (!upTo.some((event) => localDate(Date.parse(event.at), event.tz) === date)) continue;
    if (deriveEconomy(upTo, new Date(cut).toISOString()).xp.goalMet) met.add(date);
  }
  return met;
}
