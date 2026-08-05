import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Info, AlertTriangle, PartyPopper, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A toast that shows up, says one thing and leaves.
 *
 * Adapted from the supplied component rather than pasted. What that one is, and
 * this one is not, is a frame of a video: its `fps` and `durationInFrames` props
 * are Remotion's, it computes an enter duration from them, it is
 * `position: absolute; inset: 0` over its whole parent, and it has no timer, no
 * dismiss and no way to stack. Dropped into a page it would cover the page and
 * never go away.
 *
 * What is kept is the shape it got right: an accent-tinted icon disc, a bold
 * title over muted body text, the corner placement and the rise-and-fade entry.
 *
 * `role="status"` with `aria-live="polite"` rather than `alert`: this is
 * encouragement, and it should wait for a screen reader to finish its sentence
 * rather than interrupt someone mid-question.
 */

export type ToastVariant = "success" | "error" | "info" | "encourage";

const VARIANTS: Record<
  ToastVariant,
  { icon: typeof Info; ring: string; disc: string; text: string }
> = {
  success: {
    icon: CheckCircle2,
    ring: "border-emerald-200 dark:border-emerald-400/25",
    disc: "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  error: {
    icon: AlertTriangle,
    ring: "border-red-200 dark:border-red-400/25",
    disc: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300",
    text: "text-red-700 dark:text-red-300",
  },
  info: {
    icon: Info,
    ring: "border-slate-200 dark:border-stone-700",
    disc: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-stone-300",
    text: "text-slate-700 dark:text-stone-200",
  },
  encourage: {
    icon: PartyPopper,
    ring: "border-indigo-200 dark:border-indigo-400/25",
    disc: "bg-indigo-100 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300",
    text: "text-indigo-700 dark:text-indigo-300",
  },
};

export function StudyToast({
  open,
  title,
  message,
  variant = "info",
  onClose,
  /** Milliseconds before it leaves on its own. 0 keeps it until dismissed. */
  autoCloseMs = 9000,
  children,
}: {
  open: boolean;
  title: string;
  message?: string;
  variant?: ToastVariant;
  onClose: () => void;
  autoCloseMs?: number;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const v = VARIANTS[variant];
  const Icon = v.icon;

  useEffect(() => {
    if (!open || autoCloseMs <= 0) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
    // onClose is excluded deliberately: an inline arrow from the caller would
    // restart the timer on every render of the page behind it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoCloseMs]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-live="polite"
          // Above the deck furniture but below the About overlay at z-100, so a
          // toast can never sit on top of a dialog someone opened.
          className="fixed right-5 bottom-5 z-[90] w-[min(24rem,calc(100vw-2.5rem))]"
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          <div
            className={cn(
              "flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl dark:bg-stone-900",
              v.ring,
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                v.disc,
              )}
            >
              <Icon className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-bold", v.text)}>{title}</p>
              {message && (
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500 dark:text-stone-400">
                  {message}
                </p>
              )}
              {children && <div className="mt-2.5">{children}</div>}
            </div>

            <button
              onClick={onClose}
              aria-label="Dismiss"
              className="-mt-1 -mr-1 shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-stone-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Fires once when a deck crosses halfway, and once when it is finished.
 *
 * Halfway is the point where the pile behind you stops being smaller than the
 * pile ahead, and it is the moment people quit, so it is worth marking. It says
 * something and offers a break rather than only cheering: someone forty cards
 * into a forty-four card deck at one in the morning is better served by
 * permission to stop than by another "keep going".
 *
 * Keyed by deck so finishing one and opening another arms it again, and held in
 * a ref-like state so re-rating a card you already rated cannot re-fire it.
 */
const HALFWAY_LINES = [
  { title: "Halfway there.", message: "Good spot to stretch, or keep the run going while it is flowing." },
  { title: "That is half the deck.", message: "The rest goes faster than the first half usually does." },
  { title: "Over the hill.", message: "Fewer cards ahead of you than behind. Break now or push through?" },
];

export function useDeckMilestones(deckId: string, reviewed: number, total: number) {
  const [toast, setToast] = useState<{ title: string; message: string; variant: ToastVariant } | null>(
    null,
  );
  const [firedFor, setFiredFor] = useState<string>("");

  useEffect(() => {
    if (total < 6) return; // A four-card deck has no meaningful middle.
    const half = Math.ceil(total / 2);
    const key = `${deckId}:half`;
    if (reviewed === half && firedFor !== key) {
      setFiredFor(key);
      // Rotated by deck rather than at random, so the same deck says the same
      // thing twice in a row and does not feel like a slot machine.
      const line = HALFWAY_LINES[deckId.length % HALFWAY_LINES.length]!;
      setToast({ ...line, variant: "encourage" });
    }
  }, [deckId, reviewed, total, firedFor]);

  return { toast, dismiss: () => setToast(null) };
}

export default StudyToast;
