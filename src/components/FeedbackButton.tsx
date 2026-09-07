import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { MessageSquare } from "lucide-react";
import { FeedbackWidget } from "@/components/ui/feedback-widget";
import { postToAppsScript } from "@/lib/appsScript";
import { RailSlot, RAIL } from "@/components/ui/corner-dock";
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
  /** Extra classes on the button itself. Position is the rail's job now. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* The corner, and it keeps it, but as a member of the shared rail rather
          than as a pill of its own.

          It had a solid white pill, its own shadow and the word "Feedback" on
          it, which made a support control one of the two loudest things on a
          phone screen whose actual job was to sell a chemistry trainer. A blind
          read against the reference counted four chips of that weight in the
          corner and could not rank them.

          What it must not lose is the thing the old comment was protecting:
          somebody hunting for this is already having trouble, so it stays in
          the same square of screen on every page. It does. The rail is pinned
          to the corner and this is the member next to the head. What it gives
          up is the caption, which `aria-label` and `title` still carry, and its
          own surface, which the rail now carries once for everybody. */}
      <RailSlot order={RAIL.feedback}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Send feedback"
          title="Send feedback"
          // No `relative` here: the rail slot is the containing block, and
          // adding one lets the cascade decide which position wins, which
          // previously threw this button off screen.
          className={cn(
            /* `size-11` is 44px square, the minimum touch target, and the same
               height every other member of the rail keeps. */
            "flex size-11 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white",
            className,
          )}
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </RailSlot>

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
