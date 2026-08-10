import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Atom,
  Bell,
  BookOpen,
  CreditCard,
  ExternalLink,
  House,
  Info,
  LayoutGrid,
  Layers,
  LogIn,
  Palette,
  Search,
  Settings,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react";
import {
  Sidebar,
  SidebarNavItem,
  SidebarProfile,
  CollapsibleSection,
  AnimatedMenuToggle,
} from "@/components/ui/sidebar";
import { CourseTree } from "@/components/ui/course-tree";
import { SearchResults } from "@/components/ui/deck-search";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { deckCount, deckHref, type Deck } from "@/data/types";
import { searchDecks } from "@/lib/searchDecks";
import { reviewedCount } from "@/lib/progress";
import { timeAgo } from "@/lib/workspace";
import { useDecks } from "@/lib/useDecks";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { useIsDark } from "@/lib/useIsDark";
import { SURFACE } from "@/lib/hubSurface";
import { cn } from "@/lib/utils";

/**
 * The dashboard: everything the site can do, in one surface laid over the page.
 *
 * It replaces the Browse drawer, which was a course tree and nothing else. That
 * was the right size while study decks *were* the site. They are not going to
 * be â€” lessons and mechanism practice are coming, subscriptions are coming, and
 * accounts are coming â€” and none of that fits in a drawer whose only idea is a
 * list of folders.
 *
 * **A panel over the page rather than a route.** You reach this by clicking
 * search, which happens in the middle of reading a deck; navigating away from
 * what you were reading in order to search it would be the wrong trade. Escape,
 * the backdrop and the âœ• all put you back exactly where you were. When Settings
 * and Notifications grow into pages worth linking to, they can graduate to
 * routes of their own without this having to change shape.
 *
 * The sections that are not built yet say so, in the nav and in the panel. A
 * greyed row marked "soon" is a promise; a row that opens onto a convincing
 * empty page is a bug report waiting to happen.
 */

export type DashboardView =
  | "home"
  | "notifications"
  | "settings"
  | "appearance"
  | "categories"
  | "lessons"
  | "concepts"
  | "decks"
  | "subscriptions"
  | "imports"
  | "profile";

const VIEW_TITLE: Record<DashboardView, string> = {
  home: "Dashboard",
  notifications: "Notifications",
  settings: "Settings",
  appearance: "Appearance",
  categories: "Categories",
  lessons: "Lessons",
  concepts: "Concepts",
  decks: "Study Decks",
  subscriptions: "Subscriptions",
  imports: "Imports",
  profile: "Profile",
};

/** The mechanism trainer, which is its own app until Concepts absorbs it. */
const TRAINER_URL = "https://andliu7.github.io/mechanism_trainer/";

/**
 * Open state, held by the page so the header can drive it.
 *
 * `view === null` is closed. One piece of state rather than a boolean plus a
 * view, because the two can never legally disagree: there is no such thing as
 * open-on-nothing, and a separate boolean is how you end up with a panel that
 * opens onto whatever you were looking at three clicks ago.
 */
export function useDashboard() {
  const [view, setView] = useState<DashboardView | null>(null);
  const [focusSearch, setFocusSearch] = useState(false);

  const open = useCallback((next: DashboardView = "home", opts?: { focusSearch?: boolean }) => {
    setView(next);
    setFocusSearch(Boolean(opts?.focusSearch));
  }, []);

  const close = useCallback(() => {
    setView(null);
    setFocusSearch(false);
  }, []);

  /** For a button that is both the way in and the way out, like Browse. */
  const toggle = useCallback((next: DashboardView = "home") => {
    setView((cur) => (cur === null ? next : null));
  }, []);

  return { view, focusSearch, open, close, toggle, setView, isOpen: view !== null };
}

export type DashboardState = ReturnType<typeof useDashboard>;

/** Decks added recently enough to be worth announcing, newest first. */
function useUpdates() {
  const { decks, published } = useDecks();
  return useMemo(() => {
    const fromBuiltins = decks
      .filter((d) => d.added)
      .map((d) => ({ id: `built:${d.id}`, deck: d, at: d.added!, note: "New deck on the site" }));
    // Publishing appends to the sheet, so its own row order reversed is newest
    // first. Republishing overwrites the original row rather than adding one, so
    // a corrected re-upload keeps its old place instead of jumping the queue.
    const fromUploads = [...published]
      .reverse()
      .map((d) => ({ id: `pub:${d.id}`, deck: d as Deck, at: "", note: "Published from a text file" }));
    return [...fromBuiltins.sort((a, b) => (a.at < b.at ? 1 : -1)), ...fromUploads];
  }, [decks, published]);
}

const SEEN_KEY = "blueberry_seen_updates";

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function Dashboard({
  dash,
  /**
   * What the page's own search box currently holds.
   *
   * Copied in when the panel opens rather than shared. The two searches have
   * different scopes on purpose â€” a folder page filters its own folder, this
   * one covers the whole site â€” so binding them to one string would mean
   * opening the dashboard from inside Carbonyls silently widened the filter you
   * were already using. Seeding is the useful half of sharing without that.
   */
  seedQuery = "",
}: {
  dash: DashboardState;
  seedQuery?: string;
}) {
  const { view, focusSearch, open, close, isOpen } = dash;
  const isDark = useIsDark();
  const reduce = useReducedMotion();
  const surface = isDark ? SURFACE.dark : SURFACE.light;
  const { decks } = useDecks();
  const updates = useUpdates();

  const [query, setQuery] = useState(seedQuery);
  const [mobileNav, setMobileNav] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(loadSeen);

  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  const unread = updates.filter((u) => !seen.has(u.id)).length;

  // Opening is what re-seeds the query, not every keystroke in the page's box.
  useEffect(() => {
    if (isOpen) setQuery(seedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Arriving at Notifications is what marks them read. Not the badge being
  // rendered, and not opening the dashboard at all: a count you never looked at
  // should still be there next time.
  useEffect(() => {
    if (view !== "notifications" || updates.length === 0) return;
    const ids = updates.map((u) => u.id);
    setSeen(new Set(ids));
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
    } catch {
      /* a browser refusing storage just means the badge comes back */
    }
  }, [view, updates]);

  useEffect(() => {
    if (!isOpen) return;

    returnFocusTo.current = document.activeElement;
    // The panel rather than the first control: focus landing on a nav row would
    // read as having already chosen something.
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      (returnFocusTo.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen, close]);

  // Only once the search view is actually mounted, or the ref is still null.
  useEffect(() => {
    if (isOpen && focusSearch && view === "decks") searchRef.current?.focus();
  }, [isOpen, focusSearch, view]);

  // Picking a destination on a phone should put the nav away behind you.
  const go = useCallback(
    (next: DashboardView) => {
      open(next);
      setMobileNav(false);
    },
    [open],
  );

  const nav = (
    <Sidebar
      profile={<ProfileButton onClick={() => go("profile")} />}
      footer={
        <button
          type="button"
          onClick={() => go("profile")}
          className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3 py-2 text-center text-sm font-semibold text-white transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
        >
          View profile
        </button>
      }
    >
      <div className="space-y-0.5">
        <SidebarNavItem
          icon={<House className="size-4" />}
          label="Home"
          active={view === "home"}
          onClick={() => go("home")}
        />
        <SidebarNavItem
          icon={<Bell className="size-4" />}
          label="Notifications"
          badge={unread}
          active={view === "notifications"}
          onClick={() => go("notifications")}
        />
      </div>

      <div className="mt-2">
        {/* Appearance sits under Settings rather than beside Subscriptions.
            Which theme the site is in is a setting; what you are paying for is
            not, and the two only shared a heading because both were leftovers. */}
        <CollapsibleSection
          title="Settings"
          icon={<Settings className="size-4" />}
          active={view === "settings"}
          onHeaderClick={() => go("settings")}
        >
          <SidebarNavItem
            icon={<Palette className="size-4" />}
            label="Appearance"
            active={view === "appearance"}
            onClick={() => go("appearance")}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Categories"
          icon={<LayoutGrid className="size-4" />}
          defaultOpen
          active={view === "categories"}
          onHeaderClick={() => go("categories")}
        >
          <SidebarNavItem
            icon={<BookOpen className="size-4" />}
            label="Lessons"
            muted
            active={view === "lessons"}
            onClick={() => go("lessons")}
          />
          <SidebarNavItem
            icon={<Atom className="size-4" />}
            label="Concepts"
            muted
            active={view === "concepts"}
            onClick={() => go("concepts")}
          />
          <SidebarNavItem
            icon={<Layers className="size-4" />}
            label="Study Decks"
            active={view === "decks"}
            onClick={() => { window.location.hash = "#/study-decks"; }}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Extra Options" icon={<Sparkles className="size-4" />}>
          <SidebarNavItem
            icon={<CreditCard className="size-4" />}
            label="Subscriptions"
            muted
            active={view === "subscriptions"}
            onClick={() => go("subscriptions")}
          />
          <SidebarNavItem
            icon={<Upload className="size-4" />}
            label="Imports"
            muted
            active={view === "imports"}
            onClick={() => go("imports")}
          />
        </CollapsibleSection>

        <CollapsibleSection title="More info" icon={<Info className="size-4" />}>
          <p className="px-3 py-2 text-xs leading-relaxed text-slate-500 dark:text-stone-400">
            Blueberry is a study site for University of Maryland organic chemistry, built by a
            student who was revising for the same assessments. Progress and ratings are kept in
            this browser only.
          </p>
        </CollapsibleSection>
      </div>
    </Sidebar>
  );

  return createPortal(
    <AnimatePresence>
      {isOpen && view && (
        <div className="fixed inset-0 z-[60] flex items-stretch justify-center sm:items-center sm:p-6">
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            aria-hidden
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Blueberry dashboard"
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 10, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 220, damping: 26, mass: 0.7 }}
            style={{ backgroundColor: surface.base }}
            className="relative flex h-full w-full max-w-6xl overflow-hidden border-slate-200 shadow-2xl outline-none sm:h-[min(88vh,880px)] sm:rounded-3xl sm:border dark:border-stone-700"
          >
            {/* The column, permanent from `md` up. Below that it comes over the
                content instead, because a 256px rail and a readable panel do
                not both fit on a phone. */}
            <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 md:block dark:border-stone-700/70">
              {nav}
            </aside>

            <AnimatePresence>
              {mobileNav && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileNav(false)}
                    className="absolute inset-0 z-20 bg-slate-950/40 md:hidden"
                    aria-hidden
                  />
                  <motion.aside
                    initial={reduce ? false : { x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={reduce ? undefined : { x: "-100%" }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    style={{ backgroundColor: surface.base }}
                    className="absolute inset-y-0 left-0 z-30 w-72 max-w-[85vw] border-r border-slate-200 md:hidden dark:border-stone-700"
                  >
                    {nav}
                  </motion.aside>
                </>
              )}
            </AnimatePresence>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex shrink-0 items-center gap-2 border-b border-slate-200/80 px-4 py-3 sm:px-6 dark:border-stone-700/70">
                <AnimatedMenuToggle
                  isOpen={mobileNav}
                  toggle={() => setMobileNav((o) => !o)}
                  className="md:hidden"
                />
                <h2 className="title-face min-w-0 flex-1 truncate text-lg text-slate-900 sm:text-xl dark:text-stone-100">
                  {VIEW_TITLE[view]}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close the dashboard"
                  className="cursor-pointer rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                >
                  <X className="size-4" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <Panel
                  view={view}
                  decks={decks}
                  query={query}
                  onQuery={setQuery}
                  searchRef={searchRef}
                  updates={updates}
                  go={go}
                  onClose={close}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * The pill in the site header that opens it, inherited from the Browse button
 * it replaces.
 *
 * Icon only until reached for, then the label grows out beside it. The bar has a
 * mark, a category name, a search and three actions to fit, so a permanently
 * worded button was spending room on a label you only need in the moment you are
 * deciding whether to press it.
 *
 * `max-width` rather than `width`, because the label has no width to animate to
 * until it is laid out and `auto` is not interpolable. The icon is first in the
 * row and never moves, so the button grows rightward from under the cursor
 * instead of sliding out from beneath it. `whitespace-nowrap` matters too: at
 * zero width the text would wrap to one character per line and give the button a
 * height it could not lose.
 */
export function DashboardButton({
  open,
  onToggle,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const label = open ? "Close" : "Dashboard";

  return (
    <button
      type="button"
      onClick={onToggle}
      title={open ? "Close the dashboard" : "Open the dashboard"}
      aria-label={open ? "Close the dashboard" : "Open the dashboard"}
      aria-expanded={open}
      className={cn(
        "group/dash inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2 py-1.5 text-xs font-semibold text-slate-600 backdrop-blur transition-[background-color,color,padding] hover:bg-white hover:px-3 focus-visible:px-3 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300 dark:hover:bg-stone-800",
        className,
      )}
    >
      <LayoutGrid className="size-3.5 shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-300 ease-out group-hover/dash:max-w-[7rem] group-hover/dash:opacity-100 group-focus-visible/dash:max-w-[7rem] group-focus-visible/dash:opacity-100">
        {label}
      </span>
    </button>
  );
}

/* â”€â”€ the panels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

type Update = ReturnType<typeof useUpdates>[number];

function Panel({
  view,
  decks,
  query,
  onQuery,
  searchRef,
  updates,
  go,
  onClose,
}: {
  view: DashboardView;
  decks: Deck[];
  query: string;
  onQuery: (next: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  updates: Update[];
  go: (view: DashboardView) => void;
  onClose: () => void;
}) {
  switch (view) {
    case "home":
      return <HomePanel decks={decks} go={go} onClose={onClose} />;
    case "decks":
      return (
        <DecksPanel
          decks={decks}
          query={query}
          onQuery={onQuery}
          searchRef={searchRef}
          onClose={onClose}
        />
      );
    case "categories":
      return <CategoriesPanel decks={decks} go={go} />;
    case "notifications":
      return <NotificationsPanel updates={updates} onClose={onClose} />;
    case "settings":
      return <SettingsPanel go={go} />;
    case "appearance":
      return <AppearancePanel />;
    case "profile":
      return <ProfilePanel />;
    case "lessons":
      return (
        <Unbuilt
          title="Lessons"
          lead="Written notes for each topic, to read before the cards make sense."
        >
          <p>
            Organic Chemistry II already has a Lessons branch in the course tree and it is
            deliberately empty rather than hidden â€” the shape of the course is real even where the
            content is not written yet.
          </p>
        </Unbuilt>
      );
    case "concepts":
      return (
        <Unbuilt
          title="Concepts"
          lead="Mechanisms you draw rather than recall: push the electrons and get told whether the product is right."
        >
          <p>
            This is where the mechanism trainer will land. It is a separate app today, far enough
            along to try but not yet part of Blueberry.
          </p>
          <a
            href={TRAINER_URL}
            target="_blank"
            rel="noreferrer"
            className="group mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 outline-none dark:text-indigo-300"
          >
            <span className="relative">
              Open the mechanism trainer
              <span
                aria-hidden
                className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-transform duration-300 ease-out group-hover:scale-x-100"
              />
            </span>
            <ExternalLink className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </Unbuilt>
      );
    case "subscriptions":
      return (
        <Unbuilt title="Subscriptions" lead="Nothing is paid for yet, and nothing is being charged.">
          <p>
            The plan is two tiers above the open site: a member account, which is what holds your
            progress somewhere other than this one browser, and a pro tier for the parts that cost
            something to run.
          </p>
          <p className="mt-3">
            Everything on the site today stays free. When this is built it will say plainly which
            side of the line each feature is on.
          </p>
        </Unbuilt>
      );
    case "imports":
      return (
        <Unbuilt title="Imports" lead="Bringing your own material in.">
          <p>
            Decks already import from a text file â€” that is the ticket at the foot of the hub, and
            it works today. What is not built is the rest: images of your own notes, and a syllabus,
            so the site knows when your exams are.
          </p>
          <p className="mt-3">
            The syllabus is the interesting one. With exam dates in hand the blueberry can change
            its mood as one gets close, which is a nudge rather than a feature you have to go and
            look at.
          </p>
        </Unbuilt>
      );
  }
}

function HomePanel({
  decks,
  go,
  onClose,
}: {
  decks: Deck[];
  go: (view: DashboardView) => void;
  onClose: () => void;
}) {
  const cards = decks.reduce((n, d) => n + deckCount(d), 0);

  // Read once per open rather than per render: every call of these touches
  // localStorage, and there is one per deck.
  const started = useMemo(
    () =>
      decks
        .map((deck) => ({ deck, reviewed: reviewedCount(deck.id), total: deckCount(deck) }))
        .filter((row) => row.reviewed > 0)
        .sort((a, b) => b.reviewed / b.total - a.reviewed / a.total)
        .slice(0, 3),
    [decks],
  );

  const reviewed = useMemo(
    () => decks.reduce((n, d) => n + reviewedCount(d.id), 0),
    [decks],
  );

  return (
    <div>
      <p className="playful-face max-w-xl text-lg text-slate-500 dark:text-stone-400">
        Everything on the site, in one place. Pick a category on the left, or start from where you
        left off.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Decks" value={decks.length} />
        <Stat label="Cards" value={cards} />
        <Stat label="Cards you've rated" value={reviewed} />
      </div>

      <h3 className="mt-8 mb-3 text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase dark:text-stone-500">
        {started.length > 0 ? "Pick up where you left off" : "Start somewhere"}
      </h3>

      {started.length > 0 ? (
        <ul className="space-y-2">
          {started.map(({ deck, reviewed: done, total }) => (
            <li key={deck.id}>
              <a
                href={deckHref(deck)}
                onClick={onClose}
                className="group block rounded-xl border border-slate-200 bg-white/70 px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-white dark:border-stone-700 dark:bg-stone-900/50 dark:hover:border-indigo-400/50 dark:hover:bg-stone-900"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-stone-100">
                    {deck.short ?? deck.title}
                  </p>
                  <span className="shrink-0 font-mono text-xs text-slate-400 dark:text-stone-500">
                    {done}/{total}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-stone-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                    style={{ width: `${Math.round((done / total) * 100)}%` }}
                  />
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-stone-700 dark:text-stone-400">
          You haven't rated any cards yet. Ratings are what let a deck show you what still needs
          work, and they stay in this browser.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <QuickLink onClick={() => { window.location.hash = "#/study-decks"; }} icon={<Layers className="size-3.5" />}>
          Browse every deck
        </QuickLink>
        <QuickLink onClick={() => go("categories")} icon={<LayoutGrid className="size-3.5" />}>
          Categories
        </QuickLink>
        <QuickLink onClick={() => go("appearance")} icon={<Palette className="size-3.5" />}>
          Appearance
        </QuickLink>
      </div>
    </div>
  );
}

function DecksPanel({
  decks,
  query,
  onQuery,
  searchRef,
  onClose,
}: {
  decks: Deck[];
  query: string;
  onQuery: (next: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
}) {
  const hits = useMemo(() => searchDecks(decks, query), [decks, query]);
  const searching = query.trim().length >= 2;

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search every deck, card and rowâ€¦"
          aria-label="Search decks"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder:text-stone-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:text-slate-700 dark:text-stone-500 dark:hover:text-stone-200"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Results replace the tree rather than sitting under it. Both at once is
          two answers to one question, and the tree is the longer of the two. */}
      {searching ? (
        <div className="mt-5">
          <SearchResults hits={hits} query={query} onPick={onClose} />
        </div>
      ) : (
        <>
          <p className="mt-5 text-xs leading-relaxed text-slate-500 dark:text-stone-400">
            Every course, folder and deck. Open a folder to see what is inside it, or click a deck
            to go straight there.
          </p>
          <CourseTree bare decks={decks} className="mt-2" onNavigate={onClose} />
        </>
      )}
    </div>
  );
}

function CategoriesPanel({ decks, go }: { decks: Deck[]; go: (view: DashboardView) => void }) {
  const cards = decks.reduce((n, d) => n + deckCount(d), 0);

  const rows = [
    {
      view: "lessons" as const,
      icon: <BookOpen className="size-4" />,
      title: "Lessons",
      blurb: "Written notes for each topic, to read before the cards make sense.",
      meta: "Not written yet",
      ready: false,
    },
    {
      view: "concepts" as const,
      icon: <Atom className="size-4" />,
      title: "Concepts",
      blurb: "Draw the mechanism and push the electrons. The mechanism trainer, once it moves in.",
      meta: "Separate app for now",
      ready: false,
    },
    {
      view: "decks" as const,
      icon: <Layers className="size-4" />,
      title: "Study Decks",
      blurb: "Flashcards and reference sheets, grouped by course and folder.",
      meta: `${decks.length} decks Â· ${cards} cards`,
      ready: true,
    },
  ];

  return (
    <div>
      <p className="playful-face max-w-xl text-lg text-slate-500 dark:text-stone-400">
        Three ways into the same chemistry. Only one of them is built.
      </p>
      <ul className="mt-6 space-y-3">
        {rows.map((row) => (
          <li key={row.view}>
            <button
              type="button"
              onClick={() => go(row.view)}
              className={cn(
                "group flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                row.ready
                  ? "border-slate-200 bg-white/70 hover:border-indigo-300 hover:bg-white dark:border-stone-700 dark:bg-stone-900/50 dark:hover:border-indigo-400/50 dark:hover:bg-stone-900"
                  : "border-dashed border-slate-300 hover:bg-slate-100/60 dark:border-stone-700 dark:hover:bg-stone-900/40",
              )}
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
                {row.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-stone-100">
                  {row.title}
                  <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-stone-400">
                  {row.blurb}
                </span>
                <span className="mt-1.5 block font-mono text-[0.65rem] text-slate-400 dark:text-stone-500">
                  {row.meta}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotificationsPanel({ updates, onClose }: { updates: Update[]; onClose: () => void }) {
  if (updates.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-stone-700 dark:text-stone-400">
        Nothing has changed since you were last here. New decks and anything published from a text
        file will show up in this list.
      </p>
    );
  }

  return (
    <div>
      <p className="playful-face mb-5 text-lg text-slate-500 dark:text-stone-400">
        What has changed on the site.
      </p>
      <ul className="space-y-2">
        {updates.map((u) => (
          <li key={u.id}>
            <a
              href={deckHref(u.deck)}
              onClick={onClose}
              className="block rounded-xl border border-slate-200 bg-white/70 px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-white dark:border-stone-700 dark:bg-stone-900/50 dark:hover:border-indigo-400/50 dark:hover:bg-stone-900"
            >
              <div className="flex items-center gap-1.5 font-mono text-[0.65rem] text-indigo-600 dark:text-indigo-300">
                <Sparkles className="size-3" />
                {u.note}
              </div>
              <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-stone-100">
                {u.deck.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-stone-400">
                {u.at ? timeAgo(`${u.at}T12:00:00Z`) : "Published deck"} Â·{" "}
                {deckCount(u.deck)} cards
              </p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsPanel({ go }: { go: (view: DashboardView) => void }) {
  return (
    <div>
      <p className="playful-face max-w-xl text-lg text-slate-500 dark:text-stone-400">
        One of these works. The rest arrive with accounts.
      </p>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => go("appearance")}
          className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-3.5 text-left transition-colors hover:border-indigo-300 hover:bg-white dark:border-stone-700 dark:bg-stone-900/50 dark:hover:border-indigo-400/50 dark:hover:bg-stone-900"
        >
          <Palette className="size-4 shrink-0 text-indigo-500 dark:text-indigo-300" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-800 dark:text-stone-100">
              Appearance
            </span>
            <span className="block text-xs text-slate-500 dark:text-stone-400">
              Light or dark, and how much the site moves.
            </span>
          </span>
          <ArrowUpRight className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
        </button>

        <SettingStub
          title="Account"
          blurb="A username and a password, so your progress is yours rather than this browser's."
        />
        <SettingStub
          title="Study preferences"
          blurb="Default view mode, whether answers start expanded, how shuffling behaves."
        />
        <SettingStub
          title="Your data"
          blurb="Export or clear the ratings and notes held in this browser."
        />
      </div>
    </div>
  );
}

function AppearancePanel() {
  const isDark = useIsDark();

  return (
    <div>
      <p className="playful-face max-w-xl text-lg text-slate-500 dark:text-stone-400">
        A subsection of Settings, and the one part of it that is real today.
      </p>

      <div className="mt-6 flex items-center gap-4 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/50">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-stone-100">Theme</p>
          <p className="text-xs text-slate-500 dark:text-stone-400">
            Currently {isDark ? "dark" : "light"}. The choice is remembered and applied before the
            page paints, so there is no flash of the wrong one on the way back.
          </p>
        </div>
        {/* The same control as the one in the site header, rather than a second
            switch with its own copy of the toggle-and-persist logic. */}
        <AnimatedThemeToggler />
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/50">
        <p className="text-sm font-semibold text-slate-800 dark:text-stone-100">Motion</p>
        <p className="text-xs text-slate-500 dark:text-stone-400">
          Follows your system's "reduce motion" setting. Every animation on the site checks it, so
          turning it on in the OS is enough â€” there is nothing to switch here.
        </p>
      </div>
    </div>
  );
}

function ProfilePanel() {
  const { user, configured } = useGoogleAuth();

  if (user) {
    return (
      <div>
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
            {user.picture ? (
              <img src={user.picture} alt="" className="size-full object-cover" />
            ) : (
              <User className="size-6" />
            )}
          </span>
          <div className="min-w-0">
            <p className="title-face text-xl text-slate-900 dark:text-stone-100">
              {user.name ?? "Signed in"}
            </p>
            <p className="truncate text-sm text-slate-500 dark:text-stone-400">{user.email}</p>
          </div>
        </div>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-stone-400">
          This is the Google sign-in that proves who is publishing a deck. It is not an account on
          the site yet â€” nothing here holds your progress, which still lives in this browser.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
          <User className="size-6" />
        </span>
        <div>
          <p className="title-face text-xl text-slate-900 dark:text-stone-100">Guest</p>
          <p className="text-sm text-slate-500 dark:text-stone-400">Not signed in</p>
        </div>
      </div>

      <div className="mt-6 max-w-xl space-y-3 text-sm leading-relaxed text-slate-500 dark:text-stone-400">
        <p>
          There are no accounts yet, and everything on the site works without one. Your ratings,
          your notes and which cards you have reviewed are all held in this browser.
        </p>
        <p>
          Accounts are what will move that off one machine: a username and a password, an
          onboarding quiz that sets the site up around the course you are taking, and after that
          the choice of whether to subscribe.
        </p>
        {!configured && (
          <p className="flex items-start gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-xs dark:border-stone-700">
            <LogIn className="mt-0.5 size-3.5 shrink-0" />
            Sign-in is switched off in this build.
          </p>
        )}
      </div>
    </div>
  );
}

/* â”€â”€ small parts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function ProfileButton({ onClick }: { onClick: () => void }) {
  const { user } = useGoogleAuth();
  return (
    <SidebarProfile
      onClick={onClick}
      name={user?.name ?? "Guest"}
      detail={user?.email ?? "Not signed in"}
      avatar={
        user?.picture ? (
          <img src={user.picture} alt="" className="size-full object-cover" />
        ) : (
          <User className="size-5" />
        )
      }
    />
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/50">
      <p className="title-face text-2xl text-slate-900 dark:text-stone-100">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-stone-400">{label}</p>
    </div>
  );
}

function QuickLink({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
    >
      {icon}
      {children}
    </button>
  );
}

function SettingStub({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-3.5 dark:border-stone-700">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-stone-400">
        {title}
        <span className="rounded-full border border-dashed border-current px-1.5 font-mono text-[0.6rem] opacity-70">
          soon
        </span>
      </p>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-stone-500">{blurb}</p>
    </div>
  );
}

/**
 * A section that exists in the nav but not yet on the site.
 *
 * Deliberately plain and deliberately honest. The alternative â€” a page of
 * skeleton cards and a spinner â€” looks like something that is loading, and
 * being told a thing is coming beats being left to work out that it is broken.
 */
function Unbuilt({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="max-w-xl">
      <p className="playful-face text-lg text-slate-500 dark:text-stone-400">{lead}</p>
      <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-5 text-sm leading-relaxed text-slate-500 dark:border-stone-700 dark:text-stone-400">
        <p className="mb-3 flex items-center gap-2 font-mono text-[0.65rem] tracking-wider text-slate-400 uppercase dark:text-stone-500">
          <Sparkles className="size-3" />
          {title} is not built yet
        </p>
        {children}
      </div>
    </div>
  );
}

export default Dashboard;
