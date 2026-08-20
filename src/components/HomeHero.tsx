import { useCallback, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { HomeIntro } from "@/components/HomeIntro";
import { Blueberry } from "@/components/ui/blueberry";
import { FoundingSeats } from "@/components/ui/founding-seats";
import type { ParticlePlacement } from "@/components/ui/particle-text-effect";
import { moodForProgress, type BerryMood } from "@/lib/berryMood";
import { reviewedCount } from "@/lib/progress";
import { deckCount, type Deck } from "@/data/types";
import { HERO, SITE_NAME } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The front door, and now the whole of it.
 *
 * There used to be two screens here: an opening that spelled the name in
 * particles across 210vh of column, and a hero one and a half screens below it
 * holding the wordmark and the mascot. Someone arriving had to sit through the
 * first and scroll past the second before reaching anything they could press.
 *
 * They are one screen. The swarm's last act is to assemble into this page: the
 * wordmark lands in the corner at the heading's own size, the berry lands on the
 * right where the mascot lives, and then the real elements fade up underneath
 * the particles that are already shaped like them. Nothing moves, nothing
 * scrolls, and about four seconds after arriving there is a button in the middle
 * of the screen.
 *
 * **What is being optimised here is the first decision, not the first
 * impression.** Every element is either saying what this is, showing what it
 * feels like, or asking for the one action. There is nothing else on it.
 */
export function HomeHero({
  decks,
  settled,
  onReady,
  onMore,
}: {
  /** For the mascot's face. See `heroMood`. */
  decks: Deck[];
  /** Already seen the opening this visit. */
  settled: boolean;
  /** The swarm has landed and the page below may show itself. */
  onReady: () => void;
  /** The cue at the foot was pressed. */
  onMore: () => void;
}) {
  const reduce = useReducedMotion();
  const markRef = useRef<HTMLHeadingElement>(null);
  const berryRef = useRef<HTMLDivElement>(null);

  /** The hero is transparent until the particles finish landing on top of it. */
  const [landed, setLanded] = useState(false);

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

  /**
   * Where the swarm lands, measured off the elements it is landing on.
   *
   * Read at the moment the beat starts and again on every resize, so a window
   * dragged wider mid-animation re-aims rather than assembling the page in the
   * shape the window used to be.
   *
   * Both drawings are anchored to the centre of their element's box rather than
   * to a text baseline. A baseline is the correct anchor and it is not
   * obtainable: the DOM will hand out a rect and computed styles, not the
   * distance from the top of a line box to the baseline of the face inside it.
   * The centre of a tight single line is within a few pixels of it, and a few
   * pixels is invisible under a cross-fade.
   */
  const placeHero = useCallback((canvas: DOMRect): ParticlePlacement | null => {
    const mark = markRef.current;
    const berry = berryRef.current;
    if (!mark || !berry) return null;

    const m = mark.getBoundingClientRect();
    const b = berry.getBoundingClientRect();
    if (m.width === 0 || b.width === 0) return null;

    const cs = getComputedStyle(mark);

    return {
      items: [
        {
          kind: "text",
          text: `${SITE_NAME.toLowerCase()}.`,
          x: m.left - canvas.left + m.width / 2,
          y: m.top - canvas.top + m.height / 2,
          fontSize: parseFloat(cs.fontSize),
          family: cs.fontFamily,
          weight: cs.fontWeight,
          letterSpacing: cs.letterSpacing,
        },
        {
          kind: "blueberry",
          x: b.left - canvas.left + b.width / 2,
          y: b.top - canvas.top + b.height / 2,
          // A shade under the box, because the drawing puts the calyx above the
          // body's centre and the 3-D mascot does not sit that high in its own
          // frame. Matching the boxes exactly left the particle berry visibly
          // taller than the thing it was becoming.
          size: Math.min(b.width, b.height) * 0.9,
          eyes: "open",
        },
      ],
    };
  }, []);

  return (
    <HomeIntro
      settled={settled}
      placeHero={placeHero}
      onComplete={() => {
        setLanded(true);
        onReady();
      }}
      hero={
        <HeroContent
          landed={landed}
          reduce={Boolean(reduce)}
          markRef={markRef}
          berryRef={berryRef}
          mood={heroMood}
          onMore={onMore}
        />
      }
    />
  );
}

/**
 * Three bands: what this is, the one thing to do, and the reason to believe it.
 *
 * Laid out as a column with the middle band taking the slack, so the button
 * finds the optical centre of whatever screen it is on rather than being nailed
 * to a percentage that is right on a laptop and wrong on a monitor.
 *
 * The whole block is in the document from the first frame at `opacity: 0`. It
 * has to be: the swarm aims at these elements, and a rect measured off
 * `display: none` is four zeroes.
 */
function HeroContent({
  landed,
  reduce,
  markRef,
  berryRef,
  mood,
  onMore,
}: {
  landed: boolean;
  reduce: boolean;
  markRef: React.RefObject<HTMLHeadingElement | null>;
  berryRef: React.RefObject<HTMLDivElement | null>;
  mood: BerryMood;
  onMore: () => void;
}) {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex"
      initial={false}
      animate={{ opacity: landed ? 1 : 0 }}
      // Slower than the swarm's last movement and started a beat into it, so
      // the particles are still in the shape of the heading while the heading
      // arrives underneath them. That overlap is the entire trick.
      transition={{ duration: 0.85, ease: "easeOut", delay: landed ? 0.1 : 0 }}
      // Nothing here is clickable until it is visible. A transparent button
      // over the middle of the opening would eat the first click of anyone
      // impatient enough to try.
      style={{ pointerEvents: landed ? "auto" : "none" }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pt-[7vh] pb-8 sm:px-10">
        {/* Band one: what we sell, and who is selling it. */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-6">
          <div className="lg:col-span-7">
            {/*
              Plain type, one solid colour, no gradient.

              The wordmark used to be a gradient-swept button that opened the
              dashboard. Both went. A gradient on the largest text on the page
              is the thing most likely to fail against a photograph, and this
              screen's stated problem was contrast; and a title that opens a
              panel is a second action competing with the only action that
              matters here.
            */}
            <h1
              ref={markRef}
              className="title-face text-6xl leading-[0.9] tracking-tight lowercase text-slate-900 sm:text-7xl lg:text-8xl dark:text-white"
            >
              {SITE_NAME.toLowerCase()}.
            </h1>

            {/* What you get, in one breath. Held to a narrow measure so it
                reads as a subtitle rather than as the start of an essay. */}
            <p className="mt-5 max-w-md text-base leading-relaxed font-medium text-slate-700 sm:text-lg dark:text-stone-200">
              {HERO.sell}
            </p>
          </div>

          {/* The mascot, and the line that gives him something to say.

              Sized in rem rather than by aspect ratio, so the box holds its
              place before the canvas arrives and the swarm is not aiming at an
              element that is about to resize under it. */}
          <div className="flex flex-col items-center gap-2 lg:col-span-5 lg:items-end">
            <div
              ref={berryRef}
              className="h-40 w-40 sm:h-48 sm:w-48 lg:h-56 lg:w-56 lg:me-4"
            >
              <Blueberry
                mood={mood}
                trackWindow
                interactive
                className="h-full w-full"
                label="Blueberry, the site's mascot. Drag to spin, click to poke."
              />
            </div>
            <p className="playful-face text-center text-2xl text-slate-800 sm:text-3xl lg:text-right dark:text-stone-100">
              {HERO.motto}
            </p>
          </div>
        </div>

        {/* Band two: the only thing being asked for.

            `flex-1` with a centred content and a little bottom padding, which
            puts the button a touch above the true middle. That is on purpose:
            the optical centre of a frame is above its geometric centre, and a
            button nailed to exactly 50% reads as having sagged. */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-[6vh]">
          <motion.a
            href="#/start"
            className={cn(
              "group inline-flex items-center gap-2.5 rounded-full px-9 py-4",
              "bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-lg font-semibold text-white",
              "shadow-[0_10px_40px_-8px_rgba(99,102,241,0.7)] transition-[filter,box-shadow] duration-300",
              "hover:brightness-110 hover:shadow-[0_14px_50px_-6px_rgba(217,70,239,0.75)]",
              "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:outline-none",
            )}
            // A slow breath rather than a pulse. The button is already the
            // brightest object on a quiet screen, so this only has to say it is
            // alive; a bouncing CTA says the site is worried you missed it.
            animate={reduce || !landed ? undefined : { scale: [1, 1.028, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            {HERO.cta}
            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.a>

          {/* Every clause removes one reason to hesitate. If a clause stops
              being true, it comes out rather than getting softened. */}
          <p className="text-sm font-medium text-slate-600 dark:text-stone-300">{HERO.ctaNote}</p>
        </div>

        {/* Band three: the reason to believe it, and the way onward.

            `FoundingSeats` renders nothing until the number it would show is
            real, so on a pre-launch build this band is the cue alone. */}
        <div className="flex flex-col items-center gap-5">
          <FoundingSeats />

          <button
            type="button"
            onClick={onMore}
            className="group flex min-h-11 cursor-pointer flex-col items-center gap-1 px-4 text-slate-600 transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none dark:text-stone-300 dark:hover:text-white"
          >
            <span className="font-mono text-[0.7rem] tracking-[0.2em] uppercase">
              Everything else
            </span>
            <motion.span
              animate={reduce ? undefined : { y: [0, 4, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="size-4" />
            </motion.span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default HomeHero;
