/**
 * Match mode: up to six cards laid out as twelve tiles, questions and
 * answers mixed. Tap one, tap its partner; a pair clears, a wrong pair
 * flashes red and adds a second to the clock. Practice only.
 *
 * The clock starts on the first tap, not on arrival, so reading the board
 * is free, and nothing moves on first paint. The best time is kept per deck
 * on this device.
 */

import { useEffect, useMemo, useState } from "react";
import { Berry } from "../../mascot/Berry";
import type { Card } from "../../cards/types";
import { DefinitionSide, TermSide } from "./CardSides";
import { formatSeconds, isPair, matchBoard, MISS_PENALTY_MS, readBestMatch, writeBestMatch, type MatchTile } from "./studyModel";

export function MatchMode({
  deckId,
  cards,
  reducedMotion,
}: {
  readonly deckId: string;
  readonly cards: readonly Card[];
  readonly reducedMotion: boolean;
}) {
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const tiles = useMemo(() => matchBoard(cards, seed), [cards, seed]);
  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const [selected, setSelected] = useState<MatchTile | null>(null);
  const [cleared, setCleared] = useState<ReadonlySet<string>>(new Set());
  const [wrong, setWrong] = useState<readonly string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [penalty, setPenalty] = useState(0);
  const [finalMs, setFinalMs] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [best, setBest] = useState<number | null>(() => readBestMatch(deckId));

  // The clock ticks ten times a second while a round runs, and stops at the end.
  useEffect(() => {
    if (startedAt === null || finalMs !== null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [startedAt, finalMs]);

  // A wrong pair shows red for a moment, then clears.
  useEffect(() => {
    if (wrong.length === 0) return;
    const timer = window.setTimeout(() => setWrong([]), 450);
    return () => window.clearTimeout(timer);
  }, [wrong]);

  const pairs = tiles.length / 2;
  const elapsed = finalMs ?? (startedAt === null ? 0 : now - startedAt + penalty);

  const restart = () => {
    setSeed((value) => value + 1);
    setSelected(null);
    setCleared(new Set());
    setWrong([]);
    setStartedAt(null);
    setPenalty(0);
    setFinalMs(null);
  };

  if (pairs < 2) {
    return <p className="ct-empty">Match needs at least two cards. Add another card to this deck.</p>;
  }

  const tap = (tile: MatchTile) => {
    if (cleared.has(tile.key) || finalMs !== null) return;
    const start = startedAt ?? Date.now();
    if (startedAt === null) setStartedAt(start);
    if (selected === null) {
      setSelected(tile);
      return;
    }
    if (selected.key === tile.key) {
      setSelected(null);
      return;
    }
    if (isPair(selected, tile)) {
      const next = new Set(cleared);
      next.add(selected.key);
      next.add(tile.key);
      setCleared(next);
      setSelected(null);
      if (next.size === tiles.length) {
        const total = Date.now() - start + penalty;
        setFinalMs(total);
        if (best === null || total < best) {
          writeBestMatch(deckId, total);
          setBest(total);
        }
      }
    } else {
      setWrong([selected.key, tile.key]);
      setPenalty((value) => value + MISS_PENALTY_MS);
      setSelected(null);
    }
  };

  if (finalMs !== null) {
    const isBest = best === finalMs;
    return (
      <section className="ct-panel ct-done" aria-label="Match results">
        <Berry mood="cheer" behaviour="celebrate" sizePx={88} reducedMotion={reducedMotion} />
        <h2 className="ct-done__title">{isBest ? "New best time!" : "All matched!"}</h2>
        <div className="ct-tiles">
          <div className="ct-stat ct-stat--yellow">
            <span className="ct-stat__label">Time</span>
            <span className="ct-stat__value">{formatSeconds(finalMs)}s</span>
          </div>
          <div className="ct-stat ct-stat--purple">
            <span className="ct-stat__label">Best</span>
            <span className="ct-stat__value">{best === null ? "-" : `${formatSeconds(best)}s`}</span>
          </div>
        </div>
        <button type="button" className="ct-btn ct-btn--go" onClick={restart}>
          Play again
        </button>
      </section>
    );
  }

  return (
    <section className="ct-panel" aria-label="Match">
      <div className="ct-qhead">
        <span className="ct-qcount">
          {cleared.size / 2} of {pairs} matched
        </span>
        <span className="ct-timer" aria-label={`${formatSeconds(elapsed)} seconds`}>
          {formatSeconds(elapsed)}s
        </span>
      </div>
      <p className="ct-ask">{startedAt === null ? "Tap a question, then its answer. The clock starts on your first tap." : "Find each pair."}</p>
      <div className="ct-match" role="group" aria-label="Tiles">
        {tiles.map((tile) => {
          const card = byId.get(tile.cardId);
          if (card === undefined) return null;
          const gone = cleared.has(tile.key);
          const state = gone ? "cleared" : wrong.includes(tile.key) ? "wrong" : selected?.key === tile.key ? "selected" : "";
          return (
            <button
              key={tile.key}
              type="button"
              className={`ct-tile ct-tile--${tile.side}`}
              data-state={state}
              disabled={gone}
              aria-pressed={selected?.key === tile.key}
              onClick={() => tap(tile)}
            >
              {tile.side === "term" ? <TermSide card={card} size="small" /> : <DefinitionSide card={card} size="small" showName={false} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
