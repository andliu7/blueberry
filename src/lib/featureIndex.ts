/**
 * Everything on this site that someone could go looking for.
 *
 * The search used to open the dashboard, which is not searching: it is one
 * fixed destination wearing a magnifying glass. This is the list it should have
 * been looking through all along.
 *
 * Written by hand rather than derived. A crawler over the router would find
 * routes, and half of what people actually want here is not a route: turning on
 * the rainforest, starting a focus session, taking an eye rest. Those are
 * features with no address, and they are exactly the ones that are hard to find
 * by clicking around.
 *
 * `keywords` carries the words someone would type that do not appear in the
 * label. Nobody searches for "Appearance" when they want dark mode.
 */

export type FeatureKind = "page" | "panel" | "action" | "deck" | "reaction";

export interface Feature {
  id: string;
  label: string;
  blurb: string;
  kind: FeatureKind;
  keywords: string[];
  /** Where it goes. Actions use `event` instead. */
  href?: string;
  /** A window event to fire, for the things that are not pages. */
  event?: string;
  /** A dashboard view to open, for the things that live in the panel. */
  view?: string;
}

export const FEATURES: Feature[] = [
  {
    id: "home",
    label: "Home",
    blurb: "The opening, the wordmark and the board of everything else",
    kind: "page",
    href: "#/home",
    keywords: ["front", "landing", "start", "intro", "main"],
  },
  {
    id: "decks",
    label: "Study Decks",
    blurb: "Every flashcard deck, grouped by folder",
    kind: "page",
    href: "#/study-decks",
    keywords: ["flashcards", "cards", "revise", "practice", "hub", "library"],
  },
  {
    id: "lessons",
    label: "Lessons",
    blurb: "Carbonyls, written out in seven sections",
    kind: "page",
    href: "#/lessons",
    keywords: ["carbonyl", "reading", "notes", "theory", "mechanism", "video"],
  },
  {
    id: "contact",
    label: "Contact",
    blurb: "The form, and the other ways of reaching Andrew",
    kind: "page",
    href: "#/contact",
    keywords: ["email", "message", "reach", "about", "get in touch"],
  },
  {
    id: "workspace",
    label: "Workspace",
    blurb: "Feedback and the to-do board. Staff only",
    kind: "page",
    href: "#/workspace",
    keywords: ["admin", "staff", "todo", "board", "owner", "backstage"],
  },

  {
    id: "focus",
    label: "Focus timer",
    blurb: "Set a session, keep a task list, get told to look away",
    kind: "action",
    event: "blueberry:open-focus",
    keywords: ["pomodoro", "timer", "study", "session", "clock", "tasks", "20-20-20", "eyes"],
  },
  {
    id: "break",
    label: "Break: Tetris and sound",
    blurb: "The game and the noise beds, in the timer card",
    kind: "action",
    event: "blueberry:open-focus",
    keywords: ["tetris", "game", "white noise", "rainforest", "rain", "music", "sound", "audio", "play"],
  },
  {
    id: "theme",
    label: "Light and dark",
    blurb: "Switch the theme",
    kind: "action",
    event: "blueberry:toggle-theme",
    keywords: ["dark mode", "light mode", "night", "appearance", "contrast", "colour", "color"],
  },

  {
    id: "dashboard",
    label: "Dashboard",
    blurb: "Progress, categories and settings in one panel",
    kind: "panel",
    view: "home",
    keywords: ["overview", "stats", "progress", "account", "panel"],
  },
  {
    id: "settings",
    label: "Settings",
    blurb: "How the site behaves",
    kind: "panel",
    view: "settings",
    keywords: ["preferences", "options", "configure"],
  },
  {
    id: "appearance",
    label: "Appearance",
    blurb: "Theme and how the site looks",
    kind: "panel",
    view: "appearance",
    keywords: ["dark", "light", "theme", "colour", "color", "font"],
  },
  {
    id: "profile",
    label: "Profile",
    blurb: "Your account and what it can do",
    kind: "panel",
    view: "profile",
    keywords: ["account", "sign in", "login", "member", "subscriber"],
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    blurb: "Not built yet",
    kind: "panel",
    view: "subscriptions",
    keywords: ["billing", "pay", "premium", "plan", "upgrade"],
  },
];

/**
 * Ranked matches for what has been typed.
 *
 * Scored rather than filtered, because the difference between a search that
 * feels good and one that does not is entirely in the order. A label that
 * *starts* with the query beats one that merely contains it, which beats one
 * that only matches on a keyword. Without that, typing "de" puts "Not built
 * yet" above "Study Decks".
 */
export function searchFeatures(query: string, extra: Feature[] = []): Feature[] {
  const all = [...FEATURES, ...extra];
  const q = query.trim().toLowerCase();
  if (!q) return all.filter((f) => f.kind !== "deck").slice(0, 8);

  const scored = all
    .map((f) => {
      const label = f.label.toLowerCase();
      let score = 0;
      if (label === q) score = 100;
      else if (label.startsWith(q)) score = 80;
      else if (label.includes(q)) score = 60;
      else if (f.keywords.some((k) => k.startsWith(q))) score = 45;
      else if (f.keywords.some((k) => k.includes(q))) score = 30;
      else if (f.blurb.toLowerCase().includes(q)) score = 15;
      // A deck matching only weakly should not outrank a feature that matches
      // well: there are far more decks than features, and they would flood it.
      if (f.kind === "deck") score -= 5;
      // Reactions get the opposite nudge. Typing a reaction name is one of the
      // most specific things anybody does here - "aldol" means the aldol, not
      // the lessons page that happens to mention it - so a named reaction
      // should sit above the page it lives on.
      if (f.kind === "reaction" && score >= 60) score += 10;
      return { f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.f.label.localeCompare(b.f.label));

  return scored.slice(0, 12).map((x) => x.f);
}
