import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PageBackground, DASHBOARD_SCENE } from "@/components/ui/page-background";
import { SiteFooter } from "@/components/ui/site-footer";
import {
  DashboardNav,
  VIEW_TITLE,
  viewFromRoute,
  viewHref,
  type DashboardView,
} from "@/components/ui/dashboard-nav";
import { Panel, useUpdates, loadSeen, SEEN_KEY } from "@/components/Dashboard";
import { useDecks } from "@/lib/useDecks";
import { cn } from "@/lib/utils";

/**
 * The dashboard, as pages.
 *
 * It was a modal: a centred card with the column inside it and each section
 * rendered as a panel beside that column. Everything about it fought being a
 * place. You could not link to Settings, the back button closed the whole thing
 * rather than stepping back a section, and a full page of content had to live
 * inside `min(88vh, 880px)` and scroll within its own box.
 *
 * Now `#/d` is a page and each section is `#/d/<view>`. The column is real
 * navigation, the browser's history works, and a section can be as long as it
 * needs to be.
 *
 * The modal did not disappear: `Dashboard` is now the drawer that the hub's
 * burger opens, which is only the column. That is the split Andrew asked for -
 * the burger shows you where you can go, and going there is a page.
 */
export function DashboardPage({ route }: { route: string }) {
  const view = viewFromRoute(route);
  const { decks } = useDecks();
  const updates = useUpdates();
  const reduce = useReducedMotion();

  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Arriving at Notifications is what marks them read, the same rule the modal
  // had. Kept keyed on the view so navigating away and back does not re-mark.
  useEffect(() => {
    if (view !== "notifications") return;
    try {
      const seen = loadSeen();
      for (const u of updates) seen.add(u.id);
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
    } catch {
      // Private browsing refuses localStorage. Nothing to recover.
    }
  }, [view, updates]);

  const unread = updates.filter((u) => !loadSeen().has(u.id)).length;

  // Every section change starts at the top of the new section rather than
  // halfway down it, since the column stays put and only the panel changes.
  useEffect(() => {
    window.scrollTo(0, 0);
    setNavOpen(false);
  }, [view]);

  /**
   * The panel still asks for `go` and `onClose`.
   *
   * They were a modal's vocabulary: show another section in place, and dismiss.
   * As pages they become navigation and going home, so every panel keeps
   * working without being rewritten one by one.
   */
  const go = (next: DashboardView) => {
    window.location.hash = viewHref(next);
  };
  const leave = () => {
    window.location.hash = "#/home";
  };

  return (
    <main className="relative min-h-screen text-slate-900 dark:text-stone-100">
      <PageBackground scene={DASHBOARD_SCENE} />
      {/* The same veil the modal used. The photograph is the darker thing on a
          pale surface and the brighter thing on a near-black one, so the two
          take opposite corrections rather than one value flipped. */}
      <div aria-hidden className="fixed inset-0 bg-white/78 dark:bg-[#171327]/62" />

      <div className="relative mx-auto flex w-full max-w-7xl gap-6 px-4 py-5 sm:px-6">
        {/* The column, permanent from `md` up. Sticky rather than fixed so it
            scrolls with a long page but stays put for a short one. */}
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-5 max-h-[calc(100vh-2.5rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/92">
            <DashboardNav activeView={view} unread={unread} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open the dashboard menu"
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 md:hidden dark:border-stone-700 dark:text-stone-200"
            >
              <Menu className="size-4" />
              Menu
            </button>

            <a
              href="#/home"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-700 dark:text-stone-300"
            >
              <ChevronLeft className="size-4" />
              Home
            </a>
          </header>

          <h1 className="title-face mt-4 text-4xl leading-none">{VIEW_TITLE[view]}</h1>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm sm:p-6 dark:border-stone-800 dark:bg-stone-950/92">
            <Panel
              view={view}
              decks={decks}
              query={query}
              onQuery={setQuery}
              searchRef={searchRef}
              updates={updates}
              go={go}
              onClose={leave}
            />
          </div>
        </div>
      </div>

      {/* Below `md` the column comes over the content, because a 256px rail and
          a readable panel do not both fit on a phone. */}
      <AnimatePresence>
        {navOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNavOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/45 md:hidden"
              aria-hidden
            />
            <motion.aside
              initial={reduce ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-slate-200 bg-white md:hidden dark:border-stone-700 dark:bg-stone-950",
              )}
            >
              <div className="flex justify-end p-2">
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  aria-label="Close the menu"
                  className="cursor-pointer rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <DashboardNav
                  activeView={view}
                  unread={unread}
                  onNavigate={() => setNavOpen(false)}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <SiteFooter />
    </main>
  );
}

export default DashboardPage;
