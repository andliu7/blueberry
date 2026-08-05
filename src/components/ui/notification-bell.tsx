import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A bell with an unread count and a panel hanging off it.
 *
 * Structurally the supplied notifications component, rebuilt on this project's
 * conventions. The original is shadcn: it needs `@radix-ui/react-popover` plus
 * the `bg-popover`, `text-muted-foreground`, `bg-card` and `border-border`
 * custom properties, and this project defines none of them, so pasted in as-is
 * it renders an unstyled column of text on a transparent background.
 *
 * What Radix would have bought is the part that is easy to get wrong, so it is
 * done by hand here rather than skipped: Escape closes, a click outside closes,
 * the trigger reports `aria-expanded`, and the panel is labelled by it.
 *
 * Deliberately not focus-trapped. A popover is not a dialog, and trapping focus
 * in one means the only way out is a key nobody knows to press.
 */
export function NotificationBell({
  count,
  label = "Notifications",
  children,
  onOpen,
  className,
}: {
  /** Unread count. Zero hides the badge rather than showing a nought. */
  count: number;
  label?: string;
  children: ReactNode;
  onOpen?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // `pointerdown`, not `click`: a click fires after the button it landed on
    // has already done its work, so a control inside the panel that closes it
    // would run twice.
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={wrap} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={count > 0 ? `${label}, ${count} unread` : label}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) onOpen?.();
        }}
        className="relative inline-flex items-center justify-center rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-stone-100"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.15rem] rounded-full bg-indigo-600 px-1 text-center font-mono text-[0.65rem] leading-[1.15rem] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label={label}
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-stone-800 dark:bg-stone-900"
        >
          <div className="max-h-96 overflow-y-auto">{children}</div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
