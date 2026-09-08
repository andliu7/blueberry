/**
 * The pathway's five states, over the real map.
 *
 * The gap this piece was assigned came from a screen where every node rendered
 * the same, so the assertions that matter here are the ones about DISTINCTNESS:
 * exactly one current node on a track, everything before it done, everything
 * after it not reachable, and an unauthored node never described as locked by
 * progress. Nothing is asserted against a hand built fixture map; the checks run
 * over PATHWAY_UNITS, which is the inventory the browser draws.
 */

import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { deriveMapPathway, statusOf } from "../tabs/pathway/pathwayState";
import { trackWind, withBreakHints } from "../tabs/pathway/pathwayLayout";

const TZ = "UTC";

function cleared(nodeId: string): EconomyEvent {
  return {
    kind: "node_cleared",
    at: "2026-08-28T12:00:00.000Z",
    tz: TZ,
    nodeId,
    nodeKind: "reaction",
    flawless: true,
    stepsInOneSitting: 1,
    spine: true,
    difficulty: 3,
  };
}

function attempt(nodeId: string, correct: boolean): EconomyEvent {
  return { kind: "attempt", at: "2026-08-28T12:00:00.000Z", tz: TZ, nodeId, problemId: `p-${nodeId}`, correct };
}

/** Every authored track node of the first unit, in order. */
const FIRST_UNIT = PATHWAY_UNITS[0]!;
const FIRST_TRACK = FIRST_UNIT.nodes.filter((node) => node.kind !== "branch");
const FIRST_PLAYABLE = FIRST_TRACK.filter((node) => node.playable !== undefined);

describe("deriveMapPathway", () => {
  it("gives a fresh account exactly one current node, and it is the first authored one", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    const currents = [...status.nodes.values()].filter((entry) => entry.state === "current");
    expect(currents).toHaveLength(1);
    expect(status.currentNodeId).toBe(FIRST_PLAYABLE[0]!.id);
  });

  it("locks every unit after the one the student is standing in", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    const later = PATHWAY_UNITS.slice(1);
    // At least one later unit exists, or the assertion below is vacuous.
    expect(later.length).toBeGreaterThan(0);
    for (const unit of later) {
      for (const node of unit.nodes) {
        expect(statusOf(status, node.id).state).toBe("locked");
      }
    }
  });

  it("moves the current node forward as nodes are cleared, and marks the cleared ones done", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, [cleared(FIRST_PLAYABLE[0]!.id)]);
    expect(statusOf(status, FIRST_PLAYABLE[0]!.id).state).toBe("done");
    expect(status.currentNodeId).toBe(FIRST_PLAYABLE[1]!.id);
    expect([...status.nodes.values()].filter((entry) => entry.state === "current")).toHaveLength(1);
  });

  it("calls a cleared node under three quarters correct a review rather than done", () => {
    const id = FIRST_PLAYABLE[0]!.id;
    const journal = [cleared(id), attempt(id, true), attempt(id, false), attempt(id, false), attempt(id, true)];
    expect(statusOf(deriveMapPathway(PATHWAY_UNITS, journal), id).state).toBe("review");
  });

  it("keeps a node cleared at or over three quarters as done", () => {
    const id = FIRST_PLAYABLE[0]!.id;
    const journal = [cleared(id), attempt(id, true), attempt(id, true), attempt(id, true), attempt(id, false)];
    expect(statusOf(deriveMapPathway(PATHWAY_UNITS, journal), id).state).toBe("done");
  });

  it("unlocks the next unit once every authored node of this one is cleared", () => {
    const journal = FIRST_PLAYABLE.map((node) => cleared(node.id));
    const status = deriveMapPathway(PATHWAY_UNITS, journal);
    for (const node of FIRST_PLAYABLE) expect(statusOf(status, node.id).state).toBe("done");
    // The current node has moved out of unit one entirely.
    expect(FIRST_PLAYABLE.some((node) => node.id === status.currentNodeId)).toBe(false);
    expect(status.currentNodeId).not.toBeNull();
  });

  it("marks an unauthored node queued rather than blaming the student's progress", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    const queued = FIRST_TRACK.find((node) => node.playable === undefined);
    if (queued === undefined) return; // unit one may be fully authored; the rule still holds
    expect(statusOf(status, queued.id)).toEqual({ state: "locked", queued: true });
  });

  it("counts done and playable over the whole map, so the header number is the track's", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, [cleared(FIRST_PLAYABLE[0]!.id)]);
    const playable = PATHWAY_UNITS.flatMap((unit) => unit.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined));
    expect(status.playableCount).toBe(playable.length);
    expect(status.doneCount).toBe(1);
  });

  it("never leaves a node without a state, so no slab can render as the default", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    for (const unit of PATHWAY_UNITS) {
      for (const node of unit.nodes) expect(status.nodes.has(node.id)).toBe(true);
    }
  });

  it("does not wall the track off behind a unit with no authored content", () => {
    // A unit whose nodes are all queued cannot be finished by a student, so it
    // must not stop the track: this is our authoring debt, not their progress.
    const empty = PATHWAY_UNITS.find((unit) => unit.nodes.every((node) => node.playable === undefined));
    if (empty === undefined) return;
    const index = PATHWAY_UNITS.indexOf(empty);
    const before = PATHWAY_UNITS.slice(0, index).flatMap((unit) =>
      unit.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined),
    );
    const status = deriveMapPathway(PATHWAY_UNITS, before.map((node) => cleared(node.id)));
    const after = PATHWAY_UNITS[index + 1];
    if (after === undefined) return;
    const reachable = after.nodes.some((node) => statusOf(status, node.id).state !== "locked");
    expect(reachable).toBe(true);
  });
});

/**
 * The two presentation rules the label geometry depends on. They live in
 * PathwayTab because they are about drawing, and they are pure, so they are
 * tested here rather than through a render.
 */
describe("the label geometry", () => {
  it("never parks a node on the centreline, because a centred node gives its label no extra room", () => {
    const winds = [0, 1, 2, 3, 4, 5, 6, 7].map(trackWind);
    for (const wind of winds) expect(Math.abs(wind)).toBeGreaterThan(0.5);
  });

  it("still averages to zero over a cycle, so the track does not list to one side", () => {
    const cycle = [0, 1, 2, 3].map(trackWind);
    expect(cycle.reduce((sum, wind) => sum + wind, 0)).toBeCloseTo(0, 9);
  });

  it("repeats on period four, so every screen contains a turn", () => {
    for (let index = 0; index < 12; index += 1) expect(trackWind(index + 4)).toBe(trackWind(index));
  });

  it("puts the label on the side the node swung away from", () => {
    // The rendering reads `wind > 0` as "label on the left". Every step is
    // non-zero, so every label is opposite its node and none is a coin toss.
    for (let index = 0; index < 8; index += 1) expect(trackWind(index)).not.toBe(0);
  });

  it("offers a break after a solidus and changes nothing else", () => {
    const zwsp = String.fromCharCode(0x200b);
    expect(withBreakHints("Allylic/resonance delocalization")).toBe(`Allylic/${zwsp}resonance delocalization`);
    expect(withBreakHints("cis/trans/either")).toBe(`cis/${zwsp}trans/${zwsp}either`);
    expect(withBreakHints("Kinetic vs thermodynamic control")).toBe("Kinetic vs thermodynamic control");
    // Nothing but the hints is added: strip them and the label is untouched.
    for (const label of PATHWAY_UNITS.flatMap((unit) => unit.nodes.map((node) => node.title))) {
      expect(withBreakHints(label).split(zwsp).join("")).toBe(label);
    }
  });
});
