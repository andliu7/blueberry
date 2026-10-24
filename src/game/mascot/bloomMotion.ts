/**
 * Bloom's timing constants, one place for every number the motion spec names.
 *
 * documentation/BLOOM-STATES-SPEC.md section 3c is the source. Every builder
 * imports from here rather than typing a duration, so a retune is one edit and
 * a test can hold the CSS tokens in bloom-motion.css to the same values.
 *
 * Same contract as berryBehaviour.ts and its siblings: pure data, no react, no
 * DOM. Values are ms unless the name says otherwise. Lifts are in body radii,
 * the unit berryBehaviour.ts uses, so a Duolingo height of 18 percent of the
 * berry is a lift of 0.36 (the height is two radii).
 */

/** Grading to the first visible change of an answer reaction. Bible B. */
export const REACTION_BUDGET_MS = 200;

/** The only motion left under reduced motion: an opacity crossfade. */
export const REDUCED_CROSSFADE_MS = 150;

/**
 * The ambient glance. Gaps from the Bible (3 to 6s); move and hold from the
 * Duolingo idle, where the eyes lead the head by a beat so the look reads as
 * the character noticing something rather than the sprite sliding.
 */
export const GLANCE = Object.freeze({
  gapMinMs: 3000,
  gapMaxMs: 6000,
  moveMs: 200,
  holdMs: 900,
  eyesLeadMs: 80,
  /** Fraction of the full eye travel a glance uses. A full look is for `lookAt`. */
  maxLook: 0.6,
});

/**
 * Quiet input before the berry reacts. Thinking is the owner's 15s (Duolingo
 * says 6s; the Bible wins). Bored only ever fires on an ambient screen.
 */
export const IDLE = Object.freeze({
  thinkingAfterMs: 15000,
  boredAfterMs: 20000,
});

/** Behaviour `sigh`: sink, a slow tilt, back. Read by berryBehaviour.ts. */
export const SIGH = Object.freeze({
  durationMs: 1400,
  sinkScaleY: 0.94,
  sinkAt: 0.35,
  tilt: 0.05,
  tiltAt: 0.6,
});

/** Behaviour `peek`: rises from below its anchor with one overshoot. Duolingo 14. */
export const PEEK = Object.freeze({
  durationMs: 600,
  startLift: -0.8,
  overshootLift: 0.06,
  overshootScaleY: 1.06,
  overshootAt: 0.7,
});

export const THOUGHT_DOTS = Object.freeze({
  loopMs: 1200,
  staggerMs: 160,
  opacityMin: 0.3,
  opacityMax: 1,
});

/** Sparkles drawn beside the berry per combo tier. Capped at 8. */
export const COMBO_SPARKLES: Readonly<Record<3 | 5 | 8, number>> = Object.freeze({ 3: 3, 5: 6, 8: 6 });

export const COMBO_CONFETTI = Object.freeze({
  atCombo: 8,
  pieces: 24,
  durationMs: 1200,
});

export const HINT_RING = Object.freeze({
  durationMs: 1000,
  scaleFrom: 1,
  scaleTo: 1.5,
  opacityFrom: 0.6,
  opacityTo: 0,
});

/** The puff when a charred berry clears. Uniform scale, so it lives on the stage wrapper. */
export const REDUCED_PUFF = Object.freeze({
  durationMs: 600,
  peakScale: 1.08,
  peakAt: 0.35,
  brightnessFrom: 1.15,
  brightnessTo: 1,
});

export const XP_FLYER = Object.freeze({
  popMs: 240,
  popPeak: 1.2,
  risePx: 32,
  riseFromMs: 240,
  riseToMs: 900,
});

export const CATCH = Object.freeze({
  hangMs: 80,
  fallMs: 600,
  restMs: 700,
  flyMs: 500,
});

export const LESSON_COMPLETE = Object.freeze({
  entryMs: 500,
  /** translateY the entry starts from, percent of the berry's own height. */
  entryFromPct: 40,
  landMs: 120,
  headlineAtMs: 600,
  statsFromMs: 800,
  statsStaggerMs: 120,
  countUpMs: 600,
  continueLiveByMs: 1500,
});

export const UNIT_COMPLETE = Object.freeze({
  trophyRiseMs: 400,
  confettiPieces: 40,
  confettiMs: 1500,
  ctaLiveByMs: 2000,
});

export const LEVEL_UP = Object.freeze({
  dipScale: 0.95,
  dipMs: 120,
  growScale: 1.15,
  growMs: 600,
  ringFrom: 1,
  ringTo: 1.5,
  ringMs: 1000,
  badgeRollMs: 300,
});

export const EVOLVING = Object.freeze({
  darkMs: 400,
  silhouetteMs: 800,
  flashMs: 160,
  maxTotalMs: 2400,
});

export const STREAK_LIT = Object.freeze({
  flameFrom: 0.4,
  flamePeak: 1.25,
  flameMs: 360,
  flickerMin: 0.96,
  flickerMax: 1.04,
  flickerLoopMs: 600,
  dayRollMs: 400,
  dotStaggerMs: 80,
});

/** The two numbers behind `flameScaleFor(days)`, which lives in progression.ts. */
export const STREAK_FLAME = Object.freeze({
  perDoubling: 0.12,
  max: 1.6,
});

export const CHEST = Object.freeze({
  shakeDeg: 4,
  shakes: 3,
  shakeMs: 80,
  lidAtMs: 240,
  lidMs: 200,
  rewardRiseMs: 400,
});

export const COSTUME_WIGGLE = Object.freeze({
  durationMs: 300,
  tiltsDeg: Object.freeze([0, 4, -3, 0]) as readonly number[],
});

export const EXCITED_STATE = Object.freeze({
  glowLoopMs: 1200,
  photonEveryMs: 2400,
  photonRiseMs: 600,
});

export const SOLVATED_ORBIT = Object.freeze({
  turnMs: 9000,
});
