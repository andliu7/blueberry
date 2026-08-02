import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ChevronsUpDown, ChevronsDownUp, Shuffle, GalleryHorizontalEnd, List, MoveVertical, MessageSquare, ArrowDownToLine, GitBranch, ArrowUpRight } from "lucide-react";
import { FeedbackWidget } from "@/components/ui/feedback-widget";
import { ClickHereHint } from "@/components/ui/click-here-hint";
import { questions } from "@/data/questions";
import { testimonials, testimonialArt } from "@/data/testimonials";
import { GradientMenuButton, type GradientMenuItem } from "@/components/ui/gradient-menu";
import { AnimatedActionCluster } from "@/components/ui/floating-action-button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import BoldOnHover from "@/components/ui/bold-on-hover";
import { ScrollTiltedGrid } from "@/components/ui/scroll-tilted-grid";
import { TiltCard } from "@/components/ui/be-ui-tilt-card";
import { useIsDark } from "@/lib/useIsDark";
import { QuestionCard, type Status } from "@/components/QuestionCard";
import { PressDepth } from "@/components/ui/press-depth";
import { ButtonHoldAndRelease } from "@/components/ui/hold-and-release-button";
import SocialCards from "@/components/ui/card-fan-carousel";
import { StickyNote } from "@/components/StickyNote";
import { Confetti } from "@/components/Confetti";
import { cn } from "@/lib/utils";
import { useMathJaxTypeset } from "@/lib/useMathJaxTypeset";

const STORAGE_KEY = "grignard_lcta_progress_v1";
const FEEDBACK_KEY = "grignard_lcta_feedback_v1";
const FEEDBACK_ENDPOINT = import.meta.env.VITE_FEEDBACK_ENDPOINT as string | undefined;

const VIEW_LABEL = { list: "List", carousel: "Carousel", scroll: "Scroll" } as const;
const VIEW_ICON = {
  list: <List />,
  carousel: <GalleryHorizontalEnd />,
  scroll: <MoveVertical />,
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
      className="max-w-xl mx-auto mt-5 rounded-2xl"
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

export default function App() {
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
  const [view, setView] = useState<"list" | "carousel" | "scroll">("list");
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

  const VIEWS = ["list", "carousel", "scroll"] as const;
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
    <div className="min-h-screen pt-10 pb-16 px-4 text-slate-800 dark:text-stone-200">
      <div className="max-w-5xl mx-auto">

        <div className="sticky top-0 z-20 -mx-4 px-4 pt-3 pb-3 mb-6 bg-[#f6f4ef]/95 dark:bg-[#0c0a09]/95 backdrop-blur border-b border-slate-200 dark:border-stone-800">
          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-stone-100 text-center tracking-tight">
              <BoldOnHover
                text="GRIGNARD LCTA MASTER LIST"
                initialWeight={700}
                hoverWeight={900}
                className="title-face cursor-default"
              />
            </h1>
            <AnimatedThemeToggler />
          </div>

          {/* Progress and filters stay anchored left; the tool cluster is pushed
              to the right edge with ml-auto so opening it eats the gap between
              them instead of shunting the filters around. */}
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
            <div className={toolsOpen ? "basis-full flex items-center gap-3 mt-1" : "contents"}>
              {toolsOpen && filter === "needs" && (
                <p className="text-xs text-indigo-600 dark:text-indigo-300">
                  Showing only questions marked <span className="font-semibold">Review</span>,{" "}
                  <span className="font-semibold">Almost</span>, or not yet rated.
                </p>
              )}
              {/* Collapsed, a hint points at the trigger so the toolbar is
                  findable. It takes the ml-auto so the pair sits together. */}
              {!toolsOpen && <ClickHereHint className="ml-auto" />}
              {/* Trigger last so it stays pinned at the right edge; the actions
                  unfold to its left. */}
              <AnimatedActionCluster
                label="tools"
                direction="left"
                className={toolsOpen ? "ml-auto" : ""}
                open={toolsOpen}
                onOpenChange={setToolsOpen}
              >
              {[
                ...([
                  {
                    title: "Expand All",
                    icon: <ChevronsUpDown />,
                    onClick: () => toggleAll(true),
                    gradientFrom: "#4f46e5",
                    gradientTo: "#6366f1",
                  },
                  {
                    title: "Collapse All",
                    icon: <ChevronsDownUp />,
                    onClick: () => toggleAll(false),
                    gradientFrom: "#475569",
                    gradientTo: "#64748b",
                  },
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
                  },
                  {
                    title: "To Bottom",
                    icon: <ArrowDownToLine />,
                    onClick: jumpToBottom,
                    gradientFrom: "#b45309",
                    gradientTo: "#d97706",
                  },
                ] as GradientMenuItem[]).map((item) => (
                  <GradientMenuButton key={item.title} {...item} />
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
          </div>

          {/* Closed, the hint drops below the row as usual. */}
          {!toolsOpen && filter === "needs" && (
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

        {carouselMode && (
          <div className="flex items-center justify-center gap-4 mb-4">
            <PressDepth depth={2} className="!h-9 !w-9 !rounded-full !px-0" onClick={() => setCarouselIndex((i) => i - 1)}>
              ‹
            </PressDepth>
            <span className="font-mono text-sm text-slate-500 dark:text-stone-400">
              {carouselTotal ? safeCarouselIndex + 1 : 0} / {carouselTotal}
            </span>
            <PressDepth depth={2} className="!h-9 !w-9 !rounded-full !px-0" onClick={() => setCarouselIndex((i) => i + 1)}>
              ›
            </PressDepth>
          </div>
        )}

        {/* Header spans the wider shell so the title is not cramped; the reading
            column below comes back in to a comfortable measure. */}
        <div className="max-w-3xl mx-auto">
        {view === "scroll" ? (
          <ScrollTiltedGrid className="gap-[14vh] py-[12vh]">
            {visibleIdx.map((qi) => (
              <QuestionCard
                key={qi}
                num={qi + 1}
                item={questions[qi]}
                status={status[qi + 1] ?? "none"}
                onRate={(color) => rate(qi + 1, color)}
                open={openMap[qi + 1] ?? false}
                onOpenChange={(o) => setOpenMap((m) => ({ ...m, [qi + 1]: o }))}
              />
            ))}
          </ScrollTiltedGrid>
        ) : (
        <div className="space-y-4">
          {visibleIdx.map((qi, pos) => (
            <QuestionCard
              key={qi}
              num={qi + 1}
              item={questions[qi]}
              status={status[qi + 1] ?? "none"}
              onRate={(color) => rate(qi + 1, color)}
              isActive={!carouselMode || pos === safeCarouselIndex}
              open={openMap[qi + 1] ?? false}
              onOpenChange={(o) => setOpenMap((m) => ({ ...m, [qi + 1]: o }))}
            />
          ))}
        </div>
        )}

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
            <QuoteSurface>
            <figure className="bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-2xl shadow-sm px-6 py-5 relative">
              <span
                aria-hidden
                className="absolute left-5 -top-3 text-5xl leading-none font-serif text-indigo-200 dark:text-indigo-400/40 select-none"
              >
                &ldquo;
              </span>
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
          )}
          <p className="text-center text-xs text-slate-400 dark:text-stone-500 mt-3">(these are fake testimonials)</p>
        </div>

        <footer className="mt-12 text-center text-gray-500 dark:text-stone-400 text-sm">
          <p>Ready for the LCTA! Remember: Anhydrous = Dry Reaction | Regular = Wet Workup.</p>

          <p className="playful-face mt-6 mx-auto max-w-xl text-lg leading-relaxed text-slate-600 dark:text-stone-300">
            Thank you for visiting [Website Name]. I appreciate your time and interest in
            my work. If you have any questions, please feel free to reach out through my
            feedback form.
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

      <button
        type="button"
        onClick={() => setFeedbackOpen(true)}
        className="fixed bottom-5 right-36 z-40 flex items-center gap-2 rounded-full bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 px-4 py-2 font-bold text-slate-700 dark:text-stone-200 shadow-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-stone-800"
      >
        <MessageSquare className="w-4 h-4" />
        Feedback
      </button>

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
