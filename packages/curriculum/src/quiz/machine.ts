/**
 * The placement quiz, as a pure reducer.
 *
 * A student sits real problems before signup and lands on a course
 * recommendation with a starting frontier in the pathway. Same discipline as
 * the interaction package's machine: no clock read inside a decision (elapsed
 * time arrives as event data from the shell), no randomness (every tie breaks
 * deterministically, and a caller wanting variety supplies a seed), and the
 * same three inputs always produce the same output.
 *
 * THE WALK. Ask at the student's claimed course, middle difficulty. A correct
 * answer moves the probe forward through the course's topics in registry
 * order, which placement.ts keeps dependency sound. A wrong answer walks the
 * failed topic's prerequisite closure backwards, nearest gap first, which is
 * exactly what prerequisiteClosure() is for: the next question is about the
 * closest thing the student might be missing.
 *
 * THE BOUND, which is the design and not an afterthought. The Budgets row is
 * under 180 seconds to a recommendation. The machine stops asking when the
 * reported elapsed time plus a per kind worst case reserve for the next
 * question would cross the budget, or at the hard cap of QUESTION_CAP
 * questions, whichever comes first. Unbounded adaptivity is how a quiz runs
 * long; this one cannot.
 *
 * WHAT AN EIGHT QUESTION QUIZ CAN KNOW, said honestly. The recommendation
 * carries a confidence that is "low" unless the walk actually converged, and
 * the copy never presents a fundamentals placement as a demotion, per the
 * voice contract: starting earlier is the fast route to the harder material.
 */

import {
  gradeAttempt,
  type GradingResult,
} from "../grading.js";
import type { AnswerState } from "../answer.js";
import type { Problem } from "../problem.js";
import type { ProblemId } from "../ids.js";
import {
  prerequisiteClosure,
  probeTopicIdsForCourse,
  type CourseId,
  type TopicId,
} from "../placement.js";
import type { AnswerKind } from "../kinds.js";

/** The hard ceiling on questions, independent of the time budget. */
export const QUESTION_CAP = 8;

/** The Budgets row: seconds to a recommendation. Fixed in CLAUDE.md. */
export const TIME_BUDGET_SECONDS = 180;

/**
 * The modelled worst case cost of answering one question of each kind, in
 * seconds, reading included. A MODEL, not a measurement: until real students
 * produce real timings this is the stated assumption every simulated number
 * rests on, and the validator check prints it as such. The numbers err high on
 * purpose, because a budget met under a generous model is met under a lean one.
 */
export const WORST_CASE_SECONDS_BY_KIND: Readonly<Record<AnswerKind, number>> = Object.freeze({
  multiple_choice: 25,
  numeric: 35,
  major_product: 30,
  reagents: 40,
  structure: 45,
  // Both are drag boards: reading every card once, then arranging. Modelled at
  // the reagent cost rather than the structure cost, because the cards carry the
  // vocabulary with them and nothing has to be recalled from a blank canvas.
  ordering: 40,
  matching: 40,
});

export interface QuizConfig {
  /** Every problem the quiz may draw from. The real corpus in production. */
  readonly problems: readonly Problem[];
  /** The course the student claims, or null for "place me". */
  readonly claimedCourse: CourseId | null;
}

export interface AskedRecord {
  readonly problemId: ProblemId;
  readonly topic: TopicId;
  readonly result: GradingResult["kind"];
  readonly correct: boolean;
}

export interface Recommendation {
  readonly course: CourseId;
  /**
   * The frontier: topics the student should start at. Never empty; a student
   * who missed everything starts at the course's first probeable topic, which
   * is a starting point and not a judgement.
   *
   * RULING, recorded after an adversary pass asked for one: a start topic MAY
   * be homed in a different course than `course` below. prerequisiteClosure
   * crosses course boundaries on purpose (an Organic Chemistry II gap is often
   * an Organic Chemistry I topic), and telling the student to firm up that
   * earlier topic IS the recommendation, not a bookkeeping error. `course`
   * names what the student is aiming at; `startTopics` names where to begin.
   * The shell renders a cross-course start topic as a short detour into the
   * earlier course's track, so Phase 5's per course unlock gates need no new
   * machinery: the topic's home course is in TOPICS.
   */
  readonly startTopics: readonly TopicId[];
  readonly confidence: "low" | "moderate";
  /** Student facing, written under the voice contract. */
  readonly copy: string;
  readonly questionsAsked: number;
  /**
   * Topics the walk wanted to probe and could not, because the corpus holds no
   * problem for them. Reported so corpus thinness is a visible fact rather
   * than a silent skip.
   */
  readonly unprobeable: readonly TopicId[];
}

export interface QuizState {
  readonly config: QuizConfig;
  readonly phase: "asking" | "finished";
  readonly course: CourseId;
  /** The topic the current question probes, index into the course topic list. */
  readonly probeIndex: number;
  /** Topics queued for backward probing after a wrong answer, nearest first. */
  readonly backlog: readonly TopicId[];
  readonly currentProblem: ProblemId | null;
  readonly asked: readonly AskedRecord[];
  readonly elapsedSeconds: number;
  readonly unprobeable: readonly TopicId[];
  readonly recommendation: Recommendation | null;
}

export type QuizEvent =
  | { readonly kind: "answerSubmitted"; readonly state: AnswerState; readonly elapsedSeconds: number }
  | { readonly kind: "skipped"; readonly elapsedSeconds: number };

const DEFAULT_COURSE: CourseId = "orgo_1";

function problemsForTopic(config: QuizConfig, topic: TopicId): readonly Problem[] {
  return config.problems.filter((problem) => problem.topic === topic);
}

/**
 * Deterministic pick: nearest difficulty to the target, ties by id, never a
 * problem already asked. Returns null when the topic has nothing left.
 */
function pickProblem(
  config: QuizConfig,
  topic: TopicId,
  targetDifficulty: number,
  asked: readonly AskedRecord[],
): Problem | null {
  const seen = new Set(asked.map((record) => record.problemId));
  const candidates = problemsForTopic(config, topic)
    .filter((problem) => !seen.has(problem.id))
    .sort((a, b) => {
      const byDistance = Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty);
      return byDistance !== 0 ? byDistance : a.id < b.id ? -1 : 1;
    });
  return candidates[0] ?? null;
}

function courseTopics(course: CourseId): readonly TopicId[] {
  // The PROBE list, not the home list: for DAT and MCAT this is every content
  // course's topics in teaching order, so a review course claim gets a real
  // walk rather than an instant empty finish. See placement.ts.
  return probeTopicIdsForCourse(course);
}

/** The largest reserve any next question could need under the model. */
function worstReserve(): number {
  return Math.max(...Object.values(WORST_CASE_SECONDS_BY_KIND));
}

interface Probe {
  readonly problem: Problem | null;
  readonly probeIndex: number;
  readonly backlog: readonly TopicId[];
  readonly unprobeable: readonly TopicId[];
}

/**
 * Find the next question: backlog first (backward probes are the informative
 * ones), then the forward probe. Topics with no eligible problem are recorded
 * as unprobeable and skipped rather than padded with fakes.
 */
function nextProbe(
  config: QuizConfig,
  course: CourseId,
  probeIndex: number,
  backlog: readonly TopicId[],
  asked: readonly AskedRecord[],
  unprobeable: readonly TopicId[],
  targetDifficulty: number,
): Probe {
  const newlyUnprobeable: TopicId[] = [...unprobeable];
  let remainingBacklog = [...backlog];
  while (remainingBacklog.length > 0) {
    const topic = remainingBacklog[0] as TopicId;
    remainingBacklog = remainingBacklog.slice(1);
    const problem = pickProblem(config, topic, targetDifficulty, asked);
    if (problem !== null) {
      return { problem, probeIndex, backlog: remainingBacklog, unprobeable: newlyUnprobeable };
    }
    if (!newlyUnprobeable.includes(topic)) newlyUnprobeable.push(topic);
  }

  const topics = courseTopics(course);
  let index = probeIndex;
  while (index < topics.length) {
    const topic = topics[index] as TopicId;
    const problem = pickProblem(config, topic, targetDifficulty, asked);
    if (problem !== null) {
      return { problem, probeIndex: index, backlog: [], unprobeable: newlyUnprobeable };
    }
    if (!newlyUnprobeable.includes(topic)) newlyUnprobeable.push(topic);
    index += 1;
  }
  return { problem: null, probeIndex: index, backlog: [], unprobeable: newlyUnprobeable };
}

function finish(state: QuizState, elapsedSeconds: number): QuizState {
  const wrongTopics = state.asked.filter((record) => !record.correct).map((record) => record.topic);
  const correctCount = state.asked.filter((record) => record.correct).length;

  // The frontier: the nearest unresolved gaps when there were misses, or the
  // topic just past the deepest correct probe when there were none.
  let startTopics: readonly TopicId[];
  if (wrongTopics.length > 0) {
    const gaps = new Set<TopicId>();
    for (const topic of wrongTopics) {
      const prerequisites = prerequisiteClosure(topic).filter((candidate) =>
        state.asked.some((record) => record.topic === candidate && record.correct),
      );
      // The failed topic itself is the gap when its asked prerequisites held.
      gaps.add(prerequisites.length > 0 || prerequisiteClosure(topic).length === 0 ? topic : (prerequisiteClosure(topic)[0] as TopicId));
    }
    startTopics = [...gaps];
  } else {
    const topics = courseTopics(state.course);
    const index = Math.min(state.probeIndex, Math.max(0, topics.length - 1));
    startTopics = topics.length > 0 ? [topics[index] as TopicId] : [];
  }
  if (startTopics.length === 0) {
    const topics = courseTopics(state.course);
    startTopics = topics.length > 0 ? [topics[0] as TopicId] : [];
  }

  const converged = state.asked.length >= 4;
  const allCorrect = correctCount === state.asked.length && state.asked.length > 0;
  const copy = allCorrect
    ? `You held your ground on everything we asked, ${state.asked.length} for ${state.asked.length}. Starting further in is earned: begin where it gets interesting.`
    : `Based on ${state.asked.length} question${state.asked.length === 1 ? "" : "s"}, the fastest route to the material you are aiming for runs through ${startTopics.length === 1 ? "one topic" : `${startTopics.length} topics`} worth firming up first. Strong foundations are speed, not a detour.`;

  return Object.freeze({
    ...state,
    phase: "finished" as const,
    currentProblem: null,
    elapsedSeconds,
    recommendation: Object.freeze({
      course: state.course,
      startTopics,
      confidence: converged ? ("moderate" as const) : ("low" as const),
      copy,
      questionsAsked: state.asked.length,
      unprobeable: state.unprobeable,
    }),
  });
}

export function createQuiz(config: QuizConfig): QuizState {
  const course = config.claimedCourse ?? DEFAULT_COURSE;
  const probe = nextProbe(config, course, 0, [], [], [], 1000);
  const base: QuizState = {
    config,
    phase: probe.problem === null ? "finished" : "asking",
    course,
    probeIndex: probe.probeIndex,
    backlog: probe.backlog,
    currentProblem: probe.problem?.id ?? null,
    asked: [],
    elapsedSeconds: 0,
    unprobeable: probe.unprobeable,
    recommendation: null,
  };
  return base.phase === "finished" ? finish(Object.freeze(base), 0) : Object.freeze(base);
}

export function reduceQuiz(state: QuizState, event: QuizEvent): QuizState {
  if (state.phase === "finished" || state.currentProblem === null) return state;

  const problem = state.config.problems.find((candidate) => candidate.id === state.currentProblem);
  if (problem === undefined) return finish(state, event.elapsedSeconds);

  let asked = state.asked;
  let backlog = state.backlog;
  let probeIndex = state.probeIndex;

  if (event.kind === "answerSubmitted") {
    const result = gradeAttempt(problem, event.state);
    const correct = result.kind === "correct";
    asked = [
      ...asked,
      { problemId: problem.id, topic: problem.topic, result: result.kind, correct },
    ];
    if (correct) {
      probeIndex = probeIndex + 1;
    } else {
      // Nearest gap first. The failed topic's closure supplies the backward
      // probes; the forward probe stays where it is so a recovered student
      // resumes rather than restarts.
      const closure = prerequisiteClosure(problem.topic);
      backlog = [...backlog, ...closure.filter((topic) => !backlog.includes(topic))];
    }
  } else {
    // A skip is recorded as a wrong answer with no grading, because a student
    // skipping a question is a student who could not answer it.
    asked = [
      ...asked,
      { problemId: problem.id, topic: problem.topic, result: "unmatched_wrong", correct: false },
    ];
    const closure = prerequisiteClosure(problem.topic);
    backlog = [...backlog, ...closure.filter((topic) => !backlog.includes(topic))];
  }

  // The bound: cap, or budget minus the worst reserve for whatever comes next.
  if (asked.length >= QUESTION_CAP || event.elapsedSeconds + worstReserve() >= TIME_BUDGET_SECONDS) {
    return finish(
      Object.freeze({ ...state, asked, backlog, probeIndex }),
      event.elapsedSeconds,
    );
  }

  const probe = nextProbe(
    state.config,
    state.course,
    probeIndex,
    backlog,
    asked,
    state.unprobeable,
    problem.difficulty,
  );
  if (probe.problem === null) {
    return finish(
      Object.freeze({ ...state, asked, backlog: probe.backlog, probeIndex: probe.probeIndex, unprobeable: probe.unprobeable }),
      event.elapsedSeconds,
    );
  }
  return Object.freeze({
    ...state,
    asked,
    backlog: probe.backlog,
    probeIndex: probe.probeIndex,
    currentProblem: probe.problem.id,
    unprobeable: probe.unprobeable,
  });
}
