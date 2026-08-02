"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Liquid-glass surface treatment.
 *
 * Written without cva or @radix-ui/react-slot — neither is installed, and the
 * stock file's Button/MetalButton variants are built on theme tokens
 * (bg-primary, ring-ring, text-primary-foreground) this project never defines.
 * Only the glass layers are actually wanted here.
 *
 * Drop <LiquidGlassLayers /> inside any position:relative button and give the
 * button's own content a positive z-index.
 */

const GLASS_SHADOW =
  "shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)] " +
  "dark:shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]";

export function LiquidGlassLayers({
  rounded = "rounded-full",
  className,
}: {
  rounded?: string;
  className?: string;
}) {
  return (
    <>
      {/* Refraction. backdrop-blur carries the effect on its own: Chrome does
          not support SVG filter references in backdrop-filter, so the url()
          below is a progressive enhancement and is simply ignored there. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-0 overflow-hidden backdrop-blur-md",
          "bg-white/40 dark:bg-white/[0.06]",
          rounded,
          className,
        )}
        style={{ backdropFilter: 'blur(8px) url("#container-glass")' }}
      />
      {/* Edge highlights and inner bevel. */}
      <span
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 z-[1]", rounded, GLASS_SHADOW)}
      />
    </>
  );
}

/** Render once per page; supplies the filter the layers reference. */
export function GlassFilter() {
  return (
    <svg className="hidden" aria-hidden>
      <defs>
        <filter
          id="container-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

/** Standalone glass button. */
export function LiquidButton({
  className,
  children,
  rounded = "rounded-full",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { rounded?: string }) {
  return (
    <button
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap",
        "text-sm font-medium transition-transform duration-300 hover:scale-105",
        rounded,
        className,
      )}
      {...props}
    >
      <LiquidGlassLayers rounded={rounded} />
      <span className="pointer-events-none relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}

export default LiquidButton;
