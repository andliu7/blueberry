/**
 * How a concept check answers, on top of the run engine (beats/practice/run.ts,
 * another lane's file, used as it is). Pure: no React, no DOM.
 *
 * TWO RULES, both from the round 2 critic, who played a run with two misses:
 * "acn-role was asked at step 0 and again at step 3, and strans at steps 1 and
 * 4, both right after the correct answer had been shown. Both repeats counted
 * toward the clearing 4-in-a-row, so the clear partly rewards remembering an
 * answer that was just revealed rather than reviewing the lesson."
 *
 *   1. A MISSED PROBLEM COMES BACK LATER. The engine brings it back after two
 *      others (REQUEUE_GAP); a check moves it to after REVIEW_REQUEUE_GAP
 *      others, one more than the clear target, so the student has worked
 *      through a full run of other lessons before seeing it again.
 *   2. A REPEAT NEVER COUNTS TOWARD THE CLEAR. Answering it right holds the
 *      run where it was (it is still worth doing: it is the retrieval the
 *      student needs); answering it wrong still breaks the run. So every
 *      problem inside a clearing run is one the student had not been shown
 *      the answer to.
 */
import { answerProblem, currentProblem, type PracticeRunState } from "../../beats/practice/run";

/** Other problems between a miss and its repeat: the 4-problem clear plus one. */
export const REVIEW_REQUEUE_GAP = 5;

/** Whether a right answer to the problem on screen would add to the run. False for a repeat. */
export function countsTowardRun(state: PracticeRunState): boolean {
  const id = currentProblem(state);
  return id !== null && !state.requeued.includes(id);
}

export function answerReview(state: PracticeRunState, correct: boolean): PracticeRunState {
  const id = currentProblem(state);
  if (id === null) return state;
  const repeat = !countsTowardRun(state);
  const next = answerProblem(state, correct);

  // Rule 2: a right answer to a repeat leaves the run and the best as they were.
  if (repeat && correct) return { ...next, run: state.run, best: state.best };

  // Rule 1: a first miss was put back REQUEUE_GAP in; move it further back.
  if (!correct && !repeat && next.requeued.includes(id)) {
    const rest = next.queue.filter((queued) => queued !== id);
    const at = Math.min(REVIEW_REQUEUE_GAP, rest.length);
    return { ...next, queue: [...rest.slice(0, at), id, ...rest.slice(at)] };
  }
  return next;
}
