/**
 * Background sound for the focus timer, synthesised with Web Audio rather than
 * played from files.
 *
 * Ported back (3 Nov) from the second-brain timer, which took it from this repo's
 * `useAmbience.ts` in September and improved it: two more beds (brown noise and
 * fire), a saved choice, an end-of-focus sound, and one shared sound for every
 * view of the timer. `useAmbience.ts` stays for the break room it still serves.
 *
 * WHY SYNTHESISE. There is no loop point, so there is no seam to hide, nothing to
 * download, no library and no account. The one place a repeat could creep in is
 * the noise buffers, so each bed runs *two* buffers of coprime length, 19 and 23
 * seconds, played together. Their sum only repeats every 437 seconds, and the
 * filters moving over the top ride slow oscillators that share no period with
 * either. Nothing lines up twice inside a focus block.
 *
 * ONE SOUND FOR THE APP. Like the clock (lib/useFocusTimer.ts) the state is held
 * in this module and read through `useSyncExternalStore`, so the site header's
 * card, the game's corner card and #/app/focus all show the same Play state and
 * drive the same graph.
 *
 * The sound is chosen in the timer's settings and started by its own Play button.
 * When a focus block ends (it runs out, or is paused or reset) the sound stops at
 * once, and the chosen end sound follows (a soft chime, gold coins, or nothing):
 * the silence itself is the cue that focus is over. A block that runs out with no
 * bed playing still rings the end sound, which is what the game's timer did.
 */
import { useSyncExternalStore } from "react";
import { onPhaseChange } from "./useFocusTimer";
import { existingContext, playChime, playCoin, sharedContext } from "./sounds";

export type Sound = "off" | "white" | "brown" | "rain" | "fire";
export const SOUND_LABEL: Record<Sound, string> = {
  off: "Off",
  white: "White noise",
  brown: "Brown noise",
  rain: "Rainforest",
  fire: "Fire",
};
export type EndSound = "chime" | "coins" | "none";
export const END_SOUND_LABEL: Record<EndSound, string> = { chime: "Soft chime", coins: "Gold coins", none: "None" };
export const AMBIENCE_KEY = "blueberry_ambience_v1";

/** Coprime, so the two layers do not come round together for over seven minutes. */
const BUFFER_SECONDS = [19, 23];
/** Seconds. In is slow so a bed never starts with a jolt; out is short because the stop is the signal. */
const FADE_IN = 0.9;
const FADE_OUT = 0.25;

type Colour = "white" | "pink" | "brown";

/**
 * Fills a buffer with noise.
 *
 * `pink` runs white noise through Paul Kellet's economical approximation, a bank of
 * one-pole filters summed: it falls at 3 dB per octave, roughly how rain and wind
 * sound, where flat white noise tires the ear within minutes.
 *
 * `brown` integrates white noise (a leaky running sum), 6 dB per octave, the deep one.
 * A running sum ends somewhere other than where it began, and a loop jumping between
 * the two is a click every 19 seconds, so the drift is taken out with a straight line
 * from the last sample back to the first.
 */
function noiseBuffer(ctx: AudioContext, seconds: number, colour: Colour): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, walk = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (colour === "white") {
      data[i] = white * 0.5;
      continue;
    }
    if (colour === "brown") {
      walk = (walk + 0.02 * white) / 1.02;
      data[i] = walk * 3.5;
      continue;
    }
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09;
    b6 = white * 0.115926;
  }
  if (colour === "brown" && length > 1) {
    const drift = data[length - 1] - data[0];
    for (let i = 0; i < length; i++) data[i] -= drift * (i / (length - 1));
  }
  return buffer;
}

/** One running layer of a scene. `at` is audio time, so a stop lands exactly where the fade ends. */
interface Voice {
  stop: (at: number) => void;
}

const stopAt = (node: AudioScheduledSourceNode, at: number) => {
  try {
    node.stop(at);
  } catch {
    /* already stopped */
  }
};

/** The two noise layers plus a slowly wandering low-pass, shared by every scene. */
function bed(ctx: AudioContext, out: AudioNode, opts: { colour: Colour; cutoff: number; sweep: number; gain: number }): Voice {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.cutoff;
  filter.Q.value = 0.4;
  const level = ctx.createGain();
  level.gain.value = opts.gain;
  filter.connect(level).connect(out);
  const sources = BUFFER_SECONDS.map((seconds) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, seconds, opts.colour);
    src.loop = true;
    // A slight detune per layer, so the two never sit in lockstep.
    src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.02;
    src.connect(filter);
    src.start();
    return src;
  });
  // The filter breathes on two slow oscillators at incommensurable rates: one sine on the
  // cutoff is a recognisable "wah" within a minute; two beating read as air moving.
  const lfos = [
    { rate: 0.017, depth: opts.sweep },
    { rate: 0.0413, depth: opts.sweep * 0.45 },
  ].map(({ rate, depth }) => {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const amount = ctx.createGain();
    amount.gain.value = depth;
    lfo.connect(amount).connect(filter.frequency);
    lfo.start();
    return lfo;
  });
  return {
    stop: (at) => {
      sources.forEach((s) => stopAt(s, at));
      lfos.forEach((l) => stopAt(l, at));
    },
  };
}

/**
 * Short filtered noise bursts on a random schedule: raindrops on leaves, or a fire's
 * pops. Interval, pitch and loudness are randomised per burst, and bursts are scheduled
 * two seconds ahead on audio time, so they land exactly whenever the main thread gets round.
 */
function bursts(
  ctx: AudioContext,
  out: AudioNode,
  opts: { low: number; spread: number; q: [number, number]; peak: [number, number]; length: [number, number]; gap: [number, number] },
): Voice {
  let stopped = false;
  let nextAt = ctx.currentTime + 0.2;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pick = ([min, max]: [number, number]) => min + Math.random() * (max - min);
  const one = (at: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.09, "white");
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = opts.low + Math.random() * opts.spread;
    band.Q.value = pick(opts.q);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(pick(opts.peak), at + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, at + pick(opts.length));
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    src.connect(band).connect(env).connect(pan).connect(out);
    src.start(at);
    src.stop(at + 0.4);
  };
  const schedule = () => {
    if (stopped) return;
    while (nextAt < ctx.currentTime + 2) {
      one(nextAt);
      nextAt += pick(opts.gap);
    }
    timer = setTimeout(schedule, 900);
  };
  schedule();
  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

/** A fire's glow: the bed under it rises and sags on two sub-hertz oscillators that share no period. */
function flicker(ctx: AudioContext, out: AudioNode): { input: AudioNode; voice: Voice } {
  const swell = ctx.createGain();
  swell.gain.value = 0.75;
  swell.connect(out);
  const lfos = [
    { rate: 0.31, depth: 0.12 },
    { rate: 0.87, depth: 0.07 },
  ].map(({ rate, depth }) => {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const amount = ctx.createGain();
    amount.gain.value = depth;
    lfo.connect(amount).connect(swell.gain);
    lfo.start();
    return lfo;
  });
  return { input: swell, voice: { stop: (at) => lfos.forEach((l) => stopAt(l, at)) } };
}

function scene(ctx: AudioContext, master: GainNode, sound: Exclude<Sound, "off">): Voice[] {
  if (sound === "white") return [bed(ctx, master, { colour: "pink", cutoff: 1900, sweep: 260, gain: 0.85 })];
  if (sound === "brown") return [bed(ctx, master, { colour: "brown", cutoff: 520, sweep: 120, gain: 0.9 })];
  if (sound === "rain")
    return [
      bed(ctx, master, { colour: "pink", cutoff: 1250, sweep: 420, gain: 0.6 }),
      bed(ctx, master, { colour: "pink", cutoff: 340, sweep: 140, gain: 0.5 }),
      bursts(ctx, master, { low: 700, spread: 3200, q: [6, 16], peak: [0.05, 0.16], length: [0.09, 0.23], gap: [0.05, 0.47] }),
    ];
  // Fire: a brown rumble that flickers, with crackles shorter, brighter and sparser than raindrops.
  const glow = flicker(ctx, master);
  return [
    glow.voice,
    bed(ctx, glow.input, { colour: "brown", cutoff: 700, sweep: 180, gain: 0.8 }),
    bursts(ctx, master, { low: 1400, spread: 4600, q: [0.8, 3], peak: [0.03, 0.2], length: [0.01, 0.06], gap: [0.04, 0.9] }),
  ];
}

/* ------------------------------------------------------------- the store -- */

type Saved = { sound: Sound; volume: number; endSound: EndSound };
type State = Saved & { playing: boolean };
const DEFAULTS: Saved = { sound: "off", volume: 0.5, endSound: "chime" };

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(AMBIENCE_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Saved>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let state: State | null = null;
const listeners = new Set<() => void>();
let master: GainNode | null = null;
let voices: Voice[] = [];

const read = (): State => (state ??= { ...loadSaved(), playing: false });

function set(next: Partial<State>) {
  state = { ...read(), ...next };
  const { sound, volume, endSound } = state;
  try {
    localStorage.setItem(AMBIENCE_KEY, JSON.stringify({ sound, volume, endSound }));
  } catch {
    /* private mode: the choice lasts this visit */
  }
  listeners.forEach((l) => l());
}

function silence(fade: number) {
  const ctx = existingContext();
  const m = master;
  const vs = voices;
  voices = [];
  master = null;
  if (!ctx || !m) return;
  // Fade before stopping: cutting a noise bed dead is a click, the wrong note to end on.
  const now = ctx.currentTime;
  m.gain.cancelScheduledValues(now);
  m.gain.setValueAtTime(m.gain.value, now);
  m.gain.linearRampToValueAtTime(0.0001, now + fade);
  vs.forEach((v) => v.stop(now + fade));
}

function startSound(sound: Sound) {
  silence(0.05);
  if (sound === "off") {
    set({ playing: false });
    return;
  }
  // Made on the click that asks for sound, never before (sounds.ts).
  const ctx = sharedContext();
  if (!ctx) return;
  const m = ctx.createGain();
  m.gain.value = 0.0001;
  m.connect(ctx.destination);
  master = m;
  voices = scene(ctx, m, sound);
  const now = ctx.currentTime;
  m.gain.setValueAtTime(0.0001, now);
  m.gain.exponentialRampToValueAtTime(Math.max(0.0002, read().volume), now + FADE_IN);
  set({ playing: true });
}

const play = () => startSound(read().sound);
const stop = () => {
  silence(FADE_OUT);
  set({ playing: false });
};
const toggle = () => (read().playing ? stop() : play());
/** A new choice while playing swaps the bed straight away; while stopped it waits for Play. */
const setSound = (sound: Sound) => {
  set({ sound });
  if (read().playing) startSound(sound);
};
const setVolume = (volume: number) => {
  set({ volume });
  const ctx = existingContext();
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(Math.max(0.0001, volume), ctx.currentTime + 0.15);
};
const setEndSound = (endSound: EndSound) => set({ endSound });

/**
 * The focus block is over. Stop the bed now and, once its fade is done, play the end
 * sound: if a bed was playing (the sudden silence needs explaining), or if the block ran
 * out on its own. A context is needed for either, and only a click can have made one.
 */
export function finishFocus(ranOut: boolean) {
  const { playing, endSound, volume } = read();
  if (playing) stop();
  const ctx = existingContext();
  if (!ctx || endSound === "none" || (!playing && !ranOut)) return;
  const at = ctx.currentTime + (playing ? FADE_OUT : 0);
  (endSound === "coins" ? playCoin : playChime)(ctx, volume, at);
}

// A focus block ends when focus (or an eye rest inside it) turns into a break or idle.
// An eye rest starting or ending is not an end.
onPhaseChange((from, to, ranOut) => {
  if ((from === "focus" || from === "eyeRest") && (to === "break" || to === "idle")) finishFocus(ranOut);
});

/** Tests only: forget the in-memory state and the graph. */
export function resetAmbienceForTests() {
  state = null;
  master = null;
  voices = [];
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const api = { play, stop, toggle, setSound, setVolume, setEndSound };

export function useAmbience() {
  const s = useSyncExternalStore(subscribe, read, read);
  return { ...s, ...api };
}
