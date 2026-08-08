import { DECK_GROUPS, deckHref, isReference, type Deck } from "@/data/types";

/**
 * Search across the folders, every deck, and everything inside them.
 *
 * Hand-rolled rather than pulling in a fuzzy-search dependency: the whole corpus
 * is a few hundred short strings held in memory, so the naive scan costs less
 * than the library would add to a bundle Vite already warns about. Scoring is
 * deliberately crude, because ranking barely matters at this size; what matters
 * is that a match in a question beats a match buried in an answer.
 *
 * **A hit carries where it goes rather than what it is.** It used to hand back a
 * `deck`, which meant every consumer knew how to turn a deck into a link — and
 * meant a folder could not be a result at all, because a folder is not a deck.
 * Searching "carbonyls" found nothing, since the word is a folder name and no
 * deck is called it. Now a hit is a row: a link, a label, a title and a detail.
 */

export interface SearchHit {
  kind: "folder" | "deck" | "question" | "row";
  /** Where the row goes when followed. */
  href: string;
  /** The small line above the title, naming what this result sits in. */
  label: string;
  title: string;
  detail: string;
  score: number;
  /**
   * The decks this hit implies, for filtering the hub down.
   *
   * A folder hit carries every deck inside it, so searching a folder name leaves
   * that whole folder on screen rather than emptying the page.
   */
  deckIds: string[];
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

  // Folders first. `DECK_GROUPS` is imported rather than passed because it is
  // static site structure, not a prop: every caller would otherwise have to hand
  // in the same array to get folder results at all.
  for (const group of DECK_GROUPS) {
    const inside = decks.filter((d) => (d.group ?? "lab") === group.id);
    const score = scoreOf(group.title, q, 130) + scoreOf(group.blurb, q, 40);
    if (score > 0) {
      hits.push({
        kind: "folder",
        href: `#/folder/${group.id}`,
        label: "Folder",
        title: group.title,
        detail: `${inside.length} ${inside.length === 1 ? "deck" : "decks"} · ${group.blurb}`,
        score,
        deckIds: inside.map((d) => d.id),
      });
    }
  }

  for (const deck of decks) {
    const href = deckHref(deck);
    const label = deck.short ?? deck.title;

    const deckScore =
      scoreOf(deck.title, q, 100) + scoreOf(deck.short ?? "", q, 90) + scoreOf(deck.blurb, q, 45);
    if (deckScore > 0) {
      hits.push({
        kind: "deck",
        href,
        label: "Deck",
        title: deck.title,
        detail: deck.blurb,
        score: deckScore,
        deckIds: [deck.id],
      });
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
              kind: "row",
              href,
              label,
              title: item.title,
              detail: `${item.description} · ${item.badge}`,
              score: s,
              deckIds: [deck.id],
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
          kind: "question",
          href,
          label,
          title: `${i + 1}. ${question}`,
          detail: snippet(answer, q),
          score: s,
          deckIds: [deck.id],
        });
      }
    });
  }

  // Folders, then decks, then the cards inside them. Ranking purely on score let
  // a question that happens to say "grignard" three times outrank the Grignard
  // deck itself, which is never what someone typing a name wants — and a folder
  // name is an even stronger signal, since nothing else is called that.
  const rank = { folder: 0, deck: 1, row: 2, question: 2 } as const;
  return hits
    .sort((a, b) => rank[a.kind] - rank[b.kind] || b.score - a.score)
    .slice(0, limit);
}

/** Deck ids with any hit, for filtering the hub down to what matched. */
export function matchedDeckIds(hits: SearchHit[]): Set<string> {
  return new Set(hits.flatMap((h) => h.deckIds));
}
