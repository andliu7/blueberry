/**
 * Drag smoothing for the mechanism trainer's in-flight arrow.
 *
 * A raw pointer stream is not a curve. It is a hand, and a hand shakes. Feeding
 * raw samples straight into a quadratic bezier makes the control point jitter,
 * and because the control point sits at the widest part of the arc, a one pixel
 * wobble at the fingertip becomes a several pixel wobble in the middle of the
 * arrow. This module turns the stream into a settled arc.
 *
 * WHERE THIS DIVERGES FROM THE BAR. Alchemie does not smooth anything mid drag.
 * Their in-flight affordance is a STRAIGHT WHITE DASHED LINE from the grabbed
 * electron pair to the pointer (docs/reference/alchemie/extra/
 * x01-drag-inflight-dashed-guide.png), and a straight line between two points
 * has nothing to smooth: the only wobble it can show is the endpoint itself,
 * which is where the finger genuinely is. We are drawing a CURVE in flight, so
 * we inherit a problem they do not have, and we have to solve it. This module
 * is a deliberate departure, not a reconstruction of their behaviour. Judge it
 * on whether the smoothed curve reads better than the raw one, not on frame by
 * frame agreement with the capture.
 *
 * NO TIMERS LIVE HERE, AND NOTHING READS A CLOCK. Every sample carries its own
 * timestamp and the caller supplies it (performance.now() in the shell, a
 * synthetic number in a test). That is what lets the whole filter run in a node
 * environment with no DOM and no fake timers, which is how the tests in
 * test/pilotSmoothing.test.ts assert settling time and lag as numbers rather
 * than as vibes. It is also why a dropped frame is handled correctly: the
 * filter reads the real elapsed time instead of assuming 16.67 ms.
 *
 * No React, no DOM, no rendering. This computes two points; drawing them is the
 * shell's job.
 */

import type { Point2 } from "@blueberry/interaction";

/**
 * WHY A ONE EURO FILTER RATHER THAN A FIXED EXPONENTIAL SMOOTHER.
 *
 * A fixed-lag exponential smoother has one knob and two jobs, and the jobs pull
 * opposite ways. Set the lag low enough that a fast flick keeps up with the
 * finger and it passes hand tremor straight through when the finger is nearly
 * still. Set it high enough to kill the tremor and a fast drag visibly trails
 * the fingertip, which reads as the app being slow. There is no single value
 * that is right for both, because the two failures happen at different speeds.
 *
 * The one euro filter (Casiez, Roussel, Vogel, CHI 2012) makes the cutoff a
 * function of speed: fc = minCutoff + beta * speed. Slow hand, low cutoff, heavy
 * smoothing, tremor gone. Fast hand, high cutoff, light smoothing, no lag. The
 * knobs separate cleanly, one per failure mode, which is the property that makes
 * it maintainable at 1am.
 *
 * It also hands us a bound we can prove rather than measure. For a first order
 * low pass, the steady state lag behind a constant velocity v is exactly
 * v * tau, where tau = 1000 / (2*pi*fc) milliseconds. Substituting the speed
 * dependent cutoff:
 *
 *     lag(v) = v * 1000 / (2*pi*(minCutoff + beta*v))
 *
 * which rises with v but is bounded above by 1000 / (2*pi*beta) as v grows
 * without limit. So beta alone sets a hard ceiling on how far the smoothed point
 * can ever trail the finger, at ANY speed. MAX_TRAIL_PX below is that ceiling,
 * and pilotSmoothing.test.ts asserts it.
 *
 * TWO DELIBERATE CHANGES TO THE TEXTBOOK FILTER, both named here so the next
 * reader does not think they are bugs:
 *
 * 1. ONE SHARED CUTOFF FOR BOTH AXES, driven by the 2D speed, rather than the
 *    paper's independent per-axis filters. Per-axis cutoffs smooth x and y by
 *    different amounts on a diagonal drag, which skews the curve off the line
 *    the hand actually drew. A pointer is one point, so it gets one cutoff.
 *
 * 2. THE CUTOFF USES max(filtered speed, instantaneous speed). The paper filters
 *    the derivative to keep the cutoff from chattering on noise, which is right
 *    on the way down and wrong on the way up: at the start of a flick the
 *    filtered speed is still near zero, so the cutoff is still low, so the
 *    filter lags exactly when lag is most visible. Taking the larger of the two
 *    makes it fast to OPEN and slow to CLOSE, which is the asymmetry we want.
 *    Opening late costs responsiveness; closing late costs nothing, because a
 *    hand that just stopped is still being caught up with anyway.
 */

/** A raw pointer sample. The caller owns the clock. */
export interface DragSample {
  readonly x: number;
  readonly y: number;
  /** Milliseconds, from any monotonic source the caller likes. */
  readonly tMs: number;
}

/** What the shell draws: a quadratic bezier from the drag origin through control to tip. */
export interface SmoothedArrow {
  /** The smoothed pointer position, the bezier's endpoint. */
  readonly tip: Point2;
  /** The bezier's single control point, already bowed to the correct side. */
  readonly control: Point2;
  /**
   * Filtered pointer speed in px per ms, measured over the RAW sample stream,
   * so the same hand reads the same number at 60, 120, or 240 Hz. For a glow,
   * a dash gap, or a debug readout. Zero on the first sample and after a gap
   * snap. This is deliberately NOT the (sample - hat) / dt term inside push():
   * that term is the filter's residual closing rate, which is frame rate
   * dependent and belongs to the cutoff, not to anyone reading this field.
   */
  readonly speedPxPerMs: number;
}

export interface DragSmoother {
  /** Feed one sample, get the arrow to draw this frame. */
  push(sample: DragSample): SmoothedArrow;
  /** The last arrow, without advancing anything. Safe before the first sample. */
  peek(): SmoothedArrow;
  /** Start a new drag. Clears all filter state. */
  reset(origin: Point2, awayFrom: Point2 | null): void;
}

export interface DragSmootherOptions {
  /** Cutoff in Hz when the hand is still. Lower is calmer and slower to settle. */
  readonly minCutoffHz: number;
  /** Hz added to the cutoff per px/ms of speed. Sets the trailing ceiling. */
  readonly beta: number;
  /** Cutoff in Hz for the speed estimate itself. */
  readonly derivativeCutoffHz: number;
  /** Cutoff in Hz for the control point when still. Lower than the tip's, so the arc is calmer. */
  readonly controlCutoffHz: number;
  /** Cutoff in Hz for the signed bow offset, so a side flip eases through straight. */
  readonly bowCutoffHz: number;
  /** Ceiling on the bow offset in px. */
  readonly maxBowPx: number;
}

// ---------------------------------------------------------------------------
// The published numbers. These are the contract; the tests assert them.
// ---------------------------------------------------------------------------

/**
 * Once the pointer stops, the arrow is within SETTLE_EPSILON_PX of its resting
 * arc after this long, and stays there. Derived, not guessed: a first order low
 * pass at MIN_CUTOFF_HZ has tau = 1000/(2*pi*3.5) = 45.5 ms, so the residual
 * after 180 ms is exp(-180/45.5) = 1.9 percent. Starting from the worst case
 * error the filter can be carrying, MAX_TRAIL_PX, that is 12 * 0.019 = 0.23 px,
 * comfortably inside the epsilon. The real filter beats this bound, because the
 * speed term keeps the cutoff above MIN_CUTOFF_HZ while it is still catching up.
 */
export const SETTLE_MS = 180;

/** "Stable" means moving less than this, and sitting this close to the target. Sub-pixel. */
export const SETTLE_EPSILON_PX = 0.5;

/**
 * The hard ceiling on how far the smoothed tip may trail the real pointer, at
 * any speed. This is 1000/(2*pi*BETA) rounded up, the asymptote derived above.
 */
export const MAX_TRAIL_PX = 12;

/** Cutoff when still. Chosen against SETTLE_MS by the arithmetic above. */
const MIN_CUTOFF_HZ = 3.5;

/** Chosen against MAX_TRAIL_PX: 1000/(2*pi*14) = 11.4 px, inside the 12 px ceiling. */
const BETA = 14;

/**
 * The speed estimate's own cutoff. Fast enough that the estimate is current
 * within about three frames, slow enough that a single noisy sample does not
 * throw the cutoff open. The max() rule above covers the acceleration case, so
 * this only has to be sane, not heroic.
 */
const DERIVATIVE_CUTOFF_HZ = 6;

/**
 * THE CONTROL POINT GETS A SECOND FILTER OF ITS OWN, and this is the single
 * change that does the most visible work. Two reasons, and they are different.
 *
 * The first is amplification. The control point is the chord midpoint pushed out
 * along the chord's normal, so it inherits half the tip's translation AND the
 * whole of the normal's ROTATION. A one pixel tremor at the fingertip rotates a
 * 300 px chord by a fifth of a degree, which does almost nothing, but it also
 * rotates the 40 px bow vector, and near the middle of the arrow that lands as
 * several pixels of sideways swim. The tip can look calm while the belly of the
 * arrow shimmers. Measured on the wobbly trace, filtering the tip alone cut the
 * control point's frame to frame jerk from 166 to 83; filtering the control
 * point as well takes it to 41, four times better than raw.
 *
 * Lower minimum cutoff than the tip's, because the arc is allowed to be calmer
 * than the endpoint: the eye tracks the fingertip and only glances at the belly.
 * Same beta, so the trailing ceiling derived above bounds this point too.
 */
const CONTROL_CUTOFF_HZ = 2;

/**
 * AND THE SIGNED BOW GETS A FILTER AHEAD OF THAT ONE. Two filters in series
 * sounds like one too many, so here is why neither can do the other's job.
 *
 * The moment the drag crosses the line through the origin and `away`, the side
 * the arc bows to changes, and a sign flip on a 40 px bow is an 80 px jump in a
 * single frame: the arc snaps inside out. Filtering the SIGNED offset makes that
 * flip travel through zero instead, so the arc flattens to straight and re-arcs
 * the other way, which is what a hand drawing it would do.
 *
 * The control point filter cannot absorb that, and the reason is instructive.
 * Its cutoff rises with the target's speed, by design, and an 80 px jump in one
 * frame reads as 4.8 px/ms: the filter concludes the hand is moving fast, opens
 * all the way up, and chases the flip almost instantly. Measured, the flip test
 * went from under 10 px per frame to 23. A speed adaptive filter is exactly the
 * wrong tool for a discontinuity in a DERIVED quantity, because the speed it
 * measures is not the hand's. So the discontinuity is removed at its source, on
 * the scalar, and the 2D filter downstream only ever sees continuous motion.
 *
 * Higher cutoff than the control point's: this one is fixing a rare event, not
 * a constant shimmer, and a low cutoff here would make the arc lazy about
 * deepening as the drag lengthens.
 */
const BOW_CUTOFF_HZ = 5;

/**
 * Ceiling on the bow, in px: the control point never sits further than this
 * from the chord midpoint. The bow scalar respects it by construction, but the
 * 2D control filter downstream chases a MOVING target and can carry its state
 * past the cap while the chord grows or rotates (measured 40.53 px on a plain
 * fast straight drag, 45.5 px on a long drag that then swings). So push()
 * clamps the control point's offset from the midpoint AFTER filtering, which
 * is what makes this a ceiling rather than a suggestion.
 */
const MAX_BOW_PX = 40;

/**
 * Hysteresis on the bow side, as a fraction of the bow magnitude.
 *
 * The side test compares the two candidate control points' distances from
 * `away`, and on the most common gesture in the trainer, dragging an arrow
 * across the molecule so the chord runs near the origin-to-centroid line, that
 * comparison is a knife edge: sub pixel tremor decides it, and re-deciding it
 * from scratch every frame flipped the side 33 times in 100 frames on 1 px of
 * tremor. The bow filter downstream is built to ease ONE deliberate flip
 * through zero; fed an alternating sign it parks the arc near flat instead,
 * so the arrow shimmered and flattened at once.
 *
 * The rule: the incumbent side keeps the bow until the challenger's candidate
 * point is further from `away` than the incumbent's by at least this fraction
 * of the bow magnitude. Near the knife edge the two candidates differ by far
 * less than that, so tremor can no longer flip anything, while a genuine
 * crossing (the drag really moving to the other side of the molecule) clears
 * the margin in a frame or two and still flips exactly once.
 *
 * One divergence this buys, named so nobody rediscovers it: within the margin
 * band, hitLayout.bowAwayFrom's margin-free tiebreak at release may pick the
 * other side. Inside the band the chord runs essentially through `away`, both
 * sides are equally "away", and one eased flip at commit is the acceptable
 * price for not flickering thirty times mid drag.
 */
const SIDE_FLIP_MARGIN = 0.15;

/**
 * The bow rule, matching hitLayout.bowAwayFrom deliberately: fraction of the
 * chord, floored so a short arrow still reads as an arc, capped so a long one
 * does not read as a loop. The in-flight arc and the committed arrow have to
 * agree, or the arrow visibly jumps at the moment of release.
 *
 * NOT stepScene's rule, which picks the bow side by the arrow's index parity in
 * a list. Parity is not geometry, and a dragged arrow has no index yet.
 */
const BOW_FRACTION = 0.32;
const BOW_FLOOR_PX = 18;

/**
 * Below this chord length the floor is dropped and the bow is pure fraction.
 * hitLayout can apply the floor unconditionally because its chords are between
 * two placed atoms and are never short. An in-flight chord starts at zero and
 * grows, and an 18 px bow on a 10 px chord is not a readable arc, it is a loop
 * hanging off the atom the student just grabbed. 56.25 is where the fraction
 * reaches the floor, so the two rules meet continuously and nothing jumps.
 */
const BOW_FLOOR_CHORD_PX = BOW_FLOOR_PX / BOW_FRACTION;

/**
 * Timestep floor, and the gap threshold, in ms.
 *
 * The floor is what makes duplicate and out of order timestamps safe. Coalesced
 * pointer events genuinely arrive stamped identically, so dt can be zero or
 * negative, and every term in this filter divides by dt. Clamping to 4 ms
 * (a 250 Hz ceiling, above any pointer this ships on) means such a sample is
 * folded in with a small weight rather than dividing by zero: no time passed, so
 * it carries almost no new information, which is the honest answer.
 *
 * MAX_STEP_MS is a GAP DETECTOR, not a dt clamp, and the distinction is a
 * round-one scar. The earlier version clamped a 2000 ms gap down to 100 ms and
 * claimed that prevented a teleport. It did the opposite: dividing the same
 * displacement by 100 instead of 2000 inflated the apparent speed twentyfold,
 * threw the adaptive cutoff wide open, and the arrow took 97.9 percent of the
 * jump in one frame anyway, a snap wearing a glide's comment. The deliberate
 * behaviour is the SNAP: a sample arriving more than MAX_STEP_MS after the
 * previous one (a backgrounded tab, a long GC pause) re-seeds the filter at
 * that sample with the arc fully formed and the speed reading zeroed. After a
 * real gap the finger simply IS at the new place; gliding the arrow across the
 * screen to catch up would draw a stroke no hand is drawing.
 */
const MIN_STEP_MS = 4;
const MAX_STEP_MS = 100;

const DEFAULTS: DragSmootherOptions = {
  minCutoffHz: MIN_CUTOFF_HZ,
  beta: BETA,
  derivativeCutoffHz: DERIVATIVE_CUTOFF_HZ,
  controlCutoffHz: CONTROL_CUTOFF_HZ,
  bowCutoffHz: BOW_CUTOFF_HZ,
  maxBowPx: MAX_BOW_PX,
};

// ---------------------------------------------------------------------------

/**
 * Smoothing factor for a first order low pass at `cutoffHz`, over a step of
 * `dtMs`. tau is the time constant in ms; alpha is the fraction of the gap to
 * the new sample that this step closes.
 */
export function alphaFor(cutoffHz: number, dtMs: number): number {
  const tauMs = 1000 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tauMs / dtMs);
}

/**
 * The steady state distance the smoothed tip trails a pointer moving at a
 * constant `speedPxPerMs`. Exported because it is the trailing bound in closed
 * form, and a test that asserts the simulation against the formula is checking
 * the implementation rather than restating it.
 *
 * This is the WORST CASE, not the expected value. It models the textbook filter,
 * whose cutoff is driven by the hand's speed alone. push() drives the cutoff by
 * max(filtered, instantaneous) instead, and at steady state the instantaneous
 * term is the hand's speed plus the lag still being closed, so the real cutoff
 * runs higher and the real lag comes in under this number. At 2 px/ms and 60 Hz
 * the formula says 10.1 px and the filter delivers 8.3. The gap narrows as the
 * frame interval grows, which is why the formula is the safe thing to publish.
 */
export function trailAtSpeed(speedPxPerMs: number, options?: Partial<DragSmootherOptions>): number {
  const opts = { ...DEFAULTS, ...options };
  const cutoffHz = opts.minCutoffHz + opts.beta * Math.abs(speedPxPerMs);
  return Math.abs(speedPxPerMs) * (1000 / (2 * Math.PI * cutoffHz));
}

/** The bow offset a chord of `len` px earns, before the side is chosen. */
export function bowMagnitude(len: number, maxBowPx: number = MAX_BOW_PX): number {
  const fraction = len * BOW_FRACTION;
  const floored = len >= BOW_FLOOR_CHORD_PX ? Math.max(BOW_FLOOR_PX, fraction) : fraction;
  return Math.min(maxBowPx, floored);
}

const finite = (n: number): boolean => Number.isFinite(n);

/**
 * Create a smoother for one drag.
 *
 * `origin` is where the drag started, the arrow's tail: a lone pair, a bond
 * midpoint, whatever the student grabbed. `awayFrom` is the point the arc should
 * bow away from, normally the molecule's centroid, so the arrow sweeps around
 * the structure rather than through it. Pass null when there is nothing to avoid
 * and the arc will hold whichever side it started on.
 */
export function createDragSmoother(
  origin: Point2,
  awayFrom: Point2 | null,
  options?: Partial<DragSmootherOptions>,
): DragSmoother {
  const opts: DragSmootherOptions = { ...DEFAULTS, ...options };

  let tail: Point2 = origin;
  let away: Point2 | null = awayFrom;

  let started = false;
  let tPrev = 0;
  // Filtered tip, and the filtered rate at which it is closing its residual,
  // in px per ms. That rate drives the adaptive cutoff, per the one euro
  // paper. It is NOT the pointer's speed; pointerSpeed below is.
  let hatX = origin.x;
  let hatY = origin.y;
  let velX = 0;
  let velY = 0;
  // Previous RAW sample, and the filtered speed of the raw stream. This pair
  // exists only to make speedPxPerMs mean what its doc says: the hand's own
  // speed, independent of frame rate.
  let rawX = origin.x;
  let rawY = origin.y;
  let pointerSpeed = 0;
  // Filtered control point, and its own filtered velocity. Second filter, see
  // CONTROL_CUTOFF_HZ above for why the arc is not allowed to ride on the tip's.
  let ctrlX = origin.x;
  let ctrlY = origin.y;
  let ctrlVelX = 0;
  let ctrlVelY = 0;
  /** Filtered SIGNED bow offset along the chord's left normal. Stage one of two. */
  let bow = 0;
  /** Which side of the chord the arc is currently bowed to. Sticky, so a null `away` holds. */
  let side = 1;

  function output(): SmoothedArrow {
    return {
      tip: { x: hatX, y: hatY },
      control: { x: ctrlX, y: ctrlY },
      speedPxPerMs: pointerSpeed,
    };
  }

  /** The chord from the tail to the smoothed tip: length, midpoint, left normal. */
  interface Chord {
    readonly len: number;
    readonly mid: Point2;
    readonly ux: number;
    readonly uy: number;
  }

  function chord(): Chord {
    const dx = hatX - tail.x;
    const dy = hatY - tail.y;
    const len = Math.hypot(dx, dy);
    const mid = { x: (tail.x + hatX) / 2, y: (tail.y + hatY) / 2 };
    if (len < 1) return { len, mid, ux: 0, uy: 0 };
    return { len, mid, ux: -dy / len, uy: dx / len };
  }

  /**
   * The side decision, WITH hysteresis. The candidate further from `away` is
   * the same test hitLayout.bowAwayFrom runs, but the incumbent side holds
   * unless the challenger wins by SIDE_FLIP_MARGIN times the bow magnitude,
   * because near the knife edge (chord through `away`) the margin-free test is
   * decided by sub pixel tremor. See the constant's comment for the numbers.
   */
  function decideSide(c: Chord, magnitude: number): void {
    if (away === null) return;
    const plus = Math.hypot(c.mid.x + c.ux * magnitude - away.x, c.mid.y + c.uy * magnitude - away.y);
    const minus = Math.hypot(c.mid.x - c.ux * magnitude - away.x, c.mid.y - c.uy * magnitude - away.y);
    const challengerWinsBy = side === 1 ? minus - plus : plus - minus;
    if (challengerWinsBy > SIDE_FLIP_MARGIN * magnitude) side = -side;
  }

  /**
   * Advances the bow filter one step and returns where the control point wants
   * to be, before its own filter has a say. It mutates `bow` and `side`, which
   * is why it is named for the advance rather than for the value, and push()
   * calls it exactly once per sample.
   *
   * Built from the already smoothed tip: chord midpoint, pushed out along the
   * chord's normal by the bow the chord's length earns, to the side decideSide
   * holds.
   */
  function advanceBow(aBow: number, c: Chord): Point2 {
    if (c.len < 1) {
      bow += aBow * (0 - bow);
      return c.mid;
    }
    const magnitude = bowMagnitude(c.len, opts.maxBowPx);
    decideSide(c, magnitude);
    // Stage one: ease the SIGNED offset toward the side it wants, so a flip
    // passes through zero rather than jumping across.
    bow += aBow * (side * magnitude - bow);
    return { x: c.mid.x + c.ux * bow, y: c.mid.y + c.uy * bow };
  }

  /**
   * The ceiling is a ceiling: after the control filter has moved, the control
   * point is pulled radially toward the chord midpoint if it sits further than
   * maxBowPx away. The filter's own state is clamped too, so the excess does
   * not persist into the next frame.
   */
  function clampControl(c: Chord): void {
    const off = Math.hypot(ctrlX - c.mid.x, ctrlY - c.mid.y);
    if (off <= opts.maxBowPx) return;
    const scale = opts.maxBowPx / off;
    ctrlX = c.mid.x + (ctrlX - c.mid.x) * scale;
    ctrlY = c.mid.y + (ctrlY - c.mid.y) * scale;
  }

  return {
    push(sample: DragSample): SmoothedArrow {
      // A non-finite sample is dropped rather than allowed to poison the state.
      // One NaN in an exponential filter is NaN forever, and the drag would
      // never recover.
      if (!finite(sample.x) || !finite(sample.y) || !finite(sample.tMs)) return output();

      if (!started) {
        // First sample defines the state instead of being filtered into it.
        // Filtering against a zeroed state would drag the arrow out of the
        // origin over the first few frames, which reads as the tip sticking.
        started = true;
        tPrev = sample.tMs;
        hatX = sample.x;
        hatY = sample.y;
        velX = 0;
        velY = 0;
        rawX = sample.x;
        rawY = sample.y;
        pointerSpeed = 0;
        // The control point starts on the chord, not on its bowed target, so the
        // arrow leaves the atom straight and arcs open as it lengthens. A bow
        // computed off the very first chord would snap a fully formed arc into
        // existence on frame one, which reads as a glitch rather than a gesture.
        ctrlX = (tail.x + sample.x) / 2;
        ctrlY = (tail.y + sample.y) / 2;
        ctrlVelX = 0;
        ctrlVelY = 0;
        bow = 0;
        side = 1;
        return output();
      }

      const rawDtMs = sample.tMs - tPrev;
      tPrev = sample.tMs;

      // The gap snap, per the MAX_STEP_MS note: after a real gap the finger
      // simply is at the new place, so the filter re-seeds there with the arc
      // fully formed rather than gliding across the screen to catch up. The
      // side decision still runs through its hysteresis, so a gap cannot smuggle
      // in a side flip the margin would have refused.
      if (rawDtMs > MAX_STEP_MS) {
        hatX = sample.x;
        hatY = sample.y;
        velX = 0;
        velY = 0;
        rawX = sample.x;
        rawY = sample.y;
        pointerSpeed = 0;
        const c = chord();
        if (c.len < 1) {
          bow = 0;
          ctrlX = c.mid.x;
          ctrlY = c.mid.y;
        } else {
          const magnitude = bowMagnitude(c.len, opts.maxBowPx);
          decideSide(c, magnitude);
          bow = side * magnitude;
          ctrlX = c.mid.x + c.ux * bow;
          ctrlY = c.mid.y + c.uy * bow;
        }
        ctrlVelX = 0;
        ctrlVelY = 0;
        return output();
      }

      const dtMs = Math.max(MIN_STEP_MS, rawDtMs);

      // The published speed: the raw stream's own displacement over its own
      // time, filtered. Frame rate independent, unlike the residual rate below.
      const aDeriv = alphaFor(opts.derivativeCutoffHz, dtMs);
      const rawStepPx = Math.hypot(sample.x - rawX, sample.y - rawY);
      rawX = sample.x;
      rawY = sample.y;
      pointerSpeed += aDeriv * (rawStepPx / dtMs - pointerSpeed);

      // Derivative of the FILTERED signal, per the one euro paper: it is the
      // error the filter still has to close, not the raw sample to sample jump,
      // so noise that the filter already rejected does not reappear here.
      const instX = (sample.x - hatX) / dtMs;
      const instY = (sample.y - hatY) / dtMs;

      velX += aDeriv * (instX - velX);
      velY += aDeriv * (instY - velY);

      // Fast to open, slow to close. See the header note.
      const speed = Math.max(Math.hypot(velX, velY), Math.hypot(instX, instY));

      const aPos = alphaFor(opts.minCutoffHz + opts.beta * speed, dtMs);
      hatX += aPos * (sample.x - hatX);
      hatY += aPos * (sample.y - hatY);

      // Stage two: the control point's own one euro, over its target rather than
      // over the pointer. Same shape, same max() rule, calmer floor.
      const c = chord();
      const target = advanceBow(alphaFor(opts.bowCutoffHz, dtMs), c);
      const cInstX = (target.x - ctrlX) / dtMs;
      const cInstY = (target.y - ctrlY) / dtMs;
      ctrlVelX += aDeriv * (cInstX - ctrlVelX);
      ctrlVelY += aDeriv * (cInstY - ctrlVelY);
      const cSpeed = Math.max(Math.hypot(ctrlVelX, ctrlVelY), Math.hypot(cInstX, cInstY));
      const aCtrl = alphaFor(opts.controlCutoffHz + opts.beta * cSpeed, dtMs);
      ctrlX += aCtrl * (target.x - ctrlX);
      ctrlY += aCtrl * (target.y - ctrlY);
      clampControl(c);

      return output();
    },

    peek(): SmoothedArrow {
      return output();
    },

    reset(nextOrigin: Point2, nextAwayFrom: Point2 | null): void {
      tail = nextOrigin;
      away = nextAwayFrom;
      started = false;
      tPrev = 0;
      hatX = nextOrigin.x;
      hatY = nextOrigin.y;
      velX = 0;
      velY = 0;
      rawX = nextOrigin.x;
      rawY = nextOrigin.y;
      pointerSpeed = 0;
      ctrlX = nextOrigin.x;
      ctrlY = nextOrigin.y;
      ctrlVelX = 0;
      ctrlVelY = 0;
      bow = 0;
      side = 1;
    },
  };
}
