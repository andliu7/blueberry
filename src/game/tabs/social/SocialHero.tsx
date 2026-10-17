/**
 * Small pieces shared by the social tabs.
 */

/**
 * A row of step pips, one per lesson needed, filled for each one done. Colour
 * is never the only carrier: the "1 of 3" reading sits beside it.
 */
export function StepPips({ done, total, label }: { readonly done: number; readonly total: number; readonly label: string }) {
  const shown = Math.min(done, total);
  return (
    <div className="flex items-center gap-3" role="img" aria-label={`${shown} of ${total} ${label}`}>
      <span className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-3 w-8 rounded-full border-2 ${
              index < shown ? "border-[color:var(--progress-edge)] bg-[color:var(--progress)]" : "border-[color:var(--btn-line)] bg-bb-muted"
            }`}
          />
        ))}
      </span>
      <span className="text-sm font-extrabold text-bb-foreground tabular-nums">
        {shown} / {total}
      </span>
    </div>
  );
}
