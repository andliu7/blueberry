import { useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A lesson video that does not exist yet, shown at full size so the page can be
 * judged with one in it.
 *
 * Deliberately a mock rather than a `<video>` with a missing `src`, which
 * renders as a black rectangle and tells you nothing about the layout. This has
 * the real proportions (16:9), the real chrome, and a scrub bar that actually
 * moves, so the question "does a video belong here and how much room does it
 * take" can be answered before a single one is filmed.
 *
 * It is labelled `Template` in the corner and says so on the face. A convincing
 * placeholder that is not marked as one is a trap for whoever next opens the
 * page, including the person who wrote it.
 *
 * Replacing it later should be a matter of swapping this component for a real
 * player: the surrounding page treats it as a block with a 16:9 aspect ratio and
 * nothing else.
 */

const FAKE_DURATION = 8 * 60 + 24;

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LessonVideo({
  title,
  poster,
  className,
}: {
  title: string;
  /** A file in `public/backgrounds`, standing in for a real thumbnail. */
  poster: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const raf = useRef<number | null>(null);

  // Runs on a real clock so the scrub bar moves at a believable rate. It is a
  // mock of the interface, not of the content.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setAt((v) => {
        const next = v + dt;
        if (next >= FAKE_DURATION) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing]);

  const pct = (at / FAKE_DURATION) * 100;

  return (
    <figure className={cn("group relative", className)}>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm dark:border-stone-800">
        <img
          src={`${import.meta.env.BASE_URL}backgrounds/${poster}`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-slate-950/40" />

        <span className="absolute top-3 left-3 rounded-full bg-white/15 px-2.5 py-1 font-mono text-[0.6rem] font-semibold tracking-widest text-white/90 uppercase backdrop-blur">
          Template
        </span>

        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? `Pause ${title}` : `Play ${title}`}
          className="absolute inset-0 grid cursor-pointer place-items-center"
        >
          <span
            className={cn(
              "grid size-16 place-items-center rounded-full bg-white/90 text-slate-900 shadow-xl transition-transform",
              playing ? "scale-90 opacity-0 group-hover:opacity-100" : "scale-100 group-hover:scale-105",
            )}
          >
            {playing ? <Pause className="size-6" /> : <Play className="ml-1 size-6" />}
          </span>
        </button>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-sm font-semibold text-white drop-shadow">{title}</p>
          <p className="mt-0.5 text-xs text-white/70">
            Placeholder. No video has been recorded for this section yet.
          </p>

          <div className="mt-3 flex items-center gap-2.5">
            <span className="font-mono text-[0.65rem] tabular-nums text-white/80">{clock(at)}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[0.65rem] tabular-nums text-white/60">
              {clock(FAKE_DURATION)}
            </span>
            <Volume2 className="size-3.5 text-white/60" />
            <Maximize2 className="size-3.5 text-white/60" />
          </div>
        </div>
      </div>
    </figure>
  );
}

export default LessonVideo;
