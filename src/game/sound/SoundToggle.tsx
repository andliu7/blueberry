/**
 * The sound on/off switch, one row of the Me tab's grouped settings list.
 *
 * Same markup as MeTab's own SwitchRow (a button with role="switch"), so it
 * looks and reads the same as "Hover reveal" and "Magnifier" beside it. The
 * .me-* classes live in tabs/me/me.css, which the Me tab loads.
 *
 * REACT PATTERN, named: `useSyncExternalStore` subscribes to the module scope
 * `progress` store, so this row re-renders the moment the setting changes,
 * wherever it was changed from.
 */

import { useSyncExternalStore } from "react";
import { progress } from "../app/progress";
import { playCorrect, sound } from "./gameSound";
import { soundOnFrom } from "./sound";

export function SoundToggle() {
  const on = useSyncExternalStore(
    progress.subscribe,
    () => soundOnFrom(progress.getSnapshot().journal),
    () => true,
  );
  const toggle = () => {
    progress.setSettings({ sound: !on });
    if (!on) {
      // Turned on: this tap is a gesture, so the context may start now, and
      // the student hears what they just turned on.
      sound.init();
      playCorrect();
    }
  };
  return (
    <button type="button" role="switch" aria-checked={on} className="me-row" onClick={toggle} data-sound-toggle>
      <span className="me-row-text">
        <span className="me-row-title">Sound</span>
        <span className="me-row-detail">{on ? "Chimes for right answers and gems" : "Off. The game stays silent"}</span>
      </span>
      <span className="me-switch" aria-hidden>
        <span className="me-switch-knob" />
      </span>
    </button>
  );
}
