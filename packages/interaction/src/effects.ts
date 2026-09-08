/**
 * Things the shell should do that are not state.
 *
 * The reducer is pure, so it cannot buzz a phone or call a grader. It returns a
 * list of these instead and the shell performs them. This is the boring version
 * of the pattern; there is no effect queue, no scheduler, and no retry, because
 * both effects below are fire and forget.
 */

import type { ShapeDraft } from "./shapes/index.js";

/**
 * Haptic feedback, named by meaning rather than by waveform.
 *
 * The Budgets table gives interaction to visual feedback under 100 ms. A commit
 * that has to wait on a grader round trip cannot hit that, and a haptic tick can,
 * which is why `commit` fires the moment the arrow is accepted by the local
 * legality check rather than when a result comes back.
 */
export type HapticStyle = "selection" | "commit" | "refusal";

export type InteractionEffect =
  | { readonly kind: "haptic"; readonly style: HapticStyle }
  /**
   * Hand the finished draft to whatever grades this answer shape. Only the
   * mechanism shape has a grader in chem-core today; Phase 3 supplies the other
   * three in packages/curriculum. The effect is shape independent on purpose, so
   * adding those graders does not change this package.
   */
  | { readonly kind: "submitAttempt"; readonly draft: ShapeDraft };

export function haptic(style: HapticStyle): InteractionEffect {
  return { kind: "haptic", style };
}
