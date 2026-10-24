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
 * lesson pool, u8-ladder's included (wired 23 Oct; its authored sort stays
 * the order step). U8_TEST_ONLY holds held-out twins that only test-outs draw
 * (beats/practice/pools.ts testOnlyPool).
 */
export { U8_OPTION_TILES, U8_POOLS, U8_SORT_FIGURES, U8_TEST_ONLY, U8_VISUALS } from "./pools";
