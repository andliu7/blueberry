import { describe, expect, it } from "vitest";

import {
  BLUEBERRY_PROPOSED_SCALE,
  compileLayout,
  compiled,
  coveredTargets,
  EXACT_TOLERANCE,
  FINGERTIP_BIASED,
  FINGERTIP_BUDGET_DERIVED,
  FINGERTIP_CONSERVATIVE,
  FINGERTIP_PESSIMISTIC,
  IPHONE_12,
  isAmbiguousUnderFingertip,
  MINIMUM_HIT_TARGET_POINTS,
  misTapRate,
  misTapRateMonteCarlo,
  misTapSweep,
  sigmaForCaptureRate,
  tightestBondHandleLayout,
  tightestLonePairLayout,
  TOUCH_TOLERANCE,
  type TargetCircle,
} from "../src/geometry/index.js";

describe("sigmaForCaptureRate, the derivation the default sigma rests on", () => {
  it("inverts the Rayleigh capture probability exactly", () => {
    // P(R <= r) = 1 - exp(-r^2 / 2 sigma^2). Check the round trip.
    for (const rate of [0.5, 0.8, 0.95, 0.99]) {
      const sigma = sigmaForCaptureRate(MINIMUM_HIT_TARGET_POINTS, rate);
      const r = MINIMUM_HIT_TARGET_POINTS / 2;
      const recovered = 1 - Math.exp(-(r * r) / (2 * sigma * sigma));
      expect(recovered).toBeCloseTo(rate, 10);
    }
  });

  it("rejects a capture rate that is not a probability, rather than returning nonsense", () => {
    expect(() => sigmaForCaptureRate(44, 0)).toThrow();
    expect(() => sigmaForCaptureRate(44, 1)).toThrow();
    expect(() => sigmaForCaptureRate(44, 1.5)).toThrow();
  });

  it("puts the shipped default at 8.99 points, about 1.40 mm", () => {
    expect(FINGERTIP_BUDGET_DERIVED.sigmaX).toBeCloseTo(8.988, 3);
    expect(FINGERTIP_BUDGET_DERIVED.sigmaX / IPHONE_12.pointsPerMm).toBeCloseTo(1.4, 2);
  });

  it("keeps the model honest about what it is", () => {
    for (const model of [
      FINGERTIP_BUDGET_DERIVED,
      FINGERTIP_CONSERVATIVE,
      FINGERTIP_PESSIMISTIC,
      FINGERTIP_BIASED,
    ]) {
      expect(model.basis).toMatch(/model, not measurement/);
    }
  });
});

describe("the model is self consistent with the budget it was derived from", () => {
  // This is the strongest single check on the whole model. An isolated target at
  // exactly the minimum size must recover the capture rate the sigma was derived
  // from. It exercises the quadrature, the Gaussian weights, the normalisation,
  // and the hit test all at once, against a closed form answer.
  it("recovers 95 percent capture on a lone 44 point target", () => {
    const targets: readonly TargetCircle[] = [
      { id: "solo", kind: "atom", centre: { x: 0, y: 0 }, radius: MINIMUM_HIT_TARGET_POINTS / 2 },
    ];
    const layout = compileLayout(targets, EXACT_TOLERANCE);
    const report = misTapRate(layout, "solo", FINGERTIP_BUDGET_DERIVED);

    expect(report.successRate).toBeCloseTo(0.95, 3);
    expect(report.misTapRate).toBe(0); // nothing else to hit
    expect(report.missRate).toBeCloseTo(0.05, 3);
  });

  it("recovers other capture rates too, so the agreement is not a coincidence at one point", () => {
    for (const rate of [0.7, 0.9, 0.99]) {
      const sigma = sigmaForCaptureRate(MINIMUM_HIT_TARGET_POINTS, rate);
      const layout = compileLayout(
        [{ id: "solo", kind: "atom", centre: { x: 0, y: 0 }, radius: 22 }],
        EXACT_TOLERANCE,
      );
      const report = misTapRate(
        layout,
        "solo",
        { ...FINGERTIP_BUDGET_DERIVED, sigmaX: sigma, sigmaY: sigma },
        { stepFraction: 0.0625 },
      );
      expect(report.successRate).toBeCloseTo(rate, 2);
    }
  });
});

describe("the quadrature is trustworthy", () => {
  const layout = compiled(tightestLonePairLayout(BLUEBERRY_PROPOSED_SCALE));
  const intended = "Br:lone_pair:1";

  it("covers essentially all the probability mass at the default extent", () => {
    const report = misTapRate(layout, intended, FINGERTIP_BUDGET_DERIVED);
    expect(report.massCovered).toBeGreaterThan(0.999);
  });

  it("has converged at the shipped default step, checked against a step four times finer", () => {
    // The default is 0.0625. This is the check that justifies it, and it is run
    // under the pessimistic model because a wider distribution is where a coarse
    // lattice aliases against the decision boundaries worst.
    const shipped = misTapRate(layout, intended, FINGERTIP_PESSIMISTIC);
    const fine = misTapRate(layout, intended, FINGERTIP_PESSIMISTIC, { stepFraction: 0.015625 });
    expect(Math.abs(shipped.misTapRate - fine.misTapRate)).toBeLessThan(0.001);
    expect(Math.abs(shipped.successRate - fine.successRate)).toBeLessThan(0.001);
  });

  it("shows a coarser step would not have been good enough, so the default is not overkill", () => {
    const coarse = misTapRate(layout, intended, FINGERTIP_PESSIMISTIC, { stepFraction: 0.125 });
    const fine = misTapRate(layout, intended, FINGERTIP_PESSIMISTIC, { stepFraction: 0.015625 });
    expect(Math.abs(coarse.successRate - fine.successRate)).toBeGreaterThan(0.001);
  });

  it("agrees with an independent seeded monte carlo, on three seeds", () => {
    const samples = 1_000_000;
    const quadrature = misTapRate(layout, intended, FINGERTIP_PESSIMISTIC);

    // Tolerance is derived rather than picked: four standard errors of a
    // proportion at this sample size, plus 0.001 for the quadrature's own
    // residual error as measured by the convergence test above.
    const standardError = Math.sqrt(
      (quadrature.successRate * (1 - quadrature.successRate)) / samples,
    );
    const allowed = 4 * standardError + 0.001;
    expect(allowed).toBeLessThan(0.004); // the check is tight, not a rubber stamp

    for (const seed of [0xc0ffee, 0x5eed, 12345]) {
      const sampled = misTapRateMonteCarlo(layout, intended, FINGERTIP_PESSIMISTIC, samples, seed);
      expect(Math.abs(quadrature.successRate - sampled.successRate)).toBeLessThan(allowed);
      expect(Math.abs(quadrature.misTapRate - sampled.misTapRate)).toBeLessThan(allowed);
    }
    // 60s, not 5s. Three million samples under v8 coverage instrumentation exceeds the
    // default. The assertion itself is unchanged: quadrature and monte carlo must still agree
    // within four standard errors plus 0.001. Only the wall clock allowance moved, and only
    // because measuring coverage makes the run slower than running it does.
  }, 60_000);

  it("gives the same answer twice, because a reproducible number is the whole point", () => {
    const a = misTapRate(layout, intended, FINGERTIP_BUDGET_DERIVED);
    const b = misTapRate(layout, intended, FINGERTIP_BUDGET_DERIVED);
    expect(a.misTapRate).toBe(b.misTapRate);
    expect(a.successRate).toBe(b.successRate);
  });

  it("keeps the three outcomes a partition of one", () => {
    const report = misTapRate(layout, intended, FINGERTIP_PESSIMISTIC);
    expect(report.successRate + report.misTapRate + report.missRate).toBeCloseTo(1, 10);
  });

  it("attributes every mis tap to a named target, summing to the mis tap rate", () => {
    const report = misTapRate(layout, intended, FINGERTIP_PESSIMISTIC);
    const total = report.confusions.reduce((sum, c) => sum + c.rate, 0);
    expect(total).toBeCloseTo(report.misTapRate, 10);
    expect(report.confusions.every((c) => c.targetId !== intended)).toBe(true);
  });

  it("throws for a target that is not in the layout", () => {
    expect(() => misTapRate(layout, "nope", FINGERTIP_BUDGET_DERIVED)).toThrow();
    expect(() => misTapRateMonteCarlo(layout, "nope", FINGERTIP_BUDGET_DERIVED, 100)).toThrow();
  });
});

describe("the model responds to the things it claims to model", () => {
  const layout = compiled(tightestBondHandleLayout(BLUEBERRY_PROPOSED_SCALE));

  it("gets worse as sigma grows, monotonically", () => {
    const rows = misTapSweep(layout, "C:handle:upper", [
      FINGERTIP_BUDGET_DERIVED,
      FINGERTIP_CONSERVATIVE,
      FINGERTIP_PESSIMISTIC,
    ]);
    for (let i = 1; i < rows.length; i += 1) {
      const previous = rows[i - 1];
      const current = rows[i];
      if (previous === undefined || current === undefined) continue;
      expect(current.sigmaPoints).toBeGreaterThan(previous.sigmaPoints);
      expect(current.successRate).toBeLessThan(previous.successRate);
    }
  });

  it("moves taps toward the neighbour the bias points at", () => {
    // The two handles of a double bond sit one above the other. A downward bias
    // must push taps aimed at the upper one toward the lower one specifically,
    // not merely make things worse in general.
    const unbiased = misTapRate(layout, "C:handle:upper", FINGERTIP_BUDGET_DERIVED);
    const biased = misTapRate(layout, "C:handle:upper", FINGERTIP_BIASED);

    expect(biased.successRate).toBeLessThan(unbiased.successRate);
    const stolen = biased.confusions.find((c) => c.targetId === "C:handle:lower");
    const stolenBefore = unbiased.confusions.find((c) => c.targetId === "C:handle:lower");
    expect(stolen?.rate ?? 0).toBeGreaterThan(stolenBefore?.rate ?? 0);
  });

  it("gets better when the layout is given the touch slop it was designed with", () => {
    const withoutSlop = compiled(tightestBondHandleLayout(BLUEBERRY_PROPOSED_SCALE), EXACT_TOLERANCE);
    const withSlop = compiled(tightestBondHandleLayout(BLUEBERRY_PROPOSED_SCALE), TOUCH_TOLERANCE);

    const bare = misTapRate(withoutSlop, "C:handle:upper", FINGERTIP_PESSIMISTIC);
    const slopped = misTapRate(withSlop, "C:handle:upper", FINGERTIP_PESSIMISTIC);

    // Slop cannot reduce the mis tap rate between two equal siblings, since the
    // boundary between them does not move. What it does is convert misses into
    // hits. That distinction is why the two rates are reported separately.
    expect(slopped.missRate).toBeLessThan(bare.missRate);
    expect(slopped.successRate).toBeGreaterThan(bare.successRate);
  });
});

describe("isAmbiguousUnderFingertip, which is what a state machine's ambiguous flag should call", () => {
  const layout = compiled(tightestBondHandleLayout(BLUEBERRY_PROPOSED_SCALE));
  const upper = layout.byId.get("C:handle:upper");
  const lower = layout.byId.get("C:handle:lower");

  it("is false at a target's own centre", () => {
    expect(upper).toBeDefined();
    if (upper === undefined) return;
    expect(isAmbiguousUnderFingertip(layout, upper.target.centre, FINGERTIP_BUDGET_DERIVED)).toBe(
      false,
    );
  });

  it("is false in empty space, because nothing is not ambiguous", () => {
    expect(isAmbiguousUnderFingertip(layout, { x: -5000, y: -5000 }, FINGERTIP_BUDGET_DERIVED)).toBe(
      false,
    );
  });

  it("is true just on the winning side of a boundary between two siblings", () => {
    expect(upper).toBeDefined();
    expect(lower).toBeDefined();
    if (upper === undefined || lower === undefined) return;

    const midpoint = {
      x: (upper.target.centre.x + lower.target.centre.x) / 2,
      y: (upper.target.centre.y + lower.target.centre.y) / 2,
    };
    // A hair on the upper handle's side of the exact midpoint.
    const point = { x: midpoint.x, y: midpoint.y - 0.5 };
    expect(isAmbiguousUnderFingertip(layout, point, FINGERTIP_BUDGET_DERIVED)).toBe(true);
  });

  it("becomes false at the same point when the model is precise enough to separate them", () => {
    expect(upper).toBeDefined();
    expect(lower).toBeDefined();
    if (upper === undefined || lower === undefined) return;

    const midpoint = {
      x: (upper.target.centre.x + lower.target.centre.x) / 2,
      y: (upper.target.centre.y + lower.target.centre.y) / 2,
    };
    const point = { x: midpoint.x, y: midpoint.y - 0.5 };
    const precise = { ...FINGERTIP_BUDGET_DERIVED, sigmaX: 0.1, sigmaY: 0.1 };
    expect(isAmbiguousUnderFingertip(layout, point, precise)).toBe(false);
  });
});

describe("coveredTargets, occlusion only", () => {
  const layout = compiled(tightestBondHandleLayout(BLUEBERRY_PROPOSED_SCALE));

  it("includes the target under the point", () => {
    const upper = layout.byId.get("C:handle:upper");
    expect(upper).toBeDefined();
    if (upper === undefined) return;
    const covered = coveredTargets(layout, upper.target.centre, FINGERTIP_BUDGET_DERIVED);
    expect(covered.map((t) => t.id)).toContain("C:handle:upper");
  });

  it("covers more than the hit test selects, which is the whole reason it exists", () => {
    const upper = layout.byId.get("C:handle:upper");
    if (upper === undefined) return;
    const covered = coveredTargets(layout, upper.target.centre, FINGERTIP_BUDGET_DERIVED);
    expect(covered.length).toBeGreaterThan(1);
  });

  it("covers nothing when the finger is nowhere near anything", () => {
    expect(coveredTargets(layout, { x: -5000, y: -5000 }, FINGERTIP_BUDGET_DERIVED)).toHaveLength(0);
  });

  it("is symmetric for a circular contact patch", () => {
    const round = {
      ...FINGERTIP_BUDGET_DERIVED,
      contact: { semiMajor: 30, semiMinor: 30, angleDegrees: 0 },
    };
    const centre = { x: 200, y: 200 };
    const left = coveredTargets(compiled([
      { id: "a", kind: "atom", centre: { x: 165, y: 200 }, radius: 10 },
    ]), centre, round);
    const above = coveredTargets(compiled([
      { id: "a", kind: "atom", centre: { x: 200, y: 165 }, radius: 10 },
    ]), centre, round);
    expect(left.length).toBe(above.length);
  });
});
