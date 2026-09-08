/**
 * The deck picker. Read this header before trusting anything in this file.
 *
 * THE REFERENCE, and it is open beside this file rather than remembered:
 * docs/reference/competitors/orgosolver-02-flashcard-decks.png, left hand
 * phone. Four things on that screen are decisions and all four are here.
 * A list of decks each showing its own card count, so "how much work is this"
 * is answered before anything is pressed. Select all and None as text buttons
 * rather than a menu. Shuffle as a peer of those, not buried. And a single
 * full width start button that NAMES the session length: "Start (13 cards)".
 *
 * That last one is the whole screen's point, so the label is computed by
 * `startLabel` in picker.ts where a test can hold it to its promise, and
 * it recomputes from the same function that builds the session. A count in the
 * button and a different number of cards in the session is the bug this
 * arrangement makes structurally impossible.
 *
 * WHAT WE CHANGED, and why. The reference has no scope control, so a student
 * with a 400 card deck presses start and gets 400 cards. We add one: Ready
 * today against Everything. The Anki borrow is the scheduler, and a scheduler
 * whose output nobody can select is decoration.
 *
 * The selection is a plain array in useState. React state has to be REPLACED
 * rather than mutated for a re-render to happen, which is why picker.ts's
 * toggle returns a new array rather than pushing into the old one.
 */

import { useMemo, useState } from "react";
import type { Card, DeckId, DeckSource } from "../types";
import {
  DECK_KIND_LABELS,
  buildSession,
  deckRowSubtitle,
  deckRows,
  SCOPE_LABELS,
  selectAll,
  selectNone,
  startLabel,
  toggleDeck,
  type SessionScope,
} from "./picker";
import { decks as defaultDecks } from "../store";
import { useDeckSnapshot } from "./useDeck";

export interface DeckPickerProps {
  /** Defaults to the app's local store. Injected in tests and in Phase 6. */
  readonly source?: DeckSource;
  /** Called with the cards the session will play, in the order it will play them. */
  readonly onStart: (cards: readonly Card[]) => void;
  /** Optional: the picker leaves the shell to decide what "back" means. */
  readonly onBack?: () => void;
}

const SCOPES: readonly SessionScope[] = ["due", "all"];

export function DeckPicker({ source = defaultDecks, onStart, onBack }: DeckPickerProps) {
  const snapshot = useDeckSnapshot(source);
  // One `now` per render, so every count on the screen agrees with every other.
  const now = useMemo(() => new Date(), [snapshot]);
  const rows = useMemo(() => deckRows(snapshot, now), [snapshot, now]);

  const [selected, setSelected] = useState<readonly DeckId[]>([]);
  const [scope, setScope] = useState<SessionScope>("due");
  const [shuffle, setShuffle] = useState(false);
  // The seed is fixed for the life of the screen, so the count in the button
  // and the session that follows are the same shuffle, not two of them.
  const [seed] = useState(() => Date.now() >>> 0);

  const session = useMemo(
    () => buildSession(snapshot, selected, { scope, shuffle, seed, now }),
    [snapshot, selected, scope, shuffle, seed, now],
  );

  if (rows.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4 md:p-6">
        <h1 className="title-face text-scale-2xl font-bold text-bb-foreground">Your decks</h1>
        <p className="text-scale-base leading-normal text-bb-muted-foreground">
          Nothing here yet. Finish a lesson and its questions become a deck, or bring a deck you already
          study from.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="title-face text-scale-2xl font-bold text-bb-foreground">Your decks</h1>
          <p className="text-scale-sm text-bb-muted-foreground">Pick what to run through.</p>
        </div>
        {onBack !== undefined && (
          <button
            type="button"
            className="press min-h-11 rounded-xl px-3 text-scale-sm font-semibold text-bb-muted-foreground"
            onClick={onBack}
          >
            Back
          </button>
        )}
      </div>

      {/* Select all / None on the left, shuffle on the right: the reference's row. */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="press min-h-11 rounded-xl px-2 text-scale-sm font-semibold text-bb-primary"
            onClick={() => setSelected(selectAll(rows))}
          >
            Select all
          </button>
          <span className="text-scale-sm text-bb-muted-foreground">/</span>
          <button
            type="button"
            className="press min-h-11 rounded-xl px-2 text-scale-sm font-semibold text-bb-muted-foreground"
            onClick={() => setSelected(selectNone())}
          >
            None
          </button>
        </div>
        <button
          type="button"
          aria-pressed={shuffle}
          className={`press flex min-h-11 items-center gap-2 rounded-xl px-3 text-scale-sm font-semibold ${
            shuffle ? "bg-bb-primary/10 text-bb-primary" : "text-bb-muted-foreground"
          }`}
          onClick={() => setShuffle((on) => !on)}
        >
          <ShuffleGlyph />
          Shuffle
        </button>
      </div>

      {/* Scope: one track, two segments. Same control as the leaderboard's. */}
      <div className="grid grid-cols-2 gap-1 rounded-full border border-bb-border bg-bb-muted p-1" role="group" aria-label="What to review">
        {SCOPES.map((option) => {
          const on = scope === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              className={`press min-h-11 rounded-full px-3 text-scale-sm font-bold ${
                on ? "border-2 border-[color:var(--bb-primary-edge)] bg-bb-primary text-bb-primary-foreground" : "border-2 border-bb-border bg-bb-card text-bb-muted-foreground"
              }`}
              onClick={() => setScope(option)}
            >
              {SCOPE_LABELS[option]}
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const on = selected.includes(row.deckId);
          return (
            <li key={row.deckId}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                className={`press flex w-full items-center gap-3 rounded-2xl border bg-bb-card p-4 text-left ${
                  on ? "border-[color:var(--good)]" : "border-bb-border"
                }`}
                onClick={() => setSelected((current) => toggleDeck(current, row.deckId))}
              >
                <CheckCircle on={on} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-scale-base font-semibold text-bb-card-foreground">
                    {row.title}
                  </span>
                  <span className="block text-scale-sm text-bb-muted-foreground">{deckRowSubtitle(row)}</span>
                </span>
                <span className="shrink-0 rounded-full bg-bb-muted px-2.5 py-0.5 text-scale-xs font-medium text-bb-muted-foreground">
                  {DECK_KIND_LABELS[row.kind]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* The start button stays reachable while the deck list scrolls, which is
          where the reference puts it too. STICKY rather than fixed: the shell's
          left rail is a static flex child above 768px, so a fixed bar would
          have to know the rail's width and would be wrong the day it changes.
          A sticky element sits inside the layout box it was already given.
          bottom-16 on narrow clears the bottom tab bar, which IS fixed. */}
      <div className="sticky bottom-16 z-10 -mx-4 border-t border-bb-border bg-bb-card px-4 py-3 md:-mx-6 md:bottom-2 md:px-6">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            disabled={session.length === 0}
            className="press min-h-14 w-full rounded-2xl border-2 border-[color:var(--bb-primary-edge)] bg-bb-primary text-scale-lg font-bold text-bb-primary-foreground disabled:border-bb-border disabled:bg-bb-muted disabled:text-bb-muted-foreground disabled:opacity-100"
            onClick={() => onStart(session)}
          >
            {startLabel(session.length)}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The reference's filled circle with a tick. Drawn, so it themes with the app. */
function CheckCircle({ on }: { readonly on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
        on ? "border-[color:var(--good)] bg-[color:var(--good)]" : "border-bb-border"
      }`}
    >
      {on && (
        /* The tick is --bb-background, not --good-ink: good-ink on the good fill
           measures 1.26:1 (ReviewSession's own note), which is dead ink. The
           page ground is the fill's opposite in both themes, cream on the deep
           light green and near-black on the bright dark one, so one value
           clears the fill both ways. */
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="var(--bb-background)" strokeWidth="2.5">
          <path d="M3 8.5 L6.5 12 L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function ShuffleGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2 5h3.5l3 4.5" strokeLinecap="round" />
      <path d="M2 15h3.5l3-4.5" strokeLinecap="round" />
      <path d="M11.5 5H18M18 5l-2.5-2.5M18 5l-2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 15H18M18 15l-2.5-2.5M18 15l-2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
