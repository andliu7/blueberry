/**
 * The in-a-row run on screen. The rules are practice/run.ts; this file owns
 * the useState, picks the existing surface for each pool item (the MCQ
 * runner, the sort ladder, the match board, all unchanged) and banks the
 * clear once.
 *
 * ONE PROBLEM PER MOUNT. Each surface is keyed by the problem id and how many
 * answers came before it, so a requeued problem mounts fresh instead of
 * showing its previous answer. A `key` change is React's plain way to throw
 * a component's state away.
 *
 * THE FIRST ANSWER IS THE ONE THAT COUNTS. A sort ladder lets the student
 * adjust and re-check until it is right, and the run is about getting it
 * right first time, so the first judged result is kept and later ones ignored.
 *
 * Every pool entry is a draft, so the header carries the human-gate mark
 * while any entry in the run is a placeholder.
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";

import { canFail, clearsBeat, type BeatResult, type MasteryLevel, type McqBeat } from "../types";
import { checkpointUnitFor, pathwayNode } from "../../demo/pathwayMap";
import { HUMAN_GATE_MARK } from "../../pathway-sheet/nodeSheetModel";
import { showDraftMarks } from "../../app/flags";
import { ChipPress } from "../ChipPress";
import { LessonBar } from "../LessonBar";
import { Press } from "../../app/ui/Press";
import { ExitMark } from "../chromeIcons";
import type { PoolEntry } from "../../content/u1/types";
import { sortFiguresFor } from "../sortFigures";
import { challengePool, isExamRun, practicePool } from "./pools";
// The unit exam's ending (Unit 2 draft, 2026-10-17): verdict, stat tiles, per-topic rows.
import { ExamEnd } from "./ExamEnd";
import { recordBestRun } from "./bestRun";
import { browserStorage, clearSave, loadPractice, savePractice } from "../../resume/lessonSave";
import { ResumePrompt } from "../../resume/ResumePrompt";
import {
  CLEAR_AT,
  answerProblem,
  challengePassed,
  cleared,
  currentProblem,
  endSaid,
  nextTier,
  startPracticeRun,
  stopRun,
  unreachableTiers,
  type PracticeRunState,
} from "./run";
import { plural } from "@/lib/helpers";

const McqRunner = lazy(() => import("../mcq/McqRunner").then((m) => ({ default: m.McqRunner })));
const SortBeatView = lazy(() => import("../sort/SortBeatView").then((m) => ({ default: m.SortBeatView })));
const MatchBoardFromSpec = lazy(() => import("../match/MatchBoard").then((m) => ({ default: m.Board })));
const DrawBeatView = lazy(() => import("../draw/DrawBeatView").then((m) => ({ default: m.DrawBeatView })));

/**
 * A missed problem comes back with its options moved round by one, so the
 * student re-reads them instead of tapping the same position again (round 4
 * critic). Options are matched by id everywhere, so the order is free to change.
 */
function rotated(beat: McqBeat): McqBeat {
  return beat.options.length < 2 ? beat : { ...beat, options: [...beat.options.slice(1), beat.options[0]!] };
}

/** The first failable rung the item allows, so a miss can count; its first rung otherwise. */
function levelOf(levels: readonly MasteryLevel[]): MasteryLevel {
  return levels.find((level) => canFail(level)) ?? levels[0] ?? 1;
}

export interface PracticeRunnerProps {
  readonly node: string;
  readonly onExit: () => void;
  /** The ending's Continue. Defaults to onExit; BeatRunner passes its recap (U1-P2) here. */
  readonly onFinish?: () => void;
  readonly reducedMotion?: boolean;
  /** Play the node's Challenge set with no second chance (run.ts). A pass banks challenge_passed, never a clear. */
  readonly challenge?: boolean;
}

export function PracticeRunner({ node, onExit, onFinish, reducedMotion = false, challenge = false }: PracticeRunnerProps) {
  const pool = useMemo(() => (challenge ? challengePool(node) : practicePool(node)), [node, challenge]);
  // A unit exam plays the whole set and passes on first-try share, never on a run (run.ts, exam mode).
  const exam = !challenge && isExamRun(node);
  const byId = useMemo(() => new Map(pool.map((entry) => [entry.id, entry])), [pool]);
  const [state, setState] = useState<PracticeRunState>(() => startPracticeRun(pool.map((entry) => entry.id), challenge, exam));
  // Save as you go (resume/lessonSave.ts): a run saved on an earlier visit, offered before the first problem.
  const [resumable, setResumable] = useState<PracticeRunState | null>(() =>
    loadPractice(browserStorage(), node, pool.map((entry) => entry.id), challenge),
  );
  const [banked, setBanked] = useState<number | null>(null);
  const bankedOnce = useRef(false);
  // The first judged result of the problem on screen. A ref: recording it must not re-render.
  const firstResult = useRef<BeatResult | null>(null);
  // Whether the problem on screen has been judged, and how. State, not a ref,
  // because the header's count must move the moment the tray says "Nice!",
  // not later when the student presses KEEP GOING (A2 round 5).
  const [judged, setJudged] = useState<boolean | null>(null);
  const shownRun = judged === null ? state.run : judged ? state.run + 1 : 0;

  // Write the run after every judged answer, as if its Continue had been
  // pressed, so a reload lands on the next problem. An answer that ends the run
  // is not written: the ending banks it, and replaying that last problem is
  // better than a bookmark past a clear that never landed.
  useEffect(() => {
    if (resumable !== null) return;
    const next = judged === null ? state : answerProblem(state, judged);
    if (judged !== null && next.finished && !state.finished) return;
    savePractice(browserStorage(), node, pool.map((entry) => entry.id), next);
  }, [state, judged, resumable, node, pool]);

  const answer = (result: BeatResult | null) => {
    firstResult.current = null;
    setJudged(null);
    setState((live) => answerProblem(live, result !== null && clearsBeat(result)));
  };
  const keepFirst = (result: BeatResult) => {
    if (firstResult.current === null) {
      firstResult.current = result;
      setJudged(clearsBeat(result));
    }
  };

  // Bank once, when the session ends: the best run locally, and the clear only at CLEAR_AT.
  useEffect(() => {
    if (!state.finished || bankedOnce.current) return;
    bankedOnce.current = true;
    // A Challenge never banks a clear, the same rule BeatRunner keeps: a pass
    // journals challenge_passed, a fail journals nothing.
    if (state.challenge) {
      if (!challengePassed(state)) return;
      let live = true;
      void import("../../app/progress").then(({ progress }) => {
        const diamonds = progress.passChallenge(node);
        if (live) setBanked(diamonds);
      });
      return () => {
        live = false;
      };
    }
    // An exam has no in-a-row rule, so it records no in-a-row best (round 4 critic: a failed u2-check saved one).
    if (state.exam !== true) recordBestRun(node, state.best);
    // An uncleared session banks nothing, and the ending shows no payout line.
    if (!cleared(state)) return;
    let live = true;
    const spine = pathwayNode(node)?.kind === "spine";
    void Promise.all([import("../../app/progress"), import("../../upsell/noteLessonClear")]).then(([{ progress }, { noteLessonClear }]) => {
      const diamonds = progress.clearNode(node, "concept", {
        flawless: state.missed.length === 0,
        stepsInOneSitting: state.answered,
        spine,
      });
      // The Pro sheet may ask, on the way back to the path (upsell/upsellRule.ts).
      noteLessonClear(progress.getSnapshot());
      if (live) setBanked(diamonds);
    });
    return () => {
      live = false;
    };
  }, [state, node]);

  const id = currentProblem(state);
  const entry: PoolEntry | undefined = id === null ? undefined : byId.get(id);
  const draft = pool.some((item) => item.placeholder);
  const status: StatusProps = { state, shownRun, draft, poolSize: pool.length, onStop: () => setState(stopRun) };
  const header = <RunHeader {...status} onExit={onExit} />;

  if (pool.length === 0) {
    return (
      <div className="beat-runner beat-runner--empty" role="status">
        <p>This practice set is still being written. Pick another node and come back.</p>
        <Press onClick={onExit}>
          Back to the pathway
        </Press>
      </div>
    );
  }

  if (resumable !== null) {
    return (
      <ResumePrompt
        node={node}
        title={pathwayNode(node)?.title ?? ""}
        // An exam has no in-a-row rule, so its resume line does not mention one (round 4).
        detail={`${plural(resumable.answered, "problem", "problems")} done${resumable.run > 0 && !exam ? `, ${resumable.run} in a row` : ""} and saved`}
        saved={`${resumable.answered} saved ${resumable.answered === 1 ? "problem" : "problems"}`}
        bar={<RunCount state={resumable} run={resumable.run} />}
        reducedMotion={reducedMotion}
        onExit={onExit}
        onRestart={() => {
          clearSave(browserStorage(), node);
          setResumable(null);
        }}
        onContinue={() => {
          // A save written before exam mode existed comes back as an exam all the same.
          setState(exam ? { ...resumable, exam: true } : resumable);
          setResumable(null);
        }}
      />
    );
  }

  if (entry === undefined && state.exam === true) {
    return (
      <div className="beat-runner">
        <div className="beat-runner__stage beat-runner__stage--gutter">
          <ExamEnd node={node} state={state} ids={pool.map((one) => one.id)} banked={banked} onContinue={onFinish ?? onExit} reducedMotion={reducedMotion} />
        </div>
      </div>
    );
  }

  if (entry === undefined) {
    return (
      // The ending drops the live count: "0 in a row" over "Lesson cleared" contradicts itself.
      <div className="beat-runner">
        <div className="beat-runner__stage beat-runner__stage--gutter">
          <div className="flex min-h-0 w-full flex-1 flex-col justify-center">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-bb-border bg-bb-card p-6 text-center">
            <h2 className="bb-title-face text-scale-2xl font-bold text-bb-foreground">
              {state.challenge ? (challengePassed(state) ? "Challenge passed" : "Not this time") : cleared(state) ? (checkpointUnitFor(node) !== null ? "Checkpoint cleared" : "Lesson cleared") : "Not cleared yet"}
            </h2>
            <p className="text-scale-base text-bb-foreground">{endSaid(state)}</p>
            {banked !== null && banked > 0 ? (
              <p className="lesson-banked">
                +{plural(banked, "diamond", "diamonds")}
              </p>
            ) : null}
            <ChipPress className="mt-2 w-full" onClick={onFinish ?? onExit}>
              Continue
            </ChipPress>
          </div>
          </div>
        </div>
      </div>
    );
  }

  const key = `${entry.id}:${state.answered}`;
  const item = entry.item;
  return (
    <div className="beat-runner">
      {item.kind === "mcq" ? null : header}
      <div className={`beat-runner__stage${item.kind === "mcq" ? "" : " beat-runner__stage--gutter"}`}>
        <Suspense fallback={<p role="status">Loading the next problem.</p>}>
          {item.kind === "mcq" ? (
            <McqRunner
              key={key}
              node={node}
              level={levelOf(item.beat.levels)}
              beats={[state.missed.includes(entry.id) ? rotated(item.beat) : item.beat]}
              onExit={onExit}
              reducedMotion={reducedMotion}
              progressSlot={<RunStatus {...status} />}
              onProgress={(progress) => {
                if (progress.answered > 0) setJudged(progress.cleared > 0);
              }}
              onDone={(results) => answer(results[0] ?? null)}
            />
          ) : null}
          {item.kind === "sort" ? (
            <SortBeatView
              key={key}
              content={item.content}
              level={levelOf(item.content.beat.levels)}
              figures={sortFiguresFor(entry.id)}
              onResult={keepFirst}
              onContinue={() => answer(firstResult.current)}
            />
          ) : null}
          {item.kind === "match" ? (
            <MatchBoardFromSpec
              key={key}
              spec={item.board}
              onComplete={keepFirst}
              onContinue={() => answer(firstResult.current)}
            />
          ) : null}
          {item.kind === "draw" ? (
            <DrawBeatView key={key} beat={item.beat} level={levelOf(item.beat.levels)} onResult={keepFirst} onContinue={() => answer(firstResult.current)} />
          ) : null}
        </Suspense>
      </div>
    </div>
  );
}

/**
 * "N in a row", drawn as the one lesson bar (LessonBar.tsx) every lesson
 * header carries, filling toward the next tier, with a short count after it.
 * A2 round 6: the tier used to sit in a second line floating over the
 * question ("3 in a row unlocks Pro"); it is folded into the count now
 * ("0 of 3 for Pro"), so the header is one row like every other lesson's.
 */
function RunCount({ state, run }: { readonly state: PracticeRunState; readonly run: number }) {
  // An exam counts questions, not a run: "Question 3 of 14".
  if (state.exam === true) {
    // A missed question comes back once, so the total grows by one on a miss: honest, not padded.
    const total = state.answered + state.queue.length;
    const at = Math.min(state.answered + 1, total);
    return (
      <div className="run-count__row">
        <LessonBar fraction={state.answered / Math.max(1, total)} label={`Unit exam, question ${at}`} />
        <p className="run-count__label" aria-live="polite">{`${at} of ${total}`}</p>
      </div>
    );
  }
  // A Challenge has no tiers to aim for: every problem in the set, first time.
  const next = state.challenge ? null : nextTier(run);
  const goal = next?.at ?? Math.max(run, 1);
  return (
    <div className="run-count__row">
      <LessonBar
        fraction={run / goal}
        label={next !== null ? `Right in a row, ${next.at} for ${next.name}` : "Right in a row"}
      />
      <p className="run-count__label" aria-live="polite">
        {next !== null ? `${run} of ${next.at} for ${next.name}` : `${run} in a row`}
      </p>
    </div>
  );
}

interface StatusProps {
  readonly state: PracticeRunState;
  /** The count to show: state.run, or the judged-but-not-yet-continued value. */
  readonly shownRun: number;
  readonly draft: boolean;
  readonly poolSize: number;
  readonly onStop: () => void;
}

/**
 * The run's status: the count, Stop once the lesson is cleared, the draft
 * mark, and which tiers this pool is too small for. One component, so the
 * MCQ runner's own top bar (where it rides as `progressSlot`) and the header
 * the other surfaces get say the same thing.
 */
function RunStatus({ state, shownRun, draft, poolSize, onStop }: StatusProps) {
  const shut = unreachableTiers(poolSize);
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <RunCount state={state} run={shownRun} />
        </div>
        {cleared(state) && !state.finished && !state.challenge && state.exam !== true ? <ChipPress block={false} variant="quiet" onClick={onStop}>Stop here</ChipPress> : null}
      </div>
      {draft && showDraftMarks() ? <p className="text-scale-xs text-bb-muted-foreground">{HUMAN_GATE_MARK}</p> : null}
      {shut.length > 0 && state.best >= CLEAR_AT && !state.challenge && state.exam !== true ? (
        <p className="text-scale-xs text-bb-muted-foreground">
          {`This set has ${poolSize} problems, too few for ${shut.map((tier) => tier.name).join(" or ")} yet.`}
        </p>
      ) : null}
    </div>
  );
}

function RunHeader({ onExit, ...status }: StatusProps & { readonly onExit: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 px-4 pt-3 pb-1 md:px-6">
      {/* onClick, not onPointerDown, so Enter and Space leave too. */}
      <button type="button" onClick={onExit} aria-label="Leave this practice" title="Leave this practice" className="lesson-exit">
        <ExitMark />
      </button>
      <div className="min-w-0 flex-1">
        <RunStatus {...status} />
      </div>
    </div>
  );
}
