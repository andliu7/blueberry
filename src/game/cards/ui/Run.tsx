/**
 * The review run: the full-screen loop a student grades cards in. Read this
 * header before trusting anything in this file.
 *
 * THE LOOP. A card front. On a reaction card from the registry, the student
 * CALLS the product from three drawings (predict.ts) or just flips. The
 * answer lands in place, the grade dock lights the grade the call points at,
 * and the student grades with a button, a key (1 to 4) or a swipe (right is
 * Good, left is Again). Every grade goes through `source.rate` first, so a
 * student who closes the tab mid run keeps what they earned.
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

import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { REACTIONS } from "../../../data/reactions";
import type { SavedMistake } from "../../tabs/trainer/mistakes";
import { nextInterval, startCard } from "../scheduler";
import type { Card, DeckSource, Rating, ReviewState } from "../types";
import { RATING_LABELS, RATINGS } from "../types";
import { CardFace, Drawing } from "./CardFace";
import { cardSchedulerState } from "./cardState";
import { dueForecast } from "./forecast";
import { intervalLabel } from "./intervalLabel";
import { predictionChoices, type PredictOption } from "./predict";
import {
  calledLine,
  ratingForKey,
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
  summaryHeadline,
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
  /** Called from the summary with the diamonds the run displayed. */
  readonly onDone?: (diamonds: number) => void;
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
  readonly reactionId: string;
  readonly correct: boolean;
}

export function Run({ cards, source, journal, onExit, onDone }: RunProps) {
  const [state, setState] = useState<ReviewSessionState>(() => startSession(cards));
  const [calls, setCalls] = useState<readonly Call[]>([]);
  const [dx, setDx] = useState(0);
  // Where a swipe started and how wide the card was, or null when no finger
  // is down. State rather than a ref because the card's class reads it.
  const [drag, setDrag] = useState<{ readonly x: number; readonly width: number } | null>(null);
  const snapshot = useDeckSnapshot(source);

  const card = currentCard(state);
  const done = isFinished(state);
  const call = card === null ? undefined : calls.find((entry) => entry.cardId === card.id);
  const choices = useMemo(() => (card === null ? null : predictionChoices(card, REACTIONS)), [card]);
  const predictions: PredictionRecord[] = calls.map(({ cardId, correct }) => ({ cardId, correct }));
  const stats = runStats(state.ratings, predictions);

  const press = (rating: Rating): void => {
    const outcome = rateCurrent(state, rating);
    if (outcome === null) return;
    source.rate(outcome.cardId, outcome.rating);
    setState(outcome.state);
    setDx(0);
  };

  const flip = (): void => setState(reveal(state));

  const callIt = (option: PredictOption): void => {
    if (card === null || state.revealed) return;
    // A card that came back after Again is called again, so the latest call
    // for a card replaces its earlier one rather than counting twice.
    setCalls([...calls.filter((entry) => entry.cardId !== card.id), { cardId: card.id, reactionId: option.reactionId, correct: option.correct }]);
    flip();
  };

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
          forecast={dueForecast(snapshot, journal, new Date())}
          onDone={(diamonds) => {
            onDone?.(diamonds);
            onExit();
          }}
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

      <div className="run__stage">
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
              or scroll position carries over from the card before. */}
          <CardFace
            key={card.id}
            card={card}
            revealed={state.revealed}
            onReveal={flip}
            schedulerState={cardSchedulerState(snapshot.review[card.id], at)}
          />
        </div>
      </div>

      <div className="run__dock">
        {choices !== null && (!state.revealed || call !== undefined) && (
          <Predict choices={choices} call={call} revealed={state.revealed} onCall={callIt} />
        )}
        {state.revealed ? (
          <>
            <GradeDock reviewState={reviewState} suggested={suggested} onPress={press} />
            <p className="m-0 text-center text-scale-xs text-bb-muted-foreground">
              Swipe the card right for Good, left for Again
            </p>
          </>
        ) : (
          <button type="button" className="chip3d press bb-title-face w-full text-scale-lg font-bold" onClick={flip}>
            {choices === null ? "Show the answer" : "Just flip it"}
          </button>
        )}
      </div>
    </div>
  );
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
}: {
  readonly reviewState: ReviewState;
  readonly suggested: Rating | null;
  readonly onPress: (rating: Rating) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="How well did you know it">
      {RATINGS.map((rating, index) => {
        const interval = nextInterval(reviewState, rating);
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
 * "Call the product": three drawings, one of them the answer. After the call
 * (or a flip) each tile names its product, so a wrong option still teaches
 * what those other conditions would have made.
 */
function Predict({
  choices,
  call,
  revealed,
  onCall,
}: {
  readonly choices: readonly PredictOption[];
  readonly call: Call | undefined;
  readonly revealed: boolean;
  readonly onCall: (option: PredictOption) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-scale-sm font-semibold" aria-live="polite">
        {!revealed
          ? "Call the product"
          : call?.correct === true
            ? "You called it."
            : "Not this time. The right product is filled in green."}
      </p>
      <div className={`predict ${revealed ? "predict--revealed" : ""}`}>
        {choices.map((option, index) => {
          const picked = call?.reactionId === option.reactionId;
          const state = revealed ? `${option.correct ? "predict__option--right" : ""} ${picked ? "predict__option--picked" : ""}` : "";
          return (
            <button
              key={option.reactionId}
              type="button"
              className={`predict__option press flex-col gap-1 ${state}`}
              disabled={revealed}
              aria-label={revealed ? `${option.label}${option.correct ? ", the product" : ""}${picked ? ", your call" : ""}` : `Option ${index + 1}`}
              onClick={() => onCall(option)}
            >
              <Drawing light={option.light} dark={option.dark} alt="" className="predict__art" />
              {revealed && <span className="text-scale-xs leading-tight">{option.label}</span>}
            </button>
          );
        })}
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
  forecast,
  onDone,
}: {
  readonly state: ReviewSessionState;
  readonly stats: RunStats;
  readonly forecast: readonly { readonly label: string; readonly count: number }[];
  readonly onDone: (diamonds: number) => void;
}) {
  const summary = sessionSummary(state);
  const called = calledLine(stats);
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
        <h1 className="bb-title-face m-0 mt-3 text-scale-2xl font-bold">{summaryHeadline(summary)}</h1>
        <p className="m-0 text-scale-base leading-normal text-bb-muted-foreground">{summaryLine(summary)}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat value={called === null ? "None" : `${stats.called}/${stats.predicted}`} label="Called it" />
        <Stat value={String(stats.bestStreak)} label="Best streak" />
        <Stat value={String(summary.diamonds)} label="Diamonds" />
      </div>

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
        onClick={() => onDone(summary.diamonds)}
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
