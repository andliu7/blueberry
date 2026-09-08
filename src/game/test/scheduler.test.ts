/**
 * The scheduler is the retention engine, so these tests are the deliverable as
 * much as the code is. They pin three things: what each of the four buttons
 * does to the interval, that `again` comes back inside the session without
 * throwing the ease away, and where the "due today" line actually falls.
 *
 * Every case passes its own `now`. Nothing here waits, and nothing here is
 * flaky at midnight.
 */

import { describe, expect, it } from "vitest";

import {
  AGAIN_INTERVAL_DAYS,
  AGAIN_MINUTES,
  DAY_MS,
  EASY_GRADUATING_INTERVAL_DAYS,
  GRADUATING_INTERVAL_DAYS,
  MAX_INTERVAL_DAYS,
  MIN_EASE,
  STARTING_EASE,
  dueTodayCount,
  endOfLocalDay,
  isLearning,
  nextInterval,
  rateCard,
  startCard,
} from "../cards/scheduler";
import type { Rating, ReviewState } from "../cards/types";
import { isDue } from "../cards/types";

/** A fixed instant, local noon, so no case sits on a day boundary by accident. */
const NOON = new Date(2026, 7, 27, 12, 0, 0, 0);

function graduated(interval: number, ease = STARTING_EASE): ReviewState {
  return {
    cardId: "card-1",
    interval,
    ease,
    dueAt: NOON.toISOString(),
    lastRating: "good",
  };
}

/** Rate the same card n times with one button, collecting the intervals. */
function chain(start: ReviewState, rating: Rating, times: number): number[] {
  const intervals: number[] = [];
  let state = start;
  for (let i = 0; i < times; i += 1) {
    state = rateCard(state, rating, NOON);
    intervals.push(state.interval);
  }
  return intervals;
}

describe("a card nobody has rated", () => {
  it("is due immediately, so a card saved from a mistake is in today's queue", () => {
    const state = startCard("card-1", NOON);
    expect(state.interval).toBe(0);
    expect(state.ease).toBe(STARTING_EASE);
    expect(state.lastRating).toBeNull();
    expect(isDue(state, NOON)).toBe(true);
  });

  it("counts as learning until something graduates it", () => {
    expect(isLearning(startCard("card-1", NOON))).toBe(true);
  });
});

describe("good, the default path", () => {
  it("graduates a learning card to one day", () => {
    const state = rateCard(startCard("card-1", NOON), "good", NOON);
    expect(state.interval).toBe(GRADUATING_INTERVAL_DAYS);
    expect(isLearning(state)).toBe(false);
  });

  it("expands by the card's own ease, and stops at the ceiling", () => {
    // 2.5 at the starting ease. The rounding floor guarantees forward motion.
    expect(chain(startCard("card-1", NOON), "good", 8)).toEqual([1, 3, 8, 20, 50, 125, 313, MAX_INTERVAL_DAYS]);
  });

  it("leaves the ease alone", () => {
    const state = rateCard(graduated(8), "good", NOON);
    expect(state.ease).toBeCloseTo(STARTING_EASE, 10);
  });

  it("sets dueAt exactly interval days out", () => {
    const state = rateCard(graduated(8), "good", NOON);
    expect(Date.parse(state.dueAt)).toBe(NOON.getTime() + 20 * DAY_MS);
  });
});

describe("hard, which slows growth and never resets it", () => {
  it("grows a graduated interval by about 1.2", () => {
    expect(nextInterval(graduated(8), "hard")).toBe(10); // 9.6, rounded
    expect(nextInterval(graduated(50), "hard")).toBe(60);
  });

  it("always moves forward, even where 1.2 would round back onto itself", () => {
    // 1 * 1.2 is 1.2, which rounds to 1. A card stuck on a daily loop is the
    // bug this floor exists to prevent.
    expect(nextInterval(graduated(1), "hard")).toBe(2);
  });

  it("never shrinks an interval, over a long run of hard ratings", () => {
    const intervals = chain(graduated(3), "hard", 6);
    expect(intervals).toEqual([4, 5, 6, 7, 8, 10]);
    for (let i = 1; i < intervals.length; i += 1) {
      expect(intervals[i]!).toBeGreaterThan(intervals[i - 1]!);
    }
  });

  it("keeps a brand new card in learning rather than at zero", () => {
    // Zero times 1.2 is zero: without the floor this card never leaves the queue.
    const state = rateCard(startCard("card-1", NOON), "hard", NOON);
    expect(state.interval).toBe(AGAIN_INTERVAL_DAYS);
    expect(isLearning(state)).toBe(true);
  });

  it("lowers the ease, so future good ratings grow more slowly", () => {
    const state = rateCard(graduated(8), "hard", NOON);
    expect(state.ease).toBeCloseTo(2.35, 10);
    expect(rateCard(state, "good", NOON).interval).toBe(24); // 10 * 2.35
  });
});

describe("easy, which gets a card out of the way", () => {
  it("graduates a learning card straight to four days", () => {
    const state = rateCard(startCard("card-1", NOON), "easy", NOON);
    expect(state.interval).toBe(EASY_GRADUATING_INTERVAL_DAYS);
  });

  it("expands by about 3.5 at the starting ease", () => {
    expect(nextInterval(graduated(4), "easy")).toBe(14);
    expect(nextInterval(graduated(20), "easy")).toBe(70);
  });

  it("raises the ease", () => {
    expect(rateCard(graduated(4), "easy", NOON).ease).toBeCloseTo(2.65, 10);
  });
});

describe("again, the resurface path", () => {
  it("comes back inside the same session, ten minutes out", () => {
    const state = rateCard(graduated(50), "again", NOON);
    expect(state.interval).toBe(AGAIN_INTERVAL_DAYS);
    expect(Date.parse(state.dueAt)).toBe(NOON.getTime() + AGAIN_MINUTES * 60 * 1000);
    expect(isDue(state, NOON)).toBe(false);
    expect(isDue(state, new Date(NOON.getTime() + 11 * 60 * 1000))).toBe(true);
  });

  it("re-enters the learning queue, so the next good graduates it again", () => {
    const lapsed = rateCard(graduated(50), "again", NOON);
    expect(isLearning(lapsed)).toBe(true);
    expect(rateCard(lapsed, "good", NOON).interval).toBe(GRADUATING_INTERVAL_DAYS);
  });

  it("lowers the ease but never below the floor", () => {
    let state = graduated(50);
    for (let i = 0; i < 12; i += 1) state = rateCard(state, "again", NOON);
    expect(state.ease).toBe(MIN_EASE);
    // The floor is what stops a repeatedly failed card multiplying by less
    // than one and shrinking its own interval every review.
    expect(nextInterval({ ...state, interval: 10 }, "good")).toBe(13);
  });

  it("records the rating, so a surface can say what happened", () => {
    expect(rateCard(graduated(50), "again", NOON).lastRating).toBe("again");
  });
});

describe("how many are due today", () => {
  const at = (isoOffsetMs: number): ReviewState => ({
    cardId: `card-${isoOffsetMs}`,
    interval: 1,
    ease: STARTING_EASE,
    dueAt: new Date(NOON.getTime() + isoOffsetMs).toISOString(),
    lastRating: "good",
  });

  it("ends at the last millisecond of the local day", () => {
    const end = endOfLocalDay(NOON);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getDate()).toBe(NOON.getDate());
    expect(end.getHours()).toBe(23);
    expect(end.getMilliseconds()).toBe(999);
  });

  it("counts the last card of today and not the first of tomorrow", () => {
    const lastOfToday = { ...at(0), dueAt: endOfLocalDay(NOON).toISOString() };
    const firstOfTomorrow = {
      ...at(0),
      cardId: "card-tomorrow",
      dueAt: new Date(endOfLocalDay(NOON).getTime() + 1).toISOString(),
    };
    expect(dueTodayCount([lastOfToday, firstOfTomorrow], NOON)).toBe(1);
  });

  it("includes what is already overdue and what is due later today", () => {
    const yesterday = at(-2 * DAY_MS);
    const thisEvening = at(9 * 60 * 60 * 1000);
    const nextWeek = at(7 * DAY_MS);
    expect(dueTodayCount([yesterday, thisEvening, nextWeek], NOON)).toBe(2);
  });

  it("is zero for an empty deck and ignores an unparseable date", () => {
    expect(dueTodayCount([], NOON)).toBe(0);
    expect(dueTodayCount([{ ...at(0), dueAt: "not a date" }], NOON)).toBe(0);
  });
});
