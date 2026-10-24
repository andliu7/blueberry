/**
 * Called on every banked lesson clear (BeatRunner and PracticeRunner), and
 * imported only dynamically from them, so the rule never reaches the cold load.
 * Decides whether the Pro sheet may ask, then counts the clear, and leaves the
 * offer waiting in upsellFlow for the way back to the path. Deciding first is
 * what makes "never twice in a row" work: the clear right after a show is
 * decided with clearsSinceShown still 0.
 */
import { localDate } from "@blueberry/economy";
import { deviceZone } from "@/lib/helpers";
import type { ProgressSnapshot } from "../app/progress";
import { offerUpsell } from "./upsellFlow";
import { deviceStorage, loadUpsellState, noteClear, saveUpsellState, shouldOffer, type UpsellTrigger } from "./upsellRule";

// The same test as App.tsx's MEASURING: the measurement scripts want no sheet in front of the canvas.
function measuring(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get("auto") === "1" || params.get("stats") === "1" || params.get("targets") === "1";
}

export function noteLessonClear(
  snapshot: Pick<ProgressSnapshot, "lastReceipt">,
  storage: Storage | null = deviceStorage(),
  now: number = Date.now(),
  search: string = window.location.search,
): void {
  if (measuring(search)) return;
  const state = loadUpsellState(storage);
  const streak = snapshot.lastReceipt?.streak;
  const trigger: UpsellTrigger = streak?.milestone !== undefined ? "streak" : "lesson";
  const today = localDate(now, deviceZone());
  if (shouldOffer({ state, trigger, today })) {
    offerUpsell({
      trigger,
      firstLesson: state.shown === 0,
      ...(trigger === "streak" && streak ? { streakDays: streak.current } : {}),
    });
  }
  saveUpsellState(storage, noteClear(state));
}
