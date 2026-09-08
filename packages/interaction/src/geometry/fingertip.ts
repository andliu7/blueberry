/**
 * THE SYNTHETIC FINGERTIP MODEL.
 *
 * This is the measured half of the mobile touch ergonomics win axis in
 * CLAUDE.md. It answers one question: given a layout and a target the student
 * meant to hit, what is the probability the tap resolves to something else.
 *
 * ============================================================================
 * READ THIS BEFORE QUOTING ANY NUMBER THIS FILE PRODUCES
 * ============================================================================
 *
 * Everything here is a MODEL. No number produced by this file is an observation
 * of a human being tapping a screen. Nobody has been tested. What the model does
 * is take a stated assumption about how taps scatter, propagate it exactly
 * through the real hit testing code in this package, and report the consequence.
 * That is worth a great deal, because it turns a layout question into an
 * arithmetic question and it catches a layout that is geometrically hostile
 * before anyone builds it. It is not a usability study and must never be
 * reported as one. Every result object carries a `basis` field saying so, and
 * that field exists so a number cannot be lifted out of a report and quoted as
 * measured.
 *
 * ----------------------------------------------------------------------------
 * THE MODEL
 * ----------------------------------------------------------------------------
 *
 * A tap is modelled as
 *
 *     reported = intendedCentre + bias + N(0, diag(sigmaX^2, sigmaY^2))
 *
 * That is, a constant systematic offset plus independent Gaussian scatter, and
 * the position the platform reports is what the hit test sees.
 *
 * WHAT IT IS BASED ON. Three results, all about touch input rather than about
 * chemistry:
 *
 *   1. Touch endpoints on a phone are approximately bivariate Gaussian about the
 *      target, and the spread decomposes into a part that grows with target size
 *      and a part that does not. Bi, Li and Zhai, "FFitts law: modeling finger
 *      touch with Fitts' law", CHI 2013, and the dual Gaussian distribution
 *      model in Bi and Zhai's related work. This is the shape of the scatter
 *      term.
 *   2. The point a user believes they are touching is offset from the contact
 *      centroid the digitiser reports, and that offset is largely a stable
 *      per-user quantity set by finger posture rather than noise. Holz and
 *      Baudisch, "The generalized perceived input point model", CHI 2010, and
 *      "Understanding touch", CHI 2011. This is the bias term, and it is the
 *      reason the model has a bias term at all rather than assuming taps are
 *      centred on what the user aimed at.
 *   3. A fingertip contacts over an area of several millimetres, not a point.
 *      This is why `contact` exists. See the limit on it below.
 *
 * WHAT IT IS NOT BASED ON. The published coefficients from those papers are NOT
 * reproduced here, because they were fitted on specific devices with specific
 * task instructions and quoting them from memory as though they were this app's
 * parameters would be exactly the invented number this file is written to avoid.
 * Instead sigma is an explicit, required parameter of every model object, and
 * the default is DERIVED from a budget this repository already committed to. The
 * derivation is written out in `sigmaForCaptureRate` below so it can be checked
 * and disagreed with.
 *
 * ----------------------------------------------------------------------------
 * LIMITS, PLAINLY
 * ----------------------------------------------------------------------------
 *
 *   - Sigma is an assumption. It is the single parameter every number here is
 *     most sensitive to. Always report the sweep alongside the point estimate;
 *     `misTapSweep` exists for that and the geometry report test uses it.
 *   - Independent x and y with no correlation. Real touch scatter on a phone
 *     held in one hand is reported as anisotropic and the axes are not
 *     necessarily screen aligned. sigmaX and sigmaY are separate parameters so
 *     anisotropy can be expressed; correlation cannot, and a layout whose tight
 *     spacing runs diagonally will be modelled slightly optimistically.
 *   - A single Gaussian has no outlier tail. Real tapping produces occasional
 *     gross errors, a slipped thumb or a tap meant for something else entirely,
 *     that a Gaussian assigns essentially zero probability. The real mis tap
 *     rate is therefore higher than this model's by whatever that rate is, and
 *     this model cannot tell you what it is.
 *   - No time, no motion, no fatigue, no target repetition, no visual occlusion
 *     by the finger itself, no one handed reach effects, no screen edges.
 *   - The contact ellipse does not enter the mis tap arithmetic at all. Its
 *     dimensions are the least defensible numbers in the file, being commonly
 *     cited ranges rather than anything fitted, so they are confined to
 *     `coveredTargets`, which answers "what did the finger physically cover" for
 *     a disambiguation affordance. Keeping the shakiest number out of the
 *     load bearing calculation is deliberate.
 *   - The model assumes the student aimed at the target's centre. A student
 *     aiming at the visible edge of a lone pair dot is not modelled.
 */

import { hitTest } from "./hit-test.js";
import type { CompiledLayout, TargetCircle } from "./targets.js";
import {
  IPHONE_12,
  MINIMUM_HIT_TARGET_POINTS,
  distance,
  type Point,
  type ReferenceDevice,
} from "./units.js";

/** The elliptical contact patch. Occlusion only, never the mis tap arithmetic. */
export interface ContactPatch {
  /** Half the long axis, points. */
  readonly semiMajor: number;
  /** Half the short axis, points. */
  readonly semiMinor: number;
  /** Long axis orientation, degrees counter clockwise from the x axis. */
  readonly angleDegrees: number;
}

export interface FingertipModel {
  readonly label: string;
  /** One line saying where the parameters came from. Carried into reports. */
  readonly basis: string;
  readonly device: ReferenceDevice;
  /** Scatter along x, points. */
  readonly sigmaX: number;
  /** Scatter along y, points. */
  readonly sigmaY: number;
  /** Constant systematic offset added to the aim point, points. */
  readonly bias: Point;
  readonly contact: ContactPatch;
}

/**
 * The sigma at which an isolated circular target of `diameter` captures
 * `captureRate` of unbiased taps.
 *
 * For isotropic bivariate normal scatter the radial miss distance is Rayleigh
 * distributed, so P(R <= r) = 1 - exp(-r^2 / (2 sigma^2)), which inverts to
 *
 *     sigma = r / sqrt(-2 ln(1 - captureRate))
 *
 * with r the target radius. Exact, given the isotropy assumption.
 */
export function sigmaForCaptureRate(diameter: number, captureRate: number): number {
  if (!(captureRate > 0 && captureRate < 1)) {
    throw new Error(`captureRate must be strictly between 0 and 1, got ${captureRate}`);
  }
  return diameter / 2 / Math.sqrt(-2 * Math.log(1 - captureRate));
}

/**
 * The default. Sigma is derived from the 44 point budget in CLAUDE.md by
 * reading that budget as "an isolated target at the minimum size should capture
 * 95 percent of taps", which gives sigma = 22 / 2.4477 = 8.988 points, about
 * 1.40 mm on an iPhone point.
 *
 * BE CLEAR ABOUT WHAT THIS IS. It is internally consistent with a budget this
 * repository already accepted, and it is fully stated so it can be argued with.
 * It is not a measurement, and the 95 percent reading of the 44 point guideline
 * is an interpretation, not something Apple publishes. Published touch endpoint
 * scatter for speeded tapping is commonly reported larger than 1.4 mm, which is
 * why `FINGERTIP_CONSERVATIVE` and `FINGERTIP_PESSIMISTIC` exist and why every
 * report in this package quotes the sweep rather than this row alone.
 */
export const FINGERTIP_BUDGET_DERIVED: FingertipModel = {
  label: "budget derived, unbiased",
  basis:
    "model, not measurement. sigma derived from the 44 point budget at a 95 percent " +
    "capture reading. no bias. see fingertip.ts header",
  device: IPHONE_12,
  sigmaX: sigmaForCaptureRate(MINIMUM_HIT_TARGET_POINTS, 0.95),
  sigmaY: sigmaForCaptureRate(MINIMUM_HIT_TARGET_POINTS, 0.95),
  bias: { x: 0, y: 0 },
  contact: { semiMajor: 4.5 * IPHONE_12.pointsPerMm, semiMinor: 3.5 * IPHONE_12.pointsPerMm, angleDegrees: 90 },
};

/** Sigma of 2.0 mm. Inside the range commonly reported for finger tapping. */
export const FINGERTIP_CONSERVATIVE: FingertipModel = {
  ...FINGERTIP_BUDGET_DERIVED,
  label: "conservative, sigma 2.0 mm",
  basis:
    "model, not measurement. sigma set to 2.0 mm, inside the range commonly reported " +
    "for finger tapping endpoint scatter. no bias",
  sigmaX: 2.0 * IPHONE_12.pointsPerMm,
  sigmaY: 2.0 * IPHONE_12.pointsPerMm,
};

/** Sigma of 3.0 mm. The upper end of the commonly reported range. */
export const FINGERTIP_PESSIMISTIC: FingertipModel = {
  ...FINGERTIP_BUDGET_DERIVED,
  label: "pessimistic, sigma 3.0 mm",
  basis:
    "model, not measurement. sigma set to 3.0 mm, the upper end of the range commonly " +
    "reported for finger tapping endpoint scatter. no bias",
  sigmaX: 3.0 * IPHONE_12.pointsPerMm,
  sigmaY: 3.0 * IPHONE_12.pointsPerMm,
};

/**
 * Budget derived scatter plus a 1 mm downward systematic offset.
 *
 * The literature establishes that a stable per-user offset exists and matters.
 * It does not establish that the offset is 1 mm downward for every student, and
 * this preset does not claim that. It is here so a layout can be checked for
 * whether it survives a bias at all, since a layout that is fine only when the
 * tapper is perfectly calibrated is a fragile layout.
 */
export const FINGERTIP_BIASED: FingertipModel = {
  ...FINGERTIP_BUDGET_DERIVED,
  label: "budget derived, 1 mm downward bias",
  basis:
    "model, not measurement. budget derived sigma plus a 1 mm downward systematic " +
    "offset, magnitude and direction chosen as a stress case not fitted to anyone",
  bias: { x: 0, y: 1.0 * IPHONE_12.pointsPerMm },
};

export interface Confusion {
  readonly targetId: string;
  readonly rate: number;
}

export interface MisTapReport {
  readonly intendedTargetId: string;
  readonly model: string;
  /** Always says model, never measurement. Do not remove this field. */
  readonly basis: string;
  readonly profile: string;
  /** Probability the tap resolves to the intended target. */
  readonly successRate: number;
  /**
   * THE MIS TAP RATE. Probability the tap resolves to a DIFFERENT target.
   * This is the number the Phase 2 exit condition asks for. It deliberately
   * excludes taps that hit nothing, which are reported separately, because
   * hitting empty space and hitting the wrong atom are different failures with
   * different consequences for a student.
   */
  readonly misTapRate: number;
  /** Probability the tap resolves to no target at all. */
  readonly missRate: number;
  /** Which targets stole the taps, worst first. */
  readonly confusions: readonly Confusion[];
  /** How the number was computed, so it can be reproduced. */
  readonly method: string;
  /**
   * Fraction of the Gaussian's probability mass the quadrature grid covered
   * before renormalisation. Below about 0.999 the truncation is distorting the
   * answer and the extent should be raised.
   */
  readonly massCovered: number;
}

export interface QuadratureOptions {
  /** Grid step as a fraction of sigma. Smaller is more accurate and slower. */
  readonly stepFraction?: number;
  /** Half width of the grid in sigmas. */
  readonly extentSigmas?: number;
}

/**
 * Grid step, as a fraction of sigma. MEASURED, not guessed: on the tightest lone
 * pair layout under the pessimistic model, the quadrature's success rate at
 * successive steps runs
 *
 *   0.25      0.661755
 *   0.125     0.654537
 *   0.0625    0.656934
 *   0.03125   0.656270
 *   0.015625  0.656613
 *
 * so it settles around 0.6566. At 0.125 the answer is off by about 0.002, which
 * is the same order as the Monte Carlo noise the cross check is trying to see
 * past, and that is too close for a number the exit condition quotes. At 0.0625
 * the error is about 0.0003 and the cost is 161 by 161 cells, which is still
 * milliseconds. The convergence test in `geometry-fingertip.test.ts` re-derives
 * this, so if the hit test changes shape the number is checked again rather than
 * inherited.
 */
const DEFAULT_STEP_FRACTION = 0.0625;
const DEFAULT_EXTENT_SIGMAS = 5;

/**
 * Mis tap rate by deterministic quadrature over the tap distribution.
 *
 * WHY QUADRATURE AND NOT MONTE CARLO. The exit condition asks for a number that
 * a reviewer can reproduce. Quadrature over a fixed lattice returns bit
 * identical output for identical input with no seed to agree on and no sampling
 * noise to mistake for a real change between two layouts. Monte Carlo is here
 * too, as `misTapRateMonteCarlo`, and the two agreeing is stronger evidence than
 * either alone; the report test runs both.
 *
 * The grid is a lattice of cells over the tap distribution, each weighted by the
 * bivariate normal density at its centre times the cell area, and each resolved
 * through the real `hitTest`. Weights are renormalised by the covered mass so
 * truncation at the grid edge does not silently deflate every rate, and the
 * covered mass is reported so the truncation is visible.
 *
 * Cost is O(cells * targets). At the defaults that is 81 by 81 cells, so 6561
 * hit tests per call, which is milliseconds for a mechanism sized layout.
 */
export function misTapRate(
  layout: CompiledLayout,
  intendedTargetId: string,
  model: FingertipModel,
  options: QuadratureOptions = {},
): MisTapReport {
  const intended = layout.byId.get(intendedTargetId);
  if (intended === undefined) {
    throw new Error(`no target with id ${intendedTargetId} in layout`);
  }

  const stepFraction = options.stepFraction ?? DEFAULT_STEP_FRACTION;
  const extentSigmas = options.extentSigmas ?? DEFAULT_EXTENT_SIGMAS;

  const centre: Point = {
    x: intended.target.centre.x + model.bias.x,
    y: intended.target.centre.y + model.bias.y,
  };

  const stepX = model.sigmaX * stepFraction;
  const stepY = model.sigmaY * stepFraction;
  const halfCells = Math.ceil(extentSigmas / stepFraction);

  let totalWeight = 0;
  let successWeight = 0;
  let missWeight = 0;
  // Accumulated directly rather than recovered as total minus success minus
  // miss. The subtraction leaves floating point residue on the order of 1e-16,
  // so a layout with genuinely nothing to mis tap onto reported a mis tap rate
  // of 4e-16 instead of zero, and a report that says "almost but not quite
  // impossible" when it means "impossible" is a report that gets argued with.
  let misTapWeight = 0;
  const confusionWeight = new Map<string, number>();

  for (let i = -halfCells; i <= halfCells; i += 1) {
    const dx = i * stepX;
    const wx = Math.exp((-0.5 * dx * dx) / (model.sigmaX * model.sigmaX));
    for (let j = -halfCells; j <= halfCells; j += 1) {
      const dy = j * stepY;
      const wy = Math.exp((-0.5 * dy * dy) / (model.sigmaY * model.sigmaY));
      const weight = wx * wy;
      totalWeight += weight;

      const result = hitTest(layout, { x: centre.x + dx, y: centre.y + dy });
      if (result === null) {
        missWeight += weight;
      } else if (result.target.id === intendedTargetId) {
        successWeight += weight;
      } else {
        misTapWeight += weight;
        confusionWeight.set(
          result.target.id,
          (confusionWeight.get(result.target.id) ?? 0) + weight,
        );
      }
    }
  }

  // The lattice sum of the un-normalised Gaussian weights approximates
  // 2 pi sigmaX sigmaY / (stepX stepY) when the grid covers the whole
  // distribution. The ratio of the two is the mass actually covered.
  const fullMass = (2 * Math.PI * model.sigmaX * model.sigmaY) / (stepX * stepY);
  const massCovered = totalWeight / fullMass;

  const confusions: Confusion[] = [...confusionWeight.entries()]
    .map(([targetId, weight]) => ({ targetId, rate: weight / totalWeight }))
    .sort((a, b) => b.rate - a.rate);

  return {
    intendedTargetId,
    model: model.label,
    basis: model.basis,
    profile: layout.profile.label,
    successRate: successWeight / totalWeight,
    misTapRate: misTapWeight / totalWeight,
    missRate: missWeight / totalWeight,
    confusions,
    method:
      `deterministic quadrature, step ${stepFraction} sigma, extent ${extentSigmas} sigma, ` +
      `${(2 * halfCells + 1) ** 2} cells`,
    massCovered,
  };
}

/**
 * Is this hit close enough to a boundary that the fingertip model cannot
 * separate the two candidates?
 *
 * THIS IS THE FUNCTION A STATE MACHINE'S `ambiguous` FLAG SHOULD CALL, and it
 * exists so that flag is not a magic number someone picked.
 *
 * The definition is operational rather than arbitrary: take the point that was
 * actually reported, step it one standard deviation of the model's scatter
 * straight toward the runner up, and ask whether the winner changes. If it does,
 * then a tap that a student would have made no differently, given how precisely
 * the model says a person can tap, would have selected the other target. That is
 * what "a fingertip cannot separate them" means, stated so it can be checked.
 *
 * One extra `hitTest` per call, so it is cheap enough to run on a pointer down.
 * Do not run it on every pointer move; nothing acts on ambiguity mid-drag.
 *
 * Returns false when nothing contested the hit, and false when there was no hit
 * at all. Empty space is unambiguous.
 */
export function isAmbiguousUnderFingertip(
  layout: CompiledLayout,
  point: Point,
  model: FingertipModel,
): boolean {
  const result = hitTest(layout, point);
  if (result === null || result.runnerUp === null) return false;

  const toward = result.runnerUp.target.centre;
  const dx = toward.x - point.x;
  const dy = toward.y - point.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return true;

  // One sigma along the direction of travel. sigmaX and sigmaY may differ, so
  // the step is the model's scatter resolved onto that direction rather than
  // either axis alone.
  const ux = dx / length;
  const uy = dy / length;
  const sigmaAlong = Math.sqrt(
    (ux * model.sigmaX) ** 2 + (uy * model.sigmaY) ** 2,
  );

  const stepped = hitTest(layout, { x: point.x + ux * sigmaAlong, y: point.y + uy * sigmaAlong });
  if (stepped === null) return false;
  return stepped.target.id !== result.target.id;
}

/** mulberry32. Small, fast, well known, and seeded, so a Monte Carlo run is
 * reproducible from its seed alone. Not cryptographic and does not need to be. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Independent cross check on `misTapRate`, by seeded sampling.
 *
 * This exists so the quadrature can be attacked. If the two disagree by more
 * than sampling error, one of them is wrong and the layout report should not be
 * trusted until it is known which. The report test asserts they agree.
 */
export function misTapRateMonteCarlo(
  layout: CompiledLayout,
  intendedTargetId: string,
  model: FingertipModel,
  samples = 200_000,
  seed = 0x5eed,
): MisTapReport {
  const intended = layout.byId.get(intendedTargetId);
  if (intended === undefined) {
    throw new Error(`no target with id ${intendedTargetId} in layout`);
  }

  const random = mulberry32(seed);
  const centre: Point = {
    x: intended.target.centre.x + model.bias.x,
    y: intended.target.centre.y + model.bias.y,
  };

  let success = 0;
  let miss = 0;
  const confusionCount = new Map<string, number>();

  for (let n = 0; n < samples; n += 1) {
    // Box-Muller. Guard u1 away from zero so the log never blows up.
    const u1 = Math.max(random(), Number.EPSILON);
    const u2 = random();
    const r = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    const point: Point = {
      x: centre.x + r * Math.cos(theta) * model.sigmaX,
      y: centre.y + r * Math.sin(theta) * model.sigmaY,
    };

    const result = hitTest(layout, point);
    if (result === null) miss += 1;
    else if (result.target.id === intendedTargetId) success += 1;
    else confusionCount.set(result.target.id, (confusionCount.get(result.target.id) ?? 0) + 1);
  }

  const confusions: Confusion[] = [...confusionCount.entries()]
    .map(([targetId, count]) => ({ targetId, rate: count / samples }))
    .sort((a, b) => b.rate - a.rate);

  return {
    intendedTargetId,
    model: model.label,
    basis: model.basis,
    profile: layout.profile.label,
    successRate: success / samples,
    misTapRate: (samples - success - miss) / samples,
    missRate: miss / samples,
    confusions,
    method: `seeded monte carlo, ${samples} samples, seed ${seed}, mulberry32 with box-muller`,
    massCovered: 1,
  };
}

export interface SweepRow {
  readonly model: string;
  readonly sigmaPoints: number;
  readonly sigmaMillimetres: number;
  readonly successRate: number;
  readonly misTapRate: number;
  readonly missRate: number;
}

/**
 * The point estimate on its own is worth less than the curve. Sigma is the
 * assumption the whole model rests on, so every report should show how the
 * answer moves as sigma moves.
 */
export function misTapSweep(
  layout: CompiledLayout,
  intendedTargetId: string,
  models: readonly FingertipModel[],
): readonly SweepRow[] {
  return models.map((model) => {
    const report = misTapRate(layout, intendedTargetId, model);
    return {
      model: model.label,
      sigmaPoints: model.sigmaX,
      sigmaMillimetres: model.sigmaX / model.device.pointsPerMm,
      successRate: report.successRate,
      misTapRate: report.misTapRate,
      missRate: report.missRate,
    };
  });
}

/**
 * Which targets the finger physically covered, whatever the hit test decided.
 *
 * OCCLUSION ONLY. This does not decide anything and it does not feed the mis tap
 * rate. It is the input a disambiguation affordance needs: when `hitTest`
 * reports a small margin, this says what else was under the finger and therefore
 * what a "did you mean" control should offer.
 *
 * The test is approximate. It compares the target's centre distance against the
 * ellipse's supporting radius in that direction plus the target's radius, which
 * is exact when the ellipse is a circle and slightly generous otherwise. Exact
 * ellipse to circle intersection is a quartic and is not worth it for a hint.
 */
export function coveredTargets(
  layout: CompiledLayout,
  point: Point,
  model: FingertipModel,
): readonly TargetCircle[] {
  const angle = (model.contact.angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const a = model.contact.semiMajor;
  const b = model.contact.semiMinor;

  const covered: TargetCircle[] = [];
  for (const entry of layout.targets) {
    const dx = entry.target.centre.x - point.x;
    const dy = entry.target.centre.y - point.y;
    const d = distance(point, entry.target.centre);
    if (d === 0) {
      covered.push(entry.target);
      continue;
    }
    // Component of the unit direction along the ellipse's own axes.
    const along = (dx * cos + dy * sin) / d;
    const across = (-dx * sin + dy * cos) / d;
    const denominator = Math.sqrt((b * along) ** 2 + (a * across) ** 2);
    const supporting = denominator === 0 ? Math.max(a, b) : (a * b) / denominator;
    if (d <= supporting + entry.target.radius) covered.push(entry.target);
  }
  return covered;
}
