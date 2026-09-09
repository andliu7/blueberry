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
  // Cut out, not cropped. The source photographs are berries on bushes, so a
  // masked rectangle of one is mostly out-of-focus leaf, which is why the first
  // pass read as green haze rather than as fruit. These are keyed and clipped
  // to the berries themselves: see scripts beside the assets in
  // public/backgrounds, `cut-berry-*`.
  { src: "cut-berry-cluster-a.webp", depth: 0.010, top: "6%", left: "3%", size: 170, opacity: 0.34, blur: 3 },
  { src: "cut-berry-bunch.webp", depth: 0.017, top: "64%", left: "8%", size: 200, opacity: 0.38, blur: 2 },
  { src: "cut-berry-cluster-b.webp", depth: 0.026, top: "74%", left: "88%", size: 190, opacity: 0.4, blur: 2 },
  // Clear of the band from 60 to 88 percent across and 15 to 60 down: that is
  // the mascot, and a photographed berry behind the drawn one reads as a
  // mistake rather than as depth.
  { src: "cut-berry-wet.webp", depth: 0.038, top: "80%", left: "56%", size: 230, opacity: 0.42, blur: 1 },
  { src: "cut-berry-triple.webp", depth: 0.052, top: "2%", left: "90%", size: 240, opacity: 0.44, blur: 0 },
  { src: "cut-berry-triple.webp", depth: 0.068, top: "86%", left: "22%", size: 300, opacity: 0.5, blur: 0 },
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
          key={`${layer.src}-${layer.top}-${layer.left}`}
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
            // Lifted, because these sit on a dark ground and a flat photograph
            // on it reads as a smudge. Saturation and contrast are what make
            // them look like fruit sitting in the scene rather than a texture.
            filter: [
              layer.blur ? `blur(${layer.blur}px)` : "",
              "saturate(1.45) contrast(1.25) brightness(1.12)",
            ].filter(Boolean).join(" "),
          }}
        />
      ))}
    </div>
  );
}

export default BerryParallax;
