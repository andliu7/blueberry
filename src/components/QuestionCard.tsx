import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Question } from "@/data/types";
import { PressDepth } from "@/components/ui/press-depth";
import { cn } from "@/lib/utils";
import { MathHtml } from "@/components/ui/math-html";
import { useIsDark } from "@/lib/useIsDark";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { TiltCard } from "@/components/ui/be-ui-tilt-card";

export type Status = "none" | "red" | "yellow" | "green";

const statusStyles: Record<Status, string> = {
  none: "bg-white border-gray-200 dark:bg-stone-900 dark:border-stone-800",
  red: "bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-900",
  yellow: "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/40 dark:border-yellow-900",
  green: "bg-green-50 border-green-300 dark:bg-green-950/40 dark:border-green-900",
};

export function QuestionCard({
  num,
  item,
  status,
  onRate,
  isActive = true,
  open: openProp,
  onOpenChange,
  picks: picksProp,
  onPicksChange,
  submitted: submittedProp,
  onSubmit,
  onRetry,
  showRating = true,
}: {
  num: number;
  item: Question;
  status: Status;
  onRate: (color: Status) => void;
  isActive?: boolean;
  /** Off for a deck whose `features.ratings` is false. */
  showRating?: boolean;
  /** Supply with onOpenChange to let a parent drive expand/collapse all. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Ticked multiple choice options, and whether the answer has been revealed.
   * Both are lifted for the same reason: held inside this card, a reset had no
   * way to reach them and a reset question still showed itself marked.
   */
  picks?: number[];
  onPicksChange?: (next: number[]) => void;
  submitted?: boolean;
  onSubmit?: () => void;
  onRetry?: () => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [uncontrolledPicks, setUncontrolledPicks] = useState<number[]>([]);
  const [uncontrolledSubmitted, setUncontrolledSubmitted] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const picks = picksProp !== undefined ? picksProp : uncontrolledPicks;
  const submitted = submittedProp !== undefined ? submittedProp : uncontrolledSubmitted;

  // A single-answer question reveals on the first click, the way it always has.
  // A select-all waits for Check, since the second tick would otherwise land
  // after the answer had already been given away.
  const choose = (index: number, multi: boolean) => {
    const next = multi
      ? picks.includes(index)
        ? picks.filter((p) => p !== index)
        : [...picks, index]
      : [index];
    setUncontrolledPicks(next);
    onPicksChange?.(next);
    if (!multi) {
      setUncontrolledSubmitted(true);
      onSubmit?.();
    }
  };

  const reveal = () => {
    setUncontrolledSubmitted(true);
    onSubmit?.();
  };

  /**
   * Clears the attempt so the question can be answered again.
   *
   * Goes through the same props the parent drives, rather than only resetting
   * this card's local state: the parent owns picks and submitted, so touching
   * one and not the other would leave a card that says it is unanswered while
   * the parent still thinks it is graded.
   */
  const retry = () => {
    setUncontrolledPicks([]);
    setUncontrolledSubmitted(false);
    onPicksChange?.([]);
    onRetry?.();
  };

  const toggle = () => {
    setUncontrolledOpen(!open);
    onOpenChange?.(!open);
  };

  const isDark = useIsDark();

  if (!isActive) return null;

  const multi = item.mc === true && Array.isArray(item.correct);
  const correct = item.mc
    ? new Set(Array.isArray(item.correct) ? item.correct : [item.correct])
    : new Set<number>();

  const surfaceClass = cn(
    "rounded-lg shadow-sm border transition-[background-color,border-color] duration-200",
    statusStyles[status],
  );

  const body = (
    <div>
      <button

      // The card is the content, not a control: opening it is reading.
      data-click-silent
      // What the deck page's arrow keys step between. Marking the roots rather
      // than wrapping each card in a marker div keeps the containers that lay
      // them out — the grid, the stack, the scroll rail — seeing the card they
      // expect as their direct child.
      data-card
      onClick={toggle}
        aria-expanded={open}
        className="w-full text-left p-5 flex justify-between items-start hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition"
      >
        <div className="flex-1 pr-4">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm block mb-1 font-mono">
            Question {num}
            {item.mc ? (multi ? " · Select all that apply" : " · Multiple Choice") : ""}
          </span>
          <MathHtml
            html={item.q}
            className="font-semibold text-gray-800 dark:text-stone-200 leading-tight"
          />
        </div>
        <svg
          className={cn("w-5 h-5 text-gray-400 dark:text-stone-500 shrink-0 mt-1 transition-transform", open && "rotate-180")}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="p-5 border-t border-gray-100 dark:border-stone-800 bg-indigo-50/50 dark:bg-indigo-400/5">
          {item.mc ? (
            <>
              <div className="space-y-2">
                {item.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => choose(i, multi)}
                    aria-pressed={picks.includes(i)}
                    className={cn(
                      "w-full text-left px-4 py-2 rounded border text-sm transition",
                      !submitted && !picks.includes(i) && "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700",
                      // Ticked but not yet checked: neither right nor wrong, so
                      // indigo rather than either of the grading colours.
                      !submitted && picks.includes(i) && "bg-indigo-100 border-indigo-400 text-indigo-900 dark:bg-indigo-400/20 dark:border-indigo-500 dark:text-indigo-100",
                      submitted && correct.has(i) && "bg-green-100 border-green-400 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-200",
                      submitted && picks.includes(i) && !correct.has(i) && "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/50 dark:border-red-800 dark:text-red-200",
                      submitted && !picks.includes(i) && !correct.has(i) && "border-slate-200 bg-slate-50 opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300",
                      // Marks what *you* chose, which the red/green alone does
                      // not: on a select-all you need to see which correct
                      // options you actually picked and which you missed.
                      submitted && picks.includes(i) && "ring-2 ring-offset-1 ring-slate-400 dark:ring-stone-400 dark:ring-offset-stone-900",
                    )}
                  >
                    <span className="font-mono font-bold mr-2">{String.fromCharCode(97 + i)})</span>
                    {opt}
                    {submitted && picks.includes(i) && (
                      <span className="ml-2 font-mono text-[0.65rem] opacity-70">your answer</span>
                    )}
                  </button>
                ))}
              </div>
              {multi && !submitted && (
                <button
                  onClick={reveal}
                  disabled={picks.length === 0}
                  className="mt-3 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Check answer
                </button>
              )}
              {submitted && (
                <>
                  <button
                    onClick={retry}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-white/5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Try again
                  </button>
                  <MathHtml
                    html={item.a}
                    className="text-gray-800 dark:text-stone-300 leading-relaxed mt-4 pt-4 border-t border-indigo-100 dark:border-stone-800"
                  />
                </>
              )}
            </>
          ) : (
            <MathHtml html={item.a} className="text-gray-800 dark:text-stone-300 leading-relaxed" />
          )}

          {/* A deck can turn rating off. Then there is no row here at all,
              rather than a row of buttons that record nothing. */}
          {showRating && (
          <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-stone-800 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400 dark:text-stone-500 font-medium uppercase tracking-wider mr-auto">
              Rate your recall:
            </span>
            <PressDepth
              depth={2}
              className="!h-7 !px-3 !text-xs !font-bold !bg-red-100 !text-red-700 !border-red-200 dark:!bg-red-900/50 dark:!text-red-200 dark:!border-red-800"
              onClick={() => onRate("red")}
            >
              Review
            </PressDepth>
            <PressDepth
              depth={2}
              className="!h-7 !px-3 !text-xs !font-bold !bg-yellow-100 !text-yellow-700 !border-yellow-200 dark:!bg-yellow-900/50 dark:!text-yellow-200 dark:!border-yellow-800"
              onClick={() => onRate("yellow")}
            >
              Almost
            </PressDepth>
            <PressDepth
              depth={2}
              className="!h-7 !px-3 !text-xs !font-bold !bg-green-100 !text-green-700 !border-green-200 dark:!bg-green-900/50 dark:!text-green-200 dark:!border-green-800"
              onClick={() => onRate("green")}
            >
              Got It
            </PressDepth>
          </div>
          )}
        </div>
      )}
    </div>
  );

  // Spotlight reads well on the pale cards; on the dark ones a soft indigo glow
  // barely registers, so those tilt instead.
  return isDark ? (
    <TiltCard max={6} className={surfaceClass}>
      {body}
    </TiltCard>
  ) : (
    <SpotlightCard spotlightColor="#6366f13d" className={surfaceClass}>
      {body}
    </SpotlightCard>
  );
}
