import { useEffect, useRef } from "react";
import { Search, X, FileText, Folder, Layers, Rows3 } from "lucide-react";
import { type SearchHit } from "@/lib/searchDecks";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  folder: <Folder className="h-3.5 w-3.5" />,
  deck: <Layers className="h-3.5 w-3.5" />,
  question: <FileText className="h-3.5 w-3.5" />,
  row: <Rows3 className="h-3.5 w-3.5" />,
} as const;

/**
 * Hub search, in the page.
 *
 * **Controlled, and it no longer does the searching.** It used to hold the query
 * itself, run `searchDecks` internally and report matches back up through a
 * callback fired from an effect. That was fine while there was one box, and
 * impossible once the sticky bar grew a second one: two boxes each holding their
 * own query, each firing the same callback, would disagree about what was typed
 * and race to drive one filter. The page owns the query now and hands both boxes
 * the same one, so they cannot come apart.
 */
export function DeckSearch({
  value,
  onChange,
  hits,
  /**
   * Whether this box answers to `/`.
   *
   * Two boxes both binding the shortcut would both grab focus. Whichever one is
   * actually on screen claims it.
   */
  shortcut = true,
}: {
  value: string;
  onChange: (next: string) => void;
  hits: SearchHit[];
  shortcut?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const active = value.trim().length >= 2;

  // `/` to focus, the convention everywhere else that has a search box. Ignored
  // while typing into something, or it would be impossible to type a slash.
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && typing) {
        onChange("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut, onChange]);

  return (
    <div className="mb-10">
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search every deck…  (press /)"
          aria-label="Search decks"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:placeholder:text-stone-500"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:text-slate-700 dark:text-stone-500 dark:hover:text-stone-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {active && (
        <div className="mt-4 max-w-xl">
          <SearchResults hits={hits} query={value} />
        </div>
      )}
    </div>
  );
}

/**
 * The matches, listed.
 *
 * Split out so the bar's dropdown and the page's inline list are one piece of
 * markup rather than two that drift. Which questions and rows matched is the
 * useful part: knowing *which* card mentions a phenoxide beats knowing the deck
 * does.
 */
export function SearchResults({
  hits,
  query,
  onPick,
  className,
}: {
  hits: SearchHit[];
  query: string;
  /** Fired after a result is followed, so a dropdown can shut behind it. */
  onPick?: () => void;
  className?: string;
}) {
  if (hits.length === 0) {
    return (
      <p className={cn("text-sm text-slate-500 dark:text-stone-400", className)}>
        Nothing matches “{query.trim()}”.
      </p>
    );
  }

  return (
    <div className={className}>
      <p className="mb-2 font-mono text-xs text-slate-400 dark:text-stone-500">
        {hits.length} match{hits.length === 1 ? "" : "es"}
      </p>
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
        {hits.map((hit, i) => (
          <li key={`${hit.href}-${hit.kind}-${i}`}>
            <a
              href={hit.href}
              onClick={onPick}
              className="block px-4 py-3 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-400/10"
            >
              <div className="flex items-center gap-1.5 font-mono text-[0.65rem] text-indigo-600 dark:text-indigo-300">
                {KIND_ICON[hit.kind]}
                {hit.label}
              </div>
              <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-800 dark:text-stone-100">
                {hit.title}
              </p>
              <p className="line-clamp-1 text-xs text-slate-500 dark:text-stone-400">
                {hit.detail}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DeckSearch;
