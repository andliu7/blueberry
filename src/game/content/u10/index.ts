/**
 * Unit 10 (amines and diazonium chemistry) pools, a DRAFT for the owner's
 * review.
 *
 * Everything lives in pools.ts, which scripts/u10_pools.py generates. This
 * file only re-exports it so other code imports "content/u10" and never the
 * generated file by name. The entry types are Unit 1's (../u1/types), reused
 * rather than copied, so one PoolEntry shape serves every unit.
 *
 * Who reads it: beats/practice/pools.ts (the lesson pools),
 * beats/mcq/mcqFigures.ts (the question drawings and drawn options) and
 * beats/PoolItemsStep.tsx (the sort card drawings), each through one
 * fallback after the earlier units' tables. Every pool in U10_POOLS is a
 * lesson pool.
 */
export { U10_OPTION_TILES, U10_POOLS, U10_SORT_FIGURES, U10_VISUALS } from "./pools";
