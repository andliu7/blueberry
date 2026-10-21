/**
 * Blueberry's sound effects, synthesised with WebAudio. No audio files.
 *
 * WHERE THIS CAME FROM. The owner asked (20 Oct 2026) for gem and coin sounds
 * "like Clash of Clans but our own" and a rewarding sound on every correct
 * answer "like Duolingo, not a copy", with a setting to turn sound off. The
 * engine is the portfolio island's sound module (andliu-portfolio/island,
 * src/core/sound.js: init, setOn, tone, sfx), copied here as Blueberry's own
 * file and typed. The island's driving sounds (honk, engine hum and the rest)
 * were left behind because nothing here drives.
 *
 * WHY SYNTHESISED. An mp3 is a network fetch on the game route's budget and a
 * licence to track; an oscillator weighs nothing. The wrong sound in
 * tabs/trainer/feedbackSound.ts was already built this way and now plays
 * through here, so one switch silences every sound the game makes.
 *
 * THE RULES, in the order they are checked:
 *  1. Sound is ON by default (owner), and the student turns it off in the Me
 *     tab. The choice is a `settings` event in the progress journal, so it
 *     travels with the rest of their settings (`soundOnFrom` below).
 *  2. Nothing is created until the student touches the page. Browsers refuse
 *     to start audio before a gesture, so the first pointer or key press
 *     creates (or wakes) the AudioContext. A sound asked for before that is
 *     simply skipped.
 *  3. A muted phone stays muted. Where the browser supports it (Safari 16.4
 *     and later) the page asks for an "ambient" audio session: sounds obey
 *     the silent switch and mix under the student's music instead of
 *     stopping it.
 *  4. Audio is never load-bearing. Every call is wrapped, because a context
 *     can refuse to exist (autoplay policy, headless capture, tests). A
 *     failure to beep must never become a failure to grade.
 */

import type { EconomyEvent } from "@blueberry/economy";

/** The two oscillator shapes in use, a subset of WebAudio's OscillatorType. */
export type ToneType = "sine" | "triangle" | "square";

/**
 * The slice of AudioContext this file uses. Typed narrowly so a test can hand
 * in a fake and count what would have played.
 */
export type SoundContext = Pick<AudioContext, "currentTime" | "destination" | "state" | "resume" | "suspend" | "createOscillator" | "createGain">;

export interface SoundOptions {
  /** Makes the context on the first gesture. Returns null where audio does not exist. */
  readonly makeContext?: () => SoundContext | null;
}

export interface Sound {
  /** Create or wake the context. Call from inside a user gesture. */
  init(): void;
  /** Let the audio hardware go, for a hidden tab. The next `init` wakes it. */
  suspend(): void;
  setOn(on: boolean): void;
  readonly on: boolean;
  /**
   * One note: `freq` in Hz for `dur` seconds, rising or falling to `slide` Hz
   * when given, starting `delay` seconds from now. Silent when sound is off
   * or before the first gesture.
   */
  tone(freq: number, dur: number, type?: ToneType, gain?: number, slide?: number, delay?: number): void;
  readonly sfx: {
    /** A bright sparkly pickup: a gem or a coin landing in the purse. */
    gem(): void;
    /** A short rising two-note chime: a correct answer. */
    correct(): void;
    /** Two soft falling notes: a wrong answer. Quiet on purpose, a tap on the shoulder. */
    wrong(): void;
  };
}

/** The real context, or null where the browser has none. */
function browserContext(): SoundContext | null {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctor === undefined ? null : new Ctor();
  } catch {
    return null;
  }
}

export function createSound(options: SoundOptions = {}): Sound {
  const makeContext = options.makeContext ?? browserContext;
  let ctx: SoundContext | null = null;
  let on = true;

  function init(): void {
    // Nothing to wake while the student has sound off; the switch itself is
    // a gesture, so turning it back on creates the context then.
    if (!on) return;
    try {
      if (ctx === null) ctx = makeContext();
      if (ctx !== null && ctx.state === "suspended") void ctx.resume();
    } catch {
      /* never load-bearing */
    }
  }

  function suspend(): void {
    try {
      if (ctx !== null && ctx.state === "running") void ctx.suspend();
    } catch {
      /* never load-bearing */
    }
  }

  function tone(freq: number, dur: number, type: ToneType = "sine", gain = 0.15, slide?: number, delay = 0): void {
    if (!on || ctx === null) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime + delay;
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide !== undefined) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      // A 10 ms attack and an exponential fade: no click at either end.
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch {
      /* never load-bearing */
    }
  }

  const sfx = {
    gem() {
      // A glassy ping that jumps up a fifth, with a faint high sparkle on
      // top: E6 then B6, about a quarter of a second end to end.
      tone(1318.5, 0.08, "triangle", 0.07);
      tone(1975.5, 0.22, "sine", 0.09, undefined, 0.06);
      tone(3951, 0.12, "sine", 0.02, undefined, 0.07);
    },
    correct() {
      // G5 up to C6, a fourth, the second note held longer so it rings like
      // a reward rather than a click. A soft octave above the C adds shine.
      tone(784, 0.14, "triangle", 0.1);
      tone(1046.5, 0.34, "sine", 0.12, undefined, 0.1);
      tone(2093, 0.2, "sine", 0.025, undefined, 0.1);
    },
    wrong() {
      // The trainer's wrong sound, unchanged: E flat 4 then B flat 3, peak
      // gain 0.08, 190 ms end to end. No red, no klaxon.
      tone(311.1, 0.09, "sine", 0.08);
      tone(233.1, 0.09, "sine", 0.08, undefined, 0.1);
    },
  };

  function setOn(next: boolean): void {
    on = next;
  }

  return {
    init,
    suspend,
    setOn,
    get on() {
      return on;
    },
    tone,
    sfx,
  };
}

/**
 * The student's choice from the journal: the latest settings event that
 * names `sound` wins, and a journal that never names it means on.
 */
export function soundOnFrom(journal: readonly EconomyEvent[]): boolean {
  let on = true;
  for (const event of journal) {
    if (event.kind === "settings" && event.sound !== undefined) on = event.sound;
  }
  return on;
}
