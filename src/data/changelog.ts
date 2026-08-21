/**
 * What changed on the site, said plainly.
 *
 * This is the source for the "This week" tab in Notifications. It is a
 * hand-written file on purpose: the git history knows every change, but it
 * speaks in commit messages, and a student does not care that an Edge
 * Function moved or that a shader recomputed its normals. An entry here says
 * what a person using the site would actually notice, in a sentence or two.
 *
 * The rule for writing one: if a visitor would not notice it, it does not go
 * in. Refactors, fixes to things nobody saw broken, and infrastructure stay
 * out. Newest first. Dates are ISO so the week filter can do arithmetic.
 *
 * When you ship something noticeable, add its entry in the same change.
 */

export interface ChangelogEntry {
  /** ISO date of the day it went live. */
  date: string;
  /** A short name for the change, a few words. */
  title: string;
  /** One or two plain sentences on what it means for someone using the site. */
  body: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-08-21",
    title: "The front page gets to the point",
    body: "The home page now opens on what the site is and one Get Started button, instead of a long animation before anything can be pressed. The berry-window animation still plays - scroll and it opens.",
  },
  {
    date: "2026-08-20",
    title: "Get Started walks you in",
    body: "The big button now starts a short setup: set your goals, try a lesson free with no account, and save what you built. About two minutes.",
  },
  {
    date: "2026-08-19",
    title: "Ask Blueberry works when you are signed in",
    body: "The assistant stopped refusing signed-in users. If something does go wrong now, it tells you what, instead of a generic error.",
  },
  {
    date: "2026-08-19",
    title: "The blueberry got a glow-up",
    body: "A rounder body, a crown you can actually see, eyes that match the logo, and little hearts if you hover on him. He also follows your mouse now.",
  },
  {
    date: "2026-08-19",
    title: "Browser tabs say where you are",
    body: "Each page names its tab - Home, Study Decks, a lesson - so the right tab is findable when you have six open.",
  },
  {
    date: "2026-08-19",
    title: "The calendar fits on one screen",
    body: "The month view no longer scrolls forever, and importing dates from a file sits behind one small control instead of a big panel.",
  },
  {
    date: "2026-08-17",
    title: "Lessons lead the home board",
    body: "The reading comes before the flashcards on the front page, because drilling cards for ideas you have not read yet is how an evening gets wasted.",
  },
];

/**
 * Entries from the last `days` days - and if that window is empty, the most
 * recent day that has any, so the tab never opens onto nothing while the site
 * is being worked on less often.
 */
export function recentChangelog(days = 7): ChangelogEntry[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = CHANGELOG.filter((e) => new Date(`${e.date}T12:00:00Z`).getTime() >= cutoff);
  if (recent.length > 0) return recent;
  const latest = CHANGELOG[0]?.date;
  return latest ? CHANGELOG.filter((e) => e.date === latest) : [];
}
