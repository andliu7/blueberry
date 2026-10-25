/**
 * THE SIDE QUEST RULE ON POOL QUIZZES (owner rule 24 Oct, STATUS C1): a side
 * quest the student's syllabus covers counts on quizzes and exams. This file
 * says which quiz each one joins and how it joins it; beats/practice/pools.ts
 * (stage quizzes, pool-played unit checkpoints) and tabs/pathway/reviewPool.ts
 * (the review concept check) call it. With nothing covered both are exactly
 * what they were.
 *
 * WHICH QUIZ. A covered side quest joins its unit's checkpoint (when the
 * checkpoint plays a pool) and the first concept check on the line after the
 * point it hangs off: a stage quiz on the main line, or a review stop. A side
 * quest with no concept check after it (every unit but Unit 1 has none) joins
 * only the checkpoint.
 *
 * HOW IT JOINS. It lends at most SIDE_QUEST_SHARE graded problems, taken in
 * turn with the quiz's own, and the quiz keeps its length: what falls off is
 * the tail of the quiz's own list. It never lights or gates anything; this
 * file only touches what a run asks.
 *
 * Kept out of reviewCheckpoints.ts and testOuts.ts, which are in #/app's first
 * open (test/syllabusPayload.test.ts). Pure, no React.
 */
import { PATHWAY_UNITS, checkpointNodeId, type PathwayNode, type PathwayUnit } from "../demo/pathwayMap";
import { REVIEW_CHECKPOINTS, type ReviewCheckpoint } from "../tabs/pathway/reviewCheckpoints";
import type { PoolEntry, UnitPools } from "../content/u1/types";
import { mcqBeatsForNode } from "../beats/mcq/content";

/** How many problems one covered side quest lends a quiz: reviewPool's PER_LESSON, so it weighs like a reviewed lesson. */
export const SIDE_QUEST_SHARE = 3;

/** A main-line stop a side quest can join: a stage quiz, or a review stop (which sits just after its lesson). */
interface Stop {
  readonly id: string;
  readonly at: number;
}

function lineOf(unit: PathwayUnit): readonly PathwayNode[] {
  return unit.nodes.filter((node) => node.kind !== "branch");
}

function stopsOf(unit: PathwayUnit, reviews: readonly ReviewCheckpoint[]): readonly Stop[] {
  const line = lineOf(unit);
  const quizzes = line.flatMap((node, at) => (node.role === "quiz" ? [{ id: node.id, at }] : []));
  const stops = reviews
    .filter((review) => review.unitId === unit.id)
    .flatMap((review) => {
      const at = line.findIndex((node) => node.id === review.after);
      return at === -1 ? [] : [{ id: review.id, at: at + 0.5 }];
    });
  return [...quizzes, ...stops].sort((a, b) => a.at - b.at);
}

/**
 * Where a side quest hangs off the main line: the latest main-line position
 * among its prerequisites, a side quest prerequisite followed back. One with
 * no `after` waits on every main-line lesson before it, as in
 * prerequisitesOf (tabs/pathway/pathwayState.ts).
 */
function attachOf(unit: PathwayUnit, node: PathwayNode, seen: ReadonlySet<string> = new Set()): number {
  const line = lineOf(unit);
  if (node.after === undefined) {
    const before = unit.nodes.slice(0, unit.nodes.indexOf(node)).filter((entry) => entry.kind !== "branch");
    return before.length === 0 ? -1 : line.indexOf(before[before.length - 1]!);
  }
  let found = -1;
  for (const id of node.after) {
    const onLine = line.findIndex((entry) => entry.id === id);
    const branch = unit.nodes.find((entry) => entry.id === id && entry.kind === "branch");
    const at = onLine !== -1 ? onLine : branch !== undefined && !seen.has(id) ? attachOf(unit, branch, new Set([...seen, node.id])) : -1;
    found = Math.max(found, at);
  }
  return found;
}

/** The concept check a side quest joins (a stage quiz or review id), or null when none follows it. */
export function sideQuestStop(unit: PathwayUnit, node: PathwayNode, reviews: readonly ReviewCheckpoint[] = REVIEW_CHECKPOINTS): string | null {
  const attach = attachOf(unit, node);
  return stopsOf(unit, reviews).find((stop) => stop.at > attach)?.id ?? null;
}

/**
 * The covered side quests that join this quiz, in map order: every covered
 * side quest of the unit for its checkpoint, the ones whose stop it is for a
 * stage quiz or a review. Empty for anything else and whenever nothing is covered.
 */
export function sideQuestsFor(quizId: string, covered: ReadonlySet<string>, units: readonly PathwayUnit[] = PATHWAY_UNITS, reviews: readonly ReviewCheckpoint[] = REVIEW_CHECKPOINTS): readonly string[] {
  if (covered.size === 0) return [];
  for (const unit of units) {
    const isCheckpoint = quizId === checkpointNodeId(unit.id);
    const isStop = !isCheckpoint && stopsOf(unit, reviews).some((stop) => stop.id === quizId);
    if (!isCheckpoint && !isStop) continue;
    return unit.nodes
      .filter((node) => node.kind === "branch" && node.playable !== undefined && node.mentionOnly !== true && covered.has(node.id))
      .filter((node) => isCheckpoint || sideQuestStop(unit, node, reviews) === quizId)
      .map((node) => node.id);
  }
  return [];
}

/**
 * A side quest's authored graded MCQs (beats/mcq/content.ts) as pool entries,
 * for a side quest with no pool of its own: u1-ied's one question lives there,
 * so without this it had nothing to lend and counted nowhere. The explanation
 * is the correct option's own `why`. Empty for a side quest with a pool.
 */
export function authoredProblems(id: string, pools: UnitPools): readonly PoolEntry[] {
  if ((pools[id] ?? []).length > 0) return [];
  return mcqBeatsForNode(id)
    .filter((beat) => beat.levels.some((level) => level > 0))
    .map((beat) => ({
      id: beat.id,
      item: { kind: "mcq", beat },
      explanation: beat.options.find((option) => option.id === beat.correctOptionId)?.why ?? beat.brief ?? beat.prompt,
      provenance: "Authored in beats/mcq/content.ts; its sources are in the comment above the beat.",
      placeholder: true,
    }));
}

/**
 * The problems a side quest can lend a quiz: its graded pool entries (a
 * first-meeting MCQ cannot fail, so it stays in its lesson), or its authored
 * graded MCQs when it has no pool, at most SIDE_QUEST_SHARE.
 */
export function sideQuestProblems(id: string, pools: UnitPools): readonly PoolEntry[] {
  const pooled = (pools[id] ?? []).filter((entry) => entry.item.kind !== "mcq" || entry.item.beat.levels.some((level) => level > 0));
  return (pooled.length > 0 ? pooled : authoredProblems(id, pools)).slice(0, SIDE_QUEST_SHARE);
}

/**
 * The quiz's own list with the side quests' problems taken in turn with it,
 * cut back to the quiz's own length. `interleave` is the run engine's
 * (beats/practice/pools.ts), passed in so this file does not import the pools.
 */
export function withSideQuests<T>(own: readonly T[], extra: readonly (readonly T[])[], interleave: (...lists: readonly (readonly T[])[]) => readonly T[]): readonly T[] {
  const lent = extra.filter((list) => list.length > 0);
  if (lent.length === 0 || own.length === 0) return own;
  return interleave(own, ...lent).slice(0, own.length);
}
