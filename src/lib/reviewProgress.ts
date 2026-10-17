import { isReference, type Deck } from "@/data/types";
import { ratingTally, type RatingTally } from "@/lib/progress";

/**
 * The words Review uses for a deck's progress (SITE-REPLAN.md phase 7).
 *
 * WHY WORDS. The old deck toolbar showed three coloured dots with a bare number
 * beside each, and "4 / 44 reviewed" in grey: a student had to know that red meant
 * "Review" and yellow "Almost" before the numbers said anything (audit K3). Every
 * count on Review now carries its own label, and these three names are the ones the
 * rate buttons wear, so the button you press and the number it moves read the same.
 *
 * The saved ratings keep their old colour keys (red, yellow, green) so nobody's
 * progress is lost; only what a student reads changed.
 */
export const RATING_WORDS = { green: "Got it", yellow: "Unsure", red: "Missed" } as const;

/** "Got it 4 · Unsure 2 · Missed 1", or "Not started" when nothing is rated yet. */
export function tallyWords(t: RatingTally): string {
  if (t.red + t.yellow + t.green === 0) return "Not started";
  return `${RATING_WORDS.green} ${t.green} · ${RATING_WORDS.yellow} ${t.yellow} · ${RATING_WORDS.red} ${t.red}`;
}

/** "44 cards", "1 card". */
export const cardsWord = (n: number) => `${n} ${n === 1 ? "card" : "cards"}`;

/**
 * Due today: every card a student marked Missed or Unsure, across the study decks,
 * and the deck that holds the most of them (where the Review button goes).
 *
 * WHAT "DUE" MEANS HERE, honestly. Site decks have no scheduler: a rating is saved in
 * this browser and nothing else (owner, 17 Sep: card saving stays local). So "due" is
 * the cards you said you did not know, which is what you would review tonight anyway.
 * The game's Cards tab has a real spaced-repetition queue; the two merge in phase 10.
 */
export function dueAcross(decks: Deck[]): { count: number; deckId: string | null } {
  let count = 0;
  let best = 0;
  let deckId: string | null = null;
  for (const d of decks) {
    if (isReference(d)) continue;
    const t = ratingTally(d.id);
    const due = t.red + t.yellow;
    count += due;
    if (due > best) {
      best = due;
      deckId = d.id;
    }
  }
  return { count, deckId };
}
