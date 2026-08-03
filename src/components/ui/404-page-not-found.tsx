import { Home, Search, ArrowLeft } from "lucide-react";
import { MOTIF_VIEWBOX, motifMarkup } from "@/data/testimonialArt";

/**
 * The page for a URL that does not resolve.
 *
 * Four things changed from the supplied component, all of them load-bearing:
 *
 * 1. **It crashed.** `onClick={() => router.push("/")}` referenced a `router`
 *    that was never imported or declared, so the button threw a ReferenceError.
 *    It was a Next.js idiom; this is a Vite SPA with hash routing, so home is
 *    an ordinary anchor to `#/home`.
 * 2. **Dropped the `Button` dependency.** It needs `@radix-ui/react-slot` and
 *    `class-variance-authority`, neither installed, and its variants are built
 *    on shadcn CSS variables (`bg-primary`, `border-input`, `ring`) that this
 *    project never defines, so they would resolve to nothing. Every other
 *    button here is styled directly; this one matches.
 * 3. **Dropped the remote Dribbble GIF.** A 404 page whose artwork is hotlinked
 *    from a third-party CDN can itself 404, which is a poor joke to ship. The
 *    mascot already lives in the bundle as inline SVG, so this renders offline
 *    and cannot break. It is also somebody's copyrighted shot.
 * 4. **Theme-aware.** The original hardcoded `bg-white` and `text-black`, which
 *    would have been a white flash in the middle of a dark site.
 */
export function NotFoundPage({
  what = "That page",
  detail,
}: {
  /** What was being looked for, e.g. "That deck". */
  what?: string;
  /** The id or route that failed, shown so a bad link can be reported. */
  detail?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] px-6 py-12 dark:bg-[#0c0a09]">
      <div className="w-full max-w-lg text-center">
        <div className="relative mx-auto mb-2 flex h-40 w-full items-end justify-center">
          <svg
            aria-hidden
            viewBox={MOTIF_VIEWBOX}
            className="h-40 w-auto text-indigo-500/25 dark:text-amber-200/20"
            dangerouslySetInnerHTML={{ __html: motifMarkup("mascot") }}
          />
          <span
            aria-hidden
            className="title-face pointer-events-none absolute inset-0 flex items-center justify-center text-7xl font-bold text-slate-900 sm:text-8xl dark:text-stone-100"
          >
            404
          </span>
        </div>

        <h1 className="title-face text-2xl font-bold text-slate-900 sm:text-3xl dark:text-stone-100">
          Looks like you're lost
        </h1>
        <p className="playful-face mx-auto mt-3 max-w-sm text-lg text-slate-500 dark:text-stone-400">
          {what} does not exist. It may have been renamed, or the link may have a
          typo in it.
        </p>

        {detail && (
          <p className="mt-3 font-mono text-xs break-all text-slate-400 dark:text-stone-500">
            {detail}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#/home"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
          >
            <Home className="h-4 w-4" />
            All decks
          </a>
          <a
            href="#/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Grignard deck
          </a>
        </div>

        <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-stone-500">
          <Search className="h-3.5 w-3.5" />
          Or search for it from the hub.
        </p>
      </div>
    </main>
  );
}

export default NotFoundPage;
