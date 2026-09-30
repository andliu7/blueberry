/**
 * The Cards home: today, then the shelf of decks. Read this header before
 * trusting anything in this file.
 *
 * TODAY FIRST. The tab opens on the review decision, as it always has: one
 * number, the button that plays exactly that many cards (the number IS
 * `reviewQueue(...).length`, the same computation the button hands over), and
 * under it the next six days as a bar each. Anki keeps that forecast three
 * menus deep; a student deciding whether tonight's twenty can wait wants to
 * see tomorrow's forty right here.
 *
 * THE SHELF. Every deck is a row: a cover drawn from its own chemistry
 * (deckView.ts), its name, its counts, and its MASTERY STRIP, one cell per
 * card in the scheduler's colours, so how a deck is doing is visible before a
 * word is read. My mistakes is always a row, even empty, because a first
 * class deck that comes and goes reads as a feature that comes and goes.
 *
 * IMPORT LIVES HERE NOW. It used to sit on a hub nothing linked to, so the
 * CSV and Anki-text import was unreachable. A file brings its own deck, so
 * the shelf is where it belongs.
 */

import { useRef, useState } from "react";
import type { SavedMistake } from "../../tabs/trainer/mistakes";
import type { Card, DeckId, DeckSnapshot, DeckSource } from "../types";
import { cardsIn } from "../types";
import { CARD_STATE_LABELS } from "./cardState";
import { Drawing } from "./CardFace";
import { deckCells, deckCovers, deckDueCards, STATE_ORDER, type DeckCover } from "./deckView";
import { dueForecast } from "./forecast";
import { deckNameFromFilename, readDeckFile, type ImportResult } from "./importFile";
import { heroModel, lessonDeckTiles, MISTAKES_DECK_ID, mistakeDeckCards, myDeckTiles, reviewQueue } from "./landing";
import type { CardSchedulerState } from "./cardState";
import "./cards.css";

export interface HomeProps {
  readonly snapshot: DeckSnapshot;
  readonly journal: readonly SavedMistake[];
  readonly source: DeckSource;
  readonly onStart: (cards: readonly Card[]) => void;
  readonly onOpenDeck: (deckId: DeckId) => void;
  readonly onCompose: () => void;
  /** Injected in tests so the render is deterministic. */
  readonly now?: Date;
}

export function Home({ snapshot, journal, source, onStart, onOpenDeck, onCompose, now = new Date() }: HomeProps) {
  const hero = heroModel(snapshot, journal, now);
  const forecast = dueForecast(snapshot, journal, now);
  const peak = Math.max(1, ...forecast.map((day) => day.count));

  const mine = myDeckTiles(snapshot, journal);
  const lessons = lessonDeckTiles(snapshot);
  const cardsOf = (deckId: DeckId): readonly Card[] =>
    deckId === MISTAKES_DECK_ID ? mistakeDeckCards(snapshot, journal) : cardsIn(snapshot, deckId);
  const allRows = [...mine, ...lessons];
  const covers = deckCovers(allRows.map((tile) => cardsOf(tile.deckId)));
  const coverFor = (deckId: DeckId): DeckCover | null => covers[allRows.findIndex((tile) => tile.deckId === deckId)] ?? null;

  const row = (tile: (typeof allRows)[number]) => {
    const cards = cardsOf(tile.deckId);
    return (
      <DeckRow
        key={tile.deckId}
        title={tile.title}
        count={cards.length}
        due={deckDueCards(snapshot, cards, now).length}
        cells={deckCells(snapshot, cards, now)}
        cover={coverFor(tile.deckId)}
        onOpen={() => onOpenDeck(tile.deckId)}
      />
    );
  };

  return (
    <div className="flex flex-col gap-6 px-4 pb-8 pt-4">
      <section className="card-paper gap-4" aria-labelledby="cards-today">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <h2 id="cards-today" className="m-0 text-scale-sm font-semibold uppercase tracking-wide text-bb-muted-foreground">
              {hero.title}
            </h2>
            <p className="bb-title-face m-0 text-[3.5rem] font-bold leading-none tabular-nums">{hero.due}</p>
            <p className="m-0 text-scale-sm text-bb-muted-foreground">{hero.subline}</p>
          </div>
        </div>

        {/* The next seven days. Numbers sit over the bars so the bars are an
            aid to the eye, never the only way to read the count. */}
        <div className="forecast" role="list" aria-label="Cards coming due this week">
          {forecast.map((day, index) => (
            <div
              key={`${day.label}-${index}`}
              role="listitem"
              className={`forecast__col ${index === 0 ? "forecast__col--today" : ""}`}
              aria-label={`${day.label}: ${day.count}`}
            >
              <span className="text-scale-xs font-semibold tabular-nums" aria-hidden="true">
                {day.count}
              </span>
              <div className="forecast__bar" style={{ height: `${(day.count / peak) * 3.25}rem` }} aria-hidden="true" />
              <span className="text-scale-xs text-bb-muted-foreground" aria-hidden="true">
                {day.label}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="chip3d chip3d--go bb-title-face w-full text-scale-lg font-bold"
          disabled={hero.buttonDisabled}
          onClick={() => onStart(reviewQueue(snapshot, journal, now))}
        >
          {hero.buttonDisabled ? hero.buttonLabel : `Start review, ${hero.due} ${hero.due === 1 ? "card" : "cards"}`}
        </button>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="cards-decks">
        <div className="flex items-center justify-between gap-2">
          <h2 id="cards-decks" className="bb-title-face m-0 text-scale-xl font-bold">
            Your decks
          </h2>
          <button type="button" className="chip3d press px-4 text-scale-sm font-bold" onClick={onCompose}>
            + New card
          </button>
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">{mine.map(row)}</ul>
      </section>

      {lessons.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="cards-lessons">
          <h2 id="cards-lessons" className="bb-title-face m-0 text-scale-xl font-bold">
            From your lessons
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">{lessons.map(row)}</ul>
        </section>
      )}

      <ImportPanel source={source} />
      <Legend />
    </div>
  );
}

/** One deck on the shelf. The whole row opens the deck. */
function DeckRow({
  title,
  count,
  due,
  cells,
  cover,
  onOpen,
}: {
  readonly title: string;
  readonly count: number;
  readonly due: number;
  readonly cells: readonly CardSchedulerState[];
  readonly cover: DeckCover | null;
  readonly onOpen: () => void;
}) {
  return (
    <li>
      <button type="button" className="card-paper card-paper--row press" onClick={onOpen}>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bb-muted">
          {cover !== null && (
            <Drawing light={cover.light} dark={cover.dark} alt={`${cover.alt}, from this deck`} className="h-full w-full object-contain" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-scale-base font-bold leading-snug">{title}</span>
            {due > 0 && (
              <span className="due-pill">
                {due} due
              </span>
            )}
          </span>
          <span className="text-scale-xs text-bb-muted-foreground">
            {count === 1 ? "1 card" : `${count} cards`}
          </span>
          {cells.length > 0 && <Strip cells={cells} />}
        </span>
      </button>
    </li>
  );
}

/** The mastery strip. Decorative to assistive tech: the counts say it in words. */
export function Strip({ cells, big = false }: { readonly cells: readonly CardSchedulerState[]; readonly big?: boolean }) {
  return (
    <span className={`strip ${big ? "strip--big" : ""}`} aria-hidden="true">
      {cells.map((cell, index) => (
        <span key={index} className={`strip__cell cell--${cell}`} />
      ))}
    </span>
  );
}

/** What the strip's colours mean, once, at the foot of the shelf. */
function Legend() {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-scale-xs text-bb-muted-foreground" aria-label="What the colours mean">
      {STATE_ORDER.map((state) => (
        <li key={state} className="flex items-center gap-1.5">
          <span className={`strip__cell cell--${state}`} aria-hidden="true" />
          {CARD_STATE_LABELS[state]}
        </li>
      ))}
    </ul>
  );
}

/**
 * Bring a deck in: a CSV, an Anki "notes in plain text" export, or our own
 * JSON export. The file lands as a deck of its own, named from the file.
 */
function ImportPanel({ source }: { readonly source: DeckSource }) {
  // A file dialog only opens from a real click on an <input type="file">, so
  // the visible button forwards to this hidden one. useRef is how a component
  // reaches a DOM element it rendered.
  const input = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const read = async (file: File): Promise<void> => {
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
    <section className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-bb-border p-4">
      <p className="m-0 text-scale-sm font-semibold">Bring a deck you already have</p>
      <p className="m-0 text-scale-xs text-bb-muted-foreground">
        A CSV, an Anki text export, or a Blueberry JSON export. It arrives as its own deck.
      </p>
      <input
        ref={input}
        type="file"
        accept=".csv,.tsv,.txt,.json,.apkg,.colpkg"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) void read(file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        className={`cards-ghost press self-start ${busy ? "is-busy" : ""}`}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? "Reading the file" : "Import a file"}
      </button>
      {result !== null && (
        <div role="status" className="flex flex-col gap-1 text-scale-sm">
          <p className="m-0 font-semibold">{result.message}</p>
          {result.notes.map((note) => (
            <p key={note} className="m-0 text-scale-xs text-bb-muted-foreground">
              {note}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
