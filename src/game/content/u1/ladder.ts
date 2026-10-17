/**
 * The sort-ladder builder the Unit 1 generators share (stage-ab.ts and
 * stage-cd.active.ts). Moved here from stage-ab.ts's generated header on
 * 2026-10-17 (U1-P3) so a second generated file can build ladders without a
 * second copy of it.
 *
 * Ladders are built with createProblem and createOrderingAnswer, the same
 * calls beats/sort/ladders.ts makes, so they pass the same voice lint and
 * distractor checks at import time. ladders.ts keeps its builder private, so
 * this restates it.
 */
import {
  createOrderingAnswer,
  createProblem,
  type CurriculumCauseId,
  type TopicId,
} from "@blueberry/curriculum";
import type { SortContent } from "../../beats/sort/ladders";
import type { BeatShapeCauseId, ConceptId, SortBeat, SortCriterion } from "../../beats/types";
import type { PoolEntry } from "./types";

interface Expl {
  readonly whatHappened: string;
  readonly why: string;
  readonly lookAt: string;
}

export interface LadderSpec {
  readonly id: string;
  readonly node: string;
  readonly problemId: string;
  readonly topic: TopicId;
  readonly difficulty: number;
  readonly problemPrompt: string;
  readonly criterionText: string;
  readonly items: readonly { readonly id: string; readonly text: string }[];
  readonly order: readonly string[];
  readonly solution: Expl;
  readonly distractors: readonly {
    readonly id: string;
    readonly cause: CurriculumCauseId;
    readonly order: readonly string[];
    readonly explanation: Expl;
  }[];
  readonly beat: {
    readonly conceptIds: readonly ConceptId[];
    readonly prompt: string;
    readonly brief: string;
    readonly criterion: SortCriterion;
    readonly direction: "ascending" | "descending";
    readonly notes: Readonly<Record<string, string>>;
  };
  readonly trackEnds: { readonly first: string; readonly last: string };
  readonly meanings: readonly { readonly id: string; readonly cause: BeatShapeCauseId }[];
  readonly explanation: string;
  readonly conditions?: string;
  readonly provenance: string;
}

/** One sort ladder as a pool entry. Throws on a card with no authored note. */
export function ladder(spec: LadderSpec): PoolEntry {
  const answer = createOrderingAnswer({
    criterion: spec.criterionText,
    items: spec.items.map((item) => ({ id: item.id, text: item.text })),
    correctOrder: [...spec.order],
  });
  const problem = createProblem({
    id: spec.problemId,
    course: "orgo_2",
    topic: spec.topic,
    difficulty: spec.difficulty,
    prompt: spec.problemPrompt,
    answer,
    solution: spec.solution,
    distractors: spec.distractors.map((d) => ({
      id: d.id,
      cause: d.cause,
      state: { kind: "ordering" as const, order: [...d.order] },
      explanation: d.explanation,
    })),
    tags: ["ladder", "u1-pool", "placeholder"],
  });
  const beat: SortBeat = {
    kind: "sort",
    id: spec.id,
    node: spec.node,
    conceptIds: spec.beat.conceptIds,
    levels: [2, 3],
    prompt: spec.beat.prompt,
    brief: spec.beat.brief,
    criterion: spec.beat.criterion,
    direction: spec.beat.direction,
    items: spec.items.map((item) => {
      const why = spec.beat.notes[item.id];
      if (why === undefined) throw new Error(`ladder ${spec.id} has no note for card ${item.id}`);
      return { id: item.id, label: item.text, why };
    }),
    order: spec.order,
  };
  const content: SortContent = {
    beat,
    problem,
    spec: answer,
    trackEnds: spec.trackEnds,
    distractorMeanings: spec.meanings,
  };
  return {
    id: spec.id,
    item: { kind: "sort", content },
    explanation: spec.explanation,
    ...(spec.conditions === undefined ? {} : { conditions: spec.conditions }),
    provenance: spec.provenance,
    placeholder: true,
  };
}
