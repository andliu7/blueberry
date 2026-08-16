import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CornerDownLeft, FlaskConical, Layers, LayoutGrid, Search, Sparkles, SquareArrowOutUpRight } from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { searchFeatures, type Feature } from "@/lib/featureIndex";
import { reactionFeatures } from "@/lib/reactionSearch";
import { useDecks } from "@/lib/useDecks";
import { deckHref } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * The search, doing what it says.
 *
 * It was a button that opened the dashboard on a panel that happened to contain
 * a deck filter. That is one destination, not a search: typing "rainforest" or
 * "dark mode" got you a list of flashcard decks that matched neither.
 *
 * This searches the site itself. Pages, dashboard panels, the things the timer
 * can do, and every deck, all in one list, opened from anywhere with `/` and
 * closed with Escape. Decks are folded in from `useDecks` rather than written
 * into the index, since they are published at runtime and a hand-written list
 * would be stale the first time one is added.
 */

const REACTION_FEATURES = reactionFeatures();

const KIND_ICON = {
  page: SquareArrowOutUpRight,
  panel: LayoutGrid,
  action: Sparkles,
  deck: Layers,
  reaction: FlaskConical,
} as const;

const KIND_LABEL = {
  page: "Page",
  panel: "Dashboard",
  action: "Action",
  deck: "Deck",
  reaction: "Reaction",
} as const;

/**
 * The berry arriving, and becoming the magnifying glass.
 *
 * In the bar the mark sits in the middle, on top of the search track. Opening
 * search is meant to read as that berry moving to the left-hand end and turning
 * into the magnifier — so it slides in from the right, then hands over to the
 * icon in place.
 *
 * **Both ends of the movement live in here on purpose.** The obvious
 * implementation is a `layoutId` shared with the header's mark, letting motion
 * fly the real element across. It was tried and it fails: this overlay renders
 * through a portal into a `fixed` container, so the two boxes are measured in
 * different coordinate spaces and the berry ends up scaled huge and stranded
 * mid-page. Animating within one container cannot mismeasure, and the page
 * behind is dimmed by the scrim anyway, so the berry left up in the bar reads as
 * having gone dark rather than as a duplicate.
 *
 * Reduced motion gets the magnifier, immediately and without the journey.
 */
function SearchMark() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center">
        <Search className="size-4 text-slate-400" />
      </span>
    );
  }

  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center">
      {/* The traveller. Bigger than the slot and shrinking into it, so it
          arrives rather than simply appears. */}
      <motion.span
        aria-hidden
        initial={{ x: 34, scale: 2.1, opacity: 1 }}
        animate={{ x: 0, scale: 1, opacity: 0 }}
        transition={{
          x: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
          scale: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
          // Hands over only at the end of the journey, so it is a berry for
          // most of the trip and a magnifier once it has landed.
          opacity: { duration: 0.12, delay: 0.24 },
        }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <BlueberryMark eyes className="size-full" />
      </motion.span>

      <motion.span
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16, delay: 0.26 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Search className="size-4 text-slate-400" />
      </motion.span>
    </span>
  );
}

export function FeatureSearch({
  open,
  onClose,
  onOpenDashboard,
}: {
  open: boolean;
  onClose: () => void;
  /** Panels are not routes, so the dashboard has to be asked to show one. */
  onOpenDashboard?: (view: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { decks } = useDecks();

  // Decks join the same index the features are in, so one query covers both and
  // the ranking can compare them against each other.
  const deckFeatures: Feature[] = useMemo(
    () =>
      decks.map((d) => ({
        id: `deck-${d.id}`,
        label: d.title,
        blurb: "Flashcard deck",
        kind: "deck" as const,
        href: deckHref(d),
        keywords: ["deck", "cards", "flashcards"],
      })),
    [decks],
  );

  // Reactions are generated at build time and never change, so this is built
  // once for the life of the module rather than on every keystroke.
  const extra = useMemo(() => [...REACTION_FEATURES, ...deckFeatures], [deckFeatures]);
  const results = useMemo(() => searchFeatures(query, extra), [query, extra]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    // A frame later: the input is mounted by this render but not yet painted,
    // and focusing it before then silently does nothing.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const run = (f: Feature) => {
    onClose();
    if (f.href) {
      window.location.hash = f.href.replace(/^#/, "");
      return;
    }
    if (f.event) {
      window.dispatchEvent(new CustomEvent(f.event));
      return;
    }
    if (f.view) onOpenDashboard?.(f.view);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[cursor];
      if (pick) run(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[150] flex items-start justify-center bg-slate-950/45 p-4 pt-[12vh] backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search features"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 dark:border-stone-900">
              <SearchMark />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search reactions, pages and decks…"
                aria-label="Search reactions, pages and decks"
                className="min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-stone-600"
              />
              <kbd className="hidden shrink-0 rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[0.6rem] text-slate-400 sm:block dark:border-stone-800 dark:text-stone-500">
                esc
              </kbd>
            </div>

            {results.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-stone-400">
                Nothing matches “{query}”.
              </p>
            ) : (
              <ul className="scrollbar-none max-h-[52vh] overflow-y-auto p-2">
                {results.map((f, i) => {
                  const Icon = KIND_ICON[f.kind];
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => run(f)}
                        // Hover moves the selection so the keyboard and the
                        // mouse cannot disagree about which row is chosen.
                        onMouseEnter={() => setCursor(i)}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                          i === cursor
                            ? "bg-indigo-50 dark:bg-indigo-500/15"
                            : "hover:bg-slate-50 dark:hover:bg-stone-900",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            i === cursor
                              ? "text-indigo-600 dark:text-indigo-300"
                              : "text-slate-400 dark:text-stone-500",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{f.label}</span>
                          <span className="block truncate text-xs text-slate-500 dark:text-stone-400">
                            {f.blurb}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[0.6rem] tracking-widest text-slate-400 uppercase dark:text-stone-500">
                          {KIND_LABEL[f.kind]}
                        </span>
                        {i === cursor && (
                          <CornerDownLeft className="size-3.5 shrink-0 text-indigo-500" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default FeatureSearch;
