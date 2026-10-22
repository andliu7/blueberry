/**
 * A test-out on screen: a section's chest quiz or a unit exam (testOuts.ts),
 * played as the unit exam run (beats/practice/run.ts, exam mode): every
 * question once, a miss comes back once, and it passes on EXAM_PASS right
 * first time. The questions come from testOutPool.ts.
 *
 * Built like ReviewRun.tsx, and for the same reason: PracticeRunner reads its
 * pool from a map node, and a test-out is not one. The surfaces are the same
 * (McqRunner, the sort ladder, the match board), one problem per mount.
 *
 * A pass journals `tested_out` with the lessons it lights (progress.testOut)
 * and saves the section's chest. A fail journals nothing: no energy was spent
 * to enter, so there is nothing to refund and nothing to record.
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";

import { canFail, clearsBeat, type BeatResult, type MasteryLevel } from "../../beats/types";
import { ChipPress } from "../../beats/ChipPress";
import { LessonBar } from "../../beats/LessonBar";
import { ExitMark } from "../../beats/chromeIcons";
import { showDraftMarks } from "../../app/flags";
import { HUMAN_GATE_MARK } from "../../pathway-sheet/nodeSheetModel";
import { U1_SORT_FIGURES } from "../../content/u1";
import { U2_SORT_FIGURES } from "../../content/u2";
import { ExamEnd } from "../../beats/practice/ExamEnd";
import { answerProblem, currentProblem, examPassMark, examPassed, examSize, firstTimeRight, startPracticeRun, type PracticeRunState } from "../../beats/practice/run";
import { PATHWAY_UNITS, unitNumber } from "../../demo/pathwayMap";
import { progress } from "../../app/progress";
import { unitOpenedAfter } from "./pathwayState";
import { testOutFor, unitSections, type TestOut } from "./testOuts";
import { testOutPool } from "./testOutPool";

const McqRunner = lazy(() => import("../../beats/mcq/McqRunner").then((m) => ({ default: m.McqRunner })));
const SortBeatView = lazy(() => import("../../beats/sort/SortBeatView").then((m) => ({ default: m.SortBeatView })));
const MatchBoardFromSpec = lazy(() => import("../../beats/match/MatchBoard").then((m) => ({ default: m.Board })));

/** The first rung that can be missed, so a wrong answer counts; its first rung otherwise. */
function levelOf(levels: readonly MasteryLevel[]): MasteryLevel {
  return levels.find((level) => canFail(level)) ?? levels[0] ?? 1;
}

/** What a pass opens, said from the map. */
function opensSaid(test: TestOut): string | null {
  if (test.kind === "unit") {
    const opens = unitOpenedAfter(PATHWAY_UNITS, PATHWAY_UNITS.indexOf(test.unit)).opens;
    return opens === null ? `Every lesson up to the end of ${unitNumber(test.unit.title)} is lit.` : `${opens.title.replace(" · ", ": ")} is open.`;
  }
  const next = unitSections(test.unit).find((section) => section.number === (test.section?.number ?? 0) + 1);
  return next === undefined ? `Every section of ${unitNumber(test.unit.title)} is lit. The unit checkpoint is next.` : `Section ${next.number}, ${next.title}, is open.`;
}

/** The end screen's verdict line: the score and the pass mark, in the test's own words. */
function saidOf(state: PracticeRunState, passed: boolean): string {
  const size = examSize(state);
  const mark = examPassMark(size);
  return passed
    ? `${firstTimeRight(state)} of ${size} right first time, and ${mark} passes. The lessons it covers are lit.`
    : `${firstTimeRight(state)} of ${size} right first time; ${mark} passes it. Nothing is lost: play the lessons, or try again.`;
}

export function TestOutRun({ id, onExit, reducedMotion = false }: { readonly id: string; readonly onExit: () => void; readonly reducedMotion?: boolean }) {
  const test = useMemo(() => testOutFor(id), [id]);
  const pool = useMemo(() => (test === null ? [] : testOutPool(test)), [test]);
  const byId = useMemo(() => new Map(pool.map((item) => [item.entry.id, item])), [pool]);
  const [state, setState] = useState<PracticeRunState>(() => startPracticeRun(pool.map((item) => item.entry.id), false, true));
  const [banked, setBanked] = useState<number | null>(null);
  const bankedOnce = useRef(false);
  // The first judged result of the problem on screen. A ref: recording it must not re-render.
  const firstResult = useRef<BeatResult | null>(null);

  const answer = (result: BeatResult | null) => {
    firstResult.current = null;
    setState((live) => answerProblem(live, result !== null && clearsBeat(result)));
  };
  const keepFirst = (result: BeatResult) => {
    if (firstResult.current === null) firstResult.current = result;
  };

  // Bank the pass once. The chest is saved after the pass, so its offer reads the pass's receipt.
  useEffect(() => {
    if (test === null || bankedOnce.current || !examPassed(state)) return;
    bankedOnce.current = true;
    const receipt = progress.testOut(test.id, test.lights);
    setBanked(receipt.diamonds.reduce((sum, line) => sum + line.amount, 0));
    if (test.chestId !== null) progress.earnSectionChest(test.chestId);
  }, [state, test]);

  if (test === null || pool.length === 0) {
    return (
      <div className="beat-runner beat-runner--empty" role="status">
        <p>This test-out has no questions yet. Pick another stop and come back.</p>
        <ChipPress onClick={onExit}>Back to the pathway</ChipPress>
      </div>
    );
  }

  const problemId = currentProblem(state);
  const current = problemId === null ? undefined : byId.get(problemId);

  if (current === undefined) {
    const passed = examPassed(state);
    return (
      <div className="beat-runner">
        <div className="beat-runner__stage beat-runner__stage--gutter">
          <ExamEnd
            node={test.id}
            state={state}
            ids={pool.map((item) => item.entry.id)}
            banked={banked}
            onContinue={onExit}
            reducedMotion={reducedMotion}
            words={{ passed: "Tested out!", failed: "Not passed yet", said: saidOf(state, passed), opens: opensSaid(test) }}
          />
        </div>
      </div>
    );
  }

  const total = state.answered + state.queue.length;
  const at = Math.min(state.answered + 1, total);
  const draft = pool.some((item) => item.entry.placeholder) && showDraftMarks();
  const count = (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="run-count__row">
        <LessonBar fraction={state.answered / Math.max(1, total)} label={`${test.title}, question ${at}`} />
        <p className="run-count__label" aria-live="polite">{`${at} of ${total}`}</p>
      </div>
      <p className="review-run__ask">{`${test.title}: ${examPassMark(examSize(state))} right first time passes`}</p>
      {draft ? <p className="text-scale-xs text-bb-muted-foreground">{HUMAN_GATE_MARK}</p> : null}
    </div>
  );

  const { entry, source } = current;
  const key = `${entry.id}:${state.answered}`;
  const item = entry.item;
  return (
    <div className="beat-runner" data-test-out={test.id}>
      {item.kind === "mcq" ? null : (
        <div className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 px-4 pt-3 pb-1 md:px-6">
          <button type="button" onClick={onExit} aria-label="Leave this test-out" title="Leave this test-out" className="lesson-exit">
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
              onDone={(results) => answer(results[0] ?? null)}
            />
          ) : null}
          {item.kind === "sort" ? (
            <SortBeatView
              key={key}
              content={item.content}
              level={levelOf(item.content.beat.levels)}
              figures={U1_SORT_FIGURES[entry.id] ?? U2_SORT_FIGURES[entry.id]}
              onResult={keepFirst}
              onContinue={() => answer(firstResult.current)}
            />
          ) : null}
          {item.kind === "match" ? (
            <MatchBoardFromSpec key={key} spec={item.board} onComplete={keepFirst} onContinue={() => answer(firstResult.current)} />
          ) : null}
        </Suspense>
      </div>
    </div>
  );
}
