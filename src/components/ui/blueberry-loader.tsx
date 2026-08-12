import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { GooeyLoader } from "@/components/ui/loader-10";
import { SURFACE } from "@/lib/hubSurface";
import { useIsDark } from "@/lib/useIsDark";
import { SITE_NAME } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The screen that holds the door shut while the opening gets itself ready.
 *
 * The name, and two blobs running along a line. It exists because the hub used
 * to arrive mid-stutter: the particle canvas, a WebGL shader and an aurora all
 * start on the same frame as the first paint, and the opening's first beat was
 * landing while the browser was still busy. A held frame that is deliberately
 * simple is better than an animated one that is visibly late.
 *
 * **It does not turn into the berry.** It did for a while — the blob settled
 * into the mark before leaving, on the theory that the loader, the opening and
 * the mascot should read as one object arriving. It was a nice idea and it did
 * not feel right: the resolve asked the eye to watch a second small event
 * immediately before the real one, and the opening's swarm forming the berry is
 * a far better version of the same beat. The loader now does one thing and
 * hands over.
 *
 * Everything here is CSS and one SVG filter. No canvas, no WebGL, no new
 * dependency: the thing that covers the load must not be part of the load.
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

      {/* The site's own ramp rather than the component's shadcn defaults, so
          the loader is already wearing the palette the opening continues in.
          The line is dimmer on the dark surface, where a light rule reads as a
          bright bar across the screen rather than as a track. */}
      <GooeyLoader
        aria-hidden
        primaryColor="#6366f1"
        secondaryColor="#d946ef"
        borderColor={isDark ? "rgba(226, 232, 240, 0.18)" : "rgba(100, 116, 139, 0.28)"}
        className="text-base sm:text-lg"
      />

      <span className="sr-only">Loading {SITE_NAME}</span>
    </motion.div>
  );
}

export default BlueberryLoader;
