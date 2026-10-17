/**
 * "Pick up where you left off?" The screen a lesson opens on when it has a
 * saved position (lessonSave.ts).
 *
 * It wears the lesson's own chrome, the X and the same progress bar the
 * student left, already filled to where they stopped, so the first thing
 * they see is that nothing was lost. Two keys, in the footer where CHECK and
 * CONTINUE always sit: CONTINUE picks up, START OVER forgets the bookmark.
 *
 * Calm on purpose: no confetti, nothing that moves except Bloom's own idle,
 * because this is a doorway, not a win (owner's effects rule, 15 Oct).
 */

import { useEffect, useRef, type ReactNode } from "react";

import { Berry } from "../mascot/Berry";
import { ChipPress } from "../beats/ChipPress";
import { ExitMark } from "../beats/chromeIcons";
import "../beats/beat-chrome.css";
import "./resume.css";

export interface ResumePromptProps {
  /** The lesson's name, for example "Naming alkyl halides". Empty hides the line. */
  readonly title: string;
  /** One short line on what is saved, for example "4 questions answered". */
  readonly detail: string;
  /** The lesson bar as the student left it. */
  readonly bar: ReactNode;
  readonly reducedMotion: boolean;
  readonly onContinue: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
}

export function ResumePrompt({ title, detail, bar, reducedMotion, onContinue, onRestart, onExit }: ResumePromptProps) {
  const continueRef = useRef<HTMLButtonElement>(null);
  // CONTINUE is the likely answer, so the keyboard lands on it.
  useEffect(() => {
    continueRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="beat-runner resume-prompt" data-motion={reducedMotion ? "reduced" : "full"}>
      <div className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 px-4 pt-3 pb-1 md:px-6">
        <button type="button" onClick={onExit} aria-label="Leave this lesson" title="Leave this lesson" className="lesson-exit">
          <ExitMark />
        </button>
        <div className="min-w-0 flex-1">{bar}</div>
      </div>

      <div className="beat-runner__stage beat-runner__stage--gutter resume-prompt__stage">
        <section className="resume-prompt__card" aria-labelledby="resume-prompt-title">
          <Berry mood="happy" behaviour="idle" sizePx={96} reducedMotion={reducedMotion} />
          {title !== "" ? <p className="resume-prompt__lesson">{title}</p> : null}
          <h2 id="resume-prompt-title" className="bb-title-face resume-prompt__title">
            Welcome back! Pick up where you left off?
          </h2>
          <p className="resume-prompt__saved">
            <SavedMark />
            <span>{detail}</span>
          </p>
        </section>
      </div>

      <div className="lesson-end__foot beat-action-bar foot-bleed pb-safe shrink-0 border-t-2 border-bb-border bg-bb-card px-4 pt-3 pb-3 md:px-6">
        <div className="resume-prompt__keys mx-auto flex w-full max-w-xl flex-col gap-2">
          <ChipPress ref={continueRef} className="w-full" onClick={onContinue} data-resume="continue">
            Continue
          </ChipPress>
          <ChipPress variant="quiet" className="w-full" onClick={onRestart} data-resume="restart">
            Start over
          </ChipPress>
        </div>
      </div>
    </div>
  );
}

/** A small check in a circle: "saved". Flat, drawn from two shapes. */
function SavedMark() {
  return (
    <svg className="resume-prompt__mark" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path d="M5.8 10.4l2.7 2.7 5.7-5.9" fill="none" stroke="var(--bb-card)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
