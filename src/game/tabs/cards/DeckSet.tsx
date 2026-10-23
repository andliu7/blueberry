/**
 * One deck, laid out like a flashcard set page: title and counts, the study
 * modes in a sliding switch, the chosen mode in the middle (the big flipping
 * card by default), and every card in the deck listed below with its
 * question and answer side by side and a star.
 *
 * LEARN IS THE REAL REVIEW. It hands the deck to cards/ui/Run.tsx, the
 * spaced repetition run that grades and reschedules. Flashcards, Test,
 * Match and Write are practice and never touch the schedule; each says so.
 *
 * REMOVING A CARD CAN BE UNDONE (approved effect #11). The card leaves the
 * list at once, and the real delete waits five seconds behind an Undo pill.
 * Waiting rather than deleting and re-saving matters: a re-saved card would
 * lose its review history, and undo has to mean "as if it never happened".
 * Leaving the screen inside those five seconds commits the delete.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Card, DeckSnapshot } from "../../cards/types";
import { CARD_STATE_LABELS, cardSchedulerState } from "../../cards/ui/cardState";
import { deckCells, deckDueCards, stateCounts, STATE_ORDER } from "../../cards/ui/deckView";
import { deckExport, downloadFile, safeFilename, toCsv, toJson } from "../../cards/ui/exportDeck";
import { Berry } from "../../mascot/Berry";
import { DefinitionSide, TermSide } from "./CardSides";
import { Flashcards } from "./Flashcards";
import { MatchMode } from "./MatchMode";
import { GlossaryPeekHost } from "./MoleculeInfo";
import { BackIcon, BinIcon, MODE_ICONS, StarIcon } from "./StudyIcons";
import { readStars, splitSegments, STUDY_MODES, toggled, writeStars, type StudyMode } from "./studyModel";
import { TestMode } from "./TestMode";
import { WriteMode } from "./WriteMode";

const UNDO_MS = 5000;

export interface DeckSetProps {
  readonly deckId: string;
  readonly title: string;
  readonly cards: readonly Card[];
  readonly snapshot: DeckSnapshot;
  /** False for the assembled mistakes deck: it has no stored file to export. */
  readonly exportable: boolean;
  readonly mode: StudyMode;
  readonly reducedMotion: boolean;
  readonly onMode: (mode: StudyMode) => void;
  readonly onBack: () => void;
  readonly onLearn: (cards: readonly Card[]) => void;
  readonly onRemove: (card: Card) => void;
}

export function DeckSet({
  deckId,
  title,
  cards,
  snapshot,
  exportable,
  mode,
  reducedMotion,
  onMode,
  onBack,
  onLearn,
  onRemove,
}: DeckSetProps) {
  const now = new Date();
  // useState with a function: localStorage is read once, on mount.
  const [stars, setStars] = useState<ReadonlySet<string>>(() => readStars());
  const [pending, setPending] = useState<Card | null>(null);
  const [starredOnlyList, setStarredOnlyList] = useState(false);
  // The glossary entry open in the peek sheet, or null. One sheet for every mode and the term list.
  const [peek, setPeek] = useState<string | null>(null);

  const setAndSave = (next: ReadonlySet<string>) => {
    setStars(next);
    writeStars(next);
  };

  // The pending delete commits after UNDO_MS, or when this screen unmounts.
  // The ref keeps the latest onRemove for the unmount cleanup, which would
  // otherwise see the copy from its first render.
  const removeRef = useRef(onRemove);
  removeRef.current = onRemove;
  const pendingRef = useRef<Card | null>(null);
  pendingRef.current = pending;
  useEffect(() => {
    if (pending === null) return;
    const timer = window.setTimeout(() => {
      removeRef.current(pending);
      setPending(null);
    }, UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);
  useEffect(
    () => () => {
      if (pendingRef.current !== null) removeRef.current(pendingRef.current);
    },
    [],
  );

  const remove = (card: Card) => {
    // A second delete inside the window commits the first one now.
    if (pending !== null) removeRef.current(pending);
    setPending(card);
  };

  const visible = cards.filter((card) => card.id !== pending?.id);
  const cells = deckCells(snapshot, visible, now);
  const counts = stateCounts(cells);
  const due = deckDueCards(snapshot, visible, now);
  const active = visible.filter((card) => snapshot.review[card.id]?.suspended !== true);
  const starredCount = visible.filter((card) => stars.has(card.id)).length;
  const listed = starredOnlyList && starredCount > 0 ? visible.filter((card) => stars.has(card.id)) : visible;

  let panel;
  if (mode === "flashcards") {
    panel = <Flashcards cards={visible} stars={stars} onToggleStar={(id) => setAndSave(toggled(stars, id))} onInfo={setPeek} />;
  } else if (mode === "learn") {
    panel = (
      <section className="ct-panel ct-learn" aria-label="Learn">
        <Berry mood="curious" sizePx={80} reducedMotion={reducedMotion} />
        <div className="ct-learn__text">
          <h2 className="ct-learn__title">Learn with spaced review</h2>
          <p className="ct-learn__body">
            Call the product, flip, then say how it went. Blueberry brings each card back right before you'd forget it.
          </p>
        </div>
        <div className="ct-learn__actions">
          <button type="button" className="ct-btn ct-btn--go" disabled={due.length === 0} onClick={() => onLearn(due)}>
            {due.length === 0 ? "Nothing due" : `Review ${due.length} due`}
          </button>
          <button type="button" className="ct-btn ct-btn--outline" disabled={active.length === 0} onClick={() => onLearn(active)}>
            Study all {active.length}
          </button>
        </div>
      </section>
    );
  } else if (mode === "test") {
    panel = (
      <TestMode
        cards={visible}
        reducedMotion={reducedMotion}
        onInfo={setPeek}
        onStarMissed={(ids) => {
          const next = new Set(stars);
          for (const id of ids) next.add(id);
          setAndSave(next);
        }}
      />
    );
  } else if (mode === "match") {
    panel = <MatchMode deckId={deckId} cards={visible} reducedMotion={reducedMotion} />;
  } else {
    panel = <WriteMode cards={visible} reducedMotion={reducedMotion} onInfo={setPeek} />;
  }

  return (
    <div className="ct-set">
      <header className="ct-set__head">
        <button type="button" className="ct-icon-btn" onClick={onBack} aria-label="Back to your decks">
          <BackIcon />
        </button>
        <div className="ct-set__titles">
          <h1 className="ct-set__title">{title}</h1>
          <p className="ct-set__meta">
            {visible.length === 1 ? "1 card" : `${visible.length} cards`}
            {due.length > 0 && <span className="ct-due">{due.length} due</span>}
          </p>
        </div>
      </header>

      <ModeSwitch value={mode} onChange={onMode} />

      {/* key: switching deck or mode mounts a fresh panel, so a half played
          round never leaks into the next one. */}
      <div key={`${deckId}-${mode}`}>{panel}</div>

      <section className="ct-terms" aria-labelledby="ct-terms-title">
        <div className="ct-terms__head">
          <h2 id="ct-terms-title" className="ct-terms__title">
            Terms in this set ({visible.length})
          </h2>
          <button
            type="button"
            className="ct-toggle"
            aria-pressed={starredOnlyList && starredCount > 0}
            disabled={starredCount === 0}
            onClick={() => setStarredOnlyList((value) => !value)}
          >
            <StarIcon filled={starredOnlyList && starredCount > 0} className="h-5 w-5" />
            <span>Starred only</span>
          </button>
        </div>

        <MasteryBar counts={counts} />

        <ul className="ct-term-list">
          {listed.map((card) => {
            const state = cardSchedulerState(snapshot.review[card.id], now);
            const starred = stars.has(card.id);
            // A drafted mistake the store never saved comes back from the
            // trainer's journal, so there is nothing to delete.
            const removable = snapshot.cards[card.id] !== undefined;
            return (
              <li key={card.id} className="ct-term-row">
                <div className="ct-term-row__q">
                  <TermSide card={card} size="small" onInfo={setPeek} />
                </div>
                <div className="ct-term-row__a">
                  <DefinitionSide card={card} size="small" onInfo={setPeek} />
                </div>
                <div className="ct-term-row__tools">
                  <span className={`ct-state ct-state--${state}`}>{CARD_STATE_LABELS[state]}</span>
                  <button
                    type="button"
                    className="ct-icon-btn ct-icon-btn--small"
                    aria-pressed={starred}
                    aria-label={starred ? "Unstar" : "Star"}
                    onClick={() => setAndSave(toggled(stars, card.id))}
                  >
                    <StarIcon filled={starred} className="h-5 w-5" />
                  </button>
                  {removable && (
                    <button type="button" className="ct-icon-btn ct-icon-btn--small" aria-label="Remove card" onClick={() => remove(card)}>
                      <BinIcon />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {exportable && visible.length > 0 && (
          <div className="ct-export">
            <span>Export this deck</span>
            <button
              type="button"
              className="ct-btn ct-btn--small ct-btn--outline"
              onClick={() => downloadFile(safeFilename(title, "csv"), "text/csv;charset=utf-8", toCsv(visible))}
            >
              CSV
            </button>
            <button
              type="button"
              className="ct-btn ct-btn--small ct-btn--outline"
              onClick={() => {
                const payload = deckExport(snapshot, deckId, new Date());
                if (payload !== null) downloadFile(safeFilename(title, "json"), "application/json", toJson(payload));
              }}
            >
              JSON
            </button>
          </div>
        )}
      </section>

      <GlossaryPeekHost entryId={peek} reducedMotion={reducedMotion} onClose={() => setPeek(null)} />

      {pending !== null && (
        <div className="ct-undo" role="status">
          <span>Card removed</span>
          <button type="button" className="ct-undo__btn" onClick={() => setPending(null)}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

/** The split bar (approved effect #10): one segment per scheduler state, with words. */
function MasteryBar({ counts }: { readonly counts: Readonly<Record<(typeof STATE_ORDER)[number], number>> }) {
  const segments = splitSegments(counts, STATE_ORDER);
  if (segments.length === 0) return null;
  return (
    <div className="ct-split-wrap">
      <div className="ct-split" aria-hidden="true">
        {segments.map((segment) => (
          <span key={segment.state} className={`ct-split__seg ct-seg--${segment.state}`} style={{ width: `${segment.percent}%` }} />
        ))}
      </div>
      <ul className="ct-split__legend">
        {segments.map((segment) => (
          <li key={segment.state}>
            <span className={`ct-split__dot ct-seg--${segment.state}`} aria-hidden="true" />
            <strong>{segment.count}</strong> {CARD_STATE_LABELS[segment.state]}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The study modes as a sliding segmented switch (approved effect #12). The
 * same pattern as the periodic table's filters, with an icon per mode. The
 * thumb is measured before paint and only slides after a tap, so nothing
 * moves on arrival.
 */
function ModeSwitch({ value, onChange }: { readonly value: StudyMode; readonly onChange: (mode: StudyMode) => void }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ readonly left: number; readonly width: number } | null>(null);
  const [slid, setSlid] = useState(false);

  // useLayoutEffect runs after the DOM is written and before the browser
  // paints, so the thumb lands under the right mode in the first frame.
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row === null) return;
    const measure = () => {
      const button = row.querySelector<HTMLElement>(`[data-mode="${value}"]`);
      if (button !== null) setThumb({ left: button.offsetLeft, width: button.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className="ct-modes">
      <div ref={rowRef} className="ct-modes__row" role="radiogroup" aria-label="Study mode">
        {thumb !== null && (
          <span className={`ct-modes__thumb ${slid ? "ct-modes__thumb--slide" : ""}`} style={{ left: thumb.left, width: thumb.width }} aria-hidden="true" />
        )}
        {STUDY_MODES.map((mode) => {
          const Icon = MODE_ICONS[mode.id];
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={mode.id === value}
              data-mode={mode.id}
              className="ct-modes__opt"
              onClick={(event) => {
                setSlid(true);
                onChange(mode.id);
                event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
            >
              <Icon className="ct-modes__icon" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
