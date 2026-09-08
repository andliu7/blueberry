/**
 * The pilot drag smoother, held to the two numbers it publishes.
 *
 * The module's whole claim is that it can be fast and calm at once: no
 * perceptible lag while the hand is moving, and a stable arc once it stops. A
 * fixed-lag smoother cannot make both claims, so the tests here have to check
 * both or they check nothing.
 *
 * Every timestamp in this file is synthetic. The smoother reads no clock and
 * owns no timer, which is exactly why settling time is assertable in a node
 * environment: "180 ms" here is 11 frames of arithmetic, not a wait.
 */

import { describe, expect, it } from "vitest";

import {
  MAX_TRAIL_PX,
  SETTLE_EPSILON_PX,
  SETTLE_MS,
  alphaFor,
  bowMagnitude,
  createDragSmoother,
  trailAtSpeed,
} from "../pilot/drag/smoothing";
import type { SmoothedArrow } from "../pilot/drag/smoothing";
import type { Point2 } from "@blueberry/interaction";

const FRAME_MS = 1000 / 60;
const ORIGIN: Point2 = { x: 100, y: 300 };
/** Far below the arrow so the arc has an unambiguous side to bow away from. */
const CENTROID: Point2 = { x: 140, y: 460 };

const dist = (a: Point2, b: Point2): number => Math.hypot(a.x - b.x, a.y - b.y);

const isFiniteArrow = (arrow: SmoothedArrow): boolean =>
  Number.isFinite(arrow.tip.x) &&
  Number.isFinite(arrow.tip.y) &&
  Number.isFinite(arrow.control.x) &&
  Number.isFinite(arrow.control.y) &&
  Number.isFinite(arrow.speedPxPerMs);

describe("createDragSmoother, settling", () => {
  it("converges to a stable arc within SETTLE_MS of the pointer stopping", () => {
    const smoother = createDragSmoother(ORIGIN, CENTROID);
    let t = 0;

    // A real drag first, so the filter is carrying momentum when the hand stops.
    // Settling from a standing start would be trivially easy and would not test
    // the thing that actually goes wrong.
    for (let i = 0; i <= 24; i += 1) {
      smoother.push({ x: 100 + i * 12, y: 300 - i * 4, tMs: t });
      t += FRAME_MS;
    }

    const held: Point2 = { x: 100 + 24 * 12, y: 300 - 24 * 4 };
    const settleUntil = t + SETTLE_MS;
    while (t < settleUntil) {
      smoother.push({ x: held.x, y: held.y, tMs: t });
      t += FRAME_MS;
    }

    const atSettle = smoother.peek();
    expect(dist(atSettle.tip, held)).toBeLessThanOrEqual(SETTLE_EPSILON_PX);
    // Regression pin, deliberately tighter than the published epsilon: round
    // one measured 0.017 px here, 29x inside the bound, so settling could have
    // regressed thirty-fold without this test noticing. 0.05 keeps 3x slack
    // over the measured value. If the filter constants are retuned on purpose,
    // re-measure and move this number in the same commit; do not delete it.
    expect(dist(atSettle.tip, held)).toBeLessThanOrEqual(0.05);

    // Settled means it STAYS settled: another quarter second of the same held
    // sample must not move either point by a visible amount.
    let previous = atSettle;
    let worstTip = 0;
    let worstControl = 0;
    for (let i = 0; i < 15; i += 1) {
      const next = smoother.push({ x: held.x, y: held.y, tMs: t });
      t += FRAME_MS;
      worstTip = Math.max(worstTip, dist(next.tip, previous.tip));
      worstControl = Math.max(worstControl, dist(next.control, previous.control));
      previous = next;
    }
    expect(worstTip).toBeLessThan(SETTLE_EPSILON_PX);
    expect(worstControl).toBeLessThan(SETTLE_EPSILON_PX);
    expect(dist(previous.tip, held)).toBeLessThanOrEqual(SETTLE_EPSILON_PX);
  });

  it("settles from tremor, not just from a clean stop", () => {
    // A held finger is not a still finger. Two pixels of wobble at about 10 Hz
    // is what a hand does when it is trying to hold position, and the arc must
    // absorb it rather than shimmer.
    const smoother = createDragSmoother(ORIGIN, CENTROID);
    const held: Point2 = { x: 380, y: 210 };
    let t = 0;
    for (let i = 0; i < 90; i += 1) {
      const phase = (i * 2 * Math.PI) / 6;
      smoother.push({ x: held.x + Math.cos(phase), y: held.y + Math.sin(phase), tMs: t });
      t += FRAME_MS;
    }

    let previous = smoother.peek();
    let worst = 0;
    for (let i = 0; i < 30; i += 1) {
      const phase = ((90 + i) * 2 * Math.PI) / 6;
      const next = smoother.push({ x: held.x + Math.cos(phase), y: held.y + Math.sin(phase), tMs: t });
      t += FRAME_MS;
      worst = Math.max(worst, dist(next.tip, previous.tip));
      previous = next;
    }
    // The raw stream moves a full pixel per frame here. The smoothed one must
    // move markedly less, or the filter is not earning its place.
    expect(worst).toBeLessThan(0.5);
  });
});

describe("createDragSmoother, trailing at speed", () => {
  it("never trails a fast straight drag by more than MAX_TRAIL_PX", () => {
    // 2 px/ms is 2000 px/s, a hard flick across a phone. The sweep goes well
    // past it because the bound is meant to hold at any speed, not just at the
    // one that was convenient to test.
    for (const speed of [0.25, 0.5, 1, 2, 4, 8]) {
      const smoother = createDragSmoother(ORIGIN, CENTROID);
      let worst = 0;
      for (let i = 0; i <= 40; i += 1) {
        const t = i * FRAME_MS;
        const truth: Point2 = { x: ORIGIN.x + speed * t, y: ORIGIN.y };
        const arrow = smoother.push({ x: truth.x, y: truth.y, tMs: t });
        worst = Math.max(worst, dist(arrow.tip, truth));
      }
      expect(worst, `speed ${speed} px/ms`).toBeLessThanOrEqual(MAX_TRAIL_PX);
    }
  });

  it("stays under the closed form lag it publishes, without falling far short of it", () => {
    // The formula and the simulation are two independent statements of the same
    // claim, and they are deliberately NOT equal. trailAtSpeed models the
    // textbook filter, where the cutoff is driven by the hand's speed alone. The
    // implementation drives it by max(filtered, instantaneous) instead, and at
    // steady state the instantaneous term is the hand's speed PLUS the lag it is
    // still closing, so the real cutoff runs higher and the real lag comes in
    // under the formula. The formula is therefore the worst case, which is what
    // makes it safe to publish as the bound.
    //
    // Both halves matter. Under the formula, or the bound is wrong. Not
    // arbitrarily under it, or the formula is a number nobody should trust.
    for (const speed of [0.5, 1, 2, 4]) {
      const smoother = createDragSmoother(ORIGIN, null);
      let final = 0;
      for (let i = 0; i <= 60; i += 1) {
        const t = i * FRAME_MS;
        const truth: Point2 = { x: ORIGIN.x + speed * t, y: ORIGIN.y };
        const arrow = smoother.push({ x: truth.x, y: truth.y, tMs: t });
        final = dist(arrow.tip, truth);
      }
      const predicted = trailAtSpeed(speed);
      expect(final, `speed ${speed} px/ms`).toBeLessThanOrEqual(predicted);
      expect(final, `speed ${speed} px/ms`).toBeGreaterThan(predicted * 0.5);
    }
  });

  it("holds MAX_TRAIL_PX in simulation at extreme speeds, not only in the closed form", () => {
    // This replaces a round-one test that checked trailAtSpeed against its own
    // asymptote: arithmetic checking arithmetic, exercising no implementation
    // code. The published ceiling is only worth trusting if the FILTER honours
    // it where the closed form says it is tightest, which is the high speed
    // limit, so this drives the filter itself at speeds far past any hand.
    for (const speed of [8, 25, 100]) {
      const smoother = createDragSmoother(ORIGIN, null);
      let worst = 0;
      for (let i = 0; i <= 40; i += 1) {
        const t = i * FRAME_MS;
        const truth: Point2 = { x: ORIGIN.x + speed * t, y: ORIGIN.y };
        const arrow = smoother.push({ x: truth.x, y: truth.y, tMs: t });
        worst = Math.max(worst, dist(arrow.tip, truth));
      }
      expect(worst, `speed ${speed} px/ms`).toBeLessThanOrEqual(MAX_TRAIL_PX);
    }
  });
});

describe("createDragSmoother, published speed", () => {
  it("reports the hand's speed, frame rate independent", () => {
    // Round one published the filter's residual closing rate as speedPxPerMs:
    // a true 1.00 px/ms read 1.41 at 60 Hz and 1.70 at 120 Hz, same hand, 1.5x
    // different number depending on the display. The field now measures the
    // raw sample stream, so the number must match the hand at every rate.
    for (const hz of [60, 120, 240]) {
      const dtMs = 1000 / hz;
      const smoother = createDragSmoother(ORIGIN, null);
      let speed = 0;
      for (let i = 0; i <= hz; i += 1) {
        speed = smoother.push({ x: ORIGIN.x + i * dtMs, y: ORIGIN.y, tMs: i * dtMs }).speedPxPerMs;
      }
      expect(Math.abs(speed - 1), `${hz} Hz`).toBeLessThan(0.02);
    }
  });

  it("tracks a slow hand without inflating it", () => {
    // The same defect read a true 0.25 px/ms as 0.48, 93 percent high, which
    // is the range a glow driven by this field would live in.
    const smoother = createDragSmoother(ORIGIN, null);
    let speed = 0;
    for (let i = 0; i <= 60; i += 1) {
      const t = i * FRAME_MS;
      speed = smoother.push({ x: ORIGIN.x + 0.25 * t, y: ORIGIN.y, tMs: t }).speedPxPerMs;
    }
    expect(Math.abs(speed - 0.25)).toBeLessThan(0.01);
  });
});

describe("createDragSmoother, degenerate input", () => {
  it("survives duplicate timestamps", () => {
    const smoother = createDragSmoother(ORIGIN, CENTROID);
    let arrow = smoother.push({ x: 120, y: 300, tMs: 0 });
    for (let i = 0; i < 20; i += 1) {
      arrow = smoother.push({ x: 120 + i * 3, y: 300 - i, tMs: 0 });
      expect(isFiniteArrow(arrow), `duplicate ${i}`).toBe(true);
    }
    // Nothing may leave the box the samples themselves lived in: a zero timestep
    // must fold a sample in weakly, never overshoot past it.
    expect(arrow.tip.x).toBeGreaterThanOrEqual(119);
    expect(arrow.tip.x).toBeLessThanOrEqual(178);
    expect(arrow.tip.y).toBeLessThanOrEqual(301);
    expect(arrow.tip.y).toBeGreaterThanOrEqual(280);
  });

  it("survives timestamps that go backwards", () => {
    const smoother = createDragSmoother(ORIGIN, CENTROID);
    smoother.push({ x: 200, y: 260, tMs: 500 });
    const arrow = smoother.push({ x: 240, y: 240, tMs: 40 });
    expect(isFiniteArrow(arrow)).toBe(true);
    expect(isFiniteArrow(smoother.push({ x: 260, y: 230, tMs: 41 }))).toBe(true);
  });

  it("produces no NaN from a single sample", () => {
    const smoother = createDragSmoother(ORIGIN, CENTROID);
    const arrow = smoother.push({ x: 260, y: 210, tMs: 12 });
    expect(isFiniteArrow(arrow)).toBe(true);
    expect(arrow.tip).toEqual({ x: 260, y: 210 });
    expect(arrow.speedPxPerMs).toBe(0);
    // Bow eases in from flat, so the first frame's control point is the chord
    // midpoint. A bow computed off a one pixel chord is what produces the loop
    // hanging off the atom the student just grabbed.
    expect(arrow.control.x).toBeCloseTo((ORIGIN.x + 260) / 2, 6);
    expect(arrow.control.y).toBeCloseTo((ORIGIN.y + 210) / 2, 6);
  });

  it("is finite before any sample at all, and after a reset", () => {
    const smoother = createDragSmoother(ORIGIN, CENTROID);
    expect(isFiniteArrow(smoother.peek())).toBe(true);
    expect(smoother.peek().tip).toEqual(ORIGIN);
    smoother.push({ x: 300, y: 200, tMs: 0 });
    smoother.reset({ x: 40, y: 40 }, null);
    expect(smoother.peek().tip).toEqual({ x: 40, y: 40 });
    expect(isFiniteArrow(smoother.peek())).toBe(true);
  });

  it("snaps to the returning sample after a long gap, arc fully formed", () => {
    // A backgrounded tab comes back two seconds later with the pointer 490 px
    // to the right and high. Round one clamped dt from 2000 to 100 ms and
    // claimed that prevented a teleport; measured, it glided 97.9 percent of
    // the jump in one frame while reporting 4.2 px/ms for a stationary hand.
    // The deliberate behaviour is the snap: tip exactly on the sample, bow
    // fully formed on the away side, speed reading zeroed.
    const smoother = createDragSmoother(ORIGIN, CENTROID);
    let t = 0;
    for (let i = 0; i <= 24; i += 1) {
      smoother.push({ x: ORIGIN.x + i * 4, y: ORIGIN.y, tMs: t });
      t += FRAME_MS;
    }
    const landed: Point2 = { x: 690, y: 120 };
    const arrow = smoother.push({ x: landed.x, y: landed.y, tMs: t + 2000 });
    expect(arrow.tip).toEqual(landed);
    expect(arrow.speedPxPerMs).toBe(0);
    const mid = { x: (ORIGIN.x + landed.x) / 2, y: (ORIGIN.y + landed.y) / 2 };
    expect(dist(arrow.control, mid)).toBeCloseTo(bowMagnitude(dist(ORIGIN, landed)), 6);
    expect(dist(arrow.control, CENTROID)).toBeGreaterThan(dist(mid, CENTROID));
    // And the frame after the snap is an ordinary quiet frame, not a rebound.
    const next = smoother.push({ x: landed.x, y: landed.y, tMs: t + 2000 + FRAME_MS });
    expect(dist(next.control, arrow.control)).toBeLessThan(SETTLE_EPSILON_PX);
    expect(dist(next.tip, landed)).toBe(0);
  });

  it("drops a non-finite sample instead of poisoning the filter", () => {
    const smoother = createDragSmoother(ORIGIN, CENTROID);
    smoother.push({ x: 200, y: 260, tMs: 0 });
    const good = smoother.push({ x: 210, y: 255, tMs: FRAME_MS });
    const afterNaN = smoother.push({ x: Number.NaN, y: 255, tMs: 2 * FRAME_MS });
    expect(afterNaN).toEqual(good);
    expect(isFiniteArrow(smoother.push({ x: 220, y: 250, tMs: 3 * FRAME_MS }))).toBe(true);
  });
});

describe("createDragSmoother, against no smoothing at all", () => {
  /**
   * Arc wobble: the mean per-frame change in the control point's VELOCITY, over
   * the sustained middle of the drag. Second difference rather than first,
   * because the first difference is dominated by the arrow legitimately getting
   * longer and would score a clean fast drag as wobbly. The window drops the
   * first and last few moving frames, because the smoother deliberately eases in
   * and eases to a stop and those are the behaviour we want, not defects.
   *
   * This is the same measure the scratchpad trace script draws, kept here so the
   * claim is checked on every run rather than only when someone looks at an SVG.
   */
  const arcWobble = (arrows: readonly SmoothedArrow[], movingFrames: number): number => {
    let sum = 0;
    let n = 0;
    for (let i = 7; i < movingFrames - 4; i += 1) {
      const a = arrows[i];
      const b = arrows[i - 1];
      const c = arrows[i - 2];
      if (a === undefined || b === undefined || c === undefined) continue;
      const d1 = { x: a.control.x - b.control.x, y: a.control.y - b.control.y };
      const d0 = { x: b.control.x - c.control.x, y: b.control.y - c.control.y };
      sum += Math.hypot(d1.x - d0.x, d1.y - d0.y);
      n += 1;
    }
    return n === 0 ? 0 : sum / n;
  };

  /** The arrow a shell would draw with no smoothing: tip on the raw sample, same bow rule. */
  const rawArrow = (sample: Point2): SmoothedArrow => {
    const dx = sample.x - ORIGIN.x;
    const dy = sample.y - ORIGIN.y;
    const len = Math.hypot(dx, dy);
    const mid = { x: (ORIGIN.x + sample.x) / 2, y: (ORIGIN.y + sample.y) / 2 };
    if (len < 1) return { tip: sample, control: mid, speedPxPerMs: 0 };
    const m = bowMagnitude(len);
    const nx = (-dy / len) * m;
    const ny = (dx / len) * m;
    const plus = Math.hypot(mid.x + nx - CENTROID.x, mid.y + ny - CENTROID.y);
    const minus = Math.hypot(mid.x - nx - CENTROID.x, mid.y - ny - CENTROID.y);
    const side = plus >= minus ? 1 : -1;
    return { tip: sample, control: { x: mid.x + side * nx, y: mid.y + side * ny }, speedPxPerMs: 0 };
  };

  it("cuts the arc's wobble several times over on a slow shaky drag", () => {
    // A slow deliberate drag with a few pixels of hand tremor on it, quantised
    // to whole pixels the way a real pointer event reports. This is the case the
    // module exists for, and the case where a fixed fast filter has nothing to
    // offer.
    const moving = 79;
    const samples: Point2[] = [];
    const stream: { x: number; y: number; tMs: number }[] = [];
    for (let i = 0; i < moving; i += 1) {
      const p = i / (moving - 1);
      const x = Math.round(ORIGIN.x + p * 300 + Math.sin(i * 1.05) * 2.6 + Math.sin(i * 2.31) * 1.3);
      const y = Math.round(ORIGIN.y - p * 110 + Math.cos(i * 1.17) * 2.4);
      samples.push({ x, y });
      stream.push({ x, y, tMs: i * FRAME_MS });
    }

    const smoother = createDragSmoother(ORIGIN, CENTROID);
    const smoothed = stream.map((s) => smoother.push(s));
    const raw = samples.map(rawArrow);

    const rawWobble = arcWobble(raw, moving);
    const smoothWobble = arcWobble(smoothed, moving);
    expect(rawWobble).toBeGreaterThan(1);
    expect(smoothWobble * 3).toBeLessThan(rawWobble);
  });
});

describe("the bow", () => {
  it("eases through straight rather than snapping when the side flips", () => {
    // Drag straight across the centroid's line. Somewhere in the middle the
    // "away from the molecule" side changes, and the naive implementation jumps
    // the control point by twice the bow in one frame.
    const smoother = createDragSmoother({ x: 200, y: 200 }, { x: 200, y: 260 });
    let previous: SmoothedArrow | null = null;
    let worst = 0;
    for (let i = 0; i <= 80; i += 1) {
      const t = i * FRAME_MS;
      // An arc that swings from below the centroid line to above it.
      const angle = -Math.PI * 0.45 + (i / 80) * Math.PI * 0.9;
      const arrow = smoother.push({
        x: 200 + Math.cos(angle) * 160,
        y: 260 + Math.sin(angle) * 160,
        tMs: t,
      });
      if (previous !== null) worst = Math.max(worst, dist(arrow.control, previous.control));
      previous = arrow;
    }
    // A snapped flip on a 40 px bow moves the control point 80 px in one frame.
    // Per-frame control motion staying in single digits is the whole point.
    expect(worst).toBeLessThan(10);
  });

  it("holds one side on the knife edge: a straight drag at the centroid with 1 px of tremor", () => {
    // The single most common gesture in the trainer: pushing an arrow from a
    // lone pair across the molecule, which lays the chord almost exactly on
    // the origin-to-centroid line. Round one re-decided the side every frame
    // and this trajectory flipped it 33 times in 100 frames, moved the control
    // point up to 13.5 px in one frame, and collapsed the mean bow to 6.5 px.
    // The circular sweep in the flip test above never hits this, which is why
    // this trajectory gets a test of its own.
    const origin: Point2 = { x: 100, y: 300 };
    const away: Point2 = { x: 300, y: 300 };
    const smoother = createDragSmoother(origin, away);
    const arrows: SmoothedArrow[] = [];
    for (let i = 0; i < 100; i += 1) {
      // Quantised to whole px like a real pointer event; the sine is +-1 px of
      // hand tremor across the drag line.
      const x = Math.round(origin.x + 4 + i * 4);
      const y = Math.round(300 + Math.sin(i * 1.7));
      arrows.push(smoother.push({ x, y, tMs: i * FRAME_MS }));
    }

    let flips = 0;
    let lastSign = 0;
    let worstMove = 0;
    let bowSum = 0;
    let bowFrames = 0;
    for (let i = 0; i < arrows.length; i += 1) {
      const arrow = arrows[i];
      if (arrow === undefined) continue;
      const dx = arrow.tip.x - origin.x;
      const dy = arrow.tip.y - origin.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const mid = { x: (origin.x + arrow.tip.x) / 2, y: (origin.y + arrow.tip.y) / 2 };
      // Signed distance of the control point off the chord line: the bow as rendered.
      const perp = ((arrow.control.x - mid.x) * -dy + (arrow.control.y - mid.y) * dx) / len;
      if (i >= 50) {
        bowSum += Math.abs(perp);
        bowFrames += 1;
      }
      // Count a side change only when the bow is visibly off the chord, so the
      // eased pass through zero on a legitimate flip is not itself counted.
      if (Math.abs(perp) > 2) {
        const sign = perp > 0 ? 1 : -1;
        if (lastSign !== 0 && sign !== lastSign) flips += 1;
        lastSign = sign;
      }
      const prev = arrows[i - 1];
      if (prev !== undefined) worstMove = Math.max(worstMove, dist(arrow.control, prev.control));
    }

    // At most ONE side change over the whole drag. The fix delivers zero; one
    // is the allowance for a legitimate early commit to the held side.
    expect(flips).toBeLessThanOrEqual(1);
    // Same per-frame bound as the flip test above, on the trajectory where it
    // used to read 13.5.
    expect(worstMove).toBeLessThan(10);
    // Holding the side must not cost the depth: the back half of this drag is
    // capped-bow territory, and a mean anywhere near round one's 6.5 px means
    // the filter is parking the arc flat again.
    expect(bowSum / bowFrames).toBeGreaterThan(bowMagnitude(1e6) / 2);
  });

  it("keeps the bow ceiling a ceiling while the chord grows or swings", () => {
    // Round one measured the control point 40.53 px off the chord midpoint on
    // a plain fast straight drag and 45.5 px after a long drag that swings:
    // the control filter chases a moving target and carries its state past the
    // cap. The clamp runs after filtering, so no frame may ever show more.
    const cap = bowMagnitude(1e6);
    const straight: Point2[] = [];
    for (let i = 0; i <= 80; i += 1) straight.push({ x: ORIGIN.x + i * 24, y: ORIGIN.y });
    const swing: Point2[] = [];
    for (let i = 0; i <= 60; i += 1) swing.push({ x: ORIGIN.x + i * 8, y: ORIGIN.y });
    for (let i = 1; i <= 40; i += 1) {
      const angle = -i * 0.06;
      swing.push({ x: ORIGIN.x + Math.cos(angle) * 480, y: ORIGIN.y + Math.sin(angle) * 480 });
    }

    for (const samples of [straight, swing]) {
      const smoother = createDragSmoother(ORIGIN, CENTROID);
      let worst = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const s = samples[i];
        if (s === undefined) continue;
        const arrow = smoother.push({ x: s.x, y: s.y, tMs: i * FRAME_MS });
        const mid = { x: (ORIGIN.x + arrow.tip.x) / 2, y: (ORIGIN.y + arrow.tip.y) / 2 };
        worst = Math.max(worst, dist(arrow.control, mid));
      }
      expect(worst).toBeLessThanOrEqual(cap + 1e-9);
    }
  });

  it("floors a short chord at pure fraction so a fresh drag has no loop", () => {
    // hitLayout floors the bow at 18 px because its chords are never short. An
    // in-flight chord starts at zero, and the two rules have to meet without a
    // step or the arrow jumps as it lengthens.
    expect(bowMagnitude(10)).toBeCloseTo(3.2, 6);
    expect(bowMagnitude(56.25)).toBeCloseTo(18, 6);
    expect(bowMagnitude(56.24)).toBeCloseTo(56.24 * 0.32, 6);
    expect(bowMagnitude(80)).toBeCloseTo(25.6, 6);
    expect(bowMagnitude(400)).toBe(40);
  });

  it("bows away from the point it was told to avoid, and actually bows", () => {
    const smoother = createDragSmoother(ORIGIN, CENTROID);
    for (let i = 0; i <= 60; i += 1) {
      smoother.push({ x: ORIGIN.x + i * 6, y: ORIGIN.y, tMs: i * FRAME_MS });
    }
    const arrow = smoother.peek();
    const mid = { x: (ORIGIN.x + arrow.tip.x) / 2, y: (ORIGIN.y + arrow.tip.y) / 2 };
    expect(dist(arrow.control, CENTROID)).toBeGreaterThan(dist(mid, CENTROID));
    // Direction alone is not enough: a 0.1 px bow would pass the line above,
    // and round one's side chatter flattened the arc while every frame still
    // pointed the right way. At steady state mid drag the control point must
    // sit at least half the earned (capped) bow off the chord.
    const dx = arrow.tip.x - ORIGIN.x;
    const dy = arrow.tip.y - ORIGIN.y;
    const len = Math.hypot(dx, dy);
    const offChord = Math.abs(((arrow.control.x - mid.x) * -dy + (arrow.control.y - mid.y) * dx) / len);
    expect(offChord).toBeGreaterThanOrEqual(bowMagnitude(len) / 2);
  });
});

describe("alphaFor", () => {
  it("is a fraction, and rises with both cutoff and timestep", () => {
    for (const cutoff of [0.5, 3.5, 30, 300]) {
      for (const dt of [1, 4, 16.67, 100]) {
        const a = alphaFor(cutoff, dt);
        expect(a, `${cutoff} Hz at ${dt} ms`).toBeGreaterThan(0);
        expect(a, `${cutoff} Hz at ${dt} ms`).toBeLessThan(1);
      }
    }
    expect(alphaFor(30, 16.67)).toBeGreaterThan(alphaFor(3.5, 16.67));
    expect(alphaFor(3.5, 100)).toBeGreaterThan(alphaFor(3.5, 16.67));
  });
});
