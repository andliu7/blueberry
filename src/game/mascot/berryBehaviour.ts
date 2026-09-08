/**
 * What the berry is *doing*, as opposed to what it is feeling.
 *
 * Deliberately a second axis rather than more entries in `BerryMood`, and that
 * is the main architectural call here. A mood is a face and it persists; a
 * behaviour is a motion with a lifecycle. "Stressed" is a face you can hold for
 * a whole exam week. "Bounce" is a hop that lasts 600ms and then is over. They
 * are not peers on one list, and flattening them would mean a berry cannot be
 * stressed *and* bounce, which is exactly the combination an exam-week correct
 * answer wants.
 *
 * So: `BerryMood` keeps the face (`MOOD_SHAPE`, thirteen entries, already shared
 * by the flat mark and the 3-D head) and this file adds the motion. The two
 * compose.
 *
 * Two things from the brief are modifiers rather than states, for the same
 * reason the brief itself gives. Breathing is described as running "under all
 * other ambient states", and a blink is something that happens *during*
 * whatever else is going on. Making them states would mean a berry cannot blink
 * while leaning in, which is not a rule anyone wants. See `MODIFIERS`.
 *
 * **No `three`, no `react`, no DOM.** Pure data and numbers, so the same machine
 * can drive a React Native renderer later without carrying a WebGL dependency
 * across. Anything that needs a scene graph belongs in the component.
 */

/* ------------------------------------------------------------------ types -- */

/**
 * How a behaviour is triggered and what it does when it runs out.
 *
 * - `ambient` loops forever and is what the berry falls back to.
 * - `reactive` is driven by something the user is doing and returns to ambient
 *   when it stops.
 * - `event` plays once on an app event and returns to ambient.
 */
export type BehaviourFamily = "ambient" | "reactive" | "event";

export type BerryBehaviour =
  | "idle"
  | "sleepy"
  | "leanIn"
  | "squash"
  | "bounce"
  | "wideEyed"
  | "celebrate"
  | "stressed"
  | "drag"
  | "wave";

/**
 * A pose, as multipliers and offsets on a rest state of 1.
 *
 * `scaleY` alone would let the berry change volume, which reads as the model
 * growing rather than as the character reacting. `scaleX` is derived from it in
 * `poseAt` so squash and stretch preserve volume by construction: the caller
 * cannot forget.
 */
export interface BerryPose {
  /** 1 is rest. Below 1 squashes, above 1 stretches. */
  scaleY: number;
  /** Height off the ground, in body radii. */
  lift: number;
  /** Lean, radians. Positive tilts to its right. */
  tilt: number;
  /** Forward pitch, radians. Positive leans toward the viewer and down. */
  pitch: number;
}

export interface BehaviourKeyframe extends BerryPose {
  /** 0 to 1 through the behaviour's duration. */
  at: number;
}

export interface BehaviourConfig {
  family: BehaviourFamily;
  /** One cycle, ms. Ambient behaviours repeat it; the others play it once. */
  durationMs: number;
  /**
   * How long a transition into this behaviour takes, ms.
   *
   * Every behaviour blends rather than snaps, which is the brief's
   * "interruptible" requirement: a blend that is already running can be
   * retargeted mid-flight because the machine only ever reads a current pose and
   * a target pose, never a queue of steps that has to finish.
   */
  blendMs: number;
  keyframes: BehaviourKeyframe[];
  /**
   * The face this behaviour implies, when it implies one.
   *
   * Optional on purpose. `bounce` looks right over any mood, so it does not
   * name one; `sleepy` and `stressed` do, because the face *is* most of what
   * those two are.
   */
  mood?: string;
  /** Event behaviours return here when they finish. Ambient ones ignore it. */
  returnTo?: BerryBehaviour;
}

/* ------------------------------------------------------------- behaviours -- */

const rest: BerryPose = { scaleY: 1, lift: 0, tilt: 0, pitch: 0 };

/**
 * Numbers chosen so the character reads at a glance, not so it is physically
 * right. A 3 percent squash is invisible at the size this thing renders; 12 to
 * 18 percent is where a viewer starts reading it as a reaction.
 */
export const BEHAVIOURS: Record<BerryBehaviour, BehaviourConfig> = {
  /** The floor. Slow lean, never fully still. */
  idle: {
    family: "ambient",
    durationMs: 7000,
    blendMs: 600,
    keyframes: [
      { at: 0, ...rest, tilt: 0.05 },
      { at: 0.5, ...rest, tilt: -0.05 },
      { at: 1, ...rest, tilt: 0.05 },
    ],
  },

  /**
   * Late-hour ambient. Slower and heavier rather than a different shape.
   *
   * Only ever entered when `sleepMode` is `nudge`. The default is `neutral`,
   * because telling somebody they look tired at 2am is how you make them tired,
   * and the person most likely to see this is the one who least needs it.
   */
  sleepy: {
    family: "ambient",
    durationMs: 11000,
    blendMs: 1400,
    mood: "sleepy",
    keyframes: [
      { at: 0, scaleY: 0.97, lift: 0, tilt: 0.03, pitch: 0.08 },
      { at: 0.5, scaleY: 0.94, lift: -0.01, tilt: -0.02, pitch: 0.11 },
      { at: 1, scaleY: 0.97, lift: 0, tilt: 0.03, pitch: 0.08 },
    ],
  },

  /** Attending to the canvas while the user draws. Holds, does not loop. */
  leanIn: {
    family: "reactive",
    durationMs: 420,
    blendMs: 260,
    mood: "focused",
    keyframes: [
      { at: 0, ...rest },
      { at: 1, scaleY: 0.98, lift: 0, tilt: 0.04, pitch: 0.22 },
    ],
  },

  /**
   * A wrong answer. Deflates and recovers.
   *
   * Explicitly not sad: no frown, and it comes back up. A mascot that looks hurt
   * when you get something wrong makes being wrong feel worse, and being wrong
   * is most of learning organic chemistry.
   */
  squash: {
    family: "reactive",
    durationMs: 520,
    blendMs: 90,
    keyframes: [
      { at: 0, ...rest },
      { at: 0.22, scaleY: 0.78, lift: 0, tilt: 0, pitch: 0.05 },
      { at: 0.6, scaleY: 1.04, lift: 0, tilt: 0, pitch: 0 },
      { at: 1, ...rest },
    ],
    returnTo: "idle",
  },

  /** A correct mechanism. Anticipate, hop, land, settle. */
  bounce: {
    family: "reactive",
    durationMs: 620,
    blendMs: 80,
    keyframes: [
      { at: 0, ...rest },
      // The dip before the hop. Without it the rise reads as the model being
      // moved rather than as the character jumping.
      { at: 0.15, scaleY: 0.86, lift: 0, tilt: 0, pitch: 0 },
      { at: 0.42, scaleY: 1.18, lift: 0.34, tilt: 0, pitch: 0 },
      { at: 0.72, scaleY: 0.9, lift: 0, tilt: 0, pitch: 0 },
      { at: 1, ...rest },
    ],
    returnTo: "idle",
  },

  /** Brief surprise. Short, or it reads as alarm. */
  wideEyed: {
    family: "reactive",
    durationMs: 380,
    blendMs: 70,
    mood: "curious",
    keyframes: [
      { at: 0, ...rest },
      { at: 0.3, scaleY: 1.08, lift: 0.04, tilt: 0, pitch: -0.14 },
      { at: 1, ...rest },
    ],
    returnTo: "idle",
  },

  /** A streak milestone. The bounce, bigger, and held a beat longer. */
  celebrate: {
    family: "event",
    durationMs: 1150,
    blendMs: 80,
    mood: "cheer",
    keyframes: [
      { at: 0, ...rest },
      { at: 0.12, scaleY: 0.82, lift: 0, tilt: 0, pitch: 0 },
      { at: 0.34, scaleY: 1.24, lift: 0.55, tilt: 0.06, pitch: 0 },
      { at: 0.52, scaleY: 1.05, lift: 0.42, tilt: -0.05, pitch: 0 },
      { at: 0.74, scaleY: 0.88, lift: 0, tilt: 0.02, pitch: 0 },
      { at: 1, ...rest },
    ],
    returnTo: "idle",
  },

  /**
   * Exam week. Ambient, because it is a condition rather than a moment.
   *
   * Small fast movements rather than big ones. The brief asks for this to read
   * as "we are in this together" and not as pressure, and the difference is
   * amplitude: a hunch plus jitter is company, a violent shake is a countdown.
   */
  stressed: {
    family: "ambient",
    durationMs: 1900,
    blendMs: 500,
    mood: "stressed",
    keyframes: [
      { at: 0, scaleY: 0.99, lift: 0, tilt: 0.015, pitch: 0.12 },
      { at: 0.25, scaleY: 1.01, lift: 0.008, tilt: -0.02, pitch: 0.14 },
      { at: 0.5, scaleY: 0.985, lift: 0, tilt: 0.02, pitch: 0.11 },
      { at: 0.75, scaleY: 1.005, lift: 0.006, tilt: -0.015, pitch: 0.14 },
      { at: 1, scaleY: 0.99, lift: 0, tilt: 0.015, pitch: 0.12 },
    ],
  },

  /**
   * Held and moved. Goes limp.
   *
   * The trailing lag belongs to the drag handler, not here: it depends on
   * pointer velocity, which is input rather than animation. This is only what
   * the body does while that is happening.
   */
  drag: {
    family: "reactive",
    durationMs: 900,
    blendMs: 140,
    mood: "shy",
    keyframes: [
      { at: 0, scaleY: 1.14, lift: 0.1, tilt: 0.1, pitch: -0.05 },
      { at: 0.5, scaleY: 1.1, lift: 0.1, tilt: -0.12, pitch: -0.02 },
      { at: 1, scaleY: 1.14, lift: 0.1, tilt: 0.1, pitch: -0.05 },
    ],
  },

  /** Greeting on first open of the day. No arms, so the whole body leans. */
  wave: {
    family: "event",
    durationMs: 1250,
    blendMs: 160,
    mood: "happy",
    keyframes: [
      { at: 0, ...rest },
      { at: 0.2, scaleY: 1.05, lift: 0.06, tilt: 0.22, pitch: 0 },
      { at: 0.45, scaleY: 1.02, lift: 0.04, tilt: -0.2, pitch: 0 },
      { at: 0.7, scaleY: 1.05, lift: 0.06, tilt: 0.18, pitch: 0 },
      { at: 1, ...rest },
    ],
    returnTo: "idle",
  },
};

/* -------------------------------------------------------------- modifiers -- */

/**
 * Always on, underneath whatever behaviour is running.
 *
 * The brief names breathing as continuous, and a blink is something that
 * happens during any state rather than instead of one. Keeping them here rather
 * than in `BEHAVIOURS` is what lets the berry blink while leaning in, and stops
 * "breathing" from being a state something else can interrupt.
 */
export const MODIFIERS = {
  breathing: {
    /** Peak-to-peak, as a fraction of height. The brief's 2 to 3 percent. */
    amplitude: 0.025,
    periodMs: 3800,
    /** Scaled down rather than off during a hop, so it never fights the pose. */
    dampedBy: ["bounce", "celebrate", "drag"] as BerryBehaviour[],
  },
  blink: {
    closeMs: 110,
    /**
     * Irregular on purpose. A fixed interval reads as a machine, and the eye is
     * very good at spotting a metronome.
     */
    minGapMs: 2600,
    maxGapMs: 7200,
    /** Doubles happen; people blink twice in a row surprisingly often. */
    doubleChance: 0.16,
  },
} as const;

/* ---------------------------------------------------------------- sampling -- */

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Springy without the cartoon overshoot the brief rules out. */
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export interface SampledPose extends BerryPose {
  /** Derived, never authored. See below. */
  scaleX: number;
  scaleZ: number;
}

/**
 * The pose at a point through a behaviour.
 *
 * `scaleX` and `scaleZ` are computed from `scaleY` rather than being keyframed,
 * so volume is preserved by construction and a keyframe cannot accidentally
 * inflate the berry. `1 / sqrt(scaleY)` is the exact answer for a solid of
 * revolution: squashing to 81 percent height widens to about 111 percent, which
 * is the proportion that reads as rubber rather than as a resize.
 */
export function poseAt(behaviour: BerryBehaviour, progress: number): SampledPose {
  const frames = BEHAVIOURS[behaviour].keyframes;
  const t = clamp01(progress);

  // IMPORTED FILE, ONE EDIT: this repo compiles with noUncheckedIndexedAccess,
  // which the sibling repo does not, so the two bracket reads carry a fallback
  // to the rest pose. Every behaviour above has at least two keyframes, so the
  // fallback never fires; it exists to satisfy the stricter compiler honestly.
  const restFrame: BehaviourKeyframe = { at: 0, ...rest };
  let a: BehaviourKeyframe = frames[0] ?? restFrame;
  let b: BehaviourKeyframe = frames[frames.length - 1] ?? restFrame;
  for (let i = 0; i < frames.length - 1; i++) {
    const lo = frames[i];
    const hi = frames[i + 1];
    if (lo !== undefined && hi !== undefined && t >= lo.at && t <= hi.at) {
      a = lo;
      b = hi;
      break;
    }
  }

  const span = b.at - a.at;
  const local = span <= 0 ? 0 : easeInOutCubic((t - a.at) / span);
  const mix = (x: number, y: number) => x + (y - x) * local;

  const scaleY = mix(a.scaleY, b.scaleY);
  const lateral = 1 / Math.sqrt(Math.max(scaleY, 0.05));

  return {
    scaleY,
    scaleX: lateral,
    scaleZ: lateral,
    lift: mix(a.lift, b.lift),
    tilt: mix(a.tilt, b.tilt),
    pitch: mix(a.pitch, b.pitch),
  };
}

/** Blend two poses. Used for transitions, which is why nothing ever snaps. */
export function blendPose(from: SampledPose, to: SampledPose, t: number): SampledPose {
  const k = easeInOutCubic(clamp01(t));
  const mix = (x: number, y: number) => x + (y - x) * k;
  return {
    scaleY: mix(from.scaleY, to.scaleY),
    scaleX: mix(from.scaleX, to.scaleX),
    scaleZ: mix(from.scaleZ, to.scaleZ),
    lift: mix(from.lift, to.lift),
    tilt: mix(from.tilt, to.tilt),
    pitch: mix(from.pitch, to.pitch),
  };
}

/* ---------------------------------------------------------------- settings -- */

export interface BerrySettings {
  /**
   * Whether the sleepy state is ever entered.
   *
   * Defaults to `neutral`. Signalling tiredness to somebody mid all-nighter is
   * more likely to make them stop than to make them rest, and they did not ask
   * to be told.
   */
  sleepMode: "nudge" | "neutral";
  /**
   * Tucked away rather than deleted.
   *
   * Never destructive: a small outline stays in the corner and one tap brings it
   * back. Somebody who dismisses the mascot on a bad day usually wants it again
   * on a better one.
   */
  dismissed: boolean;
}

export const DEFAULT_SETTINGS: BerrySettings = {
  sleepMode: "neutral",
  dismissed: false,
};
