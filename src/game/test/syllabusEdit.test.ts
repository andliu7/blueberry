/**
 * The syllabus screen's state (STATUS C1): every hand adjustment as one pure
 * step of the reducer the screen runs through useReducer.
 */
import { describe, expect, it } from "vitest";
import { EMPTY_EDIT, mergeOrder, syllabusEdit, type EditAction, type EditState } from "../syllabus/syllabusEdit";
import { matchLines, unitCandidate } from "../syllabus/syllabusMatch";
import { parseSyllabus } from "../syllabus/syllabusParse";

const FALL = new Date(2026, 7, 20, 12);
const PASTE = "Week 1: Dienes, Diels-Alder\nWeek 2: Aromaticity\nWeek 3: EAS\nWeek 4: Substitution\nWeek 5: Amines, Gabriel synthesis";
const run = (state: EditState, ...actions: EditAction[]) => actions.reduce(syllabusEdit, state);
const read = () => run(EMPTY_EDIT, { type: "read", rows: matchLines(parseSyllabus(PASTE, FALL)), now: 1 });

describe("syllabusEdit", () => {
  it("reads a paste into a plan, leaving the flagged line out of the order", () => {
    const state = read();
    expect(state.plan!.unitOrder).toEqual(["u1", "u2", "u3", "u10"]);
    expect(state.plan!.sideQuests).toEqual(["u10-gabriel"]);
    expect(state.rows[3]!.matches[0]!.bucket).toBe("low");
  });

  it("moves a unit up and down, and does nothing past either end", () => {
    const state = read();
    expect(run(state, { type: "moveUnit", unitId: "u2", by: -1 }).plan!.unitOrder).toEqual(["u2", "u1", "u3", "u10"]);
    expect(run(state, { type: "moveUnit", unitId: "u2", by: 1 }).plan!.unitOrder).toEqual(["u1", "u3", "u2", "u10"]);
    expect(run(state, { type: "moveUnit", unitId: "u1", by: -1 }).plan!.unitOrder).toEqual(["u1", "u2", "u3", "u10"]);
    expect(run(state, { type: "moveUnit", unitId: "u10", by: 1 }).plan!.unitOrder).toEqual(["u1", "u2", "u3", "u10"]);
  });

  it("moves a section inside its unit only", () => {
    const state = read();
    const before = state.plan!.sectionOrder.u3!;
    const after = run(state, { type: "moveSection", unitId: "u3", section: before[1]!, by: -1 }).plan!;
    expect(after.sectionOrder.u3).toEqual([before[1], before[0], ...before.slice(2)]);
    expect(after.sectionOrder.u1).toEqual(state.plan!.sectionOrder.u1);
    expect(run(state, { type: "moveSection", unitId: "u3", section: before[0]!, by: -1 }).plan!.sectionOrder.u3).toEqual(before);
  });

  it("toggles a unit, a section and a lesson not covered, and back (idempotent in pairs)", () => {
    const state = read();
    for (const key of ["u2", "u3/s2", "u1-da"]) {
      const off = run(state, { type: "toggleCovered", key });
      expect(off.plan!.notCovered).toEqual([key]);
      expect(run(off, { type: "toggleCovered", key }).plan!.notCovered).toEqual([]);
    }
  });

  it("switches a side quest on and off", () => {
    const state = read();
    const on = run(state, { type: "toggleSideQuest", nodeId: "u4-benzyne" });
    expect(on.plan!.sideQuests).toEqual(["u10-gabriel", "u4-benzyne"]);
    expect(run(on, { type: "toggleSideQuest", nodeId: "u10-gabriel" }).plan!.sideQuests).toEqual(["u4-benzyne"]);
  });

  it("adds a unit the syllabus did not name, with its sections, and puts back one marked not covered", () => {
    const state = read();
    const added = run(state, { type: "addUnit", unitId: "u6" });
    expect(added.plan!.unitOrder).toEqual(["u1", "u2", "u3", "u10", "u6"]);
    expect(added.plan!.sectionOrder.u6).toEqual([1]);
    const back = run(state, { type: "toggleCovered", key: "u2" }, { type: "addUnit", unitId: "u2" });
    expect(back.plan!.notCovered).toEqual([]);
    expect(back.plan!.unitOrder).toEqual(state.plan!.unitOrder);
  });

  it("moves a unit to another week", () => {
    const state = read();
    const moved = run(state, { type: "assignWeek", unitId: "u3", week: 7 }).plan!;
    expect(moved.weeks.find((week) => week.week === 3)!.unitIds).toEqual([]);
    expect(moved.weeks.find((week) => week.week === 7)!.unitIds).toEqual(["u3"]);
  });

  it("resolving a flag adds its unit after its week's neighbours and keeps the hand edits", () => {
    const edited = run(read(), { type: "moveUnit", unitId: "u2", by: -1 }, { type: "toggleCovered", key: "u1-da" }, { type: "toggleSideQuest", nodeId: "u10-gabriel" });
    const resolved = run(edited, { type: "resolve", row: 3, topic: 0, choice: unitCandidate("u4") });
    expect(resolved.plan!.unitOrder).toEqual(["u2", "u1", "u3", "u4", "u10"]);
    expect(resolved.plan!.notCovered).toEqual(["u1-da"]);
    // The side quest the student switched off stays off.
    expect(resolved.plan!.sideQuests).toEqual([]);
    expect(resolved.plan!.weeks.find((week) => week.week === 4)!.unitIds).toEqual(["u4"]);
    expect(resolved.rows[3]!.matches[0]!.chosen).toEqual(unitCandidate("u4"));
  });

  it("resolving a flag as not covered leaves the order alone", () => {
    const state = read();
    expect(run(state, { type: "resolve", row: 3, topic: 0, choice: "not-covered" }).plan!.unitOrder).toEqual(state.plan!.unitOrder);
  });

  it("loads a saved plan and clears", () => {
    const state = read();
    const loaded = run(EMPTY_EDIT, { type: "load", plan: state.plan });
    expect(loaded).toEqual({ rows: [], plan: state.plan });
    expect(run(loaded, { type: "clear" })).toBe(EMPTY_EDIT);
  });

  it("edits before any paste start from an empty plan", () => {
    expect(run(EMPTY_EDIT, { type: "addUnit", unitId: "u1" }).plan!.unitOrder).toEqual(["u1"]);
  });
});

describe("mergeOrder", () => {
  it("keeps the old order, drops what went and places what is new after its neighbour", () => {
    expect(mergeOrder(["b", "a", "c"], ["a", "x", "b"])).toEqual(["b", "a", "x"]);
    expect(mergeOrder([], ["a", "b"])).toEqual(["a", "b"]);
    expect(mergeOrder(["a"], ["z", "a"])).toEqual(["z", "a"]);
  });
});
