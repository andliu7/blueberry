import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { requestIntroReplay } from "@/lib/intro";
import { cn } from "@/lib/utils";

/**
 * The way home from a deck's title screen.
 *
 * No pill, no border, no label: a deck opens on a full screen of its own
 * artwork, and a bordered button in the corner of that read as a control bolted
 * on rather than part of the picture. The logo alone is enough, and it glows
 * when you point at it so it is still plainly a thing you can press.
 *
 * It also asks for the opening to run again. Coming back to the hub from a deck
 * is arriving from somewhere else on the site, which is worth the sequence;
 * coming back from a folder is closer to pressing back, and that is the case
 * `lib/intro` deliberately stays quiet for.
 */
export function HomeBlueberry({ className }: { className?: string }) {
  return (
    <a
      href="#/home"
      onClick={requestIntroReplay}
      aria-label="Home"
      className={cn(
        "blueberry-glow-art group inline-flex rounded-full outline-none",
        // `filter` is listed so the halo fades in rather than appearing at once.
        "transition-[transform,filter] duration-500 ease-out hover:scale-110",
        "focus-visible:ring-2 focus-visible:ring-indigo-400",
        className,
      )}
    >
      <BlueberryMark className="h-10 w-10" />
    </a>
  );
}

export default HomeBlueberry;
