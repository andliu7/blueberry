import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A field of blueberries at different depths, drifting against the cursor.
 *
 * Nearer berries are larger, brighter and travel further; far ones are small,
 * dim and blurred and barely move. That difference is the whole effect, so the
 * table below is the design and the code under it is only plumbing.
 *
 * **The pointer never touches React state.** The version this was adapted from
 * called `setState` three times on every `mousemove` and then wrote the
 * transforms straight to the DOM anyway, so those three values had no reader:
 * every pointer move re-rendered the whole layer set to hand nobody a number.
 * Here the cursor lands in a ref and one animation frame writes the transforms,
 * which is the same output at none of the cost.
 *
 * It also eases toward the target rather than snapping to it. Reading the raw
 * pointer each frame makes the field twitch with the hand; a light follow makes
 * it feel like weight.
 *
 * Decorative only: `aria-hidden`, no pointer events, and silent under
 * `prefers-reduced-motion`, where it renders as a still composition.
 */

interface Layer {
  src: string;
  /** How far it travels against the cursor. Higher is nearer. */
  depth: number;
  top: string;
  left: string;
  /** Rendered width in pixels. */
  size: number;
  opacity: number;
  blur: number;
}

const LAYERS: Layer[] = [
  { src: "berry-purple.webp", depth: 0.010, top: "8%", left: "4%", size: 190, opacity: 0.14, blur: 5 },
  { src: "berry-triple.webp", depth: 0.016, top: "62%", left: "10%", size: 150, opacity: 0.16, blur: 4 },
  // Nothing sits in the band from roughly 60% to 88% across and 15% to 60% down:
  // that is where the mascot is, and a photographed berry behind the drawn one
  // reads as a mistake rather than as depth.
  { src: "berry-blueberry.webp", depth: 0.024, top: "72%", left: "86%", size: 240, opacity: 0.16, blur: 3 },
  { src: "berry-with-leaves.webp", depth: 0.034, top: "76%", left: "58%", size: 280, opacity: 0.18, blur: 2 },
  { src: "berry-wet.webp", depth: 0.048, top: "6%", left: "34%", size: 320, opacity: 0.16, blur: 2 },
  { src: "berry-5.webp", depth: 0.062, top: "78%", left: "30%", size: 420, opacity: 0.2, blur: 0 },
];

export function BerryParallax({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]"));
    // Target is where the cursor says to be; current eases toward it.
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    let running = false;
    let visible = true;

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX - window.innerWidth / 2;
      targetY = event.clientY - window.innerHeight / 2;
      start();
    };

    const frame = () => {
      if (!visible) {
        running = false;
        return;
      }
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      for (const node of nodes) {
        const depth = Number(node.dataset.depth);
        node.style.transform = `translate3d(${-x * depth}px, ${-y * depth}px, 0)`;
      }
      // Settled: stop the loop rather than burn frames holding still.
      if (Math.abs(targetX - x) < 0.4 && Math.abs(targetY - y) < 0.4) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    function start() {
      if (running || !visible) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
      if (visible) start();
    });
    io.observe(root);

    return () => {
      window.removeEventListener("pointermove", onMove);
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {LAYERS.map((layer) => (
        <img
          key={layer.src}
          data-depth={layer.depth}
          src={`${import.meta.env.BASE_URL}backgrounds/${layer.src}`}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute will-change-transform"
          style={{
            top: layer.top,
            left: layer.left,
            width: layer.size,
            opacity: layer.opacity,
            filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
            // Round, so a square photograph reads as fruit rather than a tile.
            maskImage: "radial-gradient(closest-side, black 58%, transparent 82%)",
            WebkitMaskImage: "radial-gradient(closest-side, black 58%, transparent 82%)",
          }}
        />
      ))}
    </div>
  );
}

export default BerryParallax;
