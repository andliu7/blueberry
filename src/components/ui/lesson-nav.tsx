"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* LessonNav, the all-sections course index, lived here until Learn round 3
   scoped the lesson sidebar to one unit (LessonsPage.tsx); MoleculeArt stays. */

/**
 * A structure drawing, in whichever theme is showing.
 *
 * Two files rather than one, because RDKit writes literal colours into the SVG
 * and an `<img>` does not inherit CSS, so `currentColor` is not available. Both
 * are in the markup and CSS picks; the alternative is reading the theme in JS
 * and getting a wrong-coloured flash on first paint.
 *
 * Both images carry the alt, and the one CSS hides is display:none, which takes
 * it out of the accessibility tree. The dark copy used to be aria-hidden with an
 * empty alt, so in dark theme (the default) no structure had a name at all
 * (Learn round 3).
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
          alt={alt}
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
