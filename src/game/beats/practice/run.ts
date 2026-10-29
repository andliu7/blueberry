/**
 * THE IN-A-ROW RUN, owner whiteboard of 2026-09-29, modelled on ALEKS: a
 * practice node is cleared by answering several of its problems right in a
 * row, not by getting through a fixed set.
 *
 * It is a RUN MODE of the seven-slot template (template.ts resolves a
 * practice node to one `practice` step), not a second lesson system. Pure:
 * no clock, no storage, no React, so the suite replays it.
 *
 * THE RULES, each one pinned by test/practiceRun.test.ts:
 *
 *   - problems come from the node's pool in authored order
 *   - a right answer adds 1 to `run`; a miss resets it to 0
 *   - a missed problem comes back REQUEUE_GAP problems later, AT MOST ONCE per
 *     session. The cap is cards/ui/session.ts's "Again" reasoning: a queue that
 *     grows while the student works makes the count a lie, and an unbounded
 *     requeue is a loop with no exit (CLAUDE.md, loop discipline)
 *   - the node clears at the first tier; going on to the higher tiers is
 *     optional, and the session ends at the top tier or when the pool runs out
 *   - a pool that runs out before the first tier ends honestly, uncleared
 *
 * A CHALLENGE over the same run (owner, 2026-10-07: radical items reach a quiz
 * only through Challenge) keeps template.ts's meaning of the word: the same
 * engine with the second chance removed. No requeue, the first miss ends it,
 * and it passes only when every problem in the set was right first time.
 *
 * A UNIT EXAM over the same run (Unit 2 draft, 2026-10-17; pools.ts isExamRun says
 * which checkpoints play one): every problem in the set is played, a miss still
 * comes back once, there is no Stop and no top-tier stop, and it passes on the
 * share of problems right FIRST time (EXAM_PASS), not on a run. Reason: a run
 * of three let a 14-problem unit exam be cleared after 4 answers.
 *
 * `run` is not the streak. "Streak" is the daily streak currency
 * (documentation/ECONOMY.md); this counter pays nothing and is said on screen
 * as "N in a row".
 */

/**
 * THE ONE PLACE TIER NAMES AND THRESHOLDS LIVE, because the owner has not
 * finalised "Master". The first tier is the clear.
 */
export const RUN_TIERS = Object.freeze([
  Object.freeze({ name: "Pro", at: 3 }),
  Object.freeze({ name: "Master", at: 5 }),
  Object.freeze({ name: "Prodigy", at: 10 }),
] as const);

export type RunTier = (typeof RUN_TIERS)[number];

/** The run that clears the node. */
export const CLEAR_AT: number = RUN_TIERS[0].at;

/** A unit exam passes with at least this share right first time. Owner to confirm the figure. */
const EXAM_PASS = 0.8;

/** A missed problem comes back after this many other problems, or last if fewer remain. */
export const REQUEUE_GAP = 2;

/**
 * Spare problems a tier needs beyond its own length, from the owner's rule
 * that Prodigy (10 in a row) needs a pool of at least 12. Applied to every
 * tier the same way, which is an inference from that one figure.
 */
export const POOL_SLACK = 2;

export interface PracticeRunState {
  /** Problem ids still to play. The one on screen is at index 0. */
  readonly queue: readonly string[];
  /** Right answers in a row, now. */
  readonly run: number;
  /** The longest run this session. */
  readonly best: number;
  /** Ids that already came back once, so they never come back twice. */
  readonly requeued: readonly string[];
  readonly answered: number;
  readonly correct: number;
  /** Ids missed at least once this session, in first-miss order. */
  readonly missed: readonly string[];
  /** True once the student stops, the pool runs out, or the top tier is reached. */
  readonly finished: boolean;
  /** A Challenge: no requeue, a miss ends the session, no top-tier stop. */
  readonly challenge: boolean;
  /** A unit exam: the whole set plays, misses come back once, passes on EXAM_PASS. Optional so older saves still load. */
  readonly exam?: boolean;
}

/** A session over a pool, in authored order. A repeated id is dropped: a pool never pads. */
export function startPracticeRun(ids: readonly string[], challenge = false, exam = false): PracticeRunState {
  const queue = [...new Set(ids)];
  return { queue, run: 0, best: 0, requeued: [], answered: 0, correct: 0, missed: [], finished: queue.length === 0, challenge, ...(exam && !challenge ? { exam: true } : {}) };
}

export function currentProblem(state: PracticeRunState): string | null {
  return state.finished ? null : (state.queue[0] ?? null);
}

const TOP = RUN_TIERS[RUN_TIERS.length - 1]!.at;

/**
 * Where the run lands after a miss. In the Master and Prodigy tiers a miss
 * steps back ONE problem, not to zero (owner: no big setback on a miss, as in
 * Duolingo). Below Master it still resets, so the Pro clear stays earned.
 * Challenge and exam keep their own rules, so they are not softened here.
 */
function missedRun(state: PracticeRunState): number {
  if (state.challenge || state.exam === true) return 0;
  return state.run >= RUN_TIERS[1].at ? state.run - 1 : 0;
}

/** The problem on screen was answered. Ignored once the session is over. */
export function answerProblem(state: PracticeRunState, correct: boolean): PracticeRunState {
  const id = currentProblem(state);
  if (id === null) return state;
  const rest = state.queue.slice(1);
  const run = correct ? state.run + 1 : missedRun(state);
  const best = Math.max(state.best, run);
  let queue = rest;
  let requeued = state.requeued;
  if (!correct && !state.challenge && !requeued.includes(id)) {
    const at = Math.min(REQUEUE_GAP, rest.length);
    queue = [...rest.slice(0, at), id, ...rest.slice(at)];
    requeued = [...requeued, id];
  }
  return {
    queue,
    run,
    best,
    requeued,
    answered: state.answered + 1,
    correct: state.correct + (correct ? 1 : 0),
    missed: correct || state.missed.includes(id) ? state.missed : [...state.missed, id],
    // An exam has no top-tier stop: it ends when the whole set has been played.
    finished: state.challenge ? queue.length === 0 || !correct : state.exam === true ? queue.length === 0 : queue.length === 0 || run >= TOP,
    challenge: state.challenge,
    // The key is only written for an exam, so every other run keeps its exact old shape.
    ...(state.exam === true ? { exam: true } : {}),
  };
}

/** The student stops here. Allowed at any point; whether it clears is `cleared`. */
export function stopRun(state: PracticeRunState): PracticeRunState {
  return state.finished ? state : { ...state, finished: true };
}

/** A Challenge passes when the whole set was played and nothing was missed. Always false for Practice. */
export function challengePassed(state: PracticeRunState): boolean {
  return state.challenge && state.finished && state.queue.length === 0 && state.answered > 0 && state.missed.length === 0;
}

/** Distinct problems in the set: answered plus still queued, less the requeued copies. */
export function examSize(state: PracticeRunState): number {
  return state.answered - state.requeued.length + state.queue.length;
}

/** Problems right the first time they were shown. A requeued problem already replayed was answered twice. */
export function firstTimeRight(state: PracticeRunState): number {
  const replayed = state.requeued.filter((id) => !state.queue.includes(id)).length;
  return state.answered - replayed - state.missed.length;
}

/** Right-first-time answers an exam of this size needs. */
export function examPassMark(size: number): number {
  return Math.ceil(size * EXAM_PASS);
}

/** An exam passes when the whole set was played and enough were right first time. */
export function examPassed(state: PracticeRunState): boolean {
  return state.exam === true && state.finished && state.queue.length === 0 && state.answered > 0 && firstTimeRight(state) >= examPassMark(examSize(state));
}

/** Whether this session clears the node: the first tier was reached at some point, or, for an exam, it passed. */
export function cleared(state: PracticeRunState): boolean {
  if (state.exam === true) return examPassed(state);
  return state.best >= CLEAR_AT;
}

/** The highest tier a run reached, or null below the first. */
export function tierFor(run: number): RunTier | null {
  let reached: RunTier | null = null;
  for (const tier of RUN_TIERS) if (run >= tier.at) reached = tier;
  return reached;
}

/** The next tier above a run, or null at the top. */
export function nextTier(run: number): RunTier | null {
  return RUN_TIERS.find((tier) => tier.at > run) ?? null;
}

/** Tiers a pool of this size cannot honestly offer. Reported, never padded. */
export function unreachableTiers(poolSize: number): readonly RunTier[] {
  return RUN_TIERS.filter((tier) => poolSize < tier.at + POOL_SLACK);
}

/**
 * The closing sentence, said from the session alone so the suite can hold it.
 * A pool that ran out short says so plainly and never claims a clear.
 */
export function endSaid(state: PracticeRunState): string {
  if (state.challenge) {
    return challengePassed(state)
      ? `${state.correct} of ${state.correct} right first time. Challenge passed.`
      : `A miss ends a Challenge. You had ${state.correct} of ${state.answered} right when it stopped.`;
  }
  if (state.exam === true) {
    const size = examSize(state);
    const mark = examPassMark(size);
    return examPassed(state)
      ? `${firstTimeRight(state)} of ${size} right first time. ${mark} was the pass mark: checkpoint passed.`
      : `${firstTimeRight(state)} of ${size} right first time. ${mark} passes it, so review the topics below and come back.`;
  }
  const tier = tierFor(state.best);
  if (tier !== null) return `${state.best} in a row. ${tier.name}: this lesson is cleared.`;
  return `${state.best} in a row. ${CLEAR_AT} in a row clears it, so come back for another go.`;
}
