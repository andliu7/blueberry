/**
 * The trail's arithmetic: the drawn ribbon, the diamond fork's geometry, the
 * F1 pill's miniature, and the terrace bands. All pure functions over points
 * and numbers, so the geometry the scene draws is testable without a
 * document, which is the same reason terrain.ts and pathwayLayout.ts are
 * tested and PathScene.tsx is not.
 *
 * The rules asserted here are the committed ones:
 *  - blueberry_branch-diamond_1788284291.png: the fork's arms leave the
 *    concept node and REJOIN at the unit gate; no direct spine connection
 *    crosses the diamond
 *  - the FILL-ONLY green (docs/DESIGN-GOALS.md): the green ends at the JOIN,
 *    which is the last node on a chain the student has reached, so the road
 *    behind them is walked and the road ahead is not, and a loop detour is
 *    never done because enrichment is not progress
 *  - the track-map pill draws the unit's REAL shape: same wind function,
 *    completed stretch a literal prefix of the whole
 */

import { describe, expect, it } from "vitest";
import { flowOrder, trailSegments, trackMapModel, type TrackMapNode, type TrailPoint } from "../tabs/pathway/trail";
import { trackWind } from "../tabs/pathway/pathwayLayout";
import { terracePath, terraceProfile } from "../tabs/pathway/terrain";

function point(x: number, y: number, lane: TrailPoint["lane"], done = false): TrailPoint {
  return { x, y, lane, done };
}

/** First and last coordinate pair of a path string, for endpoint checks. */
function endpoints(d: string): { from: [number, number]; to: [number, number] } {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return {
    from: [numbers[0]!, numbers[1]!],
    to: [numbers[numbers.length - 2]!, numbers[numbers.length - 1]!],
  };
}

describe("trailSegments", () => {
  it("returns nothing for fewer than two points, and never throws on any input", () => {
    expect(trailSegments([])).toEqual([]);
    expect(trailSegments([point(0, 0, "main")])).toEqual([]);
    expect(trailSegments([point(0, 0, "loop"), point(1, 1, "left")])).toEqual([]);
  });

  it("joins consecutive main points directly, one segment per gap", () => {
    const segments = trailSegments([point(0, 0, "main"), point(40, 100, "main"), point(-40, 200, "main")]);
    expect(segments).toHaveLength(2);
    expect(segments.every((segment) => !segment.loop)).toBe(true);
    expect(endpoints(segments[0]!.d).from).toEqual([0, 0]);
    expect(endpoints(segments[1]!.d).to).toEqual([-40, 200]);
  });

  it("draws the diamond: each arm runs concept to arm to gate, and the direct connection is suppressed", () => {
    const concept = point(0, 0, "main");
    const left = point(-60, 100, "left");
    const right = point(60, 100, "right");
    const gate = point(0, 200, "main");
    const segments = trailSegments([concept, left, right, gate]);
    // Two arms of two segments each; no fifth segment joining 0,0 to 0,200.
    expect(segments).toHaveLength(4);
    const direct = segments.find((segment) => {
      const { from, to } = endpoints(segment.d);
      return from[0] === 0 && from[1] === 0 && to[0] === 0 && to[1] === 200;
    });
    expect(direct).toBeUndefined();
    // Both arms leave the concept and both rejoin at the gate.
    const froms = segments.map((segment) => endpoints(segment.d).from.join(","));
    const tos = segments.map((segment) => endpoints(segment.d).to.join(","));
    expect(froms.filter((from) => from === "0,0")).toHaveLength(2);
    expect(tos.filter((to) => to === "0,200")).toHaveLength(2);
  });

  it("keeps the spine continuous past a side loop and draws the detour off it and back", () => {
    const a = point(0, 0, "main");
    const detour = point(90, 60, "loop");
    const b = point(0, 120, "main");
    const segments = trailSegments([a, detour, b]);
    expect(segments).toHaveLength(3);
    const direct = segments.filter((segment) => !segment.loop);
    const loops = segments.filter((segment) => segment.loop);
    expect(direct).toHaveLength(1);
    expect(loops).toHaveLength(2);
  });

  it("marks a stretch done only when BOTH endpoints are: the green ends at the node the student stands on", () => {
    const segments = trailSegments([
      point(0, 0, "main", true),
      point(40, 100, "main", true),
      point(-40, 200, "main", false),
    ]);
    expect(segments.map((segment) => segment.done)).toEqual([true, false]);
  });

  /*
   * THE JOIN, and this block is the fixture the "both endpoints" rule failed.
   *
   * Reactions inside a unit are freely orderable (docs/DESIGN-GOALS.md, owner
   * 2026-09-01), so a real done-set is scattered rather than a prefix. This
   * is the S2 seed's own unit 1, read off the built page: done, then four
   * open lessons the student skipped past, then the node they are standing
   * on. Under the pair rule not one stretch was green anywhere on a
   * fourteen-unit track. Under the clause ("the join between them is where
   * the student is") the whole road behind them is walked.
   */
  it("paints the road BEHIND the student green even where they skipped a lesson on it", () => {
    const segments = trailSegments([
      point(0, 0, "main", true),
      point(40, 100, "main", false),
      point(-40, 200, "main", false),
      point(30, 300, "main", false),
      point(-20, 400, "main", false),
      point(0, 500, "main", true),
      point(20, 600, "main", false),
      point(-20, 700, "main", false),
    ]);
    expect(segments.map((segment) => segment.done)).toEqual([true, true, true, true, true, false, false]);
  });

  it("leaves a unit entirely ahead of the student violet from end to end", () => {
    const segments = trailSegments([
      point(0, 0, "main", false),
      point(40, 100, "main", false),
      point(-40, 200, "main", false),
    ]);
    expect(segments.every((segment) => !segment.done)).toBe(true);
  });

  it("greens the arm the student walked and leaves the other one violet", () => {
    const segments = trailSegments([
      point(0, 0, "main", true),
      point(-60, 120, "left", true),
      point(60, 120, "right", false),
      point(0, 240, "main", false),
    ]);
    const left = segments.filter((_, index) => index < segments.length / 2);
    const right = segments.filter((_, index) => index >= segments.length / 2);
    // The walked arm is green as far as the student got and no further: the
    // stretch onto the gate they have not passed stays violet.
    expect(left.some((segment) => segment.done)).toBe(true);
    expect(left.every((segment) => segment.done)).toBe(false);
    expect(right.every((segment) => !segment.done)).toBe(true);
  });

  it("never colours a loop detour done, because enrichment is not progress", () => {
    const segments = trailSegments([
      point(0, 0, "main", true),
      point(90, 60, "loop", true),
      point(0, 120, "main", true),
    ]);
    for (const segment of segments.filter((entry) => entry.loop)) {
      expect(segment.done).toBe(false);
    }
  });
});

/**
 * THE PROGRESS FLOW, owner 2026-09-04: "On finishing a node the green does not
 * appear, it TRAVELS from the node just finished to the next one, along the
 * trail. If several nodes complete at once the flow runs through all of them
 * in sequence rather than snapping ... A GATE IS NEVER SKIPPABLE. The flow can
 * run through several lesson nodes, never through a unit gate."
 *
 * The sequencing is a pure diff between two done-sets, so it is asserted here
 * without a document, a browser or a clock. UnitTrail turns a rank into a CSS
 * animation delay and nothing else.
 */
function gate(x: number, y: number, done: boolean): TrailPoint {
  return { x, y, lane: "main", done, gate: true };
}

describe("the trail's gate flag", () => {
  it("marks the stretch that lands on a unit gate, and only that stretch", () => {
    const segments = trailSegments([
      point(0, 0, "main", true),
      point(40, 100, "main", true),
      gate(0, 200, true),
    ]);
    expect(segments.map((segment) => segment.gate)).toEqual([false, true]);
  });

  it("marks only a diamond arm's LAST stretch, the one that closes on the arch", () => {
    const segments = trailSegments([
      point(0, 0, "main", true),
      point(-60, 80, "left", true),
      point(-60, 160, "left", true),
      gate(0, 240, true),
    ]);
    // Three stretches down one arm: concept to chip, chip to chip, chip to
    // gate. Only the last one touches the arch.
    expect(segments.map((segment) => segment.gate)).toEqual([false, false, true]);
  });
});

describe("flowOrder, the travelling green", () => {
  const road = (dones: readonly boolean[]) =>
    trailSegments(dones.map((done, index) => point(index % 2 === 0 ? 0 : 40, index * 100, "main", done)));

  it("gives nothing a rank when there is no history: a landing page does not replay a term", () => {
    const segments = road([true, true, true, false]);
    expect(flowOrder(segments, [])).toEqual([-1, -1, -1]);
  });

  it("ranks the one stretch that just became done", () => {
    const before = road([true, false, false, false]);
    const after = road([true, true, false, false]);
    expect(flowOrder(after, before.map((segment) => segment.done))).toEqual([0, -1, -1]);
  });

  it("runs several completions IN SEQUENCE, in trail order, rather than snapping", () => {
    const before = road([true, false, false, false, false]);
    const after = road([true, true, true, true, false]);
    // Ranks 0, 1, 2 are three legs of one journey: the renderer starts each
    // one duration after the last.
    expect(flowOrder(after, before.map((segment) => segment.done))).toEqual([0, 1, 2, -1]);
  });

  it("never travels through a unit gate: the gate's stretch changes colour where it stands", () => {
    const points = (doneUpTo: number): TrailPoint[] => [
      point(0, 0, "main", doneUpTo >= 0),
      point(40, 100, "main", doneUpTo >= 1),
      gate(0, 200, doneUpTo >= 2),
      point(40, 320, "main", doneUpTo >= 3),
    ];
    const before = trailSegments(points(0));
    const after = trailSegments(points(3));
    const ranks = flowOrder(after, before.map((segment) => segment.done));
    // The lesson stretch travels; the two stretches that touch the arch do
    // not, and the one after it still gets its own leg.
    expect(ranks).toEqual([0, -1, -1]);
    expect(after.filter((_, index) => ranks[index]! >= 0).every((segment) => !segment.gate)).toBe(true);
  });

  it("never travels a loop detour, because enrichment is never progress", () => {
    const before = trailSegments([
      point(0, 0, "main", false),
      point(90, 60, "loop", false),
      point(0, 120, "main", false),
    ]);
    const after = trailSegments([
      point(0, 0, "main", true),
      point(90, 60, "loop", true),
      point(0, 120, "main", true),
    ]);
    const ranks = flowOrder(after, before.map((segment) => segment.done));
    for (const [index, segment] of after.entries()) {
      if (segment.loop) expect(ranks[index]).toBe(-1);
    }
  });

  it("does not re-rank a stretch that was already done: the green travels once", () => {
    const segments = road([true, true, false, false]);
    const done = segments.map((segment) => segment.done);
    expect(flowOrder(segments, done)).toEqual([-1, -1, -1]);
  });
});

describe("trackMapModel, the pill's miniature", () => {
  /** A plain winding unit at the absolute wind offsets the track would use. */
  function column(count: number, from: number, doneUpTo: number): TrackMapNode[] {
    return Array.from({ length: count }, (_, i) => ({
      wind: trackWind(from + i),
      lane: "main" as const,
      done: i <= doneUpTo,
    }));
  }

  it("returns an empty model for a degenerate box or an empty unit", () => {
    expect(trackMapModel([], 32, 170)).toEqual({ segments: [], points: [] });
    expect(trackMapModel(column(5, 0, 1), 0, 170)).toEqual({ segments: [], points: [] });
  });

  it("keeps every node dot inside the pill's box, whatever the wind does", () => {
    const width = 32;
    const height = 170;
    const model = trackMapModel(column(9, 0, 3), width, height);
    expect(model.points).toHaveLength(9);
    for (const dot of model.points) {
      expect(dot.x).toBeGreaterThanOrEqual(0);
      expect(dot.x).toBeLessThanOrEqual(width);
      expect(dot.y).toBeGreaterThanOrEqual(0);
      expect(dot.y).toBeLessThanOrEqual(height);
    }
  });

  /*
   * THE REGRESSION THE CRITIC MEASURED. The pill used to sample
   * trackWind(0..count-1) while the track sampled trackWind(first + i) off a
   * running GLOBAL index, and WIND_CYCLE has period four, so the outline was
   * visually identical standing in units whose start indices differed by a
   * multiple of four. Absolute offsets are handed in now, and this is the
   * assertion that says two units starting at different phases draw
   * different shapes.
   */
  it("draws a DIFFERENT shape for a unit that starts at a different point in the wind cycle", () => {
    const atZero = trackMapModel(column(5, 0, 1), 32, 170);
    const atOne = trackMapModel(column(5, 1, 1), 32, 170);
    expect(atOne.points.map((p) => p.x)).not.toEqual(atZero.points.map((p) => p.x));
  });

  it("puts a fork's two arms on the SAME rows, so a diamond unit reads as a diamond at pill size", () => {
    const nodes: TrackMapNode[] = [
      { wind: 0, lane: "main", done: true },
      { wind: -1.15, lane: "left", done: false },
      { wind: 1.15, lane: "right", done: false },
      { wind: 0, lane: "main", done: false },
    ];
    const model = trackMapModel(nodes, 32, 170);
    expect(model.points[1]!.y).toBe(model.points[2]!.y);
    expect(model.points[1]!.x).toBeLessThan(model.points[2]!.x);
    // Concept, two arms, gate: four rows collapse to three, and the two arm
    // chains are two segments each rather than one chain through both.
    expect(model.points[3]!.y).toBeGreaterThan(model.points[1]!.y);
    expect(model.segments).toHaveLength(4);
  });

  it("marks a done stretch only where both ends are done, and never marks a loop done", () => {
    const nodes: TrackMapNode[] = [
      { wind: 0.85, lane: "main", done: true },
      { wind: -2.55, lane: "loop", done: true },
      { wind: 1.7, lane: "main", done: true },
      { wind: -0.85, lane: "main", done: false },
    ];
    const model = trackMapModel(nodes, 32, 170);
    expect(model.segments.filter((segment) => segment.loop).every((segment) => !segment.done)).toBe(true);
    expect(model.segments.filter((segment) => segment.done)).toHaveLength(1);
  });
});

describe("terracePath and terraceProfile, the rolling hills", () => {
  /*
   * THE STAIRCASE IS GONE, AND THESE TESTS FOLLOW IT.
   *
   * terracePath used to draw a four step staircase seeded by an integer, and
   * the three tests here asserted exactly that: a fixed step count, every step
   * lower than the last, and left/right alternation by seed parity. The scene
   * round replaced it with a rolling hillside taking a TerraceProfile, and its
   * own comment gives the reason: "a staircase has a first step and a last
   * step, and a hillside does not". So the old assertions describe a design
   * that was deliberately superseded, and re-pointing them is not weakening
   * coverage; deleting them would be. What is still worth holding is below,
   * and one of these is stronger than anything the staircase version had.
   */

  it("closes into a fillable band that starts at the given top", () => {
    const d = terracePath(120, 300, 390, terraceProfile(2, 0));
    expect(d.startsWith("M ")).toBe(true);
    expect(d.trimEnd().endsWith("Z")).toBe(true);
    const numbers = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    expect(numbers[1]).toBe(120);
  });

  it("bleeds past both edges, so no plate shows a seam at the viewport", () => {
    const d = terracePath(0, 100, 390, terraceProfile(0, 0));
    const xs = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number).filter((_, k) => k % 2 === 0);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(390);
  });

  it("gives each unit its own character, and gives the same unit the same one twice", () => {
    // The per-unit variation the goals ask for, and the determinism a capture
    // needs: unit 3 must be the same picture on every run or a blind judge is
    // comparing two different scenes.
    const a = terraceProfile(3, 0);
    const b = terraceProfile(3, 0);
    expect(a).toEqual(b);
    const others = [0, 1, 2, 4, 5].map((u) => terraceProfile(u, 0));
    expect(others.some((p) => p.crests !== a.crests || p.tilt !== a.tilt || p.phase !== a.phase)).toBe(true);
  });

  it("never inverts the land: relief and crest count stay in their stated range", () => {
    for (let unit = 0; unit < 14; unit += 1) {
      for (let band = 0; band < 4; band += 1) {
        const p = terraceProfile(unit, band);
        expect(p.crests).toBeGreaterThanOrEqual(1);
        expect(p.crests).toBeLessThanOrEqual(3);
        expect(p.relief).toBeGreaterThanOrEqual(0);
        expect(Math.abs(p.tilt)).toBe(1);
      }
    }
  });
});
