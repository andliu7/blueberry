import { useEffect, useState } from "react";
import { motion } from "motion/react";
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
      className={cn("fixed inset-0 z-[60] flex items-center justify-center", className)}
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
      {/* The slime, centred, and nothing else.

          The old version was two flat discs sliding along a rule — a diagram
          of a bounce. What makes this one read as a thing with volume is three
          cues, all cheap: a radial gradient lit from the upper left, a
          specular dot riding where the light hits, and a ground shadow that
          spreads when the ball lands and shrinks when it leaves. The squash
          and stretch are on the scale axes, so the shading deforms with the
          body the way a real drop deforms.

          The palette is the berry's own — this is the mascot before it has a
          face. Still no canvas, no WebGL, no dependency: the thing that covers
          the load must not be part of the load. */}
      <div aria-hidden className="relative flex h-28 w-24 items-end justify-center">
        {/* The shadow, breathing opposite the bounce. */}
        <div
          className="bb-slime-shadow absolute bottom-0 h-2.5 w-14 rounded-[100%]"
          style={{
            background: isDark
              ? "radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.55) 0%, transparent 75%)"
              : "radial-gradient(50% 50% at 50% 50%, rgba(49,29,94,0.35) 0%, transparent 75%)",
          }}
        />
        {/* The body. `origin-bottom` so squash happens against the floor,
            which is where a landing actually deforms a drop. */}
        <div
          className="bb-slime relative mb-1 h-14 w-14 origin-bottom rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 26%, #a5b4fc 0%, #6366f1 34%, #7c3aed 62%, #4c1d95 88%, #3b0d7a 100%)",
            boxShadow: isDark
              ? "inset -6px -8px 14px rgba(20,6,60,0.55), 0 4px 18px rgba(99,102,241,0.35)"
              : "inset -6px -8px 14px rgba(49,29,94,0.4), 0 4px 18px rgba(99,102,241,0.3)",
          }}
        >
          {/* The specular dot: the difference between a sphere and a circle. */}
          <div
            className="absolute top-[16%] left-[24%] h-3.5 w-2.5 -rotate-[24deg] rounded-full"
            style={{ background: "rgba(255,255,255,0.75)", filter: "blur(1px)" }}
          />
        </div>
      </div>

      {/* The only text, and only for screen readers, which get nothing at all
          from a blob. */}
      <span className="sr-only">Loading {SITE_NAME}</span>
    </motion.div>
  );
}

export default BlueberryLoader;
