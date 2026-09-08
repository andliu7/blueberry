import { describe, expect, it } from "vitest";

import {
  boundaryDistance,
  compileLayout,
  DuplicateTargetIdError,
  EXACT_TOLERANCE,
  exclusiveRadius,
  hitTest,
  InvalidTargetError,
  rankTargets,
  TOUCH_TOLERANCE,
  type TargetCircle,
} from "../src/geometry/index.js";
import { ALCHEMIE_MEASURED_SCALE } from "../src/geometry/index.js";
import { distance } from "../src/geometry/index.js";

const atom = (id: string, x: number, y: number, radius: number): TargetCircle => ({
  id,
  kind: "atom",
  centre: { x, y },
  radius,
});

describe("compileLayout", () => {
  it("rejects duplicate ids, because a layout with two targets called the same thing cannot be reasoned about", () => {
    expect(() =>
      compileLayout([atom("a", 0, 0, 10), atom("a", 50, 50, 10)], EXACT_TOLERANCE),
    ).toThrow(DuplicateTargetIdError);
  });

  it("rejects a radius that is zero or negative", () => {
    expect(() => compileLayout([atom("a", 0, 0, 0)], EXACT_TOLERANCE)).toThrow(InvalidTargetError);
    expect(() => compileLayout([atom("a", 0, 0, -5)], EXACT_TOLERANCE)).toThrow(InvalidTargetError);
  });

  it("rejects a non finite centre", () => {
    expect(() => compileLayout([atom("a", Number.NaN, 0, 10)], EXACT_TOLERANCE)).toThrow(
      InvalidTargetError,
    );
    expect(() =>
      compileLayout([atom("a", 0, Number.POSITIVE_INFINITY, 10)], EXACT_TOLERANCE),
    ).toThrow(InvalidTargetError);
  });

  it("folds the profile's slop into the effective radius, per kind", () => {
    const targets: readonly TargetCircle[] = [
      atom("a", 0, 0, 32),
      { id: "lp", kind: "lone_pair", centre: { x: 100, y: 0 }, radius: 20 },
    ];
    const layout = compileLayout(targets, TOUCH_TOLERANCE);
    expect(layout.byId.get("a")?.effectiveRadius).toBe(32);
    expect(layout.byId.get("lp")?.effectiveRadius).toBe(28);
  });
});

describe("hitTest, the basics", () => {
  it("returns null on an empty layout and on empty space", () => {
    expect(hitTest(compileLayout([], EXACT_TOLERANCE), { x: 0, y: 0 })).toBeNull();
    const layout = compileLayout([atom("a", 0, 0, 10)], EXACT_TOLERANCE);
    expect(hitTest(layout, { x: 500, y: 500 })).toBeNull();
  });

  it("hits a target at its centre, and just inside and just outside its rim", () => {
    const layout = compileLayout([atom("a", 0, 0, 10)], EXACT_TOLERANCE);
    expect(hitTest(layout, { x: 0, y: 0 })?.target.id).toBe("a");
    expect(hitTest(layout, { x: 9.99, y: 0 })?.target.id).toBe("a");
    expect(hitTest(layout, { x: 10.01, y: 0 })).toBeNull();
  });

  it("reports an infinite margin when nothing contested the hit", () => {
    const layout = compileLayout([atom("a", 0, 0, 10)], EXACT_TOLERANCE);
    const result = hitTest(layout, { x: 0, y: 0 });
    expect(result?.runnerUp).toBeNull();
    expect(result?.margin).toBe(Number.POSITIVE_INFINITY);
  });

  it("breaks an exact tie deterministically, smaller effective radius first then id", () => {
    // Two targets whose centres are equidistant from the point and whose radii
    // are equal: the tie falls through to the id.
    const equal = compileLayout([atom("b", -10, 0, 20), atom("a", 10, 0, 20)], EXACT_TOLERANCE);
    expect(hitTest(equal, { x: 0, y: 0 })?.target.id).toBe("a");

    // Concentric targets of different size. Normalised distance is 0 for both,
    // so the smaller one wins: it has nowhere else to be hit.
    const nested = compileLayout(
      [atom("big", 0, 0, 40), { id: "small", kind: "lone_pair", centre: { x: 0, y: 0 }, radius: 8 }],
      EXACT_TOLERANCE,
    );
    expect(hitTest(nested, { x: 0, y: 0 })?.target.id).toBe("small");
  });

  it("agrees with rankTargets, which is the slow path that sorts", () => {
    const layout = compileLayout(
      [atom("a", 0, 0, 40), { id: "lp", kind: "lone_pair", centre: { x: 30, y: 0 }, radius: 12 }],
      EXACT_TOLERANCE,
    );
    for (let x = -40; x <= 45; x += 1) {
      const point = { x, y: 0 };
      const fast = hitTest(layout, point);
      const slow = rankTargets(layout, point);
      expect(fast?.target.id ?? null).toBe(slow[0]?.target.id ?? null);
      expect(fast?.runnerUp?.target.id ?? null).toBe(slow[1]?.target.id ?? null);
    }
  });
});

describe("the bond handle against its own atom, which is the ambiguity that matters", () => {
  // Alchemie, measured: a 71.5 point atom with a 15.7 point handle whose centre
  // sits 41.4 points out, which puts the handle's inner edge 2.2 points inside
  // the atom's silhouette.
  const atomRadius = ALCHEMIE_MEASURED_SCALE.atomDiameter / 2;
  const handleRadius = ALCHEMIE_MEASURED_SCALE.bondHandleDiameter / 2;
  const handleDistance = ALCHEMIE_MEASURED_SCALE.handleDistance;

  const targets: readonly TargetCircle[] = [
    atom("C", 0, 0, atomRadius),
    {
      id: "handle",
      kind: "bond_handle",
      centre: { x: handleDistance, y: 0 },
      radius: handleRadius,
      ownerAtomId: "C",
    },
  ];

  it("confirms the geometry really does overlap, so this test is about a real case", () => {
    expect(handleDistance - handleRadius).toBeLessThan(atomRadius);
    expect(atomRadius - (handleDistance - handleRadius)).toBeCloseTo(2.2, 1);
  });

  it("would let the tiny handle eat 15 points of the atom's body under nearest centre", () => {
    // Nearest centre puts the boundary on the perpendicular bisector, half way
    // between the two centres, regardless of how different the two targets are
    // in size. That is 20.7 points from the atom's centre, so a 15.7 point
    // handle would own everything from there out to the atom's rim at 35.75.
    const nearestCentreBoundary = handleDistance / 2;
    expect(nearestCentreBoundary).toBeCloseTo(20.7, 6);
    expect(atomRadius - nearestCentreBoundary).toBeCloseTo(15.05, 6);

    // Confirm it really would: a point 25 out is plainly inside the atom's ink
    // and plainly outside the handle's, yet is nearer the handle's centre.
    const point = { x: 25, y: 0 };
    expect(distance(point, { x: 0, y: 0 })).toBeLessThan(atomRadius);
    expect(distance(point, { x: handleDistance, y: 0 })).toBeGreaterThan(handleRadius);
    expect(distance(point, { x: handleDistance, y: 0 })).toBeLessThan(
      distance(point, { x: 0, y: 0 }),
    );

    // The rule actually used gives that point to the atom, where it belongs.
    const layout = compileLayout(targets, EXACT_TOLERANCE);
    expect(hitTest(layout, point)?.target.id).toBe("C");
  });

  it("puts the boundary at 33.95, so each target keeps essentially its own ink", () => {
    const layout = compileLayout(targets, EXACT_TOLERANCE);
    const handleEntry = layout.byId.get("handle");
    const atomEntry = layout.byId.get("C");
    if (handleEntry === undefined || atomEntry === undefined) throw new Error("layout");

    const boundaryX = handleDistance - boundaryDistance(handleEntry, atomEntry);
    expect(boundaryX).toBeCloseTo(33.95, 2);

    // The atom's rim is at 35.75 and the handle's inner ink edge at 33.55, so
    // the boundary sits inside the 2.2 point overlap. The atom takes 0.4 points
    // of the handle's ink, which is the whole of the cost.
    expect(boundaryX).toBeGreaterThan(handleDistance - handleRadius);
    expect(boundaryX).toBeLessThan(atomRadius);
    expect(boundaryX - (handleDistance - handleRadius)).toBeCloseTo(0.4, 1);
  });

  it("gives the handle its own disc under the normalised rule", () => {
    const layout = compileLayout(targets, EXACT_TOLERANCE);
    // Every point of the drawn handle resolves to the handle, including the half
    // of it that is inside the atom's silhouette.
    for (let angle = 0; angle < 360; angle += 15) {
      const radians = (angle * Math.PI) / 180;
      const point = {
        x: handleDistance + handleRadius * 0.9 * Math.cos(radians),
        y: handleRadius * 0.9 * Math.sin(radians),
      };
      expect(hitTest(layout, point)?.target.id).toBe("handle");
    }
  });

  it("still gives the atom the rest of its body", () => {
    const layout = compileLayout(targets, EXACT_TOLERANCE);
    expect(hitTest(layout, { x: 0, y: 0 })?.target.id).toBe("C");
    expect(hitTest(layout, { x: -30, y: 0 })?.target.id).toBe("C");
    expect(hitTest(layout, { x: 0, y: 30 })?.target.id).toBe("C");
  });

  it("puts the decision boundary exactly where boundaryDistance says it is", () => {
    const layout = compileLayout(targets, EXACT_TOLERANCE);
    const handleEntry = layout.byId.get("handle");
    const atomEntry = layout.byId.get("C");
    expect(handleEntry).toBeDefined();
    expect(atomEntry).toBeDefined();
    if (handleEntry === undefined || atomEntry === undefined) return;

    const fromHandle = boundaryDistance(handleEntry, atomEntry);
    const boundaryX = handleDistance - fromHandle;

    // Scan across the boundary and confirm the winner flips there and nowhere
    // else. This is what makes exclusiveRadius exact rather than an estimate.
    expect(hitTest(layout, { x: boundaryX - 0.05, y: 0 })?.target.id).toBe("C");
    expect(hitTest(layout, { x: boundaryX + 0.05, y: 0 })?.target.id).toBe("handle");
  });
});

describe("exclusiveRadius", () => {
  it("is the target's own effective radius when nothing contests it", () => {
    const layout = compileLayout([atom("a", 0, 0, 22)], EXACT_TOLERANCE);
    const exclusive = exclusiveRadius(layout, "a");
    expect(exclusive.radius).toBe(22);
    expect(exclusive.limitedBy).toBeNull();
  });

  it("is half the separation for two equal targets, and names the neighbour", () => {
    const layout = compileLayout([atom("a", 0, 0, 40), atom("b", 60, 0, 40)], EXACT_TOLERANCE);
    const exclusive = exclusiveRadius(layout, "a");
    expect(exclusive.radius).toBeCloseTo(30, 10);
    expect(exclusive.limitedBy).toBe("b");
  });

  it("matches a brute force scan of where the winner actually flips", () => {
    const layout = compileLayout(
      [
        atom("C", 0, 0, 32),
        { id: "h", kind: "bond_handle", centre: { x: 54, y: 0 }, radius: 15, ownerAtomId: "C" },
      ],
      TOUCH_TOLERANCE,
    );
    const exclusive = exclusiveRadius(layout, "h");

    // Walk outward from the handle's centre in many directions and find the
    // first radius at which something else wins. The smallest such radius over
    // all directions must equal the analytic exclusive radius.
    let smallestFlip = Number.POSITIVE_INFINITY;
    for (let angle = 0; angle < 360; angle += 1) {
      const radians = (angle * Math.PI) / 180;
      for (let r = 0; r <= 60; r += 0.05) {
        const point = { x: 54 + r * Math.cos(radians), y: r * Math.sin(radians) };
        const winner = hitTest(layout, point);
        if (winner === null || winner.target.id !== "h") {
          if (r < smallestFlip) smallestFlip = r;
          break;
        }
      }
    }
    expect(smallestFlip).toBeCloseTo(exclusive.radius, 1);
  });

  it("throws for an id that is not in the layout, rather than returning a wrong number", () => {
    const layout = compileLayout([atom("a", 0, 0, 10)], EXACT_TOLERANCE);
    expect(() => exclusiveRadius(layout, "nope")).toThrow();
  });
});
