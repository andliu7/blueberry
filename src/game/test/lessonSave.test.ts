/**
 * Save as you go: a lesson left mid-way reopens where it was left.
 *
 * WHY THIS FILE EXISTS. The owner reported "progress doesn't seem to save as
 * you go". Cleared lessons were banked correctly, but nothing was written
 * mid-lesson, so a reload or the X restarted the lesson at question one.
 * resume/lessonSave.ts is the fix; this suite holds its rules in node with a
 * Map standing in for localStorage:
 *   - a position written after three answers comes back as the same step,
 *     the same counters and the same three answers, and the restored MCQ
 *     session opens on question four with the same bar fill;
 *   - a save for a different version of the lesson is dropped, not guessed at;
 *   - the ending clears the bookmark, and a Challenge never writes one;
 *   - a practice run comes back whole, and only for the same pool.
 */

import { describe, expect, it } from "vitest";

import { currentStep, lessonMcqBeats, planLesson, reportStep, startRun, type LessonPlan } from "../beats/template";
import { advance, commitPick, selectOption, sessionProgress, startMcqSession, type McqSession } from "../beats/mcq/session";
import { answerProblem, startPracticeRun } from "../beats/practice/run";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import {
  answeredSoFar,
  clearSave,
  hasSavedLesson,
  loadLesson,
  loadPractice,
  nodeOfHref,
  planShape,
  resumeMcqSession,
  resumePool,
  saveKey,
  saveLesson,
  savePractice,
  savedCount,
  type SaveStorage,
} from "../resume/lessonSave";

function memoryStorage(): SaveStorage & { readonly map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

/** Answer the question on screen with its first option and press Continue, like a student would. */
function answerOne(session: McqSession): McqSession {
  const beat = session.beats[session.index]!;
  const picked = selectOption(session, beat.options[0]!.id);
  const committed = commitPick(picked, { at: "2026-10-17T12:00:00.000Z", elapsedMs: 1000 });
  expect(committed).not.toBeNull();
  return advance(committed!.session);
}

/** The first pathway node whose plan has an MCQ step with at least four questions. */
function lessonWithFourQuestions(): { node: string; plan: LessonPlan; stepIndex: number; beats: ReturnType<typeof lessonMcqBeats> } {
  for (const node of PATHWAY_UNITS.flatMap((unit) => unit.nodes.map((n) => n.id))) {
    const plan = planLesson(node);
    if (plan === null) continue;
    const stepIndex = plan.steps.findIndex((step) => step.beat.kind === "mcq");
    if (stepIndex < 0) continue;
    const beats = lessonMcqBeats(node);
    if (startMcqSession(beats, 1).beats.length >= 4) return { node, plan, stepIndex, beats };
  }
  throw new Error("no Unit 1 lesson with four MCQs to test against");
}

describe("a lesson saves after every answer and resumes at the next question", () => {
  const { node, plan, stepIndex, beats } = lessonWithFourQuestions();

  // Walk the run to the MCQ step the way the runner does: earlier steps
  // reported as played (a meet step reports 0 of 0).
  let run = startRun(plan);
  for (let i = 0; i < stepIndex; i += 1) {
    const kind = currentStep(run)!.beat.kind;
    run = reportStep(run, kind === "meet" ? { cleared: 0, total: 0 } : { cleared: 1, total: 1 });
  }

  it("is on the MCQ step", () => {
    expect(currentStep(run)?.beat.kind).toBe("mcq");
  });

  it("writes the position after three answers and reads it back on the same step", () => {
    const storage = memoryStorage();
    let session = startMcqSession(beats, 1);
    for (let i = 0; i < 3; i += 1) session = answerOne(session);
    const fraction = sessionProgress(session).clearedFraction;
    saveLesson(storage, node, run, { results: session.results, fraction }, undefined);

    const back = loadLesson(storage, node, plan, "practice");
    expect(back).not.toBeNull();
    expect(back!.run.phase).toBe(run.phase);
    expect(back!.run.index).toBe(run.index);
    expect(back!.run.clearedBeats).toBe(run.clearedBeats);
    expect(back!.run.totalBeats).toBe(run.totalBeats);
    expect(back!.run.missedMcqIds).toEqual(run.missedMcqIds);
    expect(back!.mcq?.results.map((r) => r.beatId)).toEqual(session.results.map((r) => r.beatId));
    expect(back!.mcq?.fraction).toBe(fraction);
    expect(answeredSoFar(back!.run, back!.mcq)).toBe(run.totalBeats + 3);

    // The restored session opens on question four with the same answers, so the bar reads the same.
    const resumed = resumeMcqSession(startMcqSession(beats, 1), back!.mcq);
    expect(resumed.index).toBe(3);
    expect(resumed.beats[resumed.index]?.id).toBe(session.beats[3]?.id);
    expect(sessionProgress(resumed)).toEqual(sessionProgress(session));
  });

  it("offers nothing when no question has been answered", () => {
    const storage = memoryStorage();
    saveLesson(storage, node, startRun(plan), null, undefined);
    expect(loadLesson(storage, node, plan, "practice")).toBeNull();
  });

  it("drops a save made for a different version of the lesson", () => {
    const storage = memoryStorage();
    let session = startMcqSession(beats, 1);
    session = answerOne(session);
    saveLesson(storage, node, run, { results: session.results }, undefined);
    const changed: LessonPlan = { ...plan, steps: plan.steps.slice(0, -1) };
    if (planShape(changed) !== planShape(plan)) {
      expect(loadLesson(storage, node, changed, "practice")).toBeNull();
    }
    // Answers that no longer line up with the step's questions restart the step at question one.
    const other = { results: session.results.map((r) => ({ ...r, beatId: "not-this-question" })) };
    expect(resumeMcqSession(startMcqSession(beats, 1), other).index).toBe(0);
  });

  it("replays the last question rather than opening on a finished step", () => {
    let session = startMcqSession(beats, 1);
    while (session.index < session.beats.length) session = answerOne(session);
    const resumed = resumeMcqSession(startMcqSession(beats, 1), { results: session.results });
    expect(resumed.index).toBe(session.beats.length - 1);
  });

  it("clears the bookmark at the ending, and a Challenge never writes or erases one", () => {
    const storage = memoryStorage();
    let session = startMcqSession(beats, 1);
    session = answerOne(session);
    saveLesson(storage, node, run, { results: session.results }, undefined);
    expect(storage.map.has(saveKey(node))).toBe(true);

    saveLesson(storage, node, startRun(plan, "challenge"), null, undefined);
    expect(storage.map.has(saveKey(node))).toBe(true);
    expect(loadLesson(storage, node, plan, "challenge")).toBeNull();

    saveLesson(storage, node, { ...run, phase: "reward" }, null, undefined);
    expect(storage.map.has(saveKey(node))).toBe(false);
  });

  it("keeps the count of every question answered, including first-meeting ones the run does not score", () => {
    const storage = memoryStorage();
    let session = startMcqSession(beats, 1);
    session = answerOne(session);
    saveLesson(storage, node, run, { results: session.results }, undefined, 3);
    expect(loadLesson(storage, node, plan, "practice")?.answered).toBe(3);
  });

  it("keeps the priming guess so the end-of-lesson recap still has it", () => {
    const storage = memoryStorage();
    let session = startMcqSession(beats, 1);
    session = answerOne(session);
    saveLesson(storage, node, run, { results: session.results }, "opt-b");
    expect(loadLesson(storage, node, plan, "practice")?.primedGuess).toBe("opt-b");
  });

  it("tells the pathway a lesson link has a bookmark, so START skips a second charge", () => {
    const storage = memoryStorage();
    expect(hasSavedLesson(storage, `#/app/lesson/${node}`)).toBe(false);
    let session = startMcqSession(beats, 1);
    session = answerOne(session);
    saveLesson(storage, node, run, { results: session.results }, undefined);
    expect(hasSavedLesson(storage, `#/app/lesson/${node}`)).toBe(true);
    expect(hasSavedLesson(storage, "#/app/train")).toBe(false);
  });

  it("survives blocked storage", () => {
    const broken: SaveStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => saveLesson(broken, node, run, null, undefined)).not.toThrow();
    expect(loadLesson(broken, node, plan, "practice")).toBeNull();
    expect(() => clearSave(broken, node)).not.toThrow();
    expect(loadLesson(null, node, plan, "practice")).toBeNull();
  });
});

describe("a practice run saves as it goes", () => {
  const ids = ["p1", "p2", "p3", "p4", "p5", "p6"];

  it("comes back whole after three answers, for the same pool only", () => {
    const storage = memoryStorage();
    let state = startPracticeRun(ids);
    state = answerProblem(state, true);
    state = answerProblem(state, false);
    state = answerProblem(state, true);
    savePractice(storage, "u1-practice", ids, state);
    expect(loadPractice(storage, "u1-practice", ids, false)).toEqual(state);
    expect(loadPractice(storage, "u1-practice", [...ids, "p7"], false)).toBeNull();
    expect(loadPractice(storage, "u1-practice", ids, true)).toBeNull();
  });

  it("clears once the run has finished", () => {
    const storage = memoryStorage();
    let state = answerProblem(startPracticeRun(ids), true);
    savePractice(storage, "u1-practice", ids, state);
    state = { ...state, finished: true };
    savePractice(storage, "u1-practice", ids, state);
    expect(loadPractice(storage, "u1-practice", ids, false)).toBeNull();
  });
});

describe("a pool-items step (drawings, ladders, boards) saves item by item", () => {
  const ids = ["d1", "d2", "d3", "d4", "d5"];

  it("picks up on the item after the last one finished, with its tally", () => {
    expect(resumePool(ids, { step: "content:1:items", done: ["d1", "d2", "d3"], cleared: 2, missed: ["d2"] })).toEqual({
      index: 3,
      cleared: 2,
      missed: ["d2"],
    });
  });

  it("starts the step over when the items changed underneath the save, or it is empty or complete", () => {
    expect(resumePool(ids, { step: "s", done: ["d1", "dX"], cleared: 1, missed: [] })).toBeNull();
    expect(resumePool(ids, { step: "s", done: [], cleared: 0, missed: [] })).toBeNull();
    expect(resumePool(ids, { step: "s", done: ids, cleared: 5, missed: [] })).toBeNull();
    expect(resumePool(ids, null)).toBeNull();
  });

  it("round-trips the open step through saveLesson and loadLesson", () => {
    const storage = memoryStorage();
    const node = PATHWAY_UNITS[0]!.nodes.map((n) => n.id).find((id) => planLesson(id) !== null)!;
    const plan = planLesson(node)!;
    const run = startRun(plan);
    const pool = { step: "content:0:items", done: ["d1", "d2"], cleared: 1, missed: ["d2"] };
    saveLesson(storage, node, run, null, undefined, 2, { pool, drawsDone: null, recycleDraws: null });
    const back = loadLesson(storage, node, plan, "practice");
    expect(back?.answered).toBe(2);
    expect(back?.open.pool).toEqual(pool);
    expect(savedCount(storage, node)).toBe(2);
  });

  it("counts a practice bookmark too, and nothing for a node without one", () => {
    const storage = memoryStorage();
    savePractice(storage, "u1-practice", ids, answerProblem(answerProblem(startPracticeRun(ids), true), true));
    expect(savedCount(storage, "u1-practice")).toBe(2);
    expect(savedCount(storage, "u1-none")).toBeNull();
    expect(nodeOfHref("#/app/lesson/u1-practice")).toBe("u1-practice");
  });
});
