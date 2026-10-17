/**
 * Unit 4 (nucleophilic aromatic substitution and benzyne) pools, a DRAFT for
 * the owner's review.
 *
 * Everything lives in pools.ts, which scripts/u4_pools.py generates. This
 * file only re-exports it so other code imports "content/u4" and never the
 * generated file by name. The entry types are Unit 1's (../u1/types), reused
 * rather than copied, so one PoolEntry shape serves every unit.
 *
 * Who reads it: beats/practice/pools.ts (the lesson pools) and
 * beats/mcq/mcqFigures.ts (the question drawings and drawn options), each
 * through one fallback after the earlier units' tables. U4_UNWIRED and
 * U4_SORT_FIGURES (the drafted ladders and board) are read by nothing but the
 * suite yet: see the header of pools.ts for why.
 */
export { U4_OPTION_TILES, U4_POOLS, U4_SORT_FIGURES, U4_UNWIRED, U4_VISUALS } from "./pools";
