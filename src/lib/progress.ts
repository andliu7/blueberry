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

export interface RatingTally {
  red: number;
  yellow: number;
  green: number;
}

/** How this one deck's ratings break down. */
export function ratingTally(deckId: string): RatingTally {
  const status = loadSaved(deckId).status;
  const out: RatingTally = { red: 0, yellow: 0, green: 0 };
  if (!status) return out;
  for (const s of Object.values(status)) {
    if (s === "red" || s === "yellow" || s === "green") out[s] += 1;
  }
  return out;
}

/**
 * The same three numbers across a set of decks, plus which deck holds the most
 * of each colour.
 *
 * The "worst" deck is what makes the counts actionable rather than decorative:
 * knowing you have 31 red cards is trivia, and being sent to the deck holding
 * 19 of them is a decision. Ties resolve to the first deck seen, which is the
 * registry's own order, so the answer is at least stable between renders.
 *
 * Reads localStorage once per deck, so callers should memoise on the deck list
 * rather than calling this inside a row.
 */
export function tallyAcross(deckIds: string[]): {
  total: RatingTally;
  worst: { red?: string; yellow?: string; green?: string };
} {
  const total: RatingTally = { red: 0, yellow: 0, green: 0 };
  const best: RatingTally = { red: 0, yellow: 0, green: 0 };
  const worst: { red?: string; yellow?: string; green?: string } = {};

  for (const id of deckIds) {
    const t = ratingTally(id);
    for (const key of ["red", "yellow", "green"] as const) {
      total[key] += t[key];
      if (t[key] > best[key]) {
        best[key] = t[key];
        worst[key] = id;
      }
    }
  }

  return { total, worst };
}
