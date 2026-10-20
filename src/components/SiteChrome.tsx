import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteNav, SiteNavBar, SiteNavSpacer } from "@/components/ui/site-nav";
import "@/components/ui/site-shell.css";
import { useFocusTimer } from "@/lib/useFocusTimer";
import { useHashRoute } from "@/lib/useHashRoute";
import { isFlowRoute } from "@/lib/siteNav";
import { useReducedMotionPref } from "@/lib/motionPref";
import { startCardGlow } from "@/lib/cardGlow";

/*
 * The timer (card and header pill) and the assistant load as their own chunks
 * (owner, 2026-10-20). None of them is drawn inside the game, so `#/app` never
 * downloads them; on the site they arrive just after the first paint. React
 * pattern: React.lazy plus a Suspense with a null fallback, so nothing is drawn
 * in their place for the moment the chunk takes. The pill and the bot draw
 * nothing until used anyway, and the timer card is a corner launcher.
 */
const FocusTimer = lazy(() => import("@/components/FocusTimer").then((m) => ({ default: m.FocusTimer })));
const FocusPill = lazy(() => import("@/components/FocusTimer").then((m) => ({ default: m.FocusPill })));
const BlueberryBot = lazy(() => import("@/components/ui/blueberry-bot").then((m) => ({ default: m.BlueberryBot })));

/**
 * Everything that frames the pages: the header and phone bar, the footer, and
 * the overlays that must outlive a route change (the timer card, search, the
 * assistant).
 *
 * Mounted outside `App` on purpose (see `main.tsx`): the timer has to keep
 * counting across a navigation, and a header drawn here is one header for every
 * page, which is the point of SITE-REPLAN.md phase 3.
 *
 * WHERE IT STANDS DOWN.
 * - `#/app/...`, the game: it draws its own header, its own five-tab bar and its
 *   own mascot, so all of this would collide with it (the bridge between the two
 *   is phase 9). `GlobalSearch` goes too: it answers the "/" key, which inside a
 *   chemistry app is a character somebody is trying to type.
 * - The flows (sign-in, the entry gate, the funnel): full-screen steps with their
 *   own back control and a button along the bottom that the phone bar would
 *   cover. The overlays stay; the frame goes.
 *
 * WHY THE TIMER IS CALLED HERE. `useFocusTimer` keeps its state per caller, so
 * the header's pill and the corner card each calling it would be two clocks.
 * Called once here and passed to both, there is one.
 *
 * WHY THE PAGE IS `children`. The header has to come before the page in the
 * document, and the phone bar and the footer after it (the bar is fixed to the bottom
 * edge, so its place in the document only sets the Tab order, shell round 5). So
 * this wraps the router: `main.tsx` renders
 * `<SiteChrome><App /></SiteChrome>`. React pattern: "children as props". The
 * timer re-renders this component every second, but `<App />` was created by
 * `main.tsx`, not here, so React sees the same element each time and does not
 * re-render the page.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const route = useHashRoute();
  const timer = useFocusTimer();
  const inGame = route === "app" || route.startsWith("app/");
  const framed = !inGame && !isFlowRoute(route);
  const reduced = useReducedMotionPref();

  // One pointermove listener for the whole site that feeds the card glow
  // (site-shell.css). React pattern: an effect with [] runs once after the first
  // paint, and the function it returns removes the listener if SiteChrome unmounts.
  useEffect(() => startCardGlow(), []);

  // One shape for every route, with each part switched on or off in place.
  // Returning a different shape for the game (just `children`) would move
  // `children` to a different position in the list, and React would then
  // unmount and remount the whole router on every trip into or out of the game.
  //
  // `MotionConfig` (shell round 5) tells every motion/react animation inside it, page or
  // shell, to follow html[data-motion] rather than only the OS: the footer's Reduce motion
  // switch now stops transforms everywhere. "never" when the switch is off, so a visitor
  // who chose full motion gets it even if the OS asks for less. The game keeps
  // motion/react's default ("user", the OS), so this round changes nothing under #/app.
  const motionMode = inGame ? "user" : reduced ? "always" : "never";
  return (
    <MotionConfig reducedMotion={motionMode}>
      {!inGame && <div className="site-wash" aria-hidden />}
      {framed && (
        <SiteNav
          route={route}
          pill={
            <Suspense fallback={null}>
              <FocusPill t={timer} />
            </Suspense>
          }
          account={<ProfileDropdown />}
        />
      )}
      {children}
      {framed && <SiteNavBar route={route} />}
      {framed && <SiteFooter />}
      {framed && <SiteNavSpacer />}
      {!inGame && (
        <Suspense fallback={null}>
          <FocusTimer t={timer} />
        </Suspense>
      )}
      {!inGame && <GlobalSearch />}
      {!inGame && (
        <Suspense fallback={null}>
          <BlueberryBot />
        </Suspense>
      )}
    </MotionConfig>
  );
}
