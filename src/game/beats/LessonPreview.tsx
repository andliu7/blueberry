/**
 * The priming preview a Unit 1 lesson opens on (U1-P2, Justin Sung's
 * "priming"). Round 4:
 *
 *   1. GUESS. Bloom asks the lesson's question in one line, then one real
 *      question from this lesson, with its drawing. Pick, then CHECK locks the
 *      guess in. It does NOT show the answer: the lesson teaches it, and when
 *      the question comes up there the student meets it as a real attempt.
 *      The verdict comes at the end of the lesson (LessonRecap.tsx).
 *   2. MAP. The shape of the lesson as a small concept map: the last lesson on
 *      the path at the top, then each idea as a node with the joining words on
 *      the link between them. It is read here, in a few seconds. The student
 *      rebuilds it from chips at the end, once they know the ideas.
 *
 * Skippable at every point: SKIP passes the guess, START is always live.
 * Content and the no-new-chemistry rule live in content/u1/priming.ts.
 *
 * It reuses the lesson chrome: the same X, the lesson bar (at zero), the
 * question screen's option cards and tiles, and the docked footer with the
 * same keys as CHECK and CONTINUE.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Berry } from "../mascot/Berry";
import { pathwayNode } from "../demo/pathwayMap";
import { ChipPress } from "./ChipPress";
import { ExitMark } from "./chromeIcons";
import { GuessOptions, LockMark, MapChain, focusWhenLive, halogenSubscripts } from "./primerParts";
import { guessFor, type LessonPriming } from "./priming";
import "./beat-chrome.css";
import "./preview.css";

export interface LessonPreviewProps {
  readonly node: string;
  readonly priming: LessonPriming;
  /** The lesson bar, at zero. */
  readonly strip: ReactNode;
  readonly reducedMotion: boolean;
  /** START. `guess` is the option the student locked in, or null if they skipped. */
  readonly onStart: (guess: string | null) => void;
  readonly onExit: () => void;
}

type Phase = "guess" | "locked" | "map";

export function LessonPreview({ node, priming, strip, reducedMotion, onStart, onExit }: LessonPreviewProps) {
  const title = pathwayNode(node)?.title ?? "";
  const guess = guessFor(node);

  const [phase, setPhase] = useState<Phase>(guess === null ? "map" : "guess");
  const [picked, setPicked] = useState<string | null>(null);
  // Whether the guess was locked in with CHECK (a skip leaves it null at START).
  const [lockedIn, setLockedIn] = useState(false);
  // Whether more of the preview sits below the fold: draws the fade and the cue.
  const [moreBelow, setMoreBelow] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  // The "more below" cue: re-measured on scroll, on resize and on each phase.
  // Only for a real amount: a cue over the last 30px reads as clutter.
  useEffect(() => {
    const stage = stageRef.current;
    if (stage === null) return;
    const measure = () => setMoreBelow(stage.scrollHeight - stage.scrollTop - stage.clientHeight > 64);
    measure();
    stage.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      stage.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [phase]);

  // Each phase starts at the top of the scroller: it is a new screen, not more of the old one.
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0 });
  }, [phase]);

  // On the map, START is the only thing to do: put the keyboard on it.
  useEffect(() => {
    if (phase !== "map") return;
    return focusWhenLive(startRef.current);
  }, [phase]);

  return (
    <div
      className="beat-runner lesson-preview"
      data-preview={node}
      data-phase={phase}
      data-motion={reducedMotion ? "reduced" : "full"}
    >
      <div className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 px-4 pt-3 pb-1 md:px-6">
        {/* onClick, not onPointerDown, so Enter and Space work on it too. */}
        <button type="button" onClick={onExit} aria-label="Leave this lesson" title="Leave this lesson" className="lesson-exit">
          <ExitMark />
        </button>
        <div className="min-w-0 flex-1">{strip}</div>
      </div>

      <div
        ref={stageRef}
        className="beat-runner__stage beat-runner__stage--gutter lesson-preview__stage"
        data-more={moreBelow ? "true" : undefined}
      >
        <section className="lesson-preview__body" aria-labelledby="lesson-preview-idea">
          <div className="lesson-preview__coach">
            <Berry mood="curious" behaviour="idle" sizePx={56} reducedMotion={reducedMotion} />
            <div className="lesson-preview__bubble">
              <p className="lesson-preview__lesson">{title}</p>
              <h2 id="lesson-preview-idea" className="bb-title-face lesson-preview__idea">
                {priming.bigIdea}
              </h2>
            </div>
          </div>

          {guess !== null && phase !== "map" ? (
            <section className="primer-guess" aria-labelledby="primer-guess-q">
              <p className="lesson-preview__label">Quick guess, no score</p>
              <h3 id="primer-guess-q" className="primer-guess__q">
                {halogenSubscripts(guess.prompt)}
              </h3>
              <GuessOptions
                questionId={guess.id}
                options={guess.options}
                correctOptionId={guess.correctOptionId}
                picked={picked}
                locked={phase === "locked"}
                checked={false}
                showVisual
                onPick={setPicked}
              />
              {phase === "locked" ? (
                <p className="primer-locked" role="status">
                  <LockMark />
                  <span>
                    <strong>Locked in.</strong> Watch for this one in the lesson. At the end you find out if you called it.
                  </span>
                </p>
              ) : null}
            </section>
          ) : null}

          {phase === "map" ? (
            <section className="primer-map" aria-labelledby="primer-map-label">
              <h3 id="primer-map-label" className="lesson-preview__label">
                The map of this lesson
              </h3>
              <MapChain priming={priming} shown={priming.ideas.length} gaps={false} openingVia="This lesson starts with" />
              <p className="primer-map__later">At the end you rebuild this map from memory.</p>
            </section>
          ) : null}
        </section>
      </div>

      <div className="lesson-end__foot beat-action-bar foot-bleed pb-safe shrink-0 border-t-2 border-bb-border bg-bb-card px-4 pt-3 pb-3 md:px-6">
        {/* The keys stay in the reading column on a wide screen. */}
        {phase === "guess" ? (
          <div className="primer-foot mx-auto flex w-full max-w-xl gap-3">
            <ChipPress variant="quiet" className="primer-foot__skip" onClick={() => setPhase("map")}>
              Skip
            </ChipPress>
            <ChipPress
              className="flex-1"
              disabled={picked === null}
              onClick={() => {
                setLockedIn(true);
                setPhase("locked");
              }}
            >
              Check
            </ChipPress>
          </div>
        ) : phase === "locked" ? (
          <div className="mx-auto w-full max-w-xl">
            <ChipPress className="w-full" onClick={() => setPhase("map")}>
              Continue
            </ChipPress>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-xl">
            <ChipPress ref={startRef} className="w-full" data-track="lesson.preview_start" data-cta onClick={() => onStart(lockedIn ? picked : null)}>
              Start lesson
            </ChipPress>
          </div>
        )}
      </div>
    </div>
  );
}
