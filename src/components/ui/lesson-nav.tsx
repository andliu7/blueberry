"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The course index: sections, with their reactions nested underneath.
 *
 * A flat list stopped working once every section carried four or five
 * reactions. Nesting them keeps the shape of the subject visible while letting
 * a section that is not open take one line instead of six.
 *
 * Open state is per section and independent of selection, so opening a section
 * to look at what is in it does not throw away the page you were reading. The
 * section holding the current selection opens itself and stays open.
 *
 * Height is animated through `grid-template-rows: 0fr -> 1fr` rather than
 * max-height. A guessed max-height either clips a long section or coasts
 * through empty space on a short one; the grid trick animates to the real
 * measured height without either.
 */

export interface NavChild {
  id: string;
  label: string;
  /** Shown as a small trailing marker, e.g. a flag or a tier. */
  hint?: string;
}

export interface NavSection {
  id: string;
  label: string;
  children: NavChild[];
}

export function LessonNav({
  sections,
  activeSection,
  activeChild,
  onSelectSection,
  onSelectChild,
  className,
}: {
  sections: NavSection[];
  activeSection: string;
  /** Null when the section itself is being read rather than one of its reactions. */
  activeChild: string | null;
  onSelectSection: (id: string) => void;
  onSelectChild: (sectionId: string, childId: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([activeSection]));

  // Follow the selection. Navigating to a reaction from anywhere else should
  // reveal where it lives rather than leaving the index looking unchanged.
  useEffect(() => {
    setOpen((prev) => (prev.has(activeSection) ? prev : new Set(prev).add(activeSection)));
  }, [activeSection]);

  return (
    <nav
      aria-label="Course sections"
      className={cn(
        "rounded-3xl border border-slate-200 bg-white/80 p-2 shadow-sm dark:border-stone-800 dark:bg-stone-950/70",
        className,
      )}
    >
      <ul className="flex flex-col gap-0.5">
        {sections.map((section) => {
          const isOpen = open.has(section.id);
          const selected = activeSection === section.id && activeChild === null;

          return (
            <li key={section.id}>
              <div className="flex items-stretch gap-0.5">
                <button
                  type="button"
                  onClick={() => onSelectSection(section.id)}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 flex-1 items-center rounded-xl px-3 text-left text-sm font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    selected
                      ? "bg-indigo-600 text-white"
                      : "text-slate-700 hover:bg-slate-100 dark:text-stone-200 dark:hover:bg-stone-800",
                  )}
                >
                  {section.label}
                </button>

                {section.children.length > 0 && (
                  /* Its own control, not the whole row. Making the row toggle
                     open would mean you cannot read a section without also
                     expanding it, and cannot expand it without navigating. */
                  <button
                    type="button"
                    onClick={() =>
                      setOpen((prev) => {
                        const next = new Set(prev);
                        if (next.has(section.id)) next.delete(section.id);
                        else next.add(section.id);
                        return next;
                      })
                    }
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Collapse" : "Expand"} ${section.label}, ${section.children.length} reactions`}
                    className="flex min-h-11 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                  >
                    <ChevronRight
                      className={cn(
                        "size-4 transition-transform duration-200 motion-reduce:transition-none",
                        isOpen && "rotate-90",
                      )}
                    />
                  </button>
                )}
              </div>

              {section.children.length > 0 && (
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    {/* Indented against a rule, so the nesting is visible
                        without relying on the indent alone. */}
                    <ul
                      className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-slate-200 pl-2 dark:border-stone-800"
                      aria-hidden={!isOpen}
                    >
                      {section.children.map((child) => {
                        const on = activeChild === child.id;
                        return (
                          <li key={child.id}>
                            <button
                              type="button"
                              tabIndex={isOpen ? 0 : -1}
                              onClick={() => onSelectChild(section.id, child.id)}
                              aria-current={on ? "page" : undefined}
                              className={cn(
                                "flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                                on
                                  ? "bg-indigo-50 font-semibold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200"
                                  : "text-slate-600 hover:bg-slate-100 dark:text-stone-300 dark:hover:bg-stone-800",
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate">{child.label}</span>
                              {child.hint && (
                                <span className="shrink-0 font-mono text-[.65rem] text-slate-400 dark:text-stone-500">
                                  {child.hint}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * A structure drawing, in whichever theme is showing.
 *
 * Two files rather than one, because RDKit writes literal colours into the SVG
 * and an `<img>` does not inherit CSS, so `currentColor` is not available. Both
 * are in the markup and CSS picks; the alternative is reading the theme in JS
 * and getting a wrong-coloured flash on first paint.
 */
export function MoleculeArt({
  light,
  dark,
  alt,
  className,
}: {
  light?: string;
  dark?: string;
  alt: string;
  className?: string;
}) {
  const base = import.meta.env.BASE_URL;
  if (!light && !dark) {
    return (
      <p className={cn("text-sm text-slate-400 dark:text-stone-500", className)}>
        No structure drawing yet.
      </p>
    );
  }
  return (
    <>
      {light && (
        <img
          src={base + light}
          alt={alt}
          /* Dimensions declared: the drawings are 340x210 and reserving that
             box stops the card jumping as each one decodes. */
          width={340}
          height={210}
          loading="lazy"
          className={cn("dark:hidden", className)}
        />
      )}
      {dark && (
        <img
          src={base + dark}
          alt={light ? "" : alt}
          aria-hidden={light ? true : undefined}
          width={340}
          height={210}
          loading="lazy"
          className={cn("hidden dark:block", className)}
        />
      )}
    </>
  );
}

/** Kept for the pages that still pass a flat list. */
export function useNavSelection(initialSection: string) {
  const [section, setSection] = useState(initialSection);
  const [child, setChild] = useState<string | null>(null);
  const ref = useRef({ section, child });
  ref.current = { section, child };
  return {
    section,
    child,
    selectSection: (id: string) => {
      setSection(id);
      setChild(null);
    },
    selectChild: (sectionId: string, childId: string) => {
      setSection(sectionId);
      setChild(childId);
    },
  };
}
