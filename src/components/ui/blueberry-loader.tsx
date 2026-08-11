import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { SURFACE } from "@/lib/hubSurface";
import { useIsDark } from "@/lib/useIsDark";
import { SITE_NAME } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The screen that holds the door shut while the opening gets itself ready.
 *
 * The name, and a blueberry that has not settled on its outline yet. It exists
 * because the hub used to arrive mid-stutter: the particle canvas, a WebGL
 * shader and an aurora all start on the same frame as the first paint, and the
 * opening's first beat was landing while the browser was still busy. A held
 * frame that is deliberately simple is better than an animated one that is
 * visibly late.
 *
 * Everything here is CSS and one div. No canvas, no WebGL, no dependency: the
 * thing that covers the load must not be part of the load. See `.berry-blob` in
 * `index.css` for the morph.
 */

/** The wordmark, uppercased, the same way the opening spells it. */
const SITE_WORD = SITE_NAME.toUpperCase();

/**
 * True once it is fair to start the opening.
 *
 * Two conditions, and both matter. **Fonts**, because the particle canvas
 * samples rendered text to decide where its particles go; sampling Times and
 * then re-sampling the real face a moment later is a visible re-flow of the
 * whole word. **A floor**, because on a warm cache everything above resolves in
 * 30ms, and a loading screen that appears and vanishes inside two frames reads
 * as a flicker or a bug rather than as a beat.
 *
 * `document.fonts` is missing on nothing current, but it is guarded anyway: the
 * failure mode without a guard is a door that never opens.
 */
export function useLoaderHold(minMs = 600) {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const floor = new Promise<void>((resolve) => setTimeout(resolve, minMs));
    const fonts = document.fonts?.ready ?? Promise.resolve();

    void Promise.all([floor, fonts]).then(() => {
      if (!cancelled) setHeld(true);
    });

    return () => {
      cancelled = true;
    };
  }, [minMs]);

  return held;
}

export function BlueberryLoader({ className }: { className?: string }) {
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;

  return (
    <motion.div
      // Its own surface rather than a transparent overlay, so there is never a
      // frame where the page underneath shows through half-built.
      className={cn("fixed inset-0 z-[60] flex flex-col items-center justify-center gap-9", className)}
      style={{ backgroundColor: surface.base, backgroundImage: surface.gradient }}
      role="status"
      aria-live="polite"
      // No entrance: it is the first thing painted, and fading it in would be a
      // blank frame in front of the screen whose whole job is to not be blank.
      // The exit is a fade because the opening underneath is already running by
      // then and a hard cut would throw away its first frames.
      initial={false}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <span
        className={cn(
          // Letter-spacing adds the gap after the last letter too, which walks
          // the word off centre by half a space. The negative margin takes it
          // back rather than leaving the wordmark visibly left of the blob.
          "title-face -mr-[0.42em] text-3xl tracking-[0.42em] uppercase sm:text-4xl",
          isDark ? "text-white/85" : "text-slate-700",
        )}
      >
        {SITE_WORD}
      </span>

      <div
        aria-hidden
        className="berry-blob relative h-16 w-16 sm:h-20 sm:w-20"
        style={{
          // The ramp the rest of the site uses on links and card edges, so the
          // loader arrives in the palette the opening is about to continue in.
          backgroundImage: "linear-gradient(135deg, #6366f1 0%, #d946ef 100%)",
          boxShadow: isDark
            ? "0 18px 50px -12px rgba(99,102,241,0.55)"
            : "0 18px 50px -14px rgba(99,102,241,0.45)",
        }}
      />

      <span className="sr-only">Loading {SITE_NAME}</span>
    </motion.div>
  );
}

export default BlueberryLoader;
