import { useHashRoute } from "@/lib/useHashRoute";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";

/**
 * The account, in the top right of a page that has no bar of its own.
 *
 * Four pages carry `SiteHeader` and therefore already have the avatar in the
 * row: home, study decks, a folder, and contact. Every other page — lessons, the
 * calendar, tutoring, reactions, the composer, the workspace, terms — is a back
 * link at the top left and nothing else, so signing out or checking your role
 * meant going home first.
 *
 * One floating control rather than editing eight page layouts. Each of those
 * pages owns its own header markup, and threading the same block through all of
 * them is eight chances for it to end up in a slightly different place; here it
 * is in one place by construction.
 *
 * **It decides for itself rather than being told.** `App` is a router of early
 * returns, so there is no single place in it that wraps every page; asking each
 * branch to opt in is the same eight-places problem one level up. Reading the
 * route here keeps "which pages already have an avatar" as one list.
 *
 * `z-30` deliberately: below the dashboard (z-60) and the search and About
 * overlays (z-100+), so it can never sit on top of a dialog, and above ordinary
 * page content, which is the point.
 */

/** Routes whose page already draws `SiteHeader`, avatar included. */
const HAS_HEADER = new Set(["", "home", "study-decks", "contact", "about"]);

/** And the sign-in page, which is its own full-screen surface. */
const NO_CORNER = new Set(["signin", "signup", "staff"]);

export function AccountCorner() {
  const route = useHashRoute();

  if (HAS_HEADER.has(route) || NO_CORNER.has(route)) return null;
  // Folder pages carry the header too, and they are `folder/<id>`.
  if (route.startsWith("folder/")) return null;

  return (
    <div className="pointer-events-none fixed top-3 right-3 z-30 sm:top-4 sm:right-4">
      {/* Pointer events are switched off on the positioner and back on for the
          control itself, so the invisible box does not swallow clicks aimed at
          whatever the page has in its top right corner. */}
      <div className="pointer-events-auto">
        <ProfileDropdown />
      </div>
    </div>
  );
}

export default AccountCorner;
