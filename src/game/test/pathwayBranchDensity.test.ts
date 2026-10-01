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
import type { EconomyEvent } from "@blueberry/economy";
import { PATHWAY_UNITS, checkpointNodeId, unitCheckpointNode, unitName } from "../demo/pathwayMap";
import { planLesson, recycleBeatsFor } from "../beats/template";
import { mcqBeatsForNode } from "../beats/mcq";
import { deriveMapPathway, prerequisitesOf, statusOf } from "../tabs/pathway/pathwayState";
import { trackWind } from "../tabs/pathway/pathwayLayout";
import { branchAnchor, nodePlaces, placeSaid, unitShape, weaveBranches } from "../tabs/pathway/unitShape";
import { trailSegments, type TrailPoint } from "../tabs/pathway/trail";

/* ------------------------------------------------------------------------- */
/* 1. The branch lane: every side quest off the lesson it branches from.      */
/* ------------------------------------------------------------------------- */

/*
 * REWRITTEN 2026-10-01, owner: "optional side quests leave the main road: put
 * them on a clearly drawn branch lane beside the main path (a visible trail
 * connecting them to the lesson they branch from)". This section pinned the
 * weave (weaveLoops: runs capped at RUN_MAX, mouths RUN_GAP apart, overflow
 * onto the road) and section 2 pinned loopWind's detour swing. Both are
 * deleted, because the mouths were picked for spacing and not for content, so
 * Unit 1's three side quests sat between steps 1 and 2 whatever they waited
 * for. Their replacements pin the owner's rule, each over every unit:
 *
 *   - a side quest hangs directly under the lesson it branches from, which is
 *     the latest main-line lesson it waits for (prerequisitesOf), never earlier
 *   - nothing that is a side quest rides the main lane of a unit with a road
 *     (the old overflow did exactly that, dimmed)
 *   - every node is drawn once
 *   - above START on the main lane sits only what is done
 *
 * The branch lane's geometry (its own column, clear of the road) moved to
 * pathwayRowLanes.test.ts with the CSS it reads.
 */

/** The main-line lessons a node waits for, following chains through side quests. */
function mainPrereqs(unit: (typeof PATHWAY_UNITS)[number], id: string, column: readonly string[]): readonly string[] {
  const node = unit.nodes.find((entry) => entry.id === id)!;
  return prerequisitesOf(unit, node).flatMap((pre) => (column.includes(pre) ? [pre] : mainPrereqs(unit, pre, column)));
}

describe("the branch lane, over every unit of the map the browser actually draws", () => {
  it("has side quests on a branch lane somewhere: this suite would pass vacuously without them", () => {
    const total = PATHWAY_UNITS.reduce((sum, unit) => sum + weaveBranches(unit).filter((entry) => entry.lane === "branch").length, 0);
    expect(total).toBeGreaterThan(3);
  });

  it("hangs every side quest directly under the lesson it branches from", () => {
    for (const unit of PATHWAY_UNITS) {
      const shape = unitShape(unit);
      let parent: string | null = null;
      for (const entry of weaveBranches(unit)) {
        if (entry.lane === "main") {
          parent = entry.node.id;
          continue;
        }
        expect(parent, `${entry.node.id} has a lesson above it`).not.toBeNull();
        expect(parent, entry.node.id).toBe(shape.column[branchAnchor(unit, shape.column, entry.node)]!.id);
      }
    }
  });

  it("branches a playable side quest off the LATEST main-line lesson it waits for, never an earlier one", () => {
    let checked = 0;
    for (const unit of PATHWAY_UNITS) {
      const shape = unitShape(unit);
      const column = shape.column.map((node) => node.id);
      for (const node of shape.loops) {
        if (node.playable === undefined) continue;
        const waits = mainPrereqs(unit, node.id, column);
        const at = branchAnchor(unit, shape.column, node);
        expect(waits, node.id).toContain(column[at]);
        for (const id of waits) expect(column.indexOf(id), `${node.id} waits for ${id}`).toBeLessThanOrEqual(at);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(2);
  });

  it("draws every node exactly once", () => {
    for (const unit of PATHWAY_UNITS) {
      const shape = unitShape(unit);
      const woven = weaveBranches(unit);
      for (const node of [...shape.column, ...shape.loops]) {
        expect(woven.filter((entry) => entry.node.id === node.id).length, unit.id + "/" + node.id).toBe(1);
      }
      expect(woven.length).toBe(shape.column.length + shape.loops.length);
    }
  });

  it("never puts a side quest on the main lane of a unit that has a road", () => {
    let units = 0;
    for (const unit of PATHWAY_UNITS) {
      if (unitShape(unit).loops.length === 0) continue;
      units += 1;
      for (const entry of weaveBranches(unit)) {
        expect(entry.lane === "branch", unit.id + "/" + entry.node.id).toBe(entry.node.kind === "branch");
      }
    }
    expect(units).toBeGreaterThan(3);
  });

  it("puts Unit 1's side quests under their own lessons: NBS under allylic, the two Diels-Alders under 1,2 vs 1,4", () => {
    const order = weaveBranches(PATHWAY_UNITS[0]!).map((entry) => `${entry.lane === "branch" ? "+" : ""}${entry.node.id}`);
    expect(order).toEqual(["u1-allylic", "+u1-nbs", "u1-12v14", "+u1-da", "+u1-ied", "u1-kvt", "u1-x2", "+u1-poly"]);
  });

  /* ADDED 2026-10-01, owner: "nothing that is not done may sit above START in
     a way that reads as a skipped lesson". Swept over every prefix of every
     unit's line, with every earlier unit finished. */
  it("never lets anything but done work precede START on the main lane, at every frontier", () => {
    const settled: EconomyEvent[] = [];
    let checked = 0;
    for (const unit of PATHWAY_UNITS) {
      const line = unitShape(unit).column.filter((node) => node.playable !== undefined);
      for (let step = 0; step <= line.length; step += 1) {
        const journal = [...settled, ...line.slice(0, step).map((node) => clearEvent(node.id))];
        const status = deriveMapPathway(PATHWAY_UNITS, journal);
        const main = weaveBranches(unit).filter((entry) => entry.lane === "main");
        const at = main.findIndex((entry) => entry.node.id === status.currentNodeId);
        if (at === -1) continue;
        checked += 1;
        for (const entry of main.slice(0, at)) {
          const state = statusOf(status, entry.node.id).state;
          expect(state === "done" || state === "review" || entry.node.playable === undefined, `${entry.node.id} above START`).toBe(true);
        }
      }
      settled.push(...line.map((node) => clearEvent(node.id)));
      if (line.length > 0) settled.push(clearEvent(checkpointNodeId(unit.id)));
    }
    expect(checked).toBeGreaterThan(10);
  });
});

function clearEvent(nodeId: string): EconomyEvent {
  return {
    kind: "node_cleared",
    at: "2026-10-01T12:00:00.000Z",
    tz: "UTC",
    nodeId,
    nodeKind: "concept",
    flawless: true,
    stepsInOneSitting: 1,
    spine: true,
    difficulty: 3,
  };
}

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

/* ------------------------------------------------------------------------- */
/* 5. EVERY unit ends with a check, and the check runs the unit.              */
/* ------------------------------------------------------------------------- */

/**
 * THE MISSING COMPONENT, pinned so it cannot go missing again.
 *
 * Ten of the map's nodes are authored `gate` questions and nine are in Unit 2,
 * so thirteen of fifteen units used to end with their last lesson and an arch:
 * nothing on the page asked a student to put the unit together. That is the one
 * beat every bar this surface is measured against closes a unit with, and a
 * missing component is a harder failure than a weak one.
 *
 * The fix is one more NODE, not a screen: unitCheckpointNode, drawn with the
 * chip component the track already has, on the column's own wind cycle. These
 * assertions are about the DERIVATION, so they hold for a unit that has not
 * been authored yet and for one whose lessons are renamed.
 */
describe("every unit's own checkpoint", () => {
  const checks = PATHWAY_UNITS.map((unit) => ({ unit, node: unitCheckpointNode(unit) }));

  it("exists for every unit, with the unit's own name on it", () => {
    expect(checks).toHaveLength(PATHWAY_UNITS.length);
    for (const { unit, node } of checks) {
      expect(node.id).toBe(checkpointNodeId(unit.id));
      expect(node.title).toContain(unitName(unit.title));
      // It is a check, which is what draws the challenge motif on its face.
      expect(node.kind).toBe("gate");
    }
  });

  it("is never one of the unit's own authored nodes, so it moves no unlock count", () => {
    for (const { unit, node } of checks) {
      expect(unit.nodes.some((entry) => entry.id === node.id)).toBe(false);
    }
  });

  it("runs a real mixed set wherever the unit has authored lessons", () => {
    // Not vacuous: the map has authored units today.
    const withContent = checks.filter(({ unit }) => unit.nodes.some((entry) => entry.playable !== undefined));
    expect(withContent.length).toBeGreaterThan(0);
    let mixed = 0;
    for (const { unit, node } of withContent) {
      const plan = planLesson(node.id);
      // A unit whose only authored content is enrichment has nothing a check
      // may ask, because a check must not grade optional work.
      const required = unit.nodes.filter((entry) => entry.kind !== "branch" && planLesson(entry.id) !== null);
      if (required.length === 0) {
        expect(plan, unit.id).toBeNull();
        continue;
      }
      expect(plan, unit.id).not.toBeNull();
      const slots = plan!.steps.map((step) => step.slot);
      // One step per slot, which is what keeps the recipe strip describing the
      // work rather than drawing the same badge four times.
      expect(new Set(slots).size, unit.id).toBe(slots.length);
      // Short by construction: at most one per content slot.
      expect(slots.length, unit.id).toBeLessThanOrEqual(5);
      if (slots.length > 1) mixed += 1;
    }
    // At least one unit's check is genuinely a MIX rather than a single question.
    expect(mixed).toBeGreaterThan(0);
  });

  // RETITLED 2026-10-01, assertions unchanged: the check takes START once its
  // unit's lessons are cleared (owner), so "never" is no longer the rule; on a
  // fresh account it is still a lesson that holds START, which is what this pins.
  it("does not wear the START tag on a fresh account: the first lesson does", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    for (const { node } of checks) expect(statusOf(status, node.id).state).not.toBe("current");
    expect([...status.nodes.values()].filter((entry) => entry.state === "current")).toHaveLength(1);
  });

  /*
   * CHANGED 2026-09-29, and the change is to the requirement, not a loosening.
   * This used to assert the first unit's check was "open" on a fresh account.
   * That was the behaviour, and it broke the owner's curriculum rule: a
   * question may only combine skills the student has already cleared one at a
   * time, and the check is a mix of the unit's lessons. The assertion now pins
   * the stricter state, and the block below pins every step of the sequence.
   */
  /*
   * A MISS IN THE CHECK'S QUICK QUESTIONS COMES BACK, and does not strand the
   * student. Found in the browser: the recycle pass looked the missed ids up on
   * the checkpoint's own id, which has no questions, and rendered "Nothing here
   * yet" after the last step. Every missed id a checkpoint's MCQ step can
   * produce must resolve to a beat through recycleBeatsFor.
   */
  it("brings every missed quick question back in the recycle pass, from the lesson it was borrowed from", () => {
    let checked = 0;
    for (const { node } of checks) {
      const plan = planLesson(node.id);
      if (plan === null) continue;
      const ids = plan.steps.flatMap((step) => (step.beat.kind === "mcq" ? mcqBeatsForNode(step.beat.node).map((b) => b.id) : []));
      if (ids.length === 0) continue;
      checked += 1;
      expect(recycleBeatsFor(plan, ids).map((b) => b.id).sort(), node.id).toEqual([...ids].sort());
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("stays shut on a fresh account, locks with its unit, and is counted in neither", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    const first = checks[0]!;
    const last = checks[checks.length - 1]!;
    expect(statusOf(status, first.node.id).state).toBe("locked");
    expect(statusOf(status, last.node.id).state).toBe("locked");
    // The unit's own denominators never saw it.
    const entry = status.units.get(first.unit.id)!;
    expect(entry.total).toBe(first.unit.nodes.length);
    expect(entry.playable).toBe(first.unit.nodes.filter((n) => n.kind !== "branch" && n.playable !== undefined).length);
  });

  /*
   * THE CHECK OPENS ONLY ONCE EVERY LESSON IT CAN BORROW FROM IS CLEARED, and
   * clearing it marks it done without moving any progress number. Walked over
   * Unit 1's real required lessons, one clear at a time, so a unit that gains
   * a lesson is still covered. `&flags=` is not needed: deriveMapPathway reads
   * only the journal handed to it, never the DEV snapshot.
   */
  it("opens after the unit's last required lesson and not one clear sooner, and clears to done", () => {
    const unit = PATHWAY_UNITS[0]!;
    const checkId = checkpointNodeId(unit.id);
    const required = unit.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined);
    expect(required.length).toBeGreaterThan(1);
    const clear = (nodeId: string) => ({
      kind: "node_cleared" as const,
      at: "2026-09-29T12:00:00.000Z",
      tz: "UTC",
      nodeId,
      nodeKind: "concept" as const,
      flawless: true,
      stepsInOneSitting: 1,
      spine: true,
      difficulty: 3 as const,
    });
    // Every lesson the check could borrow from is one of these, so all of them
    // cleared is the earliest point the mix is made only of cleared skills.
    for (const step of planLesson(checkId)?.steps ?? []) {
      const source = step.beat.kind === "mcq" ? step.beat.node : null;
      if (source !== null) expect(required.some((node) => node.id === source), source).toBe(true);
    }
    const journal: EconomyEvent[] = [];
    for (const node of required.slice(0, -1)) {
      journal.push(clear(node.id));
      expect(statusOf(deriveMapPathway(PATHWAY_UNITS, journal), checkId).state, node.id).toBe("locked");
    }
    journal.push(clear(required[required.length - 1]!.id));
    const ready = deriveMapPathway(PATHWAY_UNITS, journal);
    /*
     * CHANGED 2026-10-01 to the owner's rule, three assertions: the check
     * GATES the next unit and takes START once the line is cleared. It said
     * "open", "Unit 2 is open already" and "clearing the check moves no
     * current node"; it now says "current", "Unit 2 waits for the check" and
     * "clearing the check moves START out of the unit". The count of
     * currents and the unchanged progress number are kept as they were.
     */
    expect(statusOf(ready, checkId).state).toBe("current");
    expect(ready.currentNodeId).toBe(checkId);
    expect([...ready.nodes.values()].filter((entry) => entry.state === "current")).toHaveLength(1);
    expect(ready.units.get(PATHWAY_UNITS[1]!.id)?.reachable).toBe(false);
    journal.push(clear(checkId));
    const after = deriveMapPathway(PATHWAY_UNITS, journal);
    expect(statusOf(after, checkId).state).toBe("done");
    // Clearing the check moved no progress number; it moved START on.
    expect(after.doneCount).toBe(ready.doneCount);
    expect(after.units.get(PATHWAY_UNITS[1]!.id)?.reachable).toBe(true);
    expect(after.currentNodeId).not.toBe(checkId);
    expect(after.currentNodeId).not.toBeNull();
  });
});

/* ------------------------------------------------------------------------- */
/* 4. The order the shape can be read off, now that no trail draws it.        */
/* ------------------------------------------------------------------------- */

/**
 * ORDER IS LEGIBLE OR IT IS NOT THERE. The owner deleted the drawn trail
 * (2026-09-23, "just give it a glow") and a critic measured what went with
 * it on unit 1 at 390 by 844: no chip carried an index in its text or its
 * accessible name, two chips sat at the same y with nothing ordering them,
 * and the column reversed direction four times across 226px of a 390px
 * screen.
 *
 * THE FIX IS 1..n, since 2026-10-01. The unit is one line now (owner: "make
 * the lessons follow a predictable path"), each lesson opening the next, so a
 * number on every main-line chip is a true statement about order. Until then
 * the unit was a DIAMOND and these assertions refused to number its arms;
 * that refusal is rewritten below into its replacement, that nothing on the
 * main line goes unnumbered and no number repeats.
 *
 * Every claim below is about the DERIVATION, so a unit whose shape changes
 * changes what its chips say in the same breath and no table can drift.
 */
describe("the order a unit's chips can be read off their names", () => {
  it("gives every main-line node its position, 1 to n in authored order", () => {
    for (const unit of PATHWAY_UNITS) {
      const shape = unitShape(unit);
      const places = nodePlaces(shape);
      shape.column.forEach((node, i) => {
        const place = places.get(node.id);
        expect(place, `${unit.id}/${node.id} must carry a place`).toBeDefined();
        expect(place).toEqual({ kind: "step", index: i + 1, total: shape.column.length });
        expect(placeSaid(place!)).toBe(`Step ${i + 1} of ${shape.column.length}`);
      });
    }
  });

  /*
     REWRITTEN 2026-10-01. Was: "never lets an arm claim a step number,
     because both arms are open at once", which pinned the fork's refusal to
     order its arms. There are no arms; the replacement pins the opposite
     duty as strictly: every main-line chip says a step, no two say the same
     one, and nothing anywhere still says a route may be taken in either order.
  */
  it("numbers every main-line chip once, and no chip offers an either-order route", () => {
    for (const unit of PATHWAY_UNITS) {
      const shape = unitShape(unit);
      const places = nodePlaces(shape);
      const said = shape.column.map((node) => placeSaid(places.get(node.id) ?? null));
      expect(new Set(said).size, unit.id).toBe(said.length);
      for (const line of said) expect(line).toMatch(/^Step \d+ of \d+$/);
      for (const place of places.values()) expect(placeSaid(place)).not.toMatch(/either/i);
    }
  });

  it("says optional on enrichment and check on the gate questions", () => {
    for (const unit of PATHWAY_UNITS) {
      const shape = unitShape(unit);
      const places = nodePlaces(shape);
      for (const node of shape.loops) {
        expect(placeSaid(places.get(node.id) ?? null)).toBe("Optional side quest, off the main path");
      }
      shape.checkpoint.forEach((node, i) => {
        expect(placeSaid(places.get(node.id) ?? null)).toBe(
          `Unit check, question ${i + 1} of ${shape.checkpoint.length}`,
        );
      });
    }
  });

  it("derives the places from the shape, so a different shape says something different", () => {
    // Two units with different trunk lengths must report different totals,
    // which a hand-typed table would have to be edited to keep true.
    const totals = new Set(
      PATHWAY_UNITS.map((unit) => unitShape(unit).column.length).filter((length) => length > 0),
    );
    expect(totals.size).toBeGreaterThan(1);
    // And the map places exactly the nodes the shape names: no node left
    // silent, no id invented.
    for (const unit of PATHWAY_UNITS) {
      const shape = unitShape(unit);
      const named = [...shape.column, ...shape.loops, ...shape.checkpoint].map((node) => node.id);
      expect([...nodePlaces(shape).keys()].sort()).toEqual([...named].sort());
    }
  });
});
