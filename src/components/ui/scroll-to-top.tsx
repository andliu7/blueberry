"use client";

import { ArrowUp } from "lucide-react";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { cn } from "@/lib/utils";

/**
 * Sits in the flow at the end of the question list rather than floating, so it
 * appears exactly when you have run out of cards and never covers one.
 */
export function ScrollToTop({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-end", className)}>
      <MagneticButton distance={0.35}>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          title="Back to top"
          className={cn(
            "group flex items-center gap-2 rounded-full cursor-pointer",
            "border border-slate-200 bg-white px-4 py-2 shadow-sm",
            "dark:border-stone-800 dark:bg-stone-900",
            "text-sm font-semibold text-slate-600 dark:text-stone-300",
            "outline-none transition-colors hover:text-slate-900 dark:hover:text-white",
            "focus-visible:ring-2 focus-visible:ring-indigo-400",
          )}
        >
          <ArrowUp className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
          Back to top
        </button>
      </MagneticButton>
    </div>
  );
}

export default ScrollToTop;
