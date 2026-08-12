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
import { WindowChrome } from "@/components/ui/window-chrome";
import { SiteFooter } from "@/components/ui/site-footer";
import { PageBackground } from "@/components/ui/page-background";
import { Testimonials } from "@/components/ui/testimonials";
import { usePageCurtain } from "@/components/ui/page-flip";
import { moodForProgress } from "@/lib/berryMood";
import { useDecks } from "@/lib/useDecks";
import { reviewedCount } from "@/lib/progress";
import { hasSeenIntro, markIntroSeen } from "@/lib/intro";
import { deckCount } from "@/data/types";
import { SITE_NAME, TRAINER_URL } from "@/data/site";


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
      // No surface colour here any more: `PageBackground` paints the photograph
      // and lays the same `SURFACE` gradient over it, so setting one here as
      // well would put an opaque sheet between the two.
    >
      <PageBackground />

      <AnimatePresence>{!loaded && <BlueberryLoader key="loader" />}</AnimatePresence>

      {/* Screen one, and it stays. */}
      {loaded && (
        <section aria-label="Opening">
          {/* `onComplete` reveals the bar and nothing else. The opening does
              not move the page any more: scrolling through it opens the panel
              behind the mark, and scrolling past it is how you leave. Skip is
              the only thing that jumps. */}
          <HomeIntro
            onSkip={() => goToHero(false)}
            onComplete={() => setPast(true)}
            settled={seenIntro}
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
  const curtain = usePageCurtain();

  const cards = useMemo(() => decks.reduce((n, d) => n + deckCount(d), 0), [decks]);

  /**
   * The berry's face, summed across every deck with progress on it.
   *
   * Summed rather than taken from the best one, or it would be proud of the
   * deck you finished while ignoring the four you abandoned. One localStorage
   * read per deck, so it is memoised on the list rather than done per render.
   */
  const heroMood = useMemo(() => {
    const rows = decks
      .map((deck) => ({ reviewed: reviewedCount(deck.id), total: deckCount(deck) }))
      .filter((row) => row.reviewed > 0);
    if (rows.length === 0) return "curious" as const;
    const reviewed = rows.reduce((n, r) => n + r.reviewed, 0);
    const total = rows.reduce((n, r) => n + r.total, 0);
    return moodForProgress(reviewed, total);
  }, [decks]);

  return (
    <>
      {/* One object in two states: a tab at rest, the bar once stuck. The
          morph is what makes them read as continuous rather than as one piece
          of furniture replacing another at a visible seam. `SiteHeader` is
          handed in as the bar's contents and fades up as the tab widens. */}
      <WindowChrome decks={decks} visible={past}>
        <SiteHeader
          bare
          // Not "decks": on this page the dashboard opens onto everything the
          // site has, and the deck library is one of the three things in it.
          searchLabel="Search features"
          browse={{ open: dash.isOpen, onToggle: () => dash.toggle("home") }}
          onSearch={() => dash.open("home")}
        />
      </WindowChrome>

      {/* Screen two: the hero, one viewport tall, mostly empty on purpose. */}
      {/* The hero holds still.

          It used to scroll away like any other block, which meant the one
          screen with something to play with on it — the berry follows the
          cursor, you can poke it and spin it — slid out from under you the
          moment you touched the wheel. A short column with a sticky screen
          inside gives it somewhere to stay: scrolling within the column moves
          the page behind it while the hero itself sits put, and the way onward
          is the button at the foot rather than more wheel. */}
      <div className="relative h-[150vh]">
      <section
        ref={heroRef}
        aria-label={SITE_NAME}
        className="sticky top-0 mx-auto flex h-svh max-w-5xl flex-col justify-center px-6 pb-16"
        style={{ scrollMarginTop: 0 }}
      >
        {/*
          Framed on thirds rather than centred.

          A twelve-column grid read as thirds: the wordmark occupies the left
          two thirds and sits on the lower-third line, the berry occupies the
          right third and sits on the upper-third line. That puts the two on
          opposite intersections of the same frame, which is what stops a
          left-aligned title beside a right-aligned object from reading as two
          things that merely failed to collide.

          The berry is above the eye line and the word below it on purpose: the
          subject looks down into the frame and the type sits under it, so the
          space between them belongs to the composition rather than being
          leftover margin.

          It collapses to a single centred column below `lg`, where there is no
          horizontal room for thirds and the two would simply squash.
        */}
        <div className="grid items-center gap-8 lg:min-h-[58vh] lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-8 lg:self-end lg:pb-[8vh]">
            {/*
              The title is a link, and it goes back to the opening.

              It is drawn like one on purpose — the site's own gradient sweep,
              the same underline every other link here grows on hover — because
              a wordmark that reacts and does nothing is a worse lie than one
              that never reacted. What it does is the one thing anybody would
              want from pressing the name at the top of a page: it takes you
              back to the front of it.

              Lowercase with a full stop, matching what the swarm spells one
              screen above. The opening whispers it, the page repeats it.
            */}
            <button
              type="button"
              onClick={() => dash.open("home")}
              aria-haspopup="dialog"
              aria-expanded={dash.isOpen}
              title="Open the dashboard"
              className="group/mark inline-block cursor-pointer rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <h1 className="title-face relative text-6xl leading-[0.9] tracking-tight lowercase sm:text-8xl">
                {SITE_NAME.toLowerCase()}.
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-[3px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-transform duration-500 ease-out group-hover/mark:scale-x-100 group-focus-visible/mark:scale-x-100"
                />
              </h1>
            </button>

          </div>

          {/* Sized in rem rather than by aspect, so it holds its place before
              the canvas arrives and nothing reflows underneath it. It tracks
              the cursor across the whole window here, because on this screen it
              is the subject rather than an ornament in a corner. */}
          <Blueberry
            mood={heroMood}
            trackWindow
            interactive
            className="mx-auto h-52 w-52 sm:h-64 sm:w-64 lg:col-span-4 lg:mx-0 lg:self-start lg:justify-self-center lg:pt-[6vh]"
            label="Blueberry, the site's mascot. Drag to spin, click to poke."
          />
        </div>

        {/* The cue says there is more, and takes you there when pressed. A
            chevron alone is decoration; a chevron you can click is navigation. */}
        <button
          type="button"
          onClick={() =>
            // The sheet turns over the jump, the same way it does over a real
            // navigation. Moving a whole screen inside one route is as large a
            // change as changing route, and a plain smooth-scroll of that
            // distance reads as the page having lurched rather than as having
            // gone somewhere.
            curtain(() =>
              boardRef.current?.scrollIntoView({ behavior: "auto", block: "start" }),
            )
          }
          className="group absolute inset-x-0 bottom-10 mx-auto flex min-h-11 w-fit cursor-pointer flex-col items-center gap-1 px-4 text-slate-700 transition-colors hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none dark:text-stone-300 dark:hover:text-white"
        >
          <span className="font-mono text-[0.7rem] tracking-[0.2em] uppercase">Everything else</span>
          <motion.span
            animate={reduce ? undefined : { y: [0, 4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="size-4" />
          </motion.span>
        </button>
      </section>
      </div>

      {/* Screen three: the board. */}
      <Board ref={boardRef} deckCountLabel={`${decks.length} decks · ${cards} cards`} />

      {/* Above the footer, and off the deck pages. A carousel of people
          praising the site belongs where someone is deciding whether to use
          it, not under the cards while they are mid-revision. */}
      <Testimonials className="pb-20" />

      <SiteFooter />

      <Dashboard dash={dash} />
    </>
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
