/**
 * The in-a-row run (beats/practice/run.ts), over small fixture id lists. No
 * pool content is used here on purpose: the rules are about ids and answers.
 */
import { describe, expect, it } from "vitest";

import {
  CLEAR_AT,
  POOL_SLACK,
  REQUEUE_GAP,
  RUN_TIERS,
  answerProblem,
  challengePassed,
  cleared,
  currentProblem,
  endSaid,
  nextTier,
  startPracticeRun,
  stopRun,
  tierFor,
  unreachableTiers,
  type PracticeRunState,
} from "../beats/practice/run";
import { readBestRun, recordBestRun } from "../beats/practice/bestRun";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

function play(state: PracticeRunState, answers: readonly boolean[]): PracticeRunState {
  return answers.reduce((live, correct) => answerProblem(live, correct), state);
}

describe("the tier constant", () => {
  it("holds the owner's three tiers in one place, the first being the clear", () => {
    expect(RUN_TIERS.map((tier) => [tier.name, tier.at])).toEqual([
      ["Pro", 3],
      ["Master", 5],
      ["Prodigy", 10],
    ]);
    expect(CLEAR_AT).toBe(3);
  });

  it("names the tier a run reached and the one above it", () => {
    expect(tierFor(2)).toBeNull();
    expect(tierFor(3)?.name).toBe("Pro");
    expect(tierFor(9)?.name).toBe("Master");
    expect(tierFor(10)?.name).toBe("Prodigy");
    expect(nextTier(0)?.name).toBe("Pro");
    expect(nextTier(4)?.name).toBe("Master");
    expect(nextTier(10)).toBeNull();
  });

  it("reports Prodigy unreachable under 12 problems, as the owner set it, and never pads", () => {
    expect(POOL_SLACK).toBe(2);
    expect(unreachableTiers(12)).toEqual([]);
    expect(unreachableTiers(11).map((tier) => tier.name)).toEqual(["Prodigy"]);
    expect(unreachableTiers(10).map((tier) => tier.name)).toEqual(["Prodigy"]);
    expect(unreachableTiers(6).map((tier) => tier.name)).toEqual(["Master", "Prodigy"]);
    expect(startPracticeRun(["a", "a", "b"]).queue).toEqual(["a", "b"]);
  });
});

describe("the run", () => {
  it("plays the pool in authored order", () => {
    const state = startPracticeRun(ids(4));
    expect(currentProblem(state)).toBe("p1");
    expect(currentProblem(play(state, [true]))).toBe("p2");
  });

  it("adds one per right answer and resets to zero on a miss", () => {
    const state = play(startPracticeRun(ids(8)), [true, true, false]);
    expect(state.run).toBe(0);
    expect(state.best).toBe(2);
    expect(play(state, [true]).run).toBe(1);
  });

  it(`brings a missed problem back ${REQUEUE_GAP} problems later`, () => {
    const state = play(startPracticeRun(ids(6)), [false]);
    expect(state.queue).toEqual(["p2", "p3", "p1", "p4", "p5", "p6"]);
  });

  it("brings a problem back at most once per session", () => {
    let state = play(startPracticeRun(ids(3)), [false]);
    expect(state.queue).toEqual(["p2", "p3", "p1"]);
    state = play(state, [true, true, false]);
    expect(state.queue).toEqual([]);
    expect(state.requeued).toEqual(["p1"]);
    expect(state.finished).toBe(true);
  });

  it("puts a missed problem last when fewer than the gap remain, so the session still ends", () => {
    const state = play(startPracticeRun(ids(2)), [true, false]);
    expect(state.queue).toEqual(["p2"]);
    const done = play(state, [false]);
    expect(done.finished).toBe(true);
    expect(done.answered).toBe(3);
  });

  it("clears at 3 in a row, and going on is optional", () => {
    const state = play(startPracticeRun(ids(12)), [true, true, true]);
    expect(cleared(state)).toBe(true);
    expect(state.finished).toBe(false);
    const stopped = stopRun(state);
    expect(stopped.finished).toBe(true);
    expect(cleared(stopped)).toBe(true);
    expect(currentProblem(stopped)).toBeNull();
  });

  it("keeps the clear after a later miss: the tier was reached", () => {
    const state = play(startPracticeRun(ids(12)), [true, true, true, false]);
    expect(state.run).toBe(0);
    expect(cleared(state)).toBe(true);
  });

  it("a miss in the Master tier goes back one problem, not to zero", () => {
    const state = play(startPracticeRun(ids(14)), [true, true, true, true, true, false]);
    expect(state.run).toBe(4);
    expect(state.best).toBe(5);
    expect(play(state, [true]).run).toBe(5);
  });

  it("a miss in the Prodigy run goes back one problem, and below Master still resets", () => {
    const deep = play(startPracticeRun(ids(20)), [...Array(9).fill(true), false]);
    expect(deep.run).toBe(8);
    expect(deep.finished).toBe(false);
    expect(play(startPracticeRun(ids(12)), [true, true, true, true, false]).run).toBe(0);
  });

  it("a Challenge is not softened", () => {
    expect(play(startPracticeRun(ids(12), true), [true, true, true, true, true, false]).run).toBe(0);
  });

  it("ends at the top tier", () => {
    const state = play(startPracticeRun(ids(12)), Array(10).fill(true));
    expect(state.finished).toBe(true);
    expect(endSaid(state)).toBe("10 in a row. Prodigy: this lesson is cleared.");
  });

  it("ends honestly, uncleared, when the pool runs out before 3 in a row", () => {
    const state = play(startPracticeRun(ids(4)), [true, false, true, true, false, true]);
    expect(state.finished).toBe(true);
    expect(cleared(state)).toBe(false);
    expect(state.best).toBe(2);
    expect(endSaid(state)).toBe("2 in a row. 3 in a row clears it, so come back for another go.");
  });

  it("ignores answers after the session ends, and an empty pool starts finished", () => {
    const done = stopRun(startPracticeRun(ids(3)));
    expect(answerProblem(done, true)).toBe(done);
    expect(startPracticeRun([]).finished).toBe(true);
  });

  it("can never loop: every answer shortens the queue or spends the one requeue", () => {
    let state = startPracticeRun(ids(12));
    let steps = 0;
    while (!state.finished) {
      state = answerProblem(state, false);
      steps += 1;
      expect(steps).toBeLessThanOrEqual(24);
    }
    expect(steps).toBe(24);
  });
});

describe("the best run, kept locally as presentation", () => {
  function memory(): Storage {
    const data = new Map<string, string>();
    return {
      get length() {
        return data.size;
      },
      clear: () => data.clear(),
      getItem: (key) => data.get(key) ?? null,
      key: (i) => [...data.keys()][i] ?? null,
      removeItem: (key) => void data.delete(key),
      setItem: (key, value) => void data.set(key, value),
    };
  }

  it("keeps the larger run per node and survives storage that throws", () => {
    const storage = memory();
    expect(readBestRun("u1-x", storage)).toBe(0);
    expect(recordBestRun("u1-x", 4, storage)).toBe(4);
    expect(recordBestRun("u1-x", 2, storage)).toBe(4);
    expect(readBestRun("u1-x", storage)).toBe(4);
    expect(readBestRun("u1-y", storage)).toBe(0);
    const broken = { ...storage, getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } as Storage;
    expect(readBestRun("u1-x", broken)).toBe(0);
    expect(recordBestRun("u1-x", 3, broken)).toBe(3);
  });
});

describe("a Challenge over the same run: no second chance", () => {
  it("ends at the first miss, with nothing requeued, and fails", () => {
    const state = play(startPracticeRun(ids(5), true), [true, true, false]);
    expect(state.finished).toBe(true);
    expect(state.requeued).toEqual([]);
    expect(currentProblem(state)).toBeNull();
    expect(challengePassed(state)).toBe(false);
    expect(endSaid(state)).toBe("A miss ends a Challenge. You had 2 of 3 right when it stopped.");
  });

  it("a miss on the last problem is still a fail", () => {
    const state = play(startPracticeRun(ids(3), true), [true, true, false]);
    expect(state.finished).toBe(true);
    expect(challengePassed(state)).toBe(false);
  });

  it("passes only when every problem in the set was right first time, past the top tier", () => {
    let state = play(startPracticeRun(ids(12), true), Array.from({ length: 10 }, () => true));
    // Ten in a row ends a Practice run at Prodigy; a Challenge plays the whole set.
    expect(state.finished).toBe(false);
    expect(challengePassed(state)).toBe(false);
    state = play(state, [true, true]);
    expect(state.finished).toBe(true);
    expect(challengePassed(state)).toBe(true);
    expect(endSaid(state)).toBe("12 of 12 right first time. Challenge passed.");
  });

  it("never passes a Practice run, however it went", () => {
    const state = play(startPracticeRun(ids(3)), [true, true, true]);
    expect(state.finished).toBe(true);
    expect(challengePassed(state)).toBe(false);
  });
});
