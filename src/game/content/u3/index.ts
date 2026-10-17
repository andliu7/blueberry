/**
 * Unit 3 (electrophilic aromatic substitution) pools, a DRAFT for the owner's review.
 *
 * Everything lives in pools.ts, which scripts/u3_pools.py generates. This
 * file only re-exports it so other code imports "content/u3" and never the
 * generated file by name. The entry types are Unit 1's (../u1/types), reused
 * rather than copied, so one PoolEntry shape serves every unit.
 *
 * Who reads it: beats/practice/pools.ts (the lesson pools) and
 * beats/mcq/mcqFigures.ts (the question drawings and drawn options), each
 * through one fallback after Unit 1's table. U3_UNWIRED and U3_SORT_FIGURES
 * (the drafted ladders and boards) are read by nothing but the suite yet: see
 * the header of pools.ts for why.
 */
export { U3_OPTION_TILES, U3_POOLS, U3_SORT_FIGURES, U3_UNWIRED, U3_VISUALS } from "./pools";
