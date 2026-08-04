import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useTransform } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { AuroraBackground } from "@/components/ui/aurora-background";
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

/**
 * The last word is the site's name. It is "HOME" as a placeholder; change it
 * here and the opening follows.
 */
const SITE_WORD = "HOME";

/**
 * Colour reads left to right across each word. Indigo into fuchsia is the
 * gradient the rest of the site already uses on links and card edges, so the
 * opening arrives in the same palette rather than the demo's random RGB.
 */
const INTRO_WORDS: ParticleWord[] = [
  { text: "WELCOME", from: "#6366f1", to: "#d946ef" },
  { text: "TO", from: "#d946ef", to: "#f59e0b" },
  { text: SITE_WORD, from: "#818cf8", to: "#f0abfc" },
];

function IntroStage({
  ready,
  onSettled,
  onSkip,
}: {
  ready: boolean;
  onSettled: () => void;
  onSkip: () => void;
}) {
  const progress = useScrollProgress();
  const reduce = useReducedMotion();
  const opacity = useTransform(progress, [0, 0.75, 1], [1, 1, 0]);
  const cueOpacity = useTransform(progress, [0, 0.12], [1, 0]);

  return (
    <ContainerSticky className="overflow-hidden bg-[#08060f]">
      <motion.div className="absolute inset-0" style={reduce ? undefined : { opacity }}>
        {/* Running from the first frame, under everything else. A flat black
            opening gives a scroll nothing to move against, so the descent past
            the words reads as a jump; drifting colour gives the eye something
            that is plainly moving. Slow, and dim enough that the words still
            own the screen. */}
        <AuroraBackground
          variant="default"
          speed={0.5}
          blobCount={5}
          className="absolute inset-0 opacity-70"
        />
        {/* Keeps the middle of the screen dark whatever the aurora is doing
            under it, so the words never have to compete with a bright blob. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(64% 52% at 50% 48%, rgba(6,5,14,0.78) 0%, rgba(6,5,14,0.42) 58%, rgba(6,5,14,0) 100%)",
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
            <ShaderAnimation />
          </ContainerInset>
          {/* The shader runs to near-white in places, so the title needs
              something behind it. Darkest in the middle where the copy sits,
              clearing toward the edges so the animation is still the star. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(58% 46% at 50% 46%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 100%)",
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
          words={INTRO_WORDS}
          wordMs={1500}
          settleMs={1000}
          onFinished={onSettled}
          label={`Welcome to ${SITE_WORD}`}
        />
      </motion.div>

      {/* Sits below the middle of the canvas, where the word is drawn. */}
      <motion.div
        initial={false}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.6, delay: ready ? 0.3 : 0 }}
        style={reduce ? undefined : { opacity: ready ? cueOpacity : 0 }}
        className="pointer-events-none absolute inset-x-0 top-[64%] z-10 flex flex-col items-center gap-1 text-white/70"
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
        className="absolute top-5 right-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-3 py-1.5 text-sm font-semibold text-white/90 backdrop-blur transition-colors hover:bg-black/50"
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
}: {
  onSkip: () => void;
  /**
   * Fired once the last word has settled and the shader has come up. The hub
   * uses it to start moving down to the decks; it never fires under reduced
   * motion, where the page is left where the visitor put it.
   */
  onComplete?: () => void;
}) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!ready || reduce) return;
    // Long enough for the shader's 1.1s fade to finish, so the descent starts
    // from the finished picture rather than interrupting it.
    const t = setTimeout(() => onCompleteRef.current?.(), 1200);
    return () => clearTimeout(t);
  }, [ready, reduce]);

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
      <IntroStage ready={ready} onSettled={() => setReady(true)} onSkip={onSkip} />
    </ContainerScroll>
  );
}

export default HomeIntro;
