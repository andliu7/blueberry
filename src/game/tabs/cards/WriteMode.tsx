/**
 * Write mode: see the question, type the answer, check it. Practice only.
 *
 * Checking is studyModel.answersMatch: case, spaces and punctuation are
 * forgiven, letters and locants are not. A student who wrote an accepted
 * synonym the card does not carry ("benzylic alcohol" for its own wording)
 * presses "I was right", the override flashcard apps have always offered,
 * and the round counts it.
 */

import { useState } from "react";
import { Berry } from "../../mascot/Berry";
import type { Card } from "../../cards/types";
import { DefinitionSide, TermSide, type OnInfo } from "./CardSides";
import { answersMatch, answerText, shuffled } from "./studyModel";

export function WriteMode({
  cards,
  reducedMotion,
  onInfo,
}: {
  readonly cards: readonly Card[];
  readonly reducedMotion: boolean;
  /** Opens a glossary entry from an info icon on the question or the shown answer. */
  readonly onInfo?: OnInfo;
}) {
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  // useState with a function computes the order once per round, not per keystroke.
  const [order, setOrder] = useState(() => shuffled(cards, seed));
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<"right" | "wrong" | null>(null);
  const [right, setRight] = useState(0);

  const restart = () => {
    const next = seed + 1;
    setSeed(next);
    setOrder(shuffled(cards, next));
    setIndex(0);
    setTyped("");
    setResult(null);
    setRight(0);
  };

  if (cards.length === 0) return <p className="ct-empty">This deck has no cards yet.</p>;

  if (index >= order.length) {
    const score = Math.round((right / order.length) * 100);
    return (
      <section className="ct-panel ct-done" aria-label="Write results">
        <Berry mood={score >= 70 ? "cheer" : "curious"} behaviour={score >= 70 ? "celebrate" : "idle"} sizePx={88} reducedMotion={reducedMotion} />
        <h2 className="ct-done__title">{score >= 70 ? "You wrote them all!" : "Good practice!"}</h2>
        <div className="ct-tiles">
          <div className="ct-stat ct-stat--green">
            <span className="ct-stat__label">Right</span>
            <span className="ct-stat__value">
              {right} / {order.length}
            </span>
          </div>
          <div className="ct-stat ct-stat--purple">
            <span className="ct-stat__label">Score</span>
            <span className="ct-stat__value">{score}%</span>
          </div>
        </div>
        <button type="button" className="ct-btn ct-btn--go" onClick={restart}>
          Write again
        </button>
      </section>
    );
  }

  const card = order[index]!;
  const isReaction = card.reaction !== undefined || card.sides !== undefined;

  const check = () => {
    if (typed.trim().length === 0) return;
    const ok = answersMatch(typed, card);
    setResult(ok ? "right" : "wrong");
    if (ok) setRight((value) => value + 1);
  };

  const next = () => {
    setIndex((value) => value + 1);
    setTyped("");
    setResult(null);
  };

  return (
    <section className="ct-panel" aria-label="Write">
      <div className="ct-qhead">
        <span className="ct-qcount">
          Card {index + 1} of {order.length}
        </span>
        <span className="ct-qnote">{right} right so far</span>
      </div>
      <div className="ct-qbar" aria-hidden="true">
        <span style={{ width: `${(index / order.length) * 100}%` }} />
      </div>
      <div className="ct-qcard">
        <TermSide card={card} size="big" onInfo={onInfo} />
      </div>
      {/* A form so Enter checks the answer, the way any text box submits. */}
      <form
        className="ct-write"
        onSubmit={(event) => {
          event.preventDefault();
          if (result === null) check();
          else next();
        }}
      >
        <label className="ct-ask" htmlFor="ct-write-input">
          {isReaction ? "Name the product" : "Type the answer"}
        </label>
        <input
          id="ct-write-input"
          className="ct-input"
          data-state={result ?? ""}
          value={typed}
          readOnly={result !== null}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          onChange={(event) => setTyped(event.target.value)}
          placeholder="Type here"
        />
        <div className={`ct-tray ${result === "right" ? "ct-tray--right" : result === "wrong" ? "ct-tray--wrong" : ""}`} role={result === null ? undefined : result === "right" ? "status" : "alert"}>
          {result === null ? (
            <>
              <button type="button" className="ct-btn ct-btn--ghost" onClick={() => setResult("wrong")}>
                I don't know
              </button>
              <button type="submit" className="ct-btn ct-btn--go" disabled={typed.trim().length === 0}>
                Check
              </button>
            </>
          ) : (
            <>
              <div className="ct-tray__text">
                <span className="ct-tray__title">{result === "right" ? "Correct!" : "Not quite. Here's the answer:"}</span>
                {result === "wrong" && (
                  <div className="ct-tray__answer">
                    <DefinitionSide card={card} size="small" onInfo={onInfo} />
                    <span className="sr-only">{answerText(card)}</span>
                  </div>
                )}
              </div>
              <div className="ct-tray__actions">
                {result === "wrong" && typed.trim().length > 0 && (
                  <button
                    type="button"
                    className="ct-btn ct-btn--ghost"
                    onClick={() => {
                      setRight((value) => value + 1);
                      next();
                    }}
                  >
                    I was right
                  </button>
                )}
                <button type="submit" className={`ct-btn ${result === "right" ? "ct-btn--go" : "ct-btn--red"}`} autoFocus>
                  Continue
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
