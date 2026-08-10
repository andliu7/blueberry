"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Check, Clock3, ListTodo, Map, Pause, Play, Plus, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useDecks } from "@/lib/useDecks";
import { deckHref } from "@/data/types";
import { cn } from "@/lib/utils";

type TimerKind = "focus" | "break";
type TaskKind = "text" | "deck" | "mindmap";
type TimerTask = { id: string; label: string; kind: TaskKind; done: boolean; href?: string };

const REMINDER_KEY = "blueberry_timer_reminder";
const TASKS_KEY = "blueberry_timer_tasks";
const FOCUS_ADJUSTMENTS = [-15, -10, -5, -1, 1, 5, 10, 15];
const BREAK_ADJUSTMENTS = [-300, -60, -30, 30, 60, 300];

const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

const adjustmentLabel = (seconds: number) => {
  const magnitude = Math.abs(seconds);
  const unit = magnitude >= 60 ? `${magnitude / 60}m` : `${magnitude}s`;
  return `${seconds < 0 ? "-" : "+"}${unit}`;
};

const loadTasks = (): TimerTask[] => {
  try {
    const saved = localStorage.getItem(TASKS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export function StudyTimer() {
  const { decks } = useDecks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kind, setKind] = useState<TimerKind>("focus");
  const [focusDuration, setFocusDuration] = useState(25 * 60);
  const [breakDuration, setBreakDuration] = useState(5 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [reminder, setReminder] = useState("60");
  const [tasks, setTasks] = useState<TimerTask[]>(loadTasks);
  const [draft, setDraft] = useState("");
  const [taskKind, setTaskKind] = useState<TaskKind>("text");
  const [selectedDeck, setSelectedDeck] = useState("");

  const total = kind === "focus" ? focusDuration : breakDuration;
  const title = kind === "focus" ? "Study timer" : "Break timer";
  const adjustments = kind === "focus" ? FOCUS_ADJUSTMENTS.map((minutes) => minutes * 60) : BREAK_ADJUSTMENTS;
  const completedTasks = tasks.filter((task) => task.done).length;
  const reminderSeconds = Number(reminder);
  const shouldShowBanner = running && (!bannerDismissed || (reminderSeconds > 0 && remaining <= reminderSeconds));
  const ring = useMemo(() => ({ background: `conic-gradient(#7c83ff ${Math.max(0, Math.min(1, remaining / Math.max(total, 1))) * 360}deg, rgba(148,163,184,.2) 0deg)` }), [remaining, total]);

  useEffect(() => {
    const syncReminder = () => setReminder(localStorage.getItem(REMINDER_KEY) ?? "60");
    syncReminder();
    window.addEventListener("blueberry:timer-reminder", syncReminder);
    return () => window.removeEventListener("blueberry:timer-reminder", syncReminder);
  }, []);

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setRemaining((previous) => {
        if (previous > 1) return previous - 1;
        if (kind === "focus") {
          setKind("break");
          setBannerDismissed(false);
          return breakDuration;
        }
        setRunning(false);
        setBannerDismissed(false);
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, kind, breakDuration]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialogOpen(false);
    };
    if (dialogOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen]);

  const selectKind = (nextKind: TimerKind) => {
    setKind(nextKind);
    setRunning(false);
    setBannerDismissed(false);
    setRemaining(nextKind === "focus" ? focusDuration : breakDuration);
  };

  const adjust = (delta: number) => {
    if (running && delta < 0) return;
    const minimum = kind === "focus" ? 60 : 30;
    const update = (value: number) => Math.max(minimum, value + delta);
    if (kind === "focus") setFocusDuration(update);
    else setBreakDuration(update);
    setRemaining((value) => update(value));
    setBannerDismissed(false);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(total);
    setBannerDismissed(false);
  };

  const addTask = () => {
    if (taskKind === "text" && !draft.trim()) return;
    if (taskKind === "deck" && !selectedDeck) return;
    const deck = decks.find((candidate) => candidate.id === selectedDeck);
    const task: TimerTask = taskKind === "deck" && deck
      ? { id: crypto.randomUUID(), label: deck.title, kind: "deck", done: false, href: deckHref(deck) }
      : taskKind === "mindmap"
        ? { id: crypto.randomUUID(), label: draft.trim() || "Mind Maps", kind: "mindmap", done: false }
        : { id: crypto.randomUUID(), label: draft.trim(), kind: "text", done: false };
    setTasks((current) => [...current, task]);
    setDraft("");
    setSelectedDeck("");
  };

  const openLinkedTask = (task: TimerTask) => {
    if (task.kind === "mindmap") {
      sessionStorage.setItem("blueberry_dashboard_view", "mind-maps");
      window.location.hash = "#/home";
      return;
    }
    if (task.href) window.location.hash = task.href;
  };

  const compactCard = (
    <section
      className="group flex h-full min-h-[190px] cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-stone-700 dark:bg-stone-900/75"
      role="button"
      tabIndex={0}
      aria-label="Open study timer"
      onClick={() => setDialogOpen(true)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setDialogOpen(true); }}
    >
      <div className="text-center"><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400 dark:text-stone-500">Study timer</p></div>
      <div className="flex flex-1 flex-col items-center justify-center py-3 text-center">
        <div className="grid size-[86px] place-items-center rounded-full p-1.5" style={ring}>
          <div className="grid size-full place-items-center rounded-full bg-white text-lg font-bold tabular-nums text-slate-900 dark:bg-stone-900 dark:text-stone-100">{formatTime(remaining)}</div>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-stone-100">{title}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">{running ? "Running - open to manage" : `${completedTasks}/${tasks.length} tasks complete`}</p>
      </div>
    </section>
  );

  return <>
    {compactCard}
    {typeof document !== "undefined" && createPortal(<>
      <AnimatePresence>
        {dialogOpen && <motion.div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setDialogOpen(false)}>
          <motion.section role="dialog" aria-modal="true" aria-labelledby="study-timer-title" className="relative max-h-[calc(100dvh-1rem)] w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/20 bg-[#171327]/95 p-5 text-white shadow-2xl sm:p-6" initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setDialogOpen(false)} aria-label="Close timer" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full text-stone-300 transition hover:bg-white/10 hover:text-white"><X className="size-5" /></button>
            <header className="mx-auto max-w-md text-center">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-indigo-200">Blueberry</p>
              <h2 id="study-timer-title" className="mt-2 font-serif text-3xl text-white">{title}</h2>
              
            </header>

            <div className="mx-auto mt-4 flex max-w-sm rounded-xl bg-white/5 p-1">
              {(["focus", "break"] as TimerKind[]).map((option) => <button key={option} type="button" onClick={() => selectKind(option)} className={cn("min-h-10 flex-1 rounded-lg text-sm font-semibold capitalize transition", kind === option ? "bg-indigo-400 text-slate-950" : "text-stone-300 hover:bg-white/10 hover:text-white")}>{option}</button>)}
            </div>

            <div className="group relative mx-auto mt-3 grid size-[min(60vw,230px)] place-items-center" tabIndex={0} aria-label="Timer adjustment controls">
              {adjustments.map((delta, index) => {
                const angle = (index / adjustments.length) * Math.PI * 2 - Math.PI / 2;
                const radius = adjustments.length === 8 ? 88 : 86;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const isBlocked = running && delta < 0;
                return <button key={delta} type="button" disabled={isBlocked} onClick={() => adjust(delta)} style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }} className={cn("absolute left-1/2 top-1/2 z-10 grid size-10 place-items-center rounded-full border text-[11px] font-bold shadow-lg opacity-0 pointer-events-none transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 sm:size-11", delta > 0 ? "border-indigo-200/30 bg-indigo-400 text-slate-950 hover:scale-105" : "border-white/15 bg-white/10 text-white hover:bg-white/20", isBlocked && "cursor-not-allowed opacity-30 hover:scale-100")}>{adjustmentLabel(delta)}</button>;
              })}
              <div className="grid size-28 place-items-center rounded-full border-[7px] border-indigo-300/70 bg-[#211b3a] text-center shadow-[0_0_0_15px_rgba(255,255,255,.04)] sm:size-32">
                <div><p className="font-mono text-3xl font-bold tabular-nums sm:text-4xl">{formatTime(remaining)}</p><p className="mt-1 text-xs font-medium text-indigo-100">{running ? "Running" : "Hover to adjust"}</p></div>
              </div>
            </div>
            {running && <p className="mt-1 text-center text-[11px] text-stone-300">Hover or focus the clock to adjust. While running, additions stay available and reductions lock.</p>}

            <div className="mx-auto mt-4 flex max-w-md gap-2">
              <button type="button" onClick={() => { setRunning((value) => !value); setBannerDismissed(false); }} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-400 px-4 text-sm font-bold text-slate-950 transition hover:bg-indigo-300">{running ? <Pause className="size-4" /> : <Play className="size-4" />}{running ? "Pause" : "Start"}</button>
              <button type="button" onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-indigo-200/50 px-4 text-sm font-bold text-white transition hover:border-indigo-200 hover:bg-white/10"><RotateCcw className="size-4" />Reset</button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.045] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div><h3 className="inline-flex items-center gap-2 text-sm font-bold"><ListTodo className="size-4 text-indigo-200" />Session tasks</h3><p className="mt-1 text-xs text-stone-300">Add notes, decks, or mind maps. They stay here for your next session.</p></div><span className="text-xs tabular-nums text-stone-300">{completedTasks}/{tasks.length}</span></div>
              <div className="mt-4 flex flex-wrap gap-1 rounded-lg bg-black/20 p-1">{(["text", "deck", "mindmap"] as TaskKind[]).map((option) => <button type="button" key={option} onClick={() => setTaskKind(option)} className={cn("min-h-8 rounded-md px-3 text-xs font-semibold transition", taskKind === option ? "bg-white/15 text-white" : "text-stone-400 hover:text-white")}>{option === "text" ? "Text" : option === "deck" ? "Study deck" : "Mind map"}</button>)}</div>
              <div className="mt-2 flex gap-2">{taskKind === "deck" ? <select value={selectedDeck} onChange={(event) => setSelectedDeck(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-lg border border-white/15 bg-[#211b3a] px-3 text-sm text-white outline-none focus:border-indigo-300"><option value="">Choose a study deck</option>{decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.title}</option>)}</select> : <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addTask(); }} placeholder={taskKind === "mindmap" ? "Optional mind map label" : "Add a task"} className="min-h-10 min-w-0 flex-1 rounded-lg border border-white/15 bg-[#211b3a] px-3 text-sm text-white placeholder:text-stone-500 outline-none focus:border-indigo-300" />}
                <button type="button" onClick={addTask} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-indigo-200/30 bg-indigo-400 px-3 text-sm font-bold text-slate-950 hover:bg-indigo-300"><Plus className="size-4" />Add</button></div>
              <ul className="mt-3 max-h-32 space-y-2 overflow-y-auto pr-1">{tasks.length === 0 ? <li className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs text-stone-400">No tasks yet. Add one to make this session concrete.</li> : tasks.map((task) => <li key={task.id} className="flex min-h-10 items-center gap-2 rounded-lg bg-black/15 px-2.5"><button type="button" aria-label={`Mark ${task.label} ${task.done ? "incomplete" : "complete"}`} onClick={() => setTasks((current) => current.map((candidate) => candidate.id === task.id ? { ...candidate, done: !candidate.done } : candidate))} className={cn("grid size-5 shrink-0 place-items-center rounded border", task.done ? "border-indigo-300 bg-indigo-300 text-slate-950" : "border-white/35 text-transparent hover:border-indigo-200")}><Check className="size-3.5" /></button>{task.kind === "text" ? <span className={cn("min-w-0 flex-1 truncate text-sm", task.done ? "text-stone-500 line-through" : "text-white")}>{task.label}</span> : <button type="button" onClick={() => openLinkedTask(task)} className={cn("inline-flex min-w-0 flex-1 items-center gap-2 truncate text-left text-sm underline decoration-indigo-300/60 underline-offset-4", task.done ? "text-stone-500 line-through" : "text-indigo-100 hover:text-white")}>{task.kind === "deck" ? <BookOpen className="size-4 shrink-0" /> : <Map className="size-4 shrink-0" />}<span className="truncate">{task.label}</span></button>}<button type="button" aria-label={`Remove ${task.label}`} onClick={() => setTasks((current) => current.filter((candidate) => candidate.id !== task.id))} className="grid size-7 shrink-0 place-items-center rounded text-stone-400 hover:bg-white/10 hover:text-white"><X className="size-4" /></button></li>)}</ul>
            </div>
            <p className="mt-3 text-center text-[11px] text-stone-400">Timer banner reappears {reminder === "0" ? "never" : `${reminderSeconds / 60 === 0.5 ? "30 seconds" : `${reminderSeconds / 60} minute${reminderSeconds === 60 ? "" : "s"}`} before the end`}. Change this in Settings.</p>
          </motion.section>
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence>
        {shouldShowBanner && <motion.aside role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[130] flex w-[min(92vw,360px)] items-center gap-3 rounded-2xl border border-indigo-200/25 bg-[#171327]/95 p-3.5 text-white shadow-2xl backdrop-blur" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-400 text-slate-950"><Clock3 className="size-4" /></div><button type="button" onClick={() => setDialogOpen(true)} className="min-w-0 flex-1 text-left"><p className="truncate text-xs font-semibold">{title}</p><p className="mt-0.5 font-mono text-lg font-bold tabular-nums">{formatTime(remaining)}</p></button><button type="button" onClick={() => setBannerDismissed(true)} aria-label="Dismiss timer banner" className="grid size-8 place-items-center rounded-lg text-stone-300 hover:bg-white/10 hover:text-white"><X className="size-4" /></button></motion.aside>}
      </AnimatePresence>
    </>, document.body)}
  </>;
}