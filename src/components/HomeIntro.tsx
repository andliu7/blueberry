import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { BackgroundGradientGlow } from "@/components/ui/background-gradient-glow";
import { useIsDark } from "@/lib/useIsDark";
import { SURFACE } from "@/lib/hubSurface";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/data/site";
import {
  ParticleTextEffect,
  type ParticleWord,
} from "@/components/ui/particle-text-effect";

/**
 * The animated opening on the home page.
 *
 * A swarm of particles flies in from off screen, gathers into the site's name,
 * scatters, and comes back as the mark itself. Three beats, about two and a
 * half seconds, and then it hands the page over.
 *
 * It used to open on WELCOME and TO before reaching the name. Those two were
 * cut because neither carried anything: they were throat-clearing in front of
 * the one word that identifies the site, on a page people reload constantly.
 * What is left is the part worth watching, which is the swarm re-forming.
 *
 * The words used to be a scrambling `<h1>`. Particles replace it because the
 * hand-off between beats is the whole point: the same cloud becomes the next
 * thing, so it reads as one object changing rather than as headings swapped in
 * and out.
 *
 * Timing comes from the particle canvas rather than a chain of `setTimeout`s.
 * Both run off the same clock that way, so a tab left in the background pauses
 * the whole opening instead of letting the phase timers race ahead of an
 * animation that Chrome has stopped giving frames to.
 *
 * **The panel behind the mark is yours to open.** Scroll and it expands,
 * scroll back and it closes, stop and it waits. That was the original design,
 * it broke when the opening briefly lived inside a `fixed` overlay where
 * `scrollYProgress` was pinned at 0, and it was then replaced by a loop on a
 * timer that also threw the visitor at the next screen — which fixed the
 * symptom by deleting the interaction. The opening is an in-flow section of a
 * scrolling page again, so scroll position is a real number and the beat is
 * back in the visitor's hands. Nothing here moves the page on its own.
 *
 * Home is where someone goes to find a deck quickly, so this cannot become a
 * toll gate. The way out is on screen from the first frame, before any of the
 * animation has started, and Escape and Space both take it.
 */

/** The name, uppercased, for the accessible label and the settled state. */
const SITE_WORD = SITE_NAME.toUpperCase();

/**
 * What the swarm actually spells: lowercase, with a full stop.
 *
 * The particle canvas rasterises whatever string it is given, so case is a
 * typographic decision rather than a technical one. Lowercase reads quieter and
 * more deliberate at this size than the shouted version, and the full stop
 * gives the swarm somewhere to land — a single dense dot after a long word,
 * which is the last thing to resolve and the thing that makes it read as a
 * statement rather than a label.
 */
const INTRO_WORDMARK = `${SITE_NAME.toLowerCase()}.`;

/**
 * Colour reads left to right across each word. Indigo into fuchsia is the
 * gradient the rest of the site already uses on links and card edges, so the
 * opening arrives in the same palette rather than the demo's random RGB.
 */
const INTRO_WORDS: ParticleWord[] = [
  { text: INTRO_WORDMARK, from: "#818cf8", to: "#f0abfc", holdMs: 2400 },
  // The name scatters one last time and comes back as the mark itself. The
  // swarm carries the logo's own shading rather than the gradient the words
  // wear, so the berry arrives lit rather than flat.
  //
  // Then it scatters once more and comes back shy. Two beats rather than one,
  // because the berry arriving and the panel opening behind it used to happen
  // at the same instant and read as a single event; splitting them gives the
  // berry a moment of looking at you before it reacts to being looked at.
  { text: SITE_NAME, from: "#818cf8", to: "#f0abfc", shape: "blueberry", eyes: "open" },
  { text: SITE_NAME, from: "#818cf8", to: "#f0abfc", shape: "blueberry", eyes: "shut", blush: true },
];

/**
 * The same words, darkened, for the pastel opening.
 *
 * The dark palette is picked to glow on near-black, and the two lightest stops
 * in it are `#f0abfc` and `#f59e0b`. Laid over cream and pink those are close
 * enough to the background to disappear, so light mode gets the deeper end of
 * the same indigo-to-fuchsia ramp rather than a different palette.
 *
 * A separate module-level array for the same reason as SETTLED_WORDS below:
 * `words` is a canvas effect dependency, so building this in the render body
 * would restart the sequence on every frame.
 */
const INTRO_WORDS_LIGHT: ParticleWord[] = [
  { text: INTRO_WORDMARK, from: "#a5b4fc", to: "#f5d0fe", holdMs: 2400 },
  // Saturation up, brightness barely down. Darkening alone walked every channel
  // toward black, which is what had taken the life out of it: the berry needs to
  // be more itself against the cream, not dimmer.
  { text: SITE_NAME, from: "#4f46e5", to: "#c026d3", shape: "blueberry", vivid: 1.25, shade: 1, eyes: "open" },
  {
    text: SITE_NAME,
    from: "#4f46e5",
    to: "#c026d3",
    shape: "blueberry",
    vivid: 1.25,
    shade: 1,
    eyes: "shut",
    blush: true,
  },
];

/**
 * What the opening shows once it has already been seen this visit.
 *
 * The name, and nothing else. Not the full greeting, which nobody wants to sit
 * through twice in a visit, and not the berry either: the word is the thing that
 * reads instantly at a glance, and the swarm resolving into it is the whole
 * reason the opening is worth having at all.
 *
 * Separate module-level arrays rather than slices computed in the component:
 * `words` is an effect dependency on the canvas, and a fresh array on every
 * render would restart the sequence continuously.
 */
const SETTLED_WORDS: ParticleWord[] = [INTRO_WORDS[0]!];
const SETTLED_WORDS_LIGHT: ParticleWord[] = [INTRO_WORDS_LIGHT[0]!];

function IntroStage({
  ready,
  onSettled,
  onSkip,
  settled,
}: {
  ready: boolean;
  onSettled: () => void;
  onSkip: () => void;
  settled: boolean;
}) {
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;

  /**
   * How far through the opening's own scroll column you are, 0 to 1.
   *
   * The column is `h-[210vh]` and the stage inside it is `sticky`, so the stage
   * holds still on screen while the page scrolls past it — which is what turns
   * a scroll into a scrubber rather than into leaving.
   */
  const columnRef = useRef<HTMLDivElement>(null);

  /**
   * Progress, measured by hand rather than by `useScroll`.
   *
   * `useScroll({ target })` measures the element once and caches its offsets.
   * This column is mounted about six hundred milliseconds after the page —
   * the loader holds the door while fonts settle — so by the time the opening
   * exists, the measurement it took has already been invalidated by everything
   * that laid out around it. Observed: the value sat at 0 through the entire
   * column and the panel never moved, which is the same symptom as the fixed
   * overlay it was blamed on the first time.
   *
   * Reading `getBoundingClientRect` on each scroll is a cheap, boring answer
   * that cannot go stale: `top` is where the column starts relative to the
   * viewport, so `-top / (height - viewport)` is exactly how far through it we
   * are. Passive listener, and a `rAF` gate so a fast wheel does not queue a
   * layout read per event.
   */
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    /**
     * Asked of the browser directly rather than through `useReducedMotion`.
     *
     * Measured, on a machine whose `matchMedia('(prefers-reduced-motion:
     * reduce)').matches` is plainly `false`: the hook returned truthy, this
     * effect took its early return, no scroll listener was ever attached, and
     * the panel sat wide open through the whole column. The media query is the
     * actual question being asked, so it is the thing to ask.
     */
    const wantsLessMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (wantsLessMotion) {
      if (panelRef.current) panelRef.current.style.clipPath = "inset(0% 0% 0% 0% round 0px)";
      return;
    }

    /**
     * Measured every frame rather than on the scroll event.
     *
     * A `scroll` listener is the obvious way to do this and it did not work
     * here: attached to `window`, passive, and it simply never ran — the panel
     * held whatever value the first measurement gave it while the page scrolled
     * underneath. Rather than keep guessing at why, this reads the position on
     * a frame loop, which asks no questions about who dispatches what.
     *
     * The cost is one `getBoundingClientRect` per frame, which is a read of
     * values the compositor already has, on a page that is running a particle
     * canvas at sixty frames a second regardless. The write is skipped when the
     * string has not changed, so the style attribute is only touched when the
     * clip actually moves.
     */
    let frame = 0;
    let last = "";

    const tick = () => {
      frame = requestAnimationFrame(tick);

      const col = columnRef.current;
      const panel = panelRef.current;
      if (!col || !panel) return;

      const { top, height } = col.getBoundingClientRect();
      const travel = height - window.innerHeight;
      if (travel <= 0) return;

      // Opens over the first two thirds; the last third is scrolling away, and
      // an animation still finishing while you leave reads as the page lagging.
      const p = Math.min(1, Math.max(0, -top / travel / 0.66));
      const inY = (18 - 18 * p).toFixed(2);
      const inX = (12 - 12 * p).toFixed(2);
      const r = (420 - 420 * p).toFixed(1);
      const next = `inset(${inY}% ${inX}% ${inY}% ${inX}% round ${r}px)`;
      if (next === last) return;
      last = next;
      panel.style.clipPath = next;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);


  return (
    <div ref={columnRef} className="relative h-[210vh] w-full">
    <div
      className={cn(
        "sticky top-0 h-svh w-full overflow-hidden",
        isDark ? "bg-[#171327]" : "bg-[#f7eaff]",
      )}
    >
      <div className="absolute inset-0">
        {/* The pastel wash, under everything, in light mode only. The dark
            opening is built on near-black and every layer above it adds light;
            laying those over cream would wash the whole screen out. */}
        {!isDark && <BackgroundGradientGlow />}

        {/* Running from the first frame, under everything else. A flat opening
            gives a scroll nothing to move against, so the descent past the words
            reads as a jump; drifting colour gives the eye something that is
            plainly moving. Slow, and dim enough that the words still own the
            screen. Dimmer again on the pastel, which already carries colour of
            its own for the blobs to fight with. */}
        <AuroraBackground
          variant="default"
          speed={0.5}
          blobCount={5}
          className={cn("absolute inset-0", isDark ? "opacity-70" : "opacity-25")}
        />
        {/* Holds the middle of the screen away from whatever the aurora is doing
            under it, so the words never have to compete with a blob. It darkens
            on near-black and lightens on pastel: both are pulling the centre
            away from the particle colours rather than toward them. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: isDark
              ? "radial-gradient(64% 52% at 50% 48%, rgba(6,5,14,0.78) 0%, rgba(6,5,14,0.42) 58%, rgba(6,5,14,0) 100%)"
              : // A deep violet wash rather than white. The berry is lit from its
                // upper left and its own highlight is near-white, so a white
                // centre was hiding exactly the part that gives it form. Tinted
                // rather than grey so it still belongs to the pastel around it.
                "radial-gradient(64% 52% at 50% 48%, rgba(49,29,94,0.60) 0%, rgba(76,45,130,0.34) 58%, rgba(124,58,237,0) 100%)",
          }}
        />

        {/* Held back until the words have resolved, so the opening is a dark
            screen and a single line of text rather than both at once. */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        >
          {/* The panel opens on the same beat the shader fades up.

              This used to interpolate against scroll position and so never
              moved once the opening became a fixed overlay. Driving the clip
              path off `ready` restores the beat and ties it to the thing it
              was always describing: the mark has landed, so the window behind
              it opens out to full bleed. */}
          {/* You open it. That is the point.

              This was scroll-driven originally, and I broke it: the opening
              moved inside a `fixed` overlay, `scrollYProgress` was pinned at 0
              because the document underneath had stopped scrolling, and the
              panel never moved. I replaced it with a loop and an auto-advance,
              which fixed the symptom by removing the interaction — the panel
              opened and shut on a timer and then threw you at the next screen
              whether or not you had finished looking.

              The original reason it was broken is gone: the opening is an
              in-flow section of a scrolling page now, so scroll position is a
              real number again. Driving the clip path from it puts the beat
              back in the visitor's hands — scroll and it opens, scroll back and
              it closes, stop and it waits.

              Reduced motion gets it open and still, since the whole gesture is
              motion. */}
          <div
            ref={panelRef}
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ clipPath: "inset(18% 12% 18% 12% round 420px)" }}
          >
            {/* The same shader in both themes, inverted for the pastel one.
                It draws white bands on black, so on a light background it can
                only be a dark rectangle; `invert` turns it into dark bands on
                white and `hue-rotate` puts the colours back where they started,
                and `multiply` lets the gradient underneath show through instead
                of being covered.

                A static gradient sat here for a while, which was worse than it
                sounds: the panel still expanded, but into something identical to
                the background behind it, so the beat played and nothing
                appeared to happen. Keeping the real shader keeps the timing and
                the movement rather than approximating them. */}
            <ShaderAnimation
              className={cn(
                // Measured by looking at it: at full strength the inverted bands
                // go grey and muddy against the pastel, because multiply darkens
                // every channel of a background that is already pale. Half
                // opacity keeps the sweep legible as movement without turning
                // the panel into a smudge.
                !isDark &&
                  "opacity-80 [filter:invert(1)_hue-rotate(180deg)_saturate(1.6)_contrast(1.35)] mix-blend-multiply",
              )}
            />
          </div>
          {/* The shader runs to near-white in places, so the title needs
              something behind it. Strongest in the middle where the copy sits,
              clearing toward the edges so the animation is still the star. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: isDark
                ? "radial-gradient(58% 46% at 50% 46%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 100%)"
                : "radial-gradient(58% 46% at 50% 46%, rgba(49,29,94,0.52) 0%, rgba(76,45,130,0.28) 55%, rgba(124,58,237,0) 100%)",
            }}
          />
        </motion.div>
      </div>

      {/* Above the shader, not inside it: the canvas clears itself to
          transparent rather than painting a black background, which is what
          lets the last word keep standing there once the shader comes up. */}
      <div className="absolute inset-0 z-10">
        <ParticleTextEffect
          words={
            isDark
              ? settled
                ? SETTLED_WORDS
                : INTRO_WORDS
              : settled
                ? SETTLED_WORDS_LIGHT
                : INTRO_WORDS_LIGHT
          }
          // The two berry beats are the same silhouette, so the second scatter
          // reads as a change of expression rather than a new arrival, and it
          // does not need as long to land as a word does.
          wordMs={1150}
          settleMs={settled ? 600 : 1000}
          onFinished={onSettled}
          label={settled ? SITE_WORD : `Welcome to ${SITE_WORD}`}
        />
      </div>

      {/* The way out, and it does not wait for anything.

          This used to live inside the block gated on `ready`, which meant the
          one instruction on screen appeared only after the animation it offered
          to skip had already played. Now it is up from the first frame, so the
          keys are known about while they are still worth pressing. No entrance
          animation for the same reason: a cue that fades in is a cue that is
          absent when it is most wanted. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center",
          isDark ? "text-white/45" : "text-slate-500/85",
        )}
      >
        <span className="font-mono text-[0.7rem] tracking-wide">
          Press Space or Esc to skip
        </span>
      </div>

      {/* The seam.

          The opening's base colour is the page's base colour, so in theory the
          two meet invisibly. In practice they do not: the aurora, the shader
          and two radial washes all run to the opening's bottom edge and stop
          dead there, so the join reads as a bright line ruled across the screen
          — the lit half of the opening ending against the unlit page.

          This dissolves the decoration into the surface over the last 160px
          rather than cutting it. `to bottom` from nothing to the page's own
          base, which is why it is an inline style: the colour has to be the
          same value `SURFACE` hands the page, not an approximation of it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-40"
        style={{
          backgroundImage: `linear-gradient(to bottom, transparent 0%, ${surface.base} 92%)`,
        }}
      />

      <button
        onClick={onSkip}
        className={cn(
          "absolute top-5 right-5 z-20 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold backdrop-blur transition-colors",
          isDark
            ? "border border-white/25 bg-black/30 text-white/90 hover:bg-black/50"
            : "border border-slate-900/15 bg-white/60 text-slate-700 hover:bg-white/85",
        )}
      >
        <X className="h-3.5 w-3.5" />
        Skip
      </button>
    </div>
    </div>
  );
}

export function HomeIntro({
  onSkip,
  onComplete,
  settled = false,
}: {
  onSkip: () => void;
  /**
   * Fired once the last word has settled and the shader has come up. The hub
   * uses it to start moving down to the decks; it never fires under reduced
   * motion, where the page is left where the visitor put it.
   */
  onComplete?: () => void;
  /**
   * Already seen this visit, so show the finished picture rather than replaying
   * the sequence. The opening stays mounted either way, since the hub puts you
   * below it and it should still be there to scroll back up to.
   */
  settled?: boolean;
}) {

  /**
   * Escape or space leaves the opening, the same way the Skip button does.
   *
   * Bound to `onSkip` rather than to its own exit so there is one way out and
   * one place it can go wrong. Space is included because it is what people press
   * to move a page down, and on this screen that does nothing useful: the
   * opening is a fixed sticky stage, so a page-down lands you somewhere the
   * scroll sequence has not reached.
   *
   * Guarded on the target, or typing a space into the deck search underneath
   * would dismiss the opening from a field the visitor is looking at.
   */
  // Nothing to wait for when the sequence is not going to run.
  const [ready, setReady] = useState(settled);

  useEffect(() => {
    // Only while there is something to skip.
    //
    // The opening is a section of the home page now rather than an overlay that
    // unmounts, so this listener would otherwise stay bound for as long as the
    // page is open — and Space is how people scroll. Pressing it halfway down
    // the board would have thrown them back to the top.
    if (ready) return;

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, [contenteditable='true']")) return;
      if (e.key === "Escape" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip, ready]);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  /**
   * `onComplete` fires when the words have settled, and moves nothing.
   *
   * It used to start a timer and then scroll the page to the next screen on its
   * own. That is the behaviour that made the opening un-enjoyable: it opened,
   * shut and left while you were still watching it, and no amount of holding
   * still would keep you there. The page now says only that the sequence has
   * finished — the header may fade in, the panel is yours to open by scrolling
   * — and going onward is a scroll or the Skip button, both of which are the
   * visitor's to press.
   */
  useEffect(() => {
    if (!ready || settled) return;
    onCompleteRef.current?.();
  }, [ready, settled]);

  /**
   * The opening does not lock the page any more, and must not.
   *
   * It used to set `body { overflow: hidden }` while the sequence played, which
   * was right when it was an overlay covering everything: a flick of the wheel
   * then landed you in the middle of an empty column. It is a section of a
   * scrolling page now, and the lock had two problems.
   *
   * The small one is that it is wrong on principle — the opening is something
   * to scroll past, so taking scrolling away is taking away the way past it.
   *
   * The large one is that it did not come back. The cleanup restored whatever
   * `overflow` was when the effect ran, and with the intro permanently mounted
   * that value could be a `hidden` an earlier pass had set, so the page latched
   * shut and stayed shut. Measured: twenty seconds after the opening had
   * finished and handed over, `body.style.overflow` was still `hidden` and the
   * wheel did nothing.
   *
   * There is nothing to replace it with. Scrolling away early is a legitimate
   * thing to want, and Escape, Space and the Skip button are all still there
   * for anyone who would rather jump.
   */

  return (
    <IntroStage
      ready={ready}
      settled={settled}
      onSettled={() => setReady(true)}
      onSkip={onSkip}
    />
  );
}

export default HomeIntro;
