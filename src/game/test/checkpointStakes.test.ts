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

/**
 * CHANGED 2026-10-17: Unit 2 draft authored. The empty-unit cases below used
 * Unit 2 by name; they now take the first unit that is still empty today and
 * has a unit with content on both sides, derived from the map, so the same
 * sentences stay pinned whichever units get written next.
 */
const EMPTY_AT = PATHWAY_UNITS.findIndex(
  (unit, at) => !hasContent(unit) && PATHWAY_UNITS.slice(0, at).some(hasContent) && PATHWAY_UNITS.slice(at + 1).some(hasContent),
);

// Added 2026-10-17 (Unit 2 wire, round 2): the draft lanes are filling units one by one. When no empty unit is
// left between written ones, the tests below lose their premise; this says so by name instead of an undefined crash.
describe("the premise the walked-through tests stand on", () => {
  it("still has an empty unit with written units on both sides", () => {
    expect(EMPTY_AT, "no empty unit is left between written ones: give these tests a fixture map").toBeGreaterThan(-1);
  });
});
/** Every unit with content before the empty one, finished whole, the way UNIT_ONE_DONE finishes Unit 1. */
function doneThrough(last: number): EconomyEvent[] {
  return PATHWAY_UNITS.slice(0, last + 1)
    .filter(hasContent)
    .flatMap((unit) => [
      ...unit.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined).map((node) => cleared(node.id)),
      cleared(checkpointNodeId(unit.id)),
    ]);
}

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
    // CHANGED 2026-10-17: Unit 2 draft authored, so the unit is derived (no node on it plans a lesson) rather than typed as u2.
    const unwritten = PATHWAY_UNITS.find((unit) => unit.nodes.every((node) => planLesson(node.id) === null));
    expect(unwritten).toBeDefined();
    expect(checkpointQuestions(unwritten!.id)).toBeNull();
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
    // CHANGED 2026-10-17: Unit 2 draft authored, so Unit 1's pass opens Unit 2, walking through nothing.
    expect(hasContent(PATHWAY_UNITS[1]!)).toBe(true);
    expect(unitOpenedAfter(PATHWAY_UNITS, 0).opens?.id).toBe("u2");
    expect(unitOpenedAfter(PATHWAY_UNITS, 0).skipped).toEqual([]);
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
    // CHANGED 2026-10-17: Unit 2 draft authored; the empty unit and its neighbours are derived (EMPTY_AT), not typed.
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    const empty = PATHWAY_UNITS[EMPTY_AT]!;
    const before = [...PATHWAY_UNITS.slice(0, EMPTY_AT)].reverse().find(hasContent)!;
    const after = unitOpenedAfter(PATHWAY_UNITS, EMPTY_AT).opens!;
    const note = unitNote(PATHWAY_UNITS, status, EMPTY_AT)!;
    expect(note.startsWith(`Coming soon. Nothing in ${unitNumber(empty.title)} is written yet`)).toBe(true);
    expect(note).toContain(`${unitNumber(after.title)} opens when you finish ${unitNumber(before.title)}`);
  });

  it("lands on Unit 2 after Unit 1, once Unit 1 is finished", () => {
    // CHANGED 2026-10-17: Unit 2 draft authored, so finishing Unit 1 opens Unit 2 with no walked-through note.
    const status = deriveMapPathway(PATHWAY_UNITS, UNIT_ONE_DONE);
    expect(status.units.get("u2")?.active).toBe(true);
    expect(unitNote(PATHWAY_UNITS, status, 1)).toBeNull();
    expect(unitNote(PATHWAY_UNITS, status, 0)).toBeNull();
    expect(unitLockSaid(PATHWAY_UNITS, status)).toBe("Opens when you finish Unit 2");
  });

  it("explains landing past an empty unit, once the unit before it is finished", () => {
    // CHANGED 2026-10-17: the walked-through sentence Unit 2 used to pin, kept on the first unit still empty (EMPTY_AT).
    const before = PATHWAY_UNITS.slice(0, EMPTY_AT).map(hasContent).lastIndexOf(true);
    const route = unitOpenedAfter(PATHWAY_UNITS, before);
    const landing = PATHWAY_UNITS.indexOf(route.opens!);
    const status = deriveMapPathway(PATHWAY_UNITS, doneThrough(before));
    expect(status.units.get(route.opens!.id)?.active).toBe(true);
    const names = route.skipped.map((unit) => unitNumber(unit.title));
    expect(names).toContain(unitNumber(PATHWAY_UNITS[EMPTY_AT]!.title));
    const said = unitNote(PATHWAY_UNITS, status, landing)!;
    expect(said).toMatch(new RegExp(`nothing written yet, so ${unitNumber(route.opens!.title)} opened straight after ${unitNumber(PATHWAY_UNITS[before]!.title)}\.$`));
    expect(unitLockSaid(PATHWAY_UNITS, status)).toBe(`Opens when you finish ${unitNumber(route.opens!.title)}`);
  });
});
