import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useTransform } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { BackgroundGradientGlow } from "@/components/ui/background-gradient-glow";
import { useIsDark } from "@/lib/useIsDark";
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
  useScrollProgress,
} from "@/components/ui/animated-video-on-scroll";

/**
 * The animated opening on the hub.
 *
 * A black screen, and a swarm of particles that flies in from off screen to
 * spell WELCOME, scatters into TO, and gathers again into the site's name. Only
 * once that last word is standing still does the shader fade up behind it and
 * the scroll cue appear, and a beat after that the page carries itself down to
 * the decks.
 *
 * The words used to be a scrambling `<h1>`. Particles replace it because the
 * hand-off between words is the whole point of the opening: the same cloud
 * re-forms into the next word, so the three read as one thing changing rather
 * than three headings swapped in and out.
 *
 * Timing comes from the particle canvas rather than a chain of `setTimeout`s.
 * Both run off the same clock that way, so a tab left in the background pauses
 * the whole opening instead of letting the phase timers race ahead of an
 * animation that Chrome has stopped giving frames to.
 *
 * The hub is where someone goes to find a deck quickly, so this cannot become a
 * toll gate. Skip is on screen the whole time, including during the black
 * screen, and any scroll or key press cancels the automatic descent.
 */

/** The last word is the site's name, uppercased for the particle canvas. */
const SITE_WORD = SITE_NAME.toUpperCase();

/**
 * Colour reads left to right across each word. Indigo into fuchsia is the
 * gradient the rest of the site already uses on links and card edges, so the
 * opening arrives in the same palette rather than the demo's random RGB.
 */
const INTRO_WORDS: ParticleWord[] = [
  { text: "WELCOME", from: "#6366f1", to: "#d946ef" },
  { text: "TO", from: "#d946ef", to: "#f59e0b" },
  { text: SITE_WORD, from: "#818cf8", to: "#f0abfc" },
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
  { text: "WELCOME", from: "#818cf8", to: "#f0abfc" },
  { text: "TO", from: "#f0abfc", to: "#fbbf24" },
  { text: SITE_WORD, from: "#a5b4fc", to: "#f5d0fe" },
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
 * The name, then the berry. Not the full greeting — nobody wants to sit through
 * "welcome to" twice in one visit — but not the berry on its own either, which
 * is what this was and which made coming back to the hub feel like arriving at a
 * static image. Two beats keeps the thing that makes the opening worth having,
 * which is watching the swarm resolve into something.
 *
 * The berry beat is the shy one, the same frame the full sequence ends on, so
 * the page settles into the same picture either way.
 *
 * Separate module-level arrays rather than slices computed in the component:
 * `words` is an effect dependency on the canvas, and a fresh array on every
 * render would restart the sequence continuously.
 */
const SETTLED_WORDS: ParticleWord[] = [
  INTRO_WORDS[2]!,
  INTRO_WORDS[INTRO_WORDS.length - 1]!,
];
const SETTLED_WORDS_LIGHT: ParticleWord[] = [
  INTRO_WORDS_LIGHT[2]!,
  INTRO_WORDS_LIGHT[INTRO_WORDS_LIGHT.length - 1]!,
];

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
  const progress = useScrollProgress();
  const reduce = useReducedMotion();
  const isDark = useIsDark();
  const opacity = useTransform(progress, [0, 0.75, 1], [1, 1, 0]);
  const cueOpacity = useTransform(progress, [0, 0.12], [1, 0]);

  return (
    <ContainerSticky className={cn("overflow-hidden", isDark ? "bg-[#08060f]" : "bg-[#f7eaff]")}>
      <motion.div className="absolute inset-0" style={reduce ? undefined : { opacity }}>
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
          </ContainerInset>
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
      </motion.div>

      {/* Above the shader, not inside it: the canvas clears itself to
          transparent rather than painting a black background, which is what
          lets the last word keep standing there once the shader comes up. */}
      <motion.div
        className="absolute inset-0 z-10"
        style={reduce ? undefined : { opacity }}
      >
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
          // Trimmed again now there are five beats rather than four. The two
          // berry beats are the same silhouette, so the second scatter reads as
          // a change of expression rather than a new arrival, and it does not
          // need as long to land as a word does.
          wordMs={1150}
          settleMs={settled ? 600 : 1000}
          onFinished={onSettled}
          label={settled ? SITE_WORD : `Welcome to ${SITE_WORD}`}
        />
      </motion.div>

      {/* Sits below the middle of the canvas, where the word is drawn. */}
      <motion.div
        initial={false}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.6, delay: ready ? 0.3 : 0 }}
        style={reduce ? undefined : { opacity: ready ? cueOpacity : 0 }}
        className={cn(
          "pointer-events-none absolute inset-x-0 top-[64%] z-10 flex flex-col items-center gap-1",
          isDark ? "text-white/70" : "text-slate-500",
        )}
      >
        <span className="playful-face text-sm">scroll</span>
        <motion.span
          animate={reduce ? undefined : { y: [0, 7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </motion.div>

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
    </ContainerSticky>
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
  const reduce = useReducedMotion();
  // Nothing to wait for when the sequence is not going to run.
  const [ready, setReady] = useState(settled);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Nothing to hand off when the sequence did not play: the hub has already
    // put the visitor at the decks.
    if (!ready || reduce || settled) return;
    // Long enough for the shader's 1.1s fade to finish, so the descent starts
    // from the finished picture rather than interrupting it.
    const t = setTimeout(() => onCompleteRef.current?.(), 1200);
    return () => clearTimeout(t);
  }, [ready, reduce, settled]);

  // The page must not scroll while the black screen is playing, or a flick of
  // the wheel lands you in the middle of an empty 220vh column.
  useEffect(() => {
    if (ready) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [ready]);

  return (
    // Tall enough that the reveal has room to play, short enough that two
    // flicks of a trackpad clear it.
    <ContainerScroll className="h-[220vh]">
      <IntroStage
        ready={ready}
        settled={settled}
        onSettled={() => setReady(true)}
        onSkip={onSkip}
      />
    </ContainerScroll>
  );
}

export default HomeIntro;
