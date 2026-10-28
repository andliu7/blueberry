/**
 * The study timer as a tool: opened from the header tools, from any screen, and
 * also reachable as "#/app/focus". It only draws and controls; the clock and its
 * alerts live in FocusProvider so closing this sheet never stops the timer.
 *
 * Bloom reacts to the phase (curious when idle, focused while you work, happy on
 * a break, calm during an eye rest), in the mood vocabulary of lib/berryMood.ts.
 */
import { BlueberryMark } from "../../mascot/BlueberryMark";
import type { BerryMood } from "@/lib/berryMood";
import type { TimerPhase } from "@/lib/useFocusTimer";
import { formatClock } from "@/lib/useFocusTimer";
import { useFocus } from "./FocusProvider";
import "./focus.css";

const PHASE_LABEL: Record<TimerPhase, string> = {
  idle: "Ready",
  focus: "Focusing",
  break: "Break",
  eyeRest: "Look away",
};

const PHASE_MOOD: Record<TimerPhase, BerryMood> = {
  idle: "curious",
  focus: "focused",
  break: "happy",
  eyeRest: "calm",
};

const FOCUS_CHOICES = [15, 25, 50] as const;
const BREAK_CHOICES = [5, 10, 15] as const;
/** The eye rest is the 20-20-20 rule; "off" is a number no session reaches. */
const EYE_ON = 20;
const EYE_OFF = 9999;

export default function FocusTab() {
  const t = useFocus();
  if (t === null) {
    return (
      <div className="focus-tab">
        <p className="focus-tab__note">The timer isn't available on this screen.</p>
      </div>
    );
  }

  const idle = t.phase === "idle";
  const eyeOn = t.settings.eyeEveryMinutes < EYE_OFF;
  const progress = t.totalMs > 0 ? Math.max(0, Math.min(1, t.remainingMs / t.totalMs)) : 0;
  const resuming = idle && t.focusedMs > 0;

  return (
    <div className="focus-tab" data-focus-tab data-phase={t.phase}>
      <span className="focus-tab__bloom" aria-hidden>
        <BlueberryMark eyes mood={PHASE_MOOD[t.phase]} className="h-full w-full" />
      </span>

      <p className="focus-tab__phase">{PHASE_LABEL[t.phase]}</p>
      <p className="focus-tab__clock" role="timer" aria-label={`${PHASE_LABEL[t.phase]}, ${formatClock(t.remainingMs)} left`}>
        {formatClock(t.remainingMs)}
      </p>
      <div className="focus-tab__bar" aria-hidden>
        <div className="focus-tab__fill" style={{ transform: `scaleX(${progress})` }} />
      </div>

      {t.phase === "focus" && eyeOn && (
        <p className="focus-tab__note">Eye rest in {formatClock(t.untilEyeRestMs)}</p>
      )}
      {t.phase === "break" && <p className="focus-tab__note">Step away from the screen.</p>}
      {t.restsTaken > 0 && <p className="focus-tab__note">Eye rests taken: {t.restsTaken}</p>}

      <div className="focus-tab__row">
        {idle && (
          <button type="button" className="focus-btn focus-btn--yes" onClick={t.startFocus}>
            {resuming ? "Resume" : "Start focus"}
          </button>
        )}
        {t.phase === "focus" && (
          <button type="button" className="focus-btn" onClick={t.pauseFocus}>
            Pause
          </button>
        )}
        {t.phase === "eyeRest" && (
          <button type="button" className="focus-btn focus-btn--yes" onClick={t.endEyeRest}>
            <span aria-hidden>{"✓"}</span> Done
          </button>
        )}
        {(!idle || resuming) && (
          <button type="button" className="focus-btn focus-btn--no" onClick={t.endSession}>
            End
          </button>
        )}
      </div>

      <div className="focus-tab__group">
        <span className="focus-tab__label" id="focus-len">
          Focus (minutes)
        </span>
        <div className="focus-tab__row" role="group" aria-labelledby="focus-len">
          {FOCUS_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              className="focus-chip"
              aria-pressed={t.settings.focusMinutes === m}
              disabled={!idle}
              onClick={() => t.setSettings({ focusMinutes: m })}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="focus-tab__group">
        <span className="focus-tab__label" id="break-len">
          Break (minutes)
        </span>
        <div className="focus-tab__row" role="group" aria-labelledby="break-len">
          {BREAK_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              className="focus-chip"
              aria-pressed={t.settings.breakMinutes === m}
              disabled={!idle}
              onClick={() => t.setSettings({ breakMinutes: m })}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="focus-tab__group">
        <span className="focus-tab__label" id="eye-rule">
          Eye rest every 20 minutes
        </span>
        <div className="focus-tab__row" role="group" aria-labelledby="eye-rule">
          <button type="button" className="focus-chip" aria-pressed={eyeOn} onClick={() => t.setSettings({ eyeEveryMinutes: EYE_ON })}>
            On
          </button>
          <button type="button" className="focus-chip" aria-pressed={!eyeOn} onClick={() => t.setSettings({ eyeEveryMinutes: EYE_OFF })}>
            Off
          </button>
        </div>
      </div>
    </div>
  );
}
