import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The lessons index, down the side.
 *
 * Replaces a horizontal row of seven pills. The pills scrolled sideways on a
 * laptop, gave no sense of how much subject there was, and left nowhere to show
 * the courses that are not written yet without implying they were ready.
 *
 * **Carbonyls is a dropdown, not a spread.** It is one unit of nine sections and
 * the only one with content, so it opens by default and the others sit under it
 * collapsed and marked. That way the page says what the plan is without pretending
 * any of it is finished.
 *
 * On narrow screens the whole thing collapses to a single closed group, since a
 * fixed 240px column on a phone is most of the screen given over to navigation.
 */

interface Topic {
  id: string;
  label: string;
}

/** The rest of the course, listed so the shape is visible, none of it linked. */
const PLANNED = [
  "Aromatics",
  "Amines",
  "Radicals",
  "Pericyclic reactions",
  "Spectroscopy",
];

export function LessonSidebar({
  topics,
  active,
  onSelect,
}: {
  topics: Topic[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <nav
      aria-label="Lessons"
      className="rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm lg:sticky lg:top-4 dark:border-stone-800 dark:bg-stone-950/70"
    >
      <Group
        label="Carbonyls"
        count={topics.length}
        open={open}
        onToggle={() => setOpen((o) => !o)}
      >
        <ul className="mt-1 space-y-0.5" role="tablist">
          {topics.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                role="tab"
                aria-selected={active === x.id}
                onClick={() => onSelect(x.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  active === x.id
                    ? "bg-indigo-600 font-semibold text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-indigo-700 dark:text-stone-300 dark:hover:bg-stone-900 dark:hover:text-indigo-200",
                )}
              >
                <Circle
                  className={cn(
                    "size-1.5 shrink-0",
                    active === x.id ? "fill-white text-white" : "fill-slate-300 text-slate-300 dark:fill-stone-700 dark:text-stone-700",
                  )}
                />
                <span className="min-w-0 truncate">{x.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </Group>

      <div className="mt-1 border-t border-slate-100 pt-1 dark:border-stone-900">
        {PLANNED.map((label) => (
          <div
            key={label}
            // Not a button. There is nothing behind these, and a control that
            // does nothing when pressed is worse than one that is plainly not
            // ready.
            className="flex cursor-not-allowed items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-400 dark:text-stone-600"
            title="Not written yet"
          >
            <Lock className="size-3 shrink-0" />
            <span className="min-w-0 truncate">{label}</span>
          </div>
        ))}
      </div>
    </nav>
  );
}

function Group({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-stone-900"
      >
        <span className="flex-1 text-sm font-semibold">{label}</span>
        <span className="font-mono text-[0.65rem] text-slate-400 dark:text-stone-500">{count}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LessonSidebar;
