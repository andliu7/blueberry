/**
 * The review session. Read this header before trusting anything in this file.
 *
 * THE LOOP: a card front, tap to reveal, then Again, Hard, Good, Easy. That is
 * the Anki borrow CLAUDE.md names, and the instruction beside it is "take the
 * scheduler, leave the interface". So this screen is not Anki's grid of blue
 * boxes. It is the reference's single tall card
 * (docs/reference/competitors/orgosolver-02-flashcard-decks.png, right hand
 * phone) with a thin progress rule and an Exit at the top, and it carries the
 * four ratings that Anki's grid was hiding underneath a menu.
 *
 * THE BUTTONS SAY WHEN THE CARD COMES BACK. `scheduler.nextInterval` is pure
 * and was split out for exactly this, so Good reads "Good, 8 days". It turns a
 * mood rating into a choice with a visible consequence, and it is the one
 * piece of Anki's interface worth keeping.
 *
 * WHERE THE STATE LIVES. The session's own state is a reducer in session.ts,
 * so the queue and the counter can be replayed in a test. The card's SCHEDULE
 * is not this component's business: `source.rate` is the seam, the local store
 * behind it asks scheduler.ts what a rating does, and Phase 6 swaps a Supabase
 * backed source in without touching this file.
 *
 * VOICE. Nothing on this screen scolds. Again is a normal step and the copy
 * treats it as one, which is not a nicety: a student who feels judged for
 * pressing Again presses Good instead, and the scheduler is then working from
 * a lie. The one system the whole surface exists to feed depends on honest
 * self reports.
 */

import { useMemo, useState } from "react";
import type { Card, DeckSource, Rating, ReviewState } from "../types";
import { RATING_LABELS, RATINGS } from "../types";
import { decks } from "../store";
import { nextInterval, startCard } from "../scheduler";
import { CardFace } from "./CardFace";
import { cardSchedulerState } from "./cardState";
import "./cards.css";
import { intervalLabel } from "./intervalLabel";
import {
  currentCard,
  isFinished,
  rateCurrent,
  reveal,
  sessionCounter,
  sessionProgress,
  sessionSummary,
  startSession,
  summaryHeadline,
  summaryLine,
  type ReviewSessionState,
} from "./session";

export interface ReviewSessionProps {
  readonly cards: readonly Card[];
  /** Defaults to the app's local store. Injected in tests and in Phase 6. */
  readonly source?: DeckSource;
  /** Leaving early. The session is not saved; every rating already committed. */
  readonly onExit: () => void;
  /** Called when the last card is rated, with the diamonds the run displayed. */
  readonly onDone?: (diamonds: number) => void;
}

/**
 * Each rating's chip, from the cards.css 3D chip family, per the committed
 * button-types sheet: four small grade chips in a ramp, each a fill under its
 * own measured ink, each carrying its own interval. Hard is amber, Good is
 * the goal-green GO fill under dark ink (the fill-only rule's legal shape),
 * Easy is the teal alt-route family.
 *
 * ROUND 3 MADE HARD AND EASY SOLID. They were --warn-soft-solid and
 * --alt-route-soft, pale tints carrying their token's dark hue as TYPE, so
 * the row alternated solid, pale, solid, pale and the two pale chips read as
 * switched off beside their neighbours. The sheet draws four saturated fills
 * of one weight; cards.css carries the sampled values and the measured inks.
 *
 * AGAIN IS THE ONE DIVERGENCE FROM THE SHEET AND IT IS DELIBERATE. The sheet
 * draws it red; CLAUDE.md rules that red is for destructive acts and never
 * for a student learning, and DESIGN-TOKENS' 2026-08-27 amendment says a
 * retention surface never uses the error ramp. A student who feels judged for
 * pressing Again presses Good instead, and the scheduler is then working from
 * a lie, which is the one input this whole surface exists to collect. So
 * Again takes the periwinkle chip family: still plainly live, still its own
 * hue in a four-hue row, and no longer the --bb-muted face it used to wear,
 * which was also the DISABLED chip's face and read as switched off.
 */
const RATING_CHIP: Readonly<Record<Rating, string>> = {
  again: "chip3d--quiet",
  hard: "chip3d--hard",
  good: "chip3d--go",
  easy: "chip3d--easy",
};

export function ReviewSession({ cards, source = decks, onExit, onDone }: ReviewSessionProps) {
  const [state, setState] = useState<ReviewSessionState>(() => startSession(cards));
  const snapshot = source.getSnapshot();
  const card = currentCard(state);
  const done = isFinished(state);
  const summary = useMemo(() => sessionSummary(state), [state]);

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-6 text-center">
        {/* The session's one big number, in the page's own ink. It was green
            type through --good, which DESIGN-GOALS' fill-only clause does not
            allow whatever the shade: no goal image draws green type, and a
            second darker green existing so that a number can be green is a
            reinterpretation of the clause rather than a reading of it. */}
        <p className="title-face text-scale-display font-bold text-bb-foreground">{summary.reviewed}</p>
        <h1 className="title-face text-scale-2xl font-bold text-bb-foreground">{summaryHeadline(summary)}</h1>
        <p className="text-scale-base leading-normal text-bb-muted-foreground">{summaryLine(summary)}</p>
        <p className="text-scale-base font-semibold text-[color:var(--diamond)]">
          {summary.diamonds} diamonds
        </p>
        {/* The committed button sheet's CONTINUE chip: periwinkle face, thick
            darker bottom edge, presses down. Round 2 shipped a flat violet
            slab with no edge and no depression here, which is the one screen
            in the deck where the shape language matters most.

            Deliberately CONTINUE and not the sheet's green CLAIM, though this
            is the end-of-session moment where a claim would sit: nothing on
            this screen is claimed. The diamonds line above is the run's
            tally, and CardsHome does not credit it to a balance, so a button
            reading "Claim" would promise a transaction that does not happen.
            When the economy store is wired to onDone, this is the button that
            becomes chip3d--go and says Claim, and not before. */}
        <button
          type="button"
          className="chip3d press title-face min-h-14 w-full rounded-full text-scale-lg font-bold"
          onClick={() => {
            onDone?.(summary.diamonds);
            onExit();
          }}
        >
          Done
        </button>
      </div>
    );
  }

  if (card === null) {
    // Only reachable if a card id outlived its card, which the store's trim
    // could do. Say so rather than rendering an empty frame.
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 p-6">
        <p className="text-scale-base text-bb-foreground">That card is no longer in your deck.</p>
        <button type="button" className="press min-h-11 rounded-xl bg-bb-muted px-4 font-semibold" onClick={onExit}>
          Back to the decks
        </button>
      </div>
    );
  }

  // One clock read per render, per the wall-clock rule: the fallback state
  // and the badge both see the same instant.
  const at = new Date();
  const reviewState: ReviewState = snapshot.review[card.id] ?? startCard(card.id, at);
  const schedulerState = cardSchedulerState(snapshot.review[card.id], at);

  const press = (rating: Rating): void => {
    const outcome = rateCurrent(state, rating);
    if (outcome === null) return;
    // The rating is committed through the seam FIRST, so a student who closes
    // the tab mid session keeps the schedule they earned.
    source.rate(outcome.cardId, outcome.rating);
    setState(outcome.state);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="press min-h-11 rounded-xl px-2 text-scale-sm font-semibold text-bb-muted-foreground"
          onClick={onExit}
        >
          Exit
        </button>
        {/* The session bar is the mastery bar: a filled bar is the progress
            semantic, so it takes the goal-green FILL closed by its own edge,
            not the correctness emerald it used to borrow. */}
        <div className="mastery-bar flex-1">
          <div
            className="mastery-bar__fill"
            style={{ width: `${Math.round(sessionProgress(state) * 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-scale-sm font-semibold tabular-nums text-bb-muted-foreground">
          {sessionCounter(state)}
        </span>
      </div>

      <CardFace
        card={card}
        revealed={state.revealed}
        onReveal={() => setState(reveal(state))}
        schedulerState={schedulerState}
      />

      {state.revealed ? (
        /* Four in a row, as the committed button sheet draws them: the four
           grades are ONE ramp and reading them as a ramp is the point, which a
           2x2 block breaks into two pairs. At 320px each chip is 66px wide and
           56px tall, clear of the 44px floor, and each still carries its own
           interval. */
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((rating) => (
            /* THE INTERVAL IS INSIDE THE PILL AND THE WORD IS THE CAPTION
               UNDER IT, which is the size hierarchy the committed button
               sheet draws and round 2 had exactly backwards: the word sat in
               the pill at the large scale with the interval tucked under it
               inside the same chip, and nothing was written beneath the chip
               at all. The sheet's reading is the better one on its own
               merits too. Four chips in a ramp are told apart by colour and
               by position; what a student is actually choosing between is
               ten minutes and seven days, so the consequence is what belongs
               at the size the eye lands on. */
            <div key={rating} className="flex flex-col items-center gap-1">
              <button
                type="button"
                className={`chip3d chip3d--grade ${RATING_CHIP[rating]} press flex min-h-14 w-full items-center justify-center px-1 text-scale-lg font-bold tabular-nums`}
                /* The visible text is now the interval alone, which shifts
                   per card, so the label carries the rating word first and
                   names the consequence in a sentence. */
                aria-label={`${RATING_LABELS[rating]}, comes back in ${intervalLabel(nextInterval(reviewState, rating))}`}
                onClick={() => press(rating)}
              >
                {intervalLabel(nextInterval(reviewState, rating), "short")}
              </button>
              {/* The caption. aria-hidden because the button above it already
                  says the word in its own accessible name, and a screen
                  reader that met both would hear "Good" twice. */}
              <span className="text-scale-xs font-semibold text-bb-muted-foreground" aria-hidden="true">
                {RATING_LABELS[rating]}
              </span>
            </div>
          ))}
        </div>
      ) : (
        /* The committed button sheet draws this exact button type, CHECK, as a
           periwinkle 3D chip. Round 2 gave it a flat violet fill with a
           border and no edge, so it had no bottom slab and did not press
           down; the base .chip3d face IS the periwinkle, so no modifier. */
        <button
          type="button"
          className="chip3d press title-face min-h-14 w-full rounded-full text-scale-lg font-bold"
          onClick={() => setState(reveal(state))}
        >
          Show the answer
        </button>
      )}

      {state.requeued.includes(card.id) && (
        <p className="text-center text-scale-sm text-bb-muted-foreground">
          Second time round for this one. Nothing is lost by that.
        </p>
      )}
    </div>
  );
}
