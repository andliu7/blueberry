/**
 * The corridor, tested as a behaviour rather than as an implementation.
 *
 * Every case here is a sentence from the reference captures turned into an
 * assertion. "It follows the line even if I'm off" is the wobble case. "Drawing
 * off of the lines" is the stray case. The ring and the lift-and-tap cases are
 * the two ways a naive nearest-point projection breaks, and they are here
 * because both were designed against rather than discovered.
 */

import { describe, expect, it } from "vitest";

import {
  IDLE_TRACE,
  advanceTrace,
  buildPath,
  canStartAt,
  endToleranceFor,
  lookaheadFor,
  pointAt,
  projectOntoWindow,
  simplifyPolyline,
  sliceTo,
  strokeOutcome,
  tangentAt,
  type Pt,
  type TraceRules,
} from "../beats/trace/geometry";

const RULES: TraceRules = { tolerancePx: 22 };

/** A straight 200 px path along x, the simplest thing that can be traced. */
const straight = buildPath([
  { x: 0, y: 0 },
  { x: 200, y: 0 },
]);

/** An L, so a stroke with a corner is covered too. */
const corner = buildPath([
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
]);

/** A closed hexagon: comes back within a bond length of where it started. */
function hexagon(radius: number): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i <= 6; i += 1) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push({ x: 160 + radius * Math.cos(angle), y: 160 + radius * Math.sin(angle) });
  }
  return points;
}

/** Walk a path, handing every sample to advanceTrace, with optional wobble. */
function replay(
  path: ReturnType<typeof buildPath>,
  rules: TraceRules,
  options: { stepPx?: number; wobblePx?: number; stopAt?: number } = {},
) {
  const step = options.stepPx ?? 4;
  const wobble = options.wobblePx ?? 0;
  const stop = options.stopAt ?? path.length;
  let progress = IDLE_TRACE;
  let sample = 0;
  for (let along = 0; along <= stop + 1e-9; along += step) {
    const on = pointAt(path, Math.min(along, path.length));
    const tangent = tangentAt(path, Math.min(along, path.length));
    // Perpendicular offset that alternates side, so it is a wobble and not a
    // drift: a constant offset would be a parallel line, which is a different
    // failure and not the one the reference shows.
    const sign = sample % 2 === 0 ? 1 : -1;
    sample += 1;
    const point = {
      x: on.x - tangent.y * wobble * sign,
      y: on.y + tangent.x * wobble * sign,
    };
    progress = advanceTrace(path, progress, point, rules);
  }
  return progress;
}

describe("buildPath", () => {
  it("refuses a path that has no direction", () => {
    expect(() => buildPath([{ x: 5, y: 5 }])).toThrow(/two distinct points/);
    expect(() =>
      buildPath([
        { x: 5, y: 5 },
        { x: 5, y: 5 },
      ]),
    ).toThrow(/two distinct points/);
  });

  it("measures arc length across a corner", () => {
    expect(corner.length).toBeCloseTo(200, 6);
  });
});

describe("the ink is the ideal path, not the finger", () => {
  it("advances while the finger is inside the corridor", () => {
    const progress = replay(straight, RULES, { wobblePx: 18 });
    expect(progress.complete).toBe(true);
    expect(progress.maxStrayPx).toBeLessThanOrEqual(RULES.tolerancePx);
  });

  it("draws on the guide even though the finger never touched it", () => {
    // Travel to x = 90 on the line, then a sample 19 px off it and 10 px on: it
    // is inside the corridor and inside the window, so the stroke advances, and
    // what RENDERS is a prefix of the AUTHORED polyline, every point at y = 0.
    const arrived = replay(straight, RULES, { stopAt: 90 });
    const progress = advanceTrace(straight, arrived, { x: 100, y: 19 }, RULES);
    expect(progress.offCorridor).toBe(false);
    const ink = sliceTo(straight, progress.along);
    for (const point of ink) expect(point.y).toBeCloseTo(0, 6);
    expect(ink[ink.length - 1]!.x).toBeCloseTo(100, 6);
  });

  it("freezes rather than rewinds when the finger leaves the corridor", () => {
    const half = advanceTrace(straight, IDLE_TRACE, { x: 100, y: 0 }, RULES);
    const stray = advanceTrace(straight, half, { x: 120, y: 60 }, RULES);
    expect(stray.offCorridor).toBe(true);
    expect(stray.along).toBeCloseTo(half.along, 6);
    expect(stray.maxStrayPx).toBeGreaterThan(RULES.tolerancePx);
  });

  it("keeps the ground it covered when the finger wobbles backwards", () => {
    const forward = advanceTrace(straight, IDLE_TRACE, { x: 120, y: 0 }, RULES);
    const back = advanceTrace(straight, forward, { x: 108, y: 0 }, RULES);
    expect(back.along).toBeCloseTo(forward.along, 6);
  });
});

describe("the window", () => {
  it("does not let a tap at the far end finish an untraced stroke", () => {
    const jumped = advanceTrace(straight, IDLE_TRACE, { x: 200, y: 0 }, RULES);
    expect(jumped.complete).toBe(false);
    expect(jumped.along).toBeLessThanOrEqual(lookaheadFor(RULES) + 1e-6);
  });

  it("does not rewind a ring when the hand comes back past its own start", () => {
    const ring = buildPath(hexagon(64));
    // Three quarters of the way round, the pen is one bond length from the
    // start point. A global projection would snap `along` back to zero here.
    const threeQuarters = ring.length * 0.75;
    const progress = replay(ring, RULES, { stopAt: threeQuarters });
    expect(progress.along).toBeGreaterThan(ring.length * 0.7);
  });

  it("completes a ring traced all the way round", () => {
    const ring = buildPath(hexagon(64));
    expect(replay(ring, RULES).complete).toBe(true);
  });
});

describe("projectOntoWindow", () => {
  it("clamps a projection that falls outside the window back into it", () => {
    const projection = projectOntoWindow(straight, { x: 180, y: 0 }, 0, 40);
    expect(projection.along).toBeCloseTo(40, 6);
    expect(projection.offset).toBeCloseTo(140, 6);
  });
});

describe("completion", () => {
  it("caps the end allowance so a generous corridor cannot gift a short stroke", () => {
    const short = buildPath([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
    ]);
    expect(endToleranceFor(short, RULES)).toBeCloseTo(6, 6);
    expect(endToleranceFor(straight, RULES)).toBeCloseTo(22, 6);
  });

  it("does not complete a stroke abandoned before the end allowance", () => {
    const progress = replay(straight, RULES, { stopAt: 150 });
    expect(progress.complete).toBe(false);
  });

  it("completes across a corner", () => {
    expect(replay(corner, RULES, { wobblePx: 12 }).complete).toBe(true);
  });
});

describe("canStartAt", () => {
  it("accepts a press near the authored start and refuses one at the far end", () => {
    expect(canStartAt(straight, { x: 8, y: 8 }, RULES)).toBe(true);
    expect(canStartAt(straight, { x: 200, y: 0 }, RULES)).toBe(false);
  });
});

describe("strokeOutcome", () => {
  it("separates stopping short from wandering off", () => {
    const complete = replay(straight, RULES);
    expect(strokeOutcome(complete, RULES)).toBe("complete");

    const shortOfTheEnd = replay(straight, RULES, { stopAt: 120 });
    expect(strokeOutcome(shortOfTheEnd, RULES)).toBe("incomplete");

    const wandered = advanceTrace(straight, IDLE_TRACE, { x: 60, y: 90 }, RULES);
    expect(strokeOutcome(wandered, RULES)).toBe("left_target");
  });
});

describe("simplifyPolyline", () => {
  it("turns a noisy straight line into its two ends", () => {
    const noisy: Pt[] = [];
    for (let i = 0; i <= 40; i += 1) {
      noisy.push({ x: i * 5, y: (i % 3) - 1 });
    }
    expect(simplifyPolyline(noisy, 6)).toHaveLength(2);
  });

  it("keeps a corner that a hand actually made", () => {
    const bent: Pt[] = [];
    for (let i = 0; i <= 20; i += 1) bent.push({ x: i * 5, y: 0 });
    for (let i = 1; i <= 20; i += 1) bent.push({ x: 100, y: i * 5 });
    const simplified = simplifyPolyline(bent, 6);
    expect(simplified).toHaveLength(3);
    expect(simplified[1]!.x).toBeCloseTo(100, 6);
    expect(simplified[1]!.y).toBeCloseTo(0, 6);
  });
});
