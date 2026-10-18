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

/**
 * Progress inside a step that plays pool items one after another
 * (PoolItemsStep: drawings, ladders, boards). Without it a reload after nine
 * of ten drawings went back to drawing one.
 */
export interface PoolSave {
  /** Which step it belongs to: `${phase}:${index}:${part}`, part "items", "draws" or "recycle". */
  readonly step: string;
  /** The entry ids finished, in order. Checked against the step's entries on load. */
  readonly done: readonly string[];
  /** How many of those cleared on the first try. */
  readonly cleared: number;
  /** Drawings missed on the first try, queued for the recycle pass. */
  readonly missed: readonly string[];
}

/** A trainer step whose drawings are finished: their tally, so a reload opens on the trainer. */
export interface DrawsDoneSave {
  /** The run index of the trainer step the drawings belong to. */
  readonly at: number;
  readonly cleared: number;
  readonly total: number;
  readonly missed: readonly string[];
}

/** Everything about the open step beyond the multiple-choice answers. */
export interface OpenStepSave {
  readonly pool?: PoolSave | null;
  readonly drawsDone?: DrawsDoneSave | null;
  /** The recycle pass's drawings, finished, before its missed quick questions. */
  readonly recycleDraws?: { readonly cleared: number; readonly total: number } | null;
  /** The lesson bar's fill (0 to 1) when it was saved, for the half-done ring on the path. */
  readonly bar?: number;
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
  /** Questions answered so far, every kind (a first-meeting step reports 0 of 0 to the run). */
  readonly answered?: number;
  /** The open step's pool items and finished drawings. Absent on saves written before it existed. */
  readonly open?: OpenStepSave;
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

/**
 * Whether the lesson a pathway link opens has a bookmark. The pathway asks
 * before it charges: a resume is the same visit, already paid for at its
 * first entry, so START on a saved lesson goes straight back in.
 */
export function hasSavedLesson(storage: SaveStorage | null, href: string): boolean {
  const node = /\/lesson\/([^/?&#]+)/.exec(href)?.[1];
  if (node === undefined || storage === null) return false;
  try {
    return storage.getItem(saveKey(decodeURIComponent(node))) !== null;
  } catch {
    return false;
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
  answered?: number,
  open: OpenStepSave = {},
  now: Date = new Date(),
): void {
  // A Challenge leaves any Practice bookmark on the same node alone.
  if (run.mode !== "practice") return;
  // The ending, or a run with nothing answered yet (a START OVER): no bookmark.
  const count = answered ?? answeredSoFar(run, mcq);
  if (run.phase === "reward" || count === 0) {
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
    answered: count,
    open,
    ...(primedGuess !== undefined ? { primedGuess } : {}),
  });
}

export interface LessonResume {
  readonly run: LessonRun;
  readonly mcq: McqSave | null;
  readonly primedGuess?: string | null;
  /** Questions answered before the save, for the resume screen and the next write. */
  readonly answered: number;
  /** The open step's pool items and finished drawings; empty when none were saved. */
  readonly open: OpenStepSave;
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
  const answered = typeof saved.answered === "number" && saved.answered > 0 ? saved.answered : answeredSoFar(run, mcq);
  if (answered === 0) return null;
  const open = typeof saved.open === "object" && saved.open !== null ? saved.open : {};
  return { run, mcq, answered, open, ...(saved.primedGuess !== undefined ? { primedGuess: saved.primedGuess } : {}) };
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

/** Where a pool-items step picks up: the next item, and the tally so far. */
export interface PoolResume {
  readonly index: number;
  readonly cleared: number;
  readonly missed: readonly string[];
}

/**
 * Put a saved pool step back: the items finished must be the step's first
 * items in order, or the step starts from its first item. A save is written
 * before the step's last Continue at the latest, so it never covers every item.
 */
export function resumePool(entryIds: readonly string[], save: PoolSave | null | undefined): PoolResume | null {
  if (save === null || save === undefined || !Array.isArray(save.done)) return null;
  const n = save.done.length;
  if (n === 0 || n >= entryIds.length) return null;
  for (let i = 0; i < n; i += 1) {
    if (entryIds[i] !== save.done[i]) return null;
  }
  const known = new Set(save.done);
  const missed = Array.isArray(save.missed) ? save.missed.filter((id) => known.has(id)) : [];
  const cleared = Number.isInteger(save.cleared) ? Math.max(0, Math.min(save.cleared, n)) : 0;
  return { index: n, cleared, missed };
}

/**
 * How many questions a node's bookmark holds, of either kind, or null when it
 * has none. The pathway reads it to say "3 done and saved" before START.
 */
export function savedCount(storage: SaveStorage | null, node: string): number | null {
  const saved = read(storage, node) as { kind?: unknown; answered?: unknown; state?: { answered?: unknown } } | null;
  if (saved === null || typeof saved !== "object") return null;
  const n = saved.kind === "practice" ? saved.state?.answered : saved.kind === "lesson" ? saved.answered : undefined;
  return typeof n === "number" && n > 0 ? n : null;
}

/**
 * How full the lesson bar was when a node's bookmark was written, 0 to 1, or
 * null when it has none. The pathway draws it as a ring round the half-done
 * node, so a lesson left part way looks part way before it is tapped. A save
 * from before the bar was recorded still counts: it reads as a sliver, never 0.
 */
export function savedBar(storage: SaveStorage | null, node: string): number | null {
  if (savedCount(storage, node) === null) return null;
  const saved = read(storage, node) as { kind?: unknown; open?: { bar?: unknown }; state?: { answered?: unknown; queue?: unknown } } | null;
  let bar: unknown = undefined;
  if (saved?.kind === "lesson") bar = saved.open?.bar;
  if (saved?.kind === "practice" && Array.isArray(saved.state?.queue) && typeof saved.state?.answered === "number") {
    // A practice run's queue holds what is left, so answered of answered plus left is its fill.
    bar = saved.state.answered / (saved.state.answered + saved.state.queue.length);
  }
  const n = typeof bar === "number" && Number.isFinite(bar) ? bar : 0;
  return Math.min(0.95, Math.max(0.08, n));
}

/** The node id a lesson href opens, or null. */
export function nodeOfHref(href: string): string | null {
  const node = /\/lesson\/([^/?&#]+)/.exec(href)?.[1];
  return node === undefined ? null : decodeURIComponent(node);
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
