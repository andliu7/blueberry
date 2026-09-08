import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, GitBranch, ArrowUpRight, MousePointerClick, ImageOff, Highlighter, List, RefreshCw, GalleryHorizontalEnd, Orbit, Maximize2, Minimize2 } from "lucide-react";
import { HeroTitle } from "@/components/ui/hero-title";
import { HomeBlueberry } from "@/components/ui/home-blueberry";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { HoverDeck } from "@/components/ui/hover-deck";
import { ReferenceCards } from "@/components/ui/reference-cards";
import { LaserPointer } from "@/components/ui/laser-pointer";
import { deckCount, type ReferenceDeck } from "@/data/types";
import { DeckAbout } from "@/components/ui/deck-about";
import { DrillBanner, REFERENCE_STEPS } from "@/components/ui/drill-banner";
import { CardGallery3D, GALLERY_MAX, type GalleryItem } from "@/components/ui/card-gallery-3d";
import { cn } from "@/lib/utils";
import { REPO_URL } from "@/data/site";

/**
 * The page for a reference deck.
 *
 * Deliberately shares the study pages' furniture (title screen, curtain, sticky
 * toolbar, footer) so moving between the two kinds of deck does not feel like
 * leaving the site, but drops everything that only makes sense per question:
 * no rating, no Needs Review filter, no view modes. What is left is one toggle,
 * because the only real choice here is whether the answers start hidden.
 */
/**
 * Table is the default and stays it: a reference sheet is something you read
 * down and compare across, which a stack of cards cannot do. The card views are
 * for the other half of the job, drilling one row without the six around it
 * visible to read off.
 */
const ALL_VIEWS = ["table", "flip", "carousel", "gallery"] as const;
type ReferenceView = (typeof ALL_VIEWS)[number];

const VIEW_LABEL: Record<ReferenceView, string> = {
  table: "Table",
  flip: "Flip",
  carousel: "Carousel",
  gallery: "Gallery",
};

const VIEW_ICON: Record<ReferenceView, typeof List> = {
  table: List,
  flip: RefreshCw,
  carousel: GalleryHorizontalEnd,
  gallery: Orbit,
};

export function ReferenceApp({ deck }: { deck: ReferenceDeck }) {
  /**
   * Every row of the sheet, flattened, and whether there are few enough of them
   * for the ring to be readable. The pKa and IR sheets run past twenty rows and
   * would smear into each other; NMR and resonance fit.
   */
  const rows = useMemo(() => deck.groups.flatMap((g) => g.items), [deck.groups]);
  const VIEWS = useMemo(
    () => (rows.length <= GALLERY_MAX ? ALL_VIEWS : (["table", "flip", "carousel"] as const)),
    [rows.length],
  ) as readonly ReferenceView[];

  const galleryItems: GalleryItem[] = useMemo(
    () =>
      rows.map((row, i) => ({
        id: `${i}-${row.title}`,
        title: row.title,
        body: row.description,
        badge: row.badge,
        image: row.image
          ? `${import.meta.env.BASE_URL}cards/${/\.[a-z0-9]+$/i.test(row.image) ? row.image : `${row.image}.png`}`
          : undefined,
      })),
    [rows],
  );

  const [quizMode, setQuizMode] = useState(true);
  const [hoverPreview, setHoverPreview] = useState(true);
  const [laser, setLaser] = useState(false);
  const [view, setView] = useState<ReferenceView>("table");
  const total = deckCount(deck);

  /**
   * The carousel with everything else taken away, exactly as on a study deck.
   *
   * Only offered in the carousel, because it is the only view here that shows
   * one card at a time. Full-screening the table would just be the table.
   */
  const [focusMode, setFocusMode] = useState(false);
  useEffect(() => {
    if (view !== "carousel") setFocusMode(false);
  }, [view]);
  useEffect(() => {
    if (!focusMode) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setFocusMode(false);
    window.addEventListener("keydown", esc);
    // The page behind must not scroll while this is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [focusMode]);

  /** Carousel and focus in one go, for the banner's button. */
  const startDrilling = useCallback(() => {
    setView("carousel");
    setFocusMode(true);
  }, []);

  /**
   * The button names the view it will switch you to, not the one you are in.
   *
   * Labelling it with the current view meant the control read as a status
   * light, so pressing "Table" while looking at a table was the only way to
   * find out it did anything. Which mode you are in is the message's job.
   */
  const next = VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length]!;
  const NextIcon = VIEW_ICON[next];

  return (
    <div className="min-h-screen text-slate-800 dark:text-stone-200">
      <HeroTitle
        variant="art"
        titleLines={deck.titleLines}
        subtitle={deck.subtitle}
        ghostWord={deck.titleLines[0]}
        motif={deck.motif}
        topLeft={<HomeBlueberry />}
      />

      <div className="relative z-10 rounded-t-[2rem] bg-[#f6f4ef] px-4 pt-4 pb-16 shadow-[0_-24px_60px_-20px_rgba(15,23,42,0.25)] dark:bg-[#0c0a09] dark:shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.7)]">
        <div className="mx-auto max-w-5xl">
          <div className="sticky top-3 z-30 mb-6 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2.5 shadow-lg backdrop-blur dark:border-stone-800 dark:bg-stone-900/85">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium dark:border-stone-800 dark:bg-stone-900">
                <span className="font-mono text-xs text-slate-400 dark:text-stone-500">
                  {total} rows
                </span>
              </div>

              {/* One control cycling the three, like the deck toolbar's.
                  Styled neutrally throughout: it is an action rather than a
                  state, and a highlighted button reading "Flip" would say you
                  were already on flip. */}
              <button
                onClick={() => setView(next)}
                title={`Switch to the ${VIEW_LABEL[next].toLowerCase()} view`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-white/5"
              >
                <NextIcon className="h-4 w-4" />
                {VIEW_LABEL[next]}
              </button>

              {/* Both of these describe the table and nothing else. On a card
                  the answer is on the back, which is the whole mechanism, and
                  there is no row to hover. Leaving them on screen would offer
                  two controls that quietly do nothing. */}
              {view === "table" && (
                <>
              <button
                onClick={() => setQuizMode((q) => !q)}
                title={quizMode ? "Answers hidden until you hover or tap" : "All answers showing"}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                  quizMode
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-400/15 dark:text-indigo-300"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-white/5",
                )}
              >
                {quizMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {quizMode ? "Quiz mode" : "Reveal all"}
              </button>

              <button
                onClick={() => setHoverPreview((h) => !h)}
                title={
                  hoverPreview
                    ? "Diagrams follow the cursor on hover"
                    : "Diagrams only open when you tap a row"
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                  hoverPreview
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-400/15 dark:text-indigo-300"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-white/5",
                )}
              >
                {hoverPreview ? (
                  <MousePointerClick className="h-4 w-4" />
                ) : (
                  <ImageOff className="h-4 w-4" />
                )}
                {hoverPreview ? "Hover previews" : "Tap only"}
              </button>
                </>
              )}

              {/* Only in the carousel, for the same reason the study deck only
                  offers it there: it is the one view showing a single card. */}
              {view === "carousel" && (
                <button
                  onClick={() => setFocusMode(true)}
                  title="One card, full screen. Escape leaves it."
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-white/5"
                >
                  <Maximize2 className="h-4 w-4" />
                  Focus
                </button>
              )}

              <button
                onClick={() => setLaser((l) => !l)}
                title="Draw on the page. Hold to draw, Esc to stop."
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                  laser
                    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-white/5",
                )}
              >
                <Highlighter className="h-4 w-4" />
                {laser ? "Laser on" : "Laser"}
              </button>

              {/* Says which view you are in, since the button no longer does,
                  then how to work it. */}
              <p className="hidden text-xs text-slate-400 lg:block dark:text-stone-500">
                <span className="font-semibold text-slate-500 dark:text-stone-400">
                  {VIEW_LABEL[view]} mode.
                </span>{" "}
                {view === "carousel"
                  ? "Arrow keys, the arrows, the dots or a drag to move · press space to turn the card you are on"
                  : view === "flip"
                    ? "Click a card to turn it over, or tab to one and press space"
                    : view === "gallery"
                      ? "Drag the ring or use the arrow keys · click a card to bring it round and open it"
                      : hoverPreview
                        ? "Hover a row for the diagram · tap to pin it"
                        : "Tap a row to open its diagram"}
              </p>

              <div className="ml-auto">
                <AnimatedThemeToggler />
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-3xl">
            <DeckAbout text={deck.about} purpose={deck.purpose} funFact={deck.funFact} />

            <DrillBanner
              active={view === "carousel" && focusMode}
              onStart={startDrilling}
              steps={REFERENCE_STEPS}
              lead="These drill best as real flashcards: one card filling the screen, arrows to move between them, space to turn one over."
            />

            {view === "table" ? (
              <HoverDeck
                groups={deck.groups}
                quizMode={quizMode}
                hoverPreview={hoverPreview}
                preview={deck.preview}
              />
            ) : view === "gallery" ? (
              <CardGallery3D items={galleryItems} label={`${deck.title} rows`} />
            ) : view === "carousel" && focusMode ? (
              // Fixed and full screen rather than raised with a z-index: this
              // page has a sticky hero, a sticky toolbar and a floating feedback
              // button, and lifting one element above all of them is a fight
              // that taking it out of flow avoids entirely.
              <div className="fixed inset-0 z-[110] flex flex-col bg-[#f6f4ef] px-4 py-5 dark:bg-[#0c0a09]">
                <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
                  <HomeBlueberry />
                  <span className="font-mono text-xs text-slate-400 dark:text-stone-500">
                    {total} rows
                  </span>
                  <button
                    onClick={() => setFocusMode(false)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-900 dark:border-stone-700 dark:text-stone-400 dark:hover:text-stone-100"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                    Exit focus
                  </button>
                </div>

                <div className="mx-auto flex w-full max-w-3xl flex-1 items-center">
                  <div className="w-full">
                    <ReferenceCards
                      groups={deck.groups}
                      preview={deck.preview}
                      layout="carousel"
                    />
                  </div>
                </div>

                <p className="text-center font-mono text-[0.7rem] text-slate-400 dark:text-stone-500">
                  arrow keys to move &middot; space to flip &middot; esc to leave
                </p>
              </div>
            ) : (
              <ReferenceCards groups={deck.groups} preview={deck.preview} layout={view} />
            )}

            <ScrollToTop className="mt-6" />

            <LaserPointer active={laser} onExit={() => setLaser(false)} />

            {/* The ticket lives on the hub and the folder pages only. At the
                foot of a deck it was an invitation to add another deck at the
                exact moment someone had finished studying this one. */}

            <footer className="mt-12 text-center text-sm text-gray-500 dark:text-stone-400">
              {deck.footNote && <p>{deck.footNote}</p>}

              <p className="playful-face mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-stone-300">
                Built from the class reference sheets. Not a substitute for drawing the arrows
                yourself.
              </p>

              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold text-indigo-600 outline-none transition-colors hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-indigo-300 dark:hover:text-indigo-200"
              >
                <GitBranch className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
                <span className="relative">
                  Check out the GitHub here
                  <span
                    aria-hidden
                    className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-brand-from to-brand-to transition-transform duration-300 ease-out group-hover:scale-x-100"
                  />
                </span>
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </a>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReferenceApp;
