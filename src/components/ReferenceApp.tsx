import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, MousePointerClick, ImageOff, Highlighter, List, RefreshCw, GalleryHorizontalEnd, Orbit, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SITE_CONTAINER } from "@/components/ui/site-nav";
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

/** A boolean setting remembered on this device. Storage can be blocked, so it falls back to the default. */
function useStoredToggle(key: string, initial: boolean) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : saved === "1";
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // Private window or blocked storage: the setting just lasts this visit.
    }
  }, [key, value]);
  return [value, setValue] as const;
}

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
  // Both off by default (owner, 15 Oct: "it's too much"); each is its own setting.
  const [hoverPreview, setHoverPreview] = useStoredToggle("reference.hoverPreview", false);
  const [magnifier, setMagnifier] = useStoredToggle("reference.magnifier", false);
  // The lens is configured per deck; the setting decides whether that config is used.
  const previewOpts = magnifier ? deck.preview : deck.preview && { ...deck.preview, magnify: undefined };
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
      <div className="relative z-10 bg-background pb-16">
        <div className={SITE_CONTAINER}>
          {/* The shared page header (shell round 3), in place of the full-screen
              title page. Same as a study deck's: up one level, to the library, and the
              deck's sentence-case `title`, not its ALL CAPS title-screen lines. */}
          <PageHeader
            back={{ href: "#/study-decks", label: "Review" }}
            title={deck.title}
            subtitle={deck.subtitle}
          />
          {/* 12px under the site header (60px), which covered it at top-3. */}
          <div className="sticky top-[4.5rem] z-30 mb-6 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2.5 shadow-lg backdrop-blur dark:border-stone-800 dark:bg-stone-900/85">
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
                    ? "border-[#ccd5ea] bg-[#f1f4fa] text-[#472ab4] dark:border-[#6b51dd]/30 dark:bg-[#9989e2]/15 dark:text-[#bbb1eb]"
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
                    ? "border-[#ccd5ea] bg-[#f1f4fa] text-[#472ab4] dark:border-[#6b51dd]/30 dark:bg-[#9989e2]/15 dark:text-[#bbb1eb]"
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

              {/* Only decks that configure a lens (IR, NMR) get the toggle. */}
              {deck.preview?.magnify && (
                <button
                  onClick={() => setMagnifier((m) => !m)}
                  title={magnifier ? "Magnifying glass on over diagrams" : "Magnifying glass off"}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                    magnifier
                      ? "border-[#ccd5ea] bg-[#f1f4fa] text-[#472ab4] dark:border-[#6b51dd]/30 dark:bg-[#9989e2]/15 dark:text-[#bbb1eb]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-white/5",
                  )}
                >
                  {magnifier ? <ZoomIn className="h-4 w-4" /> : <ZoomOut className="h-4 w-4" />}
                  {magnifier ? "Magnifier on" : "Magnifier off"}
                </button>
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
                preview={previewOpts}
              />
            ) : view === "gallery" ? (
              <CardGallery3D items={galleryItems} label={`${deck.title} rows`} />
            ) : view === "carousel" && focusMode ? (
              // Fixed and full screen rather than raised with a z-index: this
              // page has a sticky hero, a sticky toolbar and a floating feedback
              // button, and lifting one element above all of them is a fight
              // that taking it out of flow avoids entirely.
              <div className="fixed inset-0 z-[110] flex flex-col bg-background px-4 py-5">
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
                      preview={previewOpts}
                      layout="carousel"
                    />
                  </div>
                </div>

                <p className="text-center font-mono text-[0.7rem] text-slate-400 dark:text-stone-500">
                  arrow keys to move &middot; space to flip &middot; esc to leave
                </p>
              </div>
            ) : (
              <ReferenceCards groups={deck.groups} preview={previewOpts} layout={view} />
            )}

            <ScrollToTop className="mt-6" />

            <LaserPointer active={laser} onExit={() => setLaser(false)} />

            {/* The ticket lives on the hub and the folder pages only. At the
                foot of a deck it was an invitation to add another deck at the
                exact moment someone had finished studying this one. */}

            {/* The sheet's sign-off, as the last of the page's content (shell round 6). It was a
                second <footer> above the site footer, with a GitHub link the site footer's
                "Source" already gives. */}
            <div className="mt-12 text-center text-sm text-slate-500 dark:text-stone-400">
              {deck.footNote && <p>{deck.footNote}</p>}

              <p className="playful-face mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-stone-300">
                Built from the class reference sheets. Not a substitute for drawing the arrows
                yourself.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReferenceApp;
