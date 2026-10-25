/**
 * Owner rule, 24 Oct (STATUS C1): a side quest counts on quizzes and exams
 * only when the student's syllabus covers it; default no. This pins the unit
 * checkpoint half on the REAL pathway map, both ways a checkpoint is played:
 * a pool run (beats/practice/pools.ts, syllabus/syllabusQuizzes.ts) or the
 * derived mix (checkpointPlan in beats/template.ts, where a covered side quest
 * lends one graded question to the recognise step). Every playable side quest
 * is asked when covered, alone or with every other side quest of its unit,
 * and with nothing covered every mix is the pre-C1 main-line rule, checked
 * against a copy of that rule written out here rather than against itself.
 */
import { afterEach, describe, expect, it } from "vitest";
import { PATHWAY_UNITS, checkpointNodeId, type PathwayNode, type PathwayUnit } from "../demo/pathwayMap";
import { LESSON_SLOTS, checkpointPlan, lessonRecogniseBeats, planLesson, recycleBeatsFor, stepRecogniseBeats, type ContentSlot, type LessonPlan, type PlanStep } from "../beats/template";
import { poolHomeOf, practicePool } from "../beats/practice/pools";
import { reviewCheckpointFor } from "../tabs/pathway/reviewCheckpoints";
import { reviewPool } from "../tabs/pathway/reviewPool";
import { candidatesOf } from "../tabs/pathway/testOutPool";
import { syllabusStore } from "../syllabus/syllabusPlan";
import { sideQuestStop } from "../syllabus/syllabusQuizzes";

const none: ReadonlySet<string> = new Set();
const sideQuests = (unit: PathwayUnit): readonly PathwayNode[] => unit.nodes.filter((node) => node.kind === "branch" && node.playable !== undefined && node.mentionOnly !== true);
const unitOf = (id: string) => PATHWAY_UNITS.find((unit) => unit.nodes.some((node) => node.id === id))!;
const isPoolPlayed = (unit: PathwayUnit) => practicePool(checkpointNodeId(unit.id), undefined, none).length > 0;

/** The checkpoint mix as it was before C1 with nothing covered: the main line only, one step per slot. */
function mainLineMix(unit: PathwayUnit, node: string): LessonPlan | null {
  const steps: PlanStep[] = [];
  const taken = new Set<ContentSlot>();
  for (const entry of unit.nodes) {
    if (entry.kind === "branch") continue;
    for (const step of planLesson(entry.id)?.steps ?? []) {
      if (step.beat.kind === "practice" || step.beat.kind === "meet" || taken.has(step.slot)) continue;
      taken.add(step.slot);
      steps.push(step);
    }
  }
  if (steps.length === 0) return null;
  return { node, steps: [...steps].sort((a, b) => LESSON_SLOTS.indexOf(a.slot) - LESSON_SLOTS.indexOf(b.slot)) };
}

/** The question ids the unit's checkpoint asks, however it is played, with `covered` as the syllabus. */
function checkpointAsks(unit: PathwayUnit, covered: ReadonlySet<string>): readonly string[] {
  const check = checkpointNodeId(unit.id);
  if (isPoolPlayed(unit)) return practicePool(check, undefined, covered).map((entry) => entry.id);
  return (checkpointPlan(unit, check, covered)?.steps ?? []).flatMap((step) => (step.beat.kind === "mcq" ? stepRecogniseBeats(step.beat).map((beat) => beat.id) : []));
}

/** Whether one of those questions is the side quest's own. */
function asksSideQuest(asked: readonly string[], id: string): boolean {
  return asked.some((entryId) => poolHomeOf(entryId) === id);
}

afterEach(() => syllabusStore.replace(null));

describe("with nothing covered", () => {
  it("every unit's checkpoint mix is the main-line rule, and no beat lends", () => {
    for (const unit of PATHWAY_UNITS) {
      const check = checkpointNodeId(unit.id);
      expect(checkpointPlan(unit, check, none), unit.id).toEqual(mainLineMix(unit, check));
      expect(checkpointPlan(unit, check), unit.id).toEqual(mainLineMix(unit, check));
      expect(JSON.stringify(checkpointPlan(unit, check, none)), unit.id).not.toContain("lend");
    }
  });

  it("an MCQ step without a lend asks exactly its node's recognise questions", () => {
    for (const unit of PATHWAY_UNITS) {
      for (const step of checkpointPlan(unit, checkpointNodeId(unit.id), none)?.steps ?? []) {
        if (step.beat.kind === "mcq") expect(stepRecogniseBeats(step.beat)).toEqual(lessonRecogniseBeats(step.beat.node));
      }
    }
  });
});

describe("a covered side quest on its unit's checkpoint", () => {
  const all = PATHWAY_UNITS.flatMap((unit) => sideQuests(unit).map((node) => [unit, node.id] as const));

  it("covers the real side quests, benzyne, Stork, Hofmann elimination and the inverse demand Diels-Alder among them", () => {
    expect(all.length).toBeGreaterThan(40);
    expect(all.map(([, id]) => id)).toEqual(expect.arrayContaining(["u4-benzyne", "u9-stork", "u10-hofmann-e", "u1-ied"]));
  });

  it("every playable side quest, covered alone, is asked on its unit's checkpoint", () => {
    for (const [unit, id] of all) expect(asksSideQuest(checkpointAsks(unit, new Set([id])), id), id).toBe(true);
  });

  it("every playable side quest is asked when the syllabus covers every side quest of its unit at once", () => {
    for (const unit of PATHWAY_UNITS) {
      const covered = new Set(sideQuests(unit).map((node) => node.id));
      if (covered.size === 0) continue;
      const asked = checkpointAsks(unit, covered);
      for (const id of covered) expect(asksSideQuest(asked, id), id).toBe(true);
    }
  });

  it("the derived mix keeps its steps, and its question count while fewer side quests are covered than its step asks", () => {
    for (const unit of PATHWAY_UNITS.filter((entry) => !isPoolPlayed(entry) && sideQuests(entry).length > 0)) {
      const check = checkpointNodeId(unit.id);
      const before = checkpointPlan(unit, check, none)!;
      const mcq = before.steps.find((step) => step.beat.kind === "mcq")!.beat as { readonly node: string };
      const own = lessonRecogniseBeats(mcq.node).length;
      for (let count = 1; count <= sideQuests(unit).length; count++) {
        const covered = new Set(sideQuests(unit).slice(0, count).map((node) => node.id));
        const after = checkpointPlan(unit, check, covered)!;
        expect(after.steps.map((step) => step.slot), unit.id).toEqual(before.steps.map((step) => step.slot));
        const asked = checkpointAsks(unit, covered).length;
        expect(asked, `${unit.id} with ${count} covered`).toBe(count < own ? own : count + 1);
      }
    }
  });

  it("a missed lent question comes back in the recycle pass", () => {
    const unit = unitOf("u9-stork");
    const plan = checkpointPlan(unit, checkpointNodeId(unit.id), new Set(["u9-stork"]))!;
    const lent = lessonRecogniseBeats("u9-stork")[0]!;
    expect(recycleBeatsFor(plan, [lent.id]).map((beat) => beat.id)).toEqual([lent.id]);
  });

  it("reads the saved plan by default", () => {
    syllabusStore.replace({ version: 1, updatedAt: 1, weeks: [], unitOrder: ["u10"], sectionOrder: {}, notCovered: [], sideQuests: ["u10-hofmann-e"], exams: [] });
    const unit = unitOf("u10-hofmann-e");
    const asked = (checkpointPlan(unit, checkpointNodeId(unit.id))?.steps ?? []).flatMap((step) => (step.beat.kind === "mcq" ? stepRecogniseBeats(step.beat).map((beat) => beat.id) : []));
    expect(asksSideQuest(asked, "u10-hofmann-e")).toBe(true);
  });
});

describe("a side quest with no pool of its own (u1-ied)", () => {
  it("lends its authored graded question to the Unit 1 exam, its concept check and its test-outs", () => {
    const covered = new Set(["u1-ied"]);
    const stop = sideQuestStop(unitOf("u1-ied"), unitOf("u1-ied").nodes.find((node) => node.id === "u1-ied")!);
    expect(stop).not.toBeNull();
    const review = reviewCheckpointFor(stop!);
    const asked = review !== null ? reviewPool(review, undefined, 0, covered).map((one) => one.entry.id) : practicePool(stop!, undefined, covered).map((entry) => entry.id);
    expect(asksSideQuest(asked, "u1-ied")).toBe(true);
    expect(candidatesOf("u1-ied").map((one) => poolHomeOf(one.entry.id))).toContain("u1-ied");
  });

  it("asks nothing it would not have asked with nothing covered", () => {
    expect(asksSideQuest(checkpointAsks(unitOf("u1-ied"), none), "u1-ied")).toBe(false);
  });
});
