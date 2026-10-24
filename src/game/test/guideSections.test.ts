/**
 * The guidebook names its chapters in the map's words (audit 23 Oct, section
 * 5 #11): the road said "Section 2" where the guide said "Stage B", with
 * different cuts. The path hands each lesson's section to the guide on its
 * door (PathwayTab openUnitGuide); this builds the same doors from the same
 * cut (unitSections, roadOf) and reads Unit 1's eyebrows back.
 */
import { describe, expect, it } from "vitest";

import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { stageEyebrow } from "../guide/UnitGuide";
import type { LessonDoor } from "../guide/types";
import { U1_GUIDE } from "../guide/u1Guide";
import { unitSections } from "../tabs/pathway/testOuts";
import { roadOf } from "../tabs/pathway/unitShape";

const unit = PATHWAY_UNITS.find((entry) => entry.id === "u1")!;

function doors(withSections: boolean): ReadonlyMap<string, LessonDoor> {
  const sectionOf = new Map<string, number>();
  for (const section of unitSections(unit)) for (const id of section.lights) sectionOf.set(id, section.number);
  for (const stop of roadOf(unit)) {
    const number = sectionOf.get(stop.node.id);
    if (number !== undefined) for (const side of stop.sides) sectionOf.set(side.id, number);
  }
  const map = new Map<string, LessonDoor>();
  for (const node of unit.nodes) {
    const section = sectionOf.get(node.id);
    map.set(node.id, {
      title: node.title,
      state: "open",
      gate: null,
      note: null,
      sideQuest: node.kind === "branch",
      ...(withSections && section !== undefined ? { section } : {}),
    });
  }
  return map;
}

describe("the Unit 1 guidebook's chapter names", () => {
  it("say Section, as the map does, and between them name every section on the road", () => {
    const eyebrows = U1_GUIDE.stages.map((stage) => stageEyebrow(stage, doors(true)));
    for (const eyebrow of eyebrows) expect(eyebrow).toMatch(/^(Section \d+|Sections \d+ (and|to) \d+)$/);
    const named = new Set<number>();
    for (const eyebrow of eyebrows) {
      const [first, last] = (eyebrow.match(/\d+/g) ?? []).map(Number);
      for (let n = first!; n <= (last ?? first!); n += 1) named.add(n);
    }
    expect([...named].sort((a, b) => a - b)).toEqual(unitSections(unit).map((section) => section.number));
  });

  it("falls back to the guide's own stage label when the path gives no sections", () => {
    const stage = U1_GUIDE.stages[0]!;
    expect(stageEyebrow(stage, doors(false))).toBe(stage.label);
  });
});
