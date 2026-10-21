/**
 * The night sky behind the path (owner, 2026-10-17: "the stars should only
 * follow slightly. some shooting stars here and there and supernovas but as
 * you scroll it will follow very slowly. build it like andliu.dev resume
 * page").
 *
 * A port of andliu.dev's résumé sky (andliu-portfolio components/ui/stars.tsx,
 * same owner), changed in three ways for a long scrolling path:
 *  - It is fixed to the screen and follows the scroll very slowly (FOLLOW of
 *    the distance scrolled), instead of fading out over one section.
 *  - The stars are drawn in `currentColor`, so pathStars.css picks the colour
 *    per theme: soft violet on the light ground, near white at night.
 *  - The supernovas are a four-point star flash that closes to a red or blue
 *    glow with a slight ripple (owner, 2026-10-20); the look is in pathStars.css.
 *
 * How it stays cheap (from the original):
 *  - Each layer is ONE 1px element whose box-shadow draws every star, so the
 *    browser paints it once and then only moves it. The slow drift is a CSS
 *    keyframe on transform, so it runs on the compositor.
 *  - A layer is a 2000px tile with its own repeat drawn one tile below, so
 *    moving it by exactly one tile loops with no seam. The scroll follow wraps
 *    the same way.
 *  - The pointer lean uses motion's useSpring, and the scroll follow writes
 *    the transform straight to the DOM in one requestAnimationFrame, so React
 *    never re-renders per frame.
 *  - Shooting stars and pops are elements that play a CSS animation and then
 *    remove themselves.
 *  - Stars are generated in an effect after the first render.
 *  - With the tab hidden or under reduced motion (html[data-motion="reduced"])
 *    nothing runs: no drift, no follow, no shooting stars, no pops. Reduced
 *    motion shows two still supernova glows instead, so the sky keeps them.
 *
 * Decoration only: aria-hidden, pointer-events none.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import "./pathStars.css";

const TILE = 2000; // px, the height of one repeat of a layer
const LAYERS = [
  { count: 420, size: 1, speed: 1 },
  { count: 160, size: 2, speed: 2 },
  { count: 60, size: 3, speed: 3 },
] as const;
/** How far the sky moves per pixel scrolled. 0 would be pinned; 1 would scroll with the page. */
const FOLLOW = 0.07;
/** How far the sky leans from the pointer, as a fraction of its distance from the centre. */
const LEAN = 0.02;
/** Seconds for the slowest layer to drift one tile; the others take 2x and 3x. */
const DRIFT_S = 120;
/** A supernova leaves a red or a blue glow; pathStars.css holds the colours per theme. */
const POP_TONES = ["red", "blue"] as const;

function shadows(count: number): string {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 2600);
    const y = Math.floor(Math.random() * TILE);
    // No colour given, so each shadow takes the element's currentColor.
    out.push(`${x}px ${y}px`, `${x}px ${y + TILE}px`); // the tile and its repeat below
  }
  return out.join(",");
}

const reduced = () => document.documentElement.getAttribute("data-motion") === "reduced";
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function PathStars() {
  const rootRef = useRef<HTMLDivElement>(null);
  const followRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const [layers, setLayers] = useState<string[]>([]);
  // useMotionValue + useSpring: the pointer sets a target and the spring writes
  // the transform itself, without a React render per frame.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 50, damping: 20 });
  const sy = useSpring(y, { stiffness: 50, damping: 20 });

  useEffect(() => {
    setLayers(LAYERS.map((layer) => shadows(layer.count)));
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const follow = followRef.current;
    const fx = fxRef.current;
    if (!root || !follow || !fx) return;
    let raf = 0;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const live = () => !reduced() && !document.hidden;

    // The slow follow: the sky moves up FOLLOW px for every px scrolled,
    // wrapped at one tile so it can follow a path of any length.
    const place = () => {
      raf = 0;
      const shift = reduced() ? 0 : (window.scrollY * FOLLOW) % TILE;
      follow.style.transform = `translate3d(0, ${-shift}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };

    const spawn = (cls: string, style: Record<string, string>, ms: number) => {
      const el = document.createElement("span");
      el.className = cls;
      for (const [k, v] of Object.entries(style)) el.style.setProperty(k, v);
      fx.appendChild(el);
      window.setTimeout(() => el.remove(), ms);
      return el;
    };
    // A shooting star every 4 to 10 seconds, somewhere in the upper two thirds,
    // heading down-left or down-right at a shallow random angle.
    const shoot = () =>
      later(() => {
        if (live()) {
          const right = Math.random() < 0.5;
          spawn(
            "path-stars-shoot",
            { left: `${rand(10, 90)}%`, top: `${rand(4, 60)}%`, "--a": `${(right ? 1 : -1) * rand(18, 34)}deg`, "--len": `${rand(90, 170)}px` },
            1300,
          );
        }
        shoot();
      }, rand(4000, 10000));
    // A supernova every 8 to 18 seconds: a four-point star flashes and closes,
    // leaving a red or blue glow and one ripple. The four parts are empty <i>
    // elements, each animated by its own keyframe in pathStars.css; the whole
    // thing is gone after 2.8s, once the glow (0.45s delay + 2.2s) has faded.
    const pop = () =>
      later(() => {
        if (live()) {
          const el = spawn(
            "path-stars-pop",
            { left: `${rand(6, 94)}%`, top: `${rand(6, 88)}%`, "--s": `${rand(44, 80)}px` },
            2800,
          );
          el.dataset.tone = POP_TONES[Math.floor(Math.random() * POP_TONES.length)];
          el.innerHTML =
            '<i class="path-stars-bloom"></i><i class="path-stars-flash"></i><i class="path-stars-glow"></i><i class="path-stars-ripple"></i>';
        }
        pop();
      }, rand(8000, 18000));
    shoot();
    pop();

    // Lean away from the pointer, read from the window because the path's
    // content sits above the sky and would swallow the sky's own events.
    const onMove = (e: PointerEvent) => {
      if (reduced()) return;
      x.set(-(e.clientX - window.innerWidth / 2) * LEAN);
      y.set(-(e.clientY - window.innerHeight / 2) * LEAN);
    };
    // Pause the drift while the tab is hidden.
    const onVisible = () => root.toggleAttribute("data-off", document.hidden);

    place();
    onVisible();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [x, y]);

  return (
    <div ref={rootRef} className="path-stars" aria-hidden="true">
      <motion.div className="path-stars-lean" style={{ x: sx, y: sy }}>
        <div ref={followRef} className="path-stars-follow">
          {layers.map((shadow, i) => (
            <div key={i} className="path-stars-layer" style={{ animationDuration: `${DRIFT_S * LAYERS[i].speed}s` }}>
              <span className="path-stars-dots" style={{ width: LAYERS[i].size, height: LAYERS[i].size, boxShadow: shadow }} />
            </div>
          ))}
        </div>
      </motion.div>
      <div ref={fxRef} className="path-stars-fx" />
      {/* Reduced motion only (CSS shows them): two supernovas held as still glows. */}
      <span className="path-stars-still" data-tone="red" style={{ left: "14%", top: "52%" }} />
      <span className="path-stars-still" data-tone="blue" style={{ left: "78%", top: "64%" }} />
    </div>
  );
}
