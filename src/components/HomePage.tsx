import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Atom,
  BookOpen,
  ChevronDown,
  Gamepad2,
  Layers,
  Timer,
} from "lucide-react";
import { HomeIntro } from "@/components/HomeIntro";
import { Dashboard, useDashboard } from "@/components/Dashboard";
import { SiteHeader } from "@/components/ui/site-header";
import { BlueberryLoader, useLoaderHold } from "@/components/ui/blueberry-loader";
import { Blueberry } from "@/components/ui/blueberry";
import { BentoTile } from "@/components/ui/bento-tile";
import { moodForProgress } from "@/lib/berryMood";
import { SURFACE } from "@/lib/hubSurface";
import { useIsDark } from "@/lib/useIsDark";
import { useDecks } from "@/lib/useDecks";
import { reviewedCount } from "@/lib/progress";
import { hasSeenIntro, markIntroSeen } from "@/lib/intro";
import { deckCount, deckHref, type Deck } from "@/data/types";
import { SITE_NAME, TRAINER_URL } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The front door: three screens on one route, stacked and scrolled.
 *
 * 1. **The opening**, which stays mounted. You can scroll back up to it from
 *    anywhere on this page, at any time, which is the whole reason it is a
 *    section rather than an overlay that unmounts when it is done.
 * 2. **The hero**: the name, the berry, and whatever you had already started.
 *    One screen, and deliberately almost empty.
 * 3. **The board**: every part of the site as a tile, including the ones that
 *    are about not studying.
 *
 * Keeping the opening mounted has a cost and it is worth being straight about
 * it: the particle canvas keeps its 4,200 particles and keeps stepping while
 * you read the rest of the page. That was measured and chosen. What it buys is
 * that scrolling up always works and never replays from the start, which is not
 * true of an intro that tears itself down.
 *
 * The deck hub is still its own route. It is the heaviest page on the site and
 * putting it here would mean every visit to home loads the whole library.
 */
export function HomePage() {
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;
  const reduce = useReducedMotion();

  /** Fonts are in and the floor has passed; fair to start animating. */
  const loaded = useLoaderHold();

  /**
   * Read once on mount, before the mark below is set, so a first arrival still
   * sees the opening. See `lib/intro` for which arrivals count as first: a deck
   * clears the mark on its way here, a folder does not.
   */
  const [seenIntro] = useState(hasSeenIntro);
  useEffect(markIntroSeen, []);

  /**
   * Whether the opening has finished and the page below it is worth showing.
   *
   * This used to unmount the intro. Now it only decides whether the header and
   * the hero's contents have faded in — the opening stays where it is, above
   * everything, waiting to be scrolled back to.
   */
  const [past, setPast] = useState(seenIntro);

  const heroRef = useRef<HTMLElement>(null);

  /**
   * The hand-off is a scroll, not a swap.
   *
   * Smooth when the opening has just played, because that is a beat the visitor
   * watched and the movement explains where the page went. Instant when the
   * opening was already seen this visit, because then it is not a transition at
   * all — it is where the page should have opened.
   */
  const goToHero = useCallback(
    (smooth: boolean) => {
      setPast(true);
      heroRef.current?.scrollIntoView({
        behavior: smooth && !reduce ? "smooth" : "auto",
        block: "start",
      });
    },
    [reduce],
  );

  // Seen already: start at the hero rather than at the top of the opening.
  useEffect(() => {
    if (!loaded || !seenIntro) return;
    heroRef.current?.scrollIntoView({ block: "start" });
  }, [loaded, seenIntro]);

  return (
    <div
      // The text colours belong here rather than on each block: the surface is
      // set as an inline style, so nothing above this is telling the page
      // whether it is light or dark, and a heading with no colour of its own
      // inherits near-black onto near-black.
      className="relative text-slate-900 dark:text-stone-100"
      style={{ backgroundColor: surface.base, backgroundImage: surface.gradient }}
    >
      <AnimatePresence>{!loaded && <BlueberryLoader key="loader" />}</AnimatePresence>

      {/* Screen one, and it stays. */}
      {loaded && (
        <section aria-label="Opening">
          <HomeIntro
            onSkip={() => goToHero(false)}
            onComplete={() => goToHero(true)}
            settled={seenIntro}
            // Long enough to see the berry finish blushing and the panel open
            // behind it, short enough that nobody reaches for the skip.
            autoAdvanceMs={1400}
          />
        </section>
      )}

      <Body heroRef={heroRef} reduce={Boolean(reduce)} past={past} />
    </div>
  );
}

/**
 * Everything below the opening.
 *
 * Split out so the hero and the board share one dashboard and one deck list
 * rather than each opening their own.
 */
function Body({
  heroRef,
  reduce,
  past,
}: {
  heroRef: React.RefObject<HTMLElement | null>;
  reduce: boolean;
  /** The opening has finished; the bar may show itself. */
  past: boolean;
}) {
  const dash = useDashboard();
  const { decks } = useDecks();
  const boardRef = useRef<HTMLElement>(null);

  const cards = useMemo(() => decks.reduce((n, d) => n + deckCount(d), 0), [decks]);

  /**
   * Decks with something already on them, best-progressed first.
   *
   * Reading progress touches localStorage once per deck, so it is computed here
   * and handed down rather than read inside each row.
   */
  const started = useMemo(
    () =>
      decks
        .map((deck) => ({ deck, reviewed: reviewedCount(deck.id), total: deckCount(deck) }))
        .filter((row) => row.reviewed > 0)
        .sort((a, b) => b.reviewed / b.total - a.reviewed / a.total),
    [decks],
  );

  /**
   * The berry's face, summed across every started deck.
   *
   * Summed rather than taken from the best one, or it would be proud of the
   * deck you finished while ignoring the four you abandoned.
   */
  const heroMood = useMemo(() => {
    if (started.length === 0) return "curious" as const;
    const reviewed = started.reduce((n, r) => n + r.reviewed, 0);
    const total = started.reduce((n, r) => n + r.total, 0);
    return moodForProgress(reviewed, total);
  }, [started]);

  return (
    <>
      {/* `SiteHeader` is already `sticky top-0`, and it sits after the opening
          in the document — so it pins itself the moment the hero reaches the
          top and is simply absent above that. No scroll arithmetic needed.
          The wrapper exists only to fade it in once the opening has played;
          `pointer-events-none` while invisible so it cannot be clicked from
          over the intro. */}
      <motion.div
        className={cn("sticky top-0 z-40", !past && "pointer-events-none")}
        initial={false}
        animate={{ opacity: past ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <SiteHeader
          browse={{ open: dash.isOpen, onToggle: () => dash.toggle("home") }}
          onSearch={() => dash.open("decks", { focusSearch: true })}
        />
      </motion.div>

      {/* Screen two: the hero, one viewport tall, mostly empty on purpose. */}
      <section
        ref={heroRef}
        aria-label={SITE_NAME}
        className="relative mx-auto flex min-h-svh max-w-5xl flex-col justify-center px-6 pb-16"
        style={{ scrollMarginTop: 0 }}
      >
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-12">
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
            className="mx-auto h-52 w-52 sm:h-64 sm:w-64 lg:mx-0"
            label="Blueberry, the site's mascot. Drag to spin, click to poke."
          />
        </div>

        {started.length > 0 && <ProgressCard started={started} reduce={reduce} />}

        {/* The cue says there is more, and takes you there when pressed. A
            chevron alone is decoration; a chevron you can click is navigation. */}
        <button
          type="button"
          onClick={() =>
            boardRef.current?.scrollIntoView({
              behavior: reduce ? "auto" : "smooth",
              block: "start",
            })
          }
          className="group absolute inset-x-0 bottom-8 mx-auto flex w-fit cursor-pointer flex-col items-center gap-1 rounded-full px-4 py-2 text-slate-500 transition-colors hover:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none dark:text-stone-400 dark:hover:text-indigo-300"
        >
          <span className="font-mono text-[0.7rem] tracking-widest uppercase">Everything else</span>
          <motion.span
            animate={reduce ? undefined : { y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="size-5" />
          </motion.span>
        </button>
      </section>

      {/* Screen three: the board. */}
      <Board ref={boardRef} deckCountLabel={`${decks.length} decks · ${cards} cards`} />

      <Dashboard dash={dash} />
    </>
  );
}

/**
 * What you had already started, as one card that opens.
 *
 * Closed it is a single line — the deck you are furthest through and how many
 * others are waiting — because the hero is meant to hold one screen and a list
 * of eight decks is not that. Open it is the whole list. A disclosure rather
 * than a link to somewhere else, since the answer is three rows long and
 * sending someone to another page to read three rows is the worse trade.
 */
function ProgressCard({
  started,
  reduce,
}: {
  started: { deck: Deck; reviewed: number; total: number }[];
  reduce: boolean;
}) {
  const [open, setOpen] = useState(false);
  const top = started[0]!;
  const rest = started.length - 1;

  return (
    <div className="mt-12 max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white/60 dark:border-stone-800 dark:bg-stone-950/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none dark:hover:bg-stone-900"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[0.65rem] tracking-widest text-slate-400 uppercase dark:text-stone-500">
            Pick up where you left off
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold">{top.deck.title}</span>
        </span>
        <span className="shrink-0 font-mono text-xs text-slate-400 dark:text-stone-500">
          {top.reviewed} of {top.total}
        </span>
        {rest > 0 && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[0.65rem] text-slate-500 dark:bg-stone-800 dark:text-stone-400">
            +{rest}
          </span>
        )}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden border-t border-slate-200 dark:border-stone-800"
          >
            {started.map(({ deck, reviewed, total }) => (
              <li key={deck.id}>
                <a
                  href={deckHref(deck)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white dark:hover:bg-stone-900"
                >
                  <span className="min-w-0 flex-1 truncate">{deck.title}</span>
                  <span className="shrink-0 font-mono text-xs text-slate-400 dark:text-stone-500">
                    {reviewed}/{total}
                  </span>
                  <span
                    aria-hidden
                    className="hidden h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-slate-200 sm:block dark:bg-stone-800"
                  >
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                      style={{ width: `${Math.round((reviewed / total) * 100)}%` }}
                    />
                  </span>
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The board: every part of the site, including the parts about stopping.
 *
 * The three doors moved here off the hero, which is why the hero can now be one
 * screen. Focus and Game are placeholders until the timer lands; they are drawn
 * as unavailable rather than hidden, because a board with a visible gap is a
 * roadmap and a board that quietly omits things is a smaller product.
 */
const Board = ({
  ref,
  deckCountLabel,
}: {
  ref: React.RefObject<HTMLElement | null>;
  deckCountLabel: string;
}) => (
  <section
    ref={ref}
    aria-label="Everything else"
    className="mx-auto min-h-svh max-w-5xl px-6 pt-16 pb-24"
  >
    <h2 className="title-face text-3xl sm:text-4xl">Everything else</h2>
    <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-stone-400">
      The cards, the reading behind them, and the parts that tell you to stop for a minute.
    </p>

    <div className="mt-8 grid auto-rows-[minmax(11rem,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BentoTile href="#/study-decks" className="sm:col-span-2">
        <Layers className="size-5 text-indigo-600 dark:text-indigo-300" />
        <span className="mt-4 flex items-center gap-1.5 text-xl font-semibold">
          Study Decks <ArrowRight className="size-4 text-slate-400" />
        </span>
        <span className="mt-2 text-sm text-slate-500 dark:text-stone-400">
          Flashcards and reference sheets, grouped by course and folder.
        </span>
        <span className="mt-auto pt-4 font-mono text-xs text-slate-400 dark:text-stone-500">
          {deckCountLabel}
        </span>
      </BentoTile>

      <BentoTile href="#/lessons">
        <BookOpen className="size-5 text-indigo-600 dark:text-indigo-300" />
        <span className="mt-4 flex items-center gap-1.5 text-xl font-semibold">
          Lessons <ArrowRight className="size-4 text-slate-400" />
        </span>
        <span className="mt-2 text-sm text-slate-500 dark:text-stone-400">
          The ideas behind the cards, written out before you start drilling them.
        </span>
        <span className="mt-auto pt-4 font-mono text-xs text-slate-400 dark:text-stone-500">
          Carbonyls, in seven parts
        </span>
      </BentoTile>

      <BentoTile href={TRAINER_URL}>
        <Atom className="size-5 text-indigo-600 dark:text-indigo-300" />
        <span className="mt-4 flex items-center gap-1.5 text-xl font-semibold">
          Concepts <ArrowUpRight className="size-4 text-slate-400" />
        </span>
        <span className="mt-2 text-sm text-slate-500 dark:text-stone-400">
          Draw the mechanism and push the electrons yourself.
        </span>
        <span className="mt-auto pt-4 font-mono text-xs text-slate-400 dark:text-stone-500">
          A separate app, for now
        </span>
      </BentoTile>

      <BentoTile disabled>
        <Timer className="size-5 text-slate-400" />
        <span className="mt-4 text-xl font-semibold text-slate-500 dark:text-stone-400">Focus</span>
        <span className="mt-2 text-sm text-slate-500 dark:text-stone-400">
          A study timer that makes you look 20 ft away every 20 minutes, for 20 seconds.
        </span>
        <span className="mt-auto pt-4 font-mono text-xs text-slate-400 dark:text-stone-500">
          Being built
        </span>
      </BentoTile>

      <BentoTile disabled>
        <Gamepad2 className="size-5 text-slate-400" />
        <span className="mt-4 text-xl font-semibold text-slate-500 dark:text-stone-400">Break</span>
        <span className="mt-2 text-sm text-slate-500 dark:text-stone-400">
          A game, and something to listen to. Unlocked on your breaks — after you have actually
          looked out of the window.
        </span>
        <span className="mt-auto pt-4 font-mono text-xs text-slate-400 dark:text-stone-500">
          Being built
        </span>
      </BentoTile>
    </div>
  </section>
);

export default HomePage;
