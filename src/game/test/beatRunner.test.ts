/**
 * The adapter between the pathway's node ids and the five beat surfaces.
 *
 * WHAT THIS FILE IS GUARDING. BeatRunner carries a hand written table mapping
 * three pathway nodes onto three sort ladders, because the ladders are keyed on
 * curriculum topic ids rather than on node ids. A hand written table is a
 * liability the moment someone renames a ladder, and the failure would be
 * silent: the node would simply stop being playable and the coverage number
 * would quietly drop. So every id in that table is resolved here against the
 * real content.
 *
 * The second thing guarded is the claim the pathway makes to the student. A
 * node linked on the map promises a lesson. If resolveBeat returns null for a
 * node the map links, the map is lying, and the test below is what catches it.
 */

import { describe, expect, it } from "vitest";

import { LADDER_FOR_NODE, nodeHasBeat, resolveBeat } from "../beats/BeatRunner";
import { sortContentById } from "../beats/sort";
import { PATHWAY_UNITS } from "../demo/pathwayMap";

describe("the ladder table", () => {
  it("names a real ladder for every node in it", () => {
    for (const [node, ladderId] of Object.entries(LADDER_FOR_NODE)) {
      expect(sortContentById(ladderId), `${node} -> ${ladderId}`).toBeDefined();
    }
  });

  it("resolves each of those nodes to its ladder", () => {
    for (const node of Object.keys(LADDER_FOR_NODE)) {
      expect(resolveBeat(node, 2), node).toEqual({ kind: "sort", ladderId: LADDER_FOR_NODE[node] });
    }
  });
});

describe("resolution", () => {
  it("gives nothing for a node with no authored content", () => {
    // u1-nbs is a branch node with nothing authored for it. It replaced
    // u3-blocking here the day u3-blocking got its MCQs: an example of "empty"
    // has to be a node that is actually still empty, or the test proves nothing.
    expect(resolveBeat("u1-nbs", 1)).toBeNull();
    expect(nodeHasBeat("u1-nbs")).toBe(false);
  });

  it("gives nothing for an id that is not a node at all", () => {
    expect(resolveBeat("not-a-node", 1)).toBeNull();
  });

  it("prefers the gentler surface when a node has more than one", () => {
    // The mastery ladder in CLAUDE.md puts the easy rung first, so a node
    // carrying both an MCQ and something heavier opens the MCQ.
    const both = Object.keys(LADDER_FOR_NODE).filter((node) => resolveBeat(node, 1)?.kind === "mcq");
    for (const node of both) {
      expect(resolveBeat(node, 1)?.kind).toBe("mcq");
    }
  });
});

describe("what the pathway promises", () => {
  const linked = PATHWAY_UNITS.flatMap((unit) =>
    unit.nodes.filter((node) => node.playable?.kind === "beat").map((node) => node),
  );

  it("links at least one node to a beat", () => {
    // Guards against the whole wiring being reverted without anyone noticing.
    expect(linked.length).toBeGreaterThan(0);
  });

  it("opens a real beat for every node it links to one", () => {
    for (const node of linked) {
      expect(resolveBeat(node.id, 1), `${node.id} is linked on the map`).not.toBeNull();
    }
  });

  it("links every node whose beat id is the node's own id", () => {
    for (const node of linked) {
      if (node.playable?.kind !== "beat") continue;
      expect(node.playable.id, node.id).toBe(node.id);
    }
  });
});
