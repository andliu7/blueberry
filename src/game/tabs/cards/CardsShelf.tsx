/**
 * The cards tab's home: today's review up top, then every deck as a row.
 * This is app chrome, so it speaks the app's chunky language (a purple hero
 * with a lipped button, outlined rows that sink when pressed); the deck page
 * a row opens is the clean set page (DeckSet.tsx).
 *
 * The numbers come from cards/ui's own models, untouched: the hero's count
 * is landing.reviewQueue's length, the same list the button plays, and each
 * row's ring is landing's tile mastery (mastery.ts's retention ramp).
 *
 * EACH ROW: a mastery ring (approved effect #10) with the percent inside,
 * the name and counts, and a split bar of the deck's cards by scheduler
 * state. Nothing on this screen animates on arrival.
 */

import { useRef, useState } from "react";
import type { SavedMistake } from "../trainer/mistakes";
import type { Card, DeckId, DeckSnapshot, DeckSource } from "../../cards/types";
import { cardsIn } from "../../cards/types";
import { deckCells, deckDueCards, stateCounts, STATE_ORDER } from "../../cards/ui/deckView";
import { dueForecast } from "../../cards/ui/forecast";
import { deckNameFromFilename, readDeckFile, type ImportResult } from "../../cards/ui/importFile";
import { heroModel, lessonDeckTiles, MISTAKES_DECK_ID, mistakeDeckCards, myDeckTiles, reviewQueue, type DeckTile } from "../../cards/ui/landing";
import { Berry } from "../../mascot/Berry";
import { ChevronIcon, FlashcardsIcon, PlusIcon } from "./StudyIcons";
import { splitSegments } from "./studyModel";

export function CardsShelf({
  snapshot,
  journal,
  source,
  reducedMotion,
  onStart,
  onOpenDeck,
  onCompose,
}: {
  readonly snapshot: DeckSnapshot;
  readonly journal: readonly SavedMistake[];
  readonly source: DeckSource;
  readonly reducedMotion: boolean;
  readonly onStart: (cards: readonly Card[]) => void;
  readonly onOpenDeck: (deckId: DeckId) => void;
  readonly onCompose: () => void;
}) {
  const now = new Date();
  const hero = heroModel(snapshot, journal, now);
  const forecast = dueForecast(snapshot, journal, now);
  const peak = Math.max(1, ...forecast.map((day) => day.count));
  const mine = myDeckTiles(snapshot, journal);
  const lessons = lessonDeckTiles(snapshot);

  const cardsOf = (deckId: DeckId): readonly Card[] =>
    deckId === MISTAKES_DECK_ID ? mistakeDeckCards(snapshot, journal) : cardsIn(snapshot, deckId);

  const row = (tile: DeckTile) => {
    const cards = cardsOf(tile.deckId);
    return (
      <DeckRow
        key={tile.deckId}
        tile={tile}
        count={cards.length}
        due={deckDueCards(snapshot, cards, now).length}
        counts={stateCounts(deckCells(snapshot, cards, now))}
        onOpen={() => onOpenDeck(tile.deckId)}
      />
    );
  };

  return (
    <div className="ct-shelf">
      <section className="ct-hero" aria-labelledby="ct-hero-title">
        <div className="ct-hero__top">
          <div className="ct-hero__text">
            <h2 id="ct-hero-title" className="ct-hero__eyebrow">
              Today's review
            </h2>
            <p className="ct-hero__num">{hero.due}</p>
            <p className="ct-hero__sub">{hero.due === 0 ? "All caught up! Nothing is fading yet." : hero.subline}</p>
          </div>
          <Berry mood={hero.due === 0 ? "cheer" : "curious"} sizePx={96} reducedMotion={reducedMotion} className="ct-hero__berry" />
        </div>
        <div className="ct-week" role="list" aria-label="Cards coming due this week">
          {forecast.map((day, index) => (
            <div key={`${day.label}-${index}`} role="listitem" className="ct-week__day" aria-label={`${day.label}: ${day.count}`}>
              <span className="ct-week__count" aria-hidden="true">
                {day.count}
              </span>
              <span className="ct-week__bar" aria-hidden="true">
                <span style={{ height: `${Math.max(6, (day.count / peak) * 100)}%` }} data-today={index === 0} />
              </span>
              <span className="ct-week__label" aria-hidden="true">
                {day.label}
              </span>
            </div>
          ))}
        </div>
        <button type="button" className="ct-btn ct-btn--white" disabled={hero.buttonDisabled} onClick={() => onStart(reviewQueue(snapshot, journal, now))}>
          {hero.buttonDisabled ? "Nothing due" : `Start review`}
        </button>
      </section>

      <section className="ct-shelf__group" aria-labelledby="ct-decks-title">
        <div className="ct-shelf__head">
          <h2 id="ct-decks-title" className="ct-shelf__title">
            Your decks
          </h2>
          <button type="button" className="ct-btn ct-btn--small ct-btn--purple" onClick={onCompose}>
            <PlusIcon />
            New card
          </button>
        </div>
        <ul className="ct-deck-list">{mine.map(row)}</ul>
      </section>

      {lessons.length > 0 && (
        <section className="ct-shelf__group" aria-labelledby="ct-lessons-title">
          <h2 id="ct-lessons-title" className="ct-shelf__title">
            From your lessons
          </h2>
          <ul className="ct-deck-list">{lessons.map(row)}</ul>
        </section>
      )}

      <ImportCard source={source} onOpenDeck={onOpenDeck} />
    </div>
  );
}

function DeckRow({
  tile,
  count,
  due,
  counts,
  onOpen,
}: {
  readonly tile: DeckTile;
  readonly count: number;
  readonly due: number;
  readonly counts: ReturnType<typeof stateCounts>;
  readonly onOpen: () => void;
}) {
  const percent = Math.round(tile.mastery * 100);
  const segments = splitSegments(counts, STATE_ORDER);
  return (
    <li>
      <button type="button" className="ct-deck" onClick={onOpen}>
        <Ring percent={percent} />
        <span className="ct-deck__body">
          <span className="ct-deck__line">
            <span className="ct-deck__title">{tile.title}</span>
            {due > 0 && <span className="ct-due">{due} due</span>}
          </span>
          <span className="ct-deck__meta">
            {count === 1 ? "1 card" : `${count} cards`}, {percent}% mastered
          </span>
          <span className="ct-split ct-split--thin" aria-hidden="true">
            {segments.length === 0 ? (
              <span className="ct-split__seg ct-seg--new" style={{ width: "100%" }} />
            ) : (
              segments.map((segment) => (
                <span key={segment.state} className={`ct-split__seg ct-seg--${segment.state}`} style={{ width: `${segment.percent}%` }} />
              ))
            )}
          </span>
        </span>
        <ChevronIcon className="ct-deck__chev" />
      </button>
    </li>
  );
}

/** A still progress ring: the stroke's dash is the mastered share. */
function Ring({ percent }: { readonly percent: number }) {
  const r = 22;
  const length = 2 * Math.PI * r;
  return (
    <span className="ct-ring" aria-hidden="true">
      <svg viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} className="ct-ring__track" />
        <circle
          cx="28"
          cy="28"
          r={r}
          className="ct-ring__fill"
          strokeDasharray={`${(percent / 100) * length} ${length}`}
          transform="rotate(-90 28 28)"
        />
      </svg>
      {percent === 0 ? <FlashcardsIcon className="ct-ring__icon" /> : <span className="ct-ring__num">{percent}%</span>}
    </span>
  );
}

/**
 * Bring a deck in: a CSV, an Anki plain text export, or a Blueberry JSON
 * export, through cards/ui/importFile.ts. A file brings its own deck, and a
 * successful import offers to open it.
 */
function ImportCard({ source, onOpenDeck }: { readonly source: DeckSource; readonly onOpenDeck: (deckId: DeckId) => void }) {
  // A file dialog only opens from a click on an <input type="file">, so the
  // visible button clicks this hidden one. useRef is how a component reaches
  // a DOM element it rendered.
  const input = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importedId, setImportedId] = useState<DeckId | null>(null);
  const [busy, setBusy] = useState(false);

  const read = async (file: File): Promise<void> => {
    setBusy(true);
    try {
      const text = await file.text();
      const deckName = deckNameFromFilename(file.name);
      const parsed = readDeckFile(file.name, text, { deckName, importedAt: new Date() });
      setResult(parsed);
      setImportedId(null);
      if (parsed.cards.length > 0) {
        const deckId = `import:${deckName}`;
        source.createDeck({ id: deckId, title: deckName, kind: "dat", cardIds: [] });
        source.importCards(deckId, parsed.cards);
        setImportedId(deckId);
      }
    } catch {
      setResult({ cards: [], message: "That file could not be opened.", notes: ["Try choosing it again, or export it from the other app once more."], refused: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ct-import">
      <div>
        <p className="ct-import__title">Bring a deck you already have</p>
        <p className="ct-import__body">A CSV, an Anki text export, or a Blueberry JSON export. It arrives as its own deck.</p>
      </div>
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
      <button type="button" className="ct-btn ct-btn--small ct-btn--outline" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Reading" : "Import a file"}
      </button>
      {result !== null && (
        <div role="status" className="ct-import__result">
          <p className="ct-import__title">{result.message}</p>
          {result.notes.map((note) => (
            <p key={note} className="ct-import__body">
              {note}
            </p>
          ))}
          {importedId !== null && (
            <button type="button" className="ct-btn ct-btn--small ct-btn--go" onClick={() => onOpenDeck(importedId)}>
              Open it
            </button>
          )}
        </div>
      )}
    </section>
  );
}
