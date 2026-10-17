import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { MessageSquare } from "lucide-react";
import { FeedbackWidget } from "@/components/ui/feedback-widget";
import { postToAppsScript } from "@/lib/appsScript";
import { cn } from "@/lib/utils";

/**
 * The feedback button and its panel.
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
  /** Extra classes on the button itself. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* In the page, at its foot, with its words on it (2026-10-07). It was a
          glyph in the corner rail, and the replan removes that rail
          (SITE-REPLAN.md section 6). A quiet text button: asking for feedback is
          never the thing the page wants pressed first. */}
      <div className="mx-auto flex max-w-5xl justify-center px-6 py-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white",
            className,
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Send feedback
        </button>
      </div>

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
