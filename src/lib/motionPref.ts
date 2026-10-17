import { useSyncExternalStore } from "react";

/**
 * Whether the visitor asked for less motion.
 *
 * One attribute decides it, `html[data-motion="reduced"]`, set before first paint
 * by index.html from the OS setting (and, from phase 8, by the Settings switch).
 * CSS reads the attribute; JS reads it here, so the two can never disagree.
 * Port of the portfolio's components/site/use-reduced-motion.ts idea, without the hook:
 * every caller here reads it at the moment it is about to animate.
 */
export function isReducedMotion(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.getAttribute("data-motion") === "reduced";
}

/**
 * The same answer as a React hook that re-renders when the attribute changes, so the
 * footer's Reduce motion switch reaches components already on screen (shell round 5).
 *
 * Why not motion/react's `useReducedMotion`: that one reads only the OS setting, so the
 * site's own switch did not stop the footer's blur-in (measured, critic shell round 4).
 * The attribute already carries the OS setting (index.html folds it in before paint)
 * and the visitor's choice on top of it, so it is the one thing to read.
 *
 * React pattern: `useSyncExternalStore` subscribes a component to a value that lives
 * outside React (here an attribute on <html>, watched with a MutationObserver).
 */
export function useReducedMotionPref(): boolean {
  return useSyncExternalStore(subscribeToMotion, isReducedMotion, isReducedMotion);
}

function subscribeToMotion(onChange: () => void) {
  if (typeof MutationObserver === "undefined") return () => {};
  const watcher = new MutationObserver(onChange);
  watcher.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => watcher.disconnect();
}
