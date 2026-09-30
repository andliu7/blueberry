/**
 * One deck, opened: its strip at full size, the counts in words, the two ways
 * to review it, export, and every card as a readable row. Read this header
 * before trusting anything in this file.
 *
 * EVERY NAME IS READABLE. The fanned tray this replaces cut card names to
 * eight letters and hid all but six cards. A list wraps, holds a deck of any
 * size, and says for each card where it stands and when it comes back.
 *
 * A CARD OPENS AS A SHEET: the real face (tap it to see the back), and the
 * two acts a student takes on one card, pausing it and removing it. Pause is
 * the scheduler's suspend (the card keeps its schedule and stops being
 * dealt); remove deletes the card and its schedule, which is why it is the
 * one red control here and why it asks twice.
 */

import { useState } from "react";
import type { Card, DeckSnapshot } from "../types";
import { cardsIn } from "../types";
import { CardFace } from "./CardFace";
import { CARD_STATE_LABELS, cardSchedulerState } from "./cardState";
import { cardTitle, deckCells, deckDueCards, dueLabel, stateCounts, STATE_ORDER } from "./deckView";
import { deckExport, downloadFile, safeFilename, toCsv, toJson } from "./exportDeck";
import { Strip } from "./Home";
import "./cards.css";

export interface DeckScreenProps {
  readonly title: string;
  readonly cards: readonly Card[];
  readonly snapshot: DeckSnapshot;
  /** The stored deck's id, or null for the assembled mistakes deck, which has no file to export. */
  readonly storedDeckId: string | null;
  readonly onBack: () => void;
  readonly onReview: (cards: readonly Card[]) => void;
  readonly onSetSuspended: (card: Card, suspended: boolean) => void;
  readonly onRemove: (card: Card) => void;
  readonly now?: Date;
}

export function DeckScreen({
  title,
  cards,
  snapshot,
  storedDeckId,
  onBack,
  onReview,
  onSetSuspended,
  onRemove,
  now = new Date(),
}: DeckScreenProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const cells = deckCells(snapshot, cards, now);
  const counts = stateCounts(cells);
  const due = deckDueCards(snapshot, cards, now);
  const open = cards.find((card) => card.id === openId) ?? null;

  // "Review all" plays every card that is not paused, in deck order. A paused
  // card was paused on purpose; it is reachable one at a time from its sheet.
  const all = cards.filter((card) => snapshot.review[card.id]?.suspended !== true);

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-bb-muted-foreground"
          onClick={onBack}
          aria-label="Back to your decks"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="bb-title-face m-0 text-scale-2xl font-bold leading-tight">{title}</h1>
      </div>

      <section className="card-paper gap-3">
        {cells.length > 0 ? <Strip cells={cells} big /> : <p className="m-0 text-scale-sm text-bb-muted-foreground">No cards here yet.</p>}
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-scale-sm">
          {STATE_ORDER.filter((state) => counts[state] > 0).map((state) => (
            <li key={state} className="flex items-center gap-1.5">
              <span className={`strip__cell cell--${state}`} aria-hidden="true" />
              <span className="font-semibold tabular-nums">{counts[state]}</span> {CARD_STATE_LABELS[state]}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button
            type="button"
            className="chip3d chip3d--go flex-1 text-scale-base font-bold"
            disabled={due.length === 0}
            onClick={() => onReview(due)}
          >
            {due.length === 0 ? "Nothing due" : `Review ${due.length} due`}
          </button>
          <button type="button" className="cards-ghost press flex-1" disabled={all.length === 0} onClick={() => onReview(all)}>
            Review all {all.length}
          </button>
        </div>
        {storedDeckId !== null && cards.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-scale-xs text-bb-muted-foreground">Export</span>
            <button
              type="button"
              className="cards-ghost press !min-h-11 text-scale-sm"
              onClick={() => downloadFile(safeFilename(title, "csv"), "text/csv;charset=utf-8", toCsv(cardsIn(snapshot, storedDeckId)))}
            >
              CSV
            </button>
            <button
              type="button"
              className="cards-ghost press !min-h-11 text-scale-sm"
              onClick={() => {
                const payload = deckExport(snapshot, storedDeckId, new Date());
                if (payload !== null) downloadFile(safeFilename(title, "json"), "application/json", toJson(payload));
              }}
            >
              JSON
            </button>
          </div>
        )}
      </section>

      <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Cards in this deck">
        {cards.map((card) => {
          const state = cardSchedulerState(snapshot.review[card.id], now);
          return (
            <li key={card.id}>
              <button type="button" className="card-paper card-paper--row press" onClick={() => setOpenId(card.id)}>
                <span className={`strip__cell cell--${state} shrink-0`} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-scale-sm font-semibold leading-snug">{cardTitle(card)}</span>
                  <span className="text-scale-xs text-bb-muted-foreground">
                    {CARD_STATE_LABELS[state]}. {dueLabel(snapshot.review[card.id], now)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {open !== null && (
        <CardSheet
          card={open}
          snapshot={snapshot}
          now={now}
          onClose={() => setOpenId(null)}
          onReview={() => {
            setOpenId(null);
            onReview([open]);
          }}
          onSetSuspended={(suspended) => onSetSuspended(open, suspended)}
          onRemove={() => {
            setOpenId(null);
            onRemove(open);
          }}
        />
      )}
    </div>
  );
}

/** One card, up close. */
function CardSheet({
  card,
  snapshot,
  now,
  onClose,
  onReview,
  onSetSuspended,
  onRemove,
}: {
  readonly card: Card;
  readonly snapshot: DeckSnapshot;
  readonly now: Date;
  readonly onClose: () => void;
  readonly onReview: () => void;
  readonly onSetSuspended: (suspended: boolean) => void;
  readonly onRemove: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const state = snapshot.review[card.id];
  const paused = state?.suspended === true;
  // A drafted mistake the store never saved has nothing to delete: it comes
  // back from the trainer's journal. Only a stored card offers Remove.
  const stored = snapshot.cards[card.id] !== undefined;

  return (
    <div className="cards-sheet" role="dialog" aria-modal="true" aria-label="Card" onClick={onClose}>
      {/* stopPropagation keeps a tap inside the panel from reaching the
          backdrop's close handler, the usual way to make "tap outside closes". */}
      <div className="cards-sheet__panel" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="m-0 text-scale-sm text-bb-muted-foreground">{dueLabel(state, now)}</p>
          <button type="button" className="cards-ghost press" onClick={onClose}>
            Close
          </button>
        </div>
        <CardFace
          card={card}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          schedulerState={cardSchedulerState(state, now)}
        />
        {revealed && (
          <button type="button" className="cards-ghost press" onClick={() => setRevealed(false)}>
            Show the front again
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="chip3d press text-scale-sm font-bold" onClick={onReview}>
            Review this card
          </button>
          <button type="button" className="cards-ghost press text-scale-sm" onClick={() => onSetSuspended(!paused)}>
            {paused ? "Resume it" : "Pause it"}
          </button>
        </div>
        {stored && (
          <button
            type="button"
            className="cards-ghost cards-danger press text-scale-sm"
            onClick={() => (confirming ? onRemove() : setConfirming(true))}
          >
            {confirming ? "Tap again to remove it and its schedule" : "Remove card"}
          </button>
        )}
      </div>
    </div>
  );
}

