import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { moodForDecks, type BerryMood } from "@/lib/berryMood";
import { isReducedMotion, useReducedMotionPref } from "@/lib/motionPref";
import { prefetchEntry } from "@/lib/entryChunks";
import { type Deck } from "@/data/types";
import { HERO, HOME_HEADLINE_FLIPS } from "@/data/site";

/**
 * The hero's stage: Bloom beside a live mechanism board (home round 2). Its own chunk, so the
 * board, its CSS and the code it needs are never in the entry. S2 round 2: phones get it too,
 * under the headline (critic: at 390 the first screen was text and a mascot, with the
 * strongest product art gone). React pattern: `lazy` splits the file out, and `<Suspense>`
 * renders nothing until it arrives (Bloom is already there, and the stage keeps its size).
 */
const HomeHeroBoard = lazy(() => import("@/components/HomeHeroBoard"));

/**
 * Beat 1, the hero (SITE-REPLAN.md section 7).
 *
 * Duolingo's logged-out first screen is the bar for clarity: one picture, one sentence, one
 * button, one quiet second door. The portfolio is the bar for how it arrives: the letters rise
 * in one by one, then the blocks under them, and the mascot bobs and hops when pressed.
 *
 * Layout: the stage is Bloom presenting a live mechanism board (HomeHeroBoard, lazy). On a
 * phone it sits between the headline and the sell line, small and tilted, so the first screen
 * holds the headline, the product working and the button. From 1024 px it is the right column.
 *
 * Source order is headline, then the sell line and buttons, then Bloom, so the button is the
 * first Tab stop in the hero and the toy comes after it (home round 2). The grid areas put
 * Bloom back beside the headline on screen; only the keyboard order changed.
 *
 * Motion is all CSS (src/components/home.css) except the hop, which is four keyframes through
 * the Web Animations API. Nothing here imports a motion library.
 *
 * `entered` comes from HomePage: true two frames after mount. Until then the letters sit in
 * their start positions, but only under full motion (the CSS keys the hidden state on
 * `html:not([data-motion="reduced"])`), so with reduced motion the text is there at first
 * paint. Everything under the headline is there at first paint in both modes (home round 2:
 * the portfolio's hero is readable by about 300 ms; ours waited 1.6 s for its blocks).
 */
export function HomeHero({ decks, entered }: { decks: Deck[]; entered: boolean }) {
  /** Bloom's face follows your progress across the decks (see `moodForDecks`). Memoised on
   *  the list, because it reads localStorage once per deck. */
  const mood = useMemo<BerryMood>(() => moodForDecks(decks), [decks]);

  return (
    <section className="home-hero" data-in={entered ? "" : undefined} aria-labelledby="home-title">
      {/* aria-label: the heading's name is line 1 alone, whatever line is showing, so a screen
          reader never hears the invisible size-holding copies (critic, S2 round 3). */}
      <h1 id="home-title" className="home-hero__title" aria-label={HOME_HEADLINE_FLIPS[0]}>
        <FlipHeadline lines={HOME_HEADLINE_FLIPS} />
      </h1>

      <div className="home-hero__rest">
        <p className="home-hero__sell">{HERO.sell}</p>
        <div className="home-hero__actions">
          {/* The one filled button on the screen. Into the entry gate, which says what the
              next two minutes hold before the first question (see EntryGate). */}
          <a
            href="#/enter"
            className="home-btn"
            // Warm the next screen's chunk before the press lands (src/lib/entryChunks.ts).
            onPointerEnter={prefetchEntry}
            onFocus={prefetchEntry}
            onTouchStart={prefetchEntry}
          >
            <span className="home-btn__face">{HERO.cta}</span>
            {/* The back face that rolls in on hover (motion.md item 3). A copy of the label
                for the eye only: the accessible name comes from the front face. */}
            <span className="home-btn__face home-btn__face--back" aria-hidden>
              {HERO.cta}
            </span>
          </a>
          <a href="#/signin" className="home-link">
            {HERO.haveAccount}
          </a>
        </div>
        <p className="home-hero__note">{HERO.ctaNote}</p>
      </div>

      <div className="home-hero__stage">
        <Suspense fallback={null}>
          <HomeHeroBoard />
        </Suspense>
        <Bloom mood={mood} />
      </div>
    </section>
  );
}

/** How long each headline line stays before it flips to the next, and how long the roll out takes. */
const FLIP_EVERY_MS = 4500;
const FLIP_OUT_MS = 380;

/**
 * The headline flips between the owner's lines (andliu.dev's FlipHeading, owner 15 Oct): the
 * letters roll up and out, then the next line's letters roll up into place. A tap or click flips
 * early. Every line is also laid out invisibly in the same grid cell, so the box is always as
 * tall as the longest line and nothing under it jumps. Screen readers hear the first line only.
 * Reduced motion: the lines still change, instantly, with no roll.
 */
function FlipHeadline({ lines }: { lines: readonly string[] }) {
  const reduced = useReducedMotionPref();
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);

  // One timer per line shown. `flip` reads the latest index through the setter, so the
  // effect does not need to restart when it changes.
  const flip = () => {
    if (leaving) return;
    if (reduced) return setIndex((i) => (i + 1) % lines.length);
    setLeaving(true);
    window.setTimeout(() => {
      setIndex((i) => (i + 1) % lines.length);
      setLeaving(false);
    }, FLIP_OUT_MS);
  };
  useEffect(() => {
    if (lines.length < 2) return;
    const id = window.setTimeout(flip, FLIP_EVERY_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when a new line shows
  }, [index, reduced]);

  return (
    <span className="home-flip" onClick={flip} data-out={leaving ? "" : undefined}>
      <span className="sr-only">{lines[0]}</span>
      {lines.map((line) => (
        <span key={line} className="home-flip__sizer" aria-hidden>{line}</span>
      ))}
      {/* key={index}: a new line mounts fresh letters, which play the roll-in from home.css. */}
      <span key={index} className="home-flip__line" data-flipped={index > 0 || undefined}>
        <SplitLetters text={lines[index]} />
      </span>
    </span>
  );
}

/**
 * The headline, one span per letter, each carrying its index as `--i`, and the letter count
 * as `--n` on the wrapper, so home.css can cap the whole stagger at 160 ms.
 * Letters are grouped by word in a no-wrap span so a line can only break between words.
 * The letters are hidden from screen readers, or the headline would be read out one letter at
 * a time; FlipHeadline gives them the sentence once.
 */
function SplitLetters({ text }: { text: string }) {
  let i = 0;
  const words = text.split(" ");
  const n = [...words.join("")].length;
  return (
    <>
      <span aria-hidden style={{ "--n": n } as CSSProperties}>
        {words.map((word, w) => (
          <span key={w}>
            <span className="home-word">
              {[...word].map((ch) => (
                <span key={i} className="home-c" style={{ "--i": i++ } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
            {w < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </>
  );
}

/** How high the hop goes, in px. About a fifth of the berry on a phone. */
const HOP_PX = 26;

/**
 * Bloom, the mascot. Idles with a slow bob (CSS) and hops when pressed.
 *
 * The hop is a port of the portfolio mascot's: andliu-portfolio
 * components/mascot/mascot.tsx:141-151, squash for the wind-up, rise stretched, land squashed,
 * settle, 700 ms. Its two per-keyframe cubic-beziers became the `ease-out` and `ease-in`
 * keywords, because a new curve outside tokens.css fails the token gate.
 * It starts on pointer down, so the press answers inside the 100 ms budget; a keyboard press
 * arrives as a click with `detail` 0 and hops from there.
 *
 * Reduced motion: no hop. Bloom changes face instead (cheer for 700 ms), which keeps the
 * meaning, "you poked me and I noticed", without moving.
 */
function Bloom({ mood }: { mood: BerryMood }) {
  const squash = useRef<HTMLSpanElement>(null);
  const [flash, setFlash] = useState<BerryMood | null>(null);

  const hop = () => {
    setFlash("cheer");
    window.setTimeout(() => setFlash(null), 700);
    if (isReducedMotion()) return;
    squash.current?.animate(
      [
        { transform: "translateY(0) scale(1, 1)" },
        { transform: "translateY(0) scale(1.2, .8)", offset: 0.18, easing: "ease-out" },
        { transform: `translateY(${-HOP_PX}px) scale(.88, 1.14)`, offset: 0.5, easing: "ease-in" },
        { transform: "translateY(0) scale(1.16, .84)", offset: 0.72 },
        { transform: "translateY(0) scale(.96, 1.04)", offset: 0.86 },
        { transform: "translateY(0) scale(1, 1)" },
      ],
      { duration: 700 },
    );
  };

  return (
    <button
      type="button"
      className="home-bloom"
      aria-label="Bloom, the Blueberry mascot. Press to make him hop."
      onPointerDown={hop}
      onClick={(e: MouseEvent) => {
        if (e.detail === 0) hop();
      }}
    >
      <span className="home-bloom__bob">
        <span ref={squash} className="home-bloom__squash">
          <BlueberryMark eyes mood={flash ?? mood} className="h-full w-full" />
        </span>
      </span>
    </button>
  );
}

export default HomeHero;
