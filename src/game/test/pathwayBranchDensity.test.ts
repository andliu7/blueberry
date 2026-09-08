/**
 * THE BRANCH VOCABULARY HAS THREE SHAPES, and this file holds the layout to
 * them. Every claim is positive: it asserts what the goals require, not that
 * some particular bad case is absent.
 *
 * docs/DESIGN-GOALS.md, the pathway section:
 *
 *   "Branch vocabulary: DIAMOND fork is the default unit shape ... HUB with
 *    petals is reserved ... Dimmed SIDE LOOPS mark application and enrichment
 *    lessons"
 *   "At most one fork visible per screen, and all nodes the same size"
 *   "THE TRAIL IS CODE, ALWAYS: it is derived from the node layout so it
 *    follows the buttons by construction. A trail that visibly diverges from
 *    its nodes is a failing bug"
 *
 * A critic measured three separate failures of those clauses on the built
 * page and each one has an assertion here:
 *
 *   1. "four simultaneous forks at scrollY 0 and 2800, and six at scrollY
 *      4200". The cause was one detour per enrichment chip. A run is capped
 *      and runs are spaced, and trail.ts threads a whole run onto ONE mouth.
 *   2. "five stopwatch challenge chips render as a 3-then-2 lattice and four
 *      of the five have NO connector to anything". The cause was a
 *      flow-wrapped checkpoint block with no trail anchor. The checkpoint is
 *      spine rows now, so the same connectivity proof that covers the spine
 *      covers it.
 *   3. the enrichment overflow a short column cannot draw off the road must
 *      still SAY it is enrichment, or the dim has been silently dropped.
 *
 * pathwayState.test.ts encodes the unlock model and stays untouched, per the
 * brief.
 *
 * WALL CLOCKS: none. Every input is a literal or pure geometry, so this suite
 * measures the same at 09:00 and at 23:00 (see
 * measurements/gauntlet-economy/LOG.md, "The instruments that only worked
 * before dark").
 */

import { describe, expect, it } from "vitest";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { LOOP_WIND, WIND_CYCLE, loopWind, trackWind } from "../tabs/pathway/pathwayLayout";
import { RUN_GAP, RUN_MAX, unitShape, weaveLoops } from "../tabs/pathway/unitShape";
import { trailSegments, type TrailPoint } from "../tabs/pathway/trail";

/* ------------------------------------------------------------------------- */
/* 1. The weave: how many detours there are and how far apart they sit.       */
/* ------------------------------------------------------------------------- */

/** The runs of consecutive detour entries in one unit's weave. */
function runsOf(
  entries: readonly { readonly lane: "main" | "loop" }[],
): readonly { readonly length: number; readonly mainsBefore: number }[] {
  const runs: { length: number; mainsBefore: number }[] = [];
  let mains = 0;
  let current: { length: number; mainsBefore: number } | null = null;
  for (const entry of entries) {
    if (entry.lane === "main") {
      mains += 1;
      current = null;
      continue;
    }
    if (current === null) {
      current = { length: 0, mainsBefore: mains };
      runs.push(current);
    }
    current.length += 1;
  }
  return runs;
}

describe("the weave, over every unit of the map the browser actually draws", () => {
  it("has detours somewhere: this suite would pass vacuously without them", () => {
    const total = PATHWAY_UNITS.reduce((sum, unit) => {
      const shape = unitShape(unit);
      return sum + runsOf(weaveLoops(shape.column, shape.loops)).length;
    }, 0);
    expect(total).toBeGreaterThan(3);
  });

  it("never lets one detour carry more than RUN_MAX chips", () => {
    // A phone has about 195px of half column and the spine already spends
    // 133px of it, so a long run cannot bow far enough to read as a loop and
    // becomes a list instead. The per-unit references draw one or two chips.
    for (const unit of PATHWAY_UNITS) {
      const shape = unitShape(unit);
      for (const run of runsOf(weaveLoops(shape.column, shape.loops))) {
        expect(run.length, unit.id).toBeLessThanOrEqual(RUN_MAX);
      }
    }
  });

  it("keeps two detour mouths at least RUN_GAP spine nodes apart", () => {
    for (const unit of PATHWAY_UNITS) {
      const shape = unitShape(unit);
      const runs = runsOf(weaveLoops(shape.column, shape.loops));
      for (let i = 1; i < runs.length; i += 1) {
        const gap = runs[i]!.mainsBefore - runs[i - 1]!.mainsBefore;
        expect(gap, unit.id).toBeGreaterThanOrEqual(RUN_GAP);
      }
    }
  });

  it("draws every enrichment node exactly once, on whichever lane it fits", () => {
    for (const unit of PATHWAY_UNITS) {
      const shape = unitShape(unit);
      const woven = weaveLoops(shape.column, shape.loops);
      for (const node of [...shape.column, ...shape.loops]) {
        const seen = woven.filter((entry) => entry.node.id === node.id).length;
        expect(seen, unit.id + "/" + node.id).toBe(1);
      }
      expect(woven.length).toBe(shape.column.length + shape.loops.length);
    }
  });

  it("keeps enrichment DIMMED even when a short column pushes it onto the road", () => {
    // The overflow is the case this exists for: a two-node column has room
    // for one mouth, so unit 3's remaining enrichment rides the main lane.
    // Riding the road must not make it read as exam-weighted spine content.
    let overflow = 0;
    for (const unit of PATHWAY_UNITS) {
      const shape = unitShape(unit);
      const loopIds = new Set(shape.loops.map((node) => node.id));
      for (const entry of weaveLoops(shape.column, shape.loops)) {
        expect(entry.dim, unit.id + "/" + entry.node.id).toBe(loopIds.has(entry.node.id));
        if (entry.dim && entry.lane === "main") overflow += 1;
      }
    }
    // Not vacuous: the map really does contain columns too short to draw all
    // their enrichment off the road, which is why the rule above exists.
    expect(overflow).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------------- */
/* 2. loopWind: one side, bowing, and always outboard of the spine.           */
/* ------------------------------------------------------------------------- */

describe("loopWind", () => {
  it("puts the whole run on the side the spine vacated, whichever way it leans", () => {
    for (const wind of WIND_CYCLE) {
      const expected = Math.sign(wind) * -1;
      for (let run = 0; run < RUN_MAX; run += 1) {
        expect(Math.sign(loopWind(wind, run, RUN_MAX))).toBe(expected);
      }
    }
  });

  it("bows: the middle of a run sits further out than either end", () => {
    const winds = [0, 1, 2].map((i) => Math.abs(loopWind(1.7, i, 3)));
    expect(winds[1]!).toBeGreaterThan(winds[0]!);
    expect(winds[1]!).toBeGreaterThan(winds[2]!);
    // Symmetric, so the detour reads as a lens and not as a comma.
    expect(winds[0]!).toBeCloseTo(winds[2]!, 10);
  });

  it("never places a detour inboard of the widest spine step, at any run length", () => {
    // A detour that swung less far than a spine kink would read as another
    // kink rather than as a road leaving the road.
    const widestSpine = Math.max(...WIND_CYCLE.map((wind) => Math.abs(wind)));
    for (const wind of WIND_CYCLE) {
      for (let length = 1; length <= RUN_MAX; length += 1) {
        for (let run = 0; run < length; run += 1) {
          expect(Math.abs(loopWind(wind, run, length))).toBeGreaterThan(widestSpine);
        }
      }
    }
  });

  it("never swings further than LOOP_WIND, so a chip cannot leave the column", () => {
    for (const wind of WIND_CYCLE) {
      for (let length = 1; length <= RUN_MAX; length += 1) {
        for (let run = 0; run < length; run += 1) {
          expect(Math.abs(loopWind(wind, run, length))).toBeLessThanOrEqual(LOOP_WIND + 1e-9);
        }
      }
    }
  });
});

/* ------------------------------------------------------------------------- */
/* 3. The trail: ONE detour per run, and it reaches every chip on it.         */
/* ------------------------------------------------------------------------- */

function point(x: number, y: number, lane: TrailPoint["lane"], done = false): TrailPoint {
  return { x, y, lane, done };
}

/** Sampled points of one drawn cubic, for the reach test below. */
function samplePath(d: string): readonly { readonly x: number; readonly y: number }[] {
  const numbers = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  if (numbers.length < 8) return [];
  const ax = numbers[0]!;
  const ay = numbers[1]!;
  const c1x = numbers[2]!;
  const c1y = numbers[3]!;
  const c2x = numbers[4]!;
  const c2y = numbers[5]!;
  const bx = numbers[6]!;
  const by = numbers[7]!;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= 60; i += 1) {
    const t = i / 60;
    const m = 1 - t;
    out.push({
      x: m * m * m * ax + 3 * m * m * t * c1x + 3 * m * t * t * c2x + t * t * t * bx,
      y: m * m * m * ay + 3 * m * m * t * c1y + 3 * m * t * t * c2y + t * t * t * by,
    });
  }
  return out;
}

describe("a run of detours is ONE loop, not one loop per chip", () => {
  const chips: readonly TrailPoint[] = [
    point(120, 100, "main"),
    point(260, 190, "loop"),
    point(280, 270, "loop"),
    point(255, 350, "loop"),
    point(120, 440, "main"),
  ];

  it("threads all three chips onto a single mouth", () => {
    const loops = trailSegments(chips).filter((segment) => segment.loop);
    // One chain of four gaps (mouth, chip, chip, chip, mouth), never three
    // independent two-leg ovals, which is what drew four forks on a screen.
    expect(loops.length).toBe(4);
  });

  it("reaches every chip on the detour, which is the trail-is-code rule", () => {
    const loops = trailSegments(chips).filter((segment) => segment.loop);
    const drawn = loops.flatMap((segment) => samplePath(segment.d));
    expect(drawn.length).toBeGreaterThan(0);
    for (const chip of chips.filter((p) => p.lane === "loop")) {
      const nearest = Math.min(...drawn.map((p) => Math.hypot(p.x - chip.x, p.y - chip.y)));
      expect(nearest, chip.x + "," + chip.y).toBeLessThan(1);
    }
  });

  it("never paints a detour as progress, whatever the chips around it did", () => {
    const walked = chips.map((p) => ({ ...p, done: true }));
    for (const segment of trailSegments(walked).filter((s) => s.loop)) {
      expect(segment.done).toBe(false);
    }
  });

  it("still draws the road straight past the detour", () => {
    const roads = trailSegments(chips).filter((segment) => !segment.loop);
    expect(roads.length).toBe(1);
  });
});

/* ------------------------------------------------------------------------- */
/* 4. The checkpoint is ON the road, which is what kills the lattice.         */
/* ------------------------------------------------------------------------- */

describe("the checkpoint run", () => {
  it("is a run of spine rows the trail connects end to end", () => {
    // The rows a unit's checkpoint contributes, laid out the way planUnits
    // lays them: main lane, the continuing wind cycle, one after another.
    // planUnits itself lives in PathwayTab.tsx, which imports the app's hooks
    // and cannot load outside a document, so the control flow is reproduced
    // and every piece of arithmetic is imported.
    const unit = PATHWAY_UNITS.find((candidate) => unitShape(candidate).checkpoint.length >= 3);
    expect(unit, "the map must carry a unit with a real checkpoint").toBeDefined();
    const checkpoint = unitShape(unit!).checkpoint;
    const rows: TrailPoint[] = checkpoint.map((_node, i) => point(195 + trackWind(i) * 66, 120 + i * 88, "main"));
    const spine: TrailPoint[] = [point(195, 32, "main"), ...rows, point(195, 120 + rows.length * 88, "main")];
    const segments = trailSegments(spine);
    // One connector per gap and not one fewer: an unconnected chip is the
    // exact defect the 3-then-2 lattice had.
    expect(segments.filter((segment) => !segment.loop).length).toBe(spine.length - 1);
    expect(segments.every((segment) => !segment.loop)).toBe(true);
  });

  it("never parks a checkpoint chip on the centreline, so the road keeps winding", () => {
    for (let i = 0; i < 12; i += 1) expect(trackWind(i)).not.toBe(0);
  });
});
