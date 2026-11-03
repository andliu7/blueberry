/** The difficulty algorithm's added rules, R5 and R6 (beats/difficulty.ts). Journals are hand built. */
import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { adviceForNode, isStuck, weakPrerequisites } from "../beats/difficulty";

let clock = 0;
const at = () => new Date(Date.UTC(2026, 9, 1, 12, 0, clock++)).toISOString();
const clear = (nodeId: string, flawless: boolean, cleared?: number, steps = 4): EconomyEvent => ({
  kind: "node_cleared", at: at(), tz: "America/New_York", nodeId, nodeKind: "concept", flawless,
  stepsInOneSitting: steps, spine: true, difficulty: 2, ...(cleared !== undefined ? { cleared } : {}),
});
const rated = (nodeId: string, rating: "too_easy" | "about_right" | "too_hard"): EconomyEvent => ({
  kind: "lesson_rated", at: at(), tz: "America/New_York", nodeId, rating,
});

describe("adviceForNode", () => {
  it("is the unit's pace when no rule bites", () => {
    expect(adviceForNode([], "u1-hx-dienes")).toMatchObject({ pace: 0, direction: "same", stuck: false });
    const two = [clear("u1-rank-cation", true), clear("u1-rank-anion", true)];
    expect(adviceForNode(two, "u1-hx-dienes")).toMatchObject({ pace: 1, direction: "harder" });
  });

  it("R5: a weak prerequisite stops a +1 from skipping the warm-up", () => {
    // u1-hx-dienes assumes u1-kvt. kvt went 2 of 4, then two flawless clears put the unit at +1.
    const journal = [clear("u1-kvt", false, 2), clear("u1-rank-cation", true), clear("u1-rank-anion", true)];
    expect(weakPrerequisites(journal, "u1-hx-dienes")).toEqual(["u1-kvt"]);
    const advice = adviceForNode(journal, "u1-hx-dienes");
    expect(advice).toMatchObject({ pace: 0, direction: "same", weakPrerequisites: ["u1-kvt"] });
    expect(advice.reasons.length).toBe(1);
    // A lesson that does not assume kvt is still harder.
    expect(adviceForNode(journal, "u1-nbs").pace).toBe(1);
    // A tap of "too easy" gives +1 on its own, and R5 still holds it at 0.
    expect(adviceForNode([clear("u1-kvt", false, 2), rated("u1-kvt", "too_easy")], "u1-hx-dienes").pace).toBe(0);
  });

  it("R5 does not read a clear with no count as weak, nor a later flawless clear as weak", () => {
    expect(weakPrerequisites([clear("u1-kvt", false)], "u1-hx-dienes")).toEqual([]);
    expect(weakPrerequisites([clear("u1-kvt", false, 1), clear("u1-kvt", true)], "u1-hx-dienes")).toEqual([]);
  });

  it("R5 never lowers a pace that is already 0 or -1", () => {
    expect(adviceForNode([clear("u1-kvt", false, 2)], "u1-hx-dienes").pace).toBe(0);
    expect(adviceForNode([clear("u1-kvt", false, 1)], "u1-hx-dienes").pace).toBe(-1);
  });

  it("R6: two rough clears of one lesson in a row make the student stuck", () => {
    const journal = [clear("u1-kvt", false, 1), clear("u1-kvt", false, 1)];
    expect(isStuck(journal, "u1-kvt")).toBe(true);
    expect(adviceForNode(journal, "u1-kvt")).toMatchObject({ pace: -1, direction: "easier", stuck: true });
    expect(isStuck([clear("u1-kvt", false, 1)], "u1-kvt")).toBe(false);
    expect(isStuck([clear("u1-kvt", false, 1), clear("u1-kvt", false, 3)], "u1-kvt")).toBe(false);
  });

  it("R6: a tap after the second clear ends it, and other lessons do not count", () => {
    const journal = [clear("u1-kvt", false, 1), clear("u1-kvt", false, 1), rated("u1-kvt", "about_right")];
    expect(isStuck(journal, "u1-kvt")).toBe(false);
    expect(adviceForNode(journal, "u1-kvt").pace).toBe(0);
    expect(isStuck([clear("u1-kvt", false, 1), clear("u1-12v14", false, 1)], "u1-kvt")).toBe(false);
  });

  it("is 0 for a node on no unit", () => {
    expect(adviceForNode([clear("nowhere", true), clear("nowhere", true)], "nowhere").pace).toBe(0);
  });
});
