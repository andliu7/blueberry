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
  berry,
  disabled = false,
  external = false,
}: {
  className?: string;
  children: ReactNode;
  /** Renders as a link when given, a button when `onClick` is given instead. */
  href?: string;
  onClick?: () => void;
  /**
   * The link leaves the site, so it opens in its own tab.
   *
   * A prop rather than something the caller works around: the tile that points
   * at the mechanism trainer is pointing at a separate app, and sending
   * somebody there in the same tab loses whatever they were part-way through
   * here.
   */
  external?: boolean;
  /**
   * A berry photograph bled into the corner of the tile.
   *
   * Same treatment as the page background, for the same reason: these are
   * photographs rather than cut-outs, so a radial mask and `screen` keep the
   * lit fruit and drop the table it was shot on. Behind the text and low
   * enough in opacity that it is a tint with a shape rather than a picture
   * competing with the words on top of it.
   */
  berry?: string;
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
      // Lifts as well as tilts. The scale is what makes a hovered tile read as
      // coming forward rather than merely leaning, and the translate keeps its
      // centre where it was so the row does not appear to shuffle.
      el.style.transform = `perspective(900px) translateY(-6px) rotateX(${-py * MAX_ROTATION}deg) rotateY(${px * MAX_ROTATION}deg) scale3d(1.045,1.045,1.045)`;
    };
    const onLeave = () => {
      el.style.transform =
        "perspective(900px) translateY(0px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce, disabled]);

  const shared = cn(
    "tile-sheen group relative isolate flex flex-col rounded-2xl border p-5 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 [transform:perspective(900px)] will-change-transform hover:z-10 hover:shadow-xl",
    disabled
      ? "cursor-not-allowed border-dashed border-slate-300 bg-white/40 dark:border-stone-700 dark:bg-stone-950/40"
      : "cursor-pointer border-slate-200 bg-white/70 hover:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none dark:border-stone-800 dark:bg-stone-950/60 dark:hover:border-indigo-400/50",
    className,
  );

  const art = berry ? (
    <span
      aria-hidden
      className="pointer-events-none absolute -right-6 -bottom-8 -z-10 h-40 w-40 opacity-[0.28] mix-blend-screen saturate-150 transition-opacity duration-300 group-hover:opacity-45"
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}backgrounds/${berry})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        maskImage: "radial-gradient(closest-side, black 30%, transparent 76%)",
        WebkitMaskImage: "radial-gradient(closest-side, black 30%, transparent 76%)",
      }}
    />
  ) : null;

  if (href && !disabled) {
    return (
      <a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className={shared}
      >
        {art}
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
      {art}
      {children}
    </button>
  );
}

export default BentoTile;
