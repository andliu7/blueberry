/**
 * Unit 2 (aromaticity) pools, a DRAFT for the owner's review.
 *
 * Everything lives in pools.ts, which scripts/u2_pools.py generates. This
 * file only re-exports it so other code imports "content/u2" and never the
 * generated file by name. The entry types are Unit 1's (../u1/types), reused
 * rather than copied, so one PoolEntry shape serves every unit.
 *
 * Nothing in the game reads these yet; wiring them into the map and the
 * runners is a separate piece. U2_PI_TALLY is the Huckel counter's per atom
 * output (drawn), kept as data for the tap-the-atom and type-the-count beats
 * that piece will need; nothing renders it either.
 */
export { U2_EXAM_IDS, U2_OPTION_TILES, U2_PI_TALLY, U2_POOLS, U2_SORT_FIGURES, U2_VISUALS } from "./pools";
export type { PiTally, PiTallyAtom } from "./pools";
