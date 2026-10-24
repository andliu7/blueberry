/**
 * The viewer's answer to "show ads from Google here?", kept on this device only.
 *
 * No answer means no ad code: the default is the most private one. Anything that goes wrong
 * reading the answer (private mode, blocked storage, a value from an older version) also
 * reads as no answer, so a failure can only ever mean fewer ads, never an ad nobody agreed to.
 */

export type AdConsent = "granted" | "declined";

const KEY = "blueberry.adConsent";
const VERSION = 1;
/** Fired in this tab on every change; the browser's "storage" event covers the other tabs. */
const EVENT = "blueberry:ad-consent";
/** The answer given this visit when storage refused to keep it. Never read from disk, so it starts empty. */
let unsaved: AdConsent | null = null;

export function readAdConsent(): AdConsent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const saved = JSON.parse(raw) as { v?: unknown; choice?: unknown };
    if (saved.v !== VERSION) return null;
    return saved.choice === "granted" || saved.choice === "declined" ? saved.choice : null;
  } catch {
    return unsaved;
  }
}

export function setAdConsent(choice: AdConsent): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, choice, at: new Date().toISOString() }));
    unsaved = null;
  } catch {
    /* storage blocked: the choice lasts until the page reloads */
    unsaved = choice;
  }
  window.dispatchEvent(new Event(EVENT));
}

/** "Ad choices": forget the answer, so the next slot asks again. */
export function clearAdConsent(): void {
  unsaved = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing saved that we could reach */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Call `listener` whenever the answer may have changed, here or in another tab. Returns the unsubscribe. */
export function onAdConsent(listener: () => void): () => void {
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key === KEY) listener();
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", storage);
  };
}
