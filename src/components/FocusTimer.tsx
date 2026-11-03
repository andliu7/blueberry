import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Eye, Music, Pause, PictureInPicture2, Play, RotateCcw, Timer, X } from "lucide-react";
import { askForNotifications, EYE_OFF, formatClock, useFocusTimer, type TimerPhase } from "@/lib/useFocusTimer";
import { END_SOUND_LABEL, SOUND_LABEL, useAmbience, type EndSound, type Sound } from "@/lib/ambience";
import { sharedContext } from "@/lib/sounds";
import "./focus-timer.css";

/**
 * The study timer (remade 3 Nov to match the second-brain one, which was ported
 * from here in September and then improved; the improvements came back).
 *
 * An icon button, with the minutes left on a small badge while a session runs,
 * and a card that drops down below it. It reopens itself on the three moments
 * worth interrupting for: an eye rest starting, the last minute of a phase, and a
 * phase ending. The eye rest starts on its own (lib/useFocusTimer.ts). The card
 * has a Play button for ambient sound (lib/ambience.ts), which stops the moment a
 * focus block ends; Settings widen the card; Pop out moves the clock into an
 * always-on-top Document Picture-in-Picture window where the browser has one
 * (Chrome and Edge 116+), and the button is not shown elsewhere.
 *
 * WHERE IT IS MOUNTED, and the `placement` prop:
 *  - "site": the site header, beside search (components/SiteChrome.tsx).
 *  - "game": the game's corner, shown only while a session runs or the card is
 *    open (game/tabs/focus/FocusProvider.tsx). The game header's Tools menu and
 *    #/app/focus show the full card, `FocusCard`, below.
 * Every one reads the one clock and the one sound, so they never disagree.
 *
 * Buttons: on the site, the site's own lipped key (`ft-key` in focus-timer.css);
 * in the game, the game's `.btn3d` (app/ui/press.css), which the game imports.
 *
 * Left out of the old card on purpose: the session task list, the deck picker,
 * the break room's Tetris and the Spotify playlists. The second-brain card proved
 * the timer reads better as a clock, a sound and two settings rows.
 */

const PHASE_LABEL: Record<TimerPhase, string> = { idle: "Focus", focus: "Focusing", break: "Break", eyeRest: "Look away" };
/** The card's width with settings open, in px; the compact width lives in the CSS. */
const WIDE = 420;

type TimerState = ReturnType<typeof useFocusTimer>;
type Ambience = ReturnType<typeof useAmbience>;
type Look = "site" | "game";

// Document Picture-in-Picture is not in TypeScript's DOM types yet, so the one call used is typed here.
type PipApi = { requestWindow: (options?: { width?: number; height?: number }) => Promise<Window> };
const pipApi = () => (window as Window & { documentPictureInPicture?: PipApi }).documentPictureInPicture;

/**
 * A PiP window starts as a blank document. Copy every stylesheet across so the clock looks
 * the same: rules as text where the sheet is readable, a link by URL where it is not. The
 * theme is the class (and data attributes) on <html>, so those are copied too.
 */
function copyStyles(from: Document, to: Document) {
  for (const sheet of Array.from(from.styleSheets)) {
    try {
      const style = to.createElement("style");
      style.textContent = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join("\n");
      to.head.appendChild(style);
    } catch {
      if (!sheet.href) continue;
      const link = to.createElement("link");
      link.rel = "stylesheet";
      link.href = sheet.href;
      to.head.appendChild(link);
    }
  }
  to.documentElement.className = from.documentElement.className;
  for (const [key, value] of Object.entries(from.documentElement.dataset)) if (value !== undefined) to.documentElement.dataset[key] = value;
}

/** The button classes for each look. Never a gradient: a flat face over a solid lip. */
function key(look: Look, kind: "primary" | "secondary" | "ghost") {
  return look === "game" ? `btn3d btn3d--sm btn3d--${kind}` : `ft-key ft-key--${kind}`;
}

/** Start focus from a click: the click is what lets sound and notifications through. */
function startFocus(t: TimerState) {
  sharedContext();
  askForNotifications();
  t.start("focus");
}

/**
 * The live part: top row, clock, actions. One component so the card, the full page and
 * the pop-out window render the same thing from the same store.
 */
function Face({ t, sound, look, onChooseSound, onPopOut }: { t: TimerState; sound: Ambience; look: Look; onChooseSound?: () => void; onPopOut?: () => void }) {
  // With no sound chosen, Play opens the settings where the choice is.
  const onPlay = sound.sound === "off" ? onChooseSound : sound.toggle;
  const eyeOn = t.settings.eyeEveryMinutes < EYE_OFF;
  return (
    <>
      <div className="ft-top">
        <span className="ft-phase">{PHASE_LABEL[t.phase]}</span>
        <button
          type="button"
          className={`ft-chip${sound.playing ? " is-on" : ""}`}
          aria-label={sound.playing ? "Pause sound" : "Play sound"}
          title={sound.sound === "off" ? "Choose a sound in Settings" : SOUND_LABEL[sound.sound]}
          disabled={!onPlay}
          onClick={onPlay}
        >
          <Music size={14} aria-hidden />
          {sound.playing ? "Pause" : "Play"}
        </button>
        {onPopOut && (
          <button type="button" className="ft-chip" aria-label="Pop out" title="Keep the timer on top in its own window" onClick={onPopOut}>
            <PictureInPicture2 size={14} aria-hidden />
          </button>
        )}
      </div>
      <div className="ft-clock" aria-live={t.phase === "eyeRest" ? "polite" : "off"}>
        <strong role="timer">{formatClock(t.remainingMs)}</strong>
        {t.phase === "eyeRest" ? (
          <small>Look at something twenty feet away for twenty seconds.</small>
        ) : t.phase === "focus" ? (
          <small>{eyeOn ? `Next eye rest in ${formatClock(t.untilEyeRestMs)}` : "Eye rests are off."}</small>
        ) : t.phase === "break" ? (
          <small>Break. Step away from the screen.</small>
        ) : (
          <small>
            {t.focusedMs > 0
              ? `${Math.round(t.focusedMs / 60_000)} min banked. Start continues it.`
              : `${t.settings.focusMinutes} minutes of focus${eyeOn ? `, a rest for the eyes every ${t.settings.eyeEveryMinutes}` : ""}.`}
          </small>
        )}
      </div>
      <div className="ft-bar" aria-hidden>
        <div className="ft-fill" style={{ transform: `scaleX(${t.totalMs > 0 ? Math.min(1, Math.max(0, 1 - t.remainingMs / t.totalMs)) : 0})` }} />
      </div>
      <div className="ft-actions">
        {t.phase === "idle" ? (
          <button type="button" className={key(look, "primary")} onClick={() => startFocus(t)}>
            <Play size={16} aria-hidden />
            Start focus
          </button>
        ) : (
          <button type="button" className={key(look, "secondary")} onClick={t.pause}>
            <Pause size={16} aria-hidden />
            Pause
          </button>
        )}
        {t.phase === "focus" && eyeOn && (
          <button type="button" className={key(look, "secondary")} onClick={t.beginEyeRest}>
            <Eye size={16} aria-hidden />
            Eye rest now
          </button>
        )}
        {t.phase === "eyeRest" && (
          <button type="button" className={key(look, "secondary")} onClick={t.endEyeRest}>
            Back to it
          </button>
        )}
        {t.phase === "idle" && t.focusedMs > 0 && (
          <button type="button" className={key(look, "secondary")} onClick={() => t.start("break")}>
            Take a break
          </button>
        )}
        <button type="button" className="ft-icon" aria-label="Reset the timer" title="Reset" onClick={t.reset}>
          <RotateCcw size={16} aria-hidden />
        </button>
      </div>
    </>
  );
}

/** The settings rows. Controlled by the parent, because the card's width follows them. */
function Settings({ t, sound, open, onToggle }: { t: TimerState; sound: Ambience; open: boolean; onToggle: () => void }) {
  const commit = (field: "focusMinutes" | "breakMinutes" | "eyeEveryMinutes" | "eyeRestSeconds") => (event: { target: { value: string } }) => {
    const n = Math.round(Number(event.target.value));
    if (Number.isFinite(n) && n > 0) t.setSettings({ [field]: n });
  };
  const eyeOn = t.settings.eyeEveryMinutes < EYE_OFF;
  return (
    <details className="ft-settings" open={open}>
      <summary
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        Settings
      </summary>
      {open && (
        <div className="ft-grid">
          <label>
            Focus, minutes
            <input type="number" min="1" defaultValue={t.settings.focusMinutes} onChange={commit("focusMinutes")} />
          </label>
          <label>
            Break, minutes
            <input type="number" min="1" defaultValue={t.settings.breakMinutes} onChange={commit("breakMinutes")} />
          </label>
          <label>
            Eye rest every, minutes
            <input type="number" min="1" disabled={!eyeOn} defaultValue={eyeOn ? t.settings.eyeEveryMinutes : 20} onChange={commit("eyeEveryMinutes")} />
          </label>
          <label>
            Eye rest, seconds
            <input type="number" min="5" disabled={!eyeOn} defaultValue={t.settings.eyeRestSeconds} onChange={commit("eyeRestSeconds")} />
          </label>
          <label className="ft-check">
            <input type="checkbox" checked={eyeOn} onChange={(event) => t.setSettings({ eyeEveryMinutes: event.target.checked ? 20 : EYE_OFF })} />
            Eye rests (the 20-20-20 rule)
          </label>
          <label>
            Sound
            <select value={sound.sound} onChange={(event) => sound.setSound(event.target.value as Sound)}>
              {(Object.keys(SOUND_LABEL) as Sound[]).map((k) => (
                <option key={k} value={k}>
                  {SOUND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Volume
            <input type="range" min="0" max="1" step="0.05" value={sound.volume} onChange={(event) => sound.setVolume(Number(event.target.value))} />
          </label>
          <label>
            When focus ends
            <select value={sound.endSound} onChange={(event) => sound.setEndSound(event.target.value as EndSound)}>
              {(Object.keys(END_SOUND_LABEL) as EndSound[]).map((k) => (
                <option key={k} value={k}>
                  {END_SOUND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <p className="ft-note">Rests taken this session: {t.restsTaken}</p>
        </div>
      )}
    </details>
  );
}

/** The pop-out window, shared by the dropdown and the page. */
function usePopOut() {
  const [pip, setPip] = useState<Window | null>(null);
  // Closing the page (or this component) closes the pop-out with it.
  useEffect(() => () => pip?.close(), [pip]);
  const popOut = async () => {
    const api = pipApi();
    if (!api) return;
    const win = await api.requestWindow({ width: 320, height: 240 });
    copyStyles(document, win.document);
    // The user closing the window is the only way back; pagehide is the event it fires as it goes.
    win.addEventListener("pagehide", () => setPip(null), { once: true });
    setPip(win);
  };
  return { pip, popOut: pipApi() ? popOut : undefined };
}

function PipPortal({ pip, t, sound, look }: { pip: Window; t: TimerState; sound: Ambience; look: Look }) {
  // A portal renders into another window's body while staying in this React tree, so the
  // pop-out shares the same store and updates on the same renders as the card.
  return createPortal(
    <div className={`focus-timer ft-look-${look} ft-pip phase-${t.phase}`}>
      <Face t={t} sound={sound} look={look} />
    </div>,
    pip.document.body,
  );
}

/** The timer as a button with a dropdown card. */
export function FocusTimer({ placement = "site" }: { placement?: Look }) {
  const t = useFocusTimer();
  const sound = useAmbience();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const { pip, popOut } = usePopOut();
  const lastPhase = useRef(t.phase);
  const lastMinute = useRef(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);

  // Reopen on the three moments worth interrupting for.
  useEffect(() => {
    if (t.phase === lastPhase.current) return;
    const from = lastPhase.current;
    lastPhase.current = t.phase;
    // Into any running phase, or a break ending. A press that pauses focus is not news.
    if (t.phase !== "idle" || from === "break") setOpen(true);
  }, [t.phase]);
  useEffect(() => {
    const inLastMinute = t.phase !== "idle" && t.phase !== "eyeRest" && t.remainingMs > 0 && t.remainingMs <= 60_000;
    if (inLastMinute && !lastMinute.current) setOpen(true);
    lastMinute.current = inLastMinute;
  }, [t.phase, t.remainingMs]);
  // Anything on the site can ask for the card: the Schedule page's Focus tile, search results.
  useEffect(() => {
    if (placement !== "site") return;
    const openIt = () => setOpen(true);
    window.addEventListener("blueberry:open-focus", openIt);
    return () => window.removeEventListener("blueberry:open-focus", openIt);
  }, [placement]);

  const running = t.phase !== "idle";
  // The badge: whole minutes left, rounded up so it never reads 0 while time remains; seconds under a minute.
  const left = t.remainingMs >= 60_000 ? `${Math.ceil(t.remainingMs / 60_000)}m` : `${Math.ceil(t.remainingMs / 1000)}s`;
  const keys = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      toggle.current?.focus();
    }
  };
  // Settings widen the card. It is anchored by its right edge under the button, so plain
  // widening grows it leftward; where the viewport has room on the right (16px kept clear)
  // the right edge is pulled out by that much, and the rest of the growth goes left.
  const toggleSettings = () => {
    if (!settingsOpen && card.current) {
      const box = card.current.getBoundingClientRect();
      const room = Math.max(0, window.innerWidth - box.right - 16);
      setShift(Math.min(room, Math.max(0, Math.min(WIDE, window.innerWidth - 32) - box.width)));
    }
    setSettingsOpen((v) => !v);
  };
  const chooseSound = () => {
    setOpen(true);
    if (!settingsOpen) toggleSettings();
  };

  // In the game the corner button is only there while it has something to say.
  if (placement === "game" && !running && !open) return null;

  return (
    <section
      className={`focus-timer ft-look-${placement} ft-at-${placement} ${open ? "is-open" : running ? "is-running" : "is-idle"} phase-${t.phase}`}
      aria-label="Focus timer"
      onKeyDown={keys}
    >
      <button
        ref={toggle}
        type="button"
        className="ft-toggle"
        aria-expanded={open}
        aria-label={running ? `Focus, ${PHASE_LABEL[t.phase]}, ${formatClock(t.remainingMs)} left` : "Focus"}
        title="Focus timer"
        onClick={() => setOpen((v) => !v)}
      >
        {t.phase === "eyeRest" ? <Eye size={20} aria-hidden /> : <Timer size={20} aria-hidden />}
        {running && (
          <span className="ft-badge" aria-hidden>
            {left}
          </span>
        )}
      </button>
      {open && (
        <div ref={card} className={`ft-card${settingsOpen ? " is-wide" : ""}`} style={{ "--ft-shift": `${shift}px` } as CSSProperties}>
          <button type="button" className="ft-close" aria-label="Close the timer" onClick={() => setOpen(false)}>
            <X size={16} aria-hidden />
          </button>
          {pip ? (
            <div className="ft-away">
              <p className="ft-note">The timer is in its own window.</p>
              <button type="button" className={key(placement, "secondary")} onClick={() => pip.close()}>
                Bring it back
              </button>
            </div>
          ) : (
            <Face t={t} sound={sound} look={placement} onChooseSound={chooseSound} onPopOut={popOut} />
          )}
          <Settings t={t} sound={sound} open={settingsOpen} onToggle={toggleSettings} />
        </div>
      )}
      {pip && <PipPortal pip={pip} t={t} sound={sound} look={placement} />}
    </section>
  );
}

/** The same card, full size, for a page or a sheet (#/app/focus, the game's Tools menu). */
export function FocusCard({ look = "game" }: { look?: Look }) {
  const t = useFocusTimer();
  const sound = useAmbience();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { pip, popOut } = usePopOut();
  return (
    <section className={`focus-timer ft-look-${look} ft-at-page phase-${t.phase}`} aria-label="Focus timer">
      <div className="ft-card is-page">
        {pip ? (
          <div className="ft-away">
            <p className="ft-note">The timer is in its own window.</p>
            <button type="button" className={key(look, "secondary")} onClick={() => pip.close()}>
              Bring it back
            </button>
          </div>
        ) : (
          <Face t={t} sound={sound} look={look} onChooseSound={() => setSettingsOpen(true)} onPopOut={popOut} />
        )}
        <Settings t={t} sound={sound} open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)} />
      </div>
      {pip && <PipPortal pip={pip} t={t} sound={sound} look={look} />}
    </section>
  );
}

export default FocusTimer;
