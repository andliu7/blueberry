import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { MathHtml } from "@/components/ui/math-html";
import { cn } from "@/lib/utils";

/**
 * A deck as a ring of cards you spin, for decks short enough to see at once.
 *
 * Adapted from the supplied 3D gallery, rebuilt on CSS transforms rather than
 * three.js. What changed and why:
 *
 * 1. **No three, fiber or drei.** Roughly 600 kB for a decorative view, on a
 *    site whose main bundle had just been cut from 756 kB to 545 kB. A ring of
 *    twelve cards is `rotateY` and `translateZ`, which CSS does natively.
 * 2. **The cards are real DOM.** The original painted them through drei's
 *    `<Html>`, which means text you cannot select, links that are not links and
 *    nothing a screen reader can reach. Here a card is a button containing a
 *    heading, so Tab lands on it and Enter opens it.
 * 3. **No starfield and no `Environment` preset.** The preset fetches an HDR
 *    file from pmndrs' CDN at runtime, which makes the page depend on a third
 *    party asset host to finish rendering.
 * 4. **It handles text.** The original assumed every card is an image. Most
 *    decks here are question and answer prose, so a card falls back to its text
 *    when there is no diagram.
 *
 * The look is the one thing genuinely given up: this is a rotating ring, not a
 * spherical galaxy in a starfield. A sphere needs per-card depth sorting that
 * CSS cannot do reliably once cards overlap.
 */

export interface GalleryItem {
  id: string;
  /** Shown on the face of the card. */
  title: string;
  /** Revealed when the card is opened. HTML, run through MathHtml. */
  body?: string;
  /** Resolved image URL, when the card has a diagram. */
  image?: string;
  /** Short value shown alongside the title, e.g. a pKa. */
  badge?: string;
}

/** Above this many cards the ring is too crowded to read; the deck keeps its list. */
export const GALLERY_MAX = 15;

export function CardGallery3D({
  items,
  className,
  label = "Card gallery",
}: {
  items: GalleryItem[];
  className?: string;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const [angle, setAngle] = useState(0);
  const [open, setOpen] = useState<GalleryItem | null>(null);
  const drag = useRef<{ x: number; from: number } | null>(null);
  const ring = useRef<HTMLDivElement>(null);

  const count = Math.max(items.length, 1);
  const step = 360 / count;

  /**
   * How far back the cards sit so neighbours just clear each other.
   *
   * `(w / 2) / tan(pi / n)` is the circumradius of a regular n-gon with side w.
   * The floor matters at small counts: with three cards the formula gives a
   * radius smaller than the card itself, and the ring turns inside out.
   */
  const radius = Math.max(240, Math.round(200 / Math.tan(Math.PI / Math.max(count, 3))));

  const spin = useCallback((by: number) => setAngle((a) => a + by), []);

  // Arrow keys drive the ring whenever it holds focus, so this is usable
  // without a pointer at all, which is the thing the three.js original had no
  // path to.
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      spin(step);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      spin(-step);
    }
  };

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ring}
        role="group"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, from: angle };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          // A third of a degree per pixel: a full turn is about a screen width
          // of travel, which is the rate that reads as pushing the ring rather
          // than flinging it.
          setAngle(drag.current.from + (e.clientX - drag.current.x) * 0.35);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        className="relative mx-auto h-[22rem] w-full cursor-grab touch-pan-y select-none outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-indigo-400"
        style={{ perspective: "1100px" }}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(-${radius}px) rotateY(${angle}deg)`,
            transition: reduce ? undefined : "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {items.map((item, i) => {
            // How square-on this card is, 1 at the front and 0 at the back.
            // Everything below reads off it, so the ring dims and shrinks with
            // depth instead of every card competing at once.
            const facing = Math.cos((((i * step + angle) % 360) * Math.PI) / 180);
            const front = (facing + 1) / 2;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  // Bring it round to the front first, so opening a card at the
                  // back does not feel like it came from nowhere.
                  setAngle(-i * step);
                  setOpen(item);
                }}
                className="absolute top-1/2 left-1/2 h-72 w-52 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-stone-700 dark:bg-stone-900"
                style={{
                  transform: `rotateY(${i * step}deg) translateZ(${radius}px)`,
                  opacity: 0.35 + front * 0.65,
                  // Cards at the back must not swallow clicks aimed at the front.
                  pointerEvents: facing > 0.1 ? "auto" : "none",
                  zIndex: Math.round(front * 100),
                  // Past 90 degrees you are looking at the back of a card, and a
                  // rotated DOM node shows its own content mirrored: the far
                  // side of the ring was a row of cards with the text reversed.
                  // Hiding the backs leaves a readable arc instead.
                  backfaceVisibility: "hidden",
                }}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    className="h-40 w-full rounded-lg bg-white object-contain"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-lg bg-slate-50 px-2 text-center dark:bg-stone-950">
                    <span className="font-mono text-[0.65rem] tracking-wider text-slate-400 uppercase dark:text-stone-500">
                      Card {i + 1}
                    </span>
                  </div>
                )}

                <p className="mt-2 line-clamp-3 text-sm leading-snug font-semibold text-slate-800 dark:text-stone-100">
                  {item.title}
                </p>
                {item.badge && (
                  <p className="mt-1 font-mono text-xs text-indigo-600 dark:text-indigo-300">
                    {item.badge}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          onClick={() => spin(step)}
          aria-label="Previous card"
          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-900 dark:border-stone-700 dark:text-stone-400 dark:hover:text-stone-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-mono text-xs text-slate-400 dark:text-stone-500">
          drag, or use the arrow keys
        </p>
        <button
          onClick={() => spin(-step)}
          aria-label="Next card"
          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-900 dark:border-stone-700 dark:text-stone-400 dark:hover:text-stone-100"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* The detail view. Not portaled: the gallery already sits in the deck's
          own reading column, and there is no transformed ancestor to escape. */}
      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm dark:bg-black/75"
          onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={open.title}
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-900"
          >
            <button
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute top-3 right-3 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-stone-100"
            >
              <X className="h-4 w-4" />
            </button>

            {open.image && (
              <img
                src={open.image}
                alt=""
                className="mb-4 max-h-64 w-full rounded-lg bg-white object-contain"
              />
            )}
            <MathHtml
              html={open.title}
              className="pr-6 text-lg leading-snug font-bold text-slate-900 dark:text-stone-100"
            />
            {open.badge && (
              <p className="mt-1 font-mono text-sm text-indigo-600 dark:text-indigo-300">
                {open.badge}
              </p>
            )}
            {open.body && (
              <MathHtml
                html={open.body}
                className="mt-3 leading-relaxed text-slate-700 dark:text-stone-300"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CardGallery3D;
