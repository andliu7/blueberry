/**
 * When Bloom levels up, and when the "Bloom is evolving!" joke may play
 * (BLOOM-STATES-SPEC.md, C). Pure, and deliberately importing nothing: the
 * Hud calls stageChanged on the #/app first paint, and a file that imported
 * bloomMotion.ts here made the bundler split the constants into a chunk of
 * their own, half a KB gz on the first paint for two comparisons.
 */

/**
 * True when the HUD's stage went UP between two readings. A first reading
 * (nothing seen yet) is not a change, so opening the app never fires a level
 * up for a level that was earned last week; neither is a drop, which the
 * economy does not produce but which must never celebrate if it did.
 */
export function stageChanged(before: number | null, after: number | null): boolean {
  return before !== null && after !== null && after > before;
}

/**
 * The "Bloom is evolving!" joke plays at most once per stage. `playedThrough`
 * is the highest stage it has already played for (0 when it never has), kept
 * in one local key by the component. A stage reached again after a reset, or
 * the same stage seen twice, plays only the plain level up.
 */
export function shouldPlayEvolving(toStage: number, playedThrough: number): boolean {
  return Number.isFinite(toStage) && toStage > playedThrough;
}
