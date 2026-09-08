/**
 * The authored beats, replayed.
 *
 * The load bearing test here is the last one: every guide stroke of every beat
 * is traced by a synthetic finger that wobbles within the corridor, and every
 * one has to COMPLETE. That is the check that catches an authoring mistake no
 * eye would: a tolerance too tight for a short bond, a stroke plan whose edges
 * do not join, a corner sharp enough that the window cannot follow it. Without
 * it, the first person to find out is a student who cannot finish a stroke and
 * has no idea why.
 */

import { describe, expect, it } from "vitest";

import { TRACE_BEATS, TRACE_TARGETS, traceContentProblems, traceTarget } from "../beats/trace/content";
import {
  IDLE_TRACE,
  advanceTrace,
  buildPath,
  canStartAt,
  pointAt,
  strokeOutcome,
  tangentAt,
  type Pt,
} from "../beats/trace/geometry";
import { DEFAULT_LEVELS, levelRuleViolations, traceGuideStyle } from "../beats/types";
import { elementPaletteFor } from "../beats/trace/target";
import {
  MULTIPLE_BOND_GAP,
  bondAxis,
  chargeLabel,
  centroidOf,
  labelledVertices,
  multipleBondLines,
  viewBoxOf,
} from "../beats/trace/render";

const DEFAULT_TOLERANCE = 22;

describe("the authored content", () => {
  it("has no authoring problems", () => {
    expect(traceContentProblems()).toEqual([]);
  });

  it("declares only levels a trace beat can serve", () => {
    expect(levelRuleViolations([...TRACE_BEATS])).toEqual([]);
    for (const beat of TRACE_BEATS) {
      for (const level of beat.levels) {
        expect(DEFAULT_LEVELS.trace).toContain(level);
      }
    }
  });

  it("covers the two families the owner asked for, on nodes that exist", () => {
    const nodes = new Set(TRACE_BEATS.map((beat) => beat.node));
    // Carbonyls are Unit 7. Diels Alder is u1-da and u12-da: pathwayMap.ts puts
    // Aromaticity at u2, so the task's "u2" is recorded as a conflict in
    // content.ts rather than authored against a node that does not exist.
    expect([...nodes].some((node) => node.startsWith("u7-"))).toBe(true);
    expect(nodes.has("u1-da")).toBe(true);
    expect(nodes.has("u12-da")).toBe(true);
  });

  it("gives every beat a molecule the L3 grader can look up", () => {
    for (const beat of TRACE_BEATS) {
      expect(traceTarget(beat.moleculeId)).toBeDefined();
    }
  });

  it("offers a palette that contains carbon and every heteroatom in the target", () => {
    for (const target of Object.values(TRACE_TARGETS)) {
      const palette = elementPaletteFor(target);
      expect(palette[0]).toBe("C");
      for (const vertex of target.vertices) {
        if (vertex.element !== undefined) expect(palette).toContain(vertex.element);
      }
    }
  });
});

describe("the mastery ladder", () => {
  it("shows guides at L0 and L1, endpoints at L2 and nothing at L3", () => {
    expect(traceGuideStyle(0)).toBe("solid");
    expect(traceGuideStyle(1)).toBe("solid");
    expect(traceGuideStyle(2)).toBe("faded");
    expect(traceGuideStyle(3)).toBe("none");
  });
});

describe("every authored stroke is traceable", () => {
  for (const beat of TRACE_BEATS) {
    const tolerance = beat.tolerancePx ?? DEFAULT_TOLERANCE;
    const rules = { tolerancePx: tolerance };

    it(`${beat.id} completes under a wobbling finger`, () => {
      for (const stroke of beat.strokes) {
        const path = buildPath(stroke.points as readonly Pt[]);
        // The press has to be accepted at the authored start, or nothing else
        // in this loop can happen on a real canvas.
        expect(canStartAt(path, path.points[0]!, rules)).toBe(true);

        let progress = IDLE_TRACE;
        let sample = 0;
        // Wobble at three quarters of the corridor: comfortably inside, and far
        // enough off the line that a pixel match would already have failed.
        const wobble = tolerance * 0.75;
        for (let along = 0; along <= path.length + 1e-9; along += 5) {
          const on = pointAt(path, Math.min(along, path.length));
          const tangent = tangentAt(path, Math.min(along, path.length));
          const sign = sample % 2 === 0 ? 1 : -1;
          sample += 1;
          progress = advanceTrace(
            path,
            progress,
            { x: on.x - tangent.y * wobble * sign, y: on.y + tangent.x * wobble * sign },
            rules,
          );
        }
        expect(strokeOutcome(progress, rules)).toBe("complete");
      }
    });

    it(`${beat.id} refuses a finger that wanders off the guide`, () => {
      for (const stroke of beat.strokes) {
        const path = buildPath(stroke.points as readonly Pt[]);
        const mid = pointAt(path, path.length / 2);
        const tangent = tangentAt(path, path.length / 2);
        const away = tolerance * 3;
        const progress = advanceTrace(
          path,
          IDLE_TRACE,
          { x: mid.x - tangent.y * away, y: mid.y + tangent.x * away },
          rules,
        );
        expect(strokeOutcome(progress, rules)).toBe("left_target");
      }
    });
  }
});

describe("drawing a skeletal graph", () => {
  const acetone = TRACE_TARGETS.acetone!;
  const graph = { vertices: acetone.vertices, edges: acetone.edges };

  it("gives a single bond no extra lines and a double bond exactly one", () => {
    expect(multipleBondLines(graph, acetone.edges[0]!)).toHaveLength(0);
    expect(multipleBondLines(graph, acetone.edges[2]!)).toHaveLength(1);
  });

  it("puts a ring double bond's second line on the inside", () => {
    const ring = TRACE_TARGETS.cyclohexene!;
    const ringGraph = { vertices: ring.vertices, edges: ring.edges };
    const centre = centroidOf(ring.vertices);
    const alkene = ring.edges.find((edge) => edge.order === 2)!;
    const axis = bondAxis(ringGraph, alkene)!;
    const [inner] = multipleBondLines(ringGraph, alkene);
    const axisMidToCentre = Math.hypot(
      (axis.from.x + axis.to.x) / 2 - centre.x,
      (axis.from.y + axis.to.y) / 2 - centre.y,
    );
    const innerMidToCentre = Math.hypot(
      (inner!.from.x + inner!.to.x) / 2 - centre.x,
      (inner!.from.y + inner!.to.y) / 2 - centre.y,
    );
    expect(innerMidToCentre).toBeLessThan(axisMidToCentre);
    expect(axisMidToCentre - innerMidToCentre).toBeCloseTo(MULTIPLE_BOND_GAP, 4);
  });

  it("stops a bond short of an element letter and not short of a carbon", () => {
    const carbonToCarbon = bondAxis(graph, acetone.edges[0]!)!;
    const c1 = acetone.vertices.find((vertex) => vertex.id === "c1")!;
    expect(Math.hypot(carbonToCarbon.from.x - c1.x, carbonToCarbon.from.y - c1.y)).toBeCloseTo(0, 6);

    const carbonToOxygen = bondAxis(graph, acetone.edges[2]!)!;
    const o1 = acetone.vertices.find((vertex) => vertex.id === "o1")!;
    expect(Math.hypot(carbonToOxygen.to.x - o1.x, carbonToOxygen.to.y - o1.y)).toBeGreaterThan(10);
  });

  it("letters the heteroatoms and leaves the carbons bare", () => {
    expect(labelledVertices(graph).map((vertex) => vertex.id)).toEqual(["o1"]);
  });

  it("frames every molecule with room around it", () => {
    for (const target of Object.values(TRACE_TARGETS)) {
      const box = viewBoxOf(target.vertices);
      for (const vertex of target.vertices) {
        expect(vertex.x).toBeGreaterThan(box.x);
        expect(vertex.x).toBeLessThan(box.x + box.width);
        expect(vertex.y).toBeGreaterThan(box.y);
        expect(vertex.y).toBeLessThan(box.y + box.height);
      }
    }
  });

  it("writes a charge only when there is one", () => {
    expect(chargeLabel(undefined)).toBeNull();
    expect(chargeLabel(0)).toBeNull();
    expect(chargeLabel(1)).toBe("+");
    expect(chargeLabel(-1)).toBe("-");
    expect(chargeLabel(-2)).toBe("2-");
  });
});
