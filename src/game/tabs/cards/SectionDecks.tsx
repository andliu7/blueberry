/**
 * The premade section decks on the Cards tab (STATUS D2): a shelf listing
 * them by unit, and the set page one opens. Both are loaded with React.lazy
 * from CardsTab and CardsShelf, so the decks' code is fetched only when a
 * student opens the Cards tab, and each unit's cards (cards/sections/
 * uN.generated.ts) only when one of that unit's decks is opened.
 *
 * A premade deck is browse only until the student presses Learn: that copies
 * it into their own store (adoptSectionDeck), where the existing spaced
 * review run schedules it and "From your lessons" lists it.
 */
import { useEffect, useState } from "react";
import type { Card, DeckSnapshot, DeckSource } from "../../cards/types";
import { PATHWAY_UNITS } from "../../demo/pathwayMap";
import {
  adoptSectionDeck,
  assembleSectionDeck,
  loadUnitCards,
  resolveSectionDeck,
  SECTION_UNITS,
  sectionDecksFor,
  sectionDeckSize,
  type SectionDeckRef,
} from "../../cards/sections/sectionDecks";
import { sectionDeckHref } from "../../cards/sections/sectionRoute";
import { hrefForTab } from "../../app/routes";
import { DeckSet } from "./DeckSet";
import { ChevronIcon, FlashcardsIcon } from "./StudyIcons";
import { isStudyMode, type StudyMode } from "./studyModel";
import { plural } from "@/lib/helpers";

/** "Unit 3 · Electrophilic Aromatic Substitution", or Unit 0's own name. */
export function unitHeading(unitId: string): string {
  return PATHWAY_UNITS.find((unit) => unit.id === unitId)?.title ?? "Unit 0 · Start here";
}

/** What the shelf lists: every unit with decks, and each deck with its size. */
export function sectionShelfModel(): readonly { readonly unitId: string; readonly heading: string; readonly decks: readonly { readonly ref: SectionDeckRef; readonly size: number; readonly href: string }[] }[] {
  return SECTION_UNITS.map((unitId) => ({
    unitId,
    heading: unitHeading(unitId),
    decks: sectionDecksFor(unitId).map((ref) => ({ ref, size: sectionDeckSize(ref), href: sectionDeckHref(unitId, ref.key) })),
  })).filter((unit) => unit.decks.length > 0);
}

/** The shelf group: one fold per unit, its decks inside as links. */
export function SectionShelf() {
  const units = sectionShelfModel();
  return (
    <section className="ct-shelf__group" aria-labelledby="ct-premade-title">
      <h2 id="ct-premade-title" className="ct-shelf__title">
        Flashcards for every section
      </h2>
      <p className="ct-deck__meta">Premade from each unit's lessons. Open one to flip through it, or press Learn to add it to your review.</p>
      {units.map((unit) => (
        // <details> is the browser's own fold: no state to keep, and it opens from the keyboard.
        <details key={unit.unitId} className="ct-premade">
          <summary className="ct-premade__head">
            <span className="ct-deck__title">{unit.heading}</span>
            <span className="ct-deck__meta">{plural(unit.decks.length, "deck", "decks")}</span>
          </summary>
          <ul className="ct-deck-list">
            {unit.decks.map(({ ref, size, href }) => (
              <li key={ref.id}>
                <a className="ct-deck ct-deck--link" href={href}>
                  <span className="ct-ring" aria-hidden="true">
                    <FlashcardsIcon className="ct-ring__icon" />
                  </span>
                  <span className="ct-deck__body">
                    <span className="ct-deck__title">{ref.title}</span>
                    <span className="ct-deck__meta">{plural(size, "card", "cards")}</span>
                  </span>
                  <ChevronIcon className="ct-deck__chev" />
                </a>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}

export interface SectionDeckScreenProps {
  readonly unitId: string;
  readonly deckKey: string;
  readonly mode: string | undefined;
  readonly snapshot: DeckSnapshot;
  readonly source: DeckSource;
  readonly reducedMotion: boolean;
  readonly onLearn: (cards: readonly Card[]) => void;
}

/** One premade deck as a set page: the same DeckSet every deck uses. */
export function SectionDeckScreen({ unitId, deckKey, mode, snapshot, source, reducedMotion, onLearn }: SectionDeckScreenProps) {
  const ref = resolveSectionDeck(unitId, deckKey);
  const [cards, setCards] = useState<readonly Card[] | null>(null);

  useEffect(() => {
    if (ref === null) return;
    // `live` drops a fetch that lands after the student has left this deck.
    let live = true;
    setCards(null);
    void loadUnitCards(ref.unitId).then((seeds) => {
      if (live) setCards(assembleSectionDeck(ref, seeds));
    });
    return () => {
      live = false;
    };
  }, [ref]);

  if (ref === null) {
    return (
      <div className="ct-set">
        <p className="ct-empty">That deck isn't here any more.</p>
        <a className="ct-btn ct-btn--go" href={hrefForTab("cards")}>
          Back to your decks
        </a>
      </div>
    );
  }
  if (cards === null) {
    return (
      <div className="ct-set">
        <p className="ct-empty" role="status">
          Opening {ref.title}...
        </p>
      </div>
    );
  }
  const studyMode: StudyMode = isStudyMode(mode) ? mode : "flashcards";
  return (
    <DeckSet
      deckId={ref.id}
      title={`${ref.unitLabel} · ${ref.title}`}
      cards={cards}
      snapshot={snapshot}
      // Not a stored deck until adopted, so there is no file to export yet.
      exportable={false}
      mode={studyMode}
      reducedMotion={reducedMotion}
      onMode={(next) => window.location.replace(sectionDeckHref(ref.unitId, ref.key, next))}
      onBack={() => window.history.length > 1 ? window.history.back() : window.location.assign(hrefForTab("cards"))}
      onLearn={(picked) => {
        adoptSectionDeck(source, ref, cards);
        onLearn(picked);
      }}
      onRemove={(card) => source.removeCard(card.id)}
    />
  );
}
