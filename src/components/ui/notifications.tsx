import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Check, Coffee, Eye, Timer, Trophy, X } from "lucide-react";
import { DockSlot, DOCK } from "@/components/ui/corner-dock";
import { formatClock, type useFocusTimer } from "@/lib/useFocusTimer";
import { cn } from "@/lib/utils";

/**
 * What the timer did while you were not looking at it.
 *
 * The card reopens itself at the three moments worth interrupting for, but that
 * is only useful if you happen to be at the screen. Come back from a break
 * having missed two phase changes and there was no record that anything had
 * happened: the timer's whole history was one number that had already moved on.
 *
 * So every event the timer would have interrupted you for is also written down
 * here. It is a log, not an inbox: nothing here needs replying to, and the only
 * actions are "I have read these" and "clear".
 *
 * Kept in memory rather than localStorage on purpose. These are notices about
 * *this* sitting, and a reload is the clearest possible signal that the sitting
 * is over. A three-day-old "break finished" is noise.
 */

export interface Notice {
  id: string;
  kind: "focus" | "break" | "eyes" | "done";
  text: string;
  at: number;
}

const ICON = {
  focus: Timer,
  break: Coffee,
  eyes: Eye,
  done: Trophy,
} as const;

const TONE = {
  focus: "text-indigo-600 dark:text-indigo-300",
  break: "text-emerald-600 dark:text-emerald-300",
  eyes: "text-amber-600 dark:text-amber-300",
  done: "text-fuchsia-600 dark:text-fuchsia-300",
} as const;

/**
 * Turns timer state changes into notices.
 *
 * Watching the phase rather than being told about it, so nothing in the timer
 * has to know this exists. The previous phase is kept in a ref: an effect that
 * compared against state would need that state as a dependency and would then
 * re-run and re-log on every tick.
 */
export function useTimerNotices(t: ReturnType<typeof useFocusTimer>) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [seen, setSeen] = useState(0);
  const lastPhase = useRef(t.phase);
  const lastRests = useRef(t.restsTaken);

  const push = (kind: Notice["kind"], text: string) =>
    setNotices((n) =>
      [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind, text, at: Date.now() }, ...n].slice(0, 30),
    );

  useEffect(() => {
    const from = lastPhase.current;
    if (t.phase === from) return;
    lastPhase.current = t.phase;

    if (from === "focus" && t.phase === "break") {
      push("done", `Focus session finished. ${formatClock(t.settings.breakMinutes * 60_000)} break.`);
    } else if (from === "break" && t.phase === "idle") {
      push("break", "Break over. Ready when you are.");
    } else if (t.phase === "focus" && from === "idle") {
      push("focus", `Focusing for ${t.settings.focusMinutes} minutes.`);
    }
  }, [t.phase, t.settings.breakMinutes, t.settings.focusMinutes]);

  useEffect(() => {
    if (t.restsTaken > lastRests.current) {
      push("eyes", "Eye rest taken. The 20 minutes starts again.");
    }
    lastRests.current = t.restsTaken;
  }, [t.restsTaken]);

  const unread = Math.max(0, notices.length - seen);

  return {
    notices,
    unread,
    markRead: () => setSeen(notices.length),
    clear: () => {
      setNotices([]);
      setSeen(0);
    },
  };
}

export function NotificationsTab({
  notices,
  unread,
  markRead,
  clear,
}: ReturnType<typeof useTimerNotices>) {
  const [open, setOpen] = useState(false);

  return (
    <DockSlot order={DOCK.notes + 1} className="flex flex-col items-end gap-2">
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="scrollbar-none max-h-[min(24rem,60dvh)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-2xl backdrop-blur dark:border-stone-800 dark:bg-stone-950/95 dark:text-stone-100"
          >
            <header className="sticky top-0 flex items-center gap-2 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-stone-900 dark:bg-stone-950/95">
              <Bell className="size-4 text-indigo-600 dark:text-indigo-300" />
              <span className="flex-1 text-sm font-semibold">Notifications</span>
              {notices.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="cursor-pointer font-mono text-[0.65rem] text-slate-400 hover:text-slate-700 dark:hover:text-stone-200"
                >
                  clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="cursor-pointer rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-stone-900 dark:hover:text-stone-200"
              >
                <X className="size-4" />
              </button>
            </header>

            {notices.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-stone-400">
                Nothing yet. Start a session and the timer will keep a note of what it did.
              </p>
            ) : (
              <ul className="p-2">
                {notices.map((n) => {
                  const Icon = ICON[n.kind];
                  return (
                    <li key={n.id} className="flex gap-2.5 rounded-lg px-2 py-2">
                      <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[n.kind])} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800 dark:text-stone-200">{n.text}</p>
                        <p className="mt-0.5 font-mono text-[0.65rem] text-slate-400 dark:text-stone-500">
                          {new Date(n.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          markRead();
        }}
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className={cn(
          "relative flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 shadow-lg backdrop-blur transition-colors",
          unread > 0
            ? "border-indigo-300 bg-indigo-50/90 text-indigo-800 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200"
            : "border-slate-200 bg-white/85 text-slate-600 hover:text-slate-900 dark:border-stone-700 dark:bg-stone-950/85 dark:text-stone-300 dark:hover:text-white",
        )}
      >
        <Bell className="size-4 shrink-0" />
        {unread > 0 ? (
          <span className="font-mono text-sm tabular-nums">{unread}</span>
        ) : (
          <Check className="size-3.5 opacity-50" />
        )}
      </button>
    </DockSlot>
  );
}

export default NotificationsTab;
