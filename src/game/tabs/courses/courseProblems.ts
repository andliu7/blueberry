/**
 * Which authored problems a topic serves.
 *
 * Split out of courseCopy.ts (owner, 2026-10-20) because it imports the whole
 * curriculum corpus, and courseCopy is on the game's first load. Only the lazy
 * Courses tab needs the problems; the path's first screen reads counts from
 * topicProblemCounts.ts instead.
 */

import { SEED_CORPUS, type Problem, type TopicId } from "@blueberry/curriculum";
import { SERVE_ALL, SERVED_KINDS } from "./courseCopy";

export function problemsForTopic(topic: TopicId): readonly Problem[] {
  return SEED_CORPUS.filter((problem) => problem.topic === topic && (SERVE_ALL || SERVED_KINDS.has(problem.answer.kind)));
}
