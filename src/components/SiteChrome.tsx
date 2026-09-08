import { FocusTimer } from "@/components/FocusTimer";
import { GlobalSearch } from "@/components/GlobalSearch";
import { AccountCorner } from "@/components/ui/account-corner";
import { BlueberryBot } from "@/components/ui/blueberry-bot";
import { useHashRoute } from "@/lib/useHashRoute";

/**
 * The persistent overlays, and the one screen they stand down for.
 *
 * These four are mounted outside `App` on purpose: the timer has to keep
 * counting across a route change, and the rest dock into a shared corner that
 * would remount with every page. That is still true. What is new is that one
 * route is not a page of this site but a whole other app: the game draws its own
 * header, its own five-tab bar along the bottom edge, and its own mascot. The
 * timer and the bot dock into precisely the corner the game puts its tab bar in,
 * and the site's berry would sit on top of the game's.
 *
 * So they render everywhere except there. `GlobalSearch` goes too: it answers
 * the "/" key, which inside a chemistry app is a character somebody is trying to
 * type rather than a shortcut they meant to press.
 */
export function SiteChrome() {
  const route = useHashRoute();
  if (route === "app" || route.startsWith("app/")) return null;

  return (
    <>
      <FocusTimer />
      <GlobalSearch />
      <BlueberryBot />
      <AccountCorner />
    </>
  );
}
