import { useCallback, useEffect, useState } from "react";
import { FeatureSearch } from "@/components/ui/feature-search";

/**
 * One search for the whole site, mounted beside the router.
 *
 * Every header that wanted a search used to pass an `onSearch` callback up to
 * whichever page it was on, and each page decided separately what searching
 * meant. Pages that did not pass one had no search at all, so `/` did nothing on
 * a deck page.
 *
 * It listens for an event instead, for the same reason the focus timer does: the
 * things that open it are scattered across headers, pages and a keyboard
 * shortcut, and threading a setter to all of them means every component in
 * between carrying a prop about a search it has nothing to do with.
 *
 * - `blueberry:open-search` opens it
 * - `/` opens it, unless something is being typed into
 * - `ctrl`/`cmd` + `k`, since that is what everyone reaches for
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("blueberry:open-search", openIt);

    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      // A slash has to remain typeable, so this only fires when no field has
      // focus. The palette's own input is a field, so `/` inside it types.
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("blueberry:open-search", openIt);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const openDashboard = useCallback((view: string) => {
    // The dashboard is a panel inside the router, so it is asked by event
    // rather than reached from out here.
    window.location.hash = view === "home" ? "#/d" : `#/d/${view}`;
  }, []);

  return (
    <FeatureSearch open={open} onClose={() => setOpen(false)} onOpenDashboard={openDashboard} />
  );
}

export default GlobalSearch;
