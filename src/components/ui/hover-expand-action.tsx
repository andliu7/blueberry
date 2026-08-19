import { cn } from "@/lib/utils";

/**
 * An icon that grows its label when you reach for it.
 *
 * Wanted in two places now, the calendar's import control and the burger, and
 * the codebase already had two different implementations of it: a
 * `grid-cols-[0fr]` version on the old lessons pencil and a `max-w-0` version on
 * `DashboardButton`. One component so the two cannot drift.
 *
 * **The label is never hover-only.** `DashboardButton` carries a comment about
 * why: it used to hide the word until hover, which made it an unlabelled square
 * on every phone and tablet, and it is the way in to most of the site. The
 * expansion here is an enhancement for pointers, not the only way to read the
 * control:
 *
 * - `always` keeps the word visible at all widths. For primary navigation.
 * - `sm` hides it below the `sm` breakpoint only, where the row is already full
 *   and the 44px target plus `aria-label` do the work. Still not hover-gated:
 *   a touch device at any width above `sm` shows the word.
 * - `hover` is the collapsed-until-reached-for behaviour, and is only correct
 *   for a secondary action that something else already explains.
 *
 * `grid-template-columns` from 0fr to 1fr rather than a guessed `max-width`,
 * because the label has no width to animate to until it is laid out and `auto`
 * is not interpolable. `group-focus-visible` opens it for a keyboard user, who
 * never hovers anything.
 */

export type LabelVisibility = "always" | "sm" | "hover";

export function HoverExpandAction({
  icon,
  label,
  onClick,
  href,
  active,
  labelAt = "hover",
  title,
  className,
  ...rest
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  /** Renders an anchor instead of a button, for controls that are destinations. */
  href?: string;
  active?: boolean;
  labelAt?: LabelVisibility;
  title?: string;
  className?: string;
} & Pick<React.AriaAttributes, "aria-expanded" | "aria-haspopup">) {
  const Tag = href ? "a" : "button";

  return (
    <Tag
      {...(href ? { href } : { type: "button" as const })}
      onClick={onClick}
      // The full meaning at all times, whatever the visible word is doing.
      aria-label={label}
      title={title ?? label}
      {...rest}
      className={cn(
        "group/expand inline-flex min-h-11 cursor-pointer items-center gap-0 rounded-full border px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
        active
          ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200"
          : "border-slate-200 bg-white/85 text-slate-600 hover:border-indigo-300 hover:bg-white hover:text-indigo-700 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300 dark:hover:border-indigo-400/50 dark:hover:bg-stone-800 dark:hover:text-indigo-200",
        className,
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">{icon}</span>

      {labelAt === "hover" ? (
        <span
          className={cn(
            "grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-out",
            "group-hover/expand:grid-cols-[1fr] group-focus-visible/expand:grid-cols-[1fr]",
            "motion-reduce:transition-none motion-reduce:grid-cols-[1fr]",
          )}
        >
          <span className="overflow-hidden whitespace-nowrap">
            <span className="pl-2">{label}</span>
          </span>
        </span>
      ) : (
        <span className={cn("pl-2 whitespace-nowrap", labelAt === "sm" && "hidden sm:inline")}>
          {label}
        </span>
      )}
    </Tag>
  );
}

export default HoverExpandAction;
