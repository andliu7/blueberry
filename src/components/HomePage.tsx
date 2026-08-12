import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, Atom, BookOpen, Layers } from "lucide-react";
import { HomeIntro } from "@/components/HomeIntro";
import { Dashboard, useDashboard } from "@/components/Dashboard";
import { SiteHeader } from "@/components/ui/site-header";
import { BlueberryLoader, useLoaderHold } from "@/components/ui/blueberry-loader";
import { Blueberry } from "@/components/ui/blueberry";
import { moodForProgress } from "@/lib/berryMood";
import { SURFACE } from "@/lib/hubSurface";
import { useIsDark } from "@/lib/useIsDark";
import { useDecks } from "@/lib/useDecks";
import { reviewedCount } from "@/lib/progress";
import { hasSeenIntro, markIntroSeen } from "@/lib/intro";
import { deckCount, deckHref } from "@/data/types";
import { SITE_NAME, TRAINER_URL } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The front door: a held frame, an opening, and then three ways in.
 *
 * Home used to be the deck hub with a curtain in front of it. That was right
 * while decks were the whole site — it is not any more. Lessons is written and
 * Concepts is a real app sitting outside, and a landing page that offers only
 * the one section it happens to contain hides the other two behind a panel
 * nobody opens on their first visit.
 *
 * So the hub moved to `#/study-decks`, which it already had a route for, and
 * this became a page whose job is to say what the site is and point at its
 * parts.
 *
 * **Three states, one after the other.** The loader holds the door while fonts
 * settle, because the particle canvas samples rendered text and sampling the
 * fallback face means re-forming the whole word a moment later. Then the
 * opening plays. Then the landing.
 *
 * They are rendered one at a time rather than stacked. The version before this
 * kept the hub mounted underneath from the first frame at `opacity: 0` with a
 * `blur(8px)` over it, which does not stop React mounting it, does not stop a
 * 890 kB three.js scene booting, and adds a full-screen composited layer on
 * top of the lot. That was most of the stutter on reload.
 */
export function HomePage() {
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;
  const reduce = useReducedMotion();

  /**
   * Fonts are in and the floor has passed; fair to start animating.
   *
   * There used to be a second, longer hold stacked on this one so the blob had
   * time to settle into the berry before leaving. The blob does not become the
   * berry any more, so the extra wait was buying nothing but a slower door.
   */
  const loaded = useLoaderHold();

  /**
   * Read once on mount, before the mark below is set, so a first arrival still
   * sees the opening. See `lib/intro` for which arrivals count as first: a deck
   * clears the mark on its way here, a folder does not.
   */
  const [seenIntro] = useState(hasSeenIntro);
  useEffect(markIntroSeen, []);

  // Already seen this visit means straight to the landing. The opening is worth
  // watching once; it is not worth watching every time you press the logo.
  const [entered, setEntered] = useState(seenIntro);
  const enter = useCallback(() => setEntered(true), []);

  return (
    <div
      // The text colours belong here rather than on each block: the surface is
      // set as an inline style, so nothing above this is telling the page
      // whether it is light or dark, and a heading with no colour of its own
      // inherits near-black onto near-black.
      className="relative min-h-screen text-slate-900 dark:text-stone-100"
      style={{ backgroundColor: surface.base, backgroundImage: surface.gradient }}
    >
      <AnimatePresence>{!loaded && <BlueberryLoader key="loader" />}</AnimatePresence>

      {loaded && !entered && (
        <HomeIntro
          onSkip={enter}
          onComplete={enter}
          // Long enough to see the berry finish blushing and the panel open
          // behind it, short enough that nobody reaches for the skip.
          autoAdvanceMs={1400}
        />
      )}

      {loaded && entered && <Landing reduce={Boolean(reduce)} />}
    </div>
  );
}

/**
 * What the site is, and the three places it goes.
 *
 * Its own component so the opening's canvases are unmounted before any of this
 * renders, rather than the two sharing a frame.
 */
function Landing({ reduce }: { reduce: boolean }) {
  const dash = useDashboard();
  const { decks } = useDecks();

  const cards = useMemo(() => decks.reduce((n, d) => n + deckCount(d), 0), [decks]);

  /**
   * Decks with something already on them, best-progressed first.
   *
   * The same shape the dashboard's home panel uses. Reading progress touches
   * localStorage once per deck, so it is computed here and not in the row.
   */
  const started = useMemo(
    () =>
      decks
        .map((deck) => ({ deck, reviewed: reviewedCount(deck.id), total: deckCount(deck) }))
        .filter((row) => row.reviewed > 0)
        .sort((a, b) => b.reviewed / b.total - a.reviewed / a.total)
        .slice(0, 3),
    [decks],
  );

  /**
   * The berry's face, taken from how the studying is actually going.
   *
   * Summed across every started deck rather than read off the best one, or it
   * would congratulate you on the deck you finished while ignoring the four you
   * abandoned. A first visit has nothing to sum and gets `curious`, which is the
   * mood that looks at you rather than at your record.
   */
  const heroMood = useMemo(() => {
    if (started.length === 0) return "curious" as const;
    const reviewed = started.reduce((n, r) => n + r.reviewed, 0);
    const total = started.reduce((n, r) => n + r.total, 0);
    return moodForProgress(reviewed, total);
  }, [started]);

  /**
   * The doors, in the order they are worth trying.
   *
   * Decks first because it is the reason anyone is here, Lessons second because
   * it is what you read before the cards make sense, Concepts last because it
   * is still somewhere else. `external` is what decides whether the card opens
   * a new tab, which is the honest signal that you are leaving the site.
   */
  const doors = [
    {
      href: "#/study-decks",
      icon: <Layers className="size-5" />,
      title: "Study Decks",
      blurb: "Flashcards and reference sheets, grouped by course and folder.",
      meta: `${decks.length} decks · ${cards} cards`,
      external: false,
    },
    {
      href: "#/lessons",
      icon: <BookOpen className="size-5" />,
      title: "Lessons",
      blurb: "The ideas behind the cards, written out before you start drilling them.",
      meta: "Carbonyls, in seven parts",
      external: false,
    },
    {
      href: TRAINER_URL,
      icon: <Atom className="size-5" />,
      title: "Concepts",
      blurb: "Draw the mechanism and push the electrons yourself.",
      meta: "A separate app, for now",
      external: true,
    },
  ];

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <>
      <SiteHeader
        browse={{ open: dash.isOpen, onToggle: () => dash.toggle("home") }}
        onSearch={() => dash.open("decks", { focusSearch: true })}
      />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        {/*
          The berry is the hero, and the words get out of its way.

          There were three sentences of prose here explaining what the site is
          for. They were doing the mascot's job badly: the berry says "this is
          friendly, it is about chemistry, someone made it on purpose" in one
          glance, and a paragraph saying the same thing in words is just the
          reader's toll for reaching the doors underneath.

          What is left is the name and one line of fact — which course, what is
          in it. Anyone who wants more can press a door.
        */}
        {/*
          The hero holds one screen and says one thing.

          There was a paragraph here explaining the site — which course, what is
          in it — and it read as an apology for the wordmark above it. The berry
          and the name do that work between them, and everything a paragraph
          would have said is one scroll away on the features board. The
          wordmark is shouted here and whispered in the opening: the swarm
          spells `blueberry.` in lowercase, and the page it hands to answers in
          capitals.
        */}
        <motion.header
          className="grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-12"
          {...rise(0)}
        >
          <div>
            <h1 className="title-face text-6xl leading-[0.9] tracking-tight uppercase sm:text-8xl">
              {SITE_NAME}
            </h1>
            <div
              aria-hidden
              className="mt-6 h-px w-24 bg-gradient-to-r from-indigo-500 to-fuchsia-500"
            />
          </div>

          {/* Sized in rem rather than by aspect, so it holds its place before
              the canvas arrives and nothing reflows underneath it. */}
          <Blueberry
            mood={heroMood}
            className="mx-auto h-56 w-56 sm:h-72 sm:w-72 lg:mx-0"
            label={`Blueberry, the site's mascot. Drag to spin, click to poke.`}
          />
        </motion.header>

        <motion.section className="mt-12 grid gap-4 sm:grid-cols-3" {...rise(0.08)}>
          {doors.map((door) => (
            <a
              key={door.title}
              href={door.href}
              {...(door.external ? { target: "_blank", rel: "noreferrer" } : {})}
              className={cn(
                "group flex min-h-44 flex-col rounded-2xl border p-5 transition-colors",
                "border-slate-200 bg-white/70 hover:border-indigo-300 hover:bg-white",
                "dark:border-stone-800 dark:bg-stone-950/60 dark:hover:border-indigo-400/50 dark:hover:bg-stone-900",
              )}
            >
              <span className="text-indigo-600 dark:text-indigo-300">{door.icon}</span>
              <span className="mt-4 flex items-center gap-1.5 text-lg font-semibold">
                {door.title}
                {door.external ? (
                  <ArrowUpRight className="size-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                ) : (
                  <ArrowRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                )}
              </span>
              <span className="mt-2 text-sm leading-6 text-slate-500 dark:text-stone-400">
                {door.blurb}
              </span>
              <span className="mt-auto pt-4 font-mono text-xs text-slate-400 dark:text-stone-500">
                {door.meta}
              </span>
            </a>
          ))}
        </motion.section>

        {/* Only once there is something to show. An empty "pick up where you
            left off" on a first visit is a promise about a past that does not
            exist yet. */}
        {started.length > 0 && (
          <motion.section className="mt-14" {...rise(0.16)}>
            <h2 className="font-mono text-xs font-semibold tracking-[.16em] text-slate-500 uppercase dark:text-stone-400">
              Pick up where you left off
            </h2>
            <ul className="mt-4 space-y-2">
              {started.map(({ deck, reviewed, total }) => (
                <li key={deck.id}>
                  <a
                    href={deckHref(deck)}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white/60 px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-white dark:border-stone-800 dark:bg-stone-950/50 dark:hover:border-indigo-400/50 dark:hover:bg-stone-900"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {deck.title}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-slate-400 dark:text-stone-500">
                      {reviewed} of {total}
                    </span>
                    {/* The bar is the same number again, for people who read a
                        proportion faster than they read a fraction. */}
                    <span
                      aria-hidden
                      className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-slate-200 sm:block dark:bg-stone-800"
                    >
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                        style={{ width: `${Math.round((reviewed / total) * 100)}%` }}
                      />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </main>

      <Dashboard dash={dash} />
    </>
  );
}

export default HomePage;
