import { motion, useReducedMotion, useTransform } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import {
  ContainerAnimated,
  ContainerInset,
  ContainerScroll,
  ContainerSticky,
  useScrollProgress,
} from "@/components/ui/animated-video-on-scroll";

/**
 * The animated opening on the hub, shown once per visitor.
 *
 * The hub is where someone goes to find a deck quickly, so this cannot become a
 * toll gate. It shows on a first visit, then `HomePage` remembers and loads
 * straight to the decks with a small link to replay it. Skip is always there.
 */

/** Fades and lifts the whole panel away as the hub scrolls up behind it. */
function IntroStage({ onSkip }: { onSkip: () => void }) {
  const progress = useScrollProgress();
  const reduce = useReducedMotion();
  const opacity = useTransform(progress, [0, 0.75, 1], [1, 1, 0]);
  const cueOpacity = useTransform(progress, [0, 0.12], [1, 0]);

  return (
    <ContainerSticky className="flex flex-col items-center justify-center overflow-hidden">
      <motion.div className="absolute inset-0" style={reduce ? undefined : { opacity }}>
        {/* The shader is the backdrop, not the content, so it never takes
            pointer events away from the skip button above it. */}
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

      <motion.div
        className="relative z-10 flex flex-col items-center px-6 text-center"
        style={reduce ? undefined : { opacity }}
      >
        <ContainerAnimated animate="visible" whileInView={undefined}>
          <h1 className="title-face text-5xl leading-[1.02] font-bold tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.9)] sm:text-7xl">
            Home
          </h1>
        </ContainerAnimated>

        <ContainerAnimated
          animate="visible"
          whileInView={undefined}
          transition={{ delay: 0.15 }}
          inputRange={[0, 0.7]}
          outputRange={[60, 0]}
        >
          <p className="playful-face mx-auto mt-6 max-w-[46ch] text-lg text-white/85 drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] sm:text-xl">
            Flashcards for organic chemistry, built to make the memorising part a
            little more fun.
          </p>
        </ContainerAnimated>

        <motion.div
          style={reduce ? undefined : { opacity: cueOpacity }}
          className="mt-16 flex flex-col items-center gap-1 text-white/70"
        >
          <span className="playful-face text-sm">scroll</span>
          <motion.span
            animate={reduce ? undefined : { y: [0, 7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-5 w-5" />
          </motion.span>
        </motion.div>
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

export function HomeIntro({ onSkip }: { onSkip: () => void }) {
  return (
    // Tall enough that the reveal has room to play, short enough that two
    // flicks of a trackpad clear it.
    <ContainerScroll className="h-[220vh]">
      <IntroStage onSkip={onSkip} />
    </ContainerScroll>
  );
}

export default HomeIntro;
