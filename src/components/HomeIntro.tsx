import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { BlobReveal } from "@/components/BlobReveal/BlobReveal";
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
import {
  ContainerInset,
  ContainerScroll,
  ContainerSticky,
} from "@/components/ui/animated-video-on-scroll";

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
 * Colour reads left to right across each word. Indigo into fuchsia is the
 * gradient the rest of the site already uses on links and card edges, so the
 * opening arrives in the same palette rather than the demo's random RGB.
 */
/**
 * One beat. The swarm flies in, becomes the berry, holds just long enough to
 * be recognised — and pops. The title does not get spelled in particles any
 * more: it fades in as itself, type from the first frame, while the burst is
 * still in the air.
 *
 * This replaced a three-beat sequence (wordmark, berry, wordmark again landing
 * into the page), which was the previous replacement for a different
 * three-beat sequence. The verdict on both was the same: too long in front of
 * the one button that matters. A commercial front door gets one flourish, and
 * the flourish is the mascot arriving and bursting into the page.
 */
const INTRO_WORDS: ParticleWord[] = [
  { text: SITE_NAME, from: "#818cf8", to: "#f0abfc", shape: "blueberry", eyes: "open", holdMs: 1250 },
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
  // Indigo-700 to fuchsia-700, not the -300s this used to be. `#a5b4fc` and
  // `#f5d0fe` are pastels, and the opening's light background is `#f7eaff`,
  // which is also a pastel: the wordmark was one pale lilac on another and the
  // name was barely there. Reading the site's own name should not require
  // squinting, so the particles are now dark enough to carry the contrast
  // themselves rather than relying on the vignette behind them.
  // Saturation up, brightness barely down. Darkening alone walked every channel
  // toward black, which is what had taken the life out of it: the berry needs to
  // be more itself against the cream, not dimmer.
  {
    text: SITE_NAME,
    from: "#4f46e5",
    to: "#c026d3",
    shape: "blueberry",
    vivid: 1.25,
    shade: 1,
    eyes: "open",
    holdMs: 1250,
  },
];

/**
 * What the opening shows once it has already been seen this visit.
 *
 * The landing beat and nothing else, so the swarm assembles straight into the
 * page in about half a second. It used to be the centred wordmark, which meant
 * a returning visitor watched the name appear in the middle of the screen and
 * then had to be moved somewhere else before anything could be clicked. Now the
 * only beat is the one that puts the page together, and the whole thing is over
 * before a second visit notices it started.
 *
 * Separate module-level arrays rather than slices computed in the component:
 * `words` is an effect dependency on the canvas, and a fresh array on every
 * render would restart the sequence continuously.
 */
/**
 * A returning visitor gets no animation at all: the hero, immediately.
 *
 * The earlier design replayed a short landing on every visit. Cut, because a
 * repeat visitor is here to do something, and the professional read of a site
 * you use daily is that it opens ready. The pop is a first impression; a first
 * impression happens once a visit.
 */

function IntroStage({
  ready,
  onSettled,
  onSkip,
  hero,
  showCanvas,
}: {
  ready: boolean;
  onSettled: () => void;
  onSkip: () => void;
  /**
   * The hero itself, laid out inside the stage from the first frame.
   *
   * It is in the document from the first frame, transparent, because the swarm
   * needs somewhere to aim and `getBoundingClientRect` on a `display: none`
   * element is a box of zeroes.
   */
  hero?: React.ReactNode;
  /** Torn down once the hero has taken over; see `HomeIntro`. */
  showCanvas: boolean;
}) {
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;

  const words = isDark ? INTRO_WORDS : INTRO_WORDS_LIGHT;



  return (
    /**
     * `ContainerScroll` + `ContainerInset`, which is what this used before I
     * broke it and what it uses again.
     *
     * The pair is `useScroll({ target, offset })` feeding a `clipPath`, and it
     * worked for months. It stopped when the opening was moved inside a `fixed`
     * overlay, because the document underneath had stopped scrolling and the
     * progress value was pinned at 0 — a fault in where the component was put,
     * not in the component. I diagnosed that correctly and then, instead of
     * putting it back once the opening returned to the flow, replaced it with a
     * timer, then a scroll listener, then a frame loop, none of which worked.
     * The original does.
     */
    /**
     * Shorter than it was, and that is the conversion change rather than a
     * tidy-up.
     *
     * The opening was a 210vh column and the hero another 150vh below it, so
     * three and a half screens of wheel stood between arriving and reaching
     * anything you could press. They are one screen now. What is left of the
     * column is the room the panel needs to open into as you scroll, which is
     * the gesture worth keeping, and it is no longer the toll on the way to the
     * button.
     */
    <ContainerScroll className="h-[165vh]">
      <ContainerSticky
        className={cn(isDark ? "bg-[#171327]" : "bg-[#f7eaff]")}
      >
      <div className="absolute inset-0">
        {/* The pastel wash, under everything, in light mode only. The dark
            opening is built on near-black and every layer above it adds light;
            laying those over cream would wash the whole screen out. */}
        {/* Both themes now. This was `!isDark`, so dark mode had no gradient
            at all and fell back to the flat panel colour. The light variants
            bottom out in near-white and washed the dark opening out, which is
            why it was excluded; the fix is a dark variant, not an exclusion. */}
        <BackgroundGradientGlow variant={isDark ? "midnight-berry" : "aurora-dream"} />

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
            away from the particle colours rather than toward them.

            **And it leaves when the words do.** This wash guards the centred
            swarm during the animation; the landed page has its CTA and the
            mascot in exactly the space it darkens, and the measured verdict on
            keeping it was "the berry has too much overlay". The veil is the
            landed page's one legibility layer; this one is the animation's. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={false}
          animate={{ opacity: ready ? 0 : 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          style={{
            background: isDark
              ? "radial-gradient(64% 52% at 50% 48%, rgba(6,5,14,0.78) 0%, rgba(6,5,14,0.42) 58%, rgba(6,5,14,0) 100%)"
              : // A deep violet wash rather than white. The berry is lit from its
                // upper left and its own highlight is near-white, so a white
                // centre was hiding exactly the part that gives it form. Tinted
                // rather than grey so it still belongs to the pastel around it.
                // Lighter than it was, now that the particles carry their own
                // contrast. A dark wash behind dark type is two things fighting
                // for the same job and leaves the frame muddy.
                "radial-gradient(64% 52% at 50% 48%, rgba(49,29,94,0.34) 0%, rgba(76,45,130,0.18) 58%, rgba(124,58,237,0) 100%)",
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
          <ContainerInset
            className="absolute inset-0"
            insetYRange={[18, 0]}
            insetXRange={[12, 0]}
            roundednessRange={[420, 0]}
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
            {/* A photograph under the shader, one per theme.

                Two files rather than one dimmed image: the light and dark
                openings were shot to be different pictures, and tinting one to
                stand in for the other is how you get a dark mode that looks
                like a light mode with the lights off. Both are in the markup
                and CSS picks, because reading the theme in JS gives a
                wrong-coloured flash on first paint.

                `aria-hidden` and an empty alt: this is the backdrop to a title
                that already says what the page is. */}
            {/* The backdrop follows the pointer now.

                Two berry photographs stacked, with a blobby mask that reveals
                the lower one through the upper. Deliberately not the two intro
                photographs that used to be here: those are light and dark
                variants of the same shot, so in dark mode the blob would have
                revealed the picture already on screen and the effect would
                vanish. These two are theme-independent.

                It declines to run on touch, without WebGL2, and on a lost
                context, and shows the top image instead. See BlobReveal. */}
            <BlobReveal
              topSrc={`${import.meta.env.BASE_URL}backgrounds/berry-wet.webp`}
              bottomSrc={`${import.meta.env.BASE_URL}backgrounds/berry-purple.webp`}
              alt="Blueberries, close up."
              className="absolute inset-0 size-full"
            />
            <ShaderAnimation
              className={cn(
                // Over the photograph now, so it reads as light moving across
                // the picture rather than as the whole surface.
                "opacity-70",
                // Measured by looking at it: at full strength the inverted bands
                // go grey and muddy against the pastel, because multiply darkens
                // every channel of a background that is already pale. Half
                // opacity keeps the sweep legible as movement without turning
                // the panel into a smudge.
                !isDark &&
                  "opacity-80 [filter:invert(1)_hue-rotate(180deg)_saturate(1.6)_contrast(1.35)] mix-blend-multiply",
              )}
            />
          </ContainerInset>
          {/* A heavy black centre wash used to sit here, guarding a title that
              lived mid-screen. This block only fades in once the page has
              landed, and the landed page has the CTA in that exact spot — so
              all the wash ever did in practice was smoke up the one button
              that matters. The veil is the legibility layer now. */}
        </motion.div>
      </div>

      {/* The veil that makes the text readable.

          The backdrop under this is a photograph with a shader running over it,
          which is the right amount of interest for a screen with three words on
          it and far too much for one carrying a paragraph, a price promise and
          a button. So it steps back the moment the hero lands.

          Light and dark need opposite corrections, not one value flipped. On
          near-black the photograph is the brightest thing on screen and is held
          down with black. On the pale surface it is competing with a background
          that is already bright, and adding more black would only make it
          muddy, so it is lifted toward the page's own base colour instead. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[9]"
        initial={false}
        // Keyed on `ready` rather than on the canvas coming down, so the
        // backdrop steps back on the same beat the text arrives instead of a
        // second after it.
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{
          // Softer than it launched at. With the two centre washes gone this
          // is the only sheet between the photograph and the type, and at the
          // old strength it was doing their job as well as its own — the
          // verdict from looking at it was a berry sitting in smoke. If type
          // legibility suffers on a bright frame, brighten the bands in
          // `PageBackground`, do not thicken this back up.
          backgroundColor: isDark ? "rgba(9,7,18,0.44)" : "rgba(250,249,255,0.55)",
        }}
      />

      {/* Above the shader, not inside it: the canvas clears itself to
          transparent rather than painting a black background, which is what
          lets the last word keep standing there once the shader comes up.

          It unmounts once the hero has taken over, and that is a deliberate
          change of character rather than housekeeping. The opening used to stay
          mounted for the life of the page so you could scroll back up to it,
          which cost 4,200 particles stepping forever while you read. There is
          nothing to scroll back up to now: the swarm's last act is to become
          the hero, so what it would be replaying is the screen you are already
          looking at. */}
      {showCanvas && (
        /* The swarm fades, it does not vanish.

           The canvas used to unmount on a timer with no exit of its own, so a
           second after landing every particle disappeared in one frame while
           the real text was still fading up — the seam this whole design
           exists to hide, reintroduced at the last moment. Now the canvas
           cross-fades out over the same beat the hero fades in: for that
           second the particles and the type are both half-there, in the same
           shape, and there is no frame where either edge shows. */
        <motion.div
          className="absolute inset-0 z-10"
          initial={false}
          animate={{ opacity: ready ? 0 : 1 }}
          // Slower than the burst's own alpha fade, so the canvas never
          // visibly clips the flying pieces — they die on their own first.
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <ParticleTextEffect
            words={words}
            wordMs={1150}
            // `settleMs` is the time between the berry's hold expiring and the
            // pop. Short: the pop is the transition, and the visitor should be
            // reading the real page before curiosity about the animation runs
            // out — measured taste, roughly 2.5s arrival to button.
            settleMs={450}
            burst
            onFinished={onSettled}
            label={`Welcome to ${SITE_WORD}`}
          />
        </motion.div>
      )}

      {/* The hero, in the document from the first frame and invisible until the
          swarm has finished arriving on top of it. See the `hero` prop. */}
      {hero}

      {/* The way out, and it does not wait for anything.

          This used to live inside the block gated on `ready`, which meant the
          one instruction on screen appeared only after the animation it offered
          to skip had already played. Now it is up from the first frame, so the
          keys are known about while they are still worth pressing. No entrance
          animation for the same reason: a cue that fades in is a cue that is
          absent when it is most wanted. */}
      {/* Gone the moment the hero lands, because the hero puts a button and a
          social-proof line in exactly this space, and a leftover instruction to
          skip an animation that has finished would be sitting on top of them. */}
      {showCanvas && !ready && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-8 z-40 flex justify-center",
            isDark ? "text-white/45" : "text-slate-700",
          )}
        >
          <span className="font-mono text-[0.7rem] tracking-wide">
            Press Space or Esc to skip
          </span>
        </div>
      )}

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
        // Under the hero, not over it. It used to be z-30 with nothing above it
        // but the skip button, which was fine when the bottom of this screen
        // was empty. The hero puts the founding-seats line and the scroll cue
        // in exactly this 160px band, and a gradient ruled across them is not a
        // seam, it is a smudge over the social proof.
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-40"
        style={{
          backgroundImage: `linear-gradient(to bottom, transparent 0%, ${surface.base} 92%)`,
        }}
      />

      {/* Skip means "land now", not "leave".
          There is nowhere to leave to any more: the thing on the other side of
          the animation is this same screen with its contents up. So pressing it
          puts the contents up, immediately, and takes the swarm away. */}
      {showCanvas && !ready && (
        <button
          onClick={onSkip}
          className={cn(
            "absolute top-5 right-5 z-40 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold backdrop-blur transition-colors",
            isDark
              ? "border border-white/25 bg-black/30 text-white/90 hover:bg-black/50"
              : "border border-slate-900/15 bg-white/60 text-slate-700 hover:bg-white/85",
          )}
        >
          <X className="h-3.5 w-3.5" />
          Skip
        </button>
      )}
      </ContainerSticky>
    </ContainerScroll>
  );
}

export function HomeIntro({
  onComplete,
  settled = false,
  hero,
}: {
  /**
   * Fired once the berry has popped and the hero owns the screen.
   *
   * The name is literal: there is no second screen to be handed to, so this
   * reports that the opening is over rather than starting a journey.
   */
  onComplete?: () => void;
  /**
   * Already seen this visit: no animation at all, the hero immediately. A
   * repeat visitor is here to do something.
   */
  settled?: boolean;
  /** The hero. See the note on `IntroStage`'s prop of the same name. */
  hero?: React.ReactNode;
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
  const reduce = useReducedMotion();

  // A repeat visitor, or one who asked for stillness, opens on the finished
  // page: no swarm, no pop, nothing to wait through twice.
  const instant = settled || Boolean(reduce);

  const [ready, setReady] = useState(instant);

  /**
   * Whether the canvas is still mounted.
   *
   * It comes down after the burst has died, so the pop is never clipped by its
   * own container disappearing.
   */
  const [showCanvas, setShowCanvas] = useState(!instant);

  /** Skipping lands the hero at once and takes the swarm away with it. */
  const skip = useCallback(() => {
    setReady(true);
    setShowCanvas(false);
  }, []);

  useEffect(() => {
    if (!instant) return;
    setReady(true);
    setShowCanvas(false);
  }, [instant]);

  useEffect(() => {
    // Only while there is something to skip.
    //
    // The opening is a section of the home page rather than an overlay that
    // unmounts, so this listener would otherwise stay bound for as long as the
    // page is open — and Space is how people scroll. Pressing it halfway down
    // the board would have thrown them back to the top.
    if (ready) return;

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, [contenteditable='true']")) return;
      if (e.key === "Escape" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skip, ready]);

  /**
   * The canvas is disposed a second after the hero is up.
   *
   * Long enough that the particles are still there while the real text fades in
   * over them, which is what hides the seam between a swarm shaped like a
   * heading and the heading itself. Short enough that the simulation is not
   * still running while somebody reads.
   */
  useEffect(() => {
    if (!ready || !showCanvas) return;
    const t = setTimeout(() => setShowCanvas(false), 1500);
    return () => clearTimeout(t);
  }, [ready, showCanvas]);

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
    if (!ready) return;
    onCompleteRef.current?.();
  }, [ready]);

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
      showCanvas={showCanvas}
      hero={hero}
      onSettled={() => setReady(true)}
      onSkip={skip}
    />
  );
}

export default HomeIntro;
