/**
 * The pilot gameplay screen's state machine, pinned.
 *
 * Everything here is pure: screenModel.ts holds the five-piece machine
 * (records, replay scrubbing, undo sync, redraw, the exactly-once win) with
 * no DOM and no clock, and the verdicts driving it come from the REAL grader
 * over the real SN2 step wherever the test is about grading at all, so the
 * pins hold against the engine and not against a hand-mocked verdict.
 */

import { describe, expect, it } from "vitest";
import { createArrow, fromLonePair, toBondBetween, type ElectronFlowArrow } from "@blueberry/chem-core";
import { SN2_DEMO_STEP } from "../demo/sn2Step";
import { gradeDrawing, type DrawVerdict } from "../tabs/trainer/grade";
import {
  availableControls,
  checkGraded,
  createScreenState,
  progressFraction,
  redraw,
  replayArrows,
  replayFrame,
  setScrub,
  syncAfterUndo,
  toggleReplay,
  type PilotScreenState,
  type RecordedStep,
} from "../pilot/screen/screenModel";

const step = SN2_DEMO_STEP;
const attack = step.arrows[0] as ElectronFlowArrow;
const leave = step.arrows[1] as ElectronFlowArrow;

/** A legal push the step does not ask for: bromine feeding its own C-Br bond. */
const legalButWrong = createArrow({
  id: "t-wrong",
  source: fromLonePair("br1"),
  sink: toBondBetween("br1", "c1"),
});

/** An impossible push: carbon has no lone pair to give. */
const impossible = createArrow({
  id: "t-impossible",
  source: fromLonePair("c1"),
  sink: toBondBetween("c1", "o1"),
});

const incompleteVerdict = (drawn: number, needed: number): DrawVerdict => ({ kind: "incomplete", drawn, needed });

const fakeArrow = (id: string): ElectronFlowArrow =>
  createArrow({ id, source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") });

describe("recording graded steps", () => {
  it("a standing (incomplete) check records one step with its new arrows", () => {
    const verdict = gradeDrawing(step, [attack]);
    expect(verdict.kind).toBe("incomplete");
    const { state, justWon } = checkGraded(createScreenState(), [attack], verdict);
    expect(justWon).toBe(false);
    expect(state.phase).toBe("drawing");
    expect(state.recorded).toHaveLength(1);
    expect(state.recorded[0]?.verdictKind).toBe("incomplete");
    expect(state.recorded[0]?.arrows.map((a) => a.id)).toEqual([attack.id]);
    expect(state.recorded[0]?.newArrows.map((a) => a.id)).toEqual([attack.id]);
  });

  it("an invalid check records nothing", () => {
    const verdict = gradeDrawing(step, [impossible]);
    expect(verdict.kind).toBe("invalid");
    const { state, justWon } = checkGraded(createScreenState(), [impossible], verdict);
    expect(justWon).toBe(false);
    expect(state.recorded).toHaveLength(0);
  });

  it("a legal-but-not-requested check records nothing", () => {
    const verdict = gradeDrawing(step, [legalButWrong]);
    expect(verdict.kind).toBe("not_requested");
    const { state } = checkGraded(createScreenState(), [legalButWrong], verdict);
    expect(state.recorded).toHaveLength(0);
  });

  it("re-checking an unchanged drawing records nothing new", () => {
    const first = checkGraded(createScreenState(), [attack], incompleteVerdict(1, 2)).state;
    const second = checkGraded(first, [attack], incompleteVerdict(1, 2)).state;
    expect(second.recorded).toHaveLength(1);
  });

  it("a later record carries only the arrows added since the previous one", () => {
    const first = checkGraded(createScreenState(), [attack], incompleteVerdict(1, 2)).state;
    const verdict = gradeDrawing(step, [attack, leave]);
    expect(verdict.kind).toBe("correct");
    const second = checkGraded(first, [attack, leave], verdict).state;
    expect(second.recorded).toHaveLength(2);
    expect(second.recorded[1]?.newArrows.map((a) => a.id)).toEqual([leave.id]);
  });
});

describe("the win", () => {
  it("fires exactly once when grading returns correct, and never again", () => {
    const drawn = [attack, leave];
    const verdict = gradeDrawing(step, drawn);
    expect(verdict.kind).toBe("correct");

    const first = checkGraded(createScreenState(), drawn, verdict);
    expect(first.justWon).toBe(true);
    expect(first.state.phase).toBe("won");
    expect(first.state.replayOpen).toBe(false);
    expect(first.state.scrub).toBe(first.state.recorded.length);

    // The same grading arriving again, or any further commit noise, cannot
    // re-trigger the completion: the state is returned untouched.
    const again = checkGraded(first.state, drawn, verdict);
    expect(again.justWon).toBe(false);
    expect(again.state).toBe(first.state);

    const noise = checkGraded(first.state, [attack], incompleteVerdict(1, 2));
    expect(noise.justWon).toBe(false);
    expect(noise.state).toBe(first.state);
  });

  it("records the winning drawing as the last recorded step", () => {
    const drawn = [attack, leave];
    const { state } = checkGraded(createScreenState(), drawn, gradeDrawing(step, drawn));
    const last = state.recorded[state.recorded.length - 1];
    expect(last?.verdictKind).toBe("correct");
    expect(last?.arrows.map((a) => a.id)).toEqual([attack.id, leave.id]);
  });
});

describe("undo unwinding the record", () => {
  /** Two standing steps, one arrow each, phases still drawing. */
  function twoSteps(): { state: PilotScreenState; a1: ElectronFlowArrow; a2: ElectronFlowArrow } {
    const a1 = fakeArrow("t-a1");
    const a2 = fakeArrow("t-a2");
    let state = checkGraded(createScreenState(), [a1], incompleteVerdict(1, 3)).state;
    state = checkGraded(state, [a1, a2], incompleteVerdict(2, 3)).state;
    expect(state.recorded).toHaveLength(2);
    return { state, a1, a2 };
  }

  it("undo after N steps leaves N-1 recorded steps and the canvas state of step N-1", () => {
    const { state, a1 } = twoSteps();
    const after = syncAfterUndo(state, [a1]);
    expect(after.recorded).toHaveLength(1);
    expect(after.recorded[0]?.arrows.map((a) => a.id)).toEqual([a1.id]);
  });

  it("clamps an open replay's scrub and closes it when nothing remains", () => {
    const { state, a1 } = twoSteps();
    const open = toggleReplay(state);
    expect(open.scrub).toBe(2);
    const afterOne = syncAfterUndo(open, [a1]);
    expect(afterOne.replayOpen).toBe(true);
    expect(afterOne.scrub).toBe(1);
    const afterAll = syncAfterUndo(afterOne, []);
    expect(afterAll.recorded).toHaveLength(0);
    expect(afterAll.replayOpen).toBe(false);
    expect(afterAll.scrub).toBe(0);
  });

  it("drops a record that is no longer a prefix of the drawing", () => {
    const a1 = fakeArrow("t-a1");
    const other = fakeArrow("t-other");
    const state = checkGraded(createScreenState(), [a1], incompleteVerdict(1, 2)).state;
    const after = syncAfterUndo(state, [other]);
    expect(after.recorded).toHaveLength(0);
  });

  it("is a no-op with nothing recorded, and never rewrites a won stage", () => {
    const empty = createScreenState();
    expect(syncAfterUndo(empty, [])).toBe(empty);

    const drawn = [attack, leave];
    const won = checkGraded(createScreenState(), drawn, gradeDrawing(step, drawn)).state;
    expect(syncAfterUndo(won, [])).toBe(won);
  });
});

describe("replay scrubbing", () => {
  it("refuses to open over an empty history and opens at the end otherwise", () => {
    const empty = createScreenState();
    expect(toggleReplay(empty)).toBe(empty);
    const one = checkGraded(empty, [fakeArrow("t-a1")], incompleteVerdict(1, 2)).state;
    const open = toggleReplay(one);
    expect(open.replayOpen).toBe(true);
    expect(open.scrub).toBe(1);
    expect(toggleReplay(open).replayOpen).toBe(false);
  });

  it("clamps the scrub into the recorded range and ignores it while closed", () => {
    const one = checkGraded(createScreenState(), [fakeArrow("t-a1")], incompleteVerdict(1, 2)).state;
    expect(setScrub(one, 0.5)).toBe(one);
    const open = toggleReplay(one);
    expect(setScrub(open, -3).scrub).toBe(0);
    expect(setScrub(open, 99).scrub).toBe(1);
    expect(setScrub(open, 0.4).scrub).toBeCloseTo(0.4);
  });

  it("walks step boundaries: integers settle, fractions animate the next step", () => {
    expect(replayFrame(2, 0)).toEqual({ settled: 0, active: null });
    expect(replayFrame(2, 1)).toEqual({ settled: 1, active: null });
    expect(replayFrame(2, 2)).toEqual({ settled: 2, active: null });
    const mid = replayFrame(2, 1.5);
    expect(mid.settled).toBe(1);
    expect(mid.active?.index).toBe(1);
    expect(mid.active?.t).toBeCloseTo(0.5);
    // Out of range positions clamp rather than invent steps.
    expect(replayFrame(2, 9).settled).toBe(2);
    expect(replayFrame(2, -1).settled).toBe(0);
  });

  it("gives each of a step's new arrows its own share of the fraction", () => {
    const a1 = fakeArrow("t-a1");
    const a2 = fakeArrow("t-a2");
    const a3 = fakeArrow("t-a3");
    const recorded: readonly RecordedStep[] = [
      { arrows: [a1], newArrows: [a1], verdictKind: "incomplete" },
      { arrows: [a1, a2, a3], newArrows: [a2, a3], verdictKind: "incomplete" },
    ];
    // Mid way through the second step's first half: a2 half drawn, a3 not started.
    const early = replayArrows(recorded, 1.25);
    expect(early.full.map((a) => a.id)).toEqual([a1.id]);
    expect(early.animating.map((e) => e.arrow.id)).toEqual([a2.id]);
    expect(early.animating[0]?.t).toBeCloseTo(0.5);
    // Into the second half: a2 complete, a3 half drawn.
    const late = replayArrows(recorded, 1.75);
    expect(late.animating.map((e) => e.arrow.id)).toEqual([a2.id, a3.id]);
    expect(late.animating[0]?.t).toBe(1);
    expect(late.animating[1]?.t).toBeCloseTo(0.5);
    // A boundary shows whole steps only.
    const settled = replayArrows(recorded, 2);
    expect(settled.full.map((a) => a.id)).toEqual([a1.id, a2.id, a3.id]);
    expect(settled.animating).toHaveLength(0);
  });
});

describe("draw it again", () => {
  it("resets the history and the phase, and cannot touch the problem it never held", () => {
    const drawn = [attack, leave];
    const won = checkGraded(createScreenState(), drawn, gradeDrawing(step, drawn)).state;
    const fresh = redraw(won);
    expect(fresh).toEqual(createScreenState());
    // The model carries no problem at all, which is the structural guarantee
    // that a redraw resets the draft and never the chemistry: there is no
    // field here a reset could lose.
    expect(Object.keys(fresh).sort()).toEqual(["phase", "recorded", "replayOpen", "scrub"]);
  });
});

describe("the chips a phase offers", () => {
  it("a won stage offers replay and continue only, and never redraw", () => {
    const drawn = [attack, leave];
    const won = checkGraded(createScreenState(), drawn, gradeDrawing(step, drawn)).state;
    expect(won.phase).toBe("won");
    // Re-adding a redraw chip to the won layout means putting "redraw" back
    // in this list, and this pin is what fails when someone does: one stray
    // press above CONTINUE must not be able to wipe a correct solve.
    expect(availableControls(won, true)).toEqual(["replay", "continue"]);
    expect(availableControls(won, false)).not.toContain("redraw");
  });

  it("while drawing, redraw appears once anything is drawn and leaves during a replay", () => {
    const empty = createScreenState();
    expect(availableControls(empty, false)).toEqual(["undo", "check"]);
    expect(availableControls(empty, true)).toEqual(["redraw", "undo", "check"]);
    const one = checkGraded(empty, [fakeArrow("t-a1")], incompleteVerdict(1, 2)).state;
    expect(availableControls(one, false)).toEqual(["replay", "redraw", "undo", "check"]);
    const open = toggleReplay(one);
    expect(availableControls(open, false)).toEqual(["replay", "undo", "check"]);
  });
});

describe("the progress strip", () => {
  it("tracks drawn over needed and fills on the win", () => {
    const drawing = createScreenState();
    expect(progressFraction(drawing, 0, 2)).toBe(0);
    expect(progressFraction(drawing, 1, 2)).toBe(0.5);
    expect(progressFraction(drawing, 5, 2)).toBe(1);
    expect(progressFraction(drawing, 1, 0)).toBe(0);
    const drawn = [attack, leave];
    const won = checkGraded(createScreenState(), drawn, gradeDrawing(step, drawn)).state;
    expect(progressFraction(won, 0, 2)).toBe(1);
  });
});
