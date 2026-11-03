// @vitest-environment jsdom
/**
 * The owner's side quest rule (STATUS C1, 24 Oct): side quests count on
 * quizzes, test-outs and exams only when the student's syllabus covers them;
 * default no. With no syllabus every source list is exactly today's; a
 * covered side quest joins its section's test and its unit's exam, and the
 * checkpoint mix, but is never in what a pass lights. The test-out half is
 * syllabusTestOutFor (syllabus/syllabusTests.ts), a layer over testOutFor
 * that keeps the side quest rule off #/app's first open.
 */
import { afterEach, describe, expect, it } from "vitest";
import { PATHWAY_UNITS, type PathwayUnit } from "../demo/pathwayMap";
import { checkpointPlan, planLesson } from "../beats/template";
import { nodeSheetModel, type SheetNode } from "../pathway-sheet/nodeSheetModel";
import { branchSection, coveredSideQuests, sectionKey, syllabusStore, type SyllabusPlan } from "../syllabus/syllabusPlan";
import { syllabusTestOutFor as testOutFor } from "../syllabus/syllabusTests";
import { testOutFor as mainLineTestOutFor, unitExamId, unitSections } from "../tabs/pathway/testOuts";

const unit = (id: string) => PATHWAY_UNITS.find((entry) => entry.id === id)!;
const plan = (sideQuests: string[]): SyllabusPlan => ({ version: 1, updatedAt: 1, weeks: [], unitOrder: ["u10"], sectionOrder: {}, notCovered: [], sideQuests, exams: [] });
const branches = PATHWAY_UNITS.flatMap((entry) => entry.nodes.filter((node) => node.kind === "branch").map((node) => node.id));
const allTests = PATHWAY_UNITS.flatMap((entry) => [unitExamId(entry.id), ...unitSections(entry).flatMap((section) => (section.testId === null ? [] : [section.testId]))]);

afterEach(() => syllabusStore.replace(null));

describe("with no syllabus", () => {
  it("covers no side quest", () => {
    expect(coveredSideQuests()).toEqual(new Set());
  });

  it("every test-out and exam draws from the main line only, exactly as with an empty set", () => {
    for (const id of allTests) {
      const test = testOutFor(id);
      if (test === null) continue;
      expect(test, id).toEqual(testOutFor(id, PATHWAY_UNITS, new Set()));
      expect(test, id).toEqual(mainLineTestOutFor(id));
      expect(test.sources.filter((source) => branches.includes(source)), id).toEqual([]);
    }
  });
});

describe("with a syllabus that covers Gabriel synthesis", () => {
  const covered = new Set(["u10-gabriel"]);
  const u10 = unit("u10");

  it("places each side quest in the section of its latest prerequisite", () => {
    const gabriel = u10.nodes.find((node) => node.id === "u10-gabriel")!;
    const azo = u10.nodes.find((node) => node.id === "u10-azo")!;
    expect(branchSection(u10, gabriel)).toBe(1);
    expect(branchSection(u10, azo)).toBe(2);
  });

  it("joins the unit exam's sources and its own section's, and no other section's", () => {
    const exam = testOutFor(unitExamId("u10"), PATHWAY_UNITS, covered)!;
    expect(exam.sources).toContain("u10-gabriel");
    const [first, second] = unitSections(u10);
    expect(testOutFor(first!.testId!, PATHWAY_UNITS, covered)!.sources).toContain("u10-gabriel");
    expect(testOutFor(second!.testId!, PATHWAY_UNITS, covered)!.sources).not.toContain("u10-gabriel");
  });

  it("is never lit by a pass, so it stays optional and the unlock rule is untouched", () => {
    for (const id of allTests) {
      const withIt = testOutFor(id, PATHWAY_UNITS, covered);
      if (withIt === null) continue;
      const without = testOutFor(id, PATHWAY_UNITS, new Set())!;
      expect(withIt.lights, id).toEqual(without.lights);
      expect(withIt.lights, id).not.toContain("u10-gabriel");
    }
  });

  it("reads the saved plan by default", () => {
    syllabusStore.replace(plan(["u10-gabriel"]));
    expect(testOutFor(unitExamId("u10"))!.sources).toContain("u10-gabriel");
    expect(testOutFor(unitExamId("u10"))!.sources).not.toContain("u10-azo");
  });

  it("a side quest the student marked not covered does not count", () => {
    syllabusStore.replace({ ...plan(["u10-gabriel"]), notCovered: ["u10-gabriel"] });
    expect(coveredSideQuests()).toEqual(new Set());
  });

  it("nor does one inside a unit or a section the student marked not covered", () => {
    syllabusStore.replace({ ...plan(["u10-gabriel", "u10-azo"]), notCovered: ["u10"] });
    expect(coveredSideQuests()).toEqual(new Set());
    syllabusStore.replace({ ...plan(["u10-gabriel", "u10-azo"]), notCovered: [sectionKey("u10", 1)] });
    expect(coveredSideQuests()).toEqual(new Set(["u10-azo"]));
  });
});

describe("the unit checkpoint mix, on the real map", () => {
  const nodesIn = (unitId: string, covered: ReadonlySet<string>) => (checkpointPlan(unit(unitId), `${unitId}-check`, covered)?.steps ?? []).map((step) => JSON.stringify(step.beat));
  // A side quest can sit on a check only with a step a check can ask: not a first meeting, not an in-a-row run.
  const askable = (id: string) => (planLesson(id)?.steps ?? []).some((step) => step.beat.kind !== "meet" && step.beat.kind !== "practice");
  const sideQuestsOf = (entry: PathwayUnit) => entry.nodes.filter((node) => node.kind === "branch" && askable(node.id)).map((node) => node.id);

  it("with no syllabus, no checkpoint asks a side quest", () => {
    for (const entry of PATHWAY_UNITS) {
      for (const id of entry.nodes.filter((node) => node.kind === "branch").map((node) => node.id)) {
        expect(nodesIn(entry.id, new Set()).some((beat) => beat.includes(`"${id}"`)), id).toBe(false);
      }
    }
  });

  it("every askable side quest, covered alone, is on its unit's checkpoint", () => {
    const checked = PATHWAY_UNITS.flatMap((entry) => sideQuestsOf(entry).map((id) => [entry.id, id] as const));
    expect(checked.length).toBeGreaterThan(10);
    for (const [unitId, id] of checked) {
      expect(nodesIn(unitId, new Set([id])).some((beat) => beat.includes(`"${id}"`)), id).toBe(true);
    }
  });

  it("covering every side quest leaves the main line most of the mix", () => {
    for (const entry of PATHWAY_UNITS) {
      const all = new Set(entry.nodes.filter((node) => node.kind === "branch").map((node) => node.id));
      const steps = checkpointPlan(entry, `${entry.id}-check`, all)?.steps ?? [];
      const fromSideQuests = steps.filter((step) => [...all].some((id) => JSON.stringify(step.beat).includes(`"${id}"`)));
      expect(fromSideQuests.length, entry.id).toBeLessThanOrEqual(1);
    }
  });

  it("reads the saved plan by default", () => {
    const [unitId, id] = PATHWAY_UNITS.flatMap((entry) => sideQuestsOf(entry).map((quest) => [entry.id, quest] as const))[0]!;
    syllabusStore.replace({ ...plan([id]), unitOrder: [unitId] });
    expect((checkpointPlan(unit(unitId), `${unitId}-check`)?.steps ?? []).some((step) => JSON.stringify(step.beat).includes(`"${id}"`))).toBe(true);
  });
});

describe("the node sheet's side quest line", () => {
  const sheet = (id: string, onSyllabus?: boolean): SheetNode => ({ id, kind: "branch", state: "open", title: "Gabriel synthesis", blurb: "", practiceHref: "#/app/lesson/" + id, ...(onSyllabus === undefined ? {} : { onSyllabus }) });

  it("says optional with no syllabus, and names exactly where it counts when covered", () => {
    expect(nodeSheetModel(sheet("u10-gabriel")).practiceDetail).toBe("Optional side quest. It is not on the unit checkpoint.");
    // PathwayTab sets onSyllabus from the plan; the sheet model never reads the store (first-open bytes).
    syllabusStore.replace(plan(["u10-gabriel"]));
    expect(nodeSheetModel(sheet("u10-gabriel")).practiceDetail).toBe("Optional side quest. It is not on the unit checkpoint.");
    expect(nodeSheetModel(sheet("u10-gabriel", true)).practiceDetail).toBe("On your syllabus, so it counts on the unit checkpoint, its section test and the unit exam.");
  });
});
