import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, ChevronsDownUp, Shuffle, GalleryHorizontalEnd, List } from "lucide-react";
import { questions } from "@/data/questions";
import { testimonials, testimonialArt } from "@/data/testimonials";
import GradientMenu from "@/components/ui/gradient-menu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import BoldOnHover from "@/components/ui/bold-on-hover";
import { QuestionCard, type Status } from "@/components/QuestionCard";
import { PressDepth } from "@/components/ui/press-depth";
import { ButtonHoldAndRelease } from "@/components/ui/hold-and-release-button";
import SocialCards from "@/components/ui/card-fan-carousel";
import { StickyNote } from "@/components/StickyNote";
import { Confetti } from "@/components/Confetti";
import { cn } from "@/lib/utils";
import { useMathJaxTypeset } from "@/lib/useMathJaxTypeset";

const STORAGE_KEY = "grignard_lcta_progress_v1";
const diffRank: Record<Status, number> = { red: 0, yellow: 1, none: 2, green: 3 };


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
  const [carouselMode, setCarouselMode] = useState(false);
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
  useMathJaxTypeset([status, orderedIdx, filter, carouselMode, carouselIndex]);

  function rate(num: number, color: Status) {
    setStatus((s) => ({ ...s, [num]: color }));
    if (carouselMode) {
      setTimeout(() => setCarouselIndex((i) => i + 1), 200);
    }
  }

  function shuffle() {
    const rest = orderedIdx.filter((i) => i !== mcIdx);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    setOrder("number");
    setOrderedIdx(mcIdx >= 0 ? [...rest, mcIdx] : rest);
    setCarouselIndex(0);
  }

  function applyOrder(mode: typeof order) {
    setOrder(mode);
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
      <div className="max-w-3xl mx-auto">

        <div className="sticky top-0 z-20 -mx-4 px-4 pt-3 pb-3 mb-6 bg-[#f6f4ef]/95 dark:bg-[#0c0a09]/95 backdrop-blur border-b border-slate-200 dark:border-stone-800">
          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-stone-100 text-center tracking-tight">
              <BoldOnHover
                text="GRIGNARD LCTA MASTER LIST"
                initialWeight={700}
                hoverWeight={900}
                className="cursor-default"
              />
            </h1>
            <AnimatedThemeToggler />
          </div>

          {/* Row 1 — what you are looking at: progress, then the view filters. */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
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

            <div className="flex items-center gap-2 flex-wrap">
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
          </div>

          {/* Row 2 — what you can do. Reset lives down in the corner, well away
              from the controls you reach for constantly. */}
          <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
            <GradientMenu
              items={[
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
                  title: "Shuffle",
                  icon: <Shuffle />,
                  onClick: shuffle,
                  gradientFrom: "#0f766e",
                  gradientTo: "#0e7490",
                },
                {
                  title: carouselMode ? "List View" : "Carousel",
                  icon: carouselMode ? <List /> : <GalleryHorizontalEnd />,
                  onClick: () => setCarouselMode((m) => !m),
                  gradientFrom: "#b45309",
                  gradientTo: "#d97706",
                  active: carouselMode,
                },
              ]}
            />

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
          <h2 className="text-center text-lg font-bold text-slate-800 dark:text-stone-200 mb-4">What Orgo Students Are Saying</h2>
          <SocialCards
            cards={testimonialCards}
            activeIndex={tIndex}
            onActiveIndexChange={setTIndex}
            spread={0.65}
            autoPlayInterval={4500}
          />

          {active && (
            <figure className="max-w-xl mx-auto mt-5 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-2xl shadow-sm px-6 py-5 relative">
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
          )}
          <p className="text-center text-xs text-slate-400 dark:text-stone-500 mt-3">(these are fake testimonials)</p>
        </div>

        <footer className="mt-12 text-center text-gray-500 dark:text-stone-400 text-sm">
          <p>Ready for the LCTA! Remember: Anhydrous = Dry Reaction | Regular = Wet Workup.</p>
        </footer>
      </div>

      {/* Sits to the left of the Notes button rather than above it, which is
          where the notes panel itself opens. */}
      <div className="fixed bottom-5 right-36 z-40">
        <ButtonHoldAndRelease onConfirm={doReset} holdDuration={1200} />
      </div>

      <StickyNote value={note} onChange={setNote} />
      <Confetti trigger={confettiTrigger} />
    </div>
  );
}
