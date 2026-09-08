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
 * ## The column solved collision. It did not solve rank.
 *
 * A blind read against the reference put the phone screen beside it and named
 * the next problem exactly: the corner held four independent floating chips,
 * the mascot, the timer, "Notifications 1" and "Feedback", each with its own
 * fill, its own border and its own shadow, at near-identical visual weight and
 * with no rank between them. The widest and brightest control on the whole
 * screen was chrome rather than the thing the page wanted pressed.
 *
 * Four surfaces read as four decisions to make. So the permanent residents no
 * longer get a surface each: they share ONE, the rail below, and inside it only
 * the head is captioned. That is the difference between a corner you parse and
 * a corner you glance at.
 *
 * Two regions, then, and the choice between them is not a style preference:
 *
 * - `RailSlot` is for a control that is on every page forever. It joins the one
 *   shared pill and brings no chrome of its own.
 * - `DockSlot` is for a panel or a notice that comes and goes: the timer card,
 *   the notifications panel, toasts. Those are their own surfaces because they
 *   are their own moments, and they stack in the column above the rail.
 */

const DOCK_ID = "blueberry-corner-dock";
const RAIL_ID = "blueberry-corner-rail";

export const DOCK = {
  /** The rail of permanent controls. Nearest the corner, and it never moves. */
  rail: 0,
  notes: 10,
  focus: 20,
  /** Transient things sit highest, so they never push the permanent ones. */
  banner: 30,
  toast: 40,
} as const;

/**
 * Left to right inside the rail, and the order is the ranking.
 *
 * The subordinates come first and the captioned head sits last, nearest the
 * screen edge and nearest the thumb. A rail is read from its loud end, and the
 * loud end should be the end you can reach.
 */
export const RAIL = {
  assistant: 0,
  timer: 10,
  feedback: 20,
  /** The head. The only member that is allowed a word rather than a glyph. */
  notifications: 30,
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
      "bb-corner-dock pointer-events-none fixed right-4 bottom-4 z-[100] flex max-h-[calc(100dvh-2rem)] flex-col-reverse items-end gap-2 print:hidden";
    document.body.appendChild(el);
  }
  return el;
}

/**
 * The one shared surface, inside the column, nearest the corner.
 *
 * `empty:hidden` is doing real work rather than tidying: on a page where none
 * of the permanent controls mount, an empty rail would still paint a stray
 * 2rem lozenge in the corner of a screen that has nothing in it.
 */
function railNode(): HTMLElement {
  let el = document.getElementById(RAIL_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = RAIL_ID;
    el.style.order = String(DOCK.rail);
    el.className =
      "bb-corner-rail pointer-events-auto flex items-center gap-0.5 rounded-full border border-slate-200 bg-white/90 p-1 shadow-lg ring-1 ring-slate-900/5 backdrop-blur empty:hidden dark:border-stone-700 dark:bg-stone-950/90 dark:ring-white/10";
    dockNode().appendChild(el);
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

/**
 * A permanent control, inside the shared rail.
 *
 * The wrapper is a real flex item rather than `display: contents`, which was
 * the first thing tried and is wrong here: `contents` removes the box, and a
 * box that does not exist cannot carry the `order` this slot exists to set.
 * So the wrapper stays, holds the order, and lays out nothing else.
 */
export function RailSlot({ order, children }: { order: number; children: ReactNode }) {
  const node = useNode(railNode);
  if (!node) return null;

  return createPortal(
    <div style={{ order }} className="flex items-center">
      {children}
    </div>,
    node,
  );
}

export default DockSlot;
