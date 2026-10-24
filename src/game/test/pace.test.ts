/**
 * Lesson pace and the recognise step's rungs (audit 23 Oct, top-25 #1 and
 * section 4). Every journal here is HAND BUILT: the DEV `&flags=` clears fake
 * the journal (vitest-dev-flags-fake-journal), so they would prove nothing.
 */
import { describe, expect, it } from "vitest";
import { isEconomyEvent, type EconomyEvent } from "@blueberry/economy";
import { paceFor, paceForNode, skipAheadTestId, unitIdForNode } from "../beats/pace";
import { hasHardRecognise, lessonRecogniseBeats, planLesson } from "../beats/template";
import { declaredLevel } from "../beats/types";
import { commitPick, levelNow, selectOption, startMcqSession, advance } from "../beats/mcq/session";
import { PATHWAY_UNITS } from "../demo/pathwayMap";

const TZ = "America/New_York";
let clock = 0;
const at = () => new Date(Date.UTC(2026, 9, 1, 12, 0, clock++)).toISOString();

function clear(nodeId: string, flawless: boolean, cleared?: number, steps = 4): EconomyEvent {
  return {
    kind: "node_cleared",
    at: at(),
    tz: TZ,
    nodeId,
    nodeKind: "concept",
    flawless,
    stepsInOneSitting: steps,
    spine: true,
    difficulty: 2,
    ...(cleared !== undefined ? { cleared } : {}),
  };
}

function rated(nodeId: string, rating: "too_easy" | "about_right" | "too_hard"): EconomyEvent {
  return { kind: "lesson_rated", at: at(), tz: TZ, nodeId, rating };
}

// Unit 5 beat lessons (no trainer step) and one trainer lesson.
const A = "u5-oxidation";
const B = "u5-protecting";
const C = "u5-syn-diol";
const MECH = "u5-roh-rx";

describe("paceFor", () => {
  it("is 0 on an empty journal and for an unknown unit", () => {
    expect(paceFor([], "u5")).toBe(0);
    expect(paceFor([clear(A, true), clear(B, true)], "u99")).toBe(0);
  });

  it("goes to +1 after two flawless lessons in a row, not after one", () => {
    expect(paceFor([clear(A, true)], "u5")).toBe(0);
    expect(paceFor([clear(A, true), clear(B, true)], "u5")).toBe(1);
    expect(paceFor([clear(A, true), clear(B, false, 3), clear(C, true)], "u5")).toBe(0);
  });

  it("goes to -1 when first-try accuracy is under half", () => {
    expect(paceFor([clear(A, false, 1, 4)], "u5")).toBe(-1);
    // Exactly half is mixed, not rough.
    expect(paceFor([clear(A, false, 2, 4)], "u5")).toBe(0);
    // A clear with no count is never read as rough.
    expect(paceFor([clear(A, false)], "u5")).toBe(0);
  });

  it("decays to 0 on a mixed result, and one flawless lesson lifts -1 to 0", () => {
    expect(paceFor([clear(A, true), clear(B, true), clear(C, false, 3)], "u5")).toBe(0);
    expect(paceFor([clear(A, false, 0), clear(B, true)], "u5")).toBe(0);
  });

  it("lets a tap win over the clear it rates", () => {
    expect(paceFor([clear(A, true), clear(B, true), rated(B, "too_hard")], "u5")).toBe(-1);
    expect(paceFor([clear(A, false, 0), rated(A, "too_easy")], "u5")).toBe(1);
    expect(paceFor([clear(A, true), clear(B, true), rated(B, "about_right")], "u5")).toBe(0);
  });

  it("reads a trainer lesson from its tap alone", () => {
    expect(paceFor([clear(MECH, true), clear(MECH, true)], "u5")).toBe(0);
    expect(paceFor([clear(MECH, false, 0)], "u5")).toBe(0);
    expect(paceFor([clear(MECH, true), rated(MECH, "too_easy")], "u5")).toBe(1);
  });

  it("reads only its own unit, in time order", () => {
    expect(paceFor([clear("u3-arenium", true), clear("u3-directing", true)], "u5")).toBe(0);
    const later = clear(B, true);
    const earlier = { ...clear(A, false, 0), at: "2026-09-01T00:00:00.000Z" };
    // Appended out of order: the rough lesson happened first, so two clears read as rough then flawless.
    expect(paceFor([later, earlier], "u5")).toBe(0);
  });

  it("finds the unit for a node, its checkpoint included", () => {
    expect(unitIdForNode(A)).toBe("u5");
    expect(unitIdForNode("u5-check")).toBe("u5");
    expect(unitIdForNode("nowhere")).toBeNull();
    expect(paceForNode([clear(A, true), clear(B, true)], C)).toBe(1);
  });
});

describe("the lesson_rated event", () => {
  it("survives a JSON round trip through the validator", () => {
    const event = rated(A, "too_easy");
    expect(isEconomyEvent(JSON.parse(JSON.stringify(event)))).toBe(true);
  });

  it("refuses a rating it does not know and a missing node", () => {
    expect(isEconomyEvent({ ...rated(A, "too_easy"), rating: "meh" })).toBe(false);
    expect(isEconomyEvent({ ...rated(A, "too_easy"), nodeId: "" })).toBe(false);
  });

  it("accepts a clear's first-try count only within its questions", () => {
    expect(isEconomyEvent(clear(A, false, 2, 4))).toBe(true);
    expect(isEconomyEvent(clear(A, false))).toBe(true);
    expect(isEconomyEvent(clear(A, false, 5, 4))).toBe(false);
    expect(isEconomyEvent(clear(A, false, -1, 4))).toBe(false);
  });
});

/** The recognise step's questions as the runner will play them, for one pace. */
function recognised(node: string, pace: -1 | 0 | 1) {
  const step = planLesson(node, { pace })?.steps.find((one) => one.beat.kind === "mcq");
  if (step === undefined || step.beat.kind !== "mcq") return [];
  return lessonRecogniseBeats(node, step.beat.pace);
}

describe("planLesson with a pace", () => {
  it("plays a node's L2 questions in the authored lesson, after its L1", () => {
    const ids = recognised("u5-roh-rx", 0).map((beat) => beat.id);
    for (const id of ["u5-rx-shift", "u5-rx-noshift", "u5-rx-which-shifts"]) expect(ids).toContain(id);
    const levels = recognised("u5-roh-rx", 0).map((beat) => declaredLevel(beat.levels));
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it("u5-roh-rx at +1: no meet step, L2 first, then at most two L1", () => {
    const plan = planLesson("u5-roh-rx", { pace: 1 });
    expect(plan?.steps.some((step) => step.beat.kind === "meet")).toBe(false);
    const beats = recognised("u5-roh-rx", 1);
    const ids = beats.map((beat) => beat.id);
    for (const id of ["u5-rx-shift", "u5-rx-noshift", "u5-rx-which-shifts"]) expect(ids).toContain(id);
    expect(declaredLevel(beats[0]!.levels)).toBeGreaterThanOrEqual(2);
    expect(beats.filter((beat) => declaredLevel(beat.levels) <= 1).length).toBeLessThanOrEqual(2);
  });

  it("u5-roh-rx at -1: the meet step kept, L1 only", () => {
    const plan = planLesson("u5-roh-rx", { pace: -1 });
    expect(plan?.steps[0]?.beat.kind).toBe("meet");
    const beats = recognised("u5-roh-rx", -1);
    expect(beats.length).toBeGreaterThan(0);
    expect(beats.every((beat) => declaredLevel(beat.levels) === 1)).toBe(true);
  });

  // CHANGED 2026-10-24: this used u9-aldol, picked because Unit 9 had no L2 at all. The audit's section 6
  // gave every Unit 9 spine node two L2 items, so the fallback is now shown on u9-haloform, a side quest with
  // L1 questions and no L2. The assertions are the same.
  it("u9-haloform at +1 falls back to L1 and is not empty", () => {
    expect(hasHardRecognise("u9-haloform")).toBe(false);
    const beats = recognised("u9-haloform", 1);
    expect(beats.length).toBeGreaterThan(0);
    expect(beats.map((beat) => beat.id)).toEqual(recognised("u9-haloform", 0).map((beat) => beat.id));
    expect(planLesson("u9-haloform", { pace: 1 })).toEqual(planLesson("u9-haloform"));
  });

  it("never empties a recognise step the authored lesson has, at any pace", () => {
    for (const unit of PATHWAY_UNITS) {
      for (const node of unit.nodes) {
        const authored = recognised(node.id, 0).length;
        for (const pace of [-1, 1] as const) {
          if (authored > 0) expect(recognised(node.id, pace).length, `${node.id} at ${pace}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("reports how many lessons cannot play +1 (fewer than two L2), never padded", () => {
    let withQuestions = 0;
    let short = 0;
    for (const unit of PATHWAY_UNITS) {
      for (const node of unit.nodes) {
        if (recognised(node.id, 0).length === 0) continue;
        withQuestions += 1;
        if (!hasHardRecognise(node.id)) short += 1;
      }
    }
    console.log(`pace coverage: ${short} of ${withQuestions} lessons with quick questions have fewer than two L2 and play +1 as 0`);
    expect(short).toBeLessThanOrEqual(withQuestions);
  });

  it("offers a section test as Skip ahead for a lesson on a tested section", () => {
    expect(skipAheadTestId("u5-oxidation")).toMatch(/^u5-s\d+-test$/);
    expect(skipAheadTestId("nowhere")).toBeNull();
  });
});

describe("a declared MCQ session", () => {
  it("grades each question at its own rung", () => {
    const beats = recognised("u5-roh-rx", 0);
    let session = startMcqSession(beats, "declared");
    expect(session.beats.length).toBe(beats.length);
    for (const beat of beats) {
      expect(levelNow(session)).toBe(declaredLevel(beat.levels));
      const committed = commitPick(selectOption(session, beat.correctOptionId), { at: at(), elapsedMs: 1000 });
      expect(committed?.reveal.result.level).toBe(declaredLevel(beat.levels));
      session = advance(committed!.session);
    }
  });
});
