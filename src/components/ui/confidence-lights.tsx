import { useMemo } from "react";
import { usePageFlip } from "@/components/ui/page-flip";
import { tallyAcross } from "@/lib/progress";
import { deckHref, type Deck } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * The three lights, and what makes them worth pressing.
 *
 * Every card on this site is rated red, yellow or green while you study it, and
 * until now those ratings only existed inside the deck that produced them. You
 * could see that one deck was 6 of 38, and nothing anywhere told you the thing
 * you actually want to know at the start of a session: *what should I open?*
 *
 * So these are not a legend and not a progress bar. Each light is a count
 * across every deck you have touched, and pressing it takes you to the deck
 * holding the most of that colour — the worst one for red, the strongest for
 * green. The number is trivia; the destination is the point.
 *
 * A light with nothing behind it is drawn dim and is not pressable, rather than
 * hidden, so the row does not reflow as you study and the three always mean the
 * same three things in the same three places.
 */

const LIGHTS = [
  {
    key: "red" as const,
    label: "Shaky",
    hint: "Open the deck with the most red cards",
    dot: "bg-rose-500",
    ring: "hover:border-rose-400 focus-visible:ring-rose-400",
    text: "text-rose-600 dark:text-rose-300",
  },
  {
    key: "yellow" as const,
    label: "Getting there",
    hint: "Open the deck with the most yellow cards",
    dot: "bg-amber-400",
    ring: "hover:border-amber-400 focus-visible:ring-amber-400",
    text: "text-amber-600 dark:text-amber-300",
  },
  {
    key: "green" as const,
    label: "Solid",
    hint: "Open the deck you know best",
    dot: "bg-emerald-500",
    ring: "hover:border-emerald-400 focus-visible:ring-emerald-400",
    text: "text-emerald-600 dark:text-emerald-300",
  },
];

export function ConfidenceLights({ decks, className }: { decks: Deck[]; className?: string }) {
  const flipTo = usePageFlip();

  // One localStorage read per deck, so it is done once here rather than inside
  // each of the three buttons.
  const { total, worst } = useMemo(() => tallyAcross(decks.map((d) => d.id)), [decks]);

  const byId = useMemo(() => new Map(decks.map((d) => [d.id, d])), [decks]);
  const rated = total.red + total.yellow + total.green;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {LIGHTS.map((light) => {
        const count = total[light.key];
        const targetId = worst[light.key];
        const target = targetId ? byId.get(targetId) : undefined;
        const live = count > 0 && Boolean(target);

        return (
          <button
            key={light.key}
            type="button"
            disabled={!live}
            onClick={() => target && flipTo(deckHref(target))}
            title={live ? `${light.hint}: ${target!.title}` : "Nothing rated this colour yet"}
            aria-label={
              live
                ? `${count} ${light.label} cards. ${light.hint}: ${target!.title}`
                : `No ${light.label} cards yet`
            }
            className={cn(
              "group inline-flex min-h-11 items-center gap-2.5 rounded-full border px-4 transition-colors focus-visible:ring-2 focus-visible:outline-none",
              live
                ? cn(
                    "cursor-pointer border-slate-200 bg-white/70 dark:border-stone-800 dark:bg-stone-950/60",
                    light.ring,
                  )
                : "cursor-not-allowed border-dashed border-slate-200 opacity-50 dark:border-stone-800",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-2.5 shrink-0 rounded-full transition-transform",
                light.dot,
                live && "group-hover:scale-125",
                !live && "opacity-50",
              )}
            />
            <span className="text-sm font-semibold">{light.label}</span>
            <span
              className={cn("font-mono text-xs tabular-nums", live ? light.text : "text-slate-400")}
            >
              {count}
            </span>
          </button>
        );
      })}

      {rated === 0 && (
        <p className="ml-1 text-sm text-slate-500 dark:text-stone-400">
          Rate a few cards and these become shortcuts.
        </p>
      )}
    </div>
  );
}

export default ConfidenceLights;
