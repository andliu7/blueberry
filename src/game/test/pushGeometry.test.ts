/**
 * The committed arrow's geometry, measured, for the round four critic's
 * findings (g5-arrows-verdict.md) on the SN2 step: the leaving-group arrow is
 * a real arrow and not a 12 px stub, heads touch the atom they land on, the
 * saved tail stays on the pair the student grabbed, and an arrow whose chord
 * crosses an atom that is not its end bends round it.
 */

import { describe, expect, it } from "vitest";
import { createArrow, fromLonePair, toBondBetween, type ElectronFlowArrow } from "@blueberry/chem-core";
import type { Point2 } from "@blueberry/interaction";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "../demo/sn2Step";
import { layoutState } from "../render/layout/layout";
import { buildStepScene } from "../render/layout/stepScene";
import { annotateScene, committedArrowGeometry } from "../tabs/trainer/engine/screenLayout";
import { atomCentre, atomRadius, sceneCentroid } from "../tabs/trainer/hitLayout";

const step = SN2_DEMO_STEP;
const scene = buildStepScene(step, layoutState(step.from, SN2_FROM_HINTS), layoutState(step.to, SN2_TO_HINTS));
const annotations = annotateScene(scene, "from");
const centroid = sceneCentroid(scene);
const radiusOf = (id: string) => atomRadius(scene.atoms.find((atom) => atom.id === id)?.element ?? "C");
const distance = (a: Point2, b: Point2) => Math.hypot(a.x - b.x, a.y - b.y);
const arrow = (id: string): ElectronFlowArrow => {
  const found = step.arrows.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no arrow ${id}`);
  return found;
};

/** Points along the path the dashed arrow draws: straight, or the quadratic through its control. */
function samples(from: Point2, control: Point2 | null, to: Point2): Point2[] {
  return Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    if (control === null) return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    const u = 1 - t;
    return { x: u * u * from.x + 2 * u * t * control.x + t * t * to.x, y: u * u * from.y + 2 * u * t * control.y + t * t * to.y };
  });
}

describe("committed arrow geometry on the SN2", () => {
  it("draws the leaving-group arrow as a real arc landing on bromine's surface", () => {
    const g = committedArrowGeometry(step, scene, annotations, arrow("a-leave"), centroid);
    const bromine = atomCentre(scene, "br1");
    // 34 canvas units is about 30 CSS px at the phone's scale; the critic measured 12.
    expect(distance(g.from, g.landing)).toBeGreaterThanOrEqual(34);
    expect(Math.abs(distance(g.landing, bromine) - radiusOf("br1"))).toBeLessThanOrEqual(2);
    // It bends (a control point), so the dashed style draws it as an arc too.
    expect(g.control).not.toBeNull();
  });

  it("lands the attack's head on carbon's surface, not short of it", () => {
    const g = committedArrowGeometry(step, scene, annotations, arrow("a-attack"), centroid);
    expect(g.targetAtom).toBe("c1");
    expect(Math.abs(distance(g.landing, atomCentre(scene, "c1")) - radiusOf("c1"))).toBeLessThanOrEqual(2);
  });

  it("keeps the tail on the lone pair the student grabbed", () => {
    const slots = annotations.get("o1")?.lonePairs ?? [];
    expect(slots.length).toBeGreaterThan(1);
    slots.forEach((slot, index) => {
      const g = committedArrowGeometry(step, scene, annotations, arrow("a-attack"), centroid, index);
      expect(distance(g.from, slot.posPx)).toBeLessThan(0.01);
    });
  });

  it("bends an O to Br push round the carbon in its way, clear of its H labels", () => {
    const miss = createArrow({ id: "s-miss", source: fromLonePair("o1"), sink: toBondBetween("o1", "br1") });
    const g = committedArrowGeometry(step, scene, annotations, miss, centroid);
    expect(g.targetAtom).toBe("br1");
    expect(g.control).not.toBeNull();
    const carbon = atomCentre(scene, "c1");
    const nearest = Math.min(...samples(g.from, g.control, g.landing).map((p) => distance(p, carbon)));
    // Clear of the sphere, and of the H labels that ring it at radius + 13.
    expect(nearest).toBeGreaterThan(radiusOf("c1") + 13);
  });
});
