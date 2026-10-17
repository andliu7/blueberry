/**
 * Unit 5 (alcohols, diols, ethers and epoxides) pools, a DRAFT for the
 * owner's review.
 *
 * Everything lives in pools.ts, which scripts/u5_pools.py generates. This
 * file only re-exports it so other code imports "content/u5" and never the
 * generated file by name. The entry types are Unit 1's (../u1/types), reused
 * rather than copied, so one PoolEntry shape serves every unit.
 *
 * Who reads it: beats/practice/pools.ts (the lesson pools) and
 * beats/mcq/mcqFigures.ts (the question drawings and drawn options), each
 * through one fallback after the earlier units' tables. U5_UNWIRED and
 * U5_SORT_FIGURES (the drafted ladders and board) are read by nothing but the
 * suite yet: see the header of pools.ts for why.
 */
export { U5_OPTION_TILES, U5_POOLS, U5_SORT_FIGURES, U5_UNWIRED, U5_VISUALS } from "./pools";
