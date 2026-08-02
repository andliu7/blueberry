import { motion } from "motion/react";
import { useRef, useState } from "react";

export function StickyNote({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const bounds = useRef<HTMLDivElement>(null);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 font-bold text-yellow-900 shadow-lg transition hover:bg-yellow-300"
      >
        📝 Notes
      </button>

      {/* Drag bounds. The panel is anchored bottom-right, and Motion measures
          dragConstraints from the element's own position, so the previous
          all-positive numeric constraints only ever allowed it further right and
          further down, i.e. off screen. A viewport-sized element lets it roam
          anywhere while still keeping it on screen. */}
      {open && (
        <div ref={bounds} className="fixed inset-0 z-50 pointer-events-none" aria-hidden />
      )}

      {open && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.05}
          dragConstraints={bounds}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-20 right-5 z-50 w-64 rounded-md border border-yellow-600/40 shadow-xl pointer-events-auto"
          style={{ background: "rgba(253, 224, 71, 0.88)" }}
        >
          <div className="flex cursor-grab items-center justify-between border-b border-yellow-600/30 px-3 py-2 active:cursor-grabbing">
            <span className="font-mono text-xs font-bold text-yellow-900">SCRATCH NOTES</span>
            <button
              onClick={() => setOpen(false)}
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
        </motion.div>
      )}
    </>
  );
}
