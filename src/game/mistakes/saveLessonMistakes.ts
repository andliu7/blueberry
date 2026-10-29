/**
 * After a lesson: evaluate what it missed and put it in the bank.
 *
 * The run keeps first-try misses already (template.ts reportStep): quick
 * question ids in `missedMcqIds`, drawings in `missedPoolIds`. Each id is
 * looked up on the node its step came from (recycleBeatsFor and
 * recyclePoolEntriesFor), so a checkpoint's borrowed questions are saved
 * against the lesson that owns them and can be played back later.
 */

import { recycleBeatsFor, recyclePoolEntriesFor, missedPoolIdsOf, lessonPoolItems, type LessonRun } from "../beats/template";
import { mistakeBank, type MissedQuestion, type MistakeBank } from "./mistakeBank";

export function missedFromRun(run: LessonRun, node: string): readonly MissedQuestion[] {
  const out: MissedQuestion[] = [];
  const beats = recycleBeatsFor(run.plan, run.missedMcqIds);
  for (const id of run.missedMcqIds) {
    const beat = beats.find((one) => one.id === id);
    if (beat !== undefined) out.push({ id, kind: "mcq", node: beat.node });
  }
  const entries = recyclePoolEntriesFor(run.plan, missedPoolIdsOf(run));
  for (const id of missedPoolIdsOf(run)) {
    if (entries.some((entry) => entry.id === id)) {
      const owner = [node, ...run.plan.steps.flatMap((s) => {
        const beat = s.beat as { node?: string; draws?: string };
        return [beat.node, beat.draws].filter((n): n is string => n !== undefined);
      })].find((n) =>
        lessonPoolItems(n, "draw").some((entry) => entry.id === id),
      );
      out.push({ id, kind: "draw", node: owner ?? node });
    }
  }
  return out;
}

export function saveLessonMistakes(run: LessonRun, node: string, bank: MistakeBank = mistakeBank): void {
  bank.record(missedFromRun(run, node));
}
