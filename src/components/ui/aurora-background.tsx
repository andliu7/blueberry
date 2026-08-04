"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Slow drifting blobs of colour on a canvas, for use as a page backdrop.
 *
 * Adapted from the supplied component. What changed and why:
 *
 * 1. **It renders at a fraction of the display size.** The original filled the
 *    whole canvas with a radial gradient seven times per frame. At a 1900x1000
 *    viewport that is thirteen million pixels of gradient every frame, which is
 *    a lot of work to produce an image whose entire content is soft edges.
 *    Drawing at 40% and letting CSS stretch it back is roughly six times cheaper
 *    and, on shapes with no detail in them, looks the same.
 * 2. **It stops when it cannot be seen.** An IntersectionObserver parks the loop
 *    once the backdrop scrolls away. This page can have the aurora, the intro's
 *    particles and the tubes all alive at once, so anything off screen needs to
 *    stop costing.
 * 3. **Resize is observed, not listened for.** `window.resize` misses a backdrop
 *    that changes size because its container did, which is what happens here
 *    when the intro's sticky stage settles.
 * 4. **Reduced motion gets one frame.** The colour is the point; the drifting is
 *    decoration, so it draws the field once and stops rather than disappearing.
 * 5. `colors` is copied into a ref rather than left as an effect dependency. As
 *    supplied, an inline `colors={[a, b, c]}` array restarts the animation on
 *    every parent render.
 */

type AuroraVariant =
  | "default"
  | "sunset"
  | "ocean"
  | "forest"
  | "lavender"
  | "ember"
  | "ice"
  | "custom";

type Layer = [string, string, string];

const VARIANTS: Record<AuroraVariant, Layer[]> = {
  custom: [],
  default: [
    ["hsla(260, 70%, 60%, 0.4)", "hsla(280, 60%, 50%, 0.2)", "transparent"],
    ["hsla(320, 80%, 70%, 0.3)", "transparent", "transparent"],
  ],
  ember: [
    ["hsla(25, 95%, 55%, 0.5)", "hsla(0, 90%, 50%, 0.3)", "transparent"],
    ["hsla(45, 90%, 60%, 0.4)", "transparent", "transparent"],
  ],
  forest: [
    ["hsla(145, 60%, 45%, 0.45)", "hsla(165, 55%, 40%, 0.25)", "transparent"],
    ["hsla(120, 65%, 50%, 0.35)", "transparent", "transparent"],
  ],
  ice: [
    ["hsla(200, 70%, 75%, 0.4)", "hsla(220, 60%, 85%, 0.25)", "transparent"],
    ["hsla(180, 65%, 80%, 0.35)", "transparent", "transparent"],
  ],
  lavender: [
    ["hsla(270, 70%, 65%, 0.45)", "hsla(300, 60%, 55%, 0.25)", "transparent"],
    ["hsla(240, 75%, 70%, 0.35)", "transparent", "transparent"],
  ],
  ocean: [
    ["hsla(195, 80%, 50%, 0.45)", "hsla(220, 70%, 45%, 0.25)", "transparent"],
    ["hsla(170, 75%, 55%, 0.35)", "transparent", "transparent"],
  ],
  sunset: [
    ["hsla(15, 90%, 65%, 0.5)", "hsla(350, 80%, 55%, 0.3)", "transparent"],
    ["hsla(45, 95%, 60%, 0.4)", "transparent", "transparent"],
  ],
};

export interface AuroraBackgroundProps {
  className?: string;
  variant?: AuroraVariant;
  colors?: Layer;
  speed?: number;
  blobCount?: number;
  /**
   * Fraction of the display size the canvas is actually drawn at. The image is
   * nothing but soft gradients, so it survives being stretched back up.
   */
  resolutionScale?: number;
  children?: React.ReactNode;
  childrenClassName?: string;
}

export function AuroraBackground({
  className,
  variant = "default",
  colors,
  speed = 1,
  blobCount = 5,
  resolutionScale = 0.4,
  children,
  childrenClassName,
}: AuroraBackgroundProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const reduce = useReducedMotion();

  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const custom = colorsRef.current;
    const palette: Layer[] =
      variant === "custom" && custom
        ? [custom, [custom[0], "transparent", "transparent"]]
        : VARIANTS[variant];
    if (palette.length === 0) return;

    let raf = 0;
    let stopped = false;
    let visible = true;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * resolutionScale));
      const h = Math.max(1, Math.round(rect.height * resolutionScale));
      if (w === width && h === height) return;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      draw();
    };

    const draw = () => {
      const w = width;
      const h = height;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < blobCount; i++) {
        const layer = palette[i % palette.length];
        if (!layer) continue;
        const phase = (i / blobCount) * Math.PI * 2 + t;
        const x = w / 2 + Math.sin(phase) * (w * 0.2) + Math.cos(t * 0.5) * (w * 0.1);
        const y = h / 2 + Math.cos(phase * 0.7) * (h * 0.2) + Math.sin(t * 0.3) * (h * 0.1);
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.4);
        g.addColorStop(0, layer[0]);
        g.addColorStop(0.5, layer[1]);
        g.addColorStop(1, layer[2]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < Math.min(2, palette.length); i++) {
        const layer = palette[i];
        if (!layer) continue;
        const phase = (i / 2) * Math.PI + t * 0.8;
        const x = w / 2 + Math.sin(phase * 1.2) * (w * 0.15);
        const y = h / 2 + Math.cos(phase * 0.9) * (h * 0.15);
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.35);
        g.addColorStop(0, layer[0]);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const frame = () => {
      if (stopped) return;
      timeRef.current += 0.01 * speed;
      draw();
      raf = requestAnimationFrame(frame);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    if (reduce) {
      // One frame, held. The colour still does its job as a backdrop.
      draw();
      return () => {
        stopped = true;
        observer.disconnect();
      };
    }

    // Off-screen backdrops keep drawing otherwise, and this page can have three
    // canvases running at once.
    const io = new IntersectionObserver(
      ([entry]) => {
        const next = entry?.isIntersecting ?? true;
        if (next === visible) return;
        visible = next;
        if (visible) {
          raf = requestAnimationFrame(frame);
        } else {
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: "10%" },
    );
    io.observe(host);

    raf = requestAnimationFrame(frame);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      io.disconnect();
    };
  }, [variant, speed, blobCount, resolutionScale, reduce]);

  return (
    <div ref={hostRef} className={cn("relative overflow-hidden", className)}>
      {/* Stretched back up from the reduced-resolution buffer. The extra blur
          hides the interpolation on the few edges soft enough to show it. */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 size-full"
        style={{ filter: "blur(12px)" }}
      />
      {children && <div className={cn("relative", childrenClassName)}>{children}</div>}
    </div>
  );
}

export default AuroraBackground;
