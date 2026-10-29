/**
 * The celebration pages fed from a real lesson clear. Pure: the lesson player
 * hands in what the store and the stopwatch already know and gets back one
 * Celebration (the same shape the gallery draws) always: a plain clear gets the
 * lesson-complete page.
 *
 * One page at most, picked by priority so a student never meets a stack of
 * them: level up, streak milestone, perfect run, then the encouraging miss.
 * Every number on a tile is a real one: XP from the receipt, accuracy from the
 * session tally, time from the stopwatch, streak and level from the store.
 * Voice (blueberry voice.md): no guilt, no countdowns, at most one "!".
 */
import type { Receipt } from "@blueberry/economy";
import { CELEBRATIONS, type Celebration } from "./celebrations";
import { accuracyPercent, celebrationModel } from "./RewardMoment";

export interface LiveCelebrationInput {
  readonly receipt: Receipt;
  readonly correct: number;
  readonly attempted: number;
  readonly elapsedMs: number;
  /** Bloom's level before and after this clear, and total XP after it. */
  readonly stageBefore: number;
  readonly stageAfter: number;
  readonly totalXp: number;
  readonly toNextStage: number;
  /** Today counted for the first time on this clear (the streak engine says so). */
  readonly firstToday?: boolean;
  /** Whole days since the last counted day, read BEFORE the clear. Null when there was none. */
  readonly daysAway?: number | null;
  /** This clear finished a unit: its number, its lessons and the unit that opens next, if any. */
  readonly unit?: { readonly number: number; readonly lessons: number; readonly total: number; readonly nextNumber: number | null };
  /** True when the missed questions were saved to the mistake bank, so "it comes back" is true. */
  readonly missesQueued?: boolean;
}

/** Away this many days or more reads as a comeback. */
export const COMEBACK_DAYS = 3;

/** Whole days from one YYYY-MM-DD date to another, 0 or more. */
export function daysSince(from: string, to: string): number {
  const d = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
  return Number.isFinite(d) ? Math.max(0, d) : 0;
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function base(id: Celebration["id"]): Celebration {
  return CELEBRATIONS.find((c) => c.id === id) as Celebration;
}

export function liveCelebration(input: LiveCelebrationInput): Celebration {
  const { receipt, correct, attempted, elapsedMs, stageBefore, stageAfter, totalXp, toNextStage } = input;
  const m = celebrationModel(receipt, correct, attempted);
  const pct = accuracyPercent(correct, attempted);
  const time = formatElapsed(elapsedMs);
  const goodTile = pct === null ? [] : [{ label: "Good", value: `${pct}%`, tone: "green" as const }];

  if (stageAfter > stageBefore) {
    const c = base("level");
    return {
      ...c,
      title: `Level ${stageAfter}`,
      line: `Your level ${stageAfter}. Bloom did a small dance.`,
      tiles: [
        { label: "Level", value: String(stageAfter), tone: "violet" },
        { label: "Total XP", value: String(totalXp), tone: "gold" },
        { label: "Next level", value: `${toNextStage} XP`, tone: "blue" },
      ],
      count: { from: stageBefore, to: stageAfter, prefix: "Level ", suffix: "" },
    };
  }

  if (m.milestone !== null) {
    const c = base("streak");
    return {
      ...c,
      title: `${m.milestone} days in a row`,
      line: "Every one of those days counted.",
      tiles: [
        { label: "Streak", value: String(m.milestone), tone: "gold" },
        { label: "Total XP", value: String(m.xpTotal), tone: "gold" },
        ...goodTile,
      ],
      count: { from: m.milestone - 1, to: m.milestone, prefix: "", suffix: " day streak" },
    };
  }

  if (input.unit !== undefined) {
    const c = base("unit");
    const u = input.unit;
    const next = u.nextNumber;
    return {
      ...c,
      title: next === null ? `Unit ${u.number} is done` : `Unit ${next} is open`,
      line: next === null ? "That was the last unit on the path so far." : `Unit ${u.number} is done. On to the next one.`,
      tiles: [
        { label: "Lessons", value: `${u.lessons} of ${u.total}`, tone: "green" },
        { label: "Total XP", value: String(totalXp), tone: "gold" },
        ...goodTile,
      ],
      cta: next === null ? "Continue" : `Start Unit ${next}`,
      count: { from: u.number, to: next ?? u.number, prefix: "Unit ", suffix: "" },
    };
  }

  const away = input.daysAway ?? null;
  if (input.firstToday === true && away !== null && away >= COMEBACK_DAYS) {
    const c = base("comeback");
    return {
      ...c,
      line: `${away} days away. Your place was kept.`,
      tiles: [
        { label: "Away", value: `${away} days`, tone: "violet" },
        { label: "Streak", value: String(receipt.streak.current), tone: "gold" },
        { label: "Total XP", value: String(m.xpTotal), tone: "gold" },
      ],
      cta: "Keep going",
      count: { from: 0, to: 1, prefix: "", suffix: " day" },
    };
  }

  const missedFirst = Math.max(0, attempted - correct);
  if (attempted >= 3 && pct !== null && pct < 60) {
    const c = base("miss");
    const queued = input.missesQueued === true;
    return {
      ...c,
      line: queued
        ? "Most people miss it the first time. It comes back in your review."
        : "Most people miss it the first time. Try this lesson again whenever you like.",
      tiles: [
        { label: "Total XP", value: String(m.xpTotal), tone: "gold" },
        { label: "Got right", value: `${correct} of ${attempted}`, tone: "green" },
        { label: queued ? "To review" : "Missed", value: String(missedFirst), tone: "violet" },
      ],
      cta: "Continue",
      count: { from: 0, to: missedFirst, prefix: "", suffix: queued ? " to review" : " missed" },
    };
  }

  if (m.flawless && attempted > 0) {
    const c = base("perfect");
    return {
      ...c,
      tiles: [
        { label: "Total XP", value: String(m.xpTotal), tone: "gold" },
        { label: "Perfect", value: "100%", tone: "green" },
        { label: "Time", value: time, tone: "blue" },
      ],
      count: { from: 0, to: m.xpTotal, prefix: "+", suffix: " XP" },
    };
  }

  if (input.firstToday === true && receipt.streak.current > 0) {
    const c = base("first");
    return {
      ...c,
      tiles: [
        { label: "Streak", value: String(receipt.streak.current), tone: "gold" },
        { label: "Total XP", value: String(m.xpTotal), tone: "gold" },
        ...(pct === null ? [] : [{ label: "Good", value: `${pct}%`, tone: "green" as const }]),
      ],
      count: { from: Math.max(0, receipt.streak.current - 1), to: receipt.streak.current, prefix: "", suffix: " day streak" },
    };
  }

  // Every other clear: the plain lesson-complete page, so no lesson ends without one.
  const c = base("lesson");
  return {
    ...c,
    line: pct !== null && pct >= 80 ? "Solid work. That one is yours now." : "Done. It sticks a little more each time.",
    tiles: [
      { label: "Total XP", value: String(m.xpTotal), tone: "gold" },
      ...(pct === null ? [] : [{ label: "Good", value: `${pct}%`, tone: "green" as const }]),
      { label: "Time", value: time, tone: "blue" },
    ],
    count: { from: 0, to: m.xpTotal, prefix: "+", suffix: " XP" },
  };
}
