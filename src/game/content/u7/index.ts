/**
 * Unit 7 (aldehydes and ketones: nucleophilic addition) pools, a DRAFT for the
 * owner's review.
 *
 * Everything lives in pools.ts, which scripts/u7_pools.py generates. This
 * file only re-exports it so other code imports "content/u7" and never the
 * generated file by name. The entry types are Unit 1's (../u1/types), reused
 * rather than copied, so one PoolEntry shape serves every unit.
 *
 * Who reads it: beats/practice/pools.ts (the lesson pools),
 * beats/mcq/mcqFigures.ts (the question drawings and drawn options) and
 * beats/PoolItemsStep.tsx (the sort card drawings), each through one
 * fallback after the earlier units' tables. Every Unit 7 pool is a lesson
 * pool; there is no unwired exam set.
 */
export { U7_OPTION_TILES, U7_POOLS, U7_SORT_FIGURES, U7_VISUALS } from "./pools";
