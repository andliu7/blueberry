/**
 * Unit 8 (carboxylic acids and their derivatives) pools, a DRAFT for the
 * owner's review.
 *
 * Everything lives in pools.ts, which scripts/u8_pools.py generates. This
 * file only re-exports it so other code imports "content/u8" and never the
 * generated file by name. The entry types are Unit 1's (../u1/types), reused
 * rather than copied, so one PoolEntry shape serves every unit.
 *
 * Who reads it: beats/practice/pools.ts (the lesson pools),
 * beats/mcq/mcqFigures.ts (the question drawings and drawn options) and
 * beats/PoolItemsStep.tsx (the sort card drawings), each through one
 * fallback after the earlier units' tables. Every pool in U8_POOLS is a
 * lesson pool. U8_UNWIRED holds the items drafted for u8-ladder, which keeps
 * its authored sort ladder and so may carry nothing else (beatRunner.test.ts,
 * "the ladder table"); nothing reads it until the owner decides.
 */
export { U8_OPTION_TILES, U8_POOLS, U8_SORT_FIGURES, U8_UNWIRED, U8_VISUALS } from "./pools";
