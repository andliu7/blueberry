/**
 * The side loops braid, and no mid-unit node ever renders locked.
 *
 * TWO CLAIMS, both from docs/DESIGN-GOALS.md, and both asserted POSITIVELY
 * rather than by checking that a particular bad case is absent.
 *
 * ONE: "Winding trail, never a straight central spine", together with the
 * background doctrine's "composed, never scattered" and "at most one fork
 * visible per screen".
 *
 * THE ALTERNATION CLAIM THAT USED TO BE HERE IS SUPERSEDED, and it is worth
 * saying why rather than deleting it quietly. Attempt 2 answered a column of
 * four stacked chips by ALTERNATING the sides of a run, which unstacked the
 * column and drew a braid instead: four chips either side of the road, each
 * with its own closed oval off its own stretch of spine. A critic measured
 * that as "four simultaneous forks at scrollY 0 and 2800, and six at scrollY
 * 4200" and named the braid as outside the three shapes the branch
 * vocabulary has. So a run now stays on ONE side and BOWS, trail.ts threads
 * the whole run onto one mouth, and runs are capped and spaced. The positive
 * assertions for all of that live in pathwayBranchDensity.test.ts; what stays
 * here is the claim this file can make on its own, that the SPINE winds.
 *
 * TWO: the unlock policy, owner ruling 2026-09-01. "Reactions within a unit
 * are freely orderable. Branch nodes carry no locks; only UNIT GATES lock."
 * pathwayUnlock.test.ts already sweeps the two derivation functions; this
 * file adds the claim over the SHAPE the tab actually lays out, which is the
 * half a derivation test cannot see: a node can be unlocked in the model and
 * still be handed to the renderer inside a unit that is drawn shut.
 *
 * pathwayState.test.ts encodes the model and stays untouched, per the brief.
 *
 * WALL CLOCKS: none. Every journal timestamp below is a fixed literal and
 * every other input is pure geometry, so this suite measures the same at
 * 09:00 and at 23:00 (measurements/gauntlet-economy/LOG.md, "The instruments
 * that only worked before dark").
 */

import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { trackWind } from "../tabs/pathway/pathwayLayout";
import { deriveMapPathway, prerequisitesOf, statusOf } from "../tabs/pathway/pathwayState";
import { weaveBranches } from "../tabs/pathway/unitShape";

/*
 * loopWind's three checks lived here until 2026-10-01 (side quest on the
 * vacated side, one side per run, outboard of the spine's peak). The owner
 * moved side quests off the road onto a branch lane, so loopWind is deleted;
 * the branch lane's own place, clear of the road at every width, is pinned in
 * pathwayRowLanes.test.ts and its order in pathwayBranchDensity.test.ts.
 */

/* ------------------------------------------------------------------------- */
/* The laid-out track: the same weave the tab renders.                        */
/* ------------------------------------------------------------------------- */

/**
 * The wind of every row of the whole track, in document order, computed the
 * way planUnits computes it.
 *
 * It is reproduced here rather than imported because planUnits lives in
 * PathwayTab.tsx, which imports the app's hooks and so cannot be loaded
 * outside a document. The pieces it is built from (weaveBranches and
 * trackWind) are pure and are imported, so what is
 * duplicated is six lines of control flow and not any of the arithmetic.
 */
function layout(): readonly { readonly unitId: string; readonly lane: "main" | "branch"; readonly wind: number }[] {
  const rows: { unitId: string; lane: "main" | "branch"; wind: number }[] = [];
  let index = 0;
  let lastWind = 1;
  for (const unit of PATHWAY_UNITS) {
    for (const entry of weaveBranches(unit)) {
      if (entry.lane === "main") {
        lastWind = trackWind(index);
        index += 1;
        rows.push({ unitId: unit.id, lane: "main", wind: lastWind });
        continue;
      }
      // A branch row carries its parent lesson's wind: it is where its trail starts.
      rows.push({ unitId: unit.id, lane: "branch", wind: lastWind });
    }
  }
  return rows;
}

describe("the laid-out track, over the map the browser actually draws", () => {
  it("has side quests somewhere: this suite would pass vacuously without them", () => {
    expect(layout().filter((row) => row.lane === "branch").length).toBeGreaterThan(3);
  });

  /* REWRITTEN 2026-10-01: was "keeps every detour of one run on one side".
     A run now always sits in the one branch lane, so the braid cannot form;
     what can still go wrong is a run with no lesson to leave from, or a run
     whose trail starts under a different chip than the lesson above it. */
  it("starts every run of side quests under the lesson directly above it, never at the top of a unit", () => {
    const rows = layout();
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      if (row.lane !== "branch") continue;
      const previous = rows[i - 1];
      expect(previous, "a side quest opens a unit").toBeDefined();
      expect(previous!.unitId).toBe(row.unitId);
      expect(row.wind).toBe(previous!.wind);
    }
  });

  it("winds the SPINE: no three consecutive spine nodes share a side", () => {
    // The half of the original defect that survives, and the one this file is
    // really for. "Winding trail, never a straight central spine": a run of
    // three spine nodes all leaning the same way is a diagonal drift, which a
    // blind critic once read as an indented list rather than a path.
    const spine = layout().filter((row) => row.lane === "main");
    for (let i = 2; i < spine.length; i += 1) {
      const three = [spine[i - 2]!.wind, spine[i - 1]!.wind, spine[i]!.wind].map(Math.sign);
      expect(new Set(three).size, "spine rows " + (i - 2) + " to " + i).toBeGreaterThan(1);
    }
  });

  it("never parks a spine node on the centreline, so every label keeps its gutter", () => {
    for (const row of layout()) expect(row.wind).not.toBe(0);
  });
});

/* ------------------------------------------------------------------------- */
/* The unlock policy, over the shape the tab lays out.                        */
/* ------------------------------------------------------------------------- */

/**
 * A journal with a run of the map's own node ids cleared. Fixed timestamps
 * only; see the wall-clock note at the top of this file.
 */
function journalClearing(nodeIds: readonly string[]): readonly EconomyEvent[] {
  return nodeIds.map((nodeId, i) => ({
    kind: "node_cleared" as const,
    at: `2026-08-0${i + 1}T12:00:00.000-04:00`,
    tz: "America/New_York",
    nodeId,
    nodeKind: "reaction" as const,
    flawless: true,
    stepsInOneSitting: 1,
    spine: true,
    // Difficulty is a literal union, so the annotation on the return type is
    // what pins this to a member of it rather than widening it to number.
    difficulty: 3 as const,
  }));
}

describe("the unlock policy, over every node of every laid-out unit", () => {
  /**
   * Progress states worth sweeping: nothing done, unit 1 part done, and unit
   * 1 fully cleared, which is the state that moves the active unit on and so
   * is the state where a stale per-node gate would show up.
   */
  const runs: readonly (readonly string[])[] = [
    [],
    ["u1-allylic"],
    ["u1-allylic", "u1-12v14"],
    ["u1-allylic", "u1-12v14", "u1-kvt", "u1-x2"],
    // ADDED 2026-10-01: since the owner made the checkpoint gate the next
    // unit, the run above no longer moves the active unit on; this one does.
    ["u1-allylic", "u1-12v14", "u1-kvt", "u1-x2", "u1-check"],
  ];

  /*
     REWRITTEN 2026-10-01, a sixth pin of the retired free-order ruling (the
     coordinator's list named five). It said no node inside a reachable unit
     ever locks. Under the owner's "predictable path" a node there locks
     exactly while one of its prerequisites (pathwayState.ts, prerequisitesOf)
     is uncleared, so this is now an iff over the same runs and every node.
  */
  it("locks a node inside a reachable unit EXACTLY while a prerequisite is uncleared, on any of those runs", () => {
    for (const cleared of runs) {
      const done = new Set(cleared);
      const status = deriveMapPathway(PATHWAY_UNITS, journalClearing(cleared));
      for (const unit of PATHWAY_UNITS) {
        if (status.units.get(unit.id)?.reachable !== true) continue;
        for (const node of unit.nodes) {
          if (done.has(node.id)) continue;
          const waiting = prerequisitesOf(unit, node).some((id) => !done.has(id));
          expect(statusOf(status, node.id).state === "locked", `${unit.id}/${node.id} inside a reachable unit`).toBe(waiting);
        }
      }
    }
  });

  it("locks an unreachable unit WHOLE: a lock only ever arrives at a unit boundary", () => {
    for (const cleared of runs) {
      const status = deriveMapPathway(PATHWAY_UNITS, journalClearing(cleared));
      for (const unit of PATHWAY_UNITS) {
        if (status.units.get(unit.id)?.reachable === true) continue;
        const states = unit.nodes.map((node) => statusOf(status, node.id).state);
        // Done is a fact about the past, never a gate, so it is exempt: a
        // cleared node stays cleared in a stretch the student has scrolled to.
        const notDone = states.filter((state) => state !== "done" && state !== "review");
        expect(notDone.every((state) => state === "locked")).toBe(true);
      }
    }
  });

  it("reaches at least one unit of each kind, so neither claim above is vacuous", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, journalClearing([]));
    const reachable = PATHWAY_UNITS.filter((unit) => status.units.get(unit.id)?.reachable === true);
    const shut = PATHWAY_UNITS.filter((unit) => status.units.get(unit.id)?.reachable !== true);
    expect(reachable.length).toBeGreaterThan(0);
    expect(shut.length).toBeGreaterThan(0);
  });
});
