import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A seamless scrolling strip. The children are rendered twice back to back and
 * the track is translated exactly half its length, so the second copy arrives
 * where the first began and the seam never shows.
 *
 * **The animation lives in `index.css`, not in an injected `<style>` tag.** The
 * version this was adapted from wrote a `<style>` block inside the component
 * carrying a global `.marquee-scroller` class and a global `@keyframes scroll`.
 * That breaks the moment a second marquee mounts with a different duration or
 * direction: both instances share the one class name, so whichever `<style>`
 * React flushed last silently retimes every marquee on the page. Speed and
 * direction are per-instance data here, so they travel as a CSS custom property
 * and a data attribute, and the keyframes have one home and a `bb-` prefix.
 *
 * Pause on hover is CSS rather than React state for the same reason it usually
 * should be: the original held an `isPaused` boolean, which re-rendered the
 * whole subtree on pointer enter and again on leave, to accomplish what
 * `:hover` does for free and without a frame of jank.
 */

type Direction = "left" | "right" | "up" | "down";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Seconds for one full pass. Lower is faster. */
  duration?: number;
  pauseOnHover?: boolean;
  direction?: Direction;
  /** Fades both ends so items enter and leave instead of popping. */
  fade?: boolean;
  /** How much of each end the fade covers, as a percentage. */
  fadeAmount?: number;
}

export function Marquee({
  children,
  className,
  duration = 20,
  pauseOnHover = false,
  direction = "left",
  fade = true,
  fadeAmount = 10,
  style,
  ...props
}: MarqueeProps) {
  const items = React.Children.toArray(children);
  const vertical = direction === "up" || direction === "down";

  // One gradient, reused for both the standard and the WebKit-prefixed property.
  const mask = fade
    ? `linear-gradient(${vertical ? "to bottom" : "to right"}, transparent 0%, black ${fadeAmount}%, black ${100 - fadeAmount}%, transparent 100%)`
    : undefined;

  return (
    <div
      className={cn("bb-marquee", vertical && "bb-marquee--vertical", className)}
      data-direction={direction}
      data-pause-on-hover={pauseOnHover ? "" : undefined}
      style={{
        ...style,
        ...(mask ? { maskImage: mask, WebkitMaskImage: mask } : null),
        ["--bb-marquee-duration" as string]: `${duration}s`,
      }}
      {...props}
    >
      {/* The duplicate is decoration, so it is hidden from assistive tech and
          the strip is announced once rather than twice. */}
      {[false, true].map((isClone) => (
        <div
          key={isClone ? "clone" : "original"}
          className="bb-marquee__track"
          aria-hidden={isClone || undefined}
        >
          {items.map((item, i) => (
            <div className="bb-marquee__item" key={i}>
              {item}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
