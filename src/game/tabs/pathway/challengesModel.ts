/**
 * THE CHALLENGES PATH. A short road of goals, each opened by finishing the one
 * before it. Pure over the journal: no React, no pool, so a test can run it.
 *
 * Same colour rule as the lesson path: done is green, the one to work on and
 * any open one are blue-violet, locked is gray. Finishing a challenge opens the
 * next one and does NOT mark it done; each one is done only when its own count
 * is reached.
 */
import type { EconomyEvent } from "@blueberry/economy";
import { clearedIdsOf } from "./sectionStarts";

export type ChallengeState = "done" | "current" | "locked";

export interface ChallengeStop {
  readonly id: string;
  readonly title: string;
  readonly blurb: string;
  /** What the journal holds toward it, and what it asks for. */
  readonly have: number;
  readonly need: number;
  readonly state: ChallengeState;
}

interface Spec {
  readonly id: string;
  readonly title: string;
  readonly blurb: string;
  readonly need: number;
  readonly count: (journal: readonly EconomyEvent[], cleared: ReadonlySet<string>) => number;
}

const correct = (journal: readonly EconomyEvent[]) =>
  journal.filter((event) => event.kind === "attempt" && event.correct).length;
const units = (journal: readonly EconomyEvent[]) =>
  new Set(journal.flatMap((event) => (event.kind === "quiz_passed" || event.kind === "unit_cleared" ? [event.unitId] : []))).size;
const chests = (journal: readonly EconomyEvent[]) => journal.filter((event) => event.kind === "chest_opened").length;

export const CHALLENGE_SPECS: readonly Spec[] = [
  { id: "first-lesson", title: "First lesson", blurb: "Finish one lesson.", need: 1, count: (_j, c) => c.size },
  { id: "ten-right", title: "Ten right", blurb: "Get 10 answers right.", need: 10, count: (j) => correct(j) },
  { id: "five-lessons", title: "Five lessons", blurb: "Finish 5 lessons.", need: 5, count: (_j, c) => c.size },
  { id: "first-chest", title: "Open a chest", blurb: "Open one treasure chest.", need: 1, count: (j) => chests(j) },
  { id: "fifty-right", title: "Fifty right", blurb: "Get 50 answers right.", need: 50, count: (j) => correct(j) },
  { id: "first-unit", title: "Pass a unit", blurb: "Pass one unit check.", need: 1, count: (j) => units(j) },
  { id: "twenty-lessons", title: "Twenty lessons", blurb: "Finish 20 lessons.", need: 20, count: (_j, c) => c.size },
];

export function deriveChallenges(journal: readonly EconomyEvent[]): readonly ChallengeStop[] {
  const cleared = clearedIdsOf(journal);
  let waiting = false;
  let currentTaken = false;
  return CHALLENGE_SPECS.map((spec) => {
    const have = Math.min(spec.count(journal, cleared), spec.need);
    // A stop is done only once every stop before it is: the road is walked in order.
    const done = !waiting && have >= spec.need;
    let state: ChallengeState;
    if (done) state = "done";
    else if (!currentTaken && !waiting) {
      state = "current";
      currentTaken = true;
    } else state = "locked";
    // A challenge opens when the one before it is done. Its own count is read
    // either way, so finishing one never paints the next one green.
    if (!done) waiting = true;
    return { id: spec.id, title: spec.title, blurb: spec.blurb, have: done ? spec.need : waiting && state === "locked" ? 0 : have, need: spec.need, state };
  });
}
