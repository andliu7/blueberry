// @vitest-environment jsdom
/**
 * The owner's side quest rule (STATUS C1, 24 Oct): side quests count on
 * quizzes, test-outs and exams only when the student's syllabus covers them;
 * default no. With no syllabus every source list is exactly today's; a
 * covered side quest joins its section's test and its unit's exam, and the
 * checkpoint mix, but is never in what a pass lights.
 */
import { afterEach, describe, expect, it } from "vitest";
import { PATHWAY_UNITS, pathwayNode, type PathwayUnit } from "../demo/pathwayMap";
import { checkpointPlan } from "../beats/template";
import { nodeSheetModel, type SheetNode } from "../pathway-sheet/nodeSheetModel";
import { coveredSideQuests, syllabusStore, type SyllabusPlan } from "../syllabus/syllabusPlan";
import { branchSection, testOutFor, unitExamId, unitSections } from "../tabs/pathway/testOuts";

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
});

describe("the unit checkpoint mix", () => {
  // A unit with its side quest first, so a covered side quest can take a slot (checkpointPlan keeps one step per slot).
  const birch = pathwayNode("u3-birch")!;
  const test: PathwayUnit = { id: "u3", title: "Unit 3 · Test", note: "", nodes: [birch, pathwayNode("u3-arenium")!] };
  const nodesIn = (covered: boolean) => {
    syllabusStore.replace(covered ? { ...plan(["u3-birch"]), unitOrder: ["u3"] } : null);
    return (checkpointPlan(test, "u3-check")?.steps ?? []).map((step) => JSON.stringify(step.beat));
  };

  it("skips an uncovered side quest and includes a covered one", () => {
    const without = nodesIn(false);
    const withIt = nodesIn(true);
    expect(without.some((beat) => beat.includes("u3-birch"))).toBe(false);
    expect(withIt.some((beat) => beat.includes("u3-birch"))).toBe(true);
  });
});

describe("the node sheet's side quest line", () => {
  const sheet = (id: string): SheetNode => ({ id, kind: "branch", state: "open", title: "Gabriel synthesis", blurb: "", practiceHref: "#/app/lesson/" + id });

  it("says optional with no syllabus, and on your syllabus when covered", () => {
    expect(nodeSheetModel(sheet("u10-gabriel")).practiceDetail).toBe("Optional side quest. It is not on the unit checkpoint.");
    syllabusStore.replace(plan(["u10-gabriel"]));
    expect(nodeSheetModel(sheet("u10-gabriel")).practiceDetail).toBe("Counts on quizzes and exams: it is on your syllabus.");
  });
});
