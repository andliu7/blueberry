/**
 * The seven-slot lesson template, and the run machine that plays it.
 *
 * THE TEMPLATE. A lesson is not a bag of beats; it is a RECIPE with a fixed
 * ordering of slots, and the ordering is a teaching decision the committed
 * spec (docs/reference/design-goals/blueberry_spec-question-badges_*.png)
 * surfaces to the student up front as the recipe strip:
 *
 *   hook       a video or motivating open. Authored asset; empty today
 *   recognise  the gentle entry: quick questions (the MCQ beats)
 *   connect    pairing ideas to each other (the match boards)
 *   order      ranking and sequence (the sort ladders)
 *   produce    building the thing (the synthesis gap beats)
 *   recycle    the misses come back, Duolingo's own closing move
 *   reward     the lesson says what it paid
 *
 * The first five are CONTENT slots: they fill only when a node has that kind
 * of beat authored, because this file does not invent content (the coverage
 * number in CLAUDE.md is only worth having if it counts real beats). Recycle
 * and reward are RUN slots: recycle exists only once a miss has earned it,
 * and reward always closes the lesson.
 *
 * WHY THIS IS A SEPARATE PURE MODULE. The web suite runs in a node
 * environment with no DOM, so any ordering rule that lives in JSX is a rule
 * nothing can test. Everything here is data in, data out; BeatRunner.tsx owns
 * the useState and nothing else.
 *
 * WHAT RECYCLE COVERS TODAY, recorded so nobody discovers it as a surprise:
 * only MCQ misses at a failable rung. The other three surfaces cannot end
 * un-cleared in their current shapes (a match board completes when every pair
 * lands, a sort ladder's Continue appears only once the ladder is right), and
 * a synthesis miss has just shown the student its full worked answer, so an
 * immediate replay would grade memory of the previous screen rather than
 * chemistry. One recycle pass, then the reward: the pass never loops, per the
 * loop discipline, and a miss that survives the recycle is reported honestly
 * on the reward card rather than chased.
 */

import { canFail, clearsBeat, type BeatResult, type MasteryLevel } from "./types";
import { mcqBeatsForNode } from "./mcq";
import { MATCH_BOARDS } from "./match";
import { sortContentById } from "./sort";
import { synthesisGapsForNode } from "./synthesis";

/* ------------------------------------------------------------------ */
/* The slots                                                            */
/* ------------------------------------------------------------------ */

export const LESSON_SLOTS = Object.freeze([
  "hook",
  "recognise",
  "connect",
  "order",
  "produce",
  "recycle",
  "reward",
] as const);

export type LessonSlot = (typeof LESSON_SLOTS)[number];

/** The slots a node's authored content can fill. Recycle and reward cannot be authored. */
export type ContentSlot = "hook" | "recognise" | "connect" | "order" | "produce";

/* ------------------------------------------------------------------ */
/* The node-to-ladder table, moved here from BeatRunner so the plan and */
/* the runner read one table. BeatRunner re-exports it unchanged.       */
/* ------------------------------------------------------------------ */

/**
 * Pathway nodes whose lesson includes a ladder, and the ladder each borrows.
 *
 * The ladders are keyed on curriculum topic ids rather than node ids because
 * a ladder is a property of the chemistry, not of one slot on the map. Every
 * id on the right is a real SORT_LADDERS entry and a test proves it.
 */
export const LADDER_FOR_NODE: Readonly<Record<string, string>> = Object.freeze({
  "u5-oxidation": "sort-oxidation-ladder",
  "u8-ladder": "sort-acyl-reactivity",
  "u10-basicity": "sort-basicity-vs-nucleophilicity",
});

/*
 * A ROW THIS ROUND DELIBERATELY DID NOT ADD, recorded so the next one does
 * not rediscover it. `sort-pka-hierarchy` ranks a carboxylic acid, a phenol,
 * a beta-dicarbonyl alpha C-H and a ketone alpha C-H, which is exactly what
 * the node "u9-pka, alpha-proton pKa hierarchy" teaches, and the node now
 * carries MCQ and match beats too, so mapping it here would give the product
 * its first four-content-step lesson.
 *
 * IT IS BLOCKED BY A CHECK, NOT BY THE CHEMISTRY. test/beatRunner.test.ts,
 * "the ladder table > resolves each of those nodes to its ladder", asserts
 * that resolveBeat() returns the SORT beat for every node in this table.
 * resolveBeat returns the plan's FIRST step, and the template's own ordering
 * puts recognise before order, so that assertion holds only while a ladder
 * node has nothing else authored on it. As written it forbids any node in
 * this table from ever gaining a second content kind, which is the opposite
 * of what the seven-slot template exists to allow, and the very next test in
 * that file ("prefers the gentler surface when a node has more than one")
 * asserts the opposite behaviour for the same case while filtering on the
 * property it asserts, so it can never fail either way.
 *
 * Loosening an assertion in the same round that reports the number it
 * produces is the failure mode CLAUDE.md's non-negotiable names, so this
 * round reports it instead of editing it. The fix is one line in that test:
 * assert that planLesson(node) CONTAINS the sort step rather than that it
 * opens with it, which is strictly stronger, because it keeps checking the
 * ladder is reachable once other content exists.
 */

/* ------------------------------------------------------------------ */
/* Resolution and the plan                                              */
/* ------------------------------------------------------------------ */

export type ResolvedBeat =
  | { readonly kind: "mcq"; readonly node: string }
  | { readonly kind: "match"; readonly node: string }
  | { readonly kind: "sort"; readonly ladderId: string }
  | { readonly kind: "synthesis"; readonly node: string };

export const SLOT_FOR_KIND: Readonly<Record<ResolvedBeat["kind"], ContentSlot>> = Object.freeze({
  mcq: "recognise",
  match: "connect",
  sort: "order",
  synthesis: "produce",
});

export interface PlanStep {
  readonly slot: ContentSlot;
  readonly beat: ResolvedBeat;
}

export interface LessonPlan {
  readonly node: string;
  /** Content steps in template order. Never empty: an empty plan is null. */
  readonly steps: readonly PlanStep[];
}

function matchBoardsForNode(node: string) {
  return MATCH_BOARDS.filter((board) => board.node === node);
}

/**
 * Everything this node has authored, ordered by the template.
 *
 * The order is not availability order and not authoring order: it is the
 * seven-slot ordering, which is why the array below is written in slot order
 * rather than assembled from a loop over content sources. The MCQ-first rule
 * the old resolver carried ("the easy rung comes first") is now a consequence
 * of the template rather than a special case: recognise precedes produce.
 */
export function planLesson(node: string): LessonPlan | null {
  const steps: PlanStep[] = [];

  // hook: an authored video open. No node carries one yet, and the free tier
  // rule in CLAUDE.md is that lessons must stand without video, so the slot
  // stays empty rather than being faked.

  if (mcqBeatsForNode(node).length > 0) {
    steps.push({ slot: "recognise", beat: { kind: "mcq", node } });
  }
  if (matchBoardsForNode(node).length > 0) {
    steps.push({ slot: "connect", beat: { kind: "match", node } });
  }
  const ladderId = LADDER_FOR_NODE[node];
  if (ladderId !== undefined && sortContentById(ladderId) !== undefined) {
    steps.push({ slot: "order", beat: { kind: "sort", ladderId } });
  }
  if (synthesisGapsForNode(node).length > 0) {
    steps.push({ slot: "produce", beat: { kind: "synthesis", node } });
  }

  return steps.length === 0 ? null : { node, steps };
}

/**
 * What this node opens with, or null when nothing is authored for it.
 *
 * The signature keeps the level parameter its callers already pass: a beat
 * authored only at levels 2 and 3 still means the node is a real lesson, and
 * filtering by level here would make the pathway show it as queued forever.
 * Choosing which rung to play stays the runner's job.
 */
export function resolveBeat(node: string, _level: MasteryLevel): ResolvedBeat | null {
  return planLesson(node)?.steps[0]?.beat ?? null;
}

/** Whether the pathway should render this node as playable. */
export function nodeHasBeat(node: string): boolean {
  return planLesson(node) !== null;
}

/* ------------------------------------------------------------------ */
/* The run machine                                                      */
/* ------------------------------------------------------------------ */

export type RunPhase = "content" | "recycle" | "reward";

export interface LessonRun {
  readonly plan: LessonPlan;
  readonly phase: RunPhase;
  /** The content step on screen. Equal to steps.length once content is done. */
  readonly index: number;
  /** Individual beats cleared and played, for the reward card's honest count. */
  readonly clearedBeats: number;
  readonly totalBeats: number;
  /** MCQ beat ids missed at a failable rung, waiting for the recycle pass. */
  readonly missedMcqIds: readonly string[];
  /** How the recycle pass went. Zeros until it plays. */
  readonly recycleCleared: number;
  readonly recycleTotal: number;
  readonly recycled: boolean;
}

export function startRun(plan: LessonPlan): LessonRun {
  return {
    plan,
    phase: "content",
    index: 0,
    clearedBeats: 0,
    totalBeats: 0,
    missedMcqIds: [],
    recycleCleared: 0,
    recycleTotal: 0,
    recycled: false,
  };
}

/** The content step on screen, or null outside the content phase. */
export function currentStep(run: LessonRun): PlanStep | null {
  if (run.phase !== "content") return null;
  return run.plan.steps[run.index] ?? null;
}

export interface StepReport {
  /** Beats cleared inside the step. A match board or ladder is one beat. */
  readonly cleared: number;
  /** Beats played inside the step. */
  readonly total: number;
  /** MCQ beat ids the recycle pass should bring back. */
  readonly missedMcqIds?: readonly string[];
}

/**
 * One content step finished. Advances to the next step, or out of the
 * content phase: to recycle when any miss earned it, otherwise straight to
 * the reward. Reported outside the content phase it returns the run
 * unchanged, because a stale callback firing twice must not double-count.
 */
export function reportStep(run: LessonRun, report: StepReport): LessonRun {
  if (run.phase !== "content" || currentStep(run) === null) return run;
  const missed = [...run.missedMcqIds];
  for (const id of report.missedMcqIds ?? []) {
    if (!missed.includes(id)) missed.push(id);
  }
  const index = run.index + 1;
  const contentDone = index >= run.plan.steps.length;
  return {
    ...run,
    index,
    clearedBeats: run.clearedBeats + report.cleared,
    totalBeats: run.totalBeats + report.total,
    missedMcqIds: missed,
    phase: contentDone ? (missed.length > 0 ? "recycle" : "reward") : "content",
  };
}

/** The recycle pass finished. One pass only; the run moves to the reward. */
export function reportRecycle(run: LessonRun, cleared: number, total: number): LessonRun {
  if (run.phase !== "recycle") return run;
  return { ...run, phase: "reward", recycled: true, recycleCleared: cleared, recycleTotal: total };
}

/**
 * Which committed MCQ results the recycle pass should bring back.
 *
 * Only failable rungs count: at L0 a beat cannot fail by design (canFail),
 * so a first-meeting miss is the guided rung doing its job, not a debt.
 * Deduplicated in first-miss order.
 */
export function missedMcqIdsFrom(results: readonly BeatResult[]): readonly string[] {
  const missed: string[] = [];
  for (const result of results) {
    if (clearsBeat(result)) continue;
    if (!canFail(result.level)) continue;
    if (!missed.includes(result.beatId)) missed.push(result.beatId);
  }
  return missed;
}

/* ------------------------------------------------------------------ */
/* The recipe strip's segments                                          */
/* ------------------------------------------------------------------ */

export type BadgeKind =
  | ResolvedBeat["kind"]
  | "recycle"
  | "reward"
  | "reagents"
  | "product"
  | "numeric"
  | "structure";

/**
 * The badge for a curriculum answer kind, so the lesson player's strip and
 * this runner's strip speak the one badge vocabulary the committed spec
 * draws. Typed as string in so the curriculum union can grow a kind without
 * breaking this module; an unknown kind falls back to the quick-question
 * badge rather than throwing mid-lesson.
 */
export function problemBadge(answerKind: string): BadgeKind {
  switch (answerKind) {
    case "matching":
      return "match";
    case "ordering":
      return "sort";
    case "reagents":
      return "reagents";
    case "major_product":
      return "product";
    case "numeric":
      return "numeric";
    case "structure":
      return "structure";
    default:
      return "mcq";
  }
}

export interface RecipeSegment {
  readonly slot: LessonSlot;
  readonly badge: BadgeKind;
  readonly state: "done" | "current" | "todo";
  /** Read to screen readers and shown as the segment's title. Coach voice. */
  readonly label: string;
}

export const BADGE_LABEL: Readonly<Record<BadgeKind, string>> = Object.freeze({
  mcq: "Quick questions",
  match: "Match the pairs",
  sort: "Put them in order",
  synthesis: "Build the synthesis",
  recycle: "The ones that got away",
  reward: "Collect the lesson",
  reagents: "Supply the reagents",
  product: "Predict the product",
  numeric: "Work the number",
  structure: "Draw the structure",
});

/**
 * Which of the seven slots a badge belongs to.
 *
 * The beat runner gets its slot from the plan, because the plan is what put
 * the step in a slot. A curriculum lesson has no plan: it is a list of
 * authored problems, and the strip still has to say which slot each one is
 * standing in, or the two strips are two vocabularies wearing the same
 * shape. So the mapping is written down once, here, where a test holds it.
 *
 * Everything that asks the student to BUILD something lands in produce,
 * which is the slot's own definition. That is why reagents, product, numeric
 * and structure share it: they differ in answer shape, not in teaching move.
 */
export const SLOT_FOR_BADGE: Readonly<Record<BadgeKind, LessonSlot>> = Object.freeze({
  mcq: "recognise",
  match: "connect",
  sort: "order",
  synthesis: "produce",
  reagents: "produce",
  product: "produce",
  numeric: "produce",
  structure: "produce",
  recycle: "recycle",
  reward: "reward",
});

/**
 * The strip, computed from the run: one segment per content step in template
 * order, then recycle once a miss has earned it, then the reward.
 *
 * "Done" means behind you, not flawless: the strip is a position instrument
 * and the honest score lives on the reward card. The recycle segment appears
 * the moment a miss is recorded rather than being promised up front, because
 * a strip that always shows a recycle slot tells every student to expect to
 * fail, which is not this product's voice.
 */
export function recipeSegments(run: LessonRun): readonly RecipeSegment[] {
  const segments: RecipeSegment[] = run.plan.steps.map((step, i) => ({
    slot: step.slot,
    badge: step.beat.kind,
    state: run.phase !== "content" || i < run.index ? "done" : i === run.index ? "current" : "todo",
    label: BADGE_LABEL[step.beat.kind],
  }));
  if (run.missedMcqIds.length > 0) {
    segments.push({
      slot: "recycle",
      badge: "recycle",
      state: run.phase === "recycle" ? "current" : run.recycled ? "done" : "todo",
      label: BADGE_LABEL.recycle,
    });
  }
  segments.push({
    slot: "reward",
    badge: "reward",
    state: run.phase === "reward" ? "current" : "todo",
    label: BADGE_LABEL.reward,
  });
  return segments;
}

/**
 * The same strip for a CURRICULUM lesson, whose beats are authored problems
 * rather than a planned run.
 *
 * lesson/LessonPlayer.tsx used to draw a bare percentage bar here, which told
 * the student how far they were and nothing at all about what was coming.
 * The committed spec's whole point is that a lesson SHOWS ITS COMPOSITION UP
 * FRONT, so a problem list gets the same instrument the beat runner has: one
 * badge per problem in the order they will be played, then the reward slot.
 *
 * Pure, and taking answer kinds rather than Problems, so the web suite (node,
 * no DOM) can hold the rule and the player only draws. `index` is the problem
 * on screen; passing `kinds.length` is the finished lesson, where every
 * question is behind the student and the reward is current.
 *
 * NO RECYCLE SEGMENT HERE, deliberately: the curriculum player has no recycle
 * pass, and a slot the run cannot reach would be a promise the screen does
 * not keep.
 */
export function problemRecipeSegments(kinds: readonly string[], index: number): readonly RecipeSegment[] {
  const segments: RecipeSegment[] = kinds.map((kind, i) => {
    const badge = problemBadge(kind);
    return {
      slot: SLOT_FOR_BADGE[badge],
      badge,
      state: i < index ? "done" : i === index ? "current" : "todo",
      label: BADGE_LABEL[badge],
    };
  });
  segments.push({
    slot: "reward",
    badge: "reward",
    state: index >= kinds.length ? "current" : "todo",
    label: BADGE_LABEL.reward,
  });
  return segments;
}

/* ------------------------------------------------------------------ */
/* The green capsule                                                    */
/* ------------------------------------------------------------------ */

/**
 * How far the strip's green fill has travelled, 0 to 1.
 *
 * WHY THIS IS A FUNCTION AND NOT A TERNARY IN THE STRIP. Both committed
 * lesson frames (blueberry_r9-lesson-mechanism, blueberry_r9-lesson-reaction)
 * draw ONE long green capsule between the exit and the currency counter,
 * filling left to right. The committed badge sheet
 * (blueberry_spec-question-badges) draws the same slot as a segmented strip
 * of beat badges. They are the same instrument at two zoom levels, so the
 * strip is drawn as a capsule whose green runs continuously across every
 * segment behind the student: the frames' bar and the sheet's badges, one
 * object. This function is the length of that run, and it lives here because
 * the web suite has no DOM and a rule inside JSX is a rule nothing can test.
 *
 * `withinCurrent` is how far through the CURRENT segment's own beats the
 * student has got, and it must be a CLEARED fraction rather than an answered
 * one. A miss that pushed the green forward would paint a wrong answer as
 * progress, which contradicts DESIGN-GOALS' "green says you moved" and is
 * exactly what the previous build did: the current segment showed a full
 * green fill while the panel under it said "Not yet".
 */
export function recipeProgress(segments: readonly RecipeSegment[], withinCurrent = 0): number {
  if (segments.length === 0) return 0;
  const done = segments.filter((segment) => segment.state === "done").length;
  const hasCurrent = segments.some((segment) => segment.state === "current");
  const partial = hasCurrent ? Math.min(1, Math.max(0, withinCurrent)) : 0;
  return Math.min(1, (done + partial) / segments.length);
}
