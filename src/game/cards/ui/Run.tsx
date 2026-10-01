/**
 * The review run: the full-screen loop a student grades cards in. Read this
 * header before trusting anything in this file.
 *
 * THE LOOP. A card front. On a reaction card from the registry, the student
 * CALLS the product from three drawings (predict.ts), or says "I don't know yet";
 * the pick is the only way to the back. The answer lands in place, the dock
 * lights the grade the call points at, and the student grades with a button,
 * a key (1 to 4) or a swipe (right is Good, left is Again). Every grade goes
 * through `source.rate` first, so closing the tab mid run keeps what was earned.
 *
 * WHY AN OVERLAY. The old session lived inside the tab under the HUD header,
 * and on a 390 by 844 phone its four grade chips sat below the fold on every
 * reaction card: a student scrolled to grade, every card. The run is fixed
 * over the whole app (cards.css `.run`), the card scrolls in the middle, and
 * the dock is pinned to the bottom edge, so the grades are always in reach.
 *
 * STATE. The queue is session.ts's reducer, unchanged (its requeue cap and
 * counter are tested there). This file adds only what the screen needs: the
 * current call, the calls made so far, and the drag offset. The schedule is
 * never this file's business; `source.rate` asks scheduler.ts.
 *
 * VOICE. Nothing here scolds. A wrong call is "not this time", Again is a
 * normal step, and the streak simply restarts without a falling number.
 */

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { REACTIONS } from "../../../data/reactions";
import type { SavedMistake } from "../../tabs/trainer/mistakes";
import { reviewInterval, startCard } from "../scheduler";
import type { Card, DeckSource, Rating, ReviewState } from "../types";
import { RATING_LABELS, RATINGS } from "../types";
import { CardFace, Drawing } from "./CardFace";
import { cardSchedulerState } from "./cardState";
import { dueForecast } from "./forecast";
import { FormulaLabel } from "./FormulaLabel";
import { intervalLabel } from "./intervalLabel";
import { predictionChoices, type PredictOption } from "./predict";
import {
  calledLine,
  dueAtRunStart,
  dueGraded,
  ratingForKey,
  runHeadline,
  rewardLine,
  runStats,
  suggestedRating,
  swipeRating,
  type PredictionRecord,
  type RunStats,
} from "./runStats";
import {
  currentCard,
  isFinished,
  rateCurrent,
  reveal,
  sessionCounter,
  sessionSummary,
  startSession,
  summaryLine,
  type ReviewSessionState,
} from "./session";
import { useDeckSnapshot } from "./useDeck";
import "./cards.css";

export interface RunProps {
  readonly cards: readonly Card[];
  readonly source: DeckSource;
  /** The trainer journal, for the summary's forecast (today counts drafts too). */
  readonly journal: readonly SavedMistake[];
  /** Leaving, early or after the summary. Every grade is already committed. */
  readonly onExit: () => void;
  /**
   * Credits a finished run with `graded` distinct DUE cards graded (see
   * runStats.dueAtRunStart: early re-reviews do not count) and returns
   * the diamonds the economy actually paid (CardsHome passes the progress
   * store's finishCardRun). Absent in tests and previews: nothing is paid.
   */
  readonly credit?: (graded: number) => number;
}

/** The chip family per grade. Again is periwinkle, never red: see cards.css. */
export const GRADE_CHIP: Readonly<Record<Rating, string>> = {
  again: "",
  hard: "chip3d--hard",
  good: "chip3d--go",
  easy: "chip3d--easy",
};

/** Above this many cards, segments would be slivers; one bar reads better. */
const SEGMENT_LIMIT = 24;

interface Call {
  readonly cardId: string;
  /** The option's key, or null for "I don't know". */
  readonly key: string | null;
  readonly correct: boolean;
}

export function Run({ cards, source, journal, onExit, credit }: RunProps) {
  const [state, setState] = useState<ReviewSessionState>(() => startSession(cards));
  // What the economy paid for this run, set once, when the last grade lands.
  const [credited, setCredited] = useState(0);
  const [calls, setCalls] = useState<readonly Call[]>([]);
  const [dx, setDx] = useState(0);
  // Where a swipe started and how wide the card was, or null when no finger
  // is down. State rather than a ref because the card's class reads it.
  const [drag, setDrag] = useState<{ readonly x: number; readonly width: number } | null>(null);
  const snapshot = useDeckSnapshot(source);
  // A useState initializer runs once, on the first render: the cards that were
  // due as the run opened, before its own grades move any due date.
  const [dueAtStart] = useState(() => dueAtRunStart(cards, source.getSnapshot(), new Date()));

  const card = currentCard(state);
  const done = isFinished(state);
  // `calls` keeps every call in order (the streak reads that order); this
  // card's call is its latest, since a card back after Again is called again.
  const call = card === null ? undefined : [...calls].reverse().find((entry) => entry.cardId === card.id);
  const choices = useMemo(() => (card === null ? null : predictionChoices(card, REACTIONS)), [card]);
  const predictions: PredictionRecord[] = calls.map(({ cardId, correct }) => ({ cardId, correct }));
  const stats = runStats(state.ratings, predictions);

  const press = (rating: Rating): void => {
    const outcome = rateCurrent(state, rating);
    if (outcome === null) return;
    source.rate(outcome.cardId, outcome.rating);
    // Paid from the event handler that finishes the run, not from an effect:
    // a handler runs once per press, so the run cannot be credited twice.
    if (isFinished(outcome.state)) setCredited(credit?.(dueGraded(outcome.state.finished, dueAtStart)) ?? 0);
    setState(outcome.state);
    setDx(0);
  };

  const flip = (): void => setState(reveal(state));

  // The pick IS the flip on a predict card: there is no other way to the
  // back, so the step cannot be skipped by a stray tap. "I don't know" is an
  // honest call (null) and counts as a miss, which is what it is.
  const callIt = (option: PredictOption | null): void => {
    if (card === null || state.revealed) return;
    const entry: Call = { cardId: card.id, key: option?.key ?? null, correct: option?.correct === true };
    setCalls([...calls, entry]);
    flip();
  };

  // useRef reaches the scrolling stage element so a new card, or a flip,
  // starts at its top: round 2 found the back opened scrolled past its own
  // start structure. The effect runs after React has drawn the new content.
  const stage = useRef<HTMLDivElement | null>(null);
  const cardId = card?.id ?? null;
  useEffect(() => {
    if (stage.current !== null) stage.current.scrollTop = 0;
  }, [cardId, state.revealed]);

  // THE KEYBOARD PATH. An effect that subscribes a window listener and returns
  // its own cleanup, so the listener always sees this render's `press` and is
  // removed when the run closes. Re-subscribing each render is cheap and is
  // the boring alternative to a ref juggling the latest handler.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onExit();
        return;
      }
      if (done) return;
      if (!state.revealed && choices !== null) {
        // Keys 1 to 3 call an option; nothing else flips a predict card.
        const index = Number.parseInt(event.key, 10);
        const option = event.key.length === 1 ? choices[index - 1] : undefined;
        if (option !== undefined) callIt(option);
        return;
      }
      if (!state.revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        flip();
        return;
      }
      const rating = state.revealed ? ratingForKey(event.key) : null;
      if (rating !== null) press(rating);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (done) {
    return (
      <div className="run" role="dialog" aria-modal="true" aria-label="Review finished">
        <RunSummary
          state={state}
          stats={stats}
          credited={credited}
          dueCount={dueGraded(state.finished, dueAtStart)}
          forecast={dueForecast(snapshot, journal, new Date())}
          onDone={onExit}
        />
      </div>
    );
  }

  if (card === null) {
    // Only reachable if a card id outlived its card (the store's trim).
    return (
      <div className="run items-center justify-center gap-3 p-6" role="dialog" aria-modal="true">
        <p className="text-scale-base">That card is no longer in your deck.</p>
        <button type="button" className="cards-ghost press" onClick={onExit}>
          Back to the decks
        </button>
      </div>
    );
  }

  // One clock read per render: the fallback state and the badge agree.
  const at = new Date();
  const reviewState = snapshot.review[card.id] ?? startCard(card.id, at);
  const suggested = suggestedRating(call === undefined ? null : call.correct);
  const swipeHint = state.revealed ? swipeRating(dx, drag?.width ?? 360) : null;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!state.revealed) return;
    setDrag({ x: event.clientX, width: event.currentTarget.getBoundingClientRect().width });
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (drag !== null) setDx(event.clientX - drag.x);
  };
  const onPointerUp = (): void => {
    setDrag(null);
    const rating = drag === null ? null : swipeRating(dx, drag.width);
    if (rating !== null) press(rating);
    else setDx(0);
  };
  const onPointerCancel = (): void => {
    setDrag(null);
    setDx(0);
  };

  return (
    <div className="run" role="dialog" aria-modal="true" aria-label="Review">
      <div className="run__top">
        <button
          type="button"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-bb-muted-foreground"
          onClick={onExit}
          aria-label="End review"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <Progress state={state} />
        <span className="shrink-0 text-scale-sm font-semibold tabular-nums text-bb-muted-foreground">
          {sessionCounter(state)}
        </span>
      </div>

      {/* After a pick the streak joins the verdict in the dock instead
          (verdictLine), and this row's height goes to the card's why. */}
      {!(state.revealed && choices !== null) && (
      <div className="flex min-h-7 items-center justify-center px-4" aria-live="polite">
        {stats.streak >= 2 && (
          <span className="rounded-full bg-[color:var(--progress)] px-3 py-0.5 text-scale-sm font-bold text-[color:var(--progress-ink)]">
            {stats.streak} in a row
          </span>
        )}
        {state.requeued.includes(card.id) && stats.streak < 2 && (
          <span className="text-scale-sm text-bb-muted-foreground">Second look at this one. Nothing is lost by that.</span>
        )}
      </div>
      )}

      <div className="run__stage" ref={stage}>
        <div
          className={`run__card relative ${drag === null ? "" : "run__card--dragging"}`}
          style={{ transform: dx === 0 ? undefined : `translateX(${dx}px) rotate(${dx / 30}deg)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {swipeHint !== null && (
            <span className={`run__swipe-label run__swipe-label--${swipeHint}`}>{RATING_LABELS[swipeHint]}</span>
          )}
          {/* key={card.id} remounts the face per card, so no reveal animation
              carries over from the card before. On a predict card the front
              is not a button: the pick below is the only way to the back. */}
          <CardFace
            key={card.id}
            card={card}
            revealed={state.revealed}
            onReveal={flip}
            schedulerState={cardSchedulerState(snapshot.review[card.id], at)}
            {...(choices === null ? {} : { frontPrompt: "Call the product below" })}
          />
        </div>
      </div>

      <div className="run__dock">
        {state.revealed ? (
          <>
            {choices !== null && <YourCall choices={choices} call={call} verdict={verdictLine(call, stats.streak)} />}
            <GradeDock reviewState={reviewState} suggested={suggested} onPress={press} now={at} />
            {/* The swipe hint only on a plain card: after a pick the dock's
                height is the card's why, which must stay above the fold. */}
            {choices === null && (
              <p className="m-0 text-center text-scale-xs text-bb-muted-foreground">
                Swipe the card right for Good, left for Again
              </p>
            )}
          </>
        ) : choices !== null ? (
          <PredictOptions choices={choices} onCall={callIt} />
        ) : (
          <button type="button" className="chip3d press bb-title-face w-full text-scale-lg font-bold" onClick={flip}>
            Show the answer
          </button>
        )}
      </div>
    </div>
  );
}

/** The one line over the grades after a pick. Coach voice, never a scold. */
function verdictLine(call: Call | undefined, streak: number): string {
  // Short: beside a drawing it has about 120px. The product is in the card.
  if (call === undefined || call.key === null) return "No call this time. The product is in the card.";
  if (call.correct) return streak >= 2 ? `You called it, ${streak} in a row.` : "You called it.";
  return "Not this time.";
}

/**
 * The four grades, each carrying when the card comes back if pressed: the one
 * piece of Anki's interface worth keeping, because it turns a mood into a
 * choice with a visible consequence. The word is on top and the interval
 * under it, and the accessible name says both as a sentence.
 */
export function GradeDock({
  reviewState,
  suggested,
  onPress,
  now,
}: {
  readonly reviewState: ReviewState;
  readonly suggested: Rating | null;
  readonly onPress: (rating: Rating) => void;
  /** The clock read the run made this render; absent, the dock reads its own. */
  readonly now?: Date;
}) {
  const at = now ?? new Date();
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="How well did you know it">
      {RATINGS.map((rating, index) => {
        // reviewInterval, not nextInterval: a card passed before it is due
        // keeps its schedule (scheduler.ts), and the label must say so.
        const interval = reviewInterval(reviewState, rating, at);
        return (
          <button
            key={rating}
            type="button"
            className={`chip3d grade-chip ${GRADE_CHIP[rating]} ${suggested === rating ? "grade-chip--suggested" : ""}`}
            aria-label={`${RATING_LABELS[rating]}, comes back in ${intervalLabel(interval)}${suggested === rating ? ", suggested" : ""}`}
            aria-keyshortcuts={String(index + 1)}
            onClick={() => onPress(rating)}
          >
            <span className="text-scale-base font-bold">{RATING_LABELS[rating]}</span>
            <span className="text-scale-xs font-semibold tabular-nums">{intervalLabel(interval, "short")}</span>
          </button>
        );
      })}
    </div>
  );
}

/** One segment per card, filled as each is finished; one bar past the limit. */
function Progress({ state }: { readonly state: ReviewSessionState }) {
  const finished = state.finished.length;
  if (state.total > SEGMENT_LIMIT) {
    return (
      <div className="run__segments" aria-hidden="true">
        <div className="run__segment relative overflow-hidden">
          <div className="run__segment--done h-full rounded-full" style={{ width: `${(finished / state.total) * 100}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div className="run__segments" aria-hidden="true">
      {Array.from({ length: state.total }, (_, index) => (
        <div
          key={index}
          className={`run__segment ${index < finished ? "run__segment--done" : index === finished ? "run__segment--now" : ""}`}
        />
      ))}
    </div>
  );
}

/**
 * "Call the product": three drawings, one of them the answer, as full-width
 * rows in the dock. Each row shows its drawing only, because the names would
 * give the answer away; keys 1 to 3 pick in the same order, and "I don't know
 * yet" is the honest way out.
 */
function PredictOptions({
  choices,
  onCall,
}: {
  readonly choices: readonly PredictOption[];
  readonly onCall: (option: PredictOption | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* No heading here: the card right above says "Call the product
          below", and the line it would take is the card's last line. */}
      <div className="predict" role="group" aria-label="Call the product">
        {choices.map((option, index) => (
          <button
            key={option.key}
            type="button"
            className="predict__option press"
            aria-label={`Option ${index + 1}`}
            aria-keyshortcuts={String(index + 1)}
            onClick={() => onCall(option)}
          >
            <Drawing light={option.light} dark={option.dark} alt="" className="predict__art" />
          </button>
        ))}
      </div>
      <button type="button" className="cards-ghost press w-full text-scale-sm" onClick={() => onCall(null)}>
        I don't know yet
      </button>
    </div>
  );
}

/**
 * After the pick: the student's own call, in its row, with words saying what
 * it is ("the other end of the allyl system", or "Product"). ROUND 5: the
 * three rows used to stay in the dock, 456px of an 844px phone, and the
 * card's why sat under them on every predict card (round 3 critic). The
 * product is drawn in the card's own scheme once revealed, so the dock keeps
 * only the one drawing the card cannot show, at its full size: its labels
 * are sized by --predict-art-height (cardsContrast.test.ts), so it is not
 * shrunk to make room. "I don't know yet" has no call to show.
 */
function YourCall({
  choices,
  call,
  verdict,
}: {
  readonly choices: readonly PredictOption[];
  readonly call: Call | undefined;
  readonly verdict: string;
}) {
  const option = choices.find((choice) => choice.key === call?.key);
  if (option === undefined) {
    return (
      <p className="m-0 text-scale-sm font-semibold" aria-live="polite">
        {verdict}
      </p>
    );
  }
  // The verdict sits in the row's words, not on a line of its own: that line
  // was the last 31px the acetylide card's why needed at 390 by 844.
  return (
    <div className="predict">
      <div className={`predict__option predict__option--mine ${option.correct ? "predict__option--right" : "predict__option--picked"}`}>
        <Drawing light={option.light} dark={option.dark} alt="" className="predict__art" />
        <span className="predict__words">
          <span className="text-scale-sm font-semibold leading-tight" aria-live="polite">
            {verdict}
          </span>
          <span className="flex flex-wrap gap-1">
            <span className="predict__badge predict__badge--picked">Your call</span>
            {option.correct && <span className="predict__badge predict__badge--right">Product</span>}
          </span>
          {!option.correct && <FormulaLabel text={option.label} prose className="text-scale-xs leading-tight" />}
        </span>
      </div>
    </div>
  );
}

/**
 * The end of a run: a full-bleed moment distinct from the working screen, per
 * the Duolingo bar for reward moments. One large number, then what the run
 * showed, then what is coming, then one button.
 */
function RunSummary({
  state,
  stats,
  credited,
  dueCount,
  forecast,
  onDone,
}: {
  readonly state: ReviewSessionState;
  readonly stats: RunStats;
  readonly credited: number;
  /** Graded cards that were due at the start: what the reward counted. */
  readonly dueCount: number;
  readonly forecast: readonly { readonly label: string; readonly count: number }[];
  readonly onDone: () => void;
}) {
  const summary = sessionSummary(state);
  const called = calledLine(stats);
  const reward = rewardLine(dueCount, credited);
  const presses = RATINGS.reduce((sum, rating) => sum + stats.split[rating], 0);
  const tomorrow = forecast[1]?.count ?? 0;
  const week = forecast.slice(1).reduce((sum, day) => sum + day.count, 0);
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 overflow-y-auto p-6 pt-10">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="bb-title-face m-0 text-[4rem] font-bold leading-none">{summary.reviewed}</p>
        <p className="m-0 text-scale-sm font-semibold uppercase tracking-wide text-bb-muted-foreground">
          {summary.reviewed === 1 ? "card reviewed" : "cards reviewed"}
        </p>
        <h1 className="bb-title-face m-0 mt-3 text-scale-2xl font-bold">{runHeadline(summary, stats)}</h1>
        <p className="m-0 text-scale-base leading-normal text-bb-muted-foreground">{summaryLine(summary)}</p>
      </div>

      {/* THE DIAMONDS TILE SHOWS WHAT WAS CREDITED. Round 2 showed one per
          card that nothing ever paid. Since the owner's decision of 1 Oct the
          run journals `cards_reviewed` and the economy decides the payout
          (DIAMONDS_CARD_RUN), so this is the receipt's number, 0 included.
          The best streak counts right calls (runStats.ts). */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat value={called === null ? "None" : `${stats.called}/${stats.predicted}`} label="Called it" />
        <Stat value={String(stats.bestStreak)} label="Best streak of right calls" />
        <Stat value={String(credited)} label="Diamonds" />
      </div>
      {reward !== null && <p className="m-0 text-center text-scale-xs text-bb-muted-foreground">{reward}</p>}

      {presses > 0 && (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-scale-sm font-semibold">How it went</p>
          <div className="flex h-4 overflow-hidden rounded-full" aria-hidden="true">
            {RATINGS.map((rating) =>
              stats.split[rating] === 0 ? null : (
                <div
                  key={rating}
                  className={`chip3d ${GRADE_CHIP[rating]} !min-h-0 !rounded-none !shadow-none`}
                  style={{ width: `${(stats.split[rating] / presses) * 100}%` }}
                />
              ),
            )}
          </div>
          <ul className="m-0 flex list-none justify-between p-0 text-scale-xs text-bb-muted-foreground">
            {RATINGS.map((rating) => (
              <li key={rating}>
                {RATING_LABELS[rating]} {stats.split[rating]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="m-0 rounded-2xl bg-bb-card p-4 text-scale-sm leading-normal">
        <span className="font-semibold">Coming up. </span>
        {tomorrow === 1 ? "1 card tomorrow" : `${tomorrow} cards tomorrow`}, {week} over the next six days.
      </p>

      <button
        type="button"
        className="chip3d chip3d--go press bb-title-face mt-auto w-full text-scale-lg font-bold"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
}

function Stat({ value, label }: { readonly value: string; readonly label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl bg-bb-card px-2 py-3">
      <span className="bb-title-face text-scale-xl font-bold tabular-nums">{value}</span>
      <span className="text-scale-xs text-bb-muted-foreground">{label}</span>
    </div>
  );
}
