/**
 * When a lesson opens on its priming preview (U1-P2), as pure functions so the
 * node-only test suite can hold the rule. The data is content/u1/priming.ts;
 * the screen is LessonPreview.tsx; BeatRunner.tsx decides with these.
 *
 * THE RULE. A lesson with a preview opens on it once per visit, before any
 * question. It does not open on a RETRY, which is two cases here:
 *   - a Challenge run, which by definition replays a node already cleared;
 *   - reopening the same lesson in the same browser session after its
 *     preview was already started once (the student left and came back).
 * Priming is for the first look at a lesson's shape. A second look in the
 * same sitting is a delay, not a primer.
 */
import { U1_POOLS } from "../content/u1";
import { PATHWAY_UNITS, pathwayNode, type PathwayNode } from "../demo/pathwayMap";
import { U1_PRIMING, type LessonPriming } from "../content/u1/priming";
import { lessonMcqBeats } from "./template";
import type { McqBeat } from "./types";

export type { LessonPriming } from "../content/u1/priming";

/** The preview for a node, or null when it has none (quizzes, checkpoints, other units). */
export function primingFor(node: string): LessonPriming | null {
  return U1_PRIMING[node] ?? null;
}

export interface PrimingVisit {
  readonly challenge: boolean;
  /** Whether this node's preview was already started earlier in this session. */
  readonly seenThisSession: boolean;
}

/**
 * One thing a lesson can cite: a question it plays (its prompt and correct
 * answer) and, for a pool entry, the explanation written for it. The preview's
 * quotes and the guess both read from here, so they can only say what the
 * lesson's own content already says.
 */
export interface PrimingSource {
  readonly id: string;
  readonly beat: McqBeat | null;
  /** The pool entry's explanation, when the source is a pool entry. */
  readonly explanation: string | null;
}

/** Everything a node's lesson plays: its MCQs and its pool entries (any kind), by id. */
export function primingSources(node: string): ReadonlyMap<string, PrimingSource> {
  const found = new Map<string, PrimingSource>();
  for (const beat of lessonMcqBeats(node)) found.set(beat.id, { id: beat.id, beat, explanation: null });
  for (const entry of U1_POOLS[node] ?? []) {
    const beat = entry.item.kind === "mcq" ? entry.item.beat : null;
    found.set(entry.id, { id: entry.id, beat, explanation: entry.explanation });
  }
  return found;
}

/**
 * The text a quote may be copied from: the explanation and the CORRECT
 * option's words and why. Never a wrong option, whose text is wrong on purpose.
 */
export function quotableText(source: PrimingSource): string {
  const correct = source.beat?.options.find((option) => option.id === source.beat?.correctOptionId);
  return [source.explanation ?? "", correct?.text ?? "", correct?.why ?? ""].join(" | ");
}

/** The opening guess for a node: one MCQ its lesson plays, or null. */
export function guessFor(node: string): McqBeat | null {
  const id = primingFor(node)?.guess;
  if (id === undefined || id === null) return null;
  return primingSources(node).get(id)?.beat ?? null;
}

export interface GuessPayoff {
  readonly prompt: string;
  readonly chosen: string;
  readonly answer: string;
  readonly right: boolean;
  /** The pool explanation, or the correct option's why for a non-pool MCQ. */
  readonly why: string;
}

/** What CHECK says about the opening guess. Null for an unknown option. */
export function guessPayoff(node: string, optionId: string): GuessPayoff | null {
  const beat = guessFor(node);
  if (beat === null) return null;
  const chosen = beat.options.find((option) => option.id === optionId);
  const correct = beat.options.find((option) => option.id === beat.correctOptionId);
  if (chosen === undefined || correct === undefined) return null;
  const explanation = primingSources(node).get(beat.id)?.explanation ?? null;
  return {
    prompt: beat.prompt,
    chosen: chosen.text,
    answer: correct.text,
    right: chosen.id === correct.id,
    why: explanation ?? correct.why ?? "",
  };
}

/**
 * The prediction revisit at the end of a primed lesson (owner, queue item 17):
 * "Here was your prediction. Still agree?" The student answers yes or no, and
 * THAT answer is what is marked:
 *
 *   prediction right, still agree   right  "You called it!"
 *   prediction wrong, changed mind  right  "Right to change your mind!"
 *   prediction wrong, still agree   wrong  "Not quite"
 *   prediction right, changed mind  wrong  "Your first call was right"
 *
 * The answer and the why come from guessPayoff, so the revisit can only say
 * what the lesson's own content already says. Null for an unknown option.
 */
export interface RevisitVerdict {
  /** Whether the yes or no was the right call. */
  readonly right: boolean;
  /** Whether the prediction made before the lesson was itself right. */
  readonly predictionRight: boolean;
  readonly title: string;
  readonly answer: string;
  readonly why: string;
}

export function revisitVerdict(node: string, picked: string, stillAgree: boolean): RevisitVerdict | null {
  const payoff = guessPayoff(node, picked);
  if (payoff === null) return null;
  const title = payoff.right
    ? stillAgree
      ? "You called it!"
      : "Your first call was right"
    : stillAgree
      ? "Not quite"
      : "Right to change your mind!";
  return {
    right: stillAgree === payoff.right,
    predictionRight: payoff.right,
    title,
    answer: payoff.answer,
    why: payoff.why,
  };
}

/**
 * The order the map's idea chips sit in before the student places them.
 * Alphabetical by label, so it is the same on every render and in the test,
 * and reversed if that happens to be the lesson's own order, so the answer is
 * never already laid out. Returns indexes into `ideas`.
 */
export function mapPoolOrder(ideas: readonly { readonly label: string }[]): readonly number[] {
  const order = ideas.map((_, index) => index).sort((a, b) => ideas[a].label.localeCompare(ideas[b].label));
  return order.every((value, index) => value === index) ? [...order].reverse() : order;
}

/**
 * The lesson a student has just walked through before `node`, on the PATH,
 * not in the map's array (U1-P2 round 4: the array put optional branch lessons
 * right before spine lessons, so a spine student was told "Last lesson: Rank
 * radical stability", a branch they had skipped).
 *
 *   - A branch lesson follows the node its `after` names first: the branch
 *     hangs off that node, so that is where the student came from.
 *   - A spine lesson follows the nearest earlier SPINE lesson. Branches are
 *     optional, so they are skipped; quizzes and checkpoints are skipped too,
 *     because they review lessons rather than teach a new idea to link back to.
 *
 * Null for the first lesson of its unit.
 */
export function previousOnPath(node: string): string | null {
  const here = pathwayNode(node);
  if (here === null) return null;
  if (here.kind === "branch") return here.after?.[0] ?? null;
  const unit = PATHWAY_UNITS.find((u) => u.nodes.some((n) => n.id === node));
  if (unit === undefined) return null;
  const isLesson = (n: PathwayNode) =>
    n.kind === "spine" && n.playable !== undefined && n.role !== "quiz" && !n.mentionOnly;
  const before = unit.nodes.slice(0, unit.nodes.findIndex((n) => n.id === node)).filter(isLesson);
  return before.length === 0 ? null : before[before.length - 1].id;
}

/**
 * The joining words a map link shows between two ideas. A via written for the
 * sentence form may open with "," or ";"; on its own between two nodes that
 * punctuation is dropped. What is left must still be words (the test pins it),
 * so no link is ever an empty arrow.
 */
export function viaWords(via: string): string {
  return via.replace(/^[,;]\s*/, "");
}

/** Whether the lesson opens on its preview for this visit. */
export function opensOnPreview(node: string, visit: PrimingVisit): boolean {
  if (primingFor(node) === null) return false;
  if (visit.challenge) return false;
  return !visit.seenThisSession;
}

/*
 * The per-session memory. sessionStorage, not localStorage, because a new
 * sitting deserves the primer again. Every access is wrapped: storage can be
 * missing (the node test runner), blocked, or throw in a private window, and
 * the honest fallback is to show the preview, which is the safe default.
 */
const SEEN_KEY = "bb-primed-nodes";

function readSeen(): readonly string[] {
  try {
    const raw = globalThis.sessionStorage?.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function primedThisSession(node: string): boolean {
  return readSeen().includes(node);
}

export function markPrimed(node: string): void {
  try {
    const seen = readSeen();
    if (!seen.includes(node)) globalThis.sessionStorage?.setItem(SEEN_KEY, JSON.stringify([...seen, node]));
  } catch {
    // Storage blocked: the preview simply shows again next visit.
  }
}
