/**
 * "Pick up where you left off?" The screen a lesson opens on when it has a
 * saved position (lessonSave.ts).
 *
 * It wears the lesson's own chrome, the X and the same progress bar the
 * student left, already filled to where they stopped, so the first thing
 * they see is that nothing was lost. Two keys, in the footer where CHECK and
 * CONTINUE always sit: CONTINUE picks up, START OVER forgets the bookmark.
 *
 * Calm on purpose: no confetti and no entrance animation, nothing that moves
 * except Bloom's own idle, because this is a doorway, not a win, and it is
 * usually the first screen after a reload, where the boot loader is the only
 * thing allowed to animate (owner's effects rule, 15 Oct).
 *
 * START OVER IS A NEW RUN, SO IT IS CHARGED. The pathway lets a saved lesson
 * back in for free, because CONTINUE is the same visit the student already
 * paid for. A fresh run is not, so START OVER opens the same charge sheet
 * START does, and only a committed entry forgets the bookmark. Closing the
 * sheet leaves the bookmark and this screen exactly as they were, with focus
 * back on START OVER. The sheet's headline names the loss ("erase 4 saved
 * questions?", restartCopy.ts), because this is the one key that wipes a save.
 *
 * FOCUS WAITS FOR THE BOOT LOADER. On a reload #root is inert while the loader
 * is up, and focus() on an inert element does nothing, so CONTINUE takes focus
 * when the loader says it is gone ("blueberry:boot-gone", index.html).
 */

import { Suspense, lazy, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { hrefForLesson } from "../app/routes";
import type { ChargeGateNode } from "../charge/chargeGateModel";
import { economyKindFor, pathwayNode } from "../demo/pathwayMap";

import { Berry } from "../mascot/Berry";
import { ChipPress } from "../beats/ChipPress";
import { ExitMark } from "../beats/chromeIcons";
import "../beats/beat-chrome.css";
import { LeaveNow } from "./leaveNow";
import "./resume.css";

// Loaded only when START OVER is pressed: the sheet pulls in the economy and the app store.
const ChargeGate = lazy(() => import("../charge/ChargeGate").then((m) => ({ default: m.ChargeGate })));

export interface ResumePromptProps {
  /** The node id, so START OVER can charge a fresh entry to it. */
  readonly node: string;
  /** The lesson's name, for example "Naming alkyl halides". Empty hides the line. */
  readonly title: string;
  /** One short line on what is saved, for example "4 questions answered". */
  readonly detail: string;
  /** What the bookmark holds, for example "4 saved questions", so the START OVER sheet can say what it erases. */
  readonly saved: string;
  /** The lesson bar as the student left it. */
  readonly bar: ReactNode;
  readonly reducedMotion: boolean;
  readonly onContinue: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
}

export function ResumePrompt({ node, title, detail, saved, bar, reducedMotion, onContinue, onRestart, onExit }: ResumePromptProps) {
  const continueRef = useRef<HTMLButtonElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const booted = useBootGone();
  // This screen already says the work is saved, so its X leaves at once (leaveNow.ts), never via the leave sheet.
  const leaveNow = useContext(LeaveNow) ?? onExit;
  // CONTINUE is the likely answer, so the keyboard lands on it, once the app can take focus.
  useEffect(() => {
    if (booted) continueRef.current?.focus({ preventScroll: true });
  }, [booted]);
  /** The charge sheet for START OVER, or null while it is closed. */
  const [restartGate, setRestartGate] = useState<ChargeGateNode | null>(null);
  const gateNode = useMemo(() => restartGateNode(node, title), [node, title]);
  // Fetch the sheet's code while the student reads, so START OVER opens at once rather than after a download.
  useEffect(() => {
    void import("../charge/ChargeGate");
  }, []);

  return (
    <div className="beat-runner resume-prompt" data-motion={reducedMotion ? "reduced" : "full"}>
      <div className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 px-4 pt-3 pb-1 md:px-6">
        <button type="button" onClick={leaveNow} aria-label="Leave this lesson" title="Leave this lesson" className="lesson-exit">
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
          <ChipPress ref={restartRef} variant="quiet" className="w-full" onClick={() => setRestartGate(gateNode)} data-resume="restart">
            Start over
          </ChipPress>
        </div>
      </div>
      {restartGate !== null ? (
        <Suspense fallback={null}>
          <ChargeGate
            node={restartGate}
            restartSaved={saved}
            onClose={() => {
              setRestartGate(null);
              // The sheet unmounts with its dialog, so the browser cannot hand focus back itself.
              // A timeout, not now: the sheet's keys close on pointerdown, and the browser's own
              // mousedown focus step runs after that and would put focus on <body>.
              window.setTimeout(() => restartRef.current?.focus({ preventScroll: true }), 0);
            }}
            onStarted={onRestart}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

/** The charge door for a fresh run of this lesson, priced the way the pathway prices it. */
function restartGateNode(node: string, title: string): ChargeGateNode {
  const mapNode = pathwayNode(node);
  const kind = mapNode?.playable !== undefined ? economyKindFor(mapNode.kind, mapNode.playable) : "concept";
  return { id: node, kind, title: title !== "" ? title : node, href: hrefForLesson(node) };
}

/**
 * Whether the boot loader has let go of the app. True at once on an in-app
 * visit; on a reload it flips when index.html fires "blueberry:boot-gone".
 */
function useBootGone(): boolean {
  const [gone, setGone] = useState(() => typeof document === "undefined" || !document.documentElement.hasAttribute("data-boot"));
  useEffect(() => {
    if (gone) return;
    const done = () => setGone(true);
    window.addEventListener("blueberry:boot-gone", done);
    // The loader may have gone between the first render and this effect.
    if (!document.documentElement.hasAttribute("data-boot")) done();
    return () => window.removeEventListener("blueberry:boot-gone", done);
  }, [gone]);
  return gone;
}

/** A small check in a circle: "saved". Flat, drawn from two shapes. */
export function SavedMark() {
  return (
    <svg className="resume-prompt__mark" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path d="M5.8 10.4l2.7 2.7 5.7-5.9" fill="none" stroke="var(--bb-card)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
