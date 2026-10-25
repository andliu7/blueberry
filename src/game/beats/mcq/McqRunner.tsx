/**
 * A whole run of easy MCQ beats for one pathway node, as one mountable screen.
 *
 * WHY THIS FILE EXISTS. A review found that nothing in the app rendered this
 * beat: fourteen authored questions and a component, reachable from nowhere, so
 * no claim about how it feels had ever been tested against a screen. The cause
 * was a seam problem rather than a missing route. McqBeatView is one question
 * and knows nothing about the run around it, so an integrator had to write the
 * session wiring themselves before they could mount anything. This file is that
 * wiring, written once and tested, so hanging the beat off a route is one
 * import and one element.
 *
 * WHAT IT OWNS, and it is deliberately only three things: the session value
 * from session.ts, the real clock, and a stopwatch for the question on screen.
 * Everything else is a call into a pure function next door. That split is the
 * same one lesson/LessonPlayer.tsx uses and it is what makes the run testable
 * without a DOM: session.ts has the rules, this has the useState.
 *
 * THE NON OBVIOUS REACT PATTERN, named because the author asked for that. The
 * `if (seenRun !== runKey)` block below is React's documented "adjust state
 * when a prop changes" pattern. Setting state during render makes React throw
 * the render away and start again with the new state before anything reaches
 * the screen, which is how a parent that swaps `node` without giving this
 * component a `key` still gets a fresh run rather than the previous node's
 * answers under the new question. `useRef` is the other one: `startedAt` is a
 * mutable box that survives renders and, unlike state, changing it does not
 * cause one, which is exactly what a stopwatch wants.
 *
 * WHAT IT DOES NOT OWN. It does not save a card, it does not write progress and
 * it does not send a report. Each of those leaves as a callback, because the
 * deck store, the progress source and Phase 6's reporting endpoint are other
 * people's files and a beat that reached into them would be three integrations
 * instead of none.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Press } from "../../app/ui/Press";
import type { Card, Reco } from "../../cards/types";
import { clearsBeat, type BeatResult, type MasteryLevel, type McqBeat } from "../types";
import { playCorrect } from "../../sound/gameSound";
import { mcqBeatsForNode } from "./content";
import { resumeMcqSession } from "../../resume/lessonSave";
import { useBerryReactions } from "../../mascot/useBerryReactions";
import { bloomLookForNode } from "../BloomVerdictBerry";
import { McqBeatView } from "./McqBeatView";
import { guideIdeasFor, hintNudge, hintUnitFor, type HintGuide } from "./hint";
import {
  advance,
  canCommit,
  commitLabel,
  commitPick,
  currentBeat,
  isFinished,
  isReported,
  levelNow,
  markReported,
  mcqReportFor,
  selectOption,
  sessionProgress,
  currentRun,
  latestOutcome,
  ruledOutId,
  startMcqSession,
  takeHint,
  type McqProgress,
  type McqReport,
} from "./session";
import { plural } from "@/lib/helpers";
import { trackChoice } from "@/lib/analytics";

const NONE_MISSED: readonly string[] = Object.freeze([]);

export interface McqRunnerProps {
  /** The pathway node whose beats to play, for example "u3-directing". */
  readonly node: string;
  /** The rung every beat plays at, or "declared": each beat at its own rung (session.ts). */
  readonly level: MasteryLevel | "declared";
  /**
   * The beats to play. Defaults to everything authored for the node, which is
   * what a pathway slot wants; a test or a preview passes its own.
   */
  readonly beats?: readonly McqBeat[];
  /** The X in the top bar, and the button on the finished card. */
  readonly onExit: () => void;
  /** Fired once, when the last beat is committed and the student moves on. */
  readonly onDone?: (results: readonly BeatResult[], progress: McqProgress) => void;
  /**
   * Fired on a committed miss, with the card and the toast line. The screen
   * that owns the deck icon does the shrink and the fly, per the spec; this
   * beat only says a card is worth offering. Never fires on a pick alone.
   */
  readonly onOfferCard?: (card: Card, reco: Reco) => void;
  /** Fired when the student flags the question. Sending it is Phase 6's. */
  readonly onReport?: (report: McqReport) => void;
  readonly showHowTo?: boolean;
  readonly reducedMotion?: boolean;
  /** Injected so a caller can freeze time. Defaults to the real clock. */
  readonly now?: () => Date;
  /**
   * Replaces the thin per-question bar in the view's top bar. The beat
   * runner passes the lesson's recipe strip here, so the lesson-level and
   * question-level progress are one instrument rather than two stacked bars.
   */
  readonly progressSlot?: ReactNode;
  /**
   * Fired on every committed answer and on the advance past it, with the
   * run's progress, so the owner of `progressSlot` can fill the strip's
   * current segment to its fraction.
   */
  readonly onProgress?: (progress: McqProgress) => void;
  /**
   * Answers saved from an earlier visit (resume/lessonSave.ts). The run opens
   * on the next unanswered question; ignored if they no longer match.
   */
  readonly resumeResults?: readonly BeatResult[];
  /** Fired after every committed answer with all answers so far, so the parent can save them. */
  readonly onCommit?: (results: readonly BeatResult[], progress: McqProgress) => void;
  /**
   * Beat ids already missed earlier in the lesson (the recycle slot passes
   * them). A miss on one of these is Bloom's "wrong again": he leans in and
   * the tray's Why? control gets the hint ring (session.ts latestOutcome).
   */
  readonly missedBefore?: readonly string[];
  /**
   * Offer the Hint key (hint.ts). Off unless asked for: only a Practice
   * lesson turns it on (template.ts hintsAllowed), so test-outs, unit exams,
   * checkpoints and Challenges stay hint-free without saying anything.
   */
  readonly hints?: boolean;
}

export function McqRunner({
  node,
  level,
  beats,
  onExit,
  onDone,
  onOfferCard,
  onReport,
  showHowTo,
  reducedMotion = false,
  now = () => new Date(),
  progressSlot,
  onProgress,
  resumeResults,
  onCommit,
  missedBefore = NONE_MISSED,
  hints = false,
}: McqRunnerProps) {
  const source = beats ?? mcqBeatsForNode(node);
  const runKey = `${node}:${level}:${source.length}`;

  const [seenRun, setSeenRun] = useState(runKey);
  const [session, setSession] = useState(() =>
    resumeMcqSession(startMcqSession(source, level), resumeResults === undefined ? null : { results: resumeResults }),
  );
  const startedAt = useRef(Date.now());

  // The unit guide the nudge quotes (hint.ts). Fetched only when Hint is on,
  // through a dynamic import, so no guide data rides on the first load. The
  // `live` flag stops a late answer writing state after this screen has gone.
  const [guide, setGuide] = useState<HintGuide | null>(null);
  const guideUnit = hints ? hintUnitFor(node) : null;
  useEffect(() => {
    if (guideUnit === null) return;
    let live = true;
    void import("../../guide").then(({ loadUnitGuide }) => loadUnitGuide(guideUnit)).then((loaded) => {
      if (live) setGuide(loaded);
    });
    return () => {
      live = false;
    };
  }, [guideUnit]);

  // See the header: React's adjust-state-during-render pattern, so a swapped
  // node never shows the previous node's answers.
  if (seenRun !== runKey) {
    setSeenRun(runKey);
    setSession(startMcqSession(source, level));
    startedAt.current = Date.now();
  }

  const beat = currentBeat(session);
  const progress = sessionProgress(session);

  // Bloom's live reaction state for this run (mascot/useBerryReactions.ts).
  // It starts at the working lean; react() below swaps the face on a grade.
  const reactions = useBerryReactions(reducedMotion, "leanIn");
  // What the lesson's topic makes the berry, and what it wears for it. Both
  // are pure table reads, so they are worked out per render, not stored.
  const { state: topicState, costume } = bloomLookForNode(node);
  // The hint ring belongs to the tray of the wrong-again grade only: every
  // later tray mounts fresh, and a ring keyed on the standing count would
  // replay on each of them.
  // With Hint on, the ring sits on the Hint key instead, the moment a question
  // the student already missed comes back (one ring per question: its place
  // in the run, plus one, so the next question remounts it).
  const hintRingKey = !hints && session.reveal !== null && latestOutcome(session, missedBefore) === "wrongAgain" ? reactions.hintKey : 0;
  // A slip line speaks to the option Hint greyed out ("That halves the ten H."),
  // so it is led by the word that ties it to that option.
  const nudge = hints && beat !== null && session.hintUsed === true ? hintNudge(beat, guideIdeasFor(guide, beat.node)) : null;
  const hint =
    hints && beat !== null
      ? {
          used: session.hintUsed === true,
          nudge: nudge === null ? null : nudge.source === "slip" ? `Ruled out: ${nudge.text}` : nudge.text,
          ruledOutId: ruledOutId(session),
          onHint: () => setSession(takeHint(session)),
          ringKey: session.reveal === null && missedBefore.includes(beat.id) ? session.index + 1 : 0,
        }
      : undefined;

  const primary = () => {
    if (session.reveal !== null) {
      const next = advance(session);
      setSession(next);
      startedAt.current = Date.now();
      if (onProgress !== undefined) onProgress(sessionProgress(next));
      if (isFinished(next) && onDone !== undefined) onDone(next.results, sessionProgress(next));
      return;
    }
    const at = now().toISOString();
    const committed = commitPick(session, {
      at,
      elapsedMs: Date.now() - startedAt.current,
    });
    if (committed === null) return;
    // Which option was picked, per question, for the owner's option-split report (lib/analytics).
    trackChoice(`mcq.${committed.reveal.beatId}`, committed.reveal.chosenId, committed.reveal.matchedAnswer);
    if (clearsBeat(committed.reveal.result)) playCorrect();
    // THE FACE IN THE SAME UPDATE AS THE GRADE. react() sets state alongside
    // setSession below, and React batches both into one render, so the tray
    // and Bloom's reaction reach the screen on the same frame (spec: within
    // 200ms of grading).
    const outcome = latestOutcome(committed.session, missedBefore);
    if (outcome !== null) reactions.react(outcome);
    setSession(committed.session);
    if (onProgress !== undefined) onProgress(sessionProgress(committed.session));
    if (onCommit !== undefined) onCommit(committed.session.results, sessionProgress(committed.session));
    if (committed.offer !== null && onOfferCard !== undefined) {
      onOfferCard(committed.offer.card, committed.offer.reco);
    }
  };

  const report = () => {
    const built = mcqReportFor(session, now().toISOString());
    setSession(markReported(session));
    if (built !== null && onReport !== undefined) onReport(built);
  };

  if (beat === null) {
    // Two ways to get here and they read differently: a run that finished, and
    // a node with nothing authored at this rung. The second is an authoring
    // gap, so it says so plainly rather than pretending the student is done.
    const done = progress.total > 0;
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 md:p-6">
        <h2 className="bb-title-face text-scale-xl font-semibold text-bb-foreground">
          {done ? "That is the set." : "Nothing here yet"}
        </h2>
        <p className="text-scale-sm text-bb-muted-foreground">
          {done
            ? `You worked through ${plural(progress.total, "question", "questions")} and cleared ${progress.cleared}. Every one of them explained itself on the way past, which is the part that sticks.`
            : "This topic has no quick questions written for this rung yet. The pathway will have more here soon."}
        </p>
        <Press className="w-full" onClick={onExit}>
          Back to the pathway
        </Press>
      </div>
    );
  }

  return (
    <McqBeatView
      beat={beat}
      level={levelNow(session)}
      selectedId={session.selectedId}
      reveal={session.reveal}
      progress={progress}
      primaryLabel={commitLabel(session)}
      primaryEnabled={session.reveal !== null || canCommit(session)}
      onPrimary={primary}
      onSelect={(optionId) => setSession(selectOption(session, optionId))}
      onExit={onExit}
      onReport={report}
      reported={isReported(session)}
      {...(showHowTo !== undefined ? { showHowTo } : {})}
      {...(progressSlot !== undefined ? { progressSlot } : {})}
      reducedMotion={reducedMotion}
      combo={currentRun(session)}
      bloom={reactions}
      hintRingKey={hintRingKey}
      {...(hint !== undefined ? { hint } : {})}
      topicState={topicState}
      costume={costume}
    />
  );
}
