import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * One column in the bottom-right corner, so the things that live there stop
 * landing on top of each other.
 *
 * Six separate components had independently decided to be `fixed bottom-5
 * right-5`: the feedback button, the focus timer, the sticky notes, the drill
 * banner and two kinds of toast. Each was correct alone and wrong in company,
 * and no amount of z-index fixes that, because the problem is that they occupy
 * the same square of screen rather than the same layer.
 *
 * Giving each one a hand-picked `bottom` offset would work until the day one of
 * them changes height. So instead there is a single flex column and everything
 * mounts into it through a portal, which means the browser does the stacking and
 * a widget that grows pushes its neighbours up instead of overlapping them.
 *
 * ## The rail is gone (2026-10-07)
 *
 * The bottom of this column used to hold a RAIL: one shared pill of permanent
 * controls (the assistant, the timer, feedback and the notifications head). The
 * replan removes it (SITE-REPLAN.md section 6): on a phone it covered the
 * funnel's buttons (audit F1), and the site header now carries the way to what
 * lived there. What stays is the column for things that come and go: the timer
 * card, sticky notes, the drill banner and toasts.
 *
 * Below 768px the column sits above the phone tab bar rather than on it.
 */

const DOCK_ID = "blueberry-corner-dock";

export const DOCK = {
  notes: 10,
  focus: 20,
  banner: 30,
  toast: 40,
} as const;

/**
 * The column, created on demand and shared.
 *
 * Appended to `<body>` rather than rendered by a component: the widgets that
 * dock here are spread across the router, `main.tsx` and page trees, and there
 * is no single parent that all of them are inside. A plain DOM node with no
 * React owner is the honest way to say "this belongs to the document".
 */
function dockNode(): HTMLElement {
  let el = document.getElementById(DOCK_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = DOCK_ID;
    // `pointer-events-none` on the column, restored per slot: the column spans
    // a tall strip of the screen and would otherwise swallow clicks meant for
    // the page behind it. On a phone it starts 5.5rem up, above the tab bar.
    el.className =
      "bb-corner-dock pointer-events-none fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[100] flex max-h-[calc(100dvh-7rem)] flex-col-reverse items-end gap-2 md:bottom-4 md:max-h-[calc(100dvh-2rem)] print:hidden";
    document.body.appendChild(el);
  }
  return el;
}

function useNode(get: () => HTMLElement) {
  const [node, setNode] = useState<HTMLElement | null>(null);

  // In an effect, not during render: `document` is touched here, and creating
  // the node while rendering would also mean mutating the document during a
  // pass React is allowed to throw away.
  useEffect(() => setNode(get()), [get]);

  return node;
}

export function DockSlot({
  order,
  children,
  className,
}: {
  order: number;
  children: ReactNode;
  className?: string;
}) {
  const node = useNode(dockNode);
  if (!node) return null;

  return createPortal(
    <div style={{ order }} className={`pointer-events-auto ${className ?? ""}`}>
      {children}
    </div>,
    node,
  );
}

export default DockSlot;
