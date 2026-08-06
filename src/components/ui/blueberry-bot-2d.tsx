import { useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { cn } from "@/lib/utils";

/**
 * The berry, flat, leaning toward the cursor.
 *
 * Costs nothing beyond what the site already ships, so it is what the folder
 * pages use and what stands in on the hub while the three.js version is still
 * arriving. That second job is why it is this size and proportion rather than a
 * decoration: it has to be close enough that the swap is not a jolt.
 *
 * The pot and the swallow are gone from both versions. That was a lot of moving
 * parts for a gag you see once, and what people actually do with this is move
 * the mouse and watch it look back.
 *
 * A lean of a few degrees rather than a true rotation, because at this size a
 * real one reads as the head falling off.
 */
export function BlueberryBot2D({
  className,
  /** A line for the berry to say, in a bubble beside it. */
  says,
}: {
  className?: string;
  says?: string;
}) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const [lean, setLean] = useState({ x: 0, y: 0 });

  const track = (e: React.PointerEvent) => {
    if (reduce) return;
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    const dx = (e.clientX - (box.left + box.width / 2)) / (box.width / 2);
    const dy = (e.clientY - (box.top + box.height / 2)) / (box.height / 2);
    // Clamped hard: a few degrees reads as attention, more reads as a wobble.
    setLean({ x: Math.max(-1, Math.min(1, dx)) * 9, y: Math.max(-1, Math.min(1, dy)) * 6 });
  };

  return (
    <div
      ref={wrap}
      onPointerMove={track}
      onPointerLeave={() => setLean({ x: 0, y: 0 })}
      className={cn(
        "relative mx-auto flex select-none flex-col items-center gap-3 sm:flex-row sm:justify-center",
        className,
      )}
    >
      <div
        className="transition-transform duration-300 ease-out"
        style={{
          transform: `rotate(${lean.x * 0.5}deg) translate(${lean.x}px, ${lean.y}px)`,
        }}
      >
        <BlueberryMark eyes className="h-40 w-40 drop-shadow-xl" />
      </div>

      {says && (
        /* Beside him on a wide screen, under him on a narrow one, because a
           speech bubble that has to squeeze in next to a 160px berry on a phone
           ends up two words per line. */
        <p className="relative max-w-[15rem] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-600 shadow-sm sm:rounded-bl-2xl sm:rounded-tl-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
          {says}
        </p>
      )}
    </div>
  );
}

export default BlueberryBot2D;
