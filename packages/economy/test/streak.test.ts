/**
 * The streak, and the forgiveness budget ECONOMY.md's Supersession section calls
 * load bearing: one free rest day a week, held freezes consumed automatically,
 * a monthly repair, and the exam window dropping the requirement to opening the
 * app. Each of those has a test here, because the file says in as many words
 * that stripping them one at a time turns this into the lock-in loop the owner
 * rejected.
 *
 * Every journal opens with a casual daily goal, which is 10 XP, so one concept
 * node clear is exactly one counted day and the fixtures stay readable.
 * 2026-08-03 is a Monday, so an ISO week in these tests runs 03 to 09.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy } from "../src/derive.ts";
import type { EconomyEvent } from "../src/journal.ts";
import { at, cleared, settings, spend, TZ } from "./helpers.ts";

const START = "2026-08-03";

function day(n: number): string {
  return `2026-08-${String(n).padStart(2, "0")}`;
}

/** A casual goal, then one concept clear on each named day. */
function journalFor(days: readonly number[], extra: readonly EconomyEvent[] = []): readonly EconomyEvent[] {
  return [
    settings(START, { dailyGoal: "casual" }),
    ...days.map((n) => cleared(`n-${n}`, "concept", day(n))),
    ...extra,
  ];
}

function streakOn(days: readonly number[], today: number, extra: readonly EconomyEvent[] = []) {
  return deriveEconomy(journalFor(days, extra), at(day(today), "20:00")).streak;
}

describe("counting a day", () => {
  it("counts a day when the daily XP goal is met, not when the app is opened", () => {
    const opened: readonly EconomyEvent[] = [
      settings(START, { dailyGoal: "regular" }),
      cleared("n1", "concept", day(3)),
    ];
    // 10 XP against a 20 XP goal: work was done, the bar the student set was not met.
    const snapshot = deriveEconomy(opened, at(day(3), "20:00"));
    expect(snapshot.xp.goalMet).toBe(false);
    expect(snapshot.streak.current).toBe(0);
    expect(snapshot.streak.todayCounted).toBe(false);
  });

  it("counts consecutive goal days", () => {
    const streak = streakOn([3, 4, 5, 6, 7], 7);
    expect(streak.current).toBe(5);
    expect(streak.best).toBe(5);
    expect(streak.todayCounted).toBe(true);
    expect(streak.lastCountedDay).toBe(day(7));
  });

  it("does not break the streak merely because today is not finished yet", () => {
    const streak = streakOn([3, 4, 5], 6);
    expect(streak.current).toBe(3);
    expect(streak.todayCounted).toBe(false);
  });

  it("reports at risk only once the local evening has arrived", () => {
    const journal = journalFor([3, 4, 5]);
    expect(deriveEconomy(journal, at(day(6), "10:00")).streak.atRisk).toBe(false);
    expect(deriveEconomy(journal, at(day(6), "18:00")).streak.atRisk).toBe(true);
    expect(deriveEconomy(journal, at(day(6), "23:00")).streak.atRisk).toBe(true);
  });

  it("is never at risk on a day already counted", () => {
    expect(deriveEconomy(journalFor([3, 4, 5, 6]), at(day(6), "23:00")).streak.atRisk).toBe(false);
  });

  it("keeps the best streak after the current one breaks", () => {
    // Five days, then a whole week off, then two days.
    const streak = streakOn([3, 4, 5, 6, 7, 17, 18], 18);
    expect(streak.best).toBe(5);
    expect(streak.current).toBe(2);
  });
});

describe("the free weekly rest day", () => {
  it("auto applies to a single missed day and says which day it covered", () => {
    const streak = streakOn([3, 4, 5, 7], 7);
    expect(streak.current).toBe(4);
    expect(streak.restDayThisWeek).toBe(day(6));
  });

  it("covers one day a week and no more", () => {
    // Misses on the 5th and the 6th, both inside the Monday 3rd week.
    const streak = streakOn([3, 4, 7], 7);
    expect(streak.current).toBe(1);
    expect(streak.best).toBe(2);
  });

  it("gives a fresh rest day in the following ISO week", () => {
    // Miss the 6th, and miss the 12th. Different weeks, so both are covered.
    const streak = streakOn([3, 4, 5, 7, 8, 9, 10, 11, 13], 13);
    expect(streak.current).toBe(9);
    expect(streak.restDayThisWeek).toBe(day(12));
  });

  it("is not spent before there is a streak to protect", () => {
    // Nothing at all until the 6th: the empty days before the first counted day
    // are not misses, so the week's rest day is still there afterwards.
    const streak = streakOn([6, 7, 9], 9);
    expect(streak.current).toBe(3);
    expect(streak.restDayThisWeek).toBe(day(8));
  });
});

describe("streak freezes", () => {
  const freeze = (n: number): EconomyEvent => spend("streak_freeze", 75, day(n), "08:00");

  it("is consumed automatically once the rest day is gone", () => {
    const streak = streakOn([3, 4, 7], 7, [freeze(3)]);
    expect(streak.current).toBe(3);
    expect(streak.freezes).toBe(0);
  });

  it("stays held when nothing needed saving", () => {
    const streak = streakOn([3, 4, 5, 6, 7], 7, [freeze(3)]);
    expect(streak.current).toBe(5);
    expect(streak.freezes).toBe(1);
  });

  it("holds at most two however many are bought", () => {
    const streak = streakOn([3, 4, 5, 6, 7], 7, [freeze(3), freeze(4), freeze(5), freeze(6)]);
    expect(streak.freezes).toBe(2);
  });

  it("cannot save a gap it was bought after", () => {
    // The rest day covers the 5th, the 6th needs a freeze, and the freeze is not
    // bought until the 7th. Two missed days is what a streak costs.
    const streak = streakOn([3, 4, 7], 7, [freeze(7)]);
    expect(streak.current).toBe(1);
  });

  it("runs out, because a streak that cannot break is not a streak", () => {
    const streak = streakOn([3, 4, 9], 9, [freeze(3), freeze(3)]);
    // Rest day for the 5th, two freezes for the 6th and 7th, nothing for the 8th.
    expect(streak.current).toBe(1);
    expect(streak.freezes).toBe(0);
  });
});

describe("streak repair", () => {
  const repair = (n: number, time = "09:00"): EconomyEvent => spend("streak_repair", 150, day(n), time);

  it("restores a streak that broke, when bought inside the 48 hour window", () => {
    // Rest day covers the 5th, nothing covers the 6th, and the repair on the 7th
    // is inside 48 hours of that break.
    expect(streakOn([3, 4, 7], 7).current).toBe(1);
    expect(streakOn([3, 4, 7], 7, [repair(7)]).current).toBe(3);
  });

  it("does nothing when it comes too late", () => {
    expect(streakOn([3, 4, 10], 10, [repair(10)]).current).toBe(1);
  });

  it("is capped at one a calendar month", () => {
    const days = [3, 4, 7, 8, 9, 10, 11, 12, 15];
    // Both journals break twice: on the 6th and on the 14th, with each week's
    // rest day already spent. The break on the 14th sits inside the repair
    // window either way. The only thing that differs is whether this month's one
    // repair was already spent on the 6th.
    expect(streakOn(days, 15, [repair(15)]).current).toBe(7);
    expect(streakOn(days, 15, [repair(7), repair(15)]).current).toBe(1);
  });
});

describe("the exam window", () => {
  it("counts a day on any event at all, goal met or not", () => {
    const attempt = (n: number): EconomyEvent => ({
      kind: "attempt",
      at: at(day(n), "12:00"),
      tz: TZ,
      nodeId: "n1",
      problemId: "p1",
      correct: false,
    });
    const journal: readonly EconomyEvent[] = [
      settings(day(8), { dailyGoal: "serious", examDate: day(10) }),
      attempt(8),
      attempt(9),
      attempt(10),
    ];
    const snapshot = deriveEconomy(journal, at(day(10), "20:00"));
    expect(snapshot.xp.total).toBe(0);
    expect(snapshot.charge.examWindow).toBe(true);
    expect(snapshot.streak.current).toBe(3);
  });
});

describe("milestones", () => {
  it("reports the milestone on the day it is crossed", () => {
    const streak = streakOn([3, 4, 5, 6, 7, 8, 9], 9);
    expect(streak.current).toBe(7);
    expect(streak.milestoneReached).toBe(7);
  });

  it("reports none on a day that crosses nothing", () => {
    expect(streakOn([3, 4, 5, 6, 7, 8], 8).milestoneReached).toBeNull();
  });
});
