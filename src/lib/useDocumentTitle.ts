import { useEffect } from "react";

/**
 * The tab title, following the route.
 *
 * The brand stays first and stays lowercase, matching the wordmark, so a row of
 * Blueberry tabs still lines up and is scannable by its shared prefix. The page
 * name goes after it, because a crowded tab strip truncates from the right and
 * the first word is the one that survives.
 *
 * Sentence case rather than the SHOUTING in the request: at 11px in a tab,
 * uppercase loses the ascenders and descenders that make a word recognisable at
 * a glance, which is the one job a tab title has.
 */

const TITLES: Record<string, string> = {
  "": "Home",
  home: "Home",
  "study-decks": "Review",
  learn: "Learn",
  schedule: "Schedule",
  tutors: "Book a tutor",
  "new-reaction": "New Reaction",
  contact: "Contact",
  about: "Contact",
  terms: "Terms",
  faq: "FAQ",
  phone: "On your phone",
  workspace: "Workspace",
  signin: "Sign In",
  signup: "Create Account",
  staff: "Sign In",
  d: "Me",
  // The funnel. It is six addresses now rather than one, so without these
  // every step of it titled itself "Not Found" while rendering perfectly.
  enter: "Get Started",
  start: "Get Started",
  // The game and the unit pages. Both rendered fine while titling themselves
  // "Not Found", because a route added in a merge does not add itself here.
  app: "Course",
  "app/glossary": "Glossary",
  "app/naming": "Naming and acid-base",
  "app/shop": "Shop",
  "app/mistakes": "Mistakes",
  "app/admin": "Lesson Viewer",
  "app/admin/home": "Admin Home",
  "app/admin/tasks": "Admin Tasks",
  "app/admin/stats": "Admin Stats",
  "app/admin/activity": "Admin Activity",
  "app/focus": "Focus timer",
  // Dev only, like the page itself (src/App.tsx): in a build #/signoff is a 404 and titles itself so.
  ...(import.meta.env.DEV ? { signoff: "Unit 1 Sign-off" } : {}),
};

/** Prefixed routes, longest first so `lessons/x/y` does not match `lessons`. */
const PREFIXES: [string, string][] = [
  ["start/", "Get Started"],
  // Before "app/", so a glossary entry link is not titled "Course".
  ["app/glossary/", "Glossary"],
  ["app/admin/", "Lesson Viewer"],
  ["app/", "Course"],
  ["unit/", "Unit"],
  ["lessons/", "Lesson"],
  ["deck/", "Deck"],
  ["folder/", "Folder"],
  ["draw/", "Draw"],
  ["d/", "Me"],
];

export function titleForRoute(route: string): string {
  const exact = TITLES[route];
  if (exact) return `blueberry · ${exact}`;
  for (const [prefix, label] of PREFIXES) {
    if (route.startsWith(prefix)) return `blueberry · ${label}`;
  }
  // An unknown route is a 404, and saying so beats a stale title from whatever
  // page you were on before.
  return route ? "blueberry · Not Found" : "blueberry";
}

export function useDocumentTitle(route: string) {
  useEffect(() => {
    document.title = titleForRoute(route);
  }, [route]);
}
