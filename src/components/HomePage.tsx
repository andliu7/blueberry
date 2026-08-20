import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Atom,
  BookOpen,
  CalendarDays,
  Layers,
  Timer,
} from "lucide-react";
import { HomeHero } from "@/components/HomeHero";
import { Dashboard, useDashboard } from "@/components/Dashboard";
import { SiteHeader } from "@/components/ui/site-header";
import { BlueberryLoader, useLoaderHold } from "@/components/ui/blueberry-loader";
import { BentoTile } from "@/components/ui/bento-tile";
import { courseSummary } from "@/data/topics";
import { REACTIONS } from "@/data/reactions";
import { WindowChrome } from "@/components/ui/window-chrome";
import { SiteFooter } from "@/components/ui/site-footer";
import { PageBackground } from "@/components/ui/page-background";
import { Testimonials } from "@/components/ui/testimonials";
import { usePageCurtain } from "@/components/ui/page-flip";
import { useDecks } from "@/lib/useDecks";
import { hasSeenIntro, markIntroSeen } from "@/lib/intro";
import { deckCount } from "@/data/types";
import { TRAINER_URL } from "@/data/site";


/**
 * The front door: two screens on one route.
 *
 * 1. **The hero**, which is also the opening. The swarm of particles that used
 *    to spell the name across its own 210vh column now assembles into this
 *    screen and hands over: name, what we sell, the mascot, and one button.
 * 2. **The board**: every part of the site as a tile, including the ones that
 *    are about not studying.
 *
 * It was three, and the third was the problem. The opening owned 210vh, the
 * hero another 150vh below it, and the two said the same thing twice — the name
 * in particles, then the name in type, one and a half screens apart. Somebody
 * arriving had three and a half screens of wheel between them and anything they
 * could press. That is now zero.
 *
 * The particle canvas no longer stays mounted for the life of the page either.
 * It used to, so that you could always scroll back up to the opening, and it
 * cost 4,200 particles stepping forever while you read. There is nothing to
 * scroll back to: the opening's last act is to become the screen you are
 * already looking at.
 *
 * The deck hub is still its own route. It is the heaviest page on the site and
 * putting it here would mean every visit to home loads the whole library.
 */
export function HomePage() {
  /** Fonts are in and the floor has passed; fair to start animating. */
  const loaded = useLoaderHold();

  /**
   * Read once on mount, before the mark below is set, so a first arrival still
   * sees the full opening. See `lib/intro` for which arrivals count as first: a
   * deck clears the mark on its way here, a folder does not.
   */
  const [seenIntro] = useState(hasSeenIntro);
  useEffect(markIntroSeen, []);

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

      <Body loaded={loaded} seenIntro={seenIntro} />
    </div>
  );
}

/**
 * Everything below the opening.
 *
 * Split out so the hero and the board share one dashboard and one deck list
 * rather than each opening their own.
 */
function Body({ loaded, seenIntro }: { loaded: boolean; seenIntro: boolean }) {
  const dash = useDashboard();
  const { decks } = useDecks();
  const boardRef = useRef<HTMLElement>(null);
  const curtain = usePageCurtain();

  /** The opening has landed; the bar may show itself. */
  const [past, setPast] = useState(false);

  const cards = useMemo(() => decks.reduce((n, d) => n + deckCount(d), 0), [decks]);

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
          onSearch={() => window.dispatchEvent(new CustomEvent("blueberry:open-search"))}
        />
      </WindowChrome>

      {/* Screen one, and the opening is inside it.

          Gated on `loaded` because the swarm rasterises the site's display face
          and aims at a heading drawn in it, so starting before the fonts have
          settled would have it assemble the fallback face and then re-measure
          mid-flight.

          `onReady` only raises the bar. Nothing here moves the page: the way
          onward is the cue at the foot, which is the visitor's to press. */}
      {loaded && (
        <HomeHero
          decks={decks}
          settled={seenIntro}
          onReady={() => setPast(true)}
          onMore={() =>
            // The sheet turns over the jump, the same way it does over a real
            // navigation. Moving a whole screen inside one route is as large a
            // change as changing route, and a plain smooth-scroll of that
            // distance reads as the page having lurched rather than as having
            // gone somewhere.
            curtain(() =>
              boardRef.current?.scrollIntoView({ behavior: "auto", block: "start" }),
            )
          }
        />
      )}


      {/* Screen two: the board. */}
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
      {/* Lessons leads and takes the wide tile.

          It used to sit in the narrow slot beside Study Decks, which had the
          bento saying the cards were the product and the reading was a
          footnote. That is backwards: the cards are drill, and drilling
          something you have not understood yet is how people spend an evening
          and learn nothing. The reading is the part that has to come first, so
          it is the part that reads first. */}
      <BentoTile href="#/lessons" className="sm:col-span-2" berry="berry-with-leaves.webp">
        <BookOpen className="size-5 text-indigo-600 dark:text-indigo-300" />
        <span className="mt-4 flex items-center gap-1.5 text-xl font-semibold">
          Lessons <ArrowRight className="size-4 text-slate-400" />
        </span>
        <span className="mt-2 text-sm text-slate-500 dark:text-stone-400">
          The ideas behind the cards, and every reaction underneath them with its reagents,
          conditions and product.
        </span>
        {/* Reactions used to be a tile of its own. They are inside Lessons now,
            nested under the section they belong to, because a reaction split
            from the writing that explains it is a lookup table. */}
        <span className="mt-auto pt-4 font-mono text-xs text-slate-400 dark:text-stone-500">
          {courseSummary()} &middot; {REACTIONS.length} checked reactions
        </span>
      </BentoTile>

      <BentoTile href="#/study-decks" berry="berry-triple.webp">
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

      <BentoTile href="#/calendar" berry="berry-triple.webp">
        <CalendarDays className="size-5 text-indigo-600 dark:text-indigo-300" />
        <span className="mt-4 flex items-center gap-1.5 text-xl font-semibold">
          Calendar <ArrowRight className="size-4 text-slate-400" />
        </span>
        <span className="mt-2 text-sm text-slate-500 dark:text-stone-400">
          Exams, deadlines and labs for the term.
        </span>
        <span className="mt-auto pt-4 font-mono text-xs text-slate-400 dark:text-stone-500">
          CHEM241, Summer II
        </span>
      </BentoTile>

      <BentoTile href={TRAINER_URL} berry="berry-purple.webp">
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

      <BentoTile
        berry="berry-wet.webp"
        // The timer lives in the corner of every page, so this does not navigate
        // anywhere — it opens the thing that is already there.
        onClick={() => window.dispatchEvent(new CustomEvent("blueberry:open-focus"))}
      >
        <Timer className="size-5 text-indigo-600 dark:text-indigo-300" />
        <span className="mt-4 flex items-center gap-1.5 text-xl font-semibold">
          Focus <ArrowRight className="size-4 text-slate-400" />
        </span>
        <span className="mt-2 text-sm text-slate-500 dark:text-stone-400">
          Set your session and break, keep a task list, and get told to look 20 ft away every
          20 minutes for 20 seconds.
        </span>
        <span className="mt-auto pt-4 font-mono text-xs text-slate-400 dark:text-stone-500">
          Opens in the corner
        </span>
      </BentoTile>

      {/* The Break tile is gone. It only dispatched the event that opens the
          Focus card, which the Focus control in the corner already does from
          every page, so it was a tile spending a grid cell to duplicate a
          button. The break itself is untouched: it still lives inside the
          timer, which is where you come back from one rather than navigate to
          one. */}
    </div>
  </section>
);

export default HomePage;
