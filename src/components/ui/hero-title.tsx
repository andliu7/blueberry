"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import BoldOnHover from "@/components/ui/bold-on-hover";
import { motifMarkup, MOTIF_VIEWBOX, type ArtMotif } from "@/data/testimonialArt";
import { cn } from "@/lib/utils";

/**
 * Full-viewport title page.
 *
 * Sticks to the top so the study cards scroll up over it like a curtain. The
 * effect comes from ordinary sticky positioning rather than the clip-path plus
 * position:fixed pairing in the reference component, which is harder to reason
 * about and fights the toolbar that also wants to stick.
 *
 * Scroll-linked motion uses motion/react to match the rest of the app; GSAP is
 * installed but running two scroll systems on one page is avoidable complexity.
 */

export type HeroVariant = "art" | "ghost";

/**
 * The right edge carries the reaction that lab actually performs rather than a
 * generic benzene ring, so the motif comes from the deck. The mascot tucks into
 * the corner as a small joke, the same on every deck.
 */
const artLayout = (motif: ArtMotif): { motif: ArtMotif; className: string; opacity: string }[] => [
  {
    motif,
    className: "right-[-4%] md:right-[3%] top-1/2 -translate-y-1/2 w-72 md:w-[24rem]",
    opacity: "text-indigo-500/20 dark:text-amber-200/15",
  },
  {
    motif: "mascot",
    className: "left-[2%] bottom-[4%] w-24 md:w-32 -rotate-6",
    opacity: "text-indigo-500/15 dark:text-amber-200/12",
  },
];

function MotifArt({
  motif,
  className,
  opacity,
}: {
  motif: ArtMotif;
  className: string;
  opacity: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox={MOTIF_VIEWBOX}
      className={cn("absolute", opacity, className)}
      dangerouslySetInnerHTML={{ __html: motifMarkup(motif) }}
    />
  );
}

export function HeroTitle({
  variant = "art",
  align = "left",
  // Two deliberate lines rather than one string: BoldOnHover renders each
  // character as its own inline-block, so a single long title can break
  // mid-word on a narrow screen.
  titleLines = ["GRIGNARD LCTA", "MASTER LIST"],
  subtitle = "44 questions for the lab LCTA. Hide the answers, rate your recall, and drill until they stick.",
  ghostWord = "GRIGNARD",
  motif = "attack",
  topLeft,
}: {
  variant?: HeroVariant;
  align?: "left" | "center";
  titleLines?: string[];
  subtitle?: string;
  ghostWord?: string;
  /** Backdrop illustration, normally the deck's own motif. */
  motif?: ArtMotif;
  /**
   * Corner slot, for a link out of this deck. Sits outside the title's motion
   * wrapper so it does not fade and shrink along with the heading, and the
   * curtain below covers it on its way past.
   */
  topLeft?: ReactNode;
}) {
  const leftAligned = align === "left";
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // 0 at rest, 1 once the hero has scrolled fully out of view.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const motionStyle = reduce ? undefined : { opacity, scale, y };

  return (
    <section
      ref={ref}
      className={cn(
        "sticky top-0 z-0 flex h-screen w-full items-center overflow-hidden px-6",
        leftAligned ? "justify-start" : "justify-center",
      )}
      aria-label="Title"
    >
      {topLeft && <div className="absolute left-6 top-6 z-20">{topLeft}</div>}

      {/* Backdrop */}
      {variant === "art" ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
          {artLayout(motif).map((a) => (
            <MotifArt key={a.motif} motif={a.motif} className={a.className} opacity={a.opacity} />
          ))}
        </div>
      ) : (
        <span
          aria-hidden
          className="ghost-word pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap"
        >
          {ghostWord}
        </span>
      )}

      {/* Title block. Shares the content column's measure so the hero and the
          cards below line up on the same left edge. */}
      <motion.div
        style={motionStyle}
        className={cn(
          "relative z-10 flex w-full max-w-5xl flex-col",
          leftAligned ? "mx-auto items-start text-left" : "items-center text-center",
        )}
      >
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight text-slate-900 dark:text-stone-100">
          {titleLines.map((line) => (
            <span key={line} className="block">
              <BoldOnHover
                text={line}
                initialWeight={700}
                hoverWeight={900}
                className="title-face cursor-default"
              />
            </span>
          ))}
        </h1>
        <p className="playful-face mt-6 max-w-xl text-base md:text-lg text-slate-600 dark:text-stone-300">
          {subtitle}
        </p>

        {/* Cue sits under the title when left-aligned, so the eye follows one
            column instead of jumping to the middle of the viewport. */}
        <motion.div
          style={reduce ? undefined : { opacity: cueOpacity }}
          className={cn(
            "mt-12 flex items-center gap-2",
            leftAligned ? "self-start" : "self-center flex-col gap-1",
          )}
        >
          <span className="playful-face text-sm text-slate-500 dark:text-stone-400">scroll</span>
          <motion.span
            animate={reduce ? undefined : { y: [0, 7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="text-slate-500 dark:text-stone-400"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.span>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default HeroTitle;
