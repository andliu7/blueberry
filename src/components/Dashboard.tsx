import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  LayoutGrid,
  Layers,
  LogIn,
  Palette,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { type DashboardView } from "@/components/ui/dashboard-nav";
import { CourseTree } from "@/components/ui/course-tree";
import { SearchResults } from "@/components/ui/deck-search";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { SubscriptionPlans } from "@/components/ui/subscription-plans";
import { VerifyChecklist } from "@/components/ui/verify-checklist";
import { AvatarPicker } from "@/components/ui/avatar-picker";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { useProfile } from "@/lib/profile";
import { useSession } from "@/lib/useSession";
import { LESSON_TOPICS } from "@/data/lessonTopics";
import { deckCount, deckHref, type Deck } from "@/data/types";
import { recentChangelog } from "@/data/changelog";
import { searchDecks } from "@/lib/searchDecks";
import { reviewedCount } from "@/lib/progress";
import { timeAgo } from "@/lib/workspace";
import { useDecks } from "@/lib/useDecks";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { useIsDark } from "@/lib/useIsDark";
import { cn } from "@/lib/utils";
import { OfficeHoursEditor } from "@/components/OfficeHoursEditor";

/**
 * The dashboard's panels: what `#/d` and each `#/d/<view>` page shows (see
 * `DashboardPage`), plus the update list the Notifications page reads.
 *
 * Until 2026-10-07 this file also held the dashboard as a drawer laid over the
 * home page, Study Decks and the folder pages, with the "Dashboard" button in
 * their headers that opened it. The site header now carries the five
 * destinations on every page (SITE-REPLAN.md phase 3), so the drawer and its
 * button went; the panels below are unchanged.
 *
 * The sections that are not built yet say so. A greyed row marked "soon" is a
 * promise; a row that opens onto a convincing empty page is a bug report
 * waiting to happen.
 */

export type { DashboardView };

/** Decks added recently enough to be worth announcing, newest first. */
export function useUpdates() {
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

export const SEEN_KEY = "blueberry_seen_updates";

export function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/* ── the panels ─────────────────────────────────────────────────────────── */

type Update = ReturnType<typeof useUpdates>[number];

export function Panel({
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
    case "hours":
      return <OfficeHoursEditor />;
    // A real panel rather than a redirect: a redirect fired from render is the
    // bug this replaced.
    case "lessons":
      return <LessonsPanel onClose={onClose} />;
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
                className="group block rounded-xl border border-slate-200 bg-white/85 px-4 py-3 transition-colors hover:border-[#bbb1eb] hover:bg-white dark:border-stone-700 dark:bg-stone-900/75 dark:hover:border-[#9989e2]/50 dark:hover:bg-stone-900"
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
                    className="h-full rounded-full bg-gradient-to-r from-brand-from to-brand-to"
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
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus-visible:border-[#9989e2] focus-visible:ring-2 focus-visible:ring-[#9989e2]/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder:text-stone-500"
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
    },
    {
      view: "decks" as const,
      icon: <Layers className="size-4" />,
      title: "Study Decks",
      blurb: "Flashcards and reference sheets, grouped by course and folder.",
      meta: `${decks.length} decks · ${cards} cards`,
    },
  ];

  return (
    <div>
      <p className="playful-body max-w-xl text-[0.95rem] leading-7 text-slate-600 dark:text-stone-300">
        Two ways into the same chemistry.
      </p>
      <ul className="mt-6 space-y-3">
        {rows.map((row) => (
          <li key={row.view}>
            <button
              type="button"
              onClick={() => go(row.view)}
              className="group flex w-full cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white/85 px-4 py-3.5 text-left transition-colors hover:border-[#bbb1eb] hover:bg-white dark:border-stone-700 dark:bg-stone-900/75 dark:hover:border-[#9989e2]/50 dark:hover:bg-stone-900"
            >
              {/* The berry itself behind the icon, rather than the gradient it
                  was borrowing. Same mark the home cards carry, so the two
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
  /**
   * Two tabs: the feed, and the week said plainly.
   *
   * The feed is generated from the deck data, so it can only ever talk about
   * decks. The summary is the opposite: hand-written sentences from
   * `data/changelog.ts` about whatever actually changed - the front page, the
   * mascot, the assistant - which no generated feed could know to mention.
   * Andrew asked for exactly this: click in, read a short plain-English
   * account of the past week, done.
   */
  const [tab, setTab] = useState<"updates" | "week">("updates");
  const week = recentChangelog(7);

  const tabButton = (id: "updates" | "week", label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={cn(
        "min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#9989e2] focus-visible:outline-none",
        tab === id
          ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-stone-900"
          : "text-slate-600 hover:bg-slate-100 dark:text-stone-300 dark:hover:bg-stone-800",
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-5 flex items-center gap-1.5">
        {tabButton("updates", "Updates")}
        {tabButton("week", "This week")}
      </div>

      {tab === "week" ? (
        week.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-stone-700 dark:text-stone-400">
            A quiet week. When something on the site changes, the plain-English
            version of it lands here.
          </p>
        ) : (
          <div>
            <p className="playful-body mb-5 text-[0.95rem] leading-7 text-slate-600 dark:text-stone-300">
              The past week, in plain English.
            </p>
            <ul className="space-y-2">
              {week.map((e) => (
                <li
                  key={`${e.date}:${e.title}`}
                  className="rounded-xl border border-slate-200 bg-white/85 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/75"
                >
                  <div className="flex items-center gap-1.5 font-mono text-[0.65rem] text-[#5a3fd8] dark:text-[#bbb1eb]">
                    <Sparkles className="size-3" />
                    {new Date(`${e.date}T12:00:00Z`).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-stone-100">
                    {e.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-stone-400">
                    {e.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : updates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-stone-700 dark:text-stone-400">
          Nothing has changed since you were last here. New decks and anything published from a text
          file will show up in this list.
        </p>
      ) : (
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
                  className="block rounded-xl border border-slate-200 bg-white/85 px-4 py-3 transition-colors hover:border-[#bbb1eb] hover:bg-white dark:border-stone-700 dark:bg-stone-900/75 dark:hover:border-[#9989e2]/50 dark:hover:bg-stone-900"
                >
                  <div className="flex items-center gap-1.5 font-mono text-[0.65rem] text-[#5a3fd8] dark:text-[#bbb1eb]">
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
      )}
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
          className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white/85 px-4 py-3.5 text-left transition-colors hover:border-[#bbb1eb] hover:bg-white dark:border-stone-700 dark:bg-stone-900/75 dark:hover:border-[#9989e2]/50 dark:hover:bg-stone-900"
        >
          <Palette className="size-4 shrink-0 text-[#6b51dd] dark:text-[#bbb1eb]" />
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
        <p className="page-title text-2xl text-slate-900 dark:text-stone-100">
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
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full gradient-button px-5 text-sm font-semibold text-white transition hover:brightness-110"
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
        ? "bg-[#6b51dd]/10 text-[#5a3fd8] dark:text-[#bbb1eb]"
        : "bg-slate-500/10 text-slate-500 dark:text-stone-400";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/85 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/75">
      <span className="text-xs text-slate-500 dark:text-stone-400">Status</span>
      <span
        className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold uppercase", tone)}
      >
        {role ?? "Guest"}
      </span>
      {/* A link now that Subscriptions is a page. The event this used to
          dispatch asked the modal to swap its panel, and there is no modal. */}
      {(role === null || role === "member") && (
        <a
          href="#/d/subscriptions"
          onClick={onNavigate}
          className="ml-auto cursor-pointer text-xs font-semibold text-[#5a3fd8] underline-offset-4 hover:underline dark:text-[#bbb1eb]"
        >
          Upgrade
        </a>
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


function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bb-glow rounded-xl border border-slate-200 bg-white/85 px-4 py-3 [--glow:var(--site-tab-me)] dark:border-stone-700 dark:bg-stone-900/75">
      <p className="page-title text-2xl text-slate-900 dark:text-stone-100">{value}</p>
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
        className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/85 p-5 transition-colors hover:border-[#bbb1eb] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b51dd] dark:border-stone-700 dark:bg-stone-900/75 dark:hover:border-[#9989e2]/50 dark:hover:bg-stone-900"
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
            <ArrowUpRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#5a3fd8] motion-reduce:transition-none dark:text-stone-500 dark:group-hover:text-[#bbb1eb]" />
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
        className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b51dd] dark:text-stone-400 dark:hover:bg-stone-900/60 dark:hover:text-stone-200"
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
                    className="flex min-h-11 flex-col justify-center rounded-xl px-3 py-2 transition-colors hover:bg-[#f1f4fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b51dd] dark:hover:bg-[#1f1456]/40"
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

