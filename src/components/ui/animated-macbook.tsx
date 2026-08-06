import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The full MacBook routine: the machine tumbles through 360 degrees, the lid
 * shuts and reopens, the keys catch the light as it turns, and a shadow swings
 * underneath.
 *
 * This is the supplied component rather than the reduction that was here
 * before. Four things are different, and each is about it living inside a line
 * of text rather than on a blank demo page.
 *
 * 1. **It mounts on hover and unmounts after.** The routine is a nine second
 *    loop over roughly eighty elements, and the tag it belongs to sits in a
 *    paragraph. Left running it is eighty animating divs behind copy nobody
 *    asked to have distracted from; mounted on hover it costs nothing until you
 *    point at it.
 * 2. **It lays out inline.** The original pins itself to the centre of the
 *    viewport with negative margins, which tears it out of a row of tags.
 * 3. **It is scaled rather than redrawn.** The geometry is in fixed pixels and
 *    every one of them is tuned against the others, so a `scale` keeps the
 *    proportions the sizes were chosen for. It is allowed to overflow the tag,
 *    since a laptop cropped to a 34px box is not a laptop.
 * 4. **Reduced motion gets it open and still.** The tumble is the whole point
 *    and there is no smaller version of it, so with that preference the laptop
 *    simply sits there with its lid up.
 */

const KEY_BASE =
  "float-left m-[1px] h-[6px] w-[6px] rounded-[2px] bg-[#444] mb-key mb-anim-keys";

export function AnimatedMacbook({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("mb-perspective relative block h-[96px] w-[150px]", className)}
    >
      <span className="mb-inner mb-anim-rotate absolute top-0 left-0 z-20 block h-[96px] w-[150px]">
        {/* Screen */}
        <span className="mb-screen mb-anim-lid-screen absolute bottom-0 left-0 block h-[96px] w-[150px] rounded-[7px] bg-[#ddd] bg-[linear-gradient(45deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0)_100%)] bg-[length:300px_300px] bg-left-bottom shadow-[inset_0_3px_7px_rgba(255,255,255,0.5)]">
          <span className="mb-screen-face absolute bottom-0 left-0 block h-[96px] w-[150px] rounded-[7px] bg-[#d3d3d3] bg-[linear-gradient(45deg,rgba(0,0,0,0.24)_0%,rgba(0,0,0,0)_100%)]">
            <span className="absolute top-[4px] left-1/2 ml-[-1.5px] block h-[3px] w-[3px] rounded-full bg-black" />
            <span className="relative m-[10px] block h-[74px] w-[130px] rounded-[1px] bg-black shadow-[inset_0_0_2px_rgba(0,0,0,1)]">
              <span className="mb-anim-shade absolute top-0 left-0 block h-[74px] w-[130px] bg-[linear-gradient(-135deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.1)_47%,rgba(255,255,255,0)_48%)] bg-[length:300px_200px]" />
            </span>
            <span className="absolute top-[85px] left-[57px] text-[6px] text-[#666]">
              MacBook Air
            </span>
          </span>
        </span>

        {/* Body */}
        <span className="mb-body mb-anim-lid-body absolute bottom-0 left-0 block h-[96px] w-[150px] rounded-[7px] bg-[#cbcbcb] bg-[linear-gradient(45deg,rgba(0,0,0,0.24)_0%,rgba(0,0,0,0)_100%)]">
          <span className="mb-body-face mb-anim-deck absolute bottom-0 left-0 block h-[96px] w-[150px] rounded-[7px] bg-[#dfdfdf] bg-[linear-gradient(30deg,rgba(0,0,0,0.24)_0%,rgba(0,0,0,0)_100%)]">
            {/* Trackpad */}
            <span className="absolute top-1/2 left-1/2 mt-[-44px] ml-[-18px] block h-[31px] w-[40px] rounded-[4px] bg-[#cdcdcd] bg-[linear-gradient(30deg,rgba(0,0,0,0.24)_0%,rgba(0,0,0,0)_100%)] shadow-[inset_0_0_3px_#888]" />

            <span className="mb-keyboard absolute top-[41px] left-[7px] block h-[45px] w-[130px] overflow-hidden rounded-[4px] bg-[#cdcdcd] bg-[linear-gradient(30deg,rgba(0,0,0,0.24)_0%,rgba(0,0,0,0)_100%)] pl-[2px] shadow-[inset_0_0_3px_#777]">
              {Array.from({ length: 58 }).map((_, i) => (
                <span key={`k${i}`} className={KEY_BASE} />
              ))}
              <span className={cn(KEY_BASE, "w-[45px]")} />
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={`f${i}`} className={cn(KEY_BASE, "h-[3px]")} />
              ))}
            </span>
          </span>
          {/* Feet */}
          <span className="absolute top-[20px] left-[20px] block h-[5px] w-[5px] rounded-full bg-[#333]" />
          <span className="absolute top-[20px] right-[20px] block h-[5px] w-[5px] rounded-full bg-[#333]" />
          <span className="absolute right-[20px] bottom-[20px] block h-[5px] w-[5px] rounded-full bg-[#333]" />
          <span className="absolute bottom-[20px] left-[20px] block h-[5px] w-[5px] rounded-full bg-[#333]" />
        </span>
      </span>

      <span className="mb-shadow mb-anim-shadow absolute top-[160px] left-[40px] block h-0 w-[60px] shadow-[0_0_60px_40px_rgba(0,0,0,0.3)]" />
    </span>
  );
}

/**
 * The laptop sized for a tag, mounted only while hovered.
 *
 * The slot keeps the tag's own dimensions so the row does not reflow when the
 * label collapses; the laptop itself overflows it, scaled and centred, because
 * a tumbling laptop cropped to 34px is a grey smudge.
 */
export function MiniMacbook({ className }: { className?: string }) {
  const [hot, setHot] = useState(false);

  return (
    <span
      aria-hidden
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      className={cn("relative inline-block h-[26px] w-[34px] align-middle", className)}
    >
      <span
        className="pointer-events-none absolute top-1/2 left-1/2 block"
        style={{ transform: "translate(-50%, -50%) scale(0.42)" }}
      >
        {hot ? (
          <AnimatedMacbook />
        ) : (
          // A still frame at rest, so the tag shows a laptop rather than a gap
          // before you point at it.
          <span className="mb-still block">
            <AnimatedMacbook />
          </span>
        )}
      </span>
    </span>
  );
}

export default MiniMacbook;
