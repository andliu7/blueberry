/**
 * Test mode: one question per card, pick the answer, see right or wrong at
 * once, a score at the end. Practice only: the schedule never hears of it.
 *
 * WHERE THE OPTIONS COME FROM. A reaction card with a drawn distractor set
 * (predict.ts, derived by RDKit in scripts/build_card_distractors.py) asks
 * "which product?" over three drawings. Any other card gets text options:
 * its own answer and other cards' answers from the same deck
 * (studyModel.textChoices). A card that has neither (a one-card deck) is
 * left out of the test, and the screen says how many were.
 *
 * NO LAYOUT SHIFT. The footer that becomes the feedback tray is always
 * there, the same height, so picking an answer never moves the options.
 */

import { useMemo, useState } from "react";
import { REACTIONS } from "../../../data/reactions";
import { Berry } from "../../mascot/Berry";
import type { Card } from "../../cards/types";
import { Drawing } from "../../cards/ui/CardFace";
import { predictionChoices } from "../../cards/ui/predict";
import { playCorrect } from "../../sound/gameSound";
import { TermSide, type OnInfo } from "./CardSides";
import { answerText, shuffled, textChoices } from "./studyModel";

interface Option {
  readonly key: string;
  readonly label: string;
  readonly correct: boolean;
  readonly light?: string;
  readonly dark?: string;
}

interface Question {
  readonly card: Card;
  readonly options: readonly Option[];
  readonly drawn: boolean;
}

function buildQuestions(cards: readonly Card[], seed: number): readonly Question[] {
  const out: Question[] = [];
  for (const card of shuffled(cards, seed)) {
    const drawn = predictionChoices(card, REACTIONS, undefined, undefined, String(seed));
    if (drawn !== null) {
      out.push({ card, drawn: true, options: drawn.map((option) => ({ ...option })) });
      continue;
    }
    const text = textChoices(card, cards, seed);
    if (text !== null) out.push({ card, drawn: false, options: text });
  }
  return out;
}

export function TestMode({
  cards,
  reducedMotion,
  onInfo,
  onStarMissed,
}: {
  readonly cards: readonly Card[];
  readonly reducedMotion: boolean;
  /** Opens a glossary entry from an info icon on the question (never on the options). */
  readonly onInfo?: OnInfo;
  /** Stars the cards missed this round, so Flashcards can drill just those. */
  readonly onStarMissed: (cardIds: readonly string[]) => void;
}) {
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const questions = useMemo(() => buildQuestions(cards, seed), [cards, seed]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [missed, setMissed] = useState<readonly string[]>([]);
  const [right, setRight] = useState(0);
  const [starred, setStarred] = useState(false);

  const restart = () => {
    setSeed((value) => value + 1);
    setIndex(0);
    setPicked(null);
    setMissed([]);
    setRight(0);
    setStarred(false);
  };

  if (questions.length === 0) {
    return <p className="ct-empty">A test needs at least two cards with different answers. Add another card to this deck.</p>;
  }

  if (index >= questions.length) {
    const score = Math.round((right / questions.length) * 100);
    return (
      <section className="ct-panel ct-done" aria-label="Test results">
        <Berry mood={score >= 70 ? "cheer" : "curious"} behaviour={score >= 70 ? "celebrate" : "idle"} sizePx={88} reducedMotion={reducedMotion} />
        <h2 className="ct-done__title">{score >= 70 ? "Nice work!" : "Good practice!"}</h2>
        <div className="ct-tiles">
          <div className="ct-stat ct-stat--green">
            <span className="ct-stat__label">Right</span>
            <span className="ct-stat__value">
              {right} / {questions.length}
            </span>
          </div>
          <div className="ct-stat ct-stat--purple">
            <span className="ct-stat__label">Score</span>
            <span className="ct-stat__value">{score}%</span>
          </div>
        </div>
        {missed.length > 0 && (
          <button
            type="button"
            className="ct-btn ct-btn--outline"
            disabled={starred}
            onClick={() => {
              onStarMissed(missed);
              setStarred(true);
            }}
          >
            {starred ? `Starred ${missed.length} to review` : `Star the ${missed.length} I missed`}
          </button>
        )}
        <button type="button" className="ct-btn ct-btn--go" onClick={restart}>
          New test
        </button>
      </section>
    );
  }

  const question = questions[index]!;
  const answered = picked !== null;
  const wasRight = question.options.find((option) => option.key === picked)?.correct === true;
  const skipped = cards.length - questions.length;

  const pick = (option: Option) => {
    if (answered) return;
    setPicked(option.key);
    if (option.correct) {
      setRight((value) => value + 1);
      // The chime lands with the green option. Silent when sound is off.
      playCorrect();
    } else setMissed((list) => [...list, question.card.id]);
  };

  return (
    <section className="ct-panel" aria-label="Test">
      <div className="ct-qhead">
        <span className="ct-qcount">
          Question {index + 1} of {questions.length}
        </span>
        {skipped > 0 && <span className="ct-qnote">{skipped} card{skipped === 1 ? "" : "s"} without options left out</span>}
      </div>
      <div className="ct-qbar" aria-hidden="true">
        <span style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <div className="ct-qcard">
        <TermSide card={question.card} size="big" onInfo={onInfo} />
      </div>
      <p className="ct-ask">{question.drawn ? "Which is the product?" : "Pick the answer"}</p>
      <div className={`ct-options ${question.drawn ? "ct-options--drawn" : ""}`} role="group" aria-label="Options">
        {question.options.map((option, optionIndex) => {
          const state = !answered ? "" : option.correct ? "correct" : option.key === picked ? "wrong" : "dim";
          return (
            <button
              key={option.key}
              type="button"
              className="ct-option"
              data-state={state}
              aria-disabled={answered}
              onClick={() => pick(option)}
            >
              <span className="ct-option__num" aria-hidden="true">
                {optionIndex + 1}
              </span>
              {question.drawn ? (
                <>
                  <Drawing light={option.light} dark={option.dark} alt={answered ? option.label : `Option ${optionIndex + 1}`} className="ct-option__art" />
                  {/* The name is withheld until the pick: it would answer the question. */}
                  <span className="ct-option__label">{answered ? option.label : `Option ${optionIndex + 1}`}</span>
                </>
              ) : (
                <span className="ct-option__label">{option.label}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className={`ct-tray ${answered ? (wasRight ? "ct-tray--right" : "ct-tray--wrong") : ""}`} role={answered ? (wasRight ? "status" : "alert") : undefined}>
        {answered ? (
          <>
            <div className="ct-tray__text">
              <span className="ct-tray__title">{wasRight ? "Correct!" : "Not quite."}</span>
              {!wasRight && <span className="ct-tray__body">The answer: {answerText(question.card)}</span>}
            </div>
            <button
              type="button"
              className={`ct-btn ${wasRight ? "ct-btn--go" : "ct-btn--red"}`}
              autoFocus
              onClick={() => {
                setIndex((value) => value + 1);
                setPicked(null);
              }}
            >
              {index + 1 === questions.length ? "See results" : "Continue"}
            </button>
          </>
        ) : (
          <span className="ct-tray__idle">Practice only. Your review schedule stays as it is.</span>
        )}
      </div>
    </section>
  );
}
