/**
 * The three geometry and honesty claims this design round is judged on.
 *
 * ONE, THE DIAMOND DOES NOT CROSS ITSELF. docs/DESIGN-GOALS.md is explicit
 * that "a trail that visibly diverges from its nodes is a failing bug, never
 * an art-direction question", and blueberry_branch-diamond draws the two arms
 * bowing OUTWARD and converging on the unit gate without touching. A critic
 * reproduced the opposite at 390 by 844: the arms crossed in a visible X just
 * above the Unit 1 arch. The proof here is stronger than sampling the curve,
 * because a Bezier lies inside the convex hull of its control points: if every
 * control point of the left arm stays at or left of the centreline, no point
 * of the drawn curve can be right of it, and the two arms can meet only at the
 * endpoints they share.
 *
 * TWO, A SIDE LOOP IS A LOOP. The goals name the vocabulary "dimmed SIDE
 * LOOPS" and blueberry_r7-compiled-v2 draws one as a solid thin trail that
 * LEAVES the road and rejoins it. The build drew a straight stub to a dead end.
 * The claim asserted is the one that makes it a loop rather than a stub: both
 * ends land ON the spine, and the detour reaches its own chip on the way.
 *
 * THREE, A GATE MAY NOT CLAIM PROGRESS OVER CONTENT NOBODY HAS SEEN. With
 * Unit 1 cleared, Unit 2's gate reported "passed" while every node inside
 * Unit 2 was locked or unauthored, because a unit with no authored nodes is
 * never marked active and fell straight through the ordering test. Green says
 * "you moved" per the palette rules, so this is a correctness claim about a
 * progress statement and not a styling one.
 *
 * pathwayState.test.ts encodes the map model and stays untouched, per the
 * brief; this file adds claims that live above it.
 *
 * WALL CLOCKS: none. Every input here is a literal or pure geometry, so this
 * suite measures the same at 09:00 and at 23:00
 * (measurements/gauntlet-economy/LOG.md, "The instruments that only worked
 * before dark").
 */

import { describe, expect, it } from "vitest";
import { trailSegments, type TrailPoint } from "../tabs/pathway/trail";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { unitPassed, type MapPathwayStatus, type MapUnitStatus } from "../tabs/pathway/pathwayState";

/* The tab binds this to PATHWAY_UNITS; the rule itself is pure, which is what
   lets it be asserted without a document. */
const unitStatusPassed = (status: MapPathwayStatus, unitId: string) =>
  unitPassed(status, PATHWAY_UNITS.map((unit) => unit.id), unitId);

function point(x: number, y: number, lane: TrailPoint["lane"], done = false): TrailPoint {
  return { x, y, lane, done };
}

/** Every coordinate pair in a path string: the anchors and the controls. */
function coords(d: string): { x: number; y: number }[] {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) out.push({ x: numbers[i]!, y: numbers[i + 1]! });
  return out;
}

describe("the diamond fork, drawn", () => {
  /*
   * The shape the tab actually lays out: a concept on the centreline, one arm
   * chip each side, and the unit gate back on the centreline below. Wind and
   * pitch are the shipped ones at 390pt (a 1.15 arm step at 78px, rows about
   * 150px apart), so this is the case the critic reproduced.
   */
  const concept = point(0, 0, "main");
  const left = point(-90, 150, "left");
  const right = point(90, 150, "right");
  const gate = point(0, 300, "main");
  const segments = trailSegments([concept, left, right, gate]);

  it("keeps each arm strictly on its own side of the centreline", () => {
    // Which arm a segment belongs to is decided by the one endpoint that is
    // not shared: the arm chip. Segments are emitted left arm first.
    const half = segments.length / 2;
    const leftArm = segments.slice(0, half);
    const rightArm = segments.slice(half);
    expect(half).toBeGreaterThan(0);
    // A Bezier lies inside its control hull, so bounding the controls bounds
    // the curve. Tolerance is the one decimal place the path strings carry.
    for (const segment of leftArm) {
      for (const at of coords(segment.d)) expect(at.x).toBeLessThanOrEqual(0.05);
    }
    for (const segment of rightArm) {
      for (const at of coords(segment.d)) expect(at.x).toBeGreaterThanOrEqual(-0.05);
    }
  });

  it("bows outward: each arm passes its own chip and reaches the gate", () => {
    const half = segments.length / 2;
    const leftXs = segments.slice(0, half).flatMap((segment) => coords(segment.d).map((at) => at.x));
    // The arm genuinely swings out to its chip rather than cutting the corner.
    expect(Math.min(...leftXs)).toBeLessThanOrEqual(-90);
    const tos = segments.map((segment) => {
      const all = coords(segment.d);
      return `${all[all.length - 1]!.x},${all[all.length - 1]!.y}`;
    });
    expect(tos.filter((to) => to === "0,300")).toHaveLength(2);
  });

  it("suppresses the direct spine connection through the fork", () => {
    const direct = segments.find((segment) => {
      const all = coords(segment.d);
      const from = all[0]!;
      const to = all[all.length - 1]!;
      return from.x === 0 && from.y === 0 && to.x === 0 && to.y === 300;
    });
    expect(direct).toBeUndefined();
  });
});

describe("a side loop is a closed detour, not a stub", () => {
  const a = point(0, 0, "main", true);
  const detour = point(120, 150, "loop");
  const b = point(0, 300, "main");
  const segments = trailSegments([a, detour, b]);
  const spine = segments.filter((segment) => !segment.loop);
  const loops = segments.filter((segment) => segment.loop);

  it("leaves the spine running straight past it", () => {
    expect(spine).toHaveLength(1);
    const all = coords(spine[0]!.d);
    expect(all[0]).toEqual({ x: 0, y: 0 });
    expect(all[all.length - 1]).toEqual({ x: 0, y: 300 });
  });

  it("opens and closes ON the spine, above and below its own chip", () => {
    expect(loops.length).toBeGreaterThanOrEqual(2);
    const first = coords(loops[0]!.d)[0]!;
    const lastLeg = coords(loops[loops.length - 1]!.d);
    const last = lastLeg[lastLeg.length - 1]!;
    // The spine here is dead vertical at x = 0, so a mouth that is genuinely
    // on it is at x = 0; a stub would start at the chip or at a corner.
    expect(Math.abs(first.x)).toBeLessThan(1);
    expect(Math.abs(last.x)).toBeLessThan(1);
    // And it opens ABOVE the chip and closes BELOW it, which is what makes
    // the detour enclose an area rather than double back on itself.
    expect(first.y).toBeLessThan(detour.y);
    expect(last.y).toBeGreaterThan(detour.y);
    expect(first.y).toBeGreaterThan(a.y);
    expect(last.y).toBeLessThan(b.y);
  });

  it("reaches its own chip at the turn", () => {
    const apex = coords(loops[0]!.d).slice(-1)[0]!;
    expect(Math.abs(apex.x - detour.x)).toBeLessThan(1);
    expect(Math.abs(apex.y - detour.y)).toBeLessThan(1);
  });

  it("never colours a detour done, because enrichment is not progress", () => {
    for (const segment of loops) expect(segment.done).toBe(false);
  });
});

describe("unitStatusPassed, the gate's progress claim", () => {
  const ids = PATHWAY_UNITS.map((unit) => unit.id);

  function status(entries: Record<string, Partial<MapUnitStatus>>): MapPathwayStatus {
    const units = new Map<string, MapUnitStatus>();
    for (const id of ids) {
      const given = entries[id];
      if (given === undefined) continue;
      units.set(id, {
        done: given.done ?? 0,
        playable: given.playable ?? 0,
        total: given.total ?? given.playable ?? 0,
        active: given.active ?? false,
        reachable: given.reachable ?? false,
      });
    }
    return { nodes: new Map(), units, currentNodeId: null, doneCount: 0, playableCount: 0 };
  }

  it("does NOT report a unit with no authored nodes as passed", () => {
    // The reproduction: unit 1 cleared, unit 2 empty, so unit 2 is reachable,
    // never active, and sits before whatever the student is working in.
    const state = status({
      [ids[0]!]: { done: 3, playable: 3, reachable: true },
      [ids[1]!]: { done: 0, playable: 0, reachable: true },
      [ids[2]!]: { done: 1, playable: 4, reachable: true, active: true },
    });
    expect(unitStatusPassed(state, ids[1]!)).toBe(false);
  });

  it("does NOT report a unit the student only partly cleared as passed", () => {
    const state = status({
      [ids[0]!]: { done: 2, playable: 5, reachable: true },
      [ids[1]!]: { done: 1, playable: 3, reachable: true, active: true },
    });
    expect(unitStatusPassed(state, ids[0]!)).toBe(false);
  });

  it("reports a fully cleared unit behind the student as passed", () => {
    const state = status({
      [ids[0]!]: { done: 4, playable: 4, reachable: true },
      [ids[1]!]: { done: 1, playable: 3, reachable: true, active: true },
    });
    expect(unitStatusPassed(state, ids[0]!)).toBe(true);
  });

  it("never reports an unreachable or active unit as passed", () => {
    const state = status({
      [ids[0]!]: { done: 4, playable: 4, reachable: true, active: true },
      [ids[1]!]: { done: 0, playable: 3, reachable: false },
    });
    expect(unitStatusPassed(state, ids[0]!)).toBe(false);
    expect(unitStatusPassed(state, ids[1]!)).toBe(false);
    expect(unitStatusPassed(state, "no-such-unit")).toBe(false);
  });
});
