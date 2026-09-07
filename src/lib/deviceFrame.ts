import { useEffect, useState } from "react";

/**
 * Whether the app draws itself inside a phone-shaped bezel.
 *
 * One of the two settings the entry gate offers, and the only one that needed
 * anything written: light/dark already had `AnimatedThemeToggler` and its own
 * storage key. This is the same shape as that one on purpose, down to the
 * attribute being applied by the pre-paint script in `index.html` so a framed
 * visitor never sees an unframed first paint.
 *
 * The frame is a presentation choice, not an entitlement and not progress, so
 * `localStorage` is the right home for it: it belongs to this browser rather
 * than to a person, and there is no account here to hang it off.
 *
 * **Why an attribute on `<html>` rather than a React wrapper.** The app is a
 * router of early returns with no single element that wraps every page, and
 * three of the persistent overlays (the timer, the assistant, the avatar) are
 * mounted outside `App` on purpose so they survive route changes. A wrapper
 * component could not contain those; a rule on the document root can. What the
 * rule does is in `index.css` under `html[data-device-frame]`.
 */

const KEY = "device-frame";
const ATTR = "data-device-frame";

export function readDeviceFrame(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

/** Writes the choice and applies it in the same call, so the two cannot drift. */
export function setDeviceFrame(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* Private mode, or storage full. The attribute below still lands, so the
       choice works for this session and is simply not remembered. */
  }
  applyDeviceFrame(on);
  // Same-document `storage` events do not fire, so anything else on the page
  // showing this setting would otherwise keep the stale value.
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

export function applyDeviceFrame(on: boolean): void {
  const root = document.documentElement;
  if (on) root.setAttribute(ATTR, "");
  else root.removeAttribute(ATTR);
}

const EVENT = "blueberry:device-frame";

/** The setting, live. Seeded from the attribute the pre-paint script applied. */
export function useDeviceFrame(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(
    () => typeof document !== "undefined" && document.documentElement.hasAttribute(ATTR),
  );

  useEffect(() => {
    const sync = (event: Event) => setOn((event as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  return [on, setDeviceFrame];
}
