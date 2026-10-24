/**
 * "Start the first lesson" goes to the first lesson (audit 23 Oct, section 5
 * #9). site.ts keeps the address as a literal so the site bundle does not load
 * the game's router; this holds the literal to the game: it parses as a lesson
 * route, and it names the first playable spine node of the first unit.
 */
import { describe, expect, it } from "vitest";

import { FIRST_LESSON_URL } from "@/data/site";
import { hrefForLesson, parseHash } from "@/game/app/routes";
import { PATHWAY_UNITS } from "@/game/demo/pathwayMap";

describe("FIRST_LESSON_URL", () => {
  it("is the first playable spine node of the first unit, as a lesson route", () => {
    const first = PATHWAY_UNITS[0]?.nodes.find((node) => node.kind === "spine" && node.playable !== undefined);
    expect(first).toBeDefined();
    expect(FIRST_LESSON_URL).toBe(hrefForLesson(first!.id));
    expect(parseHash(FIRST_LESSON_URL)).toEqual({ kind: "lesson", node: first!.id });
  });
});
