"use client";

import { cn } from "@/lib/utils";

/**
 * A small 3-D laptop that opens its lid, for the Computer Science tag to turn
 * into when you point at it.
 *
 * Adapted from the animated MacBook. What changed and why:
 *
 * 1. **It runs on hover, not on a loop.** The original plays a nine second
 *    routine forever: the whole machine tumbles through 360 degrees, the lid
 *    slams shut and reopens, and every one of its 75 keys animates its own box
 *    shadow. That is a showpiece for a blank page. On a card it would be 75
 *    elements animating behind a paragraph nobody asked to have distracted from,
 *    so it is idle until hovered and then does one thing: opens.
 * 2. **The keys are painted, not built.** Seventy-five divs to draw a keyboard
 *    the size of a postage stamp is a lot of DOM for something that reads as
 *    texture at this scale. A repeating gradient gives the same impression in
 *    one element.
 * 3. **No absolute positioning.** The original pins itself to the middle of the
 *    viewport with negative margins, which would have torn it out of the row of
 *    tags. It lays out inline.
 * 4. **The keyframes are gone.** All of them were in service of the endless
 *    tumble. What is left is the lid angle, which a transition handles, so this
 *    adds nothing to `index.css`.
 *
 * Reduced motion gets the laptop already open, with no rotation.
 */
export function MiniMacbook({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-block h-[26px] w-[34px]", className)}
      style={{ perspective: "220px" }}
    >
      {/* Base: the wedge the lid hinges from. */}
      <span
        className="absolute bottom-0 left-0 h-[3px] w-full rounded-[1.5px]"
        style={{
          background: "linear-gradient(180deg, #e2e2e6 0%, #b9b9c0 60%, #8f8f97 100%)",
          boxShadow: "0 1px 2px rgba(0,0,0,.35)",
        }}
      />
      {/* Keyboard deck, laid flat and foreshortened. The keys are a repeating
          gradient rather than 75 elements. */}
      <span
        className="absolute bottom-[2px] left-[2px] h-[7px] w-[calc(100%-4px)] rounded-[1px]"
        style={{
          background:
            "repeating-linear-gradient(90deg, #6b6b73 0 1.6px, #cfcfd6 1.6px 3.2px), linear-gradient(180deg, #d9d9df, #b4b4bb)",
          backgroundBlendMode: "multiply",
          transform: "rotateX(62deg)",
          transformOrigin: "bottom center",
          opacity: 0.9,
        }}
      />
      {/* The lid. Shut at 78 degrees, and once the tag is hovered it opens and
          closes on a loop; see `lid-open-close` in index.css. The keyframes live
          there because a looping animation cannot be expressed as a Tailwind
          transition, and gating them on `.group\/cs:hover` keeps the loop from
          running when nobody is looking at it. */}
      <span
        className={cn(
          "cs-lid absolute bottom-[3px] left-[1px] h-[19px] w-[calc(100%-2px)] rounded-[2px]",
          "origin-bottom [transform:rotateX(78deg)]",
        )}
        style={{
          background: "linear-gradient(160deg, #f0f0f4 0%, #c8c8d0 55%, #a6a6ae 100%)",
          boxShadow: "0 1px 3px rgba(0,0,0,.4)",
        }}
      >
        {/* Screen. Lit only once the lid is up, which is most of what sells the
            thing as switched on rather than as a grey rectangle. */}
        <span
          className="absolute inset-[1.5px] rounded-[1px] transition-colors duration-500 group-hover/cs:bg-[#1b2a5c] motion-reduce:bg-[#1b2a5c]"
          style={{ background: "#20202a" }}
        >
          <span
            className="absolute inset-0 rounded-[1px] opacity-0 transition-opacity duration-700 group-hover/cs:opacity-100 motion-reduce:opacity-100"
            style={{
              background:
                "linear-gradient(135deg, rgba(129,140,248,.85) 0%, rgba(217,70,239,.45) 45%, rgba(0,0,0,0) 75%)",
            }}
          />
        </span>
      </span>
    </span>
  );
}

export default MiniMacbook;
