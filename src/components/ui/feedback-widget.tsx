import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThumbsUp, ThumbsDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Feedback panel.
 *
 * Written against this app's own styling rather than shadcn's Button, Card and
 * Textarea. Those pull in @radix-ui/react-slot and class-variance-authority and
 * are built on theme tokens (bg-primary, text-card-foreground, border-input,
 * ring-ring) that this project never defines — dropping them in would have
 * rendered a mostly invisible panel and started a second design system beside
 * the existing one.
 */

export interface FeedbackWidgetProps {
  title?: string;
  placeholder?: string;
  onSubmit: (feedback: {
    rating: "helpful" | "not-helpful";
    comment: string;
  }) => Promise<void>;
  onClose: () => void;
  submitText?: string;
  cancelText?: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, duration: 0.6, bounce: 0.4 },
  },
  exit: { opacity: 0, y: 30, scale: 0.95, transition: { duration: 0.2 } },
};

const textAreaVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: {
    opacity: 1,
    height: "auto" as const,
    marginTop: "1rem",
    transition: { duration: 0.3 },
  },
  exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.3 } },
};

const baseBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3 h-9 text-sm font-semibold cursor-pointer outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-400";

export const FeedbackWidget = ({
  title = "Help us improve",
  placeholder = "Your feedback...",
  submitText = "Submit",
  cancelText = "Cancel",
  onSubmit,
  onClose,
}: FeedbackWidgetProps) => {
  const [rating, setRating] = useState<"helpful" | "not-helpful" | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingClick = (selected: "helpful" | "not-helpful") => {
    setRating((current) => (current === selected ? null : selected));
  };

  const handleSubmit = async () => {
    if (!rating || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ rating, comment });
    } finally {
      setIsSubmitting(false);
    }
  };

  const choice = (value: "helpful" | "not-helpful", icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => handleRatingClick(value)}
      aria-pressed={rating === value}
      className={cn(
        baseBtn,
        "border",
        rating === value
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 dark:hover:bg-stone-700",
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm"
      aria-live="polite"
      role="dialog"
      aria-label={title}
    >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-row items-center justify-between p-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-stone-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-stone-400 dark:hover:bg-stone-800 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-2">
            {choice("helpful", <ThumbsUp className="h-4 w-4" />, "Helpful")}
            {choice("not-helpful", <ThumbsDown className="h-4 w-4" />, "Not helpful")}
          </div>

          <AnimatePresence>
            {rating && (
              <motion.div
                key="textarea"
                variants={textAreaVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="overflow-hidden"
              >
                <textarea
                  placeholder={placeholder}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  aria-label="Feedback comment"
                  className="mt-4 flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={cn(baseBtn, "text-slate-600 hover:bg-slate-100 dark:text-stone-300 dark:hover:bg-stone-800")}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!rating || isSubmitting}
              className={cn(
                baseBtn,
                "bg-yellow-400 text-yellow-900 hover:bg-yellow-500/90 dark:bg-yellow-500 dark:text-yellow-950 dark:hover:bg-yellow-500/90",
              )}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitText}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FeedbackWidget;
