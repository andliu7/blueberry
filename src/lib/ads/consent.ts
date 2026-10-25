/**
 * The viewer's answer to "show ads from Google here?", kept on this device only.
 *
 * No answer means no ad code: the default is the most private one. Anything that goes wrong
 * reading the answer (private mode, blocked storage, a value from an older version) also
 * reads as no answer, so a failure can only ever mean fewer ads, never an ad nobody agreed to.
 *
 * The same store keeps the answer to "share usage stats?" (src/lib/analytics.ts), under its
 * own key: one consent mechanism, one answer per question.
 */

export type AdConsent = "granted" | "declined";

const VERSION = 1;

/** One yes/no answer kept on this device under `key`; `event` fires in this tab on every change. */
export function consentStore(key: string, event: string) {
  /** The answer given this visit when storage refused to keep it. Never read from disk, so it starts empty. */
  let unsaved: AdConsent | null = null;

  function read(): AdConsent | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      const saved = JSON.parse(raw) as { v?: unknown; choice?: unknown };
      if (saved.v !== VERSION) return null;
      return saved.choice === "granted" || saved.choice === "declined" ? saved.choice : null;
    } catch {
      return unsaved;
    }
  }

  function set(choice: AdConsent): void {
    try {
      localStorage.setItem(key, JSON.stringify({ v: VERSION, choice, at: new Date().toISOString() }));
      unsaved = null;
    } catch {
      /* storage blocked: the choice lasts until the page reloads */
      unsaved = choice;
    }
    window.dispatchEvent(new Event(event));
  }

  /** Forget the answer, so the next prompt asks again. */
  function clear(): void {
    unsaved = null;
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing saved that we could reach */
    }
    window.dispatchEvent(new Event(event));
  }

  /** Call `listener` whenever the answer may have changed, here or in another tab. Returns the unsubscribe. */
  function on(listener: () => void): () => void {
    const storage = (e: StorageEvent) => {
      if (e.key === null || e.key === key) listener();
    };
    window.addEventListener(event, listener);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(event, listener);
      window.removeEventListener("storage", storage);
    };
  }

  return { read, set, clear, on };
}

/** Fired in this tab on every change; the browser's "storage" event covers the other tabs. */
const ads = consentStore("blueberry.adConsent", "blueberry:ad-consent");

export const readAdConsent = ads.read;
export const setAdConsent = ads.set;
/** "Ad choices": forget the answer, so the next slot asks again. */
export const clearAdConsent = ads.clear;
export const onAdConsent = ads.on;
