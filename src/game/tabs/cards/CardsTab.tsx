/**
 * Cards: the spaced repetition deck, and the third of the five tabs.
 *
 * WHY IT IS A TAB. CLAUDE.md's learning science section cites the AAMC's
 * 2020 to 2024 self study data, flashcard use up from 67.4 to 71.4 percent
 * of examinees and free flashcard programs from 37.3 to 50.2, as evidence
 * for both the Anki style scheduler and "a flashcard surface the product
 * does not yet have". The old `#/review` hash still works: routes.ts maps it
 * onto this tab.
 *
 * THE SCREENS (rebuilt 15 Oct 2026, owner direction "decks are Quizlet
 * style"), each with its own address so the back button and a shared link
 * both work:
 *   #/app/cards                       the shelf (CardsShelf.tsx), app chrome
 *   #/app/cards/deck/<id>/<mode>      a deck as a set page (DeckSet.tsx);
 *                                     mode is flashcards, learn, test, match
 *                                     or write, flashcards when left off
 *   #/app/cards/new                   the composer (cards/ui ComposeScreen)
 * The review run (cards/ui Run.tsx) is an overlay over whichever screen
 * started it, as before.
 *
 * The cards engine (store, scheduler, run, composer, models) lives in
 * src/game/cards and is imported, never copied. The previous screens there
 * (CardsHome, Home, DeckScreen) are no longer mounted by this tab.
 *
 * THE BAR HIDES DURING A RUN, deliberately: a review is a full screen task
 * with its own way out. The shell owns the boolean and passes a setter down
 * ("lifting state up"); immersion is reported from an effect so leaving by
 * any route restores the bar.
 */

import { useEffect, useMemo, useState } from "react";
import type { Card } from "../../cards/types";
import { cardsIn } from "../../cards/types";
import { decks, PERSONAL_DECK_ID } from "../../cards/store";
import { migrateLegacySavedCards } from "../../cards/migrateSavedCards";
import { seedStarterDeck } from "../../cards/seed";
import { adoptMistakeDrafts } from "../../cards/ui/CardsHome";
import { ComposeScreen } from "../../cards/ui/ComposeScreen";
import { MISTAKES_DECK_ID, MISTAKES_DECK_TITLE, mistakeDeckCards } from "../../cards/ui/landing";
import { Run } from "../../cards/ui/Run";
import { useDeckSnapshot } from "../../cards/ui/useDeck";
import { useReducedMotion } from "../../app/hooks";
import { progress } from "../../app/progress";
import { hrefForTab } from "../../app/routes";
import { navigate, useHashRoute } from "../../app/useHashRoute";
import { loadMistakes } from "../trainer/mistakes";
import { CardsShelf } from "./CardsShelf";
import { DeckSet } from "./DeckSet";
import { isStudyMode, type StudyMode } from "./studyModel";
import "./cardsTab.css";

export interface CardsTabProps {
  /** Told when a full screen session starts and ends, so the shell can hide the bar. */
  readonly onImmersiveChange?: (immersive: boolean) => void;
}

export default function CardsTab({ onImmersiveChange }: CardsTabProps) {
  const source = decks;
  const route = useHashRoute();
  const rest = route.kind === "tab" ? route.rest : [];
  const reducedMotion = useReducedMotion();
  const snapshot = useDeckSnapshot(source);
  const [run, setRun] = useState<readonly Card[] | null>(null);
  // Re-read the trainer's journal whenever the store changes: a save
  // elsewhere in the game is the moment a mistake may have become a card.
  const journal = useMemo(() => loadMistakes(), [snapshot]);

  // First visit housekeeping, in this order: old draw-page saves move into
  // the personal deck, then the starter deck seeds if this is a first run.
  useEffect(() => {
    migrateLegacySavedCards(source, PERSONAL_DECK_ID);
    seedStarterDeck(source);
  }, [source]);

  const immersive = run !== null;
  useEffect(() => {
    onImmersiveChange?.(immersive);
    return () => onImmersiveChange?.(false);
  }, [immersive, onImmersiveChange]);

  const startRun = (cards: readonly Card[]): void => {
    if (cards.length === 0) return;
    adoptMistakeDrafts(source, cards);
    setRun(cards);
  };

  let body;
  if (rest[0] === "new") {
    body = <ComposeScreen snapshot={snapshot} source={source} onBack={() => navigate(hrefForTab("cards"))} />;
  } else if (rest[0] === "deck" && rest[1] !== undefined) {
    const deckId = rest[1];
    const mode: StudyMode = isStudyMode(rest[2]) ? rest[2] : "flashcards";
    const isMistakes = deckId === MISTAKES_DECK_ID;
    const stored = snapshot.decks[deckId];
    if (!isMistakes && stored === undefined) {
      body = (
        <div className="ct-set">
          <p className="ct-empty">That deck isn't here any more.</p>
          <a className="ct-btn ct-btn--go" href={hrefForTab("cards")}>
            Back to your decks
          </a>
        </div>
      );
    } else {
      body = (
        <DeckSet
          deckId={deckId}
          title={isMistakes ? MISTAKES_DECK_TITLE : (stored?.title ?? deckId)}
          cards={isMistakes ? mistakeDeckCards(snapshot, journal) : cardsIn(snapshot, deckId)}
          snapshot={snapshot}
          exportable={!isMistakes}
          mode={mode}
          reducedMotion={reducedMotion}
          // Replace, not push: switching modes should not fill the back
          // button with five entries for one deck.
          onMode={(next) => window.location.replace(hrefForTab("cards", "deck", deckId, next))}
          onBack={() => navigate(hrefForTab("cards"))}
          onLearn={startRun}
          onRemove={(card) => source.removeCard(card.id)}
        />
      );
    }
  } else {
    body = (
      <CardsShelf
        snapshot={snapshot}
        journal={journal}
        source={source}
        reducedMotion={reducedMotion}
        onStart={startRun}
        onOpenDeck={(deckId) => navigate(hrefForTab("cards", "deck", deckId))}
        onCompose={() => navigate(hrefForTab("cards", "new"))}
      />
    );
  }

  return (
    <div className="ct-root">
      {body}
      {run !== null && (
        <Run cards={run} source={source} journal={journal} onExit={() => setRun(null)} credit={(graded) => progress.finishCardRun(graded)} reducedMotion={reducedMotion} />
      )}
    </div>
  );
}
