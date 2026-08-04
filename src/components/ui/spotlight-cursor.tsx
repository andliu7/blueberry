"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A soft pool of light that follows the cursor.
 *
 * Adapted from the supplied component. What changed and why:
 *
 * 1. **`smoothing` now does something.** It was in the config, defaulted, and
 *    never read: the light was pinned to the raw pointer position. Easing the
 *    drawn position toward the pointer is most of what makes this read as a lamp
 *    being carried rather than a shape stapled to the cursor.
 * 2. **It only redraws when something moved.** The original filled the viewport
 *    with a radial gradient on every frame forever, including the long stretches
 *    where the cursor is sitting still. It now sleeps once the light has caught
 *    up, which matters because the hub already has an aurora and a particle
 *    canvas to pay for.
 * 3. **Leaving the window is detected on the document.** `mouseleave` on
 *    `window` does not fire in Chrome, so the light stayed lit at the last known
 *    position after the pointer had gone.
 * 4. **`z-[9999]` is gone.** At that level it sits over dialogs, the feedback
 *    button and everything else. It is mounted behind the page content instead,
 *    where it lights the background between the cards.
 * 5. **Renamed from `Component`.** Every file in here would otherwise import
 *    something called `Component`.
 * 6. Reduced motion renders nothing at all, three-digit hex colours work, and
 *    the canvas follows devicePixelRatio so the gradient does not band on a
 *    high-density screen.
 */

export interface SpotlightConfig {
  /** Radius of the pool, in CSS pixels. */
  radius?: number;
  /** Alpha at the centre. */
  brightness?: number;
  color?: string;
  /** 0 to 1. Lower trails further behind the pointer. */
  smoothing?: number;
}

interface SpotlightCursorProps extends HTMLAttributes<HTMLCanvasElement> {
  config?: SpotlightConfig;
}

const DEFAULTS: Required<SpotlightConfig> = {
  radius: 340,
  brightness: 0.16,
  color: "#ffffff",
  smoothing: 0.12,
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

export function SpotlightCursor({ config, className, ...rest }: SpotlightCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  const { radius, brightness, color, smoothing } = { ...DEFAULTS, ...config };

  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rgb = hexToRgb(color);
    const OFF = -10000;

    // Where the pointer is, and where the light has got to. They differ while
    // the light is catching up, which is the whole point of the smoothing.
    let targetX = OFF;
    let targetY = OFF;
    let x = OFF;
    let y = OFF;

    let raf = 0;
    let stopped = false;
    let dirty = true;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = true;
    };

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      dirty = true;
    };

    const onLeave = () => {
      targetX = OFF;
      targetY = OFF;
      dirty = true;
    };

    const draw = () => {
      if (stopped) return;
      raf = requestAnimationFrame(draw);

      if (targetX === OFF) {
        // Snap out rather than easing a thousand pixels off screen.
        if (x !== OFF) {
          x = OFF;
          y = OFF;
          dirty = true;
        }
      } else {
        if (x === OFF) {
          x = targetX;
          y = targetY;
        } else {
          x += (targetX - x) * smoothing;
          y += (targetY - y) * smoothing;
        }
        // Still catching up, so there is more to draw next frame.
        if (Math.abs(targetX - x) > 0.4 || Math.abs(targetY - y) > 0.4) dirty = true;
      }

      // Nothing has moved and the light has settled: leave the last frame up.
      if (!dirty) return;
      dirty = false;

      ctx.clearRect(0, 0, width, height);
      if (x === OFF) return;

      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, `rgba(${rgb}, ${brightness})`);
      g.addColorStop(0.55, `rgba(${rgb}, ${brightness * 0.38})`);
      g.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    // Not `window`: a mouseleave listener there does not fire in Chrome, so the
    // light stayed on after the pointer had left the window entirely.
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [radius, brightness, color, smoothing, reduce]);

  if (reduce) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none fixed top-0 left-0", className)}
      {...rest}
    />
  );
}

export default SpotlightCursor;
