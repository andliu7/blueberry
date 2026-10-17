/**
 * Save-as-you-go for lessons and practice runs.
 *
 * WHY THIS FILE EXISTS. The progress store (app/progress.ts) banks a lesson
 * when it is CLEARED, and that part was always right. What it never held was
 * the middle: a student three questions into a nine-question lesson who
 * closed the tab, or tapped X, came back to question one. The owner's words
 * were "progress doesn't seem to save as you go", and this is the missing
 * half: after every answered question the runner writes its position here,
 * and when the lesson opens again it offers to pick up from that position.
 *
 * WHAT IS SAVED, AND WHY IT IS SMALL. Only what cannot be recomputed:
 *   - the lesson run's counters (which step, how many right, the missed queue
 *     waiting for the recycle pass), never the plan, which is rebuilt from the
 *     node id by template.ts every time;
 *   - inside a multiple-choice step, the answers given so far, so the restored
 *     step starts on the next unanswered question with the same bar fill.
 * A practice run's state is already one plain object (practice/run.ts), so it
 * is saved whole.
 *
 * WHY EVERY LOAD IS CHECKED. Other people edit lesson content while saves sit
 * in browsers. A save is only worth resuming if it still describes the lesson
 * on screen, so each one carries the plan's shape, and an MCQ save carries the
 * ids of the questions it answered. If either no longer matches, the save is
 * dropped and the lesson starts clean: a wrong resume (a question skipped, a
 * score from a different set) is worse than none.
 *
 * NO REWARD LIVES HERE. Diamonds, XP and streak come only from the journal in
 * app/progress.ts, and the runners bank them the moment the run reaches its
 * ending (BeatRunner's reward effect, PracticeRunner's finished effect). A
 * save is a bookmark, never a balance, so nothing in it can pay twice.
 *
 * Pure apart from the storage it is handed, so the suite runs it in node.
 */

import type { BeatResult } from "../beats/types";
import type { LessonPlan, LessonRun, RunMode } from "../beats/template";
import type { McqSession } from "../beats/mcq/session";
import type { PracticeRunState } from "../beats/practice/run";

/** The slice of Web Storage this module uses, so a test can hand it a Map. */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PREFIX = "bb.lessonSave.v1:";

/** One key per node, so two half-done lessons keep two bookmarks. */
export function saveKey(node: string): string {
  return `${PREFIX}${node}`;
}

/** The answers given so far inside the multiple-choice step on screen. */
export interface McqSave {
  /** The beat ids answered, in order. Checked against the step on load. */
  readonly results: readonly BeatResult[];
  /** The bar's fill for this step when it was saved, so the resumed bar matches. */
  readonly fraction?: number;
}

type RunCounters = Omit<LessonRun, "plan" | "mode">;

export interface LessonSave {
  readonly v: 1;
  readonly kind: "lesson";
  readonly node: string;
  readonly shape: string;
  readonly savedAt: string;
  readonly run: RunCounters;
  readonly mcq: McqSave | null;
  /** The priming guess, so the end-of-lesson recap still has it. Undefined when not primed. */
  readonly primedGuess?: string | null;
}

export interface PracticeSave {
  readonly v: 1;
  readonly kind: "practice";
  readonly node: string;
  readonly shape: string;
  readonly savedAt: string;
  readonly state: PracticeRunState;
}

/**
 * The browser's localStorage, or null where it is blocked (private windows,
 * sandboxed previews, the node test environment). Every caller treats null as
 * "this visit cannot be saved", never as an error.
 */
export function browserStorage(): SaveStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function read(storage: SaveStorage | null, node: string): unknown {
  if (storage === null) return null;
  try {
    const raw = storage.getItem(saveKey(node));
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function write(storage: SaveStorage | null, node: string, value: LessonSave | PracticeSave): void {
  if (storage === null) return;
  try {
    storage.setItem(saveKey(node), JSON.stringify(value));
  } catch {
    /* storage full or blocked: the lesson still plays, it just will not resume */
  }
}

/** Forget a node's bookmark: on START OVER, and when the run reaches its ending. */
export function clearSave(storage: SaveStorage | null, node: string): void {
  if (storage === null) return;
  try {
    storage.removeItem(saveKey(node));
  } catch {
    /* nothing to do */
  }
}

/** The plan as a string: each step's kind and what it plays. A content edit changes it. */
export function planShape(plan: LessonPlan): string {
  return plan.steps
    .map((step) => {
      const beat = step.beat as { readonly kind: string; readonly node?: string; readonly ladderId?: string; readonly id?: string };
      return `${beat.kind}:${beat.node ?? beat.ladderId ?? beat.id ?? ""}`;
    })
    .join("|");
}

/* ------------------------------------------------------------------ */
/* Lessons                                                             */
/* ------------------------------------------------------------------ */

/**
 * Write the lesson's position. Only a Practice-mode run in progress is saved:
 * a Challenge ends on its first miss and is paid for at the gate, so a
 * bookmark into one would let a student reload past a miss.
 */
export function saveLesson(
  storage: SaveStorage | null,
  node: string,
  run: LessonRun,
  mcq: McqSave | null,
  primedGuess: string | null | undefined,
  now: Date = new Date(),
): void {
  // A Challenge leaves any Practice bookmark on the same node alone.
  if (run.mode !== "practice") return;
  if (run.phase === "reward") {
    clearSave(storage, node);
    return;
  }
  const { plan: _plan, mode: _mode, ...counters } = run;
  write(storage, node, {
    v: 1,
    kind: "lesson",
    node,
    shape: planShape(run.plan),
    savedAt: now.toISOString(),
    run: counters,
    mcq,
    ...(primedGuess !== undefined ? { primedGuess } : {}),
  });
}

export interface LessonResume {
  readonly run: LessonRun;
  readonly mcq: McqSave | null;
  readonly primedGuess?: string | null;
}

function isLessonSave(x: unknown): x is LessonSave {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Partial<LessonSave>;
  return s.v === 1 && s.kind === "lesson" && typeof s.shape === "string" && typeof s.run === "object" && s.run !== null;
}

/**
 * The saved position for this node and plan, or null when there is none, it is
 * for a different version of the lesson, or it has nothing in it worth
 * offering (no question answered yet).
 */
export function loadLesson(storage: SaveStorage | null, node: string, plan: LessonPlan, mode: RunMode): LessonResume | null {
  if (mode !== "practice") return null;
  const saved = read(storage, node);
  if (!isLessonSave(saved) || saved.node !== node || saved.shape !== planShape(plan)) return null;
  const r = saved.run;
  if (r.phase !== "content" && r.phase !== "recycle") return null;
  if (!Number.isInteger(r.index) || r.index < 0 || r.index > plan.steps.length) return null;
  if (r.phase === "content" && r.index === plan.steps.length) return null;
  const run: LessonRun = { ...r, plan, mode };
  const mcq = saved.mcq !== null && Array.isArray(saved.mcq?.results) ? saved.mcq : null;
  if (answeredSoFar(run, mcq) === 0) return null;
  return { run, mcq, ...(saved.primedGuess !== undefined ? { primedGuess: saved.primedGuess } : {}) };
}

/** Questions answered so far: the steps behind, the recycle pass, and the open step's answers. */
export function answeredSoFar(run: LessonRun, mcq: McqSave | null): number {
  return run.totalBeats + run.recycleTotal + (mcq?.results.length ?? 0);
}

/**
 * Put a saved step's answers back into a fresh MCQ session, so it opens on the
 * next unanswered question. The answers must be the session's first questions
 * in order; if the step's questions changed underneath the save, the session
 * starts from its first question instead of guessing which answer was which.
 */
export function resumeMcqSession(fresh: McqSession, save: McqSave | null): McqSession {
  if (save === null || save.results.length === 0) return fresh;
  // Saved on the step's LAST answer, before its Continue: replay that last
  // question rather than open on a finished step that cannot move on.
  const n = Math.min(save.results.length, fresh.beats.length - 1);
  if (n <= 0) return fresh;
  for (let i = 0; i < n; i += 1) {
    if (fresh.beats[i]?.id !== save.results[i]?.beatId) return fresh;
  }
  return { ...fresh, index: n, results: save.results.slice(0, n) };
}

/* ------------------------------------------------------------------ */
/* Practice runs                                                       */
/* ------------------------------------------------------------------ */

/** Write a practice run's state, or clear it once the run has finished or for a Challenge. */
export function savePractice(storage: SaveStorage | null, node: string, poolIds: readonly string[], state: PracticeRunState, now: Date = new Date()): void {
  if (state.finished || state.challenge) {
    clearSave(storage, node);
    return;
  }
  if (state.answered === 0) return;
  write(storage, node, { v: 1, kind: "practice", node, shape: poolIds.join("|"), savedAt: now.toISOString(), state });
}

/** A saved practice run for this exact pool, or null. */
export function loadPractice(storage: SaveStorage | null, node: string, poolIds: readonly string[], challenge: boolean): PracticeRunState | null {
  if (challenge) return null;
  const saved = read(storage, node) as Partial<PracticeSave> | null;
  if (saved === null || saved.v !== 1 || saved.kind !== "practice" || saved.shape !== poolIds.join("|")) return null;
  const state = saved.state;
  if (state === undefined || state.finished || state.challenge || state.answered <= 0) return null;
  const known = new Set(poolIds);
  if (!Array.isArray(state.queue) || state.queue.length === 0 || !state.queue.every((id) => known.has(id))) return null;
  return state;
}
