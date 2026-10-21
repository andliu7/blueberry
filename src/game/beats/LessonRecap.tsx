/**
 * The end of a primed lesson (U1-P2 round 4): the priming preview's loop,
 * closed. Shown after the lesson's own ending, only when this visit opened on
 * the preview (BeatRunner.tsx decides).
 *
 *   1. STILL AGREE? (owner, queue item 17) The prediction the student locked
 *      in before the lesson, shown back to them unmarked: "Here was your
 *      prediction. Still agree?" They answer yes or no and press CHECK, and
 *      the question screen's own tray says whether that call was right
 *      (priming.ts revisitVerdict). A wrong call gets the answer and the
 *      lesson's why at once; a right call can still ask for it with "Ask for
 *      feedback". Skipped when they skipped the prediction.
 *   2. REBUILD THE MAP. The concept map they read before the lesson, now with
 *      gaps: they tap the ideas back in order. Before the lesson that order
 *      was a guess; after it, it is retrieval.
 *
 * ONE FRAME WITH THE LESSON (owner: the old ending "wasn't very cohesive and
 * didn't really match"). Both steps wear the question screen's parts: the X
 * and the green progress bar on top, Bloom's one-line coach row, the question
 * in the lesson's heading face, the cream option cards, CHECK in the footer
 * and the green or red answer tray. The map itself is drawn exactly as the
 * preview drew it, so the student meets the same map they saw at the start.
 *
 * Skippable: the X and SKIP leave at any point, and nothing here is scored.
 */
import { useEffect, useRef, useState } from "react";

import { Berry } from "../mascot/Berry";
import { AnswerTray, TrayWhy } from "./AnswerTray";
import { ChipPress } from "./ChipPress";
import { ExitMark } from "./chromeIcons";
import { LessonBar } from "./LessonBar";
import { OptionMark } from "./mcq/OptionMark";
import { GuessOptions, MapBuilder, halogenSubscripts } from "./primerParts";
import { guessFor, revisitVerdict, type LessonPriming } from "./priming";
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

/** The two answers to "Still agree?", in the order they are drawn. */
const AGREE_CHOICES: readonly { readonly agree: boolean; readonly text: string }[] = [
  { agree: true, text: "Yes, I still agree" },
  { agree: false, text: "No, I changed my mind" },
];

/** The same four looks the question screen's option cards wear. */
function agreeState(checked: boolean, isRightCall: boolean, isChosen: boolean): string {
  if (!checked) return isChosen ? "picked" : "rest";
  if (isRightCall) return "answer";
  return isChosen ? "chosen" : "other";
}

export function LessonRecap({ node, priming, picked, reducedMotion, onDone }: LessonRecapProps) {
  const guess = guessFor(node);
  // Whether the revisit can run at all: a prediction was made and it is one of the guess's options.
  const canRevisit = picked !== null && revisitVerdict(node, picked, true) !== null;
  const [phase, setPhase] = useState<Phase>(canRevisit ? "guess" : "map");
  // The student's yes or no (null until they tap one), and whether CHECK marked it.
  const [agree, setAgree] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const [built, setBuilt] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Each phase starts at the top of the scroller.
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0 });
  }, [phase]);

  const verdict = checked && picked !== null && agree !== null ? revisitVerdict(node, picked, agree) : null;

  // Before CHECK only the student's own prediction is shown, unmarked, so
  // "Still agree?" is a real question. After CHECK, their pick and the answer
  // (one tile when they match). Four tiles under a tray hid the third at 390px.
  const shownOptions =
    guess === null || picked === null
      ? []
      : guess.options.filter((option) => option.id === picked || (checked && option.id === guess.correctOptionId));

  // The bar counts this screen's steps: the revisit (when there is one) and the map.
  const steps = canRevisit ? 2 : 1;
  const stepsDone = (canRevisit && (checked || phase === "map") ? 1 : 0) + (built ? 1 : 0);

  const coachLine =
    phase === "guess" ? "Here was your prediction from the start of the lesson." : "Last step: the map you saw before the lesson.";

  return (
    <div className="beat-runner lesson-preview lesson-recap" data-recap={node} data-phase={phase} data-motion={reducedMotion ? "reduced" : "full"}>
      {/* The question screen's top bar: the X, then the green progress bar. */}
      <div className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 px-4 pt-3 pb-2 md:px-6">
        <button type="button" onClick={onDone} aria-label="Leave the recap" title="Leave the recap" className="lesson-exit">
          <ExitMark />
        </button>
        <div className="min-w-0 flex-1">
          <LessonBar fraction={stepsDone / steps} label="Recap progress" reducedMotion={reducedMotion} />
        </div>
      </div>

      <div ref={stageRef} className="beat-runner__stage beat-runner__stage--gutter lesson-preview__stage">
        <section className="lesson-preview__body lesson-recap__body" aria-labelledby="lesson-recap-head">
          {/* Bloom's coach row, as on the question screen. */}
          <div className="flex items-center gap-3">
            <Berry mood={verdict?.right || built ? "cheer" : "curious"} behaviour={built ? "celebrate" : "idle"} sizePx={44} reducedMotion={reducedMotion} />
            <p className="flex min-h-13 items-center rounded-2xl border border-bb-border bg-bb-card px-3 py-2 text-scale-sm text-bb-muted-foreground">
              {coachLine}
            </p>
          </div>

          {phase === "guess" && guess !== null ? (
            <>
              <h1 id="lesson-recap-head" className="bb-h1 text-bb-foreground">
                {halogenSubscripts(guess.prompt)}
              </h1>
              <section className="primer-guess" aria-label="Your prediction">
                <p className="lesson-recap__tag">Your prediction</p>
                <GuessOptions
                  questionId={guess.id}
                  options={shownOptions}
                  correctOptionId={guess.correctOptionId}
                  picked={picked}
                  locked
                  checked={checked}
                  showVisual
                />
              </section>
              <section className="lesson-recap__agree" aria-labelledby="recap-agree-q">
                <h2 id="recap-agree-q" className="bb-h2 text-bb-foreground">
                  Still agree?
                </h2>
                {/* aria-pressed buttons, the question screen's own pattern. */}
                <div role="group" aria-labelledby="recap-agree-q" className="flex flex-col gap-2">
                  {AGREE_CHOICES.map((choice) => {
                    // The right call is "yes" exactly when the prediction was right.
                    const state = agreeState(checked, verdict !== null && choice.agree === verdict.predictionRight, agree === choice.agree);
                    return (
                      <button
                        key={choice.text}
                        type="button"
                        onClick={() => {
                          if (!checked) setAgree(choice.agree);
                        }}
                        aria-pressed={agree === choice.agree}
                        aria-disabled={checked || undefined}
                        data-state={state}
                        className="option-card text-scale-base font-normal"
                      >
                        <span>{choice.text}</span>
                        <OptionMark state={state} />
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : null}

          {phase === "map" ? (
            <>
              <div>
                <h1 id="lesson-recap-head" className="bb-h1 text-bb-foreground">
                  Rebuild the map
                </h1>
                <p className="mt-2 text-scale-sm text-bb-muted-foreground">
                  Tap the ideas back in, top to bottom. The words on each arrow tell you what comes next.
                </p>
              </div>
              <MapBuilder priming={priming} reducedMotion={reducedMotion} onBuilt={() => setBuilt(true)} />
            </>
          ) : null}
        </section>
      </div>

      {phase === "guess" && verdict !== null ? (
        // The question screen's own tray: green or red, the verdict in words.
        // A wrong call gets the answer and the why at once. A right call can
        // still ask for the why: "Ask for feedback" is a native <details>, the
        // same toggle as the tray's "Why?", which opens and closes itself with
        // no React state. CONTINUE goes on to the map.
        <AnswerTray
          tone={verdict.right ? "right" : "wrong"}
          title={verdict.title}
          badge="Your prediction"
          actionLabel="Continue"
          onAction={() => setPhase("map")}
        >
          {/* The answer in words whenever it is not the pick they just stood by. */}
          {!verdict.predictionRight || !verdict.right ? (
            <>
              <p className="answer-tray__label">The answer:</p>
              <p className="answer-tray__answer">{verdict.answer}</p>
            </>
          ) : null}
          {verdict.right ? (
            <details className="answer-tray__more">
              <summary>Ask for feedback</summary>
              <p>{verdict.why}</p>
            </details>
          ) : (
            <TrayWhy lead={verdict.why} />
          )}
        </AnswerTray>
      ) : phase === "map" && built ? (
        // Built: the same green tray a right answer gets.
        <AnswerTray tone="right" title="Map rebuilt!" actionLabel="Continue" onAction={onDone}>
          <p>That is the lesson in one line.</p>
        </AnswerTray>
      ) : (
        <div className="lesson-end__foot beat-action-bar foot-bleed pb-safe shrink-0 border-t-2 border-bb-border bg-bb-card px-4 pt-3 pb-3 md:px-6">
          <div className="mx-auto w-full max-w-xl">
            {phase === "guess" ? (
              <ChipPress className="w-full" disabled={agree === null} onClick={() => setChecked(true)}>
                Check
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
