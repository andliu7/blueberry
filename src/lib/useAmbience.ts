import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Background sound for a study session, synthesised rather than played back.
 *
 * This started as a request to loop two Spotify tracks seamlessly: a three-hour
 * white noise piece and a rainforest bed.
 *
 * I first said that could not be done. That was right about a bare `<iframe>`,
 * which reports nothing and exposes no audio, and wrong in general: Spotify
 * publishes an IFrame API that reports playback position and can seek, which is
 * enough to loop. That path exists now, in `ui/spotify-loop.tsx`, and it is what
 * the playlist option uses.
 *
 * These beds are still synthesised, because for *noise* synthesis is better
 * than any loop rather than a substitute for one. **There is no loop point, so
 * there is no seam to hide** — where a seek back to zero always leaves a small
 * gap while the player rebuffers. It also costs nothing to download, where a
 * three-hour recording is tens of megabytes, and it needs no library and no
 * account.
 *
 * The one place a repeat could creep in is the noise buffers, since generating
 * white noise per sample in JavaScript is wasteful. So each bed runs *two*
 * buffers of coprime length, 19 and 23 seconds, played together. Their sum only
 * repeats when both come round at once, which is 437 seconds, and the filters
 * moving over the top are on slow oscillators that share no period with either.
 * Nothing in it lines up twice inside a study session.
 */

export type AmbienceScene = "off" | "white" | "rain" | "spotify";

/**
 * The playlist Andrew listens to, looped by seeking rather than synthesised.
 *
 * Handled outside this hook: it is an iframe Spotify owns, not a graph we
 * build, so `play("spotify")` only tears the synthesised voices down and records
 * the choice. See `ui/spotify-loop.tsx`.
 */
export const SPOTIFY_PLAYLIST_URI = "spotify:playlist:2g12iEeRtAGWuHGcLZGL8X";

export const SCENE_LABEL: Record<Exclude<AmbienceScene, "off">, string> = {
  white: "White noise",
  rain: "Rainforest",
  spotify: "Your playlist",
};

/** Coprime, so the two layers do not come round together for over seven minutes. */
const BUFFER_SECONDS = [19, 23];

/**
 * Fills a buffer with noise.
 *
 * `pink` runs white noise through Paul Kellet's economical approximation, a
 * bank of one-pole filters summed. Pink noise falls at 3 dB per octave, which is
 * roughly how rain, wind and surf actually sound: flat white noise is much
 * brighter than anything in nature and gets fatiguing within minutes, which is
 * the opposite of what a focus timer wants.
 */
function noiseBuffer(ctx: AudioContext, seconds: number, pink: boolean): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (!pink) {
      data[i] = white * 0.5;
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
  return buffer;
}

interface Voice {
  stop: () => void;
}

/** The two noise layers plus a slowly wandering filter, shared by both scenes. */
function bed(
  ctx: AudioContext,
  out: GainNode,
  opts: { pink: boolean; cutoff: number; sweep: number; gain: number },
): Voice {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.cutoff;
  filter.Q.value = 0.4;

  const level = ctx.createGain();
  level.gain.value = opts.gain;
  filter.connect(level).connect(out);

  const sources = BUFFER_SECONDS.map((seconds) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, seconds, opts.pink);
    src.loop = true;
    // Detuning one layer slightly means the two never sit in lockstep even
    // where their lengths would otherwise align.
    src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.02;
    src.connect(filter);
    src.start();
    return src;
  });

  /**
   * The filter breathes.
   *
   * Two oscillators at incommensurable rates rather than one: a single sine on
   * the cutoff is a recognisable "wah" within a minute, whereas two slow ones
   * beating against each other read as wind moving through the recording.
   */
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
    stop: () => {
      sources.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      });
      lfos.forEach((l) => {
        try {
          l.stop();
        } catch {
          /* already stopped */
        }
      });
    },
  };
}

/**
 * Water hitting leaves, as scheduled transients.
 *
 * A droplet is a very short burst of bandpassed noise with a fast decay. What
 * makes it read as a forest rather than as clicks is that the interval, the
 * pitch and the loudness are all randomised per drop, and drops are scheduled a
 * few seconds ahead rather than fired from a timer, so they land on exact audio
 * time instead of whenever the main thread got round to it.
 */
function droplets(ctx: AudioContext, out: GainNode): Voice {
  let stopped = false;
  let nextAt = ctx.currentTime + 0.2;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const one = (at: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.09, false);

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    // Two and a half octaves of spread. Drops all at one pitch sound like a
    // dripping tap; spread out they sound like a canopy.
    band.frequency.value = 700 + Math.random() * 3200;
    band.Q.value = 6 + Math.random() * 10;

    const env = ctx.createGain();
    const peak = 0.05 + Math.random() * 0.11;
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(peak, at + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.09 + Math.random() * 0.14);

    // Spread across the field so the forest has width.
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;

    src.connect(band).connect(env).connect(pan).connect(out);
    src.start(at);
    src.stop(at + 0.4);
  };

  const schedule = () => {
    if (stopped) return;
    // Fill the next two seconds of the timeline, then sleep. The audio clock
    // stays correct even if this callback is late.
    while (nextAt < ctx.currentTime + 2) {
      one(nextAt);
      nextAt += 0.05 + Math.random() * 0.42;
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

const FADE = 0.9;

export function useAmbience() {
  const [scene, setScene] = useState<AmbienceScene>("off");
  const [volume, setVolume] = useState(0.5);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const voicesRef = useRef<Voice[]>([]);

  const teardown = useCallback((fade = true) => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    const voices = voicesRef.current;
    voicesRef.current = [];
    if (!ctx || !master) {
      voices.forEach((v) => v.stop());
      return;
    }
    // Fade before stopping. Cutting a noise bed dead is a click, and a click at
    // the end of a focus session is exactly the wrong note to finish on.
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.0001, now + (fade ? FADE : 0.02));
    setTimeout(() => voices.forEach((v) => v.stop()), fade ? FADE * 1000 + 60 : 40);
  }, []);

  const play = useCallback(
    (next: AmbienceScene) => {
      if (next === "off" || next === "spotify") {
        // Spotify plays through its own iframe, so all this has to do is get
        // the synthesised voices out of the way. Two beds at once is noise.
        teardown();
        setScene(next);
        return;
      }

      // Created on the click that asks for sound, never before: browsers refuse
      // to start an AudioContext without a gesture, and one made too early is
      // permanently suspended.
      let ctx = ctxRef.current;
      if (!ctx) {
        ctx = new AudioContext();
        ctxRef.current = ctx;
      }
      void ctx.resume();

      teardown(false);

      const master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      masterRef.current = master;

      const voices: Voice[] =
        next === "white"
          ? [bed(ctx, master, { pink: true, cutoff: 1900, sweep: 260, gain: 0.85 })]
          : [
              // Rain sits lower and duller than white noise, with a second,
              // darker layer standing in for the canopy and distance.
              bed(ctx, master, { pink: true, cutoff: 1250, sweep: 420, gain: 0.6 }),
              bed(ctx, master, { pink: true, cutoff: 340, sweep: 140, gain: 0.5 }),
              droplets(ctx, master),
            ];
      voicesRef.current = voices;

      const now = ctx.currentTime;
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + FADE);

      setScene(next);
    },
    [teardown, volume],
  );

  useEffect(() => {
    const master = masterRef.current;
    const ctx = ctxRef.current;
    if (!master || !ctx || scene === "off") return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(Math.max(0.0001, volume), ctx.currentTime + 0.15);
  }, [volume, scene]);

  useEffect(() => {
    return () => {
      voicesRef.current.forEach((v) => v.stop());
      void ctxRef.current?.close();
    };
  }, []);

  return { scene, volume, setVolume, play, stop: () => play("off") };
}
