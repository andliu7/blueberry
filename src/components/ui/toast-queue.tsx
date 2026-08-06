import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A stack of notices in the bottom right, newest lowest, growing upward.
 *
 * Two things here are unusual and both are deliberate.
 *
 * **The close button is top left.** It is normally top right, and top right is
 * where the eye goes, which is exactly the problem: these carry actions worth
 * reading and a dismiss under the cursor's resting path gets pressed before the
 * message is read.
 *
 * **A toast can block the page.** `blocking` puts a blurred scrim over
 * everything behind it, so finishing a deck is a moment you have to acknowledge
 * rather than something that scrolls past. Any click clears it, including one on
 * the page behind, because insisting on a specific button would make it a trap
 * rather than a pause. Anything marked `spotlight` is lifted above the scrim and
 * stays sharp, which is how the Needs Review button stays usable while the rest
 * of the page is behind glass.
 *
 * Newest at the bottom rather than the top: the stack grows away from the
 * corner, so the newest notice is always in the same place and the older ones
 * move instead.
 */

export interface QueuedToast {
  id: string;
  title: string;
  message?: string;
  /** Rendered under the message: buttons, reactions, whatever the notice needs. */
  actions?: React.ReactNode;
  /** Large glyph on the right, e.g. a flame. Decorative. */
  glyph?: string;
  /** Blurs the page behind until this is acknowledged. */
  blocking?: boolean;
  tone?: "encourage" | "celebrate" | "info";
}

const TONES = {
  encourage: "border-indigo-200 dark:border-indigo-400/30",
  celebrate: "border-amber-200 dark:border-amber-400/30",
  info: "border-slate-200 dark:border-stone-700",
} as const;

export function ToastQueue({
  toasts,
  onDismiss,
}: {
  toasts: QueuedToast[];
  onDismiss: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const blocking = toasts.find((t) => t.blocking);

  /**
   * Any click anywhere clears the block.
   *
   * Bound on the window rather than only to the scrim, because a click on a
   * spotlit control has to count too: pressing Needs Review is precisely the
   * thing the notice was asking for, and having to then dismiss the notice
   * separately would be the notice getting in the way of its own advice.
   *
   * Deferred a tick past the click that created the block, or the same press
   * that finished the deck would dismiss the notice it opened.
   */
  const armed = useRef(false);
  useEffect(() => {
    if (!blocking) return;
    armed.current = false;
    const arm = setTimeout(() => (armed.current = true), 350);
    const onAnyClick = () => {
      if (armed.current) onDismiss(blocking.id);
    };
    window.addEventListener("click", onAnyClick);
    return () => {
      clearTimeout(arm);
      window.removeEventListener("click", onAnyClick);
    };
  }, [blocking, onDismiss]);

  // The scrim needs a class on the document so spotlit elements can lift
  // themselves above it; see `.toast-spotlight` in index.css.
  useEffect(() => {
    document.documentElement.classList.toggle("toast-blocking", Boolean(blocking));
    return () => document.documentElement.classList.remove("toast-blocking");
  }, [blocking]);

  return (
    <>
      <AnimatePresence>
        {blocking && (
          <motion.div
            aria-hidden
            className="fixed inset-0 z-[80] bg-white/40 backdrop-blur-sm dark:bg-black/50"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          />
        )}
      </AnimatePresence>

      {/* `flex-col` with the newest last puts it nearest the corner, and the
          stack grows upward as older ones are pushed off the bottom. */}
      <div className="pointer-events-none fixed right-5 bottom-5 z-[95] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              role="status"
              aria-live="polite"
              className="pointer-events-auto"
              initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              <div
                className={cn(
                  "relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-white p-4 pl-11 shadow-xl dark:bg-stone-900",
                  TONES[t.tone ?? "info"],
                )}
              >
                {/* Top left, away from where the eye lands. */}
                <button
                  onClick={() => onDismiss(t.id)}
                  aria-label="Dismiss"
                  className="absolute top-2.5 left-2.5 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-stone-200"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-stone-100">{t.title}</p>
                  {t.message && (
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-500 dark:text-stone-400">
                      {t.message}
                    </p>
                  )}
                  {t.actions && <div className="mt-3 flex flex-wrap items-center gap-2">{t.actions}</div>}
                </div>

                {t.glyph && (
                  <span aria-hidden className="shrink-0 self-center text-3xl leading-none select-none">
                    {t.glyph}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

/** Adds, removes and replaces notices without the caller tracking ids. */
export function useToastQueue() {
  const [toasts, setToasts] = useState<QueuedToast[]>([]);

  const push = useCallback((t: QueuedToast) => {
    setToasts((list) => (list.some((x) => x.id === t.id) ? list : [...list, t]));
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  return { toasts, push, dismiss };
}

export default ToastQueue;
