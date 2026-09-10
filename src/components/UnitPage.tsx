import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { PATHWAY_UNITS, type PathwayNode } from "@/game/demo/pathwayMap";
import { SiteHeader } from "@/components/ui/site-header";
import { SiteFooter } from "@/components/ui/site-footer";
import { cn } from "@/lib/utils";

/**
 * One unit of Organic Chemistry II, on its own page.
 *
 * The fifteen units were a single scrolling pathway inside the game. As pages
 * they get an address each, which is what makes a unit linkable, shareable and
 * findable: a student sent "#/unit/u7" lands on Aldehydes and Ketones rather
 * than on the top of a track they then have to scroll.
 *
 * The unit list is read from the game's own `pathwayMap`, not copied. That file
 * is pure data with no imports, so nothing of the game's runtime comes with it,
 * and a unit added there appears here without a second edit. Two lists of the
 * same fifteen units is how they drift apart.
 */

/**
 * What each kind of node is, in words.
 *
 * Words rather than only a colour, because colour cannot be the only carrier of
 * meaning: a student who cannot separate the spine's blue from a branch's amber
 * still has to know which one is required.
 */
const KIND_LABEL: Record<PathwayNode["kind"], string> = {
  spine: "Core",
  branch: "Optional",
  gate: "Checkpoint",
  boss: "Unit test",
};

const KIND_TONE: Record<PathwayNode["kind"], string> = {
  spine: "border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-200",
  branch: "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  gate: "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  boss: "border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-200",
};

/**
 * What a node asks you to DO, which is a different question from what it is.
 *
 * `kind` says whether a node is required; `playable.kind` says whether you draw
 * a mechanism, rank resonance forms or order a sequence. They read as one field
 * at a glance and are not, which is worth naming because conflating them is
 * exactly the mistake this file was first written with.
 */
const PLAYABLE_LABEL: Record<string, string> = {
  beat: "Drill",
  reaction: "Reaction",
  resonance: "Resonance",
  sequence: "Sequence",
};

/** Horizontal travel, in pixels, before a drag counts as a swipe. */
const SWIPE_PX = 64;
/** How much steeper than horizontal a drag may be before it is a scroll. */
const SWIPE_SLOPE = 1.2;

export function UnitPage({ unitId }: { unitId?: string }) {
  const index = Math.max(
    0,
    PATHWAY_UNITS.findIndex((u) => u.id === unitId),
  );
  const unit = PATHWAY_UNITS[index]!;
  const previous = index > 0 ? PATHWAY_UNITS[index - 1] : null;
  const next = index < PATHWAY_UNITS.length - 1 ? PATHWAY_UNITS[index + 1] : null;

  const surfaceRef = useRef<HTMLDivElement>(null);

  /**
   * Swipe across, and the arrow keys, both walk the units.
   *
   * The gesture is measured on pointer events rather than touch, so a trackpad
   * drag and a finger take the same path. Two guards keep it from firing on an
   * ordinary scroll: it has to travel far enough, and it has to be more
   * horizontal than vertical. Without the second one a diagonal flick down the
   * page navigates, which is the worst kind of surprise on a phone.
   */
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;

    const go = (unitTo: { id: string } | null) => {
      if (unitTo) window.location.hash = `#/unit/${unitTo.id}`;
    };

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
    };

    const onUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < SWIPE_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_SLOPE) return;
      // Dragging the page to the right pulls the previous unit in from the
      // left, which is the direction every carousel and every phone back
      // gesture already means.
      go(dx > 0 ? previous : next);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      if (e.key === "ArrowRight") go(next);
      if (e.key === "ArrowLeft") go(previous);
    };

    el.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [previous, next]);

  const [unitNumber, unitName] = unit.title.split(" · ");

  return (
    <div ref={surfaceRef} className="min-h-svh touch-pan-y">
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl px-6 pt-10 pb-20 sm:px-10">
        <p className="font-mono text-xs tracking-[0.28em] text-slate-500 uppercase dark:text-stone-400">
          Organic Chemistry II · {index + 1} of {PATHWAY_UNITS.length}
        </p>

        <h1 className="title-face mt-3 text-3xl sm:text-4xl">{unitName ?? unit.title}</h1>
        <p className="mt-1 font-mono text-sm text-slate-500 dark:text-stone-400">{unitNumber}</p>
        <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-slate-600 dark:text-stone-300">
          {unit.note}
        </p>

        <ol className="mt-9 grid gap-3">
          {unit.nodes.map((node) => (
            <li
              key={node.id}
              className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-stone-100">
                  {node.title}
                </h2>
                <span className="flex shrink-0 items-center gap-1.5">
                  {node.playable ? (
                    <span className="rounded-full border border-slate-300/60 px-2 py-0.5 font-mono text-[0.62rem] tracking-[0.14em] text-slate-500 uppercase dark:border-white/15 dark:text-stone-400">
                      {PLAYABLE_LABEL[node.playable.kind] ?? node.playable.kind}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 font-mono text-[0.62rem] tracking-[0.14em] uppercase",
                      KIND_TONE[node.kind],
                    )}
                  >
                    {KIND_LABEL[node.kind]}
                  </span>
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-stone-300">
                {node.blurb}
              </p>
            </li>
          ))}
        </ol>

        {/* The way onward, at the foot, where somebody who has read the unit is
            actually looking. Both ends are named rather than labelled "next", so
            the destination is readable before the press. */}
        <nav
          aria-label="Units"
          className="mt-12 grid gap-3 border-t border-slate-200/70 pt-6 sm:grid-cols-2 dark:border-white/10"
        >
          {previous ? (
            <a
              href={`#/unit/${previous.id}`}
              className="bb-press-soft group flex min-h-16 flex-col justify-center rounded-2xl border border-slate-200/70 px-5 py-3 dark:border-white/10"
            >
              <span className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.2em] text-slate-500 uppercase dark:text-stone-400">
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                Previous
              </span>
              <span className="mt-1 text-sm font-semibold text-slate-800 dark:text-stone-100">
                {previous.title}
              </span>
            </a>
          ) : (
            <span aria-hidden />
          )}

          {next ? (
            <a
              href={`#/unit/${next.id}`}
              className="bb-press-soft group flex min-h-16 flex-col justify-center rounded-2xl border border-slate-200/70 px-5 py-3 text-right dark:border-white/10 sm:items-end"
            >
              <span className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.2em] text-slate-500 uppercase dark:text-stone-400">
                Next
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="mt-1 text-sm font-semibold text-slate-800 dark:text-stone-100">
                {next.title}
              </span>
            </a>
          ) : (
            <span aria-hidden />
          )}
        </nav>

        <p className="mt-6 text-center font-mono text-[0.62rem] tracking-[0.2em] text-slate-400 uppercase dark:text-stone-500">
          Swipe or use the arrow keys
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}

export default UnitPage;
