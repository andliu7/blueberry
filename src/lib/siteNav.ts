import { GAME_HREF } from "@/game/app/routes";

/**
 * The site's five destinations, in one list (SITE-REPLAN.md section 6, owner
 * answer of 2026-10-07: Learn, Practice, Review, Schedule, Me).
 *
 * WHY ONE LIST. The same five are drawn three ways: the desktop header, the phone
 * tab bar and the footer. Each reads this array, so a sixth destination or a
 * renamed one is one edit here and cannot drift between the three.
 *
 * `routes` says which addresses count as being "in" a destination, so the header
 * can mark it with `aria-current="page"`. A route belongs to a destination when it
 * equals one of these or starts with one of them followed by "/".
 *
 * Learn points at the Learn index, `#/learn` (phase 5; `#/lessons` now redirects there);
 * Practice is the game, through its own route helper so the `#/app` prefix is
 * never typed by hand (repo CLAUDE.md).
 */
export interface Destination {
  id: "learn" | "practice" | "review" | "schedule" | "me";
  label: string;
  href: string;
  routes: readonly string[];
}

export const DESTINATIONS: readonly Destination[] = [
  { id: "learn", label: "Learn", href: "#/learn", routes: ["learn", "lessons", "reactions", "unit", "draw"] },
  { id: "practice", label: "Practice", href: GAME_HREF, routes: ["app"] },
  { id: "review", label: "Review", href: "#/study-decks", routes: ["study-decks", "folder", "deck"] },
  { id: "schedule", label: "Schedule", href: "#/schedule", routes: ["schedule"] },
  { id: "me", label: "Me", href: "#/d", routes: ["d", "workspace", "new-reaction"] },
];

/** The destination a route sits in, or null (home, contact, terms, a 404). */
export function destinationFor(route: string): Destination["id"] | null {
  for (const d of DESTINATIONS) {
    if (d.routes.some((r) => route === r || route.startsWith(`${r}/`))) return d.id;
  }
  return null;
}

/**
 * Flows, not destinations: the sign-in pages, the entry gate and the site funnel.
 * Each is a full-screen step with its own back control and its own button along
 * the bottom, so the site's header, phone bar and footer stand down there (the
 * phone bar would sit on the funnel's Continue button, audit F1).
 */
export function isFlowRoute(route: string): boolean {
  return (
    route === "signin" ||
    route === "signup" ||
    route === "staff" ||
    route === "enter" ||
    route === "start" ||
    route.startsWith("start/")
  );
}
