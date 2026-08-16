import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Atom,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  CreditCard,
  FlaskConical,
  ExternalLink,
  Info,
  LayoutGrid,
  Layers,
  LogIn,
  Menu,
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
import { SubscriptionPlans } from "@/components/ui/subscription-plans";
import { VerifyChecklist } from "@/components/ui/verify-checklist";
import { AvatarPicker } from "@/components/ui/avatar-picker";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { useProfile } from "@/lib/profile";
import { useSession } from "@/lib/useSession";
import { LESSON_TOPICS } from "@/data/lessonTopics";
import { deckCount, deckHref, type Deck } from "@/data/types";
import { searchDecks } from "@/lib/searchDecks";
import { reviewedCount } from "@/lib/progress";
import { timeAgo } from "@/lib/workspace";
import { useDecks } from "@/lib/useDecks";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { useIsDark } from "@/lib/useIsDark";
import { SURFACE } from "@/lib/hubSurface";
import { DASHBOARD_SCENE, PageBackground } from "@/components/ui/page-background";
import { TRAINER_URL } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The dashboard: everything the site can do, in one surface laid over the page.
 *
 * It replaces the Browse drawer, which was a course tree and nothing else. That
 * was the right size while study decks *were* the site. They are not going to
 * be — lessons and mechanism practice are coming, subscriptions are coming, and
 * accounts are coming — and none of that fits in a drawer whose only idea is a
 * list of folders.
 *
 * **A panel over the page rather than a route.** You reach this by clicking
 * search, which happens in the middle of reading a deck; navigating away from
 * what you were reading in order to search it would be the wrong trade. Escape,
 * the backdrop and the ✕ all put you back exactly where you were. When Settings
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

/**
 * Open state, held by the page so the header can drive it.
 *
 * `view === null` is closed. One piece of state rather than a boolean plus a
 * view, because the two can never legally disagree: there is no such thing as
 * open-on-nothing, and a separate boolean is how you end up with a panel that
 * opens onto whatever you were looking at three clicks ago.
 */
/**
 * Set just before navigating when the dashboard should be open on arrival.
 * Exported so the sign-in page sets the same string this reads.
 */
export const OPEN_ON_ARRIVAL = "blueberry_open_dashboard_on_arrival";

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
   * different scopes on purpose — a folder page filters its own folder, this
   * one covers the whole site — so binding them to one string would mean
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

  /**
   * The search opens panels, and the search is mounted outside the router.
   *
   * Same shape as the focus timer's open event, and for the same reason: the
   * palette has no way to reach into this component's state, and passing a
   * setter out to `main.tsx` would mean the whole app carrying a prop about a
   * dashboard it does not own.
   */
  useEffect(() => {
    const onAsk = (e: Event) => {
      const view = (e as CustomEvent<{ view?: string }>).detail?.view;
      if (view) open(view as DashboardView);
    };
    window.addEventListener("blueberry:open-dashboard", onAsk);
    return () => window.removeEventListener("blueberry:open-dashboard", onAsk);
  }, [open]);

  /**
   * Asked for from a page that no longer exists by the time this can answer.
   *
   * The sign-in page offers staff the dashboard, but dispatching the event
   * from there would fire before this listener is mounted: the dashboard lives
   * inside the router, so it does not exist until the destination page does. A
   * one-shot flag survives the navigation that the event cannot, and is cleared
   * as it is read so a later reload does not reopen it.
   */
  useEffect(() => {
    try {
      if (sessionStorage.getItem(OPEN_ON_ARRIVAL) === "1") {
        sessionStorage.removeItem(OPEN_ON_ARRIVAL);
        open("home");
      }
    } catch {
      // Private browsing refuses sessionStorage. Nothing to recover.
    }
  }, [open]);

  // Only once the search view is actually mounted, or the ref is still null.
  useEffect(() => {
    if (isOpen && focusSearch && view === "decks") searchRef.current?.focus();
  }, [isOpen, focusSearch, view]);

  // Picking a destination on a phone should put the nav away behind you.
  /**
   * One click shows the section here; it never navigates.
   *
   * Lessons and Study Decks used to leave the dashboard the moment you touched
   * them, which made the sidebar a menu of exits rather than a place you could
   * look around in: there was no way to see what a section held without landing
   * on it and having to come back.
   */
  const go = useCallback(
    (next: DashboardView) => {
      open(next);
      setMobileNav(false);
    },
    [open],
  );

  /**
   * The second click, which leaves.
   *
   * Kept out of `go` and off render: React must not watch a component navigate
   * away or close its own parent mid-render, so the hash change happens in the
   * handler that asked for it.
   */
  const goTo = useCallback(
    (hash: string) => {
      close();
      setMobileNav(false);
      window.location.hash = hash;
    },
    [close],
  );

  const nav = (
    <Sidebar
      profile={<ProfileRow onClick={() => go("profile")} />}
      footer={<ProfileButton onClick={() => go("profile")} />}
    >
      <div className="space-y-0.5">
        {/* Profile, where Home used to be.

            Home was a row that needed explaining: one click showed an overview
            panel, a double click left for the page. Nobody double-clicks a nav
            item, so in practice it was a button that appeared to do nothing —
            and it did nothing most visibly on the home page itself, where the
            overview it opened was a smaller copy of what was already behind it.

            Profile is what that slot is actually for. It was reachable only by
            the identity block at the top of the column and the button at the
            foot, both of which are easy to read as decoration. */}
        <SidebarNavItem
          icon={<User className="size-4" />}
          label="Profile"
          active={view === "profile"}
          onClick={() => go("profile")}
        />
        <SidebarNavItem
          icon={<Bell className="size-4" />}
          label="Notifications"
          badge={unread}
          active={view === "notifications"}
          onClick={() => go("notifications")}
        />
        {/* Out of Categories, where they never belonged.

            Categories are kinds of study material — lessons, concepts, decks.
            The calendar and office hours are neither: they are the two places
            you go for a date and a person, and burying them under a heading
            about content is why they were three clicks deep. Straight to the
            route on a single click, since neither has a panel to open. */}
        <SidebarNavItem
          icon={<CalendarDays className="size-4" />}
          label="Calendar"
          onClick={() => goTo("#/calendar")}
        />
        <SidebarNavItem
          icon={<CalendarClock className="size-4" />}
          label="Tutoring"
          onClick={() => goTo("#/tutoring")}
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
          {/* Not muted any more: the carbonyl lessons are written and have a
              page. A nav that still says "soon" about something you can open is
              worse than one that never mentioned it. */}
          <SidebarNavItem
            icon={<BookOpen className="size-4" />}
            label="Lessons"
            active={view === "lessons"}
            onClick={() => go("lessons")}
            onDoubleClick={() => goTo("#/lessons")}
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
            onClick={() => go("decks")}
            onDoubleClick={() => goTo("#/study-decks")}
          />
          {/* Reactions stays: it is study material, which is what this heading
              is for. Calendar and Tutoring moved up to the top group. */}
          <SidebarNavItem
            icon={<FlaskConical className="size-4" />}
            label="Reactions"
            onClick={() => goTo("#/reactions")}
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
            {/* The dashboard's own photograph, pinned rather than drawn by the
                hour, and held back from every other page. `absolute`, not the
                component's usual `fixed`, so it is bounded by the panel's
                rounded corners instead of covering the screen behind it. */}
            {/* No `-z-10` here. The panel paints `surface.base` on *itself*, so
                a child sent behind the stacking context goes behind that opaque
                fill and is never seen. At the default depth it sits on the fill
                and under every sibling that follows it, which is what was
                wanted. */}
            {/* `z-0`, explicitly. The component's own base class carries
                `-z-10`, which merges through and drops it behind the panel's
                opaque fill, so the photograph was only visible in the scrim
                *around* the dashboard rather than inside it. */}
            <PageBackground scene={DASHBOARD_SCENE} className="absolute inset-0 z-0" />

            {/* A scrim between the photograph and the content.

                Raising the opacity of individual cards was the wrong lever: it
                only helped text that happened to sit inside a card, and the
                headings, section labels and body copy that sit directly on the
                panel had nothing behind them at all. One veil over the whole
                photograph fixes every one of them at once.

                Light and dark take opposite corrections rather than one value
                flipped. On the pale surface the photograph is the darker thing
                and is veiled with white; on the near-black one it is the
                brighter thing and is veiled with the surface colour. */}
            <div
              aria-hidden
              className="absolute inset-0 z-0 bg-white/72 dark:bg-[#171327]/78"
            />

            {/* The column, permanent from `md` up. Below that it comes over the
                content instead, because a 256px rail and a readable panel do
                not both fit on a phone. */}
            {/* `relative z-10` on both this and the content column: the
                photograph sits at `z-0` inside the panel, and a sibling with no
                depth of its own does not reliably paint above a positioned one.
                Without it the forest covered the whole dashboard. */}
            <aside className="relative z-10 hidden w-64 shrink-0 border-r border-slate-200/80 md:block dark:border-stone-700/70">
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

            <div className="relative z-10 flex min-w-0 flex-1 flex-col">
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

  /**
   * The label is written, not revealed.
   *
   * This used to keep the word in a `max-w-0` box that opened on hover, which
   * made it an unlabelled square everywhere hover does not exist — every phone
   * and tablet — and this is the only way into search, categories and settings.
   * A control that is the way in to most of the site cannot be a mystery icon.
   *
   * The word is hidden below `sm` rather than never shown, because on a phone
   * the row already carries a mark, a category and two actions; there the
   * `aria-label` and the 44px target do the work.
   *
   * `min-h-11` is 44px. It was 30x28 with the icon at `size-3.5`, which is
   * under the minimum on both axes.
   */
  return (
    <button
      type="button"
      onClick={onToggle}
      title={open ? "Close the dashboard" : "Open the dashboard"}
      aria-label={open ? "Close the dashboard" : "Open the dashboard"}
      aria-expanded={open}
      className={cn(
        "group/dash inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none",
        open
          ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200"
          : "border-slate-200 bg-white/85 text-slate-600 hover:border-indigo-300 hover:bg-white hover:text-indigo-700 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300 dark:hover:border-indigo-400/50 dark:hover:bg-stone-800 dark:hover:text-indigo-200",
        className,
      )}
    >
      {/* A burger rather than the four squares. The squares read as "grid view",
          which is a thing this button does not do; three stacked lines are the
          one icon everybody already reads as "the menu is behind here". */}
      {open ? <X className="size-4 shrink-0" /> : <Menu className="size-4 shrink-0" />}
      <span className="hidden whitespace-nowrap sm:inline">{label}</span>
    </button>
  );
}

/* ── the panels ─────────────────────────────────────────────────────────── */

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
      return <SettingsPanel go={go} onClose={onClose} />;
    case "appearance":
      return <AppearancePanel />;
    case "profile":
      return <ProfilePanel onClose={onClose} />;
    // A real panel rather than a redirect: a redirect fired from render is the
    // bug this replaced.
    case "lessons":
      return <LessonsPanel onClose={onClose} />;
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
        <div>
          <p className="playful-body mb-5 max-w-xl text-[0.95rem] leading-7 text-slate-600 dark:text-stone-300">
            Two tiers above the open site, and which side of the line each feature sits on.
          </p>
          <SubscriptionPlans onNavigate={onClose} />
        </div>
      );
    case "imports":
      return (
        <Unbuilt title="Imports" lead="Bringing your own material in.">
          <p>
            Decks already import from a text file — that is the ticket at the foot of the hub, and
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
      <p className="playful-body max-w-xl text-[0.95rem] leading-7 text-slate-600 dark:text-stone-300">
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
                className="group block rounded-xl border border-slate-200 bg-white/85 px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-white dark:border-stone-700 dark:bg-stone-900/75 dark:hover:border-indigo-400/50 dark:hover:bg-stone-900"
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
          placeholder="Search every deck, card and row…"
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
      meta: "Carbonyls, in seven parts",
      ready: true,
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
      meta: `${decks.length} decks · ${cards} cards`,
      ready: true,
    },
  ];

  return (
    <div>
      <p className="playful-body max-w-xl text-[0.95rem] leading-7 text-slate-600 dark:text-stone-300">
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
                  ? "border-slate-200 bg-white/85 hover:border-indigo-300 hover:bg-white dark:border-stone-700 dark:bg-stone-900/75 dark:hover:border-indigo-400/50 dark:hover:bg-stone-900"
                  : "border-dashed border-slate-300 hover:bg-slate-100/60 dark:border-stone-700 dark:hover:bg-stone-900/40",
              )}
            >
              {/* The berry itself behind the icon, rather than the gradient it
                  was borrowing. Same mark the home cards carry, so the three
                  ways in are recognisably the same family. The icon keeps a
                  drop shadow because it now sits on a rounded shape with light
                  and dark areas rather than a flat fill. */}
              <span className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center">
                <BlueberryMark
                  aria-hidden
                  className="blueberry-glow-art absolute inset-0 size-full"
                />
                <span className="relative text-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.55))]">
                  {row.icon}
                </span>
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
      <p className="playful-body mb-5 text-[0.95rem] leading-7 text-slate-600 dark:text-stone-300">
        What has changed on the site.
      </p>
      <ul className="space-y-2">
        {updates.map((u) => (
          <li key={u.id}>
            <a
              href={deckHref(u.deck)}
              onClick={onClose}
              className="block rounded-xl border border-slate-200 bg-white/85 px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-white dark:border-stone-700 dark:bg-stone-900/75 dark:hover:border-indigo-400/50 dark:hover:bg-stone-900"
            >
              <div className="flex items-center gap-1.5 font-mono text-[0.65rem] text-indigo-600 dark:text-indigo-300">
                <Sparkles className="size-3" />
                {u.note}
              </div>
              <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-stone-100">
                {u.deck.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-stone-400">
                {u.at ? timeAgo(`${u.at}T12:00:00Z`) : "Published deck"} ·{" "}
                {deckCount(u.deck)} cards
              </p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsPanel({
  go,
  onClose,
}: {
  go: (view: DashboardView) => void;
  onClose: () => void;
}) {
  return (
    <div>
      <p className="playful-body max-w-xl text-[0.95rem] leading-7 text-slate-600 dark:text-stone-300">
        One of these works. The rest arrive with accounts.
      </p>

      <VerifyChecklist className="mt-6 max-w-xl" onNavigate={onClose} />

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => go("appearance")}
          className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white/85 px-4 py-3.5 text-left transition-colors hover:border-indigo-300 hover:bg-white dark:border-stone-700 dark:bg-stone-900/75 dark:hover:border-indigo-400/50 dark:hover:bg-stone-900"
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
      <p className="playful-body max-w-xl text-[0.95rem] leading-7 text-slate-600 dark:text-stone-300">
        A subsection of Settings, and the one part of it that is real today.
      </p>

      <div className="mt-6 flex items-center gap-4 rounded-xl border border-slate-200 bg-white/85 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/75">
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

      <div className="mt-3 rounded-xl border border-slate-200 bg-white/85 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/75">
        <p className="text-sm font-semibold text-slate-800 dark:text-stone-100">Motion</p>
        <p className="text-xs text-slate-500 dark:text-stone-400">
          Follows your system's "reduce motion" setting. Every animation on the site checks it, so
          turning it on in the OS is enough — there is nothing to switch here.
        </p>
      </div>
    </div>
  );
}

/**
 * Plans first, then who you are.
 *
 * Andrew asked for the tiers to be the first thing on this page, so the
 * identity block that used to open it now sits underneath.
 */
/**
 * Who you are, and nothing else.
 *
 * The three pricing cards that opened this panel are gone. A profile page is
 * where you check what you are, not where you shop: the tier is one line now,
 * with an upgrade link for the people it applies to, and Subscriptions is
 * still a section of its own for the rest.
 */
function ProfilePanel({ onClose }: { onClose: () => void }) {
  const { configured } = useGoogleAuth();
  // Either provider, so a signed-in member never reads as "Guest".
  const session = useSession();
  const user = session;
  const signOut = session?.signOut ?? (() => {});
  const role = session?.role ?? "member";
  const profile = useProfile();
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");

  return (
    <div className="max-w-xl">
      <AvatarPicker fallback={user?.picture ?? undefined} />

      <div className="mt-5">
        <p className="title-face text-2xl text-slate-900 dark:text-stone-100">
          {name || user?.name || "Guest"}
        </p>
        <p className="truncate text-sm text-slate-500 dark:text-stone-400">
          {user?.email ?? "Not signed in"}
        </p>
      </div>

      <StatusRow role={user ? role : null} onNavigate={onClose} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {user ? (
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <LogIn className="size-4 rotate-180" />
            Sign out
          </button>
        ) : (
          configured && (
            <>
              <a
                href="#/signin"
                onClick={onClose}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                <LogIn className="size-4" />
                Sign in
              </a>
              <a
                href="#/signup"
                onClick={onClose}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              >
                Create an account
              </a>
            </>
          )
        )}
      </div>

      {!configured && (
        <p className="mt-6 flex items-start gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-xs text-slate-500 dark:border-stone-700 dark:text-stone-400">
          <LogIn className="mt-0.5 size-3.5 shrink-0" />
          Sign-in is switched off in this build.
        </p>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-stone-700">
        <ProfileIdentity />
      </div>
    </div>
  );
}

/**
 * One line for what you are.
 *
 * Upgrade is only offered to the people it means something for. Showing an
 * owner a button to become Pro would be asking them to buy what they already
 * outrank.
 */
function StatusRow({
  role,
  onNavigate,
}: {
  role: "member" | "admin" | "owner" | null;
  onNavigate: () => void;
}) {
  const tone =
    role === "owner"
      ? "bg-amber-400/15 text-amber-600 dark:text-amber-300"
      : role === "admin"
        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
        : "bg-slate-500/10 text-slate-500 dark:text-stone-400";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/85 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/75">
      <span className="text-xs text-slate-500 dark:text-stone-400">Status</span>
      <span
        className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold uppercase", tone)}
      >
        {role ?? "Guest"}
      </span>
      {(role === null || role === "member") && (
        <button
          type="button"
          onClick={() => {
            onNavigate();
            window.dispatchEvent(
              new CustomEvent("blueberry:open-dashboard", { detail: { view: "subscriptions" } }),
            );
          }}
          className="ml-auto cursor-pointer text-xs font-semibold text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-300"
        >
          Upgrade
        </button>
      )}
    </div>
  );
}

/**
 * The one paragraph of context, under the identity rather than beside it.
 *
 * Everything that used to be here (avatar, name, buttons) is now the panel's
 * own job, so this is only what the state actually means.
 */
function ProfileIdentity() {
  const { user } = useGoogleAuth();

  return (
    <p className="text-sm leading-relaxed text-slate-500 dark:text-stone-400">
      {user
        ? "Signing in proves who is publishing a deck. Your ratings, notes and progress still live in this browser rather than on the server."
        : "Everything on the site works without an account. Your ratings, notes and which cards you have reviewed are all held in this browser, which is what an account will eventually move them off."}
    </p>
  );
}

/* ── small parts ────────────────────────────────────────────────────────── */

/**
 * The foot of the sidebar: sign out when there is someone to sign out.
 *
 * It used to open the Profile panel, which the sidebar already has a row for,
 * so the same click was available twice and the one thing you might want at
 * the bottom of a nav was missing. Signed out it still opens Profile, because
 * there is nothing to sign out of and that is where signing in lives.
 */
/**
 * The foot of the sidebar: one verb, on its own surface.
 *
 * It was a gradient avatar row that opened the Profile panel, which the nav
 * already lists two rows above, so the same click existed twice and the
 * indigo-to-fuchsia fill made a piece of chrome shout louder than the content.
 * Now it is a plain bordered control that signs you in when you are out and
 * signs you out when you are in, on a surface of its own rather than a colour.
 */
/**
 * The identity at the top of the column, which opens the Profile panel.
 *
 * Kept separate from the control at the foot on purpose: this one says who you
 * are and takes you to your page, that one is a single verb. Rolling them into
 * one button is what left the same click in two places.
 */
function ProfileRow({ onClick }: { onClick: () => void }) {
  const session = useSession();
  const profile = useProfile();
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");

  return (
    <SidebarProfile
      onClick={onClick}
      name={name || session?.name || "Guest"}
      detail={session?.email ?? "Not signed in"}
      avatar={
        profile.avatar || session?.picture ? (
          <img src={profile.avatar ?? session?.picture ?? ""} alt="" className="size-full object-cover" />
        ) : (
          <User className="size-5" />
        )
      }
    />
  );
}

function ProfileButton({ onClick }: { onClick: () => void }) {
  const session = useSession();

  const shell =
    "flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors " +
    "border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900 " +
    "dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-stone-100";

  if (session) {
    return (
      <HoldToConfirm onConfirm={session.signOut} holdMs={1500} className={shell}>
        <LogIn className="size-4 shrink-0 rotate-180 opacity-70" />
        <span className="min-w-0 flex-1 text-left">
          <span className="block">Hold to sign out</span>
          <span className="block truncate text-xs font-normal text-slate-500 dark:text-stone-400">
            {session.email}
          </span>
        </span>
      </HoldToConfirm>
    );
  }

  return (
    <a href="#/signin" onClick={onClick} className={shell}>
      <LogIn className="size-4 shrink-0 opacity-70" />
      <span className="min-w-0 flex-1">
        <span className="block">Sign in</span>
        <span className="block truncate text-xs font-normal text-slate-500 dark:text-stone-400">
          Keep your progress
        </span>
      </span>
    </a>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/85 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/75">
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
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900 dark:border-stone-700 dark:bg-stone-900/75 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
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
 * The way into the lessons, from the hub.
 *
 * This used to be an `Unbuilt` box headed "Lessons is not built yet", sitting
 * above a sentence explaining that actually it is built and here is the link.
 * Two clicks and a contradiction to reach a page that has been finished for
 * weeks.
 *
 * One card, the whole surface of it clickable, saying what the thing actually
 * is. The dropdown underneath is the table of contents: twelve sections is
 * enough that seeing them is what tells you whether the page has what you came
 * for, and each one links straight to itself rather than to the top of the page.
 *
 * The toggle is a sibling of the card, never a child of it. Nesting a button
 * inside an anchor is invalid, and in practice the outer link swallows the
 * click — the same layering trap the folder cards keep setting.
 */
function LessonsPanel({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  // The overview is the card itself, so listing it again inside would be the
  // contents pointing at their own cover.
  const sections = LESSON_TOPICS.filter((t) => t.id !== "overview");

  return (
    <div className="max-w-2xl">
      <a
        href="#/lessons"
        onClick={onClose}
        className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/85 p-5 transition-colors hover:border-indigo-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-stone-700 dark:bg-stone-900/75 dark:hover:border-indigo-400/50 dark:hover:bg-stone-900"
      >
        <span className="relative mt-0.5 flex size-10 shrink-0 items-center justify-center">
          <BlueberryMark aria-hidden className="blueberry-glow-art absolute inset-0 size-full" />
          <span className="relative text-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.55))]">
            <BookOpen className="size-5" />
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-semibold">
            Organic Chemistry 2 Lessons
            <ArrowUpRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-600 motion-reduce:transition-none dark:text-stone-500 dark:group-hover:text-indigo-300" />
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-stone-300">
            The ideas behind the cards, in the order CHEM241 takes them. Written notes
            first, then every reaction underneath with its reagents and conditions.
          </span>
          <span className="mt-2 block font-mono text-[0.7rem] tracking-wide text-slate-400 uppercase dark:text-stone-500">
            {sections.length} sections · CHEM241
          </span>
        </span>
      </a>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="lesson-contents"
        className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-stone-400 dark:hover:bg-stone-900/60 dark:hover:text-stone-200"
      >
        {open ? "Hide the sections" : `Show all ${sections.length} sections`}
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id="lesson-contents"
            // Height to `auto` so the list is never clipped and never needs a
            // guessed max-height, which is what breaks the moment a title wraps.
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              {sections.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#/lessons/${t.id}`}
                    onClick={onClose}
                    className="flex min-h-11 flex-col justify-center rounded-xl px-3 py-2 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-indigo-950/40"
                  >
                    <span className="text-sm font-semibold">{t.label}</span>
                    <span className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-stone-400">
                      {t.title}
                    </span>
                  </a>
                </li>
              ))}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * A section that exists in the nav but not yet on the site.
 *
 * Deliberately plain and deliberately honest. The alternative — a page of
 * skeleton cards and a spinner — looks like something that is loading, and
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
      <p className="playful-body text-[0.95rem] leading-7 text-slate-600 dark:text-stone-300">{lead}</p>
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
