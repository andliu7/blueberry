/**
 * The mid-question help button (30 Oct, round 2): a small "?" beside the
 * progress strip that opens the lesson's need-help path (read-along,
 * walk-through, earlier lessons) in a sheet over the question. No score, no
 * cost, closing it returns to the same question untouched. Renders nothing
 * for a lesson with no lesson-chain entry. Reads only lessonLinks (entry chunk
 * safe); the prose in LessonHelp loads lazily when the sheet opens.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { CHAIN_LINKS } from "../content/lessonChain";

const LessonHelp = lazy(() => import("./LessonHelp"));

export function QuestionHelp({ node, stage = null }: { readonly node: string; readonly stage?: string | null }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!(node in CHAIN_LINKS)) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Need help with this lesson"
        title="Need help with this lesson"
        className="question-help shrink-0 rounded-full border-2 border-bb-border bg-bb-card px-2.5 py-0.5 text-scale-sm font-bold text-bb-primary-ink"
      >
        ?
      </button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Help with this lesson" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-bb-card p-4 pb-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-scale-sm text-bb-muted-foreground">Your question is waiting. Nothing here is scored.</p>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="rounded-xl border-2 border-bb-border px-3 py-1 text-scale-sm font-semibold">
                Back to the question
              </button>
            </div>
            <Suspense fallback={null}>
              <LessonHelp node={node} stage={stage} openNow />
            </Suspense>
          </div>
        </div>
      ) : null}
    </>
  );
}
