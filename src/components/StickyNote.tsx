import { motion } from "motion/react";
import { useState } from "react";

export function StickyNote({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 font-bold text-yellow-900 shadow-lg transition hover:bg-yellow-300"
      >
        📝 Notes
      </button>

      {open && (
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={{ left: 0, right: window.innerWidth - 260, top: 0, bottom: window.innerHeight - 60 }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-20 right-5 z-50 w-64 rounded-md border border-yellow-600/40 shadow-xl"
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
