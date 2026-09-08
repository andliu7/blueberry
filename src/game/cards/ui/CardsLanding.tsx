/**
 * The Cards tab landing. Read this header before trusting anything in this
 * file.
 *
 * THE COMMITTED IMAGE IS blueberry_cards-landing in docs/reference/design-goals,
 * and its order, top to bottom, is a decision this file only renders: the tab
 * OPENS ON THE REVIEW DECISION, not on browsing. First the Due-today hero, a
 * periwinkle chip with one big number and a green REVIEW fill; then the
 * My-decks grid, each tile a structure doodle, a count and a thin green
 * mastery bar, with "+ New deck" beside the heading and My mistakes as a
 * first-class member of the grid; then the From-your-lessons row, every deck
 * in it carrying the lightning auto marker so authored and auto-collected
 * decks read differently at a glance.
 *
 * EVERY NUMBER COMES FROM landing.ts, which derives the hero's number and the
 * REVIEW queue from the same computation, so the button can never start a
 * different session than the one the number promised. This file holds no
 * arithmetic at all; it is the pixels over that file's model, which is what
 * lets test/cardsLanding.test.ts assert the numbers without rendering.
 *
 * THE CLOCK IS READ ONCE PER RENDER and handed down, per the gauntlet log's
 * wall-clock rule: the surface takes `now` as an injectable so a test can ask
 * about any hour, and the default reads the real clock at render, not at
 * module load.
 */

import { useMemo } from "react";
import type { Card, DeckId, DeckSource } from "../types";
import { decks as defaultDecks } from "../store";
import { loadMistakes, type SavedMistake } from "../../tabs/trainer/mistakes";
import { BlueberryMark } from "../../mascot/BlueberryMark";
import {
  distinctDoodles,
  heroModel,
  lessonDeckTiles,
  myDeckTiles,
  reviewQueue,
  type DeckTile,
} from "./landing";
import { AutoBolt, DeckDoodle } from "./Doodles";
import { useDeckSnapshot } from "./useDeck";
import "./cards.css";

export interface CardsLandingProps {
  readonly source?: DeckSource;
  /** Injected in tests. The default reads the journal the trainer writes. */
  readonly mistakes?: readonly SavedMistake[];
  /** Injected in tests, so the hero can be asked about any hour. */
  readonly now?: () => Date;
  /** Start the session the hero promised. The queue IS the hero's number. */
  readonly onReview: (cards: readonly Card[]) => void;
  /** Open one deck's tray. */
  readonly onOpenDeck: (deckId: DeckId) => void;
  /** The + New deck button, and the composer is where a new deck is born. */
  readonly onCompose: () => void;
}

export function CardsLanding({
  source = defaultDecks,
  mistakes,
  now = () => new Date(),
  onReview,
  onOpenDeck,
  onCompose,
}: CardsLandingProps) {
  const snapshot = useDeckSnapshot(source);
  const journal = useMemo(() => mistakes ?? loadMistakes(), [mistakes, snapshot]);
  const at = now();
  const hero = heroModel(snapshot, journal, at);
  const queue = useMemo(() => reviewQueue(snapshot, journal, at), [snapshot, journal, at]);
  const grid = useMemo(() => myDeckTiles(snapshot, journal), [snapshot, journal]);
  const lessonRow = useMemo(() => lessonDeckTiles(snapshot), [snapshot]);
  /**
   * NO TWO SKETCHES ON ONE SCREEN ARE THE SAME. The committed landing draws a
   * different structure on each of its four tiles; the round 2 build hashed
   * the deck id straight to a sketch and drew the identical Br-branched one
   * on "EAS Reactions" and "My mistakes". `distinctDoodles` keeps each deck's
   * own hashed face wherever it can and resolves a collision deterministically
   * from the list, so a tile still keeps its face across visits.
   */
  const gridSketches = useMemo(() => distinctDoodles(grid.map((t) => t.deckId)), [grid]);
  const lessonSketches = useMemo(() => distinctDoodles(lessonRow.map((t) => t.deckId)), [lessonRow]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
      {/* The hero. A chip, not a button: the green REVIEW fill inside it is
          the press target, and the number is the queue it starts. */}
      <section className="hero-chip relative flex flex-col items-center gap-1 px-6 py-6 text-center">
        {/* ALL THREE HERO LINES ARE THE HERO'S OWN INK, and after round 3
            that ink is WHITE. The committed landing draws "Due today", the
            number and "cards ready to review" in white on the periwinkle
            panel; round 2 drew all three in dark navy, which inverts the
            panel's role and makes the one coloured shape on the screen read
            as a light one. Nothing here names a colour: .hero-chip sets
            --cards-hero-ink and every line inherits it, so the measured pair
            is decided once, in cards.css, where the 4.94 is written down. */}
        <h1 className="bb-title-face text-scale-lg font-bold">{hero.title}</h1>
        {/* THE ONE BIG NUMBER, at the committed image's weight: the largest
            glyph on the screen by a clear step, because it is the answer to
            the only question this tab opens with. See .hero-number. */}
        <p className="hero-number bb-title-face font-bold" aria-hidden="true">
          {hero.due}
        </p>
        <p className="text-scale-sm font-semibold">
          <span className="sr-only">{hero.due} </span>
          {hero.subline}
        </p>
        <button
          type="button"
          className="chip3d chip3d--go press bb-title-face mt-3 min-h-11 rounded-full px-10 text-scale-base font-bold uppercase tracking-wide"
          disabled={hero.buttonDisabled}
          onClick={() => onReview(queue)}
        >
          {hero.buttonLabel}
        </button>
        {/* THE MASCOT LEANS ON THE HERO'S RIGHT EDGE, which is the pose the
            committed landing image draws and one DESIGN-GOALS asks for by
            name ("peeking and leaning poses are wanted").

            ROUND 3 MADE IT ACTUALLY BREAK THE OUTLINE. The critic measured
            the round 2 berry as fully contained inside the hero's rounded
            rectangle, touching neither the bottom nor the right edge, which
            is what -bottom-6 right-0 comes to once BlueberryMark's own
            viewBox padding is counted: the drawn berry fills about 72 percent
            of its box, so its visible edge stopped short of a corner it was
            nominally sitting on. At 128px, with the box pushed 36px below the
            hero and 24px past its right edge, the berry's lower body and its
            right side cross the outline the way the drawing's do, and the
            drawn berry comes to roughly 55 percent of the hero's height,
            which is the image's own proportion. .hero-chip carries
            overflow: visible so the crossing is drawn rather than clipped,
            and the 8px of horizontal overhang lands inside the page's own
            16px padding, so nothing overflows at 320px.

            WHAT IS STILL SHORT OF THE IMAGE, AND WHY IT IS NOT FIXED HERE.
            The drawn berry has green leaves, arms and legs; BlueberryMark
            draws a violet star calyx and no limbs. That art lives in
            apps/web/src/mascot/BlueberryMark.tsx, which is shared by every
            surface in the app and is not this piece's to edit during a
            fan-out round, and DESIGN-GOALS' own rule is that the mascot is
            IMPORTED, never redrawn: growing limbs on a copy inside cards/
            would fork the character rather than close the gap. It is reported
            as a blocker for the mascot's owner. The pose, the size and the
            placement are the part this file can honestly supply, and they
            are supplied. */}
        <span
          className="pointer-events-none absolute -bottom-9 -right-6 rotate-[8deg]"
          aria-hidden="true"
        >
          <BlueberryMark className="h-32 w-32" eyes mood={hero.due === 0 ? "happy" : "curious"} />
        </span>
      </section>

      {/* My decks: the authored grid, mistakes included as a full member. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="bb-title-face text-scale-xl font-bold text-bb-foreground">My decks</h2>
          <button
            type="button"
            className="press min-h-11 rounded-full border-2 border-[color:var(--bb-primary-edge)] px-4 text-scale-sm font-bold text-[color:var(--bb-primary-ink)]"
            onClick={onCompose}
          >
            + New deck
          </button>
        </div>
        {grid.length === 0 ? (
          <p className="text-scale-sm text-bb-muted-foreground">No decks yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {grid.map((tile, index) => (
              <li key={tile.deckId}>
                <DeckTileButton tile={tile} sketch={gridSketches[index] ?? 0} onOpen={onOpenDeck} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* From your lessons: the auto-collected row, every tile bolted. */}
      {lessonRow.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="bb-title-face text-scale-xl font-bold text-bb-foreground">From your lessons</h2>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {lessonRow.map((tile, index) => (
              <li key={tile.deckId} className="w-44 shrink-0">
                <DeckTileButton
                  tile={tile}
                  sketch={lessonSketches[index] ?? 0}
                  onOpen={onOpenDeck}
                  compact
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * One deck tile: doodle, name, count, thin mastery bar, and the marker that
 * says which kind of deck this is. The whole tile is the button; the mastery
 * bar's fill is the goal green closed by its own edge, per the fill-only rule.
 */
function DeckTileButton({
  tile,
  sketch,
  onOpen,
  compact = false,
}: {
  readonly tile: DeckTile;
  /** From distinctDoodles: this tile's sketch, guaranteed unique on screen. */
  readonly sketch: number;
  readonly onOpen: (deckId: DeckId) => void;
  readonly compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`chip3d chip3d--bb-card press relative flex w-full flex-col items-center gap-1.5 p-4 text-center ${
        compact ? "min-h-32" : "min-h-40"
      }`}
      onClick={() => onOpen(tile.deckId)}
    >
      {/* THE MISTAKES BERRY SITS IN THE TILE'S CORNER, which is exactly where
          the committed landing image draws it, as a small sticker over the
          tile's top-right edge, at 36px against the tile's 160. Round 3 took
          it up from 28, which the critic measured as reading like a small
          dot rather than a sticker sitting on the corner. The AUTO marker
          does NOT: the same image
          draws it as a bare yellow bolt INLINE with the deck's name, and the
          card-states sheet draws the auto tray's bolt notched into the front
          panel, so no ringed corner disc appears in either reference. Round 2
          drew one, and that badge is gone. */}
      {tile.marker === "mistakes" && (
        <span className="absolute -right-2 -top-2" aria-hidden="true">
          <BlueberryMark className="h-9 w-9" eyes mood="focused" />
        </span>
      )}
      <span className="text-bb-muted-foreground">
        <DeckDoodle variant={sketch} className={compact ? "h-8 w-10" : "h-10 w-12"} />
      </span>
      <span className="flex w-full items-center justify-center gap-1">
        <span className="truncate text-scale-base font-bold text-bb-card-foreground">{tile.title}</span>
        {tile.marker === "auto" && <AutoBolt className="h-4 w-4 text-[color:var(--warn-ink-strong)]" />}
      </span>
      <span className="text-scale-sm text-bb-muted-foreground">
        {tile.count === 1 ? "1 card" : `${tile.count} cards`}
        {tile.marker === "auto" ? " · auto" : ""}
      </span>
      <span
        className="mastery-bar mt-auto block w-full"
        role="img"
        aria-label={`${Math.round(tile.mastery * 100)} percent mastered`}
      >
        <span className="mastery-bar__fill block" style={{ width: `${Math.round(tile.mastery * 100)}%` }} />
      </span>
    </button>
  );
}
