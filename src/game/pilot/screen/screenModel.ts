/**
 * The pilot gameplay screen's state machine, held apart from React so the
 * suite can hold it without a DOM.
 *
 * FIVE PIECES, ONE MACHINE. The screen's shell, undo, replay scrubbing,
 * draw-it-again and completion are not five features, they are five doors
 * into one state: what has the student done, and where are they looking at
 * it from. This file is that state. The React components read it and render;
 * nothing in here imports React, the DOM, or a clock.
 *
 * WHAT A "RECORDED STEP" IS, because the scrubber's whole contract hangs on
 * it. A recorded step is one press of CHECK whose drawing stood: the grader
 * said `incomplete` (legal so far, keep going) or `correct` (the stage is
 * done). A check whose drawing was `invalid` or `not_requested` records
 * nothing, because the scrubber replays the student's own standing history,
 * and a push they are about to take back is not history yet, it is the
 * present. When they do take it back, `syncAfterUndo` is how the record
 * stays true.
 *
 * WHY GRADING HAPPENS AT CHECK AND NOT PER COMMITTED PUSH. The live trainer
 * grades every push the moment it lands, and that ruling stands THERE: that
 * surface has no Check button, so immediacy is the only honest feedback
 * channel it has. This screen's shell is locked by the design reference
 * (blueberry_r9-lesson-mechanism), which draws UNDO and CHECK as the two
 * equal primary chips, and a Check chip that grades nothing is a lie in the
 * control row. Check grading is also what makes a drawn arrow a state of its
 * own rather than an instant verdict, which is what the undo / replay /
 * redraw loop needs to be worth having.
 *
 * THE WIN FIRES EXACTLY ONCE. `checkGraded` reports `justWon: true` only on
 * the transition into the `won` phase, and once the phase is `won` every
 * further commit is ignored at the top of the function, so no amount of
 * pointer noise, double-fired events, or repeated grading can re-trigger it.
 * pilotScreen.test.ts pins this.
 *
 * INVARIANT the sync function keeps: every recorded step's arrow list is a
 * PREFIX of the live drawing's arrow list. The interaction machine only ever
 * appends an arrow (a commit) or pops the last one (undo, or a cancelled
 * press being rolled back), so the invariant holds as long as the shell
 * calls `syncAfterUndo` whenever the arrow count falls. A record that is no
 * longer a prefix is a photograph of a drawing that no longer exists, and it
 * is dropped rather than replayed.
 */

import type { ElectronFlowArrow } from "@blueberry/chem-core";
import type { DrawVerdict } from "../../tabs/trainer/grade";

export type PilotPhase = "drawing" | "won";

/** The verdict kinds that stand and therefore record. See the header. */
export type RecordedVerdictKind = "incomplete" | "correct";

export interface RecordedStep {
  /** The whole drawing at the moment this check graded. A prefix of the live drawing. */
  readonly arrows: readonly ElectronFlowArrow[];
  /** The arrows this step added over the previous record. What the scrubber animates. */
  readonly newArrows: readonly ElectronFlowArrow[];
  readonly verdictKind: RecordedVerdictKind;
}

export interface PilotScreenState {
  readonly phase: PilotPhase;
  /** Oldest first. Every entry's arrows are a prefix of the next entry's. */
  readonly recorded: readonly RecordedStep[];
  readonly replayOpen: boolean;
  /**
   * Position along the recorded history, in [0, recorded.length]. Whole
   * numbers are step boundaries; the fraction animates the next step in.
   * Meaningful only while replayOpen.
   */
  readonly scrub: number;
}

export function createScreenState(): PilotScreenState {
  return { phase: "drawing", recorded: [], replayOpen: false, scrub: 0 };
}

export interface CheckOutcome {
  readonly state: PilotScreenState;
  /** True exactly once per completion: on the drawing to won transition. */
  readonly justWon: boolean;
}

function sameArrowIds(a: readonly ElectronFlowArrow[], b: readonly ElectronFlowArrow[]): boolean {
  return a.length === b.length && a.every((arrow, i) => arrow.id === b[i]?.id);
}

/**
 * One press of CHECK, graded. The verdict comes from gradeDrawing and is not
 * re-derived here; this function only decides what it does to the screen.
 *
 * A repeated check of an unchanged drawing records nothing: the history is a
 * history of drawings, not of button presses.
 */
export function checkGraded(
  state: PilotScreenState,
  arrows: readonly ElectronFlowArrow[],
  verdict: DrawVerdict,
): CheckOutcome {
  if (state.phase === "won") return { state, justWon: false };
  if (verdict.kind === "invalid" || verdict.kind === "not_requested") {
    return { state, justWon: false };
  }

  const last = state.recorded[state.recorded.length - 1];
  const changed = last === undefined || !sameArrowIds(last.arrows, arrows);
  const previousCount = last === undefined ? 0 : last.arrows.length;
  const recorded = changed
    ? [
        ...state.recorded,
        {
          arrows: [...arrows],
          newArrows: arrows.slice(previousCount),
          verdictKind: verdict.kind,
        },
      ]
    : state.recorded;

  if (verdict.kind === "correct") {
    return {
      state: { phase: "won", recorded, replayOpen: false, scrub: recorded.length },
      justWon: true,
    };
  }
  return { state: { ...state, recorded }, justWon: false };
}

/**
 * Keep the record true after the drawing shrank: an UNDO press, or the
 * machine rolling back a cancelled press. Every record that is still a
 * prefix of the live drawing survives; the first that is not, and everything
 * after it, is dropped. Closing an emptied replay is part of the same job,
 * because a scrubber over zero steps is a control that does nothing.
 *
 * The won phase is left alone on purpose: the undo control is gone from the
 * screen once the stage completes, so a shrink reaching here in that phase
 * would be a bug upstream, and quietly rewriting a finished stage's history
 * would hide it.
 */
export function syncAfterUndo(
  state: PilotScreenState,
  arrows: readonly ElectronFlowArrow[],
): PilotScreenState {
  if (state.phase === "won") return state;
  const kept: RecordedStep[] = [];
  for (const record of state.recorded) {
    if (record.arrows.length > arrows.length) break;
    const isPrefix = record.arrows.every((arrow, i) => arrow.id === arrows[i]?.id);
    if (!isPrefix) break;
    kept.push(record);
  }
  if (kept.length === state.recorded.length) return state;
  const replayOpen = state.replayOpen && kept.length > 0;
  return {
    ...state,
    recorded: kept,
    replayOpen,
    scrub: Math.min(state.scrub, kept.length),
  };
}

/**
 * Open or close the replay. Opening lands the scrubber at the END of the
 * history, so the first thing on screen matches the drawing the student just
 * left and every motion of the slider is visibly a step back or forward from
 * there. Refuses to open over an empty history.
 */
export function toggleReplay(state: PilotScreenState): PilotScreenState {
  if (state.replayOpen) return { ...state, replayOpen: false };
  if (state.recorded.length === 0) return state;
  return { ...state, replayOpen: true, scrub: state.recorded.length };
}

/** Clamped into [0, recorded.length]; ignored while the replay is closed. */
export function setScrub(state: PilotScreenState, value: number): PilotScreenState {
  if (!state.replayOpen) return state;
  const max = state.recorded.length;
  const clamped = Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0;
  if (clamped === state.scrub) return state;
  return { ...state, scrub: clamped };
}

/**
 * Draw it again: the history and the phase reset, THE PROBLEM DOES NOT.
 * This model never holds the problem, which is what makes that guarantee
 * structural rather than disciplined: there is nothing here a reset could
 * lose. The shell pairs this with a fresh interaction document over the same
 * unchanged step.
 */
export function redraw(_state: PilotScreenState): PilotScreenState {
  return createScreenState();
}

export type PilotControl = "undo" | "check" | "replay" | "redraw" | "continue";

/**
 * The chips the shell may render, in row order, derived here so the chip set
 * per phase is this machine's ruling rather than a JSX conditional. The won
 * row is REPLAY and CONTINUE only, never REDRAW: a redraw chip one press
 * above CONTINUE lets a single stray tap wipe a correct solve, its recorded
 * history and the win treatment with no confirmation, and this file's own
 * rule (see syncAfterUndo) is that a finished stage's history is never
 * quietly rewritten. pilotScreen.test.ts pins the exclusion.
 *
 * `anythingDrawn` is the shell's knowledge, not this model's: whether the
 * live drawing holds arrows the record has not seen yet.
 */
export function availableControls(state: PilotScreenState, anythingDrawn: boolean): readonly PilotControl[] {
  if (state.phase === "won") {
    return state.recorded.length > 0 ? ["replay", "continue"] : ["continue"];
  }
  const chips: PilotControl[] = [];
  if (state.recorded.length > 0) chips.push("replay");
  if (!state.replayOpen && (anythingDrawn || state.recorded.length > 0)) chips.push("redraw");
  chips.push("undo", "check");
  return chips;
}

/** The thin strip at the top: drawn pushes over needed, and full on the win. */
export function progressFraction(state: PilotScreenState, drawnNow: number, needed: number): number {
  if (state.phase === "won") return 1;
  if (needed <= 0) return 0;
  return Math.min(1, Math.max(0, drawnNow / needed));
}

/* ------------------------------------------------------------------ */
/* What the scrubber shows at a position.                              */
/* ------------------------------------------------------------------ */

export interface ReplayFrame {
  /** Records drawn in full at this position. */
  readonly settled: number;
  /** The record animating in, or null on an exact step boundary. */
  readonly active: { readonly index: number; readonly t: number } | null;
}

/**
 * Same shape as useStepProgress's single progress number, but over the WHOLE
 * recorded history: the integer part of the scrub is how many of the
 * student's own steps stand complete, and the fraction replays the next one.
 */
export function replayFrame(recordedCount: number, scrub: number): ReplayFrame {
  const clamped = Math.min(Math.max(0, recordedCount), Math.max(0, scrub));
  const settled = Math.floor(clamped);
  const t = clamped - settled;
  if (settled >= recordedCount || t <= 0) return { settled: Math.min(settled, recordedCount), active: null };
  return { settled, active: { index: settled, t } };
}

export interface ReplayArrows {
  /** Arrows drawn complete at this position. */
  readonly full: readonly ElectronFlowArrow[];
  /** The active record's new arrows, each with its own local progress in (0, 1]. */
  readonly animating: readonly { readonly arrow: ElectronFlowArrow; readonly t: number }[];
}

/**
 * The drawing at a scrub position. A record that added several arrows in one
 * check replays them in the order they were drawn: each new arrow gets an
 * equal share of the record's fraction, so arrow j of m animates over
 * t in (j/m, (j+1)/m].
 */
export function replayArrows(recorded: readonly RecordedStep[], scrub: number): ReplayArrows {
  const frame = replayFrame(recorded.length, scrub);
  const settledRecord = frame.settled > 0 ? recorded[frame.settled - 1] : undefined;
  const full = settledRecord === undefined ? [] : settledRecord.arrows;
  if (frame.active === null) return { full, animating: [] };
  const record = recorded[frame.active.index];
  if (record === undefined) return { full, animating: [] };
  const m = Math.max(1, record.newArrows.length);
  const t = frame.active.t;
  const animating = record.newArrows
    .map((arrow, j) => ({ arrow, t: Math.min(1, Math.max(0, (t - j / m) * m)) }))
    .filter((entry) => entry.t > 0);
  return { full, animating };
}
