import { useState } from "react";
import { Home, Eye, EyeOff, GitBranch, ArrowUpRight, MousePointerClick, ImageOff, Highlighter } from "lucide-react";
import { HeroTitle } from "@/components/ui/hero-title";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { HoverDeck } from "@/components/ui/hover-deck";
import { DeckUploadTicket } from "@/components/DeckUploadTicket";
import { LaserPointer } from "@/components/ui/laser-pointer";
import { deckCount, type ReferenceDeck } from "@/data/types";
import { DeckAbout } from "@/components/ui/deck-about";
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
export function ReferenceApp({ deck }: { deck: ReferenceDeck }) {
  const [quizMode, setQuizMode] = useState(true);
  const [hoverPreview, setHoverPreview] = useState(true);
  const [laser, setLaser] = useState(false);
  const total = deckCount(deck);

  return (
    <div className="min-h-screen text-slate-800 dark:text-stone-200">
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

      <div className="relative z-10 rounded-t-[2rem] bg-[#f6f4ef] px-4 pt-4 pb-16 shadow-[0_-24px_60px_-20px_rgba(15,23,42,0.25)] dark:bg-[#0c0a09] dark:shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.7)]">
        <div className="mx-auto max-w-5xl">
          <div className="sticky top-3 z-30 mb-6 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2.5 shadow-lg backdrop-blur dark:border-stone-800 dark:bg-stone-900/85">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium dark:border-stone-800 dark:bg-stone-900">
                <span className="font-mono text-xs text-slate-400 dark:text-stone-500">
                  {total} rows
                </span>
              </div>

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

              <p className="hidden text-xs text-slate-400 lg:block dark:text-stone-500">
                {hoverPreview ? "Hover a row for the diagram · tap to pin it" : "Tap a row to open its diagram"}
              </p>

              <div className="ml-auto">
                <AnimatedThemeToggler />
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-3xl">
            <DeckAbout text={deck.about} />

            <HoverDeck
              groups={deck.groups}
              quizMode={quizMode}
              hoverPreview={hoverPreview}
              preview={deck.preview}
            />

            <ScrollToTop className="mt-6" />

            <LaserPointer active={laser} onExit={() => setLaser(false)} />

            <DeckUploadTicket />

            <footer className="mt-12 text-center text-sm text-gray-500 dark:text-stone-400">
              {deck.footNote && <p>{deck.footNote}</p>}

              <p className="playful-face mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-stone-300">
                Built from the class reference sheets. Not a substitute for drawing the arrows
                yourself.
              </p>

              <a
                href="https://github.com/andliu7/grignard_LCTA"
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold text-indigo-600 outline-none transition-colors hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-indigo-300 dark:hover:text-indigo-200"
              >
                <GitBranch className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
                <span className="relative">
                  Check out the GitHub here
                  <span
                    aria-hidden
                    className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-transform duration-300 ease-out group-hover:scale-x-100"
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
