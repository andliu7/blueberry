/**
 * Unit 6 (spectroscopy and structure determination) pools, a DRAFT for the
 * owner's review.
 *
 * Everything lives in pools.ts, which scripts/u6_pools.py generates. This
 * file only re-exports it so other code imports "content/u6" and never the
 * generated file by name. The entry types are Unit 1's (../u1/types), reused
 * rather than copied, so one PoolEntry shape serves every unit.
 *
 * Who reads it: beats/practice/pools.ts (the lesson pools) and
 * beats/mcq/mcqFigures.ts (the question drawings and drawn options), each
 * through one fallback after the earlier units' tables. U6_UNWIRED (the
 * one drafted board still unplayed) is read by nothing but the suite yet:
 * see the header of pools.ts for why.
 */
export { U6_NMR_PRODUCT_KEY, U6_NMR_PRODUCT_POOLS } from "./nmrProduct";
export { U6_OPTION_TILES, U6_POOLS, U6_UNWIRED, U6_VISUALS } from "./pools";
