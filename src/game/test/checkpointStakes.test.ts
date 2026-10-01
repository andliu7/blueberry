/**
 * THE CHECKPOINT STATES ITS STAKES, and every number in them is derived.
 * Round 3 (g11 critic): the checkpoint sheet was one card titled "Practice",
 * with no question count and nothing saying that passing it opens the next
 * unit; and clearing Unit 1 landed on Unit 3 with no sentence saying Unit 2
 * has nothing written. These pin the data half of all three.
 */

import { describe, expect, it } from "vitest";
import { PATHWAY_UNITS, checkpointNodeId } from "../demo/pathwayMap";
import { planLesson } from "../beats/template";
import { CHECKPOINT_QUESTIONS, checkpointQuestions } from "../pathway-sheet/nodeDifficulty";
import { nodeSheetModel } from "../pathway-sheet/nodeSheetModel";
import { deriveMapPathway, hasContent, unitLockSaid, unitNote, unitOpenedAfter } from "../tabs/pathway/pathwayState";
import type { EconomyEvent } from "@blueberry/economy";
import { unitNumber } from "../demo/pathwayMap";

function cleared(nodeId: string): EconomyEvent {
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

/** Unit 1 finished whole: every authored lesson and its checkpoint. */
const UNIT_ONE_DONE = [
  ...PATHWAY_UNITS[0]!.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined).map((node) => cleared(node.id)),
  cleared(checkpointNodeId("u1")),
];

describe("CHECKPOINT_QUESTIONS, regenerated from the real content", () => {
  it("matches the length of every unit's checkpoint plan", () => {
    const regenerated: Record<string, number> = {};
    for (const unit of PATHWAY_UNITS) {
      const plan = planLesson(checkpointNodeId(unit.id));
      if (plan !== null) regenerated[unit.id] = plan.steps.length;
    }
    const literal = JSON.stringify(regenerated, null, 2);
    expect(CHECKPOINT_QUESTIONS, `regenerated literal:\n${literal}`).toEqual(regenerated);
    // Non-vacuous: authored units have checkpoints today.
    expect(Object.keys(regenerated).length).toBeGreaterThan(3);
  });

  it("says no count for a unit with nothing authored", () => {
    expect(checkpointQuestions("u2")).toBeNull();
    expect(checkpointQuestions("no-such-unit")).toBeNull();
  });
});

describe("where a checkpoint pass goes, from the map", () => {
  it("opens the next unit WITH content, naming the empty ones walked through", () => {
    // Derived from the data, not typed: whichever units are empty today.
    PATHWAY_UNITS.forEach((unit, at) => {
      const { opens, skipped } = unitOpenedAfter(PATHWAY_UNITS, at);
      const later = PATHWAY_UNITS.slice(at + 1);
      const expected = later.find(hasContent) ?? null;
      expect(opens?.id ?? null, unit.id).toBe(expected?.id ?? null);
      if (expected !== null) expect(skipped.map((entry) => entry.id)).toEqual(later.slice(0, later.indexOf(expected)).map((entry) => entry.id));
    });
    // Unit 1's pass opens Unit 3 today because Unit 2 has nothing written.
    expect(hasContent(PATHWAY_UNITS[1]!)).toBe(false);
    expect(unitOpenedAfter(PATHWAY_UNITS, 0).opens?.id).toBe("u3");
  });
});

describe("the checkpoint sheet states its stakes, never 'Practice'", () => {
  const check = {
    id: checkpointNodeId("u1"),
    kind: "gate" as const,
    state: "current" as const,
    title: "Conjugation checkpoint",
    blurb: "",
    practiceHref: "#/app/lesson/u1-check",
  };

  it("titles the card with the unit a pass opens and counts the questions from data", () => {
    const route = unitOpenedAfter(PATHWAY_UNITS, 0);
    const model = nodeSheetModel({
      ...check,
      checkpoint: {
        opens: unitNumber(route.opens!.title),
        skipped: route.skipped.map((unit) => unitNumber(unit.title)),
        questions: checkpointQuestions("u1"),
      },
    });
    expect(model.practiceTitle).toBe(`Pass to open ${unitNumber(route.opens!.title)}`);
    expect(model.practiceTitle).not.toMatch(/practice/i);
    const n = CHECKPOINT_QUESTIONS.u1!;
    expect(model.practiceDetail).toContain(`${n} ${n === 1 ? "question" : "questions"}`);
    for (const unit of route.skipped) expect(model.practiceDetail).toContain(`${unitNumber(unit.title)} has nothing written yet`);
  });

  it("says the course ends where no later unit has content, and keeps Practice on a lesson", () => {
    expect(nodeSheetModel({ ...check, checkpoint: { opens: null, skipped: [], questions: null } }).practiceTitle).toBe("Pass to finish the course");
    const lesson = nodeSheetModel({ ...check, id: "u1-kvt", kind: "spine" });
    expect(lesson.practiceTitle).toBe("Practice");
    expect(lesson.practiceDetail).toBeNull();
  });

  it("calls a side quest optional and never a lesson", () => {
    const model = nodeSheetModel({ ...check, id: "u1-nbs", kind: "branch", state: "open" });
    expect(model.kindLabel).toBe("Optional side quest");
    expect(model.label).toContain("Optional");
    expect(model.challenge.note).not.toMatch(/lesson/i);
    // Visibly, on the card, not only in the accessible name.
    expect(model.practiceDetail).toMatch(/^Optional side quest\./);
  });
});

describe("the unit page says what really happens", () => {
  it("on a fresh account names Unit 1 as the blocker on every later unit, never 'the unit before it'", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    expect(unitLockSaid(PATHWAY_UNITS, status)).toBe(`Opens when you finish ${unitNumber(PATHWAY_UNITS[0]!.title)}`);
    expect(unitNote(PATHWAY_UNITS, status, 2)).toBe(`Locked. Finish ${unitNumber(PATHWAY_UNITS[0]!.title)} to open this.`);
  });

  it("says an empty unit is coming and never holds the student back, and where the track goes", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    const note = unitNote(PATHWAY_UNITS, status, 1)!;
    expect(note).toMatch(/^Coming soon\. Nothing in Unit 2 is written yet/);
    expect(note).toContain("Unit 3 opens when you finish Unit 1");
  });

  it("explains landing on Unit 3 after Unit 1, once Unit 1 is finished", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, UNIT_ONE_DONE);
    expect(status.units.get("u3")?.active).toBe(true);
    expect(unitNote(PATHWAY_UNITS, status, 2)).toBe("Unit 2 has nothing written yet, so Unit 3 opened straight after Unit 1.");
    expect(unitNote(PATHWAY_UNITS, status, 0)).toBeNull();
    expect(unitLockSaid(PATHWAY_UNITS, status)).toBe("Opens when you finish Unit 3");
  });
});
