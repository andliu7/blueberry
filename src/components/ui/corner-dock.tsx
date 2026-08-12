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
 * **The order is fixed and meaningful.** `flex-col-reverse` puts the lowest
 * `DOCK` value nearest the corner, and the corner belongs to feedback: it is the
 * one control that has to be in the same place on every page, since someone
 * looking for it is by definition already having trouble.
 */

const DOCK_ID = "blueberry-corner-dock";

export const DOCK = {
  /** The corner itself. Never moves. */
  feedback: 0,
  notes: 10,
  focus: 20,
  /** Transient things sit highest, so they never push the permanent ones. */
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
    // the page behind it.
    el.className =
      "pointer-events-none fixed right-4 bottom-4 z-[100] flex max-h-[calc(100dvh-2rem)] flex-col-reverse items-end gap-2 print:hidden";
    document.body.appendChild(el);
  }
  return el;
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
  const [node, setNode] = useState<HTMLElement | null>(null);

  // In an effect, not during render: `document` is touched here, and creating
  // the node while rendering would also mean mutating the document during a
  // pass React is allowed to throw away.
  useEffect(() => setNode(dockNode()), []);

  if (!node) return null;

  return createPortal(
    <div style={{ order }} className={`pointer-events-auto ${className ?? ""}`}>
      {children}
    </div>,
    node,
  );
}

export default DockSlot;
