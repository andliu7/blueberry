import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, ChevronsDownUp, Shuffle, GalleryHorizontalEnd, List, MoveVertical, ArrowDown, GitBranch, ArrowUpRight, Layers, RefreshCw, Orbit } from "lucide-react";
import { FlippingCard } from "@/components/ui/flipping-card";
import { FlipCard } from "@/components/ui/flip-card";
import { MathHtml } from "@/components/ui/math-html";
import { ClickHereHint } from "@/components/ui/click-here-hint";
import { useDecks } from "@/lib/useDecks";
import { isReference, DECK_GROUPS, type DeckGroupId, type StudyDeck } from "@/data/types";
import { NotFoundPage } from "@/components/ui/404-page-not-found";
import { testimonials, testimonialArt } from "@/data/testimonials";
import { GradientMenuButton, type GradientMenuItem } from "@/components/ui/gradient-menu";
import { AnimatedActionCluster } from "@/components/ui/floating-action-button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { HeroTitle } from "@/components/ui/hero-title";
import { HomeBlueberry } from "@/components/ui/home-blueberry";
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
import { CardGallery3D, GALLERY_MAX, type GalleryItem } from "@/components/ui/card-gallery-3d";
import { ButtonHoldAndRelease } from "@/components/ui/hold-and-release-button";
import SocialCards from "@/components/ui/card-fan-carousel";
import { StickyNote } from "@/components/StickyNote";
import { Confetti } from "@/components/Confetti";
import { FeedbackButton } from "@/components/FeedbackButton";
import { DeckAbout } from "@/components/ui/deck-about";
import { SITE_NAME } from "@/data/site";
import { progressKey, loadSaved } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { useMathJaxTypeset } from "@/lib/useMathJaxTypeset";

/**
 * Split by route, because the whole site used to arrive as one 755 kB file.
 * Someone opening a single deck on phone data was downloading the workspace,
 * the admin panel, the contact form and every other page before their first
 * card rendered.
 *
 * `HomePage` is deliberately not lazy: it is the most common landing point and
 * splitting it would trade the bundle win for a blank frame on arrival.
 */
const ReferenceApp = lazy(() =>
  import("@/components/ReferenceApp").then((m) => ({ default: m.ReferenceApp })),
);
const FolderPage = lazy(() =>
  import("@/components/FolderPage").then((m) => ({ default: m.FolderPage })),
);
const ContactPage = lazy(() =>
  import("@/components/ContactPage").then((m) => ({ default: m.ContactPage })),
);
const SignInPage = lazy(() =>
  import("@/components/SignInPage").then((m) => ({ default: m.SignInPage })),
);


const VIEW_LABEL = {
  list: "List",
  carousel: "Carousel",
  scroll: "Scroll",
  stack: "Stack",
  gallery: "Gallery",
} as const;
const VIEW_ICON = {
  list: <List />,
  carousel: <GalleryHorizontalEnd />,
  scroll: <MoveVertical />,
  stack: <Layers />,
  gallery: <Orbit />,
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

/** Wraps a split route so its chunk can arrive without a blank frame. */
function withBoundary(node: React.ReactNode) {
  return <Suspense fallback={<DeckLoading />}>{node}</Suspense>;
}

/**
 * The root only decides which page is showing. Decks live at #/deck/<id>, with
 * one exception: Grignard answers at the bare URL too, because that is the link
 * people already have and no bookmark of it should break. The hub sits behind
 * #/home, reached from the Home link on the title screen.
 */
export default function App() {
  const route = useHashRoute();
  // Includes the published decks, which arrive a moment after the page does.
  // The router is what makes an uploaded deck reachable at its own URL rather
  // than only visible as a card on the hub.
  const { decks, loading } = useDecks();

  /**
   * Every route starts at the top.
   *
   * A hash change does not reset the scroll position, so clicking a deck from
   * halfway down the hub dropped you the same distance down the deck: past the
   * title screen and into the middle of the cards. The deck's own opening is
   * the first thing it wants to show you.
   */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  if (route === "home") return <HomePage />;
  // `about` is the old address for what is now the contact page. About itself is
  // a card opened over whatever you were looking at, so it has no route at all.
  if (route === "contact" || route === "about") return withBoundary(<ContactPage />);
  // Unlinked from the nav on purpose; reached from the name on the About card.
  if (route === "signin") return withBoundary(<SignInPage />);

  if (route.startsWith("folder/")) {
    const gid = route.slice(7) as DeckGroupId;
    return DECK_GROUPS.some((g) => g.id === gid) ? (
      withBoundary(<FolderPage key={gid} groupId={gid} />)
    ) : (
      <NotFoundPage what="That folder" detail={`#/${route}`} />
    );
  }

  // The bare URL is the Grignard deck; anything else unrecognised is a 404.
  if (route !== "" && !route.startsWith("deck/")) {
    return <NotFoundPage detail={`#/${route}`} />;
  }

  const id = route.startsWith("deck/") ? route.slice(5) : "grignard";
  const deck = decks.find((d) => d.id === id);
  /**
   * An unknown deck used to fall through to the hub on the theory that a stale
   * bookmark should land somewhere useful. Silently swapping the page for a
   * different one is worse than saying so: someone following a link to a
   * renamed deck was left wondering whether they had misread it. The 404 says
   * what happened and offers the hub, which lands them in the same place with
   * an explanation.
   *
   * Not while the published decks are still in flight, though. Opening a link to
   * an uploaded deck would otherwise show a 404 for as long as the request took
   * and then replace it with the deck, which reads as the site being broken and
   * then changing its mind.
   */
  if (!deck) {
    return loading ? (
      <DeckLoading />
    ) : (
      <NotFoundPage what="That deck" detail={`#/${route}`} />
    );
  }
  // Keyed so switching decks remounts rather than carrying the old deck's
  // ratings, open cards and scroll position across.
  if (isReference(deck)) return withBoundary(<ReferenceApp key={deck.id} deck={deck} />);
  return <StudyApp key={deck.id} deck={deck} />;
}

/**
 * Shown only in the gap between asking for a deck that is not built in and
 * hearing back about the published ones. Deliberately plain: a spinner that
 * appears for 300ms is noise, and a skeleton of a deck page would be a lie about
 * what is coming, since the answer is often a 404.
 */
function DeckLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f4ef] dark:bg-[#0c0a09]">
      <p className="font-mono text-sm text-slate-400 dark:text-stone-500">Looking for that deck…</p>
    </div>
  );
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
  const [view, setView] = useState<"list" | "carousel" | "scroll" | "stack" | "gallery">("list");
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

  /**
   * The gallery only joins the cycle on a deck short enough for a ring of cards
   * to be readable. Past about fifteen the cards overlap into a smear, and a
   * view that is useless on the 44-question decks should not be one of the
   * things the button cycles you through on them.
   */
  const VIEWS = useMemo(
    () =>
      (questions.length <= GALLERY_MAX
        ? (["list", "carousel", "scroll", "stack", "gallery"] as const)
        : (["list", "carousel", "scroll", "stack"] as const)) as readonly typeof view[],
    [questions.length],
  );
  function cycleView() {
    setView((v) => VIEWS[(VIEWS.indexOf(v) + 1) % VIEWS.length]!);
  }

  /** Questions as gallery cards. No diagrams on a study deck, so title only. */
  const galleryItems: GalleryItem[] = useMemo(
    () => visibleIdx.map((qi) => ({ id: String(qi), title: questions[qi]!.q, body: questions[qi]!.a })),
    [visibleIdx, questions],
  );

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

  /**
   * Space turns over the card you are on, without having to reach for it.
   *
   * Drilling the carousel means arrowing or clicking through and never touching
   * the card itself, so the key that ought to be the whole interaction did
   * nothing. What "turn over" means depends on how the card is dressed: a flip
   * or tilt card turns, and a plain card opens its answer, which is the same
   * gesture wearing different clothes.
   *
   * It stands down whenever something else has a claim on the key: a text field,
   * or anything exposing itself as a button, which covers both the toolbar and a
   * focused card whose own handler should run instead of firing alongside this
   * one and flipping twice.
   */
  useEffect(() => {
    if (!carouselMode || carouselTotal === 0) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.code !== "Space") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) ||
          el.closest('[role="button"], button, a'))
      ) {
        return;
      }

      const qi = visibleIdx[safeCarouselIndex];
      if (qi === undefined) return;
      const num = qi + 1;

      // Otherwise the page scrolls a screen down under the carousel.
      e.preventDefault();
      if (cardStyle === "classic") {
        setOpenMap((m) => ({ ...m, [num]: !m[num] }));
      } else {
        setFlippedMap((m) => ({ ...m, [num]: !m[num] }));
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [carouselMode, carouselTotal, visibleIdx, safeCarouselIndex, cardStyle]);

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
        topLeft={<HomeBlueberry />}
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
                  // Keeps its violet gradient on hover and when active, like
                  // the others. What changed is the resting state: an amber
                  // tint plus a spark every few seconds, because this is the
                  // least guessable control in the toolbar and a plain white
                  // pill gave no hint that it did anything.
                  {
                    title: VIEW_LABEL[view],
                    icon: VIEW_ICON[view],
                    onClick: cycleView,
                    gradientFrom: "#7c3aed",
                    gradientTo: "#a855f7",
                    restClassName:
                      "!bg-amber-100 !border-amber-300 dark:!bg-amber-400/15 dark:!border-amber-500/40",
                    active: view !== "list",
                    particles: true,
                    particleClassName: "bg-yellow-200 dark:bg-yellow-200",
                    idleBurstMs: 6000,
                  },
                  {
                    title: "To Bottom",
                    // A plain arrow. The one with a line under it is what every
                    // browser and file manager uses for download, and people
                    // read the icon before the label.
                    icon: <ArrowDown />,
                    onClick: jumpToBottom,
                    gradientFrom: "#b45309",
                    gradientTo: "#d97706",
                  },
                  // No laser here. Drawing over the page earns its place on a
                  // reference sheet, where you are annotating a spectrum, and
                  // not on a wall of question cards.
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

          {/* Says what the key does, since nothing on screen suggests it. In the
              carousel it acts on the card you are on; in the grid there is no
              such thing, so it says how to pick one first. */}
          {(carouselMode || cardStyle !== "classic") && (
            <p className="mt-2 text-xs text-slate-400 dark:text-stone-500">
              {carouselMode ? (
                <>
                  Press <kbd className="rounded border border-slate-300 px-1 font-mono dark:border-stone-700">space</kbd>{" "}
                  to {cardStyle === "classic" ? "reveal the answer" : "flip the card"} you are on.
                </>
              ) : (
                <>
                  Click a card to flip it, or tab to one and press{" "}
                  <kbd className="rounded border border-slate-300 px-1 font-mono dark:border-stone-700">space</kbd>.
                </>
              )}
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
        <DeckAbout text={deck.about} purpose={deck.purpose} funFact={deck.funFact} />

        {/* Container and card style are independent: every branch below calls
            the same renderAnyCard, so Flip and Tilt work inside the carousel,
            the scroll grid and the stack, not just the list. */}
        {view === "gallery" ? (
          <CardGallery3D items={galleryItems} label="Questions" />
        ) : view === "scroll" ? (
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


        {/* The ticket lives on the hub and the folder pages only; see the note
            in ReferenceApp. */}

        <footer className="mt-12 text-center text-gray-500 dark:text-stone-400 text-sm">
          {deck.footNote && <p>{deck.footNote}</p>}

          <p className="playful-face mt-6 mx-auto max-w-xl text-lg leading-relaxed text-slate-600 dark:text-stone-300">
            Thank you for visiting {SITE_NAME}! I appreciate your time and interest in
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

      {/* Sits left of the Notes button rather than on top of it. */}
      <FeedbackButton
        className="right-36"
        placeholder="What would make this more useful before the LCTA?"
      />

      <StickyNote value={note} onChange={setNote} />
      <Confetti trigger={confettiTrigger} />
    </div>
  );
}
