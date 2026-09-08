import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

import { cn } from "@/lib/utils";

/**
 * Slot-machine text. Every character is a vertical reel of copies of itself
 * that spins a whole number of letter-heights and lands on the last one, so the
 * settled word is pixel-identical to the same text set plainly.
 *
 * Three deliberate departures from the component this was adapted from:
 *
 * **No `@gsap/react`.** `useGSAP` is `useLayoutEffect` plus a context revert.
 * `gsap` itself is already a dependency here and `ui/card-fan-carousel.tsx`
 * already drives it from a bare effect with its own cleanup, so this matches
 * the house pattern instead of adding a package to wrap four lines.
 * `useLayoutEffect` rather than `useEffect` because `--k` has to be set before
 * paint; otherwise the finished word flashes for a frame and then rolls.
 *
 * **No `!` modifiers.** The original carried `font-light!` and `leading-[0.8]!`
 * to out-rank an unlayered `h1,h2,h3,h4` rule in its project's `globals.css`.
 * This repo has no such rule, and `!important` on a heading would make the
 * component un-restyleable by whoever places it.
 *
 * **No full-bleed wrapper.** The original centred itself in a `min-h-dvh` grid,
 * which makes it a page rather than a heading. This renders as the heading it
 * is and lets the caller own the layout.
 */

/** Fraction of an em each reel step advances. Matches the cell height below. */
const LINE_HEIGHT = 0.8;

interface RollingTextProps {
  text?: string;
  textColor?: string;
  /** Heading level. Pick the one the surrounding document order calls for. */
  as?: "h1" | "h2" | "h3" | "h4" | "span";
  className?: string;
  /** Minimum whole letter-heights a character travels before landing. */
  minCycles?: number;
  /** Extra random cycles added on top of minCycles. */
  cycleVariance?: number;
  /** Base spin duration in seconds. */
  duration?: number;
  /** Extra random duration added per character, in seconds. */
  durationVariance?: number;
}

/**
 * Seeded PRNG. The reels need to differ from each other but not from render to
 * render, so the seed is the character's index rather than `Math.random`. The
 * original credited this to server/client agreement, which does not apply in a
 * client-rendered Vite app; the reason it still earns its place is that a
 * re-render must not reshuffle a reel mid-spin.
 */
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type ReelConfig = Required<
  Pick<RollingTextProps, "minCycles" | "cycleVariance" | "duration" | "durationVariance">
>;

const buildReel = (charIndex: number, config: ReelConfig) => {
  const rand = mulberry32(charIndex * 1013 + 7);
  const cycles = config.minCycles + Math.floor(rand() * config.cycleVariance);
  return {
    copies: cycles + 1,
    to: cycles,
    duration: config.duration + rand() * config.durationVariance,
  };
};

export function RollingText({
  text = "Everything else.",
  textColor,
  as: Heading = "h3",
  className,
  minCycles = 3,
  cycleVariance = 3,
  duration = 2.4,
  durationVariance = 1.2,
}: RollingTextProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const reels = gsap.utils.toArray<HTMLElement>("[data-reel]", root);
    const settle = (reel: HTMLElement) => reel.style.setProperty("--k", reel.dataset.to ?? "0");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reels.forEach(settle);
      return;
    }

    // Each reel tweens a plain object rather than the node, so the only thing
    // touched per frame is one custom property and the compositor does the rest.
    const tweens = reels.map((reel) => {
      const scroll = { k: 0 };
      reel.style.setProperty("--k", "0");
      return gsap.to(scroll, {
        k: Number(reel.dataset.to),
        duration: Number(reel.dataset.duration),
        ease: "expo.out",
        onUpdate: () => reel.style.setProperty("--k", String(scroll.k)),
      });
    });

    // Unmounting mid-spin would otherwise leave tweens writing to dead nodes.
    return () => tweens.forEach((t) => t.kill());
  }, [text, minCycles, cycleVariance, duration, durationVariance]);

  return (
    <Heading
      ref={containerRef}
      aria-label={text}
      style={textColor ? { color: textColor } : undefined}
      className={cn("m-0 whitespace-nowrap select-none", !textColor && "text-foreground", className)}
    >
      {text.split("").map((char, charIndex) => {
        if (char === " ") {
          return (
            <span key={charIndex} className="inline-block" aria-hidden>
              &nbsp;
            </span>
          );
        }

        const reel = buildReel(charIndex, { minCycles, cycleVariance, duration, durationVariance });

        return (
          <span key={charIndex} className="relative inline-block align-top" aria-hidden>
            {/* An invisible copy sets the cell box on its own, so the landed
                word occupies exactly the space plain text would. */}
            <span className="block invisible">{char}</span>

            <span className="absolute inset-0 overflow-hidden">
              <span
                data-reel=""
                data-to={reel.to}
                data-duration={reel.duration}
                className="block will-change-transform [transform:translate3d(0,calc(-1em*0.8*var(--k,0)),0)]"
              >
                {Array.from({ length: reel.copies }, (_, copy) => (
                  <span key={copy} className="block w-full text-center" style={{ height: `${LINE_HEIGHT}em` }}>
                    {char}
                  </span>
                ))}
              </span>
            </span>
          </span>
        );
      })}
    </Heading>
  );
}

export default RollingText;
