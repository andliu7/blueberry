/**
 * THE UNIT SHAPE, derived rather than authored, asserted over the map the
 * browser actually draws.
 *
 * REWRITTEN 2026-10-01 on the owner's direction "make the lessons follow a
 * predictable path". This file used to pin the DIAMOND fork as every unit's
 * default shape and the HUB flower as reserved for EAS and the acyl ladder.
 * Both are retired: a unit is ONE LINE of required lessons in authored order,
 * with its side quests as detours off it. Every claim the old file made is
 * replaced by the linear one at the same strength or stricter: where it
 * counted forks it now requires the exact authored order of every main-line
 * node, and where it reserved the flower to two units it now requires that
 * no unit draws one, those two included.
 *
 * No wall clocks anywhere: pure data over pure functions, so this measures
 * the same at 09:00 and at 23:00 (LOG.md, "The instruments that only worked
 * before dark").
 */

import { describe, expect, it } from "vitest";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { branchAnchor, roadOf, unitShape } from "../tabs/pathway/unitShape";

const SHAPES = PATHWAY_UNITS.map((unit) => unitShape(unit));

const mainLine = (unit: (typeof PATHWAY_UNITS)[number]) =>
  unit.nodes.filter((node) => node.kind === "spine" || node.kind === "boss");

describe("unitShape, ONE LINE per unit", () => {
  it("draws every main-line node in one column, in exactly its authored order", () => {
    let lines = 0;
    PATHWAY_UNITS.forEach((unit, index) => {
      const spine = mainLine(unit);
      if (spine.length === 0) return;
      expect(SHAPES[index]!.column.map((node) => node.id), unit.id).toEqual(spine.map((node) => node.id));
      lines += 1;
    });
    // Every unit with a main line is checked, not a sample.
    expect(lines).toBe(PATHWAY_UNITS.filter((unit) => mainLine(unit).length > 0).length);
    expect(lines).toBeGreaterThanOrEqual(8);
  });

  it("has no fork and no flower to draw: the shape carries no field for either", () => {
    for (const shape of SHAPES) {
      expect(Object.keys(shape).sort()).toEqual(["checkpoint", "column", "loops", "unitId", "videoHookId"]);
    }
  });

  it("never puts a node in two places at once", () => {
    for (const shape of SHAPES) {
      const ids = [...shape.column, ...shape.loops, ...shape.checkpoint].map((node) => node.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("places every node of every unit somewhere, so no authored node is dropped off the track", () => {
    PATHWAY_UNITS.forEach((unit, index) => {
      const shape = SHAPES[index]!;
      const placed = new Set([...shape.column, ...shape.loops, ...shape.checkpoint].map((node) => node.id));
      for (const node of unit.nodes) expect(placed.has(node.id)).toBe(true);
    });
  });

  it("draws the two former flowers, EAS and the acyl ladder, as lines like every other unit", () => {
    // u3 and u8 were the only units HUB_PLANS let grow a flower, pulling a
    // centre and its petals out of authored order. Named, so a flower coming
    // back to either fails here by name.
    for (const id of ["u3", "u8"]) {
      const index = PATHWAY_UNITS.findIndex((unit) => unit.id === id);
      expect(index, id).toBeGreaterThan(-1);
      expect(SHAPES[index]!.column.map((node) => node.id)).toEqual(mainLine(PATHWAY_UNITS[index]!).map((node) => node.id));
    }
  });
});

describe("unitShape, enrichment rides a side loop", () => {
  it("puts every branch node on a loop when the unit has a spine to leave", () => {
    PATHWAY_UNITS.forEach((unit, index) => {
      const shape = SHAPES[index]!;
      const branches = unit.nodes.filter((node) => node.kind === "branch");
      const spine = unit.nodes.filter((node) => node.kind === "spine" || node.kind === "boss");
      if (spine.length === 0) {
        // Nothing to detour off: the enrichment IS the track here.
        expect(shape.loops).toHaveLength(0);
        expect(shape.column.length).toBe(branches.length);
        return;
      }
      expect(shape.loops.map((node) => node.id)).toEqual(branches.map((node) => node.id));
    });
  });

  it("carries the video hook when the unit has a concept beat, and nothing when it does not", () => {
    PATHWAY_UNITS.forEach((unit, index) => {
      const beat = unit.nodes.find((node) => node.playable?.kind === "beat");
      expect(SHAPES[index]!.videoHookId).toBe(beat === undefined ? null : beat.id);
    });
    // The vocabulary has to actually appear somewhere, or it is not shipped.
    expect(SHAPES.filter((shape) => shape.videoHookId !== null).length).toBeGreaterThan(0);
  });
});

/*
 * REWRITTEN round 3 (g11) for roadOf, which replaced weaveBranches: side
 * quests ride beside the lesson they branch from instead of taking rows
 * between lessons. The same three claims over the new function: every node
 * kept once (a mention is text, not a node, so it is the one exception),
 * the road never opens on a side quest, and a side quest never hangs above a
 * lesson it names in `after`.
 */
describe("roadOf, the road with its side quests beside it", () => {
  const stands = (stop: ReturnType<typeof roadOf>[number]) => (stop.soon.length > 0 ? stop.soon : [stop.node]);

  it("keeps every node, once", () => {
    PATHWAY_UNITS.forEach((unit, at) => {
      const shape = SHAPES[at]!;
      const ids = roadOf(unit, shape).flatMap((stop) => [...stands(stop), ...stop.sides, ...stop.sidesSoon].map((node) => node.id));
      const expected = [...shape.column, ...shape.loops].filter((node) => node.mentionOnly !== true);
      expect(ids).toHaveLength(expected.length);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it("never starts a unit on a side quest, so every branch has a lesson behind it", () => {
    PATHWAY_UNITS.forEach((unit, at) => {
      const shape = SHAPES[at]!;
      const road = roadOf(unit, shape);
      if (road.length === 0) return;
      expect(shape.column.map((node) => node.id)).toContain(road[0]!.node.id);
    });
  });

  it("never hangs a side quest above a main-line lesson named in its `after`, on any unit", () => {
    let named = 0;
    PATHWAY_UNITS.forEach((unit, at) => {
      const shape = SHAPES[at]!;
      const road = roadOf(unit, shape);
      const stopOf = (id: string) => road.findIndex((stop) => [...stands(stop), ...stop.sides, ...stop.sidesSoon].some((node) => node.id === id));
      for (const node of shape.loops) {
        for (const id of node.after ?? []) {
          if (!shape.column.some((entry) => entry.id === id)) continue;
          named += 1;
          expect(stopOf(id), `${node.id} after ${id}`).toBeLessThanOrEqual(stopOf(node.id));
          expect(branchAnchor(unit, shape.column, node)).toBeGreaterThanOrEqual(shape.column.findIndex((entry) => entry.id === id));
        }
      }
    });
    expect(named).toBeGreaterThan(1);
  });
});

describe("unitShape on synthetic units: nothing is lifted out of order", () => {
  /*
   * conceptIndex used to LIFT a concept beat to the fork's apex, and these
   * three cases pinned where it landed. With the fork retired the same three
   * inputs pin the opposite and stricter claim: whatever a unit's beats are,
   * and however long its spine, the column is the spine in authored order.
   */
  const unitOf = (length: number, beatAt: number | null) => ({
    id: "ux",
    title: "Unit x",
    note: "",
    nodes: Array.from({ length }, (_, i) => ({
      id: `n${i}`,
      kind: "spine" as const,
      title: "",
      blurb: "",
      ...(i === beatAt ? { playable: { kind: "beat" as const, id: `n${i}` } } : {}),
    })),
  });

  it.each([
    [0, null],
    [2, null],
    [6, 4],
    [12, 0],
  ] as const)("a %i-node spine with its beat at %s draws in authored order", (length, beatAt) => {
    const unit = unitOf(length, beatAt);
    expect(unitShape(unit).column.map((node) => node.id)).toEqual(unit.nodes.map((node) => node.id));
  });
});
