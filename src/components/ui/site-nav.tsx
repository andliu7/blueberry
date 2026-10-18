import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { SiteTabIcon } from "@/components/ui/site-tab-icons";
import { PRESS, skipToContent } from "@/components/ui/site-nav-events";
import { DESTINATIONS, destinationFor } from "@/lib/siteNav";
import { cn } from "@/lib/utils";

/**
 * The one page column (shell round 4). The header, the footer and every content page
 * that opens with `PageHeader` sit in it, so every title starts on the berry's left
 * edge (112px at 1440 wide, 16px on a phone) and every page shares one max width.
 * Before this, titles started at 232, 112, 208 and 176 on four pages.
 */
export const SITE_CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

/**
 * The site's navigation: one header on every site page, and a tab bar along the
 * bottom of a phone (SITE-REPLAN.md section 6, phase 3).
 *
 * WHY IT LIVES OUTSIDE THE PAGES. It used to be a `SiteHeader` that four pages
 * drew for themselves, a lone Home link on eight others, and a floating sign-in
 * pill on the rest (audit C3). It is now mounted once, by `SiteChrome`, beside
 * the router rather than inside it, so a page cannot forget it and no two pages
 * can draw it differently. `SiteChrome` also decides where it stands down: the
 * game (which has its own bar until phase 9) and the flows (sign-in, the
 * funnel), see `isFlowRoute` in `lib/siteNav`.
 *
 * WHAT IS IN IT, and nothing else (replan): the berry, which always goes home;
 * the five destinations; then, on the right, the running timer's pill (only
 * while a session runs), search, and the account (avatar, or "Sign in"). The
 * theme switch, Contact, the window chrome and the corner rail are gone from
 * here on purpose.
 *
 * Below 768px the five destinations move to a bar along the bottom edge, white
 * on the card colour, never purple (DESIGN-GOALS.md "Header and tabs"), and the
 * top row keeps only the berry and the tools.
 *
 * Focus rings are not drawn here: site-shell.css gives everything inside
 * `.site-header` and `.site-bar` one 3px ring, so no control can forget it.
 */

/**
 * The five links. Pure: the current route in, anchors out, no hooks, which is
 * what lets `src/test/siteNav.test.ts` render it in node and check the five
 * links and the `aria-current` mark without a browser.
 */
export function SiteNavLinks({ route, placement }: { route: string; placement: "header" | "bar" }) {
  const current = destinationFor(route);
  return (
    <>
      {DESTINATIONS.map((d) => {
        const here = current === d.id;
        // The press and the current-tab chip are in site-shell.css, keyed on
        // `site-nav-item`, `site-nav-face` and `aria-current`, so the state the
        // screen reader hears is the state drawn. The glyph never changes colour.
        return (
          <a
            key={d.id}
            href={d.href}
            aria-current={here ? "page" : undefined}
            {...PRESS}
            className={cn(
              "site-nav-item",
              placement === "header"
                ? "inline-flex rounded-full text-[0.95rem] font-bold text-foreground"
                : "flex flex-1 flex-col items-center justify-center gap-0.5 self-stretch rounded-xl text-xs leading-3 font-bold text-muted-foreground",
            )}
          >
            {placement === "header" ? (
              // The current tab is the outlined wash pill (site-shell.css). At 28px the
              // phone glyphs smeared (critic, shell round 5), so the header draws each
              // one's simpler desktop variant (`simple`).
              <span className="site-nav-face inline-flex min-h-11 items-center gap-2 rounded-full pr-4 pl-2">
                <SiteTabIcon id={d.id} simple className="size-7 shrink-0" />
                {d.label}
              </span>
            ) : (
              <>
                {/* Shell round 8, measured against Duolingo's phone app (log): a 44px chip
                    (theirs is 45) in a 64px bar, and a 40px svg whose drawing paints 32 to
                    36px, as heavy as theirs. The current tab draws the same glyph at the
                    same size: only the chip behind it changes. */}
                <span className="site-nav-face flex size-11 items-center justify-center rounded-xl">
                  <SiteTabIcon id={d.id} className="size-10" />
                </span>
                {d.label}
              </>
            )}
          </a>
        );
      })}
    </>
  );
}

/**
 * The skip link and the header row. The phone bar is `SiteNavBar`, rendered by
 * `SiteChrome` after the page, so a keyboard reaches the page before the five tabs.
 *
 * `pill` and `account` sit to the right of the destinations, around search: the
 * timer's pill and the avatar (or "Sign in"). They need the timer and the session,
 * so `SiteChrome` builds them and hands them in. Keeping them out of this file is
 * what keeps `SiteNavLinks` free of hooks and testable.
 */
export function SiteNav({ route, pill, account }: { route: string; pill: ReactNode; account: ReactNode }) {
  return (
    <>
      {/* The first focusable thing on every framed page, parked above the window until it
          has focus. It shows just under the 60px header row (shell round 6), so it no longer
          sits on the wordmark it is skipping. */}
      <a
        href="#main"
        onClick={skipToContent}
        className="fixed top-[68px] left-2 z-50 -translate-y-40 rounded-full border-2 border-[var(--site-hairline)] bg-card px-4 py-2.5 font-bold text-foreground focus:translate-y-0 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        Skip to content
      </a>
      {/* A 1px hairline under the header, not a 2px rule: at night the rule cut a
          bright line across the page (critic, shell round 2). */}
      <header className="site-header sticky top-0 z-40 w-full border-b border-[var(--site-hairline)] bg-card">
        <div className={cn(SITE_CONTAINER, "flex h-[60px] items-center gap-2")}>
          {/* The berry with the name beside it, so the left edge has an anchor
              instead of a lone 32px dot 400px from the tabs. The link's words
              are the wordmark, so a screen reader hears "Blueberry". In the same white
              card with an outline and lip as the game's rail logo (owner, 17 Oct); at
              night the face keeps the card colour so the pale wordmark stays legible. */}
          <a
            href="#/"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-2 border-[#2a1d7a] bg-white py-1 pr-3 pl-1.5 shadow-[0_3px_0_#2a1d7a] transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_4px_0_#2a1d7a] active:translate-y-[3px] active:shadow-none dark:border-[#9d8bff] dark:bg-card dark:shadow-[0_3px_0_#9d8bff]"
          >
            <BlueberryMark eyes className="size-8" />
            <span className="site-wordmark page-title text-xl leading-none text-[var(--bb-deep)]">Blueberry</span>
          </a>

          <nav aria-label="Site" className="hidden h-full flex-1 items-center justify-center gap-1 md:flex">
            <SiteNavLinks route={route} placement="header" />
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {/* `contents` so the wrapper takes no box; it is only there so the
                stylesheet can tell when a timer pill is showing (site-shell.css). */}
            <span className="site-pill contents">{pill}</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("blueberry:open-search"))}
              aria-label="Search reactions, decks and pages"
              title="Search (press /)"
              className="flex size-11 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors duration-200 hover:bg-[var(--bb-wash)]"
            >
              <Search aria-hidden className="size-5" />
            </button>
            {account}
          </div>
        </div>
      </header>
    </>
  );
}

/**
 * The phone bar. Rendered by `SiteChrome` AFTER the page (shell round 5): it is fixed to
 * the bottom edge, so where it sits in the document changes nothing on screen, but it is
 * the order Tab follows. Before, it came right after the header, and a phone keyboard
 * user crossed eight shell stops before the page's own first button.
 */
export function SiteNavBar({ route }: { route: string }) {
  return (
    <>
      {/* A full-width strip on the bottom edge with a 2px rule on top (shell round
          4: the 1px hairline read as a collision when a card's 2px outline scrolled
          up to it). Round 2 floated it as an outlined card 8px off the edges, and the
          page showed through the gap around it. The safe-area padding keeps the five
          clear of a phone's home indicator.
          Shell round 6: the bar is the page's own lavender ground, not the white card.
          White under a lavender rule over a lavender page drew three edges at the seam;
          now the page runs into the bar and the rule is the one edge, Duolingo's one
          plane and one hairline. */}
      <nav
        aria-label="Site, bottom bar"
        className="site-bar fixed inset-x-0 bottom-0 z-40 flex h-[calc(var(--site-bar-h)+env(safe-area-inset-bottom))] items-center border-t-2 border-[var(--site-hairline)] bg-[var(--site-ground)] px-1 pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        <SiteNavLinks route={route} placement="bar" />
      </nav>
    </>
  );
}

/**
 * Room at the foot of the page for the phone bar, so the last line of every
 * page can scroll clear of it. Rendered after the footer by `SiteChrome`.
 */
export function SiteNavSpacer() {
  return <div aria-hidden className="h-[calc(var(--site-bar-h)+env(safe-area-inset-bottom))] md:hidden" />;
}
