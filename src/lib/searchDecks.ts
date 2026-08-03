import { isReference, type Deck } from "@/data/types";

/**
 * Search across every deck and everything inside it.
 *
 * Hand-rolled rather than pulling in a fuzzy-search dependency: the whole corpus
 * is a few hundred short strings held in memory, so the naive scan costs less
 * than the library would add to a bundle Vite already warns about. Scoring is
 * deliberately crude, because ranking barely matters at this size; what matters
 * is that a match in a question beats a match buried in an answer.
 */

export interface SearchHit {
  deck: Deck;
  kind: "deck" | "question" | "row";
  title: string;
  detail: string;
  score: number;
}

/** Answers carry inline HTML and LaTeX. Neither should be searchable noise. */
const plain = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[$_^{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreOf = (haystack: string, needle: string, weight: number) => {
  const h = haystack.toLowerCase();
  const i = h.indexOf(needle);
  if (i === -1) return 0;
  // A hit at a word boundary is worth more than one inside a longer word, and
  // a short field matching is worth more than a long one happening to contain it.
  const boundary = i === 0 || /\W/.test(h[i - 1]!) ? 1.4 : 1;
  return weight * boundary * (1 + needle.length / Math.max(h.length, 1));
};

const snippet = (text: string, needle: string, span = 90) => {
  const i = text.toLowerCase().indexOf(needle);
  if (i === -1) return text.slice(0, span);
  const start = Math.max(0, i - span / 3);
  return (start > 0 ? "…" : "") + text.slice(start, start + span).trim() + "…";
};

export function searchDecks(decks: Deck[], rawQuery: string, limit = 24): SearchHit[] {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 2) return [];

  const hits: SearchHit[] = [];

  for (const deck of decks) {
    const deckScore =
      scoreOf(deck.title, q, 100) + scoreOf(deck.short ?? "", q, 90) + scoreOf(deck.blurb, q, 45);
    if (deckScore > 0) {
      hits.push({ deck, kind: "deck", title: deck.title, detail: deck.blurb, score: deckScore });
    }

    if (isReference(deck)) {
      for (const group of deck.groups) {
        for (const item of group.items) {
          const s =
            scoreOf(item.title, q, 70) +
            scoreOf(item.description, q, 40) +
            scoreOf(item.badge, q, 55);
          if (s > 0) {
            hits.push({
              deck,
              kind: "row",
              title: item.title,
              detail: `${item.description} · ${item.badge}`,
              score: s,
            });
          }
        }
      }
      continue;
    }

    deck.questions.forEach((item, i) => {
      const question = plain(item.q);
      const answer = plain(item.a);
      const s = scoreOf(question, q, 65) + scoreOf(answer, q, 28);
      if (s > 0) {
        hits.push({
          deck,
          kind: "question",
          title: `${i + 1}. ${question}`,
          detail: snippet(answer, q),
          score: s,
        });
      }
    });
  }

  // Decks always come before the cards inside them. Ranking purely on score
  // let a question that happens to say "grignard" three times outrank the
  // Grignard deck itself, which is never what someone typing a deck name
  // wants. Within each kind, score still decides.
  const rank = { deck: 0, row: 1, question: 1 } as const;
  return hits
    .sort((a, b) => rank[a.kind] - rank[b.kind] || b.score - a.score)
    .slice(0, limit);
}

/** Deck ids with any hit, for filtering the hub down to what matched. */
export function matchedDeckIds(hits: SearchHit[]): Set<string> {
  return new Set(hits.map((h) => h.deck.id));
}
