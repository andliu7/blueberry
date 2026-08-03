import React from "react";
import { cn } from "@/lib/utils";

interface FlippingCardProps {
  className?: string;
  height?: number;
  width?: number;
  frontContent?: React.ReactNode;
  backContent?: React.ReactNode;
  /**
   * Added to the upstream component. Hover alone is unusable on a phone and
   * awkward while scrolling a long deck, so the flip can also be driven from
   * outside. Leave undefined to keep the original hover-only behaviour.
   */
  flipped?: boolean;
  onFlip?: () => void;
}

export function FlippingCard({
  className,
  frontContent,
  backContent,
  height = 300,
  width = 350,
  flipped,
  onFlip,
}: FlippingCardProps) {
  const controlled = flipped !== undefined;
  return (
    <div
      className="group/flipping-card [perspective:1000px]"
      style={
        {
          "--height": `${height}px`,
          "--width": `${width}px`,
        } as React.CSSProperties
      }
    >
      <div
        role={onFlip ? "button" : undefined}
        tabIndex={onFlip ? 0 : undefined}
        aria-pressed={controlled ? flipped : undefined}
        onClick={onFlip}
        onKeyDown={(e) => {
          if (!onFlip) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onFlip();
          }
        }}
        className={cn(
          "relative rounded-xl border border-neutral-200 bg-white shadow-lg transition-all duration-700 [transform-style:preserve-3d] dark:border-neutral-800 dark:bg-neutral-950",
          // Only fall back to hover-to-flip when nothing is driving it.
          !controlled && "group-hover/flipping-card:[transform:rotateY(180deg)]",
          controlled && flipped && "[transform:rotateY(180deg)]",
          onFlip && "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
          "h-[var(--height)] w-[var(--width)]",
          className,
        )}
      >
        {/* Front Face */}
        <div className="absolute inset-0 h-full w-full rounded-[inherit] bg-white text-neutral-950 [transform-style:preserve-3d] [backface-visibility:hidden] [transform:rotateY(0deg)] dark:bg-zinc-950 dark:text-neutral-50">
          <div className="h-full w-full [transform:translateZ(70px)_scale(.93)]">
            {frontContent}
          </div>
        </div>
        {/* Back Face */}
        <div className="absolute inset-0 h-full w-full rounded-[inherit] bg-white text-neutral-950 [transform-style:preserve-3d] [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-zinc-950 dark:text-neutral-50">
          <div className="h-full w-full [transform:translateZ(70px)_scale(.93)]">
            {backContent}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlippingCard;
