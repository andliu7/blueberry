"use client";

import { useEffect, useRef, useState } from "react";
import { useBlobReveal } from "./useBlobReveal";
import { cn } from "@/lib/utils";

/**
 * Two images stacked, with a blobby mask that follows the pointer.
 *
 * The mask lags behind the cursor, fuses two circles into one poured shape, and
 * swells when the pointer moves fast. Both images carry their own background, so
 * the whole scene swaps inside the mask rather than a cut-out subject.
 *
 * Decorative by construction: the canvas is `aria-hidden`, the real description
 * lives on a visually hidden element, and nothing here is focusable. A keyboard
 * user gets no interaction, which is correct for decoration, but they also
 * cannot get stuck in it.
 *
 * Three ways it declines to run, all decided before the canvas mounts rather
 * than by failing partway:
 *
 * - **No WebGL2** - renders the top image as a plain `<img>`.
 * - **No fine pointer** - phones and most tablets get the top image, static.
 *   Faking a hover position on a device that has no hover is worse than not
 *   running: it animates something nobody asked for and costs battery.
 * - **Context lost** - falls back to the same image rather than a black box.
 */

export interface BlobRevealProps {
  topSrc: string;
  bottomSrc: string;
  /** Describes the scene for screen readers. The canvas itself is hidden. */
  alt?: string;
  className?: string;
  baseRadius?: number;
  speedGain?: number;
  noiseScale?: number;
  wobble?: number;
  softness?: number;
  goo?: number;
  trailLag?: number;
  lens?: number;
}

/** Detected once before mount, so the canvas is never created only to fail. */
function useCanRun(): boolean | null {
  const [can, setCan] = useState<boolean | null>(null);

  useEffect(() => {
    // `(pointer: fine)` rather than touch sniffing. A tablet with a trackpad has
    // touch events and a real pointer; a phone has neither. This is the query
    // that answers the question actually being asked.
    const finePointer = window.matchMedia?.("(pointer: fine)").matches ?? false;
    if (!finePointer) {
      setCan(false);
      return;
    }

    // A throwaway canvas, so a browser without WebGL2 never sees the real one.
    let ok = false;
    try {
      const probe = document.createElement("canvas");
      ok = Boolean(probe.getContext("webgl2"));
    } catch {
      ok = false;
    }
    setCan(ok);
  }, []);

  return can;
}

export function BlobReveal({
  topSrc,
  bottomSrc,
  alt = "",
  className,
  baseRadius = 0.13,
  speedGain = 0.55,
  noiseScale = 3.4,
  wobble = 0.11,
  softness = 0.006,
  goo = 0.14,
  trailLag = 0.055,
  lens = 0.018,
}: BlobRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canRun = useCanRun();

  const { failed } = useBlobReveal(
    canvasRef,
    containerRef,
    topSrc,
    bottomSrc,
    { baseRadius, speedGain, noiseScale, wobble, softness, goo, trailLag, lens },
    canRun === true,
  );

  // `canRun === null` is the frame before detection has run. Showing the top
  // image then means the fallback is what paints first either way, so there is
  // no flash of empty canvas while we decide.
  const staticOnly = canRun !== true || failed;

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {staticOnly ? (
        <img src={topSrc} alt={alt} className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />
          {alt && <span className="sr-only">{alt}</span>}
        </>
      )}
    </div>
  );
}

export default BlobReveal;
