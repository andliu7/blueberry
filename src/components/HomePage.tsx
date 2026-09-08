import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
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
import { MechanismBoard } from "@/components/ui/mechanism-board";
import { courseSummary } from "@/data/topics";
import { REACTIONS } from "@/data/reactions";
import { WindowChrome } from "@/components/ui/window-chrome";
import { SiteFooter } from "@/components/ui/site-footer";
import { HOME_SCENES, PageBackground } from "@/components/ui/page-background";
import { Testimonials } from "@/components/ui/testimonials";
import { SubscriptionPlans } from "@/components/ui/subscription-plans";
import { usePageCurtain } from "@/components/ui/page-flip";
import { useDecks } from "@/lib/useDecks";
import { hasSeenIntro, markIntroSeen } from "@/lib/intro";
import { deckCount } from "@/data/types";
import { TRAINER_URL } from "@/data/site";
import { RollingText } from "@/components/ui/rolling-text";


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

  /**
   * Past the first screen, by scroll. The app chrome - the morphing bar and
   * the photo credit - hangs off this rather than off the opening's landing:
   * a Dashboard button, a search field and a caption on the first paint had
   * the blind panel reading the pitch as an app screen, and every one of
   * those controls is for somebody who already knows what the site is.
   * Half a viewport, so the bar is dressed by the time the board can be
   * read, and scrolling back up undresses the pitch again.
   */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /**
   * While the visitor is on the unscrolled hero, the corner dock steps out
   * (see index.css). On <html> rather than component state because the dock
   * mounts outside App on purpose - it survives route changes - so a class
   * hook is the only line of communication that does not undo that.
   */
  useEffect(() => {
    const el = document.documentElement;
    if (scrolled) delete el.dataset.hero;
    else el.dataset.hero = "";
    return () => {
      delete el.dataset.hero;
    };
  }, [scrolled]);

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
      {/* Home's theme: one landscape per time of day, weather moving over it,
          and a caption naming the place when the place is known. */}
      <PageBackground scenes={HOME_SCENES} weather info={scrolled} />

      <AnimatePresence>{!loaded && <BlueberryLoader key="loader" />}</AnimatePresence>

      <Body loaded={loaded} seenIntro={seenIntro} scrolled={scrolled} />
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
  loaded,
  seenIntro,
  scrolled,
}: {
  loaded: boolean;
  seenIntro: boolean;
  /** Past the first screen; the chrome may dress the page. See HomePage. */
  scrolled: boolean;
}) {
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
      <WindowChrome decks={decks} visible={past && scrolled}>
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

      {/* The plans, directly under the praise — the classic order, because it
          is the order a decision actually happens in: what it is, what people
          say, what it costs. Until now pricing only existed inside the
          dashboard, which is exactly where somebody deciding whether to sign
          up has never been. */}
      <section aria-label="Plans" className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="title-face text-3xl sm:text-4xl">Plans</h2>
        <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-stone-400">
          Everything on the site today is free. The paid tier is for the parts that cost
          something to run.
        </p>
        <div className="mt-8">
          <SubscriptionPlans />
        </div>
      </section>

      <SiteFooter />

      <Dashboard dash={dash} />
    </>
  );
}

/**
 * The board: the game first, then everything that supports it.
 *
 * It used to be five tiles of equal weight, which said the site was five equal
 * things, and the only tile pointing at the game was a five-line box captioned
 * "A separate app, for now". That is the wrong emphasis for the one surface
 * nothing else here can imitate: reading a mechanism is not knowing it, and the
 * game is where a student stops reading and starts pushing electrons.
 *
 * So the game is the main box, two rows tall, and it does not describe itself
 * with an icon. It draws a mechanism, marks it, and names the step, because a
 * stranger who watches that for three seconds knows what this is in a way no
 * caption was going to get them to.
 *
 * The Concepts tile is retired into it. It never went anywhere the game tile
 * does not go, so keeping both would be two doors onto one room.
 *
 * Study Decks keeps a tile and loses no ground. Flashcards are what somebody
 * actually reaches for the night before, and the board is not allowed to lose
 * things. Lessons still reads before Study Decks for the reason it always did:
 * the cards are drill, and drilling something you have not understood yet is
 * how people spend an evening and learn nothing.
 *
 * Focus is the tile that is about stopping, and it is not a link: the timer
 * already lives in the corner of every page.
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
    {/* The title rolls into place when the board scrolls into view. The class
        stays `title-face` so it keeps the same serif as every other heading;
        only the way it arrives is different. */}
    <RollingText as="h2" text="Everything else" className="title-face text-3xl sm:text-4xl" />
    <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-stone-400">
      The part you draw yourself, the cards, the reading behind them, and the parts that tell
      you to stop for a minute.
    </p>

    {/* Three columns on a laptop, and the game takes four of the nine cells:
        two wide, two tall. The rest fills exactly, so the board has no hole in
        it. Lessons and Study Decks stack down the third column beside the game,
        and Calendar and Focus close the last row. */}
    <div className="mt-8 grid auto-rows-[minmax(11rem,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* The game.

          No berry in the corner, unlike every other tile: this is the one tile
          whose art is its content, and a photograph bleeding under the arrows
          would compete with the only picture on the board that a visitor is
          meant to read rather than feel.

          It opens in its own tab because the trainer is still a separate app,
          and the caption says so rather than pretending otherwise. */}
      <BentoTile href={TRAINER_URL} className="p-6 sm:col-span-2 sm:p-7 lg:row-span-2">
        {/* Reversed on a phone, so the drawing comes first and the words
            follow it. That is the order the Duolingo landing uses on a phone
            and it is the right one: a picture of the thing explains it faster
            than a sentence about the thing, and on a narrow screen only one of
            them can be on top. Side by side from the sm breakpoint up, text
            leading, which is the same left-column drop the front page settled
            on. */}
        <div className="flex flex-1 flex-col-reverse gap-6 sm:flex-row sm:items-center sm:gap-7">
          <div className="min-w-0 sm:flex-1">
            <span className="font-mono text-[0.7rem] tracking-[0.18em] text-indigo-600 uppercase dark:text-indigo-300">
              The game
            </span>

            {/* The tile's own headline, at the size the board can afford to
                give exactly one of them. Two short sentences: what you do,
                then what comes back. */}
            <h3 className="title-face mt-3 text-3xl leading-[1.06] tracking-tight sm:text-4xl">
              Draw the mechanism.
              <br />
              Get it marked.
            </h3>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-stone-300">
              Not multiple choice. You push every arrow yourself, and each step comes back
              named: right, right by another route, or the exact rule that broke.
            </p>

            {/* A span, not a button. The whole tile is already the link, and a
                button inside an anchor is invalid markup that browsers resolve
                by guessing. This is the affordance saying where the press
                lands, not a second control. */}
            <span className="bb-press mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-from to-brand-to px-6 py-3 text-base font-semibold text-white">
              Play a mechanism
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>

            {/* Honest about where the press goes. The trainer has not moved
                in yet, and a tile that hid that would be caught the moment a
                new tab opened. */}
            <span className="mt-5 block font-mono text-xs text-slate-400 dark:text-stone-500">
              Opens the mechanism trainer &middot; a separate app, for now
            </span>
          </div>

          <MechanismBoard className="w-full max-w-[15rem] shrink-0 self-center sm:w-[44%] sm:max-w-none lg:w-[46%]" />
        </div>
      </BentoTile>

      <BentoTile href="#/lessons" berry="berry-with-leaves.webp">
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

      <BentoTile href="#/calendar" berry="berry-triple.webp" className="lg:col-span-2">
        <CalendarDays className="size-5 text-indigo-600 dark:text-indigo-300" />
        <span className="mt-4 flex items-center gap-1.5 text-xl font-semibold">
          Calendar <ArrowRight className="size-4 text-slate-400" />
        </span>
        <span className="mt-2 max-w-md text-sm text-slate-500 dark:text-stone-400">
          Exams, deadlines and labs for the term.
        </span>
        <span className="mt-auto pt-4 font-mono text-xs text-slate-400 dark:text-stone-500">
          CHEM241, Summer II
        </span>
      </BentoTile>

      <BentoTile
        berry="berry-wet.webp"
        // The timer lives in the corner of every page, so this does not navigate
        // anywhere, it opens the thing that is already there.
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
