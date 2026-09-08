/**
 * The reaction table itself, assembled and checked at import.
 *
 * Importing this module runs `createReaction` over every authored row, so a
 * defect in any of them is a module that will not load. The validator suite's
 * curriculum check imports the package and reports the failure with the row id
 * in it, rather than the table quietly being half a table.
 *
 * COVERAGE, STATED SO THE COUNT IS NOT READ AS MORE THAN IT IS. This is a seed
 * for the Act 1 and Act 2 vocabulary of `docs/COURSE-OUTLINE-ORGO2.md`, plus the
 * rows the near miss pairs need from outside those acts. It is not the whole
 * course. Act 3's enolate block, the diazonium substitution family, and every
 * General Chemistry topic have no rows at all, and `reactionCoverage()` reports
 * which topics are empty rather than leaving that to be discovered.
 */

import { allTopicIds, type TopicId } from "../placement.js";
import { ACT_1_REACTIONS } from "./seed/act1.js";
import { ACT_2_REACTIONS } from "./seed/act2.js";
import { NEAR_MISS_REACTIONS } from "./seed/nearMiss.js";
import type { Reaction, ReactionId } from "./types.js";

function assertUniqueIds(reactions: readonly Reaction[]): readonly Reaction[] {
  const seen = new Set<ReactionId>();
  for (const reaction of reactions) {
    if (seen.has(reaction.id)) {
      throw new Error(
        `two reactions share the id ${reaction.id}. An id is a stable pointer a lesson and a ` +
          `bookmark hold, so two rows answering to one is a defect with no correct reading.`,
      );
    }
    seen.add(reaction.id);
  }
  return reactions;
}

export const REACTIONS: readonly Reaction[] = Object.freeze(
  assertUniqueIds([...ACT_1_REACTIONS, ...ACT_2_REACTIONS, ...NEAR_MISS_REACTIONS]),
);

export { ACT_1_REACTIONS, ACT_2_REACTIONS, NEAR_MISS_REACTIONS };

export function reactionCount(table: readonly Reaction[] = REACTIONS): number {
  return table.length;
}

export interface ReactionCoverage {
  readonly reactions: number;
  /** Topic id to row count, sorted by topic id. Only topics with rows appear. */
  readonly byTopic: Readonly<Record<string, number>>;
  /** Act id to row count. `none` collects the carried topics that have no act. */
  readonly byAct: Readonly<Record<string, number>>;
  /** Topics in the 46 topic registry with no reaction row. Sorted. */
  readonly topicsWithNoRows: readonly TopicId[];
}

/**
 * What the table covers, and what it does not.
 *
 * `topicsWithNoRows` is the half worth reading. A count on its own says the
 * table is big; the gap list says which lessons a student searching from a
 * topic would find empty, and most of them are empty on purpose in this wave.
 */
export function reactionCoverage(table: readonly Reaction[] = REACTIONS): ReactionCoverage {
  const byTopic = new Map<string, number>();
  const byAct = new Map<string, number>();
  for (const reaction of table) {
    byTopic.set(reaction.topic, (byTopic.get(reaction.topic) ?? 0) + 1);
    const act = reaction.act ?? "none";
    byAct.set(act, (byAct.get(act) ?? 0) + 1);
  }

  const sortedRecord = (source: Map<string, number>): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const key of [...source.keys()].sort()) out[key] = source.get(key) as number;
    return out;
  };

  return {
    reactions: table.length,
    byTopic: Object.freeze(sortedRecord(byTopic)),
    byAct: Object.freeze(sortedRecord(byAct)),
    topicsWithNoRows: Object.freeze(
      allTopicIds()
        .filter((topic) => !byTopic.has(topic))
        .sort(),
    ),
  };
}
