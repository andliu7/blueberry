import { DECK_GROUPS, deckCount, deckHref, isReference, type Deck } from "@/data/types";
import { ratingTally } from "@/lib/progress";
import { cardsWord, tallyWords } from "@/lib/reviewProgress";

/**
 * One deck as a Review tile (SITE-REPLAN.md phase 7; blueberry skill components.md 3).
 *
 * Quizlet's shape: a shell tinted by the deck's folder, with the folder's name on it,
 * around a white panel holding the deck. The whole tile is one link, and it has the
 * ledge, so it sinks on press like every other pressable on the site.
 *
 * Progress is words ("Got it 4 · Unsure 2 · Missed 1"), never coloured dots, and a
 * reference sheet, which is read rather than rated, says how many rows it has instead.
 */
export function DeckTile({ deck }: { deck: Deck }) {
  const total = deckCount(deck);
  const folder = deck.group ?? "lab";
  const label = DECK_GROUPS.find((g) => g.id === folder)?.title ?? "";

  if (isReference(deck)) {
    return (
      <a href={deckHref(deck)} className="rv-tile" data-folder={folder}>
        <span className="rv-tile__label">{label}</span>
        <span className="rv-tile__panel">
          <span className="rv-tile__title">{deck.title}</span>
          <span className="rv-tile__meta">{total} rows to look up</span>
        </span>
      </a>
    );
  }

  const t = ratingTally(deck.id);
  const rated = t.red + t.yellow + t.green;
  return (
    <a href={deckHref(deck)} className="rv-tile" data-folder={folder}>
      <span className="rv-tile__label">{label}</span>
      <span className="rv-tile__panel">
        <span className="rv-tile__title">{deck.title}</span>
        <span className="rv-tile__meta">{cardsWord(total)}</span>
        {/* The bar is decoration for the words beside it, so it is hidden from
            screen readers; the words carry the numbers. */}
        <span className="rv-mastery mt-auto" aria-hidden>
          <i style={{ width: `${total ? (t.green / total) * 100 : 0}%` }} />
        </span>
        <span className="rv-tile__meta">{rated ? tallyWords(t) : "Not started"}</span>
      </span>
    </a>
  );
}
