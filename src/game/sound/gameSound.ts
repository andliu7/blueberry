/**
 * The one Sound instance for the app, wired to the student's setting, plus the
 * three verbs the rest of the game calls. sound.ts is the engine and knows
 * nothing about progress; this file is the wiring, kept apart so the engine
 * tests run without a progress store.
 *
 * Module scope, like `progress` itself: every screen plays through the same
 * AudioContext, and browsers limit how many a page may open.
 */

import { progress } from "../app/progress";
import { createSound, soundOnFrom, type Sound } from "./sound";

export const sound: Sound = createSound();

/**
 * Keep the engine's switch equal to the journal's. Read once now and again on
 * every progress change; the scan is one pass over the journal, which the
 * economy derivation already does many times over on the same change.
 */
function syncWithSetting(): void {
  sound.setOn(soundOnFrom(progress.getSnapshot().journal));
}
syncWithSetting();
progress.subscribe(syncWithSetting);

/**
 * Unlock on the first gesture, and on every gesture after it: iOS can suspend
 * the context again after a call or another app takes the audio, and resume
 * is only allowed inside a gesture. `init` is a no-op when already running.
 * Capture phase so a component that stops propagation cannot hide the tap.
 */
if (typeof document !== "undefined") {
  // Ask for an "ambient" session where the browser has one (Safari 16.4+):
  // the silent switch mutes us, and the student's music keeps playing.
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session !== undefined) session.type = "ambient";
  } catch {
    /* never load-bearing */
  }
  const unlock = () => sound.init();
  document.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  document.addEventListener("keydown", unlock, { capture: true, passive: true });
  // A hidden tab makes no sound and holds no audio hardware.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) sound.suspend();
    else sound.init();
  });
}

/** Every correct answer, on the same beat the screen turns green. */
export function playCorrect(): void {
  sound.sfx.correct();
}

/**
 * Closest two gem sounds may start, in ms. A big chest open can call playGem
 * once per gem; without a floor, dozens of three-oscillator voices pile up
 * into noise. 60 ms still reads as a quick run of pickups.
 */
export const GEM_GAP_MS = 60;
let lastGemAt = -Infinity;

/**
 * A gem landing. For the chest flight: call once as each gem (or the stack of
 * gems) reaches the diamond count in the HUD. Calls closer together than
 * GEM_GAP_MS are dropped, so per-gem calls are safe.
 */
export function playGem(): void {
  const now = Date.now();
  if (now - lastGemAt < GEM_GAP_MS) return;
  lastGemAt = now;
  sound.sfx.gem();
}

/** A wrong answer. tabs/trainer/feedbackSound.ts calls this. */
export function playWrong(): void {
  sound.sfx.wrong();
}
