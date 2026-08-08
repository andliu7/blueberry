import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Layers, Maximize2, GalleryHorizontalEnd, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The banner that offers the way this deck is actually meant to be drilled.
 *
 * Flip, carousel and focus mode were built separately and are three separate
 * controls, so nothing tells you they are one thing: a card at a time, filling
 * the screen, turned over with the space bar. People find Flip on its own and
 * end up drilling a two-column grid of small cards, which is the worst of both.
 *
 * This replaces the toast that used to say so. The toast only fired if you
 * happened to switch to Flip, and it fired *at* you, mid-scroll, once, and then
 * never again — so the one moment it was useful was the one moment you were
 * busy. A banner at the top of the deck is there before you have started, on
 * every deck, and waits rather than interrupting.
 *
 * It says how to do it by hand as well as doing it for you. A button that
 * silently rearranges three settings teaches nothing, and the point is that
 * next time you should be able to set it up yourself.
 */

const KEY = "grignard_lcta_drill_banner_v1";

function loadDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function saveDismissed(v: boolean) {
  try {
    if (v) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** One of the three settings, named the way the toolbar names it. */
function Step({
  icon,
  label,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-indigo-500/12 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300">
        {icon}
      </span>
      <span className="text-xs leading-relaxed text-slate-600 dark:text-stone-400">
        <span className="font-semibold text-slate-800 dark:text-stone-200">{label}</span>{" "}
        {detail}
      </span>
    </li>
  );
}

/**
 * The three controls, named the way the study deck's toolbar names them.
 *
 * A prop rather than hardcoded because the reference decks reach the same place
 * through differently-named buttons, and a banner that pointed at a control
 * called something else would be worse than no banner.
 */
export type DrillStep = { icon: React.ReactNode; label: string; detail: string };

export const STUDY_STEPS: DrillStep[] = [
  {
    icon: <Layers className="size-3" />,
    label: "Flip",
    detail: "in the toolbar puts the question on the front and the answer on the back.",
  },
  {
    icon: <GalleryHorizontalEnd className="size-3" />,
    label: "Carousel",
    detail: "is the view button, and shows one card instead of the whole list.",
  },
  {
    icon: <Maximize2 className="size-3" />,
    label: "Focus",
    detail: "appears once you are in the carousel and takes everything else away. Escape leaves it.",
  },
];

export const REFERENCE_STEPS: DrillStep[] = [
  {
    icon: <GalleryHorizontalEnd className="size-3" />,
    label: "Carousel",
    detail: "is the view button, and shows one card at a time instead of the whole table.",
  },
  {
    icon: <Layers className="size-3" />,
    label: "The card",
    detail: "has the reaction on the front and the answer on the back. Space turns it over.",
  },
  {
    icon: <Maximize2 className="size-3" />,
    label: "Focus",
    detail: "appears once you are in the carousel and takes everything else away. Escape leaves it.",
  },
];

export function DrillBanner({
  /** True when the deck is already set up this way, so there is nothing to offer. */
  active,
  onStart,
  steps = STUDY_STEPS,
  lead = "These decks work best as real flashcards: one card filling the screen, arrows to move between them, space to turn one over.",
  className,
}: {
  active: boolean;
  /** Sets all three at once. */
  onStart: () => void;
  steps?: DrillStep[];
  lead?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [dismissed, setDismissed] = useState(loadDismissed);

  // Nothing to say once you are already there. Not unmounted, so leaving focus
  // mode brings it back rather than losing it for the rest of the visit.
  if (active) return null;

  if (dismissed) {
    // Collapsed rather than gone. Dismissing something you have read should not
    // mean you can never find it again, and a deck you come back to in three
    // weeks is a deck you have forgotten the trick for.
    return (
      <button
        type="button"
        onClick={() => {
          setDismissed(false);
          saveDismissed(false);
        }}
        className={cn(
          "mb-6 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-500 backdrop-blur transition hover:text-slate-800 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-400 dark:hover:text-stone-100",
          className,
        )}
      >
        <Sparkles className="size-3.5" />
        How to drill this deck
      </button>
    );
  }

  return (
    <AnimatePresence initial={false}>
      <motion.aside
        initial={reduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn(
          "relative mb-6 overflow-hidden rounded-2xl border border-indigo-200/70 bg-white/80 p-4 backdrop-blur sm:p-5 dark:border-indigo-400/25 dark:bg-stone-900/70",
          className,
        )}
      >
        {/* The site's accent, as a hairline along the top rather than a fill.
            A solid indigo panel here would outrank the deck's own title. */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo-500 to-fuchsia-500"
        />

        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            saveDismissed(true);
          }}
          aria-label="Hide this"
          className="absolute top-3 right-3 cursor-pointer rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="min-w-0 flex-1">
            <h2 className="title-face flex items-center gap-2 pr-8 text-lg text-slate-900 dark:text-stone-100">
              <Sparkles className="size-4 shrink-0 text-indigo-500 dark:text-indigo-300" />
              Drill this one card at a time
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-stone-400">
              {lead}
            </p>

            <ul className="mt-3 space-y-1.5">
              {steps.map((s) => (
                <Step key={s.label} icon={s.icon} label={s.label} detail={s.detail} />
              ))}
            </ul>
          </div>

          <div className="shrink-0 sm:pt-1">
            <button
              type="button"
              onClick={onStart}
              className="group/start inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 sm:w-auto"
            >
              Set all three
              <span
                aria-hidden
                className="inline-block transition-transform duration-300 group-hover/start:translate-x-0.5"
              >
                &rarr;
              </span>
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

export default DrillBanner;
