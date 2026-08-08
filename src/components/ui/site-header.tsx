import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search, X } from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { CourseTreeButton } from "@/components/ui/course-tree";
import { SearchResults } from "@/components/ui/deck-search";
import { SiteActions } from "@/components/SiteActions";
import { SURFACE } from "@/lib/hubSurface";
import { useIsDark } from "@/lib/useIsDark";
import { cn } from "@/lib/utils";
import type { SearchHit } from "@/lib/searchDecks";

/**
 * The bar at the top of every page, and the one thing on the site that stays put.
 *
 * It used to scroll away while the *heading* was what got pinned, which was
 * backwards twice over: the heading is a label for one section, and the buttons
 * are how you get anywhere. Worse, the pinned heading had no background, so the
 * page slid underneath it and the two printed over each other.
 *
 * **The category slot is why this takes a prop rather than hardcoding a title.**
 * Study decks are the whole site today and will not be for long. A page hands in
 * the name of the section you are currently inside, and the bar carries it once
 * its own big heading has scrolled away — so the answer to "what am I looking at"
 * survives leaving the top of the page, and the next feature gets the same
 * treatment by passing a different word.
 *
 * The same three-part row was copy-pasted into the hub, the folder pages and
 * contact. `SiteActions` already consolidated the About/Contact half of it for
 * that reason; this finishes the job.
 */

export function SiteHeader({
  /** The section you are inside, shown once its own heading is off screen. */
  category,
  /** Browse opens the course tree. Omitted on pages that have no drawer. */
  browse,
  /** Contact links to itself, so that page turns its own button off. */
  showContact = true,
  /**
   * What the mark should do when you are already home.
   *
   * Without this the link is inert on the hub: the hash is already `#/home`, so
   * nothing navigates and nothing moves. The hub passes a scroll to the top of
   * its own content, which is deliberately not the top of the document — that is
   * the opening animation, and being thrown back into it for asking to go home
   * is not what anyone means by the button.
   */
  onHome,
  /**
   * The category's search, in the middle of the bar. Bound to the same query as
   * the box in the page, so the two can never hold different text.
   */
  search,
  className,
}: {
  category?: string | null;
  browse?: { open: boolean; onToggle: () => void };
  showContact?: boolean;
  onHome?: () => void;
  search?: {
    value: string;
    onChange: (next: string) => void;
    hits: SearchHit[];
  };
  className?: string;
}) {
  /**
   * Expanding the search takes the row over on a narrow screen.
   *
   * A breakpoint rather than a measurement. The bar has a mark, a category, a
   * button, three actions and a text box to fit, and below `lg` there is simply
   * not room for a usable input alongside all of it — so the input takes the row
   * and gives it back on Escape, on the ✕, or on a click outside.
   */
  const [searchOpen, setSearchOpen] = useState(false);
  const isDark = useIsDark();
  const reduce = useReducedMotion();
  const surface = isDark ? SURFACE.dark : SURFACE.light;

  /**
   * Only draw the banner once there is something behind it.
   *
   * At the top of the page the bar is sitting on the surface it is tinted from,
   * so the blur and the border would be a seam across an unbroken background.
   * They fade in the moment anything is actually passing underneath.
   */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 8);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  return (
    <div
      className={cn("sticky top-0 z-30 w-full", className)}
      style={{
        // Tinted from the page's own surface rather than a colour of its own, so
        // the bar reads as the page thickening rather than as a panel laid over
        // it. `color-mix` keeps `SURFACE` the single source for both.
        background: scrolled
          ? `color-mix(in srgb, ${surface.base} 78%, transparent)`
          : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: `1px solid ${scrolled ? (isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.07)") : "transparent"}`,
        transition: "background 220ms ease-out, border-color 220ms ease-out",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
        {/* Just a link home. This was a pill that sprang open into a row of
            destinations on hover; the Browse drawer covers that ground properly
            now, and a logo that runs away when you point at it was in the way of
            the one thing everyone wants it to do. */}
        <a
          href="#/home"
          aria-label="Home"
          onClick={
            onHome
              ? (e) => {
                  // Left click only, so ctrl-click and middle-click still open
                  // the hub in a new tab like any other link.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault();
                  onHome();
                }
              : undefined
          }
          className="group/mark shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <BlueberryMark
            eyes
            className="blueberry-glow-art h-[2.6rem] w-[2.6rem] transition-[filter] duration-300"
          />
        </a>

        {/* The category, once its own heading has gone, and Browse beside it.
            Width is not animated: the row is a flex line and easing a width here
            shoves everything else along with it. It fades and lifts instead.

            Hidden while the search has taken the row on a narrow screen. */}
        <div
          className={cn(
            "flex min-w-0 shrink-0 items-center gap-3",
            searchOpen && "hidden lg:flex",
          )}
        >
          <AnimatePresence mode="wait">
            {category && (
              <motion.span
                key={category}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="title-face min-w-0 truncate text-lg text-slate-900 sm:text-xl dark:text-stone-100"
              >
                {category}
              </motion.span>
            )}
          </AnimatePresence>

          {browse && (
            <CourseTreeButton collapsible open={browse.open} onToggle={browse.onToggle} />
          )}
        </div>

        {/* The search, centred in what is left. `flex-1` on both this and nothing
            else is what keeps it in the middle rather than pushed against the
            cluster that happens to be wider. */}
        {search && category && (
          <HeaderSearch
            {...search}
            open={searchOpen}
            onOpenChange={setSearchOpen}
          />
        )}

        <div
          className={cn(
            "ml-auto flex shrink-0 items-center gap-2",
            searchOpen && "hidden lg:flex",
          )}
        >
          <SiteActions showContact={showContact} />
          <AnimatedThemeToggler />
        </div>
      </div>
    </div>
  );
}

/**
 * The bar's search: a magnifier you click, which becomes a real text box.
 *
 * Collapsed it is the same pill as the Browse button beside it, so the two read
 * as a pair of tools rather than a button and a form. Expanded it grows into
 * whatever room the bar has, and on a narrow screen the header hides the clusters
 * either side so the input is not squeezed into eighty pixels.
 *
 * The results cannot live in the bar — there is no height for a list — so they
 * hang underneath it in a panel, using the same `SearchResults` the page uses.
 */
function HeaderSearch({
  value,
  onChange,
  hits,
  open,
  onOpenChange,
}: {
  value: string;
  onChange: (next: string) => void;
  hits: SearchHit[];
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = value.trim().length >= 2;

  const close = () => {
    onOpenChange(false);
    inputRef.current?.blur();
  };

  // Focus on open, so clicking the magnifier lets you type immediately.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  /**
   * Escape closes, and so does a click anywhere else.
   *
   * `pointerdown` rather than `click`: a click on a result fires after the link
   * has already been followed, and closing on that would tear the panel down
   * mid-navigation. Clicks inside the wrapper are ignored, which is what keeps
   * the panel usable — it is inside the wrapper for exactly this reason.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // `/` opens it, matching the box in the page. Only while the bar is the search
  // on screen, which is the only time this is mounted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative flex min-w-0 justify-center",
        // Takes the row when open, and stays out of the way when not: a
        // permanently greedy flex child would push the actions off a phone.
        open ? "flex-1" : "flex-1 lg:flex-1",
      )}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Search decks"
          className="inline-flex max-w-full cursor-pointer items-center gap-1.5 truncate rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-500 backdrop-blur transition hover:bg-white hover:text-slate-800 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">
            Search decks
            {/* The ellipsis only when there is room; a phone gets the words. */}
            <span className="hidden sm:inline">…</span>
          </span>
          {/* Says the query survived closing, rather than looking like it was
              thrown away. */}
          {active && (
            <span className="shrink-0 rounded-full bg-indigo-500/15 px-1.5 font-mono text-[0.65rem] text-indigo-600 dark:text-indigo-300">
              {hits.length}
            </span>
          )}
        </button>
      ) : (
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search every deck…"
            aria-label="Search decks"
            className="w-full rounded-full border border-slate-200 bg-white py-1.5 pr-9 pl-9 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder:text-stone-500"
          />
          <button
            type="button"
            // Clears first, closes second. A box with text in it should give the
            // text back before it gives the row back.
            onClick={() => (value ? onChange("") : close())}
            aria-label={value ? "Clear search" : "Close search"}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:text-slate-700 dark:text-stone-500 dark:hover:text-stone-200"
          >
            <X className="size-4" />
          </button>

          {active && (
            <div className="absolute top-full right-0 left-0 mt-2 max-h-[60vh] overflow-y-auto rounded-xl">
              <SearchResults hits={hits} query={value} onPick={close} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SiteHeader;
