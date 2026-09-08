import { describe, expect, it } from "vitest";

import { layoutState } from "../render/layout/layout";
import { buildStepScene } from "../render/layout/stepScene";
import { REDUCED_MOTION_FRAME } from "../render/contract";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "../demo/sn2Step";

describe("layoutState", () => {
  it("places every atom of the demo step under authored hints", () => {
    const layout = layoutState(SN2_DEMO_STEP.from, SN2_FROM_HINTS);
    for (const member of SN2_DEMO_STEP.from.members) {
      for (const atom of member.species.atoms) {
        expect(layout.atoms.has(atom.id), atom.id).toBe(true);
      }
    }
  });

  it("places every atom without hints too, via auto layout", () => {
    const layout = layoutState(SN2_DEMO_STEP.to);
    for (const member of SN2_DEMO_STEP.to.members) {
      for (const atom of member.species.atoms) {
        expect(layout.atoms.has(atom.id), atom.id).toBe(true);
      }
    }
  });

  it("refuses half-hinted states rather than silently mixing layouts", () => {
    expect(() => layoutState(SN2_DEMO_STEP.from, { o1: { x: 0, y: 0 } })).toThrow(/all or nothing/);
  });

  it("keeps the backside geometry: nucleophile opposite the leaving group", () => {
    const layout = layoutState(SN2_DEMO_STEP.from, SN2_FROM_HINTS);
    const o = layout.atoms.get("o1");
    const c = layout.atoms.get("c1");
    const br = layout.atoms.get("br1");
    if (o === undefined || c === undefined || br === undefined) throw new Error("missing placement");
    // O and Br sit on opposite sides of the carbon along x.
    expect(Math.sign(o.pos.x - c.pos.x)).toBe(-Math.sign(br.pos.x - c.pos.x));
  });
});

describe("buildStepScene on the SN2 demo", () => {
  const scene = buildStepScene(
    SN2_DEMO_STEP,
    layoutState(SN2_DEMO_STEP.from, SN2_FROM_HINTS),
    layoutState(SN2_DEMO_STEP.to, SN2_TO_HINTS),
  );

  it("classifies the C-Br bond breaking and the O-C bond forming", () => {
    const phases = new Map(scene.bonds.map((bond) => [`${bond.a}~${bond.b}`, bond.phase]));
    const all = [...phases.values()];
    expect(all).toContain("breaking");
    expect(all).toContain("forming");
    const forming = scene.bonds.find((bond) => bond.phase === "forming");
    // The forming bond grows from the electron donor, which the attack arrow
    // names: hydroxide's oxygen.
    expect(forming?.growFrom).toBe("o1");
  });

  it("carries both arrows with distinct bow directions", () => {
    expect(scene.arrows).toHaveLength(2);
    const bows = scene.arrows.map((arrow) => arrow.bow);
    expect(new Set(bows).size).toBe(2);
  });

  it("records the breaking bond midpoint for the release burst", () => {
    expect(scene.breakingMidpoints).toHaveLength(1);
  });

  it("tracks the charge handoff from hydroxide to bromide", () => {
    const oxygen = scene.atoms.find((atom) => atom.id === "o1");
    const bromine = scene.atoms.find((atom) => atom.id === "br1");
    expect(oxygen?.fromCharge).toBe(-1);
    expect(oxygen?.toCharge).toBe(0);
    expect(bromine?.fromCharge).toBe(0);
    expect(bromine?.toCharge).toBe(-1);
  });
});

describe("the reduced motion frame", () => {
  it("sits mid-step, where arrows are drawn and the forming bond is underway", () => {
    expect(REDUCED_MOTION_FRAME).toBeGreaterThan(0.3);
    expect(REDUCED_MOTION_FRAME).toBeLessThan(0.78);
  });
});
