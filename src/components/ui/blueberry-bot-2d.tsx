import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { cn } from "@/lib/utils";

/**
 * The blueberry as a little robot: the mark for a head, a body under it, and a
 * pot below that swings across and swallows it.
 *
 * The flat version. It costs nothing beyond what the site already ships, so it
 * is what the folder pages use, and it is also what stands in on the hub while
 * the three.js hero is still arriving. That second job is why it exists at this
 * size and proportion rather than as a decoration: it has to be close enough to
 * the 3-D one that the swap is not a jolt.
 *
 * The head tracks the pointer. Not a full look-at, just a lean of a few degrees,
 * because at this size a real rotation reads as the head falling off.
 */
export function BlueberryBot2D({
  className,
  /** Runs the swallow on a loop rather than only on click. */
  autoplay = false,
}: {
  className?: string;
  autoplay?: boolean;
}) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const [lean, setLean] = useState({ x: 0, y: 0 });
  const [eating, setEating] = useState(false);

  useEffect(() => {
    if (!autoplay || reduce) return;
    const id = setInterval(() => {
      setEating(true);
      setTimeout(() => setEating(false), 2200);
    }, 7000);
    return () => clearInterval(id);
  }, [autoplay, reduce]);

  const track = (e: React.PointerEvent) => {
    if (reduce) return;
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    const dx = (e.clientX - (box.left + box.width / 2)) / (box.width / 2);
    const dy = (e.clientY - (box.top + box.height / 2)) / (box.height / 2);
    // Clamped hard: a few degrees reads as attention, more reads as a wobble.
    setLean({ x: Math.max(-1, Math.min(1, dx)) * 7, y: Math.max(-1, Math.min(1, dy)) * 5 });
  };

  return (
    <div
      ref={wrap}
      onPointerMove={track}
      onPointerLeave={() => setLean({ x: 0, y: 0 })}
      onClick={() => {
        if (reduce || eating) return;
        setEating(true);
        setTimeout(() => setEating(false), 2200);
      }}
      className={cn("relative mx-auto h-56 w-56 cursor-pointer select-none", className)}
    >
      {/* Head and body. The head is the mark itself, so the bot and the logo are
          literally the same drawing rather than two things kept in step. */}
      <div
        className="absolute left-1/2 top-3 -translate-x-1/2 transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(-50%) rotate(${lean.x * 0.4}deg) translate(${lean.x}px, ${lean.y}px)`,
          // Dropping into the pot: down and small, timed with the lid closing.
          ...(eating
            ? { transform: `translateX(-50%) translateY(74px) scale(0.42)`, opacity: 0 }
            : {}),
          transitionProperty: "transform, opacity",
          transitionDuration: eating ? "700ms" : "300ms",
        }}
      >
        <BlueberryMark eyes className="h-24 w-24 drop-shadow-lg" />
      </div>

      {/* Neck and shoulders, drawn rather than a photo so it themes with the
          rest of the site. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[104px] h-6 w-8 -translate-x-1/2 rounded-b-lg bg-gradient-to-b from-[#4338ca] to-[#312e81]"
        style={{ opacity: eating ? 0 : 1, transition: "opacity 400ms ease" }}
      />

      {/* The pot. It leans over, the lid opens, and it swings back upright with
          the berry gone. */}
      <div
        aria-hidden
        className="absolute bottom-2 left-1/2 h-24 w-32 -translate-x-1/2 origin-bottom transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-50%) rotate(${eating ? -14 : 0}deg)` }}
      >
        <div className="absolute inset-x-2 bottom-0 h-20 rounded-b-[2.5rem] rounded-t-lg bg-gradient-to-b from-[#7c3aed] to-[#4c1d95] shadow-xl" />
        {/* Lid, hinged at the back left. */}
        <div
          className="absolute -top-1 left-1 h-4 w-[7.5rem] origin-left rounded-full bg-gradient-to-r from-[#a855f7] to-[#7c3aed] shadow-md transition-transform duration-500 ease-out"
          style={{ transform: `rotate(${eating ? -52 : 0}deg)` }}
        />
        <div className="absolute inset-x-6 top-8 h-1.5 rounded-full bg-white/15" />
      </div>

      <p className="absolute inset-x-0 bottom-0 text-center font-mono text-[0.65rem] text-slate-400 dark:text-stone-500">
        {eating ? "gone" : "click me"}
      </p>
    </div>
  );
}

export default BlueberryBot2D;
