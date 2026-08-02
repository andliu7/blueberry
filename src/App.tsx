import { useEffect, useMemo, useRef, useState } from "react";
import { questions } from "@/data/questions";
import { testimonials, avatarDataUri } from "@/data/testimonials";
import { QuestionCard, type Status } from "@/components/QuestionCard";
import { PressDepth } from "@/components/ui/press-depth";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import SocialCards from "@/components/ui/card-fan-carousel";
import { StickyNote } from "@/components/StickyNote";
import { Confetti } from "@/components/Confetti";
import { cn } from "@/lib/utils";
import { useMathJaxTypeset } from "@/lib/useMathJaxTypeset";

const STORAGE_KEY = "grignard_lcta_progress_v1";
const diffRank: Record<Status, number> = { red: 0, yellow: 1, none: 2, green: 3 };


export default function App() {
  const [status, setStatus] = useState<Record<number, Status>>({});
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"all" | "needs">("all");
  const [order, setOrder] = useState<"number" | "hard-first" | "easy-first">("number");
  const [orderedIdx, setOrderedIdx] = useState<number[]>(questions.map((_, i) => i));
  const [carouselMode, setCarouselMode] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const hasCelebrated = useRef(false);
  const [tIndex, setTIndex] = useState(0);

  // Load saved progress once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.status) setStatus(data.status);
        if (typeof data.note === "string") setNote(data.note);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Save progress whenever it changes
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

  useMathJaxTypeset([status, orderedIdx, filter, carouselMode, carouselIndex, tIndex]);

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

  function doReset() {
    setStatus({});
    setNote("");
    hasCelebrated.current = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  const carouselTotal = visibleIdx.length;
  const safeCarouselIndex = carouselTotal ? ((carouselIndex % carouselTotal) + carouselTotal) % carouselTotal : 0;

  return (
    <div className="min-h-screen py-10 px-4 text-slate-800">
      <div className="max-w-3xl mx-auto">

        <div className="sticky top-0 z-20 -mx-4 px-4 pt-3 pb-3 mb-6 bg-[#f6f4ef]/95 backdrop-blur border-b border-slate-200">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 text-center tracking-tight mb-3">
            Grignard LCTA Master List
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 text-sm font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />{counts.red}
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />{counts.yellow}
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />{counts.green}
              </span>
              <span className="text-slate-400 text-xs font-mono border-l border-slate-200 pl-2.5">
                {reviewed} / {questions.length} reviewed
              </span>
            </div>

            <div className="flex items-center gap-1 bg-white px-1.5 py-1.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setFilter("all")}
                className={cn("px-2.5 py-1 rounded-md text-sm font-semibold transition", filter === "all" ? "bg-indigo-50 text-indigo-700" : "text-slate-600")}
              >
                All
              </button>
              <button
                onClick={() => setFilter("needs")}
                className={cn("px-2.5 py-1 rounded-md text-sm font-semibold transition", filter === "needs" ? "bg-indigo-50 text-indigo-700" : "text-slate-600")}
              >
                Needs Review
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-400 font-semibold font-mono">ORDER</span>
              <select
                value={order}
                onChange={(e) => applyOrder(e.target.value as typeof order)}
                className="bg-slate-50 border border-slate-200 text-slate-700 pl-2 pr-1 py-1 rounded-md text-sm font-semibold"
              >
                <option value="number">Number</option>
                <option value="hard-first">Hardest first</option>
                <option value="easy-first">Easiest first</option>
              </select>
              <PressDepth depth={2} className="!h-7 !px-2.5 !text-sm !font-semibold" onClick={shuffle}>
                🔀 Shuffle
              </PressDepth>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <PressDepth depth={3} className="!h-9 !px-3 !text-sm !font-semibold" onClick={() => setCarouselMode((m) => !m)}>
                {carouselMode ? "📋 List View" : "🎠 Carousel View"}
              </PressDepth>
              <HoldToConfirm
                onConfirm={doReset}
                confirmLabel="Reset!"
                duration={1200}
                className="!h-9 !px-3 !text-sm !font-semibold !bg-red-50 !text-red-700 !border-red-300"
              >
                Hold to Reset
              </HoldToConfirm>
            </div>
          </div>

          {filter === "needs" && (
            <p className="text-xs text-indigo-600 mt-2">
              Showing only questions marked <span className="font-semibold">Review</span>,{" "}
              <span className="font-semibold">Almost</span>, or not yet rated.
            </p>
          )}

          <div className="h-1.5 w-full bg-slate-200 rounded mt-3 overflow-hidden">
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
            <span className="font-mono text-sm text-slate-500">
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
            />
          ))}
        </div>

        {reviewed === questions.length && (
          <div className="mt-6 text-center bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <p className="text-5xl mb-2">👍</p>
            <p className="font-bold text-indigo-900 text-lg">You've reviewed every question.</p>
            <p className="text-indigo-700 text-sm mt-1">
              Use "Needs Review" to double-check anything marked red or yellow before the LCTA.
            </p>
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-center text-lg font-bold text-slate-800 mb-4">What Orgo Students Are Saying</h2>
          <SocialCards
            cards={testimonials.map((t) => ({
              imgUrl: avatarDataUri(t.initials, t.color),
              alt: t.name,
            }))}
          />
          <div className="max-w-md mx-auto -mt-2 text-center">
            <p className="text-slate-700 italic text-sm">"{testimonials[tIndex]?.quote}"</p>
            <p className="font-bold text-slate-900 text-sm mt-2">{testimonials[tIndex]?.name}</p>
            <p className="text-xs text-slate-400 font-mono">{testimonials[tIndex]?.role}</p>
            <div className="flex justify-center gap-2 mt-3">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTIndex(i)}
                  className={cn("w-2 h-2 rounded-full transition", i === tIndex ? "bg-indigo-500" : "bg-slate-300")}
                />
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-3">(these are fake testimonials)</p>
        </div>

        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Ready for the LCTA! Remember: Anhydrous = Dry Reaction | Regular = Wet Workup.</p>
        </footer>
      </div>

      <StickyNote value={note} onChange={setNote} />
      <Confetti trigger={confettiTrigger} />
    </div>
  );
}
