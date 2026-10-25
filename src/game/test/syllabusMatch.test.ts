/**
 * Matching a syllabus's topics to Blueberry's units and lessons (STATUS C1):
 * the confidence buckets, the lookalike and junk flags, every alias target
 * still on the map, and the plan a matched syllabus builds.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { SYLLABUS_ALIASES } from "../syllabus/syllabusAliases";
import { accepted, buildPlan, isFlagged, matchLines, matchTopic, unitOfTarget, wordsOf } from "../syllabus/syllabusMatch";
import { parseSyllabus } from "../syllabus/syllabusParse";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/syllabus/${name}`, import.meta.url), "utf8");
const FALL = new Date(2026, 7, 20, 12);
const WINTER = new Date(2026, 11, 1, 12);

describe("matchTopic", () => {
  it("matches abbreviations and name reactions exactly, high", () => {
    expect([matchTopic("EAS").bucket, matchTopic("EAS").best?.unitId]).toEqual(["high", "u3"]);
    expect(matchTopic("Hückel's rule").best).toMatchObject({ unitId: "u2", nodeId: "u2-huckel", confidence: 1 });
    expect(matchTopic("Huckel").best).toMatchObject({ unitId: "u2", nodeId: "u2-huckel" });
    expect(matchTopic("4n+2").best?.nodeId).toBe("u2-huckel");
    expect(matchTopic("Friedel-Crafts acylation").best?.nodeId).toBe("u3-fc-acyl");
    expect(matchTopic("Diels–Alder reaction").best?.nodeId).toBe("u1-da");
    expect(matchTopic("Wittig").best?.nodeId).toBe("u7-wittig");
  });

  it("finds the side quests by name, explicitly", () => {
    expect(matchTopic("benzyne").best).toMatchObject({ unitId: "u4", nodeId: "u4-benzyne", explicit: true, confidence: 1 });
    expect(matchTopic("Hofmann rearrangement").best).toMatchObject({ unitId: "u10", nodeId: "u10-hofmann-r", explicit: true });
    expect(matchTopic("Hofmann elimination").best).toMatchObject({ nodeId: "u10-hofmann-e", explicit: true });
  });

  it("an alias inside a longer topic is high but not explicit", () => {
    const match = matchTopic("benzyne mechanism and trapping");
    expect(match.best).toMatchObject({ nodeId: "u4-benzyne", explicit: false });
    expect(match.bucket).toBe("high");
  });

  it("a bare surname that names two lessons in one unit is medium, and not explicit", () => {
    const match = matchTopic("Hofmann");
    expect(match.bucket).toBe("medium");
    expect(match.best).toMatchObject({ unitId: "u10", explicit: false });
  });

  it("flags a lookalike that fits two units equally well as low", () => {
    for (const topic of ["Addition reactions", "Substitution"]) {
      const match = matchTopic(topic);
      expect(match.bucket, topic).toBe("low");
      expect(match.best?.confidence, topic).toBeLessThan(0.5);
    }
  });

  it("flags junk as unmatched", () => {
    const match = matchTopic("Photosynthesis in plants");
    expect([match.bucket, match.best, match.candidates]).toEqual(["none", null, []]);
  });

  it("compares words without accents, plurals, possessives or filler", () => {
    expect(wordsOf("Review of the Hückel's Rules")).toEqual(["huckel", "rule"]);
  });
});

describe("the alias list", () => {
  it("names only units and lessons that are on the map", () => {
    const ids = new Set(PATHWAY_UNITS.flatMap((unit) => [unit.id, ...unit.nodes.map((node) => node.id)]));
    const stale = Object.entries(SYLLABUS_ALIASES).filter(([, target]) => !ids.has(target));
    expect(stale).toEqual([]);
    for (const target of Object.values(SYLLABUS_ALIASES)) expect(unitOfTarget(target), target).not.toBeNull();
  });

  it("every alias still compares as words", () => {
    expect(Object.keys(SYLLABUS_ALIASES).filter((phrase) => wordsOf(phrase).length === 0)).toEqual([]);
  });
});

describe("matchLines and buildPlan", () => {
  it("builds the PDF table's order, weeks, exams and covered side quests", () => {
    const rows = matchLines(parseSyllabus(fixture("pdf-table.txt"), FALL));
    expect(rows.flatMap((row) => row.matches.filter((match) => isFlagged(row, match)))).toEqual([]);
    const plan = buildPlan(rows, 0);
    expect(plan.unitOrder).toEqual(["u1", "u2", "u3", "u4", "u5", "u7", "u8", "u9", "u10"]);
    expect(plan.weeks.find((week) => week.week === 3)).toEqual({ week: 3, start: "2026-09-09", unitIds: ["u2"] });
    expect(plan.exams).toEqual([
      { date: "2026-09-30", title: "Exam 1", unitIds: ["u1", "u2", "u3"] },
      { date: "2026-11-04", title: "Exam 2", unitIds: ["u4", "u5", "u7"] },
      { date: "2026-12-14", title: "Final Exam", unitIds: ["u8", "u9", "u10"] },
    ]);
    expect(plan.sideQuests.sort()).toEqual(["u10-hofmann-e", "u4-benzyne"]);
    expect(plan.notCovered).toEqual([]);
  });

  it("flags the chapter-only line and the junk line on the messy syllabus, and nothing else", () => {
    const rows = matchLines(parseSyllabus(fixture("messy-policy.txt"), FALL));
    const flagged = rows.flatMap((row) => row.matches.filter((match) => isFlagged(row, match)).map((match) => match.topic));
    expect(flagged).toEqual(["Ch 18", "Photosynthesis in plants"]);
    const plan = buildPlan(rows, 0);
    expect(plan.unitOrder).toEqual(["u1", "u2", "u3", "u11", "u10"]);
    expect(plan.sideQuests.sort()).toEqual(["u10-gabriel", "u10-hofmann-r", "u11-claisen-r"]);
    // The exam date is read even though "Ch 15-17" maps to nothing.
    expect(plan.exams[0]).toEqual({ date: "2026-09-30", title: "Exam 1", unitIds: ["u1", "u2", "u3"] });
  });

  it("numbers weeks from dates when the syllabus has no week column (Monday to Sunday)", () => {
    const plan = buildPlan(matchLines(parseSyllabus(fixture("mwf-lectures.txt"), WINTER)), 0);
    expect(plan.weeks.map((week) => [week.week, week.start, week.unitIds])).toEqual([
      [1, "2027-01-12", ["u1"]],
      [2, "2027-01-21", ["u2"]],
      [3, "2027-01-26", ["u3"]],
      [4, "2027-02-04", ["u5"]],
    ]);
    expect(plan.exams).toEqual([{ date: "2027-02-02", title: "Hour Exam 1", unitIds: ["u1", "u2", "u3"] }]);
  });

  it("keeps the terse list's order with no weeks, and puts the sections it names first", () => {
    const plan = buildPlan(matchLines(parseSyllabus(fixture("terse.txt"), FALL)), 0);
    expect(plan.unitOrder).toEqual(["u1", "u3", "u2", "u4", "u9", "u10"]);
    expect(plan.weeks).toEqual([]);
    // "dienes" sits in Unit 1's third section, so it comes first; the rest follow in map order.
    expect(plan.sectionOrder.u1).toEqual([3, 1, 2, 4]);
    expect(plan.sideQuests).toEqual(["u4-benzyne"]);
  });

  it("a flagged topic counts only once the student picks for it", () => {
    const [row] = matchLines(parseSyllabus("Week 2: Substitution", FALL));
    const match = row!.matches[0]!;
    expect(accepted(match)).toBeNull();
    expect(accepted({ ...match, chosen: "not-covered" })).toBeNull();
    expect(accepted({ ...match, chosen: { unitId: "u4", nodeId: null, section: null, confidence: 1, explicit: true } })?.unitId).toBe("u4");
  });
});
