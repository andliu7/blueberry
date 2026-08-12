import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { MessageSquare } from "lucide-react";
import { FeedbackWidget } from "@/components/ui/feedback-widget";
import { GlassFilter, LiquidGlassLayers } from "@/components/ui/liquid-glass-button";
import { postToAppsScript } from "@/lib/appsScript";
import { DockSlot, DOCK } from "@/components/ui/corner-dock";
import { cn } from "@/lib/utils";

/**
 * The floating feedback button and its panel.
 *
 * Lifted out of the study view so the hub and folder pages can carry it too.
 * It was written inline there, and copying it to two more pages would have
 * meant three places to change the endpoint or the copy.
 */

const FEEDBACK_KEY = "grignard_lcta_feedback_v1";

/**
 * Keeps a local copy always, and additionally POSTs to the Apps Script backend
 * when one is configured. With no endpoint set nothing leaves the browser, so a
 * default checkout transmits nothing.
 */
export async function saveFeedback(entry: {
  rating: "helpful" | "not-helpful";
  comment: string;
}) {
  const record = { ...entry, at: new Date().toISOString() };

  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    const all = raw ? JSON.parse(raw) : [];
    all.push(record);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }

  // Fire and forget: the local copy above is the fallback, and a failed POST
  // should never block the widget from closing.
  await postToAppsScript("feedback", record);
}

export function FeedbackButton({
  title = "How's this study guide?",
  placeholder = "What would make this more useful?",
  className,
}: {
  title?: string;
  placeholder?: string;
  /** Position override. The study pages sit it left of the Notes button. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* The corner, and it keeps it. `DOCK.feedback` is 0, the lowest slot, so
          everything else in the dock stacks above rather than over it: someone
          hunting for this button is already having trouble, and finding it in a
          different place on each page is the last thing that should happen. */}
      <DockSlot order={DOCK.feedback}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          // No `relative` here: the dock slot is the containing block for the
          // glass layers, and adding one lets the cascade decide which position
          // wins, which previously threw this button off screen.
          className={cn(
            "flex cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-white/60 px-4 py-2 font-bold text-slate-700 shadow-lg transition-transform hover:scale-105 dark:bg-stone-900/50 dark:text-stone-200",
            className,
          )}
        >
          <LiquidGlassLayers />
          <span className="relative z-10 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
          </span>
        </button>
      </DockSlot>

      {/* One instance supplies the filter the glass layers reference. */}
      <GlassFilter />

      <AnimatePresence>
        {open && (
          <FeedbackWidget
            title={title}
            placeholder={placeholder}
            onSubmit={async (entry) => {
              await saveFeedback(entry);
              setOpen(false);
            }}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default FeedbackButton;
