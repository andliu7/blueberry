/**
 * What a review checkpoint plays: a few problems from each lesson it
 * reviews, interleaved, so any short run already samples every lesson.
 *
 * Reuses the run engine's own `interleave` and the Unit 1 pools as they are;
 * nothing here authors a problem. Every entry is still the draft its lesson
 * owns (placeholder: true), so the run carries the draft mark like any other.
 *
 * TWO CHOICES, both from the round 1 critic:
 *   - the newest lesson goes FIRST in every round, so the lesson right above
 *     the checkpoint is always asked about (it used to be last, and a clean
 *     clear ended before reaching it)
 *   - `attempt` turns each lesson's window through its pool, and the first
 *     try skips the lesson's own opening question, which the student has
 *     just answered in the lesson
 *
 * WHAT A RETRY CHANGES, measured in round 3 (the round 2 copy overclaimed).
 * Three of the four Diels-Alder lessons own exactly three problems, so a
 * three-problem window over them is the whole pool on every try: no window
 * can bring NEW questions there. What a retry can change, it does: the window
 * steps by one through a pool no bigger than the window, so each try opens
 * those lessons on a different question, and a lesson with a bigger pool
 * (MO ladders, twelve) steps a whole window and asks new ones. The end
 * screen says exactly that, no more.
 *
 * Kept apart from reviewCheckpoints.ts because importing the pools pulls the
 * whole of content/u1 in, and the pathway itself must not.
 */
import { interleave } from "../../beats/practice/pools";
import { U1_POOLS } from "../../content/u1";
import type { PoolEntry, UnitPools } from "../../content/u1/types";
import type { ReviewCheckpoint } from "./reviewCheckpoints";

/** How many problems each reviewed lesson lends the review. Four lessons give a run of twelve. */
export const PER_LESSON = 3;

export interface ReviewEntry {
  readonly entry: PoolEntry;
  /** The lesson this problem came from, handed to the surfaces that look things up by node. */
  readonly source: string;
}

/**
 * PER_LESSON problems from one pool, starting further in on every attempt and
 * wrapping round. The step is a whole window when the pool has more than one
 * window in it (new questions), and one problem otherwise: stepping a
 * three-problem pool by three lands on the same start every time, which is
 * the round 2 bug (the same opening three on every retry).
 */
export function windowOf<T>(pool: readonly T[], attempt: number): readonly T[] {
  if (pool.length === 0) return [];
  const count = Math.min(PER_LESSON, pool.length);
  const step = pool.length > PER_LESSON ? PER_LESSON : 1;
  const start = (1 + attempt * step) % pool.length;
  return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]!);
}

export function reviewPool(review: ReviewCheckpoint, pools: UnitPools = U1_POOLS, attempt = 0): readonly ReviewEntry[] {
  const newestFirst = [...review.reviews].reverse();
  return interleave(...newestFirst.map((source) => windowOf(pools[source] ?? [], attempt).map((entry) => ({ entry, source }))));
}
