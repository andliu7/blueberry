/**
 * Unit 2 (aromaticity) pools, a DRAFT for the owner's review.
 *
 * Everything lives in pools.ts, which scripts/u2_pools.py generates. This
 * file only re-exports it so other code imports "content/u2" and never the
 * generated file by name. The entry types are Unit 1's (../u1/types), reused
 * rather than copied, so one PoolEntry shape serves every unit.
 *
 * Wired since 2026-10-17: beats/practice/pools.ts merges U2_POOLS into the
 * pool lookup and builds the u2-check exam from U2_EXAM_IDS; mcqFigures.ts and
 * PracticeRunner.tsx fall back to U2_VISUALS, U2_OPTION_TILES and
 * U2_SORT_FIGURES. U2_PI_TALLY (the Huckel counter's per atom output) is kept
 * as data for a later tap-the-atom beat; nothing renders it yet.
 */
export { U2_EXAM_IDS, U2_OPTION_TILES, U2_PI_TALLY, U2_POOLS, U2_SORT_FIGURES, U2_VISUALS } from "./pools";
export type { PiTally, PiTallyAtom } from "./pools";
