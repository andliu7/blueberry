import type { Status } from "@/components/QuestionCard";

/**
 * Where a deck's ratings live.
 *
 * Grignard keeps the original un-suffixed key rather than being migrated: it
 * was the only deck for months, and anyone mid-revision would otherwise open
 * the site to find their ratings gone.
 *
 * Lives here rather than in `App.tsx` so the hub and folder pages can read
 * progress without importing the study view.
 */
export const progressKey = (deckId: string) =>
  deckId === "grignard" ? "grignard_lcta_progress_v1" : `grignard_lcta_progress_${deckId}_v1`;

export function loadSaved(deckId: string): { status?: Record<number, Status>; note?: string } {
  try {
    const raw = localStorage.getItem(progressKey(deckId));
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === "object") return data;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** How many questions in this deck have been rated at all. */
export function reviewedCount(deckId: string): number {
  const status = loadSaved(deckId).status;
  if (!status) return 0;
  return Object.values(status).filter((s) => s === "red" || s === "yellow" || s === "green").length;
}
