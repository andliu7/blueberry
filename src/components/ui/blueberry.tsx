import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { type BerryMood } from "@/lib/berryMood";
import { cn } from "@/lib/utils";

/**
 * The berry, on every page, without every page paying for three.js.
 *
 * One component with two renderings of the same character. The flat mark paints
 * on the first frame and costs nothing beyond what the site already ships; the
 * three-dimensional one replaces it once it has been earned. "Earned" is three
 * conditions, all of which have to hold:
 *
 * 1. **It is nearly on screen.** `lazy` splits the chunk but still fetches the
 *    moment the element renders, so a berry in a footer would pull 890 kB on
 *    page load and the split would buy nothing but an extra request.
 * 2. **WebGL exists.** Checked by asking for a context rather than sniffing the
 *    user agent, because the honest question is whether one can be made.
 * 3. **Motion is wanted.** Under `prefers-reduced-motion` this stays flat. A
 *    still 3-D berry is a heavier way to draw a picture that is already drawn.
 *
 * When any of those fails the flat mark is not a fallback, it is the answer:
 * both wear the same mood, so the page looks intended rather than degraded.
 *
 * The chunk is shared. The second page to ask for a berry gets it from cache,
 * which is what makes one-per-page affordable at all.
 */

const BlueberryBot3D = lazy(() =>
  import("@/components/ui/blueberry-bot-3d").then((m) => ({ default: m.BlueberryBot3D })),
);

/** Whether this browser can give us a WebGL context at all. Asked once. */
let webglMemo: boolean | null = null;
function hasWebGL() {
  if (webglMemo !== null) return webglMemo;
  try {
    const canvas = document.createElement("canvas");
    webglMemo = Boolean(
      canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"),
    );
  } catch {
    webglMemo = false;
  }
  return webglMemo;
}

export function Blueberry({
  mood = "curious",
  className,
  interactive = true,
  trackWindow = false,
  flat = false,
  label,
}: {
  /** Which face to wear. See `lib/berryMood`. */
  mood?: BerryMood;
  className?: string;
  /** Whether it answers the pointer: hover, poke, drag to spin. */
  interactive?: boolean;
  /**
   * Follow the cursor anywhere on the page rather than only over its own box.
   *
   * For the berry that is the subject of its screen. A berry tucked into the
   * corner of a folder page that swivels to watch you type elsewhere is a
   * distraction, so this is off by default.
   */
  trackWindow?: boolean;
  /** Force the flat mark, for places too small or too busy for a canvas. */
  flat?: boolean;
  /** Announced to screen readers in place of the drawing. */
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // `once` because the download does not want undoing, and a 400px margin so
  // the chunk is in flight before the berry is looked at rather than after.
  const near = useInView(ref, { once: true, margin: "400px" });

  /**
   * Held in state rather than read during render.
   *
   * `hasWebGL` touches the DOM, which a render pass should not do, and on the
   * server there is no `document` at all. Deciding in an effect also means the
   * first paint is always the flat mark, which is the point.
   */
  const [canUpgrade, setCanUpgrade] = useState(false);
  useEffect(() => {
    if (!near || reduce) return;
    setCanUpgrade(hasWebGL());
  }, [near, reduce]);

  const live = canUpgrade && !flat && !reduce;

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      role="img"
      aria-label={label ?? `Blueberry, looking ${mood}`}
    >
      {/*
        Both are mounted while the 3-D one is arriving, with the flat one
        underneath. The canvas fades in over it rather than replacing it, so
        there is no frame where the berry is missing — which is what a plain
        swap looks like on a slow connection.
      */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500",
          live ? "opacity-0" : "opacity-100",
        )}
      >
        <BlueberryMark eyes mood={mood} className="h-full w-full drop-shadow-xl" />
      </div>

      {live && (
        <Suspense fallback={null}>
          <div
            aria-hidden
            className="absolute inset-0 animate-[berry-arrive_600ms_ease-out_both]"
          >
            <BlueberryBot3D
              mood={mood}
              interactive={interactive}
              trackWindow={trackWindow}
              className="h-full w-full"
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}

export default Blueberry;
