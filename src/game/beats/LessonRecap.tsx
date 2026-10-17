/**
 * The end of a primed lesson (U1-P2 round 4): the priming preview's loop,
 * closed. Shown after the lesson's own ending, only when this visit opened on
 * the preview (BeatRunner.tsx decides).
 *
 *   1. DID YOU CALL IT? The guess the student locked in before the lesson,
 *      now marked: their pick and the answer side by side, and the question
 *      screen's own tray with the verdict and the lesson's why. Skipped when
 *      they skipped the guess.
 *   2. REBUILD THE MAP. The concept map they read before the lesson, now with
 *      gaps: they tap the ideas back in order. Before the lesson that order
 *      was a guess; after it, it is retrieval, and it confirms (or fixes) the
 *      frame the preview gave them.
 *
 * Skippable: SKIP leaves at any point, and nothing here is scored.
 */
import { useEffect, useRef, useState } from "react";

import { Berry } from "../mascot/Berry";
import { pathwayNode } from "../demo/pathwayMap";
import { AnswerTray, TrayWhy } from "./AnswerTray";
import { ChipPress } from "./ChipPress";
import { ExitMark } from "./chromeIcons";
import { GuessOptions, MapBuilder, halogenSubscripts } from "./primerParts";
import { guessFor, guessPayoff, type LessonPriming } from "./priming";
import "./beat-chrome.css";
import "./preview.css";

export interface LessonRecapProps {
  readonly node: string;
  readonly priming: LessonPriming;
  /** The option the student locked in on the preview, or null if they skipped the guess. */
  readonly picked: string | null;
  readonly reducedMotion: boolean;
  /** Finished or skipped: on to wherever the lesson's own ending was going. */
  readonly onDone: () => void;
}

type Phase = "guess" | "map";

export function LessonRecap({ node, priming, picked, reducedMotion, onDone }: LessonRecapProps) {
  const title = pathwayNode(node)?.title ?? "";
  const guess = guessFor(node);
  const payoff = picked === null ? null : guessPayoff(node, picked);
  const [phase, setPhase] = useState<Phase>(payoff === null ? "map" : "guess");
  const [built, setBuilt] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Each phase starts at the top of the scroller.
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0 });
  }, [phase]);

  // Only the two options that matter: what they picked and the answer (one
  // tile when they match). Four tiles under a tray hid the third at 390px.
  const shownOptions =
    guess === null || picked === null
      ? []
      : guess.options.filter((option) => option.id === picked || option.id === guess.correctOptionId);

  return (
    <div className="beat-runner lesson-preview lesson-recap" data-recap={node} data-phase={phase} data-motion={reducedMotion ? "reduced" : "full"}>
      <div className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 px-4 pt-3 pb-1 md:px-6">
        <button type="button" onClick={onDone} aria-label="Leave the recap" title="Leave the recap" className="lesson-exit">
          <ExitMark />
        </button>
        <p className="lesson-recap__eyebrow">Close the loop</p>
      </div>

      <div ref={stageRef} className="beat-runner__stage beat-runner__stage--gutter lesson-preview__stage">
        <section className="lesson-preview__body" aria-labelledby="lesson-recap-head">
          <div className="lesson-preview__coach">
            <Berry
              mood={phase === "guess" && payoff?.right ? "cheer" : built ? "cheer" : "curious"}
              behaviour={built ? "celebrate" : "idle"}
              sizePx={56}
              reducedMotion={reducedMotion}
            />
            <div className="lesson-preview__bubble">
              <p className="lesson-preview__lesson">{title}</p>
              <h2 id="lesson-recap-head" className="bb-title-face lesson-preview__idea">
                {phase === "guess" ? "Before the lesson you made a guess. Did you call it?" : priming.bigIdea}
              </h2>
            </div>
          </div>

          {phase === "guess" && guess !== null && payoff !== null ? (
            <section className="primer-guess" aria-labelledby="recap-guess-q">
              <p className="lesson-preview__label">Your opening guess</p>
              <h3 id="recap-guess-q" className="primer-guess__q">
                {halogenSubscripts(guess.prompt)}
              </h3>
              <GuessOptions
                questionId={guess.id}
                options={shownOptions}
                correctOptionId={guess.correctOptionId}
                picked={picked}
                locked
                checked
                showVisual
              />
            </section>
          ) : null}

          {phase === "map" ? <MapBuilder priming={priming} reducedMotion={reducedMotion} onBuilt={() => setBuilt(true)} /> : null}
        </section>
      </div>

      {phase === "guess" && payoff !== null ? (
        // The question screen's own tray: green or red, the verdict in words,
        // and the lesson's why. CONTINUE goes on to the map.
        <AnswerTray
          tone={payoff.right ? "right" : "wrong"}
          title={payoff.right ? "You called it!" : "Not this time"}
          badge="Your opening guess"
          actionLabel="Continue"
          onAction={() => setPhase("map")}
        >
          {payoff.right ? (
            <TrayWhy lead={payoff.why} />
          ) : (
            <>
              <p className="answer-tray__label">The answer:</p>
              <p className="answer-tray__answer">{payoff.answer}</p>
              <TrayWhy lead={payoff.why} />
            </>
          )}
        </AnswerTray>
      ) : (
        <div className="lesson-end__foot beat-action-bar foot-bleed pb-safe shrink-0 border-t-2 border-bb-border bg-bb-card px-4 pt-3 pb-3 md:px-6">
          <div className="mx-auto w-full max-w-xl">
            {built ? (
              <ChipPress className="w-full" onClick={onDone}>
                Continue
              </ChipPress>
            ) : (
              <ChipPress variant="quiet" className="w-full" onClick={onDone}>
                Skip
              </ChipPress>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
