import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ChevronsUpDown, ChevronsDownUp, Shuffle, GalleryHorizontalEnd, List, MoveVertical, MessageSquare, ArrowDownToLine, GitBranch, ArrowUpRight, Layers, Home, RefreshCw } from "lucide-react";
import { FlippingCard } from "@/components/ui/flipping-card";
import { FlipCard } from "@/components/ui/flip-card";
import { MathHtml } from "@/components/ui/math-html";
import { FeedbackWidget } from "@/components/ui/feedback-widget";
import { ClickHereHint } from "@/components/ui/click-here-hint";
import { GlassFilter, LiquidGlassLayers } from "@/components/ui/liquid-glass-button";
import { findDeck } from "@/data/decks";
import { isReference, DECK_GROUPS, type DeckGroupId, type StudyDeck } from "@/data/types";
import { ReferenceApp } from "@/components/ReferenceApp";
import { FolderPage } from "@/components/FolderPage";
import { NotFoundPage } from "@/components/ui/404-page-not-found";
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
import { DeckUploadTicket } from "@/components/DeckUploadTicket";
import { DeckAbout } from "@/components/ui/deck-about";
import { cn } from "@/lib/utils";
import { useMathJaxTypeset } from "@/lib/useMathJaxTypeset";

/**
 * Progress is saved per deck, so one deck's ratings never overwrite another's.
 *
 * Grignard keeps the original un-suffixed key rather than being migrated: it was
 * the only deck for months, and anyone mid-revision would otherwise open the
 * site to find their ratings gone.
 */
const progressKey = (deckId: string) =>
  deckId === "grignard" ? "grignard_lcta_progress_v1" : `grignard_lcta_progress_${deckId}_v1`;
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
 * The rate buttons on the back of a flipped card. Shared by both flip styles,
 * which otherwise had this table and its three buttons written out twice.
 *
 * Stops the click bubbling: the whole card is the flip target, so rating one
 * would otherwise immediately turn it back over.
 */
const RATINGS = [
  ["red", "Review", "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200"],
  ["yellow", "Almost", "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-200"],
  ["green", "Got It", "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200"],
] as const;

function FlipRateRow({
  onRate,
  compact = false,
}: {
  onRate: (color: Status) => void;
  compact?: boolean;
}) {
  return (
    // `relative z-10` matters: the faces carry a glare layer and the content
    // sits on a translateZ plane, so without an explicit stacking context the
    // buttons can end up underneath and swallow their own clicks.
    <div
      className={cn("relative z-10 mt-3 flex shrink-0", compact ? "gap-1.5" : "gap-2")}
      onClick={(e) => e.stopPropagation()}
    >
      {RATINGS.map(([color, label, cls]) => (
        <button
          key={color}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRate(color);
          }}
          className={cn(
            "rounded-md font-bold transition hover:brightness-95 active:scale-95",
            // Big enough to hit with a thumb rather than decorative.
            compact ? "px-3 py-2 text-xs" : "px-3.5 py-2 text-sm",
            cls,
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Card presentation, orthogonal to the view mode that arranges them. */
type CardStyle = "classic" | "flip" | "tilt";
const CARD_STYLES = ["classic", "flip", "tilt"] as const;
const CARD_STYLE_LABEL: Record<CardStyle, string> = {
  classic: "Cards",
  flip: "Flip",
  tilt: "Tilt",
};


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

function loadSaved(deckId: string): { status?: Record<number, Status>; note?: string } {
  try {
    const raw = localStorage.getItem(progressKey(deckId));
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
 * The root only decides which page is showing. Decks live at #/deck/<id>, with
 * one exception: Grignard answers at the bare URL too, because that is the link
 * people already have and no bookmark of it should break. The hub sits behind
 * #/home, reached from the Home link on the title screen.
 */
export default function App() {
  const route = useHashRoute();
  if (route === "home") return <HomePage />;

  if (route.startsWith("folder/")) {
    const gid = route.slice(7) as DeckGroupId;
    return DECK_GROUPS.some((g) => g.id === gid) ? (
      <FolderPage key={gid} groupId={gid} />
    ) : (
      <NotFoundPage what="That folder" detail={`#/${route}`} />
    );
  }

  // The bare URL is the Grignard deck; anything else unrecognised is a 404.
  if (route !== "" && !route.startsWith("deck/")) {
    return <NotFoundPage detail={`#/${route}`} />;
  }

  const id = route.startsWith("deck/") ? route.slice(5) : "grignard";
  const deck = findDeck(id);
  /**
   * An unknown deck used to fall through to the hub on the theory that a stale
   * bookmark should land somewhere useful. Silently swapping the page for a
   * different one is worse than saying so: someone following a link to a
   * renamed deck was left wondering whether they had misread it. The 404 says
   * what happened and offers the hub, which lands them in the same place with
   * an explanation.
   */
  if (!deck) return <NotFoundPage what="That deck" detail={`#/${route}`} />;
  // Keyed so switching decks remounts rather than carrying the old deck's
  // ratings, open cards and scroll position across.
  if (isReference(deck)) return <ReferenceApp key={deck.id} deck={deck} />;
  return <StudyApp key={deck.id} deck={deck} />;
}

function StudyApp({ deck }: { deck: StudyDeck }) {
  const questions = deck.questions;
  const [status, setStatus] = useState<Record<number, Status>>(() => loadSaved(deck.id).status ?? {});
  const [note, setNote] = useState(() => {
    const saved = loadSaved(deck.id).note;
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
  // Question number -> chosen multiple choice option. Lifted out of the card for
  // the same reason as openMap: while it lived inside, Reset could not reach it,
  // so a reset question still showed its answer marked right or wrong.
  const [answerMap, setAnswerMap] = useState<Record<number, number[]>>({});
  // Separate from the ticks: a select-all question is ticked over several
  // clicks and only graded when Check is pressed, so "what is chosen" and
  // "has it been revealed" are genuinely two pieces of state.
  const [submittedMap, setSubmittedMap] = useState<Record<number, boolean>>({});
  /**
   * How a card presents itself, independent of which container it sits in.
   *
   * This used to be a `flipMode` boolean checked *before* the view branch, so
   * turning flip on replaced the carousel instead of filling it. Style and
   * container are separate questions, so they are separate state.
   */
  const [cardStyle, setCardStyle] = useState<CardStyle>("classic");
  const [flippedMap, setFlippedMap] = useState<Record<number, boolean>>({});

  // Save progress whenever it changes. Restoring happens in the useState
  // initialisers above rather than in an effect: an effect-based load races this
  // one, which also runs on mount and would write the empty initial state over
  // the saved progress before the restore landed.
  useEffect(() => {
    try {
      localStorage.setItem(progressKey(deck.id), JSON.stringify({ status, note }));
    } catch {
      /* ignore */
    }
  }, [status, note, deck.id]);

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
  }, [reviewed, questions.length]);

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
    setAnswerMap({});
    setSubmittedMap({});
    hasCelebrated.current = false;
    try {
      localStorage.removeItem(progressKey(deck.id));
    } catch {
      /* ignore */
    }
  }

  /**
   * Flip view: question on the front, answer on the back.
   *
   * Click rather than hover, even though the component supports both. On a
   * phone there is no hover at all, and on a laptop a hover flip fires every
   * time the cursor crosses a card on its way somewhere else, which turns
   * scrolling a deck into a strobe.
   */
  const renderFlipCard = (qi: number) => {
    const item = questions[qi];
    const num = qi + 1;
    return (
      <FlippingCard
        key={qi}
        width={320}
        height={300}
        flipped={flippedMap[num] ?? false}
        onFlip={() => setFlippedMap((m) => ({ ...m, [num]: !m[num] }))}
        className={cn(
          "w-full max-w-full",
          status[num] === "red" && "!border-red-300 dark:!border-red-900",
          status[num] === "yellow" && "!border-yellow-300 dark:!border-yellow-900",
          status[num] === "green" && "!border-green-300 dark:!border-green-900",
        )}
        frontContent={
          <div className="flex h-full w-full flex-col p-5">
            <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
              Question {num}
              {item.mc ? " · MC" : ""}
            </span>
            <div className="flex flex-1 items-center">
              <MathHtml
                html={item.q}
                className="text-lg leading-snug font-semibold text-slate-800 dark:text-stone-100"
              />
            </div>
            <span className="font-mono text-[0.72rem] tracking-wider text-slate-400 uppercase dark:text-stone-500">
              click to flip
            </span>
          </div>
        }
        backContent={
          <div className="flex h-full w-full flex-col p-5">
            <div className="flex-1 overflow-y-auto">
              <MathHtml
                html={item.a}
                className="text-[0.95rem] leading-relaxed text-slate-700 dark:text-stone-300"
              />
            </div>
            <FlipRateRow onRate={(color) => rate(num, color)} />
          </div>
        }
      />
    );
  };

  /** Same question and answer as the flip card, on the tilt-tracking variant. */
  const renderTiltCard = (qi: number) => {
    const item = questions[qi];
    const num = qi + 1;
    return (
      <FlipCard
        key={qi}
        cardNumber={num}
        isFlipped={flippedMap[num] ?? false}
        onFlipChange={() => setFlippedMap((m) => ({ ...m, [num]: !m[num] }))}
        className={cn(
          status[num] === "red" && "[&_[class*=border-slate-200]]:!border-red-300",
          status[num] === "yellow" && "[&_[class*=border-slate-200]]:!border-yellow-300",
          status[num] === "green" && "[&_[class*=border-slate-200]]:!border-green-300",
        )}
        frontContent={
          <div className="flex h-full w-full flex-col p-4">
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {num}
              {item.mc ? " · MC" : ""}
            </span>
            <div className="flex flex-1 items-center">
              <MathHtml
                html={item.q}
                className="text-base leading-snug font-semibold text-slate-800 dark:text-stone-100"
              />
            </div>
            <span className="font-mono text-[0.7rem] tracking-wider text-slate-400 uppercase dark:text-stone-500">
              click to flip
            </span>
          </div>
        }
        backFace={
          <div className="flex h-full w-full flex-col p-4">
            <div className="flex-1 overflow-y-auto">
              <MathHtml
                html={item.a}
                className="text-[0.9rem] leading-relaxed text-slate-700 dark:text-stone-300"
              />
            </div>
            <FlipRateRow onRate={(color) => rate(num, color)} compact />
          </div>
        }
      />
    );
  };

  /**
   * The single indirection that lets any style appear in any view. Containers
   * call this and never know which card they are laying out.
   */
  const renderAnyCard = (qi: number) =>
    cardStyle === "flip"
      ? renderFlipCard(qi)
      : cardStyle === "tilt"
        ? renderTiltCard(qi)
        : renderCard(qi);

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
      picks={answerMap[qi + 1] ?? []}
      onPicksChange={(next) => setAnswerMap((m) => ({ ...m, [qi + 1]: next }))}
      submitted={submittedMap[qi + 1] ?? false}
      onSubmit={() => setSubmittedMap((m) => ({ ...m, [qi + 1]: true }))}
      onRetry={() => setSubmittedMap((m) => ({ ...m, [qi + 1]: false }))}
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
        titleLines={deck.titleLines}
        subtitle={deck.subtitle}
        ghostWord={deck.titleLines[0]}
        motif={deck.motif}
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
                // Sits immediately after Expand/Collapse and before the rest,
                // because it belongs with the controls that change how a card
                // presents itself rather than with the ones that reorder them.
                <GradientMenuButton
                  key="card-style"
                  title={CARD_STYLE_LABEL[cardStyle]}
                  icon={<RefreshCw />}
                  onClick={() => {
                    setCardStyle(
                      (s) => CARD_STYLES[(CARD_STYLES.indexOf(s) + 1) % CARD_STYLES.length],
                    );
                    // Every card starts question-side up in the new style;
                    // carrying flips across reads as cards already answered.
                    setFlippedMap({});
                  }}
                  gradientFrom="#be123c"
                  gradientTo="#e11d48"
                  active={cardStyle !== "classic"}
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
                  // Grey rather than another saturated pill, with a yellow
                  // spark every few seconds: the view control is the least
                  // guessable thing in the toolbar, and it was disappearing
                  // among four coloured neighbours.
                  {
                    title: VIEW_LABEL[view],
                    icon: VIEW_ICON[view],
                    onClick: cycleView,
                    gradientFrom: "#6b7280",
                    gradientTo: "#9ca3af",
                    active: view !== "list",
                    particles: true,
                    particleClassName: "bg-yellow-200 dark:bg-yellow-200",
                    idleBurstMs: 6000,
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
        <DeckAbout text={deck.about} />

        {/* Container and card style are independent: every branch below calls
            the same renderAnyCard, so Flip and Tilt work inside the carousel,
            the scroll grid and the stack, not just the list. */}
        {view === "scroll" ? (
          <ScrollTiltedGrid className="gap-[14vh] py-[12vh]">
            {visibleIdx.map(renderAnyCard)}
          </ScrollTiltedGrid>
        ) : view === "stack" ? (
          <StackedCards>{visibleIdx.map(renderAnyCard)}</StackedCards>
        ) : view === "carousel" ? (
          <SnapCarousel
            label="Questions"
            index={safeCarouselIndex}
            onIndexChange={setCarouselIndex}
          >
            {visibleIdx.map(renderAnyCard)}
          </SnapCarousel>
        ) : cardStyle === "classic" ? (
          <div className="space-y-4">{visibleIdx.map(renderAnyCard)}</div>
        ) : (
          // The flip styles are fixed-height and squarer than a question card,
          // so the list view gives them a two-column grid rather than one tall
          // column of half-empty cards.
          <div className="grid gap-5 sm:grid-cols-2">{visibleIdx.map(renderAnyCard)}</div>
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

        <DeckUploadTicket />

        <footer className="mt-12 text-center text-gray-500 dark:text-stone-400 text-sm">
          {deck.footNote && <p>{deck.footNote}</p>}

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
