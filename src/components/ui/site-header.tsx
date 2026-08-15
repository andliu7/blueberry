import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { DashboardButton } from "@/components/Dashboard";
import { SiteActions } from "@/components/SiteActions";
import { SURFACE } from "@/lib/hubSurface";
import { useIsDark } from "@/lib/useIsDark";
import { cn } from "@/lib/utils";

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
  /**
   * What the category name does when clicked.
   *
   * Given one, the label becomes a button into that category's dashboard panel.
   * The name of the thing you are looking at is the most direct way to ask for
   * more of it, and it was previously the one piece of the bar that could not be
   * pressed.
   */
  onCategoryClick,
  /** Browse opens the dashboard. Omitted on pages that have no dashboard. */
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
   * The search, in the middle of the bar. A button now, not a box.
   *
   * It used to expand into a real input with a dropdown of results hanging off
   * it. That worked, and it was the wrong place for it: the bar has a mark, a
   * category, a button and three actions to fit, so the input had to hide every
   * one of them below `lg` to have room to be typed into — and the results then
   * had nowhere to go but a floating panel with its own scroll. Search is the
   * dashboard's job, and this is the way in.
   */
  onSearch,
  searchLabel = "Search decks",
  className,
  bare = false,
}: {
  category?: string | null;
  onCategoryClick?: () => void;
  browse?: { open: boolean; onToggle: () => void };
  showContact?: boolean;
  onHome?: () => void;
  onSearch?: () => void;
  /**
   * What the search says it will search.
   *
   * The bar is on every page now, and "Search decks" is a lie on most of them:
   * on home the dashboard opens onto everything the site has, not the deck
   * library. The word follows the page rather than the component.
   */
  searchLabel?: string;
  className?: string;
  /**
   * Render the row only, with no sticky shell, background or border.
   *
   * For when something else already owns the bar. `WindowChrome` morphs from a
   * tab into the bar and hands this in as its contents; two stickies nested
   * inside each other would pin the inner one to the outer one and the row
   * would never move.
   */
  bare?: boolean;
}) {
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
      className={cn(bare ? "w-full" : "sticky top-0 z-30 w-full", className)}
      style={bare ? undefined : {
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
      <div
        className={cn(
          "mx-auto flex max-w-5xl items-center gap-3",
          bare ? "px-0 py-0" : "px-6 py-3",
        )}
      >
        {/* The category, once its own heading has gone, and Browse beside it.
            Width is not animated: the row is a flex line and easing a width here
            shoves everything else along with it. It fades and lifts instead. */}
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <AnimatePresence mode="wait">
            {category && (
              <motion.span
                key={category}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="min-w-0"
              >
                {onCategoryClick ? (
                  <button
                    type="button"
                    onClick={onCategoryClick}
                    title={`Open ${category} in the dashboard`}
                    className="group/cat title-face relative block max-w-full cursor-pointer truncate text-lg text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:text-xl dark:text-stone-100"
                  >
                    {category}
                    {/* The same sweep every other link on the site uses, so a
                        pressable heading is discoverable without being drawn as
                        a button and cluttering a row that is already full. */}
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-transform duration-300 ease-out group-hover/cat:scale-x-100 group-focus-visible/cat:scale-x-100"
                    />
                  </button>
                ) : (
                  <span className="title-face block truncate text-lg text-slate-900 sm:text-xl dark:text-stone-100">
                    {category}
                  </span>
                )}
              </motion.span>
            )}
          </AnimatePresence>

          {browse && <DashboardButton open={browse.open} onToggle={browse.onToggle} />}
        </div>

        {/* The search, centred in what is left. `flex-1` on this and nothing
            else is what keeps it in the middle rather than pushed against the
            cluster that happens to be wider.

            It used to require a category as well, which was a rule about the
            deck hub written into a component every page uses: on the home
            landing, which has no category, the bar lost its search and was left
            with a mark and one unlabelled button beside it. Whether there is a
            search is the caller's decision, and the caller says so by passing
            `onSearch`. */}
        {onSearch && (
          <HeaderSearchButton onOpen={onSearch} label={searchLabel} onHome={onHome} />
        )}

        {/* Theme sits between Contact and the avatar rather than at the end.
            Andrew asked for it to shift out to make room, and the account is the
            thing that belongs hard against the edge: it is the one control whose
            position people learn rather than read. */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SiteActions showContact={showContact} />
          <AnimatedThemeToggler />
          <ProfileDropdown />
        </div>
      </div>
    </div>
  );
}

/**
 * The bar's search: a pill that opens the dashboard on its search panel.
 *
 * It was an input that expanded in place, with the results hanging under the bar
 * in a floating panel. The panel was the problem. A bar is a row — there is no
 * height in it for a list of matches — so the results had to be a dropdown with
 * its own scroll, sitting over the page, closing on any stray click. The
 * dashboard has a whole column to put them in, and searching is now the thing
 * you were going to do next anyway.
 *
 * Still the same pill as the Browse button beside it, so the two read as a pair
 * of tools rather than as a button and a form.
 */
function HeaderSearchButton({
  onOpen,
  label,
  onHome,
}: {
  onOpen: () => void;
  label: string;
  onHome?: () => void;
}) {
  // `/` is handled by GlobalSearch, which is mounted once for the whole site.
  // Binding it here as well meant two listeners racing to open two different
  // things off one keypress.

  return (
    <div className="flex min-w-0 flex-1 justify-center">
      {/*
        The berry and the track, as one object.

        Anchored to the pill rather than to the middle of the bar. Positioning
        the berry at the *container's* centre looked right in the markup and was
        wrong on screen: the pill is sized to its own text and centred, so its
        left padding is nowhere near the centre line, and the berry landed on
        top of the words instead of in the space left for it. Anchoring both to
        the same box means the gap and the fruit cannot drift apart when the
        label changes length.
      */}
      <div className="relative inline-flex min-w-0 max-w-full items-center">
        <button
          type="button"
          onClick={onOpen}
          aria-label={label}
          // Left padding is the berry's seat. The pill runs underneath it, so
          // the track reads as passing behind the fruit rather than starting
          // after it.
          className="group/search inline-flex max-w-full cursor-pointer items-center gap-1.5 truncate rounded-full border border-slate-200 bg-white/70 py-1.5 pr-3 pl-10 text-xs font-semibold text-slate-500 backdrop-blur transition hover:bg-white hover:text-slate-800 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <span className="truncate">
            {label}
            {/* The ellipsis only when there is room; a phone gets the words. */}
            <span className="hidden sm:inline">…</span>
          </span>
          {/* The shortcut, once there is room to print it. Not on a phone, which
              has no key to press. */}
          <kbd className="hidden shrink-0 rounded border border-slate-300 px-1 font-mono text-[0.6rem] text-slate-400 sm:inline dark:border-stone-600 dark:text-stone-500">
            /
          </kbd>
        </button>

        {/*
          The berry, sitting on the search rather than beside it.

          It used to be the leftmost thing in the bar, a plain link home. Andrew
          asked for it in the middle of the bar with the search wrapping behind
          it; it overlaps the pill's left end and stands taller than the pill, so
          the track visibly runs behind it.

          **This deliberately does not use `layoutId`.** Sharing an id with the
          overlay's magnifying glass is the obvious way to fly the berry across,
          and it does not work here: the overlay renders through `createPortal`
          into a `fixed` container, so motion measures the two boxes in different
          coordinate spaces, and the berry lands enormous and stranded halfway
          down the page rather than in the icon slot. The arrival is animated
          inside the overlay instead, where both ends of the movement are in one
          coordinate space and it cannot mismeasure.
        */}
        <motion.button
          type="button"
          onClick={onOpen}
          // Right-click still goes home, so moving the mark onto the search did
          // not take away the one thing a logo is always expected to do.
          onContextMenu={
            onHome
              ? (e) => {
                  e.preventDefault();
                  onHome();
                }
              : undefined
          }
          aria-label={`${label}. Right click to go home.`}
          className="group/mark absolute top-1/2 -left-1.5 -translate-y-1/2 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <BlueberryMark
            eyes
            className="blueberry-glow-art h-[2.1rem] w-[2.1rem] transition-transform duration-300 group-hover/mark:scale-110 motion-reduce:transition-none"
          />
        </motion.button>
      </div>
    </div>
  );
}

export default SiteHeader;
