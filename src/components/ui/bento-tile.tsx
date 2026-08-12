import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A board tile that leans toward the cursor.
 *
 * Adapted from the supplied `bento-item`, with three changes. It is TypeScript
 * rather than loose JS; it drops the `aurora-container` / `bento-grid` classes
 * the original depended on, which were never supplied and would have rendered
 * an unstyled stack; and it honours `prefers-reduced-motion`, since a card that
 * tips under the pointer is exactly the kind of thing that setting is for.
 *
 * The transform is written straight to `style` rather than held in state. A
 * pointer move fires many times a second and each one would otherwise be a
 * React render of the whole board; this is the one place where reaching past
 * React is cheaper than going through it.
 */

const MAX_ROTATION = 8;

export function BentoTile({
  className,
  children,
  href,
  onClick,
  disabled = false,
}: {
  className?: string;
  children: ReactNode;
  /** Renders as a link when given, a button when `onClick` is given instead. */
  href?: string;
  onClick?: () => void;
  /** Present but not yet available: dimmed, dashed and not interactive. */
  disabled?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || disabled) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${-py * MAX_ROTATION}deg) rotateY(${px * MAX_ROTATION}deg) scale3d(1.02,1.02,1.02)`;
    };
    const onLeave = () => {
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce, disabled]);

  const shared = cn(
    "group relative flex flex-col overflow-hidden rounded-2xl border p-5 text-left transition-[border-color,background-color] duration-200 [transform:perspective(900px)] will-change-transform",
    disabled
      ? "cursor-not-allowed border-dashed border-slate-300 bg-white/40 dark:border-stone-700 dark:bg-stone-950/40"
      : "cursor-pointer border-slate-200 bg-white/70 hover:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none dark:border-stone-800 dark:bg-stone-950/60 dark:hover:border-indigo-400/50",
    className,
  );

  if (href && !disabled) {
    return (
      <a ref={ref as React.RefObject<HTMLAnchorElement>} href={href} className={shared}>
        {children}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={shared}
    >
      {children}
    </button>
  );
}

export default BentoTile;
