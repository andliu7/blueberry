/**
 * Which problems a node's in-a-row run plays: a `practice` or `quiz` node's
 * own pool, in authored order (content/u1), and the unit checkpoint's exam. A node whose lesson ends on
 * the trainer (u1-x2 keeps its sequence, owner 2026-09-29; content/u1/lessonTrainers.ts) is not a run
 * node even with a practice role. Every other node plays its seven-slot lesson, and its pool
 * MCQs join that lesson's quick questions (lessonMcqBeats in ../template.ts).
 */
import { checkpointNodeId, pathwayNode } from "../../demo/pathwayMap";
import { U1_POOLS, mergePools } from "../../content/u1";
// Unit 2 draft pools join the lookup so its nodes have something to play (CHANGED 2026-10-17).
import { U2_EXAM_IDS, U2_POOLS } from "../../content/u2";
import { STAGE_CD_EXAM_IDS } from "../../content/u1/stage-cd";
import { U3_POOLS } from "../../content/u3";
import { U4_POOLS } from "../../content/u4";
import { U5_POOLS } from "../../content/u5";
import { U6_POOLS } from "../../content/u6";
import { U7_POOLS } from "../../content/u7";
import { U8_POOLS } from "../../content/u8";
// Unit 9 draft pools (ADDED 2026-10-17, scripts/u9_pools.py).
import { U9_POOLS } from "../../content/u9";
// Unit 10 draft pools (ADDED 2026-10-17, scripts/u10_pools.py).
import { U10_POOLS } from "../../content/u10";
// Unit 0 ("Start here") draft pools and its test out quiz (ADDED 2026-10-17).
import { U0_EXAM_CHAPTERS, U0_EXAM_IDS, U0_POOLS } from "../../content/u0";
import { lessonTrainerFor } from "../../content/u1/lessonTrainers";
import { mcqCardId } from "../mcq/card";
import type { PoolEntry, UnitPools } from "../../content/u1/types";

/**
 * The unit exam, played as an in-a-row run on the unit's checkpoint. Owner
 * prompt 2026-09-29: the exam covers stages A, B and D, and stage C and the
 * radical node appear only in Challenge, so their pools are never drawn here.
 * Stage A and B write no exam items of their own, so their stage quizzes stand
 * in for them; stage D's are the ids stage-cd.ts sets aside for the exam.
 */
const EXAM_SOURCES: Readonly<Record<string, readonly (readonly string[] | string)[]>> = Object.freeze({
  [checkpointNodeId("u1")]: ["u1-quiz-a", "u1-quiz-b", STAGE_CD_EXAM_IDS],
  // Unit 2 draft: the ids u2_pools.py sets aside for the exam, split by the lesson they come from so the run
  // interleaves topics in teaching order (Hückel, charged, annulene, heterocycle, NMR, then round again) instead of in blocks.
  [checkpointNodeId("u2")]: ["u2-huckel", "u2-charged", "u2-annulene", "u2-hetero", "u2-nmr"].map((node) =>
    U2_EXAM_IDS.filter((id) => (U2_POOLS[node] ?? []).some((entry) => entry.id === id)),
  ),
  // Unit 0's test out quiz (u0-check): the ids u0_pools.py sets aside, split by chapter so chapters 2 to 8 interleave.
  [checkpointNodeId("u0")]: U0_EXAM_CHAPTERS.map((node) =>
    U0_EXAM_IDS.filter((id) => (U0_POOLS[node] ?? []).some((entry) => entry.id === id)),
  ),
});

/** Every unit's pools in one table. Node ids carry their unit prefix, so keys cannot collide. */
// mergePools throws on a node or entry id written twice, so a unit collision fails at import, never silently overwrites.
const ALL_POOLS: UnitPools = mergePools(U1_POOLS, U2_POOLS, U3_POOLS, U4_POOLS, U5_POOLS, U6_POOLS, U7_POOLS, U8_POOLS, U9_POOLS, U10_POOLS, U0_POOLS);

/**
 * What a node's Challenge adds to its own pool. Radical items may reach a quiz
 * only through Challenge, never Practice (owner prompt 2026-09-29, decision 6).
 */
const CHALLENGE_EXTRAS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "u1-quiz-a": ["u1-rank-radical"],
});

/** One from each list in turn, so the first few problems already sample every source. */
export function interleave<T>(...lists: readonly (readonly T[])[]): readonly T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < longest; i += 1) for (const list of lists) if (i < list.length) out.push(list[i]!);
  return out;
}

function examPool(nodeId: string, pools: UnitPools): readonly PoolEntry[] {
  const sources = EXAM_SOURCES[nodeId];
  if (sources === undefined) return [];
  const all = Object.values(pools).flat();
  return interleave(
    ...sources.map((source) =>
      typeof source === "string" ? (pools[source] ?? []) : all.filter((entry) => source.includes(entry.id)),
    ),
  );
}

function isRunNode(nodeId: string): boolean {
  const node = pathwayNode(nodeId);
  if (node === null || (node.role !== "practice" && node.role !== "quiz")) return false;
  // u1-x2's map link is a beat now, but its lesson closes on the trainer, so it stays a lesson (see lessonTrainers.ts).
  if (lessonTrainerFor(nodeId) !== undefined) return false;
  return node.playable === undefined || node.playable.kind === "beat";
}

export function practicePool(nodeId: string, pools: UnitPools = ALL_POOLS): readonly PoolEntry[] {
  if (EXAM_SOURCES[nodeId] !== undefined) return examPool(nodeId, pools);
  return isRunNode(nodeId) ? (pools[nodeId] ?? []) : [];
}

/**
 * Checkpoints that play as a UNIT EXAM (run.ts: the whole set, passed on the
 * share right first time) instead of the in-a-row run. Unit 2 draft only, 2026-10-17:
 * the in-a-row rule let its 14-problem exam clear after 4 answers. Unit 1's
 * checkpoint still plays in a row; adding it here is one line and the owner's call.
 */
// Unit 0's test out quiz plays as the whole set too, so it cannot pass on three lucky answers (2026-10-17).
const EXAM_RUNS: ReadonlySet<string> = new Set([checkpointNodeId("u2"), checkpointNodeId("u0")]);

export function isExamRun(nodeId: string): boolean {
  return EXAM_RUNS.has(nodeId);
}

/** The node whose pool an entry was written for, so an exam can report per topic. Null for an unknown id. */
export function poolHomeOf(entryId: string, pools: UnitPools = ALL_POOLS): string | null {
  for (const [node, entries] of Object.entries(pools)) if (entries.some((entry) => entry.id === entryId)) return node;
  return null;
}

/** A run node's Challenge set: its own pool, with any Challenge-only problems taken in turn. */
export function challengePool(nodeId: string, pools: UnitPools = ALL_POOLS): readonly PoolEntry[] {
  const own = practicePool(nodeId, pools);
  if (own.length === 0) return [];
  return interleave(own, ...(CHALLENGE_EXTRAS[nodeId] ?? []).map((source) => pools[source] ?? []));
}

/** A lesson node's pool entries, played inside its seven-slot lesson. Empty for a run node. */
export function lessonPool(nodeId: string, pools: UnitPools = ALL_POOLS): readonly PoolEntry[] {
  return isRunNode(nodeId) ? [] : (pools[nodeId] ?? []);
}

/**
 * Whether a missed problem may become a flashcard. A card's back is lifted
 * verbatim from reviewed copy (cards/Recommendation.tsx: no fallback string),
 * and every pool entry is a draft until the owner signs it off, so today the
 * answer is always no. This is the one gate to change when the pool type
 * gains a signed-off state.
 */
export function mayOfferCard(entry: PoolEntry): boolean {
  return !entry.placeholder;
}

/**
 * Whether a card id names a draft pool question. McqRunner derives a missed
 * question's card id from its beat id (mcqCardId in ../mcq/card.ts), so the
 * lesson runner asks this before it offers the card. Added 2026-10-17: until
 * then mayOfferCard had no caller outside the tests, and a missed draft
 * question was offered as a flashcard on the lesson-complete screen.
 */
const DRAFT_CARD_IDS: ReadonlySet<string> = new Set(
  Object.values(ALL_POOLS)
    .flat()
    .flatMap((entry) => (entry.item.kind === "mcq" && !mayOfferCard(entry) ? [mcqCardId(entry.item.beat.id)] : [])),
);

export function isDraftCard(cardId: string): boolean {
  return DRAFT_CARD_IDS.has(cardId);
}
