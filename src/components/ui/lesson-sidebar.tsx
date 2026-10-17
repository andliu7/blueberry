import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A grouped index down the side: groups of items, each group a dropdown.
 *
 * Replaces a horizontal row of seven pills. The pills scrolled sideways on a
 * laptop, gave no sense of how much subject there was, and left nowhere to show
 * the courses that are not written yet without implying they were ready.
 *
 * **The groups come from the caller.** This used to wrap whatever it was given
 * in one hard-coded group labelled "Carbonyls", so the Reactions page showed all
 * 43 reactions, nitration and Sandmeyer included, as carbonyl chemistry
 * (DRAFTS-2026-10-07.md section 3, item 1). Learn's reaction search now passes
 * one group per lesson section, filed by `sectionForFamily`, so this index files
 * a reaction exactly where the lessons do.
 *
 * Labels wrap instead of truncating (SITE-REPLAN.md section 3): a reaction name
 * cut to "Friedel-Crafts acyl..." is a name nobody can search for.
 *
 * Styled by src/components/learn/learn.css (`lrn-card`, `--lrn-ink`), which its
 * one caller, Learn's reaction search, loads.
 */

export interface SidebarGroup {
  id: string;
  label: string;
  items: Topic[];
}

interface Topic {
  id: string;
  label: string;
}

/**
 * The rest of the course, listed so the shape is visible, none of it linked.
 * Aromatics and Amines left this list on 7 Oct: their reactions are filed under
 * them now. "Pericyclic reactions" stays until the owner decides, though
 * Diels-Alder is listed under Dienes (DRAFTS-2026-10-07.md section 3, item 2).
 */
const PLANNED = ["Radicals", "Pericyclic reactions", "Spectroscopy"];

export function LessonSidebar({
  groups,
  active,
  onSelect,
  label = "Lessons",
  startClosed = false,
  showPlanned = true,
}: {
  groups: SidebarGroup[];
  active: string | null;
  onSelect: (id: string) => void;
  label?: string;
  /** Every group starts folded, so a long list opens as its group names. */
  startClosed?: boolean;
  /** The locked "not written yet" rows. Off for a search result, where they are noise. */
  showPlanned?: boolean;
}) {
  // Which groups are closed, by id. Read once, when the index first mounts; a
  // caller that wants it re-read gives the component a new `key`.
  const [closed, setClosed] = useState<Set<string>>(
    () => new Set(startClosed ? groups.map((g) => g.id) : []),
  );
  const toggle = (id: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <nav aria-label={label} className="lrn-card p-2">
      {groups.map((g) => (
        <Group
          key={g.id}
          label={g.label}
          count={g.items.length}
          open={!closed.has(g.id)}
          onToggle={() => toggle(g.id)}
        >
          <ul className="mt-1 space-y-0.5">
            {g.items.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  aria-current={active === x.id ? "true" : undefined}
                  onClick={() => onSelect(x.id)}
                  className={cn(
                    "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    "focus-visible:outline-3 focus-visible:outline-[var(--ring)]",
                    active === x.id
                      ? "bg-[var(--bb-wash)] font-semibold text-[var(--lrn-ink)]"
                      : "text-foreground hover:bg-[var(--bb-wash)]",
                  )}
                >
                  <Circle className="size-1.5 shrink-0 fill-current" />
                  <span className="min-w-0">{x.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </Group>
      ))}

      {showPlanned && (
        <div className="mt-1 border-t border-[var(--site-border)] pt-1">
          {PLANNED.map((label) => (
            <div
              key={label}
              // Not a button. There is nothing behind these, and a control that
              // does nothing when pressed is worse than one that is plainly not
              // ready.
              className="flex cursor-not-allowed items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[var(--site-faint)]"
              title="Not written yet"
            >
              <Lock className="size-3 shrink-0" />
              <span className="min-w-0">{label}</span>
            </div>
          ))}
        </div>
      )}
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
        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--bb-wash)] focus-visible:outline-3 focus-visible:outline-[var(--ring)]"
      >
        <span className="flex-1 text-sm font-semibold">{label}</span>
        <span className="text-xs text-[var(--site-faint)]">{count}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[var(--site-faint)] transition-transform duration-200 motion-reduce:transition-none",
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
