import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { useIsDark } from "@/lib/useIsDark";

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

/**
 * The glare that the classic question cards get from `TiltCard`: a soft radial
 * highlight that tracks the pointer, white on a dark card and indigo on a pale
 * one.
 *
 * Driven by CSS custom properties set straight on the DOM node rather than by
 * React state. A card grid can hold forty of these, and re-rendering one on
 * every mousemove would make the whole list janky for a decorative effect.
 *
 * One copy lives inside each face. Putting a single glare on the wrapper would
 * leave it hanging in front of the card during the flip, since the wrapper does
 * not turn with the faces.
 */
function Glare({ dark }: { dark: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-15"
      style={{
        background: `radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), ${
          dark ? "rgba(255,255,255,0.9)" : "rgba(99,102,241,0.7)"
        }, transparent 50%)`,
      }}
    />
  );
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
  const rootRef = useRef<HTMLDivElement>(null);
  const isDark = useIsDark();

  // Tilt and glare both ride on custom properties, so a pointer move touches
  // the DOM once and never the React tree.
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
    el.style.setProperty("--rx", `${(0.5 - py) * 8}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 8}deg`);
  };

  const onLeave = () => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div
      ref={rootRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="group/flipping-card [perspective:1000px]"
      style={
        {
          "--height": `${height}px`,
          "--width": `${width}px`,
          "--rx": "0deg",
          "--ry": "0deg",
        } as React.CSSProperties
      }
    >
      {/* Tilt sits on its own layer, outside the element that flips. Composing
          a tilt onto the same transform as `rotateY(180deg)` made the card
          swing through the tilt on every flip. */}
      <div
        className="transition-transform duration-300 ease-out [transform:rotateX(var(--rx))_rotateY(var(--ry))] [transform-style:preserve-3d] motion-reduce:[transform:none]"
      >
        <div

      data-click-silent
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
            onFlip &&
              "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
            "h-[var(--height)] w-[var(--width)]",
            className,
          )}
        >
          {/* Front Face */}
          <div className="absolute inset-0 h-full w-full overflow-hidden rounded-[inherit] bg-white text-neutral-950 [transform-style:preserve-3d] [backface-visibility:hidden] [transform:rotateY(0deg)] dark:bg-zinc-950 dark:text-neutral-50">
            <div className="h-full w-full [transform:translateZ(70px)_scale(.93)]">
              {frontContent}
            </div>
            <Glare dark={isDark} />
          </div>
          {/* Back Face */}
          <div className="absolute inset-0 h-full w-full overflow-hidden rounded-[inherit] bg-white text-neutral-950 [transform-style:preserve-3d] [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-zinc-950 dark:text-neutral-50">
            <div className="h-full w-full [transform:translateZ(70px)_scale(.93)]">
              {backContent}
            </div>
            <Glare dark={isDark} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlippingCard;
