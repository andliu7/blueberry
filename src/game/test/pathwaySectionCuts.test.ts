/**
 * Section cuts by topic (owner decision 20 Oct; tabs/pathway/pathwaySections.ts
 * SECTION_ENDS): units 3, 4, 5, 7, 8, 9 and 10 have no checkpoints of their own, so
 * they are cut after named lessons into sections of 3 to 5, each ending on its
 * test-out chest.
 */
import { describe, expect, it } from "vitest";

import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { SECTION_ENDS } from "../tabs/pathway/pathwaySections";
import { testOutFor, unitSections } from "../tabs/pathway/testOuts";
import { testOutPool } from "../tabs/pathway/testOutPool";
import { unitShape } from "../tabs/pathway/unitShape";

const EXPECTED: Readonly<Record<string, readonly string[]>> = {
  // Three sections since the 23 Oct audit (top-25 #13) put directing after the arenium lesson and
  // alkylation and benzylic oxidation on the main line: twelve lessons no longer fit two sections of 3 to 5.
  u3: ["Directing and the first reactions", "Friedel-Crafts and blocking", "Changing groups and synthesis"],
  u4: ["Addition-elimination (SNAr)"],
  u5: ["Reactions of alcohols", "Ethers and epoxides", "Opening epoxides, making diols"],
  u7: ["Hydrates and acetals", "Amines, Grignards and hydrides", "Wittig, enones and C=O to CH₂"],
  u8: ["The reactivity ladder", "Down the ladder", "Hydrolysis and nitriles", "Reductions and organometallics"],
  u9: [
    "Enols and α-acidity",
    "Enolates and α-halogenation",
    "The aldol",
    "The Claisen",
    "Alkylating enolates",
    "Conjugate addition and annulation",
  ],
  u10: ["Basicity and reductions to amines", "Anilines and diazonium salts"],
};

/**
 * Units whose road is too short for the 3-to-5 rule above, or that have no
 * test-outs yet, still read a topic name and never "Part 1" (audit 23 Oct,
 * section 5 #4). Units 2 and 6 draw their lessons as the gate run, so their one
 * section is the side quests.
 */
const NAMED_ONLY: Readonly<Record<string, readonly string[]>> = {
  u2: ["Side quest: naming benzene rings"],
  u6: ["Side quests: 2D NMR and UV-Vis"],
  u11: ["Phenol acidity and phenoxide"],
  u14: ["Protecting amino acids"],
};

function unitOf(id: string) {
  return PATHWAY_UNITS.find((unit) => unit.id === id)!;
}

function spineIds(id: string): readonly string[] {
  return unitShape(unitOf(id)).column.map((node) => node.id);
}

function hasCheckpoint(id: string): boolean {
  return unitSections(unitOf(id)).some((section) => section.checkpointId !== null);
}

describe("units cut by topic", () => {
  for (const [id, titles] of Object.entries(EXPECTED)) {
    describe(id, () => {
      const sections = unitSections(unitOf(id));

      it("names its sections in order", () => {
        expect(sections.map((section) => section.title)).toEqual(titles);
      });

      it("ends every section on a test-out, not a checkpoint", () => {
        for (const section of sections) {
          expect(section.checkpointId).toBeNull();
          expect(section.testId).not.toBeNull();
        }
      });

      it("holds 3 to 5 lessons in every section", () => {
        for (const section of sections) {
          expect(section.lights.length).toBeGreaterThanOrEqual(3);
          expect(section.lights.length).toBeLessThanOrEqual(5);
        }
      });

      it("covers the main line once, in authored order", () => {
        expect(sections.flatMap((section) => section.lights)).toEqual(spineIds(id));
      });

      it("gives every section its own chest, apart from the map's nodes", () => {
        const chests = sections.map((section) => section.chestId);
        expect(new Set(chests).size).toBe(chests.length);
        const nodes = new Set(PATHWAY_UNITS.flatMap((unit) => unit.nodes.map((node) => node.id)));
        for (const chest of chests) expect(nodes.has(chest)).toBe(false);
      });

      it("fills every section test-out to its full length", () => {
        for (const section of sections) {
          const test = testOutFor(section.testId!)!;
          expect(testOutPool(test)).toHaveLength(test.size);
        }
      });
    });
  }
});

describe("short units named by topic", () => {
  for (const [id, titles] of Object.entries(NAMED_ONLY)) {
    it(`${id} names its sections`, () => {
      expect(unitSections(unitOf(id)).map((section) => section.title)).toEqual(titles);
    });
  }
});

describe("SECTION_ENDS", () => {
  const units = PATHWAY_UNITS.filter((unit) => spineIds(unit.id).some((node) => SECTION_ENDS[node] !== undefined));

  it("names only main-line lessons of units with no checkpoint", () => {
    for (const key of Object.keys(SECTION_ENDS)) {
      const unit = units.find((entry) => spineIds(entry.id).includes(key));
      expect(unit, key).toBeDefined();
      expect(hasCheckpoint(unit!.id), key).toBe(false);
    }
  });

  it("ends every unit it cuts on a named lesson, so no Part N stub trails", () => {
    for (const unit of units) {
      const spine = spineIds(unit.id);
      expect(SECTION_ENDS[spine[spine.length - 1]!], unit.id).toBeDefined();
    }
  });

  it("keeps titles unique within a unit and free of em dashes", () => {
    for (const unit of units) {
      const titles = unitSections(unit).map((section) => section.title);
      expect(new Set(titles).size).toBe(titles.length);
      for (const title of titles) expect(title).not.toContain("—");
    }
  });
});
