"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useIsDark } from "@/lib/useIsDark";
import { SURFACE } from "@/lib/hubSurface";

/**
 * Turns the whole screen like a page.
 *
 * One sheet, hinged on the left, swinging away to reveal what is underneath. No
 * book, no spine, no drag: a click, and the page you were on lifts off.
 *
 * Deliberately not `react-pageflip`. That library exists to run a multi-page
 * book with drag physics, spine geometry and page indices, and none of that is
 * wanted here. A single sheet turning is a `rotateY` under a `perspective`,
 * which is the same machinery the tilt cards already use, so this adds nothing
 * to the bundle.
 *
 * The sheet is the destination's own surface colour rather than a picture of
 * the page being left. Turning a real snapshot would mean rasterising the
 * document, which costs a library and a visible pause on a page this busy, and
 * the illusion does not need it: what sells a page turn is the edge and the
 * shadow raking across it, not the text on the back.
 *
 * The route changes at the start, behind the sheet, while it still covers
 * everything. Swapping halfway through would mean timing the change to the
 * frame where the sheet is edge on, and being a frame early shows the seam.
 */

type FlipTo = (href: string) => void;
/** Turn the sheet over an arbitrary move rather than over a route change. */
type FlipWith = (act: () => void) => void;

interface PageFlipApi {
  flipTo: FlipTo;
  flipWith: FlipWith;
}

const PageFlipContext = createContext<PageFlipApi>({
  flipTo: (href) => {
    window.location.hash = href.replace(/^#/, "");
  },
  flipWith: (act) => act(),
});

/** The route-changing half, which is what most callers want. */
export function usePageFlip(): FlipTo {
  return useContext(PageFlipContext).flipTo;
}

/**
 * The sheet, over something that is not a navigation.
 *
 * Home is one route with three screens on it, so moving from the hero to the
 * board changes no URL and `flipTo` has nothing to do. A jump that large inside
 * a page needs to be as obvious as a page turn or it reads as the page having
 * lurched — so the same sheet covers it, and the scroll happens behind it.
 */
export function usePageCurtain(): FlipWith {
  return useContext(PageFlipContext).flipWith;
}

export function PageFlipProvider({ children }: { children: ReactNode }) {
  const [flipping, setFlipping] = useState(false);
  const reduce = useReducedMotion();
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;

  const flipTo = useCallback<FlipTo>(
    (href) => {
      const target = href.replace(/^#/, "");
      // Already there: nothing to turn to.
      if (window.location.hash.replace(/^#/, "") === target) return;

      window.location.hash = target;
      if (reduce) return;
      setFlipping(true);
    },
    [reduce],
  );

  const flipWith = useCallback<FlipWith>(
    (act) => {
      // The move happens first, behind the sheet, for the same reason the route
      // change does: timing it to the frame where the sheet is edge on means
      // being a frame early shows the seam.
      act();
      if (reduce) return;
      setFlipping(true);
    },
    [reduce],
  );

  const value = useMemo(() => ({ flipTo, flipWith }), [flipTo, flipWith]);

  return (
    <PageFlipContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {flipping && (
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[200]"
            style={{ perspective: 1800 }}
          >
            <motion.div
              className="absolute inset-0 origin-left"
              style={{
                transformStyle: "preserve-3d",
                backgroundColor: surface.base,
                backgroundImage: surface.gradient,
              }}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: -108 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.78, ease: [0.36, 0, 0.2, 1] }}
              onAnimationComplete={() => setFlipping(false)}
            >
              {/* The rake. A page catches light along its hinge and falls into
                  shadow toward the free edge, and that gradient is most of what
                  makes a flat rectangle read as a turning sheet. */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 18%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.28) 88%, rgba(0,0,0,0.42) 100%)",
                }}
              />
              {/* The leading edge, so the sheet has a thickness rather than
                  ending in nothing. */}
              <div
                className="absolute inset-y-0 right-0 w-[3px]"
                style={{ background: "rgba(0,0,0,0.35)", filter: "blur(1px)" }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageFlipContext.Provider>
  );
}

export default PageFlipProvider;
