/**
 * Unit 1 as rebuilt from the owner's whiteboard, 2026-10-07 (prompt of
 * 2026-09-29). Pins the data claims the rebuild rests on; the shape and unlock
 * consequences are pinned beside the other units in pathwayUnlock,
 * pathwayBranchDensity and pathwayUnitShape.
 */
import { describe, expect, it } from "vitest";

import { PATHWAY_UNITS, checkpointNodeId } from "../demo/pathwayMap";
import { TAKEAWAYS } from "../pathway-sheet/takeaways";

const u1 = PATHWAY_UNITS.find((unit) => unit.id === "u1")!;
const byId = new Map(u1.nodes.map((node) => [node.id, node]));

describe("Unit 1, the whiteboard rebuild", () => {
  it("keeps every node id stored progress is keyed on", () => {
    for (const id of ["u1-allylic", "u1-kvt", "u1-12v14", "u1-x2", "u1-nbs", "u1-da", "u1-ied", "u1-poly"]) {
      expect(byId.has(id), id).toBe(true);
    }
  });

  it("gives every node a role except the two enrichment nodes, and the roles of section 2", () => {
    const roles = u1.nodes.map((node) => [node.id, node.role ?? null]);
    expect(roles).toEqual([
      ["u1-allylic", "video"], ["u1-rank-cation", "practice"], ["u1-rank-anion", "practice"],
      ["u1-rank-radical", "practice"], ["u1-quiz-a", "quiz"],
      ["u1-12v14", "video"], ["u1-kvt", "video"], ["u1-energy-diagram", "practice"], ["u1-hx-dienes", "practice"],
      ["u1-x2", "practice"], ["u1-quiz-b", "quiz"],
      ["u1-nbs", "video"], ["u1-nbs-practice", "practice"], ["u1-quiz-c", "quiz"],
      ["u1-mo", "practice"], ["u1-da", "video"], ["u1-dienes", "video"], ["u1-dienophiles", "video"],
      ["u1-da-predict", "practice"], ["u1-da-stereo", "video"], ["u1-da-3d", "practice"], ["u1-quiz-d", "quiz"],
      ["u1-ied", null], ["u1-poly", null],
    ]);
  });

  it("puts Diels-Alder on the main line and keeps radicals, NBS and the enrichment off it", () => {
    expect(byId.get("u1-da")!.kind).toBe("spine");
    for (const id of ["u1-rank-radical", "u1-nbs", "u1-nbs-practice", "u1-quiz-c", "u1-ied", "u1-poly"]) {
      expect(byId.get(id)!.kind, id).toBe("branch");
    }
  });

  it("never makes a stage quiz a gate: the unit's one gate is its synthetic checkpoint", () => {
    expect(u1.nodes.filter((node) => node.kind === "gate")).toEqual([]);
    expect(checkpointNodeId("u1")).toBe("u1-check");
  });

  it("records the explainer lengths the whiteboard gives", () => {
    expect(byId.get("u1-allylic")!.videoMinutes).toBe(2);
    expect(byId.get("u1-da")!.videoMinutes).toBe(3);
  });

  it("keeps every takeaway a draft, on a real Unit 1 node", () => {
    const entries = Object.entries(TAKEAWAYS);
    expect(entries.length).toBe(20);
    for (const [id, takeaway] of entries) {
      expect(byId.has(id), id).toBe(true);
      expect(takeaway.placeholder, id).toBe(true);
      expect(takeaway.text.length, id).toBeGreaterThan(0);
    }
  });
});

/*
 * A SIDE QUEST NEVER WAITS ON SOMETHING THAT CANNOT CLEAR. prerequisitesOf
 * (pathwayState.ts) returns a branch's `after` list verbatim, while an
 * unwritten node is never cleared, so a playable side quest naming an
 * unwritten one would be locked forever. Unit 1 has several side quests whose
 * `after` names a node waiting on its pool, so this holds the line as pools land.
 */
describe("every side quest's prerequisites can clear", () => {
  it("names only playable nodes in the `after` of a playable side quest, on every unit", () => {
    let checked = 0;
    for (const unit of PATHWAY_UNITS) {
      const nodes = new Map(unit.nodes.map((node) => [node.id, node]));
      for (const node of unit.nodes) {
        if (node.playable === undefined || node.after === undefined) continue;
        for (const id of node.after) expect(nodes.get(id)?.playable, `${node.id} after ${id}`).toBeDefined();
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(1);
  });
});
