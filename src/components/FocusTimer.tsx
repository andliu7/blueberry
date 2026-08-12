import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Eye, Pause, Play, Plus, RotateCcw, Timer, X } from "lucide-react";
import { Confetti } from "@/components/Confetti";
import { Blueberry } from "@/components/ui/blueberry";
import { useFocusTimer, formatClock, type TimerPhase } from "@/lib/useFocusTimer";
import { useDecks } from "@/lib/useDecks";
import { deckHref } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * The study timer, as a tab in the corner of every page.
 *
 * Three states, in increasing size: a tab you can barely see when nothing is
 * running, a pill with the clock in it while a session is going, and a card
 * when you open it. It is fixed to the bottom right rather than living on a
 * page, because the thing it is timing is you reading a deck somewhere else —
 * a timer you have to navigate to in order to read is not a timer.
 *
 * **It reopens itself when it matters.** Collapsed is the normal state during a
 * session; the card comes back on its own when an eye rest is due, when the
 * last minute of a phase starts, and when a phase ends. Those are the three
 * moments the number is worth interrupting for, and the rest of the time it
 * stays out of the way.
 */

const PHASE_LABEL: Record<TimerPhase, string> = {
  idle: "Focus",
  focus: "Focusing",
  break: "Break",
  eyeRest: "Look away",
};

export function FocusTimer() {
  const t = useFocusTimer();
  const reduce = useReducedMotion();
  const { decks } = useDecks();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [picking, setPicking] = useState(false);
  const [cheer, setCheer] = useState(0);

  const lastPhase = useRef<TimerPhase>(t.phase);

  /**
   * Open on the moments worth interrupting for, and only those.
   *
   * An eye rest is due, a phase has just changed, or the last minute of one has
   * started. Anything more and the card is in the way; anything less and the
   * twenty-minute rule quietly never happens because the tab was shut.
   */
  useEffect(() => {
    if (t.eyeRestDue) setOpen(true);
  }, [t.eyeRestDue]);

  useEffect(() => {
    if (t.phase === lastPhase.current) return;
    const from = lastPhase.current;
    lastPhase.current = t.phase;
    setOpen(true);
    // A finished focus session is the one that earns a celebration. Breaks
    // ending and rests ending are housekeeping.
    if (from === "focus" && t.phase === "break") setCheer((n) => n + 1);
  }, [t.phase]);

  /**
   * Anything on the site can ask for the card.
   *
   * A window event rather than lifted state or a context: the timer is mounted
   * at the root, outside the router, and the board tile that opens it is three
   * component layers inside a page. Threading a setter from one to the other
   * would mean every component between them carrying a prop about a timer none
   * of them know anything about.
   */
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("blueberry:open-focus", openIt);
    return () => window.removeEventListener("blueberry:open-focus", openIt);
  }, []);

  const lastMinute = t.phase !== "idle" && t.remainingMs > 0 && t.remainingMs < 60_000;
  useEffect(() => {
    if (lastMinute) setOpen(true);
  }, [lastMinute]);

  const pct = t.totalMs > 0 ? 1 - t.remainingMs / t.totalMs : 0;
  const running = t.phase !== "idle";

  return (
    <>
      <Confetti trigger={cheer} />

      <div className="fixed right-4 bottom-4 z-[90] flex flex-col items-end gap-2 print:hidden">
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="card"
              initial={reduce ? false : { opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur dark:border-stone-800 dark:bg-stone-950/95"
            >
              {/* The eye rest owns the whole card while it runs. It is the one
                  thing here that is asking you to stop looking at the screen,
                  so it would be absurd to show it beside a task list. */}
              {t.phase === "eyeRest" || t.eyeRestDue ? (
                <EyeRest timer={t} onClose={() => setOpen(false)} />
              ) : (
                <>
                  <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-stone-900">
                    <Blueberry
                      flat
                      mood={t.phase === "break" ? "happy" : running ? "focused" : "curious"}
                      className="size-7 shrink-0"
                      label=""
                    />
                    <span className="flex-1 text-sm font-semibold">{PHASE_LABEL[t.phase]}</span>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Collapse the timer"
                      className="cursor-pointer rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </header>

                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-end justify-between">
                      <span className="font-mono text-4xl tabular-nums">
                        {formatClock(t.remainingMs)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {running ? (
                          <IconButton onClick={t.pause} label="Pause">
                            <Pause className="size-4" />
                          </IconButton>
                        ) : (
                          <IconButton onClick={() => t.start("focus")} label="Start focusing" primary>
                            <Play className="size-4" />
                          </IconButton>
                        )}
                        <IconButton onClick={t.stop} label="Reset">
                          <RotateCcw className="size-4" />
                        </IconButton>
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-stone-800">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-500",
                          t.phase === "break"
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-indigo-500 to-fuchsia-500",
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }}
                      />
                    </div>

                    {/* Both lengths, adjustable in place. Steppers rather than a
                        text field: these are always a small number of minutes,
                        and a field you can type 900 into needs validation that
                        two buttons do not. */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Stepper
                        label="Focus"
                        value={t.settings.focusMinutes}
                        onChange={(v) => t.setSettings({ focusMinutes: v })}
                        min={5}
                        max={90}
                        step={5}
                      />
                      <Stepper
                        label="Break"
                        value={t.settings.breakMinutes}
                        onChange={(v) => t.setSettings({ breakMinutes: v })}
                        min={1}
                        max={30}
                        step={1}
                      />
                    </div>

                    {running && t.phase === "focus" && (
                      <button
                        type="button"
                        onClick={t.beginEyeRest}
                        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-stone-800 dark:text-stone-300 dark:hover:border-indigo-400/50 dark:hover:text-indigo-200"
                      >
                        <Eye className="size-3.5" />
                        Rest my eyes now
                      </button>
                    )}
                  </div>

                  <Tasks
                    timer={t}
                    decks={decks}
                    draft={draft}
                    setDraft={setDraft}
                    picking={picking}
                    setPicking={setPicking}
                  />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The tab. Always there, and carrying the clock whenever one is
            running, so the number is readable without opening anything. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={running ? `${PHASE_LABEL[t.phase]}, ${formatClock(t.remainingMs)}` : "Open the focus timer"}
          className={cn(
            "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 shadow-lg backdrop-blur transition-colors",
            t.phase === "break"
              ? "border-emerald-300 bg-emerald-50/90 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
              : running
                ? "border-indigo-300 bg-indigo-50/90 text-indigo-800 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200"
                : "border-slate-200 bg-white/85 text-slate-600 hover:text-slate-900 dark:border-stone-700 dark:bg-stone-950/85 dark:text-stone-300 dark:hover:text-white",
          )}
        >
          <Timer className="size-4 shrink-0" />
          {running ? (
            <span className="font-mono text-sm tabular-nums">{formatClock(t.remainingMs)}</span>
          ) : (
            <span className="text-sm font-semibold">Focus</span>
          )}
          {t.tasks.length > 0 && (
            <span className="rounded-full bg-black/5 px-1.5 font-mono text-[0.65rem] dark:bg-white/10">
              {t.tasksDone}/{t.tasks.length}
            </span>
          )}
        </button>
      </div>
    </>
  );
}

/**
 * The twenty-second look away.
 *
 * A countdown and one button, and the button is honest about what it is: you
 * confirm that you looked, because nothing here can tell whether you did. The
 * alternative — refusing to continue until the clock runs out — punishes the
 * person who did look away and came back, which is exactly the wrong lesson.
 */
function EyeRest({
  timer,
  onClose,
}: {
  timer: ReturnType<typeof useFocusTimer>;
  onClose: () => void;
}) {
  const resting = timer.phase === "eyeRest";
  return (
    <div className="px-5 py-6 text-center">
      <Eye className="mx-auto size-6 text-indigo-600 dark:text-indigo-300" />
      <p className="mt-3 text-base font-semibold">Look 20 ft away</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-stone-400">
        For twenty seconds. Out of a window if there is one — the point is to let your eyes
        focus on something that is not eighteen inches from your face.
      </p>

      {resting ? (
        <>
          <p className="mt-4 font-mono text-5xl tabular-nums text-indigo-600 dark:text-indigo-300">
            {Math.ceil(timer.remainingMs / 1000)}
          </p>
          <button
            type="button"
            onClick={timer.endEyeRest}
            className="mt-4 min-h-11 w-full cursor-pointer rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            I looked — back to it
          </button>
        </>
      ) : (
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={timer.beginEyeRest}
            className="min-h-11 flex-1 cursor-pointer rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Start the 20 seconds
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 cursor-pointer rounded-xl px-4 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-stone-400 dark:hover:text-stone-100"
          >
            Later
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * What you meant to get done, typed or pulled out of the site.
 *
 * The picker matters more than the text box: "revise the Grignard deck" typed
 * by hand is a string, whereas the same thing chosen from the library is a link
 * you can press when you tick it off. Everything the site holds is already a
 * list somewhere, so the tasks may as well come from it.
 */
function Tasks({
  timer,
  decks,
  draft,
  setDraft,
  picking,
  setPicking,
}: {
  timer: ReturnType<typeof useFocusTimer>;
  decks: ReturnType<typeof useDecks>["decks"];
  draft: string;
  setDraft: (v: string) => void;
  picking: boolean;
  setPicking: (v: boolean) => void;
}) {
  return (
    <div className="border-t border-slate-100 dark:border-stone-900">
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="flex-1 font-mono text-[0.65rem] tracking-widest text-slate-400 uppercase dark:text-stone-500">
          This session
        </span>
        {timer.tasksDone > 0 && (
          <button
            type="button"
            onClick={timer.clearDone}
            className="cursor-pointer font-mono text-[0.65rem] text-slate-400 hover:text-slate-700 dark:hover:text-stone-200"
          >
            clear done
          </button>
        )}
      </div>

      {timer.tasks.length > 0 && (
        <ul className="mt-1 max-h-40 overflow-y-auto px-2">
          {timer.tasks.map((task) => (
            <li key={task.id} className="group/task flex items-center gap-2 rounded-lg px-2 py-1.5">
              <button
                type="button"
                onClick={() => timer.toggleTask(task.id)}
                aria-pressed={task.done}
                aria-label={task.done ? `Mark "${task.text}" not done` : `Mark "${task.text}" done`}
                className={cn(
                  "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors",
                  task.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 hover:border-emerald-400 dark:border-stone-700",
                )}
              >
                {task.done && <Check className="size-3" />}
              </button>

              {task.href ? (
                <a
                  href={task.href}
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm hover:underline",
                    task.done && "text-slate-400 line-through dark:text-stone-600",
                  )}
                >
                  {task.text}
                </a>
              ) : (
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    task.done && "text-slate-400 line-through dark:text-stone-600",
                  )}
                >
                  {task.text}
                </span>
              )}

              <button
                type="button"
                onClick={() => timer.removeTask(task.id)}
                aria-label={`Remove "${task.text}"`}
                className="cursor-pointer p-1 text-slate-300 opacity-0 transition group-hover/task:opacity-100 hover:text-rose-500"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          timer.addTask(draft);
          setDraft("");
        }}
        className="flex items-center gap-1.5 px-3 py-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task…"
          aria-label="Add a task"
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-slate-100 px-2.5 py-1.5 text-sm outline-none placeholder:text-slate-400 focus-visible:border-indigo-400 dark:bg-stone-900 dark:placeholder:text-stone-600"
        />
        <button
          type="button"
          onClick={() => setPicking(!picking)}
          aria-expanded={picking}
          aria-label="Pick from the library"
          className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-stone-400 dark:hover:bg-stone-900"
        >
          <Plus className="size-4" />
        </button>
      </form>

      <AnimatePresence initial={false}>
        {picking && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-100 dark:border-stone-900"
          >
            <ul className="max-h-44 overflow-y-auto py-1">
              <PickRow
                label="Carbonyl lessons"
                onPick={() => {
                  timer.addTask("Read the carbonyl lessons", "#/lessons");
                  setPicking(false);
                }}
              />
              {decks.map((deck) => (
                <PickRow
                  key={deck.id}
                  label={deck.title}
                  onPick={() => {
                    timer.addTask(deck.title, deckHref(deck));
                    setPicking(false);
                  }}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PickRow({ label, onPick }: { label: string; onPick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className="w-full cursor-pointer truncate px-4 py-1.5 text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-indigo-700 dark:text-stone-300 dark:hover:bg-stone-900 dark:hover:text-indigo-200"
      >
        {label}
      </button>
    </li>
  );
}

function IconButton({
  onClick,
  label,
  primary = false,
  children,
}: {
  onClick: () => void;
  label: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 cursor-pointer items-center justify-center rounded-full transition",
        primary
          ? "bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white hover:brightness-110"
          : "border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-stone-800 dark:text-stone-300 dark:hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 px-2.5 py-1.5 dark:border-stone-800">
      <span className="block font-mono text-[0.6rem] tracking-widest text-slate-400 uppercase dark:text-stone-500">
        {label}
      </span>
      <div className="mt-0.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Less ${label.toLowerCase()}`}
          className="cursor-pointer px-1 text-slate-400 hover:text-slate-800 dark:hover:text-stone-100"
        >
          −
        </button>
        <span className="font-mono text-sm tabular-nums">{value}m</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          aria-label={`More ${label.toLowerCase()}`}
          className="cursor-pointer px-1 text-slate-400 hover:text-slate-800 dark:hover:text-stone-100"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default FocusTimer;
