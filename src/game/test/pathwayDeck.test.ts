import { describe, expect, it } from "vitest";
import { pathwayDeck, sectionStarts } from "../admin/deckModel";
import { lessonIndex, lessonSlides } from "../admin/slides";

describe("pathway deck", () => {
  const units = lessonIndex();
  it("builds every section, with unique slide ids, for every lesson", () => {
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        const deck = pathwayDeck(lesson, unit, lessonSlides(lesson.id));
        const ids = deck.map((s) => s.id);
        expect(new Set(ids).size, lesson.id).toBe(ids.length);
        expect(sectionStarts(deck).map((s) => s.section), lesson.id).toEqual([
          "overview", "explain", "videos", "questions", "flashcards", "challenge", "overarching", "chosen", "algorithms",
        ]);
      }
    }
  });
  it("gives the algorithm slides a diagram read from the run constants", () => {
    const unit = units.find((u) => u.lessons.length > 0)!;
    const deck = pathwayDeck(unit.lessons[0]!, unit, []);
    const kinds = deck.filter((s) => s.section === "algorithms").map((s) => s.diagram?.kind);
    expect(kinds).toEqual(["run", "failback", "failback", "pace", undefined, undefined, undefined, "pass"]);
  });
  it("states the fail-back-one rule from the run constants", () => {
    const unit = units.find((u) => u.lessons.length > 0)!;
    const deck = pathwayDeck(unit.lessons[0]!, unit, []);
    expect(deck.find((s) => s.id === "algo-failback")?.lead).toMatch(/Master \(5\)/);
  });
});
