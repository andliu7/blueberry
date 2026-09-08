/**
 * Playing a run of easy MCQ beats. Pure: no React, no storage, no clock.
 *
 * WHY THIS FILE EXISTS, and it is the whole point of the second attempt. A
 * harsh review found that a single tap on an option graded it, recorded an
 * `invalid` result and fired a mistake card toast, so a scroll-fling mis-tap
 * was an unrecoverable wrong answer. Both reference captures show the opposite
 * shape: in "fill in the blank.png" and in the how_to capture the student picks
 * something and then presses a full width CHECK, and CHECK is visibly inactive
 * until there is something to check. Picking and committing are two acts.
 *
 * So the two acts are two functions here rather than two branches inside a
 * click handler. `selectOption` never grades and never offers a card;
 * `commitPick` is the only door to grade.ts and the only door to card.ts.
 * That is a rule a test can hold, and holding it in JSX would mean holding it
 * nowhere, because the web suite runs in a node environment with no DOM.
 *
 * WHY A PLAIN VALUE AND NOT A REDUCER. Every function below takes a session and
 * returns a new session. No class, no useReducer dispatch table, no library.
 * A student debugging this at 1am can read one function and know the whole
 * transition, and a test can call it with a literal. React only holds the
 * latest value in a useState.
 *
 * WHY THE SESSION OWNS THE INDEX. The run over a node's beats is the thing the
 * top progress bar measures, and the reference bar fills across the whole
 * lesson rather than the current question. Keeping the index here means the
 * bar and the beat can never disagree, which they can when a parent counts
 * separately from a child.
 *
 * NOTHING HERE READS A CLOCK. `commitPick` takes the timestamp and the elapsed
 * milliseconds, the same reason grade.ts does: a test can ask about a fixed
 * moment, and the surface that owns the real clock is the one component above.
 */

import { mcqCardOffer, type McqCardOffer } from "./card";
import { gradeMcq, type McqReveal } from "./grade";
import { beatAllowedAt, type BeatResult, type MasteryLevel, type McqBeat } from "../types";

/**
 * One run over one node's beats.
 *
 * `selectedId` and `reveal` are the pick / commit split made data. Exactly one
 * of three states is reachable and the names say which: nothing picked
 * (`selectedId === null`), picked but not committed (`selectedId` set,
 * `reveal === null`), and committed (`reveal` set). `canCommit` and
 * `isRevealed` below are the two questions a screen asks about that.
 */
export interface McqSession {
  readonly beats: readonly McqBeat[];
  readonly level: MasteryLevel;
  /** Which beat is on screen. Equal to `beats.length` when the run is done. */
  readonly index: number;
  /** The option under the student's finger. Changeable until they commit. */
  readonly selectedId: string | null;
  /** The graded result for the beat on screen, or null before they commit. */
  readonly reveal: McqReveal | null;
  /** Every committed result, in order. What a progress source records. */
  readonly results: readonly BeatResult[];
  /** Beats the student flagged as wrong or confusing. See `mcqReportFor`. */
  readonly reported: readonly string[];
}

/**
 * Start a run.
 *
 * The beat list is filtered on `levels` and never on kind, which is the level
 * rule in ../types.ts: a beat authored as a first meeting stays a first meeting
 * even though its kind could carry more. A node with nothing at this rung
 * yields an empty run rather than a throw, because that is an authoring gap and
 * a screen should say so, not crash on it.
 */
export function startMcqSession(
  beats: readonly McqBeat[],
  level: MasteryLevel,
): McqSession {
  return {
    beats: beats.filter((beat) => beatAllowedAt(beat, level)),
    level,
    index: 0,
    selectedId: null,
    reveal: null,
    results: [],
    reported: [],
  };
}

/** The beat on screen, or null when the run is finished or empty. */
export function currentBeat(session: McqSession): McqBeat | null {
  return session.beats[session.index] ?? null;
}

export function isFinished(session: McqSession): boolean {
  return session.index >= session.beats.length;
}

/** True once the pick has been graded and the explanation is on screen. */
export function isRevealed(session: McqSession): boolean {
  return session.reveal !== null;
}

/**
 * Pick an option. This is the FIRST tap and it grades nothing.
 *
 * Changeable on purpose: a student can move their pick as many times as they
 * like before pressing the button, which is what makes a mis-tap survivable.
 * After a commit the pick is frozen, because the explanation on screen is about
 * the option they committed and quietly re-pointing it at another one would
 * make the screen lie.
 *
 * An id the beat does not carry is ignored rather than stored. A screen can
 * only render the options the beat has, so this is a defence against a stale
 * id surviving a beat swap, not a validation the student can trigger.
 */
export function selectOption(session: McqSession, optionId: string): McqSession {
  if (isRevealed(session)) return session;
  const beat = currentBeat(session);
  if (beat === null) return session;
  if (!beat.options.some((option) => option.id === optionId)) return session;
  return { ...session, selectedId: optionId };
}

/** Whether the commit button is live. Exactly the reference's CHECK rule. */
export function canCommit(session: McqSession): boolean {
  return !isRevealed(session) && session.selectedId !== null && currentBeat(session) !== null;
}

export interface McqCommit {
  readonly session: McqSession;
  readonly reveal: McqReveal;
  /**
   * The card and toast for a miss, or null. Produced HERE and only here, so a
   * pick that was never committed can never raise a card offer. That was the
   * exact defect the review found.
   */
  readonly offer: McqCardOffer | null;
}

export interface McqCommitInput {
  /** ISO 8601, supplied by the surface that owns the clock. */
  readonly at: string;
  readonly elapsedMs: number;
}

/**
 * Commit the pick. The ONLY call into grade.ts and card.ts in this beat.
 *
 * Returns null when there is nothing to commit, rather than grading a guess or
 * throwing. A screen should not be able to reach this with the button inactive,
 * and if it does, doing nothing is the behaviour that costs the student least.
 */
export function commitPick(session: McqSession, input: McqCommitInput): McqCommit | null {
  const beat = currentBeat(session);
  if (beat === null || session.selectedId === null || isRevealed(session)) return null;

  const reveal = gradeMcq({
    beat,
    level: session.level,
    chosenId: session.selectedId,
    elapsedMs: Math.max(0, input.elapsedMs),
    at: input.at,
  });

  return {
    session: { ...session, reveal, results: [...session.results, reveal.result] },
    reveal,
    offer: mcqCardOffer(beat, reveal, input.at),
  };
}

/**
 * Move to the next beat. The Continue press, and nothing else.
 *
 * Refuses to skip an ungraded beat: advancing without a commit would leave a
 * hole in `results` that the progress bar and the attempt history disagree
 * about. A screen that wants to leave uses its exit, not this.
 */
export function advance(session: McqSession): McqSession {
  if (!isRevealed(session)) return session;
  return { ...session, index: session.index + 1, selectedId: null, reveal: null };
}

/* ------------------------------------------------------------------ */
/* What the top bar shows                                              */
/* ------------------------------------------------------------------ */

export interface McqProgress {
  /** Beats committed so far. */
  readonly answered: number;
  readonly total: number;
  /** 0 to 1, for the bar's width. 1 on an empty run, so it never reads stuck. */
  readonly fraction: number;
  /** Committed results that cleared the beat. L0 misses count, per canFail. */
  readonly cleared: number;
  /**
   * 0 to 1 over the CLEARED beats rather than the answered ones, and this is
   * the one the recipe strip's green fill takes.
   *
   * The two numbers are different the moment a student gets one wrong, and
   * the previous build handed the strip `fraction`: after a miss the current
   * segment filled solid green while the panel underneath said "Not yet", so
   * the bar contradicted the screen it was sitting on. DESIGN-GOALS is that
   * "green says you moved" and the committed badge sheet reserves the green
   * fill for cleared beats, so a miss advances the position and not the
   * colour. 1 on an empty run for the same reason `fraction` is: an empty run
   * is finished, not stuck.
   */
  readonly clearedFraction: number;
}

export function sessionProgress(session: McqSession): McqProgress {
  const answered = session.results.length;
  const total = session.beats.length;
  const cleared = session.results.filter(
    (result) => result.kind === "correct" || result.kind === "correct_alternative_route",
  ).length;
  return {
    answered,
    total,
    fraction: total === 0 ? 1 : Math.min(1, answered / total),
    cleared,
    clearedFraction: total === 0 ? 1 : Math.min(1, cleared / total),
  };
}

/* ------------------------------------------------------------------ */
/* The flag                                                            */
/* ------------------------------------------------------------------ */

/**
 * What the flag in the top bar produces.
 *
 * The reference top bar carries an X, a progress bar and a flag on every single
 * question, and the flag is the student's escape hatch from an authored beat
 * that is wrong or unclear. This is deliberately a plain object and not a
 * network call: sending it is Phase 6's job, and a beat with no way to complain
 * about it is worse than a beat whose complaint is queued locally.
 *
 * It carries the pick, because "I flagged this while looking at option C" is
 * most of the diagnosis, and the level, because the same beat reads differently
 * at a first meeting and from memory.
 */
export interface McqReport {
  readonly beatId: string;
  readonly node: string;
  readonly level: MasteryLevel;
  readonly prompt: string;
  /** What was selected when they flagged it, committed or not. May be null. */
  readonly selectedId: string | null;
  /** Whether they had already committed and read the explanation. */
  readonly revealed: boolean;
  /** ISO 8601, supplied. */
  readonly at: string;
}

export function mcqReportFor(session: McqSession, at: string): McqReport | null {
  const beat = currentBeat(session);
  if (beat === null) return null;
  return {
    beatId: beat.id,
    node: beat.node,
    level: session.level,
    prompt: beat.prompt,
    selectedId: session.reveal?.chosenId ?? session.selectedId,
    revealed: isRevealed(session),
    at,
  };
}

/** Record the flag on the session, so the top bar can show it landed. */
export function markReported(session: McqSession): McqSession {
  const beat = currentBeat(session);
  if (beat === null || session.reported.includes(beat.id)) return session;
  return { ...session, reported: [...session.reported, beat.id] };
}

export function isReported(session: McqSession): boolean {
  const beat = currentBeat(session);
  return beat !== null && session.reported.includes(beat.id);
}

/* ------------------------------------------------------------------ */
/* The button label                                                    */
/* ------------------------------------------------------------------ */

/**
 * The one primary button's label, which changes and never moves.
 *
 * The reference keeps CHECK and then CONTINUE in the same full bleed slot at
 * the bottom of the sheet, so the way forward is in the same place before and
 * after the answer. Deriving the label here rather than in JSX means the rule
 * is one line a test reads, and the component just prints it.
 */
export function commitLabel(session: McqSession): string {
  return isRevealed(session) ? "Continue" : "Check";
}
