import { describe, expect, it } from "vitest";

import {
  ALCHEMIE_MEASURED_SCALE,
  BLUEBERRY_PROPOSED_SCALE,
  analyseContention,
  compileLayout,
  compiled,
  EXACT_TOLERANCE,
  exclusiveRadius,
  maxSlopWithoutEncroachment,
  TOUCH_TOLERANCE,
  tightestBondHandleLayout,
  tightestLonePairLayout,
  toleranceCostCurve,
  type TargetCircle,
  type ToleranceProfile,
} from "../src/geometry/index.js";

/**
 * Probe profile. `base` matters and is not defaulted on purpose: a limit derived
 * against one base does not hold against another, because the boundary between
 * two targets moves when EITHER side's slop changes. Getting that wrong is the
 * first mistake this test made.
 */
const withSlop = (
  kind: "lone_pair" | "bond_handle",
  slop: number,
  base: ToleranceProfile,
): ToleranceProfile => ({
  label: `probe ${kind} ${slop} on ${base.label}`,
  pointerClass: "touch",
  slop: { ...base.slop, [kind]: slop },
});

describe("tolerance is zero sum, which is the point of the file", () => {
  // Two lone pairs on one atom, far enough apart that neither is contested at
  // zero slop. Growing one has to come out of the other.
  const targets: readonly TargetCircle[] = [
    { id: "O", kind: "atom", centre: { x: 0, y: 0 }, radius: 32 },
    { id: "a", kind: "lone_pair", centre: { x: 54, y: 0 }, radius: 20, ownerAtomId: "O" },
    { id: "b", kind: "lone_pair", centre: { x: 0, y: 54 }, radius: 20, ownerAtomId: "O" },
  ];

  it("gives the neighbour less exclusive area for every point the subject gains", () => {
    const curve = toleranceCostCurve(
      targets,
      "lone_pair",
      "a",
      "b",
      // Base profile with the OTHER lone pair pinned, so only the subject grows.
      // Both are the same kind, so this test grows both and reads the asymmetry
      // out of the third target instead: see the atom assertion below.
      EXACT_TOLERANCE,
      [0, 4, 8, 12, 16],
    );

    // Both lone pairs are the same kind, so raising the kind's slop raises both.
    // What must still hold is that each row is internally consistent and that
    // nothing ever gains without something losing. The atom, which never gets
    // slop, is the one that pays.
    for (const row of curve) {
      expect(row.gained).toBe(row.neighbourLost); // symmetric layout, symmetric result
    }

    const atomRadii = [0, 4, 8, 12, 16].map(
      (slop) => exclusiveRadius(compileLayout(targets, withSlop("lone_pair", slop, TOUCH_TOLERANCE)), "O").radius,
    );
    for (let i = 1; i < atomRadii.length; i += 1) {
      const previous = atomRadii[i - 1];
      const current = atomRadii[i];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      if (previous === undefined || current === undefined) continue;
      expect(current).toBeLessThan(previous);
    }
  });

  it("grows the subject's own exclusive radius monotonically as slop rises", () => {
    const radii = [0, 4, 8, 12, 16].map(
      (slop) => exclusiveRadius(compileLayout(targets, withSlop("lone_pair", slop, TOUCH_TOLERANCE)), "a").radius,
    );
    for (let i = 1; i < radii.length; i += 1) {
      const previous = radii[i - 1];
      const current = radii[i];
      if (previous === undefined || current === undefined) continue;
      expect(current).toBeGreaterThan(previous);
    }
  });
});

describe("encroachment", () => {
  it("is not reported between a child and its own atom, because that overlap is the design", () => {
    // The measured Alchemie handle sits 2.2 points inside its atom's silhouette.
    const targets: readonly TargetCircle[] = [
      { id: "C", kind: "atom", centre: { x: 0, y: 0 }, radius: ALCHEMIE_MEASURED_SCALE.atomDiameter / 2 },
      {
        id: "h",
        kind: "bond_handle",
        centre: { x: ALCHEMIE_MEASURED_SCALE.handleDistance, y: 0 },
        radius: ALCHEMIE_MEASURED_SCALE.bondHandleDiameter / 2,
        ownerAtomId: "C",
      },
    ];
    const report = analyseContention(compileLayout(targets, TOUCH_TOLERANCE));
    expect(report.pairs).toHaveLength(1);
    expect(report.pairs[0]?.ownerPair).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it("is reported between siblings, which are the pairs the exit condition asks about", () => {
    // Two lone pairs close enough that generous slop makes one boundary cross
    // inside the other's drawn ink.
    const targets: readonly TargetCircle[] = [
      { id: "O", kind: "atom", centre: { x: 0, y: 0 }, radius: 32 },
      { id: "a", kind: "lone_pair", centre: { x: 40, y: 0 }, radius: 12, ownerAtomId: "O" },
      { id: "b", kind: "lone_pair", centre: { x: 62, y: 0 }, radius: 12, ownerAtomId: "O" },
    ];
    // Separation 22, drawn radii 12 each, so the two drawn discs already overlap
    // and any equal slop leaves the boundary at 11, one point inside both.
    const report = analyseContention(compileLayout(targets, TOUCH_TOLERANCE));
    const sibling = report.violations.find((p) => p.aId === "a" && p.bId === "b");
    expect(sibling).toBeDefined();
    expect(sibling?.ownerPair).toBe(false);
    expect(sibling?.encroachmentOnA).toBeCloseTo(1, 6);
    expect(sibling?.encroachmentOnB).toBeCloseTo(1, 6);
  });

  it("finds nothing to report when nothing overlaps at all", () => {
    const targets: readonly TargetCircle[] = [
      { id: "a", kind: "atom", centre: { x: 0, y: 0 }, radius: 20 },
      { id: "b", kind: "atom", centre: { x: 500, y: 0 }, radius: 20 },
    ];
    const report = analyseContention(compileLayout(targets, TOUCH_TOLERANCE));
    expect(report.pairs).toHaveLength(0);
    expect(report.violations).toHaveLength(0);
  });
});

describe("maxSlopWithoutEncroachment, which is where the touch profile's 8 comes from", () => {
  const lonePairLayout = tightestLonePairLayout(BLUEBERRY_PROPOSED_SCALE);
  const handleLayout = tightestBondHandleLayout(BLUEBERRY_PROPOSED_SCALE);

  it("returns a slop that does not encroach, and one just above it that does", () => {
    const limit = maxSlopWithoutEncroachment(lonePairLayout, "lone_pair", EXACT_TOLERANCE);
    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThan(64); // the cap was not the binding constraint

    const at = analyseContention(compileLayout(lonePairLayout, withSlop("lone_pair", limit, EXACT_TOLERANCE)));
    expect(at.violations).toHaveLength(0);

    const above = analyseContention(
      compileLayout(lonePairLayout, withSlop("lone_pair", limit + 0.5, EXACT_TOLERANCE)),
    );
    expect(above.violations.length).toBeGreaterThan(0);
  });

  it("justifies the shipped touch profile: 8 points is inside the limit on both tight layouts", () => {
    const lonePairLimit = maxSlopWithoutEncroachment(lonePairLayout, "lone_pair", EXACT_TOLERANCE);
    const handleLimit = maxSlopWithoutEncroachment(handleLayout, "bond_handle", EXACT_TOLERANCE);

    expect(TOUCH_TOLERANCE.slop.lone_pair).toBeLessThanOrEqual(lonePairLimit);
    expect(TOUCH_TOLERANCE.slop.bond_handle).toBeLessThanOrEqual(handleLimit);

    // And the shipped profile itself is clean on both.
    expect(analyseContention(compiled(lonePairLayout)).violations).toHaveLength(0);
    expect(analyseContention(compiled(handleLayout)).violations).toHaveLength(0);
  });

  it("returns zero when the layout already encroaches with no slop at all", () => {
    const overlapping: readonly TargetCircle[] = [
      { id: "O", kind: "atom", centre: { x: 0, y: 0 }, radius: 32 },
      { id: "a", kind: "lone_pair", centre: { x: 40, y: 0 }, radius: 12, ownerAtomId: "O" },
      { id: "b", kind: "lone_pair", centre: { x: 52, y: 0 }, radius: 12, ownerAtomId: "O" },
    ];
    expect(maxSlopWithoutEncroachment(overlapping, "lone_pair", EXACT_TOLERANCE)).toBe(0);
  });
});

describe("atoms deliberately get no touch slop", () => {
  it("keeps the shipped profile's atom slop at zero, because growing an atom only robs its own children", () => {
    expect(TOUCH_TOLERANCE.slop.atom).toBe(0);

    const layout = tightestLonePairLayout(BLUEBERRY_PROPOSED_SCALE);
    const withAtomSlop: ToleranceProfile = {
      label: "atoms given slop",
      pointerClass: "touch",
      slop: { ...TOUCH_TOLERANCE.slop, atom: 8 },
    };

    const lonePairId = "Br:lone_pair:1";
    const before = exclusiveRadius(compiled(layout), lonePairId).radius;
    const after = exclusiveRadius(compileLayout(layout, withAtomSlop), lonePairId).radius;
    expect(after).toBeLessThan(before);
  });
});
