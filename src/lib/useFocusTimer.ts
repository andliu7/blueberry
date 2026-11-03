import { useSyncExternalStore } from "react";

/**
 * The study timer: focus, break, and the twenty-minute eye rest inside focus.
 *
 * ONE CLOCK FOR THE WHOLE APP (3 Nov). The state lives in this module, not in a
 * component, and every caller of `useFocusTimer` reads the same copy through
 * `useSyncExternalStore`. Before, the hook kept state per caller, so the site
 * header and the game's provider were two clocks that each read localStorage
 * once and then counted on their own. Now the site's header button, the game's
 * corner button, the Tools sheet and #/app/focus are four views of one clock.
 *
 * Three clocks inside it, not one, and that is the design problem. A pomodoro
 * counts down a session; the 20-20-20 rule fires every twenty minutes of focus
 * regardless of how long the session is; and the eye rest itself is a
 * twenty-second countdown that suspends the first two.
 *
 * **Time is derived, never accumulated.** Every value comes from `Date.now()`
 * against a stored start. An interval that misses ticks (a backgrounded tab, a
 * laptop lid) would silently lose time; here the interval only decides when to
 * re-render and when to move a finished phase on. It survives a reload for the
 * same reason: the start instant is in localStorage under `blueberry_focus_v1`,
 * the key the timer has always used, so a running session carries over.
 *
 * WHAT HAPPENS ON ITS OWN, in `tick()` and so exactly once however many views
 * are mounted: a finished phase rolls on (focus into a break, a break back to
 * idle, an eye rest back to focus), and an eye rest that falls due starts by
 * itself (ported from the second-brain timer: the point is to look away, not to
 * be asked). Anything that wants to react to a phase change, the ambience
 * stopping when focus ends for one, subscribes with `onPhaseChange`.
 */

export type TimerPhase = "idle" | "focus" | "break" | "eyeRest";

export interface TimerSettings {
  focusMinutes: number;
  breakMinutes: number;
  /** How often the eye rest fires during focus. The rule says twenty; EYE_OFF turns it off. */
  eyeEveryMinutes: number;
  eyeRestSeconds: number;
}

/** "Eye rests off" is an interval no session reaches. The game's Settings row wrote this value before, so it stays. */
export const EYE_OFF = 9999;

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
  /** Eye rests taken this focus session. */
  restsTaken: number;
  /** Focused milliseconds banked at the last eye rest: the next twenty minutes counts from here. */
  eyeBaseMs: number;
  settings: TimerSettings;
}

export const FOCUS_KEY = "blueberry_focus_v1";

const fresh = (): Persisted => ({
  phase: "idle",
  startedAt: 0,
  resumeTo: "focus",
  focusedMs: 0,
  restsTaken: 0,
  eyeBaseMs: 0,
  settings: DEFAULT_SETTINGS,
});

function load(): Persisted {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw) as Partial<Persisted>;
    // Older saves carry a `tasks` list from the card's old task panel; it is kept in the
    // object, harmlessly, so nothing written before is thrown away.
    return { ...fresh(), ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) } };
  } catch {
    return fresh();
  }
}

function save(state: Persisted) {
  try {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(state));
  } catch {
    /* private mode: the timer still runs, it just will not survive a reload */
  }
}

/* ------------------------------------------------------------- the store -- */

type Snapshot = { state: Persisted; now: number };

let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();
const phaseListeners = new Set<(from: TimerPhase, to: TimerPhase, ranOut: boolean) => void>();
let ticker: ReturnType<typeof setInterval> | null = null;

function current(): Snapshot {
  snapshot ??= { state: load(), now: Date.now() };
  return snapshot;
}

function emit() {
  listeners.forEach((l) => l());
}

/** Replace the state. `ranOut` marks a phase that ended because its time was up, not a press. */
function commit(next: Persisted, ranOut = false) {
  const before = current().state;
  snapshot = { state: next, now: Date.now() };
  save(next);
  ensureTicking();
  if (before.phase !== next.phase) phaseListeners.forEach((l) => l(before.phase, next.phase, ranOut));
  emit();
}

function update(fn: (s: Persisted) => Persisted, ranOut = false) {
  const s = current().state;
  const next = fn(s);
  if (next !== s) commit(next, ranOut);
}

/** Only while something is running: an idle timer that re-renders four times a second is a page that never goes quiet. */
function ensureTicking() {
  const running = current().state.phase !== "idle";
  if (running && ticker === null) ticker = setInterval(tick, 250);
  if (!running && ticker !== null) {
    clearInterval(ticker);
    ticker = null;
  }
}

function derive({ state, now }: Snapshot) {
  const { settings } = state;
  const elapsed = state.phase === "idle" ? 0 : now - state.startedAt;
  let remainingMs: number;
  let totalMs: number;
  let focusedMs = state.focusedMs;
  if (state.phase === "eyeRest") {
    totalMs = settings.eyeRestSeconds * 1000;
    remainingMs = Math.max(0, totalMs - elapsed);
  } else if (state.phase === "break") {
    totalMs = settings.breakMinutes * 60_000;
    remainingMs = Math.max(0, totalMs - elapsed);
  } else {
    // Focus, or idle: a pause keeps the focus banked so far, so the clock shows what is
    // left instead of jumping back to full.
    totalMs = settings.focusMinutes * 60_000;
    if (state.phase === "focus") focusedMs += elapsed;
    remainingMs = Math.max(0, totalMs - focusedMs);
  }
  // The rest interval restarts from the last rest rather than accumulating, so changing the
  // dial mid-session can never put the next rest further away than one interval.
  const nextRestAtMs = state.eyeBaseMs + settings.eyeEveryMinutes * 60_000;
  const eyeRestDue = state.phase === "focus" && focusedMs >= nextRestAtMs;
  const untilEyeRestMs = Math.max(0, nextRestAtMs - focusedMs);
  return { remainingMs, totalMs, focusedMs, eyeRestDue, untilEyeRestMs };
}

/* ------------------------------------------------------------ the actions -- */

/** start("focus") resumes a paused session with its banked minutes; start("break") starts a break from zero. */
function start(phase: TimerPhase = "focus", ranOut = false) {
  update(
    (s) => ({
      ...s,
      phase,
      startedAt: Date.now(),
      focusedMs: phase === "focus" ? s.focusedMs : 0,
      restsTaken: phase === "focus" ? s.restsTaken : 0,
      eyeBaseMs: phase === "focus" ? s.eyeBaseMs : 0,
    }),
    ranOut,
  );
}

/** Bank the focus done so far and hold. */
function pause(ranOut = false) {
  update(
    (s) =>
      s.phase === "idle"
        ? s
        : {
            ...s,
            phase: "idle",
            focusedMs: s.phase === "focus" ? s.focusedMs + (Date.now() - s.startedAt) : s.focusedMs,
            startedAt: 0,
          },
    ranOut,
  );
}

/** Back to a fresh twenty-five minutes, keeping the settings. */
function reset() {
  update((s) => ({ ...fresh(), settings: s.settings }));
}

function beginEyeRest() {
  update((s) => {
    // Bank focus up to this instant, so the twenty seconds of looking away do not count as study.
    const banked = s.phase === "focus" ? s.focusedMs + (Date.now() - s.startedAt) : s.focusedMs;
    return {
      ...s,
      focusedMs: banked,
      // The interval restarts here whether the rest was due or taken early: taking one early
      // and still being interrupted two minutes later would teach you not to.
      eyeBaseMs: banked,
      resumeTo: s.phase === "focus" ? "focus" : s.resumeTo,
      phase: "eyeRest",
      startedAt: Date.now(),
      restsTaken: s.restsTaken + 1,
    };
  });
}

function endEyeRest(ranOut = false) {
  update((s) => (s.phase === "eyeRest" ? { ...s, phase: s.resumeTo, startedAt: Date.now() } : s), ranOut);
}

function setSettings(next: Partial<TimerSettings>) {
  update((s) => ({ ...s, settings: { ...s.settings, ...next } }));
}

/**
 * A phase that has run out moves itself on, and a due eye rest begins. Run from the
 * interval rather than a setTimeout, so a tab that slept through the end of a session
 * catches up the moment it wakes rather than firing late.
 */
function tick() {
  const snap = current();
  snapshot = { ...snap, now: Date.now() };
  const { phase } = snapshot.state;
  const d = derive(snapshot);
  if (phase !== "idle" && d.remainingMs <= 0) {
    if (phase === "eyeRest") endEyeRest(true);
    else if (phase === "focus") start("break", true);
    else pause(true);
    return;
  }
  if (d.eyeRestDue) {
    beginEyeRest();
    return;
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureTicking();
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Called on every phase change with where it came from, where it went, and whether the
 * change was the clock running out (true) or a press (false). Returns the unsubscribe.
 */
export function onPhaseChange(listener: (from: TimerPhase, to: TimerPhase, ranOut: boolean) => void) {
  phaseListeners.add(listener);
  return () => {
    phaseListeners.delete(listener);
  };
}

/** Tests only: forget the in-memory clock so the next read comes from localStorage again. */
export function resetFocusStoreForTests() {
  if (ticker !== null) clearInterval(ticker);
  ticker = null;
  snapshot = null;
}

/* ------------------------------------------------------- tab-hidden alerts -- */

/*
 * When a phase ends while the tab is hidden, the tab title flashes the message and, only
 * if the student allowed notifications, a system notification brings the window back on
 * click. Ported from the game's FocusProvider (28 Oct) so the site gets it too. Sound is
 * not here: lib/ambience.ts owns every noise the timer makes.
 */
let restoreTitle: (() => void) | null = null;

function flashTitle(message: string) {
  if (restoreTitle) return;
  const original = document.title;
  let on = true;
  const id = window.setInterval(() => {
    document.title = on ? `⏰ ${message}` : original;
    on = !on;
  }, 1000);
  const back = () => {
    if (document.hidden) return;
    window.clearInterval(id);
    document.title = original;
    document.removeEventListener("visibilitychange", back);
    restoreTitle = null;
  };
  restoreTitle = back;
  document.addEventListener("visibilitychange", back);
}

function announce(title: string, body: string) {
  if (typeof document === "undefined" || !document.hidden) return;
  flashTitle(title);
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const note = new Notification(title, { body, tag: "blueberry-focus" });
      note.onclick = () => {
        window.focus();
        note.close();
      };
    }
  } catch {
    /* a notification that cannot be made is not worth a crash */
  }
}

onPhaseChange((from, to) => {
  if (from === "focus" && to === "break") announce("Focus session done", "Time for a break. You earned it.");
  else if (from === "break" && to === "idle") announce("Break over", "Ready for another round?");
  else if (to === "eyeRest") announce("Look away", "Look at something 20 feet away for 20 seconds.");
});

/** Ask once for notification permission. Call from the Start click: browsers want a gesture. */
export function askForNotifications() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
  } catch {
    /* older browsers throw on the promise form */
  }
}

/* --------------------------------------------------------------- the hook -- */

const actions = { start: (phase: TimerPhase = "focus") => start(phase), pause: () => pause(), reset, beginEyeRest, endEyeRest: () => endEyeRest(), setSettings };

export function useFocusTimer() {
  const snap = useSyncExternalStore(subscribe, current, current);
  const d = derive(snap);
  return {
    phase: snap.state.phase,
    settings: snap.state.settings,
    remainingMs: d.remainingMs,
    totalMs: d.totalMs,
    focusedMs: d.focusedMs,
    eyeRestDue: d.eyeRestDue,
    untilEyeRestMs: d.untilEyeRestMs,
    restsTaken: snap.state.restsTaken,
    ...actions,
  };
}

/** `mm:ss`, rounded up, with the minutes never padded away. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
