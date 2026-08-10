import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The parts a sidebar is made of: a profile block, rows you can select,
 * sections that fold, and the hamburger that turns into a cross.
 *
 * Adapted from a HextaUI sidebar rather than pasted. What was kept is the shape
 * worth keeping â€” the profile / nav / footer column, the height animation on a
 * collapsible section, and the path-morphing menu toggle. What was dropped is
 * everything that made the original a demo instead of a component: it hardcoded
 * one person's name and email, one fixed list of four buttons, its own copy of
 * the page layout, and a light-only palette of `gray-100` and `blue-100` that
 * would have been the only part of this site that cannot go dark.
 *
 * `motion/react` rather than `framer-motion`, which is the same library under
 * the name it ships as now and is already a dependency here. Nothing was added
 * to `package.json` for this; `lucide-react` was already in too.
 *
 * Nothing in this file knows what Blueberry is. `Dashboard.tsx` is what knows.
 */

const EASE = { duration: 0.22, ease: "easeOut" as const };

/**
 * Three lines that become a cross.
 *
 * The original slid the whole icon down 13px on open, because its two diagonals
 * were drawn in the top-left corner and the shift was what re-centred them. The
 * paths are drawn centred here instead, so the icon morphs in place rather than
 * hopping down the moment you press it.
 */
export function AnimatedMenuToggle({
  isOpen,
  toggle,
  label,
  className,
}: {
  isOpen: boolean;
  toggle: () => void;
  label?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const stroke = {
    fill: "transparent",
    strokeWidth: 2.5,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label ?? (isOpen ? "Close menu" : "Open menu")}
      aria-expanded={isOpen}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-full p-2 text-slate-600 transition-colors outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-stone-300 dark:hover:bg-stone-800",
        className,
      )}
    >
      <motion.svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        initial={false}
        animate={isOpen ? "open" : "closed"}
        transition={reduce ? { duration: 0 } : EASE}
      >
        <motion.path
          {...stroke}
          variants={{ closed: { d: "M 3 5 L 21 5" }, open: { d: "M 6 6 L 18 18" } }}
        />
        <motion.path
          {...stroke}
          variants={{ closed: { d: "M 3 12 L 21 12", opacity: 1 }, open: { opacity: 0 } }}
          transition={{ duration: 0.15 }}
        />
        <motion.path
          {...stroke}
          variants={{ closed: { d: "M 3 19 L 21 19" }, open: { d: "M 6 18 L 18 6" } }}
        />
      </motion.svg>
    </button>
  );
}

/**
 * A heading that folds a group of rows away underneath it.
 *
 * A chevron rather than the original's line-becomes-cross: a cross means
 * "dismiss this" everywhere else on the site, and using it for "collapse" made
 * the two sections look like they could be closed permanently.
 *
 * `height: auto` is animatable here only because `motion` measures the child;
 * that is the whole reason this is a motion div and not a CSS transition.
 */
export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  onHeaderClick,
  active,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  /** Selecting the section itself, for headings that are also a destination. */
  onHeaderClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("mb-1", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => (onHeaderClick && !active ? true : !o));
          onHeaderClick?.();
        }}
        aria-expanded={open}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
          active
            ? "bg-indigo-500/12 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200"
            : "text-slate-600 hover:bg-slate-100 dark:text-stone-300 dark:hover:bg-stone-800",
        )}
      >
        {icon && <span className="flex size-5 shrink-0 items-center justify-center">{icon}</span>}
        <span className="flex-1 truncate">{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={EASE} className="shrink-0">
          <ChevronDown className="size-3.5 opacity-60" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={EASE}
            className="overflow-hidden"
          >
            {/* Indented and ruled, so a child row reads as belonging to the
                heading above it rather than as another top-level destination. */}
            <div className="mt-0.5 ml-5 space-y-0.5 border-l border-slate-200 pl-2 dark:border-stone-700">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * One row of the nav.
 *
 * The selected row carries a filled bar down its left edge as well as a tint,
 * because the tint alone is a 12%-alpha wash that disappears against the panel
 * in dark mode and fails contrast on its own.
 */
export function SidebarNavItem({
  icon,
  label,
  active,
  badge,
  muted,
  onClick,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  /** A count on the right. Hidden at zero rather than shown as an empty pill. */
  badge?: number;
  /** Present but not built yet: still selectable, drawn as unfinished. */
  muted?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
        active
          ? "bg-indigo-500/12 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200"
          : "text-slate-600 hover:bg-slate-100 dark:text-stone-300 dark:hover:bg-stone-800",
        className,
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute top-1.5 bottom-1.5 -left-0.5 w-[3px] rounded-full bg-gradient-to-b from-indigo-500 to-fuchsia-500"
        />
      )}
      {icon && (
        <span className="flex size-5 shrink-0 items-center justify-center opacity-80">{icon}</span>
      )}
      <span className={cn("flex-1 truncate", muted && "opacity-55")}>{label}</span>
      {muted && (
        <span className="shrink-0 rounded-full border border-dashed border-current px-1.5 font-mono text-[0.6rem] opacity-45">
          soon
        </span>
      )}
      {badge !== undefined && badge > 0 && (
        <span className="shrink-0 rounded-full bg-fuchsia-500 px-1.5 py-px font-mono text-[0.65rem] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

/**
 * Who is using this, at the top of the column.
 *
 * A button rather than a block of text: the original drew the same information
 * twice, once here and again on a "View profile" button at the foot, and only
 * the second one did anything.
 */
export function SidebarProfile({
  name,
  detail,
  avatar,
  onClick,
}: {
  name: string;
  detail: string;
  /** A picture when there is one; the fallback is a monogram on the site ramp. */
  avatar?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-400 dark:hover:bg-stone-800"
    >
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
        {avatar}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-stone-100">
          {name}
        </span>
        <span className="block truncate text-xs text-slate-500 dark:text-stone-400">{detail}</span>
      </span>
    </button>
  );
}

/**
 * The column itself: a profile, a scrolling nav, and one action pinned to the
 * bottom.
 *
 * The nav scrolls and the two ends do not, which is the only reason the footer
 * button is reachable once Categories is expanded on a short screen.
 */
export function Sidebar({
  profile,
  footer,
  children,
  className,
}: {
  profile?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {profile && (
        <div className="shrink-0 border-b border-slate-200/80 p-3 dark:border-stone-700/70">
          {profile}
        </div>
      )}
      <nav className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</nav>
      {footer && (
        <div className="shrink-0 border-t border-slate-200/80 p-3 dark:border-stone-700/70">
          {footer}
        </div>
      )}
    </div>
  );
}

export default Sidebar;
