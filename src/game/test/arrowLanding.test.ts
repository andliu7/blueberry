/**
 * The arrow landing rule, and the defect that produced it.
 *
 * Round seven's captures showed the leaving group arrow as a vertical stub over
 * the middle of the C-Br bond, pointing back down at the bond and never
 * touching bromine: it read as electrons flowing INTO the bond rather than out
 * of it with the leaving group, which is the opposite of the chemistry.
 *
 * The cause was arithmetic, not taste. The landing was the rim point facing the
 * source, offset by a flat 16 unit clearance. Bromine's radius is 21 and the
 * bond's midpoint is 38 from its centre, so 21 + 16 = 37 put the landing 0.8
 * units from where the arrow started, and bowAwayFrom treats a chord under 1 as
 * degenerate and bows straight up.
 *
 * These cases are the general shape of that bug, not the one instance, so they
 * hold whatever the demo step's layout does later.
 */

import { describe, expect, it } from "vitest";

import { landingOnRim } from "../tabs/trainer/hitLayout";
import type { Point2 } from "@blueberry/interaction";

const LAND_GAP = 16;
const centre: Point2 = { x: 0, y: 0 };
const dist = (a: Point2, b: Point2): number => Math.hypot(a.x - b.x, a.y - b.y);

describe("landingOnRim", () => {
  it("keeps a drawable chord when the source is closer than the radius plus the gap", () => {
    // The C-Br case: r 21.4, source 38.2 away, so a flat 16 unit gap leaves 0.8.
    const from: Point2 = { x: 38.2, y: 0 };
    const landing = landingOnRim(centre, 21.4, from, { x: -60, y: 0 }, LAND_GAP);
    expect(dist(landing, from)).toBeGreaterThan(20);
  });

  it("never lands inside the sphere it points at", () => {
    for (const reach of [24, 30, 38.2, 60, 120, 400]) {
      const landing = landingOnRim(centre, 21.4, { x: reach, y: 0 }, { x: -60, y: 0 }, LAND_GAP);
      expect(dist(landing, centre), `reach ${reach}`).toBeGreaterThanOrEqual(21.4);
    }
  });

  it("does not move a landing that already had room", () => {
    // A long nucleophile arrow: the straight rim point is the right answer and
    // the swing must be inert, or this fix would have moved every other arrow.
    const from: Point2 = { x: 200, y: 0 };
    const landing = landingOnRim(centre, 21.4, from, { x: 0, y: 90 }, LAND_GAP);
    expect(landing.x).toBeCloseTo(21.4 + LAND_GAP, 5);
    expect(landing.y).toBeCloseTo(0, 5);
  });

  it("swings to the side away from the rest of the molecule", () => {
    // Centroid below the atom, so the landing must swing above it: an arrow
    // that arcs through its own molecule is the thing bowAwayFrom exists to
    // prevent, and a landing on the wrong side would put it back.
    const landing = landingOnRim(centre, 21.4, { x: 38.2, y: 0 }, { x: 0, y: 200 }, LAND_GAP);
    expect(landing.y).toBeLessThan(0);
    const mirrored = landingOnRim(centre, 21.4, { x: 38.2, y: 0 }, { x: 0, y: -200 }, LAND_GAP);
    expect(mirrored.y).toBeGreaterThan(0);
  });

  it("degrades rather than throwing when the source sits on the rim", () => {
    // Two atoms overlapping is a layout bug, not a drawing one, but the drawing
    // must not produce NaN while someone fixes the layout.
    const landing = landingOnRim(centre, 21.4, { x: 21.4, y: 0 }, { x: -60, y: 0 }, LAND_GAP);
    expect(Number.isFinite(landing.x)).toBe(true);
    expect(Number.isFinite(landing.y)).toBe(true);
  });

  it("clamps the swing so an arrow never doubles back behind the atom", () => {
    // At 1.75 rad the landing is still on the near hemisphere's far edge. Past
    // that the head would point at the atom from behind, which reads as the
    // electrons arriving from the wrong species entirely.
    const landing = landingOnRim(centre, 21.4, { x: 23, y: 0 }, { x: -60, y: 0 }, LAND_GAP);
    const swing = Math.abs(Math.atan2(landing.y, landing.x));
    expect(swing).toBeLessThanOrEqual(1.75 + 1e-9);
  });
});
