import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ChevronsUpDown, ChevronsDownUp, Shuffle, GalleryHorizontalEnd, List, MoveVertical, MessageSquare, ArrowDownToLine, GitBranch, ArrowUpRight, Layers, Home } from "lucide-react";
import { FeedbackWidget } from "@/components/ui/feedback-widget";
import { ClickHereHint } from "@/components/ui/click-here-hint";
import { GlassFilter, LiquidGlassLayers } from "@/components/ui/liquid-glass-button";
import { questions } from "@/data/questions";
import { testimonials, testimonialArt } from "@/data/testimonials";
import { GradientMenuButton, type GradientMenuItem } from "@/components/ui/gradient-menu";
import { AnimatedActionCluster } from "@/components/ui/floating-action-button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { HeroTitle } from "@/components/ui/hero-title";
import { ScrollTiltedGrid } from "@/components/ui/scroll-tilted-grid";
import { StackedCards } from "@/components/ui/stacked-cards";
import { GooeyTogglePair, type ToggleVisibility } from "@/components/ui/gooey-toggle-pair";
import { HomePage } from "@/components/HomePage";
import { useHashRoute } from "@/lib/useHashRoute";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { SnapCarousel } from "@/components/ui/snap-carousel";
import { TiltCard } from "@/components/ui/be-ui-tilt-card";
import { useIsDark } from "@/lib/useIsDark";
import { QuestionCard, type Status } from "@/components/QuestionCard";
import { ButtonHoldAndRelease } from "@/components/ui/hold-and-release-button";
import SocialCards from "@/components/ui/card-fan-carousel";
import { StickyNote } from "@/components/StickyNote";
import { Confetti } from "@/components/Confetti";
import { cn } from "@/lib/utils";
import { useMathJaxTypeset } from "@/lib/useMathJaxTypeset";

const STORAGE_KEY = "grignard_lcta_progress_v1";
const FEEDBACK_KEY = "grignard_lcta_feedback_v1";
const FEEDBACK_ENDPOINT = import.meta.env.VITE_FEEDBACK_ENDPOINT as string | undefined;

const VIEW_LABEL = { list: "List", carousel: "Carousel", scroll: "Scroll", stack: "Stack" } as const;
const VIEW_ICON = {
  list: <List />,
  carousel: <GalleryHorizontalEnd />,
  scroll: <MoveVertical />,
  stack: <Layers />,
} as const;
const diffRank: Record<Status, number> = { red: 0, yellow: 1, none: 2, green: 3 };


/**
 * The quote card tilts in both themes. Only the glare changes: white reads as a
 * sheen on a dark card but washes out a pale one, so light mode gets an indigo
 * tint instead.
 */
function QuoteSurface({ children }: { children: React.ReactNode }) {
  const isDark = useIsDark();
  return (
    <TiltCard
      max={6}
      glareColor={isDark ? "rgba(255,255,255,0.9)" : "rgba(99,102,241,0.7)"}
      className="rounded-2xl"
    >
      {children}
    </TiltCard>
  );
}

function loadSaved(): { status?: Record<number, Status>; note?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === "object") return data;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * The root only decides which page is showing. The study app stays at the bare
 * URL, because that is the link people already have; the hub sits behind
 * #/home, reached from the Home link on the title screen.
 */
export default function App() {
  const route = useHashRoute();
  return route === "home" ? <HomePage /> : <StudyApp />;
}

function StudyApp() {
  const [status, setStatus] = useState<Record<number, Status>>(() => loadSaved().status ?? {});
  const [note, setNote] = useState(() => {
    const saved = loadSaved().note;
    return typeof saved === "string" ? saved : "";
  });
  const [filter, setFilter] = useState<"all" | "needs">("all");
  const [order, setOrder] = useState<"number" | "hard-first" | "easy-first">("number");
  const [orderedIdx, setOrderedIdx] = useState<number[]>(questions.map((_, i) => i));
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  // Delayed so it appears where it belongs rather than sliding into place while
  // the toolbar is still collapsing.
  const [showHint, setShowHint] = useState(true);
  useEffect(() => {
    if (toolsOpen) {
      setShowHint(false);
      return;
    }
    const t = setTimeout(() => setShowHint(true), 320);
    return () => clearTimeout(t);
  }, [toolsOpen]);
  const [view, setView] = useState<"list" | "carousel" | "scroll" | "stack">("list");
  const carouselMode = view === "carousel";
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const hasCelebrated = useRef(false);
  const [tIndex, setTIndex] = useState(0);
  // Question number -> expanded. Absent means collapsed.
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

  // Save progress whenever it changes. Restoring happens in the useState
  // initialisers above rather than in an effect: an effect-based load races this
  // one, which also runs on mount and would write the empty initial state over
  // the saved progress before the restore landed.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, note }));
    } catch {
      /* ignore */
    }
  }, [status, note]);

  const mcIdx = questions.findIndex((q) => q.mc);

  const visibleIdx = useMemo(() => {
    return orderedIdx.filter((i) => {
      if (filter !== "needs") return true;
      return (status[i + 1] ?? "none") !== "green";
    });
  }, [orderedIdx, filter, status]);

  /**
   * Which of Expand All / Collapse All still does anything, read off the cards
   * rather than off the last button pressed. Opening the final card by hand has
   * to retire Expand All exactly as clicking it would, and the filter can change
   * which cards count without either button being touched.
   */
  const toggleVisibility: ToggleVisibility = useMemo(() => {
    const open = visibleIdx.filter((i) => openMap[i + 1]).length;
    if (open === 0) return "expand";
    if (open === visibleIdx.length) return "collapse";
    return "both";
  }, [visibleIdx, openMap]);

  const counts = useMemo(() => {
    const c = { red: 0, yellow: 0, green: 0 };
    Object.values(status).forEach((s) => {
      if (s === "red" || s === "yellow" || s === "green") c[s]++;
    });
    return c;
  }, [status]);
  const reviewed = counts.red + counts.yellow + counts.green;

  useEffect(() => {
    if (reviewed === questions.length && !hasCelebrated.current) {
      hasCelebrated.current = true;
      setConfettiTrigger((t) => t + 1);
    }
    if (reviewed < questions.length) hasCelebrated.current = false;
  }, [reviewed]);

  // Deliberately excludes tIndex: testimonials contain no math, and a full-document
  // typeset reflows the page and throws the scroll position to the top.
  useMathJaxTypeset([status, orderedIdx, filter, view, carouselIndex]);

  function rate(num: number, color: Status) {
    setStatus((s) => ({ ...s, [num]: color }));
    if (carouselMode) {
      setTimeout(() => setCarouselIndex((i) => i + 1), 200);
    }
  }

  /** Shuffles, or puts the questions back in number order if already shuffled. */
  function toggleShuffle() {
    if (shuffled) {
      applyOrder("number");
      return;
    }
    const rest = orderedIdx.filter((i) => i !== mcIdx);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    setOrder("number");
    setOrderedIdx(mcIdx >= 0 ? [...rest, mcIdx] : rest);
    setCarouselIndex(0);
    setShuffled(true);
  }

  const VIEWS = ["list", "carousel", "scroll", "stack"] as const;
  function cycleView() {
    setView((v) => VIEWS[(VIEWS.indexOf(v) + 1) % VIEWS.length]);
  }

  function jumpToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function applyOrder(mode: typeof order) {
    setOrder(mode);
    setShuffled(false);
    const rest = orderedIdx.filter((i) => i !== mcIdx);
    if (mode === "number") {
      rest.sort((a, b) => a - b);
    } else if (mode === "hard-first") {
      rest.sort((a, b) => diffRank[status[a + 1] ?? "none"] - diffRank[status[b + 1] ?? "none"]);
    } else {
      rest.sort((a, b) => diffRank[status[b + 1] ?? "none"] - diffRank[status[a + 1] ?? "none"]);
    }
    setOrderedIdx(mcIdx >= 0 ? [...rest, mcIdx] : rest);
    setCarouselIndex(0);
  }

  function toggleAll(open: boolean) {
    if (!open) {
      setOpenMap({});
      return;
    }
    const next: Record<number, boolean> = {};
    visibleIdx.forEach((i) => {
      next[i + 1] = true;
    });
    setOpenMap(next);
  }

  /**
   * Keeps a local copy always, and additionally POSTs to VITE_FEEDBACK_ENDPOINT
   * when one is configured. With no endpoint set nothing leaves the browser, so
   * a default checkout transmits nothing.
   */
  async function saveFeedback(entry: { rating: "helpful" | "not-helpful"; comment: string }) {
    const record = { ...entry, at: new Date().toISOString() };

    try {
      const raw = localStorage.getItem(FEEDBACK_KEY);
      const all = raw ? JSON.parse(raw) : [];
      all.push(record);
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }

    if (FEEDBACK_ENDPOINT) {
      try {
        await fetch(FEEDBACK_ENDPOINT, {
          method: "POST",
          // text/plain keeps this a simple request. Apps Script web apps do not
          // answer the CORS preflight that application/json would trigger.
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(record),
        });
      } catch {
        /* the local copy above is the fallback */
      }
    }

    setFeedbackOpen(false);
  }

  function doReset() {
    setStatus({});
    setNote("");
    setOpenMap({});
    hasCelebrated.current = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  /** Every view renders the same card; only the container differs. */
  const renderCard = (qi: number) => (
    <QuestionCard
      key={qi}
      num={qi + 1}
      item={questions[qi]}
      status={status[qi + 1] ?? "none"}
      onRate={(color) => rate(qi + 1, color)}
      open={openMap[qi + 1] ?? false}
      onOpenChange={(o) => setOpenMap((m) => ({ ...m, [qi + 1]: o }))}
    />
  );

  const active = testimonials[tIndex];
  // Stable identity: a fresh array here would restart the fan's entry animation
  // on every render of this component.
  const testimonialCards = useMemo(
    () =>
      testimonials.map((t) => ({
        imgUrl: testimonialArt(t),
        alt: `${t.name} — ${t.role}`,
        title: t.name,
        subtitle: t.role,
      })),
    [],
  );
  const carouselTotal = visibleIdx.length;
  const safeCarouselIndex = carouselTotal ? ((carouselIndex % carouselTotal) + carouselTotal) % carouselTotal : 0;

  return (
    <div className="min-h-screen text-slate-800 dark:text-stone-200">
      {/* Title page. Sticky, so the content below scrolls up over it. */}
      {/* Swap to variant="ghost" for the giant outlined-word backdrop instead. */}
      <HeroTitle
        variant="art"
        topLeft={
          <a
            href="#/home"
            className="group inline-flex items-center gap-1.5 rounded-full border border-slate-300/70 bg-white/60 px-3 py-1.5 text-sm font-semibold text-slate-600 backdrop-blur transition-colors hover:text-slate-900 dark:border-stone-700/70 dark:bg-stone-900/50 dark:text-stone-400 dark:hover:text-stone-100"
          >
            <Home className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Home
          </a>
        }
      />

      {/* The curtain: rides over the hero on its own background, with a rounded
          top edge and a shadow so the seam reads as a deliberate transition. */}
      <div className="relative z-10 bg-[#f6f4ef] dark:bg-[#0c0a09] rounded-t-[2rem] shadow-[0_-24px_60px_-20px_rgba(15,23,42,0.25)] dark:shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.7)] pt-4 pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Floating toolbar. No title here on purpose: it lives on the hero, and
            keeping it out is what stops this bar feeling cramped. */}
        <div className="sticky top-3 z-30 mb-6 rounded-2xl px-3 py-2.5 bg-white/85 dark:bg-stone-900/85 backdrop-blur border border-slate-200 dark:border-stone-800 shadow-lg">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2.5 text-sm font-medium bg-white dark:bg-stone-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-stone-800">
              <span className="flex items-center gap-1 text-slate-600 dark:text-stone-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />{counts.red}
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-stone-300">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />{counts.yellow}
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-stone-300">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />{counts.green}
              </span>
              <span className="text-slate-400 dark:text-stone-500 text-xs font-mono border-l border-slate-200 dark:border-stone-700 pl-2.5">
                {reviewed} / {questions.length} reviewed
              </span>
            </div>

            {/* display:contents so SHOW, ORDER and the cluster are direct flex
                items of the row above, letting ml-auto reach the right edge. */}
            <div className="contents">
              <div className="flex items-center gap-1 bg-white dark:bg-stone-900 px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-stone-800">
                <span className="text-[0.65rem] text-slate-400 dark:text-stone-500 font-semibold font-mono pl-1 pr-0.5">SHOW</span>
                <button
                  onClick={() => setFilter("all")}
                  className={cn("px-2.5 py-1 rounded-md text-sm font-semibold transition", filter === "all" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-50 dark:text-stone-300 dark:hover:bg-white/5")}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("needs")}
                  className={cn("px-2.5 py-1 rounded-md text-sm font-semibold transition", filter === "needs" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-50 dark:text-stone-300 dark:hover:bg-white/5")}
                >
                  Needs Review
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-stone-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-stone-800">
                <span className="text-[0.65rem] text-slate-400 dark:text-stone-500 font-semibold font-mono">ORDER</span>
                <select
                  value={order}
                  onChange={(e) => applyOrder(e.target.value as typeof order)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 pl-2 pr-1 py-1 rounded-md text-sm font-semibold"
                >
                  <option value="number">Number</option>
                  <option value="hard-first">Hardest first</option>
                  <option value="easy-first">Easiest first</option>
                </select>
              </div>
            </div>

            {/* Open, the cluster gets a line of its own so hovering a button has
                room to widen. The filter hint shares that line on the left,
                where the right-anchored toolbar leaves it free. */}
            {/* Hint waits for the close animation to finish. Mounting it while
                the buttons were still exiting made it appear mid-row and then
                slide right as they unmounted. */}
            {showHint && <ClickHereHint className="ml-auto" />}
            {/* Trigger stays inline in the header; its actions drop into a
                floating panel, so opening never changes the header's height. */}
            <div className={showHint ? "" : "ml-auto"}>
              <AnimatedActionCluster
                label="tools"
                direction="left"
                overlay
                open={toolsOpen}
                onOpenChange={setToolsOpen}
              >
              {[
                // Whichever of these two has nothing left to do merges into the
                // other, so the toolbar never offers a button that is a no-op.
                <GooeyTogglePair
                  key="expand-collapse"
                  show={toggleVisibility}
                  expand={{
                    title: "Expand All",
                    icon: <ChevronsUpDown />,
                    onClick: () => toggleAll(true),
                    gradientFrom: "#4f46e5",
                    gradientTo: "#6366f1",
                  }}
                  collapse={{
                    title: "Collapse All",
                    icon: <ChevronsDownUp />,
                    onClick: () => toggleAll(false),
                    gradientFrom: "#475569",
                    gradientTo: "#64748b",
                  }}
                />,
                ...([
                  {
                    title: shuffled ? "Unshuffle" : "Shuffle",
                    icon: <Shuffle />,
                    onClick: toggleShuffle,
                    gradientFrom: "#0f766e",
                    gradientTo: "#0e7490",
                    active: shuffled,
                  },
                  // One control cycles List -> Carousel -> Scroll.
                  {
                    title: VIEW_LABEL[view],
                    icon: VIEW_ICON[view],
                    onClick: cycleView,
                    gradientFrom: "#7c3aed",
                    gradientTo: "#a855f7",
                    active: view !== "list",
                    particles: true,
                  },
                  {
                    title: "To Bottom",
                    icon: <ArrowDownToLine />,
                    onClick: jumpToBottom,
                    gradientFrom: "#b45309",
                    gradientTo: "#d97706",
                  },
                ] as GradientMenuItem[]).map((item, i) => (
                  // Keyed by position, not title. The view and shuffle buttons
                  // relabel themselves on click, and a title key made React
                  // unmount and remount them, throwing away the particle burst
                  // state before it could render.
                  <GradientMenuButton key={i} {...item} />
                )),
                <ButtonHoldAndRelease
                  key="reset"
                  onConfirm={doReset}
                  holdDuration={1200}
                  label="Reset"
                  holdingLabel="Hold…"
                  className="min-w-0 h-9 px-3"
                />,
              ]}
            </AnimatedActionCluster>
            </div>
            {/* Moves into the pill now that the title row is gone. */}
            <AnimatedThemeToggler />
          </div>

          {filter === "needs" && (
            <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-2">
              Showing only questions marked <span className="font-semibold">Review</span>,{" "}
              <span className="font-semibold">Almost</span>, or not yet rated.
            </p>
          )}

          <div className="h-1.5 w-full bg-slate-200 dark:bg-stone-800 rounded mt-3 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${(reviewed / questions.length) * 100}%` }}
            />
          </div>
        </div>


        {/* Header spans the wider shell so the title is not cramped; the reading
            column below comes back in to a comfortable measure. */}
        <div className="max-w-3xl mx-auto">
        {/* One card definition for all four views. Previously each branch
            repeated the same eight props, so a change to any of them had to be
            made in three places. */}
        {view === "scroll" ? (
          <ScrollTiltedGrid className="gap-[14vh] py-[12vh]">
            {visibleIdx.map(renderCard)}
          </ScrollTiltedGrid>
        ) : view === "stack" ? (
          <StackedCards>{visibleIdx.map(renderCard)}</StackedCards>
        ) : view === "carousel" ? (
          <SnapCarousel
            label="Questions"
            index={safeCarouselIndex}
            onIndexChange={setCarouselIndex}
          >
            {visibleIdx.map(renderCard)}
          </SnapCarousel>
        ) : (
          <div className="space-y-4">{visibleIdx.map(renderCard)}</div>
        )}

        {/* End of the cards, bottom right. */}
        <ScrollToTop className="mt-6" />

        {reviewed === questions.length && (
          <div className="mt-6 text-center bg-indigo-50 dark:bg-indigo-400/10 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-6">
            <p className="text-5xl mb-2">👍</p>
            <p className="font-bold text-indigo-900 dark:text-indigo-200 text-lg">You've reviewed every question.</p>
            <p className="text-indigo-700 dark:text-indigo-300 text-sm mt-1">
              Use "Needs Review" to double-check anything marked red or yellow before the LCTA.
            </p>
          </div>
        )}

        <div className="mt-12">
          <h2 className="playful-face text-center text-2xl font-bold text-slate-800 dark:text-stone-200 mb-4">
            What Orgo Students Are Saying
          </h2>
          <SocialCards
            cards={testimonialCards}
            activeIndex={tIndex}
            onActiveIndexChange={setTIndex}
            spread={0.65}
            autoPlayInterval={4500}
          />

          {active && (
            <div className="relative max-w-xl mx-auto mt-8">
            <QuoteSurface>
            <figure className="bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-2xl shadow-sm px-6 py-5 relative">
              <blockquote className="text-slate-700 dark:text-stone-300 text-base leading-relaxed text-center">
                {active.quote}
              </blockquote>
              <figcaption className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-stone-800">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${active.from}, ${active.to})` }}
                >
                  {active.initials}
                </span>
                <span className="text-left">
                  <span className="block font-bold text-slate-900 dark:text-stone-100 text-sm leading-tight">{active.name}</span>
                  <span className="block text-xs text-slate-400 dark:text-stone-500 font-mono leading-tight">{active.role}</span>
                </span>
              </figcaption>
            </figure>
            </QuoteSurface>
            {/* Sibling of the tilt wrapper, not a child: that wrapper clips with
                overflow-hidden, so anything hanging over the top edge would be
                cut off.

                The offset is deliberately not -50%. A quote mark's ink sits high
                in its line box (measured: rows 7 to 26 of a 72px box), so
                centring the box left the whole glyph floating a good 19px clear
                of the card. 0.23em is where the ink itself straddles the border,
                which is what makes it read as popping out of the edge. */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-7 top-0 z-20 -translate-y-[0.23em] text-7xl leading-none font-serif text-indigo-300 dark:text-indigo-400/60 select-none"
            >
              &ldquo;
            </span>
            </div>
          )}
          <p className="text-center text-xs text-slate-400 dark:text-stone-500 mt-3">(these are fake testimonials)</p>
        </div>

        <footer className="mt-12 text-center text-gray-500 dark:text-stone-400 text-sm">
          <p>Ready for the LCTA! Remember: Anhydrous = Dry Reaction | Regular = Wet Workup.</p>

          <p className="playful-face mt-6 mx-auto max-w-xl text-lg leading-relaxed text-slate-600 dark:text-stone-300">
            Thank you for visiting [Website Name]! I appreciate your time and interest in
            my work! If you have any questions, please feel free to reach out through my
            feedback form on the right (<span aria-hidden>&rarr;</span>)!
          </p>

          <a
            href="https://github.com/andliu7/grignard_LCTA/tree/gh-pages"
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold text-indigo-600 dark:text-indigo-300 outline-none transition-colors hover:text-indigo-700 dark:hover:text-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <GitBranch className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
            <span className="relative">
              Check out the GitHub here
              {/* Underline sweeps in from the left on hover. */}
              <span
                aria-hidden
                className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-transform duration-300 ease-out group-hover:scale-x-100"
              />
            </span>
            <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </a>
        </footer>
        </div>
      </div>
      </div>

      <button
        type="button"
        onClick={() => setFeedbackOpen(true)}
        // No `relative` here: `fixed` already establishes the containing block
        // for the glass layers, and setting both lets the cascade decide which
        // position wins, which previously threw this button off screen.
        className="fixed bottom-5 right-36 z-40 flex items-center gap-2 rounded-full bg-white/60 dark:bg-stone-900/50 px-4 py-2 font-bold text-slate-700 dark:text-stone-200 shadow-lg cursor-pointer transition-transform hover:scale-105 overflow-hidden"
      >
        <LiquidGlassLayers />
        <span className="relative z-10 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Feedback
        </span>
      </button>

      {/* One instance supplies the filter the glass layers reference. */}
      <GlassFilter />

      <AnimatePresence>
        {feedbackOpen && (
          <FeedbackWidget
            title="How's this study guide?"
            placeholder="What would make this more useful before the LCTA?"
            onSubmit={saveFeedback}
            onClose={() => setFeedbackOpen(false)}
          />
        )}
      </AnimatePresence>

      <StickyNote value={note} onChange={setNote} />
      <Confetti trigger={confettiTrigger} />
    </div>
  );
}
