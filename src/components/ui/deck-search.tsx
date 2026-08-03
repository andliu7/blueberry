import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, FileText, Layers, Rows3 } from "lucide-react";
import { deckHref, type Deck } from "@/data/types";
import { searchDecks, type SearchHit } from "@/lib/searchDecks";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  deck: <Layers className="h-3.5 w-3.5" />,
  question: <FileText className="h-3.5 w-3.5" />,
  row: <Rows3 className="h-3.5 w-3.5" />,
} as const;

/**
 * Hub search. Reports matches upward so the deck grid can filter itself, and
 * lists the individual questions and rows that matched underneath, because
 * knowing *which* card mentions a phenoxide is more useful than knowing the
 * deck does.
 */
export function DeckSearch({
  decks,
  onResults,
}: {
  decks: Deck[];
  onResults: (hits: SearchHit[] | null) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => searchDecks(decks, query), [decks, query]);
  const active = query.trim().length >= 2;

  // Reporting during render would set state on the parent mid-render, so the
  // handoff waits for the effect.
  useEffect(() => {
    onResults(active ? hits : null);
  }, [active, hits, onResults]);

  // `/` to focus, the convention everywhere else that has a search box. Ignored
  // while typing into something, or it would be impossible to type a slash.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && typing) {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="mb-10">
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search every deck…  (press /)"
          aria-label="Search decks"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:placeholder:text-stone-500"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:text-slate-700 dark:text-stone-500 dark:hover:text-stone-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {active && (
        <div className="mt-4 max-w-xl">
          {hits.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-stone-400">
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            <>
              <p className="mb-2 font-mono text-xs text-slate-400 dark:text-stone-500">
                {hits.length} match{hits.length === 1 ? "" : "es"}
              </p>
              <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
                {hits.map((hit, i) => (
                  <li key={`${hit.deck.id}-${hit.kind}-${i}`}>
                    <a
                      href={deckHref(hit.deck)}
                      className="block px-4 py-3 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-400/10"
                    >
                      <div className="flex items-center gap-1.5 font-mono text-[0.65rem] text-indigo-600 dark:text-indigo-300">
                        {KIND_ICON[hit.kind]}
                        {hit.deck.short ?? hit.deck.title}
                      </div>
                      <p
                        className={cn(
                          "mt-0.5 text-sm font-semibold text-slate-800 dark:text-stone-100",
                          "line-clamp-2",
                        )}
                      >
                        {hit.title}
                      </p>
                      <p className="line-clamp-1 text-xs text-slate-500 dark:text-stone-400">
                        {hit.detail}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default DeckSearch;
