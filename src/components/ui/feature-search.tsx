import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Layers, LayoutGrid, Search, Sparkles, SquareArrowOutUpRight } from "lucide-react";
import { searchFeatures, type Feature } from "@/lib/featureIndex";
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

const KIND_ICON = {
  page: SquareArrowOutUpRight,
  panel: LayoutGrid,
  action: Sparkles,
  deck: Layers,
} as const;

const KIND_LABEL = {
  page: "Page",
  panel: "Dashboard",
  action: "Action",
  deck: "Deck",
} as const;

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

  const results = useMemo(() => searchFeatures(query, deckFeatures), [query, deckFeatures]);

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
              <Search className="size-4 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search features, pages and decks…"
                aria-label="Search features, pages and decks"
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
