import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, animate, usePresence, useReducedMotion } from "motion/react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { SITE_NAME } from "@/data/site";
import type { TipLine } from "@/data/tips";
import { cn } from "@/lib/utils";

/**
 * The screen that holds the door shut while the page behind it gets ready.
 *
 * 28 Oct, owner: the berry-on-a-bar loader (a purple ball bouncing along a
 * horizontal line, then a violet splat) "looks really ugly" and was removed. In its
 * place: Bloom, hopping on the page ground, and as soon as the shader chunk
 * arrives the liquid-glass logo reveal (ui/liquid-glass-logo-reveal) takes over
 * and plays on a loop until the page is ready. The index.html boot loader (Bloom
 * and the count) is a separate screen and is untouched.
 *
 * **The thing that covers the load must not be part of the load.** So Bloom is
 * there at once, drawn from the entry bundle's own mark, and the glass is an
 * upgrade that arrives a moment later. It is never fetched at all with reduced
 * motion or without WebGL2: those get the still Bloom, and a plain fade out.
 *
 * Only transform and opacity are animated (test/blueberryLoader.test.ts reads
 * this file and checks).
 */

/** A load that is over inside this reads as instant, so it gets no loader at all. */
export const SHOW_AFTER_MS = 200;
/** The fade onto the page once it is ready. */
export const FADE_S = 0.18;
/** Reduced motion, or any move that should not animate. */
export const INSTANT = { duration: 0 } as const;

/** The site's ground in both themes (src/tokens.css). A canvas cannot read CSS variables. */
const GROUND_LIGHT = "#efeaf8";
const GROUND_DARK = "#101827";

/** The shader, as its own chunk: fetched only once the loader has been on screen. */
const GlassReveal = lazy(() =>
  import("@/components/ui/liquid-glass-logo-reveal").then((m) => ({ default: m.BlueberryGlassReveal })),
);

/** WebGL2 is there, checked without creating a context unless the browser has the API at all. */
function hasWebGL2(): boolean {
  if (typeof WebGL2RenderingContext === "undefined") return false;
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

/** Bloom on the spot: a small hop, or sitting still under reduced motion. */
function Hopper({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const hop = animate(el, { y: [0, -18, 0] }, { duration: 0.9, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.25 });
    return () => hop.stop();
  }, [reduced]);
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
      <div ref={ref} className="h-24 w-24">
        <BlueberryMark eyes mood="curious" className="h-full w-full" />
      </div>
    </div>
  );
}

/**
 * HOW IT KNOWS IT IS DONE: motion's `usePresence`. The parent removes the
 * loader inside <AnimatePresence> the moment the page is ready; usePresence is
 * the hook that lets a component see that removal (`isPresent` turns false)
 * and stay mounted until it calls `safeToRemove`. The page mounts UNDER this
 * opaque layer at that moment, and is only uncovered when the fade ends.
 */
export function BlueberryLoader({ className }: { className?: string }) {
  const [isPresent, safeToRemove] = usePresence();
  const reduced = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  // The latest safeToRemove, held so the finish effect below does not restart
  // if AnimatePresence hands over a new function mid-fade.
  const remove = useRef(safeToRemove);
  useEffect(() => {
    remove.current = safeToRemove;
  });

  const [dark] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  const ground = dark ? GROUND_DARK : GROUND_LIGHT;
  // The glass is an upgrade: decided once, after mount, so the first paint is just Bloom.
  const [glass, setGlass] = useState(false);
  useEffect(() => {
    if (!reduced && hasWebGL2()) setGlass(true);
  }, [reduced]);

  // A study tip, an app tip or a quote under the tile (owner, 20 Oct). The list is its own
  // chunk, fetched with import() when the loader appears, so the loader itself stays light.
  const [tip, setTip] = useState<TipLine | null>(null);
  const tipRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    let live = true;
    import("@/data/tips")
      .then((m) => {
        if (live) setTip(m.nextLine());
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (tip && tipRef.current) animate(tipRef.current, { opacity: [0, 1] }, reduced ? INSTANT : { duration: 0.2, ease: "easeOut" });
  }, [tip, reduced]);

  // Loading: undoes a half-run fade, for the rare page that starts loading again
  // before the last one had faded out.
  useEffect(() => {
    if (isPresent && rootRef.current) animate(rootRef.current, { opacity: 1 }, INSTANT);
  }, [isPresent]);

  // The finish: one fade, then let go. The only way out.
  useEffect(() => {
    if (isPresent) return;
    let live = true;
    const root = rootRef.current;
    const fade = root ? animate(root, { opacity: 0 }, reduced ? INSTANT : { duration: FADE_S, ease: "easeOut" }) : null;
    void Promise.resolve(fade).then(() => {
      if (live) remove.current?.();
    });
    return () => {
      live = false;
    };
  }, [isPresent, reduced]);

  return (
    <div
      ref={rootRef}
      // Its own opaque ground, so there is never a frame where the page
      // underneath shows through half-built. Busy until the page is ready;
      // once the fade starts it no longer takes a click, and it is removed
      // from the document the moment the fade ends, so it cannot hold focus.
      className={cn("fixed inset-0 z-[60] flex flex-col items-center justify-center", !isPresent && "pointer-events-none", className)}
      style={{ backgroundColor: ground }}
      aria-busy={isPresent}
    >
      <div
        role="progressbar"
        aria-label={`Loading ${SITE_NAME}`}
        aria-valuemin={0}
        aria-valuemax={100}
        {...(isPresent ? {} : { "aria-valuenow": 100, "aria-valuetext": "Loaded" })}
        className="relative h-[min(60vw,260px)] w-[min(60vw,260px)]"
      >
        <Hopper reduced={reduced} />
        {glass && (
          <Suspense fallback={null}>
            <GlassReveal
              loop
              speed={1.4}
              hold={0.4}
              look={dark ? "dark" : "light"}
              background={ground}
              logoColor={dark ? "#a89bf0" : undefined}
              plateColor={dark ? "#171f33" : undefined}
              className="absolute inset-0 h-full w-full"
              style={{ cursor: "default" }}
            />
          </Suspense>
        )}
      </div>

      {/* The tip, under the tile. Small and quiet: muted ink, no box. A quote carries its author and source. */}
      {tip && (
        <p ref={tipRef} className="mt-6 w-[min(24rem,calc(100vw-2rem))] text-center text-sm leading-snug text-muted-foreground" style={{ opacity: 0 }}>
          {tip.kind === "quote" ? `“${tip.text}”` : tip.text}
          {tip.author && (
            <span className="mt-1 block text-xs">
              {tip.author}, <cite className="not-italic">{tip.source}</cite>
            </span>
          )}
        </p>
      )}

      <span aria-live="polite" className="sr-only">
        {isPresent ? "" : `${SITE_NAME} has loaded`}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- the gate -- */

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
 * A Suspense boundary that covers its wait with Bloom, and lets the page out
 * only when the loader has faded.
 *
 * WHY A WRAPPER AND NOT JUST `fallback={<BlueberryLoader />}`. A fallback is
 * unmounted in the same commit the page arrives in, so it has no chance to
 * finish: the page would cut in mid-run, which is exactly the complaint. Here
 * the loader is a SIBLING of the boundary, drawn over it, and the fallback
 * only reports whether the boundary is waiting. When it stops waiting, the
 * page mounts underneath and the loader fades before it lets go.
 */
export function LoaderGate({ children, waiting = false }: { children?: ReactNode; waiting?: boolean }) {
  const [pending, setPending] = useState(false);
  const [late, setLate] = useState(false);
  // `waiting` is a wait the caller knows about that is not a chunk, such as the
  // #/app gate restoring a stored session (AppGate.tsx). Same loader, same delay.
  const busy = pending || waiting;

  useEffect(() => {
    if (!busy) {
      setLate(false);
      return;
    }
    const id = window.setTimeout(() => setLate(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [busy]);

  return (
    <>
      <Suspense fallback={<Pending onChange={setPending} />}>{children}</Suspense>
      <AnimatePresence>{busy && late && <BlueberryLoader key="loader" />}</AnimatePresence>
    </>
  );
}

export default BlueberryLoader;
