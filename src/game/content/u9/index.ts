/**
 * Unit 9 (enols and enolates, alpha-carbon chemistry) pools, a DRAFT for the
 * owner's review.
 *
 * Everything lives in pools.ts, which scripts/u9_pools.py generates. This
 * file only re-exports it so other code imports "content/u9" and never the
 * generated file by name. The entry types are Unit 1's (../u1/types), reused
 * rather than copied, so one PoolEntry shape serves every unit.
 *
 * Who reads it: beats/practice/pools.ts (the lesson pools),
 * beats/mcq/mcqFigures.ts (the question drawings and drawn options) and
 * beats/PoolItemsStep.tsx (the sort card drawings), each through one
 * fallback after the earlier units' tables. Every pool in U9_POOLS is a
 * lesson pool.
 */
export { U9_OPTION_TILES, U9_POOLS, U9_SORT_FIGURES, U9_VISUALS } from "./pools";
