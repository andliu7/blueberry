import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
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
 * **This is not driven by scroll, and used not to be honest about that.** The
 * opening was built on `ContainerScroll` and read `scrollYProgress` for its
 * fades and for the panel that opens behind the mark. Once it moved inside a
 * fixed overlay the document stopped scrolling, so that value was pinned at 0:
 * the panel never opened and the cue said "scroll" about a gesture that did
 * nothing. Everything now runs off the same `ready` flag the canvas raises.
 *
 * Home is where someone goes to find a deck quickly, so this cannot become a
 * toll gate. The way out is on screen from the first frame, before any of the
 * animation has started, and Escape and Space both take it.
 */

/** The last word is the site's name, uppercased for the particle canvas. */
const SITE_WORD = SITE_NAME.toUpperCase();

/**
 * Colour reads left to right across each word. Indigo into fuchsia is the
 * gradient the rest of the site already uses on links and card edges, so the
 * opening arrives in the same palette rather than the demo's random RGB.
 */
const INTRO_WORDS: ParticleWord[] = [
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
  const reduce = useReducedMotion();
  const isDark = useIsDark();

  return (
    <div
      className={cn(
        "relative h-svh w-full overflow-hidden",
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
          <motion.div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            initial={{ clipPath: "inset(18% 12% 18% 12% round 420px)" }}
            animate={{
              clipPath: ready
                ? "inset(0% 0% 0% 0% round 0px)"
                : "inset(18% 12% 18% 12% round 420px)",
            }}
            transition={reduce ? { duration: 0 } : { duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
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
          </motion.div>
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
  );
}

export function HomeIntro({
  onSkip,
  onComplete,
  settled = false,
  autoAdvanceMs = 1200,
}: {
  onSkip: () => void;
  /**
   * Fired once the last word has settled and the shader has come up. The hub
   * uses it to start moving down to the decks; it never fires under reduced
   * motion, where the page is left where the visitor put it.
   */
  onComplete?: () => void;
  /** Time to wait after the opening settles before advancing automatically. */
  autoAdvanceMs?: number;
  /**
   * Already seen this visit, so show the finished picture rather than replaying
   * the sequence. The opening stays mounted either way, since the hub puts you
   * below it and it should still be there to scroll back up to.
   */
  settled?: boolean;
}) {
  const reduce = useReducedMotion();

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
  useEffect(() => {
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
  }, [onSkip]);

  // Nothing to wait for when the sequence is not going to run.
  const [ready, setReady] = useState(settled);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Nothing to hand off when the sequence did not play: the visitor is
    // already looking at the finished picture.
    if (!ready || reduce || settled) return;
    // Long enough for the shader's fade and the panel opening behind the mark
    // to finish, so the hand-off leaves from a settled frame rather than
    // cutting one short.
    const t = setTimeout(() => onCompleteRef.current?.(), autoAdvanceMs);
    return () => clearTimeout(t);
  }, [ready, reduce, settled, autoAdvanceMs]);

  // Nothing behind the opening should scroll while it plays. It is a full
  // viewport stage now rather than a tall column, so this is only guarding the
  // page underneath it.
  useEffect(() => {
    if (ready) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [ready]);

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
