import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { Blueberry } from "@/components/ui/blueberry";
import { useReducedMotionPref } from "@/lib/motionPref";
import { prefetchEntry } from "@/lib/entryChunks";
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
 * in one by one, then the blocks under them, and the mascot bobs and spins when dragged.
 *
 * Layout: the stage is Bloom presenting a live mechanism board (HomeHeroBoard, lazy). On a
 * phone it sits between the headline and the sell line, small and tilted, so the first screen
 * holds the headline, the product working and the button. From 1024 px it is the right column.
 *
 * Source order is headline, then the sell line and buttons, then Bloom, so the button is the
 * first Tab stop in the hero and the toy comes after it (home round 2). The grid areas put
 * Bloom back beside the headline on screen; only the keyboard order changed.
 *
 * Motion is all CSS (src/components/home.css); the 3D Bloom (ui/blueberry.tsx) animates himself.
 *
 * `entered` comes from HomePage: true two frames after mount. Until then the letters sit in
 * their start positions, but only under full motion (the CSS keys the hidden state on
 * `html:not([data-motion="reduced"])`), so with reduced motion the text is there at first
 * paint. Everything under the headline is there at first paint in both modes (home round 2:
 * the portfolio's hero is readable by about 300 ms; ours waited 1.6 s for its blocks).
 */
export function HomeHero({ entered }: { entered: boolean }) {
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
        <Bloom />
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

/**
 * Bloom, the mascot: the 3D berry again (owner, 2026-10-17: "the website needs the 3D
 * blueberry ... it should just replace the current blueberry and be smaller than it was").
 * The live site's hero drew him large; here he keeps the flat Bloom's place and size at the
 * board's corner. `Blueberry` brings his own drag to spin and press to poke, and falls back to
 * the flat mark with no WebGL or under reduced motion (ui/blueberry.tsx), so the hop this
 * replaced is gone. The slow bob is still CSS (home.css .home-bloom__bob), and it no longer
 * rocks him: he stands upright.
 *
 * Always `curious`, never the deck-progress mood (owner, same day: "upright and follow mouse
 * in awe"). Curious is the one mood that tracks the cursor across the whole window, and its
 * eyes widen and its jaw drops the further away you point (blueberry-bot-3d.tsx, the gawk).
 */
function Bloom() {
  return (
    <div className="home-bloom">
      <span className="home-bloom__bob">
        <Blueberry
          mood="curious"
          trackWindow
          interactive
          className="h-full w-full"
          label="Bloom, the Blueberry mascot. Drag to spin him, press to poke."
        />
      </span>
    </div>
  );
}

export default HomeHero;
