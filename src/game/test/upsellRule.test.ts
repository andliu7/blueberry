/**
 * The Pro sheet's schedule (G3): first completed lesson once, then
 * intermittently, at most once a day, never twice in a row, backing off after
 * each "Not now". One case per rule in upsellRule.ts.
 */
import { describe, expect, it } from "vitest";
import {
  INITIAL_UPSELL_STATE,
  afterAskToHear,
  afterCheckout,
  afterDismiss,
  afterProSeen,
  afterShown,
  gapLessons,
  minDays,
  noteClear,
  shouldOffer,
  type UpsellState,
} from "../upsell/upsellRule";

const DAY = "2026-10-23";

/** A state that was shown on `day`, then saw `clears` lesson clears and `dismissals` "Not now" taps. */
function shownOn(day: string, clears: number, dismissals = 0): UpsellState {
  let s = afterShown(noteClear(INITIAL_UPSELL_STATE), day);
  for (let i = 0; i < dismissals; i++) s = afterDismiss(s);
  for (let i = 0; i < clears; i++) s = noteClear(s);
  return s;
}

describe("upsell schedule", () => {
  it("shows after the first completed lesson", () => {
    expect(shouldOffer({ state: noteClear(INITIAL_UPSELL_STATE), trigger: "lesson", today: DAY })).toBe(true);
  });

  it("shows the first-lesson sheet once: the next clear does not show it", () => {
    const after = noteClear(afterShown(noteClear(INITIAL_UPSELL_STATE), DAY));
    expect(after.shown).toBe(1);
    expect(shouldOffer({ state: after, trigger: "lesson", today: "2026-10-24" })).toBe(false);
  });

  it("never shows twice on the same local day, even with many clears", () => {
    expect(shouldOffer({ state: shownOn(DAY, 50), trigger: "lesson", today: DAY })).toBe(false);
    expect(shouldOffer({ state: shownOn(DAY, 50), trigger: "streak", today: DAY })).toBe(false);
  });

  it("never shows on the clear right after a show, streak included", () => {
    const s = shownOn("2026-10-01", 0);
    expect(shouldOffer({ state: s, trigger: "streak", today: DAY })).toBe(false);
    expect(shouldOffer({ state: s, trigger: "lesson", today: DAY })).toBe(false);
  });

  it("grows the lesson gap 3, 6, 12, 24 after 0 to 3 dismissals, and stops there", () => {
    expect([0, 1, 2, 3, 4, 9].map(gapLessons)).toEqual([3, 6, 12, 24, 24, 24]);
    // Far enough in days that only the lesson gap decides.
    const later = "2026-12-31";
    for (const [dismissals, gap] of [
      [0, 3],
      [1, 6],
      [2, 12],
      [3, 24],
    ] as const) {
      expect(shouldOffer({ state: shownOn(DAY, gap - 1, dismissals), trigger: "lesson", today: later })).toBe(false);
      expect(shouldOffer({ state: shownOn(DAY, gap, dismissals), trigger: "lesson", today: later })).toBe(true);
    }
  });

  it("backs off in days: 1, 2, 4, 8, then 14 at most", () => {
    expect([0, 1, 2, 3, 4, 5, 10].map(minDays)).toEqual([1, 2, 4, 8, 14, 14, 14]);
    const days = ["2026-10-24", "2026-10-25", "2026-10-27", "2026-10-31", "2026-11-06"];
    for (let dismissals = 0; dismissals <= 4; dismissals++) {
      const wait = minDays(dismissals);
      const s = shownOn(DAY, 100, dismissals);
      // One day short of the wait: no. On the day the wait ends: yes.
      const short = new Date(Date.parse(`${DAY}T00:00:00Z`) + (wait - 1) * 86_400_000).toISOString().slice(0, 10);
      if (wait > 1) expect(shouldOffer({ state: s, trigger: "lesson", today: short })).toBe(false);
      expect(shouldOffer({ state: s, trigger: "lesson", today: days[dismissals]! })).toBe(true);
    }
  });

  it("a streak milestone skips the lesson gap but keeps the day cap", () => {
    const one = shownOn(DAY, 1);
    expect(shouldOffer({ state: one, trigger: "lesson", today: "2026-10-24" })).toBe(false);
    expect(shouldOffer({ state: one, trigger: "streak", today: "2026-10-24" })).toBe(true);
    expect(shouldOffer({ state: one, trigger: "streak", today: DAY })).toBe(false);
  });

  it("after 'Tell me when it opens', only streak milestones bring it back", () => {
    const s = afterAskToHear(shownOn(DAY, 30));
    expect(shouldOffer({ state: s, trigger: "lesson", today: "2026-11-30" })).toBe(false);
    expect(shouldOffer({ state: s, trigger: "streak", today: "2026-11-30" })).toBe(true);
  });

  it("a checkout attempt resets the backoff", () => {
    const backedOff = shownOn(DAY, 3, 3);
    expect(shouldOffer({ state: backedOff, trigger: "lesson", today: "2026-10-26" })).toBe(false);
    const reset = afterCheckout(backedOff);
    expect(reset.dismissals).toBe(0);
    expect(shouldOffer({ state: reset, trigger: "lesson", today: "2026-10-26" })).toBe(true);
  });

  it("a Pro account that reached the sheet is not asked again for 14 days and 24 lessons", () => {
    const pro = afterProSeen(noteClear(INITIAL_UPSELL_STATE), DAY);
    let s = pro;
    for (let i = 0; i < 23; i++) s = noteClear(s);
    // Rule (a) no longer fires, so it is not re-offered on every clear.
    expect(shouldOffer({ state: pro, trigger: "lesson", today: "2026-10-24" })).toBe(false);
    expect(shouldOffer({ state: noteClear(s), trigger: "lesson", today: "2026-11-05" })).toBe(false);
    expect(shouldOffer({ state: s, trigger: "lesson", today: "2026-12-31" })).toBe(false);
    // Two weeks and 24 lessons on, it checks again, so a lapsed Pro is not lost.
    expect(shouldOffer({ state: noteClear(s), trigger: "lesson", today: "2026-11-06" })).toBe(true);
  });
});
