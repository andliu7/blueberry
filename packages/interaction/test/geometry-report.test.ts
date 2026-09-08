/**
 * THE WORKED NUMBERS.
 *
 * This file is the measurement half of the mobile touch ergonomics axis. It
 * prints every figure the Phase 2 exit condition asks for, states the layout
 * each one was computed on so it can be rebuilt, and then asserts the headline
 * values so they cannot drift without someone noticing.
 *
 * Read the header of `src/geometry/fingertip.ts` before quoting anything here.
 * The mis tap rates are model output, not observations of people.
 */

import { describe, expect, it } from "vitest";

import {
  ALCHEMIE_MEASURED_SCALE,
  BLUEBERRY_PROPOSED_SCALE,
  analyseContention,
  checkMinimumHitTargets,
  compiled,
  EXACT_TOLERANCE,
  FINGERTIP_BIASED,
  FINGERTIP_BUDGET_DERIVED,
  FINGERTIP_CONSERVATIVE,
  FINGERTIP_PESSIMISTIC,
  hitTest,
  lonePairRing,
  misTapRate,
  misTapSweep,
  tightestBondHandleLayout,
  tightestLonePairLayout,
  TOUCH_TOLERANCE,
  type CanvasScale,
  type CompiledLayout,
  type FingertipModel,
} from "../src/geometry/index.js";

const MODELS: readonly FingertipModel[] = [
  FINGERTIP_BUDGET_DERIVED,
  FINGERTIP_CONSERVATIVE,
  FINGERTIP_PESSIMISTIC,
  FINGERTIP_BIASED,
];

function describeLayout(title: string, layout: CompiledLayout): void {
  console.log(`\n${title}`);
  console.log(`  tolerance profile: ${layout.profile.label}`);
  console.log("  id                          kind            centre            drawn r");
  for (const entry of layout.targets) {
    const { target } = entry;
    console.log(
      `  ${target.id.padEnd(26)}  ${target.kind.padEnd(14)}  ` +
        `(${target.centre.x.toFixed(1)}, ${target.centre.y.toFixed(1)})`.padEnd(18) +
        `  ${target.radius.toFixed(2)}`,
    );
  }
}

function sweepTable(layout: CompiledLayout, intended: string): void {
  console.log(`  intended target: ${intended}`);
  console.log("  model                              sigma pt  sigma mm   success   MIS TAP     miss");
  for (const row of misTapSweep(layout, intended, MODELS)) {
    console.log(
      `  ${row.model.padEnd(33)} ${row.sigmaPoints.toFixed(2).padStart(8)}  ` +
        `${row.sigmaMillimetres.toFixed(2).padStart(7)}  ` +
        `${(row.successRate * 100).toFixed(2).padStart(7)}%  ` +
        `${(row.misTapRate * 100).toFixed(2).padStart(7)}%  ` +
        `${(row.missRate * 100).toFixed(2).padStart(6)}%`,
    );
  }
}

function minimumTargetTable(title: string, layout: CompiledLayout): void {
  const report = checkMinimumHitTargets(layout);
  console.log(`\n${title}  (44 point budget, ${report.profile})`);
  console.log("  id                          drawn   nominal  exclusive  limited by        pass");
  for (const row of report.rows) {
    console.log(
      `  ${row.targetId.padEnd(26)}  ${row.drawnDiameter.toFixed(1).padStart(5)}  ` +
        `${row.nominalDiameter.toFixed(1).padStart(7)}  ${row.exclusiveDiameter.toFixed(1).padStart(9)}  ` +
        `${(row.limitedBy ?? "-").padEnd(16)}  ${row.passes ? "yes" : "NO"}`,
    );
  }
  console.log(`  pass rate: ${(report.passRate * 100).toFixed(0)}%`);
}

describe("the layouts, stated so every number below is reproducible", () => {
  it("prints the two scales", () => {
    const print = (scale: CanvasScale): void => {
      console.log(`\n${scale.label}`);
      for (const [key, value] of Object.entries(scale)) {
        if (key === "label") continue;
        console.log(`  ${key.padEnd(28)} ${String(value)}`);
      }
    };
    print(ALCHEMIE_MEASURED_SCALE);
    print(BLUEBERRY_PROPOSED_SCALE);
    expect(ALCHEMIE_MEASURED_SCALE.atomDiameter).toBeCloseTo(71.5, 6);
  });
});

describe("EXIT CONDITION: mis tap rate at the tightest lone pair spacing", () => {
  // THE LAYOUT. A bound halogen, three lone pairs and one bond handle at 90
  // degrees. Bromine in this arrangement appears 87 times in the 101 committed
  // fixtures, and the free halide with four lone pairs, same 90 degree spacing,
  // appears 124 times. Four satellites at 90 degrees is the corpus maximum.
  const blueberry = compiled(tightestLonePairLayout(BLUEBERRY_PROPOSED_SCALE), TOUCH_TOLERANCE);
  const alchemie = compiled(tightestLonePairLayout(ALCHEMIE_MEASURED_SCALE), EXACT_TOLERANCE);
  const intended = "Br:lone_pair:1";

  it("reports the number, on the proposed Blueberry scale", () => {
    describeLayout("LAYOUT: tightest lone pair, Blueberry proposed scale", blueberry);
    minimumTargetTable("44 point check", blueberry);
    console.log("\nMIS TAP, Blueberry proposed scale");
    sweepTable(blueberry, intended);

    const headline = misTapRate(blueberry, intended, FINGERTIP_BUDGET_DERIVED);
    console.log(`\n  method: ${headline.method}`);
    console.log(`  basis:  ${headline.basis}`);

    // PINNED. These are the numbers the exit condition quotes. Pinned to three
    // decimals so a change to the hit test, the tolerance profile, or the scale
    // has to be a deliberate act with this line updated in the same commit.
    expect(headline.misTapRate).toBeCloseTo(0.0022, 3);
    expect(headline.successRate).toBeCloseTo(0.9924, 3);
    expect(headline.missRate).toBeCloseTo(0.0054, 3);

    // And under the most pessimistic scatter the model offers.
    const pessimistic = misTapRate(blueberry, intended, FINGERTIP_PESSIMISTIC);
    expect(pessimistic.misTapRate).toBeCloseTo(0.0753, 3);
  });

  it("reports the number, on the bar's own measured scale, for comparison", () => {
    describeLayout("LAYOUT: tightest lone pair, Alchemie measured scale", alchemie);
    minimumTargetTable("44 point check", alchemie);
    console.log("\nMIS TAP, Alchemie measured scale, drawn geometry only");
    console.log("  Their tolerance is not observable from a still capture, so this is run at zero");
    console.log("  slop. It is a measurement of their DRAWN geometry, not of their hit test.");
    sweepTable(alchemie, intended);

    const headline = misTapRate(alchemie, intended, FINGERTIP_BUDGET_DERIVED);
    expect(headline.successRate).toBeLessThan(1);
  });
});

describe("EXIT CONDITION: mis tap rate at the tightest bond handle to atom spacing", () => {
  // THE LAYOUT. The two handles of a double bond at one atom, side by side,
  // perpendicular to the bond axis. Measured at 29.2 points of separation in the
  // Alchemie capture, which is the tightest pair of independently tappable
  // targets anywhere in the reference set.
  const blueberry = compiled(tightestBondHandleLayout(BLUEBERRY_PROPOSED_SCALE), TOUCH_TOLERANCE);
  const alchemie = compiled(tightestBondHandleLayout(ALCHEMIE_MEASURED_SCALE), EXACT_TOLERANCE);
  const intended = "C:handle:upper";

  it("reports the number, on the proposed Blueberry scale", () => {
    describeLayout("LAYOUT: tightest bond handle, Blueberry proposed scale", blueberry);
    minimumTargetTable("44 point check", blueberry);
    console.log("\nMIS TAP, Blueberry proposed scale");
    sweepTable(blueberry, intended);

    const headline = misTapRate(blueberry, intended, FINGERTIP_BUDGET_DERIVED);
    console.log(`\n  confusions: ${JSON.stringify(headline.confusions)}`);

    // PINNED, same reasoning as the lone pair case.
    expect(headline.misTapRate).toBeCloseTo(0.0104, 3);
    expect(headline.successRate).toBeCloseTo(0.9611, 3);

    // The mis taps split almost evenly between the sibling handle and the atom,
    // which is the signature of a layout that is balanced rather than one that
    // is losing to a single bad neighbour. Worth asserting: if one side ever
    // dominates, the scale has drifted.
    const sibling = headline.confusions.find((c) => c.targetId === "C:handle:lower")?.rate ?? 0;
    const parent = headline.confusions.find((c) => c.targetId === "C")?.rate ?? 0;
    expect(sibling).toBeGreaterThan(0);
    expect(parent).toBeGreaterThan(0);
    expect(Math.abs(sibling - parent)).toBeLessThan(0.002);

    const pessimistic = misTapRate(blueberry, intended, FINGERTIP_PESSIMISTIC);
    expect(pessimistic.misTapRate).toBeCloseTo(0.1587, 3);
  });

  it("reports the number, on the bar's own measured scale, for comparison", () => {
    describeLayout("LAYOUT: tightest bond handle, Alchemie measured scale", alchemie);
    minimumTargetTable("44 point check", alchemie);
    console.log("\nMIS TAP, Alchemie measured scale, drawn geometry only");
    sweepTable(alchemie, intended);

    const alchemieRate = misTapRate(alchemie, intended, FINGERTIP_BUDGET_DERIVED);
    const blueberryRate = misTapRate(blueberry, intended, FINGERTIP_BUDGET_DERIVED);
    console.log(
      `\n  success rate, bar ${(alchemieRate.successRate * 100).toFixed(2)}% ` +
        `against ours ${(blueberryRate.successRate * 100).toFixed(2)}%`,
    );
    expect(blueberryRate.successRate).toBeGreaterThan(alchemieRate.successRate);
  });
});

describe("how small Phase 4 may draw, which is the question this harness exists to answer", () => {
  it("sweeps the lone pair orbit radius and prints where it stops passing", () => {
    console.log("\nFOUR LONE PAIRS ON ONE ATOM, orbit radius swept, Blueberry proposed scale");
    console.log("  Everything else held at BLUEBERRY_PROPOSED_SCALE, touch profile.");
    console.log("  orbit  minTarget  encroach  success   MIS TAP     miss");

    let smallestPassing = Number.POSITIVE_INFINITY;
    for (let orbit = 34; orbit <= 70; orbit += 2) {
      const layout = compiled(lonePairRing(BLUEBERRY_PROPOSED_SCALE, orbit, 4), TOUCH_TOLERANCE);
      const minimum = checkMinimumHitTargets(layout);
      const contention = analyseContention(layout);
      const rate = misTapRate(layout, "X:lone_pair:0", FINGERTIP_BUDGET_DERIVED);
      if (minimum.passes && contention.violations.length === 0 && orbit < smallestPassing) {
        smallestPassing = orbit;
      }
      console.log(
        `  ${String(orbit).padStart(5)}  ${(minimum.passes ? "pass" : "FAIL").padStart(9)}  ` +
          `${String(contention.violations.length).padStart(8)}  ` +
          `${(rate.successRate * 100).toFixed(2).padStart(7)}%  ` +
          `${(rate.misTapRate * 100).toFixed(2).padStart(7)}%  ` +
          `${(rate.missRate * 100).toFixed(2).padStart(6)}%`,
      );
    }
    console.log(`\n  smallest orbit radius that passes every check: ${smallestPassing} points`);

    // PINNED. This is the number Phase 4 needs: four lone pairs on one atom
    // cannot orbit closer than 48 points from the atom centre at this scale
    // without failing the 44 point budget. The shipped scale sits at 54, so
    // there is 6 points of headroom for a renderer that needs to compress.
    expect(smallestPassing).toBe(48);
    expect(smallestPassing).toBeLessThanOrEqual(BLUEBERRY_PROPOSED_SCALE.lonePairOrbitRadius);
  });
});

describe("hit test throughput, which is the claim that it fits the 100 ms budget", () => {
  it("measures and prints nanoseconds per query", () => {
    const layout = compiled(tightestLonePairLayout(BLUEBERRY_PROPOSED_SCALE), TOUCH_TOLERANCE);
    const points = Array.from({ length: 1000 }, (_, i) => ({
      x: 150 + (i % 100),
      y: 150 + Math.floor(i / 10),
    }));

    // Warm up, so the figure is steady state rather than first call.
    for (let pass = 0; pass < 20; pass += 1) for (const p of points) hitTest(layout, p);

    const passes = 500;
    const started = process.hrtime.bigint();
    for (let pass = 0; pass < passes; pass += 1) for (const p of points) hitTest(layout, p);
    const elapsedNs = Number(process.hrtime.bigint() - started);

    const queries = passes * points.length;
    const nsPerQuery = elapsedNs / queries;
    console.log(
      `\n  ${layout.targets.length} targets, ${queries} queries, ` +
        `${nsPerQuery.toFixed(0)} ns per query, ` +
        `${(1e9 / nsPerQuery / 1e6).toFixed(1)} million queries per second`,
    );
    console.log(
      `  the interaction to feedback budget is 100 ms, so one query is ` +
        `${((nsPerQuery / 1e6 / 100) * 100).toFixed(5)} percent of it`,
    );

    // Deliberately loose. This is a smoke alarm for an accidental O(n squared)
    // or an allocation in the hot loop, not a benchmark gate. A timing assertion
    // tight enough to be interesting is a timing assertion that flakes on a
    // loaded CI box.
    expect(nsPerQuery).toBeLessThan(100_000);
  });
});
