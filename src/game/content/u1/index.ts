/**
 * Unit 1's problem pools, merged into one table keyed by pathway node id.
 *
 * Each stage file is authored (generated) on its own and exports one
 * UnitPools. Merging here is the only place they meet, so the two rules that
 * span files are checked here, at import time, and a break fails the suite
 * rather than reaching a student:
 *
 *   - a node's pool lives in ONE stage file (two files writing one node is a
 *     merge accident, not a bigger pool)
 *   - an entry id is unique across the unit, because a requeue and any stored
 *     progress key on it
 */
import type { McqVisual, NamedFigure } from "../../beats/mcq/mcqFigures";
import type { PoolEntry, UnitPools } from "./types";
import { STAGE_AB_OPTION_TILES, STAGE_AB_POOLS, STAGE_AB_SORT_FIGURES, STAGE_AB_VISUALS } from "./stage-ab";
import { STAGE_CD_OPTION_TILES, STAGE_CD_POOLS, STAGE_CD_VISUALS } from "./stage-cd";
import { STAGE_CD_ACTIVE, type ActiveEntry } from "./stage-cd.active";

export function mergePools(...parts: readonly UnitPools[]): UnitPools {
  const merged: Record<string, readonly PoolEntry[]> = {};
  const seen = new Set<string>();
  for (const part of parts) {
    for (const [node, entries] of Object.entries(part)) {
      if (merged[node] !== undefined) throw new Error(`u1 pools: ${node} is written by two stage files`);
      for (const entry of entries) {
        if (seen.has(entry.id)) throw new Error(`u1 pools: entry id ${entry.id} is used twice`);
        seen.add(entry.id);
      }
      merged[node] = entries;
    }
  }
  return Object.freeze(merged);
}

/**
 * `u1-exam` is a key the stage files write for the unit exam's items. The
 * map's exam is the synthetic checkpoint u1-check, which plays them, with the
 * stage A and B quizzes, as an in-a-row run (beats/practice/pools.ts).
 */
export const U1_POOLS: UnitPools = withActive(mergePools(STAGE_AB_POOLS, STAGE_CD_POOLS), STAGE_CD_ACTIVE);

/**
 * Stage C/D's generated active items (stage-cd.active.ts: "Draw it" and match
 * boards, U1-P3) JOIN the nodes stage-cd.ts already writes, which is why this
 * is not mergePools: one node, two files, on purpose. Each goes in at its `at`
 * (an in-a-row run plays the pool in order) or at the end. The id rule still
 * holds across the unit and throws on a repeat.
 */
function withActive(pools: UnitPools, active: Readonly<Record<string, readonly ActiveEntry[]>>): UnitPools {
  const out: Record<string, readonly PoolEntry[]> = { ...pools };
  const seen = new Set(Object.values(pools).flatMap((entries) => entries.map((entry) => entry.id)));
  for (const [node, adds] of Object.entries(active)) {
    const list = [...(out[node] ?? [])];
    for (const { at, entry } of adds) {
      if (seen.has(entry.id)) throw new Error(`u1 pools: entry id ${entry.id} is used twice`);
      seen.add(entry.id);
      list.splice(at === undefined ? list.length : Math.min(at, list.length), 0, entry);
    }
    out[node] = list;
  }
  return Object.freeze(out);
}

/** Keyed tables merged the same way: a key written twice is an error, never an overwrite. */
function mergeTables<T>(label: string, ...tables: readonly Readonly<Record<string, T>>[]): Readonly<Record<string, T>> {
  const merged: Record<string, T> = {};
  for (const table of tables) {
    for (const [key, value] of Object.entries(table)) {
      if (key in merged) throw new Error(`u1 ${label}: ${key} is written twice`);
      merged[key] = value;
    }
  }
  return Object.freeze(merged);
}

/** The question drawing for each pool MCQ, by beat id. Read by beats/mcq/mcqFigures.ts. */
export const U1_VISUALS: Readonly<Record<string, McqVisual>> = mergeTables("visuals", STAGE_AB_VISUALS, STAGE_CD_VISUALS);

/** Drawn options for each pool MCQ that has them, by beat id. Read by beats/mcq/mcqFigures.ts. */
export const U1_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = mergeTables(
  "option tiles",
  STAGE_AB_OPTION_TILES,
  STAGE_CD_OPTION_TILES,
);

/** A drawing per sort card, keyed by ladder (entry) id then card id. Read by beats/practice/PracticeRunner.tsx. */
export const U1_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = mergeTables(
  "sort figures",
  STAGE_AB_SORT_FIGURES,
);
