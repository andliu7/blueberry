/**
 * Recognition: the wobble to structure path, and the valence rule under it.
 *
 * The valence cases are worked by hand in target.ts's header and asserted here,
 * because that rule is the one piece of chemistry this beat owns. It is filled
 * identically on both sides of the comparison, so a bug in it would be a draw
 * rather than a false negative, and a draw that teaches the wrong hydrogen
 * count is still teaching the wrong hydrogen count. Hence the standalone cases.
 *
 * The drawing cases are deliberately SLOPPY: hand drawn coordinates with gaps,
 * overshoots and a ring that does not quite close. A recognition pass that only
 * works on exact coordinates has not been tested, it has been restated.
 */

import { describe, expect, it } from "vitest";

import { TRACE_TARGETS } from "../beats/trace/content";
import {
  DEFAULT_RECOGNISE,
  gradeDrawing,
  recognise,
  toBeatResult,
  type ElementPlacement,
  type FreehandStroke,
} from "../beats/trace/recognise";
import {
  connectedComponents,
  fillValence,
  formulaOf,
  overValentIds,
  strokePoints,
  targetState,
  uncoveredEdgeIds,
  type TraceTarget,
} from "../beats/trace/target";
import type { Pt } from "../beats/trace/geometry";

/** Sample a straight run of points, the way a finger delivers a stroke. */
function drag(from: Pt, to: Pt, wobble = 0): Pt[] {
  const steps = 18;
  const points: Pt[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const jitter = wobble === 0 ? 0 : (i % 2 === 0 ? wobble : -wobble);
    points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t + jitter });
  }
  return points;
}

let strokeCounter = 0;
function stroke(from: Pt, to: Pt, order: 1 | 2 | 3 = 1, wobble = 0): FreehandStroke {
  strokeCounter += 1;
  return { id: `f${strokeCounter}`, points: drag(from, to, wobble), order };
}

describe("fillValence, the one chemistry rule this beat owns", () => {
  const cases: readonly [string, "C" | "N" | "O" | "Br" | "H" | "S", number, number, number, number][] = [
    // element, charge, bonds drawn, expected implicit H, expected lone pairs
    ["neutral carbon", "C", 0, 1, 3, 0],
    ["carbocation", "C", 1, 3, 0, 0],
    ["carbanion", "C", -1, 3, 0, 1],
    ["neutral nitrogen", "N", 0, 2, 1, 1],
    ["ammonium nitrogen", "N", 1, 4, 0, 0],
    ["neutral oxygen", "O", 0, 1, 1, 2],
    ["alkoxide oxygen", "O", -1, 1, 0, 3],
    ["oxocarbenium oxygen", "O", 1, 3, 0, 1],
    ["bromine", "Br", 0, 1, 0, 3],
    ["hydrogen", "H", 0, 1, 0, 0],
    ["divalent sulfur", "S", 0, 1, 1, 2],
  ];

  for (const [name, element, charge, bonds, hydrogens, lonePairs] of cases) {
    it(`fills ${name}`, () => {
      const filled = fillValence(element, charge, bonds);
      expect(filled.overValent).toBe(false);
      expect(filled.implicitHydrogens).toBe(hydrogens);
      expect(filled.lonePairs).toBe(lonePairs);
    });
  }

  it("reports a carbon carrying five bonds rather than inventing an orbital", () => {
    const filled = fillValence("C", 0, 5);
    expect(filled.overValent).toBe(true);
    expect(filled.implicitHydrogens).toBe(0);
  });

  it("does not infer an expanded octet on sulfur", () => {
    // Six bonds on sulfur is real in SF6 and is an AUTHORED claim about a real
    // molecule, never something to guess from a sketch. See target.ts.
    expect(fillValence("S", 0, 6).overValent).toBe(true);
  });
});

describe("every authored target", () => {
  const targets = Object.values(TRACE_TARGETS);

  const expectedFormula: Readonly<Record<string, string>> = {
    propanal: "C3H6O",
    acetone: "C3H6O",
    "acetone-hydrate": "C3H8O2",
    "n-methyl-ethanimine": "C3H7N",
    "s-cis-butadiene": "C4H6",
    acrolein: "C3H4O",
    cyclohexene: "C6H10",
  };

  for (const target of targets) {
    describe(target.id, () => {
      const graph = { vertices: target.vertices, edges: target.edges };

      it("has the molecular formula it claims to be", () => {
        expect(formulaOf(graph)).toBe(expectedFormula[target.id]);
      });

      it("holds together as one molecule with no over valent atom", () => {
        expect(overValentIds(graph)).toEqual([]);
        expect(connectedComponents(graph)).toHaveLength(1);
      });

      it("asks the student to draw every bond it will grade", () => {
        expect(uncoveredEdgeIds(target)).toEqual([]);
      });

      it("builds a chem-core state without complaint", () => {
        expect(() => targetState(target)).not.toThrow();
      });

      it("walks each stroke through touching vertices", () => {
        for (const plan of target.strokes) {
          const points = strokePoints(target, plan);
          expect(points.length).toBe(plan.edgeIds.length + 1);
        }
      });
    });
  }
});

/** Draw a target's own bonds freehand, wobbled, as if by hand. */
function drawTarget(target: TraceTarget, wobble: number): readonly FreehandStroke[] {
  const byId = new Map(target.vertices.map((vertex) => [vertex.id, vertex]));
  return target.edges.map((edge) => {
    const a = byId.get(edge.a)!;
    const b = byId.get(edge.b)!;
    return stroke({ x: a.x, y: a.y }, { x: b.x, y: b.y }, edge.order, wobble);
  });
}

function labelsFor(target: TraceTarget): readonly ElementPlacement[] {
  return target.vertices
    .filter((vertex) => vertex.element !== undefined && vertex.element !== "C")
    .map((vertex) => ({ at: { x: vertex.x, y: vertex.y }, element: vertex.element!, charge: vertex.charge ?? 0 }));
}

describe("recognise and grade", () => {
  it("marks a wobbly but faithful acetone correct", () => {
    const target = TRACE_TARGETS.acetone!;
    const { graph } = recognise(drawTarget(target, 5), labelsFor(target));
    expect(graph.vertices).toHaveLength(4);
    expect(graph.edges).toHaveLength(3);
    const outcome = gradeDrawing(target, graph);
    expect(outcome.kind).toBe("correct");
  });

  it("closes a hexagon the hand left open", () => {
    const target = TRACE_TARGETS.cyclohexene!;
    const strokes = drawTarget(target, 4).map((s, index) =>
      // Pull the last stroke's far end 14 px short: under snapPx, so it snaps
      // shut. This is the gap every hand leaves and the reason clustering exists.
      index === target.edges.length - 1
        ? { ...s, points: s.points.slice(0, s.points.length - 3) }
        : s,
    );
    const { graph } = recognise(strokes, []);
    expect(graph.vertices).toHaveLength(6);
    expect(graph.edges).toHaveLength(6);
    expect(gradeDrawing(target, graph).kind).toBe("correct");
  });

  it("recognises a ring drawn as one long gesture", () => {
    const target = TRACE_TARGETS.cyclohexene!;
    const byId = new Map(target.vertices.map((v) => [v.id, v]));
    const order = ["r2", "r3", "r4", "r5", "r6", "r1"];
    const points: Pt[] = [];
    for (let i = 0; i + 1 < order.length; i += 1) {
      const a = byId.get(order[i]!)!;
      const b = byId.get(order[i + 1]!)!;
      points.push(...drag({ x: a.x, y: a.y }, { x: b.x, y: b.y }, 3));
    }
    const single: FreehandStroke = { id: "ring", points, order: 1 };
    const closing = stroke(
      { x: byId.get("r1")!.x, y: byId.get("r1")!.y },
      { x: byId.get("r2")!.x, y: byId.get("r2")!.y },
      2,
    );
    const { graph } = recognise([single, closing], []);
    expect(graph.vertices).toHaveLength(6);
    expect(gradeDrawing(target, graph).kind).toBe("correct");
  });

  it("names the difference when the student drew the isomer", () => {
    // Propanal traced while acetone was asked for. Same formula, different
    // connectivity, which is exactly the pair this beat exists to separate.
    const drawn = recognise(drawTarget(TRACE_TARGETS.propanal!, 3), labelsFor(TRACE_TARGETS.propanal!)).graph;
    const outcome = gradeDrawing(TRACE_TARGETS.acetone!, drawn);
    expect(outcome.kind).toBe("invalid");
    expect(outcome.cause).toBe("structure_is_an_isomer_of_the_answer");
  });

  it("names the formula when the drawing is a different molecule altogether", () => {
    const drawn = recognise(drawTarget(TRACE_TARGETS["s-cis-butadiene"]!, 3), []).graph;
    const outcome = gradeDrawing(TRACE_TARGETS.acetone!, drawn);
    expect(outcome.cause).toBe("structure_molecular_formula_differs");
  });

  it("says valence rather than mismatch when a carbon carries five bonds", () => {
    const hub: Pt = { x: 160, y: 160 };
    const spokes = [
      stroke(hub, { x: 160, y: 90 }),
      stroke(hub, { x: 230, y: 160 }),
      stroke(hub, { x: 160, y: 230 }),
      stroke(hub, { x: 90, y: 160 }),
      stroke(hub, { x: 215, y: 215 }),
    ];
    const { graph } = recognise(spokes, []);
    const outcome = gradeDrawing(TRACE_TARGETS.acetone!, graph);
    expect(outcome.kind).toBe("invalid");
    expect(outcome.cause).toBe("valence_exceeded");
  });

  it("says the canvas is empty rather than grading nothing", () => {
    const outcome = gradeDrawing(TRACE_TARGETS.acetone!, { vertices: [], edges: [] });
    expect(outcome.cause).toBe("trace_incomplete");
  });

  it("drops a tap that is too short to be a bond, and reports that it did", () => {
    const tap: FreehandStroke = { id: "tap", points: drag({ x: 10, y: 10 }, { x: 18, y: 12 }), order: 1 };
    const result = recognise([tap], [], DEFAULT_RECOGNISE);
    expect(result.droppedSegments).toBe(1);
    expect(result.graph.edges).toEqual([]);
  });

  it("keeps an element tap that landed on no vertex out of the graph, and counts it", () => {
    const target = TRACE_TARGETS.acetone!;
    const stray: ElementPlacement = { at: { x: 5, y: 5 }, element: "O" };
    const result = recognise(drawTarget(target, 0), [...labelsFor(target), stray]);
    expect(result.unplacedLabels).toBe(1);
    expect(gradeDrawing(target, result.graph).kind).toBe("correct");
  });
});

describe("toBeatResult", () => {
  const context = { beatId: "trace-acetone", level: 3 as const, elapsedMs: 4200, at: "2026-08-27T00:00:00.000Z" };

  it("passes a shape cause through unchanged", () => {
    const result = toBeatResult({ kind: "invalid", cause: "trace_incomplete", detail: "" }, context);
    expect(result.kind).toBe("invalid");
    expect(result.cause).toBe("trace_incomplete");
  });

  it("passes a chem-core cause through unchanged", () => {
    const result = toBeatResult({ kind: "invalid", cause: "valence_exceeded", detail: "" }, context);
    expect(result.cause).toBe("valence_exceeded");
  });

  it("funnels a curriculum structure cause to the tail, because BeatCauseId has no home for it", () => {
    const result = toBeatResult(
      { kind: "invalid", cause: "structure_is_an_isomer_of_the_answer", detail: "" },
      context,
    );
    expect(result.cause).toBe("no_named_cause_logged");
  });
});
