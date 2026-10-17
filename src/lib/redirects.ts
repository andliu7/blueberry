/**
 * Retired addresses, and where each one lives now.
 *
 * WHY A TABLE. The rulebook's rule is that every route resolves: an address that is
 * in a student's history or notes never becomes a 404. When a page is retired, its
 * address gets one row here instead of a branch in App's router, so the whole list
 * of moves is readable in one place and a test can walk it (src/test/siteRoutes.test.ts).
 *
 * Keys are the route as `useHashRoute` returns it (no leading "#/", no query);
 * values are full hashes, ready for `location.replace`.
 */
export const REDIRECTS: Record<string, string> = {
  // The Dashboard's Concepts panel promised the arrow pushing would "land here". It
  // landed: the arrow pushing is the game, at #/app (SITE-REPLAN.md section 2).
  "d/concepts": "#/app",
  // The calendar and office hours are one page now, Schedule (SITE-REPLAN.md
  // section 4). Office hours open on the "Find a time" side.
  calendar: "#/schedule",
  tutoring: "#/schedule?view=hours",
  // Lessons and reactions are one destination now, Learn (SITE-REPLAN.md section
  // 3). The lessons hub becomes the Learn index; the second reactions library
  // becomes Learn's reaction search, opened. A bare #/unit lands on the units.
  // `#/lessons/<section>`, `#/lessons/<section>/<reaction>` and `#/unit/<id>`
  // keep their addresses and are not here.
  lessons: "#/learn",
  reactions: "#/learn?search=open",
  unit: "#/learn",
};

/** The new address for a retired route, or null when the route is still live. */
export function redirectFor(route: string): string | null {
  return REDIRECTS[route] ?? null;
}
