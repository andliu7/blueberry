/**
 * The mistake journal. Owner requirement, 2026-08-26: "each mistake made
 * should save."
 *
 * Same contract as app/progress.ts, stated in the same words: localStorage
 * here is a RENDERING CACHE and a review-queue seed, never an entitlement
 * and never the record of record. Phase 6 syncs mistakes into the
 * append-only attempt history server side; this file is the seam it swaps
 * behind. Capped so a semester of drilling cannot grow an unbounded blob.
 */

export interface SavedMistake {
  readonly reactionId: string;
  /** The arrow the student drew, as its stable key. */
  readonly arrowKey: string;
  readonly verdict: "invalid" | "not_requested";
  /** The named cause, when Tier 1 resolved one. */
  readonly causeId: string | null;
  /** Whether an authored distractor matched (Tier 2). */
  readonly distractorMatched: boolean;
  readonly at: string;
}

const KEY = "blueberry.trainer.mistakes.v1";
const CAP = 300;

export function saveMistake(mistake: SavedMistake): void {
  try {
    const existing = loadMistakes();
    const next = [...existing, mistake].slice(-CAP);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked; a mistake journal is never load-bearing.
  }
}

export function loadMistakes(): readonly SavedMistake[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedMistake[]) : [];
  } catch {
    return [];
  }
}

export function mistakeCount(): number {
  return loadMistakes().length;
}
