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
  /**
   * Focused milliseconds banked at the last eye rest, which is where the next
   * twenty minutes counts from.
   */
  eyeBaseMs: number;
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
    eyeBaseMs: 0,
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
  /**
   * The tick.
   *
   * This value is *used*, and that is the whole point. It began life as a
   * throwaway `const [, setNow]` whose only job was to force a re-render, on the
   * reasoning that the clock reads `Date.now()` itself and so does not need the
   * number. That was wrong, and it froze the clock completely: `derived` below
   * is a `useMemo`, and a re-render does not recompute a memo — only a changed
   * dependency does. Ticking a value nothing depended on re-rendered the card
   * every 250ms and painted the same cached numbers each time, so the countdown
   * sat at its starting value for the entire session.
   *
   * So `now` is a real dependency now, and the memo recomputes on every tick.
   */
  const [now, setNow] = useState(() => Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => save(state), [state]);

  // Only while something is running. An idle timer that re-renders every second
  // is a page that never goes quiet.
  useEffect(() => {
    if (state.phase === "idle") return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [state.phase]);

  const settings = state.settings;

  const derived = useMemo(() => {
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
  }, [state, settings, now]);

  /**
   * Whether an eye rest is due.
   *
   * Measured against total focused time rather than time since the last rest,
   * so pausing for a break and coming back cannot reset the twenty minutes your
   * eyes have actually been working.
   */
  /**
   * The rest interval restarts; it does not accumulate.
   *
   * This used to be `(restsTaken + 1) * eyeEveryMinutes`, counted against total
   * focused time. That is only equivalent while the interval never changes and
   * every rest is taken exactly on time, and it breaks the moment either is
   * untrue: change the dial from 20 to 30 mid-session and the target jumps by an
   * hour, and the card reads "eyes rest in 32:37" when twenty minutes is the
   * entire rule. Counting from the last rest instead means the answer is always
   * somewhere between zero and the interval, whatever you do to the dial.
   */
  const nextRestAtMs = state.eyeBaseMs + settings.eyeEveryMinutes * 60_000;

  const eyeRestDue = state.phase === "focus" && derived.focusedMs >= nextRestAtMs;

  /**
   * How long until the eyes are due a rest.
   *
   * The rule was enforced silently before: it fired at twenty minutes and until
   * then there was no sign it existed, which makes it feel like an interruption
   * rather than something you were counting down to. Reported from banked focus
   * time, so it holds still during a break instead of running down while you are
   * away from the screen.
   */
  const untilEyeRestMs = Math.max(0, nextRestAtMs - derived.focusedMs);

  const start = useCallback((phase: TimerPhase = "focus") => {
    setState((s) => ({
      ...s,
      phase,
      startedAt: Date.now(),
      focusedMs: phase === "focus" ? s.focusedMs : 0,
      restsTaken: phase === "focus" ? s.restsTaken : 0,
      eyeBaseMs: phase === "focus" ? s.eyeBaseMs : 0,
    }));
  }, []);

  const stop = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: "idle",
      startedAt: 0,
      focusedMs: 0,
      restsTaken: 0,
      eyeBaseMs: 0,
    }));
  }, []);

  /** Bank the focus done so far and hold. */
  const pause = useCallback(() => {
    setState((s) => {
      if (s.phase !== "focus") return { ...s, phase: "idle" };
      return { ...s, phase: "idle", focusedMs: s.focusedMs + (Date.now() - s.startedAt), startedAt: 0 };
    });
  }, []);

  const beginEyeRest = useCallback(() => {
    setState((s) => {
      // Bank focus up to this instant, so the twenty seconds of looking away do
      // not count as study time.
      const banked =
        s.phase === "focus" ? s.focusedMs + (Date.now() - s.startedAt) : s.focusedMs;
      return {
        ...s,
        focusedMs: banked,
        // The clock starts again from here, whether the rest was due or you
        // took it early. Taking one early and still being interrupted two
        // minutes later would teach you not to take them early.
        eyeBaseMs: banked,
        resumeTo: s.phase === "focus" ? "focus" : s.resumeTo,
        phase: "eyeRest",
        startedAt: Date.now(),
        restsTaken: s.restsTaken + 1,
      };
    });
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
    untilEyeRestMs,
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
