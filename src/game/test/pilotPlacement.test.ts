import { describe, expect, it } from "vitest";

import {
  BOND_CLEARANCE,
  HYDROGEN_RING_RATIO,
  MIN_USABLE_ARC,
  angularDistance,
  freeArcsFor,
  placeAnnotations,
  type AnnotationPlacement,
  type AnnotationSlot,
} from "../pilot/annotations/placement";

const TAU = Math.PI * 2;
const deg = (d: number): number => (d * Math.PI) / 180;
const toDeg = (r: number): number => (r * 180) / Math.PI;

/**
 * The app's real lone pair rim in pixels: ATOM_R 21 + 7, per MoleculeSvg.tsx
 * and hitLayout.ts. The pixel-threshold assertions below all run at this
 * radius, because radians flatter and pixels are what a thumb hits.
 */
const RIM_PX = 28;

/** Every slot of either kind, which is what the collision assertions read. */
function allSlots(placement: AnnotationPlacement): AnnotationSlot[] {
  return [...placement.hydrogens, ...placement.lonePairs];
}

/** Closest any slot comes to any bond, in radians. The number the bug produced as ~0. */
function closestApproach(placement: AnnotationPlacement, bondAngles: readonly number[]): number {
  let worst = Infinity;
  for (const slot of allSlots(placement)) {
    for (const bond of bondAngles) worst = Math.min(worst, angularDistance(slot.angle, bond));
  }
  return worst;
}

/** Smallest EUCLIDEAN distance between any two slots, in the request's units. */
function minPairDistance(placement: AnnotationPlacement): number {
  const all = allSlots(placement);
  let worst = Infinity;
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      worst = Math.min(worst, Math.hypot(all[i]!.pos.x - all[j]!.pos.x, all[i]!.pos.y - all[j]!.pos.y));
    }
  }
  return worst;
}

/** A slot's angle measured relative to a rotation, normalised to [0, 2 pi). */
function relAngle(slot: AnnotationSlot, rotation: number): number {
  const a = (slot.angle - rotation) % TAU;
  return a < 0 ? a + TAU : a;
}

/** Circular difference between two normalised angles, in [0, pi]. */
function circDiff(a: number, b: number): number {
  const d = Math.abs(a - b);
  return d > Math.PI ? TAU - d : d;
}

describe("placeAnnotations, the bond-facing rule", () => {
  it("H-Br: none of bromine's three lone pairs comes near the H-Br bond", () => {
    // Bromine at the origin with its single bond pointing along +x at the
    // hydrogen. This is the exact case the shipped fan gets wrong: openAngle
    // for a one-bonded atom is the reverse of the bond, so openAngle + Math.PI
    // IS the bond direction and all three dots land on the bond line.
    const bond = 0;
    const placement = placeAnnotations({
      bondAngles: [bond],
      hydrogenCount: 0,
      lonePairCount: 3,
      radius: 0.4,
    });

    expect(placement.lonePairs).toHaveLength(3);
    expect(placement.hydrogens).toHaveLength(0);
    expect(placement.crowded).toBe(false);

    // The free arc is the whole circle less the two clearance half-cones, and
    // three slots spread at (i + 0.5) / 3 of it, so the closest approach is
    // exactly clearance + width / 6.
    const width = TAU - 2 * BOND_CLEARANCE;
    const expected = BOND_CLEARANCE + width / 6;
    expect(expected).toBeCloseTo(1.367198, 6);
    expect(toDeg(expected)).toBeCloseTo(78.33, 2);

    const closest = closestApproach(placement, [bond]);
    expect(closest).toBeCloseTo(expected, 12);
    // The assertion that matters: nothing is inside the clearance, with room
    // to spare rather than by a rounding hair.
    expect(closest).toBeGreaterThan(BOND_CLEARANCE);
    expect(toDeg(closest)).toBeGreaterThan(78);
    for (const slot of placement.lonePairs) expect(slot.crowded).toBe(false);

    // And the middle dot sits on the true open direction, straight opposite
    // the bond, which is where a student expects the electrons to be.
    expect(placement.lonePairs[1]?.angle).toBeCloseTo(Math.PI, 12);
  });

  it("H-Br at the real 28 px rim: nearest-neighbour spacing beats the bar's measured 38.9 px", () => {
    // Round 1 lost this number: 29.8 px against Alchemie's 38.9 (three dot
    // pairs on the carboxylate oxygen of 01-mechanism-canvas-full.png,
    // measured by the round 1 critic at the app's 28 px rim). The causes were
    // a 0.9 rad clearance protecting empty rim and (i + 1) / (k + 1) insets
    // bunching the slots mid-arc. With the geometric clearance and the
    // half-gap spread the same three dots sit 43.4 px apart. Reverting either
    // change alone drops this below the bar (34.6 px and 38.1 px), so this
    // single assertion pins both.
    const placement = placeAnnotations({
      bondAngles: [0],
      hydrogenCount: 0,
      lonePairCount: 3,
      radius: RIM_PX,
    });
    const chord = minPairDistance(placement);
    expect(chord).toBeGreaterThan(38.9);
    expect(chord).toBeCloseTo(43.417, 2);
  });

  it("H-Br: the shipped rule it replaces puts every dot ON the bond", () => {
    // Not a test of new code. It pins the defect so nobody re-derives the old
    // rule by accident. openAngle for a single bond along +x is pi.
    const bond = 0;
    const openAngle = Math.PI;
    const count = 3;
    const old: number[] = [];
    for (let i = 0; i < count; i += 1) {
      // src/render/svg/MoleculeSvg.tsx:72 and src/tabs/trainer/hitLayout.ts:70
      old.push(openAngle + Math.PI + (i - (count - 1) / 2) * 1.25);
    }
    const oldClosest = Math.min(...old.map((angle) => angularDistance(angle, bond)));
    expect(oldClosest).toBeCloseTo(0, 12);
    expect(oldClosest).toBeLessThan(BOND_CLEARANCE);
  });

  it("water-shaped oxygen: both lone pairs go below, never onto the H-O-H bisector", () => {
    // Two bonds 104.5 degrees apart, symmetric about straight up.
    const half = deg(104.5 / 2);
    const bonds = [Math.PI / 2 - half, Math.PI / 2 + half];
    const bisector = Math.PI / 2;

    const placement = placeAnnotations({
      bondAngles: bonds,
      hydrogenCount: 0,
      lonePairCount: 2,
      radius: 0.4,
    });

    expect(placement.lonePairs).toHaveLength(2);
    expect(placement.crowded).toBe(false);

    // At the geometric clearance the gap between the two O-H bonds is a real
    // arc (104.5 deg minus two 27.50 deg half-cones, about 49.5 deg), so TWO
    // arcs survive. The apportionment still sends both lone pairs to the wide
    // far arc, because half of 200.5 deg beats all of 49.5: the bisector arc
    // exists and goes unused, which is the honest version of "away from the
    // bonds" rather than a discarded-sliver accident.
    expect(placement.freeArcs).toHaveLength(2);
    const widths = placement.freeArcs.map((arc) => toDeg(arc.width)).sort((a, b) => a - b);
    expect(widths[0]).toBeCloseTo(104.5 - 2 * toDeg(BOND_CLEARANCE), 9);
    expect(widths[1]).toBeCloseTo(360 - 104.5 - 2 * toDeg(BOND_CLEARANCE), 9);
    expect(widths[0]).toBeGreaterThan(toDeg(MIN_USABLE_ARC));

    expect(closestApproach(placement, bonds)).toBeGreaterThan(BOND_CLEARANCE);
    for (const slot of placement.lonePairs) {
      // Measured 2.2668 rad = 129.9 degrees from the bisector, both dots.
      expect(angularDistance(slot.angle, bisector)).toBeGreaterThan(2.2);
      // Below the atom: scene y grows up, so both dots have negative y.
      expect(slot.pos.y).toBeLessThan(0);
    }
    // Symmetric about straight down, which is what water looks like.
    const mid = (placement.lonePairs[0]!.angle + placement.lonePairs[1]!.angle) / 2;
    expect(mid).toBeCloseTo((3 * Math.PI) / 2, 9);
  });

  it("water-shaped oxygen: with a clearance that covers the bisector, no arc exists there at all", () => {
    // The stricter reading of the rule. At clearance 0.95 the two cones
    // overlap on the bisector, so the bisector is genuinely inside the bond
    // clearance and no arc exists there.
    const half = deg(104.5 / 2);
    const bonds = [Math.PI / 2 - half, Math.PI / 2 + half];
    const clearance = 0.95;
    expect(clearance).toBeGreaterThan(half);

    const arcs = freeArcsFor(bonds, clearance);
    expect(arcs).toHaveLength(1);
    for (const arc of arcs) {
      // The single surviving arc does not contain the bisector.
      const offset = ((Math.PI / 2 - arc.start) % TAU + TAU) % TAU;
      expect(offset).toBeGreaterThan(arc.width);
    }

    const placement = placeAnnotations({
      bondAngles: bonds,
      hydrogenCount: 0,
      lonePairCount: 2,
      radius: 0.4,
      bondClearance: clearance,
    });
    expect(closestApproach(placement, bonds)).toBeGreaterThan(clearance);
    for (const slot of placement.lonePairs) {
      // Measured 2.5018 rad = 143.3 degrees from the bisector, and below.
      expect(angularDistance(slot.angle, Math.PI / 2)).toBeGreaterThan(2.4);
      expect(slot.pos.y).toBeLessThan(0);
    }
  });

  it("three-bonded carbon with one hydrogen: the hydrogen takes the one usable gap", () => {
    // Bonds at 90, 150 and 210 degrees. The two 60 degree openings between
    // them leave 5 degree slivers past the cones, under MIN_USABLE_ARC, so
    // exactly one usable arc survives: the 240 degree opening through 330.
    const bonds = [deg(90), deg(150), deg(210)];
    const placement = placeAnnotations({
      bondAngles: bonds,
      hydrogenCount: 1,
      lonePairCount: 0,
      radius: 0.4,
    });

    expect(placement.freeArcs).toHaveLength(1);
    expect(placement.hydrogens).toHaveLength(1);
    expect(placement.crowded).toBe(false);

    const h = placement.hydrogens[0]!;
    // Dead centre of the gap, which is the bisector of the 240 degree opening
    // between the bonds at 210 and 90.
    expect(toDeg(h.angle)).toBeCloseTo(330, 6);
    expect(h.bondDistance).toBeCloseTo(deg(120), 9);
    expect(h.bondDistance).toBeGreaterThan(BOND_CLEARANCE);
  });

  it("evenly trigonal carbon with one hydrogen: three equal gaps, the first one wins, deterministically", () => {
    const bonds = [0, deg(120), deg(240)];
    const placement = placeAnnotations({
      bondAngles: bonds,
      hydrogenCount: 1,
      lonePairCount: 0,
      radius: 0.4,
    });

    // 120 degree spacing minus two 27.5 degree half-cones leaves 65 degrees
    // of usable gap in each of the three openings.
    expect(placement.freeArcs).toHaveLength(3);
    for (const arc of placement.freeArcs) expect(arc.width).toBeCloseTo(TAU / 3 - 2 * BOND_CLEARANCE, 9);

    const h = placement.hydrogens[0]!;
    expect(toDeg(h.angle)).toBeCloseTo(60, 6);
    expect(h.bondDistance).toBeCloseTo(Math.PI / 3, 9);
    expect(h.crowded).toBe(false);
  });

  it("MIN_USABLE_ARC is a real boundary: a sliver one notch under it is dropped, one notch over is kept", () => {
    // Two bonds just past 2 * clearance apart leave a between-bond arc of
    // exactly gap - 2 * clearance. At 0.119 rad it is under the 0.12 line and
    // must be discarded; at 0.13 it must survive. This pins the constant
    // itself, where round 1 pinned it only through a (mis-measured) side
    // effect of the water case.
    const under = freeArcsFor([0, 2 * BOND_CLEARANCE + 0.119], BOND_CLEARANCE);
    expect(under).toHaveLength(1);
    expect(0.119).toBeLessThan(MIN_USABLE_ARC);

    const over = freeArcsFor([0, 2 * BOND_CLEARANCE + 0.13], BOND_CLEARANCE);
    expect(over).toHaveLength(2);
    expect(Math.min(...over.map((arc) => arc.width))).toBeCloseTo(0.13, 9);
  });
});

describe("placeAnnotations, rotation invariance", () => {
  // The round 1 defect this pins: openness ties broke on ABSOLUTE scene
  // angle, so at scene rotation 116 degrees an alcohol oxygen's H glyph and a
  // lone pair TRADED PLACES, teleporting the H 128 degrees across the open
  // face, with further swaps at 98, 143 and 245 degrees on a secondary amine.
  // The sweep below steps 1 degree through a full turn, so it passes through
  // every one of those measured failure angles.
  const shapes = [
    {
      name: "alcohol oxygen, 1 bond + 1 H + 2 LP",
      make: (rot: number) => ({ bondAngles: [rot], hydrogenCount: 1, lonePairCount: 2, radius: RIM_PX }),
    },
    {
      name: "secondary amine N, 2 bonds + 1 H + 1 LP",
      make: (rot: number) => ({
        bondAngles: [rot, rot + deg(120)],
        hydrogenCount: 1,
        lonePairCount: 1,
        radius: RIM_PX,
      }),
    },
  ] as const;

  for (const shape of shapes) {
    it(`${shape.name}: every slot's bond-relative angle is constant through a 1 degree rotation sweep`, () => {
      const step = deg(1);
      const baseline = placeAnnotations(shape.make(0));
      const baseRel = {
        hydrogens: baseline.hydrogens.map((slot) => relAngle(slot, 0)),
        lonePairs: baseline.lonePairs.map((slot) => relAngle(slot, 0)),
      };

      let previous = baseRel;
      for (let d = 1; d < 360; d += 1) {
        const rot = deg(d);
        const placement = placeAnnotations(shape.make(rot));
        const rel = {
          hydrogens: placement.hydrogens.map((slot) => relAngle(slot, rot)),
          lonePairs: placement.lonePairs.map((slot) => relAngle(slot, rot)),
        };

        for (const kind of ["hydrogens", "lonePairs"] as const) {
          expect(rel[kind]).toHaveLength(baseRel[kind].length);
          for (let i = 0; i < rel[kind].length; i += 1) {
            // Constant, not merely continuous: the same molecule rotated is
            // the same placement rotated, per slot, per kind, per index.
            expect(circDiff(rel[kind][i]!, baseRel[kind][i]!), `${kind}[${i}] at ${d} deg`).toBeLessThan(1e-9);
            // And the explicitly requested form: no slot's bond-relative
            // angle ever jumps by more than the sweep step.
            expect(circDiff(rel[kind][i]!, previous[kind][i]!), `${kind}[${i}] jump at ${d} deg`).toBeLessThan(step);
          }
        }
        previous = rel;
      }
    });
  }

  it("bromine's slot INDICES are bond-relative too: index 0 is the same dot at any orientation", () => {
    // Round 1 numbered slots by absolute angle, so rotating the bond from 90
    // to 120 degrees renumbered the dots (index 0 flipped from the dot 78.3
    // degrees off the bond to the one 281.7 off it), and hitLayout keys armed
    // highlights on slotIndex. Same relative dot, same index, always.
    const relOf = (bondDeg: number): number[] => {
      const rot = deg(bondDeg);
      const placement = placeAnnotations({ bondAngles: [rot], hydrogenCount: 0, lonePairCount: 3, radius: RIM_PX });
      return placement.lonePairs.map((slot) => relAngle(slot, rot));
    };
    const at90 = relOf(90);
    const at120 = relOf(120);
    expect(at90).toHaveLength(3);
    for (let i = 0; i < 3; i += 1) expect(circDiff(at90[i]!, at120[i]!), `index ${i}`).toBeLessThan(1e-9);
    // And index 0 really is the low-relative-angle dot, 78.3 degrees off the bond.
    expect(toDeg(at90[0]!)).toBeCloseTo(78.33, 2);
    expect(toDeg(at90[1]!)).toBeCloseTo(180, 6);
    expect(toDeg(at90[2]!)).toBeCloseTo(281.67, 2);
  });
});

describe("placeAnnotations, hydrogens and lone pairs sharing one arc set", () => {
  it("an alcohol oxygen puts its lone pairs in the open and its hydrogen off to the side", () => {
    const bonds = [0];
    const placement = placeAnnotations({
      bondAngles: bonds,
      hydrogenCount: 1,
      lonePairCount: 2,
      radius: 0.4,
      hydrogenRadius: 0.55,
    });

    expect(placement.hydrogens).toHaveLength(1);
    expect(placement.lonePairs).toHaveLength(2);
    expect(closestApproach(placement, bonds)).toBeGreaterThan(BOND_CLEARANCE);

    // Three positions in one arc: the middle one straight opposite the bond,
    // and two flanking ones that tie with each other to the last bit. Lone
    // pairs take the most open position outright, and the tie between the two
    // flanks is broken on BOND-RELATIVE angle ascending, per rule 5, so the
    // lone pair takes the counter-clockwise flank and the hydrogen the
    // clockwise one at every orientation.
    const width = TAU - 2 * BOND_CLEARANCE;
    expect(placement.lonePairs[0]!.angle).toBeCloseTo(BOND_CLEARANCE + width / 6, 12);
    expect(placement.lonePairs[1]!.angle).toBeCloseTo(Math.PI, 12);
    expect(placement.hydrogens[0]!.angle).toBeCloseTo(BOND_CLEARANCE + (5 * width) / 6, 12);
    const mostOpen = Math.max(...allSlots(placement).map((slot) => slot.bondDistance));
    expect(placement.lonePairs.some((slot) => slot.bondDistance === mostOpen)).toBe(true);
    expect(placement.hydrogens[0]!.bondDistance).toBeLessThan(mostOpen);

    // The hydrogen radius override is honoured and the lone pair one is not
    // touched by it.
    expect(Math.hypot(placement.hydrogens[0]!.pos.x, placement.hydrogens[0]!.pos.y)).toBeCloseTo(0.55, 12);
    for (const slot of placement.lonePairs) {
      expect(Math.hypot(slot.pos.x, slot.pos.y)).toBeCloseTo(0.4, 12);
    }
  });

  it("hydrogens default to their own ring at 0.75 of the lone pair radius, the shipped two-ring geometry", () => {
    // MoleculeSvg draws HydrogenArc on the atom disc (ATOM_R 21 px) and lone
    // pairs at 28 px; 21/28 = 0.75. Round 1 defaulted both onto one circle,
    // which the shipped app had already avoided.
    expect(HYDROGEN_RING_RATIO).toBeCloseTo(21 / 28, 12);
    const placement = placeAnnotations({ bondAngles: [0], hydrogenCount: 1, lonePairCount: 2, radius: RIM_PX });
    expect(Math.hypot(placement.hydrogens[0]!.pos.x, placement.hydrogens[0]!.pos.y)).toBeCloseTo(21, 9);
    for (const slot of placement.lonePairs) {
      expect(Math.hypot(slot.pos.x, slot.pos.y)).toBeCloseTo(28, 9);
    }
  });

  it("chemically real atoms: no two slots of any kind within 10 px at the 28 px rim, at any rotation", () => {
    // The collision test with teeth that round 1 lacked (its threshold was
    // 1e-6 rad, 3e-5 px at this rim, a not-the-identical-float test). Every
    // (bond count, H, LP) combination C, N, O and a halogen actually draw,
    // each swept through a full turn in 1 degree steps. Hydrogens sit on
    // their default 21 px ring, lone pairs at 28. Measured floor: 30.3 px, on
    // a one-bonded carbon's three hydrogens.
    const shapes = [
      { el: "CH3-", bonds: (r: number) => [r], h: 3, lp: 0 },
      { el: "CH2<", bonds: (r: number) => [r, r + deg(120)], h: 2, lp: 0 },
      { el: "CH<3", bonds: (r: number) => [r, r + deg(120), r + deg(240)], h: 1, lp: 0 },
      { el: "NH2-", bonds: (r: number) => [r], h: 2, lp: 1 },
      { el: "NH<", bonds: (r: number) => [r, r + deg(120)], h: 1, lp: 1 },
      { el: "N<3", bonds: (r: number) => [r, r + deg(120), r + deg(240)], h: 0, lp: 1 },
      { el: "OH-", bonds: (r: number) => [r], h: 1, lp: 2 },
      { el: "O<", bonds: (r: number) => [r, r + deg(104.5)], h: 0, lp: 2 },
      { el: "Br-", bonds: (r: number) => [r], h: 0, lp: 3 },
    ] as const;

    let worst = Infinity;
    for (const shape of shapes) {
      for (let d = 0; d < 360; d += 1) {
        const placement = placeAnnotations({
          bondAngles: shape.bonds(deg(d)),
          hydrogenCount: shape.h,
          lonePairCount: shape.lp,
          radius: RIM_PX,
        });
        const pair = minPairDistance(placement);
        expect(pair, `${shape.el} at ${d} deg`).toBeGreaterThan(10);
        worst = Math.min(worst, pair);
      }
    }
    expect(worst).toBeCloseTo(30.3, 1);
  });

  it("keeps a real angular gap between all slots across the generic shape sweep, unreal shapes included", () => {
    // Robustness rather than chemistry: bond counts 0 to 4 at rotations that
    // include every round 1 kind-swap angle (98, 116, 143, 245 degrees),
    // against every count combination up to 3 H and 4 LP, even ones no atom
    // draws. Worst measured separation is 0.3054 rad (17.5 deg), a 4-bonded
    // atom carrying 7 annotations, so the floor asserted is 0.3 rad, not a
    // float-identity epsilon.
    let checked = 0;
    const rotations = [0, 0.37, deg(98), deg(116), deg(143), deg(245)];
    for (const rotation of rotations) {
      for (let bondCount = 0; bondCount <= 4; bondCount += 1) {
        const bonds = Array.from({ length: bondCount }, (_, i) => rotation + (i * TAU) / Math.max(1, bondCount));
        for (let h = 0; h <= 3; h += 1) {
          for (let lp = 0; lp <= 4; lp += 1) {
            if (h + lp === 0) continue;
            const placement = placeAnnotations({
              bondAngles: bonds,
              hydrogenCount: h,
              lonePairCount: lp,
              radius: 0.4,
            });
            expect(placement.hydrogens).toHaveLength(h);
            expect(placement.lonePairs).toHaveLength(lp);
            if (h + lp > 1) {
              expect(placement.minSlotSeparation, `bonds=${bondCount} h=${h} lp=${lp} rot=${rotation}`).toBeGreaterThan(0.3);
            }
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBe(rotations.length * (5 * 4 * 5 - 5));
  });

  it("keeps every slot outside the clearance whenever a usable free arc exists", () => {
    for (const rotation of [0, 0.37, deg(116), deg(245)]) {
      for (let bondCount = 1; bondCount <= 3; bondCount += 1) {
        const bonds = Array.from({ length: bondCount }, (_, i) => rotation + (i * TAU) / bondCount);
        for (let h = 0; h <= 3; h += 1) {
          for (let lp = 0; lp <= 3; lp += 1) {
            if (h + lp === 0) continue;
            const placement = placeAnnotations({ bondAngles: bonds, hydrogenCount: h, lonePairCount: lp, radius: 0.4 });
            if (placement.freeArcs.length === 0) continue;
            expect(placement.crowded, `bonds=${bondCount} h=${h} lp=${lp}`).toBe(false);
            expect(closestApproach(placement, bonds)).toBeGreaterThan(BOND_CLEARANCE);
          }
        }
      }
    }
  });
});

describe("placeAnnotations, degrading honestly", () => {
  it("cones covering the circle: no free arc, so it says so and spreads the slots in the widest raw gap", () => {
    // The geometric default clearance never covers the circle for a drawable
    // molecule (four bonds at 90 degrees still leave four usable gaps), so
    // the degraded mode is exercised the way a caller would actually reach
    // it: a larger caller-supplied clearance. Four 0.9 rad half-cones cover
    // 412 degrees of a 360 degree circle.
    const bonds = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    expect(freeArcsFor(bonds, BOND_CLEARANCE)).toHaveLength(4);
    expect(freeArcsFor(bonds, 0.9)).toHaveLength(0);

    const placement = placeAnnotations({
      bondAngles: bonds,
      hydrogenCount: 0,
      lonePairCount: 3,
      radius: 0.4,
      bondClearance: 0.9,
    });

    expect(placement.freeArcs).toHaveLength(0);
    expect(placement.crowded).toBe(true);
    for (const slot of placement.lonePairs) expect(slot.crowded).toBe(true);

    // Deterministic and non-overlapping: three slots spread at (i + 0.5) / 3
    // of the first of four tied 90 degree gaps, so 15, 45 and 75 degrees.
    expect(placement.lonePairs.map((slot) => Math.round(toDeg(slot.angle) * 1e6) / 1e6)).toEqual([15, 45, 75]);
    expect(placement.minSlotSeparation).toBeCloseTo(Math.PI / 6, 12);
    expect(placement.minBondDistance).toBeCloseTo(Math.PI / 12, 12);
    // It is honest about being crowded: the worst slot really is inside the
    // clearance, and the result says so rather than claiming a clean placement.
    expect(placement.minBondDistance).toBeLessThan(0.9);
  });

  it("reports nothing at all for an atom with nothing to annotate", () => {
    const placement = placeAnnotations({ bondAngles: [0, Math.PI], hydrogenCount: 0, lonePairCount: 0, radius: 0.4 });
    expect(placement.hydrogens).toHaveLength(0);
    expect(placement.lonePairs).toHaveLength(0);
    expect(placement.crowded).toBe(false);
    expect(placement.minBondDistance).toBe(Infinity);
    expect(placement.minSlotSeparation).toBe(Infinity);
  });

  it("a bare atom with no bonds spreads evenly around the whole circle", () => {
    const placement = placeAnnotations({ bondAngles: [], hydrogenCount: 0, lonePairCount: 4, radius: 0.4 });
    expect(placement.freeArcs).toEqual([{ start: (3 * Math.PI) / 2, width: TAU }]);
    expect(placement.crowded).toBe(false);
    expect(placement.minSlotSeparation).toBeCloseTo(Math.PI / 2, 12);
    for (const slot of placement.lonePairs) expect(slot.bondDistance).toBe(Math.PI);
  });

  it("rejects impossible counts rather than guessing", () => {
    expect(() => placeAnnotations({ bondAngles: [], hydrogenCount: -1, lonePairCount: 0, radius: 0.4 })).toThrow(
      /non-negative integer/,
    );
    expect(() => placeAnnotations({ bondAngles: [Number.NaN], hydrogenCount: 1, lonePairCount: 0, radius: 0.4 })).toThrow(
      /finite/,
    );
  });
});

describe("placeAnnotations, determinism", () => {
  it("returns bit-identical output for the same input, called twice", () => {
    const request = {
      centre: { x: 1.5, y: -2.25 },
      bondAngles: [0.31, 2.02, 4.4],
      hydrogenCount: 2,
      lonePairCount: 2,
      radius: 0.43,
      hydrogenRadius: 0.61,
    } as const;
    const a = placeAnnotations(request);
    const b = placeAnnotations({ ...request, bondAngles: [...request.bondAngles] });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it("does not depend on the order the bonds arrive in", () => {
    const bonds = [deg(20), deg(140), deg(260)];
    const forward = placeAnnotations({ bondAngles: bonds, hydrogenCount: 1, lonePairCount: 1, radius: 0.4 });
    const reversed = placeAnnotations({ bondAngles: [...bonds].reverse(), hydrogenCount: 1, lonePairCount: 1, radius: 0.4 });
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(forward));
  });

  it("is invariant under a whole turn added to every bond angle", () => {
    const bonds = [0.4, 2.1];
    const plain = placeAnnotations({ bondAngles: bonds, hydrogenCount: 1, lonePairCount: 2, radius: 0.4 });
    const wrapped = placeAnnotations({
      bondAngles: bonds.map((a) => a + TAU * 3),
      hydrogenCount: 1,
      lonePairCount: 2,
      radius: 0.4,
    });
    // Bitwise equality is not available here and asserting it would be
    // asserting IEEE 754, not the placement: a modulo by 2 pi on an angle that
    // has been through three extra turns lands one ulp away. Twelve decimal
    // places is four orders of magnitude tighter than any pixel and is the
    // real claim, which is that a wrapped angle places identically.
    expect(wrapped.hydrogens).toHaveLength(plain.hydrogens.length);
    expect(wrapped.lonePairs).toHaveLength(plain.lonePairs.length);
    wrapped.hydrogens.forEach((slot, i) => expect(slot.angle).toBeCloseTo(plain.hydrogens[i]!.angle, 12));
    wrapped.lonePairs.forEach((slot, i) => expect(slot.angle).toBeCloseTo(plain.lonePairs[i]!.angle, 12));
  });
});
