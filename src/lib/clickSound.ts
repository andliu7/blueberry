/**
 * The theme switch's click, made available to every other control.
 *
 * Delegated from one listener on the document rather than wired into each
 * button. There are around sixty buttons across the site and more arrive most
 * weeks; threading a prop through all of them would mean the sound is missing
 * from whatever gets built next, and nobody would notice for a while.
 *
 * The sound itself is unchanged: a 6ms burst of 3.4kHz sine mixed with noise
 * under a cubic decay, synthesised rather than loaded so there is no audio file
 * to fetch and nothing to fail offline.
 *
 * Opting out is `data-click-silent` on the control or any ancestor. Silence is
 * the exception, so it is the thing that has to be declared.
 */

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let lastAt = 0;

function audioCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  // Browsers start the context suspended until a gesture. Every call here is
  // inside a click, so this is the moment it is allowed to resume.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function ensureBuffer(ac: AudioContext): AudioBuffer {
  if (buffer && buffer.sampleRate === ac.sampleRate) return buffer;
  const rate = ac.sampleRate;
  const len = Math.floor(rate * 0.006);
  const buf = ac.createBuffer(1, len, rate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const sine = Math.sin(2 * Math.PI * 3400 * t);
    const noise = Math.random() * 2 - 1;
    ch[i] = (sine * 0.6 + noise * 0.4) * (1 - t) ** 3;
  }
  buffer = buf;
  return buf;
}

export function playClick() {
  // Throttled, or a control that fires several handlers turns one press into a
  // rattle.
  const now = performance.now();
  if (now - lastAt < 80) return;
  lastAt = now;
  try {
    const ac = audioCtx();
    const src = ac.createBufferSource();
    const gain = ac.createGain();
    src.buffer = ensureBuffer(ac);
    gain.gain.value = 0.08;
    src.connect(gain);
    gain.connect(ac.destination);
    src.start();
  } catch {
    /* audio is decoration; a browser that refuses it changes nothing else */
  }
}

/**
 * What counts as a control worth clicking for.
 *
 * Deliberately narrow. Anything that types, holds, drags or is itself the
 * content stays silent, because the sound is meant to confirm a discrete press
 * and those are not discrete presses.
 */
const SILENT_TAGS = /^(INPUT|TEXTAREA|SELECT|OPTION|LABEL)$/;

function shouldClick(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  const control = target.closest('button, a[href], [role="button"]');
  if (!control) return false;

  // Opted out by the control or anything containing it.
  if (control.closest("[data-click-silent]")) return false;

  // A button wrapping a text field, e.g. the search box's clear affordance.
  if (SILENT_TAGS.test(target.tagName)) return false;

  // Disabled controls did not do anything, so they should not sound as if they
  // did.
  if (control instanceof HTMLButtonElement && control.disabled) return false;

  return true;
}

let installed = false;

export function installClickSound() {
  if (installed || typeof document === "undefined") return;
  installed = true;

  // Bubble rather than capture, so a handler calling stopPropagation because
  // the press was consumed by something else also stops the sound.
  document.addEventListener("click", (e) => {
    // Only real presses. `element.click()` from code has detail 0, and firing
    // on those would make the page click at itself during animations.
    if (e.detail === 0) return;
    if (shouldClick(e.target)) playClick();
  });
}
