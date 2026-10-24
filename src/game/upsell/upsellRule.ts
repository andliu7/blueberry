/**
 * WHEN THE PRO SHEET MAY ASK (owner, 23 Oct, G3): "we need to include paywalls
 * after the user gets some value. like completing their first lesson and then
 * reminders intermittently like duolingo."
 *
 * Pure: no React, no storage, no clock. The caller passes today's local date
 * (the same day the streak counts) and saves whatever these return.
 *
 * Pro is NOT an input. The client cannot know Pro at clear time without loading
 * supabase-js, so the sheet checks it when it renders (UpsellSheet.tsx) and
 * closes without counting a show.
 */
import { daysBetween } from "@blueberry/economy";

export type UpsellTrigger = "lesson" | "streak";

export interface UpsellState {
  /** Times the sheet has actually been shown. */
  readonly shown: number;
  /** Local date of the last show, or null before the first. */
  readonly lastShownDay: string | null;
  /** Lesson clears since the last show, counted whether or not it showed. */
  readonly clearsSinceShown: number;
  /** "Not now" taps since the last checkout attempt. Drives the backoff. */
  readonly dismissals: number;
  /** They pressed "Tell me when it opens". */
  readonly askedToHear: boolean;
}

export const INITIAL_UPSELL_STATE: UpsellState = {
  shown: 0,
  lastShownDay: null,
  clearsSinceShown: 0,
  dismissals: 0,
  askedToHear: false,
};

/** Days that must pass between shows: 1, 2, 4, 8, then 14 at most. */
export function minDays(dismissals: number): number {
  return Math.min(2 ** dismissals, 14);
}

/** Lesson clears between shows: 3, 6, 12, then 24 at most. */
export function gapLessons(dismissals: number): number {
  return 3 << Math.min(dismissals, 3);
}

/** Called on every lesson clear, shown or not. */
export function noteClear(state: UpsellState): UpsellState {
  return { ...state, clearsSinceShown: state.clearsSinceShown + 1 };
}

/** The rule, in order. The first rule that decides wins. */
export function shouldOffer({
  state,
  trigger,
  today,
}: {
  readonly state: UpsellState;
  readonly trigger: UpsellTrigger;
  readonly today: string;
}): boolean {
  // (a) The first completed lesson, shown once.
  if (state.shown === 0 && trigger === "lesson") return true;
  // (b) At most once a local day.
  if (state.lastShownDay === today) return false;
  // (c) Never twice in a row, streak included.
  if (state.clearsSinceShown < 1) return false;
  // (d) The backoff: more "Not now" taps, longer quiet.
  if (state.lastShownDay !== null && daysBetween(state.lastShownDay, today) < minDays(state.dismissals)) return false;
  // (e) A streak milestone skips the lesson gap, but not (b) to (d).
  if (trigger === "streak") return true;
  // (f) They already said "tell me", so only streak milestones bring it back.
  if (state.askedToHear) return false;
  // (g) Enough lessons since the last show.
  return state.clearsSinceShown >= gapLessons(state.dismissals);
}

export function afterShown(state: UpsellState, today: string): UpsellState {
  return { ...state, shown: state.shown + 1, lastShownDay: today, clearsSinceShown: 0 };
}

export function afterDismiss(state: UpsellState): UpsellState {
  return { ...state, dismissals: state.dismissals + 1 };
}

export function afterAskToHear(state: UpsellState): UpsellState {
  return { ...state, askedToHear: true };
}

export function afterCheckout(state: UpsellState): UpsellState {
  return { ...state, dismissals: 0 };
}

/* ------------------------------------------------------------ storage -- */

/** Per device until account progress syncs it. */
export const UPSELL_STORAGE_KEY = "blueberry.upsell";

/** The saved state, or INITIAL when storage is blocked, empty or garbled. Never throws. */
export function loadUpsellState(storage: Pick<Storage, "getItem"> | null): UpsellState {
  try {
    const raw = storage?.getItem(UPSELL_STORAGE_KEY);
    if (!raw) return INITIAL_UPSELL_STATE;
    const parsed = JSON.parse(raw) as Partial<UpsellState>;
    return {
      shown: typeof parsed.shown === "number" ? parsed.shown : 0,
      lastShownDay: typeof parsed.lastShownDay === "string" ? parsed.lastShownDay : null,
      clearsSinceShown: typeof parsed.clearsSinceShown === "number" ? parsed.clearsSinceShown : 0,
      dismissals: typeof parsed.dismissals === "number" ? parsed.dismissals : 0,
      askedToHear: parsed.askedToHear === true,
    };
  } catch {
    return INITIAL_UPSELL_STATE;
  }
}

/** Save, or do nothing when storage is blocked. Never throws. */
export function saveUpsellState(storage: Pick<Storage, "setItem"> | null, state: UpsellState): void {
  try {
    storage?.setItem(UPSELL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or full storage: the schedule restarts, nothing breaks.
  }
}

/** window.localStorage, or null where even reading the property throws. */
export function deviceStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
