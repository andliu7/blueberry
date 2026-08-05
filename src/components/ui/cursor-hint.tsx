import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A label that appears next to the cursor while you point at something.
 *
 * The notification panel is 320px wide and holds four action buttons per note,
 * so there is no room to label them in place and no room for a tooltip that
 * pushes layout around. This one is portaled to the body and positioned fixed at
 * the pointer, so it costs the panel no width at all and cannot be clipped by
 * the panel's own `overflow-y: auto`.
 *
 * `pointer-events-none` on the bubble matters: without it the label lands under
 * the cursor, takes the hover for itself, and the whole thing flickers.
 *
 * The `title` attribute would have been free, but it waits about a second, sits
 * where the OS decides and cannot be styled. For four unlabelled icons in a row
 * the delay is the whole problem.
 */
export function CursorHint({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <span
        className={className}
        onPointerEnter={(e) => setAt({ x: e.clientX, y: e.clientY })}
        onPointerMove={(e) => setAt({ x: e.clientX, y: e.clientY })}
        onPointerLeave={() => setAt(null)}
        // Touch has no hover, so the label would never show and the buttons
        // would be four unexplained icons. The accessible name on the button
        // itself is what carries them there, and for a screen reader always.
        onPointerCancel={() => setAt(null)}
      >
        {children}
      </span>

      {at &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2 py-1 text-[0.7rem] font-semibold whitespace-nowrap text-white shadow-lg dark:bg-stone-100 dark:text-stone-900"
            // Lifted clear of the pointer so the cursor never covers the word it
            // is there to read.
            style={{ left: at.x, top: at.y - 10 }}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}

export default CursorHint;
