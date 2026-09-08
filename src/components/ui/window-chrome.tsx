import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { usePageFlip } from "@/components/ui/page-flip";
import { ratingTally, type RatingTally } from "@/lib/progress";
import { deckHref, type Deck } from "@/data/types";
import { useFocusTimer } from "@/lib/useFocusTimer";
import { LIGHTS, type LightKey } from "@/components/ui/window-lights";
import { cn } from "@/lib/utils";

/**
 * The window's top edge, which becomes the site's bar.
 *
 * One object in two states rather than two objects handing over. At rest it is
 * a tab: inset from the edges, rounded at the top, carrying the three lights
 * and the site's name. As you scroll it widens to the full width, squares its
 * corners, and its contents change to the bar's — search, the dashboard, the
 * actions. Stuck, it is simply the bar.
 *
 * The morph is what makes the two read as continuous. The previous version had
 * a tab that scrolled away and a separate bar that pinned itself underneath,
 * which is honest but reads as one piece of furniture being replaced by
 * another at a seam you can see.
 *
 * **The lights are the site's own three**, not a macOS joke that happens to be
 * three circles. Every card gets rated red, yellow or green while you study,
 * and those ratings used to exist only inside the deck that produced them.
 * Here they are counted across everything, and pressing one opens the row to
 * show which decks the flagged cards are actually in.
 */

/* The three lights live in `window-lights`, shared with `system-window`. */

/** How much scroll turns the tab into the bar. */
const MORPH_DISTANCE = 140;

export function WindowChrome({
  decks,
  children,
  visible = true,
  className,
}: {
  decks: Deck[];
  /**
   * Faded in once the opening has played.
   *
   * Taken as a prop rather than handled by a wrapper outside, because a
   * wrapper is a box and this contains a `sticky` — which can only stick
   * within its parent's box. Any element put around this to fade it would be
   * as tall as the bar itself and the bar would scroll away inside it.
   */
  visible?: boolean;
  /** The bar's own contents, revealed as the tab widens into it. */
  children?: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const flipTo = usePageFlip();
  const [open, setOpen] = useState<LightKey | null>(null);

  /**
   * Ticked-off tasks count toward the green light.
   *
   * The lights were only ever about card ratings, which meant a session spent
   * reading a lesson or working through a task list registered as nothing at
   * all. A finished task is a thing you finished; it belongs in the same number
   * as a card you marked solid.
   */
  const { tasksDone } = useFocusTimer();

  /**
   * 0 while the tab is at rest, 1 once it has become the bar.
   *
   * A plain scroll listener, which is what the rest of this codebase uses and
   * what demonstrably works here — `site-header` has driven its own background
   * off one for months. Held in state rather than a motion value because the
   * contents genuinely swap at the ends, which is a render rather than a style.
   */
  const anchorRef = useRef<HTMLDivElement>(null);
  const [morph, setMorph] = useState(0);

  useEffect(() => {
    if (reduce) {
      setMorph(1);
      return;
    }
    const read = () => {
      const el = anchorRef.current;
      if (!el) return;
      // How far past its resting place the tab has been pushed. `top` goes
      // negative as the anchor leaves; the sticky child stays put.
      const past = -el.getBoundingClientRect().top;
      setMorph(Math.min(1, Math.max(0, past / MORPH_DISTANCE)));
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read, { passive: true });
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [reduce]);

  const perDeck = useMemo(
    () => decks.map((deck) => ({ deck, tally: ratingTally(deck.id) })),
    [decks],
  );

  const total = useMemo(
    () =>
      perDeck.reduce<RatingTally>(
        (acc, row) => ({
          red: acc.red + row.tally.red,
          yellow: acc.yellow + row.tally.yellow,
          green: acc.green + row.tally.green,
        }),
        { red: 0, yellow: 0, green: 0 },
      ),
    [perDeck],
  );

  const counts = useMemo(
    () => ({ ...total, green: total.green + tasksDone }),
    [total, tasksDone],
  );

  const rows = useMemo(() => {
    if (!open) return [];
    return perDeck.filter((r) => r.tally[open] > 0).sort((a, b) => b.tally[open] - a.tally[open]);
  }, [open, perDeck]);

  const active = LIGHTS.find((l) => l.key === open);

  return (
    /**
     * The marker and the bar are siblings, not parent and child.
     *
     * They were nested, with the sticky bar inside a zero-height anchor, and
     * the bar vanished the moment you scrolled past the hero. A sticky element
     * can only stick *within its parent's box*: given a parent zero pixels
     * tall, there is nowhere to stick to and it simply leaves with the scroll.
     * As siblings the bar's parent is the page itself, which is as tall as the
     * document, so it pins for the whole of it.
     */
    <>
      <div ref={anchorRef} aria-hidden className={cn("h-0", className)} />
      <div
        className="sticky top-0 z-40 transition-opacity duration-500"
        style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? undefined : "none" }}
      >
        <div
          className="mx-auto transition-none"
          style={{
            // Widens toward the edges but never reaches them. It stays a bar
            // floating on the page rather than becoming a slab welded to the
            // top of it — which is the difference between one line and a block.
            maxWidth: `calc(64rem + (100vw - 64rem - 3rem) * ${morph})`,
            paddingLeft: `${1.5 - 0.75 * morph}rem`,
            paddingRight: `${1.5 - 0.75 * morph}rem`,
            paddingTop: `${0.5 * morph}rem`,
          }}
        >
          <div
            className={cn(
              // Bordered on all four sides and rounded on all four corners,
              // whatever the morph is doing. It was a tab — open at the bottom,
              // square once expanded — which made the widened state read as the
              // page growing a header slab. Keeping it closed and rounded keeps
              // it a single line that happens to get longer.
              "flex h-12 items-center gap-3 rounded-2xl border px-4 backdrop-blur",
              "border-slate-200 bg-white/75 shadow-sm dark:border-stone-800 dark:bg-stone-950/70",
            )}
          >
            <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Your card ratings">
              {LIGHTS.map((light) => {
                const count = counts[light.key];
                const live = count > 0;
                const isOpen = open === light.key;
                return (
                  <button
                    key={light.key}
                    type="button"
                    disabled={!live}
                    onClick={() => setOpen(isOpen ? null : light.key)}
                    aria-expanded={isOpen}
                    title={
                      live
                        ? `${count} ${light.label.toLowerCase()}. Click to see which decks`
                        : `No ${light.label.toLowerCase()} cards yet`
                    }
                    aria-label={
                      live
                        ? `${count} ${light.label} cards. Show which decks they are in.`
                        : `No ${light.label} cards yet`
                    }
                    className={cn(
                      "group flex items-center gap-1.5 rounded-full focus-visible:ring-2 focus-visible:outline-none",
                      live ? "cursor-pointer" : "cursor-default opacity-40",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-3 rounded-full ring-1 ring-black/10 transition-transform",
                        live && "group-hover:scale-110",
                        isOpen && "scale-110",
                      )}
                      style={{ backgroundColor: light.dot }}
                    />
                    <span
                      className={cn(
                        "font-mono text-[0.7rem] tabular-nums",
                        live ? light.text : "text-slate-400 dark:text-stone-600",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* One row, always present and always clickable.

                The name used to sit here at rest and cross-fade into the bar's
                controls as the tab widened, with the controls held at
                `pointer-events-none` until the morph finished. That made the
                mark, the search and the actions unreachable for the whole of
                the hero — which is most of the time anyone spends on this page.
                A bar you cannot press is a picture of a bar.

                So the contents never change. The shape does: a rounded tab
                inset from the edges at rest, a square full-width bar once
                stuck, and the lights ride along in the same row throughout
                rather than being a separate thing that hands over. */}
            <div className="min-w-0 flex-1">{children}</div>
          </div>

          {/* What is behind the light. Rows rather than a number: the count
              says you have work, this says where it is. */}
          <AnimatePresence initial={false}>
            {open && active && (
              <motion.div
                initial={reduce ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduce ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white/75 backdrop-blur dark:border-stone-800 dark:bg-stone-950/70"
              >
                <ul className="divide-y divide-slate-100 dark:divide-stone-900">
                  {rows.map(({ deck, tally }) => {
                    const rated = tally.red + tally.yellow + tally.green;
                    const share = rated > 0 ? Math.round((tally[active.key] / rated) * 100) : 0;
                    return (
                      <li key={deck.id}>
                        <button
                          type="button"
                          onClick={() => flipTo(deckHref(deck))}
                          className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-stone-900"
                        >
                          <span className="min-w-0 flex-1 truncate">{deck.title}</span>
                          <span
                            className={cn("shrink-0 font-mono text-xs tabular-nums", active.text)}
                          >
                            {tally[active.key]}
                          </span>
                          {/* This deck's share of the colour, so 4 of 6 red
                              reads as worse than 6 of 60. */}
                          <span
                            aria-hidden
                            className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-slate-200 sm:block dark:bg-stone-800"
                          >
                            <span
                              className={cn("block h-full rounded-full", active.bar)}
                              style={{ width: `${share}%` }}
                            />
                          </span>
                          <ChevronDown className="size-3.5 shrink-0 -rotate-90 text-slate-400" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

export default WindowChrome;
