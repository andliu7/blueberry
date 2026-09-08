/**
 * The tapered arrow's geometry. Pure functions only, no React, in line with
 * vitest.config.ts: the shape is testable, the JSX around it is a human gate.
 *
 * The load-bearing tests here MEASURE THE EMITTED PATH: they parse the
 * outline's vertices and compare drawn widths, drawn symmetry and drawn
 * placement against each other, never a profile constant against the same
 * constant forty lines up. The first round's suite pinned constants to
 * constants, and a critic proved it by deleting the taper and then the
 * arrowhead with all tests green. Each measured test below names the
 * mutation it exists to catch.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIDTH_PROFILE,
  FULL_PROFILE_CHORD_PX,
  MIN_CHORD_PX,
  bowControlPoint,
  cappedBow,
  taperedArrowGeometry,
  type Point2,
  type TaperedArrowGeometry,
} from "../pilot/arrow/taperedArrow";

/** Every number in a path's data, so a test can look for NaN or Infinity. */
function numbersIn(path: string): readonly number[] {
  const tokens = path.match(/-?\d+(\.\d+)?|NaN|Infinity|-Infinity/g);
  return (tokens ?? []).map((token) => Number(token));
}

/**
 * The outline's vertices, in path order. The path alphabet is pinned by its
 * own test below (one M, then L's, one Z), which is what makes this parser
 * sound: there are no curve commands to silently skip.
 */
function outlinePoints(path: string): Point2[] {
  return path
    .replace(/^M /, "")
    .replace(/ Z$/, "")
    .split(" L ")
    .map((chunk) => chunk.trim().split(" ").map(Number))
    .filter((pair) => pair.length === 2 && pair.every((value) => Number.isFinite(value)))
    .map((pair) => ({ x: pair[0] ?? 0, y: pair[1] ?? 0 }));
}

function dist(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

interface SpineSample {
  readonly p: Point2;
  /** Arc length from the curve's start. */
  readonly s: number;
}

/**
 * The spine, resampled here from the exported control point rather than by
 * calling back into the module, so a bug in the module's own sampler cannot
 * hide itself.
 */
function spineSamples(from: Point2, control: Point2, to: Point2, count = 600): SpineSample[] {
  const out: SpineSample[] = [];
  let s = 0;
  let prev: Point2 | null = null;
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const u = 1 - t;
    const p = {
      x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
    };
    if (prev !== null) s += dist(prev, p);
    out.push({ p, s });
    prev = p;
  }
  return out;
}

/** Nearest spine sample: where along the arc a vertex sits, and how far off it. */
function offsetOf(p: Point2, spine: readonly SpineSample[]): { s: number; d: number } {
  let best = { s: 0, d: Number.POSITIVE_INFINITY };
  for (const sample of spine) {
    const d = dist(p, sample.p);
    if (d < best.d) best = { s: sample.s, d };
  }
  return best;
}

/** Max offset among vertices whose arc position falls in [s0, s1]. */
function maxOffsetIn(
  offsets: readonly { s: number; d: number }[],
  s0: number,
  s1: number,
): number {
  let max = 0;
  for (const o of offsets) if (o.s >= s0 && o.s <= s1 && o.d > max) max = o.d;
  return max;
}

/**
 * The two barb tips, found as the vertex furthest off the spine and the
 * furthest vertex on the far side of it. Found by measurement, not by index,
 * so the finder keeps working if the emission order changes.
 */
function drawnBarbs(points: readonly Point2[], spine: readonly SpineSample[]): [Point2, Point2] {
  const ranked = [...points].sort((a, b) => offsetOf(b, spine).d - offsetOf(a, spine).d);
  const first = ranked[0];
  if (first === undefined) throw new Error("no vertices");
  const firstD = offsetOf(first, spine).d;
  const second = ranked.find((p) => dist(p, first) > firstD);
  if (second === undefined) throw new Error("no opposite barb");
  return [first, second];
}

/** Distance across the drawn barbs. */
function drawnBarbSpan(geometry: TaperedArrowGeometry, from: Point2, to: Point2): number {
  const spine = spineSamples(from, geometry.control, to);
  const [a, b] = drawnBarbs(outlinePoints(geometry.path), spine);
  return dist(a, b);
}

const ORIGIN: Point2 = { x: 0, y: 0 };

/** A long, gently bowed arrow with no trim: the workhorse for outline measurement. */
const LONG = { from: { x: 0, y: 0 }, to: { x: 200, y: 0 }, away: { x: 100, y: 400 } } as const;

describe("the outline is a single closed filled path", () => {
  it("starts with a move and ends with a close", () => {
    const geometry = taperedArrowGeometry({ from: { x: 0, y: 0 }, to: { x: 120, y: 0 }, away: { x: 60, y: 60 } });
    expect(geometry.degenerate).toBeNull();
    expect(geometry.path.startsWith("M ")).toBe(true);
    expect(geometry.path.trimEnd().endsWith("Z")).toBe(true);
  });

  it("has exactly one subpath, so shaft and head share one outline with no seam", () => {
    const geometry = taperedArrowGeometry({ from: { x: 0, y: 0 }, to: { x: 120, y: 0 }, away: { x: 60, y: 60 } });
    const moves = geometry.path.match(/M /g) ?? [];
    const closes = geometry.path.match(/Z/g) ?? [];
    expect(moves).toHaveLength(1);
    expect(closes).toHaveLength(1);
  });

  it("uses only M, L and Z, so every vertex is measurable with a ruler", () => {
    // This replaces a test that asserted the path contains no "marker",
    // which no path data can, and it is load bearing: the parser above
    // depends on there being no curve commands to skip.
    const number = "-?\\d+(\\.\\d+)?";
    const pair = `${number} ${number}`;
    const shape = new RegExp(`^M ${pair}( L ${pair})+ Z$`);
    for (const input of [
      { from: { x: 0, y: 0 }, to: { x: 120, y: 0 }, away: { x: 60, y: 60 } },
      { from: { x: 135, y: 120 }, to: { x: 165, y: 120 }, away: { x: 150, y: 210 } },
    ]) {
      expect(taperedArrowGeometry(input).path).toMatch(shape);
    }
  });
});

describe("the taper is drawn, not just declared", () => {
  // Mutation this catches: shaftHalfWidth returning a constant, which
  // deletes the taper. Round one's suite stayed green under exactly that.
  it("measures thinner near the tail than along the late shaft, on the emitted outline", () => {
    const geometry = taperedArrowGeometry(LONG);
    expect(geometry.degenerate).toBeNull();
    const spine = spineSamples(LONG.from, geometry.control, LONG.to);
    const offsets = outlinePoints(geometry.path).map((p) => offsetOf(p, spine));
    const L = geometry.lengthPx;
    const tailMax = maxOffsetIn(offsets, 0, 0.15 * L);
    const lateShaftMax = maxOffsetIn(offsets, 0.55 * L, 0.72 * L);
    // Drawn tail half width is about 4 here; the late shaft about 6.4. The
    // gap of one full px is what a constant-width mutation cannot produce.
    expect(tailMax).toBeGreaterThan(3);
    expect(tailMax).toBeLessThan(5.2);
    expect(tailMax).toBeLessThan(lateShaftMax - 1);
  });

  it("never narrows on the way from tail to shoulder", () => {
    const geometry = taperedArrowGeometry(LONG);
    const spine = spineSamples(LONG.from, geometry.control, LONG.to);
    const offsets = outlinePoints(geometry.path).map((p) => offsetOf(p, spine));
    const L = geometry.lengthPx;
    let previous = 0;
    for (let station = 0.1; station <= 0.7; station += 0.1) {
      const width = maxOffsetIn(offsets, (station - 0.04) * L, (station + 0.04) * L);
      expect(width).toBeGreaterThan(previous - 0.25);
      previous = Math.max(previous, width);
    }
  });
});

describe("the head is drawn, not just declared", () => {
  // Mutation this catches: barbs emitted at shoulder half width, which
  // erases the arrowhead and leaves a ribbon. Round one stayed green there too.
  it("puts the barbs well beyond the shaft, measured off the emitted outline", () => {
    const geometry = taperedArrowGeometry(LONG);
    const spine = spineSamples(LONG.from, geometry.control, LONG.to);
    const points = outlinePoints(geometry.path);
    const offsets = points.map((p) => offsetOf(p, spine));
    const L = geometry.lengthPx;
    const lateShaftMax = maxOffsetIn(offsets, 0.55 * L, 0.72 * L);
    const overallMax = Math.max(...offsets.map((o) => o.d));
    expect(overallMax).toBeGreaterThan(lateShaftMax * 1.8);
    // Half of headPx at full scale is 17; curvature and sampling can shave a
    // little off the measured offset, never add much.
    expect(overallMax).toBeGreaterThan(15);
    expect(overallMax).toBeLessThan(19);
  });

  it("spans the profile's head width across the barbs", () => {
    const geometry = taperedArrowGeometry(LONG);
    const span = drawnBarbSpan(geometry, LONG.from, LONG.to);
    expect(span).toBeGreaterThan(31);
    expect(span).toBeLessThan(37);
  });

  // Mutation this catches: headAxis returning its fallback tangent. That
  // regression is the hooked head the first build fixed by eye; on a bent
  // arrow the two barbs end up at visibly different distances from the tip.
  it("is symmetric about the barb-to-tip chord on a strongly bent arrow", () => {
    const input = { from: { x: 0, y: 0 }, to: { x: 120, y: 0 }, away: { x: 60, y: 400 }, bowMagnitude: 1000 } as const;
    const geometry = taperedArrowGeometry(input);
    expect(geometry.degenerate).toBeNull();
    // The bow is at its 32 percent cap here, the strongest legal bend.
    expect(geometry.bowPx).toBeCloseTo(38.4, 5);
    const spine = spineSamples(input.from, geometry.control, input.to);
    const [barbA, barbB] = drawnBarbs(outlinePoints(geometry.path), spine);
    const reachA = dist(barbA, geometry.tip);
    const reachB = dist(barbB, geometry.tip);
    // Isoceles by construction; the tangent mutation skews this by ~5 px.
    expect(Math.abs(reachA - reachB)).toBeLessThan(0.35);
  });

  // Mutation this catches: dropping the notch (shaft stopping AT the barb
  // line), which turns the head back into the flat-backed triangle that
  // reads as a wedge bond on a chemistry canvas.
  it("notches the rear of the head: the shaft runs on past the barb line", () => {
    const geometry = taperedArrowGeometry(LONG);
    const spine = spineSamples(LONG.from, geometry.control, LONG.to);
    const points = outlinePoints(geometry.path);
    const [barbA, barbB] = drawnBarbs(points, spine);
    const barbMid = { x: (barbA.x + barbB.x) / 2, y: (barbA.y + barbB.y) / 2 };
    const axisLen = dist(barbMid, geometry.tip);
    const axis = { x: (geometry.tip.x - barbMid.x) / axisLen, y: (geometry.tip.y - barbMid.y) / axisLen };
    const forwardOf = (p: Point2): number => (p.x - barbMid.x) * axis.x + (p.y - barbMid.y) * axis.y;
    // The vertices adjacent to each barb on the shaft side are the shoulder
    // corners, and they sit forward of the barb line by the notch depth.
    const indexA = points.findIndex((p) => p === barbA);
    const indexB = points.findIndex((p) => p === barbB);
    const shoulderSideA = points[Math.min(indexA, indexB) - 1];
    const shoulderSideB = points[Math.max(indexA, indexB) + 1];
    expect(shoulderSideA).toBeDefined();
    expect(shoulderSideB).toBeDefined();
    expect(forwardOf(shoulderSideA ?? barbMid)).toBeGreaterThan(2);
    expect(forwardOf(shoulderSideB ?? barbMid)).toBeGreaterThan(2);
  });
});

describe("the tail cap is round", () => {
  // Mutation this catches: dropping the cap emission, which restores the
  // flat guillotine cut the reference does not have.
  it("puts vertices behind the tail, each one tail-half-width from its centre", () => {
    const geometry = taperedArrowGeometry(LONG);
    // For a quadratic the tangent at the start points at the control point.
    const dirLen = dist(LONG.from, geometry.control);
    const dir = { x: (geometry.control.x - LONG.from.x) / dirLen, y: (geometry.control.y - LONG.from.y) / dirLen };
    const behind = outlinePoints(geometry.path).filter(
      (p) => (p.x - geometry.tail.x) * dir.x + (p.y - geometry.tail.y) * dir.y < -0.5,
    );
    expect(behind.length).toBeGreaterThanOrEqual(3);
    for (const p of behind) {
      expect(dist(p, geometry.tail)).toBeCloseTo(geometry.tailHalfWidthPx, 1);
    }
    // The apex of the cap reaches nearly a full half width back.
    const deepest = Math.min(
      ...behind.map((p) => (p.x - geometry.tail.x) * dir.x + (p.y - geometry.tail.y) * dir.y),
    );
    expect(deepest).toBeLessThan(-0.8 * geometry.tailHalfWidthPx);
  });
});

describe("the whole profile scales with the chord", () => {
  // Mutation this catches: profileForChord returning the profile unscaled,
  // which is round one's defect in the 34 to 60 px band: an undersized
  // shaft carrying a full-size head.
  it("draws a half-length arrow with a half-size head", () => {
    const at = (chord: number): number => {
      const input = { from: { x: 0, y: 0 }, to: { x: chord, y: 0 }, away: { x: chord / 2, y: 300 } } as const;
      const geometry = taperedArrowGeometry(input);
      expect(geometry.degenerate).toBeNull();
      return drawnBarbSpan(geometry, input.from, input.to);
    };
    const span45 = at(45);
    const span90 = at(90);
    expect(span45 / span90).toBeGreaterThan(0.44);
    expect(span45 / span90).toBeLessThan(0.56);
  });

  it("stops scaling at the profile chord, so long sweeps share one head size", () => {
    const at = (chord: number): number => {
      const input = { from: { x: 0, y: 0 }, to: { x: chord, y: 0 }, away: { x: chord / 2, y: 300 } } as const;
      return drawnBarbSpan(taperedArrowGeometry(input), input.from, input.to);
    };
    expect(Math.abs(at(FULL_PROFILE_CHORD_PX) - at(200))).toBeLessThan(0.8);
  });
});

describe("no full ribbon is ever drawn under the minimum chord", () => {
  // Mutation this catches: MIN_CHORD_PX back to 1, which is round one's
  // hook, blob and splinter band. Same threshold, same meaning as
  // hitLayout.ts MIN_CHORD.
  it("draws a head alone just under 34 px and a full arrow at 34", () => {
    const under = taperedArrowGeometry({ from: { x: 0, y: 0 }, to: { x: 33.5, y: 0 }, away: { x: 17, y: 300 } });
    const at = taperedArrowGeometry({ from: { x: 0, y: 0 }, to: { x: MIN_CHORD_PX, y: 0 }, away: { x: 17, y: 300 } });
    expect(under.degenerate).toBe("chord-shorter-than-head");
    expect(outlinePoints(under.path)).toHaveLength(4);
    expect(at.degenerate).toBeNull();
    expect(outlinePoints(at.path).length).toBeGreaterThan(10);
  });

  it("hugs the landing with the scaled head, one frame for size and aim", () => {
    // Round one scaled this case by ARC length while anchoring on the CHORD,
    // which a critic caught emitting a triangle 21.7 px across and 1 px long.
    const to = { x: 30, y: 0 };
    const geometry = taperedArrowGeometry({ from: { x: 0, y: 0 }, to, away: { x: 15, y: 300 } });
    expect(geometry.degenerate).toBe("chord-shorter-than-head");
    const points = outlinePoints(geometry.path);
    expect(points).toHaveLength(4);
    // Every vertex sits within the scaled head length of the landing.
    for (const p of points) expect(dist(p, to)).toBeLessThan(13);
    // Isoceles about the straight travel: barbs equidistant from the tip.
    const [barbA, tip, barbB, rearMid] = points;
    expect(dist(barbA ?? to, tip ?? to)).toBeCloseTo(dist(barbB ?? to, tip ?? to), 1);
    // And the rear is notched: the rear midpoint sits forward of the barbs.
    const barbMidX = ((barbA?.x ?? 0) + (barbB?.x ?? 0)) / 2;
    expect((rearMid?.x ?? 0) - barbMidX).toBeGreaterThan(1);
  });

  // Mutation this catches: dropping the rim swing, the half of hitLayout's
  // short-arrow rule the first draft failed to copy. This input is the
  // corpus's most common arrow: a push onto the atom one 72 px bond away,
  // whose straight landing leaves only 17 px of chord.
  it("swings the landing around the sink rim until the chord reaches 34", () => {
    const input = { from: { x: 0, y: 0 }, to: { x: 38, y: 0 }, away: { x: 19, y: 300 }, sinkRadiusPx: 21 } as const;
    const geometry = taperedArrowGeometry(input);
    expect(geometry.degenerate).toBeNull();
    // The tip still lands ON the rim of the sink it was aimed at,
    expect(dist(geometry.tip, input.to)).toBeCloseTo(21, 0);
    // but swung to the far side from the molecule,
    expect(geometry.tip.y).toBeLessThan(-1);
    // and far enough out that the drawn chord reads as an arrow.
    expect(dist(input.from, geometry.tip)).toBeGreaterThan(MIN_CHORD_PX - 0.7);
  });

  it("leaves a long arrow's landing alone", () => {
    const shared = { from: { x: 0, y: 0 }, to: { x: 200, y: 0 }, away: { x: 100, y: 300 } } as const;
    const trimmed = taperedArrowGeometry({ ...shared, sinkRadiusPx: 30 });
    // Straight-line trim leaves 170 px of chord, so no swing: the tip sits
    // between source and sink centre, near the straight rim point.
    expect(trimmed.tip.x).toBeLessThan(200 - 25);
    expect(Math.abs(trimmed.tip.y)).toBeLessThan(12);
  });
});

describe("the bow side follows the centroid", () => {
  it("flips when the centroid moves to the other side of the chord", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const below = taperedArrowGeometry({ from, to, away: { x: 50, y: 80 } });
    const above = taperedArrowGeometry({ from, to, away: { x: 50, y: -80 } });
    // Away below the chord pushes the control point above it, and vice versa.
    expect(below.control.y).toBeLessThan(0);
    expect(above.control.y).toBeGreaterThan(0);
    expect(Math.sign(below.control.y)).toBe(-Math.sign(above.control.y));
  });

  it("moves the drawn arrow with it, not just the control point", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const below = taperedArrowGeometry({ from, to, away: { x: 50, y: 80 } });
    const above = taperedArrowGeometry({ from, to, away: { x: 50, y: -80 } });
    expect(below.path).not.toEqual(above.path);
    expect(below.shoulder.y).toBeLessThan(0);
    expect(above.shoulder.y).toBeGreaterThan(0);
  });

  it("bows upward for a degenerate chord rather than picking a side at random", () => {
    const control = bowControlPoint({ x: 10, y: 10 }, { x: 10, y: 10 }, { x: 0, y: 0 }, 30);
    expect(control).toEqual({ x: 10, y: -20 });
  });
});

describe("the cap and the floor, copied from hitLayout bowAwayFrom", () => {
  it("caps a long chord at 32 percent of its length", () => {
    expect(cappedBow(1000, 200)).toBeCloseTo(64, 6);
  });

  it("floors a short chord at 18 so it does not read as a tick", () => {
    // 40 px chord at 32 percent is 12.8, below the floor.
    expect(cappedBow(1000, 40)).toBeCloseTo(18, 6);
  });

  it("never exceeds the requested magnitude", () => {
    expect(cappedBow(10, 400)).toBeCloseTo(10, 6);
    expect(cappedBow(10, 20)).toBeCloseTo(10, 6);
  });

  it("reports the capped bow it actually used", () => {
    const geometry = taperedArrowGeometry({
      from: { x: 0, y: 0 },
      to: { x: 200, y: 0 },
      away: { x: 100, y: 300 },
      bowMagnitude: 1000,
    });
    expect(geometry.bowPx).toBeCloseTo(64, 6);
    // The control point sits that far off the chord midpoint.
    expect(Math.abs(geometry.control.y)).toBeCloseTo(64, 6);
  });
});

describe("the degenerate cases are handled, not stumbled into", () => {
  it("draws nothing for a zero length chord and puts no NaN in the path", () => {
    const geometry = taperedArrowGeometry({ from: { x: 40, y: 40 }, to: { x: 40, y: 40 }, away: ORIGIN });
    expect(geometry.degenerate).toBe("zero-length-chord");
    expect(geometry.path).toBe("");
    expect(numbersIn(geometry.path).every(Number.isFinite)).toBe(true);
  });

  it("puts no NaN in the path for a near zero chord either", () => {
    const geometry = taperedArrowGeometry({ from: { x: 0, y: 0 }, to: { x: 0.2, y: 0 }, away: ORIGIN });
    expect(geometry.path).not.toContain("NaN");
    expect(numbersIn(geometry.path).every(Number.isFinite)).toBe(true);
  });

  it("draws a scaled head and no shaft when the chord is shorter than the head", () => {
    const geometry = taperedArrowGeometry({
      from: { x: 0, y: 0 },
      to: { x: 14, y: 0 },
      away: { x: 7, y: 60 },
      width: { headLengthPx: 40 },
    });
    expect(geometry.degenerate).toBe("chord-shorter-than-head");
    // Four vertices: barb, tip, barb, and the rear notch point.
    expect(outlinePoints(geometry.path)).toHaveLength(4);
    expect(geometry.path.trimEnd().endsWith("Z")).toBe(true);
    expect(geometry.headHalfWidthPx).toBeLessThan(DEFAULT_WIDTH_PROFILE.headPx / 2);
    expect(geometry.headHalfWidthPx).toBeGreaterThan(0);
    expect(numbersIn(geometry.path).every(Number.isFinite)).toBe(true);
  });

  it("draws nothing when the sink radius swallows the whole curve", () => {
    const geometry = taperedArrowGeometry({
      from: { x: 0, y: 0 },
      to: { x: 60, y: 0 },
      away: { x: 30, y: 90 },
      sinkRadiusPx: 400,
    });
    expect(geometry.degenerate).toBe("sink-swallows-curve");
    expect(geometry.path).toBe("");
    expect(geometry.lengthPx).toBe(0);
  });

  it("trims the head end back to the sink rim when the sink is smaller than the curve", () => {
    const shared = { from: { x: 0, y: 0 }, to: { x: 200, y: 0 }, away: { x: 100, y: 300 } } as const;
    const untrimmed = taperedArrowGeometry(shared);
    const trimmed = taperedArrowGeometry({ ...shared, sinkRadiusPx: 30 });
    expect(trimmed.degenerate).toBeNull();
    expect(trimmed.lengthPx).toBeLessThan(untrimmed.lengthPx);
    // The tip now stands off the sink by about the radius asked for.
    expect(Math.hypot(trimmed.tip.x - 200, trimmed.tip.y - 0)).toBeCloseTo(30, 0);
  });

  it("never emits a non finite number in any of a spread of shapes", () => {
    const cases: readonly { from: Point2; to: Point2; away: Point2; sinkRadiusPx: number }[] = [
      { from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, away: { x: 0, y: 0 } as Point2, sinkRadiusPx: 0 },
      { from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, away: { x: 0, y: 0 }, sinkRadiusPx: 0 },
      { from: { x: 0, y: 0 }, to: { x: 3, y: 4 }, away: { x: 3, y: 4 }, sinkRadiusPx: 2 },
      { from: { x: -50, y: 12 }, to: { x: 300, y: -80 }, away: { x: 0, y: 0 }, sinkRadiusPx: 21 },
      { from: { x: 10, y: 10 }, to: { x: 10, y: 200 }, away: { x: 10, y: 105 }, sinkRadiusPx: 0 },
    ];
    for (const one of cases) {
      const geometry = taperedArrowGeometry(one);
      expect(geometry.path).not.toContain("NaN");
      expect(geometry.path).not.toContain("Infinity");
      expect(numbersIn(geometry.path).every(Number.isFinite)).toBe(true);
    }
  });
});

describe("rendering is deterministic", () => {
  it("returns the identical path string for identical inputs", () => {
    const input = {
      from: { x: 12.5, y: -3.25 },
      to: { x: 173.75, y: 61.5 },
      away: { x: 90, y: 200 },
      bowMagnitude: 40,
      sinkRadiusPx: 21,
    } as const;
    const a = taperedArrowGeometry(input);
    const b = taperedArrowGeometry({ ...input, from: { ...input.from }, to: { ...input.to }, away: { ...input.away } });
    expect(a.path).toEqual(b.path);
    expect(a.path.length).toBeGreaterThan(0);
  });

  it("rounds to two places, so no path carries float noise", () => {
    const geometry = taperedArrowGeometry({ from: { x: 0, y: 0 }, to: { x: 137, y: 41 }, away: { x: 60, y: 200 } });
    for (const token of geometry.path.split(/[ML Z]+/).filter((chunk) => chunk.length > 0)) {
      const decimals = token.split(".")[1];
      expect(decimals === undefined || decimals.length <= 2).toBe(true);
    }
  });
});
