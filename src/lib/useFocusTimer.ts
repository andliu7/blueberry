import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * The study timer: focus, break, and the twenty-minute eye rest inside focus.
 *
 * Three clocks, not one, and that is the whole design problem. A pomodoro
 * counts down a session; the 20-20-20 rule fires every twenty minutes
 * regardless of how long the session is; and the eye rest itself is a
 * twenty-second countdown that suspends the first two. Trying to express that
 * as one number and a mode flag is what makes these things buggy.
 *
 * **Time is derived, never accumulated.** Every value here comes from
 * `Date.now()` against a stored start, rather than from decrementing a counter
 * on an interval. An interval that misses ticks — a backgrounded tab, a laptop
 * lid, a browser throttling a timer to once a minute — silently loses time, and
 * a study timer that quietly runs long is worse than no timer. The interval
 * only decides *when to re-render*; the clock is arithmetic.
 *
 * It survives a reload for the same reason: the start instant is in
 * localStorage, so closing the tab mid-session and coming back does not hand
 * you a fresh twenty-five minutes.
 */

export type TimerPhase = "idle" | "focus" | "break" | "eyeRest";

export interface FocusTask {
  id: string;
  text: string;
  done: boolean;
  /** Set when the task came from a deck, lesson or concept rather than typed. */
  href?: string;
}

export interface TimerSettings {
  focusMinutes: number;
  breakMinutes: number;
  /** How often the eye rest fires during focus. The rule says twenty. */
  eyeEveryMinutes: number;
  eyeRestSeconds: number;
}

export const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  eyeEveryMinutes: 20,
  eyeRestSeconds: 20,
};

interface Persisted {
  phase: TimerPhase;
  /** When the current phase began, epoch ms. */
  startedAt: number;
  /** Phase to return to when an eye rest finishes. */
  resumeTo: TimerPhase;
  /** Focus milliseconds already banked before the current phase started. */
  focusedMs: number;
  /** Eye rests already taken this focus session. */
  restsTaken: number;
  settings: TimerSettings;
  tasks: FocusTask[];
}

const KEY = "blueberry_focus_v1";

function load(): Persisted {
  const fresh: Persisted = {
    phase: "idle",
    startedAt: 0,
    resumeTo: "focus",
    focusedMs: 0,
    restsTaken: 0,
    settings: DEFAULT_SETTINGS,
    tasks: [],
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const data = JSON.parse(raw) as Partial<Persisted>;
    return {
      ...fresh,
      ...data,
      settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
    };
  } catch {
    return fresh;
  }
}

function save(state: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: the timer still runs, it just will not survive a reload */
  }
}

export function useFocusTimer() {
  const [state, setState] = useState<Persisted>(load);
  // Re-render tick. The value is unused; the clock is computed from Date.now().
  const [, setNow] = useState(Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => save(state), [state]);

  // Only while something is running. An idle timer that re-renders every second
  // is a page that never goes quiet.
  useEffect(() => {
    if (state.phase === "idle") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [state.phase]);

  const settings = state.settings;

  const derived = useMemo(() => {
    const now = Date.now();
    const elapsed = state.phase === "idle" ? 0 : now - state.startedAt;

    if (state.phase === "eyeRest") {
      const total = settings.eyeRestSeconds * 1000;
      return { remainingMs: Math.max(0, total - elapsed), totalMs: total, focusedMs: state.focusedMs };
    }
    if (state.phase === "break") {
      const total = settings.breakMinutes * 60_000;
      return { remainingMs: Math.max(0, total - elapsed), totalMs: total, focusedMs: state.focusedMs };
    }
    if (state.phase === "focus") {
      const total = settings.focusMinutes * 60_000;
      const focusedMs = state.focusedMs + elapsed;
      return { remainingMs: Math.max(0, total - focusedMs), totalMs: total, focusedMs };
    }
    return { remainingMs: settings.focusMinutes * 60_000, totalMs: settings.focusMinutes * 60_000, focusedMs: 0 };
  }, [state, settings]);

  /**
   * Whether an eye rest is due.
   *
   * Measured against total focused time rather than time since the last rest,
   * so pausing for a break and coming back cannot reset the twenty minutes your
   * eyes have actually been working.
   */
  const eyeRestDue =
    state.phase === "focus" &&
    derived.focusedMs >= (state.restsTaken + 1) * settings.eyeEveryMinutes * 60_000;

  const start = useCallback((phase: TimerPhase = "focus") => {
    setState((s) => ({
      ...s,
      phase,
      startedAt: Date.now(),
      focusedMs: phase === "focus" ? s.focusedMs : 0,
      restsTaken: phase === "focus" ? s.restsTaken : 0,
    }));
  }, []);

  const stop = useCallback(() => {
    setState((s) => ({ ...s, phase: "idle", startedAt: 0, focusedMs: 0, restsTaken: 0 }));
  }, []);

  /** Bank the focus done so far and hold. */
  const pause = useCallback(() => {
    setState((s) => {
      if (s.phase !== "focus") return { ...s, phase: "idle" };
      return { ...s, phase: "idle", focusedMs: s.focusedMs + (Date.now() - s.startedAt), startedAt: 0 };
    });
  }, []);

  const beginEyeRest = useCallback(() => {
    setState((s) => ({
      ...s,
      // Bank focus up to this instant, so the twenty seconds of looking away do
      // not count as study time.
      focusedMs: s.phase === "focus" ? s.focusedMs + (Date.now() - s.startedAt) : s.focusedMs,
      resumeTo: s.phase === "focus" ? "focus" : s.resumeTo,
      phase: "eyeRest",
      startedAt: Date.now(),
      restsTaken: s.restsTaken + 1,
    }));
  }, []);

  const endEyeRest = useCallback(() => {
    setState((s) => ({ ...s, phase: s.resumeTo, startedAt: Date.now() }));
  }, []);

  const setSettings = useCallback((next: Partial<TimerSettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...next } }));
  }, []);

  const addTask = useCallback((text: string, href?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setState((s) => ({
      ...s,
      tasks: [
        ...s.tasks,
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: trimmed, done: false, href },
      ],
    }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  }, []);

  const removeTask = useCallback((id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const clearDone = useCallback(() => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => !t.done) }));
  }, []);

  /**
   * A phase that has run out moves itself on.
   *
   * Focus rolls into a break, a break rolls back into focus, and an eye rest
   * returns to whatever it interrupted. Written as an effect on the derived
   * remainder rather than a `setTimeout`, so a tab that was asleep through the
   * end of a session catches up the moment it wakes rather than firing late.
   */
  useEffect(() => {
    if (state.phase === "idle" || derived.remainingMs > 0) return;
    if (state.phase === "eyeRest") endEyeRest();
    else if (state.phase === "focus") start("break");
    else if (state.phase === "break") stop();
  }, [state.phase, derived.remainingMs, endEyeRest, start, stop]);

  const done = state.tasks.filter((t) => t.done).length;

  return {
    phase: state.phase,
    settings,
    tasks: state.tasks,
    tasksDone: done,
    remainingMs: derived.remainingMs,
    totalMs: derived.totalMs,
    focusedMs: derived.focusedMs,
    eyeRestDue,
    restsTaken: state.restsTaken,
    start,
    stop,
    pause,
    beginEyeRest,
    endEyeRest,
    setSettings,
    addTask,
    toggleTask,
    removeTask,
    clearDone,
  };
}

/** `mm:ss`, floored, with the minutes never padded away. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
