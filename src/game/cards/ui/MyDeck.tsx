/**
 * My Deck: the review hub. Read this header before trusting anything in this
 * file.
 *
 * THE REFERENCE IS OPEN BESIDE THIS FILE: "reference images/mistakes.png".
 * Its shape, top to bottom, and every part of it is a decision:
 *   a two line headline that is a COUNT and not a title,
 *   a round badge beside it so the count has a mark of its own,
 *   ONE full width button carrying its reward on the label,
 *   a rule,
 *   a section heading that repeats the count,
 *   and then the items, each a small grey label over a bold line, with a dot
 *   on the right.
 * One button is the whole idea. A hub that offers four things offers a
 * decision, and a student opening this screen has already decided; they want
 * to start. Everything else on this screen sits below the fold on purpose.
 *
 * WHAT WE DO NOT TAKE FROM IT. The reference's sibling screen sells the press
 * with "keeps your streak alive". CLAUDE.md is explicit: reward returning,
 * never punish leaving, and this is used by people who are already stressed.
 * So the button carries diamonds, which is a gain, and the headline says cards
 * are READY rather than overdue, because nothing here is late.
 *
 * The word for a card whose interval has elapsed is "fading", which is
 * docs/DATA-MODEL.md's own word for it ("1 mechanism is fading" reads
 * dueAt <= now). It is a better word than "due": it describes the memory
 * rather than the obligation.
 *
 * THE BOTTOM HALF is deck management: export, so nothing a student builds here
 * is hostage to us, and import, so a deck they already trust can come with
 * them. Both are quiet by design.
 */

import { useMemo, useRef, useState } from "react";
import type { Card, DeckSource } from "../types";
import { cardsIn, dueEverywhere } from "../types";
import { decks as defaultDecks } from "../store";
import { deckRowSubtitle, deckRows } from "./picker";
import { reviewDiamonds } from "./session";
import {
  APKG_EXPORT_NOTE,
  csvNote,
  deckExport,
  downloadFile,
  safeFilename,
  toCsv,
  toJson,
} from "./exportDeck";
import { deckNameFromFilename, readDeckFile, type ImportResult } from "./importFile";
import { useDeckSnapshot } from "./useDeck";

export interface MyDeckProps {
  readonly source?: DeckSource;
  /** Start a review with these cards. The shell decides where that renders. */
  readonly onStartReview: (cards: readonly Card[]) => void;
  /** Open the deck picker, for a student who wants to choose rather than start. */
  readonly onChooseDecks?: () => void;
}

/** The headline, which is a count and not a title. Fading, not overdue. */
export function hubHeadline(ready: number, total: number): string {
  if (total === 0) return "No cards yet";
  if (ready === 0) return "Nothing fading today";
  if (ready === 1) return "1 card is fading";
  return `${ready} cards are fading`;
}

/** The line under it. Says what pressing the button will actually be like. */
export function hubSubline(ready: number, total: number): string {
  if (total === 0) {
    return "Finish a lesson and its questions become a deck. Miss something in the trainer and you can keep it as a card.";
  }
  if (ready === 0) {
    return "Everything is holding. Come back when something needs another look, or run through a deck anyway.";
  }
  return "A few minutes now is worth an hour of rereading later.";
}

export function MyDeck({ source = defaultDecks, onStartReview, onChooseDecks }: MyDeckProps) {
  const snapshot = useDeckSnapshot(source);
  const now = useMemo(() => new Date(), [snapshot]);
  const ready = useMemo(() => dueEverywhere(snapshot, now), [snapshot, now]);
  const rows = useMemo(() => deckRows(snapshot, now), [snapshot, now]);
  const totalCards = Object.keys(snapshot.cards).length;
  const diamonds = reviewDiamonds(ready.length);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <section className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="title-face text-scale-2xl font-bold leading-tight text-bb-foreground">
              {hubHeadline(ready.length, totalCards)}
            </h1>
            <p className="mt-2 text-scale-base leading-normal text-bb-muted-foreground">
              {hubSubline(ready.length, totalCards)}
            </p>
          </div>
          <ReviewBadge count={ready.length} />
        </div>

        <button
          type="button"
          disabled={ready.length === 0}
          className="press min-h-14 w-full rounded-2xl border-2 border-[color:var(--bb-primary-edge)] bg-bb-primary text-scale-lg font-bold text-bb-primary-foreground disabled:border-bb-border disabled:bg-bb-muted disabled:text-bb-muted-foreground disabled:opacity-100"
          onClick={() => onStartReview(ready)}
        >
          {ready.length === 0 ? "Nothing to review right now" : `Start review, +${diamonds} diamonds`}
        </button>

        {onChooseDecks !== undefined && (
          <button
            type="button"
            /* An OUTLINED SECONDARY, which is what this language calls a
                control that is not the filled one. It had no edge at all, so
                it was a sentence you could press with nothing saying so, and
                the audit counted it as 4 rows of rule 4. */
            className="press min-h-11 w-full rounded-xl border border-bb-border text-scale-sm font-semibold text-bb-muted-foreground"
            onClick={onChooseDecks}
          >
            Or pick a deck to run through
          </button>
        )}
      </section>

      {ready.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-bb-border pt-5">
          <h2 className="text-scale-lg font-bold text-bb-foreground">
            {ready.length === 1 ? "1 card" : `${ready.length} cards`}
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-bb-border bg-bb-card">
            {ready.slice(0, 20).map((card) => (
              <li key={card.id} className="flex items-start gap-3 border-b border-bb-border p-4 last:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="block text-scale-sm text-bb-muted-foreground">{itemLabel(card)}</span>
                  <span className="mt-0.5 block truncate text-scale-base font-semibold text-bb-card-foreground">
                    {card.front}
                  </span>
                </span>
                {/* The reference's dot. Ours is the fading colour, not error red:
                    a card needing review is not an error. */}
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--warn)]"
                />
              </li>
            ))}
          </ul>
          {ready.length > 20 && (
            <p className="text-scale-sm text-bb-muted-foreground">
              Showing the first 20. The session runs through all {ready.length}.
            </p>
          )}
        </section>
      )}

      <DeckShelf source={source} rows={rows} snapshot={snapshot} />
    </div>
  );
}

/** Where the card came from, one small line, the reference's grey label. */
function itemLabel(card: Card): string {
  switch (card.source.kind) {
    case "lesson":
      return "From a lesson";
    case "mistake":
      return "You kept this after a miss";
    case "composed":
      return "Your own card";
    case "import":
      return card.source.deckName;
    default: {
      const unreachable: never = card.source;
      return unreachable;
    }
  }
}

/** The reference's round badge. Drawn rather than an image, so it themes. */
function ReviewBadge({ count }: { readonly count: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[color:var(--warn-ink-strong)] bg-[color:var(--warn-soft-solid)]"
    >
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="var(--warn-ink-strong)" strokeWidth="2">
        <path d="M4 9a8 8 0 0 1 13.7-5.6L20 6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 2v4.5h-4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 15a8 8 0 0 1-13.7 5.6L4 18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 22v-4.5h4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">{count} cards fading</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Decks, export and import                                             */
/* ------------------------------------------------------------------ */

function DeckShelf({
  source,
  rows,
  snapshot,
}: {
  readonly source: DeckSource;
  readonly rows: ReturnType<typeof deckRows>;
  readonly snapshot: ReturnType<DeckSource["getSnapshot"]>;
}) {
  // A ref to reach the hidden file input: the native file picker only opens
  // from a real click on an <input type="file">, so the visible button forwards
  // to it. This is the standard way to style a file control and the only
  // reason a ref appears on this screen.
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File): Promise<void> => {
    setBusy(true);
    try {
      const text = await file.text();
      const deckName = deckNameFromFilename(file.name);
      const parsed = readDeckFile(file.name, text, { deckName, importedAt: new Date() });
      setResult(parsed);
      if (parsed.cards.length > 0) {
        const deckId = `import:${deckName}`;
        source.createDeck({ id: deckId, title: deckName, kind: "dat", cardIds: [] });
        source.importCards(deckId, parsed.cards);
      }
    } catch {
      setResult({
        cards: [],
        message: "That file could not be opened.",
        notes: ["Try choosing it again, or export it from the other app once more."],
        refused: true,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 border-t border-bb-border pt-5">
      <h2 className="text-scale-lg font-bold text-bb-foreground">Decks</h2>

      {rows.length === 0 ? (
        <p className="text-scale-sm text-bb-muted-foreground">No decks yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.deckId}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-bb-border bg-bb-card p-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-scale-base font-semibold text-bb-card-foreground">
                  {row.title}
                </span>
                <span className="block text-scale-sm text-bb-muted-foreground">{deckRowSubtitle(row)}</span>
              </span>
              <button
                type="button"
                className="press min-h-11 rounded-xl bg-bb-muted px-3 text-scale-sm font-semibold text-bb-foreground"
                onClick={() => {
                  const payload = deckExport(snapshot, row.deckId, new Date());
                  if (payload === null) return;
                  downloadFile(safeFilename(row.title, "json"), "application/json", toJson(payload));
                }}
              >
                Export JSON
              </button>
              <button
                type="button"
                className="press min-h-11 rounded-xl bg-bb-muted px-3 text-scale-sm font-semibold text-bb-foreground"
                onClick={() =>
                  downloadFile(
                    safeFilename(row.title, "csv"),
                    "text/csv;charset=utf-8",
                    toCsv(cardsIn(snapshot, row.deckId)),
                  )
                }
              >
                Export CSV
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-scale-sm leading-normal text-bb-muted-foreground">{csvNote()}</p>

      <div className="flex flex-col gap-2 rounded-2xl border border-bb-border bg-bb-card p-4">
        <h3 className="text-scale-base font-semibold text-bb-card-foreground">Bring a deck with you</h3>
        <p className="text-scale-sm leading-normal text-bb-muted-foreground">
          A CSV or tab separated file from Anki, Quizlet or a spreadsheet. Your own Blueberry export works
          too.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.tsv,.txt,.json,.apkg"
          className="sr-only"
          /* THE BUTTON IS THE CONTROL AND THIS IS THE MECHANISM. It is opened
             by the button below, so leaving it in the accessibility tree gives
             a screen reader a second, unlabelled file control for one action,
             and leaves a 1 by 1 target in the tab order. Hiding it is the
             correct half of the proxy pattern, not a way past the 44 point
             floor: what a pointer actually presses is the button, and that is
             44 tall and named. */
          aria-hidden
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared so choosing the same file twice fires change again.
            event.target.value = "";
            if (file !== undefined) void handleFile(file);
          }}
        />
        <button
          type="button"
          className={`press min-h-11 w-full rounded-xl border-2 border-[color:var(--bb-primary-edge)] bg-bb-primary px-4 font-semibold text-bb-primary-foreground ${busy ? "is-busy" : ""}`}
          onClick={() => fileInput.current?.click()}
        >
          {busy ? "Reading the file" : "Choose a file"}
        </button>
        <p className="text-scale-xs leading-normal text-bb-muted-foreground">{APKG_EXPORT_NOTE}</p>

        {result !== null && (
          <div
            className={`rounded-xl p-3 ${result.refused ? "bg-[color:var(--warn-soft-solid)]" : "bg-bb-muted"}`}
            role="status"
          >
            <p className="text-scale-sm font-semibold text-bb-foreground">{result.message}</p>
            {result.notes.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1">
                {result.notes.slice(0, 8).map((note, index) => (
                  <li key={index} className="text-scale-xs leading-normal text-bb-muted-foreground">
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
