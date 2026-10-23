/**
 * A review checkpoint on screen: the in-a-row run (beats/practice/run.ts)
 * over the interleaved pool reviewPool.ts builds.
 *
 * WHY NOT PracticeRunner ITSELF. PracticeRunner reads its pool from
 * practicePool(node), which only knows map nodes, and the beats folder is
 * another lane's this run. So this is the same run on the same surfaces
 * (McqRunner, the sort ladder, the match board) with the pool handed in.
 * If PracticeRunner later takes a `pool` prop, this file shrinks to a call.
 *
 * ONE PROBLEM PER MOUNT, as in PracticeRunner: each surface is keyed by the
 * problem id and the answer count, and a `key` change is React's plain way
 * to throw a component's state away, so a requeued problem mounts fresh.
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";

import { canFail, clearsBeat, type BeatResult, type MasteryLevel } from "../../beats/types";
import { ChipPress } from "../../beats/ChipPress";
import { LessonBar } from "../../beats/LessonBar";
import { ExitMark } from "../../beats/chromeIcons";
import { showDraftMarks } from "../../app/flags";
import { HUMAN_GATE_MARK } from "../../pathway-sheet/nodeSheetModel";
import { U1_SORT_FIGURES } from "../../content/u1";
import { currentProblem, startPracticeRun, stopRun, type PracticeRunState } from "../../beats/practice/run";
import { progress } from "../../app/progress";
import { earnChestForClear } from "../../chest/chestFlow";
import { clearTargetFor, reviewCheckpointFor } from "./reviewCheckpoints";
import { reviewPool } from "./reviewPool";
import { answerReview, countsTowardRun } from "./reviewRunRules";
import type { ReceiptLine } from "@blueberry/economy";
import { plural } from "@/lib/helpers";

const McqRunner = lazy(() => import("../../beats/mcq/McqRunner").then((m) => ({ default: m.McqRunner })));
const SortBeatView = lazy(() => import("../../beats/sort/SortBeatView").then((m) => ({ default: m.SortBeatView })));
const MatchBoardFromSpec = lazy(() => import("../../beats/match/MatchBoard").then((m) => ({ default: m.Board })));
const DrawBeatView = lazy(() => import("../../beats/draw/DrawBeatView").then((m) => ({ default: m.DrawBeatView })));

/** The first rung that can be missed, so a wrong answer counts; its first rung otherwise. */
function levelOf(levels: readonly MasteryLevel[]): MasteryLevel {
  return levels.find((level) => canFail(level)) ?? levels[0] ?? 1;
}

export function ReviewRun({ id, onExit, reducedMotion = false }: { readonly id: string; readonly onExit: () => void; readonly reducedMotion?: boolean }) {
  const review = reviewCheckpointFor(id);
  // One per reviewed lesson; see clearTargetFor. Not the run engine's CLEAR_AT (3), which would end before the newest lesson came round.
  const target = review === null ? 0 : clearTargetFor(review);
  /* Which try this is, read once at mount: the entry press journals a
     node_started for this id just before the route opens, so earlier tries
     are every start but the last one. Turns each lesson's window (reviewPool). */
  const [attempt] = useState(() => Math.max(0, progress.getSnapshot().journal.filter((event) => event.kind === "node_started" && event.nodeId === id).length - 1));
  const pool = useMemo(() => (review === null ? [] : reviewPool(review, undefined, attempt)), [review, attempt]);
  const won = (run: PracticeRunState) => target > 0 && run.best >= target;
  const byId = useMemo(() => new Map(pool.map((item) => [item.entry.id, item])), [pool]);
  const [state, setState] = useState<PracticeRunState>(() => startPracticeRun(pool.map((item) => item.entry.id)));
  const [banked, setBanked] = useState<number | null>(null);
  // What the clear paid, line by line, so a rank award it happened to cross is named, not hidden.
  const [paidLines, setPaidLines] = useState<readonly ReceiptLine[]>([]);
  const bankedOnce = useRef(false);
  // The first judged result of the problem on screen. A ref: recording it must not re-render.
  const firstResult = useRef<BeatResult | null>(null);
  const [judged, setJudged] = useState<boolean | null>(null);
  // A repeat of a missed problem never adds to the run (reviewRunRules.ts), so the bar does not promise it.
  const shownRun = judged === null ? state.run : judged ? state.run + (countsTowardRun(state) ? 1 : 0) : 0;

  const answer = (result: BeatResult | null) => {
    firstResult.current = null;
    setJudged(null);
    // A checkpoint ends at the clear: the target in a row is the whole ask,
    // with no higher tiers to chase the way a practice run has.
    setState((live) => {
      const next = answerReview(live, result !== null && clearsBeat(result));
      return won(next) && !next.finished ? stopRun(next) : next;
    });
  };
  const keepFirst = (result: BeatResult) => {
    if (firstResult.current === null) {
      firstResult.current = result;
      setJudged(clearsBeat(result));
    }
  };

  // Bank the clear once, when the session ends cleared. Kind "review": no new
  // content was learned here, so the economy prices it as a review.
  // stepsInOneSitting is 1, whatever was answered: the economy pays per extra
  // step, so passing the answer count paid MORE for more wrong answers
  // (round 1 critic: 11 wrong then 4 right out-earned a clean clear).
  useEffect(() => {
    if (!state.finished || bankedOnce.current || !won(state)) return;
    bankedOnce.current = true;
    setBanked(progress.clearNode(id, "review", { flawless: state.missed.length === 0, stepsInOneSitting: 1 }));
    setPaidLines(progress.getSnapshot().lastReceipt?.diamonds ?? []);
    // A review stop ends a section: save its chest (after the line above,
    // which reads the clear's own receipt).
    earnChestForClear(progress, id);
  }, [state, id]);

  if (review === null || pool.length === 0) {
    return (
      <div className="beat-runner beat-runner--empty" role="status">
        <p>This review has no problems yet. Pick another stop and come back.</p>
        <ChipPress onClick={onExit}>Back to the pathway</ChipPress>
      </div>
    );
  }

  const problemId = currentProblem(state);
  const current = problemId === null ? undefined : byId.get(problemId);
  const draft = pool.some((item) => item.entry.placeholder) && showDraftMarks();
  const count = (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="run-count__row">
        <LessonBar fraction={Math.min(1, shownRun / target)} label={`Right in a row, ${target} to clear the concept check`} />
        <p className="run-count__label" aria-live="polite">
          {Math.min(shownRun, target)} of {target}
        </p>
      </div>
      <p className="review-run__ask">Concept check: {target} in a row clears it</p>
      {draft ? <p className="text-scale-xs text-bb-muted-foreground">{HUMAN_GATE_MARK}</p> : null}
    </div>
  );

  if (current === undefined) {
    const passed = won(state);
    return (
      <div className="beat-runner">
        <div className="beat-runner__stage beat-runner__stage--gutter">
          <div className="flex min-h-0 w-full flex-1 flex-col justify-center">
            <div className="review-end flex flex-col items-center gap-3 rounded-2xl border-2 border-bb-border bg-bb-card p-6 text-center" data-cleared={passed ? "true" : "false"}>
              <h2 className="bb-title-face text-scale-2xl font-bold text-bb-foreground">{passed ? "Concept check cleared!" : "Not cleared yet"}</h2>
              <p className="text-scale-base text-bb-foreground">
                {passed
                  ? `${target} in a row on mixed problems. The next lesson is open, and there is a chest waiting on the path.`
                  : `Not ${target} in a row this time. Nothing is lost by that. Try again and each lesson opens on a different question.`}
              </p>
              {banked !== null && banked > 0 ? (
                <p className="lesson-banked">
                  +{plural(banked, "diamond", "diamonds")}
                </p>
              ) : null}
              {/* Where the diamonds came from. A clear can cross a mastery rank, which pays on its own line. */}
              {paidLines.length > 1 ? (
                <ul className="review-end__lines" aria-label="Where the diamonds came from">
                  {paidLines.map((line, i) => (
                    <li key={i}>
                      {line.label} <strong>+{line.amount}</strong>
                    </li>
                  ))}
                </ul>
              ) : null}
              <ChipPress className="mt-2 w-full" onClick={onExit}>
                Continue
              </ChipPress>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { entry, source } = current;
  const key = `${entry.id}:${state.answered}`;
  const item = entry.item;
  return (
    <div className="beat-runner" data-review={review.id}>
      {item.kind === "mcq" ? null : (
        <div className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 px-4 pt-3 pb-1 md:px-6">
          <button type="button" onClick={onExit} aria-label="Leave this review" title="Leave this review" className="lesson-exit">
            <ExitMark />
          </button>
          <div className="min-w-0 flex-1">{count}</div>
        </div>
      )}
      <div className={`beat-runner__stage${item.kind === "mcq" ? "" : " beat-runner__stage--gutter"}`}>
        <Suspense fallback={<p role="status">Loading the next problem.</p>}>
          {item.kind === "mcq" ? (
            <McqRunner
              key={key}
              node={source}
              level={levelOf(item.beat.levels)}
              beats={[item.beat]}
              onExit={onExit}
              reducedMotion={reducedMotion}
              progressSlot={count}
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
              figures={U1_SORT_FIGURES[entry.id]}
              onResult={keepFirst}
              onContinue={() => answer(firstResult.current)}
            />
          ) : null}
          {item.kind === "match" ? (
            <MatchBoardFromSpec key={key} spec={item.board} onComplete={keepFirst} onContinue={() => answer(firstResult.current)} />
          ) : null}
          {item.kind === "draw" ? (
            <DrawBeatView key={key} beat={item.beat} level={levelOf(item.beat.levels)} onResult={keepFirst} onContinue={() => answer(firstResult.current)} />
          ) : null}
        </Suspense>
      </div>
    </div>
  );
}
