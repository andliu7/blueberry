import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useMotionValue, usePresence, useReducedMotion, useTransform, type Transition } from "motion/react";
import { SITE_NAME } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The screen that holds the door shut while the page behind it gets ready.
 *
 * TWO COLOURS, ONE ANIMATION, owner 2026-10-01: "I want the bar to finish
 * before we get to the page ... like lando norris was creative and simple.
 * 2 colors one animation." The colours are the brand violet (--primary) and
 * the page ground (--background), both existing tokens, so dark mode comes
 * free. The one animation is a single story: the berry bounces along a bar
 * that creeps toward 90 percent, and when the page is ready the bar springs
 * full, the berry lands on the end, squashes, and splats into a violet disc
 * that covers the screen and then fades onto the page.
 *
 * The shaded sphere, its specular dot and its ground shadow are gone for the
 * same reason: three decorations on a screen that was asked for one idea.
 *
 * **It does not turn into the mascot mark.** That was tried and rejected: the
 * resolve asked the eye to watch a small event just before the real one. The
 * splat is not a resolve into the mark; it is the loader leaving.
 *
 * Still no canvas, no WebGL, no new dependency: the thing that covers the load
 * must not be part of the load. Only transform, opacity and clip-path are
 * animated (test/blueberryLoader.test.ts reads this file and checks).
 */

/* ------------------------------------------------------------ the timings -- */

/**
 * The bar's ceiling while nothing is known. Nothing in the browser reports how
 * far a lazy chunk has got, so the bar never claims a number: it creeps toward
 * 90 percent and only the real "ready" takes it the rest of the way.
 */
export const CREEP_TO = 0.9;
/** The creep is planned over 20 s, with a 2 s time constant (see `creep`). */
const CREEP_S = 20;
const CREEP_K = 10;

/**
 * The creep's easing: 1 - e^(-kt), normalised so it lands exactly on 1 at the
 * end of the run. With k = 10 over 20 s the time constant is 2 s, so the bar
 * reads about 57 percent at 2 s, 78 at 4 s and 86 at 6 s: fast enough that a
 * normal load looks like progress, slow enough that a long one never parks.
 */
export function creep(t: number): number {
  return (1 - Math.exp(-CREEP_K * t)) / (1 - Math.exp(-CREEP_K));
}

/**
 * The owner's reference spring (stiffness 210, damping 34, mass 0.9), played
 * twice as fast. Stiffness x4 and damping x2 keep the damping ratio at 1.24,
 * so the CURVE is the reference's own: overdamped, no overshoot past the end,
 * the same ease into rest. Only the clock changes. Measured with motion's own
 * spring generator, the reference takes 455 ms to read 99 percent from 0.75,
 * which alone would spend most of the finish budget on the bar; this takes 230.
 * It stops within 1 percent (under 3 px of rail, behind the berry) and snaps.
 */
export const FILL_SPRING = { type: "spring", stiffness: 840, damping: 68, mass: 0.9, restDelta: 0.01, restSpeed: 10 } as const;
/** The reference's reduced-motion path: no tween at all. */
export const INSTANT = { duration: 0 } as const;

/**
 * THE FINISH, about 690 ms on a typical load, and why each piece is that long.
 *
 *   bar to full   ~230 ms  the spring above from ~0.75; 170 ms from 0.9, and
 *                          315 ms from near zero, which is the worst case.
 *   squash          80 ms  one visible beat of the berry flattening on the
 *                          end. Shorter reads as a glitch, longer as a pause.
 *   splat disc     240 ms  ease-out, so it bursts and then settles, which is
 *                          what a splat does. Covers the farthest corner.
 *   open           140 ms  opacity to zero onto the page, already at rest.
 *
 * Inside the brief's 500 to 700 ms on a typical load, 770 at worst. It is not
 * cut further because the bar has to READ full before anything else happens.
 * These are main-thread clocks: a page that does heavy work in its first
 * frames stretches them, and the splat then simply covers that work.
 */
export const SQUASH_S = 0.08;
export const SPLAT_S = 0.24;
export const OPEN_S = 0.14;
/** Reduced motion, and a loader seen too briefly to deserve a splat: a fade. */
export const FADE_S = 0.15;

/**
 * A loader on screen for less than this gets the short finish (bar jumps full,
 * then a 150 ms fade) instead of the splat. A 650 ms flourish on top of a load
 * that took a third of that would make a fast page feel slow.
 */
export const SHORT_SHOW_MS = 400;

/* ------------------------------------------------------------- the hold -- */

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
    /**
     * Capped, because `document.fonts.ready` does not just wait for fonts: per
     * spec it also waits out the document's `load` event, so one slow
     * third-party script or image holds this screen hostage. Measured on the
     * Vercel preview: nine seconds of loader on a page whose fonts are
     * self-hosted and were long since decoded. The swarm re-measures itself
     * when the real face arrives, so the worst case after the cap is one
     * reflowed word, not a broken opening.
     */
    const cap = new Promise<void>((resolve) => setTimeout(resolve, 1200));
    const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), cap]);

    void Promise.all([floor, fonts]).then(() => {
      if (!cancelled) setHeld(true);
    });

    return () => {
      cancelled = true;
    };
  }, [minMs]);

  return held;
}

/* ------------------------------------------------------------- the finish -- */

/** The four moves the finish makes. Split out so the order can be tested. */
export type FinishSteps = {
  /** Take the bar to 1. Resolves when it reads full. */
  fill: (instant: boolean) => Promise<void>;
  /** Land the berry on the end and flatten it. */
  squash: () => Promise<void>;
  /** Grow the violet disc from the berry until it covers the screen. */
  splat: () => Promise<void>;
  /** Fade the whole layer onto the page. */
  open: (seconds: number) => Promise<void>;
};

/**
 * The finish, in order, and the only caller of `done`.
 *
 * `done` is what lets the page show (it is motion's safeToRemove), so the one
 * rule this function exists to keep is that nothing calls it before `fill`
 * has resolved: the page never appears while the bar reads less than full.
 * `short` is reduced motion, or a loader seen too briefly to deserve a splat.
 */
export async function runFinish(steps: FinishSteps, short: boolean, done: () => void): Promise<void> {
  await steps.fill(short);
  if (short) {
    await steps.open(FADE_S);
  } else {
    await steps.squash();
    await steps.splat();
    await steps.open(OPEN_S);
  }
  done();
}

/** The berry's bounce, unchanged from the CSS it replaces: 1.15 s, squash at the floor. */
const BOUNCE = {
  y: [0, -8, -46, -14, 0, 0],
  scaleX: [1.18, 0.94, 0.96, 0.98, 1.06, 1.18],
  scaleY: [0.78, 1.08, 1.05, 1.02, 0.92, 0.78],
};
const BOUNCE_TIMING: Transition = {
  duration: 1.15,
  times: [0, 0.18, 0.45, 0.62, 0.82, 1],
  ease: [0.28, 0, 0.55, 1],
  repeat: Infinity,
};

/** The rail's width, and how far the berry travels along it (rail minus berry). */
const RAIL = "min(18rem, 70vw)";
const TRAVEL = `(${RAIL} - 3.5rem)`;

/**
 * HOW IT KNOWS IT IS DONE: motion's `usePresence`. The parent removes the
 * loader inside <AnimatePresence> the moment the page is ready; usePresence is
 * the hook that lets a component see that removal (`isPresent` turns false)
 * and stay mounted until it calls `safeToRemove`. The page mounts UNDER this
 * opaque layer at that moment, and is only uncovered when the finish ends.
 * A motion value (`fill`) is a number motion updates every frame without
 * re-rendering React, which is why the creep costs no renders.
 */
export function BlueberryLoader({ className }: { className?: string }) {
  const [isPresent, safeToRemove] = usePresence();
  const reduced = useReducedMotion() ?? false;
  const fill = useMotionValue(0);
  const x = useTransform(fill, (v) => `calc(${v.toFixed(4)} * ${TRAVEL})`);
  const rootRef = useRef<HTMLDivElement>(null);
  const berryRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);
  // The latest safeToRemove, held so the finish effect below does not restart
  // if AnimatePresence hands over a new function mid-finish.
  const remove = useRef(safeToRemove);
  useEffect(() => {
    remove.current = safeToRemove;
  });

  // Loading: the creep and the bounce. Also undoes a half-run finish, for the
  // rare page that starts loading again before the last one had faded out.
  useEffect(() => {
    if (!isPresent) return;
    shownAt.current = performance.now();
    if (rootRef.current) animate(rootRef.current, { opacity: 1 }, INSTANT);
    if (discRef.current) animate(discRef.current, { clipPath: "circle(0px at 0px 0px)" }, INSTANT);
    const creeping = animate(fill, CREEP_TO, { duration: CREEP_S, ease: creep });
    const berry = berryRef.current;
    const bouncing = reduced || berry === null ? null : animate(berry, BOUNCE, BOUNCE_TIMING);
    return () => {
      creeping.stop();
      bouncing?.stop();
    };
  }, [isPresent, reduced, fill]);

  // The finish. Runs once the parent has let go, and is the only way out.
  useEffect(() => {
    if (isPresent) return;
    let live = true;
    const root = rootRef.current;
    const berry = berryRef.current;
    const disc = discRef.current;
    const short = reduced || performance.now() - shownAt.current < SHORT_SHOW_MS;
    const steps: FinishSteps = {
      fill: async (instant) => {
        const land = berry && !instant ? animate(berry, { y: 0, scaleX: 1, scaleY: 1 }, { duration: 0.16, ease: "easeIn" }) : null;
        await Promise.all([animate(fill, 1, instant ? INSTANT : FILL_SPRING), land]);
      },
      squash: async () => {
        if (berry) await animate(berry, { scaleX: 1.7, scaleY: 0.45 }, { duration: SQUASH_S, ease: "easeOut" });
      },
      splat: async () => {
        if (!berry || !disc) return;
        const b = berry.getBoundingClientRect();
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        const r = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
        const at = `at ${cx}px ${cy}px`;
        const from = `circle(${b.height / 2}px ${at})`;
        await animate(disc, { clipPath: [from, `circle(${r}px ${at})`] }, { duration: SPLAT_S, ease: [0.2, 0.8, 0.2, 1] });
      },
      open: async (seconds) => {
        if (root) await animate(root, { opacity: 0 }, { duration: seconds, ease: "easeOut" });
      },
    };
    void runFinish(steps, short, () => {
      if (live) remove.current?.();
    });
    return () => {
      live = false;
    };
  }, [isPresent, reduced, fill]);

  return (
    <div
      ref={rootRef}
      // Its own opaque ground, so there is never a frame where the page
      // underneath shows through half-built. Busy until the page is ready;
      // once the finish starts it no longer takes a click, and it is removed
      // from the document the moment the finish ends, so it cannot hold focus.
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center bg-background",
        !isPresent && "pointer-events-none",
        className,
      )}
      aria-busy={isPresent}
    >
      <div className="relative flex w-full flex-col items-stretch" style={{ maxWidth: RAIL }}>
        {/* The berry's frame travels with the bar; the berry bounces inside it.
            Two elements, so neither motion has to know about the other.
            Origin bottom, so the squash happens against the floor. */}
        <motion.div aria-hidden className="relative flex h-28 w-14 items-end" style={reduced ? undefined : { x }}>
          <div ref={berryRef} className="mb-1 h-14 w-14 origin-bottom rounded-full bg-primary" />
        </motion.div>

        {/* The bar. Indeterminate while loading, because nothing knows the real
            number; it states 100 only when it is true. The fill is scaleX from
            the left, never width, which would lay out every frame. */}
        <div
          role="progressbar"
          aria-label={`Loading ${SITE_NAME}`}
          aria-valuemin={0}
          aria-valuemax={100}
          {...(isPresent ? {} : { "aria-valuenow": 100, "aria-valuetext": "Loaded" })}
          className="relative mt-1 h-[3px] w-full overflow-hidden rounded-full bg-primary/15"
        >
          <motion.div className="absolute inset-0 origin-left rounded-full bg-primary" style={{ scaleX: fill }} />
        </div>
      </div>

      {/* The splat: the whole screen in violet, clipped to nothing until the
          berry lands. */}
      <div
        ref={discRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-primary"
        style={{ clipPath: "circle(0px at 0px 0px)" }}
      />

      <span aria-live="polite" className="sr-only">
        {isPresent ? "" : `${SITE_NAME} has loaded`}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- the gate -- */

/**
 * Below this, a lazy page gets no loader at all. A load that is over inside
 * a fifth of a second reads as instant, and covering it would only add the
 * finish on top. Warm-cache routes never suspend, so they never get here.
 */
export const SHOW_AFTER_MS = 200;

/**
 * The Suspense fallback, which draws nothing. It reports that the boundary is
 * waiting while it is mounted, and React unmounts it in the same commit that
 * puts the page in, which makes its cleanup the honest "ready" signal.
 */
function Pending({ onChange }: { onChange: (pending: boolean) => void }) {
  useEffect(() => {
    onChange(true);
    return () => onChange(false);
  }, [onChange]);
  return <div className="min-h-screen" />;
}

/**
 * A Suspense boundary that covers its wait with the berry, and lets the page
 * out only when the bar has finished.
 *
 * WHY A WRAPPER AND NOT JUST `fallback={<BlueberryLoader />}`. A fallback is
 * unmounted in the same commit the page arrives in, so it has no chance to
 * finish: the page would cut in mid-run, which is exactly the complaint. Here
 * the loader is a SIBLING of the boundary, drawn over it, and the fallback
 * only reports whether the boundary is waiting. When it stops waiting, the
 * page mounts underneath and the loader runs its finish before it lets go.
 */
export function LoaderGate({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(false);
  const [late, setLate] = useState(false);

  useEffect(() => {
    if (!pending) {
      setLate(false);
      return;
    }
    const id = window.setTimeout(() => setLate(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [pending]);

  return (
    <>
      <Suspense fallback={<Pending onChange={setPending} />}>{children}</Suspense>
      <AnimatePresence>{pending && late && <BlueberryLoader key="loader" />}</AnimatePresence>
    </>
  );
}

export default BlueberryLoader;
