import { useEffect, useState } from "react";

/**
 * Tracks the `dark` class the theme switch toggles on <html>.
 *
 * Watches the class directly rather than going through shared state, so any
 * component can ask about the theme without the switch having to publish it.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
