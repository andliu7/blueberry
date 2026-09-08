/**
 * The route table. One place that knows what a URL hash means.
 *
 * Hash routing, not path routing, for the reason docs/INHERITED-DECISIONS.md D5
 * records: a static host serves files and rewrites nothing, so "/pathway" 404s
 * on refresh while "#/pathway" never leaves index.html. The sibling repo made
 * the same call for the same reason.
 *
 * Routes are data here and nowhere else. A tab component never reads
 * window.location; it receives what it needs as props from the shell.
 *
 * FIVE TABS, NOT EIGHT AND NOT FOUR. Owner amendment of 2026-08-28, recorded
 * in CLAUDE.md and in docs/OPEN-QUESTIONS.md §4:
 *
 *   "Four tabs: Path, Train, Cards, Me. The periodic table and the reaction
 *   search are not destinations, they are tools a student reaches for mid
 *   problem, so they live in the header and are reachable from every tab and
 *   from inside a lesson. Courses collapses while there is one course.
 *   Leaderboards, chat and tutor messages go behind a flag until their servers
 *   exist. Nothing is deleted and no link 404s."
 *
 * AMENDED 2026-09-01 at the calibration gate, and the amendment is deliberate
 * rather than a slide: the bar is FIVE. Path, Train, Cards, Feed, Me, in that
 * order. CLAUDE.md's tab section carries the supersession in the owner's own
 * words, docs/DESIGN-GOALS.md ("Header and tabs") makes the five-tab goal
 * images binding on the count, and every committed unit image in
 * docs/reference/design-goals/units/ draws exactly those five in exactly that
 * order. Five is mobile-ui's HARD limit, so this bar now sits on the ceiling
 * and no sixth ever joins without one leaving; owner direction of 2026-09-02
 * is that the one leaving is eventually Train, once its surfaces have a named
 * home, which is a later round's brief and not this one's.
 *
 * Feed's server-backed sections render an honest not-open state until their
 * servers exist, per the flagged-surface rule; its daily quests are derived
 * from the LOCAL journal, so they ship live. That is why Feed is `nav` and not
 * `flagged`: the tab has real content today, and only one section of it waits.
 *
 * So a tab id has a PLACEMENT, and the placement is what the shell reads:
 *
 *   nav        the five in the bar. mobile-ui: five is the hard limit, and
 *              tabs are DESTINATIONS
 *   tool       reachable from the header on every screen, and still a route of
 *              its own so a deep link and a browser back button both work
 *   collapsed  reachable, not in the bar, because one course does not need a
 *              browsing surface. #/courses still resolves and still lists all
 *              six, five of them greyed with an honest coming treatment
 *   flagged    built, off by default, still routable. See app/flags.ts
 *
 * Every id in TabId still parses, which is the half of this that is not a
 * design decision: a link a student already has in their history must land on
 * a page, and a tab we stopped showing is not a reason to serve a 404.
 */

export type TabId =
  // the five
  | "pathway"
  | "trainer"
  | "cards"
  | "feed"
  | "me"
  // header tools
  | "periodic"
  | "search"
  // collapsed
  | "courses"
  // behind a flag
  | "leaderboards"
  | "chat"
  | "messages";

export type TabPlacement = "nav" | "tool" | "collapsed" | "flagged";

export interface TabDefinition {
  readonly id: TabId;
  readonly label: string;
  /** Short label for the narrow bottom bar. */
  readonly short: string;
  /** Which phase ships the data behind it. Rendered honestly on stub tabs. */
  readonly dataPhase: 5 | 6 | 7 | 8;
  readonly placement: TabPlacement;
  /**
   * For a tab that is not in the bar, which bar item it lives under.
   *
   * This exists so the bar is never blank. A student on #/courses or #/chat is
   * somewhere real, and a bar with nothing lit reads as a broken state rather
   * than as a considered one. The mapping is where the surface is REACHED from,
   * not where it is filed: Courses hangs off the pathway because the pathway is
   * the course, and everything else off Me because Me is the screen that lists
   * it.
   *
   * A nav tab is its own parent, which is the degenerate case and saves the
   * shell a null check.
   */
  readonly parent: TabId;
}

/**
 * Every tab id, with its placement. NAV_TABS below is the slice the bar draws
 * and its order is the bar's order.
 */
export const ALL_TABS: readonly TabDefinition[] = Object.freeze([
  { id: "pathway", label: "Path", short: "Path", dataPhase: 6, placement: "nav", parent: "pathway" },
  { id: "trainer", label: "Train", short: "Train", dataPhase: 5, placement: "nav", parent: "trainer" },
  { id: "cards", label: "Cards", short: "Cards", dataPhase: 5, placement: "nav", parent: "cards" },
  // Between Cards and Me, which is the order every committed unit image draws
  // and the order the calibration gate named. FeedTab.tsx asked for exactly
  // this row, as FEED_TAB_REQUEST, rather than describing it in a report.
  { id: "feed", label: "Feed", short: "Feed", dataPhase: 5, placement: "nav", parent: "feed" },
  { id: "me", label: "Me", short: "Me", dataPhase: 5, placement: "nav", parent: "me" },
  { id: "periodic", label: "Periodic table", short: "Table", dataPhase: 5, placement: "tool", parent: "me" },
  { id: "search", label: "Reaction search", short: "Search", dataPhase: 5, placement: "tool", parent: "me" },
  { id: "courses", label: "Courses", short: "Courses", dataPhase: 5, placement: "collapsed", parent: "pathway" },
  { id: "leaderboards", label: "Leaderboards", short: "Boards", dataPhase: 6, placement: "flagged", parent: "me" },
  { id: "chat", label: "Ask Blueberry", short: "Chat", dataPhase: 7, placement: "flagged", parent: "me" },
  { id: "messages", label: "Tutor messages", short: "Tutors", dataPhase: 8, placement: "flagged", parent: "me" },
]);

/** The bar. Five items, in this order, and five is the ceiling. */
export const NAV_TABS: readonly TabDefinition[] = Object.freeze(
  ALL_TABS.filter((tab) => tab.placement === "nav"),
);

/**
 * The header tools, in the order they sit in the header.
 *
 * A tool is a thing a student reaches for WITHOUT leaving what they are doing,
 * which is why these are also rendered as a sheet over the current screen. The
 * route is the deep link and the accessible fallback, not the normal way in.
 */
export const TOOL_TABS: readonly TabDefinition[] = Object.freeze(
  ALL_TABS.filter((tab) => tab.placement === "tool"),
);

/** Tabs held behind app/flags.ts. Routable always, linked only when the flag is on. */
export const FLAGGED_TABS: readonly TabDefinition[] = Object.freeze(
  ALL_TABS.filter((tab) => tab.placement === "flagged"),
);

export type ToolId = "periodic" | "search";

export type Route =
  | { readonly kind: "tab"; readonly tab: TabId; readonly rest: readonly string[] }
  | { readonly kind: "onboarding"; readonly step: string }
  /**
   * One pathway node played as a lesson beat: "#/lesson/u3-directing". Its own
   * route rather than a tab because a beat is a full screen task with an exit,
   * the same shape onboarding has, and because the tab bar would offer an
   * escape hatch mid question.
   */
  | { readonly kind: "lesson"; readonly node: string }
  /**
   * Development surfaces. Deliberately NOT in ALL_TABS, so nothing renders a
   * link to them. Reached by typing the hash, which is the right amount of
   * friction for a page whose audience is a critic and an author.
   */
  | { readonly kind: "gallery"; readonly name: string };

const TAB_IDS = new Set<string>(ALL_TABS.map((tab) => tab.id));

/** "#/courses/orgo_2/aromaticity" gives tab courses, rest [orgo_2, aromaticity]. */
export function parseHash(hash: string): Route {
  const parts = hash
    .replace(/^#\/?/, "")
    .split("?")[0]!
    .split("/")
    .filter((part) => part.length > 0)
    .map(decodeURIComponent);

  const head = parts[0];
  if (head === "start") return { kind: "onboarding", step: parts[1] ?? "welcome" };
  // A lesson with no node is not a lesson, so it falls through to the trainer
  // rather than rendering an empty runner.
  if (head === "lesson" && parts[1] !== undefined) return { kind: "lesson", node: parts[1] };
  // "#/review" is the hash the Charge sheet has been handing out since Phase 5
  // and it is in students' history. The deck became the Cards tab; the old link
  // lands on it rather than on a 404.
  if (head === "review") return { kind: "tab", tab: "cards", rest: [] };
  if (head === "gallery") return { kind: "gallery", name: parts[1] ?? "berry" };
  if (head !== undefined && TAB_IDS.has(head)) {
    return { kind: "tab", tab: head as TabId, rest: parts.slice(1) };
  }
  return { kind: "tab", tab: "pathway", rest: [] };
}

/**
 * A query parameter carried INSIDE the hash, as in "#/trainer?reaction=seq-eas".
 *
 * WHY THE HASH AND NOT location.search. A deep link written as
 * "?reaction=seq-eas#/trainer" changes location.search, and changing the search
 * string is a DOCUMENT NAVIGATION: the page reloads, every module re-evaluates,
 * and the front-door loader replays. Measured on the pathway: one mainFrame
 * navigation, a sentinel set before the press gone afterwards, and roughly two
 * seconds of "FINDING YOUR PLACE" where the mechanism should be. Every "?hunt="
 * and "?sequence=" node on the map did this, which is every mechanism in the
 * product.
 *
 * Putting the parameter after the hash makes the same link a hash change, which
 * is what this app's router already listens for. parseHash has always done
 * `.split("?")[0]`, so a query inside the hash was already tolerated by the
 * route parser; nothing had used it.
 *
 * Reads the hash first and falls back to the real search string, so links a
 * student already has in their history keep working. That fallback is the whole
 * reason this is a function rather than an inline URLSearchParams call.
 */
export function hashParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  const q = hash.indexOf("?");
  if (q !== -1) {
    const found = new URLSearchParams(hash.slice(q + 1)).get(name);
    if (found !== null) return found;
  }
  return new URLSearchParams(window.location.search).get(name);
}

export function hrefForTab(tab: TabId, ...rest: readonly string[]): string {
  return `#/${[tab, ...rest].map(encodeURIComponent).join("/")}`;
}

export function hrefForLesson(node: string): string {
  return `#/lesson/${encodeURIComponent(node)}`;
}

/** The review deck. The Charge sheet's free way out points here. */
export function hrefForReview(): string {
  return hrefForTab("cards");
}

export function hrefForOnboarding(step: string): string {
  return `#/start/${encodeURIComponent(step)}`;
}

/** Development only. Nothing in the shell renders this; it is typed by hand. */
export function hrefForGallery(name: string): string {
  return `#/gallery/${encodeURIComponent(name)}`;
}

export function tabDefinition(id: TabId): TabDefinition {
  const found = ALL_TABS.find((tab) => tab.id === id);
  if (found === undefined) throw new Error(`no tab ${id}`);
  return found;
}
