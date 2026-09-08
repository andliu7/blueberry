/**
 * The Cards tab, all four faces behind one component. Read this header before
 * trusting anything in this file.
 *
 * THE FACES, and the design-goals clause each one implements:
 *
 *   landing   CardsLanding. The tab OPENS on the review decision: Due-today
 *             hero, My-decks grid, From-your-lessons row.
 *   review    ReviewSession. Structure on the card, four grade chips with
 *             the scheduler's own intervals on them.
 *   composer  Composer. Three-sided reaction cards, Setup / Conditions /
 *             Product on a segmented pill, Save to deck.
 *   tray      DeckTray. The fanned browser over the violet tray.
 *
 * This file owns exactly the transitions between them and nothing that any
 * face computes. It is the one component the shell needs to mount, so the
 * integrator's whole wiring job is rendering CardsHome where MyDeck was.
 *
 * WHY DRAFTS ARE ADOPTED BEFORE A SESSION. The mistakes deck is assembled at
 * render time from the trainer's journal (landing.ts), so a drafted card can
 * reach the REVIEW button without ever having been saved. The store's rate()
 * deliberately ignores ids it does not hold, which would silently drop the
 * rating; adopting the draft into the stored mistakes deck first gives the
 * rating somewhere to land, and the saved copy then wins every later
 * assembly, keeping the schedule it just earned. That is the "materialises
 * in the store the first time it is reviewed" moment landing.ts promises.
 *
 * The bar-hiding contract is CardsTab's: this component reports immersion
 * through onImmersiveChange from an effect, so leaving by any route restores
 * the bar, the same reasoning as the previous wiring.
 */

import { useEffect, useMemo, useState } from "react";
import type { Card, DeckId, DeckSource } from "../types";
import { cardsIn } from "../types";
import { decks as defaultDecks } from "../store";
import { loadMistakes, type SavedMistake } from "../../tabs/trainer/mistakes";
import { CardsLanding } from "./CardsLanding";
import { Composer } from "./CardComposer";
import { DeckTray } from "./DeckTray";
import { ReviewSession } from "./ReviewSession";
import { useDeckSnapshot } from "./useDeck";
import { MISTAKES_DECK_ID, MISTAKES_DECK_TITLE, mistakeDeckCards } from "./landing";

type Face =
  | { readonly kind: "landing" }
  | { readonly kind: "composer" }
  | { readonly kind: "tray"; readonly deckId: DeckId }
  | { readonly kind: "review"; readonly cards: readonly Card[] };

/**
 * Save into the stored mistakes deck every card of this session the store
 * has never seen. Only journal drafts can be in that position, and their
 * source kind says so; anything else missing is a store trim, which adopting
 * would resurrect against the student's intent, so it is left alone.
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
  /** Told when a full screen session starts and ends, so the shell can hide
      the bar. The explicit `| undefined` is for exactOptionalPropertyTypes:
      CardsTab forwards its own optional prop, so undefined must be passable. */
  readonly onImmersiveChange?: ((immersive: boolean) => void) | undefined;
}

export function CardsHome({ source = defaultDecks, mistakes, onImmersiveChange }: CardsHomeProps) {
  const [face, setFace] = useState<Face>({ kind: "landing" });
  const snapshot = useDeckSnapshot(source);
  const journal = useMemo(() => mistakes ?? loadMistakes(), [mistakes, snapshot]);

  const immersive = face.kind === "review";
  useEffect(() => {
    onImmersiveChange?.(immersive);
    return () => onImmersiveChange?.(false);
  }, [immersive, onImmersiveChange]);

  const startReview = (cards: readonly Card[]): void => {
    if (cards.length === 0) return;
    adoptMistakeDrafts(source, cards);
    setFace({ kind: "review", cards });
  };

  switch (face.kind) {
    case "review":
      return (
        <ReviewSession
          cards={face.cards}
          source={source}
          onExit={() => setFace({ kind: "landing" })}
          onDone={() => setFace({ kind: "landing" })}
        />
      );

    case "composer":
      return <Composer source={source} onBack={() => setFace({ kind: "landing" })} />;

    case "tray": {
      const isMistakes = face.deckId === MISTAKES_DECK_ID;
      const cards = isMistakes ? mistakeDeckCards(snapshot, journal) : cardsIn(snapshot, face.deckId);
      const title = isMistakes
        ? MISTAKES_DECK_TITLE
        : snapshot.decks[face.deckId]?.title ?? face.deckId;
      const trayKind = isMistakes
        ? "mistakes"
        : snapshot.decks[face.deckId]?.kind === "lesson"
          ? "auto"
          : "authored";
      return (
        <DeckTray
          title={title}
          kind={trayKind}
          cards={cards}
          snapshot={snapshot}
          onBack={() => setFace({ kind: "landing" })}
          onReview={startReview}
          onOpenCard={(card) => startReview([card])}
          onSetSuspended={(card, suspended) => {
            // A journal draft has no stored state to hang the flag on, the
            // same gap ratings have; adopting first gives the pause the same
            // place to land, and the saved copy wins every later assembly.
            adoptMistakeDrafts(source, [card]);
            source.setSuspended(card.id, suspended);
          }}
        />
      );
    }

    case "landing":
      return (
        <CardsLanding
          source={source}
          mistakes={journal}
          onReview={startReview}
          onOpenDeck={(deckId) => setFace({ kind: "tray", deckId })}
          onCompose={() => setFace({ kind: "composer" })}
        />
      );
  }
}
