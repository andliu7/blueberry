import { useState } from "react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { ClickHereHint } from "@/components/ui/click-here-hint";
import { requestIntroReplay } from "@/lib/intro";
import { cn } from "@/lib/utils";

/**
 * The way home from a deck's title screen.
 *
 * No pill and no border, because a deck opens on a full screen of its own
 * artwork and a bordered button in the corner of that reads as a control bolted
 * on rather than part of the picture.
 *
 * It used to have no label either, on the reasoning that the logo alone was
 * enough and the hover glow made it plainly pressable. That was wrong, and it
 * took someone outside the project to show it: a visitor did not work out it was
 * a button at all. A hover glow announces nothing on a phone, where there is no
 * hover, and on a laptop it only helps someone who already suspected. So the
 * hint is here until the mark has been used once, and then never again.
 *
 * It also asks for the opening to run again. Coming back to the hub from a deck
 * is arriving from somewhere else on the site, which is worth the sequence;
 * coming back from a folder is closer to pressing back, and that is the case
 * `lib/intro` deliberately stays quiet for.
 */

const USED_KEY = "blueberry_home_mark_used";

function alreadyUsed(): boolean {
  try {
    return localStorage.getItem(USED_KEY) === "1";
  } catch {
    // A browser refusing storage should not turn this into a permanent nag, so
    // assume it has been seen rather than showing it on every page for ever.
    return true;
  }
}

export function HomeBlueberry({ className }: { className?: string }) {
  const [used, setUsed] = useState(alreadyUsed);

  return (
    <span className="inline-flex items-center gap-2">
      <a
        href="#/home"
        onClick={() => {
          try {
            localStorage.setItem(USED_KEY, "1");
          } catch {
            /* ignore */
          }
          setUsed(true);
          requestIntroReplay();
        }}
        aria-label="Home"
        data-click-silent
        className={cn(
          "blueberry-glow-art group inline-flex rounded-full outline-none",
          // `filter` is listed so the halo fades in rather than appearing at once.
          "transition-[transform,filter] duration-500 ease-out hover:scale-110",
          "focus-visible:ring-2 focus-visible:ring-indigo-400",
          className,
        )}
      >
        <BlueberryMark eyes className="h-[3.75rem] w-[3.75rem]" />
      </a>

      {/* Sits to the right of the mark and points back at it. The mark is
          already in the corner, so there is nothing to its left to point from. */}
      {!used && <ClickHereHint direction="left" />}
    </span>
  );
}

export default HomeBlueberry;
