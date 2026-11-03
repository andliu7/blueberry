/**
 * The focus timer's one-shot sounds, synthesised with Web Audio like the ambience
 * beds (lib/ambience.ts): no files. Ported (3 Nov) from the second-brain timer,
 * which took the idea from here in September and improved it.
 *
 * Two of them, offered as "When focus ends": a soft chime, and gold coins (an
 * original synthesis of the idea of a coin payout, a bright ching then a few
 * clinks, not a copy of any game's recording).
 *
 * Everything plays on one shared AudioContext, made on first use. First use is
 * always a click (Start, Play), which is what browsers require before a context
 * may make sound; one made earlier stays suspended.
 */

let shared: AudioContext | null = null;

/** The timer's one context, or null where there is no Web Audio at all. */
export function sharedContext(): AudioContext | null {
  const Ctx =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctx) return null;
  try {
    shared ??= new Ctx();
    void shared.resume();
  } catch {
    return null;
  }
  return shared;
}

/** The context if one has been made already, without making one. */
export function existingContext(): AudioContext | null {
  return shared;
}

/** Tests only: drop the shared context so a fresh fake can stand in. */
export function resetSoundsForTests() {
  shared = null;
}

/** One enveloped tone: fast attack, exponential tail, with an optional small pitch rise into the note. */
function tone(
  ctx: AudioContext,
  out: AudioNode,
  opts: { at: number; freq: number; type: OscillatorType; peak: number; decay: number; rise?: number },
) {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, opts.at);
  env.gain.linearRampToValueAtTime(opts.peak, opts.at + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, opts.at + opts.decay);
  env.connect(out);
  const osc = ctx.createOscillator();
  osc.type = opts.type;
  // Starting a touch flat and sliding up in 30 ms makes a strike sound bright rather than dull.
  osc.frequency.setValueAtTime(opts.freq * (1 - (opts.rise ?? 0)), opts.at);
  osc.frequency.exponentialRampToValueAtTime(opts.freq, opts.at + 0.03);
  osc.connect(env);
  osc.start(opts.at);
  osc.stop(opts.at + opts.decay + 0.02);
}

/**
 * The end of a focus block: two soft sines a fifth apart (A5 and E6) with a slow tail,
 * pitched above the noise bed so it is heard as a bell rather than as more of the bed.
 */
export function playChime(ctx: AudioContext, volume = 0.5, at = ctx.currentTime) {
  const peak = 0.08 * Math.max(0.3, volume);
  [880, 1318.5].forEach((freq) => tone(ctx, ctx.destination, { at, freq, type: "sine", peak, decay: 2.2 }));
}

/** The coin's length, in seconds, from strike to the last clink's silence. Kept under 0.8. */
export const COIN_SECONDS = 0.78;

/**
 * A coin payout: a bright metallic ching, then three to five softer clinks. The ching is
 * two high partials a few cents apart, whose slow beating reads as metal rather than a
 * beep; the clinks are short high tones at random pitches and gaps, all inside COIN_SECONDS.
 */
export function playCoin(ctx: AudioContext, volume = 0.5, at = ctx.currentTime) {
  const out = ctx.createGain();
  out.gain.value = 0.18 * Math.max(0.3, volume);
  out.connect(ctx.destination);
  tone(ctx, out, { at, freq: 1975.5, type: "sine", peak: 1, decay: 0.32, rise: 0.06 });
  tone(ctx, out, { at, freq: 1975.5 * 1.006, type: "triangle", peak: 0.55, decay: 0.26, rise: 0.06 });
  const clinks = 3 + Math.floor(Math.random() * 3);
  let t = at + 0.09;
  for (let i = 0; i < clinks; i++) {
    tone(ctx, out, { at: t, freq: 2800 + Math.random() * 1400, type: "sine", peak: 0.28 + Math.random() * 0.2, decay: 0.1, rise: 0.03 });
    t += 0.05 + Math.random() * 0.06;
  }
}
