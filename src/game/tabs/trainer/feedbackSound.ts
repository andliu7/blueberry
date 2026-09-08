/**
 * The wrong-answer sound. Owner requirement, 2026-08-25: a wrong drop plays a
 * sound immediately, paired with the failure animation, no button between the
 * mistake and the feedback.
 *
 * Synthesised, not an asset: two short descending sine blips through one gain
 * envelope. An mp3 would be a network fetch on the game route's budget and a
 * licence to track; an oscillator is 25 lines and weighs nothing. Quiet on
 * purpose (peak gain 0.08): the sound is a tap on the shoulder, not a buzzer,
 * because the voice rules in CLAUDE.md apply to audio too. No red, no klaxon.
 *
 * Every call is wrapped: audio is never load-bearing, and an AudioContext can
 * refuse to exist (autoplay policy before first gesture, headless capture,
 * test environments). A failure to beep must never become a failure to grade.
 */

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  try {
    if (context === null) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor === undefined) return null;
      context = new Ctor();
    }
    // A context created before the first user gesture starts suspended; the
    // wrong sound always follows a pointer up, so resume is allowed here.
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

function blip(ctx: AudioContext, at: number, hz: number, ms: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(hz, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.08, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + ms / 1000 + 0.02);
}

/** Two falling tones, 190 ms end to end. */
export function playWrongSound(): void {
  try {
    const ctx = audioContext();
    if (ctx === null) return;
    const now = ctx.currentTime;
    blip(ctx, now, 311.1, 90); /* E flat 4 */
    blip(ctx, now + 0.1, 233.1, 90); /* B flat 3 */
  } catch {
    /* never load-bearing */
  }
}
