"use client";

import { useRef } from "react";
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

/** Lab glassware arranged across the backdrop. */
const ART_LAYOUT: { motif: ArtMotif; className: string }[] = [
  { motif: "erlenmeyer", className: "left-[4%] top-[16%] w-40 md:w-64 -rotate-12" },
  { motif: "benzene", className: "right-[5%] top-[12%] w-44 md:w-72 rotate-6" },
  { motif: "reflux", className: "left-[14%] bottom-[8%] w-36 md:w-56 rotate-6" },
  { motif: "sepfunnel", className: "right-[12%] bottom-[6%] w-36 md:w-56 -rotate-6" },
];

function MotifArt({ motif, className }: { motif: ArtMotif; className: string }) {
  return (
    <svg
      aria-hidden
      viewBox={MOTIF_VIEWBOX}
      className={cn("absolute text-indigo-500/25 dark:text-amber-200/20", className)}
      dangerouslySetInnerHTML={{ __html: motifMarkup(motif) }}
    />
  );
}

export function HeroTitle({
  variant = "art",
  // Two deliberate lines rather than one string: BoldOnHover renders each
  // character as its own inline-block, so a single long title can break
  // mid-word on a narrow screen.
  titleLines = ["GRIGNARD LCTA", "MASTER LIST"],
  subtitle = "44 questions for the lab practical. Hide the answers, rate your recall, and drill until they stick.",
  ghostWord = "GRIGNARD",
}: {
  variant?: HeroVariant;
  titleLines?: string[];
  subtitle?: string;
  ghostWord?: string;
}) {
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
      className="sticky top-0 z-0 flex h-screen w-full items-center justify-center overflow-hidden px-6"
      aria-label="Title"
    >
      {/* Backdrop */}
      {variant === "art" ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
          {ART_LAYOUT.map((a) => (
            <MotifArt key={a.motif} motif={a.motif} className={a.className} />
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

      {/* Title block */}
      <motion.div style={motionStyle} className="relative z-10 flex flex-col items-center text-center">
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
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        style={reduce ? undefined : { opacity: cueOpacity }}
        className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-1"
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
    </section>
  );
}

export default HeroTitle;
