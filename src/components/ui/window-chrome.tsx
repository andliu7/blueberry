import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { usePageFlip } from "@/components/ui/page-flip";
import { ratingTally, type RatingTally } from "@/lib/progress";
import { deckHref, type Deck } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * The top of the window, with the three lights in the corner.
 *
 * It is a frame rather than a decoration. The page below it is a document that
 * scrolls forever; this says where the document *starts*, the way the title bar
 * of a window does, and it takes the corners with it — rounded at the top,
 * square everywhere else, so the edge is exact rather than a gradient fading
 * into the browser chrome.
 *
 * It is not sticky and is not meant to be. You see it on arrival, you scroll,
 * it leaves, and the site bar underneath takes over as the thing pinned to the
 * top. Two pieces of furniture doing one job in sequence rather than both at
 * once.
 *
 * **The lights are the site's own three.** Every card gets rated red, yellow or
 * green while you study, and those ratings used to exist only inside the deck
 * that produced them. Here they are counted across everything and — this is the
 * part that makes them worth having rather than a joke about macOS — the row
 * opens, and shows you which decks the flagged cards are actually in.
 */

const LIGHTS = [
  {
    key: "red" as const,
    label: "Shaky",
    // The real macOS colours, because a near-miss on these reads as a mistake.
    dot: "#ff5f57",
    text: "text-rose-600 dark:text-rose-300",
    bar: "bg-rose-500",
  },
  {
    key: "yellow" as const,
    label: "Getting there",
    dot: "#febc2e",
    text: "text-amber-600 dark:text-amber-300",
    bar: "bg-amber-400",
  },
  {
    key: "green" as const,
    label: "Solid",
    dot: "#28c840",
    text: "text-emerald-600 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
];

type LightKey = (typeof LIGHTS)[number]["key"];

export function WindowChrome({ decks, className }: { decks: Deck[]; className?: string }) {
  const reduce = useReducedMotion();
  const flipTo = usePageFlip();
  const [open, setOpen] = useState<LightKey | null>(null);

  /**
   * Every deck's ratings, read once.
   *
   * One localStorage hit per deck, so it is done here rather than inside the
   * rows, and memoised on the list rather than recomputed whenever the panel
   * opens and closes.
   */
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

  // Only the decks that actually hold cards of the open colour, worst first.
  const rows = useMemo(() => {
    if (!open) return [];
    return perDeck
      .filter((row) => row.tally[open] > 0)
      .sort((a, b) => b.tally[open] - a.tally[open]);
  }, [open, perDeck]);

  const active = LIGHTS.find((l) => l.key === open);

  return (
    <div className={cn("relative", className)}>
      {/* The bar. Rounded at the top only: this is the top edge of a window,
          not a floating card, so the bottom has to meet the page squarely. */}
      <div className="flex h-11 items-center gap-2 rounded-t-2xl border-x border-t border-slate-200 bg-white/70 px-4 backdrop-blur dark:border-stone-800 dark:bg-stone-950/60">
        <div className="flex items-center gap-2" role="group" aria-label="Your card ratings">
          {LIGHTS.map((light) => {
            const count = total[light.key];
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
                    ? `${count} ${light.label.toLowerCase()} — click to see which decks`
                    : `No ${light.label.toLowerCase()} cards yet`
                }
                aria-label={
                  live
                    ? `${count} ${light.label} cards. Show which decks they are in.`
                    : `No ${light.label} cards yet`
                }
                className={cn(
                  "group flex items-center gap-1.5 rounded-full transition-opacity focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
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

        {/* The title, centred the way a window's is, and absolutely positioned
            so the lights on the left cannot push it off centre. */}
        <span className="pointer-events-none absolute inset-x-0 text-center font-mono text-[0.7rem] tracking-widest text-slate-400 uppercase dark:text-stone-500">
          {open && active ? `${active.label} — ${rows.length} deck${rows.length === 1 ? "" : "s"}` : "blueberry"}
        </span>
      </div>

      {/* What is behind the light. Rows rather than a number: the count says
          you have work, this says where it is. */}
      <AnimatePresence initial={false}>
        {open && active && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="overflow-hidden border-x border-slate-200 bg-white/70 backdrop-blur dark:border-stone-800 dark:bg-stone-950/60"
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
                      <span className={cn("shrink-0 font-mono text-xs tabular-nums", active.text)}>
                        {tally[active.key]}
                      </span>
                      {/* The share of this deck's rated cards wearing this
                          colour, so a deck with 4 of 6 red reads as worse than
                          one with 6 of 60. */}
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
  );
}

export default WindowChrome;
