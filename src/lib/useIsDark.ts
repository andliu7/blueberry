import { useEffect, useState } from "react";

/**
 * Tracks the `dark` class the theme switch toggles on <html>.
 *
 * One MutationObserver is shared by every caller. The hook runs in each of the
 * 44 question cards, and giving each its own observer meant 44 of them watching
 * the same attribute on the same element and waking together on every class
 * change, including the theme-transition class added and removed on each swap.
 */

const listeners = new Set<(dark: boolean) => void>();
let observer: MutationObserver | null = null;
let current = false;

function read() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

function subscribe(fn: (dark: boolean) => void) {
  listeners.add(fn);

  if (!observer && typeof document !== "undefined") {
    current = read();
    observer = new MutationObserver(() => {
      const next = read();
      if (next === current) return; // theme-transition toggles fire here too
      current = next;
      for (const l of listeners) l(next);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}

export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(read);

  useEffect(() => {
    setIsDark(read());
    return subscribe(setIsDark);
  }, []);

  return isDark;
}
