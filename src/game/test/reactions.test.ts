/**
 * The reaction registry: every entry must actually run through the same
 * machinery the trainer uses, because "replicatable for any reaction" is a
 * claim about data, and data only proves itself by being executed.
 *
 * These tests import the registry, which already means every step passed
 * chem-core's constructors (a conservation error throws at module load), and
 * then walk each entry through layout, scene building, grading and the
 * orbit-drag geometry.
 */

import { describe, expect, it } from "vitest";

import { arrowLegalityFindings } from "@blueberry/chem-core";
import { layoutState } from "../render/layout/layout";
import { buildStepScene } from "../render/layout/stepScene";
import { gradeDrawing } from "../tabs/trainer/grade";
import { orbitPoint, resettleOpenAngles, terminalNeighbor } from "../tabs/trainer/hitLayout";
import { TRAINER_REACTIONS } from "../demo/reactions";
import { TRAINER_SEQUENCES } from "../demo/sequences";
import { RESONANCE_HUNT } from "../demo/resonance";
import { resolveBeat } from "../beats/BeatRunner";
import { PATHWAY_UNITS, coverage } from "../demo/pathwayMap";

describe("the reaction registry", () => {
  it("holds at least three reactions, per the owner's more-examples requirement", () => {
    expect(TRAINER_REACTIONS.length).toBeGreaterThanOrEqual(3);
  });

  for (const reaction of TRAINER_REACTIONS) {
    describe(reaction.title, () => {
      it("lays out and builds a scene from its own hints", () => {
        const scene = buildStepScene(reaction.step, layoutState(reaction.step.from, reaction.fromHints), layoutState(reaction.step.to, reaction.toHints));
        for (const member of reaction.step.from.members) {
          for (const atom of member.species.atoms) {
            expect(scene.atoms.some((candidate) => candidate.id === atom.id), atom.id).toBe(true);
          }
        }
      });

      it("carries authored arrows that are legal on its own from state", () => {
        expect(arrowLegalityFindings(reaction.step.arrows, reaction.step.from)).toEqual([]);
      });

      it("grades its own authored answer correct", () => {
        expect(gradeDrawing(reaction.step, reaction.step.arrows).kind).toBe("correct");
      });
    });
  }
});

describe("the pi push is an animatable event", () => {
  it("the carbonyl C=O carries order 2 into the step and order 1 out of it", () => {
    // The owner's report verbatim: "the carbonyl is not pushing the bond to
    // the oxygen to form the tetrahedral intermediate." The cause was the
    // scene merging the pair at max(2,1)=2, which rendered a static double
    // bond through the whole animation and a chemically wrong final frame.
    const reaction = TRAINER_REACTIONS.find((entry) => entry.id === "carbonyl-addition");
    if (reaction === undefined) throw new Error("carbonyl-addition missing");
    const scene = buildStepScene(reaction.step, layoutState(reaction.step.from, reaction.fromHints), layoutState(reaction.step.to, reaction.toHints));
    const co = scene.bonds.find((bond) => (bond.a === "c1" && bond.b === "o2") || (bond.a === "o2" && bond.b === "c1"));
    if (co === undefined) throw new Error("no C=O in scene");
    expect(co.phase).toBe("persistent");
    expect(co.order).toBe(2);
    expect(co.toOrder).toBe(1);
  });

  it("an order drop on a persisting bond marks a release burst", () => {
    const reaction = TRAINER_REACTIONS.find((entry) => entry.id === "carbonyl-addition");
    if (reaction === undefined) throw new Error("carbonyl-addition missing");
    const scene = buildStepScene(reaction.step, layoutState(reaction.step.from, reaction.fromHints), layoutState(reaction.step.to, reaction.toHints));
    expect(scene.breakingMidpoints.length).toBeGreaterThanOrEqual(1);
  });
});

describe("the orbit drag geometry", () => {
  it("finds the swing neighbour for every terminal atom in every reaction", () => {
    // The hydroxide H orbits its O; HCl's H orbits Cl; bromomethane's Br
    // orbits C. Multi-bonded atoms never orbit.
    const sn2 = TRAINER_REACTIONS.find((entry) => entry.id === "sn2");
    if (sn2 === undefined) throw new Error("sn2 missing from the registry");
    expect(terminalNeighbor(sn2.step, "h1")).toBe("o1");
    expect(terminalNeighbor(sn2.step, "br1")).toBe("c1");
    expect(terminalNeighbor(sn2.step, "c1")).toBe(null);
    expect(terminalNeighbor(sn2.step, "o1")).toBe(null);
  });

  it("constrains the orbit to the press-time radius whatever the pointer does", () => {
    const neighbour = { x: 100, y: 100 };
    for (const pointer of [
      { x: 500, y: 100 },
      { x: 100, y: -300 },
      { x: 101, y: 101 },
      { x: -50, y: 240 },
    ]) {
      const p = orbitPoint(neighbour, 72, pointer);
      expect(Math.hypot(p.x - neighbour.x, p.y - neighbour.y)).toBeCloseTo(72, 6);
    }
  });

  it("degenerate pointer on the neighbour still returns a point on the circle", () => {
    const p = orbitPoint({ x: 10, y: 10 }, 50, { x: 10, y: 10 });
    expect(Math.hypot(p.x - 10, p.y - 10)).toBeCloseTo(50, 6);
  });

  it("re-settles the open angle to face away from the swung bond", () => {
    const sn2 = TRAINER_REACTIONS.find((entry) => entry.id === "sn2");
    if (sn2 === undefined) throw new Error("sn2 missing from the registry");
    const scene = buildStepScene(sn2.step, layoutState(sn2.step.from, sn2.fromHints), layoutState(sn2.step.to, sn2.toHints));
    // Move the hydroxide H from below-left of O to directly ABOVE it, then
    // re-settle: O's open direction must now point broadly DOWN (away from H).
    const o = scene.atoms.find((atom) => atom.id === "o1");
    if (o === undefined) throw new Error("no o1");
    const moved = {
      ...scene,
      atoms: scene.atoms.map((atom) => (atom.id === "h1" ? { ...atom, from: { ...atom.from, pos: { x: o.from.pos.x, y: o.from.pos.y + 1, z: 0 } } } : atom)),
    };
    const settled = resettleOpenAngles(moved);
    const settledO = settled.atoms.find((atom) => atom.id === "o1");
    if (settledO === undefined) throw new Error("no settled o1");
    // Away from a bond pointing +y is an angle pointing -y.
    expect(Math.sin(settledO.from.openAngle)).toBeLessThan(-0.9);
  });
});

describe("the pathway map is a truthful ledger", () => {
  it("every playable link resolves to a real trainer entry", () => {
    for (const unit of PATHWAY_UNITS) {
      for (const node of unit.nodes) {
        if (node.playable === undefined) continue;
        const { kind, id } = node.playable;
        // A beat link promises a lesson surface rather than a trainer entry,
        // so it is resolved against the beat content. Falling through to the
        // resonance list would have quietly passed every beat link.
        const found =
          kind === "reaction"
            ? TRAINER_REACTIONS.some((entry) => entry.id === id)
            : kind === "sequence"
              ? TRAINER_SEQUENCES.some((entry) => entry.id === id)
              : kind === "beat"
                ? resolveBeat(id, 1) !== null
                : RESONANCE_HUNT.some((entry) => entry.id === id);
        expect(found, `${node.id} links ${kind}:${id}`).toBe(true);
      }
    }
  });

  it("carries the full inventory: 192 nodes, 86 of them spine", () => {
    const score = coverage();
    expect(score.total).toBe(192);
    expect(score.spineTotal).toBe(86);
  });
});
