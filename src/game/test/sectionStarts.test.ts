/**
 * EVERY SECTION STARTS OPEN, owner 23 Oct: "have the first lesson open for
 * every single section across all units so that you can start wherever if
 * you feel like it. just gate the next one."
 *
 * Run through the real pipeline, the one PathwayTab draws from:
 * withSectionStarts over withReviewGates over deriveMapPathway (pathStatus).
 */
import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";

import { PATHWAY_UNITS, checkpointNodeId } from "../demo/pathwayMap";
import { deriveMapPathway, hasContent, statusOf } from "../tabs/pathway/pathwayState";
import { withReviewGates } from "../tabs/pathway/reviewCheckpoints";
import { clearedIdsOf, pathStatus, sectionWaits } from "../tabs/pathway/sectionStarts";
import { testOutFor, unitSections } from "../tabs/pathway/testOuts";

function cleared(nodeId: string): EconomyEvent {
  return {
    kind: "node_cleared",
    at: "2026-10-23T12:00:00.000Z",
    tz: "UTC",
    nodeId,
    nodeKind: "concept",
    flawless: true,
    stepsInOneSitting: 1,
    spine: true,
    difficulty: 3,
  };
}

function testedOut(testId: string): EconomyEvent {
  const test = testOutFor(testId)!;
  return { kind: "tested_out", at: "2026-10-23T12:00:00.000Z", tz: "UTC", testId, nodeIds: test.lights };
}

/** The older, stricter layers alone. */
function baseOf(journal: readonly EconomyEvent[]) {
  return withReviewGates(PATHWAY_UNITS, deriveMapPathway(PATHWAY_UNITS, journal), clearedIdsOf(journal));
}

const unit = (id: string) => PATHWAY_UNITS.find((entry) => entry.id === id)!;
const isLesson = (id: string) => unit(id.split("-")[0]!).nodes.some((node) => node.id === id && node.kind !== "branch" && node.playable !== undefined);

/** Journals along the walk that follows START, from fresh to the end of the map. */
function frontiers(): (readonly EconomyEvent[])[] {
  const out: EconomyEvent[][] = [[]];
  let journal: EconomyEvent[] = [];
  for (let step = 0; step < 400; step += 1) {
    const current = pathStatus(PATHWAY_UNITS, journal).status.currentNodeId;
    if (current === null) break;
    journal = [...journal, cleared(current)];
    out.push(journal);
  }
  return out;
}
const WALK = frontiers();

describe("the first lesson of every section is open", () => {
  it("(a) on a fresh journal, opens each section's first lesson and keeps every later one locked", () => {
    const { status } = pathStatus(PATHWAY_UNITS, []);
    let checked = 0;
    for (const entry of PATHWAY_UNITS.filter(hasContent)) {
      for (const section of unitSections(entry)) {
        const lessons = section.lights.filter((id) => entry.nodes.some((node) => node.id === id));
        if (lessons.length === 0) continue;
        expect(["open", "current"], `${entry.id} section ${section.number} first`).toContain(statusOf(status, lessons[0]!).state);
        for (const id of lessons.slice(1)) expect(statusOf(status, id), id).toEqual({ state: "locked", queued: false });
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("(b) holds exactly one START on the whole map at every frontier", () => {
    expect(WALK.length).toBeGreaterThan(50);
    for (const journal of WALK) {
      const { status } = pathStatus(PATHWAY_UNITS, journal);
      const currents = [...status.nodes.values()].filter((node) => node.state === "current").length;
      expect(currents).toBe(status.currentNodeId === null ? 0 : 1);
    }
  });

  it("(c) never locks or changes a node the stricter layers left open, at every frontier", () => {
    for (const journal of WALK) {
      const base = baseOf(journal).status;
      const seen = pathStatus(PATHWAY_UNITS, journal).status;
      expect(seen.currentNodeId).toBe(base.currentNodeId);
      for (const [id, node] of base.nodes) {
        if (node.state !== "locked") expect(statusOf(seen, id), id).toEqual(node);
      }
    }
  });

  it("(d) clearing Unit 3 Section 2's first lesson opens that section's second lesson and nothing else", () => {
    const section = unitSections(unit("u3"))[1]!;
    const [first, second] = section.lights;
    const before = pathStatus(PATHWAY_UNITS, []).status;
    const after = pathStatus(PATHWAY_UNITS, [cleared(first!)]).status;
    const changed = [...after.nodes.keys()].filter((id) => id !== first && statusOf(before, id).state !== statusOf(after, id).state);
    // Its side quests (u3-benzylic-ox, u3-birch wait on it) open too: they are not lessons on the road.
    const branches = changed.filter((id) => !isLesson(id));
    for (const id of branches) expect(unit("u3").nodes.find((node) => node.id === id)?.kind).toBe("branch");
    expect(changed.filter(isLesson)).toEqual([second]);
    expect(statusOf(after, second!).state).toBe("open");
  });

  it("(e) opens the lesson after u1-review-d on a fresh profile, held by nothing", () => {
    const s4 = unitSections(unit("u1"))[3]!;
    expect(unitSections(unit("u1"))[2]!.lights).toContain("u1-review-d");
    const gated = pathStatus(PATHWAY_UNITS, []);
    expect(statusOf(gated.status, s4.lights[0]!).state).toBe("open");
    expect(gated.gatedBy.has(s4.lights[0]!)).toBe(false);
    expect(sectionWaits(unit("u1"), s4.lights[0]!)).toEqual([]);
  });

  it("(f) a passed u3-s1-test opens Section 2's lessons one at a time, in order", () => {
    const s2 = unitSections(unit("u3"))[1]!.lights;
    let journal: EconomyEvent[] = [testedOut("u3-s1-test")];
    for (let at = 0; at < s2.length; at += 1) {
      const { status } = pathStatus(PATHWAY_UNITS, journal);
      s2.forEach((id, i) => {
        const want = i < at ? "done" : i === at ? "open" : "locked";
        expect(statusOf(status, id).state, `${id} after ${at}`).toBe(want);
      });
      journal = [...journal, cleared(s2[at]!)];
    }
  });

  it("(g) opens a side quest in a unit the stricter rule calls unreachable once its `after` lessons clear", () => {
    const quest = unit("u3").nodes.find((node) => node.id === "u3-benzylic-br")!;
    expect(quest.after).toEqual(["u3-halo"]);
    expect(baseOf([cleared("u3-arenium"), cleared("u3-halo")]).status.units.get("u3")?.reachable).toBe(false);
    expect(statusOf(pathStatus(PATHWAY_UNITS, [cleared("u3-arenium")]).status, quest.id).state).toBe("locked");
    expect(statusOf(pathStatus(PATHWAY_UNITS, [cleared("u3-arenium"), cleared("u3-halo")]).status, quest.id).state).toBe("open");
  });

  it("(h) opens a unit's check once all of its lessons are cleared, while Unit 1 is unfinished", () => {
    const lessons = unit("u4").nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined).map((node) => cleared(node.id));
    const check = checkpointNodeId("u4");
    expect(statusOf(pathStatus(PATHWAY_UNITS, lessons.slice(0, -1)).status, check).state).toBe("locked");
    const { status } = pathStatus(PATHWAY_UNITS, lessons);
    expect(statusOf(status, check).state).toBe("open");
    expect(status.currentNodeId).toBe("u1-allylic");
  });

  it("(i) keeps every unwritten node locked and queued", () => {
    for (const journal of [[], WALK[WALK.length - 1]!]) {
      const base = deriveMapPathway(PATHWAY_UNITS, journal);
      const seen = pathStatus(PATHWAY_UNITS, journal).status;
      for (const [id, node] of base.nodes) {
        if (node.queued && node.state === "locked") expect(statusOf(seen, id), id).toEqual({ state: "locked", queued: true });
      }
    }
  });

  it("marks every unit reachable, and leaves the counts alone", () => {
    const base = deriveMapPathway(PATHWAY_UNITS, []);
    const seen = pathStatus(PATHWAY_UNITS, []).status;
    for (const entry of PATHWAY_UNITS) expect(seen.units.get(entry.id)?.reachable, entry.id).toBe(true);
    expect(seen.doneCount).toBe(base.doneCount);
    expect(seen.playableCount).toBe(base.playableCount);
  });
});
