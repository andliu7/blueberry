/**
 * Flashcards mode: one big card in the middle that flips, arrows and a count
 * under it, and two toggles (shuffle, starred only). Browsing, not grading:
 * nothing here touches the schedule. Learn is the mode that grades.
 *
 * THE FLIP is CSS: both faces sit in one grid cell, the back pre-turned
 * 180deg, and the inner box rotates. `backface-visibility: hidden` hides
 * whichever face points away. Stacking the faces in a grid cell (rather than
 * absolutely positioning them) lets the card grow to its taller face, so a
 * long answer never clips.
 *
 * NO MOTION ON ARRIVAL. A new card is a new `key` on the inner box, which
 * makes React mount a fresh element instead of updating the old one; the
 * fresh one starts unflipped with no transition to play, so moving to the
 * next card never shows the previous answer spinning back. The slide-in only
 * plays after an arrow press (`slide` is null on first paint), and the CSS
 * drops both the slide and the turn under reduced motion.
 */

import { useEffect, useRef, useState } from "react";
import { seededShuffle } from "@/lib/helpers";
import type { Card } from "../../cards/types";
import { glossaryLinksFor } from "../../glossary/cardLinks";
import { DefinitionSide, TermSide, type OnInfo } from "./CardSides";
import { InfoChip } from "./MoleculeInfo";
import { ArrowIcon, ShuffleIcon, StarIcon } from "./StudyIcons";

export function Flashcards({
  cards,
  stars,
  onToggleStar,
  onInfo,
}: {
  readonly cards: readonly Card[];
  readonly stars: ReadonlySet<string>;
  readonly onToggleStar: (cardId: string) => void;
  /** Opens a glossary entry from the chip row under the card. */
  readonly onInfo?: OnInfo;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [slide, setSlide] = useState<"left" | "right" | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState<number | null>(null);
  const [starredOnly, setStarredOnly] = useState(false);
  const touchX = useRef<number | null>(null);

  const starredCount = cards.filter((card) => stars.has(card.id)).length;
  const pool = starredOnly && starredCount > 0 ? cards.filter((card) => stars.has(card.id)) : cards;
  const order = shuffleSeed === null ? pool : seededShuffle(pool, shuffleSeed);
  const safeIndex = Math.min(index, Math.max(0, order.length - 1));
  const card = order[safeIndex];

  const go = (step: 1 | -1) => {
    const next = safeIndex + step;
    if (next < 0 || next >= order.length) return;
    setIndex(next);
    setFlipped(false);
    setSlide(step === 1 ? "right" : "left");
  };

  // Keyboard: arrows move, space or up/down flips. Ignored while typing
  // anywhere, and space on a focused button is left to the button.
  // The ref holds the latest `go` and flip so the listener, added once, never
  // calls a stale copy (a common way to pair a one-time listener with state).
  const keys = useRef({ go, flip: () => setFlipped((value) => !value) });
  keys.current = { go, flip: () => setFlipped((value) => !value) };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // A modal is open over the card (the glossary sheet): its keys scroll
      // and close it, they never move or flip the card behind.
      if (document.querySelector("dialog[open]") !== null) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable === true) return;
      if (event.key === "ArrowRight") keys.current.go(1);
      else if (event.key === "ArrowLeft") keys.current.go(-1);
      else if ((event.key === " " && tag !== "BUTTON" && tag !== "A") || event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        keys.current.flip();
      } else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (card === undefined) {
    return <p className="ct-empty">This deck has no cards yet. Add one from the deck list.</p>;
  }

  const starred = stars.has(card.id);
  const progress = ((safeIndex + 1) / order.length) * 100;
  // The glossary chips follow the face that shows: start materials and reagents, or the product.
  const links = onInfo === undefined ? [] : flipped ? glossaryLinksFor(card).definition : glossaryLinksFor(card).term;

  return (
    <section className="ct-flash" aria-label="Flashcards">
      <div
        className="ct-flip"
        onTouchStart={(event) => {
          touchX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchX.current;
          const end = event.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start === null || end === undefined) return;
          if (end - start < -60) go(1);
          else if (end - start > 60) go(-1);
        }}
      >
        <button
          type="button"
          key={card.id}
          className={`ct-flip__inner ${slide === null ? "" : `ct-slide-${slide}`}`}
          data-flipped={flipped}
          onClick={() => setFlipped((value) => !value)}
        >
          {/* No aria-label here: it would replace the card's own words. The
              hidden face is aria-hidden, so a screen reader reads the face
              that shows, then this line. */}
          <span className="sr-only">{flipped ? "Answer side. Press to see the question." : "Question side. Press to see the answer."}</span>
          <span className="ct-face ct-face--front" aria-hidden={flipped}>
            <span className="ct-face__eyebrow">Question</span>
            <TermSide card={card} size="big" />
            {/* Approved effect #13: a still folded corner that says the card turns. */}
            <span className="ct-fold" aria-hidden="true">
              <span className="ct-fold__label">Tap to flip</span>
            </span>
          </span>
          <span className="ct-face ct-face--back" aria-hidden={!flipped}>
            <span className="ct-face__eyebrow">Answer</span>
            <DefinitionSide card={card} size="big" />
          </span>
        </button>
        <button
          type="button"
          className="ct-card-star"
          aria-pressed={starred}
          aria-label={starred ? "Unstar this card" : "Star this card"}
          onClick={() => onToggleStar(card.id)}
        >
          <StarIcon filled={starred} />
        </button>
      </div>

      {onInfo !== undefined && links.length > 0 && (
        <div className="ct-info-row" role="group" aria-label="In the glossary">
          {links.map((link) => (
            <InfoChip key={link.entryId} label={link.label} entryId={link.entryId} onOpen={onInfo} />
          ))}
        </div>
      )}

      <div className="ct-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="ct-controls">
        <div className="ct-controls__side">
          <button
            type="button"
            className="ct-toggle"
            aria-pressed={shuffleSeed !== null}
            onClick={() => {
              setShuffleSeed((seed) => (seed === null ? Date.now() % 100000 : null));
              setIndex(0);
              setFlipped(false);
              setSlide(null);
            }}
          >
            <ShuffleIcon className="h-5 w-5" />
            <span>Shuffle</span>
          </button>
        </div>
        <div className="ct-controls__nav">
          <button type="button" className="ct-round" onClick={() => go(-1)} disabled={safeIndex === 0} aria-label="Previous card">
            <ArrowIcon direction="left" />
          </button>
          <span className="ct-count" aria-live="polite">
            {safeIndex + 1} / {order.length}
          </span>
          <button type="button" className="ct-round" onClick={() => go(1)} disabled={safeIndex === order.length - 1} aria-label="Next card">
            <ArrowIcon direction="right" />
          </button>
        </div>
        <div className="ct-controls__side ct-controls__side--end">
          <button
            type="button"
            className="ct-toggle"
            aria-pressed={starredOnly && starredCount > 0}
            disabled={starredCount === 0}
            title={starredCount === 0 ? "Star a card to study only those" : undefined}
            onClick={() => {
              setStarredOnly((value) => !value);
              setIndex(0);
              setFlipped(false);
              setSlide(null);
            }}
          >
            <StarIcon filled={starredOnly && starredCount > 0} className="h-5 w-5" />
            <span>Starred{starredCount > 0 ? ` (${starredCount})` : ""}</span>
          </button>
        </div>
      </div>
      <p className="ct-hint">Space flips. Arrow keys move. On a phone, swipe.</p>
    </section>
  );
}
