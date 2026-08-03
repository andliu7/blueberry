import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SuccessParticles, useParticleBurst } from "@/components/ui/particle-button";

export interface GradientMenuItem {
  title: string;
  icon: ReactNode;
  onClick: () => void;
  /** Start of the 45deg fill revealed on hover. */
  gradientFrom: string;
  gradientTo: string;
  /** Renders the pill already open and filled, for toggles that are on. */
  active?: boolean;
  /** Emit a particle burst on click. */
  particles?: boolean;
  /** Tailwind colour for the particles, e.g. "bg-yellow-200". */
  particleClassName?: string;
  /**
   * Fire a burst on a timer as well as on click, so a control that is easy to
   * miss in a crowded toolbar keeps catching the eye. The button flashes with
   * each burst.
   */
  idleBurstMs?: number;
  /**
   * Overrides the pill's resting colour, before any hover. The default rest
   * state is plain white, which makes a button easy to overlook in a row of
   * them. The hover and active gradient is unaffected.
   */
  restClassName?: string;
}

/**
 * A row of circular buttons that widen into labelled pills on hover, revealing a
 * gradient fill. Adapted from the gradient-menu pattern: driven by props rather
 * than a hard-coded list, using lucide icons, and toned to this app's palette.
 */
export default function GradientMenu({
  items,
  className,
}: {
  items: GradientMenuItem[];
  className?: string;
}) {
  return (
    <ul className={cn("flex items-center gap-2", className)}>
      {items.map((item) => (
        <li key={item.title} className="contents">
          <GradientMenuButton {...item} />
        </li>
      ))}
    </ul>
  );
}

/** A single pill. Exported so a parent can lay the buttons out itself — the
 *  floating cluster animates each one individually. */
export function GradientMenuButton({
  title,
  icon,
  onClick,
  gradientFrom,
  gradientTo,
  active,
  particles,
  particleClassName,
  idleBurstMs,
  restClassName,
}: GradientMenuItem) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const { bursting, burst } = useParticleBurst(700);

  // Intermittent, not continuous: a burst every few seconds reads as a nudge,
  // where a constant animation reads as a broken loading state. Pauses while
  // the tab is hidden so a backgrounded page is not animating to nobody.
  useEffect(() => {
    if (!idleBurstMs || !particles) return;
    const id = setInterval(() => {
      if (!document.hidden) burst();
    }, idleBurstMs);
    return () => clearInterval(id);
  }, [idleBurstMs, particles, burst]);

  return (
    <>
    {/* SuccessParticles portals to document.body, so a transformed ancestor
        cannot capture its fixed positioning. */}
    {particles && bursting && (
      <SuccessParticles anchorRef={btnRef} className={particleClassName} />
    )}
    <button
            ref={btnRef}
            type="button"
            onClick={() => {
              if (particles) burst();
              onClick();
            }}
            aria-label={title}
            aria-pressed={active}
            style={
              {
                "--gradient-from": gradientFrom,
                "--gradient-to": gradientTo,
              } as React.CSSProperties
            }
            className={cn(
              "relative h-9 rounded-full bg-white border border-slate-200 shadow-sm",
              "dark:bg-stone-900 dark:border-stone-800",
              // Resting tint, if this button asked for one. Only at rest: once
              // active the gradient covers it anyway.
              !active && restClassName,
              "flex items-center justify-center overflow-hidden shrink-0 cursor-pointer group",
              "transition-[width,box-shadow] duration-500 ease-out outline-none",
              "focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f4ef] dark:focus-visible:ring-offset-[#0c0a09]",
              active ? "w-auto px-3.5 border-transparent" : "w-9 hover:w-[8.5rem]",
              // Flashes with the idle burst so the eye is drawn to the button,
              // not only to the sparks leaving it.
              idleBurstMs && bursting && "ring-2 ring-yellow-300/80 dark:ring-yellow-200/70",
            )}
          >
            {/* Gradient fill, revealed as the pill opens. */}
            <span
              className={cn(
                "absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))]",
                "transition-opacity duration-500",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            />
            {/* Soft glow beneath the pill. */}
            <span
              aria-hidden
              className={cn(
                "absolute top-1.5 inset-x-0 h-full rounded-full blur-[15px] -z-10",
                "bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))]",
                "transition-opacity duration-500",
                active ? "opacity-40" : "opacity-0 group-hover:opacity-40",
              )}
            />

            {active ? (
              <span className="relative z-10 flex items-center gap-1.5 text-white text-sm font-semibold whitespace-nowrap">
                <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>
                {title}
              </span>
            ) : (
              <>
                {/* Icon shrinks away as the label scales in. */}
                <span className="relative z-10 text-slate-500 dark:text-stone-300 transition-transform duration-500 group-hover:scale-0 [&>svg]:w-[1.15rem] [&>svg]:h-[1.15rem]">
                  {icon}
                </span>
                <span className="absolute z-10 text-white text-sm font-semibold whitespace-nowrap scale-0 transition-transform duration-500 delay-150 group-hover:scale-100">
                  {title}
                </span>
              </>
      )}
    </button>
    </>
  );
}
