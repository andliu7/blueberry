import { describe, expect, it } from "vitest";

import {
  ALCHEMIE_MEASURED_SCALE,
  BLUEBERRY_PROPOSED_SCALE,
  checkMinimumHitTargets,
  compiled,
  EXACT_TOLERANCE,
  compileLayout,
  MINIMUM_HIT_TARGET_POINTS,
  requiredOrbitRadius,
  requiredSeparation,
  tightestBondHandleLayout,
  tightestLonePairLayout,
  lonePairTargetRadius,
  TOUCH_TOLERANCE,
  type TargetCircle,
} from "../src/geometry/index.js";

describe("the budget itself", () => {
  it("is 44 points and is not a tuning knob", () => {
    expect(MINIMUM_HIT_TARGET_POINTS).toBe(44);
  });
});

describe("requiredSeparation", () => {
  it("is the minimum itself for two equal targets, which is the rule worth remembering", () => {
    expect(requiredSeparation(22, 22)).toBeCloseTo(44, 10);
    expect(requiredSeparation(40, 40)).toBeCloseTo(44, 10);
  });

  it("grows when the targets are unequal, because the boundary sits nearer the smaller one", () => {
    expect(requiredSeparation(15, 40)).toBeGreaterThan(44);
  });

  it("actually delivers the minimum when a layout is built at exactly that separation", () => {
    const separation = requiredSeparation(23, 32);
    const targets: readonly TargetCircle[] = [
      { id: "small", kind: "bond_handle", centre: { x: 0, y: 0 }, radius: 15 },
      { id: "large", kind: "atom", centre: { x: separation, y: 0 }, radius: 32 },
    ];
    const report = checkMinimumHitTargets(compileLayout(targets, TOUCH_TOLERANCE));
    for (const row of report.rows) {
      expect(row.exclusiveDiameter).toBeGreaterThanOrEqual(MINIMUM_HIT_TARGET_POINTS - 1e-9);
    }
  });
});

describe("requiredOrbitRadius", () => {
  it("uses the parent constraint alone when there is only one child", () => {
    expect(requiredOrbitRadius(1, 23, 32)).toBeCloseTo(requiredSeparation(23, 32), 10);
  });

  it("delivers the minimum for four children at 90 degrees, which is the corpus maximum", () => {
    const childRadius = lonePairTargetRadius(BLUEBERRY_PROPOSED_SCALE) + TOUCH_TOLERANCE.slop.lone_pair;
    const atomRadius = BLUEBERRY_PROPOSED_SCALE.atomDiameter / 2;
    const orbit = requiredOrbitRadius(4, childRadius, atomRadius);

    const targets: TargetCircle[] = [
      { id: "X", kind: "atom", centre: { x: 0, y: 0 }, radius: atomRadius },
    ];
    for (let i = 0; i < 4; i += 1) {
      const angle = (i * Math.PI) / 2;
      targets.push({
        id: `X:lp:${i}`,
        kind: "lone_pair",
        centre: { x: orbit * Math.cos(angle), y: orbit * Math.sin(angle) },
        radius: lonePairTargetRadius(BLUEBERRY_PROPOSED_SCALE),
        ownerAtomId: "X",
      });
    }

    const report = checkMinimumHitTargets(compileLayout(targets, TOUCH_TOLERANCE));
    expect(report.passes).toBe(true);
  });
});

describe("the bar, measured, against the budget", () => {
  // This is the ergonomics finding stated as numbers rather than as an
  // impression. It is not a criticism of a hit test we cannot see; it is the
  // drawn geometry compared against a published guideline.
  const lonePair = compiled(tightestLonePairLayout(ALCHEMIE_MEASURED_SCALE), EXACT_TOLERANCE);
  const doubleBond = compiled(tightestBondHandleLayout(ALCHEMIE_MEASURED_SCALE), EXACT_TOLERANCE);

  it("passes comfortably on atom spheres, which are 71.5 points across", () => {
    expect(ALCHEMIE_MEASURED_SCALE.atomDiameter).toBeGreaterThan(MINIMUM_HIT_TARGET_POINTS);
  });

  it("fails the budget on bond end handles, and by roughly a factor of three", () => {
    const report = checkMinimumHitTargets(doubleBond);
    expect(report.passes).toBe(false);

    const handles = report.rows.filter((r) => r.kind === "bond_handle");
    expect(handles).toHaveLength(2);
    for (const handle of handles) {
      expect(handle.drawnDiameter).toBeCloseTo(15.7, 6);
      expect(handle.exclusiveDiameter).toBeLessThan(MINIMUM_HIT_TARGET_POINTS / 2);
    }
  });

  it("has the two handles of a double bond 29.2 points apart, well under the 44 two equal targets need", () => {
    expect(ALCHEMIE_MEASURED_SCALE.doubleBondHandleSeparation).toBeCloseTo(29.2, 6);
    expect(requiredSeparation(15.7 / 2, 15.7 / 2)).toBeCloseTo(44, 10);
    expect(ALCHEMIE_MEASURED_SCALE.doubleBondHandleSeparation).toBeLessThan(44);
  });

  it("misses the budget on lone pairs by 3 points, and not because anything crowds them", () => {
    // Worth stating precisely, because it is a different failure from the
    // handles. A lone pair glyph, taken as the circle containing both of its
    // dots, is 41.0 points across: 25.2 of dot separation plus 15.8 of dot. At
    // an orbit of 58.1 nothing contests it, so its exclusive diameter equals its
    // drawn diameter exactly. It is not crowded. It is drawn 3 points too small.
    const report = checkMinimumHitTargets(lonePair);
    const lonePairRows = report.rows.filter((r) => r.kind === "lone_pair");
    expect(lonePairRows.length).toBe(3);
    for (const row of lonePairRows) {
      expect(row.drawnDiameter).toBeCloseTo(41.0, 6);
      expect(row.exclusiveDiameter).toBeCloseTo(41.0, 6);
      expect(row.limitedBy).toBeNull(); // uncrowded
      expect(row.shortfall).toBeCloseTo(3.0, 6);
    }
  });

  it("separates the two failures: lone pairs are 93 percent of budget, handles are 34 percent", () => {
    const lonePairRow = checkMinimumHitTargets(lonePair).rows.find((r) => r.kind === "lone_pair");
    const handleRow = checkMinimumHitTargets(doubleBond).rows.find((r) => r.kind === "bond_handle");
    expect(lonePairRow).toBeDefined();
    expect(handleRow).toBeDefined();
    if (lonePairRow === undefined || handleRow === undefined) return;

    expect(lonePairRow.exclusiveDiameter / MINIMUM_HIT_TARGET_POINTS).toBeCloseTo(0.932, 2);
    expect(handleRow.exclusiveDiameter / MINIMUM_HIT_TARGET_POINTS).toBeCloseTo(0.34, 2);
  });

  it("shows the atom is what cuts the handle down, which is the adjacency OBSERVATIONS.md names", () => {
    const report = checkMinimumHitTargets(
      compiled(tightestLonePairLayout(ALCHEMIE_MEASURED_SCALE), EXACT_TOLERANCE),
    );
    const handle = report.rows.find((r) => r.kind === "bond_handle");
    expect(handle?.drawnDiameter).toBeCloseTo(15.7, 6);
    expect(handle?.exclusiveDiameter).toBeCloseTo(14.91, 1);
    expect(handle?.limitedBy).toBe("Br");
  });
});

describe("the proposed Blueberry scale against the budget", () => {
  it("passes on every target of the tightest lone pair layout in the corpus", () => {
    const report = checkMinimumHitTargets(compiled(tightestLonePairLayout(BLUEBERRY_PROPOSED_SCALE)));
    expect(report.failures).toHaveLength(0);
    expect(report.passRate).toBe(1);
  });

  it("passes on every target of the tightest bond handle layout", () => {
    const report = checkMinimumHitTargets(
      compiled(tightestBondHandleLayout(BLUEBERRY_PROPOSED_SCALE)),
    );
    expect(report.failures).toHaveLength(0);
  });

  it("stops passing if any of the three derived dimensions is pulled back toward the bar", () => {
    // The check has to be able to fail, or it is not a check. Each of these is
    // the bar's own number substituted into an otherwise passing scale.
    const shrunkHandle = { ...BLUEBERRY_PROPOSED_SCALE, bondHandleDiameter: 15.7 };
    const closeHandles = { ...BLUEBERRY_PROPOSED_SCALE, doubleBondHandleSeparation: 29.2 };
    const nearHandle = { ...BLUEBERRY_PROPOSED_SCALE, handleDistance: 41.4 };

    expect(
      checkMinimumHitTargets(compiled(tightestBondHandleLayout(shrunkHandle))).passes,
    ).toBe(false);
    expect(
      checkMinimumHitTargets(compiled(tightestBondHandleLayout(closeHandles))).passes,
    ).toBe(false);
    expect(checkMinimumHitTargets(compiled(tightestLonePairLayout(nearHandle))).passes).toBe(false);
  });
});

describe("the report distinguishes too small from too crowded", () => {
  it("names the neighbour that cut a target down, so a failure says which bug it is", () => {
    const targets: readonly TargetCircle[] = [
      { id: "big", kind: "atom", centre: { x: 0, y: 0 }, radius: 40 },
      { id: "crowder", kind: "atom", centre: { x: 50, y: 0 }, radius: 40 },
    ];
    const report = checkMinimumHitTargets(compileLayout(targets, EXACT_TOLERANCE));
    const row = report.rows.find((r) => r.targetId === "big");
    expect(row?.nominalDiameter).toBe(80); // plenty on its own
    expect(row?.exclusiveDiameter).toBeCloseTo(50, 6); // crowded down to 50
    expect(row?.limitedBy).toBe("crowder");
    expect(row?.passes).toBe(true);
  });

  it("reports a shortfall in points for a failing target", () => {
    const targets: readonly TargetCircle[] = [
      { id: "tiny", kind: "bond_handle", centre: { x: 0, y: 0 }, radius: 8 },
    ];
    const report = checkMinimumHitTargets(compileLayout(targets, EXACT_TOLERANCE));
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]?.shortfall).toBeCloseTo(28, 6);
  });

  it("passes vacuously on an empty layout rather than dividing by zero", () => {
    const report = checkMinimumHitTargets(compileLayout([], EXACT_TOLERANCE));
    expect(report.passes).toBe(true);
    expect(report.passRate).toBe(1);
  });
});
