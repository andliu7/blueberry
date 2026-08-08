import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cardArt } from "@/data/testimonialArt";
import { deckCount, deckHref, isReference, type Deck } from "@/data/types";
import { reviewedCount } from "@/lib/progress";
import { cn } from "@/lib/utils";

/**
 * A deck, previewed before you commit to it, zooming out of the card you clicked.
 *
 * Adapted from a supplied `ImageLightbox` rather than pasted. The animation is the
 * part worth keeping: it measures the card you clicked, starts the panel scaled
 * and translated to sit exactly on top of it, then releases to centre, so the
 * panel visibly *is* the card you picked rather than something new appearing over
 * it.
 *
 * What changed is what it is for. The original showed a photograph and had a
 * "View" button wired to nothing, which is the wrong shape here twice over: a
 * deck's artwork is a generated gradient rather than a picture worth enlarging,
 * and the thing you actually want before opening a deck is what is in it. So the
 * panel shows the blurb, the card count and how far through it you already are,
 * and the button is the real link into the deck.
 *
 * **Portalled to `document.body`, and that is not optional.** Every folder card on
 * the hub sits inside `TiltCard`, which applies a `perspective(...) rotateX(...)`
 * transform. A transformed ancestor becomes the containing block for `position:
 * fixed`, so rendered in place this would open centred on a 280px folder tile
 * instead of on the screen. Three components here already portal for their own
 * reasons; see `SiteActions`, `cursor-hint` and `particle-button`.
 */

/** Matches the close transition below, so the unmount waits for the animation. */
const CLOSE_MS = 400;

export function DeckPreviewLightbox({
  decks,
  currentIndex,
  isOpen,
  onClose,
  sourceRect,
  onCloseComplete,
  onNavigate,
}: {
  decks: Deck[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  /** Where the clicked card was, so the panel can grow out of it. */
  sourceRect: DOMRect | null;
  onCloseComplete?: () => void;
  onNavigate: (index: number) => void;
}) {
  const [phase, setPhase] = useState<"initial" | "settled">("initial");
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const deck = decks[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < decks.length - 1;

  /**
   * Closing tells the parent only once the animation is over.
   *
   * The original called `onClose()` immediately *and* set a timer. The parent
   * clears `sourceRect` on that first call, so the geometry driving the close was
   * pulled out from under it while it was still running and the panel jumped.
   */
  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setClosing(false);
      setMounted(false);
      setPhase("initial");
      onClose();
      onCloseComplete?.();
    }, CLOSE_MS);
  }, [closing, onClose, onCloseComplete]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  const next = useCallback(() => {
    if (currentIndex < decks.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, decks.length, onNavigate]);

  const prev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  // Escape closes, arrows step, and the page behind must not scroll.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, handleClose, next, prev]);

  /**
   * Two frames between mounting at the card's position and releasing to centre.
   *
   * One is not enough: the browser has to have painted the start state before the
   * transition has anything to animate from, and a single rAF still lands in the
   * same frame as the mount.
   */
  useLayoutEffect(() => {
    if (!isOpen || !sourceRect) return;
    setMounted(true);
    setPhase("initial");
    setClosing(false);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPhase("settled")),
    );
    return () => cancelAnimationFrame(raf);
  }, [isOpen, sourceRect]);

  if (!mounted || !deck) return null;

  /** The transform that puts the centred panel back on top of the clicked card. */
  const fromCard = (): React.CSSProperties => {
    if (!sourceRect) return {};
    const w = Math.min(560, window.innerWidth - 48);
    const h = Math.min(window.innerHeight * 0.8, 620);
    const targetX = (window.innerWidth - w) / 2;
    const targetY = (window.innerHeight - h) / 2;
    const scale = Math.max(sourceRect.width / w, sourceRect.height / h);
    const dx = sourceRect.left + sourceRect.width / 2 - (targetX + w / 2);
    const dy = sourceRect.top + sourceRect.height / 2 - (targetY + h / 2);
    return { transform: `translate(${dx}px, ${dy}px) scale(${scale})` };
  };

  const opening = phase === "initial" && !closing;
  const settled = phase === "settled" && !closing;
  const reviewed = isReference(deck) ? 0 : reviewedCount(deck.id);
  const total = deckCount(deck);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8"
      onClick={handleClose}
      style={{ opacity: closing ? 0 : 1, transition: `opacity ${CLOSE_MS}ms cubic-bezier(0.16,1,0.3,1)` }}
      role="dialog"
      aria-modal="true"
      aria-label={`${deck.title} preview`}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl dark:bg-black/60"
        style={{ opacity: opening ? 0 : 1, transition: `opacity ${CLOSE_MS}ms cubic-bezier(0.16,1,0.3,1)` }}
      />

      <IconButton
        label="Close"
        className="top-5 right-5"
        show={settled}
        offset="translateY(-10px)"
        onClick={handleClose}
      >
        <X className="h-4 w-4" strokeWidth={2.5} />
      </IconButton>

      <IconButton
        label="Previous deck"
        className="left-4 md:left-8"
        show={settled && hasPrev}
        offset="translateX(-20px)"
        onClick={prev}
        big
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      </IconButton>

      <IconButton
        label="Next deck"
        className="right-4 md:right-8"
        show={settled && hasNext}
        offset="translateX(20px)"
        onClick={next}
        big
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
      </IconButton>

      <div
        className="relative z-10 w-full max-w-[35rem]"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...(opening ? fromCard() : { transform: "translate(0,0) scale(1)" }),
          ...(closing ? { transform: "translate(0,0) scale(0.95)" } : null),
          transition: opening
            ? "none"
            : `transform ${CLOSE_MS}ms cubic-bezier(0.16,1,0.3,1), opacity ${CLOSE_MS}ms ease-out`,
          transformOrigin: "center center",
        }}
      >
        <div
          className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-stone-900 dark:ring-stone-700"
          style={{
            borderRadius: opening ? "0.5rem" : "1rem",
            transition: "border-radius 500ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* The deck's own artwork, on its own gradient. Cropped rather than
              letterboxed: it is a wash and a motif, so the middle of it is as
              good as all of it. */}
          <div
            className="h-40 w-full bg-cover bg-center"
            style={{
              backgroundImage: `url("${cardArt(deck.motif, deck.from, deck.to)}")`,
            }}
          />

          <div
            className="border-t border-slate-200 px-6 py-5 dark:border-stone-700"
            style={{
              opacity: settled ? 1 : 0,
              transform: settled ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 300ms ease-out 100ms, transform 300ms ease-out 100ms",
            }}
          >
            <h2 className="title-face text-xl leading-tight text-slate-900 dark:text-stone-100">
              {deck.title}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500 dark:text-stone-400">
              {deck.blurb}
            </p>

            {/* Same bar as the hub's deck cards, so a deck reads the same way
                wherever you meet it. Reference decks are never rated, so they
                show their size instead of a bar that could only ever be empty. */}
            {!isReference(deck) && reviewed > 0 ? (
              <div className="mt-4">
                <div className="flex items-center justify-between text-[0.7rem] font-bold text-slate-600 dark:text-stone-300">
                  <span>
                    {reviewed === total ? "Reviewed every card" : "Pick up where you left off"}
                  </span>
                  <span className="font-mono">
                    {reviewed}/{total}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-stone-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-[width] duration-500"
                    style={{ width: `${(reviewed / total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-4 font-mono text-xs text-slate-400 dark:text-stone-500">
                {total} {isReference(deck) ? "rows" : "cards"}
              </p>
            )}

            <div className="mt-5 flex items-end justify-between gap-4">
              <div className="min-w-0 text-xs text-slate-400 dark:text-stone-500">
                {decks.length > 1 && (
                  <>
                    <p>
                      <Key>&larr;</Key>
                      <Key>&rarr;</Key> to browse this folder
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {decks.map((d, i) => (
                        <button
                          key={d.id}
                          onClick={() => onNavigate(i)}
                          aria-label={d.short ?? d.title}
                          aria-current={i === currentIndex}
                          className={cn(
                            "h-2 w-2 cursor-pointer rounded-full transition-all duration-300",
                            i === currentIndex
                              ? "scale-110 bg-slate-800 dark:bg-stone-200"
                              : "bg-slate-300 hover:bg-slate-400 dark:bg-stone-600 dark:hover:bg-stone-500",
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <a
                href={deckHref(deck)}
                onClick={handleClose}
                className="group/go inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110"
              >
                {isReference(deck) ? "Open reference" : "Start studying"}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/go:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-medium text-slate-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
      {children}
    </kbd>
  );
}

/**
 * The three floating controls, which differ only in where they sit and which way
 * they arrive from. They fade in after the panel has landed rather than riding it
 * in, so the thing that moves is the panel and not five things at once.
 */
function IconButton({
  children,
  label,
  className,
  show,
  offset,
  onClick,
  big,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  show: boolean;
  /** Where it sits before it arrives. */
  offset: string;
  onClick: () => void;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute z-50 flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-500 backdrop-blur-md transition-all duration-300 ease-out hover:bg-white hover:text-slate-900 active:scale-95 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100",
        big ? "h-12 w-12 hover:scale-110" : "h-10 w-10 hover:scale-105",
        className,
      )}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "none" : offset,
        // Hidden means unreachable, or tab lands on an arrow that is not there.
        pointerEvents: show ? "auto" : "none",
        transition: "opacity 300ms ease-out 150ms, transform 300ms ease-out 150ms",
      }}
      tabIndex={show ? 0 : -1}
    >
      {children}
    </button>
  );
}

export default DeckPreviewLightbox;
