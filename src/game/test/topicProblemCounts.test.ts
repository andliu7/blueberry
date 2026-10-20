/**
 * The per-topic problem counts the path shows are a MEASUREMENT, and this is
 * the instrument.
 *
 * tabs/courses/topicProblemCounts.ts commits the counts as numbers so the
 * pathway's first screen does not import the curriculum corpus (owner,
 * 2026-10-20; same reasoning as NODE_MOVES in pathway-sheet/nodeDifficulty.ts).
 * A committed number rots, so this file recounts every topic from the real
 * corpus through the same gate the Courses tab serves with, and fails when
 * they drift. On a drift the message carries the regenerated literal.
 */

import { describe, expect, it } from "vitest";
import { SEED_CORPUS } from "@blueberry/curriculum";
import { SERVED_KINDS } from "../tabs/courses/courseCopy";
import { TOPIC_PROBLEM_COUNTS } from "../tabs/courses/topicProblemCounts";

type Counts = Record<string, { served: number; all: number }>;

function measured(): Counts {
  const out: Counts = {};
  for (const problem of SEED_CORPUS) {
    const row = (out[problem.topic] ??= { served: 0, all: 0 });
    row.all += 1;
    if (SERVED_KINDS.has(problem.answer.kind)) row.served += 1;
  }
  return out;
}

function literal(rows: Counts): string {
  const keys = Object.keys(rows).sort();
  return `export const TOPIC_PROBLEM_COUNTS: Readonly<Record<string, { readonly served: number; readonly all: number }>> = Object.freeze({\n${keys
    .map((key) => `  "${key}": { served: ${rows[key]!.served}, all: ${rows[key]!.all} },`)
    .join("\n")}\n});`;
}

describe("the committed problem counts are the measured ones", () => {
  it("matches the corpus, topic for topic", () => {
    const rows = measured();
    expect(Object.keys(rows).length, "the corpus is empty, so an empty table would pass").toBeGreaterThan(0);
    const sorted = (counts: Readonly<Counts>) =>
      JSON.stringify(Object.keys(counts).sort().map((key) => [key, counts[key]!.served, counts[key]!.all]));
    expect(
      sorted(TOPIC_PROBLEM_COUNTS) === sorted(rows),
      `TOPIC_PROBLEM_COUNTS drifted from the corpus. Regenerate it to:\n\n${literal(rows)}\n`,
    ).toBe(true);
  });
});
