import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { counted, homeCardCounts, siteCounts } from "@/data/taxonomy";
import { PATHWAY_UNITS } from "@/game/demo/pathwayMap";
import { LESSON_TOPICS } from "@/data/lessonTopics";
import { REACTIONS } from "@/data/reactions";
import { DECKS } from "@/data/decks";
import { deckCount } from "@/data/types";

/**
 * Every count on the home page comes from src/data/taxonomy.ts and none is typed
 * (SITE-REPLAN.md section 11, phase 4c's check). The audit of 7 Oct found four different
 * counts for one course because each page typed or computed its own.
 */

/** Every file the home page is drawn from. */
const HOME_FILES = [
  "src/components/HomePage.tsx",
  "src/components/HomeHero.tsx",
  "src/components/HomeLoader.tsx",
  "src/components/HomePhoneDemo.tsx",
  "src/components/HomeDestinations.tsx",
  "src/components/HomeSections.tsx",
  "src/lib/homeDemo.ts",
  "src/data/site.ts",
];

/** The source with comments blanked, so a comment that explains a number is not a count. */
function code(file: string): string {
  return readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/\/\/.*$/gm, "");
}

describe("the taxonomy module", () => {
  it("counts each fact from the table that owns it", () => {
    const c = siteCounts();
    expect(c.units).toBe(PATHWAY_UNITS.length);
    expect(c.lessons).toBe(LESSON_TOPICS.length);
    expect(c.reactions).toBe(REACTIONS.length);
    expect(c.decks).toBe(DECKS.length);
    expect(c.cards).toBe(DECKS.reduce((n, d) => n + deckCount(d), 0));
  });

  it("counts something real: no table is empty", () => {
    for (const [name, n] of Object.entries(siteCounts())) expect(n, name).toBeGreaterThan(0);
  });

  it("writes the home card lines from those counts", () => {
    const c = siteCounts();
    const lines = homeCardCounts(c);
    expect(lines.learn).toBe(`${c.lessons} reading notes, ${c.reactions} reactions`);
    expect(lines.practice).toBe(`${c.units} units on the path`);
    expect(lines.review).toBe(`${c.decks} decks, ${c.cards} cards`);
    expect(counted(1, "unit")).toBe("1 unit");
  });
});

describe("the home page", () => {
  it("types no count: no number written next to a course noun", () => {
    const typed = /\b\d+\s+(?:units?|lessons?|sections?|reactions?|decks?|cards?|nodes?|topics?)\b/i;
    for (const file of HOME_FILES) {
      const hits = code(file).split("\n").map((line, i) => ({ at: `${file}:${i + 1}`, line })).filter(({ line }) => typed.test(line));
      expect(hits.map((h) => `${h.at}: ${h.line.trim()}`)).toEqual([]);
    }
  });

  it("computes no count of its own: no table is measured outside the taxonomy module", () => {
    const measured = /\b(?:REACTIONS|DECKS|decks|PATHWAY_UNITS|LESSON_TOPICS|TOPICS|UNITS)\.length\b|deckCount\(|courseSummary/;
    for (const file of HOME_FILES) {
      const hits = code(file).split("\n").map((line, i) => ({ at: `${file}:${i + 1}`, line })).filter(({ line }) => measured.test(line));
      expect(hits.map((h) => `${h.at}: ${h.line.trim()}`)).toEqual([]);
    }
  });

  it("takes the counts it does show from the taxonomy module", () => {
    // The destination cards moved from HomeSections into HomeDestinations (S2 round 2).
    expect(code("src/components/HomeDestinations.tsx")).toMatch(/import \{[^}]*homeCardCounts[^}]*\} from "@\/data\/taxonomy"/);
  });
});
