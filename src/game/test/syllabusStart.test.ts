/**
 * START follows the syllabus (STATUS C1): the syllabus layer of pathStatus
 * moves the one "you are here" marker and changes nothing else. Across many
 * journals, every node's state after the layer equals its state before,
 * except one current <-> open swap. With no plan the result is the same
 * object. The unlock rule (first lesson of every section open, the next
 * gated) is pinned by sectionStarts.test.ts, which runs unedited.
 */
import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { clearedIdsOf, pathStatus } from "../tabs/pathway/sectionStarts";
import { unitSections } from "../tabs/pathway/testOuts";
import { withSyllabusStart } from "../syllabus/syllabusStart";
import type { SyllabusPlan } from "../syllabus/syllabusPlan";

function cleared(nodeId: string): EconomyEvent {
  return { kind: "node_cleared", at: "2026-10-23T12:00:00.000Z", tz: "UTC", nodeId, nodeKind: "concept", flawless: true, stepsInOneSitting: 1, spine: true, difficulty: 3 };
}

/** Journals along the walk that follows START, from fresh onward. */
function walk(steps: number): (readonly EconomyEvent[])[] {
  const out: EconomyEvent[][] = [[]];
  let journal: EconomyEvent[] = [];
  for (let step = 0; step < steps; step += 1) {
    const current = pathStatus(PATHWAY_UNITS, journal).status.currentNodeId;
    if (current === null) break;
    journal = [...journal, cleared(current)];
    out.push(journal);
  }
  return out;
}
const WALK = walk(60);

const PLAN: SyllabusPlan = {
  version: 1,
  updatedAt: 1,
  weeks: [
    { week: 1, start: "2026-08-24", unitIds: ["u1"] },
    { week: 2, start: "2026-08-31", unitIds: ["u3"] },
    { week: 3, start: "2026-09-07", unitIds: ["u5"] },
    { week: 4, start: "2026-09-14", unitIds: ["u7"] },
  ],
  unitOrder: ["u1", "u3", "u5", "u7"],
  sectionOrder: { u3: [2, 1, 3] },
  notCovered: [],
  sideQuests: [],
  exams: [],
};
const DATES = ["2026-08-01", "2026-08-25", "2026-09-01", "2026-09-08", "2026-09-20"];

const unitOf = (nodeId: string) => PATHWAY_UNITS.find((unit) => unit.nodes.some((node) => node.id === nodeId))!.id;

describe("withSyllabusStart", () => {
  it("returns the same object with no plan", () => {
    const journal = WALK[3]!;
    const base = pathStatus(PATHWAY_UNITS, journal);
    expect(withSyllabusStart(PATHWAY_UNITS, base, null, clearedIdsOf(journal))).toBe(base);
  });

  it("changes at most one current <-> open pair, on every journal and date", () => {
    for (const journal of WALK) {
      for (const today of DATES) {
        const base = pathStatus(PATHWAY_UNITS, journal);
        const moved = pathStatus(PATHWAY_UNITS, journal, clearedIdsOf(journal), PLAN, today);
        const changed = [...base.status.nodes].filter(([id, status]) => moved.status.nodes.get(id)!.state !== status.state);
        if (moved.status.currentNodeId === base.status.currentNodeId) {
          expect(changed).toEqual([]);
          continue;
        }
        const target = moved.status.currentNodeId!;
        const was = base.status.currentNodeId;
        expect(base.status.nodes.get(target)!.state, target).toBe("open");
        expect(moved.status.nodes.get(target)!.state).toBe("current");
        if (was !== null) expect(moved.status.nodes.get(was)!.state).toBe("open");
        expect(changed.map(([id]) => id).sort()).toEqual([target, ...(was === null ? [] : [was])].sort());
        // Nothing opens or locks: the same nodes are locked before and after.
        const locked = (status: typeof base) => [...status.status.nodes].filter(([, entry]) => entry.state === "locked").map(([id]) => id);
        expect(locked(moved)).toEqual(locked(base));
        expect(moved.gatedBy).toEqual(base.gatedBy);
        // The active unit is the one START now stands in, and only that one.
        expect([...moved.status.units].filter(([, entry]) => entry.active).map(([id]) => id)).toEqual([unitOf(target)]);
      }
    }
  });

  it("points at this week's unit, walking its sections in the plan's order", () => {
    const fresh = pathStatus(PATHWAY_UNITS, [], new Set(), PLAN, "2026-09-01");
    const u3 = PATHWAY_UNITS.find((unit) => unit.id === "u3")!;
    // Week 2 is Unit 3, and its plan starts at section 2, whose first lesson is open.
    expect(fresh.status.currentNodeId).toBe(unitSections(u3)[1]!.sources[0]);
    // Week 3 is Unit 5, its first section.
    const u5 = PATHWAY_UNITS.find((unit) => unit.id === "u5")!;
    expect(pathStatus(PATHWAY_UNITS, [], new Set(), PLAN, "2026-09-08").status.currentNodeId).toBe(unitSections(u5)[0]!.sources[0]);
  });

  it("skips a section or lesson marked not covered", () => {
    const u3 = PATHWAY_UNITS.find((unit) => unit.id === "u3")!;
    const plan = { ...PLAN, notCovered: ["u3/s2"] };
    expect(pathStatus(PATHWAY_UNITS, [], new Set(), plan, "2026-09-01").status.currentNodeId).toBe(unitSections(u3)[0]!.sources[0]);
  });

  it("a finished week goes on to the next syllabus unit; with nothing open left, START stays put", () => {
    const u3 = PATHWAY_UNITS.find((unit) => unit.id === "u3")!;
    const journal = u3.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined).map((node) => cleared(node.id));
    const next = pathStatus(PATHWAY_UNITS, journal, clearedIdsOf(journal), PLAN, "2026-09-01").status.currentNodeId!;
    expect(unitOf(next)).toBe("u5");
    const onlyU3 = { ...PLAN, unitOrder: ["u3"], weeks: [{ week: 2, start: "2026-08-31", unitIds: ["u3"] }] };
    const base = pathStatus(PATHWAY_UNITS, journal);
    expect(pathStatus(PATHWAY_UNITS, journal, clearedIdsOf(journal), onlyU3, "2026-09-01").status).toEqual(base.status);
  });
});
