/**
 * What the berry is MADE OF for a moment. The third axis, per docs/MASCOT.md.
 *
 * Why a state is neither a face nor a motion. A mood (`berryMood.ts`) is a
 * face that persists: eyes, mouth, blush, where the head points. A behaviour
 * (`berryBehaviour.ts`) is a motion with a lifecycle: it starts, plays its
 * keyframes, and either loops or returns to idle. Neither of those can say
 * "the berry is charred" or "the berry is two translucent copies of itself",
 * because charring is not an expression and doubling is not a pose. Those are
 * transforms of the drawing itself: a filter, a halo, a second copy, a split.
 * A state composes with any mood and any behaviour exactly the way mood and
 * behaviour already compose with each other, which is why "oxidized" needs no
 * new animation code: it is `charred` plus `sad` plus `stressed`.
 *
 * Same contract as the two siblings: pure data and numbers, no react, no DOM.
 * The renderer (Berry.tsx and mascot.css) reads these knobs; it never decides
 * them. That is what lets a React Native shell read the same table later.
 */

import { MOOD_SHAPE, type BerryMood } from "./berryMood";
import { clamp01 } from "@/lib/helpers";

export type BerryState =
  /** No transform. The default. */
  | "neutral"
  /** Static halo that thins as Charge drains and goes flat grey at zero. Teaches the Charge meter. */
  | "charged"
  /** Blush, an H+ badge, floats fractionally higher. Acid/base and leaving-group activation. */
  | "protonated"
  /** Positional jitter, spark particles, a plus badge. SN1/E1 and rearrangement. */
  | "carbocation"
  /** Split into two halves with an unpaired-electron halo. Radical halogenation. */
  | "radical"
  /** Two translucent copies trading opacity, never one. Delocalization. */
  | "resonance"
  /** Ring halo, sway forced to zero. Aromaticity and Huckel. */
  | "aromatic"
  /** Darkens toward black with smoke. Third consecutive miss, then a recovery beat. */
  | "charred"
  /** Cool blue, a ":" lone-pair badge, a level mouth at rest. pKa and base attack. */
  | "deprotonated"
  /** Glow halo, a small hum, a photon emitted upward as it drops back. Not the mood `excited`. */
  | "excitedState"
  /** Two solid copies, the second mirrored, R and S chips. Stereochemistry. */
  | "enantiomers"
  /** A shell of six water molecules slowly orbiting, idle motion at half speed. Solvation. */
  | "solvated";

export const BERRY_STATES: readonly BerryState[] = Object.freeze([
  "neutral",
  "charged",
  "protonated",
  "carbocation",
  "radical",
  "resonance",
  "aromatic",
  "charred",
  "deprotonated",
  "excitedState",
  "enantiomers",
  "solvated",
]);

/**
 * What a screen reader hears after "Bloom, looking <mood>". Lives beside the
 * union so a new state brings its label with it. Berry.tsx reads it because
 * the badge glyph is aria-hidden: a `<div role="img">` hides its own contents
 * from the accessibility tree, so the state has to reach the label or it does
 * not reach anybody.
 */
export const STATE_LABEL: Readonly<Record<BerryState, string>> = Object.freeze({
  neutral: "",
  charged: ", charged",
  protonated: ", protonated",
  carbocation: ", a carbocation",
  radical: ", a radical",
  resonance: ", in resonance",
  aromatic: ", aromatic",
  charred: ", charred",
  deprotonated: ", deprotonated",
  excitedState: ", in an excited state",
  enantiomers: ", as a pair of enantiomers",
  solvated: ", solvated",
});

export type HaloKind = "none" | "static" | "ring" | "unpaired" | "glow" | "shell";
export type StateBadge = null | "H+" | "+" | "•" | ":";

/**
 * The knobs a renderer reads. Every one is a number or a small enum so the
 * CSS can take them as custom properties and a native renderer as uniforms.
 */
export interface StateShape {
  /** 0 untouched, 1 fully black. Applied as a brightness filter over the drawing. */
  darken: number;
  /** 0 none, 1 full. ADDS to the mood's blush; see composeStateAndMood. */
  blush: number;
  haloKind: HaloKind;
  /** 0 invisible, 1 full. For `charged` the caller's charge level replaces this. */
  haloStrength: number;
  /** 1 draws the berry once, 2 draws a second translucent copy. */
  ghostCount: 1 | 2;
  /** Whether the drawing is cut into two halves pushed apart. */
  split: boolean;
  /** Peak positional jitter, px at 96px. 0 is still. */
  jitterPx: number;
  /** Spark particles per second. 0 draws none. */
  sparkRate: number;
  /** Smoke puffs per second. 0 draws none. */
  smokeRate: number;
  /** Extra height off the ground, in body radii, added to whatever the behaviour says. */
  liftExtra: number;
  badge: StateBadge;
  /** When not null, replaces the mood's sway outright. Aromatic pins it to 0. */
  swayOverride: number | null;
  /**
   * Speed of the idle clock (ambient behaviours and breathing). Absent is 1.
   * Reactions always run at full speed, so an answer still lands on time.
   */
  pace?: number;
  /**
   * How long the state holds before the caller should clear it, ms. null holds
   * until cleared. `charred` recovers in 1000 because docs/MASCOT.md's tone
   * rule says a sad beat never holds past one second: Bloom is disappointed
   * WITH the student, at the problem, and then it is over.
   */
  recoverMs: number | null;
}

const plain: StateShape = {
  darken: 0,
  blush: 0,
  haloKind: "none",
  haloStrength: 0,
  ghostCount: 1,
  split: false,
  jitterPx: 0,
  sparkRate: 0,
  smokeRate: 0,
  liftExtra: 0,
  badge: null,
  swayOverride: null,
  recoverMs: null,
};

export const CHARRED_RECOVER_MS = 1000;

export const STATE_SHAPE: Record<BerryState, StateShape> = {
  neutral: { ...plain },

  // The halo's thickness is the Charge meter, so its strength here is only the
  // default a caller gets when it passes no level. Grey at zero is the CSS's
  // job, driven by the same number.
  charged: { ...plain, haloKind: "static", haloStrength: 1 },

  // Lift is small on purpose: a proton is light. 0.06 body radii is about
  // 1.4px at 96px, which reads as "lighter" rather than as "hopping".
  protonated: { ...plain, blush: 0.6, liftExtra: 0.06, badge: "H+" },

  // Jitter at 1.5px is company, not alarm, the same amplitude reasoning the
  // `stressed` behaviour records. Sparks are a handful, not a fountain.
  carbocation: { ...plain, jitterPx: 1.5, sparkRate: 3, badge: "+" },

  radical: { ...plain, split: true, haloKind: "unpaired", haloStrength: 0.9, badge: "•" },

  // Two copies and NEVER one: the CSS trades their opacity so at no frame is
  // the berry a single solid drawing. That is the whole lesson.
  resonance: { ...plain, ghostCount: 2 },

  aromatic: { ...plain, haloKind: "ring", haloStrength: 1, swayOverride: 0 },

  // Not fully black: 0.75 keeps the face readable so the recovery beat has a
  // face to recover.
  charred: { ...plain, darken: 0.75, smokeRate: 1.5, recoverMs: CHARRED_RECOVER_MS },

  // The four below draw from bloom-chem-states.css, which berryStateStyles.ts
  // fetches the first time one of them renders, so none is on first paint.

  // The colour and the level mouth are the CSS's job (keyed on data-state);
  // the data only carries the lone pair, drawn as ":" on the same chip as H+.
  deprotonated: { ...plain, badge: ":" },

  // Jitter under the carbocation's 1.5px: an excited state hums, it does not
  // shake. The photon and the glow live on the halo element.
  excitedState: { ...plain, haloKind: "glow", haloStrength: 1, jitterPx: 0.8 },

  // Two solid copies, unlike resonance's two translucent ones: the CSS mirrors
  // the second with scaleX(-1) and pins both opaque. Both sit under the one
  // pose transform, so the mirror image copies the motion for free.
  enantiomers: { ...plain, ghostCount: 2 },

  // The water shell rides the halo element: six molecules drawn as
  // box-shadows on one pseudo-element, rotated as one, so it costs one
  // composited layer. Half pace is the Bible's "moves in slow motion": the
  // solvent cage drags on it.
  solvated: { ...plain, haloKind: "shell", haloStrength: 1, pace: 0.5 },
};

export interface ComposedStateMood {
  /** Idle head drift after the state applies, 0 still to 1 loose. */
  sway: number;
  /** Blush after the state applies, 0 to 1. */
  blush: number;
}

/**
 * The two numbers where a state and a mood both have an opinion.
 *
 * Sway: the state WINS when it overrides, because an aromatic berry that
 * keeps swaying is not aromatic, whatever its mood. Otherwise the mood's.
 * Blush: the two ADD and clamp, because a protonated shy berry is redder than
 * either alone and there is no sense in which one should hide the other.
 *
 * Nothing else composes. Darken, halo, split and badges have no mood
 * counterpart, so the renderer reads them straight off STATE_SHAPE.
 */
export function composeStateAndMood(state: BerryState, mood: BerryMood): ComposedStateMood {
  const shape = STATE_SHAPE[state];
  const face = MOOD_SHAPE[mood];
  return {
    sway: shape.swayOverride === null ? face.sway : clamp01(shape.swayOverride),
    blush: clamp01(face.blush + shape.blush),
  };
}
