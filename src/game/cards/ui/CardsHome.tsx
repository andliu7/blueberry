/**
 * The Cards tab: which screen is showing, and nothing any screen computes.
 * Rebuilt 29 Sep with the interface; read this header before trusting it.
 *
 * THE SCREENS. Home (today plus the shelf), a deck (DeckScreen), the composer,
 * and the run, which is not a screen in the same sense: it is an overlay
 * drawn OVER whichever screen started it, fixed across the whole app, so
 * leaving a run lands the student exactly where they were.
 *
 * WHY DRAFTS ARE ADOPTED BEFORE A RUN. The mistakes deck is assembled at
 * render time from the trainer's journal (landing.ts), so a drafted card can
 * reach a run without ever having been saved, and the store's rate() ignores
 * ids it does not hold. Adopting the draft into the stored mistakes deck
 * first gives the grade somewhere to land; the saved copy then wins every
 * later assembly and keeps the schedule it just earned.
 *
 * THE BAR. CardsTab's contract: immersion is reported from an effect, so
 * leaving by any route (tab press, back button, deep link) restores the bar,
 * not only the exits this file knows about.
 */

import { useEffect, useMemo, useState } from "react";
import type { Card, DeckId, DeckSource } from "../types";
import { cardsIn } from "../types";
import { decks as defaultDecks, PERSONAL_DECK_ID } from "../store";
import { migrateLegacySavedCards } from "../migrateSavedCards";
import { seedStarterDeck } from "../seed";
import { loadMistakes, type SavedMistake } from "../../tabs/trainer/mistakes";
import { ComposeScreen } from "./ComposeScreen";
import { DeckScreen } from "./DeckScreen";
import { Home } from "./Home";
import { Run } from "./Run";
import { useDeckSnapshot } from "./useDeck";
import { MISTAKES_DECK_ID, MISTAKES_DECK_TITLE, mistakeDeckCards } from "./landing";

type Screen =
  | { readonly kind: "home" }
  | { readonly kind: "composer" }
  | { readonly kind: "deck"; readonly deckId: DeckId };

/**
 * Save into the stored mistakes deck every card of this run the store has
 * never seen. Only journal drafts can be in that position, and their source
 * kind says so; anything else missing is a store trim, which adopting would
 * resurrect against the student's intent, so it is left alone.
 */
export function adoptMistakeDrafts(source: DeckSource, cards: readonly Card[]): void {
  const held = source.getSnapshot().cards;
  const drafts = cards.filter((card) => held[card.id] === undefined && card.source.kind === "mistake");
  if (drafts.length === 0) return;
  source.createDeck({ id: MISTAKES_DECK_ID, title: MISTAKES_DECK_TITLE, kind: "personal", cardIds: [] });
  for (const draft of drafts) source.saveCard(draft, MISTAKES_DECK_ID);
}

export interface CardsHomeProps {
  readonly source?: DeckSource;
  /** Injected in tests. The default reads the journal the trainer writes. */
  readonly mistakes?: readonly SavedMistake[];
  /** Told when a run starts and ends, so the shell can hide the bar. The
      explicit `| undefined` is for exactOptionalPropertyTypes: CardsTab
      forwards its own optional prop, so undefined must be passable. */
  readonly onImmersiveChange?: ((immersive: boolean) => void) | undefined;
}

export function CardsHome({ source = defaultDecks, mistakes, onImmersiveChange }: CardsHomeProps) {
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [run, setRun] = useState<readonly Card[] | null>(null);
  const snapshot = useDeckSnapshot(source);
  // Re-read the journal whenever the store changes: a save elsewhere in the
  // game is the moment a mistake may have become a card.
  const journal = useMemo(() => mistakes ?? loadMistakes(), [mistakes, snapshot]);

  // First mount housekeeping, in this order: the dead draw-page store's
  // entries walk into the personal deck (once; the key is removed), and only
  // then does the starter seed decide whether this is really a first run.
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
  if (screen.kind === "composer") {
    body = <ComposeScreen snapshot={snapshot} source={source} onBack={() => setScreen({ kind: "home" })} />;
  } else if (screen.kind === "deck") {
    const isMistakes = screen.deckId === MISTAKES_DECK_ID;
    body = (
      <DeckScreen
        title={isMistakes ? MISTAKES_DECK_TITLE : (snapshot.decks[screen.deckId]?.title ?? screen.deckId)}
        cards={isMistakes ? mistakeDeckCards(snapshot, journal) : cardsIn(snapshot, screen.deckId)}
        snapshot={snapshot}
        storedDeckId={isMistakes ? null : screen.deckId}
        onBack={() => setScreen({ kind: "home" })}
        onReview={startRun}
        onSetSuspended={(card, suspended) => {
          // A journal draft has no stored state to hang the flag on, the same
          // gap grades have; adopting first gives the pause a place to land.
          adoptMistakeDrafts(source, [card]);
          source.setSuspended(card.id, suspended);
        }}
        onRemove={(card) => source.removeCard(card.id)}
      />
    );
  } else {
    body = (
      <Home
        snapshot={snapshot}
        journal={journal}
        source={source}
        onStart={startRun}
        onOpenDeck={(deckId) => setScreen({ kind: "deck", deckId })}
        onCompose={() => setScreen({ kind: "composer" })}
      />
    );
  }

  return (
    <>
      {body}
      {run !== null && <Run cards={run} source={source} journal={journal} onExit={() => setRun(null)} />}
    </>
  );
}
