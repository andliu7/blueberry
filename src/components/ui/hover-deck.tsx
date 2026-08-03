import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Eye } from "lucide-react";
import type { DeckGroup } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * A reference deck: rows you scan down, with the diagram from the class handout
 * appearing on hover.
 *
 * The preview is one fixed panel that cross-fades between images rather than a
 * panel per row. Every image is mounted once and toggled by opacity, so the
 * browser has already decoded them by the time you hover and the diagram
 * appears instantly instead of popping in a frame late.
 *
 * Hover alone would strand phones, where there is no hover and quiz mode would
 * blur every answer permanently. So tapping a row pins it: the badge unblurs and
 * the diagram opens inline underneath, which also gives desktop a way to keep an
 * image up while looking away from it.
 */

const cardSrc = (name: string) => `${import.meta.env.BASE_URL}cards/${name}.png`;

const PREVIEW_W = 380;
const PREVIEW_H = 250;

export function HoverDeck({
  groups,
  quizMode,
  hoverPreview = true,
}: {
  groups: DeckGroup[];
  quizMode: boolean;
  /**
   * Whether hovering a row floats its diagram next to the cursor. Turning it
   * off leaves the rows readable and still lets a tap pin the image inline,
   * which is what you want when scanning the whole ladder rather than looking
   * one thing up.
   */
  hoverPreview?: boolean;
}) {
  const flat = groups.flatMap((g) => g.items);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [smoothPosition, setSmoothPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // The preview trails the cursor rather than snapping to it: a hard-attached
  // panel reads as a tooltip, and the lag is what makes it feel like a card
  // being carried.
  useEffect(() => {
    const lerp = (start: number, end: number, factor: number) =>
      start + (end - start) * factor;

    const animate = () => {
      setSmoothPosition((prev) => ({
        x: lerp(prev.x, mousePosition.x, 0.18),
        y: lerp(prev.y, mousePosition.y, 0.18),
      }));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [mousePosition]);

  // Turning the option off mid-hover has to retract a preview that is already
  // on screen, not just stop the next one appearing.
  useEffect(() => {
    if (!hoverPreview) setIsVisible(false);
  }, [hoverPreview]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const enter = (index: number) => {
    setHoveredIndex(index);
    setIsVisible(hoverPreview && Boolean(flat[index]?.image));
  };

  const leave = () => {
    setHoveredIndex(null);
    setIsVisible(false);
  };

  // Keep the preview on screen: flip it to the left of the cursor near the
  // right edge, rather than letting it hang off into a scrollbar.
  const rect = containerRef.current?.getBoundingClientRect();
  const flip =
    rect !== undefined && rect.left + smoothPosition.x + PREVIEW_W + 40 > window.innerWidth;

  let running = 0;

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative mx-auto w-full max-w-2xl px-1 pb-8"
    >
      {/* Floating preview. Hidden below `sm`, where it would cover most of the
          screen and there is no cursor to anchor it to; small screens get the
          inline image from tapping a row instead. */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-50 hidden overflow-hidden rounded-xl border border-slate-200 shadow-2xl sm:block dark:border-stone-700"
        style={{
          left: rect?.left ?? 0,
          top: rect?.top ?? 0,
          transform: `translate3d(${smoothPosition.x + (flip ? -PREVIEW_W - 28 : 24)}px, ${smoothPosition.y - 120}px, 0)`,
          opacity: isVisible ? 1 : 0,
          scale: isVisible ? 1 : 0.9,
          transition:
            "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), scale 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* White in both themes on purpose: these are scans of printed handouts
            with white backgrounds, so a dark panel would just frame a white
            rectangle. */}
        <div
          className="relative overflow-hidden rounded-xl bg-white"
          style={{ width: PREVIEW_W, height: PREVIEW_H }}
        >
          {flat.map(
            (item, index) =>
              item.image && (
                <img
                  key={`${item.title}-${index}`}
                  src={cardSrc(item.image)}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-contain p-3 transition-all duration-300 ease-out"
                  style={{
                    opacity: hoveredIndex === index ? 1 : 0,
                    scale: hoveredIndex === index ? 1 : 1.06,
                    filter: hoveredIndex === index ? "none" : "blur(8px)",
                  }}
                />
              ),
          )}
        </div>
      </div>

      {groups.map((group, gi) => {
        const start = running;
        running += group.items.length;
        return (
          <div key={gi} className="mb-2">
            {group.heading && (
              <h2 className="mt-10 mb-3 text-xs font-semibold tracking-[0.14em] text-indigo-600 uppercase dark:text-indigo-300">
                {group.heading}
              </h2>
            )}
            <div>
              {group.items.map((item, i) => {
                const index = start + i;
                const pinned = pinnedIndex === index;
                const active = hoveredIndex === index || pinned;
                return (
                  <div
                    key={item.title + index}
                    className="group-row block"
                    onMouseEnter={() => enter(index)}
                    onMouseLeave={leave}
                  >
                    <button
                      type="button"
                      onClick={() => setPinnedIndex(pinned ? null : index)}
                      aria-expanded={pinned}
                      className="relative w-full cursor-pointer border-t border-slate-200 py-4 text-left transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-stone-800"
                    >
                      <div
                        className={cn(
                          "absolute inset-0 -mx-3 rounded-lg bg-indigo-50 px-3 transition-all duration-300 ease-out dark:bg-indigo-400/10",
                          active ? "scale-100 opacity-100" : "scale-95 opacity-0",
                        )}
                      />
                      <div className="relative flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="inline-flex items-center gap-2">
                            <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-stone-100">
                              <span className="relative">
                                {item.title}
                                <span
                                  className={cn(
                                    "absolute left-0 -bottom-0.5 h-px bg-indigo-500 transition-all duration-300 ease-out",
                                    active ? "w-full" : "w-0",
                                  )}
                                />
                              </span>
                            </h3>
                            {item.image && (
                              <Eye
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 text-indigo-500 transition-all duration-300 ease-out dark:text-indigo-400",
                                  active ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
                                )}
                              />
                            )}
                          </div>
                          <p
                            className={cn(
                              "mt-0.5 text-sm leading-relaxed transition-colors duration-300",
                              active
                                ? "text-slate-700 dark:text-stone-300"
                                : "text-slate-500 dark:text-stone-400",
                            )}
                          >
                            {item.description}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "answer-hidden pt-0.5 font-mono text-sm tabular-nums transition-colors duration-300",
                            // `whitespace-nowrap` would push the widest badges
                            // off a narrow screen, so they wrap instead and the
                            // column is capped rather than unbounded.
                            "max-w-[9rem] text-right",
                            active
                              ? "text-indigo-600 dark:text-indigo-300"
                              : "text-slate-500 dark:text-stone-400",
                            (!quizMode || pinned) && "revealed",
                          )}
                        >
                          {item.badge}
                        </span>
                      </div>

                      {/* Inline diagram for the pinned row. This is what makes
                          the deck usable on a phone, where the floating preview
                          never appears. */}
                      {pinned && item.image && (
                        <div className="relative mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-stone-700">
                          <img
                            src={cardSrc(item.image)}
                            alt={item.title}
                            className="max-h-[320px] w-full object-contain p-3"
                          />
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
              <div className="border-t border-slate-200 dark:border-stone-800" />
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default HoverDeck;
