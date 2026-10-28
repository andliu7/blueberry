/**
 * The study timer, once for the whole app.
 *
 * WHY A PROVIDER. useFocusTimer keeps its state per caller, and its rule that a
 * finished phase rolls into the next one runs only while a caller is mounted. A
 * timer that lived inside the tool sheet would stop the moment the sheet closed.
 * So the game calls the hook once, here, above every screen, and the sheet, the
 * Settings row and the banner below all read the same clock (the lifting state
 * up pattern the site's FocusTimer card already uses).
 *
 * WHAT IT ADDS TO THE HOOK (owner, 28 Oct):
 *  - a short chime when a focus session or a break ends;
 *  - when the tab is hidden: the tab title flashes the message, and, only if the
 *    student has allowed notifications, a system notification whose click brings
 *    this window to the front;
 *  - the 20-20-20 prompt: every twenty minutes of focus, a banner at the top of
 *    the screen asks "Rest your eyes?" with a check and an X. The check starts a
 *    20 second countdown to look 20 feet away; the X puts the next prompt twenty
 *    minutes away without a countdown.
 *
 * Browser rules this respects: sound and notification permission both need a
 * click, so they are unlocked from the Start button and nowhere else.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { formatClock, useFocusTimer } from "@/lib/useFocusTimer";
import "./focus.css";

type Timer = ReturnType<typeof useFocusTimer>;

export interface FocusApi extends Timer {
  /** Start or resume a focus session. Call from a click: it unlocks sound and asks for notifications. */
  startFocus: () => void;
  /** Pause, keeping the focus time so far. */
  pauseFocus: () => void;
  /** End the session or the break, with no chime. */
  endSession: () => void;
}

const FocusContext = createContext<FocusApi | null>(null);

/** The timer, or null where no provider is mounted (the tool then says so instead of crashing). */
export function useFocus(): FocusApi | null {
  return useContext(FocusContext);
}

/* ------------------------------------------------------------ the alerts -- */

let audio: AudioContext | null = null;

function unlockAudio() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    /* no audio: the banner and the title still work */
  }
}

/** Three soft notes, rising. Synthesised, so there is no file to load. */
function chime() {
  if (!audio || audio.state !== "running") return;
  const t0 = audio.currentTime;
  [660, 880, 1100].forEach((freq, i) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = t0 + i * 0.16;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
    osc.connect(gain).connect(audio!.destination);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}

let restoreTitle: (() => void) | null = null;

/** Flashes the tab title until the student comes back, then puts it back. */
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
  chime();
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

function askForNotifications() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
  } catch {
    /* older browsers throw on the promise form */
  }
}

/* ------------------------------------------------------------- the banner -- */

function Banner({ t }: { t: FocusApi }) {
  if (t.phase === "eyeRest") {
    return (
      <div className="focus-banner" role="status" data-focus-banner="rest">
        <div className="focus-banner__text">
          <strong>Look 20 feet away</strong>
          <span>
            Rest your eyes for {Math.ceil(t.remainingMs / 1000)} more seconds, then you're back to it.
          </span>
        </div>
        <button type="button" className="focus-btn focus-btn--yes" onClick={t.endEyeRest} aria-label="Done, back to focus">
          <span aria-hidden>{"✓"}</span> Done
        </button>
      </div>
    );
  }
  if (t.phase === "focus" && t.eyeRestDue) {
    return (
      <div className="focus-banner" role="alertdialog" aria-label="Eye rest" data-focus-banner="ask">
        <div className="focus-banner__text">
          <strong>Rest your eyes?</strong>
          <span>Look at something 20 feet away for 20 seconds.</span>
        </div>
        <div className="focus-banner__actions">
          <button type="button" className="focus-btn focus-btn--no" onClick={t.skipEyeRest} aria-label="Not now">
            <span aria-hidden>{"✕"}</span>
          </button>
          <button type="button" className="focus-btn focus-btn--yes" onClick={t.beginEyeRest} aria-label="Yes, start the 20 second rest">
            <span aria-hidden>{"✓"}</span>
          </button>
        </div>
      </div>
    );
  }
  return null;
}

/* ----------------------------------------------------------- the provider -- */

export function FocusProvider({ children }: { children: ReactNode }) {
  const timer = useFocusTimer();
  // Set by a button press that ends a phase on purpose, so it gets no chime.
  const quiet = useRef(false);
  const before = useRef(timer.phase);
  const asked = useRef(false);

  useEffect(() => {
    const was = before.current;
    before.current = timer.phase;
    if (quiet.current) {
      quiet.current = false;
      return;
    }
    if (was === "focus" && timer.phase === "break") announce("Focus session done", "Time for a break. You earned it.");
    else if (was === "break" && timer.phase === "idle") announce("Break over", "Ready for another round?");
  }, [timer.phase]);

  // The prompt appearing is its own moment: a softer nudge, once per prompt.
  const due = timer.phase === "focus" && timer.eyeRestDue;
  useEffect(() => {
    if (due && !asked.current) announce("Rest your eyes?", "Look 20 feet away for 20 seconds.");
    asked.current = due;
  }, [due]);

  const { start, pause, stop } = timer;
  const startFocus = useCallback(() => {
    unlockAudio();
    askForNotifications();
    start("focus");
  }, [start]);
  const pauseFocus = useCallback(() => {
    quiet.current = true;
    pause();
  }, [pause]);
  const endSession = useCallback(() => {
    quiet.current = true;
    stop();
  }, [stop]);

  const api = useMemo<FocusApi>(() => ({ ...timer, startFocus, pauseFocus, endSession }), [timer, startFocus, pauseFocus, endSession]);

  return (
    <FocusContext.Provider value={api}>
      {children}
      <Banner t={api} />
    </FocusContext.Provider>
  );
}

export { formatClock };
