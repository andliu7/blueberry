/**
 * The end of a UNIT EXAM run (run.ts, exam mode; pools.ts isExamRun). Added
 * 2026-10-17 for the Unit 2 draft checkpoint, because the in-a-row ending said
 * "Pro: this lesson is cleared" under a "Checkpoint cleared" heading and gave
 * no word on which topics held up or what the pass opens.
 *
 * Three things, top to bottom: Bloom and a verdict, three stat tiles (right
 * first time, accuracy over every answer given, fixed on the second try), then
 * one row per topic, so a student who did not pass sees exactly which lesson
 * to go back to; a row with a miss is a link to that lesson.
 */
import { Berry } from "../../mascot/Berry";
import { PATHWAY_UNITS, checkpointUnitFor, pathwayNode, unitNumber } from "../../demo/pathwayMap";
import { hrefForLesson } from "../../app/routes";
import { unitOpenedAfter } from "../../tabs/pathway/pathwayState";
import { ChipPress } from "../ChipPress";
import { GemMark } from "../chromeIcons";
import { poolHomeOf } from "./pools";
import { endSaid, examPassed, examSize, firstTimeRight, type PracticeRunState } from "./run";
import "./exam-end.css";

interface Topic {
  readonly node: string;
  readonly title: string;
  readonly total: number;
  readonly right: number;
}

/** The exam's problems grouped by the lesson they were written for, in the order they were first shown. */
function topicsOf(ids: readonly string[], missed: readonly string[]): readonly Topic[] {
  const order: string[] = [];
  const totals = new Map<string, { total: number; right: number }>();
  for (const id of ids) {
    const node = poolHomeOf(id) ?? "other";
    if (!totals.has(node)) {
      order.push(node);
      totals.set(node, { total: 0, right: 0 });
    }
    const tally = totals.get(node)!;
    tally.total += 1;
    if (!missed.includes(id)) tally.right += 1;
  }
  return order.map((node) => ({ node, title: pathwayNode(node)?.title ?? node, ...totals.get(node)! }));
}

export interface ExamEndProps {
  readonly node: string;
  readonly state: PracticeRunState;
  /** Every problem id in the exam, in the order it was set. */
  readonly ids: readonly string[];
  /** Diamonds the store paid, or null before the payout lands. */
  readonly banked: number | null;
  readonly onContinue: () => void;
  readonly reducedMotion: boolean;
}

export function ExamEnd({ node, state, ids, banked, onContinue, reducedMotion }: ExamEndProps) {
  const passed = examPassed(state);
  const size = examSize(state);
  const right = firstTimeRight(state);
  // Every answer given, second tries included (round 4 critic: right / size repeated the First try tile).
  const accuracy = state.answered === 0 ? 0 : Math.round((state.correct / state.answered) * 100);
  const fixed = state.correct - right;
  const topics = topicsOf(ids, state.missed);
  const unit = checkpointUnitFor(node);
  const opens = unit === null ? null : unitOpenedAfter(PATHWAY_UNITS, PATHWAY_UNITS.indexOf(unit)).opens;

  return (
    <div className="exam-end">
      <div className="exam-end__hero">
        <Berry mood={passed ? "cheer" : "thinking"} behaviour={passed ? "celebrate" : "idle"} sizePx={104} reducedMotion={reducedMotion} />
        <h2 className="bb-title-face exam-end__title">{passed ? "Checkpoint passed!" : "Not passed yet"}</h2>
        <p className="exam-end__said">{endSaid(state)}</p>
      </div>

      <ul className="exam-end__tiles" role="list">
        <li className="exam-end__tile exam-end__tile--primary">
          <span className="exam-end__tile-head">First try</span>
          <span className="exam-end__tile-value">{right}/{size}</span>
        </li>
        <li className={`exam-end__tile ${passed ? "exam-end__tile--good" : "exam-end__tile--warn"}`}>
          <span className="exam-end__tile-head">Accuracy</span>
          <span className="exam-end__tile-value">{accuracy}%</span>
        </li>
        <li className="exam-end__tile exam-end__tile--warn">
          <span className="exam-end__tile-head">Fixed</span>
          <span className="exam-end__tile-value">{fixed}</span>
        </li>
      </ul>

      <section className="exam-end__topics" aria-label="How each topic went">
        <h3 className="exam-end__topics-head">By topic</h3>
        <ul role="list">
          {topics.map((topic) => {
            const clean = topic.right === topic.total;
            const score = (
              <span className="exam-end__topic-score">
                {topic.right} of {topic.total}
                {clean ? "" : ", review"}
              </span>
            );
            // A topic with a miss links to its lesson, so "review the topics below" leads somewhere (round 4 critic).
            const lesson = !clean && pathwayNode(topic.node) !== null;
            return (
              <li key={topic.node} className={`exam-end__topic ${clean ? "exam-end__topic--clean" : "exam-end__topic--review"}`}>
                {lesson ? (
                  <a className="exam-end__topic-link" href={hrefForLesson(topic.node)}>
                    <span className="exam-end__topic-name">{topic.title}</span>
                    {score}
                    <span className="exam-end__topic-go" aria-hidden>
                      ›
                    </span>
                  </a>
                ) : (
                  <>
                    <span className="exam-end__topic-name">{topic.title}</span>
                    {score}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {passed && opens !== null && unit !== null ? (
        <p className="exam-end__opens">
          {`With every ${unitNumber(unit.title)} lesson cleared too, this opens ${opens.title.replace(" · ", ": ")}.`}
        </p>
      ) : null}
      {banked !== null && banked > 0 ? (
        <p className="lesson-banked exam-end__banked">
          <GemMark />
          <span>
            +{banked} {banked === 1 ? "diamond" : "diamonds"}
          </span>
        </p>
      ) : null}
      <ChipPress className="w-full" onClick={onContinue}>
        Continue
      </ChipPress>
    </div>
  );
}
