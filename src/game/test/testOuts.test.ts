/**
 * Test-outs (owner brief 17 Oct items 1 and 2; tabs/pathway/testOuts.ts and
 * testOutPool.ts): which tests exist, what they ask, and what a pass lights.
 */
import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";

import { PATHWAY_UNITS, checkpointNodeId, pathwayNode } from "../demo/pathwayMap";
import { deriveMapPathway } from "../tabs/pathway/pathwayState";
import {
  SECTION_TEST_MAX,
  SECTION_TEST_MIN,
  TEST_OUT_UNITS,
  UNIT_EXAM_SIZE,
  sectionTestSize,
  testOutFor,
  unitExamId,
  unitSections,
} from "../tabs/pathway/testOuts";
import { candidatesOf, testOutPool } from "../tabs/pathway/testOutPool";

const AT = "2026-10-22T12:00:00.000Z";

function passed(id: string): EconomyEvent {
  const test = testOutFor(id)!;
  return { kind: "tested_out", at: AT, tz: "UTC", testId: id, nodeIds: test.lights };
}

describe("which test-outs exist", () => {
  it("names exactly the units whose lessons carry questions", () => {
    const withQuestions = PATHWAY_UNITS.filter((unit) => unit.nodes.some((node) => candidatesOf(node.id).length > 0)).map((unit) => unit.id);
    expect([...TEST_OUT_UNITS].sort()).toEqual([...withQuestions].sort());
  });

  it("gives every testable unit a full 20 question exam", () => {
    for (const id of TEST_OUT_UNITS) {
      const test = testOutFor(unitExamId(id))!;
      expect(test.size).toBe(UNIT_EXAM_SIZE);
      expect(testOutPool(test)).toHaveLength(UNIT_EXAM_SIZE);
    }
  });

  it("asks every section test its full length, 10 for the first and 15 for the last, longer each section", () => {
    for (const id of TEST_OUT_UNITS) {
      const unit = PATHWAY_UNITS.find((entry) => entry.id === id)!;
      const sections = unitSections(unit).filter((section) => section.testId !== null);
      let last = 0;
      for (const section of sections) {
        const test = testOutFor(section.testId!)!;
        expect(test.size).toBeGreaterThanOrEqual(last);
        last = test.size;
        expect(testOutPool(test)).toHaveLength(test.size);
      }
      if (unitSections(unit).length > 1) {
        expect(sectionTestSize(1, unitSections(unit).length)).toBe(SECTION_TEST_MIN);
        expect(sectionTestSize(unitSections(unit).length, unitSections(unit).length)).toBe(SECTION_TEST_MAX);
      }
    }
  });

  it("is null for an id that is not a test-out", () => {
    expect(testOutFor("u1-allylic")).toBeNull();
    expect(testOutFor(unitExamId("u12"))).toBeNull();
  });
});

describe("what a test-out asks", () => {
  const u1 = PATHWAY_UNITS.find((unit) => unit.id === "u1")!;
  const first = testOutFor(unitSections(u1)[0]!.testId!)!;

  it("draws only from the section's own lessons, with no repeats", () => {
    const pool = testOutPool(first);
    expect(new Set(pool.map((one) => one.entry.id)).size).toBe(pool.length);
    for (const one of pool) expect(first.sources).toContain(one.source);
  });

  it("mixes answer shapes when the section has them: a ladder or board every third question", () => {
    const pool = testOutPool(first);
    expect(pool[1]!.entry.item.kind).not.toBe("mcq");
    expect(pool.some((one) => one.entry.item.kind === "mcq")).toBe(true);
  });

  it("never asks a structure-editor item or a naming lesson's question", () => {
    for (const id of TEST_OUT_UNITS) {
      for (const one of testOutPool(testOutFor(unitExamId(id))!)) {
        expect(one.entry.item.kind).not.toBe("draw");
        expect(one.source).not.toContain("nomen");
      }
    }
  });
});

describe("what a pass lights", () => {
  const u1 = PATHWAY_UNITS.find((unit) => unit.id === "u1")!;
  const sections = unitSections(u1);

  it("a section's pass lights it and every section before it, and never a side quest", () => {
    const second = testOutFor(sections[1]!.testId!)!;
    expect(second.lights).toEqual([...sections[0]!.lights, ...sections[1]!.lights]);
    for (const id of second.lights) expect(pathwayNode(id)?.kind ?? "review").not.toBe("branch");
  });

  it("opens the next section on the map", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, [passed(sections[0]!.testId!)]);
    for (const id of sections[0]!.lights) expect(status.nodes.get(id)?.state).toBe("done");
    expect(status.currentNodeId).toBe(sections[1]!.lights[0]);
    expect(status.units.get("u1")?.done).toBe(sections[0]!.lights.length);
  });

  it("a unit exam pass finishes the unit with its checkpoint, so the next unit opens", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, [passed(unitExamId("u1"))]);
    expect(status.nodes.get(checkpointNodeId("u1"))?.state).toBe("done");
    expect(status.units.get("u2")?.reachable).toBe(true);
  });

  it("a later unit's exam lights every unit before it too: skip ahead from anywhere", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, [passed(unitExamId("u3"))]);
    for (const id of ["u1", "u2", "u3"]) expect(status.nodes.get(checkpointNodeId(id))?.state).toBe("done");
    expect(status.units.get("u4")?.reachable).toBe(true);
    expect(status.units.get("u4")?.active).toBe(true);
  });
});
