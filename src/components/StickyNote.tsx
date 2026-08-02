import { motion, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Draggable scratch pad.
 *
 * The note's *text* is owned by App and saved alongside study progress. What was
 * lost on every reload was the panel itself: whether it was open, and where you
 * had dragged it. Those live here, in their own key, deliberately separate from
 * progress so that Hold to Reset clears your ratings without also throwing the
 * pad back into the corner.
 */

const LAYOUT_KEY = "grignard_lcta_notes_layout_v1";

type Layout = { open: boolean; x: number; y: number };

function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d === "object") {
        return {
          open: !!d.open,
          x: Number.isFinite(d.x) ? d.x : 0,
          y: Number.isFinite(d.y) ? d.y : 0,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return { open: false, x: 0, y: 0 };
}

function saveLayout(next: Layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function StickyNote({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const initial = useRef(loadLayout());
  const [open, setOpen] = useState(initial.current.open);
  const bounds = useRef<HTMLDivElement>(null);

  const x = useMotionValue(initial.current.x);
  const y = useMotionValue(initial.current.y);

  // A position saved on a larger screen can land off a smaller one. Pull it back
  // inside on mount rather than stranding the pad where it cannot be grabbed.
  useEffect(() => {
    const maxLeft = -(window.innerWidth - 280);
    const maxUp = -(window.innerHeight - 220);
    if (x.get() < maxLeft) x.set(Math.min(0, maxLeft));
    if (y.get() < maxUp) y.set(Math.min(0, maxUp));
  }, [x, y]);

  const persist = (nextOpen: boolean) =>
    saveLayout({ open: nextOpen, x: x.get(), y: y.get() });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    persist(next);
  };

  return (
    <>
      <button
        onClick={toggle}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 font-bold text-yellow-900 shadow-lg transition hover:bg-yellow-300"
      >
        📝 Notes
      </button>

      {/* Drag bounds. Motion measures dragConstraints from the element's own
          position, so the previous all-positive numeric constraints let a pad
          anchored bottom-right travel only further right and down, i.e. off
          screen. A viewport-sized box lets it roam anywhere and stay reachable. */}
      {open && (
        <div ref={bounds} className="fixed inset-0 z-50 pointer-events-none" aria-hidden />
      )}

      {open && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.05}
          dragConstraints={bounds}
          onDragEnd={() => persist(true)}
          style={{ x, y }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-20 right-5 z-50 w-64 rounded-md border border-yellow-600/40 shadow-xl pointer-events-auto"
        >
          <div
            className="rounded-md"
            style={{ background: "rgba(253, 224, 71, 0.88)" }}
          >
            <div className="flex cursor-grab items-center justify-between border-b border-yellow-600/30 px-3 py-2 active:cursor-grabbing">
              <span className="font-mono text-xs font-bold text-yellow-900">SCRATCH NOTES</span>
              <button
                onClick={toggle}
                className="px-1 text-sm font-bold text-yellow-900/70 hover:text-yellow-900"
              >
                ✕
              </button>
            </div>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Jot quick notes here while you study..."
              className="h-40 w-full resize-none bg-transparent p-3 text-sm text-yellow-950 outline-none"
            />
          </div>
        </motion.div>
      )}
    </>
  );
}
